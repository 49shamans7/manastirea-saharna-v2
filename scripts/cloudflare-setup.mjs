// The whole Cloudflare setup, after `bunx wrangler login`.
//
//   bun run cloudflare:setup              ask, then do
//   bun run cloudflare:setup --dry-run    print every step; touches no account
//
// Safe to run again: every step looks first and skips what is already there.
// Refuses to start until you confirm the logged-in account by typing its name.
//
// DNS: wrangler's login cannot edit DNS records. Two steps change DNS through
// their own products, each after a printed export and an explicit yes:
//   - Email Sending on formular.<domain>: records on that subdomain only.
//   - The custom domain: the A/CNAME of the apex and www. Mail records stay.
// `email routing enable` is never called: on the apex it would replace the MX
// that points at the monastery's mailboxes.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";

const DOMAIN = "manastirea-saharna.md";
const WWW = `www.${DOMAIN}`;
const REPO = "49shamans7/manastirea-saharna-v2";
const PAGES_HOST = "49shamans7.github.io";
const WIDGET_NAME = "Saharna Pomelnic";
const SITE_WORKER = "manastirea-saharna";
const FORM_WORKER = "saharna-pomelnic";
const AUTH_WORKER = "sveltia-cms-auth";
const PREVIOUS_DEVELOPER = /victorapostol/i;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const client = path.join(root, "apps/client");
const formDir = path.join(root, "workers", FORM_WORKER);
const authDir = path.join(root, "workers", AUTH_WORKER);
const adminConfig = path.join(client, "public/admin/config.yml");
const envFile = path.join(client, ".env");
const work = path.join(root, ".work");

const DRY = process.argv.includes("--dry-run");
const wranglerBin = path.join(root, "node_modules/.bin/wrangler");

// The worker's config is the one place these two are written down.
const workerConfig = readFileSync(path.join(formDir, "wrangler.jsonc"), "utf8");
const configured = (key) => workerConfig.match(new RegExp(`"${key}":\\s*"([^"]+)"`))?.[1] ?? "";
const MAIL_TO = configured("POMELNIC_TO");
const SENDER_DOMAIN = configured("POMELNIC_FROM").split("@")[1] ?? "";

const todo = [];
let accountId = "<account-id>";
let stepNumber = 0;

const step = (title) => console.log(`\n== ${++stepNumber}. ${title}`);
const say = (line) => console.log(`   ${line}`);
const stop = (message) => {
  console.error(`\nStopped: ${message}`);
  process.exit(1);
};

// One interface per question: an open one would hold the terminal in raw mode
// while wrangler and gh ask for secrets on the same terminal.
async function ask(question) {
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await prompt.question(`   ${question} `);
  prompt.close();
  return answer.trim();
}
async function yes(question) {
  if (DRY) {
    say(`[dry-run] would ask: ${question}`);
    return true;
  }
  return /^(y|yes|da)$/i.test(await ask(`${question} [y/N]`));
}

/** Runs wrangler. `quiet` captures stdout, for JSON and for anything holding a secret. */
function wrangler(args, { cwd = root, quiet = false, input, readOnly = false } = {}) {
  if (DRY && !readOnly) {
    say(`[dry-run] would run: wrangler ${args.join(" ")}   (in ${path.relative(root, cwd) || "."})`);
    return { ok: true, stdout: "" };
  }
  const result = spawnSync(wranglerBin, args, {
    cwd,
    env: { ...process.env, ...(DRY ? {} : { CLOUDFLARE_ACCOUNT_ID: accountId }), WRANGLER_SEND_METRICS: "false" },
    input,
    encoding: "utf8",
    stdio: [input === undefined ? "inherit" : "pipe", quiet ? "pipe" : "inherit", quiet ? "pipe" : "inherit"],
  });
  return { ok: result.status === 0, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

function wranglerJson(args) {
  if (DRY) {
    say(`[dry-run] would read: wrangler ${args.join(" ")}`);
    return null;
  }
  const { ok, stdout } = wrangler(args, { quiet: true });
  if (!ok) return null;
  try {
    return JSON.parse(stdout);
  } catch {
    return null;
  }
}

/** Cloudflare API with wrangler's own login. Answers null on any refusal. */
async function api(method, url, body) {
  if (DRY) {
    say(`[dry-run] would call: ${method} ${url}`);
    return null;
  }
  const auth = JSON.parse(wrangler(["auth", "token", "--json"], { quiet: true }).stdout || "{}");
  const response = await fetch(`https://api.cloudflare.com/client/v4${url}`, {
    method,
    headers: { Authorization: `Bearer ${auth.token}`, "Content-Type": "application/json" },
    body: body && JSON.stringify(body),
  });
  const json = await response.json().catch(() => ({}));
  if (!json.success) {
    say(`API ${method} ${url} refused: ${(json.errors ?? []).map((e) => e.message).join("; ") || response.status}`);
    return null;
  }
  return json.result;
}

async function publicRecords(name, type) {
  const url = `https://cloudflare-dns.com/dns-query?name=${name}&type=${type}`;
  const response = await fetch(url, { headers: { Accept: "application/dns-json" } });
  const { Answer = [] } = await response.json();
  return Answer.map((record) => `${record.name} ${record.TTL} ${type} ${record.data}`);
}

/** Prints the zone as it stands and keeps a copy in .work/, before anything DNS-shaped. */
async function exportDns(zone) {
  const lines = [`# ${DOMAIN}, ${new Date().toISOString()}`];
  const names = [DOMAIN, WWW, `mail.${DOMAIN}`, `webmail.${DOMAIN}`, `_dmarc.${DOMAIN}`, `default._domainkey.${DOMAIN}`];
  for (const name of names) {
    for (const type of ["A", "AAAA", "CNAME", "MX", "TXT"]) lines.push(...(await publicRecords(name, type)));
  }
  // wrangler's login usually cannot read the full zone; the public answers above always work
  const records = zone?.id && !DRY ? await api("GET", `/zones/${zone.id}/dns_records?per_page=500`) : null;
  if (records) {
    lines.push("# from the API", ...records.map((r) => `${r.name} ${r.ttl} ${r.type} ${r.content}`));
  }
  mkdirSync(work, { recursive: true });
  const file = path.join(work, `dns-export-${Date.now()}.txt`);
  writeFileSync(file, `${lines.join("\n")}\n`);
  for (const line of lines) say(line);
  say(`saved: ${path.relative(root, file)}`);
}

function setEnvValues(values) {
  const lines = existsSync(envFile) ? readFileSync(envFile, "utf8").split("\n") : [];
  for (const [key, value] of Object.entries(values)) {
    const index = lines.findIndex((line) => line.startsWith(`${key}=`));
    if (index >= 0) lines[index] = `${key}=${value}`;
    else lines.unshift(`${key}=${value}`);
  }
  if (DRY) say(`[dry-run] would write to apps/client/.env: ${Object.keys(values).join(", ")}`);
  else writeFileSync(envFile, `${lines.join("\n").trimEnd()}\n`);
}

// ---------------------------------------------------------------------------

async function confirmAccount() {
  step("Account");
  if (DRY) {
    say("[dry-run] no account is read. A real run lists the login and requires its name typed back.");
    return;
  }
  if (!process.stdin.isTTY) stop("run this in a terminal: the account must be confirmed by hand.");
  const who = spawnSync(wranglerBin, ["whoami", "--json"], { cwd: root, encoding: "utf8" });
  let user = null;
  try {
    user = JSON.parse(who.stdout);
  } catch {}
  if (!user?.loggedIn) stop("not logged in. Run: bunx wrangler login");

  const accounts = user.accounts ?? [];
  if (accounts.length === 0) stop("this login has no accounts.");
  say(`login: ${user.email ?? "(token)"}`);
  accounts.forEach((account, index) => say(`[${index + 1}] ${account.name}  ${account.id}`));
  if (PREVIOUS_DEVELOPER.test(`${user.email} ${accounts.map((a) => a.name).join(" ")}`)) {
    stop("this is the previous developer's account. Log in to the monastery's own.");
  }

  const chosen = accounts.length === 1 ? accounts[0] : accounts[Number(await ask("Which account (number)?")) - 1];
  if (!chosen) stop("no account chosen.");
  const typed = await ask(`Everything goes to "${chosen.name}". Type that name to confirm:`);
  if (typed !== chosen.name) stop("account not confirmed. Nothing was changed.");
  accountId = chosen.id;
}

async function findZone() {
  step(`Zone ${DOMAIN}`);
  if (DRY) {
    await api("GET", `/zones?name=${DOMAIN}&account.id=${accountId}`);
    say("[dry-run] assuming the zone is in the account and active.");
    return { id: "<zone-id>", status: "active" };
  }
  const [zone] = (await api("GET", `/zones?name=${DOMAIN}&account.id=${accountId}`)) ?? [];
  if (zone) {
    say(`in this account, status: ${zone.status}`);
    return zone;
  }
  say("not in this account. The site and the worker still go up on workers.dev; mail and the domain wait.");
  todo.push(
    `Get ${DOMAIN} into this account (whoever holds it today moves it, or add it here and change the nameservers at the registrar), then run this again.`,
  );
  return null;
}

async function deployForm() {
  step(`Worker ${FORM_WORKER}`);
  // the bundle and config are checked for real, offline, even on a dry run
  if (DRY) {
    const check = wrangler(["deploy", "--dry-run", "--outdir", path.join(work, "dry-run", FORM_WORKER)], {
      cwd: formDir,
      quiet: true,
      readOnly: true,
    });
    say(check.ok ? "bundle and config: ok (wrangler deploy --dry-run)" : `bundle failed:\n${check.stderr}`);
    if (!check.ok) stop("the worker does not bundle.");
  }
  if (!wrangler(["deploy"], { cwd: formDir }).ok) stop(`${FORM_WORKER} did not deploy.`);
}

async function workersSubdomain() {
  const result = await api("GET", `/accounts/${accountId}/workers/subdomain`);
  if (DRY) return "<account-subdomain>";
  if (!result?.subdomain) stop("the account has no workers.dev subdomain.");
  return result.subdomain;
}

async function setUpTurnstile(subdomain) {
  step("Turnstile");
  const domains = [DOMAIN, `${SITE_WORKER}.${subdomain}.workers.dev`, PAGES_HOST];
  const domainFlags = domains.flatMap((domain) => ["--domain", domain]);

  const widgets = wranglerJson(["turnstile", "widget", "list", "--json"]) ?? [];
  let widget = widgets.find((candidate) => candidate.name === WIDGET_NAME);

  if (DRY) {
    say(`[dry-run] would create or update widget "${WIDGET_NAME}" for: ${domains.join(", ")}`);
    say(`[dry-run] would pipe its secret into: wrangler secret put TURNSTILE_SECRET_KEY (never printed)`);
    return "<turnstile-site-key>";
  }

  if (widget) {
    say(`widget exists: ${widget.sitekey}`);
    if (domains.some((domain) => !widget.domains?.includes(domain))) {
      wrangler(["turnstile", "widget", "update", widget.sitekey, ...domainFlags, "--json"], { quiet: true });
    }
    widget = wranglerJson(["turnstile", "widget", "get", widget.sitekey, "--json"]);
  } else {
    widget = wranglerJson(["turnstile", "widget", "create", WIDGET_NAME, ...domainFlags, "--mode", "managed", "--json"]);
  }

  if (!widget?.sitekey || !widget.secret) {
    stop(
      `could not create the widget here. Dashboard → Turnstile → Add widget "${WIDGET_NAME}", mode Managed, hostnames ${domains.join(", ")}, then run this again.`,
    );
  }

  const put = wrangler(["secret", "put", "TURNSTILE_SECRET_KEY"], { cwd: formDir, input: widget.secret, quiet: true });
  if (!put.ok) stop("could not set TURNSTILE_SECRET_KEY.");
  say(`site key ${widget.sitekey}; secret set on the worker`);
  return widget.sitekey;
}

async function setUpMail(zone) {
  step(`Mail to ${MAIL_TO}, from a subdomain of the zone`);
  if (!zone) {
    say("skipped: needs the zone.");
    return;
  }

  const addresses = (await api("GET", `/accounts/${accountId}/email/routing/addresses`)) ?? [];
  const address = addresses.find((candidate) => candidate.email === MAIL_TO);
  if (address?.verified) {
    say(`${MAIL_TO}: verified`);
  } else if (address) {
    todo.push(`Open the Cloudflare mail in ${MAIL_TO} and click the link. Until then the form cannot deliver.`);
  } else if (await yes(`Cloudflare will send one verification mail to ${MAIL_TO}. Send it?`)) {
    await api("POST", `/accounts/${accountId}/email/routing/addresses`, { email: MAIL_TO });
    todo.push(`Open the Cloudflare mail in ${MAIL_TO} and click the link. Until then the form cannot deliver.`);
  }

  const subdomains = (await api("GET", `/zones/${zone.id}/email/sending/subdomains`)) ?? [];
  if (subdomains.some((candidate) => candidate.name === SENDER_DOMAIN)) {
    say(`${SENDER_DOMAIN}: already enabled for sending`);
    return;
  }

  say(`Enabling sending adds MX, SPF, DKIM and DMARC records under ${SENDER_DOMAIN} only.`);
  say(`The MX and SPF of ${DOMAIN} are not touched. The zone as it stands:`);
  await exportDns(zone);
  if (!(await yes(`Enable sending on ${SENDER_DOMAIN}?`))) {
    todo.push(`Run this again and accept the sending step: the form cannot deliver without it.`);
    return;
  }
  if (!wrangler(["email", "sending", "enable", SENDER_DOMAIN, "--zone-id", zone.id]).ok) {
    todo.push(
      `Cloudflare refused Email Sending on ${SENDER_DOMAIN}, probably for the plan. Either: Compute → Email Service → Email Routing → ${DOMAIN} → Settings → Subdomains → add "${SENDER_DOMAIN.split(".")[0]}" (free). Or take Workers Paid and run this again. Never enable routing on ${DOMAIN} itself.`,
    );
  }
}

async function setUpAdminLogin(subdomain) {
  step("Admin sign-in relay (optional: editors can keep using access tokens)");
  const url = `https://${AUTH_WORKER}.${subdomain}.workers.dev`;
  const check = DRY
    ? wrangler(["deploy", "--dry-run", "--outdir", path.join(work, "dry-run", AUTH_WORKER)], {
        cwd: authDir,
        quiet: true,
        readOnly: true,
      })
    : null;
  if (check) say(check.ok ? "bundle and config: ok (wrangler deploy --dry-run)" : `bundle failed:\n${check.stderr}`);

  if (!(await yes('Set up "Sign in with GitHub" now? It needs a GitHub OAuth app, about two minutes.'))) return;
  if (!wrangler(["deploy"], { cwd: authDir }).ok) stop(`${AUTH_WORKER} did not deploy.`);

  const params = new URLSearchParams({
    "oauth_application[name]": "Saharna admin",
    "oauth_application[url]": `https://${DOMAIN}/admin/`,
    "oauth_application[callback_url]": `${url}/callback`,
  });
  say("GitHub has no API for this one. Open, press Register, then Generate a new client secret:");
  say(`https://github.com/settings/applications/new?${params}`);
  wrangler(["secret", "put", "GITHUB_CLIENT_ID"], { cwd: authDir });
  wrangler(["secret", "put", "GITHUB_CLIENT_SECRET"], { cwd: authDir });

  if (DRY) {
    say(`[dry-run] would set base_url: ${url} in apps/client/public/admin/config.yml`);
    return;
  }
  const config = readFileSync(adminConfig, "utf8");
  writeFileSync(adminConfig, config.replace(/^ {2}(# )?base_url:.*$/m, `  base_url: ${url}`));
  todo.push("Commit apps/client/public/admin/config.yml: it now names the sign-in relay.");
}

function deploySite(workerUrl, siteKey) {
  step(`Site ${SITE_WORKER} (builds for the domain root, uploads dist/)`);
  const values = { PUBLIC_POMELNIC_WORKER_URL: workerUrl, PUBLIC_TURNSTILE_SITE_KEY: siteKey };
  setEnvValues(values);
  process.env.PUBLIC_POMELNIC_WORKER_URL = workerUrl;
  process.env.PUBLIC_TURNSTILE_SITE_KEY = siteKey;
  if (!wrangler(["deploy"], { cwd: client }).ok) stop("the site did not deploy.");
}

async function attachDomain(zone, previewUrl) {
  step(`Custom domain ${DOMAIN} and ${WWW}`);
  if (zone?.status !== "active") {
    say("skipped: the zone is not active in this account.");
    return;
  }
  say(`This is the switch: ${DOMAIN} stops serving the old WordPress and serves ${previewUrl}'s content.`);
  say("It replaces the A/CNAME of the apex and www. mail., MX, SPF and DKIM stay. The zone as it stands:");
  await exportDns(zone);

  if (DRY) {
    say(`[dry-run] would require typing "${DOMAIN}" to confirm`);
  } else if ((await ask(`Check ${previewUrl} first. Type ${DOMAIN} to switch, Enter to leave it:`)) !== DOMAIN) {
    todo.push("When the preview looks right, run this again and type the domain at the switch.");
    return;
  }
  if (!wrangler(["deploy", "--domain", DOMAIN, "--domain", WWW], { cwd: client }).ok) stop("the domain did not attach.");
}

async function setUpGitHub(workerUrl, siteKey) {
  step("GitHub: publish admin saves to Cloudflare");
  const token = "Cloudflare → My Profile → API Tokens → Create Token → template \"Edit Cloudflare Workers\"";
  const hasGh = DRY || spawnSync("gh", ["auth", "status"], { stdio: "ignore" }).status === 0;
  if (!hasGh) {
    todo.push(
      `In ${REPO} → Settings → Secrets and variables → Actions add secrets CLOUDFLARE_API_TOKEN (${token}) and CLOUDFLARE_ACCOUNT_ID=${accountId}, and variables PUBLIC_POMELNIC_WORKER_URL=${workerUrl}, PUBLIC_TURNSTILE_SITE_KEY=${siteKey}.`,
    );
    return;
  }
  if (!(await yes(`Set the two variables and two secrets on ${REPO}?`))) return;

  const commands = [
    ["variable", "set", "PUBLIC_POMELNIC_WORKER_URL", "-R", REPO, "-b", workerUrl],
    ["variable", "set", "PUBLIC_TURNSTILE_SITE_KEY", "-R", REPO, "-b", siteKey],
    ["secret", "set", "CLOUDFLARE_ACCOUNT_ID", "-R", REPO, "-b", accountId],
  ];
  for (const args of commands) {
    if (DRY) say(`[dry-run] would run: gh ${args.join(" ")}`);
    else spawnSync("gh", args, { stdio: "inherit" });
  }
  say(`Create the token: ${token}. Paste it at the prompt.`);
  if (DRY) say(`[dry-run] would run: gh secret set CLOUDFLARE_API_TOKEN -R ${REPO}`);
  else spawnSync("gh", ["secret", "set", "CLOUDFLARE_API_TOKEN", "-R", REPO], { stdio: "inherit" });
}

// ---------------------------------------------------------------------------

if (!MAIL_TO || !SENDER_DOMAIN) stop("POMELNIC_TO and POMELNIC_FROM must be set in the worker's wrangler.jsonc.");
if (DRY) console.log("DRY RUN: no account is read or changed; public DNS is the only network call.");

const mx = async () => (await publicRecords(DOMAIN, "MX")).map((record) => record.split(" ").slice(3).join(" "));
const mxBefore = await mx();
console.log(`\n${DOMAIN} MX today: ${mxBefore.join(", ") || "(none)"}`);

await confirmAccount();
const zone = await findZone();

await deployForm();
const subdomain = await workersSubdomain();
const workerUrl = `https://${FORM_WORKER}.${subdomain}.workers.dev`;
const previewUrl = `https://${SITE_WORKER}.${subdomain}.workers.dev`;

const siteKey = await setUpTurnstile(subdomain);
await setUpMail(zone);
await setUpAdminLogin(subdomain);
deploySite(workerUrl, siteKey);
await attachDomain(zone, previewUrl);
await setUpGitHub(workerUrl, siteKey);

step("Result");
const mxAfter = await mx();
if (mxAfter.join() !== mxBefore.join()) say(`WARNING: the MX changed. Before: ${mxBefore}. Now: ${mxAfter}`);
else say("MX unchanged.");
say(`Preview: ${previewUrl}`);
say(`Form:    ${workerUrl}`);
todo.push(`Send one test pomelnic from ${previewUrl}/pomelnic/ and confirm it arrives at ${MAIL_TO}.`);
say("Left for you:");
todo.forEach((item, index) => say(`${index + 1}. ${item}`));

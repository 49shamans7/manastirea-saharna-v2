// Fill the CSP in <outDir>/_headers with the sha256 of every inline <script>
// in the build — the postbuild step after Pagefind.
//
//   bun ../../scripts/build-csp.mjs [outDir]      (default: $OUT_DIR, else apps/client/dist)
//
// public/_headers carries the token 'INLINE-SCRIPT-HASHES'; Astro inlines small
// scripts, so their hashes change whenever a component's script does. This
// runs on every build, so the policy always matches the HTML it ships with.
// Fails the build if the token is missing or a line outgrows Cloudflare's
// 2000-character limit.
import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const site = path.resolve(process.argv[2] || process.env.OUT_DIR || path.join(here, "../apps/client/dist"));
const TOKEN = "'INLINE-SCRIPT-HASHES'";

async function htmlFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await htmlFiles(full)));
    else if (entry.name.endsWith(".html")) out.push(full);
  }
  return out;
}

const hashes = new Set();
for (const file of await htmlFiles(site)) {
  const html = await readFile(file, "utf8");
  for (const [, attrs, body] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (/\bsrc\s*=/.test(attrs) || !body) continue;
    hashes.add(`'sha256-${createHash("sha256").update(body, "utf8").digest("base64")}'`);
  }
}

const headersFile = path.join(site, "_headers");
const headers = await readFile(headersFile, "utf8");
const policyLines = headers
  .split("\n")
  .filter((line) => /^\s+Content-Security-Policy:/.test(line) && line.includes(TOKEN));
if (policyLines.length === 0)
  throw new Error(`build-csp: no Content-Security-Policy line with ${TOKEN} in ${headersFile}`);
const filled = headers
  .split("\n")
  .map((line) =>
    /^\s+Content-Security-Policy:/.test(line) ? line.replaceAll(TOKEN, [...hashes].sort().join(" ")) : line,
  )
  .join("\n");
const longest = Math.max(...filled.split("\n").map((line) => line.length));
if (longest > 2000) throw new Error(`build-csp: a _headers line is ${longest} characters (Cloudflare's limit is 2000)`);
await writeFile(headersFile, filled);
console.log(
  `build-csp: ${hashes.size} inline script hash(es) → ${path.relative(process.cwd(), headersFile)} (longest line ${longest})`,
);

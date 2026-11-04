// The Pomelnic form: Turnstile, then one plain-text mail to the monastery.
// Nothing is stored and nothing a visitor typed reaches the logs.

type Env = {
  ALLOWED_ORIGINS: string;
  POMELNIC_TO: string;
  POMELNIC_FROM: string;
  TURNSTILE_SECRET_KEY: string;
  EMAIL: {
    send(message: {
      to: string;
      from: { email: string; name: string };
      replyTo: string;
      subject: string;
      text: string;
    }): Promise<unknown>;
  };
};

type Submission = {
  name: string;
  email: string;
  livingNames: string;
  departedNames: string;
  message: string;
};

/** The name of the site's own worker, for its workers.dev preview. */
const SITE_WORKER = "manastirea-saharna";
const FALLBACK_PATH = "/pomelnic/#pomelnic-form";
const TURNSTILE_ENDPOINT = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

// Cyrillic text is six bytes a letter once form-encoded.
const MAX_BODY_BYTES = 256 * 1024;
const MAX_LENGTH: Record<string, number> = {
  name: 200,
  email: 254,
  living_names: 10_000,
  departed_names: 10_000,
  message: 10_000,
  "cf-turnstile-response": 2_048,
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin") ?? "";
    const origins = allowedOrigins(request, env);
    const allowed = origins.has(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: allowed ? 204 : 403, headers: allowed ? corsHeaders(origin) : {} });
    }
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: { Allow: "POST, OPTIONS" } });
    }
    if (!allowed) {
      console.warn("[pomelnic] origin refused");
      return new Response("Forbidden", { status: 403 });
    }

    const size = Number(request.headers.get("Content-Length"));
    if (!size || size > MAX_BODY_BYTES) {
      return refuse(origin, FALLBACK_PATH, "size");
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return refuse(origin, FALLBACK_PATH, "unreadable");
    }

    const back = returnPath(field(form, "redirect"), origins);

    if (field(form, "botcheck")) {
      console.info("[pomelnic] honeypot");
      return redirect(origin, back, "ok");
    }

    const reason = invalidReason(form);
    if (reason) {
      return refuse(origin, back, reason);
    }

    const token = field(form, "cf-turnstile-response");
    if (!token || !(await verifyTurnstile(token, request, env))) {
      return redirect(origin, back, "challenge");
    }

    const sent = await sendPomelnic(
      {
        name: field(form, "name"),
        email: field(form, "email"),
        livingNames: field(form, "living_names"),
        departedNames: field(form, "departed_names"),
        message: field(form, "message"),
      },
      env,
    );

    return redirect(origin, back, sent ? "ok" : "send");
  },
};

function allowedOrigins(request: Request, env: Env): Set<string> {
  const origins = new Set(env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim()));
  const { hostname } = new URL(request.url);

  // saharna-pomelnic.<account>.workers.dev → manastirea-saharna.<account>.workers.dev.
  // Derived, never a wildcard: anyone can name a worker on their own account.
  if (hostname.endsWith(".workers.dev")) {
    origins.add(`https://${hostname.replace(/^[^.]+/, SITE_WORKER)}`);
  }

  return origins;
}

function corsHeaders(origin: string): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

function field(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/**
 * The page to go back to, as a path. The form names its page on the site's
 * canonical origin, which is not where a preview runs, and a redirect may only
 * land where the form came from: the caller joins this path to the checked
 * request origin, so no input can choose the host.
 */
function returnPath(value: string, origins: Set<string>): string {
  try {
    const url = new URL(value);
    return origins.has(url.origin) ? url.pathname + url.hash : FALLBACK_PATH;
  } catch {
    return FALLBACK_PATH;
  }
}

function invalidReason(form: FormData): string | null {
  for (const [key, limit] of Object.entries(MAX_LENGTH)) {
    if (field(form, key).length > limit) return "too-long";
  }

  if (!field(form, "name") || !field(form, "email")) return "required";
  if (!/^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]+$/.test(field(form, "email"))) return "email";
  if (!field(form, "living_names") && !field(form, "departed_names") && !field(form, "message")) return "empty";

  return null;
}

async function verifyTurnstile(token: string, request: Request, env: Env): Promise<boolean> {
  const body = new FormData();
  body.set("secret", env.TURNSTILE_SECRET_KEY);
  body.set("response", token);

  const ip = request.headers.get("CF-Connecting-IP");
  if (ip) body.set("remoteip", ip);

  try {
    const response = await fetch(TURNSTILE_ENDPOINT, { method: "POST", body });
    const result = (await response.json()) as { success?: boolean; "error-codes"?: string[] };

    if (result.success !== true) {
      console.warn("[pomelnic] turnstile refused", { codes: result["error-codes"] ?? [] });
    }

    return result.success === true;
  } catch {
    console.warn("[pomelnic] turnstile unreachable");
    return false;
  }
}

async function sendPomelnic(submission: Submission, env: Env): Promise<boolean> {
  const { name, email, livingNames, departedNames, message } = submission;

  try {
    await env.EMAIL.send({
      to: env.POMELNIC_TO,
      from: { email: env.POMELNIC_FROM, name: "Pomelnic Saharna" },
      replyTo: email,
      subject: `Pomelnic nou - ${name.replace(/\s+/g, " ")}`,
      text: [
        "Pomelnic nou primit de pe manastirea-saharna.md",
        "",
        `Nume: ${name}`,
        `Email: ${email}`,
        "",
        "Nume pentru pomenire (vii):",
        livingNames || "-",
        "",
        "Nume pentru pomenire (răposați):",
        departedNames || "-",
        "",
        "Mesaj:",
        message || "-",
      ].join("\n"),
    });
    console.info("[pomelnic] sent");
    return true;
  } catch (error) {
    // the code only: a message could quote an address
    console.error("[pomelnic] send failed", { code: (error as { code?: string }).code ?? "unknown" });
    return false;
  }
}

function refuse(origin: string, path: string, reason: string): Response {
  console.warn("[pomelnic] refused", { reason });
  return redirect(origin, path, "invalid");
}

function redirect(origin: string, path: string, status: string): Response {
  const url = new URL(path, origin);
  url.searchParams.set("pomelnic", status);
  return Response.redirect(url.toString(), 303);
}

type Env = {
  ALLOWED_ORIGIN: string;
  POMELNIC_TO: string;
  RESEND_API_KEY: string;
  RESEND_FROM: string;
  SITE_URL: string;
  TURNSTILE_SECRET_KEY: string;
};

type Submission = {
  name: string;
  email: string;
  livingNames: string;
  departedNames: string;
  message: string;
  language: string;
  redirect: string;
  turnstileToken: string;
  honeypot: string;
};

const MAX_FIELD_LENGTH = 4_000;
const RESEND_ENDPOINT = "https://api.resend.com/emails";
const TURNSTILE_ENDPOINT = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(env) });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", {
        status: 405,
        headers: { Allow: "POST, OPTIONS" },
      });
    }

    const origin = request.headers.get("Origin");
    if (origin && origin !== env.ALLOWED_ORIGIN) {
      return new Response("Forbidden", { status: 403 });
    }

    let submission: Submission;
    try {
      submission = await readSubmission(request, env);
    } catch (error) {
      console.warn("[pomelnic] invalid form submission", {
        error: error instanceof Error ? error.message : String(error),
      });
      return redirectTo(env.SITE_URL, "invalid");
    }

    if (submission.honeypot) {
      console.info("[pomelnic] honeypot submission ignored");
      return redirectTo(submission.redirect, "ok");
    }

    const validationError = validateSubmission(submission);
    if (validationError) {
      console.warn("[pomelnic] validation failed", {
        reason: validationError,
        hasTurnstileToken: Boolean(submission.turnstileToken),
        contentLengths: {
          livingNames: submission.livingNames.length,
          departedNames: submission.departedNames.length,
          message: submission.message.length,
        },
        language: submission.language || "n/a",
      });
      return redirectTo(submission.redirect, validationError);
    }

    const turnstileOk = await verifyTurnstile(submission.turnstileToken, request, env);
    if (!turnstileOk) {
      console.warn("[pomelnic] turnstile verification failed");
      return redirectTo(submission.redirect, "challenge");
    }

    const sent = await sendPomelnicEmail(submission, env);
    console.info("[pomelnic] submission processed", {
      sent,
      to: env.POMELNIC_TO,
      from: env.RESEND_FROM,
      language: submission.language || "n/a",
    });

    return redirectTo(submission.redirect, sent ? "ok" : "send");
  },
};

async function readSubmission(request: Request, env: Env): Promise<Submission> {
  const formData = await request.formData();

  return {
    name: getField(formData, "name"),
    email: getField(formData, "email"),
    livingNames: getField(formData, "living_names"),
    departedNames: getField(formData, "departed_names"),
    message: getField(formData, "message"),
    language: getField(formData, "language"),
    redirect: getSafeRedirect(getField(formData, "redirect"), env.SITE_URL),
    turnstileToken: getField(formData, "cf-turnstile-response"),
    honeypot: getField(formData, "botcheck"),
  };
}

function getField(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim().slice(0, MAX_FIELD_LENGTH) : "";
}

function getSafeRedirect(value: string, siteUrl: string): string {
  const fallback = `${siteUrl.replace(/\/$/, "")}/#pomelnic-form`;

  try {
    const url = new URL(value || fallback);
    const allowed = new URL(siteUrl);

    if (url.origin !== allowed.origin) {
      return fallback;
    }

    return url.toString();
  } catch {
    return fallback;
  }
}

function validateSubmission(submission: Submission): string | null {
  if (!submission.name || !submission.email) {
    return "required";
  }

  if (!isValidEmail(submission.email)) {
    return "email";
  }

  if (!submission.livingNames && !submission.departedNames && !submission.message) {
    return "empty";
  }

  if (!submission.turnstileToken) {
    return "challenge";
  }

  return null;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function verifyTurnstile(token: string, request: Request, env: Env): Promise<boolean> {
  const body = new FormData();
  body.set("secret", env.TURNSTILE_SECRET_KEY);
  body.set("response", token);

  const ip = request.headers.get("CF-Connecting-IP");
  if (ip) {
    body.set("remoteip", ip);
  }

  const response = await fetch(TURNSTILE_ENDPOINT, {
    method: "POST",
    body,
  });

  if (!response.ok) {
    console.warn("[pomelnic] turnstile endpoint failed", {
      status: response.status,
      statusText: response.statusText,
    });
    return false;
  }

  const result = (await response.json()) as { "error-codes"?: string[]; success?: boolean };
  if (result.success !== true) {
    console.warn("[pomelnic] turnstile rejected token", {
      errorCodes: result["error-codes"] || [],
    });
  }

  return result.success === true;
}

async function sendPomelnicEmail(submission: Submission, env: Env): Promise<boolean> {
  const subject = `Pomelnic nou - ${submission.name}`;
  const text = [
    "Pomelnic nou primit de pe manastirea-saharna.md",
    "",
    `Nume expeditor: ${submission.name}`,
    `Email expeditor: ${submission.email}`,
    `Limba formular: ${submission.language || "n/a"}`,
    "",
    "Nume pentru pomenire vii:",
    submission.livingNames || "-",
    "",
    "Nume pentru pomenire raposati:",
    submission.departedNames || "-",
    "",
    "Mesaj:",
    submission.message || "-",
  ].join("\n");

  const html = `
    <h1>Pomelnic nou</h1>
    <p><strong>Nume expeditor:</strong> ${escapeHtml(submission.name)}</p>
    <p><strong>Email expeditor:</strong> ${escapeHtml(submission.email)}</p>
    <p><strong>Limba formular:</strong> ${escapeHtml(submission.language || "n/a")}</p>
    <h2>Nume pentru pomenire vii</h2>
    <p>${formatMultilineHtml(submission.livingNames || "-")}</p>
    <h2>Nume pentru pomenire raposati</h2>
    <p>${formatMultilineHtml(submission.departedNames || "-")}</p>
    <h2>Mesaj</h2>
    <p>${formatMultilineHtml(submission.message || "-")}</p>
  `;

  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.RESEND_FROM,
      to: [env.POMELNIC_TO],
      reply_to: submission.email,
      subject,
      text,
      html,
    }),
  });

  if (!response.ok) {
    const responseBody = await response.text().catch(() => "");
    console.warn("[pomelnic] resend failed", {
      status: response.status,
      statusText: response.statusText,
      body: responseBody,
      from: env.RESEND_FROM,
      to: env.POMELNIC_TO,
    });
  }

  return response.ok;
}

function redirectTo(value: string, status: string): Response {
  const url = new URL(value);
  url.searchParams.set("pomelnic", status);

  return Response.redirect(url.toString(), 303);
}

function corsHeaders(env: Env): HeadersInit {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function formatMultilineHtml(value: string): string {
  return escapeHtml(value).replace(/\n/g, "<br>");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";

import worker from "../src/index";

const SITE = "https://manastirea-saharna.md";
const WORKER = "https://saharna-pomelnic.acct.workers.dev/";
const PREVIEW = "https://manastirea-saharna.acct.workers.dev";

const good = {
  name: "Ion Popescu",
  email: "ion@example.com",
  living_names: "Maria, Andrei",
  departed_names: "",
  message: "",
  redirect: `${SITE}/pomelnic/#pomelnic-form`,
  "cf-turnstile-response": "token",
};

let sent: Record<string, unknown>[];
let sendFails: boolean;
let turnstile: boolean;
let logged: string;
const spies: { mockRestore(): void }[] = [];

const env = () => ({
  ALLOWED_ORIGINS: `${SITE},https://www.manastirea-saharna.md`,
  POMELNIC_TO: "secretariat@manastirea-saharna.md",
  POMELNIC_FROM: "pomelnic@formular.manastirea-saharna.md",
  TURNSTILE_SECRET_KEY: "secret",
  EMAIL: {
    async send(message: Record<string, unknown>) {
      if (sendFails) throw Object.assign(new Error(`to ${String(message.replyTo)}`), { code: "E_DELIVERY_FAILED" });
      sent.push(message);
    },
  },
});

function post(fields: Record<string, string>, origin: string | null = SITE, url = WORKER) {
  const body = new URLSearchParams(fields).toString();
  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
    "Content-Length": String(body.length),
  };
  if (origin) headers.Origin = origin;
  return worker.fetch(new Request(url, { method: "POST", headers, body }), env() as never);
}

beforeEach(() => {
  sent = [];
  sendFails = false;
  turnstile = true;
  logged = "";
  const log = (...args: unknown[]) => void (logged += JSON.stringify(args));
  spies.push(spyOn(console, "info").mockImplementation(log));
  spies.push(spyOn(console, "warn").mockImplementation(log));
  spies.push(spyOn(console, "error").mockImplementation(log));
  spies.push(
    spyOn(globalThis, "fetch").mockImplementation((async () =>
      Response.json({ success: turnstile, "error-codes": turnstile ? [] : ["invalid-input-response"] })) as never),
  );
});

afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
});

describe("pomelnic worker", () => {
  test("sends the old form's fields, with Reply-To the sender", async () => {
    const response = await post(good);
    expect(response.status).toBe(303);
    expect(response.headers.get("Location")).toBe(`${SITE}/pomelnic/?pomelnic=ok#pomelnic-form`);
    expect(sent).toHaveLength(1);
    expect(sent[0]?.to).toBe("secretariat@manastirea-saharna.md");
    expect(sent[0]?.replyTo).toBe("ion@example.com");
    expect(sent[0]?.text).toContain("Maria, Andrei");
  });

  test("logs nothing a visitor typed", async () => {
    await post(good);
    sendFails = true;
    await post(good);
    await post({ ...good, email: "nope" });
    expect(logged).not.toMatch(/Popescu|ion@|nope|Maria|secretariat/);
    expect(logged).toContain("E_DELIVERY_FAILED");
  });

  test("the workers.dev preview works and returns to itself", async () => {
    const response = await post(good, PREVIEW);
    expect(response.headers.get("Location")).toBe(`${PREVIEW}/pomelnic/?pomelnic=ok#pomelnic-form`);
    expect(sent).toHaveLength(1);
  });

  test("a locale page keeps its path", async () => {
    const response = await post({ ...good, redirect: `${SITE}/ru/pomelnic/#pomelnic-form` });
    expect(response.headers.get("Location")).toBe(`${SITE}/ru/pomelnic/?pomelnic=ok#pomelnic-form`);
  });

  test("no open redirect", async () => {
    for (const redirect of ["https://evil.example/x", "//evil.example/x", "javascript:alert(1)", "/\\evil.example"]) {
      const response = await post({ ...good, redirect });
      expect(new URL(response.headers.get("Location")!).origin).toBe(SITE);
      expect(new URL(response.headers.get("Location")!).pathname).toBe("/pomelnic/");
    }
  });

  test("refuses other origins, a lookalike preview, and no origin", async () => {
    for (const origin of ["https://evil.example", "https://manastirea-saharna.evil.workers.dev", "null", null]) {
      expect((await post(good, origin)).status).toBe(403);
    }
    expect(sent).toHaveLength(0);
  });

  test("honeypot looks like success and sends nothing", async () => {
    const response = await post({ ...good, botcheck: "on" });
    expect(response.headers.get("Location")).toContain("pomelnic=ok");
    expect(sent).toHaveLength(0);
  });

  test("turnstile: missing or refused token sends nothing", async () => {
    expect((await post({ ...good, "cf-turnstile-response": "" })).headers.get("Location")).toContain("=challenge");
    turnstile = false;
    expect((await post(good)).headers.get("Location")).toContain("=challenge");
    expect(sent).toHaveLength(0);
  });

  test("invalid input: no email, bad email, nothing to pray for, too long", async () => {
    for (const change of [
      { email: "" },
      { email: "a b@c.d" },
      { email: "a@b.c>,x@y.z" },
      { living_names: "" },
      { message: "x".repeat(10_001) },
    ]) {
      expect((await post({ ...good, ...change })).headers.get("Location")).toContain("=invalid");
    }
    expect(sent).toHaveLength(0);
  });

  test("an oversized body is refused unread", async () => {
    const response = await post({ ...good, message: "x".repeat(300_000) });
    expect(response.headers.get("Location")).toContain("=invalid");
    expect(sent).toHaveLength(0);
  });

  test("a line break in the name cannot reach the subject", async () => {
    await post({ ...good, name: "Ion\r\nBcc: x@y.z" });
    expect(sent[0]?.subject).toBe("Pomelnic nou - Ion Bcc: x@y.z");
  });

  test("a failed send tells the visitor", async () => {
    sendFails = true;
    expect((await post(good)).headers.get("Location")).toContain("=send");
  });

  test("methods", async () => {
    const get = await worker.fetch(new Request(WORKER), env() as never);
    expect(get.status).toBe(405);
    expect(get.headers.get("Allow")).toBe("POST, OPTIONS");
    const preflight = (origin: string) =>
      worker.fetch(new Request(WORKER, { method: "OPTIONS", headers: { Origin: origin } }), env() as never);
    expect((await preflight(SITE)).headers.get("Access-Control-Allow-Origin")).toBe(SITE);
    expect((await preflight("https://evil.example")).status).toBe(403);
  });
});

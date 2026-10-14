// Internal link check on a build: every href/src/srcset under the base path must
// exist in the output. usage: node scripts/check-links.mjs [dist] [base]
import fs from "node:fs";
import path from "node:path";

const dist = path.resolve(process.argv[2] || "apps/client/dist");
const base = process.argv[3] || process.env.BASE_PATH || "/manastirea-saharna-v2";
const files = fs.readdirSync(dist, { recursive: true }).filter((f) => f.endsWith(".html"));
const missing = new Map();
const exists = (p) => fs.existsSync(p) || fs.existsSync(path.join(p, "index.html"));

for (const file of files) {
  const html = fs.readFileSync(path.join(dist, file), "utf8");
  const urls = [...html.matchAll(/(?:href|src)="([^"#?]+)/g)].map((m) => m[1]);
  for (const set of html.matchAll(/srcset="([^"]+)"/g))
    urls.push(...set[1].split(",").map((u) => u.trim().split(/\s+/)[0]));
  for (const url of urls) {
    if (!url.startsWith(base === "/" ? "/" : `${base}/`) || url.startsWith("//")) continue;
    let rel = decodeURIComponent(url.slice(base === "/" ? 0 : base.length));
    if (rel.endsWith("/")) rel += "index.html";
    if (!exists(path.join(dist, rel)) && !missing.has(url)) missing.set(url, file);
  }
}
// astro-i18n-aut writes /ro/404/ as a redirect stub to /404/, which is served by 404.html
missing.delete(`${base}/404/`);
console.log(`${files.length} pages, ${missing.size} broken internal links`);
for (const [url, file] of [...missing].slice(0, 30)) console.log(`  ${url}  <- ${file}`);
process.exit(missing.size ? 1 : 0);

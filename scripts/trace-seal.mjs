// Trace the Saharna seal from the 4140×2256 master (design/source/seal-master-4140.png)
// into a 4-colour layered SVG. Run from apps/client (for sharp):
//   node ../../scripts/trace-seal.mjs [scale=0.5] [turd=6]   (needs potrace: brew install potrace)
// Layers, bottom→top: cream silhouette, mist, gold, navy. Each layer is one
// binary mask traced with potrace, so each colour is exactly one <path>.
import sharp from "sharp";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const SRC = new URL("../design/source/seal-master-4140.png", import.meta.url).pathname;
const OUT = new URL("../.work/trace", import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });
const scale = +(process.argv[2] ?? 0.5);
const turd = +(process.argv[3] ?? 6);
const alphamax = +(process.argv[4] ?? 1.0);
const opttol = String(process.argv[5] ?? 0.4);
const outName = process.argv[6] ?? "seal-raw";

// measured on the master (histogram peaks)
const PAL = {
  cream: [248, 248, 245],
  navy: [34, 66, 90],
  gold: [171, 147, 98],
  mist: [220, 228, 231],
};
const C = [PAL.cream, PAL.navy, PAL.gold];

// square-ish crop around the seal (bbox 842..3350 × 109..2200), 24px margin
const M = 24;
// disc: the medallion only — outer ring fitted on the master: centre (2093.8, 1075.9), r 960.8
const disc = process.argv[7] === "disc";
const RING = { cx: 2093.8, cy: 1075.9, r: 960.8, clear: 906 };
// ring profile measured along radii (master px): navy 940–962, cream 930–940, gold 911–929
const box = disc
  ? {
      left: Math.round(RING.cx - RING.r - 8),
      top: Math.round(RING.cy - RING.r - 8),
      width: Math.round(2 * RING.r + 16),
      height: Math.round(2 * RING.r + 16),
    }
  : { left: 842 - M, top: 109 - M, width: 2508 + 2 * M, height: 2091 + 2 * M };
const W = Math.round(box.width * scale),
  H = Math.round(box.height * scale);
const { data } = await sharp(SRC)
  .extract(box)
  .removeAlpha()
  .resize(W, H, { kernel: "lanczos3" })
  .raw()
  .toBuffer({ resolveWithObject: true });

const N = W * H;
const label = new Uint8Array(N); // 0 cream 1 navy 2 gold
const mistish = new Uint8Array(N);
const d2 = (p, q) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2;
for (let i = 0; i < N; i++) {
  const p = [data[i * 3], data[i * 3 + 1], data[i * 3 + 2]];
  // nearest point on any palette segment (antialias = mix of two inks)
  let best = 1e12,
    lab = 0;
  for (let a = 0; a < 3; a++) {
    const da = d2(p, C[a]);
    if (da < best) {
      best = da;
      lab = a;
    }
    for (let b = a + 1; b < 3; b++) {
      const A = C[a],
        B = C[b];
      const v = [B[0] - A[0], B[1] - A[1], B[2] - A[2]];
      const t = Math.max(
        0,
        Math.min(
          1,
          ((p[0] - A[0]) * v[0] + (p[1] - A[1]) * v[1] + (p[2] - A[2]) * v[2]) / (v[0] ** 2 + v[1] ** 2 + v[2] ** 2),
        ),
      );
      const q = [A[0] + t * v[0], A[1] + t * v[1], A[2] + t * v[2]];
      const dq = d2(p, q);
      if (dq < best) {
        best = dq;
        lab = t < 0.5 ? a : b;
      }
    }
  }
  label[i] = lab;
  mistish[i] = d2(p, PAL.mist) < 14 ** 2 && d2(p, PAL.mist) < d2(p, PAL.cream) ? 1 : 0;
}

const idx = (x, y) => y * W + x;
function morph(src, r, op) {
  // square structuring element, separable
  const tmp = new Uint8Array(N),
    out = new Uint8Array(N);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let v = op === "erode" ? 1 : 0;
      for (let k = -r; k <= r; k++) {
        const xx = Math.min(W - 1, Math.max(0, x + k));
        const s = src[idx(xx, y)];
        v = op === "erode" ? v & s : v | s;
      }
      tmp[idx(x, y)] = v;
    }
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let v = op === "erode" ? 1 : 0;
      for (let k = -r; k <= r; k++) {
        const yy = Math.min(H - 1, Math.max(0, y + k));
        const s = tmp[idx(x, yy)];
        v = op === "erode" ? v & s : v | s;
      }
      out[idx(x, y)] = v;
    }
  return out;
}

// outside = cream reachable from the border
const outside = new Uint8Array(N);
const stack = [];
for (let x = 0; x < W; x++) {
  stack.push(idx(x, 0), idx(x, H - 1));
}
for (let y = 0; y < H; y++) {
  stack.push(idx(0, y), idx(W - 1, y));
}
while (stack.length) {
  const i = stack.pop();
  if (outside[i] || label[i] !== 0) continue;
  outside[i] = 1;
  const x = i % W,
    y = (i / W) | 0;
  if (x > 0) stack.push(i - 1);
  if (x < W - 1) stack.push(i + 1);
  if (y > 0) stack.push(i - W);
  if (y < H - 1) stack.push(i + W);
}
const sil = new Uint8Array(N);
for (let i = 0; i < N; i++) sil[i] = outside[i] ? 0 : 1;

if (disc) {
  // the silhouette is the fitted circle, exactly
  const cx = (RING.cx - box.left) * scale,
    cy = (RING.cy - box.top) * scale,
    rr = RING.r * scale;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const rad = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      sil[idx(x, y)] = rad <= rr ? 1 : 0;
      if (rad > RING.clear * scale) label[idx(x, y)] = 0;
    }
}
const navy = new Uint8Array(N),
  gold = new Uint8Array(N);
for (let i = 0; i < N; i++) {
  navy[i] = label[i] === 1 ? 1 : 0;
  gold[i] = label[i] === 2 ? 1 : 0;
}
// mist: open to kill antialias halos, then keep only on cream inside the seal
const r = Math.max(1, Math.round(3 * scale));
let mist = morph(morph(mistish, r, "erode"), r, "dilate");
for (let i = 0; i < N; i++) mist[i] = mist[i] && sil[i] && label[i] === 0 ? 1 : 0;
// seams: each lower layer creeps 1px under the inks drawn above it
const goldUnder = new Uint8Array(N),
  mistUnder = new Uint8Array(N);
for (let i = 0; i < N; i++) goldUnder[i] = gold[i] || (navy[i] && morph1(i, gold)) ? 1 : 0;
function morph1(i, m) {
  const x = i % W,
    y = (i / W) | 0;
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx,
        yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < W && yy < H && m[idx(xx, yy)]) return true;
    }
  return false;
}
for (let i = 0; i < N; i++) mistUnder[i] = mist[i] || ((navy[i] || gold[i]) && morph1(i, mist)) ? 1 : 0;

function pbm(mask, name) {
  const head = Buffer.from(`P4\n${W} ${H}\n`);
  const rowBytes = Math.ceil(W / 8);
  const body = Buffer.alloc(rowBytes * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) if (mask[idx(x, y)]) body[y * rowBytes + (x >> 3)] |= 0x80 >> (x & 7);
  const f = `${OUT}/${name}.pbm`;
  fs.writeFileSync(f, Buffer.concat([head, body]));
  return f;
}
function trace(mask, name) {
  const f = pbm(mask, name);
  const svg = execFileSync("potrace", [
    f,
    "-b",
    "svg",
    "--flat",
    "-t",
    String(turd),
    "-a",
    String(alphamax),
    "-O",
    opttol,
    "-u",
    "4",
    "-o",
    "-",
  ]).toString();
  const ds = [...svg.matchAll(/<path d="([^"]+)"/g)].map((m) => m[1]).join("");
  const tr = svg.match(/<g transform="([^"]+)"/)[1];
  return { ds, tr };
}
const layers = [
  ["cream", sil, "#f7f6f1"],
  ["mist", mistUnder, "#dbe3e6"],
  ["gold", goldUnder, "#ab9362"],
  ["navy", navy, "#22425a"],
];
let body = "",
  tr;
for (const [name, m, fill] of layers) {
  if (!m.some((v) => v)) continue;
  if (disc && name === "cream") continue; // drawn as a <circle>
  const t = trace(m, name);
  tr = t.tr;
  body += `<path fill="${fill}" d="${t.ds}"/>`;
  console.log(
    name,
    (t.ds.length / 1024).toFixed(1),
    "KB",
    m.reduce((s, v) => s + v, 0),
  );
}
const ccx = ((RING.cx - box.left) * scale).toFixed(1),
  ccy = ((RING.cy - box.top) * scale).toFixed(1),
  k = (v) => (v * scale).toFixed(1);
const circle = disc ? `<circle cx="${ccx}" cy="${ccy}" r="${k(RING.r)}" fill="#f7f6f1"/>` : "";
const rings = disc
  ? `<g fill="none" transform="translate(${ccx} ${ccy})"><circle r="${k(950)}" stroke="#22425a" stroke-width="${k(21.6)}"/><circle r="${k(920)}" stroke="#ab9362" stroke-width="${k(18)}"/></g>`
  : "";
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">${circle}<g transform="${tr}">${body}</g>${rings}</svg>`;
fs.writeFileSync(`${OUT}/${outName}.svg`, svg);
console.log(W, H, (svg.length / 1024).toFixed(1), "KB");

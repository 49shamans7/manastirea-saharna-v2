// The four zone plates of the home descent, from the monastery's own photographs.
//
//   bun scripts/build-plates.mjs            (or: node scripts/build-plates.mjs)
//   PLATES_NO_MODEL=1 bun scripts/build-plates.mjs   — force the resize-only path
//   PLATES_OUT=dir bun scripts/build-plates.mjs        — write somewhere else (comparisons)
//
// Writes apps/client/public/plates/{rock,green,gold-door,river}.webp at 1600w
// and the same with -800 at 800w (phones load less), WebP q80 (green q74),
// ≤350 KB; plus gold-door-portrait(.webp|-800.webp), 4:5, for the desktop door.
//
// PROVENANCE (owner's law). These are real places. Every step below is a
// measured correction of the photograph that was taken; nothing is generated,
// inpainted, replaced or removed. Allowed and used: choosing the frame, the
// crop, white balance / levels / gamma (the house grade, scripts/lib/
// restore.mjs), a calm saturation, a restoration upscale, gentle sharpening,
// and a fixed monochrome film grain that ties the four frames into a set.
// Choices and the reasons for them: .work/plates/CANDIDATES.html.
//
// THE UPSCALER. Three of the four zones exist in the archive only as 800×600
// frames (Sony DSC-HX1, 2014 album — the only calm, people-free documentary
// views of the cliff, the gorge and the Nistru). Served across a 1440 desktop
// or a 3× phone they need ×2. Real-ESRGAN (realesrgan-x4plus, ncnn-vulkan
// build v0.2.5.0, official GitHub release) is run at ×4 and then brought DOWN
// to the output width, and it is never used alone: its result is BLENDED with
// a plain Lanczos enlargement of the same frame (`model.blend`, the share of
// the model). The model restores edges — roof lines, window frames, the river
// bank — but on its own it turns limestone into plaster and leaves into
// brushwork; the Lanczos share keeps the photograph's own texture. Rock is the
// most sensitive surface, so it gets the smallest share. Judged at 100% in
// .work/plates/BEFORE-AFTER.html.
//
// Binary (not system-wide):  .work/tools/realesrgan/realesrgan-ncnn-vulkan
//   install: curl -L -o .work/tools/resr.zip https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesrgan-ncnn-vulkan-20220424-macos.zip
//            unzip .work/tools/resr.zip -d .work/tools/realesrgan
//   (sha256 of that zip: e0ad05580abfeb25f8d8fb55aaf7bedf552c375b5b4d9bd3c8d59764d2cc333a)
// When the binary is absent (or PLATES_NO_MODEL=1) the script falls back to
// the Lanczos-only path — same frames, crops, grade and grain, slightly softer
// edges — and says so. Model outputs are cached in .work/plates/cache/.
import { execFile } from "node:child_process";
import { access, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import sharp from "sharp";
import { analyse, gradeFor } from "./lib/restore.mjs";

sharp.concurrency(2);
const run = promisify(execFile);

const ROOT = path.resolve(import.meta.dirname, "..");
const ARCHIVE = path.resolve(ROOT, "../msaharna-archive/media/images");
const OUT = process.env.PLATES_OUT ? path.resolve(process.env.PLATES_OUT) : path.join(ROOT, "apps/client/public/plates");
const CACHE = path.join(ROOT, ".work/plates/cache");
const TOOL = path.join(ROOT, ".work/tools/realesrgan");
const BIN = path.join(TOOL, "realesrgan-ncnn-vulkan");
const MODEL = "realesrgan-x4plus";

const SIZES = [
  { suffix: "", width: 1600 },
  { suffix: "-800", width: 800 },
];
const QUALITY = 80;
const MAX_KB = 350;

// crop: { left, top, width, height } in source pixels (applied before scaling).
// tone.sat: saturation multiplier (calm, never boosted).
// tone.tint: [r,g,b] multipliers applied after the grade — a few percent
//   toward the zone's measured palette, the cold landscapes kept cold.
// grain: sigma of the monochrome grain at 1600w (scaled down for 800w).
const PLATES = [
  {
    // I · STÂNCA — the rock face of the cave monastery: the overhang, the
    // window cut into the stone with its icon behind glass, the doorway
    // below. Subtraction made literal. Chosen over 612.jpg (the old plate):
    // same wall, but no tree trunk across a third of it, no stray red sheet
    // and wicker fence at the edge — the rock is the whole picture.
    name: "rock",
    from: "2014/06/603.jpg", // Sony DSC-HX1, 800×600
    crop: null,
    model: { blend: 0.3 },
    tone: { sat: 0.72, tint: [0.985, 0.995, 1.03] }, // grey-lilac, cold
    grain: 4.2,
  },
  {
    // II · MĂNĂSTIREA VIE — the living monastery from the slope: Sfânta
    // Treime in ochre with green roofs, the blue church below, the cells,
    // the limestone band of the cliff above and the gorge forest all round.
    // Chosen over 1011.jpg (the old plate): the buildings are three times
    // larger in frame and the cliff ties it to Zone I.
    name: "green",
    from: "2014/06/491.jpg", // Sony DSC-HX1, 800×600
    crop: null, // full 4:3 — LANDING crops by object-position (PLATE-REQUESTS.md)
    model: { blend: 0.5 },
    tone: { sat: 0.82, tint: [1, 1, 0.99] },
    grain: 1.8,
    // the densest frame (forest at every scale): lighter grain and sharpen
    // and q74 keep it under 350 KB
    sharpen: 0.6,
    quality: 74,
  },
  {
    // III · RACLA — the relics of Cuviosul Macarie in the open shrine: the
    // black pall embroidered in thread gold, roses and gypsophila along the
    // velvet, the glass lid raised. Black cloth, thread gold, flowers — the
    // zone's palette is the object itself. NIKON D5300, 26 May 2019, indoors
    // (icon on the green wall, tiled floor). Not DSC_1064 of the same day,
    // which is the outdoor procession. Crop: a 4:3 window centred on the pall
    // so a portrait door (1:1.62) or a landscape panel both land on it.
    name: "gold-door",
    from: "2019/05/DSC_1069.jpg", // NIKON D5300, 4496×3000
    crop: { left: 55, top: 0, width: 4000, height: 3000 },
    model: null, // native resolution is ample
    tone: { sat: 0.9, tint: [1, 1, 1] },
    grain: 2.6,
  },
  {
    // III · the same frame, cut by hand for the desktop shrine door (4:5,
    // PLATE-REQUESTS.md "optional"): the raised lid with the icon of the
    // saint on the left edge, the pall and its thread-gold crosses down the
    // middle, the flowers either side.
    name: "gold-door-portrait",
    from: "2019/05/DSC_1069.jpg",
    crop: { left: 900, top: 0, width: 2400, height: 3000 },
    gradeCrop: { left: 55, top: 0, width: 4000, height: 3000 }, // grade exactly as gold-door
    sizes: [
      { suffix: "", width: 1200 },
      { suffix: "-800", width: 800 },
    ],
    model: null,
    tone: { sat: 0.9, tint: [1, 1, 1] },
    grain: 2.6,
  },
  {
    // IV · NISTRU — the river from the cliff above Saharna: the far bank's
    // limestone scar, the water, the village below. The only frame of the
    // Nistru in the archive (the README says none; this is it).
    name: "river",
    from: "2014/06/1201.jpg", // Sony DSC-HX1, 800×600
    crop: null,
    model: { blend: 0.45 },
    tone: { sat: 0.8, tint: [0.99, 1, 1.02] },
    grain: 3.6,
  },
];

const exists = (p) =>
  access(p).then(
    () => true,
    () => false,
  );
const useModel = process.env.PLATES_NO_MODEL !== "1" && (await exists(BIN));
if (!useModel) console.log("realesrgan not used — Lanczos-only fallback (see header)");

/** Real-ESRGAN ×4 of the (cropped) source, cached. */
async function modelUpscale(source) {
  await mkdir(CACHE, { recursive: true });
  const out = path.join(CACHE, `${path.basename(source, path.extname(source))}-${MODEL}-x4.png`);
  if (await exists(out)) return out;
  await run(BIN, ["-i", source, "-o", out, "-n", MODEL, "-s", "4", "-m", path.join(TOOL, "models")], {
    maxBuffer: 1 << 24,
  });
  return out;
}

const raw = (img) => img.removeAlpha().toColourspace("srgb").raw().toBuffer({ resolveWithObject: true });

/** Seeded monochrome grain, so a rebuild is byte-stable. */
function grainBuffer(width, height, sigma, seed = 1789) {
  let s = seed >>> 0;
  const rnd = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const g = new Float32Array(width * height);
  for (let i = 0; i < g.length; i += 1) {
    // Box–Muller
    const u = Math.max(1e-9, rnd());
    g[i] = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd()) * sigma;
  }
  return g;
}

for (const plate of PLATES) {
  const source = path.join(ARCHIVE, plate.from);
  const meta = await sharp(source).metadata();
  const crop = plate.crop ?? { left: 0, top: 0, width: meta.width, height: meta.height };
  const aspect = crop.height / crop.width;

  // the house grade, measured on the crop of the original frame
  const grade = gradeFor(await analyse(source, plate.gradeCrop ?? plate.crop ?? undefined));

  let upscaled = null;
  if (plate.model && useModel) {
    const x4 = await modelUpscale(source);
    upscaled = { file: x4, crop: { left: crop.left * 4, top: crop.top * 4, width: crop.width * 4, height: crop.height * 4 } };
  }

  for (const size of plate.sizes ?? SIZES) {
    const W = size.width;
    const H = Math.round(W * aspect);
    const base = await raw(sharp(source).extract(crop).resize(W, H, { kernel: "lanczos3" }));
    let data = base.data;
    const ch = base.info.channels;

    if (upscaled) {
      const m = await raw(sharp(upscaled.file).extract(upscaled.crop).resize(W, H, { kernel: "lanczos3" }));
      const k = plate.model.blend;
      const mixed = Buffer.allocUnsafe(data.length);
      for (let i = 0; i < data.length; i += 1) mixed[i] = Math.round(data[i] * (1 - k) + m.data[i] * k);
      data = mixed;
    }

    // grade (LUT per channel), tint, saturation
    const [lr, lg, lb] = grade.luts;
    const [tr, tg, tb] = plate.tone.tint;
    const sat = plate.tone.sat;
    const grain = grainBuffer(W, H, plate.grain * (W / 1600) ** 0.5, 1789 + W);
    const out = Buffer.allocUnsafe(W * H * 3);
    for (let p = 0, i = 0; p < W * H; p += 1, i += ch) {
      let r = lr[data[i]] * tr;
      let g = lg[data[i + 1]] * tg;
      let b = lb[data[i + 2]] * tb;
      const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      r = y + (r - y) * sat;
      g = y + (g - y) * sat;
      b = y + (b - y) * sat;
      // grain weighted to the midtones: none in the deepest blacks or whites
      const w = Math.min(1, (4 * y * (255 - y)) / (255 * 255) + 0.15);
      const n = grain[p] * w;
      out[p * 3] = Math.max(0, Math.min(255, Math.round(r + n)));
      out[p * 3 + 1] = Math.max(0, Math.min(255, Math.round(g + n)));
      out[p * 3 + 2] = Math.max(0, Math.min(255, Math.round(b + n)));
    }

    // gentle sharpening, on lightness only, flat areas left alone
    const reduction = crop.width / W; // <1 = enlarged
    const m2 = (reduction < 1 ? 0.6 : W >= 1200 ? 1.0 : 0.8) * (plate.sharpen ?? 1);
    const target = path.join(OUT, `${plate.name}${size.suffix}.webp`);
    await mkdir(OUT, { recursive: true });
    await sharp(out, { raw: { width: W, height: H, channels: 3 } })
      .sharpen({ sigma: W >= 1200 ? 0.8 : 0.6, m1: 0, m2, x1: 3, y2: 8, y3: 16 })
      .webp({ quality: plate.quality ?? QUALITY, effort: 6, smartSubsample: true })
      .toFile(target);

    const kb = Math.round((await stat(target)).size / 1024);
    console.log(
      `${(plate.name + size.suffix).padEnd(22)} ${plate.from.padEnd(22)} ${W}x${H}  ${String(kb).padStart(3)}KB  ` +
        `${upscaled ? `${MODEL} ×4 blend ${plate.model.blend}` : reduction < 1 ? "lanczos" : "downscale"}  ${grade.notes.join(", ")}` +
        (kb > MAX_KB ? "  ⚠ over budget" : ""),
    );
  }
}

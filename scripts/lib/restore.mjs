// Restoration for the monastery's documentary photographs — one module, every
// build script. Measured corrections only; nothing is generated or invented.
//
//   measure  — per source, once: luminance percentiles, clipping, the colour of
//              the near-neutral pixels (the cast), scene chroma, noise.
//   grade    — the house grade derived from the measurement (see AUDIT.md):
//              · white balance from the NEUTRAL pixels only (grey-world over
//                low-chroma midtones, not over the whole frame — a forest or a
//                gilded iconostasis is not a cast), partial strength, clamped;
//                green–magenta corrected harder than blue–yellow, warm casts
//                corrected least, so gold and ochre stay warm and the rock and
//                river stay cold;
//              · levels with clipping protection (black/white points from the
//                0.2 / 99.8 percentiles, capped, never clipping a channel that
//                was not already clipped);
//              · a clamped midtone gamma only for frames that are measurably
//                under- or over-exposed; low-key interiors keep their dark;
//              · median denoise blended in only when measured noise is high;
//              · unsharp mask on L, tuned to the output width and to how much
//                the source was reduced (flat areas never sharpened).
//   output   — WebP at the caller's quality (AVIF optional: avif: true).
//
// Horizon straightening is not done: none of the cameras in the archive write
// a roll angle to EXIF, and on handheld documentary frames full of icons and
// leaning crowds no heuristic was confident enough (AUDIT.md).
//
//   import { restore } from "./lib/restore.mjs";
//   await restore(source, [{ file: "a.webp", width: 1400, quality: 80 }, …]);
import { access, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

sharp.concurrency(2);
sharp.cache({ memory: 200, files: 0, items: 50 });

/** WebP quality → AVIF quality giving the same look at ~30% fewer bytes (AUDIT.md). */
export function avifQuality(webpQuality) {
  return Math.max(40, Math.round(0.55 * webpQuality + 8));
}

const exists = (file) =>
  access(file).then(
    () => true,
    () => false,
  );

// ── colour helpers ────────────────────────────────────────────────────────
const toLin = (v) => {
  v /= 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const toEnc = (v) => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);
const LIN = Float64Array.from({ length: 256 }, (_, i) => toLin(i));

function rgbToLab(r, g, b) {
  const R = toLin(r);
  const G = toLin(g);
  const B = toLin(b);
  const x = (0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047;
  const y = 0.2126 * R + 0.7152 * G + 0.0722 * B;
  const z = (0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);

  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

function labToRgb(L, a, b) {
  const fy = (L + 16) / 116;
  const fx = fy + a / 500;
  const fz = fy - b / 200;
  const inv = (t) => (t ** 3 > 0.008856 ? t ** 3 : (t - 16 / 116) / 7.787);
  const x = inv(fx) * 0.95047;
  const y = inv(fy);
  const z = inv(fz) * 1.08883;
  const R = 3.2406 * x - 1.5372 * y - 0.4986 * z;
  const G = -0.9689 * x + 1.8758 * y + 0.0415 * z;
  const B = 0.0557 * x - 0.204 * y + 1.057 * z;

  return [toEnc(Math.max(0, R)), toEnc(Math.max(0, G)), toEnc(Math.max(0, B))];
}

function percentile(hist, total, p) {
  const target = total * p;
  let acc = 0;
  for (let i = 0; i < hist.length; i += 1) {
    acc += hist[i];
    if (acc >= target) return i;
  }
  return hist.length - 1;
}

// ── measurement ───────────────────────────────────────────────────────────

/** Statistics of an sRGB raw buffer (3 channels). */
export function measurePixels(data, width, height, channels = 3) {
  const n = width * height;
  const histY = new Uint32Array(256);
  const histMax = new Uint32Array(256);
  let clipHi = 0;
  let clipLo = 0;
  let sumY = 0;
  let green = 0;
  let warm = 0;
  let cool = 0;
  let chromaSum = 0;
  const neutral = [];

  for (let i = 0; i < n; i += 1) {
    const o = i * channels;
    const r = data[o];
    const g = data[o + 1];
    const b = data[o + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const y = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
    histY[y] += 1;
    histMax[max] += 1;
    sumY += y;
    if (max >= 254) clipHi += 1;
    if (max <= 2) clipLo += 1;
    const sat = max === 0 ? 0 : (max - min) / max;
    chromaSum += max - min;

    if (sat > 0.2 && max > 30) {
      // coarse hue sectors: green foliage/roofs, warm (ochre, gold, skin), cool (sky, river)
      if (g >= r && g >= b) green += 1;
      else if (r >= g && g >= b) warm += 1;
      else if (b >= r) cool += 1;
    }
    if (y >= 35 && y <= 235 && max < 250 && sat < 0.22) neutral.push(sat, r, g, b);
  }

  // the most neutral half of the low-chroma midtones carries the cast
  const candidates = neutral.length / 4;
  const order = Array.from({ length: candidates }, (_, k) => k).sort((p, q) => neutral[p * 4] - neutral[q * 4]);
  const take = Math.max(1, Math.floor(candidates / 2));
  let R = 0;
  let G = 0;
  let B = 0;
  for (let k = 0; k < take && k < candidates; k += 1) {
    const j = order[k] * 4;
    R += LIN[neutral[j + 1]];
    G += LIN[neutral[j + 2]];
    B += LIN[neutral[j + 3]];
  }
  const nr = toEnc(R / take);
  const ng = toEnc(G / take);
  const nb = toEnc(B / take);
  const [nL, na, nbb] = rgbToLab(nr, ng, nb);

  return {
    width,
    height,
    meanY: sumY / n / 255,
    medianY: percentile(histY, n, 0.5) / 255,
    p002: percentile(histY, n, 0.002),
    p998: percentile(histY, n, 0.998),
    max998: percentile(histMax, n, 0.998),
    max9995: percentile(histMax, n, 0.9995),
    clipHi: clipHi / n,
    clipLo: clipLo / n,
    neutralFrac: candidates / n,
    neutral: { r: nr, g: ng, b: nb, L: nL, a: na, b_: nbb },
    green: green / n,
    warm: warm / n,
    cool: cool / n,
    chroma: chromaSum / n / 255,
  };
}

/**
 * Noise sigma (0–255) of a greyscale raw buffer — Immerkær's fast estimator,
 * restricted to the flattest half of the frame so texture is not read as noise.
 */
export function noiseSigma(grey, width, height) {
  const grad = new Float32Array(width * height);
  const lap = new Float32Array(width * height);
  const gh = new Uint32Array(1024);
  let count = 0;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x;
      const a = grey[i - width - 1];
      const b = grey[i - width];
      const c = grey[i - width + 1];
      const d = grey[i - 1];
      const e = grey[i];
      const f = grey[i + 1];
      const g = grey[i + width - 1];
      const h = grey[i + width];
      const k = grey[i + width + 1];
      const gx = c + 2 * f + k - a - 2 * d - g;
      const gy = g + 2 * h + k - a - 2 * b - c;
      const m = Math.abs(gx) + Math.abs(gy);
      grad[i] = m;
      gh[Math.min(1023, m)] += 1;
      count += 1;
      lap[i] = Math.abs(a - 2 * b + c - 2 * d + 4 * e - 2 * f + g - 2 * h + k);
    }
  }
  const limit = percentile(gh, count, 0.5);
  let sum = 0;
  let used = 0;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x;
      if (grad[i] > limit) continue;
      // skip blown or crushed areas: they have no noise to measure
      if (grey[i] < 12 || grey[i] > 243) continue;
      sum += lap[i];
      used += 1;
    }
  }
  if (used < 1000) return 0;

  return (Math.sqrt(Math.PI / 2) * sum) / (6 * used);
}

// ── the house grade ───────────────────────────────────────────────────────

export const GRADE = {
  // white balance
  castDeadZone: 1.5, // Lab units of neutral cast ignored entirely
  strengthGM: 0.7, // green–magenta (a*): almost always an error (phones, fluorescents)
  strengthCool: 0.45, // blue cast: partial — cold landscape is canon
  strengthWarm: 0.4, // yellow/orange cast: least — gold interiors, ochre walls
  strengthWarmGold: 0.2, // …and less still when warm made things dominate the frame
  maxShift: 6, // Lab units, total correction cap
  minNeutral: 0.03, // fraction of frame that must be neutral to trust the measurement
  maxGain: 0.08, // per channel, on encoded values
  // levels
  blackCap: 12, // never pull a black point higher than this (haze is lifted, shadows are not crushed)
  whiteFloor: 236, // a white point is only pulled down from above this
  levelsStrength: 0.75,
  maxStretch: 1.12,
  // midtones
  midTarget: 0.43,
  midLowKey: 0.18, // median below this = a dark interior: leave it dark
  gammaMin: 0.9,
  gammaMax: 1.08,
  midStrength: 0.5,
  // noise (sigma, 0–255, at output width)
  noiseOn: 3.2,
  noiseFull: 6,
  noiseMix: [0.3, 0.65],
};

/** The correction for one source, from its measurement. Pure. */
export function gradeFor(m, opts = {}) {
  const G = { ...GRADE, ...opts };
  const notes = [];

  // white balance ------------------------------------------------------
  let gains = [1, 1, 1];
  const { a, b_ } = m.neutral;
  if (m.neutralFrac >= G.minNeutral) {
    // a green-dominated frame (forest, roofs) tints its own neutrals green; a
    // cold landscape tints them blue. Neither is a cast — damp, don't neutralise.
    const greenScene = m.green > 0.35;
    const coolScene = m.cool > 0.4;
    const gm = a < 0 && greenScene ? G.strengthGM * 0.3 : G.strengthGM;
    let da = Math.abs(a) > G.castDeadZone ? -(a - Math.sign(a) * G.castDeadZone) * gm : 0;
    let db = 0;
    if (Math.abs(b_) > G.castDeadZone) {
      const excess = b_ - Math.sign(b_) * G.castDeadZone;
      const warmScene = m.warm > 0.25 && m.warm > 2 * m.cool;
      const k =
        b_ > 0 ? (warmScene ? G.strengthWarmGold : G.strengthWarm) : coolScene ? G.strengthCool * 0.4 : G.strengthCool;
      db = -excess * k;
    }
    const mag = Math.hypot(da, db);
    if (mag > G.maxShift) {
      da *= G.maxShift / mag;
      db *= G.maxShift / mag;
    }
    if (mag > 0.05) {
      const target = labToRgb(m.neutral.L, a + da, b_ + db);
      const src = [m.neutral.r, m.neutral.g, m.neutral.b];
      gains = target.map((t, i) => Math.min(1 + G.maxGain, Math.max(1 - G.maxGain, t / Math.max(1, src[i]))));
      // keep luminance of the neutral where it was
      const y0 = 0.2126 * src[0] + 0.7152 * src[1] + 0.0722 * src[2];
      const y1 = 0.2126 * src[0] * gains[0] + 0.7152 * src[1] * gains[1] + 0.0722 * src[2] * gains[2];
      gains = gains.map((g) => (g * y0) / y1);
      notes.push(`wb a${a.toFixed(1)}→${(a + da).toFixed(1)} b${b_.toFixed(1)}→${(b_ + db).toFixed(1)}`);
    }
  } else {
    notes.push("wb skipped (too few neutrals)");
  }

  // levels -------------------------------------------------------------
  const gmax = Math.max(...gains);
  let black = 0;
  let white = 255;
  if (m.p002 > 2 && m.clipLo < 0.002) black = Math.min(G.blackCap, m.p002 - 1) * G.levelsStrength;
  // white from the brightest channel after gains, so no channel newly clips
  const top = Math.min(255, m.max998 * gmax);
  if (m.clipHi < 0.004 && top < G.whiteFloor) white = 255 - (255 - top - 3) * G.levelsStrength;
  if (top > 255) white = top; // gains would clip: give the headroom back
  let stretch = 255 / (white - black);
  if (stretch > G.maxStretch) {
    const k = (G.maxStretch - 1) / (stretch - 1);
    black *= k;
    white = 255 - (255 - white) * k;
    stretch = 255 / (white - black);
  }
  if (black || white !== 255) notes.push(`levels ${black.toFixed(1)}–${white.toFixed(1)}`);

  // midtones -----------------------------------------------------------
  let gamma = 1;
  const med = Math.min(1, Math.max(0.001, (m.medianY * 255 - black) * stretch) / 255);
  if (med > G.midLowKey && (med < G.midTarget - 0.08 || med > G.midTarget + 0.2)) {
    const ideal = Math.log(G.midTarget) / Math.log(med);
    gamma = 1 + (ideal - 1) * G.midStrength;
    gamma = Math.min(G.gammaMax, Math.max(G.gammaMin, gamma));
    // over-bright frames: only pull down when highlights are not already the subject
    if (gamma > 1 && m.clipHi > 0.02) gamma = 1;
    if (Math.abs(gamma - 1) < 0.01) gamma = 1;
    if (gamma !== 1) notes.push(`gamma ${gamma.toFixed(3)}`);
  }

  // one LUT per channel
  const luts = gains.map((gain) => {
    const lut = new Uint8Array(256);
    for (let v = 0; v < 256; v += 1) {
      let x = (v * gain - black) / (white - black);
      x = Math.min(1, Math.max(0, x));
      lut[v] = Math.round(255 * x ** gamma);
    }
    return lut;
  });
  const identity = gains.every((g) => Math.abs(g - 1) < 0.002) && black === 0 && white === 255 && gamma === 1;

  return { gains, black, white, gamma, luts, identity, notes };
}

/** Unsharp mask for an output width and the reduction it came from. */
export function sharpenFor(width, reduction, denoised) {
  let s;
  if (width >= 1200) s = { sigma: 0.7, m2: 1.3 };
  else if (width >= 700) s = { sigma: 0.6, m2: 1.1 };
  else s = { sigma: 0.5, m2: 0.9 };
  if (reduction < 1.15)
    s.m2 *= 0.45; // served at native size: the JPEG grain is the detail limit
  else if (reduction < 1.6) s.m2 *= 0.75;
  if (denoised) s.m2 *= 0.7;

  return { sigma: s.sigma, m1: 0, m2: +s.m2.toFixed(2), x1: 2.5, y2: 10, y3: 20 };
}

// ── pipeline ──────────────────────────────────────────────────────────────

const statsCache = new Map();

/** Decode once at `width` (EXIF-rotated, never enlarged) → raw sRGB. */
async function decode(source, width, extract) {
  let img = sharp(source, { failOn: "none" }).rotate();
  if (extract) img = img.extract(extract);
  const { data, info } = await img
    .resize({ width, withoutEnlargement: true, kernel: "lanczos3" })
    .removeAlpha()
    .toColourspace("srgb")
    .raw()
    .toBuffer({ resolveWithObject: true });

  return { data, info };
}

/** Measurement of a source (cached per process). */
export async function analyse(source, extract) {
  const key = `${source}|${extract ? JSON.stringify(extract) : ""}`;
  if (statsCache.has(key)) return statsCache.get(key);
  let img = sharp(source, { failOn: "none" }).rotate();
  if (extract) img = img.extract(extract);
  const { data, info } = await img
    .resize(640, 640, { fit: "inside", withoutEnlargement: true })
    .removeAlpha()
    .toColourspace("srgb")
    .raw()
    .toBuffer({ resolveWithObject: true });
  const m = measurePixels(data, info.width, info.height, info.channels);
  statsCache.set(key, m);

  return m;
}

function applyLuts(data, channels, luts) {
  const out = Buffer.allocUnsafe(data.length);
  for (let i = 0; i < data.length; i += channels) {
    out[i] = luts[0][data[i]];
    out[i + 1] = luts[1][data[i + 1]];
    out[i + 2] = luts[2][data[i + 2]];
    for (let c = 3; c < channels; c += 1) out[i + c] = data[i + c];
  }
  return out;
}

async function greyOf(data, info) {
  return sharp(data, { raw: info }).greyscale().raw().toBuffer();
}

/**
 * Restore `source` into every output. Each output: { file, width, quality,
 * crop? }. `file` ends in .webp. Pass `avif: true` to also write a same-named
 * .avif (off since 2026-10-07: the site serves WebP only). `crop` is { left, top, width, height } in
 * oriented source pixels (used for square gallery tiles).
 *
 * Returns { width, height } of the oriented source, the grade and per-output
 * results, or null if the source is not a readable image.
 */
export async function restore(source, outputs, { force = false, avif = false, grade: gradeOpts, log } = {}) {
  let meta;
  try {
    meta = await sharp(source, { failOn: "none" }).metadata();
  } catch {
    return null;
  }
  if (!meta.width || !meta.height) return null;
  const turned = (meta.orientation ?? 1) >= 5;
  const size = turned ? { width: meta.height, height: meta.width } : { width: meta.width, height: meta.height };

  const todo = [];
  for (const out of outputs) {
    const avifFile = out.file.replace(/\.webp$/, ".avif");
    const need = force || !(await exists(out.file)) || (avif && !(await exists(avifFile)));
    if (need) todo.push({ ...out, avifFile });
  }
  if (todo.length === 0) return { size, skipped: true };

  // group by crop so a tile and a full frame each get their own measurement
  const groups = new Map();
  for (const out of todo) {
    const key = out.crop ? JSON.stringify(out.crop) : "";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(out);
  }

  const results = [];
  let lastGrade;
  for (const [, outs] of groups) {
    const crop = outs[0].crop;
    const m = await analyse(source, crop);
    const grade = gradeFor(m, gradeOpts);
    lastGrade = grade;
    const srcWidth = crop ? crop.width : size.width;
    const maxWidth = Math.min(srcWidth, Math.max(...outs.map((o) => o.width)));
    // decode once at the largest output, then reduce from there
    const base = await decode(source, maxWidth, crop);
    const graded = grade.identity ? base.data : applyLuts(base.data, base.info.channels, grade.luts);
    const info = { width: base.info.width, height: base.info.height, channels: base.info.channels };

    for (const out of outs.sort((p, q) => q.width - p.width)) {
      const width = Math.min(out.width, info.width);
      let data = graded;
      let w = info.width;
      let h = info.height;
      if (width < info.width) {
        const r = await sharp(graded, { raw: info })
          .resize({ width, kernel: "lanczos3" })
          .raw()
          .toBuffer({ resolveWithObject: true });
        data = r.data;
        w = r.info.width;
        h = r.info.height;
      }
      const rawInfo = { width: w, height: h, channels: info.channels };

      // noise at this output size
      const sigma = noiseSigma(await greyOf(data, rawInfo), w, h);
      let denoised = false;
      if (sigma > GRADE.noiseOn) {
        const med = await sharp(data, { raw: rawInfo }).median(3).raw().toBuffer();
        const [lo, hi] = GRADE.noiseMix;
        const k = lo + (hi - lo) * Math.min(1, (sigma - GRADE.noiseOn) / (GRADE.noiseFull - GRADE.noiseOn));
        const mixed = Buffer.allocUnsafe(data.length);
        for (let i = 0; i < data.length; i += 1) mixed[i] = Math.round(data[i] * (1 - k) + med[i] * k);
        data = mixed;
        denoised = k;
      }

      const reduction = srcWidth / w;
      const sharpen = sharpenFor(w, reduction, denoised);
      const pipeline = sharp(data, { raw: rawInfo }).sharpen(sharpen);
      const buf = await pipeline.raw().toBuffer();
      const finalImg = () => sharp(buf, { raw: rawInfo });

      await mkdir(path.dirname(out.file), { recursive: true });
      await finalImg().webp({ quality: out.quality, effort: 5 }).toFile(out.file);
      if (avif) {
        await finalImg()
          .avif({ quality: out.avifQuality ?? avifQuality(out.quality), effort: 4, chromaSubsampling: "4:2:0" })
          .toFile(out.avifFile);
      }
      const r = {
        file: out.file,
        width: w,
        height: h,
        sigma: +sigma.toFixed(2),
        denoise: denoised ? +denoised.toFixed(2) : 0,
        sharpen,
      };
      results.push(r);
      log?.(r, grade);
    }
  }

  return { size, grade: lastGrade, results };
}

/**
 * The square a 1:1 tile should show: the largest square in the oriented frame,
 * placed by sharp's attention strategy (skin, saturation, luminance contrast —
 * it lands on faces and icons rather than on floor or sky). `bias` overrides it
 * with a fixed position along the long side, 0 = start … 1 = end.
 */
export async function focusSquare(source, bias) {
  const meta = await sharp(source, { failOn: "none" }).metadata();
  const turned = (meta.orientation ?? 1) >= 5;
  const w = turned ? meta.height : meta.width;
  const h = turned ? meta.width : meta.height;
  const side = Math.min(w, h);
  if (w === h) return { left: 0, top: 0, width: side, height: side };
  if (bias !== undefined) {
    const slack = Math.max(w, h) - side;
    const off = Math.round(slack * Math.min(1, Math.max(0, bias)));
    return w > h ? { left: off, top: 0, width: side, height: side } : { left: 0, top: off, width: side, height: side };
  }
  const { info } = await sharp(source, { failOn: "none" })
    .rotate()
    .resize({ width: side, height: side, fit: "cover", position: sharp.strategy.attention })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const left = Math.min(w - side, Math.abs(info.cropOffsetLeft ?? 0));
  const top = Math.min(h - side, Math.abs(info.cropOffsetTop ?? 0));

  return { left, top, width: side, height: side };
}

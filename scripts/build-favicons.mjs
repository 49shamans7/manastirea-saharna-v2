// Favicon set, rendered from the seal's SVG code (src/assets/marks/):
//   favicon.svg  → public/favicon.svg (copied) and favicon.ico (16/32/48 PNG-in-ICO)
//   seal-mini.svg → apple-touch-icon (on the church green), icon-192, icon-512
// Run from apps/client:
//   node ../../scripts/build-favicons.mjs
import sharp from "sharp";
import fs from "node:fs";

const FAV = "src/assets/marks/favicon.svg";
const MINI = "src/assets/marks/seal-mini.svg";
// rasterise at high density, then downsample: crisp edges at every size
const render = (src, n) =>
  sharp(src, { density: Math.max(72, Math.ceil((72 * n * 4) / 32)) })
    .resize(n, n, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

fs.copyFileSync(FAV, "public/favicon.svg");

const sizes = [16, 32, 48];
const bufs = await Promise.all(sizes.map((n) => render(FAV, n)));
// ICO with embedded PNGs
const head = Buffer.alloc(6 + 16 * sizes.length);
head.writeUInt16LE(0, 0);
head.writeUInt16LE(1, 2);
head.writeUInt16LE(sizes.length, 4);
let off = head.length;
sizes.forEach((n, i) => {
  const e = 6 + 16 * i;
  head.writeUInt8(n, e);
  head.writeUInt8(n, e + 1);
  head.writeUInt8(0, e + 2);
  head.writeUInt8(0, e + 3);
  head.writeUInt16LE(1, e + 4);
  head.writeUInt16LE(32, e + 6);
  head.writeUInt32LE(bufs[i].length, e + 8);
  head.writeUInt32LE(off, e + 12);
  off += bufs[i].length;
});
fs.writeFileSync("public/favicon.ico", Buffer.concat([head, ...bufs]));

// apple touch icon: opaque, the medallion on the church green
await sharp(await render(MINI, 148))
  .extend({ top: 16, bottom: 16, left: 16, right: 16, background: "#253528" })
  .flatten({ background: "#253528" })
  .png()
  .toFile("public/apple-touch-icon.png");
fs.writeFileSync("public/icon-192.png", await render(MINI, 192));
fs.writeFileSync("public/icon-512.png", await render(MINI, 512));
// social preview card (og:image): the full seal on the green plate, 1200×630
{
  const plate = await sharp("public/plates/green.webp").resize(1200, 630, { fit: "cover" }).modulate({ brightness: 0.55 }).toBuffer();
  const seal = await sharp(fs.readFileSync("src/assets/marks/seal.svg"), { density: 300 }).resize({ height: 440 }).png().toBuffer();
  await sharp(plate)
    .composite([{ input: seal, gravity: "center" }])
    .jpeg({ quality: 84, mozjpeg: true })
    .toFile("public/og.jpg");
}
console.log("ok");

// The five derivatives of one gallery photograph, shared by build-gallery.mjs
// and build-gallery-curated.mjs. All restored (restore.mjs), webp.
//   <base>.webp           ≤1400w lightbox frame, native aspect
//   <base>-thumb.webp     480w, native aspect (chamber pages use it too)
//   <base>-thumb-sm.webp  360w, native aspect
//   <base>-sq.webp        480×480 square tile
//   <base>-sq-sm.webp     360×360 square tile
import { focusSquare, restore } from "./restore.mjs";

const FULL = { width: 1400, quality: 80 };
const THUMB = { width: 480, quality: 72 };
// phones show three columns (~118 css px): 360w covers them at 3×
const THUMB_SMALL = { width: 360, quality: 68 };

// Square-tile overrides: slug → position of the square along the long side
// (0 = left/top … 1 = right/bottom). Only where focusSquare()'s attention
// placement was checked on the contact sheet and found wrong.
export const FOCUS = {
  1451: 0.3, // complex — the elder's portrait in its medallion: keep the whole face
  153: 0.5, // complex — dome and cross, not empty sky
  1031: 0, // complex — the wall icon's head, not its hem
  323: 0, // sfantaTreime — the Theotokos fresco's face was split by the edge
  "1-11": 0.56, // sfantaTreime — centre the icon in its garlands
  211: 0.5, // sfantaTreime — Mother and Child both in frame
  1311: 1, // nasterea — the church sits at the right of the frame
  1414: 0.5, // nasterea — the whole façade
};

/** Returns the oriented source size, or null if it is not a readable image. */
export async function derive(from, toBase, slug) {
  const crop = await focusSquare(from, FOCUS[slug]).catch(() => null);
  if (!crop) return null;
  const done = await restore(
    from,
    [
      { file: `${toBase}.webp`, ...FULL },
      { file: `${toBase}-thumb.webp`, ...THUMB },
      { file: `${toBase}-thumb-sm.webp`, ...THUMB_SMALL },
      { file: `${toBase}-sq.webp`, ...THUMB, crop },
      { file: `${toBase}-sq-sm.webp`, ...THUMB_SMALL, crop },
    ],
    { force: true },
  );

  return done?.size ?? null;
}

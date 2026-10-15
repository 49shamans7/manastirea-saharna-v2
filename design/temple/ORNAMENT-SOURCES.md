# Ornament sources — 2026-10-10

## Used: drawn in-house from the seal (no third-party material)
All files in `apps/client/src/assets/ornaments/` are redrawn by hand from motifs on
Gelu's own mark, `src/assets/marks/seal.svg` (folk band on the seal's ring). No
borrowed vector data. Flat, opaque inks only (navy #22425A, gold #AB9362 / #C9B07A,
paper #F7F6F1, or currentColor) — no transparency, no gradients, no glow.

| file | motif | inks |
|---|---|---|
| rhomb.svg | hooked rhomb with gold heart (the seal's side motif) | currentColor + #C9B07A |
| tulip.svg | tulip sprig crowning the band | currentColor |
| divider.svg | hairline · rhomb · hooked rhomb · rhomb · hairline | currentColor + #C9B07A |
| band.svg | repeat tile: rhombs between two rules | #AB9362 baked (CSS background) |

## Looked at, not used (licence)
- Figma Community — no Romanian/Moldovan embroidery file with a stated licence found by
  web search; Figma MCP not authenticated (owner has not granted). Nothing taken.
- ClipArt ETC (etc.usf.edu) Byzantine borders — free licence is **non-commercial
  classroom only**; commercial needs a paid licence. Not used.
- Racinet, *L'Ornement polychrome* (1869) via fromoldbooks.org — public domain (USA),
  raster scans only; usable as reference for future redraws, nothing taken.
- Creative Market / Gumroad "Romanian Folk Pattern" packs (Shyeno, S. Pentea,
  R. Giuroiu) — paid commercial licences; not bought, not used.
- Adobe Stock / Alamy / Shutterstock embroidery vectors — stock licences; not used.
- Wikimedia Commons — no Romanian embroidery SVG found by search.

Reference only (motif vocabulary): eliznik.org.uk — "Embroidery stitches and motifs".

# Gothic / Moldavian — 2026-10-15

The owner chose a gothic display voice (GOTHIC.md). This layer gives the
gothic an address: **Moldavia under Stephen the Great**, where Byzantine plans
were built by Gothic masons. Every file below was constructed in-house from
geometry (no vector data, raster or trace was taken). Sources were used only
to understand each motif.

## What the research found

- **Moldavian style (1457–1504 and after).** "A Byzantine plan executed by Gothic
  hands and according to Gothic principles": a trefoil (triconch) plan, the
  Moldavian vault, and Gothic stone frames for the doors and windows.
  Pătrăuți (1487): "its doors and windows display Gothic framing elements…
  Gothic profiles on its frames and portals". Voroneț (1488): "the small windows,
  their rectangular frames of crossed rods and the receding pointed or
  shouldered arches of the interior doorframes are Gothic". The exonarthex
  doors of 1547 are rectangular: Gothic turning to Renaissance.
  Sources: sites.tufts.edu/patrauti/overview; smarthistory.org (Pătrăuți);
  en.wikipedia.org/wiki/Voroneț_Monastery; Moldavian_architectural_style.
- **Crossed rods (Stabwerk).** The signature of the Moldavian frame. The mouldings
  are rods, and they do not stop at the corner: they cross and run past each
  other. This is the most Moldavian and most legible Gothic motif at small sizes,
  because it is all straight 1px lines.
- **Brâu (the belt).** A torus moulding with a twisted-rope surface that girdles the
  church between two fillets. Dragomirna (1602–09) carries the richest one, read
  locally as the Holy Trinity, three strands in one. (Saharna's own church is
  dedicated to the Trinity.) Sources: en.wikipedia.org/wiki/Dragomirna_Monastery;
  lepetitjournal.com (Bucovina guide).
- **Saharna's region.** Căpriana (1542–45, Petru Rareș) is the oldest standing
  church in today's Moldova, built in stone in the Moldavian style with Byzantine
  and Gothic elements. Saharna's Trinity church (1777) is described as an
  example of the old Moldovan style. Sources: en.wikipedia.org/wiki/Căpriana_monastery;
  en.wikipedia.org/wiki/Saharna_Monastery.
- **Gothic tracery.** A foil is made from equal circles that overlap, and they meet
  in points called cusps. There are trefoils (3), quatrefoils (4) and cinquefoils (5).
  Source: en.wikipedia.org/wiki/Foil_(architecture). In an equilateral pointed arch,
  each arc is centred on the opposite springing point, with radius = span.
- **Not found / not used.** No academic text online describes the portal mouldings
  profile by profile. G. Balș, *Bisericile lui Ștefan cel Mare* (restitutio.bcub.ro)
  is the authority, but the PDF was too large to read here. No Figma Community file
  was used.

## What reads at 16–40px (tested in Chrome at 1× and 2×)

- **Rope.** Slanted lenses with pointed tips read as *laurel*. A rope needs strands
  that share their flanks, so only a thin S-line of ground shows between them, and
  domed ends that leave a V notch at the edge of the rope. The V is what tells the
  eye "twist". This works down to 16px tall, with an 8px period.
- **Arches.** At 30px, three nested arch lines blur together. Use one line arch plus
  a solid lancet (the dark of the doorway). Solids survive small sizes, and third
  lines do not.
- **Quatrefoil.** At 18px, a 2-unit stroke (≈1px) with semicircular lobes keeps
  its four lobes. A filled heart (the seal's rhomb) stops it reading as a flower.
- **Cusps and trefoil heads.** These need lobes of at least 4px, so they are not
  used below about 48px. For that reason no trefoil-headed arch was drawn yet.
- **Crossed rods.** These are crisp at any size, because they are pixel-snapped
  1px CSS lines.

## Made

| file / class | construction | inks | used on |
|---|---|---|---|
| `brau.svg` · `.r-brau` | 32×20 repeat tile; fillets at y 0 and 19; strands every 8 (S flanks, domed caps), outlined 1.25 in the ground | #AB9362 on #1A3346, baked | the landing, the seam between III · the shrine and IV · the valley (one place only) |
| `portal.svg` · `<Ornament name="portal">` | crossed-rod frame; equilateral pointed moulding, span 20 (springing 27.32); solid equilateral lancet, span 12 (springing 26.39) | currentColor + `--portal-void` (#22425A) | every chamber head, above the eyebrow (30×39, 34×44 ≥900px) |
| `quatrefoil.svg` · `<Ornament name="quatrefoil">` | 4 semicircular lobes, r 6.5, cusps at 16±6.5; the seal's rhomb as the heart | currentColor + #C9B07A | footer: `.r-foil` hairline · quatrefoil · hairline (in place of the 60px rule) |
| `--r-rods` · `.r-rods` (river.css) | 8 opaque 1px gold lines: rods 4px and 7px in from each edge, each running edge to edge so they cross at the corners | #AB9362 | the versal in gold (shrine) chambers; the first figure in every chamber (10px padding) |

Component: `components/ornament/Ornament.astro` (inline, currentColor).

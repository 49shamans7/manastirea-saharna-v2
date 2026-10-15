# Gothic — v2's display voice

Owner, 2026-10-15: "the first design file … I like this gothic feel, bring it
to the website." Source: Figma `du1AicpAxZSKgGy0yJed4h` (Desktop-2, Frame 9),
local exports in `~/Desktop/clients/manastireasaharna/04-design/figma-exports/`.

## What the Figma file is

- **Desktop-2:** black pill tabs down the left (HM1, PZ2, VV3), a sage band with
  `CASA DUMNEZEIEȘTII TREIMI / site-ul oficial Mănăstirea Saharna` in blackletter
  caps, a blackletter welcome text, a grey CALENDAR column on the right, and a
  far-right list (history …).
- **Frame 9:** a warm sand ground, the seal as a small circle, the title top right,
  and the calendar as a tall narrow column outlined in red.
- **Lettering:** the exports `Programul slujbelor.png` and `Unde duhul
  dumnezeiesc… .png` are **Pirata One** (Google Fonts, OFL). It is a match at the
  glyph level, checked against a render. The caps title is a Fraktur.

## The decision

TYPOGRAPHY.md (2026-08) argued that blackletter is the wrong civilisation for an
Orthodox house. The owner chose it anyway, as a feel and not a history lesson.
v2 honours that choice and answers the history problem on the Cyrillic side:

| script | face | why |
|---|---|---|
| Latin (ro, en) | **Pirata One** | the Figma face; real ș ț (comma below) and Ă Â Î |
| Cyrillic (ru) | **Monomakh** | Old Russian uncial (ustav), the Orthodox cousin of a gothic hand; Pirata has no Cyrillic |

Both are served as one family, `Saharna Gothic`, split by `unicode-range`, so a
title never mixes faces by accident. Files live in `public/fonts/` (woff2,
subset), each with its OFL licence.

## Rules

- Gothic is for **names and thresholds**: the monastery's name, zone and page
  titles, the gate quote, the shrine door, the day names heading each schedule
  table. It is never used for running text, navigation, the calendar or inside
  table cells and flags.
- **Never set it in all caps.** Blackletter capitals are built to stand alone
  before lowercase. Titles are set in sentence or title case.
- The colours stay v1's seal colours: navy, gold, paper, and the olive bars.
- Alegreya SC (v1's display face) moves down to the brand name in the header and
  the small-caps sub-heads.
- Body text stays Georgia.
- Shape echoes the type: the **pointed arch** (gothic window) frames the shrine
  door and the chamber plates, and the left rail's depth markers echo the Figma's
  pills.

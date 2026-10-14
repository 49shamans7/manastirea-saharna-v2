# TEMPLE — design MVP

Not a kitchen (cook per visitor). Not a press (print once, hand out).
A **temple**: a fixed structure you move through. The order of the rooms is the
argument. Nothing is generated for the visitor and nothing is handed to them —
they walk in.

## The thesis: the iconostasis IS a Brockmann grid

Müller-Brockmann's modular grid and the Orthodox iconostasis are the same object
arrived at from two directions:

| Brockmann | Iconostasis |
|---|---|
| fixed field module | fixed icon panel |
| horizontal registers | tiers (rânduri) |
| position encodes hierarchy | position encodes theology |
| the grid is moral, not decorative | the screen is canonical, not decorative |
| objective typography — remove the designer | the icon is not signed |

This is why a Brockmann grid "never comes out right" from a prompt: it is not a
look, it is a **constraint accepted in advance**. So we do not generate the grid.
The grid is constructed (SVG, exact math, below). The generator only ever fills
a slot the grid already decided.

## The grid

Base unit `u = 8px`. Field is square.

```
canvas          1440
margin           120  (left and right)
content         1200
columns           12  × 78px
gutter            24  × 11
field height      78  (square)
register        384   = 4 fields + 3 gutters
```

Everything vertical snaps to a register. Nothing is centred by eye.

## The five registers

Read bottom-up, as an iconostasis is read.

| # | Tier | Registers | Page role |
|---|---|---|---|
| R1 | **Locale** (local icons — the saints of *this* house) | 2 | Portal / hero. Sf. Treime, Cuv. Macarie |
| R2 | **Deesis** (intercession — the prayer row) | 1 | Pomelnic. The act, not the text |
| R3 | **Praznicar** (the twelve feasts) | 1 | Calendar + service schedule |
| R4 | **Prophets** | 1 | History, chronicle, obștea |
| R5 | **Patriarchs** (the foundation course) | 1 | Contact, donations, footer |

**Royal Doors** = the vertical centre axis of R1–R2. The only thing you pass
*through* rather than look at: the pomelnic. Everything else is a wall you face.

## The votive rail

From the Page 1 sketch and Frame 9: a full-height vertical strip at the right
edge. Not a widget dropped bottom-left. It is the **candle stand** — the thing
that is always burning at the side of the room while everything else happens.

```
width   = 1 column (78) + right margin (120) = 198
position= sticky, full viewport height
content = today's saints from calendar.ortodox.md, fetched live in the browser
```

Static pages cannot know today. The rail is the one window cut into the wall.

## Palette

Measured off the polished comp, not invented.

| token | hex | role |
|---|---|---|
| `--parchment` | `#f4efe4` | ground |
| `--parchment-deep` | `#e9e1d1` | recessed field |
| `--ink` | `#1a1208` | text |
| `--church-green` | `#1e3226` | R2/R5 mass |
| `--sacred-gold` | `#c4a24a` | rules, registers, leaf |
| `--muted-brown` | `#807566` | secondary |

Gold is a **rule weight**, never a fill. 2px at register boundaries, 3px at the
Royal Doors axis. Leaf appears only on 3D, never on flat.

## Type

Two faces, no third.

- **Text**: Georgia (comment #9 settled it). Full Romanian diacritics.
- **Display**: archaic Romanian — the Page 4 blackletter direction. Not a
  generated font. We generate **specimen plates** as drawing reference; the
  letterforms get vectorised by hand. `Ă Â Î Ș Ț` must be drawn, not faked with
  cedillas.

## Production law

- **SVG** — anything geometric, structural, or canonical. Constructed, never
  generated. Zero credits. The cross, the grid, the rails, the registers.
- **JPG/PNG** — light, stone, weather, distance. Generated (Qwen).
- **GLB** — mass and volume. Generated (Tripo, from a generated orthographic plate).

A generator is never allowed to decide a proportion. It fills a slot.

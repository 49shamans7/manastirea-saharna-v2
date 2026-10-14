# Typography

## What blackletter actually is

**Blackletter** is the family of scripts that replaced Carolingian minuscule in
Western Europe around 1150 and stayed in use in Germany until 1941. Dense, angular,
narrow, drawn with a broad nib held at a steep angle. The letters are built from
repeated vertical strokes with diamond-shaped feet, packed so tightly the page looks
black — which is where the name comes from.

Four branches:

| | where | look |
|---|---|---|
| **Textura** | England, France, 1200s–1400s | the sharpest. Gutenberg's Bible. All verticals, no curves |
| **Rotunda** | Italy, Spain | rounder, wider, warmer |
| **Schwabacher** | Germany, 1400s | bulbous, less rigid |
| **Fraktur** | Germany, 1513 → 1941 | the one people mean by "gothic". Broken curves, ornate capitals |

Your Page 4 wireframe and the Desktop-2 title are **Fraktur or Textura** — the
`Acasă / Programul slujbelor / Contacte` lettering with the broken strokes.

## The problem with blackletter here

**It's the wrong civilisation.**

Blackletter is Latin-rite Western Europe: Catholic then Protestant, German, Gutenberg,
the printed indulgence. It carries Northern Gothic cathedrals and, unavoidably since
the 1930s, German nationalism.

Saharna is **Eastern Orthodox, Moldovan, on the Slavonic side of Christendom.** Its
historic script is not blackletter and never was. The monastery's own written
inheritance is:

- **Ustav** (устав) — the formal Church Slavonic uncial. Upright, wide, square,
  generous counters. What liturgical books were written in.
- **Poluustav** — the semi-uncial that followed; slightly cursive, more compact.
- **Chirilica românească** — Romanian written in Cyrillic, the standard until 1862.
  The monastery's founding documents and the lettering in its own frescoes.

So your instinct — *archaic, dense, ceremonial, not a modern serif* — is exactly
right. Blackletter is just the wrong archaism to reach for. It's Western Gothic
where the building is Byzantine.

**And the frescoes prove it.** The `church-sfanta-treime` photographs have Romanian
Cyrillic lettering painted in situ. That's the real reference, photographed inside
this building, and it beats any font pick.

## The trap that will bite you

Romanian **ș** and **ț** use a **comma below** — U+0219, U+021B.
Not the cedilla forms **ş ţ** — U+015F, U+0163. Those are Turkish.

The old site is full of the wrong ones (`Buciuşca`, `nevoinţa`). I normalised every
string I pulled. Two consequences:

1. **Any text imported from the old site must be normalised** before it goes in the CMS.
2. **Every font must be tested for real comma-below glyphs**, not a cedilla faked at
   render time. Many otherwise-good faces fail this. This is what Figma comment #8
   was pointing at: *font mai citabil, și cu diacritice*.

Test string — set it in every candidate at 16px and at 60px:

```
Mănăstirea Saharna · Buciușca · nevoința · Cuviosul Macarie
ĂÂÎȘȚ ăâîșț — Îngerească viață, părinte, ai părăsit toate
```

## Recommendation: two faces, no third

### Text — settled
**Georgia** stays, per comment #9. It has correct comma-below forms, it was drawn
for screens, and at long measure in Romanian it holds up. For the real build, the
web-served equivalents worth testing are **Literata**, **Source Serif 4** and
**Spectral** — all open-licence, all with genuine Romanian support.

Don't overthink this one. The text face should disappear.

### Display — the decision to make
Three honest routes, in order of how much work they are:

**1 · Byzantine-inflected Latin uncial.** A Latin-alphabet face carrying uncial
weight — wide, upright, square, high-waisted. Reads as ancient without pretending to
be German. Candidates to test: **Cardo** (Bembo-based, huge glyph set, medieval
provenance), **Junicode** (medieval scholarly, enormous coverage), **Old Standard TT**.
Cheapest path, ships immediately.

**2 · Draw it from the frescoes.** Take the Romanian Cyrillic lettering photographed
in `church-sfanta-treime`, and cut a Latin display alphabet that follows its
proportions — stroke contrast, terminal shape, the specific way the painter handled
verticals. Twenty-six letters plus `Ă Â Î Ș Ț` for the display face only; the text
face does the heavy lifting. **This is the one worth doing.** It makes the type
belong to this building and nowhere else, and it's a genuinely finite job.

**3 · Set the display in Cyrillic.** Titles in Romanian Cyrillic — historically exact,
and unreadable to most visitors. Use it as **ornament, not as information**: the seal,
a fresco caption, the founding date. Never for navigation.

### What the dev's comment thread proposed
`georgia` → `constantia` → `Zamolxis` → `sau arhaiesc romanesc`.

Georgia is settled for text. Constantia is a Microsoft system face — fine, not
special, no licence for web. "Zamolxis" I can't verify the licence or diacritic
coverage of; if you want it, we test it against the string above before committing.
"Arhaic românesc" is route 2 above, and it's the right instinct.

## Scale

Georgia at these sizes, one ratio (1.25), snapped to the 78px field.

| role | size | tracking | where |
|---|---|---|---|
| Stratum title | clamp(26, 4.4vw, 62) | .05em | home hero, uppercase |
| Chamber h1 | clamp(28, 3.6vw, 52) | .04em | uppercase |
| Lead | 20 / 1.72 | 0 | first paragraph |
| Body | 17 / 1.8 | 0 | max 34rem — 30rem in gold |
| Blockquote | 19 / 1.6 | 0 | ochre left rule |
| Section label | 11 | **.42em** | uppercase, ochre |
| Eyebrow / meta | 10–11 | **.3–.5em** | uppercase |
| Rail | 9–13 | .3–.4em | calendar, depth index |

The wide tracking on small uppercase is doing the ceremonial work that the display
face isn't doing yet. Once the display face lands, some of it can come back down.

## Rules

- **Two faces. Never a third.** A monastery site with three typefaces reads as a
  brochure.
- **Uppercase + wide tracking for anything institutional.** Titles, labels, rails.
- **Never uppercase a Romanian body paragraph** — diacritics stack badly and
  legibility collapses.
- **The display face is for names and thresholds only** — the monastery's name, zone
  titles, the tagline. Not for running text, not for the calendar, never in Table.
- **Numerals: tabular** in every schedule, IBAN and calendar.

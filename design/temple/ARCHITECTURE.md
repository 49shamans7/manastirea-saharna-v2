# Saharna — site architecture

Four zones, three page templates. Every page in the old site maps to one of each.
Nothing gets designed twice.

---

## The four zones

Each zone owns a measured palette (from `design/extracted/_palette_measured.json`),
a direction of movement, and a kind of content. A page belongs to exactly one.

### I · ROCK — origin, silence, subtraction
`#767A86` `#8E9193` `#B0B9D1` · cold grey-lilac limestone
**Movement:** down.
The oldest part of the monastery and the oldest part of the site. Things that were
here before anything was built.

- Home — the hero descent
- Istoria / Prezentare — the founding, the rock chapel, 1776
- **Pomelnic** — the well. Names lowered down the shaft.

### II · GREEN — the living monastery
`#2E4328` `#4B6136` `#6F8A73` · gorge greens, ochre buildings inside
**Movement:** down, slower; the strata widen.
Everything that happens now, on a rhythm. The zone with the most content and the
most change.

- Obștea — the brotherhood
- Programul slujbelor — the hours
- Cronică — news and feasts
- Galerie

### III · GOLD & PALL — the shrine
`#1D1C22` `#C0A974` `#663037` `#BD639A` · black cloth, thread gold, flowers
**Movement:** none. You do not pass through. You stop.
**Position: the hinge, between Green and River.** The shrine is not a destination
you navigate to — it is something you *walk past* on the way down, exactly as the
relics sit inside the church you pass on the way to the Nistru. A lit door offset
from the axis, in the wall of the descent.

This is the only place on the site where **inward and downward are different
directions**. Everywhere else they are the same. The descent asks its one question
here: go deeper down, or deeper in.

**Zone III has no page of its own.** The door *is* the zone. Behind it are
Chambers wearing the gold skin (`data-zone="gold"`). Everything that made the
shrine a shrine is chamber *behaviour*, not a bespoke layout: a narrower prayer
measure, thread-gold versal, the pall as ground, flowers as the only chroma,
and stillness — nothing moves in a gold chamber except the flowers.

- Cuviosul Macarie — viața, acatistul, slujba
- Moaștele — the relics
- Biblioteca

### IV · RIVER — arrival, departure, the Nistru
`#649FBD` `#61929E` `#BDD5DC` · the only wide horizon on the site
**Movement:** sideways. The single horizontal in the whole build.
Where the gorge opens onto the river. Practical, bright, outward-facing.

- Cum de ajuns — map, directions
- Contacte
- Donații
- Casa de oaspeți Sf. Avraam — cazare

---

## The gates

The seam between two zones is a gate, not a margin. Three of them, each wider
than the last:

| seam | width | character |
|---|---|---|
| Rock → Green | narrow | a cut in the cliff; the shaft stays tight |
| Green → Gold | a door, offset from the axis | you turn aside and stop; the descent continues past it without you |
| Green → River | full bleed | the gorge opens; sky enters for the first time |

*Își deschide porțile* is literal and repeated. The portal mesh is the seam
device — not a hero ornament.

---

## The frame

From Page 1, and from the old site's own `lfon_repeat` / `rfon_repeat` margin
tiles. A centre field between two rails. This is the monastery's existing
structure; keep it.

```
┌────┬──────────────────────────┬────┐
│    │                          │    │
│ L  │      centre field        │ R  │
│    │   (the shaft is its      │    │
│ d  │    ground — text sits    │ c  │
│ e  │    inside the well)      │ a  │
│ s  │                          │ l  │
│ c  │                          │ e  │
│ e  │                          │ n  │
│ n  │                          │ d  │
│ t  │                          │ a  │
│    │                          │ r  │
└────┴──────────────────────────┴────┘
  78            1200             198
```

- **Left rail** — the descent index. Where you are in the strata. Structural,
  permanent, never changes. Your nav pills from Desktop-1.
- **Centre field** — the strata. The shaft is its background, not a separate
  object.
- **Right rail** — the calendar. Live, fetched in the browser, the only element
  on the site that knows today. Full height, as drawn in Frame 9.

---

## Three page templates

Design these three. Every page is one of them.

### A · STRATUM (home only)
Full-bleed vertical descent through all four zones. Photography as ground,
parallax on transform only, unequal register heights. The whole site in one
scroll.

### B · CHAMBER (istoria, macarie, obștea, galerie, casa de oaspeți)
A room you enter. Centre column inside the shaft, both rails present, single
zone palette held for the whole page. Long-form text and images. No descent —
you are already at the bottom.

Four skins: `rock` · `green` · **`gold`** · `river`. The gold skin is the shrine;
it narrows the measure and adds the flowers. One palette per chamber, never mixed.
Ochre only on made things. The rails stay.

### C · TABLE (program, contacte, donații, cum de ajuns)
Practical information. Flat, bright, no theatre, no parallax. River palette
regardless of what it links from — this is the zone of arrival and everything
useful lives there. Reads fast on a phone in a car park.

---

## The hinge — two things it must not get wrong

**Discoverability.** If the shrine is the only route to the chambers, most visitors
never reach the monastery's actual substance. The **left rail carries them too** —
the descent index is the second way in, not merely a position readout. A zone with
chambers shows it on the rail.

**Return.** Descent → shrine → chamber, then *back* must land you on the descent at
the shrine's depth, never at the top. Persist scroll position on the branch, or the
site punishes the visitor for taking the door.

## What this settles

- **20 old pages → 3 templates.** Cronică entries are Chambers with a date.
- **Nothing needs designing twice.** New content picks a zone and a template.
- **The CMS only ever produces Chambers.** Posts are chambers in Zone II.
- **The calendar has exactly one home** — the right rail, everywhere, always.
- **Pomelnic has exactly one home** — the shaft in Zone I.
- **Zone III is a door, not a page.** One fewer template to build and maintain.

## Open

- Which zone owns the *cascades*? They are gorge water (falling, Zone II) but
  they are also the way down to the Nistru (Zone IV). Probably the Green→River
  gate itself.
- The display face. Blocking all of Zone III, where lettering is the ornament.

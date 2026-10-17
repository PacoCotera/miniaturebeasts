# The slip: visual intent (creative director, for T-20261016-126)

Written 2026-10-17 (America/Mexico_City), as the CD's input to UI/UX's T-20261016-126. Revised the same night to adopt UI/UX's readout proposal.

**The owner:**
- 04:02: "doesn't read like part of the machine, or anything else"; "a wall of text that nobody will read".
- 04:04: "i mean, can be a cool screen of the machine."
- 04:06: "a paper tag is not interactive …"
- 04:07: "paper has a place in the library, the rest is a STATION, it's a LAB, it's a genome editing machine."

**The binding style:** `design/art-direction.md`, `design/style-guide/README.md` (on style/lab: "A lab, a genome-editing machine"). Nothing added.

## The intent, in one sentence

**The slip becomes the gene readout:** a small dark, matte display let into the sage housing that maps the pod's whole genome as indicator marks, one row per chapter and one mark per trait (UI/UX's proposal, adopted).

## What it shows (UI/UX's structure; the CD agrees)

- **The part:** 208 × 288, the same on Create (728, 96) and the Incubator (88, 96). It has a moulded sage bezel of 8 and a display of 192 × 272.
- **The rows:** up to 8 (S03 and S16 have 8 chapters), at pitch 32. Each row is the chapter's own emblem (`rail-emblem-*-24x24`), then up to 6 marks of 20 × 20 in the bank's order.
- **The marks:** each state is a **shape**, not only a colour:

| State | Mark |
| --- | --- |
| As the pod is | An unlit ring |
| Changed by you | A lit disc |
| Still a surprise | A frosted square chip |
| Clash | A red mark with a cross, and the drum's red rim |
| Breed to change | Two joined rings, dim |
| Cleared while growing (Incubator) | The frost chip cuts to a ring with a lit centre |

- **Focus:** Create's focused drum puts a 1 px bracket round its mark.
- **Words on the readout: zero** (a hard budget). The look itself is told by the drum and the founder (Create) and by the card (Incubator). The bottom line keeps "{Trait}: {look}" for the focused drum.
- **At Grow:** the display cuts to the stamp and the code.
- **A glance says:** how many traits changed and where, whether anything clashes, and how much is still a surprise.

## The CD's calls on UI/UX's two questions

1. **Colour: the device's own mint** (`lampOn`) for a lit mark, on the dark display. Not amber: amber has one meaning on the Station, "something here is for you" (`specs/station-return-signals.md` rule 2), and the readout's marks must not borrow it.
   - Call them **marks** (or indicators), not lamps, for the same reason.
   - **Ground:** a dark matte panel, not glossy glass, with no reflection or glare (the guide: "dark matte slate panels"; never "polished glass, gloss").
   - **Light:** a lit mark is a small lit disc with at most a 1–2 px soft edge, with no bloom or halo beyond it (never "glowing HUDs, neon").
   - Red only for the clash, with its cross.
2. **Incubator brightness: one hue on both screens.** The same state must look the same on Create and the Incubator, so don't switch to aqua there. Keep mint, and if the measure needs it, lower the lit marks' **level** on the Incubator, not their hue.
   - **The test:** the readout region's p95 stays at least 0.08 under the pod's p95 (`specs/station-incubator-brightness-ruling.md`, carried by the Incubator B ruling).
   - **Expected:** the marks are small, so the region's p95 should sit far under the pod's. Measure it rather than pre-empt it.

## What it replaces

`slip-208x288`, `slip-208x408`, the text lists on both screens, and Pods' found sentence on the Incubator. The just-cleared card stays: it is the reveal, with a picture.

**Why a screen, and not paper:** what the player changes must update live, so the object that shows it must be one that updates: the machine's display (the gate's check 10, `specs/gate-recalibration.md` §5).

## Widened (T-126, owner 04:10): the genome field is the machine's screen

**What it is in the world, in one sentence:** the genome field is the main screen of the lab's genome-editing machine. It is a large dark, matte display let into the sage housing, on which the machine draws the founder's genome live, as a woven field of linked loci. The drums are the machine's controls, and the founder on the dish is what they make.

**On the Incubator,** the same machine screen shows the same field beside the pod, its unknown nodes clearing as the chapters clear.

**The readout above becomes the field's compact form.** Its marks (unlit ring, lit disc, frost, red cross, joined rings) are the field's node states, not a separate box.

**Kept in the Station style** (`art/references/genome-field/` 01, 05, 06 are references for structure, not for look):
- **Keep the structure:**
  - regions as clustered neighbourhoods;
  - each locus a node with its two copies;
  - state by shape (known, carried, unknown, changed), never by a sentence;
  - focus by corner brackets;
  - a change expanding in place, before against after, with the field still visible (05);
  - detail on request, returning to the same spot (06).
- **Drop the references' look:** the navy ground with glowing neon lines, the pixel-terminal type, the baked words, the resources and the knob. The guide's Never list ("glowing HUDs, holograms, neon … sterile labs") rules them out.
- **In its place:**
  - the display is dark matte slate, flush in the sage housing with a rubber gasket and screws, no gloss or reflection;
  - lines and nodes are drawn in the device's own marks: mint (`lampOn`) for lit, the frost for unknown, red only for a clash;
  - lit marks are small, with at most a 1–2 px soft edge and no bloom;
  - type is Inter, crisp, and only in the opened detail (gate check 8).
- **Letters and codes** live only in the opened detail, never on the field (the locus is abstracted from the player).
- **On the Incubator** the field must stay at least 0.08 under the pod's p95 (the brightness rule): the pod stays the brightest thing.

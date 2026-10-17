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

## Widened (T-126, owner 04:10 and 04:16): the bench's screen

**The owner, 04:16:** "no, that was inspiration, do not replicate it. but this screen must feel like a research/crafting bench. advanced, you're editing life."

**What it is in the world, in one sentence:** Create is an advanced research and crafting bench in the lab where you edit life. Its main screen is a large dark, matte display let into the sage housing, on which the machine shows the founder's genome live as you edit it, rich and complex, in our own form. The drums are the bench's controls, and the founder on the dish is what they make.

**Not a replica.** The earlier genome-field images (`art/references/genome-field/`) were inspiration only. Nothing is copied from them: no layout, structure or motif. The genome's form on this screen is UI/UX's and the game designer's to invent (T-126).

**On the Incubator,** the same machine screen sits beside the pod and shows what clears as the chapters clear.

**The marks above** (unlit ring, lit disc, frost, red cross, joined rings) are UI/UX's starting vocabulary for states. They are open to change in the new form.

**Station-style guards** (`design/style-guide/README.md`):
- the display is dark matte slate, flush in the sage housing with a rubber gasket and screws, with no gloss or reflection;
- lit states are in the device's own mint (`lampOn`), not amber; small, with no bloom or halo; red only for a clash;
- no glowing HUD, hologram or neon (the guide's Never list);
- type is Inter and crisp, within the words load (gate check 8); letters and codes never on the main view (the locus is abstracted from the player);
- on the Incubator, the screen stays at least 0.08 under the pod's p95: the pod stays the brightest thing.

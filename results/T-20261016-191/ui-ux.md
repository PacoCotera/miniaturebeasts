---
ticket: T-20261016-191
status: review (the UI/UX lead's pass; the game designer, the genome engineer and the art director add theirs)
branch: work-queue
written: 2026-10-17 11:45
---
# One press from a resident to its depth (UI/UX)

**Purpose:** the player who comes for the feel notices something about one mibi and is invited, inside the picture, one press down into its genome, without the scene being interrupted. The owner's steer (11:27) keeps Home's places fixed. Nothing here moves a module, the window or the bottom line's slots.

Wireframes at 1×, drawn on the B-20261016-4 goldens (layout only, for the art director to paint):

| | Shows |
| --- | --- |
| `01-resident-focused.png` | a resident focused: the ring at its feet, its glance, its kin softly marked, the bottom line |
| `02-glance-anatomy.png` | the glance: marks, states, sizes, placement rules, truth |
| `03-glance-flips.png` | a sleeper in the bed: the glance sits above |
| `04-down-habitat.png` | ✓ goes down: the Habitat lands on the chapter that glinted; ← reads Home |
| `05-back-home.png` | ← comes back: the ring is on the same resident, and the read chapter's glint has gone |
| `06-one-focus-language.png` | one focus language for modules, the window and residents |

## 1. Focus on a resident

- **Reaching it: no change.** Focus reaches a resident through Home's existing graph (`home.json focus.graph`): ◀ from the room, ▼ from the window, ◀ from the column. At rest the room holds focus with no ring, so nothing is drawn on the window (the gate's "a scene at rest").
- **The ring** is the house focus ring (focus colour, 2 px) drawn as the resident's footprint, an ellipse on the ground under its feet. It is the only shape that sits *in* the painting rather than over it.
- **No lift and no name tag.** A mibi is not a button. The name is already in the verb ("Look at Moss"), so the floating tag says it a second time.
  - **Change:** `targets.resident.lift` goes from 4 to 0, and the `nameTag` region is removed.

## 2. One focus language

The ring is one ring everywhere. Its shape follows the object's own outline (`06`):

| Target | Ring | Lift |
| --- | --- | --- |
| a module | the pane's outline, radius 8, 4 out (the guide's ring) | 2: it is a control |
| the window | its bezel | 0: the living window never moves |
| a resident | its footprint | 0 |

- **The same everywhere:** the colour, the 2 px stroke, the ring appearing at once on a move with no slide between targets, and ✓ doing what the bottom line says.
- **The modules:** their rings move from radius 6 to the guide's ring. T-192 fixes the column's geometry, so the change lands there.
- **Kin is not focus.** While a resident holds the ring, its parents and children in the window get a 2 px dashed footprint in fog, with no glance, no glow and no word.
  - A kin mark is drawn only where the relative's feet show; it is never drawn across another mibi (in `01`, Dot is behind Bean, so only Bean's mark is drawn).
  - The genome engineer rules on which relations count (parents and children are my proposal; siblings are theirs to rule on).
  - In `01` the mark barely reads on moss. The art director decides how it is painted, but it must stay quieter than the ring.

## 3. The glance

- **What it is:** one row, one mark per chapter in ring order. The marks are the Habitat card's chapter emblems at 24 (`rail-emblem-{chapter}-{read|unread|sealed}-24x24`), the same slices the card puts on its 40 px plates. The glance is the card's chapter row in miniature, so going down reads as the same thing growing.
- **Size:** 24 px marks (the guide's 24 tier, since meaning rides on the mark) with a gap of 8. The recess is 32 tall, padded 8 at the sides and 4 above and below, radius 8.
  - S01 (4 chapters) is 128 wide.
  - S03 (8 chapters, the most) is 264 wide.
- **States:** read, unread (a dotted edge, never its content) and sealed (slats).
- **The glint** (mint, one per chapter) marks a chapter that is unread, or one that **changed since the player last looked** (a self-changing trait that moved).
  - The glint makes one pass when the glance appears, then rests lit. The timing is per guide §9.
  - The glint must stay distinct from a first's mark.
  - It clears when that chapter is read, or when the change has been seen up close (`05`).
- **Placement, applied in order:**
  1. Centred on the footprint, 8 below the ring.
  2. If its bottom would pass y 536 (the glass less 8), it sits above the resident's box instead, 8 over its head (`03`).
  3. It is clamped inside the glass, 8 from each side (x 32 to 656).
  4. It may cross another resident, but never the focused one.
- **Life:** the glance is drawn only while a resident holds the ring and is gone the moment the ring leaves. Nothing stays on the window.
- **No glint anywhere:** the marks still show, quiet. The depth is visible even when nothing is new.
- **How it sits on the painting** (its ground, edge and shadow) is the art director's to paint. The recess in the wireframes is only its rect.

## 4. The bottom line while a resident is focused

| Slot | Holds |
| --- | --- |
| left | ✓ **Look at {name}** (today's verb; the name lives here) |
| middle | the one fact about this mibi. Which fact and its words are the game designer's; its truth is the genome engineer's. The wireframes use the card's own "Coat, still a surprise" and two placeholders |
| right | a notice only when it is about something other than ✓ (the T-186 slot rule); otherwise the player's thread |

## 5. ✓ goes down

- **Where it lands:** ✓ **Look at {name}** opens the Habitat up close on that mibi, as today. Focus lands on **the chapter plate that glinted** (the first in ring order if several glinted), not on the resident. With no glint, focus lands on the resident, as today.
  - **Change:** `habitat.json focus.entry.homeResident`.
- **One press:** the player lands on the mechanic itself, and the card's own verb is waiting (`04`: ✓ Read Coat ◆ 1).
- **The screen change:** the title cross-fades and the stage cuts, as any room change from Home (guide §9). No carry is added; the matching marks do the continuity.

## 6. ← comes back (T-181)

- **The rule:** the Habitat entered from Home's ✓ is a room entered from Home (`specs/flow-pass-spec.md`, ← table row 1). ← reads **Home** and returns the ring to **that resident by id**, wherever it now stands (`05`).
  - If it has left (out with the Companion), the ring goes on the window.
- **This overrides** `habitat.json keys.back` and the `homeResident` entry note ("← then goes to the whole") for this entry only. Every other entry keeps ← to the Vivarium's whole.
- **In `frame.json navigation`:** `back.rule: jumpSource`, with `from: home.resident.<id>`.

## 7. The gate, as I read it

1. **At rest:** the room focus draws nothing on the window. A glance appears only on a resident's focus.
2. **Within two seconds:** the eye is already on the resident when the glance appears, and the glint passes once on arrival.
3. **One press:** ✓ from the focused resident lands on the glinting chapter.

Judge it in the device sheet with `01`, `04` and `05` side by side.

## 8. Asks to the other owners

- **The game designer:** which single fact goes in the middle slot, and its words (≤ 8). Also whether a changed trait outranks an unread chapter when both apply.
- **The genome engineer:**
  - That "changed since last looked" can be known per mibi and per chapter (it needs a seen mark).
  - The kin relations to show.
  - That every mark shows only what is read.
- **The art director:**
  - The glance's ground on the painting.
  - The kin mark's paint.
  - Whether the footprint ring reads on every ground: moss, bed and soil.
- **Order:** this is built after T-190's look, since the glance sits on individuals.

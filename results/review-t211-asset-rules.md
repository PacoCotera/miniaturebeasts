---
ticket: T-20261016-212
status: done
branch: PacoCotera/miniaturebeasts:rules/mibi-sizes-probe-upright
head: 42ec92ab
ci: not run (the checks below were run locally)
---
## Verdict: FAIL (fix ticket T-20261016-213)
The three lying Probe ids are withdrawn correctly. The rules text is not what the ticket asks for, it is in the wrong places, and the public guard fails on it. This review was asked for in a message from the lead; I wrote and claimed T-20261016-212 for it.

## Which text the table must match
The lead's message names results/T-20261018-probe-and-scale/art-director.md. That file contains no table: it says the size table "is in T-20261016-211, the ticket". The text to match is therefore the amended ticket's "The text to paste" (lead's amendment 2026-10-18 03:47:56). The builder's last commit is 28 seconds later (03:48:24); the result does not mention the amendment and follows the earlier version of the ticket.

## What I ran (a worktree of 42ec92ab, off station-gate 5cc0bbc4)
- Station 452 pass, ui 81 pass, 0 fail; `place-masters --check`: 903 placed, 0 problems (as the result says).
- `git grep` for the three withdrawn ids finds nothing in the tree; the three PNGs are gone from prototypes/ui/assets/masters/pods and 0 entries of "480x288" remain in the index.
- **Public guard: FAIL.** `node .github/public-guard/guard.mjs --base origin/station-gate`: exit 1, 2 hits: `design/style-guide/README.md:516 process-label` and `design/style-guide/station-layouts.md:26 process-label`. Both are the row "Home, the Vivarium window (the deck) ... the owner's measure". The result says guard exit 0.
- `guard.mjs --tree` and `face/tools/guard.mjs`: ok (the tree mode does not apply the process-label rule to existing lines).

## The withdrawal: correct
`bench-probe-t1-480x288`, `bench-probe-t2-480x288` and `bench-cradle-empty-480x288` are out of `ui/assets/masters/index.json` (21 lines) and their PNGs are deleted; nothing in the tree places them. The slices status is in the studio's masters repository, which this repository does not hold; the result says so. Not done: recording the withdrawal there.

## Differences from the amended ticket
1. **Where it goes.** The ticket: a new section `## Size and pose` in `design/art-direction.md`, after `## Rules`, holding the table and both rules verbatim; the page's sentence "it holds the values and sizes, and this page holds none" changed to the new one; in the style guide's asset section one pointer line "and nothing else there". Built: art-direction.md gets a section "Size and the Probe" in the middle of the file (a summary, no table, and the sentence is not changed); the full table is added to the style guide README (two new subsections) and copied again into station-layouts.md ("Placement rules every screen shares"); and a comment block in prototypes/ui/asset-policy.mjs repeats the numbers. Four places carry the numbers instead of one, which is the drift the amendment avoids.
2. **The table text is not the pasted text.** Built, against the ticket:
   - "The Vivarium, full screen (stage 1024 × 522)" and "the window's scale × 1.7"; the ticket: "The Vivarium, full screen, and Idle", "the same world as Home's window, opened". Idle is missing.
   - "The Habitat, a mibi up close", note "the closest camera; the world still fills most of the stage"; the ticket: "The Habitat and Sitting, a mibi up close", note "the closest world view. The name tag, focus ring and kin marks follow the feet and scale with the mibi".
   - "(Keep, Say hello)"; the ticket: "(Keep, Sit)".
   - A row "Cargo and the dock arrival, a mibi walking in through the bay | 72 | 54"; the ticket has "Cargo | none | none | no mibis on screen", and puts the dock arrival in the row "Close-ups: the benches (Grow, Create, the Incubator, Cross) and the dock arrival | larger | larger | ... Not settled yet; until it is, these keep the bench scale (up to the 304 × 312 master)", which is missing. A built row that gives sizes for Cargo and the arrival contradicts a decision the ticket leaves open.
   - Two rows "Thumbnails and faces" and "The Companion (HiBit)"; the ticket has one: "Tiles, faces, portraits, the Library's nodes, the Companion | unchanged | unchanged | pictures of a mibi, not the world; the Companion keeps its own pixel scale".
   - The Home row's note and the first line differ ("the owner's measure"; the ticket: "the base measure. The away frame is a token with its own size"; "Miniature beasts are small in their world, on every screen. The world is large around them, and the camera never zooms a mibi up to fill a view. The table gives a mibi's height at 1×, from crest top to feet.").
   - Bullets: "as the stand masters are" and "in the logic process, as a reduction of" are not in the ticket's bullets.
   - The Probe paragraph lacks "as a hand holds it" and adds a last sentence about the withdrawn masters, which the ticket does not contain.
3. **The ticket says "add no ticket ids, dates, names or quotes".** The row note "the owner's measure" is an attribution to the owner, and it is what the guard flags (above). A search of the added lines finds no ticket id, date or quote otherwise.

## What is fine
The numbers that agree: Home 54 / 40, Vivarium full screen 92 / 68, Habitat 150 / 110, decision panel close 64 / 48 and wide 36 / 28; the Probe upright master names (`bench-probe-upright-t1/t2-288x432`, `bench-cradle-upright-empty-288x432`, `bench-probe-t1/t2-card-128x160`).

## Not for this build
Home's Probe module still places `home-cradle-full/empty-96x72` (the old net Probe); the art director's audit asks for 48 x 72 reductions of the upright masters. The result already notes it needs its own ticket (a change to the slot, the Home spec and the goldens).

## Fix ticket
**T-20261016-213** (builder, docs): paste the amended text verbatim into `design/art-direction.md` as `## Size and pose` after `## Rules` and change the quoted sentence; one pointer line in the style guide and nothing else; remove the station-layouts copy and the asset-policy comment; keep the index withdrawal; guard exit 0.

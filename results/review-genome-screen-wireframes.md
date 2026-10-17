---
ticket: T-20261016-132
status: done
branch: this repository:work-queue
head: (see the result commit)
ci: not run (review only)
---
## Verdict: FAIL on two small fixes. The direction is right, and the owner sees it once T-134 lands

**Show the owner, after T-20261016-134:**
- `specs/station-genome-screen/01-create-genome.png` (Create at work);
- `06-incubator-genome.png` (the same instrument on the Incubator);
- `07-genome-key.png` (the marks, so the owner can read the other two).

**What was judged:** `specs/station-genome-screen-spec.md` and wireframes 01–07 at 1×, against:
- the owner's words of 04:16 and 04:18;
- `design/art-direction.md` and `design/style-guide/README.md` (the lab rule);
- the gate's checks 8–10;
- `specs/editing-life.md`;
- the rule that the genome-field images are inspiration only.

## 1. The creative director's questions

**Does a glance read as editing life at an advanced bench?** Yes:
- the founder on the dish at left, what you make;
- the drums along the tray, the controls, fed by the pod in its port;
- the machine's large screen showing the whole genome being edited, with what you changed lit.

It reads as an instrument doing a procedure, not a menu and not a list.

**Does it give a glimpse of the framework?** Yes, and on the main view:
- the species hub with its lock (what makes it this species);
- the chapters as branches;
- each gene's kind by its own mark;
- the copy pair, one shown in front and one behind;
- a blend as a lens;
- genes asleep behind a switch's gate bar;
- inherited-only rows running on to the cross mark;
- sealed and unread genes under frost, with the glint.

That is the owner's 04:18 "glimpse of the underlying genome mechanics", with no letters on the main view.

**What is it in the world?** The bench's main screen: a dark matte display flush in the sage housing, with a gasket and screws (`specs/slip-visual-intent.md`).
- **Check 9:** it is a thing of the machine.
- **Check 10:** it is a display, and it updates live.
- **Check 8:** there are no words on the screen; the Grow code is an identifier.

**Do the drums and the screen show the genome twice?** Mostly not, because they say different things:
- the drums are the controls, each showing the look it gives;
- the screen is the map: every gene's kind, its copies, and its state, for the whole genome, including drums slid off the tray on deep species (04, S09's 27 traits).

**One duplication remains (fix 2):** the sample bay's 160 × 128 "look now" repeats the look that the focused drum's window and the founder's part already show. The two copies, which only the bay can show, are left at 64 each.

**What was copied from the references (fix 1):** the four cream corner brackets round the focused gene are the genome-field references' focus mark (01 and 05). The ticket's rule is that nothing is replicated from them. They are also a second focus form beside the house ring (fix 14's one form). Nothing else is copied: the tree of rows, the ring marks, the frost squares and the bay are our own.

## 2. The game designer's questions (the CD's read; the game designer's sign-off is owed)

`specs/editing-life.md` §4's kinds all have their own mark in 07, by shape, not only colour:
- locked (the hub and lock);
- configurable (ring with ticks);
- inherited-only (closed, joined rings, on to the cross);
- self-changing (step marks and the place badge);
- asleep (dark behind the gate bar, waking one by one);
- sealed (the find's picture and a closed bar);
- unread (frost and the star).

§2a's test ("this one I can change, this one only breeding changes, this one is hiding a pale copy, this one was asleep and I woke it") can be pointed at on 01 without reading.

**The reward:** the change is felt on the founder (`specs/slip-reward.md`), and the screen confirms it: the gene lights mint with its notch. The rejected copy drops out of the pair when you choose a copy, and asleep genes light one by one when woken.

**The game designer should confirm two points:**
- the copy-chosen mark (two of the same copy, in bone or sand);
- the asleep example on S03's Legs, which the spec says is not S03's real data.

The lead relays this; I don't have the game designer's session.

## 3. Per wireframe

| Wireframe | Verdict | Note |
| --- | --- | --- |
| 01 Create, at work | FAIL (fixes 1, 2) | The read is right; owner's proof after T-134 |
| 02 Clash | FAIL (fixes 1, 2) | Red rims and the dashed link read; no sentence on the screen |
| 03 Nothing read | FAIL (fix 1) | The frame under frost, the bay frosted: reads as "all still a surprise" |
| 04 Deep (S09) | FAIL (fixes 1, 2) | The screen holds the whole genome while the tray slides |
| 05 Grow | PASS | The bay cuts to the stamp and code; the pod seals and travels |
| 06 Incubator | PASS, with fix 3 | The compact instrument; the card stays the reveal. The clearing pulse should be mint, not teal (one lit hue) |
| 07 The key | PASS | Every kind and state a shape |

**Fixes, routed to UI/UX as T-20261016-134:**
1. focus without the reference's corners, in the house's own form;
2. the bay leads with the two copies, large, and drops the repeated look;
3. the Incubator's pulse in mint.

None of them changes the layout or the read.

## Proof (commands run and their result lines)
- `specs/station-genome-screen/01`–`07` `.png` read at 1× (1024 × 600 each).
- `specs/station-genome-screen-spec.md` and `specs/editing-life.md` read in full.
- `art/references/genome-field/01`, `05` and `06` compared for anything replicated: only the corner-bracket focus.

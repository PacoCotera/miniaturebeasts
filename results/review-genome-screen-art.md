---
ticket: T-20261016-141
status: done
branch: this repository:work-queue
head: (see the result commit)
ci: not run (review only)
---
## Verdict

| Proof | Purpose and style (CD) | Framework (genome engineer) | Owner |
| --- | --- | --- | --- |
| `genome-incubator-S03-{cool,warm,glowing,ready}-1x.png` (06) | **PASS** | pending (§3) | **`genome-incubator-S03-glowing-1x.png`**, once the framework check passes |
| `genome-create-S03-1x.png` (01) | **FAIL as an owner proof:** the bay and half the drums are empty (S03's looks are owed) | pending | none yet: S01's proof (T-143) |
| `genome-create-S03-clash-1x.png` (02) | PASS (the clash reads as a set: red rims on screen and drums, no link, no sentence) | pending | not shown; it's a state, not the read |
| `genome-marks-1x.png` | PASS (one family, every state a shape) | pending | not shown |
| T-128 `pods-overview-tag-cut-1x.png`, `pods-chapter-page-tag-cut-1x.png` | **PASS** | n/a | not needed (a removal) |
| T-128 `cargo-report-device-plate-1x.png` | **PASS** | n/a | not needed |

**What was judged:** each proof at 1×, against:
- the owner's 04:16 and 04:18;
- `design/art-direction.md` and `design/style-guide/README.md` (the lab rule);
- gate checks 8–10;
- the verified wireframes `specs/station-genome-screen/`;
- the rule that nothing is copied from `art/references/genome-field/`.

## 1. The genome screen (T-138)

**Create (01, 02).**
- **What passes:**
  - it reads as an advanced bench where you edit life: the pod in its port, the founder grounded on the dish, the drums, and the machine's dark matte screen showing the genome's frame;
  - the screen has the species hub and lock, the chapter emblems, a mark per gene with its copy pair, frost and glints, and inherited-only rows running to the cross. No words (check 8), part of the machine (check 9), a live display (check 10);
  - nothing is copied from the genome-field images: the tree of rows and the ring marks are our own;
  - the focus is the house ring.
- **Why 01 can't go to the owner:** the proof is on S03, whose looks are mostly unpainted, so at 1×:
  - the sample bay is two near-empty frames, each with one tiny mark, so the bay's job (the two copies side by side) can't be seen;
  - four of the seven drums in the window are blank;
  - the owner would see an empty bench and a dim screen.
- **The fix is a proof, not a repaint** (T-20261016-143): proof on S01, whose drums and copies are all painted. S03 stays the deep-species check until its owed looks land.
- **Not a fail, a watch:** the screen is quiet and its marks are small (24 px) at 1×. The owner asked for "rich and complex". If S01's proof still reads sparse, the next lever is the marks' scale and the tree's spread across the screen (UI/UX), not more decoration.

**Incubator (06).**
- The compact screen sits at the left as the same instrument, the pod is the subject, the card is the reveal, and Stamina's row has just cleared with the mint pulse.
- **Brightness** (`brightness.json`): the pod beats the screen by 0.337 to 0.473 (the rule is 0.08).
- **Owner's proof:** `genome-incubator-S03-glowing-1x.png`, after the framework check.
- **For the genome engineer:** the "ready" frame still shows Character frosted. The spec says "Ready: every gene known" (§5 of the genome screen spec). If a founder's chapters all clear by ready, the ready frame is wrong.
- **Stand-in mismatch, not art:** the card reads "Tail / long and thick" while the caption says Stamina just cleared.

## 2. The lab sweep art (T-128): PASS
- **Pods overview and chapter page:** the painted paper tag and string are gone, the ground is repainted with its grain, and nothing else moved.
- **Cargo report:** "Home from the field" now sits on an engraved sage device plate, part of the machine, not a cream label.
- **For the lead (not T-128's scope):** the report card itself is about 12 lines of words, and fails gate check 8 (words load). It needs a UI/UX ticket of its own; the purpose audit noted it too.

## 3. The genome engineer's framework check

I asked the genome engineer for PASS or FAIL per proof, against the framework for S03. **Their answer is pending.** It will be added here, and the owner's Incubator proof waits on it.

## Proof (commands run and their result lines)
- `results/T-20261016-138/*.png` and `results/T-20261016-128/*.png` read at 1×. The T-128 crops are at 1×; the Cargo plate is in context.
- `brightness.json`: the margins 0.388, 0.337, 0.466, 0.473 (cool, warm, glowing, ready).

---
ticket: T-20261016-152
status: done
branch: this repository:work-queue
head: (see the result commit)
ci: not run (review only)
---
## Verdict

| Proof | Purpose and style (CD) | Framework (genome engineer) | Owner |
| --- | --- | --- | --- |
| T-143 `genome-create-S01-1x.png` | **FAIL for the owner:** the bench and bay read, but the screen is two thirds empty | pending | none yet (after T-154) |
| T-145 `genome-incubator-S03-glowing-1x.png` | **PASS** | **PASS** (Character cleared past 2/3; the card shows a real look) | **`genome-incubator-S03-glowing-1x.png`** |
| T-145 the other proofs: cool, warm, ready, S03 Create, clash | PASS on style | **PASS** | not shown |
| T-145 `genome-marks-1x.png` / `-4x.png` | PASS on style | **FAIL:** the shard find is still not on the sheet | not shown (fix in T-160) |
| T-146 `bench-panel-upgrade-1x.png` | **PASS for the art** (the clean cut-out on the plinth); **FAIL as an owner proof** (the two outcomes look alike) | n/a | none yet (after T-155) |
| T-149 `cargo-report-picture-led-1x.png` | **PASS** | n/a | **`cargo-report-picture-led-1x.png`** |

**What was judged:** each proof at 1×, against:
- the owner's words;
- `design/art-direction.md` and `design/style-guide/README.md` (the lab rule);
- gate checks 8–10;
- for the genome screen, nothing copied from the genome-field images.

## 1. Create on S01 (T-143)
**What reads:**
- every drum carries its close-up;
- the sample bay shows Eyes' two copies, the shown copy framed in mint and the hidden copy dim, which is the bay's job, now visible;
- the pod is in its port and the founder is grounded on the dish;
- no words on the screen;
- nothing copied.

**Why it can't go to the owner:**
- S01's four chapters and five genes sit in the screen's top-left corner, and about two thirds of the display is bare slate.
- The owner asked for "rich and complex" and has objected to wasted space before.
- This is the lever I flagged last round: the tree must fill its instrument for every species.
- Not an art fault: **T-20261016-158** (UI/UX) gives the tree a fill rule.

## 2. The Incubator on S03, glowing (T-145): PASS
- Character has just cleared, and the card shows Character's emblem with its trait.
- The founder's shadow reads through the shell, and the compact screen sits beside the pod as the same instrument.
- The pod stays the brightest thing (`brightness.json`).
- **The owner's proof:** confirmed by the framework check (§5).

## 3. Fit the upgrade? (T-146)
- **The art passes its ticket:** the fitted part is a clean cut-out, with no socket box, standing on the plinth with its contact shadow by the T-70 rule.
- **The panel fails its purpose at a glance:** "Fit it" and "Not now" show the same part at nearly the same brightness, so the choice doesn't read from the pictures. That is the outcome-picture choice in spec §1.6 (UI/UX): **T-20261016-159**.

## 4. The Cargo report (T-149): PASS
- **Picture-led on the door's display:** each crate tile with its pods ("+4" for the overflow) and its reach pips; the materials gathered; the Probe's plates and their cost; one four-word goal line; and the read while you wait.
- **The checks:**
  - check 8 now passes; it was about 12 lines of words;
  - check 9: it is the machine's display on the bay door;
  - check 10: a live readout.
- No amber, gold or cream.
- **Show the owner:** `cargo-report-picture-led-1x.png`.

## 5. The genome engineer's framework check (frames on station-gate, slices on masters-pods)

**T-143, S01 Create: FAIL on one mark.**
- **Pass:**
  - the rows are Coat 1, Face 2, Movement 1, Stamina 1, and the hub is S01's;
  - Coat's Markings is "hides", which is possible, and has no gate bar (S01 has no sleeping loci);
  - Face 1 (Crown) is changed, lit and doubled;
  - Movement and Stamina are breed-only, with their lines to the cross mark.
- **Wrong:** Face 2 (Eyes), the focused gene, is drawn as "hides", and the bay frames copy 1 alone.
  - S01's Eyes is one continuous locus. On real pods it is a blend (52% of 400) or one look (48%), never "hides".
  - With two different copies shown, the gene is the blend: the lens mark, with the bay framing both copies.
- **Stand-in words:** "two chapters unread" is wrong, because every S01 chapter is read.

**T-145:**
- **S03 Create: PASS** ("← Tuikis").
- **Clash: PASS.** Eyes and Build are lit with their notches under red rims; the red drums are Eyes and Build; there is no ✓ cap.
- **Incubator cool, warm, glowing and ready: PASS.** The chapters clear on (k+1)/(n+1), and the cards are real looks (Reserve "goes long", Nerve "unflappable").
- **Marks sheet: FAIL on one item.** The storm badge, pond and rock names and the lit clash mark pass. The shard find is still not on the sheet: by template match, crystal and pearl are there, and the shard is not.

**Fixes:** **T-20261016-160** (art): S01 Eyes as the blend, its bay, and the stand-in line; the shard on the sheet.

## 6. What the owner sees now
- `results/T-20261016-145/genome-incubator-S03-glowing-1x.png` (the Incubator's genome screen).
- `results/T-20261016-149/cargo-report-picture-led-1x.png` (the Cargo report).
- **Later:** Create (after T-158 and T-160) and the Fit panel (after T-159).

## Proof (commands run and their result lines)
- `results/T-20261016-143`, `-145`, `-146` and `-149` PNGs, read at 1×.
- The spec rows for the panel: `specs/station-decision-panel-spec.md` §1.6.

**SIGNED**, with one gap to know about. The gate has no job that checks `roster.mjs` against `frames/`. Both deliberate breaks made in `roster.mjs` (alone) passed the whole gate and every workbench test. The first run of each break was a roster-only edit, so I reran them as frame edits (see the breaks section).

I ran everything against head eda18f271. `origin/station-gate` is now one commit ahead of the branch's base: 99175b378, an unrelated field-pod change.

**1. Sentences.**
- I pulled the sixteen bold lines out of cw.md's table and diffed them against the `resembles:` strings in `roster.mjs`. They are identical, word for word.
- The C09 feature is "a beak and a pointed crest; watchers of the open sky", as cw.md §1b gives it.
- The C10 feature is "small ears and a broad tail; the water players". That is the GD's final wording in the 11-05 amendment, not the "small pointed ears and a thin tail" of §1b. The brief and `finish` both match the amendment.
- The new test (`framework.test.mjs`, "each clan's type-specimen sentence reads as written") checks all sixteen full sentences, each line plus its feature. It reads them from `frames/*.json`. Changing "low" to "high" in S13's frame made it fail: `S13: … a high domed body on six legs …`.

**2. Digests.** I computed `genomeDigest(typeSpecimen(frame))` for all sixteen frames on `origin/station-gate` and on the branch. Only S10 moves, `S10-58b1026b` to `S10-8abfc5e1`, because C10's feet go from webbed to pad. S09 does not move because `proportions.mjs:75` sets `growth.wing-span-ratio` to 1.5 for S09 (`wings: "big"`). That overrides the clan `finish` value, so C09's `long` to `short` change never reaches the genome. This matches the builder's report and your ruling: the redo settles S09's wings.

**3. Frames and metrics.**
- **S01–S08, S11–S16:** one field each, `taxonomy/resembles`.
- **S09:** `taxonomy/resembles`, `signature/feature` and `signature/finish/growth.wing-span-ratio`.
- **S10:** `resembles`, `feature` and the finish value, plus webbed to pad in the locked locus, the loci copies and looks, and the type-specimen genome. Its `typeSpecimen/bounds` also move slightly (min1 −0.5053 to −0.4448, min2 0.0395 to 0, max1 0.5053 to 0.4448), which is the padded feet changing the body bounds.
- No other field moved.
- **metrics.json:** I keyed each case on px, text and font. No width changed for any text present in both versions. 68 old strings are gone and 56 new ones are added. Nothing else in the file differs.

**4. Goldens.** None changed. The diff is 19 files: `metrics.json`, sixteen frames, `roster.mjs` and `framework.test.mjs`. No PNGs and nothing under the golden directories.

**5. Full gate, foreground.** Output lines verbatim:
```
play-journey                 rc=0  469s | play journey ok
layer-check                  rc=0  513s | layer check ok
face-guard                   rc=0    1s | guard ok
station-checks               rc=0    1s | layer checks ok
masters                      rc=0    0s | masters: 1827 placed, 0 problems
public-guard                 rc=0    1s | public guard ok
vivarium: ok: 5 log(s), 61 tests ran, 0 skipped by the file itself
TOTAL 539s; 164 jobs, 0 failed; logs /tmp/gate-5rFJOV
```
No load flakes, so nothing needed a rerun. The tree was clean after the gate, so there was nothing to restore under `prototypes/station/img` and no stray pictures to remove.

**6. Public guard.**
```
public guard ok
exit=0
```

**7. Deliberate breaks** (each reverted; `git status` is clean).

**Break 1: one word in one resembles line**
- **Roster only** (S13's "low" to "high" in `roster.mjs`): the gate and all workbench tests stay green.
- **Caught by:** `node framework/build-frames.mjs --check`, which prints `species-S13.json is stale`. That check is not part of the gate, as far as I could find.
- **Frame edit** (same word in `frames/species-S13.json`): the new framework test fails (`S13: … a high domed body …`), and `face/tests/metrics.test.mjs` fails too.

**Break 2: C10 back to webbed**
- **Roster only:** again nothing in the gate or workbench tests fails. `build-frames.mjs --check` fails with `species-S10.json is stale`.
- **Frame edit** (`"pad"` back to `"webbed"` in `frames/species-S10.json`): `framework.test.mjs` and `metrics.test.mjs` both pass. No test pins the S10 digest or the feet. Only `frames:check` would catch a drift here.

**Recommendation.** Add `frames:check` to the gate, and add a test that pins C10's feet or S10's digest. Neither blocks this branch.

I removed only my own scratch files from `/tmp/mb-run-species-resembles-gate`.

Merged as 8ec98e11c; frames check ok on the merged tip.

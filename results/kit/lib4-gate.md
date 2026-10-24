# Library 4 gate (architect, 2026-10-24 14:11 Mexico City), 57dcda79

T-20261023-292, build/library-species 57dcda79 on station-gate b9275cf8. One gate for the code and the goldens.

## Verdict
**One fix round, then merge.** The screen, the kit rule, the seen rule, golden-neutrality and the render-time proofs all hold, and the merge with station-gate is mechanical and green. Three things in the logic need fixing:
- a ✓ named on the bottom line that does nothing (the wish);
- a model key format copied into a props builder (the sittings count);
- focus targets on discs the face has not drawn yet (lit, before the page lands).

Two test and tool lines and the station-gate merge go in the same round.

## Fix lines (one round, on build/library-species)
- **F1, the wish ✓ that does nothing.**
  - Where: station/src/views/library-props.mjs:123, `else if (cur === "wish") line.ok = Sg.wish;`.
  - The defect: the line says "✓ Change the wish", but ✓ does nothing (intents/library.mjs:48), because pinning has no screen.
  - The fix: `else if (cur === "wish") line.ok = null;`, shut in place by the standing door rule at nav.mjs:27. The subject stays "". The `wish` target stays. `l2.strings.wish` is kept for when pinning lands.
  - library.json l2.keys.confirm: "on the wish: Change the wish" becomes "on the wish: no ✓ until pinning has a screen (shut in place, nav.mjs)".
  - Test (library-species-props.test.mjs): ring on `wish` → line.ok null, subject "". An intent confirm on `wish` leaves UI.screen and st.wish unchanged.
- **F2, the sittings count is in the wrong home.**
  - Where: library-props.mjs:71 `sittingsOf` rebuilds sitting.mjs's moment keys (sitting.mjs:66–67).
  - The fix: in sitting.mjs, beside momentsEarned, `export const sittingsOf = (st, species) => Object.keys(st.moments ?? {}).filter((k) => k === "guide:" + species || k.startsWith("sealed:" + species + ":")).length;` (better: momentsEarned's keys and this filter from one key helper). library-props.mjs:106 becomes `shelf.sittings = Math.min(SH.sittings.max, sittingsOf(st, sid));`; the local copy goes.
  - Test (sitting test): a paid `sealed:S01:face` and a paid `guide:S01` count 2; a `line:…` key and another species' keys count 0.
- **F3, look targets before the page is drawn.**
  - Where: library-props.mjs:110. It lists the lit chapter's look targets before the page picture is made (measured: 8 targets while `page.picture` is "").
  - The fix: `const discs = lit && page ? Object.entries(facts.page.discs).map(([id, rect]) => ({ id, rect })) : [];`.
  - Test: page not ready → no `look` targets, ▶ from the right column stays put; once made, targets in page order.
- **F4, the wire's level rule is untested.** face/tests/bridge.test.mjs, beside :107: props `{screen:"library.species"}` with only frame.json loaded are refused with /whose spec is not loaded/; accepted once library.json is sent.
- **F5, the times tool can catch a render-ahead.** station/tools/library-times.mjs:24: set `S.UI.lastInput = performance.now()` inside frameAfter before `goto("library")`, as a key press does (main.mjs:118); same before the Level 2 intent.
- **F6, merge origin/station-gate c3ee694f into the branch.** Conflicts in 8 files; take station-gate's side and add the branch's:
  1. face/CMakeLists.txt: `… library.c src/screens/library_species.c src/screens/bench.c src/screens/sitting.c src/screens/moving.c …`.
  2. screens/screens.h: the sitting block, then the Level 2 block.
  3. game.mjs: `lib: { l1: null, pending: null, l2: {}, species: null, state: "sheet", lit: null, cur: null, family: null }, sit: null,`.
  4. host.mjs: hunk 1 station-gate's two sitting lines, then its `body` line with `screen === "library.species" ? speciesBody() :` after `libraryBody() :`; hunk 2 the sitting `ids.add` line, then Home's return with `, dropped`; hunk 3 both focus lines.
  5. intents/index.mjs: `{ frame, home, cargo, incubator, library, "library.species": library.species, habitat, namer, vivarium, create, pods, bench, panel, sitting }`.
  6. nav.mjs: `BUILT = [..., "library", "library.species", "bench", "sitting"]`.
  7. intents.test.mjs: sorted keys with both `"library.species"` and `"sitting"`.
  8. asset-policy.mjs ART: the sitting-gilt line, then the look-disc-open and library-sitting line.
  - kit-ratchet.json, frame.json, metrics.json, goldens.mjs and journey.mjs merge cleanly; metrics.json current (`--check`: 12099 cases). Trial merge: face_test 15046/0; layout 732/0 differ; node --test station+ui 767/767, face 629/629; goldens 11/11; journey, layer-check, checks, face guard ok.
- **The round's proof:** node --test 0 failures; goldens --check every screen; the journey and the times tool (first frames ≤ 300 ms, printed); face and public guards exit 0 after committing; ratchet quoted (`library_species: 0`, `library: 0`); node records 0 differ as sets outside the 12 Level 2 states and l1-mid's wish node; one extra 1x review shot (not a golden) for the art director: the Loika with four wish pieces (two carried), a released face, two sittings and two family rows.

## Rulings
1. **`l1.focus.vectors` (owed by UI/UX) is a later line, not a merge blocker.** Level 1's and Level 2's moves are held by tests over the real targets; make-spec-focus-vectors.mjs already reads the vectors. Question for UI/UX: author `l1.focus.vectors` (including gaps over unmet cells) and `l2` vectors.
2. **"Change the wish": not acceptable as built; F1 shuts it in place.** Pinning's rule is game design's; its screen and place in navigation are UI/UX's. Question: what does ✓ on the Level 2 wish open, and where does it sit in the tree?
3. **The sittings count: source right, home wrong (F2).** st.moments is the ledger of paid moments; `sealed:SNN:*` and `guide:SNN` are this species' research sittings. The cap at 9 never binds today. openSittingDoor is not yet wired into the host, so in play the row stays empty until it is. Game-design question: count sittings earned (as built; recommended) or portraits sat by this species' mibis?
4. **The 500 ms rest: accepted** (`AHEAD_REST_MS`, main.mjs:68, on the input handler's clock). The tool's flake is F5.
5. **Asset families (recommendation):** painted: `library-(sheet|quiet)-SNN-digest`, `library-sheet-…-lit-chapter`, `library-page-SNN-chapter-digest`, `look-disc-SNN-trait-look-16`; art: `look-disc-open-16`, `library-sitting-16x12` (palette-exact, signed b00a8b17; 0 off-palette in all 12 Level 2 states). Longest focus id 39 of FOCUS_ID 48 over 748 looks. The art director confirms.
6. **wire.c: accepted.** A level draws from its screen's spec (the id before the first "."). The refusal test is F4.
7. **Level 2's own stage node ids: accepted.** kit_stage takes ids from the caller; 0 invalid-area overflows in both journeys.
8. **The page does not answer keys during a ~1 s render: accepted for the sandbox merge, carried as W1.** Each sheet render freezes the page 0.84–1.36 s here; on a Pi ✓ and ← would wait about 3–5 s. **W1 (own ticket, before the Pi build):** the Library's and the specimen's renders run in a worker; pictures.mjs keeps the queue, ORDER, supersede rule and cache; proof: a key pressed during a sheet render is answered within 2 frames here.
9. **The figure's 4 px lift with no motion: accepted** (matches the pod's own lift). Question for UI/UX: should Pods' creature lifts ease over `focus.lift.ms`?
10. **Pi timing: the development-machine proof holds; the Pi 4 measurement stays open.** Level 1 cold first frame 88 ms; Level 2 207 ms; ✓ Show names "Clear Coat" in 18 ms; lit swap-in 956 ms; page made in 37 ms, swapped in at 1047 ms (waits behind the lit variant); paper 2367 ms at boot. Question for UI/UX: may the page be made before the lit variant (pictures.mjs:199 ORDER)?

**Kit rule held:** library_species.c is a binding table; ratchet 0; guard ok. Carried kit line: kit_glint and kit_bezel gain their own hidden forms (golden-neutral) before a third screen stands one in. The Library 2 nit on the two hidden hairlines rides a ticket that retakes Level 1.

## Checked
- The whole diff b9275cf8..57dcda79, 70 files; commits by Paco Cotera, no trailers.
- Own detached build: face_test 15024/0; layout 732/0; node --test station 667/667, ui 79/79, face 609/609; goldens 10/10; library-times ok; journey ok (figure ring [427,373,71,20]); layer-check, checks, face guard (335 files) and public guard ok.
- Node records: 182 shared states; 13 differ as sets (12 new Level 2 states, l1-mid's wish node); everything outside the Library 0 differ as sets. Type log 44/44 identical.
- Goldens changed: only the 4 L4-AD1 retakes, the 12 new Level 2 goldens, journey-library.json and library.json.
- Trial merge with station-gate: green (F6).

## For the art director at 1x (sign)
- 12 new: library-l2-loika-mid, -coat-lit, -met-only, -new, -wish-uncarried, -shut, -hiljan, -kilpo, -belatz, -belatz-coat-lit-complete, -blikur, -loika-late.
- 4 retakes: l1-mid, l1-roomkey, l1-new, l1-dither. Also pods-figure-focused.
- Not in any golden (sign from the round's review shot): the sittings row, a full wish, a released face, a second family row.
- The six asset families above: confirm or move each.

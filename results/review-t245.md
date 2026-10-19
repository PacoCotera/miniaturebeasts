# Review: Home H1 (T-20261019-245) — build/t-245-home-frame, e6a583cc..d6efdc4b

Three commits on station-gate e6a583cc (8471d2cd the frame, b06ef9f9 the fix round, d6efdc4b the §12 wording), all by Paco Cotera <paco@cotera.org>, no trailers or model/session names. I built wasm and native from the head in a fresh worktree and ran the full set at b06ef9f9 (the commit first asked for), then again at d6efdc4b.

## Verdict: PASS
No blocking finding. One cheap follow-up (the ring's eight-object assertion is indirect), ticketed as T-20261019-252; observations below.

## Checks
| check | b06ef9f9 | d6efdc4b |
|---|---|---|
| station tests | 554 / 554 | 554 / 554 |
| ui tests | 80 / 80 | 80 / 80 |
| face tests | 555 / 555, 0 skipped | 555 / 555 |
| all prototype tests together | 1545: 1544 pass, 0 fail, 1 skipped (the C8 skip, on the base) | the same |
| face_test (the C vectors, from build.sh) | 14,678 checks, 0 failed | n/a (no C change) |
| public guard (vs e6a583cc) / face guard | exit 0 / ok | exit 0 / ok |
| place-masters | 1001 placed, 0 problems | the same |
| metrics vectors `--check` | current (12,222 cases) | current |
| all ten golden sets | match | match |
| Station journey / `checks.mjs` / `layer-check.mjs` | exit 0, 0 FAIL | exit 0 |
| play journey | exit 0 | exit 0 |
The builder's 1543 is one under my 1544 passes; nothing fails either way.

## What the lead asked me to check
- **The ring as eight sibling parts (prim.c).** Read in full: a nine-slice with no parent whose asset has the `ring` flag is built as eight `lv_image` strips (corners, then edges: top, bottom, left, right) on the node's parent, no container, no middle; one node in the table, so `ringDepartures` and the log's one ring node are unchanged. Birth on the nursery then `lv_obj_set_parent` to the screen, ordering (the eight sit together at the node's index; `root` advances by 7), hide (`show`), delete (`remove_at`) and ringed↔plain switches (`drop`) all handle the strips. A ring inside a clip keeps the container form.
- **Is any other screen's ring changed?** Every ring on every screen whose source carries the `ring` flag now takes this form, so those rings are eight strips instead of a container, with the same pixels: all ten golden sets match, and the Pods, Create, Incubator, Cargo, Habitat, Vivarium, Library and Bench ring states are in them. The only goldens that moved outside Home are the "case" ones (below).
- **The 8-object count asserted directly?** No, as the builder says, and it is worse than "indirect": `f.objects()` is `face_object_count()`, the node table (87 with the ring on Home, 86 without), not LVGL's objects, so the test "the ring moves … as the same eight LVGL objects; going away … leaves none behind" would not notice a part left behind. I measured the real figure with a scratch test on the builder's helpers (not committed): the face log's `objects` field (`prim_lvgl_objects`) is **157 with the ring, 149 without: exactly 8**, the same on every target (vivarium, library, bay, …), and **149 again after 100 moves and gone**: nothing leaks. The assertion is a one-line change; ticketed as **T-20261019-252** (non-blocking: the primitive is right).
- **Every Home ring move ≤ 153,600.** The builder asserts the 11 moves of one walk (max 53,130). I measured all 30 ordered pairs of the six targets: the worst is library→vivarium **53,130**, vivarium→library 52,800, pods→vivarium 52,140; the stations among themselves 16,536; none near the bound (410,000 before the fix). A lamp change is 8,257.
- **The test edits that could read as loosening.**
  - Verb word cap 4→5: "Go to the Probe bench" is five words, ruled in §11.1/§12 ("the verb cap of 5 words … confirmed"); the cap is still asserted (≤ 5), and the stations' lines stay at 4 (below).
  - Line-width pairs limited to spec order: the line only ever shows the first two needs in the spec's order, so the test walks the pairs `a` before `b` in `strings.line.order` for 1, 2 and 6 of each; it still prints the widest (461 of 484 on b06ef9f9) and asserts every pair fits, and every action fits alone.
  - "Device plate" count ≥ 14 → exactly 10: tightened, not loosened: the five Home modules that named a plate are gone and the remaining regions are counted exactly.
  - Probe plate literals: `perTier = { 1: 3, 2: 4 }` in specs.test.mjs replaces `home.json regions.probe.shields.perTier`, which went with the module; the values are the ones the old test asserted (`assert.deepEqual(P.shields.perTier, { 1: 3, 2: 4 })`), and the bench's own plate places are still checked against them.
  - `offGrid`: six Home regions carry it (Vivarium bezel [16,48,620,400], console [16,460,992,132], the four stations 226 × 98 at y 477), each exactly §1's numbers with the reason written on it; the Library bezel is on the grid, and every other rect is on the 8 px grid. No other rect is exempt.
- **"Case" for "rack", Station-wide.** I walked every string value in the Station specs and the player-facing strings in the Station source: "new pod(s) in the case", "a crate / {n} crates to the case" (Cargo's choice card and the arrival line), "the case is empty" (the Pods need line), Home's "{n} in the case" are all changed, with the tests and journey. What still says rack is design prose in spec notes and comments, internal identifiers (`rackSize`, `dockRack`, `rackpod`, `rack` settings key) and the Developer tools panel (`dev.mjs`: "Rack", "no pod in the rack", "the pods land in the rack"), which a player does not see; not part of "player-facing".
- **The retaken goldens.** I pixel-diffed each against the base: the seven Cargo, Pods panel-release and Incubator-empty ones changed only in the bottom line's words (box [692,572]–[895,587], "two new pods in the rack" → "…the case") and Cargo's arrival-choice card text; nothing else moved. Home's goldens are new states (23 PNGs: rest with the goal and with two needs, each station and each bezel focused, the stations' states, all/some/none home, the Incubator's four, the Bay waiting and with a portrait, the Companion docked and away); the old Home states are removed with the old Home. Not here yet by the spec's own split: the event tag and each light (H2), the Library with 0 and 3 new (H4).
- **Home's old paths removed; Idle and the Vivarium's whole unchanged.** home.c loses `glass_group` and Home's `word_livingWindow` call; `idle_words` and `vivarium_words` are not in the diff, and the Idle and Vivarium goldens and journeys pass untouched. The rest knob's build is replaced by `build_roundPanel` (home_builds.c); screens.c ends the rest dither at the foot of the screen on Home (no bottom line) and calls `home_hidden()` before `home_words()`.

## Delta d6efdc4b (§12)
Spec and strings only: the nameless Companion's line 1 is "at home" / "on a trip" (`strings.stations.awayNoName`, `dockedNoName`), the test follows, and the station word cap goes back to 4 for every string (`wordsIn … <= 4`; the verb cap stays 5). 15 Home goldens are retaken and I pixel-diffed them: each differs only in [540,515]–[717,531], the Companion station's line 1 (1,251 px each). Metrics regenerated and current.

## Observations (not blocking)
- Looking at the goldens, the H1 screen reads as the spec: the line ("Open the Bay · the bud is ready" with the amber lamp and the ✓ cap), the bezels and console in place, the ring 2 px yellow round the focused bezel, the stations' lines; the windows and pictures are placeholders by design (H2, H3, H4).

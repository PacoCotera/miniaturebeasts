# HANDOFF T-20261016-216 (Cargo build, sections 1-6 only)

Branch `cargo/build-spec`, clone `scratchpad/pq`. Authority: `pwq/results/T-20261016-197/build-spec.md` (1cb34829 amendments, §7 NOT in this build), answers in `scratchpad/wq/results/T-20261016-216/answers.md`, `pwq/results/T-20261016-216/architect-dither.md`.
Heavy builds: `cd prototypes/face && EMSDK=.../emsdk FACE_BUILD_DIR=/tmp/claude-0/bld-t216 ./build.sh all` (wasm 25-60 s, native ~25 s). Browser tools need `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers PW_DIR=/opt/node-tools`.
Baseline (station-gate 12878132 merged): 1181 tests, 22 failures, all Create face ("the trait rolls"); the names are in `/tmp/claude-0/base-fail.txt`.

## Done (commits on the branch, newest last)
- cdef3666 merge of origin/station-gate (index.json conflict: kept both sides).
- 86e7961d cuts: the AD's cleaned lifting 256/176 and open hatch placed (final); `cargo-cuts.py --check --cleaned DIR`; well-lit radius 31; recess without the lip; new cuts `berth-edge-258x294`, `berth-edge-190x294`, `berth-gilt-198x302`, `cargo-mat-160x80` (the code-drawn pieces, made at build time by the cut script because the face palette has none of those colours).
- WIP commits: `cargo.json` rewritten (generator `/tmp/claude-0/work/gen_cargo_spec.py`, may be gone; the JSON is the source now), `cargo.props.json`, `views/cargo-props.mjs`, `station/src/cargo-run.mjs` (ready list, plan on a copy of the state, lengths/starts), `intents/cargo.mjs` (rule applied crate by crate; Skip/back/room via `INTENTS.cargo.held`), `host.mjs` (hold keys, flash targets e/d/s), `frame.c` (`frame_material_centre`, flash on counters), `screens.c` (hold keys: confirm/back/room:x on "room", ends the face's hold), `screens/cargo.c`, `prim`/`vocab` (`v_asset_size`), `asset-policy.mjs`, frame.json (title Bay, jump Look at the pods), tests (face cargo.test.mjs 50, station cargo-props 14, intents, host-hold, caddy-view, specs), goldens (face/golden/cargo), metrics vectors, layer-table doc line in lvgl-switch.md §2.10, face README paragraph.
- journey.mjs Cargo section rewritten for the new flow (needs `JOURNEY_GOLDEN=write` once to refresh `face/golden/journey-home.json`; not yet run).

## Status at ba2c26d1: ALL DONE, report sent
Tests 1187 / 1165 pass / 22 fail (the same 22 as base); station+ui 630/630; face cargo 52/52; place-masters 1000 placed 0 problems; checks.mjs ok; layer-check ok (cargo and all other screens); guard exit 0; journey only the baseline Create failures; goldens regenerated (face/golden/cargo, journey-home.json). Stills in cargo-build/stills.

## (old) Left
1. Wait for / re-run `layer-check.mjs` (browser) and read its Cargo lines; fix any departure.
2. `node prototypes/station/tools/checks.mjs`, `node prototypes/ui/tools/place-masters.mjs --check`, `node prototypes/face/tools/guard.mjs --base origin/station-gate`, full `node --test` run and diff against base-fail.txt.
3. Stills (1x) into `scratchpad/cargo-build/stills/`: bay (`cargo-bay.png`), opening three crates (`cargo-opening-three*.png`), opening with the portrait crate (`cargo-opening-portrait.png`), the end (`cargo-end.png`) — copy from `prototypes/face/golden/cargo/`.
4. Final report (head sha, counts, stills, fallbacks, open questions) via SubagentHandback.

## Spec fallbacks used (report these)
- The dock arrival (state `arrival`, T-120) is not in the new spec: its old bay/crates/rack/ribbon keep their numbers under `regions.dockBay/dockCrates/dockRack/dockRibbon` and `props.regions.dock*`; the Dock still plays the arrival show first. §6's "a Dock while the bay shows: each crate cuts in" therefore holds only after the show.
- Fonts: the face has 16/20/28 only: the "+{n}" on the mat (13) is 16, the display amounts (22 medium) are 20 and the small ones 16.
- Mat row: three fixed places 36/84/132 (the row of three centred on 104), a fourth or more start at 32 with "+{n}" where n = pods past the third; a pod whose place is past the third lands on the third place.
- Crates with no pod, find or material read as one material for the length (1600 ms).
- A material's "+n" amount and shadow leave when its object lifts off; the figure flash at 500 is the frame's existing counter flash (no icon flash exists).
- Finds: no crate record carries finds today; the host reads `crate.finds` (crystal/pearl/shard) when present and lands them on the strip for the run only. Find travel target: horizontal centre and feet on the strip place.
- The portrait pair is centred in the display rect on both axes (576,130); its travel target (−200,40) is the pair's top-left; the lifting picture of the portrait crate is `crate-lifting-176x138`.
- Materials fly to the top bar's icon centre (beyond the bay rect): the travel region is `[16,0,992,552]`, the top bar is drawn after and covers it.
- The world turn: §4 has no turn step; the host sets it at the crate's end.
- Hold ceiling: at most the crates that fit hold ≤ 30000 play, the rest are taken in by the rule when the run ends.
- Mat/berth outline etc are pictures cut at build time (not runtime shapes); the berth's lip is drawn on every berth including shut doors.
- `asset-policy.mjs`: painted-family patterns added for the Bay's masters and cuts (the art director to confirm).
- ✓ Look at the pods puts the ring on the newest pod (ui-ux.md §3), not "the pod that most needs the player"; frame.json jump updated.
- The AD's still draws a 3 px frame round the hatch that §1 does not list: not drawn.

## Open questions
- Hatch frame (above); arrival on the new bay (above); the lifting picture for the portrait crate; whether the dock arrival's "Open the bay" strip should read "Open them all".

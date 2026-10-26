# Sitting S5 gate (architect, 2026-10-25 19:22 Mexico City), b2a22553

## Verdict
One fix round before merge. The hold lift conforms to S4 ruling 2a and F2, F4, F5, F6. Two things block it: the adopted F3 string does not fit the frame's notice zone once capitalised with its lamp (back to the owner, Ruling 2), and one caller of `need()` was missed (Fix 1). Every fix line but Fix 7 can be built now; Fix 7 waits for the owner's adoption.

## Fix lines
1. `prototypes/station/src/intents/incubator.mjs`: import `{ readyCrates }` from `../sitting.mjs`; at :49 `before.need` = `S.need(h.st, h.sv, h.settings, h.ui, readyCrates(h.st, h.settings, h.now()).length).text ?? ""` (otherwise, while Hatch now plays, the notice drops a waiting portrait and brings it back). Test in intents.test.mjs: growNow with a ready portrait, the notice reads "A portrait waits in the Bay" throughout.
2. `state.mjs:566`, the crates branch: `label: portraits ? "Open the Bay" : "Open the bay"`; rules-fixes.test.mjs:212 expects "Open the Bay" when a portrait is counted. Crates alone keeps "Open the bay" (TY2).
3. Remove the dead name split: `home_frame.c:63–68` (the `who`/`strstr` branch and runs `line.needs.a/b/c`; one `v_run("line.needs", full, tx, ty, …)` stays); `home.props.json:22` `"name"` leaves the needs form of `regions.line`. Face guard ratchet unchanged or lower; goldens all match (0 pixels).
4. `sitting.json:151` (`buildChanges[6]`): "Cargo's end jumps to state portrait when regions.portrait.offeredFrom lists cargo-end; the hold on sitting crates is lifted (Sitting S5): a ready portrait is counted apart in Home's line and the frame's notice (home.json strings.line.needs.portrait, strings.line.needs.crates.withPortrait) and never rides the dock arrival (cargo.json regions.dockCrates.portrait)".
5. `design/proposals/lvgl-switch.md:380`: "Amended:" becomes "Amended (2026-10-25, Sitting S5):".
6. A measured guard in `sitting-host.test.mjs` after :185: for every form the frame can show (a, two, three, dropped), capitalised, `measureRole(metrics, frame, "notice")(text) + regions.need.lampGap + regions.need.lamp[0] <= regions.need.rect[2]`, and `wordsIn(text) <= regions.need.words`. Fails on the current string until Fix 7.
7. After the owner adopts the new string: `home.json strings.line.needs.crates.withPortrait`, the matching text in `state.mjs:566`, the expected strings in rules-fixes.test.mjs:212–213 and sitting-host.test.mjs:183–184.

## Rulings
1. F1 `portraitNoName`: the four-word rule (specs.test.mjs:575) stands; keep "from a sitting" as built (the Home build spec's and case.md's words). The S4 line "a portrait, to look at" was outside the architect's remit; new words go to the copywriter and the owner.
2. F3 overflows; the string changes (owner, with this recommendation). Capitalised, notice role: "Two crates and a portrait in the Bay" 264, "Three …" 274. The zone [632, 570, 272, 24] is right-aligned with a 12 px lamp and 4 px gap: text room 256. The forms are 7–8 words against `regions.need.words` 6. The rect (type-spec T7) and the limit (UI/UX) stay. Fallback C capitalised: one 206, two 236, three 246, dropped 202, fits, but 7 words. Recommendation: the copywriter writes a both-at-once form of 6 words or fewer, ≤ 256 px capitalised at a, two, three and the dropped count; C only if UI/UX raises the limit to 7. Question for UI/UX and type: should T7's 272 include the lamp? "Then the Untuva pod needs ⚡◆❀" (268) already puts the lamp over the separator.
3. The lamp and cap moving 8 px on `home-bay-portrait` is accepted: the line stays centred on `home.json regions.line.centre` 580 (410–749 vs 418–742; centre 579.5).
4. The dead name path goes in this round (Fix 3): the props contract must not carry a field nothing feeds.
5. Label capitals: the crates-plus-portrait branch gets "Open the Bay" (case.md: the Bay is the room); crates alone keeps "Open the bay" until TY2. No golden shows the combined branch.
6. sitting.json:151 is fixed here (Fix 4): this build's F5 made the reference dangle.

## Checked
The ticket, the S4 gate, the copywriter's F3 note, frame.json `regions.need`, frame.c:192–200, home_frame.c:44–70, case.md and type-spec T7; the diff 7627b495..b2a22553 (14 files). Own run of the touched suites: 132 tests, 0 fail. Every F3 and C form measured in the notice role. Node records 222/222 states, 1 differs (`home/home-bay-portrait`: lamp, cap, line runs). Builder's record: face_test 19954/0; node --test 1820, 0 fail, 1 skip; journeys, guards, layer check ok; goldens match. The 2a cases tested (need(): crates only, portrait only, both, away, bud first, before the pods; Home's line; the frame through the host). Cargo's own notice unchanged. Missed caller found (Fix 1). Only the named golden changed.

## For the art director at 1x
`home-bay-portrait`: Home's top line now reads "Open the Bay · A portrait waits in the Bay", all amber (Dot's orange name is gone); the lamp and ✓ cap sit 8 px further left, the line centred. Nothing else moved.

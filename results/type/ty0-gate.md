# TY0 gate (architect, 2026-10-24 22:07 Mexico City), f9403d7a

## Verdict
**Fix round first, then merge.** No golden, node record or type-log string moves. The kit is sound and every proof holds as reported (every golden matches; node records 0 differ; type log identical; the three existing fonts re-bake byte-identical; the report counts and the ratchet exact). Four things must change before TY1 can rely on the kit, all golden-neutral: the role schema cannot express type-spec.md §1 (the crowd name tag, Cargo's 20 Medium figure, the 24 px stacked facts); `code.wall` casts the void shadow, which the art director forbids; `v_say_run` casts no shadow though Cargo's arrival band needs one; T10 and T5 use "same region" to mean "same run". Plus two small corrections to the lint and the line-case report. The round lands on station-gate 06886f0c with the merge resolution below.

## Fix lines
1. **F1. Variants may carry a font, a pitch, a colour or a shadow.**
   - Schema: a `type.roles.<r>.variants.<v>` is either a palette name (that colour on every ground the role has) or an object whose keys are a subset of `font`, `pitch`, `colour`, `shadow`. `font` is a `type.fonts` name; `colour` one palette name for every ground; `shadow` a per-ground map replacing the role's (`{}` = none). A key left out is the role's.
   - frame.json `type.roles`, exact:
     - `"nameTag": { "font": "M20", "colour": { "pane": "bone", "band": "bone" }, "variants": { "crowd": { "font": "M16" } } }`
     - `"body"` gains `"variants": { "facts": { "pitch": 24 } }`
     - `"quiet"` variants become `{ "bay": "bone", "facts": { "pitch": 24 } }`
     - `"code"` variants become `{ "wall": { "colour": "ink", "shadow": {} } }`
     - `"figure"` variants become `{ "price": "focus", "short": "amber", "large": { "font": "M20" } }`
   - vocab.c: `role_font` reads `variants.<v>.font` and `.pitch` before the role's (so `v_role_*`, `v_role_font`, `v_say` follow the variant); `role_of` takes the colour from the string, or `.colour`, else the role; the shadow from `variants.<v>.shadow.<kind>` when `variants.<v>.shadow` is an object (`spec_len` ≥ 0), else the role's. A variant neither string nor object, or naming a font the face does not hold, is refused (error, zero-size node).
   - measure.mjs: `measureRole` resolves the variant's font (`"nameTag.crowd"` measures as `"16m"`).
   - face_test: `v_role_font("nameTag.crowd") == PRIM_FONT_M16`; `v_role_font("figure.large") == PRIM_FONT_M20`; `v_role_pitch("body.facts") == 24`; `v_say(…, "code.wall", "painted", …)` sends no `<id>.shadow`; a variant naming font `"X9"` is refused.
   - ui/tests/specs.test.mjs, one enforced test: wherever a role or variant casts a shadow on `painted`, its colour there is `bone`, `fog` or `gold`; every variant object's keys are a subset of the four; every `font` is a `type.fonts` key.
2. **F2. The shadow is drawn where the text node is drawn.**
   - vocab.c: a static `g_say_shadow` beside `g_say_role`. `v_text`: when `g_say_shadow[0]` is set and `s[0]` is not empty, first send `<id>.shadow` (role `"shadow"`, x + 1, y + 1, same w and font code, in `g_say_shadow`), then `<id>`. `say_at` sets `g_say_shadow = r->shadow` and calls `v_text` once; `v_say_run` and `v_say_price` set it around their call and clear it after. Icons cast none.
   - Node ids: `v_say`'s shadow id unchanged (`<id>.shadow`); a run's pieces `<id>.<n>.shadow`; a price's figures `<id>.<g>.t.shadow`.
   - face_test: `v_say_run("ty.prun", "Hello", 10, 100, "quiet.bay", "painted", V_ALIGN_LEFT)` draws `ty.prun.0.shadow` at (11, cap + 1) before `ty.prun.0`.
3. **F3. A run is logged by id, not guessed from the region.**
   - prim.h: `void prim_run(uint32_t run);` (the run the nodes sent from now on belong to: one `v_run` or `v_price` call, `v_id` of its id; 0 for none).
   - prim.c: `node_t` gains `uint32_t run`, set from `g_run` in `prim_node` for every kind; the log gains `"run":%u` on each type entry after `ground`, and a 14th value, run, on each `nodes` entry.
   - vocab.c: `v_run` and `v_price` call `prim_run(v_id(id))` on entry and `prim_run(0)` before each return.
   - clearance.mjs: `node()` maps `n[13]` to `run`; T10 skips `o` when `t.run && o.run === t.run` (replacing `o.region === t.region`); T5 skips `p` when `t.run && p.run === t.run` (replacing `p.region === t.region`); clearance.test.mjs's run-based cases replace the region-based ones.
4. **F4. T5 and T11.**
   - T5's `pictures`: every sprite plus the nine-slices off the chrome layer: `n.kind === KIND.sprite || (n.kind === KIND.nine && n.layer !== 0)`.
   - T11's ellipsis condition becomes `R.ellipsis !== true`, for any role (corrects type-build.md (4), which tied it to role `name`).
5. **F5. The lint skips spec documentation; the line-case report is labelled by builder.**
   - `lintStrings` skips a leaf whose own key matches `/^(_|note$|rule$)|(Note|Rule)$/` (measured 331 → 307 on f9403d7a; 337 → 312 after the merge).
   - line-case.mjs keeps its counts per `where` label and prints one line per label: `line case (report mode): <label> (in <file>)` (arrival, namer and panel import habitat-props.test.mjs's `validate`, so its tests run in their processes too).
6. **Proof:** goldens --check every screen; node records on every golden state 0 differ as sets (instrumented capture, 06886f0c after the merge); type log text, px and region identical at every journey point; face_test 0 failed with the new checks; node --test 0 failures; face guard and public guard exit 0; the counts reprinted (clearance per screen, lint 312, line case per label).

## Rulings
1. Role ids confirmed (name, title, heading, nameTag, eyebrow, label, body, code, quiet, figure, verb, subject, back, notice, new, loss); variants code.wall, quiet.bay, verb.dim, label.state, label.open, figure.price, figure.short confirmed; new nameTag.crowd, figure.large, body.facts, quiet.facts (F1). Values and names are UI/UX's; the schema is the architect's.
2. Schema: variants carry font, pitch, colour, shadow (F1); separate roles rejected (doubles the colour tables, breaks one role one job).
3. code.wall's shadow goes by data (F1), with the enforced spec test.
4. v_say_price accepted as built; v_say_run and v_say_price cast the role's shadow (F2): Cargo's arrival band (cargo.c:350) is a run on the painted wall in quiet.bay.
5. The face log (x, w, cap, base, role, ground; the nodes array with ink from prim's alpha box) accepted and supersedes the host-side inkOf; largest journey log 17,749 B of the 60,000 B cap. F3 adds run.
6. Clearance: T10 one region = one run rejected (F3); container = the text's region or its parent, accepted; T3/T4 skip the bars, accepted; wholly covered nodes skipped, accepted; a bar's rule only when the log draws that bar, accepted. T5 and T11 corrected (F4).
7. Lint and line case: notes and rule strings excluded by key (F5); `lineCased` accepted; the arrival.test.mjs label explained (F5). Carried: move `validate` to tests/fixtures.
8. Docs accepted (technical-architecture.md §4.1 Fonts row 139.4 KB, §5.2 inter-16m; face README note).
Carried for TY-L: the clearance lookup reads library.json's `l2` and `l3` region tables once UI/UX marks band, labels and ellipsis there.

## Merge after Library 5 (exact resolution)
Against station-gate 06886f0c: `git merge-tree --write-tree 06886f0c f9403d7a` is clean (tree 90096fd6; CMakeLists.txt takes both lines). Three edits after it:
1. kit-ratchet.json `"text"`: `"habitat": 4` → `"habitat": 5`; add `"library_family": 0` after `"library_species": 2`.
2. tests/vectors/metrics.json: regenerate with `node prototypes/face/tools/make-metrics-vectors.mjs` (16168 → 16444 cases).
3. face/tests/library-family.test.mjs: `import { familyBuild as familyBuildUnchecked } from "../../station/src/views/library-props.mjs";`, `import { lineCased } from "../../station/tests/fixtures/line-case.mjs";`, `const familyBuild = lineCased(familyBuildUnchecked, "library-family");`.
Measured on the merged tree with the three edits: face_test 19497/0; native hash 47e09df8; face guard 0 failures; node --test (ui, station, face) 1435/0; line case library-family 314 checked, 13 lowercase; lint 337 (312 with F5); goldens 11/11; clearance 2035 departures at 217 golden states.

## Checked
The ticket, type-build.md, type-spec.md §1 and §1b, ad-type.md; the whole diff ffb1fd37..f9403d7a except the generated font and vectors. Own detached build of f9403d7a: face_test 19216/0; metrics vectors current (16168); node --test 1773/0 (1 skip); both journeys; face guard; layer check (2014 departures at 215 golden states); goldens 11/11; checks (427 at 44 points); masters 1054/0; public guard; lv_font_conv 1.5.3 re-bake byte-identical. Node records 206 states, 17,950 nodes, 0 differ. Type log 44 points, 665 strings, 0 differ. Ratchet text table equal to the guard's counts.

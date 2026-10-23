# K10 gate (architect, 2026-10-23 12:11 Mexico City), 8310599b

What I measured. I used a detached worktree at 8310599b with a private FACE_BUILD_DIR, and a copy of b0fc6c77's prototypes/station/src/views made with `git archive`. Both are removed afterwards. I did not run the Station journey; the code reviewer runs it, flake check included.
- `build.sh native` at 8310599b: layout 386 cases, 0 differ; face_test 14785 checks, 0 failed; native hash 47e09df8. The face is untouched (`git diff --stat`: 16 files, all under prototypes/station).
- **The props record comparison.** This is my own recorder, a module hook (`node --import`). It wraps every exported function of station/src/views/*.mjs, except words.mjs and requests.mjs. It serializes each return with undefined fields, functions, typed arrays (hashed) and key order kept, and hashes the result. For the base side it serves the b0fc6c77 views in place of the K10 ones, so everything else is the same tree.
  - I ran it over the 19 station test files that import the views: arrival, bench, cargo, create, crop-pictures, drawn-looks, habitat, home, idle, incubator, lib-seen-save, library, namer, panel, pictures-rgba, pods, policy-families, specimen and vivarium. Base once, K10 twice, and the K10.1 trial below.
  - The test results are the same on every side: 0 failed in every file.
- Reachable values, read from the code at 8310599b:
  - The shield tiers (TIER: 3 and 4).
  - The chapters per species frame, over the 16 frames: at most 8 (S03 and S16).
  - The `max` of every needKey result: 3 or 6, in all seven.
  - The spec strings with `{n in words}`, `{a/an}` or `{x|y}`, and how many times each token appears.
- `git merge-tree --write-tree 37296291 8310599b`, and the author, committer and trailers of the commit.

- **K10 (T-20261023-278) as built: PASS. Two misses go to K10.1; they do not block the merge.**
  - **Behaviour-neutral: proved.** 24492 recorded returns (13132 without pods-props `slot`), base against K10: 0 differ. K10 against K10: 0 differ, so the record is deterministic.
    - That covers 735 createBuild, 95 homeBuild, 65 cargoBuild, 55 benchBuild, 318 habitatBuild, 46 vivariumBuild, 40 namerBuild, 21 panelBuild and 762 podsProps returns, plus the helpers they call.
    - The request arrays are included, with every `until`, `hollow` and key order.
  - **The API: accepted as built.**
    - **fill**: one regex, `/\{([^{}]+)\}/g`. It fills `{name}`, `{n in words}` and `{a/an}`, and leaves a name the values do not hold as written.
      - Replacing the `\w` copies with it is neutral because no caller passes a non-word key except the three spaced ones.
      - Replacing the `[^}]+` copies is neutral because no template has a stray `{` inside a token.
      - pods-props' copy returned `o[k]`, with no fallback. The records show no "undefined" was ever produced, so the change is neutral.
    - **spell**: one table, 0–12, digits beyond. **plural(n, one, many)**: `one` only for exactly 1. **count**: "a" for 1, otherwise spell.
    - **req, slot, ph, plateDevice**: the signatures in the builder report. Each export has a contract comment.
  - **The replacements are right.** The tables replaced as neutral are neutral over the reachable values:
    - bench: shield + 1 ≤ 4;
    - create: unread ≤ 8;
    - home: COUNT for 1 ≤ n ≤ max, and max ≤ 6;
    - habitat: capped at 11;
    - cargo SPELL1: the same table and the same digits.
    - `{n in words}` appears once in both cargo `mended` and habitat `partners`, so fill's replace-all equals the old first-only `.replace`.
  - **Miss 1: one of the 14 fill copies is still there.** The local fill inside homeBuild (home-props.mjs:175, the `\w` form) is neither replaced nor parked, and the report does not mention it. The report's "12 replaced + bench parked" makes 13 of the 14 (the 15 copies in views, less library-props). Deleting it is neutral: measured, 0 differ.
  - **Miss 2: a request helper is still local.** In fitCards, panel-props.mjs:64 `const part = (id) => req({ kind: "slot", id, master: id, size: PART, until })` is a local slot helper, and it is the shared `slot` form exactly. Replacing it is neutral: measured, 0 differ.
  - **Not done, but in §2:** pods-props still defines and exports a request helper, `slot(req, master, rect, until)`, which bench, capsule, create, incubator and panel import. §5 rule 5 says the builders use requests.mjs. It moves in K10.1 (2d).
  - **Proof sufficiency: the builder's proof alone is not enough for this ticket. With my record comparison it is.**
    - The type log and check fields (0 of 44 differ) cover only the words that are drawn in 44 shots. They do not cover requests, words that no shot draws, or props the face ignores.
    - There are no props snapshot tests: every props test asserts values, and none compares output bytes (grep: no snapshot in station/tests). A passing `node --test` therefore does not show "every props snapshot byte-equal". The record comparison above does.
    - **Sensitivity.** I planted faults on the K10.1 trial copy:
      - an `until` changed by one character in bench: 62 records differ;
      - an `until` changed in home: 93;
      - the one|many alternatives swapped: 8;
      - the create `ph` change (2e): 725 + 10.
    - **Coverage gap.** No test reaches the branches beyond the tables: cargo > 6, panel > 12, the pods digits > 12, create > 12. Planting a changed fallback in each gives 0 differ. These are proved by reading and by the reachable maxima above, and K10.1 adds tests for them (2h).
  - **Commit:** author and committer are both Paco Cotera <paco@cotera.org>, with no trailers.

- **2. The parked sites and the two left alone.**
  - **bench fill, the `{a|b}` form: (b).** fill gains the form inside its one regex:
    - A name that the values hold is filled from the values, as now.
    - Otherwise, a name of the form `one|many` (exactly one `|`, both sides non-empty) becomes `plural(values.n, one, many)`.
    - Anything else stays as written.
    - bench's local fill goes.
    - Only bench.json's `{plate|plates}` and `{strike|strikes}` have this form. habitat.json's `{read|unread|sealed}` has two pipes, so it is untouched.
    - Measured: neutral.
  - **bench plate, its own `until`: (b).** The signature becomes `plateDevice(w, h, until = "the device plate (fix 2: placed 1:1)")`. Measured: neutral.
  - **create ph, the four-argument form: (b), with one ruled request change; no wording owner is needed.**
    - Both of its calls pass two arguments. The requests for chamber-back-400x320 and chamber-front-400x320 therefore carry `hollow: undefined` and `until: undefined`.
    - It becomes the shared `ph` with `until: "its master (masters/index.json)"`. Both ids are placed masters, listed only in ui/assets/masters/index.json.
    - Measured on the trial: exactly those two ids gain `hollow: false` and the `until`, in 725 createBuild returns and 10 in policy-families. Nothing else differs.
    - What the face draws cannot change. `r.hollow` is falsy either way, and pictures.mjs reads `until` only to register a placeholder for an id with no asset.
  - **home slot, id `master:WxH`: (b).** This is pods-props' exported `slot`, which moves to requests.mjs as `slotAt` (2d). Measured: neutral.
  - **panel req, one request per id: (b).** The signature becomes `req(requests, once = false)`. With `once`, a request whose id is already in `requests` is not pushed again, and the id is returned either way. Measured: neutral.
  - **cargo SPELL (0–6, then "many"): neutral now; the wording is the copywriter's.**
    - Now: `spelled = (n) => (n <= 6 ? spell(n) : "many")`, and the table goes. Measured: neutral.
    - **Copywriter:** should Cargo's waiting and crate counts of 7–12 read "seven" to "twelve", as Panel, Pods and Create do, instead of "many"?
    - If the answer is yes, the cap goes in a wording ticket, not in K10.1.
  - **panel SPELL (0–12, then "many"): (b).** spell gains a fallback: `spell(n, beyond)` is `NUMBER_WORDS[n] ?? beyond ?? String(n)`, and panel uses `spell(n, "many")`. Measured: neutral.
  - **pods-props WORDS/inWords, left alone by the builder: not accepted.** It is a local number table (rule 5), and it is exactly `spell(+n, "many")`. Measured: neutral.
  - **pods-props `plate-device-408x{h}`, left alone: accepted, (a).** Its id comes from the spec template (pods.json regions.compareA.plate). plateDevice would write the id from code, and rule 5 prefers the spec.
  - **What stays written in its builder:** a request whose shape requests.mjs does not make:
    - the home bed and the idle painting (id ≠ master);
    - the cargo pod;
    - the panel crate crop;
    - stamplook's plateMasterReq, which is outside the views.

    When a second builder writes the same shape, it moves to requests.mjs (as §5 rule 2 says for drawing).
  - **Binding a shared maker is allowed.** A builder may name a shared maker with its fixed arguments (`const ph = phOf(req, "...")`). It may not write a slot or ph object literal.
  - **UI/UX:** no look question.

- **3. The builder's choices.**
  - **The signatures: accepted.**
    - `req(requests)` returns the collector.
    - `slot(req, until)` and `ph(req, until)` return the builder's makers.
    - `plateDevice(w, h)` returns the request, and the caller passes it to its own req.
    - K10.1 extends them (2a–2d) without changing a call that already exists.
  - **count(0) = "no": accepted.** No caller reaches it: wordsOf counts only 1 ≤ n ≤ max. It reads naturally ("no pods"), and the contract comment says so. A future site that shows count(0) asks the copywriter first.
  - **The two pods-props sites:** WORDS/inWords is fixed in K10.1 (2f). The compare plate is accepted.
  - **One exact fix to fill: `Object.hasOwn(values, k)` in place of `k in values`.** Today `{constructor}` would fill a function. Measured: neutral.
  - **Not in K10's remit, and no ticket now:**
    - the four `\w` fill copies in station/src/intents (bench, habitat, namer, panel);
    - state.mjs COUNT_WORDS.

    These are not props builders. The intents would have to import from views, against the current direction of imports.

- **4. Merge and K5.**
  - **Nothing blocks merging K10 onto station-gate 37296291.**
    - `git merge-tree` is clean: tree e07d515b, exit 0.
    - b0fc6c77..37296291 touches 17 files, all under prototypes/face. K10 touches 16 files, all under prototypes/station. No file is in both.
    - The face tests that import the views get byte-identical props (measured above), so K4.1's face tests see on the merged tree what they see at 37296291.
  - **The journey failure is the reviewer's call** (probe-bench, action 2, "right" moved focus plates→slot). The props side gives the journey nothing new: all 55 benchBuild returns are byte-identical, focus targets included.
  - **Order: K10 merges first. K5 starts after it, and K10.1 follows K5.**
    - K5's tile line in vivarium-props is line 28 at 8310599b, the very line K10 edits (`slot = slotOf(...)`). A K5 branch cut before K10 merges would conflict there.
    - K10.1 touches habitat-props near K5's line 92 (lines 58–88).
  - **K5's ticket must carry these lines** (they replace k41-gate.md's base line):
    - `base: station-gate with K4.1 and K10 (build/props-words 8310599b) merged; K5 starts from that merged tree, on build/ui-kit.`
    - `The props lines K5 touches (vivarium-props.mjs:28 and habitat-props.mjs:92 at 8310599b) read the tile width from vivarium.json tiles.forms and keep words.mjs and requests.mjs; no local fill, number table, plural or request helper (rule 5).`
    - `The proof includes the props record comparison of K10 (every exported views function's return, hashed, base against after, over the views test files): 0 differ.`
  - **K10.1 (props words, follow-up), ticket-ready.** Every line except 2e was trialled on a copy of the K10 views, and the whole set gives 0 differ. 2e gives exactly its stated change.
    - `base: station-gate with K5 merged; branch build/props-words. Station views only; library-props.mjs stays with the Library tickets.`
    - `2a words.mjs: spell(n, beyond) = NUMBER_WORDS[n] ?? beyond ?? String(n); fill looks a name up with Object.hasOwn(values, k); a name it does not hold of the form one|many (exactly one |, both sides non-empty) becomes plural(values.n, one, many); any other stays as written; still the one regex /\{([^{}]+)\}/g; contract comments say all of this.`
    - `2b requests.mjs: req(requests, once = false): with once, a request whose id is already in requests is not pushed; the id is returned either way.`
    - `2c requests.mjs: plateDevice(w, h, until = "the device plate (fix 2: placed 1:1)").`
    - `2d requests.mjs: slotAt(req, master, rect, until) = pods-props' slot moved verbatim ({ kind: "slot", id: "<master>:<w>x<h>", master, size: rect.slice(2), until }); pods-props no longer defines or exports slot; bench, capsule, create, incubator, panel and pods import slotAt from requests.mjs. home: slot = (master, size) => slotAt(req, master, [0, 0, ...size], "its master (build spec section 9)"). cargo-props:61 and habitat-props:58, :67, :79, :88 (the master:WxH literals) use slotAt with the same master, [0, 0, w, h] (cargo: [0, 0, ...R.display.portrait.frameSize]) and the same until.`
    - `2e create-props: ph = phOf(req, "its master (masters/index.json)"); the requests of chamber-back-400x320 and chamber-front-400x320 gain hollow: false and that until, and nothing else changes (the one ruled request change); spell(unread.length, "many") (the old fallback; unreachable at 8 chapters).`
    - `2f bench-props: the local fill goes (2a); plate = req(plateDevice(r.rect[2], r.rect[3], "the device plate (fix 2: placed 1:1 at the module's rect)")). home-props: the fill inside homeBuild goes. pods-props: WORDS goes; inWords uses spell(+n, "many"); the compareA plate stays (its id is the spec's).`
    - `2g panel-props: SPELL goes; dockCards uses spell(n, "many"); fitCards' part = slotOf(req, "the Probe's upgrade part (bench.json regions.slot.part)") called with (id, PART); artOf's requests use slotOf(reqOf(requests, true), "the decision panel's master (art director, T-20261016-47, -70)"). cargo-props: SPELL goes; spelled = (n) => (n <= 6 ? spell(n) : "many") until the copywriter rules on 7–12.`
    - `2h tests: words-requests.test: spell(7, "many") = "seven", spell(13, "many") = "many"; fill one|many with n 1, 2 and missing, "{a|b|c}" and "{constructor}" stay as written (the "{a|b}" stays case becomes "a" for n 1); req once; plateDevice with an until; slotAt's id and key order. A cargo-props case with 7 waiting reads "many"; a panel dockCards case with 13 crates reads "many".`
    - `2i proof: the props record comparison (K10 gate) base against after over the 19 views test files: 0 differ except 2e's two ids by two fields, quoted with its counts; the type log, all 44 shots identical; checks.mjs with " · placeholders registered N" stripped, each side from its own Station journey with a private STATION_CHECKS; goldens --check; both journeys; face and public guards exit 0.`
    - `Stays in its builder (a shape requests.mjs does not make): the home bed, the idle painting, the cargo pod, the panel crate crop, stamplook's plateMasterReq.`
  - **The Library tickets** take library-props.mjs onto words.mjs and requests.mjs when they next touch it. Its fill is the `\w` form, and its slot is the shared `slot(req, until)` exactly.

Cleanup:
- The worktree and the build directory are removed and pruned, and so are my base copy's records and the planted copies (about 1.8 GB and 35 MB).
- /home/user/pw is unchanged: build/props-words at 8310599b, clean.
- The recorder and the trial edits are kept, 640 KB: /tmp/claude-0/-home-user/48cdf533-58b9-58f2-b00a-c4744c6746fe/scratchpad/k10h (register.mjs, hooks.mjs, edit101.py, edit101b.py). The K10.1 builder can reuse them; the hook's K10_BASE names the views directory to serve.
- Some atlas-check-*, mb-caddy-* and placed-* directories in /tmp date from 17:55 UTC. They come from a parallel `node --test` run. My runs were one file at a time and may have added some, so I left them all.

# K3.2 and T-273 gate (architect, 2026-10-23 03:03 Mexico City), d2dbfd99

Measured on a detached worktree at f35f1b8a and at d2dbfd99, instrumented outside the clone: node records captured twice at each commit (181 states, 15767 nodes); at d2dbfd99, `build.sh all`, goldens `--check`, layer-check, the Station journey (instrumented to log every shot's settle) and checks.mjs. I also compared the builder's five base runs and five post-fix journey records.

- **K3.2 (T-20261023-272): PASS.**
  - v_cap_in is as ruled: `int v_cap_in(int top, int h, int px)` returns `top + v_fdiv(h - v_cap(px), 2)`. Its contract header in vocab.h says it takes any px, reads nothing and draws nothing, and is given to v_line_at or v_line_in with V_ANCHOR_CAP. v_cap_top's LINE case is now `v_cap_in(y, pitch, px)`.
  - Every listed site is converted, with the same arithmetic as before:
    - specimen.c name, captions and ribbon use v_line_at with V_ALIGN_CENTRE. Its left edge is `x - v_half(w)`, the same as the old centred(). cap_top() and centred() are removed. No cap_top() is left anywhere in the face.
    - list.c place name: v_line_in measures the same string as the old `tw`.
    - ribbon.c: both lines. The empty line still gets width 0 at `rect[0] + v_half(rect[2])`.
    - cargo.c band.words: v_run at `v_cap_in(py0, isz, wpx)`.
    - rail.c tab word: em1 is 24 (frame rail.full_layout.emblem), and 24 - 12 is even, so floor and ceiling agree. Not parking it was right.
    - page.c heading: `v_cap_in(ry + H1 + 1, 24, 20)` with its comment. (24 - 14 + 2) / 2 = 6 = 1 + v_fdiv(10, 2), so the pixels are identical.
  - face_test: 14760 checks, 0 failed (+2). The new cases include a cap taller than its box (h 10 at 16 px gives 49).
  - Goldens match unchanged, layer check ok, and checks.mjs output is byte-identical to the builder's.
- **The node-record proof "0 differ as sets, 9 differ in order" is acceptable.** Order is not part of the proof; node records compare as sets, as in K3.1.
  - The table order is storage, not drawing. prim_end swap-removes nodes that a frame did not see, and the draw order is the call sequence (g_seq).
  - Measured: two captures at f35f1b8a are identical, and two at d2dbfd99 are identical. Between the commits, 0 states differ as sets and 10 Pods states differ in order. The builder's own f35f1b8a capture differs from mine in order in the same 10 states, so the order follows the capture, not the source.
  - My d2dbfd99 capture is identical to the builder's, in order as well.
  - No converted site adds, removes or reorders a node call.
- **T-20261023-273: PASS, with fix lines F1–F4 (test tool only).**
  - It is within the ticket's intent. The clock (stationTime/stationDate) and the crate seed were already pinned. The variance came from shots taken at a real-time moment and from the first-seen order of the type log, and the fix removes both causes.
  - Measured: the type log is identical across the builder's five post-fix runs and my run (0 of 44 shots differ). Before the fix, 4 shots differed across three base runs.
  - The settle loop: 41 shots settle (38 at the 4-step minimum of 400 ms, cargo-arrival-show at 6, notbuilt-cross at 13, page-hatch at 14). 3 shots are under the journey's own hold. None reaches the 60-step cap, and no shot leaves the screen and state it was asserted in.
  - It changes what four shots show. Each one now shows the settled frame of the same state:
    - cargo-arrival-show gains "one mended, free";
    - page-incubator gains its code and readyIn;
    - page-hatch gains the hatch ribbon, and its counter reads 82;
    - notbuilt-cross counters show their end values.
    Accepted: a shot outside a hold had no defined moment. Rule from now on: a journey shot whose moment matters is taken under the journey's own hold at a stated step, as page-fresh is.
  - Sorting loses nothing anyone relies on:
    - log.regions has one entry per region and layer, so its entries are unique.
    - log.type is {text, px, region}, and its order was the node-table order above.
    - checks.mjs and the nine *-regions.mjs departure modules only filter, some or every, and take [0] only where they assert a single entry.
  - Masking risk: the cap ends the loop silently, and a state change during the settle would go unseen. F1 and F2 close both.
- **F1–F4: one fix round in prototypes/station/tools/journey.mjs.** It may run alongside K4 and must land before the next ticket whose proof is the type log.
  - **F1** `settled(name, fn)`. frameShot and shot pass their name. After the loop, when `!was && same < 3`, call `fail(\`${name}: the words did not settle in 6 s of held frames\`)`.
  - **F2** In settled, before the steps, store `at = JSON.stringify([(await ui()).screen, (await props()).state ?? null])`. After the steps, read it again, and if it differs call `fail(\`${name}: the settle carried the shot from ${at} to ${now}\`)`.
  - **F3** `textsOf` keys every field record() keeps: `r.region + "=" + r.text + "@" + r.px`.
  - **F4** A consistent comparator in record(). Compute each key once, and return `a < b ? -1 : a > b ? 1 : 0`.
  - Proof: the journey green; two runs with byte-identical type logs; checks.mjs output unchanged.
- **library.c:56: left for the Library tickets, not this batch.**
  - K3.1 excluded library.c (the Library's second ticket retires it). This batch's proof covers the ruled sites only.
  - The Library map writes the caption-rule name as `v_line_in(id, known ? name : "", bx, bw, v_cap_in(by, bh, npx), V_ANCHOR_CAP, npx, colour)`. This is pixel-identical: "" measures 0, so the line sits at `bx + v_half(bw)` as now.
  - If the Library tickets keep library.c instead of retiring it, this line is the first line of their first ticket.
- **Before K4: nothing blocks. K4 may start on d2dbfd99.**
  - K4's proof is K3's set: node records as sets; the type log byte-identical (now deterministic); goldens unchanged; journeys green; layer-check. To that it adds the composed-picture hashes unchanged (face-ui-kit.md §4).
  - The page.c question goes to UI/UX: the Pods chapter heading word's cap top sits 6 px below its 24 px box at 20 px, 1 px below the box's centre; is that intended? The answer does not block K4. A "no" opens a UI/UX ticket that retakes the Pods chapter goldens. That ticket runs before K4 starts or after K4 merges, never during K4's proof.
  - Amendment (architect): face-ui-kit.md §3.1 adds `v_cap_in(top, h, px)` beside v_cap_top as the one rule for text centred in its art's box (a plate, a ribbon, a tab, an icon).

# Home H4: the specimen port, checked against the runtime ruling (architect, 2026-10-19 10:50)

Read at build/t-258-home-library-specimen c2debf73. Measured on the development machine with the branch's own oracle test, adding counts of the channel values that differ by more than 16 and by more than 24.

**Verdict: PASS with two fixes.** Fix 1 changes one test line. Fix 2 moves where the cold render runs. Everything else passes as built.

## 1. Oracle bar: max 32, plus a count bar

| Set | Mean | Max | Values over 24 | Values over 16 |
| --- | --- | --- | --- | --- |
| S01 A / B | 1.017 / 1.067 | 26 / 30 | 1 / 11 | 69 / 165 |
| S09 A / B | 1.175 / 1.286 | 26 / 26 | 2 / 2 | 32 / 152 |
| S15 A / B | 1.021 / 1.123 | 25 / 30 | 1 / 8 | 43 / 182 |

Each set compares 373,584 channel values. Values over 24 number at most 11 per set, on the edges of discs and rings: edge coverage, not drawing. A max alone cannot tell an edge from a lost feature. A missing ring or bead would also stay inside 32 on most of its pixels, but it moves hundreds of values.

- **Fix 1:** keep `ORACLE_MAX = 32`, and also fail when more than 64 channel values in a set differ by more than 24. That is about 6 times the worst measured case, and far below a missing feature. Print the count in the oracle line. The mean bar stays at 2.

## 2. Port details

- **Filter Effects matrices for sepia, saturate and hue-rotate: PASS.** These are the spec's own matrices, as Chromium applies them. They are linear with no offset, so applying them to premultiplied values is exact.
- **Wide blurs on a reduced copy: PASS.** The weights stay integer, and the reduction's own spread is taken off sigma. Within 1 level of a full-size blur is inside the oracle. The same bytes come out on every platform, because it is all arithmetic on the surface.
- **Species choice cached by its inputs: PASS.** The key is the full set of inputs the choice reads, so it cannot go stale.
- **The cold render at the first Home sync: FIX.** The ruling put the render off the face's frame, covered by the discovery's own reveal. A sync is the wrong moment. Measured warm on this machine: 352–481 ms (best of three); cold, about 1 s. The Pi will be slower; the runtime ruling has its figure measured at P1. During that time the logic thread answers no intent, and no timed step goes out.
  - **Fix 2:** render when a look is found, not when Home is built.
    - Warm the cache at the opening's end, the moment `guideAdd` gives the guide new looks. Do it after the opening's last step is sent, so it delays no step, and before Home's next sync.
    - At boot, warm the shown species' specimen once, after the first frame is sent.
    - `libraryOf` reads the cache only. On a miss, the region shows the last specimen it showed, or the Library placeholder if none, and asks for the render as above. The picture changes at the next sync after the render finishes.
    - Add a test: building Home's props with a cold cache renders nothing, and takes under 50 ms.
  - If the Pi measures over its budget at P1, the next step is a worker thread: `worker_threads` on the device, a Worker in the sandbox. The interface above already allows it. Not now.

## 3. Guard and module boundaries

- **paint2d.mjs and specimen.mjs on the rule-3 allow list: PASS.** Both files are named; the rule is not a pattern. Rule 3 exists to keep drawing off DOM canvases, and these draw on a Float32Array. The port's test already fails on any `document`, `window` or `OffscreenCanvas` in specimen.mjs. Add the same check for paint2d.mjs, in one line, so the allow-list entry cannot cover a real canvas later.
- **`specimen:` ids in the PAINTED family: PASS.** The pattern is anchored and covers the four levels only. Painted, unsnapped RGB is the art director's ruling.
- **`setLibrary` registered by host.mjs: PASS.** It keeps the painter out of the intents' import graph, and with nothing registered, Home shows the placeholder. That makes it a seam, not a hidden dependency.

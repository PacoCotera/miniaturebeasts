# The specimen render-time test (architect, 2026-10-22 11:07 Mexico City)

**Ruling (c):** print the figure against the 1 s budget every run; fail only past a 3 s ceiling (a gross regression).

- Measured: `node --test prototypes/station/tests/specimen.test.mjs`, twice, load 2.7–3.1 on 4 cores, both 8/8. Best of three: late 804, mid 716, early 793, new 810 ms; then late 882, mid 781, early 787, new 952 ms. With the review's 1079 ms, a loaded machine already reaches 1 s, and the PR gate runs every test file in parallel on a shared runner.
- Not (a), a wider bar: near 1 s on a shared runner it tests the runner, not the code. Not (b), print only: a quadratic slip would pass silently. 3 s is 3× the budget and about 3.2× the slowest best-of-three measured.
- No work count: the work is fixed by the 688 × 724 canvas and the frame; any change to what is drawn already breaks the byte golden and forces a RECIPE bump.
- The 1 s budget is guarded by the printed line: a reviewer's full-set report quotes it; over 1000 ms best-of-three on a quiet development machine is a blocking finding and comes back to the architect; over only under load is noted, not blocking. specimen-runtime.md's "Time" line stands, amended by this.

**Exact change** (test code only; no RECIPE bump; no golden moves), `prototypes/station/tests/specimen.test.mjs`:
1. Line 3: `the render time (printed; at most 1 s)` → `the render time (printed against the 1 s budget of the development machine; the test fails only past 3 s)`.
2. Lines 50–54 become:
```js
test("the render is cached by its id: a second call is the same object, and the render time of each state is printed against the 1 s budget (best of three on a warm engine; the test fails only past 3 s, a gross regression)", () => {
  const BUDGET = 1000, CEILING = 3000;   // the architect, 2026-10-22: the 1 s budget is the development machine's and is read from the printed figure; the shared CI runner is too noisy for it, so the assertion is a 3x tripwire
  const times = {};
  for (const n of ["late", "mid", "early", "new"]) { let best = Infinity; for (let k = 0; k < 3; k++) best = Math.min(best, renderSpecimen(S01, stateOf(n)).ms); times[n] = best; }
  const over = Object.entries(times).filter(([, t]) => t > BUDGET).map(([n]) => n);
  console.log(`# specimen render time (ms, best of three; budget ${BUDGET} on the development machine): ${Object.entries(times).map(([n, t]) => `${n} ${t.toFixed(0)}`).join(", ")}${over.length ? ` (over the budget: ${over.join(", ")})` : ""}`);
  for (const [n, t] of Object.entries(times)) assert.ok(t <= CEILING, `${n}: ${t.toFixed(0)} ms, past the ${CEILING} ms ceiling (budget ${BUDGET} ms)`);
```
Line 55 and the closing `});` stay. Verify: the file passes 8/8 and prints the new line.

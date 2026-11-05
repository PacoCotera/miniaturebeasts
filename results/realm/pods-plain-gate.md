**NOT SIGNED.** The pod test has two gaps (checks 2 and 7). The code change itself is correct and the full gate is green.

**1. One path, no mark: yes.**
- `podArt(shell, s)` no longer takes a species argument or draws any species mark. The cache key is `'pod'+shell+s`.
- All seven `podArt` calls in `index.html` pass no species: `drawPatch`, `podSlot`, `warnPicPlace`, `PIC.pod`, `drawPods`, plus the `bone` and `lime` uses elsewhere (lines 3433, 3477, 3928, 3997, 4387).
- The egg keeps its ground tint, highlight, band and outline.
- Grepping for the old stripe, dot and spot code finds nothing else in `prototypes/`. `drawPods` still prints the species name beside the pod when it is known. That is text, not a mark on the egg.

**2. The new test fails if a mark comes back: only partly.**
- It catches a mark drawn inside `podArt` when the species is in the cache key. With the old Loika stripes and `sp` key put back, `pod-plain` gave `# pass 1 / # fail 1`.
- It misses a mark drawn inside `podArt` when the key leaves out the species. The test's first call is `px("undefined")`, which caches the plain egg, so every later species gets the same cached picture. That gave `# pass 2 / # fail 0`.
- It also never looks at the call sites, only at `podArt` itself.

**3. The slot test bypasses `slotCache`: yes.**
- Each cold run imports `regions.mjs?cold=N`, which is a fresh module with an empty cache.
- It uses 307 seeds, three shuffled orders, and four rounds of unrelated calls on other seeds and cells. That is enough calls to fill the cache past its 64-entry limit and clear it.
- With a call counter added to one slot, all three tests in `realm-slots-cache` failed.

**4. Goldens: none changed.**
- The commit touches only `index.html` and two new test files; no PNG or golden is in the diff.
- The gate has 0 failures, so no existing golden shows a field pod with a species mark.
- Nothing was changed, so there was nothing to decode old against new. The builder's own check said 21 pixels moved in the place picture, all on three pods; I did not re-check that.

**5. Full gate (foreground-equivalent).**
- I ran it as a background job and polled until the TOTAL line appeared.
- `masters   rc=0   0s | masters: 1827 placed, 0 problems`
- `public-guard   rc=0   1s | public guard ok`
- `vivarium: ok: 1 log(s), 61 tests ran, 0 skipped by the file itself, 61 new (ran in every shard)`
- `TOTAL 455s; 162 jobs, 0 failed; logs /tmp/gate-FbxYyQ`
- No test needed a re-run.
- `git status` is clean afterwards, so the gate left no untracked pictures in `prototypes/station/img`.

**6. Public guard:** `public guard ok`, `exit=0`.

**7. The two deliberate breaks, both reverted:**
- **Loika stripes on one field pod:**
  - I drew them at the `drawPatch` call site, for `p.sp === 0`.
  - The new `pod-plain` test passed. Every other test in `prototypes/exploration/tests` also passed when I ran them one by one.
  - Nothing caught it.
  - The pod test only calls `podArt`, and no picture test renders a Loika pod in the field.
- **A slot that depends on a call counter:**
  - Every 7th call for cell (0,0) returned `woods`.
  - `realm-slots-cache` caught it (3 of 3 tests failed), and so did `regions.test.mjs`.

**To fix before signing:**
- Make the `pod-plain` test cache-proof: call `podArt` for the plain egg and for each species in separate fresh page instances, or clear the `art` cache between calls.
- Add a picture test that renders a field pod, in the map or place view, for species 0, 1 and 2 and checks the pixels are identical.

I wrote nothing in the repo. I removed only the three scratch files I made in `$TMPDIR` (`gate.out`, `gate.done`, `t.out`).

## Fix round (e1e77f007)

Both test gaps closed: the plain-egg test draws each picture in a fresh page; a new test compares a field pod for species 0, 1 and 2 in the place view and on the map card. Break (a) stripes inside podArt without the species in the cache key: 3 tests fail. Break (b) stripes at the drawPatch call site: the place test fails. Gate 167 jobs, 0 failed; guard ok. Merged as 99175b378.

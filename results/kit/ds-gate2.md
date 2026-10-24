# Docs-only skip re-gate (architect, 2026-10-23 19:14 Mexico City), 29d9d275

Gated: build/docs-only-skip, fix-round commit 29d9d275 on c8cb9651. It changes 2 files: .github/roadmap.test.mjs and .github/build-reads.txt. Read-only: one scratch worktree at 29d9d275, removed after. The merged tree was overlaid only in that worktree.

## 1. Verdict: PASS on F1 to F4. Merge.

- **F1 (no blanker): PASS.**
  - `const code` is gone. The scan runs `text.matchAll(...)` on the raw text. The file imports only node built-ins.
  - Mutation: I put the old blanker back. The planted-read test then fails, because the quoted path in a `/* */` comment is hidden.
  - Non-blocking, and the fault is in my spec: the `// see station-layouts/*.svg` plant does not catch the old bug. The old blanker needs a later `*/` to swallow the read, and the plant has none. Measured: the read survives the old blanker as built, and is lost once ` /* x */` is added after it. The block-comment plant already catches any blanker that comes back. If the builder touches the file again, append `const z = 1; /* x */` to that plant.
- **F2 (file types and what counts): PASS.**
  - It scans `prototypes/**/*.{mjs,js,html,json,py,sh}` with the same SKIP set, plus `.github/*.mjs` at top level only. That is 793 files: 305 .mjs, 467 .json, 10 .py, 8 .html, 2 .sh, 1 .js.
  - A literal counts only when it ends in .md, ends in `/`, or its last segment has no dot.
  - **Literal count, measured with the test's own `readsOf`: 11, on both 29d9d275 and the station-gate merge. My figure was 11, so it matches.** The 11:
    - `art/companion-48/species/`
    - `art/companion-48/terrain/meadow` and `meadow/`
    - `art/device-buttons/caps/`
    - `art/station-masters/pods/motion/proof`
    - `design/proposals/taxonomy.md`
    - `design/proposals/ui-kit.md`
    - `design/style-guide/station-layouts.md`
    - `design/style-guide/station-layouts/`
    - `design/style-guide/station-screens.md` (from frame.json)
    - `v1/prototype/generator-workbench`
  - A stricter scan I wrote separately (one quote type per literal, no spaces, no `${`) finds 9 of these 11 and nothing else. The two it misses are real names:
    - `caps/` sits before `${id}`;
    - `taxonomy.md` is followed by a space in a provenance string.
  - Non-blocking: no planted case proves that .json is scanned. Measured: with json taken out of the scan, all 8 tests still pass, because station-layouts.md is also named in a .mjs file and an extra list entry is allowed.
- **F3 (the ten entries): PASS.**
  - build-reads.txt holds exactly the 10 entries: the two non-.md files are removed and station-screens.md is added.
  - The header is the specified line.
  - Mutation: with station-screens.md removed from the list, the honesty test fails.
- **F4: PASS.**
  - A bare root .md (`ROADMAP.md`) is reported, and a bare `README.md` is not.
  - Mutation: with the README exclusion dropped, both honesty tests fail, because the tree has real bare README.md literals.
  - Mutation: with the bare-root regex removed, the planted test fails.
  - The tree today has 0 bare-root literals.
  - docs-only.sh is unchanged since c8cb9651, so the delete and fragment checks still stand.
- **Done-when list: all met.**
  - `node --test .github/roadmap.test.mjs` gives 8 pass, 0 fail (node 22.22.0).
  - The public guard: `--self-test` is ok (27 pairs, 10 rules), and `--base 2559ff4e` gives "public guard ok", exit 0.
  - The whole local set is unchanged by construction. Nothing outside .github/ reads the two changed files: only site.yml and docs-only.sh refer to them.

## 2. Merge onto station-gate (9fbfc9a9): nothing blocks it

- `git merge-tree --write-tree 9fbfc9a9 29d9d275` gives a clean tree, ca333f17, with no conflicts.
- Since 2559ff4e, station-gate has changed 42 files, all under prototypes/ and none under .github/.
- On the merged tree (prototypes/ and .github/ checked equal to ca333f17), the test gives 8 pass, 0 fail. This time the last-commits test ran too, on the worktree's history.
- It rides the next batched release, as the ticket says.

## 3. Blanker independence from the face guard fix (T-20261023-284): confirmed

- The docs-skip test has no blanker of its own and imports nothing from prototypes/. It has no copy of the regex.
- build/face-guard (313f892d) adds prototypes/face/tools/blank.mjs. Nothing under .github/ imports it.
- `git merge-tree` of 313f892d with 29d9d275 is clean (21bab8dd).
- I ran the docs-skip scan over that branch's 5 changed files. It reports only `art/device-buttons/caps/`, which is already listed. The face guard fix landing in any order does not move the honesty test.

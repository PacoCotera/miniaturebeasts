# Docs-only skip gate (architect, 2026-10-23 16:09 Mexico City), c8cb9651

Gated: build/docs-only-skip, 78986c04 + c8cb9651 on 2559ff4e (4 files, all under .github/). Ticket T-20261023-280. Read-only: one scratch worktree at c8cb9651 (removed after), and the station-gate merge tree extracted to scratch.

## 1. Verdict as built: FAIL on one point (the honesty test can fail open); everything else PASS

The fault is the spec's (it named the face guard's blanker), not the builder's. One fix round (F1 to F4 below), then merge.

- **Scope script (.github/docs-only.sh): PASS.**
  - Measured: the eight cases run directly through the script give 1 true, 3 false, 4 false, 5 false, 6 false, 7 false (a delete plus an add), 8 true.
  - Edge inputs fail closed: a quoted (non-ASCII) path, a CRLF line, an empty list, a garbled line and the build's own diff all give false. A space in a path gives true, which is correct.
  - It fails closed when build-reads.txt is missing: set -e, and the step's `|| result=docs=false`.
- **site.yml: PASS.**
  - The scope step runs only on `pull_request`.
  - All 18 later steps carry `steps.scope.outputs.docs != 'true'`. The 3 main-only steps join it with `&&`.
  - A failed `git diff` or a failed script gives docs=false.
  - The summary is written only when docs=true.
  - No `paths` filter was added to `pull_request`.
- **Eight cases as a test: PASS.**
  - `node --test .github/roadmap.test.mjs` gives 8 pass, 0 fail (node 22.22.0).
  - Case 2 is covered by the planted-read test.
- **build-reads.txt: PASS with changes (F3).**
- **Honesty test: FAIL.**
  - The blanker runs the block-comment rule first. A `/*` inside a `//` comment, or inside a string, therefore blanks real code up to the next `*/`.
  - Measured, scan as built: 16 paths. Raw text: 17. The one missing is `design/style-guide/station-layouts.md`, a real read at prototypes/ui/tests/specs.test.mjs line 120. It is listed only because it was seeded by hand.
  - The test passes today only for that reason.

## 2. The six gaps: fix-round lines

The ticket's rules are unchanged: only .github/, no change to what a full build does, CI is not the test runner.

- **F1 (gap 1, fail-open blanker): drop comment blanking from the honesty test entirely. Do not replace it.**
  - In .github/roadmap.test.mjs, delete `const code = ...` and scan the raw text (`text.matchAll(...)`, not `code(text).matchAll(...)`).
  - Measured: with no blanking, the scan finds the same set as a correct string-aware blanker (17 paths in .mjs/.js/.html; 23 with .py/.sh). Blanking removes no noise in this tree; its only effect was the miss. With no blanker, a quoted path in a comment must be listed or reworded, which fails closed.
  - In the planted-read test, replace the "comments are blanked" assertion with two new ones:
    - a line `// see station-layouts/*.svg`, then on the next line a real read of an unlisted .md: the read is reported;
    - a quoted unlisted path inside a `/* */` comment: it is reported.
  - Build the planted paths with the existing `at3` join, so the file does not find its own plants.
- **F2 (gap 4, the scan's file types and what counts):**
  - Scan `prototypes/**/*.{mjs,js,html,json,py,sh}` (same SKIP set) and `.github/*.mjs` (top level only).
  - `.github/public-guard/` stays out. It is a separate workflow and not run by the Sandbox build. Its `design/x.md` strings are fixtures. Any change under .github/ already runs the full build.
  - Python is not run by the Sandbox build: the caddy tests use a stub and a nonexistent interpreter. It is scanned anyway because, with no blanker, scanning it costs nothing and covers a future step.
  - Report a literal only when it ends in `.md`, ends in `/`, or its last segment has no dot (a folder). Any other file never passes condition 1, so it never needs listing.
  - Measured, current tree and the station-gate merge: 11 such literals. The only new one is `design/style-guide/station-screens.md`, cited by prototypes/ui/specs/station/frame.json.
- **F3 (gaps 2 and 3, which build-reads entries stay): these 10, nothing else.**
  - `art/companion-48/species/`
  - `art/companion-48/terrain/`
  - `art/device-buttons/caps/`
  - `art/station-masters/pods/motion/proof/`
  - `design/proposals/taxonomy.md`
  - `design/proposals/ui-kit.md`
  - `design/style-guide/station-layouts.md`
  - `design/style-guide/station-layouts/`
  - `design/style-guide/station-screens.md`
  - `v1/prototype/generator-workbench/`

  What changes and why:
  - Remove `art/companion-48/palette/palette.json` and `art/companion-48/signs/sign-shelter-32.png`. They are not .md, so the test no longer asks for them.
  - Add `station-screens.md` (F2).
  - Keep `taxonomy.md` (a provenance string), `motion/proof/` (an output folder) and `v1/prototype/generator-workbench/` (named by tools and data). They are named but not read. The list takes no exclusions, because an exclusion list would be a hole. The cost is that edits to those documents always run the full build, which is acceptable for a safety valve.
  - Header line: "every document or folder outside the build's own folders that the build's scripts or data name".
  - Accepted from gap 2: the spec's seed list (design/proposals/*.md, companion-screens.md) was wrong for this tree. I checked: companion-screens.md is named only in comments. The tree-derived list replaces it.
- **F4 (gap 5, the builder's choices): accept both.**
  - Bare `"README.md"` is not a root read. Five literals name a folder's own README. Treating it as the root's would end case 1.
  - Deletes are also checked against linked folders above the path and against `#fragment` links. This fails closed.
  - One addition: a bare literal that equals the name of any other root .md (`ROADMAP.md`, `LICENSING.md`, `THIRD_PARTY_NOTICES.md`, `docs-standard.md`) counts as a root read, with one planted case. Measured: 0 such literals in the scan set today.
  - Residual risk, accepted: a path split into segments (`path.join(root, "design", x)`) is not seen. There are none in the tree today.
- **Gap 6 (push path filter): no change.**
  - The push filter decides main's runs and releases. docs-only.sh and build-reads.txt are not shipped in the bundle.
  - The pull request run already runs the full build on them, because they are under .github/.
- **Fix round done when:**
  - `node --test .github/roadmap.test.mjs` gives 0 failures;
  - the honesty test passes on the current tree and on the station-gate merge;
  - the `// …/*` planted read and the commented planted path both fail the scan;
  - the whole local set is unchanged;
  - the public guard exits 0.

## 3. The face guard (prototypes/face/tools/guard.mjs): affected, and failing open now. Separate ticket; not a merge blocker for this build

- **Measured on the station-gate merge tree: rules 2 to 5 cannot see 456 code lines in 7 files.** This is the guard's own blanker compared with a string-aware single-pass blanker.

  | File | Code lines hidden |
  | --- | --- |
  | station/src/main.mjs | 96, including its imports |
  | station/src/genome.mjs | 22 |
  | ui/tests/specs.test.mjs | 114 |
  | face/tests/bridge.test.mjs | 7 |
  | genome-ring/tools/build-scan.mjs | 2 (from the string `"image/*"`) |
  | genome-stamp/tools/build-scan.mjs | 2 (from the string `"image/*"`) |
  | .github/public-guard/guard.mjs | 213 |

- **Proof:**
  - I planted `document.createElement("canvas").getContext("2d")` at station/src/main.mjs:41 in the scratch copy.
  - The guard as is: "guard ok". Rule 3 fails open.
  - The same guard with a string-aware blanker: `FAIL station/src/main.mjs:41 uses the canvas`.
  - On the unplanted tree, that blanker gives 0 failures, so the fix lands green.
- **Rule 6 (the C files):** it has the same order bug. There are 0 instances today.
- **What to do: a test-tooling ticket, outside .github/, so not part of T-20261023-280.**
  - Replace guard.mjs `code()` with a single-pass blanker. It has these states: code; `'…'`; `"…"`; a template with `${}` depth; a regex literal; a line comment; a block comment.
    - A regex literal starts at a `/` that follows an operator, an opening bracket, a comma, the start of the file, or a keyword such as return or typeof. It tracks `[...]` classes.
    - Quote strings and regex literals end at a newline, so a misread costs at most one line.
    - Newlines are kept, so line numbers hold.
  - Use the same function for rule 6, without the template and regex states.
  - Tests:
    - `// x /* y`, then code on the next line;
    - `"image/*"`, then code;
    - a regex holding quotes and `/*`;
    - a template holding `${}`;
    - the planted canvas call in a copy of main.mjs fails;
    - the guard is ok on the tree.
- **Same ticket, same pattern:** the blanker copies in prototypes/station/tests/intents.test.mjs:332 and prototypes/exploration/tests/world.test.mjs (lines 94, 345, 353, 376) back absence assertions, so they can fail open the same way.
  - Measured: they lose nothing today. The intents graph has 80 modules under both blankers, and world/view/atlas keep identical code.
  - Make it one shared module that all three files import.

## 4. Merge onto station-gate (95f9762a): nothing blocks it except the fix round

- `git merge-tree --write-tree 95f9762a c8cb9651` gives a clean tree, bc6cd9cd, with no conflicts.
- Since 2559ff4e, station-gate has changed 29 files, all under prototypes/ and none under .github/.
- On the merged tree, the honesty, eight-case and three-condition tests give 4 pass, 0 fail. The last-40-commits test was not run, because the extraction has no history.
- The proposed F2 scan on the merged tree gives the same 11 literals.
- Merge after the fix round. Per the ticket, it rides the next batched release and is never released alone.

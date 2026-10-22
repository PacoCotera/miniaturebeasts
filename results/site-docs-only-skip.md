# Sandbox `build`: skipping a docs-only pull request (architect, 2026-10-21 23:36)

Read at main's .github/workflows/site.yml. This specifies the change the owner approved: the Sandbox `build` job skips its heavy steps on a pull request into main that changes only documents.

## 1. What counts as documents only

**"*.md plus design/" is not safe.** The build reads files in design/ and art/, and its tests check the paths that pages link to:
- prototypes/ui/tests reads design/proposals/ui-kit.md, design/style-guide/station-layouts.md and the SVGs in station-layouts/;
- the exploration tests and workbench tools read design/proposals/*.md, design/style-guide/companion-screens.md, art/companion-48/ and art/device-buttons/;
- .github/roadmap.test.mjs fails when a path that website/roadmap.json links to is gone, so renaming or deleting a document can break the build.

**Rule:** a pull request is docs-only when every path in its diff meets all three conditions:
1. it ends in `.md`;
2. it is not under `website/`, `prototypes/`, `.github/`, `ops/` or `v1/native/vendor/`;
3. the build does not read it.

**Condition 3 as a list, kept honest by a test.** A plain text search does not work. I checked main: `README.md` is named in 17 files under prototypes/, website/ and .github/; design/devices.md and design/proposals/species-names.md in 4 each. Nearly all of these are comments and links, so a text match would almost never skip.
- `.github/build-reads.txt`, one path or directory (ending `/`) a line: every file outside the build's own folders that the build reads. Seed it from the reads listed above, plus `art/companion-48/terrain/` and any others the test finds.
- A changed `.md` meets condition 3 when it is neither listed nor under a listed directory.
- **The test that keeps it honest:**
  - scan `prototypes/**/*.{mjs,js,html}` and `.github/*.mjs`;
  - blank the comments first, with the same blanker as prototypes/face/tools/guard.mjs;
  - collect each string literal that names a path under `design/`, `art/`, `hardware/` or the root;
  - fail when one is not covered by the list.
  
  A new read then fails CI until it is listed, so the list cannot fall behind.
- **Deletions and renames:**
  - a deleted path, or the old side of a rename, also fails condition 3 when `website/roadmap.json` links to it;
  - the scope step reads that file with `grep -F`.

**Details:**
- Take the diff with `git diff --name-status --no-renames HEAD^1 HEAD` on the pull request's merge commit (the job already checks out with `fetch-depth: 2`). `--no-renames` gives a rename as a delete plus an add, so the deleted side is checked.
- Any path that fails any condition runs the full build. The rule fails closed: an unlisted read is caught by the test, not by a skipped build.
- Pushes to main and workflow_dispatch runs never skip.
- With the owner's rule (never send docs alone), docs-only pull requests should be rare. This is a safety valve, not a routine path, which is why it is kept this small.

## 2. Not blocking merges: the lead's approach, confirmed

Keep the workflow triggered on every pull request, as now. Do not add a `paths` filter to `pull_request`. A filtered-out workflow never reports, and the required `build` check stays pending.

- Add a first step after checkout, `id: scope`, that applies §1 and sets `docs=true` or `docs=false`.
- When `docs=true`, it writes a line to `$GITHUB_STEP_SUMMARY` naming the changed files and saying the build was skipped.
- Every later step gets `if: steps.scope.outputs.docs != 'true'`. The three main-only steps keep their own condition, joined with `&&`.
- The job then ends green, under the same name `build`, so the required check passes.
- The scope logic is one script, `.github/docs-only.sh`, in plain shell and git, which takes the `--name-status` list on stdin. It needs no Node and no download, so a docs-only run takes seconds. A change to the script is under `.github/`, so it always runs the full build.

**Test** (the builder adds it to .github/roadmap.test.mjs or a sibling): run the scope logic, as a function of a file list, against these cases:

| Changed files | Expected |
| --- | --- |
| `README.md` alone | docs |
| a `.md` read by a test and missing from build-reads.txt | the honesty test fails |
| `design/proposals/ui-kit.md` | full build (a test reads it) |
| a `.md` in `design/style-guide/station-layouts/` | full build (a directory read) |
| `website/index.html`, or any `prototypes/` file | full build |
| an SVG in design/ | full build |
| a rename or delete of a document that website/roadmap.json links to | full build |
| an edit (not a rename) of design/devices.md, which roadmap.json links to | docs |

The test runs the same script the step runs, so the two cannot drift.

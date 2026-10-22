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
3. the build does not refer to it.

Condition 3 is checked mechanically, not kept as a list. A path counts as referred to when any file under `prototypes/`, `website/` or `.github/` contains, as text:
- the path itself, or
- one of its parent directories of three or more segments, followed by `/`. This catches directory reads such as `design/style-guide/station-layouts/`.

Shorter parents (`design/`, `design/proposals/`) are not matched, because comments name them everywhere.

**Details:**
- Take the diff with `git diff --name-only --no-renames HEAD^1 HEAD` on the pull request's merge commit (the job already checks out with `fetch-depth: 2`). `--no-renames` lists both the old and the new path of a rename, so condition 3 sees the deleted path too.
- Any path that fails any condition runs the full build.
- A false match, such as a comment that names a document, costs only a full run. The rule never skips a file the build reads.
- Pushes to main and workflow_dispatch runs never skip.

## 2. Not blocking merges: the lead's approach, confirmed

Keep the workflow triggered on every pull request, as now. Do not add a `paths` filter to `pull_request`. A filtered-out workflow never reports, and the required `build` check stays pending.

- Add a first step after checkout, `id: scope`, that applies §1 and sets `docs=true` or `docs=false`.
- When `docs=true`, it writes a line to `$GITHUB_STEP_SUMMARY` naming the changed files and saying the build was skipped.
- Every later step gets `if: steps.scope.outputs.docs != 'true'`. The three main-only steps keep their own condition, joined with `&&`.
- The job then ends green, under the same name `build`, so the required check passes.
- The scope logic is one script, `.github/docs-only.sh`, in plain shell and git, which takes the file list on stdin. It needs no Node and no download, so a docs-only run takes seconds. A change to the script is under `.github/`, so it always runs the full build.

**Test** (the builder adds it to .github/roadmap.test.mjs or a sibling): run the scope logic, as a function of a file list, against these cases:

| Changed files | Expected |
| --- | --- |
| `README.md` alone | docs |
| `design/proposals/ui-kit.md` | full build (a test reads it) |
| a `.md` in `design/style-guide/station-layouts/` | full build (a directory read) |
| `website/index.html`, or any `prototypes/` file | full build |
| an SVG in design/ | full build |
| a rename of a document that website/roadmap.json links to | full build |

The test runs the same script the step runs, so the two cannot drift.

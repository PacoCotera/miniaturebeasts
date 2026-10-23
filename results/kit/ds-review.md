# Docs-only skip code review (reviewer, 2026-10-23 16:05 Mexico City), head c8cb9651

Verdict: PASS. No blocking items. Base 2559ff4e, commits 78986c04 and c8cb9651, 4 files, all under .github/. Both commits: Paco Cotera <paco@cotera.org>, no trailers, no model/tool/session names.

## Blocking
None.

## Non-blocking notes
1. (architect, builder gap 1, confirmed) .github/roadmap.test.mjs:67 `code()` strips block comments first, then line comments (the guard.mjs blanker). A `/*` inside a `//` comment or a string (prototypes/ui/tests/specs.test.mjs line 2 `station-layouts/*.svg`) blanks real code after it, so the honesty scan can miss a read hidden after it. Today covered because station-layouts.md is hand-listed. Not an error in this change; the fix (a single-pass blanker that tracks strings) is the architect's call.
2. (architect) The scan only finds literals that contain a slash. A read assembled from segments, such as join(root, "design", "x.md"), is invisible. I grepped prototypes/ and .github/*.mjs for bare "design"/"art"/"hardware" segment literals and found none today. Python tools and .github/public-guard are not scanned (builder gap 4).
3. docs-only.sh:11-12,23,29: if build-reads.txt or website/roadmap.json were missing, the read fails quietly and the answer leans to docs=true (fail-open). Unreachable in practice: removing either file puts a .github/ or website/ path in the diff, which forces the full build. A one-line guard (`[ -r "$reads" ] && [ -r "$roadmap" ] || { echo docs=false; exit 0; }`) would make the fail-closed rule literal.
4. roadmap.test.mjs cases 7 and 8 name real links in website/roadmap.json (lvgl-switch.md, devices.md, ROADMAP.md, hardware/README.md, station-layouts.md). If the roadmap drops one of those, the test fails and needs a new example. That is acceptable but brittle.
5. roadmap.test.mjs last test (the 40 commits): for a commit judged "documents only" it accepts either answer, so it only proves the script never says docs=true for a list holding a non-.md or a listed file. It is a weak but honest check; it skips quietly in a shallow clone.
6. Builder gaps 2, 3, 5, 6 (list contents differ from the spec's seed; three listed entries are not reads; bare README.md literal rule; push path filter unchanged) are spec questions for the architect. I found nothing that makes any of them a correctness fault. Listed extras only cause more full builds (fail closed).

## What I checked
- docs-only.sh (POSIX sh): set -eu; IFS=tab read with path as the last field, so spaces in a path survive; git quotes paths with tabs or non-ASCII, which then fail the .md test and fail closed; case patterns quote $entry, so list entries are literal; grep -F with quoted strings, patterns start with a quote so no option confusion; `.md` test, five excluded prefixes, list/folder test, then delete-only roadmap link test (exact, #fragment, folder above). Empty, blank, garbled, CRLF and no-tab lines give docs=false.
- site.yml: job id build (no name key, unchanged); steps 2-19 all carry the condition (PyYAML shows 18 conditioned, 0 unconditioned after scope); the three main-only steps are "github.ref == 'refs/heads/main' && steps.scope.outputs.docs != 'true'"; scope runs only for pull_request, else docs=false; git failure, script failure and a missing list all fall to docs=false; summary lines written only for docs=true. Triggers unchanged: push (with its paths), pull_request on main, workflow_dispatch; push and dispatch never skip. The roadmap test runs inside the "Station rules and journey" step (line 124), so a docs-only run skips it, which is intended.
- Honesty test and eight-case test run the same script via execFileSync("sh", [script]); the planted-read test fails with the path and passes once the paths are listed, and checks comment blanking.
- My own scan for non-listed .md reads in prototypes/, .github/*.mjs, ops: only ui-kit.md, station-layouts.md and station-layouts/ (all listed) plus taxonomy.md (listed); place-masters.mjs README.md read is inside art/station-masters source folders but only in the place command, not the CI --check.

## Simulation on throwaway merge commits (scope step body run verbatim with GITHUB_EVENT_NAME, GITHUB_OUTPUT, GITHUB_STEP_SUMMARY)
docs PR (README.md + "dir with space/my note.md"): docs=true, summary lists both files
docs push: docs=false
dispatch: docs=false
mixed (README.md + design/y.txt): docs=false
rename of a linked document: docs=false
delete of a linked document: docs=false
non-ASCII path (quoted by git): docs=false
tab in path (quoted by git): docs=false
empty diff: docs=false
Direct stdin: delete of design/devices.md: docs=false; delete of design/proposals/lvgl-switch.md: docs=false; "M README.md" with a space instead of a tab: docs=false; CRLF line: docs=false; run from another directory: works.

## Check lines (verbatim)
node --test .github/roadmap.test.mjs: # tests 8 / # suites 0 / # pass 8 / # fail 0 / # cancelled 0 / # skipped 0 / # todo 0
PyYAML parse (python3 -I): jobs ['build'], 20 steps; step 1 id scope; steps 2-16 "steps.scope.outputs.docs != 'true'"; steps 17-19 "github.ref == 'refs/heads/main' && steps.scope.outputs.docs != 'true'"
node .github/public-guard/guard.mjs --base origin/station-gate: public guard ok
exit=0

Worktree rev-ds removed. Nothing in the clone was changed. The builders' clones were not touched.

# Face guard blanker code review (reviewer, 2026-10-23 19:08 Mexico City), head 313f892d

Verdict: FAIL on one point (a regression: dropped block comments glue tokens and hide code from the guard). Everything else PASS. Commit metadata ok: author and committer Paco Cotera <paco@cotera.org>, no trailers.

## Blocking
1. prototypes/face/tools/blank.mjs:27 (block comment emits nothing). The old guard replaced a block comment with spaces, so `var/**/canvas = document;` read as `var    canvas`. The new blanker gives `varcanvas`, and the \b in CANVAS (and the other rules' word boundaries) no longer matches. Proof, same tree (one file `var/**/canvas = document;`), old guard vs new guard:
   - old: `["station/src/x.mjs:1 uses the canvas: var    canvas = document;"]`
   - new: `[]`
   So the guard fails open again, by a new route, which is what T-284 exists to close. Same glue on `x = a/**/canvas`, ``a`/**/canvas`.
   Exact fix: in the block-comment branch, after the loop and the `i += 2`, emit one space when the output so far ends in a non-whitespace character and the next source character exists and is not whitespace; otherwise emit nothing. That keeps the world tests' `^import .* from '...';$` (a trailing comment is followed by a newline or EOF, so no space) and keeps newline preservation. Add a guard.test.mjs case: `var/**/canvas = document;` fails the guard. (Equivalent alternative: emit a space for every block comment and make the world.test.mjs regexes tolerate a trailing space; the first fix touches less.)

## Non-blocking notes
- Line comment (blank.mjs:26) drops a \r before the \n (CRLF): harmless, \n kept.
- Regex detection is the ruling's heuristic and misreads in these cases; each costs at most the rest of one line (quotes and regex end at a newline), checked:
  - `i++ / 2` and `b++ / 2 / 3`: after `+` a "/" starts a regex (the following "/" ends it); code stays visible.
  - `if (a) /x/.test(b)`: after \")\" it is a division; a quote inside such a regex would open a string to the end of the line.
  - `a / /x/`: "/" is not in REGEX_AFTER_CHAR, so the second "/" is a division.
  - `o.return / 2` (keyword after a dot) reads the "/" as a regex start.
  None of these loses a following line in my runs.
- Backslash-newline inside a quoted string ends the string at the newline (not a continuation). Same one-line bound.
- C mode: backslash-newline continuation of a // comment is not honoured (the next line is read as code, so a lv_*_create there is seen: fail-closed). An apostrophe in a preprocessor line (`#error don't`) ends at the newline. Fine.
- The tree-wide comparison also shows 5 files not in the ruling's table that now show more code lines: exploration/tests/care.test.mjs (2), exploration/tools/capture-48.mjs (1), workbench/tools/snapshot-v1-catalogue.mjs (1), face/tests/guard.test.mjs (22, its own fixtures); the first three are outside what the guard scans for rules 2-5 or have no hits (guard ok).
- Builder said the intents graph has 67 modules both ways, ds-gate said 80: not a defect of this build (ruling's figure was on the merge tree); the graph assertions pass.

## What I checked, adversarially (scratch scripts outside the repo, since removed with the worktree)
All 39 inputs keep the newline count (line numbers hold). Highlights, input -> output:
- escaped quote `a='x\\'//y';\nB;` -> unchanged, B visible; `'x\\\\'; /*c*/ B;` -> comment dropped, B visible.
- template with nested strings and templates, `t=\`a${ '}' + \`b${ "\`" }c\` }d\`; E;` -> unchanged, E visible (depth right).
- `//` inside a template (`http://x ${1} // y`) -> kept as text, next line seen.
- `'*/'; E; /* c */ F;` -> string kept, comment dropped, E and F visible.
- regex with quotes and a class holding "/" (`/[/]'/`, `/[\\]/]'/`) -> one regex each; `return /"/` -> regex; division after \")\" and after \"]\" not a regex.
- CRLF: line comment and block comment end correctly; \r\n inside a block comment keeps the \n.
- EOF: unterminated string, template with open ${, block comment, regex, lone "/", trailing backslash: all return without error, no infinite loop, output is the input minus comments.
- C: `"a\\\"/*"` string with escaped quote and /*, char '/', // with line continuation: next line seen.
- The guard's old and new scanned text over 314 files under prototypes (non-html), compared per line with whitespace normalised: 0 lines where the new text has less; 10 files where it has more (the hidden lines: station/src/main.mjs 97, ui/tests/specs.test.mjs 115, station/src/genome.mjs 23, face/tests/bridge.test.mjs 8, both build-scan.mjs 2 each, plus the 4 above); newline-count mismatches 0. Matches ds-gate §3's table (the .github guard is not under prototypes).
- intents.test.mjs and world.test.mjs: the diff changes only the blanking expression and one import; every assertion is textually untouched. Old test blanker vs blank(): identical on world.mjs, atlas.mjs, view.mjs; differs on station/src/genome.mjs and genome-stamp/src/stamp.mjs (old hid code there), both pass.

## Check lines (verbatim, head 313f892d, worktree rev-fg, FACE_BUILD_DIR rev-fg-build)
- `node --test guard.test.mjs intents.test.mjs world.test.mjs`: `# tests 151` `# pass 151` `# fail 0` `# cancelled 0` `# skipped 0`
- `node prototypes/face/tools/guard.mjs`: `guard: 75 removed paths, 319 files read, 0 failures` / `guard ok` (exit 0)
- face build (needed for dist/metrics.json): `layout: 753 cases, 0 differ`; `face_test: 15177 checks, 0 failed`; `native build 51.4 s   LVGL 9.6.0 1024x600 hash=47e09df8 dirty=0 keys=1 last=17`
- full `node --test` in groups (a single run exceeds 10 minutes):
  - prototypes/station: `# tests 580` `# pass 580` `# fail 0` (first run before the face build: 5 failures, all ENOENT dist/metrics.json)
  - prototypes/face: `# tests 595` `# pass 595` `# fail 0` `# skipped 0` (445 s)
  - exploration, ui, caddy, genome-stamp, workbench, .github, ops, v1/native: `# tests 453` `# pass 452` `# fail 0` `# skipped 1`
  - v1/prototype: `# tests 230` `# pass 218` `# fail 12`: 11 files fail with ERR_MODULE_NOT_FOUND (cbor2 x8, jsqr x1, qrcode x2): npm dependencies not installed in this environment, files untouched by this commit; the 12th is a subtest of those. Not caused by the change; I could not run them.
- `node .github/public-guard/guard.mjs --base origin/station-gate; echo exit=$?`: `public guard ok` / `exit=0`

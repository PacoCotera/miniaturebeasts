# Face guard gate (architect, 2026-10-23 20:12 Mexico City), 6fcc5e52

Branch build/face-guard: 313f892d + 6fcc5e52 (fix round) on 95f9762a. Ticket T-20261023-284. Spec: results/kit/ds-gate.md §3. Reviewer: results/kit/fg-review.md.

## 1. Verdict: PASS, merge

- The fix round closes the reviewer's blocker. blank.mjs:27 now emits one space after a block comment, but only when the output ends in non-whitespace and the next source character is non-whitespace. That is the reviewer's exact fix.
  - `var/**/canvas` reads as `var canvas`.
  - `a;/* c */\n` stays `a;\n`, so the world tests' `^import … ;$` still holds.
  - guard.test.mjs has both cases.
- Commit metadata: both commits have author and committer Paco Cotera <paco@cotera.org> and no trailers.
- I found one non-blocking limit of the §3 heuristic, set out in §3 below. It needs no fix round.

## 2. Against §3

| §3 item | As built | Result |
| --- | --- | --- |
| States: code, '…', "…", template with `${}` depth, regex literal with `[...]`, line comment, block comment | All seven. A template is a function, `tpl` is a stack of `${}` depths, and a `}` at depth 0 returns to the template's text. | PASS |
| Regex starts after an operator, an opening bracket, a comma, the start of the file, or a keyword | `REGEX_AFTER_CHAR` holds `(,=:[!&\|?{};+-*%<>~^`. `REGEX_AFTER_WORD` holds return, typeof, instanceof, in, of, new, delete, void, throw, case, do, else, yield and await. After `)`, `]`, a word, a number, a quote, a template or a regex, a `/` divides. | PASS. `}` and `;` go beyond the spec's list, which is reasonable. `/` is not on the list. |
| Quotes and regex end at a newline | Yes. Templates span lines, as JS allows. | PASS |
| Newlines kept | Yes, in comments too. | PASS |
| Rule 6 (C) uses the same function, without templates or regex | `blank(src, { js: false })`, and the old `//` strip per line is gone. | PASS |
| intents.test.mjs and world.test.mjs import the shared module | intents:13 and world:10 import `../../face/tools/blank.mjs`. All five old blanking expressions are replaced, and no assertion text changed. | PASS |
| The six tests | guard.test.mjs has all six: `// x /* y`, `"image/*"`, a regex holding quotes and `/*`, a template with `${}`, the planted canvas at main.mjs:41 (exactly 1 failure), and ok on the tree. It adds a C case, the glue case and the trailing-comment case. | PASS |

## 3. Adversarial inputs (mine, blank() output checked directly)

All 21 inputs keep the newline count.

- Correct:
  - division chains: `a / b / c`, `(a) / 2; // c`, `a[0] / 2`, `i++ / 2`;
  - a regex after return, typeof or `=`, holding `/*`, quotes or `[/]`;
  - nested templates ``a${`b${`c${ '}' }`}`}d``, and object braces inside `${}`;
  - `//` and `/*` in template text;
  - an escaped backtick;
  - glue after a string (`'a'/**/canvas` gives `'a' canvas`);
  - a multi-line comment between tokens, which leaves a newline;
  - EOF inside an open `${`.
- `*/` inside a string inside a block comment: `/* "*/" */ var canvas;` gives `" */ var canvas;`. This matches JS, where the comment ends at the first `*/` and the `"` opens a string. The text stays visible.
- **The limit (non-blocking):** §3's rule reads a `/` after `)` as division. So a regex right after `)` that holds `/*` opens a block comment that runs to the next `*/`, possibly lines later.
  - Example: `if (a) /x\/*/.test(b);\nvar canvas = 1;\n… /* end */` hides `var canvas`.
  - If the regex holds `//` instead, the rest of that one line is dropped.
  - So §3's sentence "a misread costs at most one line" holds for quotes, not for a comment opener inside a misread regex.
  - Exposure today: 0. On the merge tree, the acorn 8.18.0 token stream (type, value, line) of every source file equals the token stream of blank(source), for all 309 .mjs/.js/.cjs files under prototypes/ and .github/ (0 unparseable, 0 differing).
  - Every other misread only keeps more text visible (fail-closed), because blank keeps string and regex text as written.
  - Not a fix-round item. If it ever matters, the cheap hardening is the same acorn comparison as a test, but acorn is not a repo dependency, so I am not asking for it now.
- C, rule 6: for all 55 .c/.h files the rule reads on the merge tree, the newline count is kept. With whitespace removed, the output equals `gcc -fpreprocessed -dD -E -P` on the same files.

## 4. Merge cleanliness

- station-gate moved while this gate ran: from f951b979 (the brief) to 80068625 (K6, squashed onto f951b979).
- I measured both merges:
  - `git merge-tree --write-tree origin/station-gate 6fcc5e52` with f951b979 gives 762a588a, exit 0, no conflicts. No file overlaps.
  - With 80068625 it gives 7800f6e3, exit 0, no conflicts. A no-commit merge in my scratch worktree wrote the same tree.
  - The branch's five files and K6's 27 files do not overlap.
- Measured on the merged tree, extracted (7800f6e3, current station-gate):
  - `node prototypes/face/tools/guard.mjs`: `guard: 75 removed paths, 319 files read, 0 failures` / `guard ok` (exit 0). It gave the same on 762a588a.
  - face build, private FACE_BUILD_DIR, deleted after: `layout: 775 cases, 0 differ`; `face_test: 15223 checks, 0 failed`; `native build 70.4 s   LVGL 9.6.0 1024x600 hash=47e09df8 dirty=0 keys=1 last=17`.
  - `node --test guard.test.mjs intents.test.mjs world.test.mjs`: tests 153, pass 153, fail 0.
  - Full local `node --test`, run in groups:
    - prototypes/station: 588 tests, 588 pass, 0 fail.
    - prototypes/face: 598 tests, 598 pass, 0 fail, 0 skipped.
    - exploration, ui, caddy, genome-stamp, workbench, .github, ops and v1/native: 458 tests, 456 pass, 1 fail, 1 skipped. The one failure is roadmap.test.mjs "this repository's last commits": `fatal: not a git repository` (the extraction has no history). I ran that file with history on the uncommitted merge in my worktree, the same tree 7800f6e3: tests 8, pass 8, fail 0.
    - v1/prototype: 230 tests, 218 pass, 12 fail, all ERR_MODULE_NOT_FOUND (cbor2 ×8, jsqr ×1, qrcode ×2). npm dependencies are not installed here, and this branch does not touch those files. This matches the reviewer's run.
  - On 762a588a (f951b979), before station-gate moved: station 588/588, face 597/597, the other group 456/1 fail (the same no-history test)/1 skip, the three-file run 153/153.
- On the branch (6fcc5e52), my worktree: `node .github/public-guard/guard.mjs --base origin/station-gate; echo exit=$?` gives `public guard ok` / `exit=0`.

## 5. K7 lines that change

k6-gate.md §4's K7 base line is replaced by:

- `base: station-gate with K6 (80068625, the squash of build/ui-kit 8bf55670; face/src identical) and T-20261023-284 (build/face-guard 6fcc5e52, gated PASS 2026-10-23 20:12) merged; branch build/ui-kit (not build/face-guard, which is T-284's branch). merge-tree 80068625 6fcc5e52 is clean (tree 7800f6e3, exit 0). The ratchet's counts are taken on that merged tree and quoted per screen.`

Added under the blank.mjs line:

- `blank leaves one space where a block comment sat between two non-whitespace characters, so the guard and the ratchet match a call as \bNAME\s*\( (as rule 6 does), never NAME\(.`

The other K7 lines are unchanged. My count on 7800f6e3 through blank(src, { js: false }) matches k6-gate.md's:

- bench 3, cargo 12, create 11, habitat 13, home 14, home_builds 3, home_frame 18, incubator 5, library 4, moving 0, namer 4, panel 28, pods 0, screens 1 (116, and 116 without blanking).
- prim_node is called at the same five sites: cargo.c:307, cargo.c:320, home.c:550, home.c:619, panel.c:173.

## 6. Housekeeping

- Scratch worktree and extractions were under scratchpad/arch-fg. Both FACE_BUILD_DIRs (bake, bake2) were mine and are deleted. The worktree was removed and pruned.
- No other clone was written. `git merge-tree` added objects only, no refs.

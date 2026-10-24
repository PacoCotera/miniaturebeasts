# K7 review (2026-10-23 21:35 Mexico City), db7ac61b

Base a2db600e, branch build/kit-rules, T-20261023-287. Ruling: results/kit/k6-gate.md §4 "K7 must carry these lines".

## Verdict: one blocking item (rule 7a misses a #define alias, a pointer and a parenthesised name)

### B1. Rule 7a only catches `prim_node` written directly in front of its bracket
`PRIM_NODE = /\bprim_node\s*\(/g` in prototypes/face/tools/guard.mjs:42 only matches the name followed by spaces and then "(". I appended each of these to a copy of bench.c, put it in a tree with the real screens, vocab and ratchet, and the guard reported **0 failures** for all three:

```c
static void z(void) {
#define PN prim_node
  PN(v_id("x"), FN_RECT, 0,0,1,1,0,0,0);
}
```
```c
static void (*pn)(uint32_t,int,int,int,int,int,uint32_t,int,int) = prim_node;
static void z(void) { pn(v_id("x"), FN_RECT,0,0,1,1,0,0,0); }
```
```c
static void z(void) { (prim_node)(v_id("x"), FN_RECT,0,0,1,1,0,0,0); }
```

Fix: change one line in guard.mjs:42:

```js
const DIRECT = /\b(?:v_rect|v_text|v_sprite|v_sprite_window|v_sprite_hidden)\s*\(/g, PRIM_NODE = /\bprim_node\b/g;
```

After the fix, a screen may not name `prim_node` at all, so no alias, pointer or call through a macro can get past. I checked the fix in my scratch copy:
- The real tree still passes with 0 failures.
- guard.test.mjs passes 22 of 22.
- All three inputs above, the function-like macro and the multi-line call now fail.
- No screen at db7ac61b names `prim_node`, even inside a string, so nothing new is flagged.

Two follow-ups go with the fix:
- In the header comment, the sentence "a call is matched as NAME, any spaces, then (" should now cover rules 7b and the ratchet only.
- guard.test.mjs should plant the `#define PN prim_node` case and expect it to fail.

## Checked and correct
- **v_clip_box and v_snapshot.** `v_clip_box` builds exactly `prim_node(v_id(id), FN_CLIP, x, y, w, h, 0, count, 0)`. The four clip sites (cargo crates.clip with `sent`, cargo light.clip with 1, home glass.clip with `count`, home away.clip with 1) pass the same ids, boxes and counts as before.
  - `v_snapshot` returns 0 and draws no node when `prim_snapshot_handle() < 0`. Otherwise it draws `FN_SPRITE` with handle `s` at `w[0..3]`.
  - In panel.c, `prim_snapshot_handle` now runs after `v_region` instead of before. The handle call has no side effects, so the order does not matter.
  - The `prim_tag` that panel.c dropped repeated `v_region("panelSnapshot", LAYER_PAINTED)`'s own `prim_tag` with the same layer and region. `prim_tag` is idempotent, so removing it changes nothing.
- **specimen.c inline conversions.**
  - `si` becomes `v_si`, which is `spec_int` on the same "base.key" path.
  - `sa` was only ever called with a default of 0, so `v_sk` is the same.
  - `colour` becomes `v_scol` with the same 24-byte cap. `spec_str` clears the buffer when the path is missing, so a missing colour still gives "".
  - `srect` becomes `v_srect`. It matches the old code whenever the rect has 4 entries or is absent. Every rect path specimen.c reads in ui/specs/station/pods.json is length 4 (overview) or absent (chapter). All paths are well under the buffer sizes (v_fmt 160, v_spec_rect 96).
- **word_stampCase.** The body moved unchanged: `layer()`'s `has(asset)` is now `*a`, and `v_pstr` never returns NULL. It is now static in stamp.c, has left words.h, and kit_stamp is its only caller.
- **kit_stamp's new "sent" test**, `asset && *asset && size != 0 && wire_has_asset(asset)`. What changes for a stamp that is named but not sent, by caller:
  - **Habitat:** no change. It already passed `has(a) ? a : ""`, and habitat's `has()` already includes `wire_has_asset`.
  - **Pods:** no node changes. `plateAlone` is 1, so the plate stands either way. `clipH` is -1, so there is no clip. `v_sprite` on an unsent id emits nothing.
  - **Incubator:** the plate's slot now gets no size. It used to stand at full size.
  - **Create:** the plate gets no size and there is no clip. Before, the clip took a count of 1 but its stamp sprite drew nothing, so the case's front glass became the clip's child and was cut to `size x clipH`. The new test also fixes that old bug.
  - The hosts build `regions.stamp.asset` with `req({kind:"stamp"})`, which pictures.mjs `put`s, so the golden states send it. goldens --check matches on all 181 states (below). I did not run the journeys.
- **face_test additions** (named-but-unsent stamp, v_clip_box, v_snapshot without and with a snapshot): they pass. The unsent case would fail at a2db600e, so the test does detect the change.
- **Ratchet.** Recounted through `kitCounts` on the a2db600e screens, every screen matches kit-ratchet.json and the ruling's list (116 in total), and db7ac61b gives the same numbers. Counting every mention of the five drawing calls, not just calls, gives the same numbers, so no string literal or bare mention is counted.
  - The single screenSpecific entry, home_frame.c, exists.
- **Rule 7b.** 0 accessors on the base and on the head.
- **Rule 8.** It sees exactly the ten kit_* definitions the ruling lists, and all ten pass.
- **Commit.** Authored by Paco Cotera with no trailers. Its parent is a2db600e.

## Non-blocking
1. **The "ratchet" does not ratchet.** The guard fails only when a screen goes above its kit-ratchet.json number. Two things slip through:
   - Raising the number in kit-ratchet.json passes.
   - When a count drops and nobody updates the JSON, the slack can later be spent again.
   The station README says "the ratchet only goes down", which nothing enforces. Either fail on `c.direct < allowed` too, with a message to lower kit-ratchet.json, or reword the README. The guard as written matches the ruling ("fails on any increase").
2. **Other things rule 7b misses** (the ruling's definition is narrow):
   - These parameter forms: `char const *p`, `const char p[]`, `const char *const p`.
   - A cast before the call: `return (int)v_si(...)`.
   - Readers outside the list: `v_scol_or`, `v_sstr`, `v_token`.
   - Accessors that are not static.
   - `#define CS(p) v_si(S, p, 0)`.

   To cover the parameter forms, the pointer regex could be `/\bchar\s*(?:const\s*)?(?:\*\s*(?:const\s+)?(\w+)|(\w+)\s*\[\s*\])\s*$/`. Adding v_scol_or and v_sstr to `ACCESSOR_CALLS` would need a ruling line.
3. **The ratchet is textual.** A `#define RR v_rect` alias, like a static helper, lets any number of drawing calls count as 0 or 1. This is by design, but worth saying in the README.
4. **Files rules 7a and 7b never read:** screens/*.h (moving.h, screens.h; a `static inline` with `prim_node` in one passes) and any subdirectory of screens/. Both are within the ruling ("screens/*.c"). If .h files are added, keep them out of the ratchet, because moving.h would share the key "moving" with moving.c.
5. **Rule 8 is lenient:**
   - It misses an indented definition and one with `__attribute__` before its `{`.
   - It accepts a matching header anywhere earlier in the file, not just right before the definition.
   - It reads raw text, so a `"/* kit_x ( Props Region Node id Returns */"` string before the definition counts as the header.
6. **Small points:**
   - `kitCounts` is exported but nothing imports it.
   - The guard checks only that screenSpecific entries name an existing file, not that `what` and `ruling` are present. The test checks those fields on the real file only.
   - A kit-ratchet.json key for a screen that no longer exists is not flagged.

## What I ran
All runs were in a private worktree at db7ac61b (`rv-k7/wt` with FACE_BUILD_DIR and TMPDIR inside it). It was removed afterwards, and the clone is untouched (still build/ui-kit, clean).
- `node prototypes/face/tools/guard.mjs`: 0 failures, exit 0.
- `node --test prototypes/face/tests/guard.test.mjs`: 22 of 22 pass.
- A probe script that planted 30 inputs (rules 7a, 7b, the ratchet and 8, and possible false positives) into trees made from the real screens, vocab and ratchet. The results are listed above.
- A recount of the ratchet, prim_node and accessors on the a2db600e screens and on db7ac61b.
- The B1 fix, tried in my scratch copy and then reverted.
- `build.sh native`: face_test 15228 checks, 0 failed; layout 775 cases, 0 differ.
- `build.sh wasm`, then `goldens.mjs --check`: all 10 screens match (181 states).

Not run: node records, layer-check or checks.mjs on the journeys, the type log, the full `node --test`, and the public guard.

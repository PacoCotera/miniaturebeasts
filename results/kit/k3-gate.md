# K2.1 and K3 gate (architect, 2026-10-22 21:39 Mexico City), heads 9cd9e614 (K2.1) and 3168ca4d (K3), base cceb910e

- **K2.1: PASS.** cur_path as ruled; header says opts is never NULL and names the caps (64 targets, 16 resolves); namer and panel on screens_key_graph with `.cur_path = "overlay.focus.cur"`; panel.json graph and rule as ruled; key trace identical on 181 golden states; panel not parked.
- **K3: PASS, on one condition K3.1 proves.** v_line matches its header (pitch from frame.json type.pitch.<px>; unknown px refused with an error; returns the width, "" → 0); converted sites are identical arithmetic; face_test covers the alignments, 16 and 28 px cap placement and the refusal. Condition: for the 2 type-log shots that differ (energy figures), K3.1's result shows two base runs differ the same way, or pins that clock (as T-261 did) so all 44 shots compare identical.

## K3.1 (T-20261022-271), now, same branch, before K4
Add to vocab.h, each with a contract header:
```c
#define V_ANCHOR_LINE 0   /* y is the line box's top: cap top = y + v_fdiv(pitch - cap, 2), pitch = frame type.pitch.<px> */
#define V_ANCHOR_CAP  1   /* y is the cap top */
#define V_ANCHOR_BASE 2   /* y is the baseline: cap top = y - cap */
#define V_ANCHOR_MID  3   /* y is the cap's middle: cap top = y - v_fdiv(cap, 2) */
int v_cap_top(int y, int anchor, int px);
int v_line_at(const char *id, const char *s, int x, int y, int anchor, int px, const char *colour, int align);
int v_line_in(const char *id, const char *s, int bx, int bw, int y, int anchor, int px, const char *colour);
```
- v_cap_top: the one rule; only V_ANCHOR_LINE needs a pitch token (none → error, returns y); other anchors take any px via v_cap (e.g. cargo's 22 px); reads the frame spec only, no node.
- v_line_at: v_text at v_cap_top(y, anchor, px), existing align values, returns the width; `v_line(...)` becomes `v_line_at(..., V_ANCHOR_LINE, ...)`.
- v_line_in: centred in [bx, bx+bw): left = bx + v_half(bw - w); returns the width (the box form V_ALIGN_CENTRE cannot fold).
- MID uses floor (v_fdiv(cap, 2)), as cargo does. The idle line (screens.c:30) uses v_half(cap): same at 16 and 20 px, 1 px off at 28 (cap 21). A MID site at 28 px using v_half parks and is reported; no fifth form.
- No explicit-pitch variant. A site whose own spec gives a line pitch or box height: equal to type.pitch.<px> → V_ANCHOR_LINE (where the number is also the row step, keep reading it as the row step); different → park, and report site, px and both numbers for UI/UX (a spec question).
- create traitLine.text stays v_text (it carries the run's width); its y becomes v_cap_top(lineTop, V_ANCHOR_LINE, px).
- Goal: no cap_top() copy and no literal pitch (20, 28, 36) left in any screen or word.
- Scope: baseline (create code; panel verb, price, caption); middle (idle line; cargo waiting.more and amount); cap-top given (notBuilt; home_frame bar title and place line; home_builds nameTag text; frame.c title and line +2); own-spec pitch (create origin, namer field.name, panel strip, specimen.c, page.c, list.c, rail.c, ribbon.c); create traitLine.text; cap_top() removed from create.c, panel.c, specimen.c. Excluded: library.c (retired by Library ticket 2).
- Proof: K3's, plus the condition above.

# K3.1 gate (architect, 2026-10-23 00:02 Mexico City), 3ea36d1c
- **K3.1: PASS, and K3's condition is met** (the energy shots and pods-compare-four/six differ between two base runs; the after run matches base run 1 except pods-compare-four/six, which differ between every pair). Helpers as ruled (four anchors; LINE from type.pitch.<px>, refused when absent; MID floor; v_line_in left = bx + v_half(bw - w)); ~45 sites; cap_top() gone from create.c and panel.c. Judgement calls accepted: create traitLine.tag.word uses the line's lineTop (202); create code stays baseline-anchored with a hand centre (keeps the hidden empty code's x); idle line V_ANCHOR_MID at 16 px. v_line is gone (callers use v_line_at(…, V_ANCHOR_LINE, …)); the architect amends face-ui-kit.md §3.1; the Library map writes v_line_at(…, V_ANCHOR_LINE, …) wherever it wrote v_line. Cosmetic: frame.c's v_cap_top(y + 2, V_ANCHOR_CAP, px) is y + 2 (the slot rect's own offset); fine for now.
- **T-20261023-273 (follow-up):** checks.mjs pins its clock and its pod-genome seed (as T-261 did for the play journey) so the type log is identical run to run. Test tool only; may run alongside K4; must land before the next ticket whose proof is the type log.

## K3.2 (T-20261023-272), before K4, same branch (~1 h)
The parked boxes are art geometry (24 px plate, 40 px ribbon, 24 px tab, 16 px icon); text centred in its art's box is a kit rule, not a UI/UX spec question.
- Add to vocab.h with a contract header: `int v_cap_in(int top, int h, int px);` → `top + v_fdiv(h - v_cap(px), 2)` (any px, reads nothing, draws nothing). v_cap_top's LINE case becomes v_cap_in(y, pitch, px).
- Sites, each `v_line_at(…, v_cap_in(top, h, px), V_ANCHOR_CAP, …)` or v_run at that y: specimen.c name (h 24 at 20 px), captions (h 24 at 16 px), ribbon (h 40 at 20 px), then remove specimen.c's cap_top(); list.c place name (name.h); ribbon.c both lines (rect[3]); cargo.c band.words (isz); rail.c tab word (em1; it used v_half (ceiling), equal to floor when em1 - cap is even; park if node records differ).
- Exception: page.c heading word `(24 - v_cap(20) + 2) / 2` sits 1 px below its box's centre. Convert pixel-identically as `v_cap_in(ry + H1 + 1, 24, 20)` with a comment, and ask UI/UX: is the 1 px drop intended? Yes → the heading box's top moves into pods.json with the literal 24, 20, 32. No → a UI/UX ticket centres it and retakes the Pods chapter goldens (never a refactor).
- Proof: K3.1's (node records, type log under the run-to-run rule, face_test with a v_cap_in case, goldens, journeys, layer-check).

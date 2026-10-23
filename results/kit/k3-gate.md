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

# The type pass, build side (architect, 2026-10-24 17:05 Mexico City)

Read: results/T-20261024-type/type-spec.md (UI/UX, 16:59), case.md (copywriter), gd-rulings.md (game designer); origin/station-gate ffb1fd37: prim.c, vocab.h, frame.c, bake-fonts.sh, frame.json `type`, ui/specs/measure.mjs, views/words.mjs, state.mjs, checks.mjs, kit-ratchet.json. Read-only; nothing committed. Counts below are measured on ffb1fd37 (git grep over face/src/screens and face/src/vocab).

What exists today:
- `frame.json` `type` already holds `{ body 16, title 20, name 28, pitch {16:20, 20:28, 28:36}, weight {16:400, 20:500, 28:600} }`. Size and weight are one key (px).
- prim.c:69 `font_of(px)`: 16 → face_inter_16 (Regular), 20 → face_inter_20 (Medium), 28 → face_inter_28 (SemiBold). The FN_TEXT node's `a` argument is px (prim.c:311, :358, :376).
- Text calls that take px in screens/ and vocab/: v_line_at 48, v_line_in 7, v_run 19, v_price 3, v_text 16 (v_text is also in the ratchet's direct count). Measure-side calls that take px: v_measure 37, v_run_width 16, v_clip 12, v_wrap 7, v_cap_top 17, v_cap_in 13, v_cap 11.
- Specs: about 87 `px` keys across 13 station specs (frame 21, home 17, pods 10, library 6, cargo 6, sitting 5, habitat 5, …), plus the text `colour` keys beside them.
- Logic side: `S.cap` (state.mjs:59, the first character upper-cased, 16 call sites), `fill` (views/words.mjs:20), `createMeasure` (ui/specs/measure.mjs, keyed by `String(px)`).

## (1) Fonts: bake Inter Medium 16 — ruled yes (+23.2 KB flash, 0 RAM per font)

- **bake-fonts.sh**: the loop list becomes `"Regular 16" "Medium 16" "Medium 20" "SemiBold 28"`. The output name is `face_inter_<px><suffix>`. The three existing files keep their names, so they are byte-identical on a re-bake. The new file is `src/fonts/face_inter_16m.c`, `--lv-font-name face_inter_16m`. Same converter (lv_font_conv 1.5.3), 4 bpp, kerning, no compression, the same 352-glyph range. Both sed loops take the same list. The header comment reads "Regular 16, Medium 16, Medium 20, SemiBold 28".
- **CMakeLists.txt**: `face_fonts` gains `src/fonts/face_inter_16m.c`.
- **prim**: the font is named by (px, weight), not px. prim.h gains a font code table:

  | Code | Font | Code value |
  | --- | --- | --- |
  | `PRIM_FONT_R16` | face_inter_16 | **16** (unchanged) |
  | `PRIM_FONT_M16` | face_inter_16m | **1016** |
  | `PRIM_FONT_M20` | face_inter_20 | **20** (unchanged) |
  | `PRIM_FONT_SB28` | face_inter_28 | **28** (unchanged) |

  `font_of(code)` resolves these four and refuses any other code (prim.c:358 REFUSE, as now). The three existing fonts keep their present code (the px), so a text node at 16 Regular, 20 Medium or 28 SemiBold has the same `a` and the same node record. Only Medium 16 is new (1016 = 1000 + px). `prim_measure(code)` takes the same code.
- **Metrics**: face_metrics (the tool that writes face/dist/metrics.json) adds the key `"16m"`. ui/specs/measure.mjs takes a font key (`"16"`, `"16m"`, `"20"`, `"28"`); a bare number still means its px's default font, so callers that pass 16, 20 or 28 keep working. Regenerate face/tests/vectors/metrics.json with make-metrics-vectors.mjs (it gains the 16m cases).
- **Budget line** for technical-architecture.md (the device split): fonts in flash 116.2 → 139.4 KB. The draw buffer stays one glyph box, at most 784 B, shared. The Pi and the ESP32 face port carry the same four.
- **Not baked**: Regular 20, SemiBold 20, Medium 28, as UI/UX says. A fifth font needs a role that needs it, and its flash line.

## (2) The kit's text API keyed by role

**Where the role table lives: frame.json `type.roles`.** It is a spec token that UI/UX owns, beside the existing `type.pitch` and `type.weight`. It is not a kit header: the face reads every look from the spec, and a header would put UI/UX's numbers in C.

```json
"type": {
  "fonts": { "R16": [16, 400], "M16": [16, 500], "M20": [20, 500], "SB28": [28, 600] },
  "grounds": { "ground": "field", "libGround": "field", "stageGround": "field", "panel": "pane", "libPanel": "pane", "bar": "band", "libHead": "band", "painted": "painted" },
  "roles": {
    "heading": { "font": "M20", "pitch": 28, "colour": { "field": "bone", "pane": "bone", "band": "bone", "painted": "bone" } },
    "eyebrow": { "font": "M16", "pitch": 20, "after": 8, "colour": { "field": "fog", "pane": "fog", "band": "fog", "painted": "fog" }, "shadow": { "painted": "void" } },
    "quiet":   { "font": "R16", "pitch": 20, "colour": { "field": "mist", "pane": "fog", "band": "fog", "painted": "fog" }, "shadow": { "painted": "void" } },
    "figure":  { "font": "M16", "colour": { "field": "bone", "pane": "bone", "band": "bone" }, "variants": { "price": "focus", "short": "amber" } },
    "label":   { "font": "R16", "colour": { "field": "bone", "pane": "bone", "band": "bone" }, "variants": { "state": "mist", "open": "ink" } }
  }
}
```

The `roles` shown are examples. UI/UX fills all 16 roles from type-spec.md §1 exactly, including the painted shadow (void, +1, +1) and the Incubator's `code` → `ink` exception, as a variant. `type.body`, `type.title`, `type.name` and `type.weight` stay until the last screen is migrated, then go.

**A screen spec names a role, never px or a text colour.**
- A text key becomes `{ "role": "eyebrow" }`, with `"ground"` only where the text's ground is not its region's.
- A region declares its ground once: `"ground": "pane"`, or the palette name the `type.grounds` table maps.
- The ui spec test refuses a `px` key, or a text `colour` key, beside a `role`. After the pass it refuses any text `px` key at all.

**Face API (vocab.h, v_* helpers in vocab/vocab.c), replacing the px forms in screens:**
- `int v_say(const char *id, const char *s, int x, int y, int anchor, const char *role, const char *ground, int align)`: the role's font, its colour on `ground` (or `"<role>.<variant>"`), its painted shadow node when the ground is painted. Returns the width.
- `int v_say_in(id, s, bx, bw, y, anchor, role, ground)`.
- `v_run_t v_say_run(id, s, x, y, role, ground, align)` and `int v_say_price(id, s, x, y, role, ground, cols, other)`.
- `int v_role_width(s, role)`, `void v_role_clip(s, maxw, role, out, cap)`, `int v_role_wrap(s, maxw, role, buf, cap, max)`, `int v_role_cap_top(y, anchor, role)`, `int v_role_cap_in(top, h, role)`, `int v_role_pitch(role)`.
- A role is resolved once per spec load and cached by name, as kit_glint_level caches its clock. An unknown role, or a ground the role has no colour for, is refused with `v_error` and draws a node of no size, so no node goes missing.
- The px forms (v_line_at, v_line_in, v_run, v_price, v_text and the px measures) stay in vocab.c as the role forms' internals, and in vocab/common (frame.c, nameTag.c, ribbon.c, page.c, …) until each word moves. The words migrate with the screen that owns them: frame.c, nameTag.c and ribbon.c go in TY1.

**Migration and the ratchet.**
- kit-ratchet.json gains a second table, `"text"`: each screens/*.c file's count of px-form text calls (\bv_line_at(, \bv_line_in(, \bv_run(, \bv_price(, \bv_text(, \bv_measure(, \bv_run_width(, \bv_clip(, \bv_wrap(, \bv_cap_top(, \bv_cap_in(), counted the way guard.mjs counts the direct table.
- guard.mjs fails on any raise, as for `counts`. TY0 writes today's numbers.
- Each screen ticket lowers its file to **0** in its own commit.
- A new screen file (Library 6 and 7's, the Sitting's next) enters at **0**.
- Library 5's library_family.c enters at its measured count, because it was started before the API existed. It drops to 0 in the Library type ticket.
- When every screen is at 0, guard rule 7 gains "no px-form text call in screens/*.c" and the `"text"` table is removed.
- vocab/ is reviewed by grep, as K7's L3: no px literal in a v_say/v_line call.
- **Views.** A props builder that measures text uses `measureRole(metrics, frame, role)`, a new export of ui/specs/measure.mjs that resolves `type.roles.<role>.font` to the metrics key. Example: library-props.mjs's fitter measures the subject with role `subject`; a verb is measured at `verb` (M16). No view writes a px.

## (3) The case helper and the string lint

- **The helper's home is views/words.mjs**, beside `fill`: `export const capLine = (s) => …`, exactly the copywriter's rule (case.md §3):
  - capitalise the first letter after any leading run of spaces, glyphs and icons (✕ ⚡ ◆ ❀ ✓ "…");
  - leave the line untouched when its first such character is a digit;
  - never touch anything after the first letter.
  - It goes in words.mjs, not state.mjs, because words.mjs is already the one home for line-making (`fill`, `spell`, `plural`, `count`) under the kit rule ("props builders use words.mjs"), and the case of a drawn line is presentation, not state.
  - `S.cap` (state.mjs:59) stays for names: it is used on mibi and species names. It must not be used to case a line; the lint below catches lines.
- **Applied once, in two places:**
  1. **host.mjs `screenProps`**, on the frame's line, for every screen: `line.ok`, `line.subject` and `line.need` each go through `capLine` where the line object is assembled (`const line = { ...body.line }`). Home's own bar line gets the same call in home-props.mjs `lineOf`, once per zone: its two zones each take a capital (cw §3).
  2. **The builder that composes any other drawn line** (a notice, a caption, a plate message or a story line): `capLine(fill(template, values))` at the point it is set, never inside a table.
  - The Companion (prototypes/exploration/index.html) has its own `cap` in `lineCtx`/`drawLine`, because play/ and exploration import nothing from station/ (face-ui-kit.md §3.5, the Caddy rule).
- **The lint, two halves.**
  - **(a) Tables** (ui/tests/specs.test.mjs, new test): walk every station spec's `strings` subtree. Every string leaf must satisfy one of:
    - it starts (after leading spaces) with an upper-case letter, a digit or a non-letter glyph;
    - it starts with a placeholder from the capitalised set `{Name}`, `{name}`, `{Species}`, `{species}`, `{Chapter}`, `{Trait}`, `{A}`, `{B}`, `{pod}` (names the model already capitalises);
    - its key path matches the spec's own `strings.fragments` array (glob paths, for example `"watchHabits.*"`, `"stages.*"`, `"places.*"`, `"hatchPlace.*"`, `"states.*"`, `"keys.*"`). The copywriter writes each spec's list, and every entry carries a one-line reason.
    - Lowercase-led composed templates (`{a} …`, `{n in words} …`, `{count} …`) are not exempted in the table. They pass because they are listed in `strings.composed`, which names the templates `capLine` cases, so a composed template can never slip through as a plain lowercase line.
  - **(b) Outputs** (station tests): a shared assertion, `assertLineCase(body)` in tests/fixtures, is called in every props test that builds a screen (the 14 *-props.test.mjs files). It checks that `line.ok`, `line.subject`, `line.need` and every caption and notice string the props carry start with a capital, a digit or a glyph. That catches what (a) cannot: the mirrored literals in state.mjs (565–578, 819–822, 890–894, 938–940) and sitting.mjs (106–111, 140, 144–147, 175, 187) that the copywriter lists.
- **Carried line (not this pass):** those mirrored literals duplicate the spec tables ("the table wins", case.md). They should be read from the tables, not recased in two places: one ticket per file, after the pass.

## (4) Clearance checks that fail

- **One module, two callers.** The rules live in a new pure module, `ui/specs/clearance.mjs`: `departures(nodes, spec, frameSpec, inkOf) → [{ rule, node, other, measured, required }]`.
  - checks.mjs calls it on every journey point (rule 6, new).
  - face/tools/layer-check.mjs calls it on every golden state.
  - So a regression fails both CI paths. It measures from the face's node log, not from ink: deterministic, fast, and the same numbers on the Pi.
- **What the face logs, for it to read.** Each FN_TEXT node's entry in the face's log gains `{ role, ground, cap, base }`: its cap top and baseline rows (x and width are already logged).
  - A picture node's visible box comes from `inkOf(id)`: the alpha bounding box the host already computes for assets (assets.mjs RGBA, as moving.mjs footOf does), cached by id.
  - The ring node's box is its outer edge.
  - Hairline nodes are rules.
- **The rules, from type-spec.md §1b (Station column), each with its own id in the failure line:**

  | Rule | Check |
  | --- | --- |
  | T1 | text x ≥ 16 and x + w ≤ 1008; no text rows 0–8 or 592–599 |
  | T2 | text in the top bar has cap top = v_cap_in(0, 40, px) ± 1 (13 at 20, 14 at 16); text in the bottom line has cap top = 576 ± 1; icons in either at the bar's centre ± 1 |
  | T3 | a text's container is the smallest enclosing panel, bezel or plate node 48 px tall or more in the same region: cap top − top ≥ 12, bottom − base ≥ 12, ≥ 12 from each side |
  | T4 | the container is under 48 px tall: cap centred ± 1 (`v_cap_in`); ≥ 12 from each end, ≥ 8 for a node the spec marks `"band": "chip"` or `"key"` |
  | T5 | ≥ 8 from the picture a spec marks as the text's subject (`"labels": "<node id>"`); ≥ 16 from any other picture's ink box on the same rows |
  | T6 | ≥ 4 from the focus ring's outer edge |
  | T7 | ≥ 8 from a 1 px rule node |
  | T10 | ≥ 16 from another text node on the same rows, unless the two are one run (one v_say_run) |
  | T11 | no text node's box crosses a clip node's box or its container's edge; "…" only in a node whose role is `name` inside a slot the spec marks `"ellipsis": true` |

- **Exceptions are spec data, never code:** `frame.json type.clearance.exceptions: [{ node, rule, reason, by }]`, written only by UI/UX. The test prints each one in use. An exception nobody uses fails, so the list cannot rot.
- **Staging.**
  - TY0 lands the module with checks.mjs rule 6 in **report** mode: it prints the departures per screen and fails nothing. Today's count is expected at about the number type-spec.md §1b lists.
  - The screen tickets switch their own screen to **fail** mode: `frame.json type.clearance.enforced: ["frame", "home", …]`, one entry added per ticket.
  - When all are listed, the report mode is removed.
  - UI/UX's own scripts (ink.mjs, analyse2.py, check.py) stay UI/UX's tools for measuring art. The CI check is the node-based module, and it agrees with ink within ±1 px (§1b).

## (5) How to cut the build

Considered and rejected:
- **One ticket:** about 2 days of work, 197 goldens, one AD sign. It blocks every other face ticket for the whole time and conflicts with all three Library tickets.
- **One ticket per screen with the frame last:** every golden is retaken twice and signed twice.

Ruled: a neutral kit ticket, then the frame alone (with its retake made mechanically checkable), then one ticket per screen.

| Ticket | Scope | Goldens | Proof |
| --- | --- | --- | --- |
| **TY0 Kit for type** (about 5 h, golden-neutral) | (1) whole; (2) frame.json `type.fonts`, `grounds` and `roles` (UI/UX's values), v_say* and v_role_*, `measureRole`, the ratchet's `"text"` table at today's counts; (3) `capLine` in words.mjs (not applied), `assertLineCase` and the table lint in **report** mode; (4) clearance.mjs, the face log fields, rule 6 in **report** mode | none | goldens --check, every screen unchanged; node records 0 differ as sets (the three fonts keep their codes); type log identical; face_test with new checks (font codes, role resolve, refusal of an unknown role, v_say equal to v_line_at for every role whose font is R16, M20 or SB28); metrics vectors current with 16m; face and public guards; the report-mode counts printed (clearance departures per screen, lint misses per file) |
| **TY1 The frame** | frame.c, nameTag.c, ribbon.c, panel.c on roles: F1 top bar, F2 bottom line (cap 576, separators 400 and 624, need at 632), F3 panel, F4 tabs; frame.json strings recased (cw §2, 45); `capLine` applied in host.mjs; enforce `frame` | every framed golden: 165 (the 197 less Home's 32, whose bar is home_frame.c and goes with TY2), plus the journeys | a **mask proof**: tools/golden-mask.mjs shows that every retaken golden differs from its previous version only inside the bar rows 0–40 and 564–600, the panel's rect and the rail tabs' rects, and the tool prints the outliers (expected 0). The AD then signs the frame at 1× on one golden per framed screen (10), not 165. Also: tests, guards, clearance enforced for `frame`, lint enforced for frame.json |
| **TY2 to TY10, one per screen**: Home, Vivarium, Habitat (with the namer), Sitting, Pods, Create, Incubator, Cargo, bench | that screen's §3 list; its spec's strings (cw §2) with its `fragments` and `composed` lists; its builders apply `capLine`; its screens/*.c text count → 0; enforce that screen | that screen's own goldens only | mask proof (diffs only inside that screen's text regions and the boxes §3 moves); AD signs that screen at 1×; clearance and lint enforced for it; `assertLineCase` passes in its props tests; ratchet quoted (`text` 0 for the file) |
| **TY-L Library type** (in the Library line) | L1 cell names; L2 shelf eyebrows, the wish rows (if the game designer drops "Your wish"); the sheet's printed text moved into face nodes (library-sheet.mjs stops printing, the 12 and 14 px glyph tables retire, the sheetDigest drops the type inputs); library_species.c and library_family.c → 0 | library goldens only | as TY2; the sheet test proves no type pixels (sheet = form + surfaces only) |
| **TY-C Companion** (prototypes/exploration) | type-spec.md §4 change list, its `cap` | the Companion captures | its own captures signed at 1× |

**Order.**
1. **TY0 now, in parallel with Library 5.** It touches prim, vocab, the tools, frame.json `type`, kit-ratchet.json and the metrics vectors, and no screen file. The only overlaps with build/library-family are kit-ratchet.json (a union; Library 5's file enters the `text` table at its count) and metrics.json (regenerate).
2. **TY1 after Library 5 merges.** The frame retakes the library goldens, so Library 5's own goldens are retaken once, by TY1, and not by Library 5 a second time.
3. **Library 6 and 7 start after TY1** (or TY0 at the latest). Their screen file is born on v_say at text 0, and their goldens are taken on the new bars, so nothing is retaken twice.
4. **TY2–TY10 in any order after TY1, two at a time.** They touch disjoint files: each screen's .c, its spec, its props and its golden folder. The shared files are frame.json (strings only, TY1 does them all) and kit-ratchet.json (a one-line union).
5. **TY-L after Library 7**, or between Library 6 and 7 if the Library builder is idle. It owns library_species.c, library-sheet.mjs and library.json, which Library 6 and 7 also touch, so it does not run beside them.
6. **TY-C is independent**, on the Companion's own line.
7. **The last ticket to land removes the scaffolding:** the report modes, the `"text"` table, `type.body/title/name/weight`, and the px forms' public declarations (moved to vocab-internal.h). Guard rule 7 then gains "no px-form text call in screens". That is a one-hour closing ticket, TY-Z, golden-neutral.

**Questions this cut needs answered first (not mine):**
- **The owner** answers type-spec.md §5 q1 and q2 (Medium for eyebrows, figures and verbs; eyebrows not in capitals). TY0 can land without the answers, because the font is baked but unused. TY1 needs q1.
- **The art director** signs the role table on type-specimen.png before TY1. The mask proof makes the per-screen signature about content only.
- **The game designer** answers "Your wish" before TY-L.
- **The copywriter** supplies the fragments and composed lists per spec in TY0's report output, before that spec's ticket.

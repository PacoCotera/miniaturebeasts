# The face's UI kit: research, audit, kit, refactor plan, rule (architect, 2026-10-22)

The owner asked (23:35 and 23:37) for three things:
- reusable components, so builders stop re-implementing UI drawing screen by screen;
- a UI kit that makes the code tighter and cleaner;
- a survey of what already exists, so nothing is reinvented.

I read station-gate at cec6d6a1: prototypes/face/src, prototypes/station/src/views and prototypes/ui/specs/station. The research was checked on 2026-10-22; the links are below.

**In one paragraph:** The face already has the right architecture, and it matches the practice the research recommends:
- props flow down from pure builders (`views/*-props.mjs`);
- a closed primitive set (`prim/`) is the only code that creates LVGL objects;
- palette names act as tokens;
- reusable "words" (`vocab/`) are the components.

What failed is discipline, not design. Only Pods composes words; every other screen draws mostly with raw primitives, through about 14 private copies of the same helpers. The kit below is therefore mostly **promotion and merging** of code that exists. It adds one guard rule and a ratchet, so the drift cannot return. LVGL's own widget, theme and XML machinery is rejected for the face, with reasons; its component-contract idea is adopted.

## 1. Research: adopt, adapt or reject

| What | Verdict | Why, against our constraints |
| --- | --- | --- |
| **LVGL built-in widgets** (button, label, list, …) | **Reject for the face** | Each widget brings default flags and styles: scrollable, scroll-elastic, click-focusable, padding and scrollbar mode. Our primitives already strip these (`lv_obj_remove_style_all`, `lv_obj_set_scrollable(false)` in prim.c). Widgets would put geometry under LVGL's control, against the spec-rect contract and the golden hashes. The face uses only `lv_obj`, `lv_label` and `lv_image`, and should stay that way |
| **LVGL styles** (`lv_style_t`, shared vs local) | **Adapt, inside prim only** | Shared const styles are how LVGL means a look to be reused, and prim may use them. But transitions, opacity below 100%, shadows and radius are banned. Opacity forces a layer render and creates alpha. Transitions make a frame depend on time and break goldens. Shadows and radius make blended edge pixels, against palette-exact chrome. Words never touch styles; they pass palette names. [Styles](https://lvgl.io/docs/open/9.3/details/common-widget-features/styles/styles) |
| **LVGL themes** (`lv_theme`, the default theme) | **Reject; keep them compiled out** | The default theme adds, on every create, colour and transform transitions (one with a 70 ms delay), a button shadow at 50%, a scrollbar at 40%, a focus outline at 50%, a pressed recolour at 35% and a 3 px grow on press ([source](https://github.com/lvgl/lvgl/blob/master/src/themes/default/lv_theme_default.c)). Each one breaks no-alpha, the goldens or the dirty budget. lv_conf.h already sets `LV_USE_THEME_DEFAULT 0` (and SIMPLE and MONO 0); keep that, and keep the focus ring as our own word (fix 14). [Theme API](https://lvgl.io/docs/open/api/themes/lv_theme_h) |
| **LVGL flex and grid** | **Reject; keep them compiled out** (`LV_USE_FLEX 0`, `LV_USE_GRID 0`) | A layout pass re-places siblings when one changes and invalidates old and new areas, so one text change can cascade across a row and blow the 25% dirty budget. Our layout is integer rules in `layout/`, checked against a second JavaScript implementation on shared vectors. That is stricter, and it stays |
| **LVGL XML components and the LVGL Pro Editor** (`<component>`, `<api><prop>`, `<consts>`, `globals.xml`) | **Adapt the idea; reject the tool and the runtime** | The XML engine left the core in v9.5 and is now under a non-MIT LVGL licence ([announcement](https://lvgl.io/blog/announcement-lv_xml-removal-from-v9-5)). Our LVGL 9.6 has no in-tree XML runtime, runtime loading on a device needs a commercial licence, and the Editor's docs are pre-1.0 ([Pro docs](https://docs.pro.lvgl.io/xml/index.html), [syntax](https://lvgl.io/docs/pro/syntax/overview)). Its image props are file paths or C arrays, neither of which is our picture table. **What we adopt:** its component contract, a component declares typed props and nothing else, as the shape of each kit entry's header comment (§3) |
| **Custom widget classes** (`lv_obj_class_t`, `LV_EVENT_DRAW_MAIN`) | **Adopt only inside prim, if ever needed** | This is the right tool for a new leaf primitive that needs exact drawing, but `FN_COMPOSED` already covers that. Components never subclass |
| **Component as a function** | **Adopt; this is what our words are** | `word_x(id, rect, props…)` emits primitives in draw order. prim diffs the nodes by id and redraws only what changed, the props-down, update-what-changed pattern. LVGL's own guidance is a create function plus an update function. Our immediate-mode emit plus diff is the same contract with one entry point, and it keeps node order stable for the dirty budget |
| **SquareLine Studio** | **Reject, even as a reference** | Proprietary, and the Personal tier is non-commercial ([licences](https://docs.squareline.io/docs/introduction/licences)). The last release I found targets LVGL 9.2 ([v1.5.1](https://forum.squareline.io/t/v1-5-1-is-released/5629)). It generates global `ui_*` objects on the default theme |
| **EEZ Studio** | **Reference only** | GPL-3.0, with MIT flow output ([repo](https://github.com/eez-open/studio)). Its Flow runtime is an interpreter on the device, against props-down. Its widget property model is a fair checklist, nothing more |
| **Design tokens** ([DTCG format 2025.10](https://www.w3.org/community/reports/design-tokens/CG-FINAL-format-20251028/)) | **Adapt; no format migration** | Our tokens exist already: the palette names (prototypes/ui/palettes/station.json) and the numbers in the screen specs (prototypes/ui/specs/station/*.json), read by path. Converting to DTCG would add a build step and gain nothing. Keep the rules DTCG implies: opaque sRGB only, no alpha tokens, a word never takes a hex colour |
| **Atomic layering** (tokens → atoms → molecules → organisms → screens) | **Adopt as our five layers** | tokens = palette + spec; atoms = `prim/`; helpers = `vocab/vocab.c` (`v_*`); components = `vocab/common`, `vocab/station`; screens = `screens/*.c` binding tables. The layers exist; the audit shows the screens skipping the component layer |
| **Props-down / data-driven views** | **Keep** | `views/*-props.mjs` are pure state → props builders, and the face never reads the save. That is already the Elm/React shape |

**Breakage check:** every mechanism I adopt runs inside prim or as plain C over `v_*`. None scales at runtime, bypasses the picture table, adds alpha or transitions to chrome, or changes the node order that the dirty budget and goldens rely on.

## 2. Audit: where the screens repeat themselves

The screens are 3,387 lines; `pods.c` (71 lines, 11 word calls, no raw primitives) is the model. Every other screen draws mostly with raw `v_rect`, `v_text` and `v_sprite`. About 550–600 lines (about 15%) can go, plus about 60 in the props builders. Each finding below was read at the cited lines.

| # | Repeated logic | Sites (prototypes/face/src) | Existing helper not used |
| --- | --- | --- | --- |
| F1 | **Key dispatch:** the room-key ternary 14×; the direction ternary, graph parse, `focus_move`, redraw and say tail 8× | create.c:211-220, library.c:111-118, home.c:676-687, home_frame.c:237-246, namer.c:94-101, bench.c:187-196, habitat.c:331-342, cargo.c:400, incubator.c:204, panel.c:276, screens.c:166-207 | — |
| F2 | **Focus-target filling** (memset, id, group, enabled, index, box) in every `*_focus`; rings recompute the same boxes | home_frame.c:225, home.c:662, habitat.c:275, bench.c:155, library.c:90, create.c:166, pods.c:43, namer.c:85, panel.c:266; pods.c:23-35 duplicates :43-52; habitat.c:297-310 | library.c:99 does it right (rings from the focus table) |
| F3 | **Fill + 1 px edge drawn inline** | home.c:615, livingWindow.c:24 and :38, create.c:116, ribbon.c:56 | `word_panel` (frame.c:25) |
| F4 | **Rounded bezel + bevel and window frames** as inline `rrect`/`rcorners` ops | panel.c:154-157 vs home_frame.c:117-118 and :141-142; home_frame.c:133, cargo.c:78, panel.c:173 | `build_roundPanel` (home_builds.c:118) |
| F5 | **Composed-node boilerplate:** `composed_box` defined twice; inline 5× | cargo.c:42, panel.c:152; home_frame.c:110 and :135, create.c:122, namer.c:38, screens.c:133 | — |
| F6 | **Text by cap-top arithmetic,** in four hand-rolled forms; `cap_top()` twice; literal pitches 20, 28, 36; centring with `v_measure` + `v_half` about 16× | create.c:26, panel.c:48, home_frame.c:24-28, habitat.c:180-190, incubator.c:182, namer.c:39, cargo.c:155 and :189, screens.c:100-112 | `v_run` already aligns (centre, right), used 3× |
| F7 | **Picture or slot** (`if has v_sprite else v_sprite_hidden`) 29×, with 6 private wrappers that disagree on what "has" means | cargo.c:28 and :32, create.c:101-102, bench.c:42, habitat.c:170 (and 9 sites skipping it), library.c:39, home_builds.c:23 | — |
| F8 | **Private spec accessors** (`xi`/`xk`/`xrect`/`xcol`) redefined in about 14 files | incubator.c:24, create.c:21, cargo.c:23, home_frame.c:19, habitat.c:22, namer.c:18, library.c:18, bench.c:20, home_builds.c:15, panel.c:22, :36 and :193, livingWindow.c:15, leaves.c:12, frame.c:16 | — |
| F9 | **Stage: ground + room master** | bench.c:47, create.c:46, habitat.c:31; ground alone at incubator.c:111, cargo.c:38, library.c:34, home_frame.c:209, home.c:647, screens.c:16 | `word_bench` (list.c:19), hard-wired to Pods |
| F10 | **Stamp label** (plate, centred stamp, row clip) 4× | create.c:143-155, habitat.c:193-202, incubator.c:175-181, specimen.c:121-129 | `word_stamp`, Pods-only |
| F12 | **Name-tag width and clamp,** twice in one file and again in Cargo | home_builds.c:55-60 vs :73-78, cargo.c:374 | `layout_plate_width` (layout.c:102) |
| F13 | **Pitch loops written inline** | namer.c:22, habitat.c:251, home_frame.c:147-180, cargo.c:134, :272, :357 and :366, bench.c:114-146, panel.c:43 | `layout_list_pitch` |
| F14 | **Dither, level clock, hop lift, breath loop** | the dither guard at habitat.c:125 and :146, create.c:97; the cell window at home.c:478 and habitat.c:129; the Bayer ops at screens.c:124 and panel.c:52; the lift table at home.c:502, cargo.c:343, habitat.c:45, incubator.c:53; the loops at home.c:126 vs habitat.c:59, **which differ:** habitat lacks the one-tick minimum | — |
| F15 | **Capsule layer stack** (pod, glass, shell, door, bar) 5× | home_frame.c:163-174, create.c:185-202, panel.c:176-228; the bar window at incubator.c:97 and panel.c:196 | — |
| F16 | **Pod box and shadow** | create.c:39-60 vs pods.c:16 and specimen.c:54 | `word_pod_size` |

**Never called:** `word_leaves`, `word_leavesArc`, `word_hairline`. **Pods-only:** `word_bench`, `word_stamp`, `word_list`, `word_page`, `word_kin`. These were written as components and then bypassed.

**The props builders** (prototypes/station/src/views):
- `fill()` is defined 14×, in three regex forms. The `\w` form forces cargo-props:109 to replace `{n in words}` by hand.
- The number-word tables (`SPELL`, `SPELL1`, `COUNT`) are defined 6× with different lengths: bench-props:11, cargo-props:13 and :106, create-props:17, panel-props:15, home-props:17-18.
- The one/else plural rule is hand-written 7×.
- The `slot`, `ph` and `req` request helpers are redefined in 10 files, though pods-props exports `slot`.
- vivarium-props:27 and habitat-props:92 hard-code the tile widths `152 : 72`, which belong to vivarium.json's `tiles.forms`.

## 3. The kit

**Layers and homes:**
- **Tokens:** palette names and spec numbers. No change.
- **prim:** no change. Still the only place an LVGL object is made.
- **Helpers** (`vocab/vocab.c`, `v_*`): small, stateless functions over prim and the spec.
- **Components** live in `vocab/common/` when two or more screens use them (or a named next screen does), and in `vocab/station/` when they are Station-specific. One C file each, declared in `vocab/words.h`, under the name `kit_*`. Existing `word_*` names are kept until each one is touched.
- **The screen-composition file `screens/home_builds.c` goes away.** Its builds become components.

**The contract of a component** (the XML component idea, written in C): a header comment declares
- its props: the arguments, plus any props or spec paths it reads, each with its type;
- its region and layer;
- its node ids (`<id>.<part>`), stable in number and order, so showing a part later never adds a node;
- what it returns (its drawn box, for focus).

A component never reads the save or another screen's spec, decides no content, and takes colours by palette name only.

### 3.1 Helpers (new `v_*`)

| Helper | Replaces |
| --- | --- |
| `v_si(spec, path, d)`, `v_sk(spec, path, k)`, `v_srect(spec, path, r)`, `v_scol(spec, path)` | F8's 14 private sets |
| `v_composed(id, x, y, w, h, ops)` | F5 |
| `v_slot(id, asset, fallback, x, y, w, h, shown)`: a picture, else the same node with no size; "has" means the host has sent it, one definition | F7's 29 sites |
| `v_line(id, s, x, lineTop, px, colour, align)` → width: the cap-top rule and the alignment, with the pitch read from a frame token `type.pitch.{16,20,28}` instead of literals | F6, and the code-line copies at create.c:156, incubator.c:182, habitat.c:188 |
| `v_cap_top(y, anchor, px)`, `v_line_at(id, s, x, y, anchor, px, colour, align)`, `v_line_in(id, s, bx, bw, y, anchor, px, colour)` (amended at K3.1: `v_line` is gone; callers write `v_line_at(…, V_ANCHOR_LINE, …)`; anchors LINE, CAP, BASE, MID) | the cap-top arithmetic at ~45 sites |
| `v_cap_in(top, h, px)` → `top + v_fdiv(h - v_cap(px), 2)` (amended at K3.2): the one rule for text centred in its art's box (a plate, a ribbon, a tab, an icon), given to `v_line_at`/`v_line_in` with `V_ANCHOR_CAP` | specimen.c `cap_top()`, the box-centring sites in list, ribbon, cargo, rail, page |
| `v_anim_level(anim, ms)`, `v_lift_at(spec, path, ms)`, `v_loop_cell(spec, path, ms, minTick)`, `v_bayer_ops(...)` | F14. The `minTick` argument keeps habitat's present behaviour, so the change stays golden-neutral. Whether habitat should gain the one-tick minimum goes to UI/UX, not into the refactor |
| `screens_key_graph(spec, graphPath, focusFn, defaultCur, opts)` and `focus_fill(t, path, i, box)` in `screens/screens.c` | F1, F2. Options: no back key (home_frame), focus.resolve, roomAt, steps on or off |

### 3.2 Components

| Component | Props (and spec it reads) | Home | Absorbs | Used by now, and next |
| --- | --- | --- | --- | --- |
| `kit_panel` | id, rect, fill, edge or NULL, slot flag | common | `word_panel` + F3 | all screens; Library, Sitting |
| `kit_bezel` | id, rect, radius, fill, edge, bevel colour or NULL | common | `build_roundPanel`, panel.c `build_bezel`, the bevel rects (F4) | Home, Incubate panel; Library levels, Sitting |
| `kit_windowFrame` | id, rect, radius, ground colour, edge | common | the `rcorners` + `rrect` frames (F4) | Cargo, panel; Library window |
| `kit_hairline` | id, x, y, len, colour, vertical | common | `word_hairline` (finally used) + the 1 px rules | Home, frame; Library rules |
| `kit_stage` | spec, rect path, ground colour, room master id or NULL | common | `word_bench` generalized (F9) | Pods, bench, create, habitat, incubator, cargo, library, home |
| `kit_nameTag` | spec, window region, name, anchor box, y rule {below, over, auto} | common | both `build_nameTag`s; width by `layout_plate_width` (F12) | Home, habitat, Cargo's dock ribbon; Sitting |
| `kit_tiles` | spec, list path, n, per-tile callback (draw at box i) → boxes | common | the inline pitch loops, through `layout_list_pitch` (F13). Where a list has no `forms` yet, the spec gains one with the same numbers | namer, habitat, home_frame, cargo, bench, panel; Library grids, Sitting cards |
| `kit_ribbon` | as now | common | ribbon.c, with its hand-built empty state replaced by `kit_panel`'s slot | Cargo, habitat, incubator |
| `kit_focusRing*` | as now | common | `word_focusRing`, Footprint, Figure; rings drawn from the focus table (F2) | all |
| `kit_module`, `kit_lamp` | as `build_module` and `lamp` | station | home_builds.c | Home, bench, habitat |
| `kit_stamp` | spec, base path, genome stamp id, label | station | `word_stamp` + the 3 copies (F10) | Pods, create, habitat, incubator |
| `kit_capsule` | spec, rect, layers {pod, glass, shell, door, bar} with each picture id or NULL, door level | station | F15's 5 stacks and the bar window | home_frame, create, panel, incubator |
| `kit_pod` | spec, class, picture, shadow on/off → box | station | `word_pod_size` + F16 | Pods, create |
| `word_page`, `word_rail`, `word_list`, `word_kin`, `word_specimen`, `word_livingWindow` | unchanged | station | — | Pods, create; **the Library levels** (page, rail) |
| `word_leaves`, `word_leavesArc` | unchanged | station | — | **Wired in or deleted** by K6. If Home and the Incubator draw leaves another way, the dead words go |

### 3.3 What stays screen-specific

- **The binding table:** which component draws which region, in what order, for which state.
- **State machines and timelines:** Cargo's travel, the hatch, the namer's typing, Home's walk scheduler.
- **The focus graphs:** in the spec, as now.
- **A composition used by exactly one screen** with no named next user, such as Cargo's find strip or the Probe bench's dials. It stays a static function in its screen until a second user appears; then it moves (§5, rule 2).

### 3.4 The props side

- New `views/words.mjs`: `fill(template, values)` in one regex form that accepts `{name}` and `{n in words}`; `spell(n)` (one table, 0–12, digits beyond); `plural(n, one, many)`; `count(n)` ("a", "two", …).
- New `views/requests.mjs`: `slot`, `ph`, `req`, `plateDevice(w, h)`.
- Tile sizes and rects are read from the spec (`tiles.forms`), never written in a builder.

### 3.5 The next screens

- **The Library, levels 1–3:** `kit_bezel`, `kit_windowFrame`, `kit_tiles`, `kit_hairline`, `v_line`, `word_page`, `word_rail` and the focus ring, plus the specimen picture as an ordinary `v_sprite` from the picture table (H4). Nothing new is expected. I have found no written spec for levels 1–3; the Library's level spec should name its regions by these components.
- **The Sitting:** `kit_stage`, `kit_tiles` (the cards), `kit_panel` and `kit_bezel`, `kit_nameTag`, `v_line`.
- **The Caddy:** **not a face screen.** Its 792 × 272 e-paper is the play page's own painter (prototypes/play/src/caddy.mjs, four grays, canvas), and play/ imports nothing from station/. The face kit does not apply. The only shared need is number words. caddy.mjs keeps its own five-line table, because importing across that boundary would break it.

## 4. The refactor plan

Each ticket takes about 4 hours.

**Every ticket is golden-neutral:**
- `node prototypes/face/tools/goldens.mjs --check` passes unchanged;
- the station and play journeys pass with no golden rewritten;
- `layer-check.mjs` and `checks.mjs` print the same figures (objects, pictures, dirty area);
- the node-id lists in the face's logs are equal before and after.

A ticket that cannot stay neutral parks and reports; it never retakes a golden.

| Ticket | Scope | Proof beyond goldens |
| --- | --- | --- |
| **K1 Helpers** | `v_si`/`v_sk`/`v_srect`/`v_scol`, `v_composed`, `v_slot`; replace F5, F7 and F8 in every screen and word | The node-id log is identical on every golden scene |
| **K2 Keys and focus** | `screens_key_graph`, `focus_fill`; replace F1 and F2; rings read the focus table (pods.c, habitat.c) | `face_test`'s key vectors and the journeys' key paths unchanged |
| **K3 Lines** | `v_line`; frame tokens `type.pitch.*`; replace F6 and the code-line copies | `checks.mjs` type log (every string, px, region) unchanged |
| **K4 Panels and bezels** | `kit_panel`, `kit_bezel`, `kit_windowFrame`, `kit_hairline`; move `build_roundPanel` out of home_builds.c; replace F3 and F4 | Composed-picture hashes unchanged (the same ops strings) |
| **K5 Tiles and the name tag** | `kit_tiles`, `kit_nameTag`; spec `forms` added where the numbers already exist (spec-only, same values); replace F12 and F13; props builders read tile sizes from the spec | `layout.test.mjs` vectors extended to the new forms, matching both implementations |
| **K6 Stage, stamp, pod; dead words** | `kit_stage`, `kit_stamp`, `kit_pod`; replace F9, F10 and F16; wire in or delete `word_leaves`, `word_leavesArc` | — |
| **K7 Kit guard and ratchet** | guard rule 7: no `prim_node` call and no static spec accessor in `screens/*.c`. `prototypes/face/kit-ratchet.json`: each screen's count of direct `v_rect`/`v_text`/`v_sprite`/`v_sprite_window`/`v_sprite_hidden` calls, which a test fails on any increase | The guard test, with one planted violation per rule |
| **K8 Motion helpers** | `v_anim_level`, `v_lift_at`, `v_loop_cell(minTick)`, `v_bayer_ops`; replace F14 (the Bayer table also once in prim.c) | Home's and habitat's moving goldens; the M1 tick vectors |
| **K9 Capsule** | `kit_capsule`; replace F15 | Incubate and hatch-now panel goldens, the Incubator and Create |
| **K10 Props words** | `views/words.mjs`, `views/requests.mjs`; replace the props-side duplicates | Every props snapshot test byte-equal; the journeys |

**Order:** K1 → K2 → K3 → K4 → K5 → K7 is the **Library path**. After K7, the Library levels are built on the kit, under the guard and ratchet. K6, K8, K9 and K10 follow, in parallel with the Library where they touch different files: K6 and K9 do not touch library.c. K1–K3 touch every screen, so they run one at a time and do not overlap any other face work.

**H4's fix round goes ahead on the current code.** It touches the logic side (specimen-cache, specimen-props, home-props) and Home's tests, not `face/src/screens`, so it does not collide with K1. If H4 does reach home.c, it lands before K1 starts.

## 5. The rule, for the builder and reviewer contracts

1. **A screen is a binding table.** `screens/*.c` may only:
   - read props and its own spec;
   - call kit components (`kit_*`, `word_*`) and `v_*` helpers;
   - hold its own state machine and timeline.

   It may not call `prim_node`, define its own spec accessors, write key dispatch or focus filling, or redraw a look a kit component draws. The guard enforces the mechanical part (K7).
2. **A new drawing pattern goes into the kit first.**
   - If a builder needs a look that no component draws, or a component's props contract must change, the builder parks the drawing with a one-paragraph proposal. The architect rules it on work-queue: a new component, an extension, or "screen-specific".
   - A look written in a second screen must become a component before that second screen merges.
3. **The ratchet only goes down.**
   - `kit-ratchet.json` holds each screen's direct-primitive count, and a raise fails CI.
   - A new screen's ticket states its budget, which is 0 by default; a screen that needs raw primitives says why in the ticket.
4. **Kit changes are golden-neutral by themselves.**
   - A change to a component that moves pixels ships only with the ticket that wants the new look, with the goldens it retakes named in the result.
   - A refactor ticket never retakes a golden.
5. **Props builders use `views/words.mjs` and `views/requests.mjs`.**
   - Never a local `fill`, number table, plural rule or request helper.
   - Never a rect the spec holds.
6. **Reviewers check, on every face or props diff:**
   - the guard and ratchet are green;
   - no new private helper duplicates a `v_*` or a kit component;
   - every new component has its contract header (props, region and layer, node ids, return);
   - a new pattern has the architect's ruling linked.

# The LVGL switch: development spec

This is the build specification of the Station's face, for the builders of the face and of the Station's screens, and for their reviewers. The Station's screens are drawn by an LVGL 9 face in C: compiled to WebAssembly in the sandbox, and native on the Raspberry Pi under S1, with the logic run headless by Node beside it ([technical-architecture.md §4.3](technical-architecture.md#43-the-stations-runtime-within-the-pi-4)). The face is the sandbox's only Station face: the JavaScript drawing layer is deleted (§5.2) and an import guard keeps it out (§5.1), a screen not yet on the face shows "not built yet" (§2.2), and every screen, the field guide among them, is built on LVGL. Rules, views, specs and assets stay in JavaScript and data. The structure the face belongs to, its layers and the conformance checklist are [technical-architecture.md](technical-architecture.md); this document holds the face itself.

## 0. Summary

- **What the face is.** A face that takes *props* and gives back *intents*. The vocabulary's words, the layout rules, text fitting, the focus graph and animation are C. The views, rules, intent tables, spec files and assets are JavaScript and data. The same wire format runs in the page (WebAssembly) and over a local socket on the Pi (§2).
- **The plan.** L2.0 builds the platform, puts Pods on C words, and in its build B4a removes the JavaScript Station face. Then the overview of every section, in order: Home, Cargo and Idle; Create and the Incubator; the Vivarium, whole and up close, with the namer; the Library spread; the Probe bench. Then the deeper levels: Cross with the splice, the Book and the field guide, the Sitting, and the Vivarium's remaining states. L3 closes out the switch. Each slot is gated by region checks against the spec, by goldens held in CI, and by the journey running green on the face (§3, §4).
- **The default face.** The sandbox boots the LVGL face, with no flag. A screen with no binding table on the face draws "not built yet" inside the frame, and its navigation works (§2.2). A screen draws itself from the change that passes its gate.
- **The import guard.** A CI check fails when a removed path exists again or is imported, when canvas drawing appears in the Station's JavaScript, or when an LVGL object is created outside the face's primitives (§5).
- **What is built.** The face's source files, and what each one does, are listed in its README (`prototypes/face/README.md`).

## 1. What the face takes over from the JavaScript layer

The page draws every screen through the face; `prototypes/station/src/main.mjs` is the host. A screen with a binding table in `prototypes/face/src/screens/` draws from its view's props; every other screen sends the state `notBuilt` and draws the `notBuilt` composition (§2.2). The JavaScript drawing layer (a retained scene through a layered canvas renderer, and `legacy` screens drawn through the drawing half of `gfx.mjs`) is deleted; its paths, and what stays, are §5.2.

What the face takes over, and why the plan has the shape it has:

1. **The vocabulary moves into C.** The Companion and the Caddy need the words in C (technical-architecture.md §4.2 and §4.3), so no screen gains words in JavaScript.
2. **Views become pure props.** Each screen's view is written as props when the screen comes to the face, with no geometry and no scene nodes (§2.1).
3. **No synchronous measure.** A synchronous `measure` cannot cross the Pi's process boundary (S1: Node and the face are two processes). Text fitting is the face's job, and views that choose words by width use a metrics table that equals LVGL's (§2.5).
4. **Fine line work is one picture.** The splice's wires and the guide's dashes cannot be one object a pixel run: in the JavaScript layer, S09's Cross chapter view with every chapter read is **1,772 nodes**, 1,765 of them rects of 4 px² or less, and the guide spread 247 nodes (S09: 182 rects, 39 texts, 6 sprites) plus 20 masters. The word draws such work into a picture of its own (§2.2).
5. **Every check reads the face.** Journey, palette, type and regions are measured from the face's logs and framebuffer (§2.8).

## 2. Target architecture of the face

```
  keys (sandbox: page; Pi: evdev) ──▶ FACE: input ─▶ focus graph ─▶ intent ──────────────┐
                                                                                         ▼
  spec files (data) ──▶ FACE: spec loader ─▶ screen tree (regions → components)     JS: intent table ─▶ rules (pure) ─▶ state + events
                                         ▲                                                                                 │
                         props ──────────┘◀── JS: view(state, focus) → props ◀──────────────────────────────────────────────┘
                         events ─▶ FACE: animation      assets: manifest + pixels (JS) ─▶ FACE: picture table / image cache
                                         │
                       FACE: primitives (rect, text, sprite, nine-slice, clip) ─▶ LVGL objects ─▶ framebuffer ─▶ canvas | DRM
```

The rule of the split: **JavaScript decides what each region shows. C decides where it goes, how it looks, how focus moves, and how it animates.** Nothing on the C side reads the save or calls a rule. Nothing on the JavaScript side computes a pixel position.

### 2.1 The bridge contract: props in, intents out

**One wire format, two transports.** Messages are UTF-8 JSON objects. In the sandbox they cross the WebAssembly boundary through one shared buffer the face owns: the host writes a message into `face_in_buf()` (at most `face_in_cap()` bytes, 512 KiB, room for the largest spec file) and calls `face_send(len)`, which returns 0 when the message is accepted and -1 when it is refused, with an `error` queued; messages out are read with `face_poll()` until it returns nothing. On the Pi they travel as newline-delimited JSON over a Unix socket, `/run/mibi/face.sock`. The sandbox therefore exercises the exact bytes the Pi will carry. Nothing on the frame path waits for an answer.

Messages from JavaScript to the face:

| Message | Shape | When |
| --- | --- | --- |
| `hello` | `{ t: "hello", contract: 1, test? }` | At connect. The face answers `ready`, or `error` if the contract differs. `test: true` turns on test mode: the `log` messages and the palette passes (§2.8). Absent or `false`, test mode is off. Any message before an accepted `hello` is refused |
| `palette` | `{ t, name: "station", colours: [[name, "#rrggbb"], …] }` | Boot (from `ui/palettes/station.json`) |
| `spec` | `{ t, screen, json }` for `frame` and each screen file | Boot, and again on edit in the sandbox (no compile) |
| `asset` | `{ t, id, w, h, policy, status, slice?, tile?, src: "heap" \| "file", path? }` | Before first use. Pixels go into a buffer the face allocates for that id (WebAssembly) or into an LVGL binary file in the image cache (Pi). The face refuses a size other than `w × h` |
| `asset` (drop) | `{ t, id, drop: true }` | When the host retires a picture, for example its least recently used one. The face frees that id's slot in the picture table; an id it does not hold is ignored |
| `props` | `{ t, seq, screen, state, idle, motion, frame: { top, line, plate }, regions: { <region id>: {…} }, focus: { targets, resolve, edges?, armed?, set? } }` | Whenever the view's output changes (hashed on the JavaScript side). The whole screen is sent, and the face diffs by region |
| `event` | `{ t, kind, target, ms, hold, cut?, from?, to? }` | When the timeline plays one (§2.7). `hold`: ms of held input from the event's start, an integer 0–30000, 0 = none, independent of `ms` (less: input returns while it plays; more: held through the screen change that follows); a boolean is refused. `cut: true`: after the hold, the next key the face acts on ends the event and the face says `done`; the key then acts. `from`/`to`: the event's start and end values |
| `key` | `{ t, k }` | Sandbox only: the page's buttons and keyboard. On the Pi the face reads its own keys |

Messages from the face to JavaScript:

| Message | Shape | Meaning |
| --- | --- | --- |
| `ready` | `{ t, contract, size: [1024, 600], fonts: ["inter-16", …], limits: { objects, pictures, text, props }, test }` | The face is up. `limits.props` is the largest `props` message in bytes (32,768, the budget of §2.8; a larger one is refused). `test` echoes whether test mode is on |
| `focus` | `{ t, seq, screen, target }` | The ring moved. JavaScript stores it as `UI.<screen>.focus.cur` and recomputes props: the bottom line's subject and the page shown follow focus |
| `intent` | `{ t, seq, screen, target, verb }` | `verb` is `confirm`, `back`, `room:<home\|research\|library\|habitat>`, `wake`, or `step:<up\|down\|left\|right>` where the spec marks a group as a stepper (Create's ▲▼ roll, Cross's ◀▶ partner, Compare's ◀▶ chapters) |
| `done` | `{ t, kind, target }` | An animation finished on the face. Informative only: holds are released on the JavaScript timeline's own clock |
| `log` | `{ t, regions, type, refused, objects, pictures, frameMs }` | Test mode only (§2.7) |
| `error` | `{ t, what }` | A refused spec, props or asset. Counted in CI as a failure |

The contract number is 1. The sandbox's transport is `face_send(len)` over the face's own `face_in_buf`, so the host never allocates in the face's heap.

**The intent table stays JavaScript.** Each screen's intent table (for Pods, `intents/pods.mjs`) maps `{ target group, verb }` to one rule call. Its result becomes the next state, and timeline events become `event` messages. Arm-then-confirm (the hatch, the Wild gate) stays in the intent table, and the face draws the armed state from `focus.armed`. Input holds stay on the JavaScript timeline. While an event holds, the face, which knows it from the event's `hold`, moves no focus and sends no `confirm`, `back` or `step`; it still sends `room:<x>`. While the host's hold runs the dispatcher drops every other intent and keeps the last `room:` intent received, and dispatches it when the hold ends on its own clock, except the rest (Home), whose hold ends on Idle: there the key is dropped. This is how a coloured key waits while a moment holds input (`station-layouts.md`, The screen map). The face and the host each hold until the latest start + `hold` on their own clocks. The host never releases a hold or hands off a screen on `done`.

**Screen glue becomes DOM-free.** For S1 the screens' JavaScript must run in Node. Each screen becomes three modules: `views/<screen>.mjs` (state and focus to props), `intents/<screen>.mjs` (the intent table and the screen's UI state), and its spec file. None of them imports `gfx.mjs`, `document` or a canvas. The page and the Pi host differ only in the save adapter and the transport.

**The view's output.** Props name *what*, never *where*: strings, states (`read`, `sealed`, `unread`), counts, asset ids, flags, and the target list with ids and enabled states. A region's props are checked against a JSON schema kept beside the spec file (`<screen>.props.json`), which also documents the contract for the builder. Pods' view output, without its rectangles, is the starting point.

### 2.2 The component library (one closed vocabulary, shared with the Companion and the Caddy)

The C tree under `prototypes/face/src/`:

```
platform/   wasm.c · headless.c · sdl.c · drm.c        display, clock, keys; nothing else
bridge/     wire.c (JSON in, JSON out) · inproc.c · socket.c
spec/       spec.c                                     the spec loader (§2.3)
prim/       rect · text · sprite · nine · clip · composed      the closed primitive set, the only code that creates LVGL objects
vocab/      common/  frame topBar bottomLine messagePlate focusRing panel list text livingWindow ribbon
            station/ chapterRail chapterPage stampLabel specimen leaves
            (later)  companion/ hud mapViewport · caddy/ …
layout/     the spec's derived rules: railCompaction slantTabs pageGrid platePosition listPitch splicePlan guideColumns pipGroups leafArc
screens/    one binding table a screen: region id → word, and the compositions the UI designer named (module, rest knob, with-you bed, report card,
            idle line, not built yet, splice, guide spread, name tag, chapter plates, bay strip, Shield plates, choice cards, step tiles)
```

`idleLine` is a composition in `screens/`, not a word. It lives in the frame's binding table (`screens/frame.c`), because Idle is a state of the frame (`props.idle`), and it owns the two regions of `frame.json` `idle.regions`: `strip` (built with the `panel` word) and `line` (built with the `text` word, which fits it to the spec's one line), with colours and rules as `frame.json` gives them. Each of the two regions names both its word and the composition (`"component": "panel", "build": "idleLine"` and `"component": "text", "build": "idleLine"`), so the region log records the word that drew it. Its props are one string, `props.frame.idle.line`; an empty string sets no type, and what the strip shows then is the spec's. It adds no word and no layout rule. Used by Idle alone; a second user brings it back to the UI designer and the architect.

`notBuilt` is the second composition in the frame's binding table, beside `idleLine`. A screen with no binding table in `screens/` sends `state: "notBuilt"`, and the face draws the frame (the title from `frame.json` `strings.titles`, the counters, the Companion mark, the bottom line, the message plate), the stage ground, and one text region built with the `text` word, its rect, size, colour role, alignment and words from `frame.json` `notBuilt`. It draws no picture, no target and no ring. Navigation works as on any screen: room keys, ← to the parent, Dock, plates. Idle, until L2.2 builds `idleLine`, draws the same text region with no frame, and its first key sends `wake`. It adds no word and no layout rule.

The compositions of Home, Idle, the Vivarium's whole, Habitat, the Probe bench and the Library spread, each in its screen's binding table (Idle's in the frame's, `screens/frame.c`) and built from words already in the vocabulary:

- **`module`** (Home, Habitat, the Probe bench): a `panel` with its engraved word at the spec's `word` offset and its object, and the spec's `lamp` rect, or `"lamp": null` for none (Habitat's modules).
- **`nameTag`** (Home, the Vivarium's whole and Habitat, one composition shared): a `panel` and its `text`, the height, size, weight, padding, rounding, least and most width from each screen's spec.
- **`chapterPlates`** (Habitat's card): a `list` by `listPitch`, each plate its signed ground `chapter-plate-{read,unread,sealed}-40x40` with the rail's 24×24 emblem at (8, 8).
- **`bayStrip`** (the Vivarium's whole and Habitat): a `list` by `listPitch` with forms (§2.3), each tile a `panel` and its thumbnail, a free bay a composed `dash` outline.
- **`withYouBed`** (Home, Idle and the Vivarium's whole, one composition shared; Idle's in the frame's binding table): the carried set inside a living window, built of sprites and the `livingWindow` word's residents. The nest, 192×56; docked, one to three sleepers in carried order, each a resident in its nap pose with no lift, its ink at most 96×88 centred on its feet; away, the Companion mark, 16×24, at `markAt` (88, 16); docked with nobody carried, the nest alone. The bed and its sleepers sort with the residents as one, at the bed's foot. From each screen's spec: `rect`, `clip` (its window's `inside` region), `markRect`, `sleepers` (`max` 3, `pitch` 48, `footY`, `centre`, `places`, the adult and juvenile boxes) and `colours.bed` (rim, hollow, lit rim, mark). On Home and the whole each sleeper is a `resident` target with the feet ring; on Idle none is.
- **`shieldPlates`** (the Probe bench): one sprite a place, the places a table by tier.
- **`spreadPage`** (the Library spread alone): a `list` by `listPitch` (places, grid [4, 2]); each item at its place: the plate or study sprite 80×96 at (8, 8), the clan rule a rect in the clan's palette name, 80×4 at (16, −12), with a 12×12 roundel at (0, −16), the name a `text` (0, 120, 96, 20), the progress seeds 44×8 at (26, 152), the gilt corner and seal sprites 16×16 at (88, −8) and (88, 104), children of the region container; an unmet item draws nothing.

A further screen using one of them goes to the UI designer and the architect first.

**Overlays.** A spec of `"kind": "overlay"` (the namer, `namer.json`, over Habitat) is drawn on LVGL's top layer over the screen it opens from. The focus ring and the message plate are on the top layer too, in the order overlay, ring, plate: the ring over the overlay's targets, a plate over both. The screen beneath keeps drawing and takes no key (§2.6). Props that name an overlay whose `over` does not list the current screen are refused.

The ninth derived rule, the `leaves` word and the frame word's `stage` part:

- **`leafArc`** (`layout/`). Leaf boxes on two arcs, from two slot tables in the spec (an inner arc and an outer arc), each holding `2·perArc − 1` slots; the loader refuses a table of any other length. Leaves fill the inner arc left to right, then the outer arc: the inner arc holds the first `min(n, perArc)` leaves and the outer the rest. Leaf `j` (from 0) of the `k` leaves on an arc takes slot `perArc − k + 2j` of that arc's table (`20 − k + 2j` for the Incubator's `perArc` of 20). The rule refuses `n > 2·perArc`. Its JavaScript oracle is `leafArc(region, n)` in `ui/specs/derive.mjs`; its vectors are in `prototypes/face/tests/vectors/layout.json`, every `n` from 0 to 40, and 41 refused.
- **`leaves`** (`vocab/station/`). Leaves that fill as a bud grows, in two forms. The grid form, for Create and Home's Incubator module, takes from the spec `leaf` (the leaf's size), `pitch`, `perRow`, `rowPitch`, `rows`, `max` and `pictures: { empty, full }`. The arc form, for the Incubator, places its leaves by `"layout": ["leafArc"]`. Props: `{ total, full, rows }`, with `0 ≤ full ≤ total ≤ max`, `rows` from 0 to 11, and `rows = 0` when `full = total`; the props schema (§2.1) holds these bounds. Leaf `i` (from 0, `i < total`) is full when `i < full`; filling when `i = full < total`, drawn as its empty sprite with the bottom `rows` rows of the full sprite over it (a window of the full picture); else empty. One sprite per leaf, on the art layer. The word plays the Incubator's `growNow` fill (§2.7).
- **The frame word's `stage` part.** The first child of the screen tree, under every other region. With a `slice` it is one sprite of that picture on the painted layer; with none it is a rect in `colours.stageGround` on the chrome layer. The loader refuses a stage whose rect differs from `frame.json` `regions.stage.rect` (0, 40, 1024, 522), or a slice that is not 1024×522.

**The living window word's `gilt` part.** Beside `inside` and `frame`, the `livingWindow` word takes a third, optional part, `gilt`: a painted sprite placed 1:1 over the frame, with `slices: { rest, armed }` and region props `{ lit }`, set from `focus.armed === "room"`; with `lit` it shows the `armed` slice, else the `rest` slice. Used by the Sitting (`sitting.json` `regions.gilt`).

- **Primitives.** Rectangle; text (a run of Inter, with ⚡ ◆ ❀ ✕ placed inline as 16 px sprites); sprite (a picture 1:1, or a window of a larger one); nine-slice (corners 1:1, edges and middle tiled, never scaled; `scene.c` `views_of`); and clip, a real face primitive (an LVGL parent object that clips its children, LVGL's default with `LV_OBJ_FLAG_OVERFLOW_VISIBLE` left clear). Every primitive carries its **layer** (`chrome`, `art`, `painted`, `type`) and its **region id** for the checks.
- **Composed pictures.** A component that needs fine line work (the splice's 1 px wires, ticks and dashed edges; the guide's dashed slots, pips and tint lattice) draws it once, per props change, into a picture the face owns. It shows that picture as one sprite. It is still the closed set (a sprite) and still exact in palette colours with no anti-aliasing, but it costs one object instead of 1,765. The drawing code is a small set of C helpers (`hline`, `vline`, `dash`, `dot`, `lattice`, `bayerPick` for the `dither` event of §2.7, and `ring` and `tabRing` for the focus ring, §2.6) writing palette colours into an ARGB8888 buffer. No paths, no anti-aliasing, no opacity.

The focus ring is composed by the face. Its pictures are generated palette geometry (one palette role, alpha 0 or 255, no anti-aliasing; no signed master exists), and their sizes come from the face's own region table, so the host neither derives nor uploads them, and the contract stays 1 with no new message.

- **The ops**, in `prim/` beside `hline` … `lattice`, integer arguments only, every product in int64, no floating point:
  - `["ring", "round" | "ellipse", x, y, w, h, width, radius, colour]` draws a w×h ring with its top left at (x, y) in the picture. Pixel (i, j) of the box, with doubled centre X = 2i + 1, Y = 2j + 1, is on when it is inside the outer shape and not inside the inner one.
    - **round**: outer `inR(0, 0, w, h, radius)`, inner `inR(width, width, w − width, h − width, max(0, radius − width))`. `inR(x0, y0, x1, y1, r)` doubles every bound and takes R = 2r: false if X < 2x0, Y < 2y0, X > 2x1 or Y > 2y1; else cx = X < 2x0 + R ? 2x0 + R : X > 2x1 − R ? 2x1 − R : X, cy likewise, and true when (X − cx)² + (Y − cy)² ≤ R².
    - **ellipse**: outer `inE(0, 0, w, h)`, inner `inE(width, width, w − width, h − width)`. `inE(x0, y0, x1, y1)`: A = x1 − x0, B = y1 − y0; false if A ≤ 0 or B ≤ 0; dx = X − (x0 + x1), dy = Y − (y0 + y1); true when dx²·B² + dy²·A² ≤ A²·B².
  - `["tabRing", x, y, body, width, slant, outside, top, slantTo, bottom, radius, tabTop, colour]` draws the rail tab's ring, a box W = body + 2·outside + slant by H = bottom − top with its top left at (x, y). T = slantTo − tabTop. For column c and row r of the box: X = 2c + 1, Y = 2(top + r) + 1, XS = X·T. `inside(inset, rr)`: false if Y < 2(top + inset) or Y > 2(bottom − inset); C = clamp(Y − 2·tabTop, 0, 2T); L = slant·C + 2T·inset; Rt = 2T(W − slant) + slant·C − 2T·inset; yc = bottom − inset − rr. If rr > 0 and Y > 2yc: c2 = 2·slant·clamp(yc − tabTop, 0, T), CL = c2 + 2T(inset + rr), CR = 2T(W − slant) + c2 − 2T(inset + rr), D = T(Y − 2yc); if XS < CL the answer is (XS − CL)² + D² ≤ (2T·rr)², if XS > CR it is (XS − CR)² + D² ≤ (2T·rr)². Otherwise true when L ≤ XS ≤ Rt. A pixel is on when `inside(0, radius)` and not `inside(width, max(0, radius − width))`.
  - These are `ui/rings.mjs` `ringMask` and `tabRingMask` in integers. Measured against them at 770ff424: 7,493 cases (round, widths 1–200 at 11 heights; ellipses 24 tall at every width 1–1,040; circles 1–260; every ellipse to 60×60; tab bodies 8–400 with `frame.json`'s tab), 0 mismatches. The integer form is the definition: it leaves nothing to rounding or fused multiply-adds on WebAssembly, x86-64 or aarch64.
  - **Refusals** (`prim_compose` refuses the picture, counted in `refused`): an argument that is not an integer; an unknown palette name; a shape other than `round` or `ellipse`; width < 1; w or h < 1; radius < 0; an ellipse with radius ≠ 0; a ring box not inside its picture; for `tabRing`, body < 1, slant < 0, outside < 0, T ≤ 0, bottom < slantTo, or top ≥ bottom.
- **The `focusRing` word** (`vocab/common/`) takes the focused target's box (x, y, w, h) from the region table and its form from the spec, composes the ring, and moves the existing object when the ops hash is unchanged. The forms and placements, with `frame.json` `focus.ring` (width 2, outside 4, radius 6, `tab`) and `focus.feet` (widen 16, height 24):
  - **round** (the default): a nine-slice of a face-owned source `["ring", "round", 0, 0, S, S, width, radius, colour]`, S = 2(radius + width) + 4 (20), insets radius + width (8) on every side, the middle tiled, at [x − outside, y − outside, w + 2·outside, h + 2·outside]. Measured: this nine-slice equals the full-size mask at every size from 16 to 400 by 16 to 200 (71,225 sizes, 0 mismatches). `prim/nine` takes a composed source as well as a host asset, cached by its ops hash and counted once in pictures. A target under 8 px on either axis is refused.
  - **feet** (a creature): an ellipse ew = w + widen by eh = height, at [x + ((w + 1) >> 1) − ((ew + 1) >> 1), y + h − ((eh + 1) >> 1)] (the halves round as JavaScript's `Math.round` does).
  - **circle**: an ellipse 2ρ by 2ρ round a centre, either fixed by the spec (`{ "circle": { "radius": 84, "centre": [96, 112] } }`, Pods' place: centre (x + 96, y + 112), rect [x + 12, y + 28, 168, 168]) or from the box (`{ "circle": { "outside": 4 } }`, Pods' kin: ρ = (w >> 1) + outside, centre (x + (w >> 1), y + (h >> 1))).
  - **tab**: a `tabRing` with body w, at [x − outside, tab.top, w + 2·outside + slant, tab.bottom − tab.top] (x − 4, 42, w + 24, 42), with `tabTop` = `frame.json` `regions.rail.y`.
  - The form is the target group's `ring` in the screen spec: `"round"` (when absent), `"feet"`, `"tab"`, or a `circle` object as above. The UI designer writes it; the loader refuses any other form or key.
- **Palette roles**, by name from the palette message: `frame.json` `colours.ring` (`focus`); `focus.ring.onPaper` (`rust`) on the screens in `focus.ring.onPaperScreens`; the top bar word's Companion face ring with the same `ellipse` op in `colours.faceRing` / `faceRingAway` (`teal`, `stone`); Create's clash ring, `round`, in its role from `create.json`.
- **Budgets.** One to three ring pictures resident, within the 200: the 20×20 source (1,600 B), the largest circle (168×168, 112,896 B), a full tab's ring (160×42, 26,880 B). Composing happens on the key's frame; `face_test` prints the compose time of the largest ring, and the ring moved on the frame of the key stays asserted (§2.10).
- **Vectors.** `prototypes/face/tests/vectors/rings.json`, generated from `ui/rings.mjs` (rewritten to the integer form above): each case `{ op, w, h, sha256 }`, the SHA-256 of the 0/255 mask row by row, covering the measured set, the 20×20 source's nine-slice expansions and each refusal. `face_test` (WebAssembly, native x86-64, aarch64 under qemu-user) and a Node test over `rings.mjs` both run it. `selftest.c` draws its ring with the op.
- **Resident at boot:** 10 plate pictures (145,920 B), 7 tab pictures (four 152×40, 97,280 B; three 72×40, 34,560 B), up to 3 rings.

- **Words.** Each word of the closed vocabulary (`station-layouts.md` "The vocabulary (closed)") is one C module with a constructor (a region's object tree, built from the spec) and an update (props in, objects changed only where the props differ). A word never reads the save, never measures from outside, and never decides content.
- **Profiles for the other devices.** Words take their palette, fonts and colour format from a `face_profile`: Station 1024×600 ARGB8888 with Inter; Companion 450×600 on the 48-colour palette with Mibi 7×9 and anti-aliasing off; Caddy 792×272 in four grays. The `common/` words compile for all three. Station-only words stay in `station/`. A new word still goes to the UI designer and the architect first (technical-architecture.md §5.4 step 3).
- **Budgets the library enforces** (counted in CI, §2.7): at most 400 LVGL objects on a Station screen (the table holds 1,024, so a breach is measured rather than refused); at most 200 pictures resident; a text run of at most 1 KiB.

### 2.3 How the spec files bind to LVGL objects

The spec files (`prototypes/ui/specs/station/*.json`) are the one home of the numbers. The face reads them at run time (sandbox and Pi), so a nudge needs no compile. The Companion and the Caddy get them compiled to C tables.

1. **Loading.** The face parses each spec with a small vendored JSON parser (jsmn, MIT, one header, recorded in `THIRD_PARTY_NOTICES.md`) into a region tree: id, rect, word or `build`, its parameters, colours by palette name, strings, and the focus section.
2. **Instantiation.** For each screen, one LVGL screen object, built once and kept. Each region becomes one container at its spec rect, absolute (no flex, no grid: `lv_conf.h` already has `LV_USE_FLEX 0`, `LV_USE_GRID 0`). The word's constructor builds its children inside, and `user_data` holds the region id. Switching screens is `lv_screen_load`, with the transition of §2.7.
3. **States.** A spec with `states` (Pods: collection, overview, chapter, and Compare) marks which regions exist in each state. `props.state` picks one. Regions outside the state are hidden, not destroyed.
4. **Derived geometry.** Where the spec names a rule rather than a rect (the rail's compaction and slants, the page grid by trait count, the plate's position over a focal box, the list's pitch, the splice's row plan, the guide's columns, pips in fives, the Incubator's leaf arcs), the word calls the C function of that name in `layout/`, with the spec's table and the counts from props. `listPitch` may carry `forms`, `{ <name>: { upTo, first, pitch, grid } }`: n items take the form with the smallest `upTo` at least n (Habitat's bay strip, full tiles then compact). A form with no `upTo`, two forms with one `upTo`, or a grid shorter than its `upTo` is refused at load. The rules are the closed list of nine in `station-layouts.md`. A rule that is not in `layout/` is refused at load, not improvised.
5. **The oracle stays in JavaScript.** The same derived rules, as pure functions of the spec, are in `prototypes/ui/specs/derive.mjs`, the splice's row plan among them; the guide's columns and pips join them with the Book and the field guide (§4, slot 8). They draw nothing. They are the reference the regions check compares the face against (§2.7), and later they generate the ESP32 tables. Two independent implementations of each rule, checked against each other on every capture, catch the mistakes a single one would hide.
6. **Lint.** Every drawn region in a spec names its word (`component`) or composition (`build`). `specs.test.mjs` asserts it. `library.json`'s spread names its words and composition; `cross.json` and `library.json`'s Book and guide gain the names when their screens move.

### 2.4 Assets

- **The manifest stays the authority** (`ui/assets.mjs`: id, size, policy, status, slice, tile, placeholders counted). The face never invents an asset. It refuses a picture whose size is not its slot's, which `scene.c` already does for sprites.
- **Masters.** The PNGs in `ui/assets/masters/` (index with SHA-256) are converted at build time by `prototypes/face/tools/bake-images.mjs` (Node, using `ui/png.mjs`) into LVGL 9 binary images: ARGB8888 with straight alpha, optionally lz4 (`LV_USE_LZ4` from the vendored tree). Both faces load the same `.bin` bytes, so the sandbox has no colour management in the browser's PNG decode and the Pi needs no PNG decoder (`LV_USE_LODEPNG 0` stays). The existing "placed masters match their index" check extends to the baked files.
- **Generated pictures** (the placeholder pods, emblems, beams, tints, stamps, rig renders and painted crops from `art.mjs`, `pictures.mjs`, `podmasters.mjs`, `podlayers.mjs`) stay in JavaScript, as the logic's asset producers under S1. Their RGBA must come without a canvas: `gfx.mjs`'s `PB`, palette and dither helpers move to `station/src/pixels.mjs`, which converts palette indexes to RGBA directly, so Node can run them. In the sandbox the pixels go into the face's heap. On the Pi the Node host writes them, atomically, into the image cache as `.bin` files named by id and content hash, and the face loads them by path.
- **Focus rings are not assets.** The face composes them from the spec and palette roles (§2.2); the host uploads none, and no contract message names one.
- **Series.** A spec `plate` with a `series` names a closed set `<series>-<w>x<h>`, w = min … max by `round` (`derive.mjs` `plateSeries`). The host sends every id at boot, before the first `props`, and never drops one. The face picks the id from its own `layout_plate_width` and shows it 1:1. Props carry no plate id. A series that is not a multiple of `round` is refused at load, and a missing id is an `error`. The `plate-name` series is one signed picture per width, not a nine-slice, and the face shows each 1:1.
- **The rail tab's ground** is the signed `rail-tab-fill-{unread,read,sealed}-{full-152x40,compact-72x40}` and `rail-tab-fill-open-full-152x40`: 7 ids, as the open tab is always full. The host sends them at boot and never drops them, as a series. The rail word shows the one for the tab's state and width 1:1 at (tab.rect.x, `regions.rail.y` 40). The face composes no tab ground, and a sealed tab has no notch.
- **Never scaled.** `pixels.mjs` `scalePB` and `upPB` are used inside `art.mjs` (`paintedArt` scales a crop when the sizes differ). That is a departure from the never-upscaled rule. It is listed for the art pipeline, and the face cannot scale in any case.

### 2.5 Fonts and text

- **Fonts.** Inter 16, 20 and 28 px stay LVGL C fonts baked by `tools/bake-fonts.sh` from `ui/fonts/inter/src`. CI already re-bakes them and diffs. Mibi 7×9 at 2× and 3× is baked the same way when the Companion comes.
- **Fitting is the face's job.** Wrap, clip with an ellipsis, centring, the cap-top placement (`scene.c` already converts the spec's cap top to LVGL's line top), and the name plate's width rounded to its step (`derive.mjs` `plateWidth`, the oracle) all move into the text and panel words. Props carry the whole string and the spec carries the box and the line limit.
- **A metrics table for the views that choose words by width.** Some content choices depend on width, such as the ← word that fits (`nav.mjs` `backWord(…, fits)`) and number words against figures. For those, the native build exports `face/dist/metrics.json` from the compiled fonts: integer advances and kerning pairs, exactly what `lv_text_get_width` sums. `ui/specs/measure.mjs` sums the same table in JavaScript. A Node test asserts equality with the WebAssembly face on a corpus of every Station string (the strings in the spec files and the views' templates). There is no synchronous call across the bridge.
- **Coverage.** Every character the Station can set must be in the baked ranges. `type.test.mjs`'s coverage test is re-pointed from the atlases to the C fonts' ranges.
- **Deleted at B4a:** the atlas form (`ui/fonts/atlas/*`, `ui/tools/bake-type.mjs`, `ui/type.mjs`, `ui/type-node.mjs`), used only by the JavaScript type layer (§5.2).

### 2.6 The focus graph

Focus is the face's because the face knows where every target is drawn. Views give no target rectangles, and no screen types its own.

- **Inputs.** From the spec: one graph per state (for example `pods.json` `focus.collection` and so on, `home.json` `focus`). From props: `focus.targets`, the ids and enabled flags of what can be focused now, with no rectangles. `focus.resolve` gives the view's answers to the spec's selectors (`list.current`, `rail.last`, `kin.first`). `focus.set` is an explicit jump requested by an intent result (go to a state, open a pod).
- **The rectangles** are the target regions as their words drew them, read from the face's region table, so the ring and the spatial fallback use real boxes.
- **The algorithm** is `ui/focus.mjs` ported exactly: an explicit edge, a selector, `none`, an axis that stops at the ends without wrapping, then the spatial fallback (nearest along the direction, crosswise distance weighted 2.2), with the edge forms and the integer arithmetic of §2.6.1. Its tests (`ui.test.mjs` "focus follows the graph …") become JSON vectors that both the C test binary and `ui/focus.mjs` run. `focus.mjs` is kept for good as the vectors' second run, so two implementations check each other on every change.
- **Two graph primitives** make Home's and the Vivarium's fixed orders spec data, not code (`nav.mjs` `homeMove`, `habitatMove`, deleted when their screens move): `order: [ids]` (a column walked in a fixed order) and `nearestIn: group` (spatial, restricted to one group, landing on the row nearest the ring). The UI designer writes them into `home.json` and the Vivarium spec. `nav.mjs` keeps the tree (parents, ← words, room keys), which is logic. The exact semantics are §2.6.1.
- **The ring** is the `focusRing` word: shapes from `frame.json` `focus.ring` (round, circle, tab ring, the ellipse under a creature's feet) composed by the face with `ring` and `tabRing` (the round one a nine-slice of a composed 20×20 source, §2.2), the form per target group from the spec's `ring`, plus the creature's `lift`. The JavaScript layer's amber pulsing ring (`gfx.mjs` `focusRing`) is deleted at B4a (§5.2).
- **Overlays.** While an overlay is open (§2.2), its graph is the only one and the screen beneath takes no key. The props that close it carry `focus.set`, which hands the ring back to a target of the screen beneath.
- **Keys.** Directions move the ring and send `focus`, except a stepper key, which sends `intent` with `step:<key>` and leaves the ring where it is (§2.6.1). ✓ and ← on a target send `intent`. Room keys send `intent` with `room:<k>` from any screen. On Idle the first press sends `wake` and nothing else (`main.mjs` `act`). The Caddy's Dock key never reaches the face: in the sandbox the page sends it straight to JavaScript, as `act("dock")` does, and on the Pi it arrives at Node over Wi-Fi.
- **Latency.** The ring moves on the frame of the key press. The bottom line follows when the new props arrive: the same frame in the sandbox, one or two frames on the Pi (budget §2.9).

#### 2.6.1 The graph's primitives, exactly

One semantics, run by `ui/focus.mjs` and the C port alike, so the JSON vectors give the same id on both. It lands with L2.0's focus port.

**Groups and ids.** A target's group is its `group`, else its id up to the first `.`. A target is *present* when its id is in `props.focus.targets` (enabled or not; an enabled flag changes what ✓ does, never where the ring may go).

**An edge** is the value of a group's `up`, `down`, `left` or `right`. It has four forms:

| Form | Example | Yields |
| --- | --- | --- |
| A name | `"pod"`, `"bay"` | The target with that id if present, else the first present target of that group in `props.focus.targets` order, else nothing |
| A selector (a name with a `.`) | `"kin.first"`, `"rail.last"` | `props.focus.resolve[selector]` if it is a present id, else the first present target of the group before the `.`, else nothing |
| `nearestIn` | `{ "nearestIn": "resident" }`, `{ "nearestIn": "resident", "ahead": true }` | Below, else nothing |
| An ordered list | `["figure", "kin.first", "hatch"]` | Each entry in turn, a name, a selector or a `nearestIn` object; the first entry that yields a present target wins, else nothing. `"none"` may stand only as the last entry, where it means the ring stays |

`"none"` as the whole edge means the key does nothing there. An empty list, `"none"` before the last entry, a list inside a list, and an unknown key in a `nearestIn` object are refused when the spec loads (§2.3), as is a group with both `order` and `axis`.

**A stepper.** A group may carry `"stepper": [keys]`: the keys, from `up`, `down`, `left` and `right`, that step a value on the focused target instead of moving the ring (Create's ▲▼ roll, Cross's ◀▶ partner, Compare's ◀▶ chapters). The list is non-empty and its keys distinct; their order does not matter. When the focused target's group lists the key, the face sends `{ t: "intent", seq, screen, target, verb: "step:<key>" }` with `target` the focused id; the ring stays and no `focus` message is sent. No edge, `order`, `axis` or fallback is consulted, and the target's enabled flag is ignored: the intent table decides what a step does, its ends and any wrap. While an event holds input (§2.1) nothing is sent. Refused when the spec loads (§2.3): an empty list; a duplicate or unknown key; a stepper key that also has an edge in the same group; `axis: "horizontal"` with `left` or `right` in the list, or `axis: "vertical"` with `up` or `down`; and `order` with `up` or `down` in the list.

**The order of a move.** (0) If the focused target's group lists the key in its `stepper`, the key steps (above) and the move ends. (1) The group's edge for that key: `"none"` stops; a yielded target is the answer. (2) If the edge yields nothing, or there is none: the group's `order` for ▲ ▼ (the list as written, skipping ids that are not present, stopping at the ends, never a wrap) or its `axis` (the group's present targets by `index`, stopping at the ends). (3) Else the state's `fallback`: `"spatial"` is the nearest target in any group (below); `"none"` leaves the ring where it is. A selector names what it names or nothing: the view resolves it to `null` when there is nothing (Pods' `kin.first` with no kin is `null`, not `hatch`), and the spec's list carries the way on, so no navigation is hidden in the view. `focus.mjs` and the C port return `{ to }` for a move, and `{ to: cur, verb }` for a step, with `cur` the focused id and `verb` `step:<key>`.

**Geometry, in integers.** Each target's box is the rectangle its word drew it at in the face's region table on the frame of the key (a resident's stepped sprite box, not its ring). Its centre is taken doubled, `(2x + w, 2y + h)`, so every quantity is an integer and JavaScript, WebAssembly, x86-64 and aarch64 cannot round differently. The origin is the focused target's doubled centre, or, when the focus is the spec's `roomKey` (a ring on nothing), the doubled centre of `focus.roomAt`. For a key with unit vector (dx, dy) and a candidate with doubled offset (vx, vy) from the origin: `along = vx·dx + vy·dy`, `across = abs(vx·dy + vy·dx)`. The focused target is never a candidate.

| Rule | Candidates | Score (least wins) | The JavaScript it replaces |
| --- | --- | --- | --- |
| `nearestIn: g` | Present targets of group `g` | `400·across + abs(along)` | `nav.mjs` `nearestTo(…, axisY = true)`: `abs(dy)·4 + abs(dx)·0.01` for ◀ ▶, the row nearest the ring; for ▲ ▼ the same rule takes the column nearest |
| `nearestIn: g, ahead: true` | Present targets of group `g` with `along > 12` (more than 6 px ahead) | `5·along + 11·across` | `homeMove`'s residents: `along + 2.2·across`, more than 6 px ahead |
| `fallback: "spatial"` | Every present target with `along > 8` (more than 4 px ahead) | `5·along + 11·across` | `focus.mjs` `nearest`: `along + 2.2·across`, more than 4 px ahead |

Each score is the JavaScript one multiplied by a positive constant (200, 10 and 10, on doubled centres), so the choice is the same. On an equal score the target earlier in `props.focus.targets` wins. `ahead` works for all four keys: Home writes it on the residents' ▲ ▼ and on ◀ (`"left": { "nearestIn": "resident", "ahead": true }`), which also reaches two residents at the same height.

**Vectors.** `prototypes/face/tests/vectors/focus.json` holds every case: those of `ui.test.mjs` "focus follows the graph …", `nav.test.mjs`'s Home walk, the `vectors` of `home.json` `focus`, ties, the thresholds at exactly 6 px (not taken) and 6.5 px (taken) for `ahead`, and 4 px and 4.5 px for the spatial fallback, the `roomKey` origin, each ordered-list case (first entry present; first absent and second present; all absent with `"none"` last; all absent falling to the axis and to the fallback), each stepper case (each listed key giving `{ to: cur, verb }` on an enabled and a disabled target; a key the group does not list moving by steps 1 to 3), and each refusal, the stepper's included. `face_test` and `focus.mjs` both run it. `focus.mjs` is changed to this integer form at L2.0 and kept as the vectors' second run (§5.2); `nav.mjs` `homeMove` is deleted at L2.2 when `home.json` carries Home's graph.

### 2.7 Animation

The rule: **the timeline in JavaScript decides that something plays and whether input is held; the face plays it.** Views stop reading `TL.progress` to compute in-between states. They send the end states, and the event carries the start.

| Kind | In the JavaScript layer | On the face |
| --- | --- | --- |
| `seal` (Identify, 2 s, hold) | `TL.play`, `views/pods.mjs` `idCut` | The specimen word's cut, stepped per frame |
| `wipe` (Read, 2 s, hold) | `TL.play`, the rail's pips filled `ceil(p·n)` | The rail word fills pips over `ms`; the page wipes |
| `ribbon` | `TL.play` 6 s and up, shown from 70% of the seal | The ribbon word |
| `plate` (4000 ms, no hold; one mibi up close's `refused` among its users) | `game.mjs` `msg` | The message plate word |
| Counters' tick (70 ms a unit, 240 ms flash) and the turn's flash (1 s, 160 ms blink) | `present.mjs` `createFramePresenter` | The top bar word, from old and new values |
| Screen change (180 ms, 16-level Bayer) | `main.mjs`, the host | A `dither` transition: 16 lattice pictures over the stage. No opacity |
| A region's picture changing (Create's founder: 200 ms, 16 levels) | — | A `dither` event between the two pictures, composed by `bayerPick` (below) |
| `grow` (Create, 900 ms, hold 1080 ms) | — | The stamp label prints row by row, the code is cut in, the pod travels |
| `moment` (one mibi up close, 1800 ms, hold 300 ms, cut) | — | The living window word plays the mibi's species moment from its moving set; until it has one, the placeholder hops twice, the creature lift 4 px up and back in whole pixels, at 0 and 900 ms. A key after the hold cuts it to its end |
| `meet` (one mibi up close, 0 ms, hold 0; when the hatch's 180 ms dither ends on the new mibi) | `UI.meet` and `FX.meetId` (`game.mjs`), set by the hatch's hand-off (`host.mjs`) | The state `meet`: the ribbon word in the name tag's place, and the mibi's `moment` played once with no hold. The first key takes the ribbon away (a cut) |
| `read` (one mibi up close, 300 ms, hold 300 ms) | — | The plate turns read (a cut); the stamp label prints the chapter's cells row by row from the top over 300 ms, as in `grow` |
| `growNow`, Grow now's fill on the Incubator (400 ms, hold 400 ms) | — | The `leaves` word's `growNow`: one whole leaf a step over 400 ms (§2.2) |
| Arrival on Home and Cargo (crates slide in 500 ms each, staggered 250 ms, no hold); Cargo's opening (3000 ms a crate: one crate 3180 ms, hold 3200 ms; two 6180, hold 6200; three 9180, hold 9200); hatch (2600 ms, hold 2780 ms); wake; Rest (200 ms, hold 380 ms) | `home.mjs`, `incubator.mjs`, `FX` fields | Named events on Home, Cargo and the Incubator with whole-pixel slides |
| Residents walking | — | The living window word: positions stepped in C from a seed and bounds in props, the same seed giving the same path. Their boxes are focus targets (§2.6) |

**The watch is not an event.** It is a host rule (`habitat.json` `rules.watch`): at 60 s on one mibi up close, once a mibi a day, the host records a habit and the face plays the message plate and, under the day's cap, the counters' tick, nothing of its own.

**The `dither` event.** A `dither` event changes the picture on one region from one picture to another. The event carries `from`, the previous picture's id (a string), which stays loaded until the event ends; the props carry the new one. At time `t` of the event's `ms`, the level is `L = min(16, floor(16·t / ms))`, and a pixel at screen coordinates (x, y) shows the new picture where `BAYER[(y & 3)·4 + (x & 3)] < L`, else the old one, with `BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]`. `to: null` dithers the picture out: where BAYER < L the pixel is transparent and the regions under it show. Whole pixels are copied: no blend, no opacity. The frame is composed by `bayerPick`, a helper in `prim/composed` beside `lattice` (§2.2), and shown as one sprite. A new event on the region while one plays cuts the playing one to its end first. With `motion: false` the event is a cut to the new picture. Users: Create's founder (200 ms, 16 levels), the vivarium's swap, the Sitting's backdrop (200 ms) and gilt (300 ms).

Constraints: positions move in whole pixels. No LVGL opacity is used on the chrome or art layers, because an alpha blend leaves the palette; fades there are stepped dithers. Painted and type layers may blend. `props.motion = false` (from `prefers-reduced-motion`) makes every event jump to its end. The face's clock is the host's milliseconds through `face_frame(ms)`, so a test can step it and capture a frame at any point of an event.

### 2.8 Checks against the LVGL framebuffer

Everything the style guide measures (technical-architecture.md §5.6) is re-pointed at the face. In test mode (`?test`, or the native headless binary) the face writes a log at each capture point and can render passes.

| Check | Measured from | In CI |
| --- | --- | --- |
| **Regions** | The face's region log, `{ region, rect }` per drawn region, written by `prim/` from the word that drew it. Each is compared with its spec rect, or with `ui/specs/derive.mjs` for a derived one. One generic loop over every screen, in place of a hand-written case per region | The regions check, on the face |
| **Pixels** | **Golden framebuffers**: the hash of each journey capture point, committed in `prototypes/face/golden/<screen>/<screen>.json`, with the PNGs for review. WebAssembly, native x86-64 and native aarch64 (under qemu-user in CI) must give the same hash, as WebAssembly and native do (`5fc5fdc5`, `3456b1be`) | Per screen, from its slot; the three builds from B4b |
| **Palette** | Three passes per capture point: chrome only, chrome and art, everything. 0 pixels off palette on the first two; type pixels tinted from palette colours | Every capture point |
| **Type** | The text word's log: string, font id, px. Every run Inter 16, 20 or 28 from the baked fonts; no refused glyph; no digits in `noDigits` regions; each run's ink inside its region (`station/tools/checks.mjs`) | Every capture point |
| **Size, stamp label, rail tabs, placeholders** | Frame size asserted; stamp label 120×120 with the stamp ≤ 104 inside; tab count equals the chapters; placeholders counted from the manifest | Every capture point |
| **Refusals and budgets** | `refused` = 0; objects ≤ 400 a screen; pictures ≤ 200; props ≤ 32 KB; printed per capture point | Printed; fail on refusals only, the budgets fail from L3 |
| **Journey sequence** | The journey's key presses on the face give the sequence of focused targets and intents committed in `prototypes/face/golden/journey-<screen>.json`. The final save's hash is compared only with a pinned clock | Per screen, from its milestone |
| **Import guard** | §5.1 | Every run |

### 2.9 Native Linux and WebAssembly builds

| Target | Display and input | Used for | CI |
| --- | --- | --- | --- |
| `face_wasm` | The page's canvas (dirty rectangles copied, as `face-lvgl.mjs` `present` does); keys from the page | The sandbox | Built and tested (exists) |
| `face_native` (headless) | A memory framebuffer; keys from a script | Golden hashes, the C unit tests (`face_test`: layout, focus, metrics and ring vectors), the per-screen draw timing | Built and run (exists; grown) |
| `face_sdl` | An SDL2 window at 1:1; keyboard | Builders' debugging with a real debugger, against `station/host/` (the logic in Node over the socket): S1's shape on a laptop | Built only |
| `face_drm` (aarch64) | Linux DRM/KMS dumb buffer, XRGB8888 at 1024×600 (the 7" HDMI panel, `design/devices.md`); evdev keys | The Pi | Cross-compiled (gcc-aarch64-linux-gnu); the headless twin runs under qemu-user for the hash. Not run on hardware until the hardware phase |

- One `lv_conf.h`. The drivers (`LV_USE_SDL`, `LV_USE_LINUX_DRM`, `LV_USE_EVDEV`) are switched per target by CMake definitions. LVGL stays the unmodified vendored 9.6.0 (`v1/native/vendor/lvgl`).
- `platform/` is the only per-target code. `face.c` is platform-neutral.
- The Node host, `prototypes/station/host/main.mjs`, imports the same views, intents, rules, asset producers and save adapter as the page. It writes the save to a file atomically and connects to the face's socket. It is what runs on the Pi under S1.
- System packages come from the runner's apt (`libsdl2-dev`, `libdrm-dev`, `gcc-aarch64-linux-gnu`, `qemu-user`). There is no new paid or networked service.
- Clean builds on CI take 35 s (WebAssembly) and 39 s (native) (`prototypes/face/README.md`). Budget for the whole face job after B4b: at most 4 minutes with the SDK cached, and the full sandbox job at most 12 minutes (5 min 13 s measured at L0).

### 2.10 Performance budgets for the Pi 4 proof

The proof runs when the hardware phase starts, once the loop is complete in software. Until then, CI measures the hardware-independent half on every capture point and prints the native x86-64 timings as an early warning.

| Measure | Budget on the Pi 4 (7" HDMI, 1024×600) | Before hardware |
| --- | --- | --- |
| Full-screen redraw, heaviest screen (Cross chapter view, guide spread, Home with residents) | ≤ 25 ms p95 | Native timing printed; objects ≤ 400 and pictures ≤ 200 asserted |
| Animation frame (residents, wipe, counters) | ≤ 8 ms p95, ≥ 30 fps sustained, 60 fps where the dirty area allows | Dirty area per animation frame ≤ 25% of the screen, asserted from the dirty rectangles |
| Key to ring moved on screen | ≤ 50 ms p95 | Ring moved on the frame of the key, asserted |
| Key to props applied (bottom line updated) | ≤ 100 ms p95 | Props ≤ 32 KB; JSON encode and decode timed natively |
| CPU, face at rest / animating | ≤ 5% / ≤ 40% of one core | — |
| Resident memory | Face ≤ 64 MB (framebuffer 2.4 MB, LVGL heap 8 MB, image cache ≤ 40 MB); Node ≤ 150 MB; whole system ≤ 300 MB (§4.3) | WebAssembly heap printed |
| Boot | Face process start to first frame ≤ 0.5 s; Node ready ≤ 1.5 s; power-on to Home ≤ 20 s on Raspberry Pi OS Lite | — |
| A rig render | Off the frame path, cached by genome hash; ≤ 10 s a mibi in the background | — |
| Sandbox | `face.wasm` ≤ 1.5 MB (≤ 600 KB gzipped; 348,437 B with fonts, measured at L1); load and initialise ≤ 50 ms; full-frame copy ≤ 16.7 ms with the CPU throttled 4× (13.2 ms measured at L1) | Measured in CI |

If a budget is missed on hardware, the levers in order are: partial redraw discipline (no full-screen invalidation outside screen changes); `LV_DRAW_SW_DRAW_UNIT_CNT` 2–4 with a pthread OS layer; NEON blending (`LV_USE_DRAW_SW_ASM`); composed pictures for busy regions; and as a last resort a smaller image cache. None of these changes the contract.

### 2.11 What stays where

| Stays JavaScript and data | Moves into C | Deleted at B4a |
| --- | --- | --- |
| `state.mjs`, `sitting.mjs`, `library.mjs`, `genome.mjs`, `splice.mjs`, `caddy.mjs`, `game.mjs` (minus drawing), `nav.mjs` (tree, words, room keys); views as props (`views/frame.mjs`, `views/pods-props.mjs`); intent tables (`intents/`); the timeline (holds); `dev.mjs`; the spec files and `ui/specs/derive.mjs`, `measure.mjs`; the manifest; asset producers (`art.mjs`, `pictures.mjs`, `podmasters.mjs`, `podlayers.mjs`, `podsprites.mjs`, `pixels.mjs`); the ring oracle `ui/rings.mjs` (vectors), beside `derive.mjs`; the focus vectors' second run `ui/focus.mjs`; `png.mjs`; `face-lvgl.mjs` as the transport; the journey and checks | The words, the layout rules, text fitting, the focus graph, animation, the ring and its pixels, clip, composed pictures, transitions, Idle's composition, not built yet | The JavaScript drawing layer, §5.2 |

The developer panel stays a DOM panel under the device in the sandbox (station-build.md §2.5: never a device key). On the Pi, developer settings are flags of the Node host. The face draws neither.

## 3. Screen order

The Station is built breadth first: every section's overview level goes on the face, so the loop plays from a fresh world, before any deeper level. The sections and their levels are `station-layouts.md` "The screen map". Slots 2 to 6 are the overview slots; slots 7 to 10 are the depth slots.

| Slot | Scope | Spec | Size | Why here |
| --- | --- | --- | --- | --- |
| **L2.0 Platform, and Pods on C words** | Bridge, spec loader, primitives with clip and composed pictures, the frame words, Pods' words, focus, animation, test logs, native SDL and aarch64 builds | `frame.json`, `pods.json` | about 2 × L2 | Pods' word vectors, recorded against the JavaScript drawing, are the parity record. It is the safest place to prove the C words and the bridge before any new screen depends on them |
| **L2.0 B4a: the JavaScript face removed** | Every screen: the sandbox boots the LVGL face, a screen with no binding table draws "not built yet", the JavaScript drawing layer is deleted, the import guard | — | part of L2.0 | With Pods on the face, every later screen is built on LVGL alone, with nothing to keep in step |
| **1. Title marks** | The frame's title mark, the coloured key's icon, 24×24 at (16, 8) on every screen but Idle: `frame-room-home-24`, `frame-room-vivarium-24` (the Vivarium, one mibi, Cross, the Sitting), `frame-room-research-24`, `frame-room-library-24` | `frame.json` `regions.marks`, `cross.json` | small | The mark is on every screen's top bar; placed first, it stays out of every later golden |
| **2. L2.2 Home, Cargo and Idle** | Home (the vivarium panel and the column of five modules: Cargo, Pods, Incubator, Probe, Library); Cargo whole (the bay, the crates opening, the report card); Idle (the Vivarium's whole without the frame) | `home.json`, `cargo.json`, `frame.json` `idle` | about 1.5 × L2 | The hub: the loop starts and ends there, and the dock moment, Cargo, is the loop's entry. Residents prove the living window's animation, and Cargo's opening proves the event path and the held timeline |
| **3. R: Create and the Incubator** | Create's one level (the roll, the total, Grow it); the Incubator's one level (the bud, the leaves, Grow now, the hatch, the hand-off) | `create.json`, `incubator.json` | about 1 × L2 | Research ends in a bud and a hatch, which closes the playability gap (§4). Shares the rail, the stamp label and the specimen chamber with Pods |
| **4. V: the Vivarium, whole and up close** | The Vivarium's whole (every mibi at home, the bays); one mibi up close in rest and meet; the namer overlay | the Vivarium's whole, `habitat.json`, `namer.json` | about 1.25 × L2 | The hatch lands in the meet, one mibi up close; with V the loop plays end to end from a fresh world |
| **5. L: the Library spread** | The Library's whole: the sixteen frames, found, met and unmet | `library.json` (the spread) | about 0.5 × L2 | The Library's overview, reached from Home's column; the Book and the guide are depth |
| **6. P: the Probe bench** | The Probe's one level: the bench, mend and switch | `bench.json` | about 0.5 × L2 | The last section's overview: with P every module in Home's column opens a built section |
| **B4b** | `face_sdl`, `face_drm`, the aarch64 hash under qemu-user, `station/host/` on `face_sdl` (§4, L2.0) | — | part of L2.0 | After P, so the three-build check (gate check 6) runs once over every overview slot |
| **7. Cross with the splice** | Cross, under one mibi | `cross.json` | about 1 × L2 | The heaviest screen (1,772 nodes in the JavaScript layer). It needs the composed pictures from L2.0, the rail from Pods and the door from one mibi up close (V) |
| **8. The Book and the field guide** | The Book's face spread, the guide spread, the detail band | `library.json` | about 0.75 × L2 | Its spec carries nine rulings, and its rules exist |
| **9. The Sitting** | Under one mibi: pose, place, look and confirm | `sitting.json` | about 0.75 × L2 | It waits for its art |
| **10. The Vivarium's remaining states** | Compact, offline and painted | `habitat.json` | about 0.25 × L2 | States outside the loop's first pass |
| **L3 Close-out** | — | — | — | Every screen on the face: goldens for each, the budgets failing CI, the Node host playing the whole journey |

**The spec dependency.** Each slot's spec is ready one slot ahead of its build. A slot without its spec waits; it is never built from an old screen's numbers. `home.json`, `cargo.json` and `frame.json` `idle` are ready for L2.2; `create.json` and `incubator.json` for R; `vivarium.json` (the Vivarium's whole), `habitat.json` (one mibi up close) and `namer.json` for V; `library.json`'s spread for L; `bench.json` for P. `cross.json`, `library.json`'s Book and guide, and `sitting.json` are checked against the screen map before their slots.

## 4. Milestones

Every slot ships to the sandbox and plays from a fresh world. The save does not change in any of them. From B4a until Home and Cargo (L2.2) and Create and the Incubator (R) are on the face, a fresh world plays Pods only: Dock, then the developer panel's "Open the crates". That is the playability gap; the panel gains no button for an unbuilt screen, and `loop.test.mjs` and the journey's rule steps, through the test hooks, keep the whole loop tested meanwhile. From V the loop plays end to end on the face from a fresh world: Home, Dock, Cargo opens the crates, Pods, Create, the Incubator, the hatch, the new mibi up close in the meet with the namer, the Vivarium's whole, Home. L and P complete the overviews. A level a slot does not build keeps sending `notBuilt`, and a jump to it lands on "not built yet". A slot merges only when the documents it touches, in both repositories and on the website, show the current state. Sizes are relative to L2 as built (L0 to L2 took about five hours of work); no slot carries a day estimate.

**Journey steps.** Each slot moves its steps out of `prototypes/station/tools/journey-pending/` (the file and step ids each slot names) into the journey on the face, and adds the steps it names as new. A pending file is deleted when its last step moves; `journey.mjs` lists the files that remain on every run.

### The gate every overview slot passes (L2.2, R, V, L and P)

Each overview slot passes checks 1, 2's measurable half, 3, 4, 5, 7, 8, 9 and 10 at its capture points. Deferred: check 2's signatures, until the section's masters are placed; check 6, until B4b; and the capture points of deeper levels and of states outside the slot, until the depth slot that builds them (each slot lists them under **Later**).

1. **Regions:** every region the face draws in each of the slot's states equals its spec, read from the region log. Zero departures.
2. **Pixels:** every text run's ink lies inside its region, and each capture point's golden (§2.8) is held to the spec through checks 1, 3 and 4. The goldens are taken on WebAssembly with `prototypes/face/tools/goldens.mjs`, drawn twice and equal, committed with their PNGs in `prototypes/face/golden/<screen>/`, and held in CI by `goldens.mjs --check`. They are committed unsigned, as a record. They are retaken and signed against the signed wireframes when the section's masters are placed.
3. **Palette:** chrome and art passes have 0 pixels off palette at every capture point.
4. **Type:** every run is Inter at its size from the face's fonts, with no refusal and no digits in `noDigits` regions.
5. **Journey green on the face:** the slot's steps pass on the face, and their focused targets and intents equal `prototypes/face/golden/journey-<screen>.json` (§2.8; the save hash only with a pinned clock).
6. **Goldens on three builds:** each capture point's hash is equal on WebAssembly, native x86-64 and native aarch64. From B4b, for every slot built until then, and for each later slot at its build.
7. **Budgets:** no refusal; objects, pictures and props sizes printed under budget.
8. **Reduced motion:** with `motion: false` every capture point equals its end state.
9. **Conformance:** technical-architecture.md §5.7 checklist, plus: no coordinates in the view, no geometry in JavaScript outside `derive.mjs`, the screen glue DOM-free and running in the Node host.
10. **Not built yet, replaced:** the screen's binding table (for L2.2, Cargo's as well as Home's and Idle's) lands in `prototypes/face/src/screens/`, its view sends its own states in place of `notBuilt`, and the import guard (§5.1) stays green with no exemption.

The depth slots pass the same gate, check 6 included, with check 2's signatures still waiting for their section's masters.

### L2.0 Platform, and Pods on C words (size: about 2 × L2)

- **Scope.** The bridge (`bridge/`, `face-lvgl.mjs` rewritten as a transport), the spec loader, the primitives with layer and region tags, real clip, composed pictures, the frame words (top bar, bottom line, message plate, focus ring, panel), Pods' words (list, specimen, stamp label, chapter rail, chapter page) and their layout rules. Then the focus graph with `order` and `nearestIn`; animation for `seal`, `wipe`, `ribbon`, `plate`, counters, turn flash and the screen transition; the metrics table; `bake-images.mjs`; test mode with logs and three passes; `face_sdl`, `face_drm` (cross-built) and qemu hashes; the Node host running Pods. `gfx.mjs` is split into `pixels.mjs` (kept) and the drawing half (deleted at B4a).
- **Builds.** L2.0 lands in three builds.
  - **B3:** Pods' words, the focus port, the rings, the plates, the metrics table and `bake-images.mjs`. Pods' word vectors (`prototypes/face/tests/vectors/pods-words.json`, `frame-words.json`, `focus-ring-words.json`), recorded against the JavaScript drawing, are the parity record.
  - **B4a, the JavaScript face removed,** in three changes. B4a-1 moves what stays off what goes, with nothing visible changed: pictures as `{ w, h, rgba() }` (`ui/assets.mjs`, the masters, `podsprites.mjs`, `podmasters.mjs`, `art.mjs`; `face-lvgl.mjs` takes RGBA), `beamArt` from `screens/frame.mjs` into `art.mjs`, `cross-layout.mjs` into `ui/specs/derive.mjs` as the oracle of `splicePlan`, DOM-free `intents/` for the frame, Home, the Incubator, the Library, the Vivarium (`habitat`), Create and Pods, and `present.mjs` sending the tick and flash events. B4a-2 boots the sandbox on the face: `main.mjs` is the host with no flag, sending the frame's props for every screen, Pods' props, and `notBuilt` for every other screen (§2.2); room keys, ← and Idle's wake work on every screen; the developer panel gains "Open the crates"; `face-check.mjs` loads `/sandbox/station/`; `frame-check.mjs` is deleted. B4a-3 deletes the JavaScript drawing layer and its tests and images (§5.2), moves the face's node exports into a test build (`-DFACE_NODE_API`) used by the face tests, and adds the import guard (§5.1).
  - **B4b:** `face_sdl`, `face_drm`, the aarch64 hash under qemu-user, `station/host/` on `face_sdl`, Pods' goldens and Pods' journey-sequence golden.
- **Acceptance.** The four Pods states and Compare pass the gate's checks 1, 3, 4 and 6 to 9; for check 2, the word vectors are the parity record and Pods' goldens are signed at B4b. `face_test` passes the focus, layout and metrics vectors. The sandbox boots the face, every screen with no binding table draws "not built yet", and room keys, ← and Idle's wake work from each. The Node host plays Pods against `face_sdl` from a fresh world.
- **Tests.** `face_test` (native C: JSON vectors exported from `ui.test.mjs`, `rail.test.mjs` and `page.test.mjs`, and the focus tests). `metrics.test.mjs` (JavaScript metrics equal the WebAssembly face on every Station string). `bridge.test.mjs` (contract round trip, refusals, a version mismatch). `pods-props.test.mjs` asserts props only.
- **CI gates.** Face builds (WebAssembly, native, aarch64), `face_test`, the journey on the face, goldens for Pods, the import guard.
- **Focus.** The port implements §2.6.1 whole: the four edge forms with the ordered list, `order`, `nearestIn` with `ahead`, the `roomKey` origin and the integer scores, with `focus.json`'s vectors green in `face_test` and in `focus.mjs`. Pods' view resolves `kin.first` to `null` when the pod has no kin, and the UI designer writes the way on into `pods.json` so the single edges' moves are kept: `overview.pod.right` `["kin.first", "hatch"]` and `overview.hatch.up` `["kin.first", "none"]`. At slot 8 (the Book and the field guide), when the figure becomes a target, `pod.right` becomes `["figure", "kin.first", "hatch"]`; before Identify the figure is not present and the list goes on to the kin.
- **Pods' two captions.** `pods.json` `regions.overview.thisPod` (144, 520, 224, 24; string `thisPod`, always in the overview) and `regions.overview.figure.caption` (432, 400, 128, 24; string `theSpecies`, only when the pod is identified) are drawn by the text word at L2.0. Measured on `pods.json`: in the overview both lie on the bench ground (0, 40, 1024, 522) and overlap no other region. They are a new feature with no JavaScript twin, held to gate checks 1, 3 and 4: check 1 finds each in the region log at its spec rect in every overview capture where it shows (the caption only when identified, and absent before); check 3 and check 4 as for any run (Inter 16 from the face's fonts, `mist`, no refusal). Each run's ink lies inside its region. The goldens of the overview captures that show them are signed as the gate's check 2 says.

### 1. Title marks (size: small)

- **Scope.** The four marks placed 1:1 from `art/device-buttons/marks/` with `place-masters.mjs --only`: `frame-room-home-24`, `frame-room-vivarium-24`, `frame-room-research-24`, `frame-room-library-24`. `frame.json` `regions.marks.room.vivarium` is `frame-room-vivarium-24`, and `cross.json`'s frame names `frame-room-vivarium-24`. The mark draws at (16, 8, 24, 24) on every screen but Idle, `notBuilt` included.
- **Acceptance.** Each placed file's sha256 equals its master's; `place-masters.mjs --check` has 0 problems. Pods' eight goldens are retaken, and in each state the pixels that differ lie inside (16, 8, 24, 24): 0 outside it. `layer-check.mjs` has 0 pixels off palette in all eight states.
- **CI gates.** `goldens.mjs --check`, `place-masters.mjs --check`, the import guard.

### 2. L2.2 Home, Cargo and Idle (size: about 1.5 × L2)

- **Scope.** Three specs loaded. **Home** (`home.json`, one state, `home`): the vivarium panel (the living window: residents seeded in props and walking in C, the with-you bed, the name tag, the rest knob) and the column of five modules, Cargo, Pods, Incubator, Probe and Library, each with its objects, lamp and states; the crates sliding into the Cargo module on Dock (`events.crateIn`); the knob's rest (`events.rest`). Home's focus as `order` and `nearestIn` in `home.json`, replacing `nav.mjs` `homeMove`. **Cargo** (`cargo.json`, states `bay`, `opening`, `report`): its own section on the whole stage, opened from the Cargo module, where the crates open; the bay with up to three sealed crates (conditions `docked` and `away`), the crates sliding in on Dock while it shows (`events.crateIn`), the opening one crate at a time with the ribbon, the counters, the pods travelling to the rack and the turn (`events.opening`, input held), the report card, and the hand-off to Pods' collection (`handoff`), with pods that find no free well waiting in the bay (`regions.waiting`). **Idle** (`frame.json` `idle`, `props.idle`): the Vivarium's whole without the frame, one painting over 1024×568, its residents and the bed's sleepers, and its line, entered from the rest knob or the 60 s timer, with the first press sending `wake`.
- **Sitting crates.** They stay out of L2.2 until the portrait's reveal is specified (`station-layouts.md`, Not designed yet). No sitting crate is drawn in Cargo's bay (`cargo.json` `regions.crates.sitting`, the slice `crate-sitting-256x176`, the ribbon's `sitting` string) or in Home's Cargo module (`home.json` `regions.cargo.sittingCrates`, `crate-sitting-48x40`); away, the bay is shut and the Cargo module's lamp is off; ✓ Open the bay and the `crates` notice count walk crates only. The Probe module's `sitting` state (a held sitting, the gilt frame) is not a crate and is built.
- **Scope rulings.** L2.2 builds the compositions `module` and `nameTag` and the `leaves` word's grid form (Home's Incubator module), which `home.json` uses (§2.2). Home has no status strip: Home's layout has none (`station-layouts.md` Home §2: the modules show it by shape), so no region, word or props carry it. Idle's line is the `idleLine` composition (§2.2), in the frame's binding table. Home's graph uses §2.6.1 as written in `home.json`: `order` for the column, `nearestIn` for ◀ ▶ between the column and the residents and from the room (origin `roomAt`'s centre), `nearestIn` with `ahead` for the residents' ▲ ▼ and ◀. The journey's resident moves are deterministic because the residents' boxes come from the seed and the face's clock, which the test steps (§2.7).
- **Acceptance.** The gate, at these capture points, named by their spec's state. `home`: `home-docked` (the bed's `docked` sleepers, the Cargo module `crates`), `home-away` (bed `away`, Cargo `away`, Probe `away`), `home-fresh` (a fresh world: bed `none`, Cargo `empty`, Incubator `empty`, Library `empty`) and `home-waiting` (Cargo `waiting`); a `home-<region>-<state>` capture covers each other state a region lists in `home.json` (for example `home-knob-pressed`, `home-incubator-ready`). `cargo`: `cargo-bay` (`docked`, one to three walk crates), `cargo-bay-empty` (`docked`, none), `cargo-bay-away` (the bay `shut`), `cargo-opening` at each step of `events.opening.crate` (at 0, 200, 500, 800, 1200 and 1650 ms of a crate) and at its `end`, `cargo-report`, and `cargo-report-waiting` (a pod in `regions.waiting`). `idle`: `idle-docked`, `idle-away` and `idle-none` (`frame.json` `idle.regions.bed.states`), each with the line `idle.strings.order` gives. Dock while idle wakes, docks and lands on Home with the ring on the room, and the crates slide into the Cargo module (`frame.json` `idle.keys.dock`). The opening holds input for crates × 3000 + 200 ms, and the report's ✓ lands on Pods' collection as `cargo.json` `handoff` says. With the same seed, the residents' paths give the same framebuffer hash when drawn twice on WebAssembly, and on all three builds from B4b (check 6).
- **Journey steps.** Six, each written against `home.json`'s column (Cargo, Pods, Incubator, Probe, Library), the rest knob and `cargo.json` before it moves. `home-pad`, `home-rack`, `home-dock-arrival` and `home-lamp-moved` run on the face, held to `prototypes/face/golden/journey-home.json`. `home-bay` and `idle-vivarium` stay in `journey-pending/L2.2.mjs` until they move.
- **Later.** None: Home, Cargo and Idle have no deeper level.
- **Tests.** `nav.test.mjs`'s Home walk and `home.json` `focus.vectors` as focus vectors (`focus.json`); Cargo's `events.opening` and `events.crateIn`, Home's `events.crateIn` and `events.rest`, and Idle's `enter` and `wake` as timeline tests.
- **CI gates.** The gate for `home`, `cargo` and `idle`.

### 3. R: Create and the Incubator (size: about 1 × L2)

- **Scope.** `create.json` and `incubator.json`. Create's roll among three pictures (a ▲▼ stepper), changed tags, the clash marks, the total on the bottom line. The Incubator's dome, bud, leaves (stepped per minute from props), tabs clearing, stamp and code, Grow now, the hatch event and the hand-off to the Vivarium's meet.
- **Scope rulings.** R builds the `leafArc` layout rule (with its oracle in `derive.mjs` and its `layout.json` vectors), the `leaves` word's arc form with the `growNow` fill, the frame word's `stage` part, and the `dither` event with `bayerPick` and its string `from` (§2.2, §2.7), unless an earlier slot needs one of them first, in which case that slot builds it.
- **Acceptance.** The gate. `page-create`, `page-incubator` and `page-hatch` captured on the face, and a `<screen>-<state>` capture for each state the specs list: `create-nothingRead`, `create-shape`, `create-grow`, `incubator-empty`, `incubator-growing`, `incubator-ready` and `incubator-hatch`. Grow it jumps to the Incubator; Choose a pod (an empty Incubator) jumps to Pods' collection; the hatch holds input, and Open after it sends the jump to the new mibi up close in the meet, which draws "not built yet", titled Vivarium, until V.
- **Journey steps.** All four of `journey-pending/R.mjs` (`create-walk`, `create-grow`, `incubator-states`, `incubator-empty`).
- **Later.** None: Create and the Incubator have one level each.
- **Tests.** `leafArc`'s `layout.json` vectors in `face_test`, equal to `derive.mjs`; `create.json` and `incubator.json` `focus` as focus vectors (`focus.json`); Create's founder dither and the Incubator's events, the hatch held, as timeline tests.
- **CI gates.** The gate for `create` and `incubator`.

### 4. V: the Vivarium, whole and up close (size: about 1.25 × L2)

- **Scope.** The Vivarium's whole, the `vivarium` screen, from its spec: every mibi at home at its size in one full-width window, the bays along the foot, ✓ on a resident or a bay tile to that mibi up close, ← to Home with the ring on the panel. One mibi up close (`habitat.json`) in rest and meet: the resident large, card, stamp, the carried set's door, the card's heart (a state, never a target), the bays strip, the meet with its placeholder, and the targets that lead to Cross, the Sitting and the guide, which draw "not built yet" until their slots. The compositions `module` (with `lamp: null` on the Vivarium's modules), `nameTag`, `chapterPlates` and `bayStrip`, and `listPitch`'s forms (§2.2, §2.3). The Vivarium's graph as data: named edges, `nearestIn` with `ahead`, ordered lists, the strip's `axis`, in place of `nav.mjs` `habitatMove`. The namer (`namer.json`) as an overlay on the top layer (§2.2, §2.6); the meet's first ✓ opens it.
- **Acceptance.** The gate. `page-vivarium`, `page-vivarium-away`, `page-vivarium-empty` (a fresh world's), `page-mibi-out`, `page-habitat`, `page-meet`, `page-meet-placeholder` and `page-namer` captured on the face. `page-meet` and `page-meet-placeholder` differ from one another. From a fresh world the loop plays end to end on the face (§4).
- **Journey steps.** From `journey-pending/V.mjs`: `vivarium-pad`, `vivarium-card`, `vivarium-meet` and `vivarium-trickle`. New: `vivarium-whole` (Home's panel opens the whole; a resident opens that mibi up close; ← from up close is the whole, ← from the whole is Home) and `vivarium-namer` (the meet's first ✓ opens the namer; Done names the mibi and hands the ring back).
- **Later.** `page-habitat-compact`, `page-painted` and `page-offline` (slot 10); Cross (slot 7); the guide from the card's species word (slot 8); the Sitting (slot 9).
- **Tests.** The whole's, `habitat.json`'s and `namer.json`'s `focus` as focus vectors (`focus.json`); the hatch's landing in the meet and the namer's open and close as timeline tests.
- **CI gates.** The gate for `vivarium`, `habitat` and `namer`.

### 5. L: the Library spread (size: about 0.5 × L2)

- **Scope.** The spread from `library.json`, its regions transcribed from `station-layouts.md` "Library spread" §5: the boards (8, 48, 1008, 504), the pages (24, 56, 480, 488) and (520, 56, 480, 488), sixteen frames of 96×112 on a 112 px pitch in two rows of four a page, the found plate and the met study at 80×96 inside an 8 px mat, the clan rule, the names and caption rules, the margin life, the cloth marker (500, 48, 24, 264) and the page-turn corner (968, 512, 24, 24) when another spread exists. Its focus as data: ◀ ▶ along a row and across the gutter, ▲ ▼ between rows, ← Home. ✓ on a found or met frame opens that species' Book, which draws "not built yet" until slot 8. The composition `spreadPage` (§2.2). The stage slice `library-stage-spread-1024x522` holds the frames, mats, caption rules, margin life and marker. The page-turn corner is not drawn while `frameIds()` holds sixteen.
- **Acceptance.** The gate. `library-spread` (found, met and unmet frames) and `library-spread-empty` (a fresh world, the journal empty) captured on the face.
- **Journey steps.** New: `library-spread` (the Library module and the Library key open the spread; the pad walks the frames; an unmet frame has no ✓ cap; ← is Home).
- **Later.** The Book's face spread, the guide spread and the guide journey's captures (slot 8).
- **Tests.** The spread's `focus` as focus vectors (`focus.json`). `library.test.mjs` unchanged.
- **CI gates.** The gate for `library`, the spread.

### 6. P: the Probe bench (size: about 0.5 × L2)

- **Scope.** `bench.json` in the states `docked` and `away`: the bench's plates, switch and slot, the composition `shieldPlates`, the bench's focus as data, its events and bottom line. Its intent table (`intents/bench.mjs`). ✓ on Home's Probe module opens it; ← is Home.
- **Acceptance.** The gate. `page-bench`, `page-bench-away`, `page-bench-armed` and `page-bench-tier2` captured on the face.
- **Journey steps.** All of `journey-pending/P.mjs`: `probe-bench`.
- **Later.** None: the Probe has one level.
- **Tests.** `bench.json` `focus` as focus vectors (`focus.json`); the bench's events as timeline tests.
- **CI gates.** The gate for `bench`.

### 7. Cross with the splice (size: about 1 × L2)

- **Scope.** `views/cross.mjs` as props: the forecast's chapters, loci, gates, seeds, ranges, kinship and the wish, as data. The splice's row plan is `layout/splicePlan` (C), with its oracle in `derive.mjs`. Wires, ticks, dashed edges and gates are composed pictures per chapter block. Portraits, the ghost and seeds are generated pictures by id. Partner ◀▶ and the chapter walk ▲▼ are steppers. Cross them jumps to the Incubator.
- **Acceptance.** The gate. The S09 chapter view with everything read (1,772 nodes in the JavaScript layer) draws in at most 400 objects. The splice's row plan equals `derive.mjs` for all sixteen frames (the test of `cross-splice.test.mjs` on the C side). `cross-overview`, `cross-chapter`, `page-cross`, `page-child` and `page-cross-siblings` are captured on the face.
- **Journey steps.** All four of `journey-pending/slot-7-cross.mjs` (`cross-open`, `cross-splice`, `cross-siblings`, `cross-room-key`).
- **Tests.** `cross-splice.test.mjs` and `cross-read.test.mjs` re-pointed at props; nothing of an unread chapter is in the props (the read-only rule, enforced at the contract).
- **CI gates.** The gate for `cross`.

### 8. The Book and the field guide (size: about 0.75 × L2)

- **Scope.** `library.json` and the guide's rules and model (`library.mjs`, `guide.mjs`, on `main` without drawing). Views as props: the Book face, the guide spread with columns by chapter, tinted panels as composed lattices, pips in fives, the detail band with plates and carriers, the page turn. The intent table `intents/library.mjs` and the guide's moves (`guideMove`). The Book's focus from the spec. Masters by id; the fold-out and page-turn stand-ins registered. Pods' figure becomes a target (§4, L2.0, Focus).
- **Acceptance.** The gate. The Book face and the guide are held to `library.json`, the nine rulings and the signed wireframes (`10a`, `10b`). The guide journey's captures (`guide-*`, `book-*`, the no-carrier case) are produced from the LVGL face.
- **Journey steps.** All five of `journey-pending/slot-8-book-and-guide.mjs` (`pods-figure-guide`, `book-visit`, `habitat-species-row`, `book-guide-turn`, `guide-captures`).
- **Tests.** `guide.test.mjs`, re-pointed at props. `library.test.mjs` unchanged.
- **CI gates.** The gate for `library`, the Book and the guide.

### 9. The Sitting (size: about 0.75 × L2)

- **Scope.** `sitting.json` in the states pose, place, confirm and begin: choice cards, step tiles, the gilt part, the backdrop dither and the gilt's dither out. It is built when its art is placed.
- **Acceptance.** The gate. `page-sitting-pose`, `page-sitting-place` and `page-sitting-armed` captured on the face. The Sitting has no JavaScript twin: it is held to checks 1, 3 and 4 and to the designer's signed wireframe, as the field guide is.
- **Journey steps.** All of `journey-pending/slot-9-sitting.mjs`: `sitting-first-screen`.
- **CI gates.** The gate for `sitting`.

### 10. The Vivarium's remaining states (size: about 0.25 × L2)

- **Scope.** One mibi up close compact, offline and painted, and the placeholder-to-painting landing in the meet.
- **Acceptance.** The gate. `page-habitat-compact`, `page-painted` and `page-offline` captured on the face; `page-meet`, `page-meet-placeholder` and `page-painted` differ from one another.
- **CI gates.** The gate for `habitat`.

### L3 Close-out

- **Scope.** The switch closed: every Station screen has its binding table, so no screen draws `notBuilt`, and `journey-pending/` holds no step. The goldens are the reference for every screen.
- **Acceptance.** The full journey is green on the face. `checks.mjs` has zero failures on every capture point. Every screen has goldens and a journey-sequence golden. The budgets fail CI from here. The Node host plays the whole journey against `face_sdl` from a fresh world.
- **CI gates.** As slot 10, with the budgets failing.

## 5. The import guard, and what B4a deletes

### 5.1 The import guard

`prototypes/face/removed.json` lists every path B4a deletes (§5.2). `prototypes/face/tools/guard.mjs` runs in the site workflow, which runs on every pull request into `main` as well as on `main`, and fails when:

1. a path in `removed.json` exists again;
2. any file imports a removed path (an import scan over `prototypes/**/*.mjs`);
3. `canvas`, `getContext` or `putImageData` appears under `prototypes/station/src/` or `prototypes/ui/`, except in `face-lvgl.mjs` `present()` and in the image decoders `guard.mjs` names, until `png.mjs` decodes their images;
4. JavaScript outside `prototypes/face/tests/` names an export of the face's node API, which only the test build (`-DFACE_NODE_API`) has;
5. `registerScreen` is given `draw`, `nodes` or `faceNodes`;
6. an LVGL object is created (`lv_*_create`) in `prototypes/face/src/` outside `prim/`; the display and the input device (`lv_display_create`, `lv_indev_create`) are the platform's.

The guard has no exemptions.

### 5.2 What B4a deletes, and what stays

Lines measured on `main` at `1f5aa8e2` (`views/pods.mjs` at B3).

| Path | Lines |
| --- | --- |
| `prototypes/ui/scene.mjs`, `context.mjs`, `layout.mjs` (its rules in `specs/derive.mjs`), `type.mjs`, `type-node.mjs` | 80, 3, 76, 32, 11 |
| `prototypes/ui/render/station-canvas.mjs`, `browser.mjs`, `canvas-assets.mjs` | 126, 16, 7 |
| `prototypes/ui/components/*.mjs` (14 files: bottomLine, chapterPage, chapterRail, focusRing, frame, list, mark, messagePlate, panel, slantRail, specimen, stampLabel, text, topBar) | 500 |
| `prototypes/ui/fonts/atlas/*`, `prototypes/ui/tools/bake-type.mjs` (`metrics.json` and the C fonts in their place) | data, 80 |
| `prototypes/station/src/gfx.mjs`, the drawing half (`PB` and the palette helpers are in `pixels.mjs`) | 75 |
| `prototypes/station/src/screens/*.mjs`: home, bench, incubator, create, habitat, library, frame, pods, cross (their intent logic in `intents/`, `beamArt` in `art.mjs`) | 166, 65, 61, 79, 101, 78, 96, 166, 92 |
| `prototypes/station/src/views/cross.mjs`, `views/pods.mjs`, `cross-layout.mjs` (in `derive.mjs`) | 223, 250, 28 |
| `prototypes/station/src/face-lvgl.mjs`'s node path (`scene`, `keyOf`, the clip cut); the file stays as the transport | — |
| The face's node API (`face_node`, `face_node_tag`, `face_node_refused` in `face.c`): out of the page's exports, into the test build (`-DFACE_NODE_API`) the face tests use | — |
| `main.mjs`: the `?face` flag, `legacy`, the `Scene`, `bootStationCanvas`, `SC`, `checkSnapshot`'s canvas reads; the file stays as the host | — |
| Tests of the deleted modules: `ui.test.mjs`'s scene, layout and component tests (its timeline and manifest tests stay), `rail.test.mjs`, `page.test.mjs`, `type.test.mjs` (the closed-set lint a C lint; coverage on the C fonts' ranges), `pods-view.test.mjs` | — |
| Tools: `prototypes/face/tools/frame-check.mjs` (its measures in the words, animation and ring tests, the regions loop and `checks.mjs`); `freeze-check.mjs`, `deprecated.json` and `freeze.test.mjs` (the import guard in their place) | 198, 151, data, — |
| The JavaScript face's images; the journey captures them from the face | — |

**Kept:** `ui/assets.mjs`, `ui/png.mjs`, `ui/podlayers.mjs`, `ui/rings.mjs` (the oracle of the ring ops and the generator of `rings.json`), `ui/timeline.mjs`, `ui/focus.mjs` (the second run of the focus vectors, for good), `ui/specs/` (`derive.mjs`, `measure.mjs`), `ui/palettes/`, `ui/fonts/inter/` (the source the C fonts are baked from), `ui/assets/`, `ui/tools/place-masters.mjs`; `ui/tests/specs.test.mjs`, `masters.test.mjs`, `podlayers.test.mjs`; every rule module and the asset producers; `station/src/views/frame.mjs`, `views/pods-props.mjs` and `intents/`; `face-lvgl.mjs` as the transport; the logic the Node host runs headless under S1.

## 6. Risks

| Risk | Assessment | Mitigation |
| --- | --- | --- |
| **Object counts.** The splice draws 1,765 one-pixel rects (measured, S09) and the guide's dashes do the same at a smaller scale | High: over a 512-object table, and slow on the Pi | Composed pictures (§2.2); object budget asserted; table grown so a breach is measured |
| **Views written as props** (Cross's and the guide's JavaScript views emitted nodes) | Certain: each screen milestone includes its view, larger than "views stay" suggests | Props schemas per screen; geometry to `derive.mjs` (oracle) and `layout/` (C); the conformance item "no coordinates in the view" checked in review |
| **Synchronous measure** across the Pi's process boundary | Certain under S1 | Fitting in the face; the metrics table with its equality test |
| **The playability gap** from B4a until Home and Cargo and Create and the Incubator are on the face | Certain: a fresh world plays Pods only, through Dock and "Open the crates" | L2.2 comes first; `loop.test.mjs` and the journey's rule steps keep the loop tested through the hooks; the developer panel gains no button per unbuilt screen (§4) |
| **Deleted code still reached** (the Companion, the Caddy, the website, the face's node exports) | Low | The import guard (§5.1); the Companion and the Caddy import nothing deleted; the website only links to the sandbox |
| **The parity record** | Low: B3's word vectors are the last comparison with the JavaScript drawing | B3 merges with its layer fixes before B4a; Pods' goldens are signed at B4b |
| **Missing spec files** for the Vivarium's whole, the Library spread and the Probe bench | Certain; it can stall V, L and P | The UI designer delivers one slot ahead (§3); no build from old numbers |
| **Type shifts.** LVGL's whole-pixel advances move the last letters 1 to 4 px against the atlases (L1, measured) | Low, known | The face is the reference; the UI designer re-signs the type on each screen's goldens |
| **Builders' speed in C** | Medium: a component change is a compile (5 to 40 s) and debugging in the browser is clumsy | `face_sdl` with a debugger; spec edits hot without compile; words small and tested natively |
| **Determinism across builds** (WebAssembly, x86-64, aarch64) | Low: equal hashes measured for WebAssembly and native; aarch64 not yet measured | Hash equality on the three builds is a gate from B4b (§4, check 6); any difference is investigated before goldens are committed |
| **A new vendored dependency** (jsmn) | Low | MIT, one header, notices updated; a 300-line parser of our own is the fallback |
| **The Pi proof waits for hardware** | Medium: the budgets are unproven until then | Hardware-independent budgets asserted now; native timings printed; levers in §2.10 that do not change the contract |
| **Two processes on the Pi** (face and Node) | Medium | The face keeps drawing the last props and shows a still frame if Node restarts; it reconnects; it holds no game state; `hello` checks the contract version |
| **CI time** | Low: about 5 min for the job after B4a, the journey run once, on the face | Budgets: the face job at most 4 min after B4b, the whole job at most 12 min |

## 7. Files this spec touches when built

New: `prototypes/face/src/{platform,bridge,spec,prim,vocab,layout,screens}/`; `prototypes/face/src/vendor/jsmn.h`; `prototypes/face/tools/{guard,bake-images}.mjs`; `prototypes/face/removed.json`; `prototypes/face/golden/` (with `journey-<screen>.json`); `prototypes/face/tests/vectors/`; `prototypes/station/host/`; `prototypes/station/src/{intents,pixels.mjs}`; `prototypes/station/tools/journey-pending/`; `prototypes/ui/specs/{derive,measure}.mjs` and `*.props.json`. Changed: `prototypes/face/{CMakeLists.txt,build.sh,lv_conf.h,README.md}`, `prototypes/face/tools/face-check.mjs`, `prototypes/station/src/{main.mjs,face-lvgl.mjs,dev.mjs,present.mjs,art.mjs,views/*}`, `prototypes/station/tools/{journey,checks}.mjs`, `.github/workflows/site.yml`, `THIRD_PARTY_NOTICES.md`. Deleted: the paths of §5.2.

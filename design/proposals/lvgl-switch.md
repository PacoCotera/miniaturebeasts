# The LVGL switch: development spec

**Decided** (owner, 2026-10-09 11:53: Q1 (a), Q2 yes, Q3 (a)), architect, 2026-10-09 11:40 (America/Mexico_City), on the owner's decision of 2026-10-09 11:27: "deprecate the javascript layer." Measured against `main` at 3e017843 and the frozen `field-guide` branch at 5927d91d.

**Amended** (architect, 2026-10-09 12:25, within the owner's 2026-10-08/09 decisions): the focus graph's edge forms, `nearestIn` with `ahead`, and the ordered edge (§2.6); `idleLine` as a composition (§2.2); Pods' two caption regions drawn at L2.0 (§4 L2.0); the status strip struck from L2.2 (§4 L2.2). These answer open questions 1, 9 and 10 of the L2.2 spec (`station-layouts.md`, PR #27) and the salvage review (PR #28).

**Amended** (architect, 2026-10-09 13:24, within the owner's 2026-10-08/09 decisions), for L2.4: the `leafArc` layout rule, the `leaves` word and the frame word's `stage` part (§2.2, §2.3); the `stepper` form of a focus group (§2.6.1); the `dither` event between two pictures (§2.7); L2.4's scope (§4 L2.4).

This spec finishes what [technical-architecture.md §8](technical-architecture.md#8-assessment-the-real-lvgl-face-in-the-sandbox-now) started. It is a separate document because §8 is the assessment that led to the decision, while this is the build plan; §8.4 and §8.5 point here. Where the two differ, this document governs the build.

**Decided** (owner, 2026-10-08): the sandbox's Station face switches to LVGL 9 compiled to WebAssembly, before more screens are built on the JavaScript layer. The device runtime is S1: an LVGL face in C, with the logic run headless by Node beside it. **Decided** (owner, 2026-10-09 11:27): no new screen or screen feature is built on the JavaScript drawing layer. The remaining screens move to the LVGL face (L2 for every screen, then L3), and the field guide is built on LVGL. Rules, views, specs and assets stay in JavaScript and data.

## 0. Summary

- **Where the face started.** At the audit (§1, `main` at 3e017843) the LVGL face, landed at L2 (ee1be339), was a *scene interpreter*: the JavaScript components computed every rectangle, string and picture, and `scene.c` turned those nodes into LVGL objects. Only Pods (and the frame on other screens) was drawn this way; seven screens and Idle were drawn by hand-coded JavaScript, and no key left the face as an intent. What the face is built of now is §2 as it lands, milestone by milestone (§4), and the face's README (`prototypes/face/README.md`).
- **What it must become.** A face that takes *props* and gives back *intents*. The vocabulary's components, the layout rules, text fitting, the focus graph and animation all move into C. The views, rules, intent tables, spec files and assets stay in JavaScript and data. The same wire format runs in the page (WebAssembly) and over a local socket on the Pi.
- **The plan.** Six milestones from here to L3. L2.0 builds the platform and re-lands Pods on C components. Then, in order: the Library with the field guide; Home with Rest, Dock and Idle; Cross with the splice; Create and the Incubator; Habitat and the Probe bench. L3 deletes the JavaScript drawing layer. Each milestone is gated by region and pixel checks against the spec and by the journey running green on the LVGL face.
- **The freeze.** From the first commit, a CI check fails on any change to a deprecated drawing module, and on any new import of one.
- **Three questions for the owner** (§6): the default face during the switch, the new CI checks as one bundle, and what to salvage from the frozen field-guide branch.

## 1. Audit: what the LVGL face draws today, against what the JavaScript layer draws

This audit is as of `main` at 3e017843 (2026-10-09), before L2.0. "Today" in it means that commit. It is kept as measured, because the plan was made from it; it is not the state of the face as the milestones land. For the face as built, read §2 and the face's README (`prototypes/face/README.md`), which lists each source file and what it does.

### 1.1 How the page chooses a face

`prototypes/station/src/main.mjs` `render()`: with `?face=lvgl` the page calls `FACE.scene(faceNodes(), faceEnv)`. `faceNodes()` is the stage ground (a rect from `frame.json`) followed by `screen.faceNodes(CTX)` when the screen has one, otherwise `frameFor(CTX, UI.screen, lineFor())`: the frame alone. Without the flag, a screen with `nodes()` goes through the retained JavaScript scene (`ui/scene.mjs`) and the layered canvas renderer (`ui/render/station-canvas.mjs`). Every other screen is one `legacy` node whose callback runs the screen's own `draw()` through `gfx.mjs` (`R`, `blit`, `text`, `panel`, `focusRing`, `ditherFill`). The JavaScript layer is the default (`prototypes/face/README.md`, `design/style-guide/sign-off.md`).

Only one screen has `faceNodes`: Pods (`screens/pods.mjs`: `function faceNodes(ctx) { return nodes(ctx); }`). Cross has `nodes()` but no `faceNodes`. Home, Incubator, Create, Habitat, Library and the Probe bench have `draw()` only.

### 1.2 The face itself (prototypes/face)

| Part | What it does today | Evidence |
| --- | --- | --- |
| Core | A 1024×600 ARGB8888 display in direct mode; dirty rectangles (up to 64, else full); FNV-1a framebuffer hash; a key queue into an LVGL keypad input device | `src/face.c`: `face_init`, `face_frame`, `flush_cb`, `face_hash`, `face_key`, `key_read_cb` |
| Scene interpreter | Nodes `rect`, `text`, `sprite` (1:1, or a crop window into a larger picture), `nine` (insets and tile) become LVGL objects kept by id; draw order is child order; anything else is refused and counted. Limits: 512 objects, 256 pictures, a 1 KiB text buffer | `src/scene.c`: `scene_node`, `scene_end`, `views_of`, `MAX_OBJ 512`, `MAX_ASSET 256` |
| Clip | Not a face primitive. The page cuts each clipped sprite to the window that lies inside the clip, and sends that window as a cropped sprite | `station/src/face-lvgl.mjs` `scene()`, branch `n.kind === "clip"` |
| Text | Inter 16, 20 and 28 px as LVGL C fonts baked by `lv_font_conv` 1.5.3. Measurement is a **synchronous** call (`FACE.measure`), so the views lay text out with LVGL's integer advances | `src/fonts/*.c`, `tools/bake-fonts.sh`, `scene_measure`; `main.mjs` replaces `CTX.measure` with `FACE.measure` |
| Pictures | RGBA pixels copied from a page canvas into the face's heap, once per asset id, with a 256-slot LRU | `face-lvgl.mjs` `handleOf` |
| Keys | Passed in (`FACE.key(k)` in `act()`), counted, then discarded. No group, no focus, no intent goes out. The page handles every key itself | `main.mjs` `act()`; `face.c` `face_key_count` |
| Builds | WebAssembly (Emscripten 4.0.23 pinned), and a headless native Linux binary that draws `selftest.c`'s fixed scene and prints its hash. No SDL, DRM or evdev driver is enabled | `CMakeLists.txt`, `build.sh`, `lv_conf.h` (`LV_USE_SDL 0`, `LV_USE_LINUX_DRM 0`, `LV_USE_FLEX 0`, `LV_USE_GRID 0`) |
| Checks in CI | Node: the module loads, redraws, takes keys, and its hash equals native (`tests/face.test.mjs`). Browser: load time and copy cost (`tools/face-check.mjs`); the frame and the four Pods states against the canvas renderer, at most 0.1% (frame) and 0.2% (states) of pixels outside the type boxes differing by more than 3 per channel, both rings, the plate, the counter's tick (`tools/frame-check.mjs`); fonts re-baked and diffed | `.github/workflows/site.yml` steps "Station face …" |

### 1.3 Screen by screen

"On the face" means drawn by LVGL with `?face=lvgl`. "Coordinates" means rectangles written in the screen's JavaScript rather than read from a spec file.

| Screen or overlay | Drawn by today (default) | On the face | Spec file | Evidence and gaps |
| --- | --- | --- | --- | --- |
| **Frame** (top bar, bottom line, rules, marks, counters, turn flash) | JavaScript components `ui/components/frame.mjs`, `topBar.mjs`, `bottomLine.mjs`; presenter `station/src/present.mjs` | **Yes**, as nodes the JS components build (L1) | `frame.json` | `screens/frame.mjs` `frameFor`; parity in `frame-check.mjs` |
| **Message plate** | `components/messagePlate.mjs`, placed by `ui/layout.mjs` `messagePlate`; timed by the timeline's `plate` event (4 s, `game.mjs` `msg`) | **Yes** (L1) | `frame.json` `plate` | |
| **Focus ring**, layered screens | `components/focusRing.mjs` (round, circle, tab ring; masks from `ui/rings.mjs`) | **Yes** on Pods | `frame.json` `focus` | |
| **Focus ring**, legacy screens | `gfx.mjs` `focusRing`: the old 3 px amber ring, pulsing every 500 ms, with target rectangles typed into each screen | **No** | none | `home.mjs` `homeTargets`, `habitat.mjs` `targets`, `bench.mjs` `benchTargets` (for example `tgt("plate", 120, 380, 300, 60)`) |
| **Navigation** (room keys, ← to parent, Idle's first press) | Logic only: `station/src/nav.mjs` (`roomTop`, `parentOf`, `backWord`, `homeMove`, `habitatMove`), `main.mjs` `act`, `openRoom` | The same logic runs under both faces | `frame.json` `navigation` | Built after the 10-08 decision (merge c07b8b6b). Pure data and functions: it carries over. `homeMove` and `habitatMove` are focus orders in JavaScript, which §2.6 moves into the spec's graph |
| **Pods** (collection, overview, chapter, Compare; Identify seal, Read wipe, ribbon, hatch arm) | Layered: `views/pods.mjs` → `ui/components/*` → scene → canvas | **Yes, whole** (L2) | `pods.json` | The view imports geometry: `slantTabs` and `pageGrid` from `ui/layout.mjs`, `placeRect` and `kinRect` from `components/list.mjs`, `wrap` from `components/text.mjs`. Focus targets carry rectangles (`targetsOf`) |
| **Home** (living window with residents and bed, bay and crates, rack, small Incubator, Probe cradle, status strip, Rest lamp, arrival ribbon, report card) | Legacy `screens/home.mjs` `drawHome`, `drawTray`, `drawIncSmall`, `drawCradle`, `drawBay`, `drawArrivingPods`, `drawArrivalRibbon`, `drawReport`, `drawStatusStrip`; residents `screens/frame.mjs` `stepResidents`, `drawResidents` | **Frame only** | `home.json` exists but is **not loaded** (`main.mjs` loads `frame`, `pods`, `cross`) | Coordinates: `VIV`, `BENCH` constants. Rest is the lamp target (`homeAct`: `UI.idle = true`) |
| **Dock and arrival** | `home.mjs` `dockKey`, `openBay`; the crates slide in over 500 ms, staggered 250 ms; arrivals 3 s each with input locked (`ARRIVE_MS`, `lockInput`) | **No** (frame only) | none beyond `home.json` `ribbon`, `report` | The Dock key is the Caddy's, a world event, not a Station key (`act`: `if (k === "dock")`) |
| **Incubator** (dome, bud, leaves a minute, tabs clearing, stamp and code, Grow now, hatch) | Legacy `screens/incubator.mjs` `draw`, `drawHatch` (`HATCH_MS` 2.6 s) | **Frame only** | **none** (layout in `station-layouts.md` "Incubator") | |
| **Probe bench** | Legacy `screens/bench.mjs` `draw` | **Frame only** | **none**, and no section in `station-layouts.md` (only `station-screens.md` "Probe bench") | Coordinates: `benchTargets` |
| **Create** | Legacy `screens/create.mjs` `draw` | **Frame only** | **none** (layout in `station-layouts.md` "Create") | |
| **Habitat** (resident large, card, stamp, with-you door, bond heart, bays strip; the meet after a hatch) | Legacy `screens/habitat.mjs` `draw` | **Frame only** | **none** (layout in `station-layouts.md` "Habitat") | Coordinates: `targets()` (for example `tgt("cross", 636, 250, 374, 46)`); a crop of the vivarium art (`cropPB`) |
| **Cross with the splice** | Layered, but `views/cross.mjs` returns *scene nodes*, with geometry from `cross-layout.mjs` (`overviewPlan`, `chapterPlan`); the bench ground is a legacy node (`benchBg`) | **Frame only** (no `faceNodes`) | `cross.json` | Built after the 10-08 decision (merge 3e017843). Measured worst case: **1,772 nodes** for S09's chapter view when both parents have read every chapter, 1,765 of them rects of 4 px² or less (wires, dashes, ticks). That is 3.5 times the face's 512-object table, before the rail and the frame |
| **Library spread** | Legacy `screens/library.mjs` `drawSpread` | **Frame only** | none on `main`; `library.json` on `field-guide` | Coordinates: `FRAME` constants |
| **Book and field guide** | `main`: the Book stub `drawBook`. `field-guide` (frozen): `views/guide.mjs` returns scene nodes; `screens/library.mjs` mixes legacy `drawBook` with layered `guideNodes` | **Frame only** | `library.json` (field-guide) | Measured worst case on the branch: 247 nodes (S09: 182 rects, 39 texts, 6 sprites) plus 20 masters; tints are generated masks (`tintMask`) |
| **Idle** (the vivarium alone, wake on first press) | Legacy `screens/bench.mjs` `drawIdle` | **No**: `render()` takes the face path before it checks `UI.idle`, so the face keeps drawing the last screen | none | `main.mjs` `render()` |
| **Screen transition** (180 ms Bayer dither) | `main.mjs` `render()` `legacy("trans", … ditherFill …)` | **No** | none | |
| **Sitting** | No screen yet; rules headless in `sitting.mjs` | — | none | Its first screen is built on LVGL (§4) |
| **Developer panel** (timers, economy, limits, seeds, skip-to, inspect) | DOM under the device (`station/src/dev.mjs` `buildDevPanel`), never on the 1024×600 screen | Not applicable | — | Stays page-side; see §2.10 |
| **Test hooks** (`window.__st`) | `capture`, `check`, `layer`, `region`, `typeLog`, `sceneRegions` read the canvas renderer (`SC`) and the JS scene | `capture` reads the visible canvas; `faceNodes`, `face.hash`, `face.refused` | — | Re-pointed to the face's logs (§2.7) |

### 1.4 The checks today, and what they cover

`prototypes/station/tools/journey.mjs` plays the journey on the **JavaScript face only** (it never sets `?face=lvgl`). `tools/checks.mjs` measures what the journey recorded. The art layer must have 0 pixels off palette and every type run must be Inter at its size from the atlases, both from the canvas renderer's layers. Region boxes are compared with the spec, but by a hand-written case per region id and only for Pods and the frame (`checks.mjs` reads `pods.json` and `frame.json`; Cross is never region-checked). The L2 plan's "the journey run against both faces" (§8.4) did not land.

### 1.5 What the audit means for the plan

1. The vocabulary still lives in JavaScript. L2 moved the *drawing* to LVGL, not the *components*. The Companion and the Caddy need those components in C (decision 3 and S1), so they must move. Making more screens emit nodes would mean building more components in JavaScript, which is now the deprecated layer.
2. The views are not yet pure props. Pods' view computes geometry through the JS layout and text modules, and Cross's and the guide's views return scene nodes. Each view gets a props refactor when its screen moves (§2.1).
3. A synchronous `measure` cannot cross the Pi's process boundary (S1: Node and the face are two processes). Text fitting moves into the face, and views that choose words by width use a metrics table that equals LVGL's (§2.5).
4. Fine line work (the splice's wires, the guide's dashes) cannot be one object a pixel run. The component draws it into a picture of its own (§2.2).
5. The default path has no face-side checks. Journey, palette, type and regions all have to be re-pointed at the face (§2.7).

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
| `props` | `{ t, seq, screen, state, idle, motion, frame: { top, line, plate }, regions: { <region id>: {…} }, focus: { targets, resolve, edges?, armed?, set? } }` | Whenever the view's output changes (hashed on the JavaScript side, as `face-lvgl.mjs` `keyOf` does today). The whole screen is sent, and the face diffs by region |
| `event` | `{ t, kind, target, ms, hold, from?, to? }` | When the timeline plays one (§2.7) |
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

**Decided** (architect, 2026-10-09 13:16, within the owner's decisions): five additions to contract 1, accepted at the review of L2.0's bridge. `hello.test` (bool) turns test mode on; `asset.drop` (bool) releases a picture slot by id; `ready.limits.props` gives the props budget in bytes; `ready.test` echoes test mode; and the sandbox's transport is `face_send(len)` over the face's own `face_in_buf`, in place of `face_send(ptr, len)`, so the host never allocates in the face's heap. The contract number stays 1.

**The intent table stays JavaScript.** Each screen's intent table (today `INTENTS` and `act` in `screens/pods.mjs`) maps `{ target group, verb }` to one rule call. Its result becomes the next state, and timeline events become `event` messages. Arm-then-confirm (the hatch, the bond heart) stays in the intent table, and the face draws the armed state from `focus.armed`. Input holds stay on the JavaScript timeline: while `TL.holding()` the dispatcher drops intents, and the face, which also knows from the event's `hold` that one is playing, does not move focus.

**Screen glue becomes DOM-free.** For S1 the screens' JavaScript must run in Node. Each screen becomes three modules: `views/<screen>.mjs` (state and focus to props), `intents/<screen>.mjs` (the intent table and the screen's UI state), and its spec file. None of them imports `gfx.mjs`, `document` or a canvas. The page and the Pi host differ only in the save adapter and the transport.

**The view's output.** Props name *what*, never *where*: strings, states (`read`, `sealed`, `unread`), counts, asset ids, flags, and the target list with ids and enabled states. A region's props are checked against a JSON schema kept beside the spec file (`<screen>.props.json`), which also documents the contract for the builder. Pods' current view output is the starting point once its rectangles are removed.

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
screens/    one binding table a screen: region id → word, and the compositions the UI designer named (module, rest knob, with-you bed, report card, idle line, splice, guide spread)
```

**Decided** (architect, 2026-10-09 12:25, within the owner's 2026-10-08/09 decisions): `idleLine` is a composition in `screens/`, not a word. It lives in the frame's binding table (`screens/frame.c`), because Idle is a state of the frame (`props.idle`), and it owns the two regions of `frame.json` `idle.regions`: `strip` (built with the `panel` word) and `line` (built with the `text` word, which fits it to the spec's one line), with colours and rules as `frame.json` gives them. Each of the two regions names both its word and the composition (`"component": "panel", "build": "idleLine"` and `"component": "text", "build": "idleLine"`), so the region log records the word that drew it. Its props are one string, `props.frame.idle.line`; an empty string sets no type, and what the strip shows then is the spec's. It adds no word and no layout rule. Used by Idle alone; a second user brings it back to the UI designer and the architect.

**Decided** (architect, 2026-10-09 13:24, within the owner's 2026-10-08/09 decisions): the ninth derived rule, the `leaves` word and the frame word's `stage` part.

- **`leafArc`** (`layout/`). Leaf boxes on two arcs, from two slot tables in the spec (an inner arc and an outer arc), each holding `2·perArc − 1` slots; the loader refuses a table of any other length. Leaves fill the inner arc left to right, then the outer arc: the inner arc holds the first `min(n, perArc)` leaves and the outer the rest. Leaf `j` (from 0) of the `k` leaves on an arc takes slot `perArc − k + 2j` of that arc's table (`20 − k + 2j` for the Incubator's `perArc` of 20). The rule refuses `n > 2·perArc`. Its JavaScript oracle is `leafArc(region, n)` in `ui/specs/derive.mjs`; its vectors are in `prototypes/face/tests/vectors/layout.json`, every `n` from 0 to 40, and 41 refused.
- **`leaves`** (`vocab/station/`). Leaves that fill as a bud grows, in two forms. The grid form, for Create and Home's Incubator module, takes from the spec `leaf` (the leaf's size), `pitch`, `perRow`, `rowPitch`, `rows`, `max` and `pictures: { empty, full }`. The arc form, for the Incubator, places its leaves by `"layout": ["leafArc"]`. Props: `{ total, full, rows }`, with `0 ≤ full ≤ total ≤ max`, `rows` from 0 to 11, and `rows = 0` when `full = total`; the props schema (§2.1) holds these bounds. Leaf `i` (from 0, `i < total`) is full when `i < full`; filling when `i = full < total`, drawn as its empty sprite with the bottom `rows` rows of the full sprite over it (a window of the full picture); else empty. One sprite per leaf, on the art layer. The word plays the Incubator's `growNow` fill (§2.7).
- **The frame word's `stage` part.** The first child of the screen tree, under every other region. With a `slice` it is one sprite of that picture on the painted layer; with none it is a rect in `colours.stageGround` on the chrome layer. The loader refuses a stage whose rect differs from `frame.json` `regions.stage.rect` (0, 40, 1024, 522), or a slice that is not 1024×522.

- **Primitives.** Rectangle; text (a run of Inter, with ⚡ ◆ ❀ ✕ placed inline as 16 px sprites, as `components/text.mjs` `runs` does); sprite (a picture 1:1, or a window of a larger one); nine-slice (corners 1:1, edges and middle tiled, never scaled; `scene.c` `views_of`); and clip, made a real face primitive (an LVGL parent object that clips its children, LVGL's default with `LV_OBJ_FLAG_OVERFLOW_VISIBLE` left clear, in place of the page-side cut in `face-lvgl.mjs`). Every primitive carries its **layer** (`chrome`, `art`, `painted`, `type`) and its **region id** for the checks.
- **Composed pictures.** A component that needs fine line work (the splice's 1 px wires, ticks and dashed edges; the guide's dashed slots, pips and tint lattice) draws it once, per props change, into a picture the face owns. It shows that picture as one sprite. It is still the closed set (a sprite) and still exact in palette colours with no anti-aliasing, but it costs one object instead of 1,765. The drawing code is a small set of C helpers (`hline`, `vline`, `dash`, `dot`, `lattice`, and `bayerPick` for the `dither` event of §2.7) writing palette colours into an ARGB8888 buffer. No paths, no anti-aliasing, no opacity.
- **Words.** Each word of the closed vocabulary (`station-layouts.md` "The vocabulary (closed)") is one C module with a constructor (a region's object tree, built from the spec) and an update (props in, objects changed only where the props differ). A word never reads the save, never measures from outside, and never decides content.
- **Profiles for the other devices.** Words take their palette, fonts and colour format from a `face_profile`: Station 1024×600 ARGB8888 with Inter; Companion 450×600 on the 48-colour palette with Mibi 7×9 and anti-aliasing off; Caddy 792×272 in four grays. The `common/` words compile for all three. Station-only words stay in `station/`. A new word still goes to the UI designer and the architect first (technical-architecture.md §5.4 step 3).
- **Budgets the library enforces** (counted in CI, §2.7): at most 400 LVGL objects on a Station screen (the table grows from 512 to 1,024 so a breach is measured rather than refused); at most 200 pictures resident; a text run of at most 1 KiB.

### 2.3 How the spec files bind to LVGL objects

The spec files (`prototypes/ui/specs/station/*.json`) are the one home of the numbers. The face reads them at run time (sandbox and Pi), so a nudge needs no compile. The Companion and the Caddy later get them compiled to C tables (§8.1).

1. **Loading.** The face parses each spec with a small vendored JSON parser (jsmn, MIT, one header, recorded in `THIRD_PARTY_NOTICES.md`) into a region tree: id, rect, word or `build`, its parameters, colours by palette name, strings, and the focus section.
2. **Instantiation.** For each screen, one LVGL screen object, built once and kept. Each region becomes one container at its spec rect, absolute (no flex, no grid: `lv_conf.h` already has `LV_USE_FLEX 0`, `LV_USE_GRID 0`). The word's constructor builds its children inside, and `user_data` holds the region id. Switching screens is `lv_screen_load`, with the transition of §2.7.
3. **States.** A spec with `states` (Pods: collection, overview, chapter, and Compare) marks which regions exist in each state. `props.state` picks one. Regions outside the state are hidden, not destroyed.
4. **Derived geometry.** Where the spec names a rule rather than a rect (the rail's compaction and slants, the page grid by trait count, the plate's position over a focal box, the list's pitch, the splice's row plan, the guide's columns, pips in fives, the Incubator's leaf arcs), the word calls the C function of that name in `layout/`, with the spec's table and the counts from props. The rules are the closed list in `station-layouts.md`. A rule that is not in `layout/` is refused at load, not improvised.
5. **The oracle stays in JavaScript.** The same derived rules, as pure functions of the spec, move from `ui/layout.mjs`, `components/list.mjs` (`placeRect`, `kinRect`), `cross-layout.mjs` and `views/guide.mjs` (`guideLayout`) into `prototypes/ui/specs/derive.mjs`. They draw nothing. They are the reference the regions check compares the face against (§2.7), and later they generate the ESP32 tables. Two independent implementations of each rule, checked against each other on every capture, catch the mistakes a single one would hide.
6. **Lint.** Every drawn region in a spec names its word (`component`) or composition (`build`). Today only `frame`, `home` and `pods` do, partly. `specs.test.mjs` (an existing suite) gains the assertion, and `cross.json` and `library.json` gain the names when their screens move.

### 2.4 Assets

- **The manifest stays the authority** (`ui/assets.mjs`: id, size, policy, status, slice, tile, placeholders counted). The face never invents an asset. It refuses a picture whose size is not its slot's, which `scene.c` already does for sprites.
- **Masters.** The PNGs in `ui/assets/masters/` (index with SHA-256) are converted at build time by `prototypes/face/tools/bake-images.mjs` (Node, using `ui/png.mjs`) into LVGL 9 binary images: ARGB8888 with straight alpha, optionally lz4 (`LV_USE_LZ4` from the vendored tree). Both faces load the same `.bin` bytes, so the sandbox has no colour management in the browser's PNG decode and the Pi needs no PNG decoder (`LV_USE_LODEPNG 0` stays). The existing "placed masters match their index" check extends to the baked files.
- **Generated pictures** (the placeholder pods, emblems, beams, rings, tints, stamps, rig renders and painted crops from `art.mjs`, `pictures.mjs`, `podmasters.mjs`, `podlayers.mjs`, `ui/rings.mjs`) stay in JavaScript, as the logic's asset producers under S1. Their RGBA must come without a canvas: `gfx.mjs`'s `PB`, palette and dither helpers move to `station/src/pixels.mjs`, which converts palette indexes to RGBA directly, so Node can run them. In the sandbox the pixels go into the face's heap. On the Pi the Node host writes them, atomically, into the image cache as `.bin` files named by id and content hash, and the face loads them by path.
- **Never scaled.** `gfx.mjs` `scalePB` and `upPB` are used today inside `art.mjs` (`paintedArt` scales a crop when the sizes differ). That is a departure from the never-upscaled rule. It is listed for the art pipeline, and the face cannot scale in any case.

### 2.5 Fonts and text

- **Fonts.** Inter 16, 20 and 28 px stay LVGL C fonts baked by `tools/bake-fonts.sh` from `ui/fonts/inter/src`. CI already re-bakes them and diffs. Mibi 7×9 at 2× and 3× is baked the same way when the Companion comes.
- **Fitting is the face's job.** Wrap, clip with an ellipsis, centring, the cap-top placement (`scene.c` already converts the spec's cap top to LVGL's line top), and the name plate's width rounded to its step (`views/pods.mjs` `plateWidth`) all move into the text and panel words. Props carry the whole string and the spec carries the box and the line limit.
- **A metrics table for the views that choose words by width.** Some content choices depend on width, such as the ← word that fits (`nav.mjs` `backWord(…, fits)`) and number words against figures. For those, the native build exports `face/dist/metrics.json` from the compiled fonts: integer advances and kerning pairs, exactly what `lv_text_get_width` sums. `ui/specs/measure.mjs` sums the same table in JavaScript. A Node test asserts equality with the WebAssembly face on a corpus of every Station string (the strings in the spec files and the views' templates). There is no synchronous call across the bridge.
- **Coverage.** Every character the Station can set must be in the baked ranges. `type.test.mjs`'s coverage test is re-pointed from the atlases to the C fonts' ranges.
- **Retired at L3:** the atlas form (`ui/fonts/atlas/*`, `ui/tools/bake-type.mjs`, `ui/type.mjs`, `ui/type-node.mjs`), used only by the JavaScript type layer.

### 2.6 The focus graph

Focus moves into the face because the face knows where every target is drawn. Today the views compute target rectangles (`views/pods.mjs` `targetsOf`) and the legacy screens type theirs by hand.

- **Inputs.** From the spec: one graph per state (today `pods.json` `focus.collection` and so on, `home.json` `focus`). From props: `focus.targets`, the ids and enabled flags of what can be focused now, with no rectangles. `focus.resolve` gives the view's answers to the spec's selectors (`list.current`, `rail.last`, `kin.first`), which today are the `resolve` function in `screens/pods.mjs`. `focus.set` is an explicit jump requested by an intent result (go to a state, open a pod).
- **The rectangles** are the target regions as their words drew them, read from the face's region table, so the ring and the spatial fallback use real boxes.
- **The algorithm** is `ui/focus.mjs` ported exactly: an explicit edge, a selector, `none`, an axis that stops at the ends without wrapping, then the spatial fallback (nearest along the direction, crosswise distance weighted 2.2), with the edge forms and the integer arithmetic of §2.6.1. Its tests (`ui.test.mjs` "focus follows the graph …") become JSON vectors that both the C test binary and, until L3, the JavaScript module run.
- **Two graph primitives are added** so Home's and Habitat's fixed orders become spec data instead of code (`nav.mjs` `homeMove`, `habitatMove`): `order: [ids]` (a column walked in a fixed order) and `nearestIn: group` (spatial, restricted to one group, landing on the row nearest the ring). The UI designer writes them into `home.json` and the Habitat spec. `nav.mjs` keeps the tree (parents, ← words, room keys), which is logic. The exact semantics are §2.6.1.
- **The ring** is the `focusRing` word: shapes from `frame.json` `focus.ring` (round, circle, tab ring, the ellipse under a creature's feet) as nine-slices and sprites from masks, plus the creature's `lift`. The legacy amber pulsing ring (`gfx.mjs` `focusRing`) disappears with the legacy screens.
- **Keys.** Directions move the ring and send `focus`, except a stepper key, which sends `intent` with `step:<key>` and leaves the ring where it is (§2.6.1). ✓ and ← on a target send `intent`. Room keys send `intent` with `room:<k>` from any screen. On Idle the first press sends `wake` and nothing else (`main.mjs` `act`). The Caddy's Dock key never reaches the face: in the sandbox the page sends it straight to JavaScript, as `act("dock")` does, and on the Pi it arrives at Node over Wi-Fi.
- **Latency.** The ring moves on the frame of the key press. The bottom line follows when the new props arrive: the same frame in the sandbox, one or two frames on the Pi (budget §2.9).

#### 2.6.1 The graph's primitives, exactly

**Decided** (architect, 2026-10-09 12:25, within the owner's 2026-10-08/09 decisions). One semantics, run by `ui/focus.mjs` and the C port alike, so the JSON vectors give the same id on both. It lands with L2.0's focus port.

**Groups and ids.** A target's group is its `group`, else its id up to the first `.`. A target is *present* when its id is in `props.focus.targets` (enabled or not; an enabled flag changes what ✓ does, never where the ring may go).

**An edge** is the value of a group's `up`, `down`, `left` or `right`. It has four forms:

| Form | Example | Yields |
| --- | --- | --- |
| A name | `"pod"`, `"bay"` | The target with that id if present, else the first present target of that group in `props.focus.targets` order, else nothing |
| A selector (a name with a `.`) | `"kin.first"`, `"rail.last"` | `props.focus.resolve[selector]` if it is a present id, else the first present target of the group before the `.`, else nothing |
| `nearestIn` | `{ "nearestIn": "resident" }`, `{ "nearestIn": "resident", "ahead": true }` | Below, else nothing |
| An ordered list | `["figure", "kin.first", "hatch"]` | Each entry in turn, a name, a selector or a `nearestIn` object; the first entry that yields a present target wins, else nothing. `"none"` may stand only as the last entry, where it means the ring stays |

`"none"` as the whole edge means the key does nothing there. An empty list, `"none"` before the last entry, a list inside a list, and an unknown key in a `nearestIn` object are refused when the spec loads (§2.3), as is a group with both `order` and `axis`.

**A stepper.** **Decided** (architect, 2026-10-09 13:24, within the owner's 2026-10-08/09 decisions). A group may carry `"stepper": [keys]`: the keys, from `up`, `down`, `left` and `right`, that step a value on the focused target instead of moving the ring (Create's ▲▼ roll, Cross's ◀▶ partner, Compare's ◀▶ chapters). The list is non-empty and its keys distinct; their order does not matter. When the focused target's group lists the key, the face sends `{ t: "intent", seq, screen, target, verb: "step:<key>" }` with `target` the focused id; the ring stays and no `focus` message is sent. No edge, `order`, `axis` or fallback is consulted, and the target's enabled flag is ignored: the intent table decides what a step does, its ends and any wrap. While an event holds input (§2.1) nothing is sent. Refused when the spec loads (§2.3): an empty list; a duplicate or unknown key; a stepper key that also has an edge in the same group; `axis: "horizontal"` with `left` or `right` in the list, or `axis: "vertical"` with `up` or `down`; and `order` with `up` or `down` in the list.

**The order of a move.** (0) If the focused target's group lists the key in its `stepper`, the key steps (above) and the move ends. (1) The group's edge for that key: `"none"` stops; a yielded target is the answer. (2) If the edge yields nothing, or there is none: the group's `order` for ▲ ▼ (the list as written, skipping ids that are not present, stopping at the ends, never a wrap) or its `axis` (the group's present targets by `index`, stopping at the ends). (3) Else the state's `fallback`: `"spatial"` is the nearest target in any group (below); `"none"` leaves the ring where it is. A selector names what it names or nothing: the view resolves it to `null` when there is nothing (Pods' `kin.first` with no kin is `null`, not `hatch`), and the spec's list carries the way on, so no navigation is hidden in the view. `focus.mjs` and the C port return `{ to }` for a move, and `{ to: cur, verb }` for a step, with `cur` the focused id and `verb` `step:<key>`.

**Geometry, in integers.** Each target's box is the rectangle its word drew it at in the face's region table on the frame of the key (a resident's stepped sprite box, not its ring). Its centre is taken doubled, `(2x + w, 2y + h)`, so every quantity is an integer and JavaScript, WebAssembly, x86-64 and aarch64 cannot round differently. The origin is the focused target's doubled centre, or, when the focus is the spec's `roomKey` (a ring on nothing), the doubled centre of `focus.roomAt`. For a key with unit vector (dx, dy) and a candidate with doubled offset (vx, vy) from the origin: `along = vx·dx + vy·dy`, `across = abs(vx·dy + vy·dx)`. The focused target is never a candidate.

| Rule | Candidates | Score (least wins) | The JavaScript it replaces |
| --- | --- | --- | --- |
| `nearestIn: g` | Present targets of group `g` | `400·across + abs(along)` | `nav.mjs` `nearestTo(…, axisY = true)`: `abs(dy)·4 + abs(dx)·0.01` for ◀ ▶, the row nearest the ring; for ▲ ▼ the same rule takes the column nearest |
| `nearestIn: g, ahead: true` | Present targets of group `g` with `along > 12` (more than 6 px ahead) | `5·along + 11·across` | `homeMove`'s residents: `along + 2.2·across`, more than 6 px ahead |
| `fallback: "spatial"` | Every present target with `along > 8` (more than 4 px ahead) | `5·along + 11·across` | `focus.mjs` `nearest`: `along + 2.2·across`, more than 4 px ahead |

Each score is the JavaScript one multiplied by a positive constant (200, 10 and 10, on doubled centres), so the choice is the same. On an equal score the target earlier in `props.focus.targets` wins. `ahead` works for all four keys: Home writes it on the residents' ▲ ▼ and, by the owner's 2026-10-09 12:20 decision, on ◀ (`"left": { "nearestIn": "resident", "ahead": true }`), which also reaches two residents at the same height.

**Vectors.** `prototypes/face/tests/vectors/focus.json` holds every case: those of `ui.test.mjs` "focus follows the graph …", `nav.test.mjs`'s Home walk, the `vectors` of `home.json` `focus`, ties, the thresholds at exactly 6 px (not taken) and 6.5 px (taken) for `ahead`, and 4 px and 4.5 px for the spatial fallback, the `roomKey` origin, each ordered-list case (first entry present; first absent and second present; all absent with `"none"` last; all absent falling to the axis and to the fallback), each stepper case (each listed key giving `{ to: cur, verb }` on an enabled and a disabled target; a key the group does not list moving by steps 1 to 3), and each refusal, the stepper's included. `face_test` and `focus.mjs` both run it. `focus.mjs` is changed to this integer form at L2.0 (it is kept, not frozen, §5.2); `nav.mjs` `homeMove` is deleted at L2.2 when `home.json` carries Home's graph.

### 2.7 Animation

The rule: **the timeline in JavaScript decides that something plays and whether input is held; the face plays it.** Views stop reading `TL.progress` to compute in-between states. They send the end states, and the event carries the start.

| Kind | Today | On the face |
| --- | --- | --- |
| `seal` (Identify, 2 s, hold) | `TL.play`, `views/pods.mjs` `idCut` | The specimen word's cut, stepped per frame |
| `wipe` (Read, 2 s, hold) | `TL.play`, the rail's pips filled `ceil(p·n)` | The rail word fills pips over `ms`; the page wipes |
| `ribbon` | `TL.play` 6 s and up, shown from 70% of the seal | The ribbon word |
| `plate` (4 s) | `game.mjs` `msg` | The message plate word |
| Counters' tick (70 ms a unit, 240 ms flash) and the turn's flash (1 s, 160 ms blink) | `present.mjs` `createFramePresenter` | The top bar word, from old and new values |
| Screen change (180 ms, 16-level Bayer) | `main.mjs` `ditherFill` | A `dither` transition: 16 lattice pictures over the stage. No opacity |
| A region's picture changing (Create's founder: 200 ms, 16 levels) | — | A `dither` event between the two pictures, composed by `bayerPick` (below) |
| Grow now's fill on the Incubator | — | The `leaves` word's `growNow`: one whole leaf a step over 400 ms (§2.2) |
| Arrival (3 s a crate, input locked; crates slide 500 ms, staggered 250 ms), hatch (2.6 s), wake, Rest | `home.mjs`, `incubator.mjs`, `FX` fields | Named events on Home and the Incubator with whole-pixel slides |
| Residents walking | `screens/frame.mjs` `stepResidents` (random walk, `mulberry32`) | The living window word: positions stepped in C from a seed and bounds in props, the same seed giving the same path. Their boxes are focus targets (§2.6) |

**The `dither` event.** **Decided** (architect, 2026-10-09 13:24, within the owner's 2026-10-08/09 decisions). A `dither` event changes the picture on one region from one picture to another. The event carries `from`, the previous picture's id, which stays loaded until the event ends; the props carry the new one. At time `t` of the event's `ms`, the level is `L = min(16, floor(16·t / ms))`, and a pixel at screen coordinates (x, y) shows the new picture where `BAYER[(y & 3)·4 + (x & 3)] < L`, else the old one, with `BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]`. Whole pixels are copied: no blend, no opacity. The frame is composed by `bayerPick`, a helper in `prim/composed` beside `lattice` (§2.2), and shown as one sprite. A new event on the region while one plays cuts the playing one to its end first. With `motion: false` the event is a cut to the new picture. Its first user is Create's founder (200 ms, 16 levels).

Constraints: positions move in whole pixels. No LVGL opacity is used on the chrome or art layers, because an alpha blend leaves the palette; fades there are stepped dithers. Painted and type layers may blend, as decided. `props.motion = false` (from `prefers-reduced-motion`, today `gfx.mjs` `motion`) makes every event jump to its end. The face's clock is the host's milliseconds through `face_frame(ms)`, so a test can step it and capture a frame at any point of an event.

### 2.8 Checks against the LVGL framebuffer

Everything the sign-off measures (technical-architecture.md §5.6) is re-pointed at the face. In test mode (`?face=lvgl&test`, or the native headless binary) the face writes a log at each capture point and can render passes.

| Check | Measured from | Status |
| --- | --- | --- |
| **Regions** | The face's region log, `{ region, rect }` per drawn region, written by `prim/` from the word that drew it. Each is compared with its spec rect, or with `ui/specs/derive.mjs` for a derived one. This replaces `checks.mjs`'s hand-written cases with one generic loop over every screen | Approved check (decision 2), re-pointed |
| **Pixels, during the switch** | Framebuffer against the JavaScript renderer's capture of the same state, outside the type boxes: at most 0.2% of pixels differing by more than 3 per channel (L2's measure in `frame-check.mjs`). Ink of each text run within its region, and within 4 px of the JavaScript run (L1's measure) | Exists for Pods; extended per screen |
| **Pixels, after a screen moves** | **Golden framebuffers**: the hash of each journey capture point, committed in `prototypes/face/golden/<screen>.json`, with the PNG for review. WebAssembly, native x86-64 and native aarch64 (under qemu-user in CI) must give the same hash, as WebAssembly and native already do (`5fc5fdc5`, `3456b1be`) | **New**, needs approval (§6 Q2) |
| **Palette** | Three passes per capture point (§8.1): chrome only, chrome and art, everything. 0 pixels off palette on the first two; type pixels tinted from palette colours | Approved check, re-pointed |
| **Type** | The text word's log: string, font id, px. Every run Inter 16, 20 or 28 from the baked fonts; no refused glyph; no digits in `noDigits` regions | Approved check, re-pointed |
| **Size, stamp label, rail tabs, placeholders** | Frame size asserted; stamp label 120×120 with the stamp ≤ 104 inside; tab count equals the chapters; placeholders counted from the manifest | Approved, re-pointed |
| **Refusals and budgets** | `refused` = 0; objects ≤ 400 a screen; pictures ≤ 200; props ≤ 32 KB; printed per capture point | Printed; fail on refusals only, the budgets fail from L3 |
| **Same play, both faces** | The journey's key presses on both faces give the same sequence of focused targets and the same final save (hash of the save JSON) | Part of the journey (approved suite), extended |
| **Freeze** | §5 | **New**, needs approval |

### 2.9 Native Linux and WebAssembly builds

| Target | Display and input | Used for | CI |
| --- | --- | --- | --- |
| `face_wasm` | The page's canvas (dirty rectangles copied, as `face-lvgl.mjs` `present` does); keys from the page | The sandbox | Built and tested (exists) |
| `face_native` (headless) | A memory framebuffer; keys from a script | Golden hashes, the C unit tests (`face_test`: layout, focus and metrics vectors), the per-screen draw timing | Built and run (exists; grown) |
| `face_sdl` | An SDL2 window at 1:1; keyboard | Builders' debugging with a real debugger, against `station/host/` (the logic in Node over the socket): S1's shape on a laptop | Built only |
| `face_drm` (aarch64) | Linux DRM/KMS dumb buffer, XRGB8888 at 1024×600 (the 7" HDMI panel, `design/devices.md`); evdev keys | The Pi | Cross-compiled (gcc-aarch64-linux-gnu); the headless twin runs under qemu-user for the hash. Not run on hardware until the hardware phase (owner, 2026-10-08) |

- One `lv_conf.h`. The drivers (`LV_USE_SDL`, `LV_USE_LINUX_DRM`, `LV_USE_EVDEV`) are switched per target by CMake definitions. LVGL stays the unmodified vendored 9.6.0 (`v1/native/vendor/lvgl`).
- `platform/` is the only per-target code. `face.c` stays platform-neutral, as it is now.
- The Node host, `prototypes/station/host/main.mjs`, imports the same views, intents, rules, asset producers and save adapter as the page. It writes the save to a file atomically and connects to the face's socket. It is what runs on the Pi under S1.
- System packages come from the runner's apt (`libsdl2-dev`, `libdrm-dev`, `gcc-aarch64-linux-gnu`, `qemu-user`). There is no new paid or networked service.
- Build time today: 35 s (WebAssembly) and 39 s (native) clean on CI (`prototypes/face/README.md`). Budget for the whole face job after L3: at most 4 minutes with the SDK cached, and the full sandbox job at most 12 minutes (5 min 13 s today).

### 2.10 Performance budgets for the Pi 4 proof

The proof runs when the hardware phase starts (owner, 2026-10-08: no hardware until the loop is complete in software). Until then, CI measures the hardware-independent half on every capture point and prints the native x86-64 timings as an early warning.

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
| Sandbox | `face.wasm` ≤ 1.5 MB (≤ 600 KB gzipped; 348,437 B with fonts today); load and initialise ≤ 50 ms; full-frame copy ≤ 16.7 ms with the CPU throttled 4× (13.2 ms today) | Measured in CI (exists) |

If a budget is missed on hardware, the levers in order are: partial redraw discipline (no full-screen invalidation outside screen changes); `LV_DRAW_SW_DRAW_UNIT_CNT` 2–4 with a pthread OS layer; NEON blending (`LV_USE_DRAW_SW_ASM`); composed pictures for busy regions; and as a last resort a smaller image cache. None of these changes the contract.

### 2.11 What stays where

| Stays JavaScript and data | Moves into C | Deleted at L3 |
| --- | --- | --- |
| `state.mjs`, `sitting.mjs`, `library.mjs`, `genome.mjs`, `splice.mjs`, `caddy.mjs`, `game.mjs` (minus drawing), `nav.mjs` (tree, words, room keys); views as props; intent tables; the timeline (holds); `dev.mjs`; the spec files and `ui/specs/derive.mjs`, `measure.mjs`; the manifest; asset producers (`art.mjs`, `pictures.mjs`, `podmasters.mjs`, `podlayers.mjs`, `podsprites.mjs`, `ui/rings.mjs`, `pixels.mjs`); `png.mjs`; the journey and checks | The words, the layout rules, text fitting, the focus graph, animation, the ring, clip, composed pictures, transitions, Idle's composition | §5.2 |

The developer panel stays a DOM panel under the device in the sandbox (station-build.md §2.5: never a device key). On the Pi, developer settings are flags of the Node host. The face draws neither.

## 3. Screen order

| Milestone | Screens | Why here |
| --- | --- | --- |
| **L2.0 Platform, and Pods on C words** | Bridge, spec loader, primitives with clip and composed pictures, the frame words, Pods' words, focus, animation, test logs, native SDL and aarch64 builds, the freeze | Pods is at pixel parity today and has a JavaScript reference to compare with. It is the safest place to prove the C words and the bridge before any new screen depends on them |
| **L2.1 Library: spread, Book and the field guide** | `library.json` (from `field-guide`), spread, Book face, guide spread, detail band | The owner's decision names it. Its spec carries nine rulings already, and its rules exist. It is built on LVGL first and is never drawn in JavaScript on `main` |
| **L2.2 Home, Rest, Dock and arrival, Idle** | `home.json` (exists), the Idle composition, the report card | The hub: the journey starts and ends there. Residents prove the living window's animation, and Dock proves the event path |
| **L2.3 Cross with the splice** | `cross.json` | The heaviest screen (1,772 nodes as built). It needs the composed pictures from L2.0 and the rail from Pods |
| **L2.4 Create and the Incubator** | New spec files from `station-layouts.md` "Create" and "Incubator" | Share the rail, the stamp label and the specimen chamber with Pods |
| **L2.5 Habitat and the Probe bench** (and the Sitting's first screen when its spec lands) | New spec files; the Probe bench needs its layout section first | Last, because their specs are the least ready |
| **L3 Switch** | — | LVGL is the only face; the JavaScript drawing layer is deleted |

**The spec dependency.** Create, Incubator, Habitat, the Probe bench and Idle have no spec file. The Probe bench and Idle have no layout section either (`station-layouts.md` has none; `station-screens.md` describes them). The UI designer delivers each spec file one milestone ahead: Idle with L2.2, Create and Incubator before L2.4, Habitat and the Probe bench before L2.5. A milestone without its spec waits. It is never built from the old screen's numbers.

## 4. Milestones

Every milestone ships to the sandbox and plays from a fresh world. The save does not change in any of them. Sizes are relative to L2 as it landed. L0 to L2 took about five hours between the first L0 commit (d98729a7, 2026-10-08 22:21 UTC) and the L2 merge (ee1be339, 2026-10-09 03:16 UTC), against §8.4's estimate of 11 to 15 days, so the day estimates are withdrawn.

### The gate every screen milestone passes (L2.1 to L2.5)

1. **Regions:** every region the face draws in each of the screen's states equals its spec, read from the region log. Zero departures.
2. **Pixels:** against the JavaScript capture of the same state, at most 0.2% of pixels outside the type boxes differ by more than 3 per channel, and every text run's ink lies inside its region and within 4 px of the JavaScript run. A new feature with no JavaScript twin (the field guide) is held to the spec through checks 1, 3 and 4 and to the designer's signed wireframe. Its golden capture is committed only once the UI designer and the art director sign it.
3. **Palette:** chrome and art passes have 0 pixels off palette at every capture point.
4. **Type:** every run is Inter at its size from the face's fonts, with no refusal and no digits in `noDigits` regions.
5. **Journey green on `?face=lvgl`:** the screen's journey steps pass on the LVGL face with the same focused-target sequence, the same intents and the same final save hash as on the JavaScript face (while it exists).
6. **Goldens:** each capture point's hash is committed, equal on WebAssembly, native x86-64 and native aarch64.
7. **Budgets:** no refusal; objects, pictures and props sizes printed under budget.
8. **Reduced motion:** with `motion: false` every capture point equals its end state.
9. **Conformance:** technical-architecture.md §5.7 checklist, plus: no coordinates in the view, no geometry in JavaScript outside `derive.mjs`, the screen glue DOM-free and running in the Node host.
10. **Deletion:** with Q1 as recommended, the screen's JavaScript drawing is deleted in the same change (its `draw`, `nodes`, `faceNodes`, and the views' node-emitting code), and its paths leave the freeze list (§5.1).

### L2.0 Platform, and Pods on C words (size: about 2 × L2)

- **Scope.** The bridge (`bridge/`, `face-lvgl.mjs` rewritten as a transport), the spec loader, the primitives with layer and region tags, real clip, composed pictures, the frame words (top bar, bottom line, message plate, focus ring, panel), Pods' words (list, specimen, stamp label, chapter rail, chapter page) and their layout rules. Then the focus graph with `order` and `nearestIn`; animation for `seal`, `wipe`, `ribbon`, `plate`, counters, turn flash and the screen transition; the metrics table; `bake-images.mjs`; test mode with logs and three passes; `face_sdl`, `face_drm` (cross-built) and qemu hashes; the Node host running Pods. The freeze check lands as this milestone's first commit, after `gfx.mjs` is split into `pixels.mjs` (kept) and the drawing half (frozen).
- **Acceptance.** The four Pods states and Compare pass the gate (checks 1 to 9) against today's JavaScript captures. `frame-check.mjs`'s measures still pass. `face_test` passes the focus, layout and metrics vectors. The Node host plays Pods against `face_sdl` from a fresh world. Pods' view no longer imports `ui/layout.mjs` or `ui/components/*`.
- **Tests.** `face_test` (native C: JSON vectors exported from `ui.test.mjs`, `rail.test.mjs` and `page.test.mjs`, and the focus tests). `metrics.test.mjs` (JavaScript metrics equal the WebAssembly face on every Station string). `bridge.test.mjs` (contract round trip, refusals, a version mismatch). `pods-view.test.mjs` asserts props only.
- **CI gates.** Face builds (WebAssembly, native, aarch64), `face_test`, the journey on both faces, goldens for Pods, the freeze check.
- **Focus. Decided** (architect, 2026-10-09 12:25, within the owner's 2026-10-08/09 decisions). The port implements §2.6.1 whole: the four edge forms with the ordered list, `order`, `nearestIn` with `ahead`, the `roomKey` origin and the integer scores, with `focus.json`'s vectors green in `face_test` and in `focus.mjs`. Pods' view resolves `kin.first` to `null` when the pod has no kin, and the UI designer writes the way on into `pods.json` so today's moves are kept: `overview.pod.right` `["kin.first", "hatch"]` and `overview.hatch.up` `["kin.first", "none"]`. At L2.1, when the figure becomes a target (salvage review, PR #28), `pod.right` becomes `["figure", "kin.first", "hatch"]`; before Identify the figure is not present and the list goes on to the kin.
- **Pods' two captions. Decided** (architect, 2026-10-09 12:25, within the owner's 2026-10-08/09 decisions). `pods.json` `regions.overview.thisPod` (144, 520, 224, 24; string `thisPod`, always in the overview) and `regions.overview.figure.caption` (432, 400, 128, 24; string `theSpecies`, only when the pod is identified) come to `main` with the salvage (PR #28) and are drawn by the text word at L2.0; the frozen JavaScript face never draws them. Measured on the salvage's `pods.json`: in the overview both lie on the bench ground (0, 40, 1024, 522) and overlap no other region. They are a new feature with no JavaScript twin, held to gate checks 1, 3 and 4: check 1 finds each in the region log at its spec rect in every overview capture where it shows (the caption only when identified, and absent before); check 3 and check 4 as for any run (Inter 16 from the face's fonts, `mist`, no refusal). In check 2 both rects are masked out of the pixel comparison with the JavaScript capture and their two runs are left out of the "within 4 px of the JavaScript run" clause; the clause that each run's ink lies inside its region still applies. The goldens of the overview captures that show them are committed only once the UI designer and the art director sign them, as the gate says for any new feature. L2.0 therefore needs PR #28 merged first.

### L2.1 Library: spread, Book and the field guide (size: about 1 × L2)

- **Scope.** `library.json` and the guide's rules and model taken from `field-guide` (§6 Q3). Views as props: the spread, the Book face, the guide spread with columns by chapter, tinted panels as composed lattices, pips in fives, the detail band with plates and carriers, the page turn. The intent table from `screens/library.mjs` and the guide's moves (`guideMove`). Spread and Book focus from the spec. Masters by id; the fold-out and page-turn stand-ins registered.
- **Acceptance.** The gate. The spread and Book face are compared against today's JavaScript captures (check 2). The guide is held to `library.json`, the nine rulings and the signed wireframes (`10a`, `10b`), with its goldens signed by the UI designer and the art director. The guide journey's captures (`guide-*`, `book-*`, the no-carrier case on `field-guide`) are produced from the LVGL face.
- **Tests.** `guide.test.mjs` from the branch, re-pointed at props. `library.test.mjs` unchanged.
- **CI gates.** The gate's checks for `library`.

### L2.2 Home, Rest, Dock and arrival, Idle (size: about 1.5 × L2)

- **Scope.** `home.json` loaded. The living window (residents seeded in props, walking in C, bed, with-you mark), the modules (bay with crates, rack, small Incubator, Probe cradle, rest knob), the arrival events, the report card, the arrival ribbon. Idle as a state of the frame (`props.idle`): the vivarium full-screen and its line, with the first press sending `wake`. Home's focus order as `order` and `nearestIn` in `home.json`, replacing `nav.mjs` `homeMove`.
- **Scope rulings. Decided** (architect, 2026-10-09 12:25, within the owner's 2026-10-08/09 decisions). The status strip is struck: Home's layout cut it (`station-layouts.md` Home §2: the modules show it by shape), so no region, word or props carry it, and `home.mjs` `drawStatusStrip` goes with the rest of Home's drawing (§5.2). Idle's line is the `idleLine` composition (§2.2), in the frame's binding table. Home's graph uses §2.6.1 as written in `home.json`: `order` for the column, `nearestIn` for ◀ ▶ between the column and the residents and from the room (origin `roomAt`'s centre), `nearestIn` with `ahead` for the residents' ▲ ▼ and ◀. The journey's resident moves are deterministic because the residents' boxes come from the seed and the face's clock, which the test steps (§2.7).
- **Acceptance.** The gate. `page-home`, `page-arrival` and `page-fresh` captures on the face. Dock while idle wakes, docks and lands on Home (`dockKey(fromIdle)`). The arrival holds input for its length. With the same seed, the residents' paths give the same framebuffer hashes on all three builds.
- **Tests.** `nav.test.mjs`'s Home walk becomes focus vectors; the arrival as a timeline test.
- **CI gates.** The gate for `home` and `idle`.

### L2.3 Cross with the splice (size: about 1 × L2)

- **Scope.** `views/cross.mjs` rewritten to props: the forecast's chapters, loci, gates, seeds, ranges, kinship and the wish, as data. `cross-layout.mjs` moves to `derive.mjs` (oracle) and `layout/splicePlan` (C). Wires, ticks, dashed edges and gates are composed pictures per chapter block. Portraits, the ghost and seeds are generated pictures by id. Partner ◀▶ and the chapter walk ▲▼ are steppers.
- **Acceptance.** The gate. The S09 chapter view with everything read (1,772 nodes today) draws in at most 400 objects. The splice's row plan equals `derive.mjs` for all sixteen frames (the test of `cross-splice.test.mjs` on the C side). `cross-overview`, `cross-chapter`, `page-cross`, `page-child` and `page-cross-siblings` are captured on the face.
- **Tests.** `cross-splice.test.mjs` and `cross-read.test.mjs` re-pointed at props; nothing of an unread chapter is in the props (the read-only rule, now enforced at the contract).
- **CI gates.** The gate for `cross`.

### L2.4 Create and the Incubator (size: about 1 × L2)

- **Scope.** The two new spec files. Create's roll among three pictures (a ▲▼ stepper), changed tags, the clash marks, the total on the bottom line. The Incubator's dome, bud, leaves (stepped per minute from props), tabs clearing, stamp and code, Grow now, the hatch event and the hand-off to Habitat's meet.
- **Scope rulings. Decided** (architect, 2026-10-09 13:24, within the owner's 2026-10-08/09 decisions). L2.4 builds the `leafArc` layout rule (with its oracle in `derive.mjs` and its `layout.json` vectors), the `leaves` word in both forms with the `growNow` fill, the frame word's `stage` part, and the `dither` event with `bayerPick` (§2.2, §2.7), unless an earlier milestone needs one of them first, in which case that milestone builds it.
- **Acceptance.** The gate. `page-create`, `page-incubator` and `page-hatch` captured on the face.
- **CI gates.** The gate for `create` and `incubator`.

### L2.5 Habitat and the Probe bench (size: about 1 × L2)

- **Scope.** The two new spec files. Habitat's resident large, card, stamp, with-you door, bond heart (arm-then-confirm), bays strip, the meet and placeholder-to-painting landing, and the door to the Cross and the guide. The Probe bench's plates, switch and slot. Habitat's rows as `order` data, replacing `habitatMove`. The Sitting's first screen goes here if its spec has landed; otherwise it is built straight on the face when it does.
- **Acceptance.** The gate. `page-habitat`, `page-meet`, `page-meet-placeholder`, `page-painted` and `page-offline` captured on the face.
- **CI gates.** The gate for `habitat` and `bench`.

### L3 Switch (size: about 0.5 × L2)

- **Scope.** `?face=lvgl` becomes the only face and the flag is removed. Everything in §5.2 is deleted. The journey and checks read only the face. The parity check against JavaScript captures is retired (there is nothing left to compare with); the goldens are the reference. The test hooks are re-pointed (`capture` from the framebuffer, `check` from the face's log). The README, `station-build.md` and technical-architecture.md §5 and §6 are updated to the face, and the freeze check is replaced by an import guard (nothing may import from the deleted paths, and `prototypes/ui` holds no drawing).
- **Acceptance.** The full journey is green on the face alone. `checks.mjs` has zero failures on every capture point. Every screen has goldens. The budgets fail CI from here. The Node host plays the whole journey against `face_sdl` from a fresh world.
- **CI gates.** As L2.5, minus the JavaScript-face journey and the parity step.

## 5. Freezing the JavaScript drawing layer, and what L3 deletes

### 5.1 The freeze, from L2.0's first commit

`prototypes/face/deprecated.json` lists every deprecated drawing module with its SHA-256 at the freeze commit, and the set of modules allowed to import each one. `prototypes/face/tools/freeze-check.mjs` runs in the site workflow and fails if:

1. a listed file's content differs from its hash;
2. a file not in the allowed set imports a listed module (an import scan over `prototypes/**/*.mjs`), so no new screen can be built on the layer;
3. a screen registered in `registerScreen` gains `draw`, `nodes` or `faceNodes` without being in the face's migrated list;
4. a path leaves the list without its file being deleted, or without its screen's goldens present in `prototypes/face/golden/` (the only way out is migration).

Deleting a listed file always passes. A fix that a frozen file genuinely needs before its screen moves (a crash, a rule that changed underneath it) goes in with an `exemption` entry naming the commit and the reason, signed off by the architect in review. The check prints every exemption on every run.

### 5.2 The freeze list, and what L3 deletes

| Path | Lines | Freeze | Deleted |
| --- | --- | --- | --- |
| `prototypes/ui/scene.mjs`, `context.mjs`, `layout.mjs` (its rules copied to `specs/derive.mjs` first), `type.mjs`, `type-node.mjs` | 80, 3, 76, 32, 11 | L2.0 | L3 |
| `prototypes/ui/render/station-canvas.mjs`, `browser.mjs`, `canvas-assets.mjs` | 126, 16, 7 | L2.0 | L3 |
| `prototypes/ui/components/*.mjs` (14 files: bottomLine, chapterPage, chapterRail, focusRing, frame, list, mark, messagePlate, panel, slantRail, specimen, stampLabel, text, topBar) | 500 | L2.0 | L3 (Pods' at L2.0 if Q1 is as recommended, the shared ones at L3) |
| `prototypes/ui/fonts/atlas/*`, `prototypes/ui/tools/bake-type.mjs` | data, 80 | L2.0 | L3 (after `metrics.json` replaces them) |
| `prototypes/station/src/gfx.mjs`: the drawing half (`R`, `blit`, `text`, `textW`, `wrapText`, `clipText`, `panel`, `ditherFill`, `focusRing`, `bindCanvas`); `PB` and the palette helpers move to `pixels.mjs` first | 207 before the split | L2.0 | L3 |
| `prototypes/station/src/screens/home.mjs`, `bench.mjs`, `incubator.mjs`, `create.mjs`, `habitat.mjs`, `library.mjs`: the drawing (their intent logic moves to `intents/`) | 165, 64, 60, 78, 100, 77 | L2.0 | At each screen's milestone |
| `prototypes/station/src/screens/frame.mjs` (drawing: `stageBg`, `benchArt`, `lampPool`, `beam`, `drawResidents`) | 95 | L2.0 | L2.2 (residents) and L3 |
| `prototypes/station/src/screens/pods.mjs` `nodes`, `faceNodes`, `ringNodes`, `sharedFrame` | part of 166 | L2.0 | L2.0 |
| `prototypes/station/src/screens/cross.mjs` (drawing), `views/cross.mjs` (node emission), `cross-layout.mjs` (moved to `derive.mjs`) | 91, 223, 28 | L2.0 | L2.3 |
| `prototypes/station/src/face-lvgl.mjs` (the node path: `scene`, `keyOf`, the clip cut) | 94 | Replaced at L2.0 by the bridge transport | L2.0 |
| `prototypes/face/src/scene.c`'s node API (`face_node`, `FN_*` from the page) | — | Kept internally as `prim/` | Its page-facing exports at L3 |
| `main.mjs`: `legacy`, the `Scene`, `bootStationCanvas`, `SC`, `checkSnapshot`'s canvas reads | — | Rewritten (not frozen) | L3 |
| Tests of the deleted modules: `ui.test.mjs`'s scene, layout and component tests (its timeline and manifest tests stay), `rail.test.mjs`, `page.test.mjs`, `type.test.mjs` (the closed-set lint becomes a C lint; coverage re-pointed) | — | Their vectors exported to `face_test` at L2.0 | L3 |
| Tools: `frame-check.mjs`'s canvas comparison | — | — | L3 (the goldens replace it) |

**Kept** (not frozen): `ui/assets.mjs`, `ui/png.mjs`, `ui/podlayers.mjs`, `ui/rings.mjs`, `ui/timeline.mjs`, `ui/focus.mjs` (until L3, as the JavaScript run of the focus vectors; then deleted with the vectors kept), `ui/palettes/`, `ui/specs/`, `ui/fonts/inter/` (the source the C fonts are baked from), `ui/assets/`, `ui/tools/place-masters.mjs`, `ui/tests/specs.test.mjs`, `masters.test.mjs`, `podlayers.test.mjs`.

## 6. Risks, and three questions for the owner

### 6.1 Risks

| Risk | Assessment | Mitigation |
| --- | --- | --- |
| **Object counts.** The splice draws 1,765 one-pixel rects (measured, S09) and the guide's dashes do the same at a smaller scale | High: over the 512-object table today, and slow on the Pi | Composed pictures (§2.2); object budget asserted; table grown so a breach is measured |
| **The views carry geometry** (Pods via `ui/layout.mjs` and `components/list.mjs`; Cross and the guide emit nodes) | Certain: each screen's move includes a view refactor, larger than "views stay" suggests | Props schemas per screen; geometry to `derive.mjs` (oracle) and `layout/` (C); the conformance item "no coordinates in the view" checked in review |
| **Synchronous measure** across the Pi's process boundary | Certain under S1 | Fitting in the face; the metrics table with its equality test |
| **Two faces drifting** during the switch | Medium | The freeze check; parity only until the goldens are signed; deletion per milestone (Q1) |
| **Missing spec files** for Create, Incubator, Habitat, the Probe bench and Idle | Certain; it can stall L2.4 and L2.5 | The UI designer delivers one milestone ahead (§3); no build from old numbers |
| **Type shifts.** LVGL's whole-pixel advances move the last letters 1 to 4 px against the atlases (L1, measured) | Low, known | The face is the reference after L3; the UI designer re-signs the type on each screen's goldens |
| **Builders' speed in C** | Medium: a component change is a compile (5 to 40 s) and debugging in the browser is clumsy | `face_sdl` with a debugger; spec edits hot without compile; words small and tested natively |
| **Determinism across builds** (WebAssembly, x86-64, aarch64) | Low: equal hashes measured for WebAssembly and native; aarch64 not yet measured | Hash equality is a gate from L2.0; any difference is investigated before goldens are committed |
| **A new vendored dependency** (jsmn) | Low | MIT, one header, notices updated; or a 300-line parser of our own if the owner prefers none |
| **The Pi proof waits for hardware** | Medium: the budgets are unproven until then | Hardware-independent budgets asserted now; native timings printed; levers in §2.10 that do not change the contract |
| **Two processes on the Pi** (face and Node) | Medium | The face keeps drawing the last props and shows a still frame if Node restarts; it reconnects; it holds no game state; `hello` checks the contract version |
| **CI time** with the journey run twice | Medium: about 2.5 min a journey today | Until L3 only; budget of 12 min for the job; the journey steps of unmoved screens skipped on the LVGL run |
| **The field-guide branch rots** while frozen | Medium | Q3 |

### 6.2 Questions for the owner

**Decided** (owner, 2026-10-09 11:53): Q1 (a) per screen, as soon as each passes its gate; Q2 yes, all five checks; Q3 (a) salvage now. Documentation is part of done: a milestone merges only when the docs it touches, in both repositories and on the website, show the current state.

**Q1. Which face does the sandbox show while the switch runs?**
(a) Per screen: each screen switches to LVGL by default as soon as it passes its gate, its JavaScript drawing is deleted then, and unmoved screens stay on the JavaScript face until their turn. (b) The JavaScript face stays the default for every screen until L3, and LVGL stays behind `?face=lvgl`.
*Recommended: (a).* What the owner plays becomes the device face screen by screen, from L2.0. The deprecated code shrinks at every milestone instead of all at once at L3. Each gate is judged on the face players actually see. The page already draws both faces onto the same canvas, so a per-screen choice is one switch in `render()`. The cost is that one page shows two faces for a few weeks, which the frame (already LVGL) hides.

**Q2. Approve the new CI checks as one bundle?**
These are: (i) the freeze check (§5.1); (ii) golden framebuffer hashes as the pixel check (§2.8); (iii) the native C test suite `face_test`; (iv) the journey run on the LVGL face beside the JavaScript one until L3; (v) the site workflow also running on pull requests, so the gates hold before a merge rather than after it (`site.yml` today runs on push to `main` only). The regions, palette, type and size checks are already approved and are only re-pointed.
*Recommended: yes, all five.* Without (i) the freeze is a request, not a rule. Without (ii) nothing measures the pixels once the JavaScript renderer is gone. Without (v) a gate only reports after the merge.

**Q3. What happens to the frozen `field-guide` branch (5927d91d)?**
(a) Salvage now. The data and rules parts go to `main` without any drawing: `library.json`, the rulings and wireframes in `station-layouts.md` and `station-screens.md`, the rules in `library.mjs` (`lookCarriers`, the clarity lines), `guideModel` and `guideMove` with their tests, the journey's guide steps marked pending, and the spec changes to `frame.json` and `pods.json`. The guide's drawing (`guideView`'s nodes, `screens/library.mjs`'s `guideNodes`) is dropped and rebuilt on LVGL at L2.1. (b) Keep the branch frozen until L2.1 and rebase it then.
*Recommended: (a).* The design work and the rules are sound and signed. Salvaging them stops the branch drifting from `main` while L2.0 runs, and it leaves nothing on `main` drawn by the old layer.

## 7. Files this spec touches when built

New: `design/proposals/lvgl-switch.md` (this); `prototypes/face/src/{platform,bridge,spec,prim,vocab,layout,screens}/`; `prototypes/face/src/vendor/jsmn.h`; `prototypes/face/tools/{freeze-check,bake-images}.mjs`; `prototypes/face/deprecated.json`; `prototypes/face/golden/`; `prototypes/face/tests/vectors/`; `prototypes/station/host/`; `prototypes/station/src/{intents,pixels.mjs}`; `prototypes/ui/specs/{derive,measure}.mjs` and `*.props.json`. Changed: `prototypes/face/{CMakeLists.txt,build.sh,lv_conf.h,README.md}`, `prototypes/station/src/{main.mjs,face-lvgl.mjs,views/*}`, `prototypes/station/tools/{journey,checks}.mjs`, `.github/workflows/site.yml`, `THIRD_PARTY_NOTICES.md`, technical-architecture.md §8.4 (a pointer here).

# Technical architecture: one loop, three screens

This is the software structure every Station, Companion and Caddy build follows, for the engineers who build and review them: the layers, the contracts between them, how a screen is added, the checks a build passes, and the order of the milestones. The overview of state, transfer and the cloud is [architecture.md](../architecture.md). The Station's LVGL face, its bridge, words, focus, animation, checks and milestones, is [lvgl-switch.md](lvgl-switch.md); this document links to it rather than repeating it.

**In one paragraph.** The sandbox page is where the game is defined: rules, views, intent tables, spec files and assets in JavaScript and data. Its Station face is the device's own: LVGL 9 in C, compiled to WebAssembly, driven through props in and intents out. On the Pi the same face runs natively beside the same JavaScript logic under Node, with no browser. Once the loop holds, the Companion and the Caddy port to the same C words, carrying specs, assets, fonts, palettes, the save and test vectors as data. The port is a platform layer and a host, checked by golden framebuffers, not a rewrite, and it fits the hardware the kit has.

**The fixed limits.**

- The hardware: ESP32 for the Companion and the Caddy, a Raspberry Pi 4 for the Station, and each screen's resolution and colour depth. The Pi 4 is the ceiling, and everything is built for underpowered hardware. The toolkit and the language are chosen within these limits.
- **First define the loop**, honouring each device's pixels and colours; once the loop and the interactions are stable, **port**. Hardware prototyping starts once the loop is complete in software.
- The Station at 1024×600 at 1× with Inter at 16, 20 and 28 px, anti-aliased, and painted full-colour art; the Companion at 450×600 on the 48-colour palette with 48 px tiles, HUD 32, view 532, bottom line 36, and the Mibi 7×9 bitmap type; the Caddy in four grays.
- The kit plays standalone with no internet; cargo moves only on docking; the Caddy brokers paintings over Wi-Fi from the Station.
- Genome, rig and stamp are imported from `prototypes/workbench` and `prototypes/genome-stamp`, never copied.
- Routine play uses the depicted keys only. The developer-tools mode is a build requirement. No MicroPython or Arduino.

## 1. What this is for

The kit has three screens and one game. Without this architecture each screen is built by drawing pixels at numbers typed into code. That is fast for the first screen and slow for every one after it, and it gets worse as more people work on the code at once.

**For example,** the layout spec says the stamp is "a 120×120 label, one rule, every screen that shows it". Drawn by hand, that rule is copied into every screen file that shows the stamp (six, in the hand-drawn Station, at five sizes: 196 px on Pods, 120 on Create and the Incubator, 96 on Cross, 88 on Habitat, 112 on the Library), and each copy is checked by eye. On the face the stamp label is one C word and each screen's spec gives it a rectangle. The rule lives in one place, and CI measures it.

The architecture has three jobs:

1. **Builders implement; they don't invent.** A screen is a spec, a view of the state and a list of actions. It is never a page of coordinates.
2. **Each concern has one home.** Rules, layout, components, drawing, input, storage and the network edges each live in their own module, so two builders can work side by side without colliding.
3. **The port is cheap.** What is proven in the browser carries to the devices as data and tests. It is not rewritten from memory.

## 2. What the architecture keeps

| Kept | Why |
| --- | --- |
| **The pure state model** (`station/src/state.mjs`, no DOM) | Every rule is a pure function that returns its presentation events instead of drawing. This is exactly the shape a port needs |
| **The imported genome, rig and stamp** (`genome.mjs` bridging `workbench/framework/*` and `genome-stamp/src/*`) | The Station has no genome model of its own. CI decodes the drawn stamp back to the genome |
| **The Caddy service** (`prototypes/caddy/`: 175 lines over three files, four routes, no dependencies, plus 100 lines of tests) | In proportion to its job. Its contract (genome-only input, dedupe by hash, journalled queue, ceiling) is what the device Caddy keeps |
| **The tests and the journey** (the rule tests, the Caddy tests, the Playwright journey through the device keys) | They prove the loop on every push. The sign-off's measurements are added to them |
| **Device-pixel frames** | Each page draws into an offscreen frame at the device's size and blits it whole |
| **The edges kept apart** (`caddy.mjs`, `dev.mjs`, the placeholder register in `art.mjs`) | Each edge is one module, apart from the rules and from the screens |

The rules layer is the healthy core. The architecture adds what sits between the rules and the pixels: a face that turns a spec into drawing and keys into actions, so no screen is drawn by hand and no layout change is a hunt through code.

## 3. Development strategy

The browser sandbox is the place where the loop and its interactions are defined and validated, at each device's true resolution and colour depth. What is proven there moves to the devices as **data and tests**, not as code read and retyped.

| Carries across unchanged | Re-expressed on a device | Not carried |
| --- | --- | --- |
| Screen specs (regions, components, focus graph, strings) as data files | Companion and Caddy rules and state, in C, checked against shared test vectors (the same inputs must give the same outputs as the JavaScript reference) | The depicted device shells and side panels |
| Palettes, fonts (Mibi 7×9 glyph sheets, Inter baked by `lv_font_conv` from the OFL file), the asset manifest and every asset at its pixel size | The component library, once, in C on LVGL for all three devices: same names, same behaviour | The page's fit and scale code, `localStorage` |
| The save schema, migration ids and fixture saves | The renderer (indexed buffer on the ESP32s; layered 32-bit frame on the Pi) | Playwright hooks (a host build of the device code takes their place) |
| Species frames, catalogue, genome and stamp formats; **on the Station, the rules, genome, rig, stamp and Caddy client as code** (§4.3) | Input (GPIO keys to the same key events) and storage (flash or SD on the ESP32s, a file on the Pi; same save layout) | The developer panel's HTML (its settings contract carries; the device gets a hidden menu) |
| The Caddy service's four routes and their contracts | The Caddy service itself, as ESP-IDF firmware | |

**On the Station nothing of the face is re-expressed.** The sandbox's Station face is the device's own C, compiled to WebAssembly (§8, lvgl-switch.md): the component library, the renderer, focus and input run the same on the Pi, which adds only its platform layer, the Node host and the image cache (lvgl-switch.md §2.9). The middle column above holds for the Companion and the Caddy, whose words are the Station's `common/` words under their own profiles (lvgl-switch.md §2.2).

**What guarantees fidelity:**

- **Device-pixel surfaces.** Each target draws into a buffer of exactly its size: 1024×600, 450×600, 792×272, and 384 dots a line for the printer. The page may enlarge the finished frame by whole numbers for viewing, but never the drawing.
- **Palette enforced by construction.** The Companion and Caddy renderers write palette indexes, not colours, so an off-palette pixel cannot exist. On the Station, every primitive carries its layer (chrome, art, painted, type), and in test mode the face renders chrome only and chrome with art as separate passes, so those are checked at exactly 0 off palette (lvgl-switch.md §2.8).
- **A closed primitive set** on all three devices: rectangles, text runs from fonts baked by `lv_font_conv`, sprites (indexed, or 32-bit with straight alpha on the Station's painted layer), nine-slices, clip, and composed pictures for fine line work (lvgl-switch.md §2.2). It is the face's `prim/`, the only code that creates LVGL objects, so the sandbox and the device draw the same pixels, Inter included.
- **Measured in CI,** with the sign-off's checks (grain, type, palette, size), from the face's logs and framebuffer (§5.6).

## 4. The devices' runtimes

### 4.1 What the hardware asks

Arithmetic from the reference hardware ([devices.md](../devices.md)), to be measured on boards:

| | Companion (ESP32-S3R8: 512 KB SRAM, 8 MB PSRAM, 16 MB flash) | Caddy (ESP32-S3) | Station (Pi 4, the ceiling: 2 GB or less, no GPU-accelerated browser) |
| --- | --- | --- | --- |
| Panel | 450×600 AMOLED, RM690B0 controller over quad SPI, 16-bit colour in | 792×272 e-paper, four grays; 58 mm printer, 384 dots a line | 1024×600 over HDMI, drawn in software to the kernel's display (DRM) |
| One frame | 270 KB as palette indexes (PSRAM); 540 KB as 16-bit; a 60-row strip to the panel is 54 KB | 54 KB at 2 bits a pixel; one printer line is 48 bytes | 2.4 MB at 32 bits; two buffers 4.8 MB |
| Assets | One byte a pixel: a 48 px tile is 2.3 KB, a 280×300 resident 84 KB. v1's 942 KB of RGBA art would be about 235 KB | Four-gray sets; paintings on the SD card | Paintings at full colour, 372 KB each at 300×310 decoded; the rig, rasteriser, validator and derivation run here (art pipeline §11) |
| Lesson from v1 | The 1.4 MB image was 1.1 MB of flash data, mostly RGBA art and anti-aliased font tables. Indexed assets and bitmap type remove most of it | 470 KB Caddy UI compiled | Never ran on a Pi |

The Companion's pixel model (a 48-entry palette, indexes in memory, a lookup to 16-bit on the way to the panel) is the same model the sandbox uses. The device enforces the palette for free.

### 4.2 The Companion and the Caddy

Native C on ESP-IDF, with **LVGL 9** for chrome, lists and menus, and an indexed renderer of our own for the Companion's world view (tile map and sprites) inside it. The world view is a game renderer, not a widget. LVGL is MIT-licensed, proven on the S3 in v1, and drives an e-paper through a custom flush. The Caddy firmware is mostly service work (Wi-Fi, TLS, SD storage, a small HTTP server for the Station, the printer) with a quiet four-gray UI, so its service contract matters more than the toolkit. Both start when the loop is stable. **Fallback: Slint** (GPLv3 or a paid licence on embedded, and younger on the S3 than LVGL).

**Wi-Fi between Station and Caddy:** the Caddy brokers over Wi-Fi, and the four HTTP routes of the Caddy service are the contract. The Station's client queues in `outbox`, so the kit plays on when the Caddy is unreachable.

### 4.3 The Station's runtime, within the Pi 4

The Station has two halves. **The face** (screens, focus, animation, drawing) is light on a CPU-only Pi. **The logic** (rules, genome model, cross, stamp, rig, rasteriser, controls, derivation, Caddy client) is JavaScript imported from the workbench and the stamp: about 3,600 dense lines, still changing. Its heavy work runs in the background (a controls-and-placeholder set takes about five seconds a mibi on the development VM, while a bud grows for twenty minutes).

**S1: an LVGL 9 face in C, and the logic in a headless Node process beside it, with no browser.** The face is LVGL 9 in C on the Linux DRM driver, drawing in software, with the Companion's and Caddy's component library. It adds two layers: painted art as 32-bit images with straight alpha, and anti-aliased Inter at 16, 20 and 28 px baked by `lv_font_conv` from the bundled OFL file. The logic is the sandbox's own modules, run headless by Node as a service. It writes the save to a file atomically, talks to the Caddy over Wi-Fi, and puts rig renders and the stamp into an image cache the face reads by asset id. The seam is the bridge contract of lvgl-switch.md §2.1 (props in, intents out), the same bytes the sandbox carries.

| | Figures |
| --- | --- |
| RAM (resident) | Face: 4.8 MB of buffers plus an image cache of 20–40 MB. Node: about 45 MB idle, published figure, plus the rig's working set. Under 300 MB with the OS |
| CPU and boot | LVGL on DRM held 30 fps at 4–6% CPU on a Pi 3B at 800×480 (LVGL forum figure); it redraws only what changed. Node starts in about a second. The system boot dominates: 15–20 s typical on Raspberry Pi OS, about 4–10 s on a trimmed Buildroot image (forum figures) |
| Upkeep | One C face for all three devices; the Station's logic stays the sandbox's own modules, imported, never copied; one seam (props in, intents out); Node's long-term releases |

The budgets the Pi must meet are lvgl-switch.md §2.10.

**Fallback: S2,** the same face with the logic ported to C in one process (tens of MB), used only if a JavaScript runtime on the device is ruled out. Its price is a second genome model: the genome, rig, stamp and cross would exist in JavaScript in the workbench and in C on the Station, and every workbench change would be ported and re-verified with test vectors.

## 5. The structure

### 5.1 Layers

JavaScript decides what each region shows; the LVGL face, in C, decides where it goes, how it looks, how focus moves and how it animates. The face's own layers (platform, bridge, prim, vocab, layout, screens) and the rule of the split are [lvgl-switch.md §2](lvgl-switch.md#2-target-architecture-of-the-face).

```
 keys ─▶ FACE: input & focus graph ─▶ intent ─▶ JS: intent table ─▶ rules (pure) ─▶ state + events
                                                                                       │
 spec (data) ─▶ FACE: spec loader ─▶ words + layout rules ◀── props ◀── JS: view (pure) ◀┘
                         │
                     FACE: primitives ─▶ LVGL ─▶ framebuffer ─▶ page canvas (sandbox) | DRM (Pi)
 edges (JS): storage · Caddy client · placeholder register · developer tools · asset manifest and producers
```

| Module | Holds | Never |
| --- | --- | --- |
| **Rules and state** (`state.mjs` and the Station's other rule modules; the Companion's `rules/` after its split) | The save's part and every rule as a pure function; returns new state and presentation events | Draws, reads keys, touches storage |
| **Views** (`views/<screen>.mjs`) | Pure selectors from state and focus to a screen's props: what each region shows, and the focus targets by id | Coordinates, geometry |
| **Intent tables** (`intents/<screen>.mjs`) | The face's `{ target, verb }` to one rule call; arm-then-confirm; the screen's UI state | DOM, canvas or drawing imports |
| **Screen specs** (`prototypes/ui/specs/<device>/<screen>.json`, with `<screen>.props.json`) | Regions with their word or composition, the focus graph, strings, the spec's limits, the props schema | Logic |
| **Timeline** (`ui/timeline.mjs`) | Which event plays and whether input is held; sends `event` messages | Positions or in-between states |
| **The face** (`prototypes/face/src/`, C) | Platform, bridge, primitives, the vocabulary's words, the layout rules, the screens' binding tables, focus and animation (lvgl-switch.md §2.2) | Reads the save, calls a rule, decides content |
| **Edges** | `storage` (the save adapter: `localStorage` in the sandbox, a file written by the Node host on the Pi, flash on the ESP32), `caddy` client, `art` placeholder register, `dev` tools, the asset manifest and the asset producers | Mix with each other |

**Deprecated and frozen:** the JavaScript drawing layer, listed in lvgl-switch.md §5.2. No screen or screen feature is built on it, and the freeze check (lvgl-switch.md §5.1) fails on any change to it and on any new import of it. Each module is deleted when its last screen moves to the face, and all by L3. `ui/focus.mjs` is kept until L3 only as the JavaScript run of the focus vectors.

### 5.2 Contracts and data shapes

A screen spec mirrors `station-layouts.md`, region by region (Pods shortened):

```json
{ "screen": "pods", "device": "station", "spec": "design/style-guide/station-layouts.md#pods-collection-pod-overview-chapter-page",
  "regions": {
    "list":  { "rect": [0, 40, 160, 522], "component": "list", "item": "well", "pitch": 72 },
    "rail":  { "rect": [176, 48, 832, 56], "component": "chapterRail" },
    "pod":   { "rect": [264, 120, 160, 192], "component": "specimen", "focal": true },
    "stamp": { "rect": [176, 432, 120, 120], "component": "stampLabel" },
    "page":  { "rect": [528, 112, 480, 440], "component": "chapterPage", "noDigits": true }
  },
  "focus": { "list": { "right": "pod" }, "pod": { "left": "list.current", "up": "rail.last" },
             "rail": { "down": "pod" }, "fallback": "spatial" } }
```

The other contracts (the wire format and every message are lvgl-switch.md §2.1):

- **View:** `view(state, focus) → props`, for example `{ pod: { asset, sealed }, rail: { chapters: [{ id, read, glint, sealed }] }, line: { ok, price, back, subject, need } }`. Props name what, never where. Pure, tested in Node against the screen's props schema, and sent to the face as a `props` message.
- **Intent:** a key goes through the face's focus graph, which gives either a focus move (a `focus` message) or `{ target, verb }` (an `intent` message). The screen's intent table maps it to one rule call, which returns `{ st, events }`.
- **Event:** `{ kind: "wipe", target: "page", ms: 2000, hold: true }`. The JavaScript timeline decides that it plays and holds input; the face plays it. No global timestamps.
- **Primitive:** the face's closed set (rect, text, sprite, nine-slice, clip, composed picture), each carrying its layer and the region that drew it. Colours are palette names, except on the painted and type layers. Fonts are LVGL fonts baked from the bundled file (`inter-16`, `inter-20`, `inter-28`; Mibi 7×9 when the Companion comes), never a CSS font string.
- **Asset:** `{ id, file, w, h, policy: palette48 | stationChrome | painted | gray4 | print1, status: placeholder | master, until, hash }`. Files are PNG: indexed for the palette policies, 32-bit with straight alpha for `painted`. `bake-images.mjs` converts them to LVGL's binary images (lvgl-switch.md §2.4).

### 5.3 How the layout spec becomes code

The numbers have **one home**: the spec file. The UI designer writes the reasoning in `station-layouts.md`, and its tables and the wireframes in `station-layouts/` carry the same numbers. `prototypes/ui/tests/specs.test.mjs` checks the spec files against the wireframes and the tables, so the document and the build can't disagree unnoticed. A builder never retypes a rectangle. CI compares every drawn region's box in the face's region log with its spec, or with `ui/specs/derive.mjs` for a derived one (lvgl-switch.md §2.8).

<img src="../style-guide/station-layouts/02b-pods-overview.png" width="1024" alt="Pods overview wireframe">

*Pods, pod overview. Wireframe, layout only, measured; shown at 1×, from the same numbers as the spec file the screen draws from.*

### 5.4 How a builder adds a screen

A screen is built on the LVGL face, never on the JavaScript drawing layer (§5.1). The face's side is lvgl-switch.md §2; the gate it passes is lvgl-switch.md §4.

1. **The spec lands one milestone ahead** (lvgl-switch.md §3). The UI designer delivers the layout section and the spec file, `prototypes/ui/specs/station/<screen>.json`, following the screen design method: every drawn region names its word (`component`) or composition (`build`), and the file carries the focus graph and the strings. A screen without its spec file waits. It is never built from the old screen's numbers.
2. **The view, as props.** The builder writes `views/<screen>.mjs`: state and focus to props, naming what each region shows (strings, states, counts, asset ids, flags, and the focus targets by id with their enabled flags), never where. Its schema is `<screen>.props.json` beside the spec file, and its Node tests assert props only.
3. **The intent table.** The builder writes `intents/<screen>.mjs`: each `{ target group, verb }` from the face to one rule call, with arm-then-confirm and the screen's UI state. Anything new in the rules lands in its rule module with tests. The view and the intent table import no DOM, canvas or `gfx.mjs`, so they run in the Node host as well as the page.
4. **The C words.** The face binds the spec's regions to words of the closed vocabulary in the screen's binding table (`prototypes/face/src/screens/`); a derived rect comes from a rule in `layout/`. A new word, composition or layout rule goes to the UI designer and the architect first.
5. **Focus is spec data.** The graph per state lives in the spec file, with the edge forms of lvgl-switch.md §2.6.1 (names, selectors, `nearestIn`, ordered lists, `order`, `axis`). The view supplies only `focus.targets`, `focus.resolve` and `focus.set`. No target rectangles and no focus order in JavaScript.
6. **Assets.** Every asset is registered in the manifest at its size, with placeholders flagged; masters are baked to LVGL images; nothing is scaled.
7. **The gate.** The journey gains the screen's steps on the face; regions, pixels, palette, type, goldens, budgets and reduced motion pass (lvgl-switch.md §4); the sign-off is filled in; the docs the screen touches show the current state.

### 5.5 Art placed 1:1 and registered

A sprite node names an asset id. Its slot's size must equal the asset's size, and the renderer refuses anything else: in development it shows a visible error, and in CI it counts it. Nothing can be drawn small and enlarged. A master takes its placeholder's place by taking the same id and size, and the register counts the placeholders left per screen. Close-ups are rendered at their size by the rig's camera (the layout spec's rule), not cropped.

### 5.6 Tests that measure the sign-off

The sign-off's measured checks run in CI. The face's test mode makes them exact, with no monkey-patching (lvgl-switch.md §2.8 holds the full list, with the goldens and the freeze):

| Sign-off check | Measured from |
| --- | --- |
| Screen size | The face's frame size, asserted |
| Palette | The chrome and chrome-with-art passes have 0 pixels off palette on every screen; the Companion and Caddy have 0 by construction |
| Type | The text word's log: every Station string in Inter at 16, 20 or 28 px from the baked fonts; the Companion's in Mibi 7×9 at 2× or 3× |
| Grain (G2) | Journey screenshots, as specified |
| Rail chapters, digits, stamp, placeholders | The face's logs: tab count against the frame; no digits in text on regions marked `noDigits`; stamp label at 120 or less and 96 px or more from the focal box; every sprite resolves in the manifest |
| Regions against the spec | The face's region log against the spec file |

### 5.7 Conformance review checklist (for every build)

- [ ] No rule outside the rule modules (or the Companion's `rules/`); rules are pure and tested.
- [ ] No coordinates in screen code; every region comes from its spec file; no geometry in JavaScript outside `ui/specs/derive.mjs`.
- [ ] Only the vocabulary's C words; any new word, composition or layout rule approved by the UI designer and the architect.
- [ ] Nothing drawn by, changed in, or newly importing the deprecated JavaScript drawing layer (the freeze check green).
- [ ] The view and the intent table DOM-free and running in the Node host.
- [ ] Focus from the spec's graph; no hand-made target rectangles.
- [ ] Every sprite in the manifest at its size; placeholders registered; nothing scaled.
- [ ] Colours by palette name; the art layer at 0 off palette.
- [ ] Fonts bundled; no network fetch at load except the Caddy client.
- [ ] Genome, rig and stamp imported from their homes; gaps fixed there.
- [ ] Save changes carry a schema number, a forward-only migration and a fixture.
- [ ] Developer settings outside the shared save.
- [ ] The journey extended; the sign-off's checks green; departures listed.

## 6. Migration path

Each milestone ships to the sandbox and plays from a fresh world. The save doesn't change in any of them.

| | Ships | Note |
| --- | --- | --- |
| **T1 Screen layer and Pods** | `prototypes/ui/` with Pods from its spec, Inter bundled. Its drawing modules are deprecated and frozen (§5.1) | Its spec files, timeline, manifest and checks carry to the face |
| **L0 to L2** | The toolchain, the frame and Pods drawn by the LVGL face (§8) | The face's first screen |
| **L2.0 to L2.5, then L3** | Every Station screen on the LVGL face, in lvgl-switch.md §3's order: L2.0 the platform and Pods on C words; L2.1 the Library, Book and field guide; L2.2 Home, Rest, Dock and arrival, Idle; L2.3 Cross; L2.4 Create and the Incubator; L2.5 Habitat and the Probe bench. L3 deletes the JavaScript drawing layer | Each milestone passes the gate of lvgl-switch.md §4 |
| **M6 Sitting and the whole journey** | On the face; the Sitting's first screen at L2.5, or built straight on the face when its spec lands | |
| **C1 Companion split** | The inline script into modules (rules, world, state, renderer, screens) with no visible change | Independent of the Station |
| **C2 Companion on the face** | HUD 32, view 532, line 36; Mibi 7×9; the map viewport for 48 px tiles, with the art redraw; the `common/` words under the Companion's profile, with its indexed world view inside (lvgl-switch.md §2.2) | Lands with the 48 px redraw |
| **H0 Host-build proof** | The native builds of the face: headless, SDL and aarch64 under qemu-user, with framebuffer hashes equal to WebAssembly's (lvgl-switch.md §2.9) | Part of L2.0. No hardware until the loop is complete in software |
| **P1 Port** | The **Station** (S1: the face's DRM platform on the Pi, the Node host, the image cache, the save file, GPIO keys), then the Companion and the Caddy firmware from the C words, specs, assets and test vectors | **After the loop is stable.** Hardware work starts here |

**The Station at the port.** The Station's screens are built once, on the LVGL face in the sandbox (L2.0 to L3), and the same C runs on the Pi. P1 adds no Station screen: only the platform layer (DRM display, keys), the Node host over the socket, the image cache and the save file. Against S2, it avoids porting the genome, rig, stamp, cross and Caddy client and keeping them twice. The face is built once for three devices.

**What keeps the port cheap** is the face's own rules (lvgl-switch.md §2.2 to §2.5): a closed primitive set in `prim/`, the only code that creates LVGL objects (no paths, gradients, shadows, filters, transforms or opacity on chrome and art; painted light is an asset); fonts baked by `lv_font_conv` from the bundled file; PNG masters, indexed or 32-bit with straight alpha, baked to LVGL images at their pixel size; rig renders through the asset cache by id, never called by a word; and views, intent tables and events as plain JSON that run in Node.

| Risk | Mitigation |
| --- | --- |
| The face's vocabulary grows into a framework project | Its vocabulary is closed (station-layouts.md); rectangles are absolute from the spec; layout rules are a closed list; no general layout engine |
| Spec files and the document drift apart | One home for the numbers; `specs.test.mjs` checks the spec files against the wireframes and tables |
| Node's memory or the rig's speed on the Pi 4 proves too much | Rig work is background and cached by genome hash; the seam lets S2 replace the logic process without touching the face; measured when hardware work starts (lvgl-switch.md §2.10) |
| Inter from LVGL's fonts reads differently from the browser's | The sandbox draws with LVGL's fonts, so the type judged in the sandbox is the type the device draws |
| The device port differs from the sandbox's pixels | The same C face on both; golden framebuffer hashes equal on WebAssembly, native x86-64 and aarch64 |
| Splitting the Companion breaks the playable page | C1 makes no visible change; the smoke and parse checks stay |
| The Station palette moves while art and layouts settle (`ui/palettes/station.json`, 62 colours, painted art on top) | The renderer takes the palette as data (the `palette` message); the UI designer and the art director set it; the check follows |

## 7. The device split in brief

| Device | Face | Logic | Storage | When |
| --- | --- | --- | --- | --- |
| Station (Pi 4) | LVGL 9 in C: WebAssembly in the sandbox, DRM on the Pi | The sandbox's JavaScript, headless under Node on the Pi | `localStorage` in the sandbox; a file on the Pi | The face in the sandbox, screen by screen (lvgl-switch.md §3); the Pi at P1 |
| Companion (ESP32-S3) | LVGL 9 for chrome, an indexed renderer for the world view, the `common/` words | C, checked against the JavaScript reference's test vectors | Flash or SD | C1 and C2 in the sandbox; the device at P1 |
| Caddy (ESP32-S3) | LVGL 9 in four grays, the `common/` words | C firmware: Wi-Fi, TLS, SD, the four routes, the printer | SD | P1 |

<a id="8-assessment-the-real-lvgl-face-in-the-sandbox-now"></a>

## 8. The face in the sandbox

The Station page loads `face.wasm`. The views compute each screen's props in JavaScript and pass them as JSON. The C face sets LVGL objects from the spec file's rectangles, draws, and sends `{ target, verb }` back when a key is pressed. LVGL compiles to WebAssembly with Emscripten, and a small display driver copies the dirty rectangles onto the page's canvas. The rules never leave JavaScript, so the loop's mechanics change at JavaScript speed.

| | The face in the sandbox |
| --- | --- |
| Toolchain | Emscripten SDK pinned in CI and in builders' environments (`prototypes/face/emsdk.version`; about 1 GB installed, cached); CMake |
| Source | LVGL 9.6.0 unmodified, the 39 MB tree vendored at `v1/native/vendor/lvgl`, nothing downloaded; the face in C |
| Builder's loop for a layout change | Spec file: edit, reload (no compile). Word: edit, compile, reload |
| Debugging | C in the browser through source maps and DWARF; the same face also builds natively for Linux with SDL, where a debugger works. That build is S1's Pi face and the H0 proof at once |
| Fidelity | **The Station's device face itself**, the same C on the Pi; the same component library on the ESP32s, with only the display format differing |

On the Companion, LVGL draws into 16- or 32-bit buffers, not palette indexes, so the world view keeps an indexed renderer writing an 8-bit indexed image that LVGL shows. Chrome is drawn with anti-aliasing off, in palette colours, and checked at zero off palette from the framebuffer. Palette enforcement by construction holds for the world view only. LVGL's XML components are not in the open-source 9.6 tree, so the face does not use them; the spec files feed absolute positions.

The face's build plan, bridge, words, checks, budgets and milestones are [lvgl-switch.md](lvgl-switch.md). Which screens the face draws as built is `prototypes/face/README.md`.

## Not designed yet

- Generating the layout spec's tables and wireframes from the spec files.
- The form of the spec files compiled to C tables for the Companion and the Caddy.

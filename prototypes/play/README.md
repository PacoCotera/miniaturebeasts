# The play page

`/sandbox/play/` plays the Station and the Companion on one page (stacked, or side by side in a wide window), with the Caddy's Dock as a control on it. It is sandbox only: nothing here ships to a device, and each device page still runs alone and stays the gate (the Station's journey, goldens, layer and face checks run on `/sandbox/station/?dev&test`, unchanged).

## What it is

Two same-origin documents in one page (the workbench's bench is hidden, below), and the page's own chrome around them:

| Frame | Source | Size (lp) |
| --- | --- | --- |
| Station | `../station/?embed` (plus `&dev` and `&test` when the play page has them) | 1024 × 600 |
| Companion | `../exploration/?embed` (plus `&seed=<n>` and `&dev=1` as given) | 450 × 600 |
| Bench | `../workbench/` (hidden: the bench container, its handle and its tab are not shown and the frame is never loaded; the workbench's own page stays) | none |

`?embed` is each device's screen alone, at a whole number of physical pixels per device pixel: each screen keeps its whole CSS size (1024 and 450 px) and is scaled by `k / devicePixelRatio` with `k = max(1, floor(devicePixelRatio))`, set from a function that re-arms itself on every device-pixel-ratio change; on the page one lp is `z / devicePixelRatio` CSS pixels, where `z` is the page's size (below; `z = k` by default where nothing larger fits). The shell scales each frame as a whole by `z / k` from its top left, so every face pixel stays a `z × z` block of device pixels. The play page applies the same rule to every edge it places.

**The save.** The devices cross the save exactly as between two tabs: each writes its own part of `mb-save-v8` and hears the other through the `storage` event, which fires between same-origin frames unchanged. **The shell never reads or writes the save.** The Station frame computes the Caddy's state and posts it; the shell shows it.

## Layouts

The thresholds are CSS px of the window (`innerWidth`, `innerHeight`, the bar included), never lp. The faces keep the pixel rule (one lp is `k / devicePixelRatio` CSS px, never scaled at runtime); the page chrome (bar, keys, trays, gaps, text) is in CSS px, snapped to whole physical pixels.

**The size (`src/fit.mjs`).** `z` is a whole number of device pixels per lp. **Fit** (the default) is the largest `z` at which the layout does not scroll sideways and each device's block (its shell and its key tray) fits the window's height under the bar; the stack is taken whenever it gives a larger `z` than the row; never below `k`, where the tiers below are today's. The size control in the bar beside Keys ? (− / fit / +, the middle showing `×z`) and the keys `-` and `=` (or `+`) choose a `z` (1 to 8); the choice is kept per browser (`localStorage` `mb-play-z`, fit clears it). A chosen `z` larger than fits makes the page scroll; a face never shrinks below it. The Caddy's block, the shells, the trays' widths and the ring are in lp and grow with `z`; the keys, the tray rows and the bar stay in CSS px. `?test` keeps `z = k`, today's tiers, no size control and no stamp, so the journey's checks and its earlier captures are unchanged.

**The build stamp.** At the page's foot, in its bottom margin under every block, right-aligned to the content: `build <short> · YYYY-MM-DD HH:MM Mexico City` from the site's `build.json` (its UTC `built` converted to Mexico City time, `src/stamp.mjs`; the viewer's own zone is never used), `build local` with no `build.json`.

| Layout | When (CSS px) | Shows |
| --- | --- | --- |
| Row | W ≥ 1878 and H ≥ 800 | the Station and the Companion side by side (1040 + 24 + 466, centred); the Caddy's block under the Station, right-aligned to its shell; developer tools as a column |
| Stack | 1064 ≤ W < 1878, or W ≥ 1878 with H < 800 | the Station on top, the Companion under it, both centred, 24 between the blocks; the page scrolls (1,812 tall at dpr 1); the Caddy's block 24 under the cradle; a developer drawer |
| Narrow | W < 1064 | one device at a time, the one with the keys; the other keeps running, hidden; the bar's note says the Caddy's lines |

The bar is fixed at the top, 40 CSS px, with the Dock in it (the controls are 40 tall, the tabs at least 120 wide, Dock at least 168 wide); the page scrolls under it. A shell is its face plus 8 lp all round; its **key tray** is joined to its bottom, as wide as the shell, 72 CSS px a row of keys. Keys are 56 CSS px (Confirm 64), in groups (Station: D-pad 236 | rooms 248 | ← ✓ 128; Companion: D-pad 236 | Call ← ✓ 192). A row never shrinks a key or widens the shell: only the gaps between groups (16 to 8) and the side margin (8 to 4) shrink, and if the groups still do not fit they wrap to two rows (Station: D-pad and rooms, then ← ✓ right-aligned; Companion: the D-pad centred, then the actions centred). When a device takes the keys (a tab, `` ` ``, a click on its shell, the dock's contact beat) the page scrolls it wholly into view, its tray included (160 ms eased, a cut under reduced motion); a device already in view does not move the page. The page opens already revealed for the device with the keys (the Station), as a cut; a reload keeps no scroll position (at 1280 × 720 the Station's tray bottom meets the window's bottom).

## Keys

One device has the keys: the ring round its shell and tray, and its filled tab. A click on a device or a drawn key gives it the keys. The page's own keys are caught before any device hears them (a capture listener on each frame's window and on the shell's own), never while typing in a field:

| Key | Does |
| --- | --- |
| `` ` `` | next device: Station, Companion |
| Shift+`` ` `` | previous device |
| Shift+D | the Dock control |
| Shift+T | developer tools |
| Shift+/ (?) | the keys panel |

Every other key reaches the device untouched. Drawn keys press exactly as the keyboard does: `pointerdown` gives the device the keys and sends it a `keydown`, `pointerup` sends the `keyup`. They carry glyphs only; the names are `aria-label`s.

## The Caddy's screen

The Caddy's 792 × 272 four-gray e-paper (`src/caddy.mjs`) shows its two lines for the dock: "Companion home" with the crates, "charging", "{n} crates home" with the new pods after the opening, or "Companion out" with the partner. It is always shown, in its own 808 × 288 lp block (the view and an 8 lp bezel; the view at 1 lp per view pixel): 24 CSS px under the cradle, centred, in Stack; 24 under the Station's tray, right-aligned to the Station shell, in Row. It is e-paper and keeps its last lines: it redraws once per change of its lines and never animates. Narrow has no room for it: the bar's note shows the two lines as one for 4000 ms at each seat, lift and the opening's end. The Station posts what it needs in `mb-caddy` (`opened`, `partner`).

## The Dock control, the cradle and the seat

The control in the bar reads **Dock** with the outline mark while the Companion is away and **Lift** with the solid mark while it is docked, with an amber dot when crates are aboard. It is disabled (the word and the hint in stone) while the Companion has no world. The cradle under the Companion's key tray has a mint lamp when docked, and the shell sits 8 lp lower (into the tray). A press: seat (160 ms, a cut under reduced motion), ask, and on the Station's reply the contact beat: the lamp, the control and the keys cut together (Dock gives the keys to the Station, Lift to the Companion). A dock kept in a hold keeps the page seated and pressed until the hold ends; a page never sits pressed for more than a second with no answer.

Docked from the page while another device has the keys, the Station takes the keys and behaves as if it had them: the arrival plays over its screen and Later returns there (`frame.json` `navigation.dock`); a lift never moves the screen.

**The dock moments (T-20261016-58; `specs/station-dock-arrival-spec.md`, `specs/dock-moments.md`).** One seat or lift is one event seen from three places in step: the Station (the `mb-dock` message, the arrival or the send-off below), the Companion frame (the shared save's dock flag: its "home" and "Off we go" frames and its crate marks clearing as the Station confirms each crate) and the Caddy's screen (the Station's `mb-caddy` post). **Seated:** the Station plays the arrival over the screen the player is on, over Home from Idle, or after their next screen change when they are mid-decision (the plate says "The Companion is home" for 2 s): Cargo's bay with the ribbon, the link light, the crates sliding in, who came home standing big on the apron, the Probe's plates mending and who leaves, then one choice (Open the bay, Later); any key skips the show to the choice. **Lifted:** the screen never changes; on Home and Idle the sleepers on the bed wake, hop and dither out, and the plate says what went unfinished. The Dock control's keys are unchanged.

## postMessage contract

Both ends use `targetOrigin = location.origin` and check `e.origin` and `e.source`.

| Direction | Message | When |
| --- | --- | --- |
| shell → Station | `{ t: "mb-dock", keysElsewhere }` | the Dock control |
| shell → Station | `{ t: "mb-dev", on }` | developer tools toggled |
| Station → shell | `{ t: "mb-caddy", canDock, docked, crates, pending }` | at ready, after every `mb-dock`, and whenever the state changes |

## Developer tools

The drawer or column holds the Station's own developer panel (the Station frame builds it into the shell's `#devStation`). The Companion's Observer is on its own page.

## What W2 replaces

W1 is the iframe shell. W2 is one document with one store and one bus for both devices, replacing the frames; the `postMessage` contract and the `storage` crossing go with them.

## Running it

`node prototypes/play/tools/journey.mjs` (Playwright; `PW_DIR` names a directory holding `node_modules/playwright`) serves `prototypes/` as the sandbox does and plays the page headless: the layout at 1× and at device pixel ratio 1.25 (both screens pixel-equal to their own captures), the dock round trip with the keys, the landing rule and the lift, the narrow tier and a hidden Station's crate, the Stack at 1440 × 900 and 1280 × 720 with the dock round trip and the page scrolled to the Companion (the Station wholly in view after the contact beat), the layouts and key minimums measured at 1280 × 720, 1440 × 900, 1920 × 1080, 2560 × 1440 and 1440 × 900 at dpr 1.25 and 1.75, the Caddy's block always shown, a Companion crate crossing to the Station, a change of device pixel ratio with no resize (both screens on whole device pixels at 1, 1.25, 1.5, 1.75 and 2), and printed figures each with its bar (the page heap, the face's wasm memory, main-thread time a frame unthrottled and at 4×). `PLAY_CAPTURES=1` also writes the captures to `img/`. It runs in CI beside the Station's journey.

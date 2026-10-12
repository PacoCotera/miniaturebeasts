# The play page

`/sandbox/play/` plays the Station and the Companion side by side on one page, with the Caddy's Dock as a control on it. It is sandbox only: nothing here ships to a device, and each device page still runs alone and stays the gate (the Station's journey, goldens, layer and face checks run on `/sandbox/station/?dev&test`, unchanged).

## What it is

Three same-origin documents in one page, and the page's own chrome around them:

| Frame | Source | Size (lp) |
| --- | --- | --- |
| Station | `../station/?embed` (plus `&dev` and `&test` when the play page has them) | 1024 × 600 |
| Companion | `../exploration/?embed` (plus `&seed=<n>` and `&dev=1` as given) | 450 × 600 |
| Bench | `../workbench/`, set the first time the bench is shown | the bench container |

`?embed` is each device's screen alone, at a whole number of physical pixels per device pixel: each screen keeps its whole CSS size (1024 and 450 px) and is scaled by `k / devicePixelRatio` with `k = max(1, floor(devicePixelRatio))`, set from a function that re-arms itself on every device-pixel-ratio change; on the page one lp is `k / devicePixelRatio` CSS pixels. The play page applies the same rule to every edge it places.

**The save.** The devices cross the save exactly as between two tabs: each writes its own part of `mb-save-v8` and hears the other through the `storage` event, which fires between same-origin frames unchanged. **The shell never reads or writes the save.** The Station frame computes the Caddy's state and posts it; the shell shows it.

## Tiers

| Tier | When (lp) | Shows |
| --- | --- | --- |
| Wide | W ≥ 1878, H ≥ 800 | both devices, the Dock control and the cradle; the bench as a shelf when H ≥ 1072, else a handle and a sheet; developer tools as a column |
| Standard | 1064 ≤ W < 1878, H ≥ 800 | both devices on a row of 1546 that pans to the device with the keys (160 ms); the handle and the sheet; a developer drawer |
| Short | W ≥ 1064, 672 ≤ H < 800 | as standard with the focused device's keys in the bar, a band for the seat and the bench as a tab |
| Narrow | otherwise | one device at a time, the one with the keys; the other keeps running, hidden |

## Keys

One device has the keys: the ring on its shell, its filled tab and, in the short tier, its keys in the bar. A click on a device or a drawn key gives it the keys. The page's own keys are caught before any device hears them (a capture listener on each frame's window and on the shell's own), never while typing in a field:

| Key | Does |
| --- | --- |
| `` ` `` | next device: Station, Companion, Bench |
| Shift+`` ` `` | previous device |
| Shift+D | the Dock control |
| Shift+T | developer tools |
| Shift+/ (?) | the keys panel |

Every other key reaches the device untouched. Drawn keys press exactly as the keyboard does: `pointerdown` gives the device the keys and sends it a `keydown`, `pointerup` sends the `keyup`. They carry glyphs only; the names are `aria-label`s.

## The Dock control, the cradle and the seat

The control in the bar reads **Dock** with the outline mark while the Companion is away and **Lift** with the solid mark while it is docked, with an amber dot when crates are aboard. It is disabled (the word and the hint in stone) while the Companion has no world. The cradle under the Companion's shell has a mint lamp when docked, and the shell sits 8 lp lower. A press: seat (160 ms, a cut under reduced motion), ask, and on the Station's reply the contact beat: the lamp, the control and the keys cut together (Dock gives the keys to the Station, Lift to the Companion). A dock kept in a hold keeps the page seated and pressed until the hold ends; a page never sits pressed for more than a second with no answer.

Docked from the page while another device has the keys, the Station lands where it can be seen (`frame.json` `navigation.dock`); a lift never moves the screen.

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

`node prototypes/play/tools/journey.mjs` (Playwright; `PW_DIR` names a directory holding `node_modules/playwright`) serves `prototypes/` as the sandbox does and plays the page headless: the layout at 1× and at device pixel ratio 1.25 (both screens pixel-equal to their own captures), the dock round trip with the keys, the landing rule and the lift, the narrow tier and a hidden Station's crate, the short tier at 1280 × 690, a Companion crate crossing to the Station, a change of device pixel ratio with no resize (both screens on whole device pixels at 1, 1.25, 1.5, 1.75 and 2), and printed figures each with its bar (the page heap, the face's wasm memory, main-thread time a frame unthrottled and at 4×). `PLAY_CAPTURES=1` also writes the 1× captures to `img/`. It runs in CI beside the Station's journey.

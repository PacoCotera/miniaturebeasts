# The play page

`/play/` plays the Station and the Companion on one page, **one device in view at a time** (a panel centred in the window, a switch in the bar, nothing beside it), with the Caddy's Dock as a key on it. **The front door** (the site's Play links open this page): until the first pod is home (the Station holds a pod, a crate, a bud or a mibi: its `podHome` word, kept in `mb-play-podhome` so a reload paints right) the page opens on the Companion, the switch's Station half says "Station · asleep", and the first dock that brings a pod turns the page to the Station. `?test` pages keep the Station awake; `?test&new` is the new player's page. It is sandbox only: nothing here ships to a device, and each device page still runs alone and stays the gate (the Station's journey, goldens, layer and face checks run on `/play/station/?dev&test`, unchanged).

## What it is

Two same-origin documents in one page, and the page's own chrome around them:

| Frame | Source | Size (lp) |
| --- | --- | --- |
| Station | `../station/?embed` (plus `&test` under the test harness) | 1024 × 600 |
| Companion | `../exploration/?embed` (plus `&seed=<n>` under the test harness) | 450 × 600 |

The standalone Companion Field Test page is retired: `exploration/` with no query redirects to the play page; the Observer (a developer tool) is `exploration/?observer`, which the Options panel links to with Developer tools on.

`?embed` is each device's screen alone, at a whole number of physical pixels per device pixel: each screen keeps its whole CSS size (1024 and 450 px) and is scaled by `k / devicePixelRatio` with `k = max(1, floor(devicePixelRatio))`, set from a function that re-arms itself on every device-pixel-ratio change; on the page one lp is `z / devicePixelRatio` CSS pixels, where `z` is the page's size (below; `z = k` by default where nothing larger fits). The shell scales each frame as a whole by `z / k` from its top left, so every face pixel stays a `z × z` block of device pixels. The play page applies the same rule to every edge it places.

**The save.** The devices cross the save exactly as between two tabs: each writes its own part of the v8 save and hears the other through the `storage` event, which fires between same-origin frames unchanged. **The shell never reads or writes the save.**

**The Companion is the player's identity.** Every save is keyed by its Companion's id (`station/src/companions.mjs`): each Companion makes a stable random id once (`mb-companion-A`, `mb-companion-B`) and keeps its save under `mb-save-v8@<id>`; the single shared save of earlier builds (`mb-save-v8`) moves under Companion A's id at the first load, byte for byte. The Station keeps the map in its own storage (`mb-station-companions`: the active id and the known ids); the active id is the last Companion docked, and the Station and the Caddy show that player's world until another Companion docks. The **Companion** row in Options chooses the second Companion (it applies when the panel closes: the page reloads and the frame holds a world of its own). Replacing a lost Companion is not built (`replaceCompanion` is the seam).

## Layouts

**One device in view, everywhere** (`src/layout.mjs`, pure, tested in `tests/layout.test.mjs`; built for the phone first: the devices never sit side by side). A device is one **panel**: its screen and its keys on `panel`, a `hairline` edge and `radius-12`, centred in the window with room round it. The other device keeps running, hidden (`visibility`), and is never beside it. Nothing scrolls (the stage is clipped), except for a size chosen with the laptop's size control that is larger than the window. `plan({ W, H, dpr, coarse, dev, asleep, hint, zSet })` returns every box in window CSS px (bar, panel, screen, the tray's box and its key plan, the Dock key, the dock's-screen button, the note, the turn hint, the build line); `shell.mjs` only places what it returns. The form comes from the window: a touch device whose short side is under 600 CSS px is a phone (`up` held upright, `side` on its side); a touch device with a larger screen is a laptop; a window with a fine pointer is a laptop only where the Companion fits at ×1 under the laptop plan and the bar's controls stand apart (`laptopFits`); otherwise it takes the phone form for its orientation, so a narrow window with a mouse gets the phone layout and the size control never reads below ×1.

| Form | Panel | Keys | Dock |
| --- | --- | --- | --- |
| Phone upright | 24 from each side, the screen at the fit scale (nearest-neighbour), 12 inside | under the screen; the D-pad, Call, ← and ✓ on the same line for both devices (placed once, from the Companion's panel and dock row, centred between the bar and the build line); the Station's four room keys in one row above that line | one row 16 under the panel: the Dock key (full words) and the dock's-screen button (104 × 44) |
| Phone on its side | centred, 24 from the sides at the most | a column each side of the screen: the D-pad at the left (the Station's rooms 2 × 2 under it; the Companion keeps that space empty so the D-pad never moves), the actions at the right | the Dock key (short words) and the button at the foot of the right column |
| Laptop | at most 1040 wide, at least 48 from each side, 16 above and below; the Companion at a whole number of device pixels per lp where one fits (1:1 at dpr 1), the Station at its fit scale, never above 1 | as on its side (*a* = 44) | as on its side |

Tokens: phone side margin `space-24`; laptop side margin at least `space-48`; `space-16` between attached blocks (the panel and the dock row, the note and the panel, the hint and the note); `space-12` inside the panel (the tray's edge); `space-8` between the Dock key and the dock's-screen button. The bar is 52 tall everywhere with 44-tall controls, `space-16` padding and `space-8` between (`barPlan`): upright the switch fills the bar left of Options; on its side the build line sits between them; on a laptop the build line is the bar's left end, the switch 320 wide and centred, and Keys ?, the size control and (with the Developer tools option) the Tools button stand before Options.

**The size (`src/fit.mjs`, `layout.mjs`).** On a phone the screen takes the fit scale (a smooth step, nearest-neighbour). On a laptop the size control in the bar (− / fit / +, the middle showing `×z`) and the keys `-` and `=` (or `+`) choose a `z` for the Companion (1 to 8 device pixels per lp); the Station keeps its ratio to its fit. The choice is kept per browser (`localStorage` `mb-play-z`, fit clears it). `?test` has no size control and no build stamp.

**The switch (`options/src/switch.jsx`, Radix Tabs).** Two equal halves, "Companion" then "Station", always in that order. The half in view is `panel` with `bone` words, the other `mist`. Until the first pod is home the Station's half says "Station · asleep"; the first dock that brings a pod turns the page to the Station itself. **News:** an 8-px amber dot after the label of the device out of view: the Station woke, crates wait in its bay, or its arrival choice waits; it clears when that device comes into view (the dot's spoken name is hidden text). The Companion's own news is the lit Dock key. `` ` `` takes the next device and Shift+`` ` `` the previous; with the switch focused, ← and → move between the halves. **There is no "who has the keys" ring, no click-to-give-keys and no scroll-into-view:** the device in view always has the keys.

**The Station's asleep note.** One note 16 above its panel (upright and laptop): the asleep mark and "It wakes when your first pod comes home." On its side there is no room above, so the note takes the build line's place in the bar while the asleep Station is in view. The turn hint ("Turn your phone sideways for a bigger Station") shows once, upright, above the note (or above an awake Station's panel), only where turning gives a bigger Station (`biggerTurned`).

**The build stamp.** `build <short> · YYYY-MM-DD HH:MM Mexico City` from the site's `build.json` (its UTC `built` converted to Mexico City time, `src/stamp.mjs`; the viewer's own zone is never used), `build local` with no `build.json`: at the phone's foot (right-aligned to the panel), in the bar before Options (on its side) or at the bar's left end (laptop).

**The build footer.** `src/footer.mjs` is the one line the website, the Station page and the Companion page show in their bottom margin: `© 2026 Dirty Pawz Press · {short hash} · {dd/mm HH:MM} · save v{schema} · Caddy {online|offline}` (the time in Mexico City, `local` with no `build.json`; the save version and the Caddy part only where the page has them). Its formatting is tested in `tests/footer.test.mjs`.

**The keys: one family at every size (`src/keyplan.mjs`, `options/src/keytray.jsx`, `ui/keys.css`).** One measure, *a*, is the D-pad's arm; every other size is a fixed multiple of it, rounded to 4 px, so the controller is the same device at every size (the D-pad is 1.74 to 1.8 times ✓, as on the devices' own pages: 1.70 and 1.82):

| Part | Size | Shape |
| --- | --- | --- |
| D-pad | 3a across: four arms round a hub, each a × a | a cross, outer corners round (radius 8), inner corners square |
| Call, ←, the Station's four room keys | 1.2a | circle (Call, ←), square with radius 8 (rooms) |
| ✓ | 1.7a | circle, the largest key |
| Gap in a group | a/4, never under 8 | between groups a/2; the panel's edge 12 |

*a* is 44 on a laptop and, on a phone, the largest of 44, 48, 56 that fits (48 on a 390 × 844 or 844 × 390 phone). Call stands above ←, ✓ to their right, centred on that column. The D-pad is 4-way: its touch area is one zone, split into four wedges by its diagonals, the newest direction winning (the hardware's four switches); the dead centre (radius a/3) presses nothing. Every other key takes touches up to half the gap round it (inside the panel), never under 44 × 44. Keys press as the keyboard does (pointerdown = keydown, pointerup = keyup), stay out of the tab order and are never disabled; the focus ring (shown when a script focuses one) is two-tone: 2 px `focus` between two 2 px `void` edges, 4 px out. ← and ✓ carry the cap icons (`exploration/shell/cap-back-10mm.png`, `cap-confirm-10mm.png`), Call the wave glyph, the room keys the 24-px marks at whole pixels. On a laptop a hover hint names the keyboard key. The tray is a transparent box over the panel (under the screen upright, the whole panel otherwise); only its keys take a touch.

**The Dock key** is a page button (the bar's button family, 44 tall; a Radix Toggle, pressed = docked). Its words follow the width it has and are never cut with "…": 196 or more "Dock · after the expedition" / "Dock the Companion" / "Docked · Lift to go out" with the ⇧D hint (hidden on a touch screen, and dropped where the words alone only just fit), 96 to 195 "Dock" / "Lift", under 96 the mark alone (the words stay in its `aria-label`). It is the same on both devices, because a docked Companion is lifted from either.

## The dock's screen

The Caddy's 792 × 272 e-paper draws the face of `caddy/face.mjs` (C0 to C4, two-ink Mibi, the ledger, the status row) from the Caddy service's own state and the two frames' words, with the panel's timing: a partial appears 0.8 s after its change, over the regions that changed; a full refresh (at boot, after five partials at a quiet moment, daily at 00:05, never within 10 s of a beat) blacks the panel, whitens it, then draws, over 4 s. Until the first face is drawn it is blank paper, not black. The shell draws it into an off-screen canvas (`#caddyView`) and hands every picture on (`dockScreen.paint`):

- **The dock's-screen button** (`options/src/docksheet.jsx`) next to the Dock key shows a live miniature (92 × 33) of the e-paper; it carries an amber dot when the dock needs a hand (the amber lamp).
- **Opened** (a Radix Dialog), the screen shows whole: a bottom sheet with a scrim on a phone (the e-paper across its width, 358 × 128 on a 390-wide phone), the same dialog centred on a laptop; the two cradle lamps with their words ("Companion cradle", "Station cradle"; each the placed 8 px lamp picture: off, seated, taking, done, needs a hand) and Done. There is no visible caption: the e-paper's own lines say what it is; the dialog's title and the button's name are hidden text, "The dock's screen".
- The always-shown block, the cradle strip under the Companion's tray and the 8-lp seat drop are gone: seated is shown by the Dock key's own docked look.
- The recovery print's card (sandbox) is a card fixed at the window's foot while a print waits.

`tools/phone.mjs` (run by hand; it is the touch-emulated test) and `tools/journey.mjs` section L are the browser checks; `tests/keyplan.test.mjs` the key geometry.

## The Dock control and the seat

The **Dock key** (`#dockKey`) is quiet ("Dock · after the expedition") until crates are aboard, then lit and pulsing ("Dock the Companion"); seated it reads "Docked · Lift to go out" with the solid mark. It is disabled (the word and the hint in stone) while the Companion has no world. **The Dock key and Shift+D stand in for the cradle's hall sensor**: a press asks the Caddy service to seat or lift the cradle (`POST /caddy-api/v1/dock/seat`); on its answer the contact beat: the key and the keys cut together (Dock gives the keys to the Station, Lift to the Companion). The page asks the Companion frame for its word for that seat (`mb-seat`, answered by `mb-companion`: its id, name, world and crates, the stand-in for its hold); once it is in, the Station is handed the dock (`mb-dock` with `want` and the Companion) and runs it on the shared save as before. The page follows the service's stream (`/dock/events`: the snapshot, then dock and face events, a heartbeat; reconnecting at 1, 2, 4, 8, 16 s, then every 30 s) and seats the Station's own cradle for its world. With no service to answer, the page senses the cradle itself and the dock works as before; a page never sits pressed for more than a second with no answer.

Docked from the page while another device has the keys, the Station takes the keys and behaves as if it had them: the arrival plays over its screen and Later returns there (`frame.json` `navigation.dock`); a lift never moves the screen.

**The dock moments (T-20261016-58; `specs/station-dock-arrival-spec.md`, `specs/dock-moments.md`).** One seat or lift is one event seen from three places in step: the Station (the `mb-dock` message, the arrival or the send-off below), the Companion frame (the shared save's dock flag: its "home" and "Off we go" frames and its crate marks clearing as the Station confirms each crate) and the Caddy's screen (the Station's `mb-caddy` post). **Seated:** the Station plays the arrival over the screen the player is on, over Home from Idle, or after their next screen change when they are mid-decision (the plate says "The Companion is home" for 2 s): Cargo's bay with the ribbon, the link light, the crates sliding in, who came home standing big on the apron, the Probe's plates mending and who leaves, then one choice (Open the bay, Later); any key skips the show to the choice. **Lifted:** the screen never changes; on Home and Idle the sleepers on the bed wake, hop and dither out, and the plate says what went unfinished. The Dock control's keys are unchanged.

## postMessage contract

Both ends use `targetOrigin = location.origin` and check `e.origin` and `e.source`.

| Direction | Message | When |
| --- | --- | --- |
| shell → Station | `{ t: "mb-dock", want, keysElsewhere, companion }` | the cradle's state the Station should follow (`want`, seated or not; without it a press toggles), and the Companion that docked: a Companion the Station does not show becomes the active one and its world is loaded |
| shell → Station | `{ t: "mb-dev", on }` | developer tools toggled |
| Station → shell | `{ t: "mb-caddy", podHome, goal, canDock, docked, crates, pending, opened, partner, world, companion, ledger, along }` | at ready, after every `mb-dock`, whenever the state changes, and every 5 s (the Station's heartbeat for the Caddy's link) |
| shell → Companion | `{ t: "mb-seat", seat }`, `{ t: "mb-silent", on }` | a seat to answer; the drawer's "Companion silent" |
| Companion → shell | `{ t: "mb-companion", id, name, slot, wid, crates, seat }` | at load, whenever it changes, and as the answer to a seat |
| shell → either device | `{ t: "mb-note-ask", id }` | a play note's details are wanted (when a note opens and when it is sent) |
| either device → shell | `{ t: "mb-note-state", id, state }` | the answer: the Companion's world, place, turn, expedition, carried, map counts and last 12 events; the Station's screen and store. The shell waits 600 ms, then sends without it |

## Developer tools

The drawer or column holds the Caddy's three problems, each a switch: **Companion silent** (the Companion frame holds back its word: C1, then C4a and the amber lamp after 10 s; lift and seat with it off), **Station quiet** (the page stops hearing the Station and hands it nothing: C4b after 15 s with the link crossed, the dock reaching the Station when it is off), **Caddy fault** (the service refuses writes: C4c, amber, nothing taken). Under them, the Station's own developer panel (the Station frame builds it into the shell's `#devStation`). The Companion's Observer is on its own page.

## The Options panel

No option hides in a URL. The bar's **Options** button (the right end of the bar, everywhere) opens one panel (`options/`, React + Radix, built to `vendor/options.js`; `npm run build` in `options/` rebuilds it) with a switch or a choice and one line for each: **Playtest waits** (on until a person sets the options: the play page stores it once), **Developer tools**, **Companion** (A or B), **Jump** (the game's own, arrival, fork), **Name list**, **Baked place**, and **Reset the whole game**. The settings are one stored value, `mb-options` in localStorage (`src/options.mjs`); the Station, the Companion and the compare page read it themselves, so nothing is handed through a URL. Developer tools applies at once; the rest apply when the panel closes (the page reloads). Tests set the same key before the page loads (`optionsInitScript`, or `addInitScript`). Only test-harness flags stay in URLs: `?test`, `?embed`, `?raw`, `?seed`, `?firstms` (with `?test`), and the cache-busting `v` of the masters.

The **One place everywhere** choice shows its named empty value ("The usual map") instead of a blank: `OPTION_DEFAULTS.place` is `""` and the select treats a missing value as empty (`tests/options-default.test.mjs`). The foot: the apply note stands on the Done row, left of Done (14 px `fog`); the build line is the panel's last line under its own hairline (12 px `mist`, tabular figures).

## The first-load wait

While the Companion reads the land (the realm worker's stages, then the art and place files), its own screen holds the line "The Probe is reading the land" and ten pips under it (14 × 8 lp, 4 apart, 32 lp under the line's centre): `mint` when done, `ink` with a 2 lp `slate` edge when not. They fill from **real** steps, never a timed fake: `realm7(seed, onStep)` reports each region pass and the coast (`REALM_STEPS`), the worker posts `{ step, of }`, `readyRealm(seed, times, onStep)` passes them on (a realm already cached or kept in the browser's store jumps to full at once), and the loaders count their files (`FILES` in `exploration/index.html`). `waitPips(realmDone, realmOf, filesDone, filesOf)` (`exploration/src/waitpips.mjs`, tested in `exploration/tests/waitpips.test.mjs`) gives 0 to 10, the realm 60 % and the files 40 % (a first guess: measure the split on a real first load); the pips never go back. The pips are a code-drawn UI component on the device's screen (rule 18).

## Play notes

Options' first row, **Send a note**, opens a note: pictures in a row (the played device's screen as it was when Options opened is already in), **+ Whole screen**, **+ Section** (react-image-crop), **+ Last 10 seconds**, **Record a clip** (up to 15 s), a text box (react-textarea-autosize, 3 lines growing to 6), "Sent with it" in plain words, Delete (asked first), Keep playing, Send. The note's words are `src/note-strings.json` as the copywriter wrote them. Keep playing leaves the note open: the bar then holds **Note · n** and **+ Whole screen ⇧N** (Shift+N does the same; a strip at the foot of a phone), and while recording **Recording m:ss · up to 0:15** and **Stop**. Shots are the device's own `#screen` canvas (`toBlob`, PNG): the bar and the dialogs are never in them. The clip is WebCodecs `VideoEncoder` fed every frame of the played device's canvas, a key frame each second, the chunks kept in a 10 s ring that always starts at a key frame (`ClipRing`, `src/notes.mjs`); Mediabunny packs them into an MP4 (H.264 where the browser encodes it, else VP9 or AV1). Where WebCodecs is missing only Record works, through `captureStream()` + `MediaRecorder` (WebM).

A note goes to the queue in IndexedDB (idb-keyval), then `POST /caddy-api/v1/notes` (multipart: `text`, `source`, `context` JSON, `shot` and `clip` parts; the route is the Caddy service's). A note the route does not take yet (offline, 404, 429, 5xx) stays queued and goes when the page is next online (every minute, and on `online`). Limits: 8 pictures, 2 clips, 20 MB. The source is the stored setting `noteFrom` ("owner" by default; the agent testers store their persona there; no Options row). The context: build, time, Companion slot, layout and size, which device was played, and the answers to `mb-note-ask`. Never a name, address, IP or user-agent string. The logic is `src/notes.mjs` (tested in `tests/notes.test.mjs`); the pictures and clips are `src/clip.mjs`; the screens are `options/src/note-ui.jsx` and the state `options/src/controller.js`. `tools/notes-journey.mjs` is the browser journey, with the route stubbed.

## The playtest preset

The panel's **Playtest waits** turns on the playtest preset: every wait of the loop cut so an outside tester finishes it in about an hour from a fresh save (`src/playtest.mjs` is its one place: the Station's settings; the game's own defaults are untouched with it off). Both frames (and the second Companion) read the option. Nothing is saved: the Station lays the preset over its settings in memory, and says so on its Settings screen (the realm row's detail) and nowhere else. **Reset game** in the panel asks twice (the first confirm erases nothing; only the second, "Yes, erase everything", does), then at the next load, before any frame is set, erases this browser's worlds (`mb-play-podhome`, `mb-save-v8*`, the older `mb-exploration-v*`, the Station's settings key; the Companions' identities and the options stay).

| Wait | Game | Preset |
| --- | --- | --- |
| the Sitting | 3 hours | 1 minute |
| a bud in the Incubator (5 / 20 + n min) | real time | ×10: 30 s / 2 to 3 min |
| juvenile to adult | 2 world turns | 1 |
| adult to elder | 16 world turns | 4 |
| the bench's habit watch | 60 s | 5 s |
| the mock painter | 20 s | 5 s |

## What W2 replaces

W1 is the iframe shell. W2 is one document with one store and one bus for both devices, replacing the frames; the `postMessage` contract and the `storage` crossing go with them.

## Running it

`node prototypes/play/tools/phone.mjs` (Playwright; `PW_DIR` names a directory holding `node_modules/playwright`) is the touch-emulated page test at 412 × 915, 390 × 844 and 915 × 412: one device in view, the bar's switch and Options, every key a 44 touch target and a tap sending its key, the D-pad row at one height on both devices, the dock's sheet, the turn hint once. `node prototypes/play/tools/journey.mjs` (`JOURNEY_ONLY=L` for the layout section alone) serves `prototypes/` as the sandbox does and plays the page headless with a mouse: section L (the panel and the screen at the numbers of `layout.mjs` at 1440 × 900 and 1280 × 720, nothing scrolls, the switch, the Companion's screen pixel-equal to its capture, the dock's sheet, the asleep note), then the dock round trip with the keys, the Caddy dock's play-through with the Caddy service in mock mode beside the static server, the second Companion and the device-pixel-ratio sections. `PLAY_CAPTURES=1` also writes the captures to `img/`.

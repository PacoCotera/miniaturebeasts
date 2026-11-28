# The Companion's code structure

How the Companion's code is laid out: the layers, their folders, which layer may import which, and how the one-file page (`index.html`, about 10,000 lines of script) is taken apart into them. Owner: "ensure that the refactoring structures the companion code correctly, with separation of concerns. logic, ui, interaction, rendering, sound, etc".

## The layers

Each layer is a folder under `src/`. A module belongs to exactly one layer, the one its folder names.

| Layer | Folder | Holds | Never |
| --- | --- | --- | --- |
| Content | `src/data/` | Tables and words: tuning numbers, the day's parts, the walk's rows, player-facing words, the palette, glyphs, art manifests, playtest seeds. Lookups only. | a rule, a drawing, anything that changes |
| Logic | `src/logic/` (the realm generator in `src/logic/gen7/`) | The game's state and every rule: the realm and its places, creatures and habits, the Call, light and the day, the storm and the fog bank as weather, items and the hold, the seen record, the expedition, the world turn. State and a seed in; state and events out. | the DOM, a canvas, audio, timers, the clock, storage, the network |
| Persistence | `src/store/` | Save and load, save migrations, the keyed stores (places, realm, packages), the Companion's identity and keys, the Options panel's settings. | drawing, input, a rule decision |
| Sound | `src/sound/` | The sound table and the one player. | game state, drawing |
| Rendering | `src/render/` | Reads state and draws: the pixel core, art loading and decoding, tiles and sprites, light tables, the place view, the map, the camera, effects, picture caches. | changing game state, deciding a rule, reading input, storage |
| UI | `src/ui/` | The screens, built from rendering's pieces: top bar and bottom line, message box and signs, menus, Probe, Cargo, Mibis and her pages, the log, cards, notices. Its own state: which screen is open, the focus. | changing game state, reading keys |
| Interaction | `src/input/` | Keys, pointer and shell buttons turned into actions: press, hold, repeat, which screen takes the press, the one entry `act`. | drawing |
| Main | `src/main.mjs` (the page), `src/worker.mjs` (the places worker) | Wiring only: boot, the frame loop, attaching listeners, handing the rules' events to sound, effects and save, the page around the device (fit, footer, Observer). | a rule, a drawing of its own |

`index.html` ends as markup, styles and one `<script type="module" src="./src/main.mjs">`.

## Who may import whom

```
data  <-  logic  <-  store
                 <-  render  <-  ui  <-  input
data  <-  sound
main  ->  all of them; nothing imports main
```

| A module in | may import |
| --- | --- |
| data | data |
| logic | data, logic |
| store | data, logic, store |
| sound | data, sound |
| render | data, logic, render |
| ui | data, logic, render, ui |
| input | data, logic, ui, input |
| main | every layer |

Logic imports nothing above it. The table is `src/layers.json`; the check below reads it.

## How the layers meet without importing upward

- **State.** One module, `src/logic/state.mjs`, holds the game: the saved game `S`, the mounted region `G`, the expedition. Rules change it; every other layer only reads it. A drawing or a screen that writes game state is a defect: the write moves into a rule.
- **Events.** A rule never plays a sound, starts an effect, writes the save or sets a timer. It reports what happened as an event (today's `FX` notes, `fxJuice`, `fxSign` and `logEv` are this seam, half built). After each action main hands the events on: sound plays them, rendering starts their effects, persistence saves once.
- **Time.** A rule never reads the clock. Main passes the time in (`NOW`) with each action and each frame.
- **Screens and keys.** Interaction asks the UI which screen is open and moves its focus, and calls the rule for the action; it never draws. The frame loop in main draws after it.

## The check

```
node prototypes/exploration/tools/import-check.mjs
```

Reads every module under `src/`, takes its layer from its folder, and fails with one line per forbidden import. It runs in the build job before the bundle and takes well under a second. `src/layers.json` also names the layer of each module written before the folders (`notMoved`), and of the code shared with other pages (`outside`): `prototypes/core/base` and the place bake and format are logic, the rest of `prototypes/places/src` is rendering, the realm's keys and the Options settings are persistence. A new module goes in a layer's folder; `notMoved` only shrinks.

## Where today's modules belong

| Layer | Modules in `src/` today |
| --- | --- |
| data | `walk-data` |
| logic | `world`, `world7`, `adapt7`, `bake7`, `shore7`, all of `gen7/` |
| render | `atlas`, `trees48`, `pngdecode` |

The stores start the places worker (`src/worker.mjs`) by its address, never by an import.

## Where the page's script goes

Sizes are the script's characters by its own section headings, in thousands.

| Section of `index.html` | Size | Goes to |
| --- | --- | --- |
| 0 palette, 1 constants | 10 | `data/` (palette, tuning); the save key and the Companion's identity to `store/` |
| 3 world generation, 4 patch layouts | 54 | `logic/` (life, pods, the layout of a place); art loading and the picture caches to `render/`; warming the next cells to main |
| 5 state and effects hooks, the first ten minutes, signs | 79 | `logic/state.mjs` and `logic/events.mjs`; teaching and sign rules to `logic/`; the sound table to `sound/`; save, load and migrations to `store/` |
| 6 signs, fog, map states and map rules | 43 | `logic/` (the seen record, reach, the storm, the fog bank) |
| 7 patch rules, 8 creatures and the partner, 9 expedition end and world turn | 202 | `logic/` |
| 10 pixel graphics core, 11 the frame | 129 | `render/` (the frame is `render/frame.mjs`); the mibis' token strings to `data/` (`data/tokens.mjs`) |
| 12 world map, 13 living patch | 130 | `render/` |
| 14 HUD, bottom line, mode screens | 131 | `ui/` |
| 15 screen dispatch | 20 | `ui/` (which screen draws); the frame loop to main |
| 16 input | 19 | `input/` |
| 17 page, 18 boot | 26 | main |

Measured on the page as it stands: of 850,000 characters of declarations, 110,000 touch no state and no platform and 90,000 only draw from their arguments; these move as they are. The rest reaches state, and through its calls a rule today reaches sound, the save or a canvas. That is what the event seam removes.

## How the page gets there

Each step is one or more pull requests that move code without changing what the player sees; a step that removes dead or doubled code says so with its line count.

1. This page, the check and its place in the build job.
2. What touches no state: tables and constants to `data/`; the palette, the pixel core and the art builders to `render/`.
3. The event seam: `logic/events.mjs`; sound out to `sound/`; save, load and migrations out to `store/`; timers and the clock out of the rules.
4. `logic/state.mjs`, then the rules section by section (6, 7, 8, 9).
5. The seen record, the edge shaper and the one window drawer are written straight into the structure: `logic/seen.mjs`, `render/edge.mjs`, `render/window.mjs`, each deleting the page code it replaces.
6. The screens to `ui/`, the keys to `input/`, boot and the frame loop to `main.mjs`.
7. One move of the modules listed in `notMoved` into their folders, after which that list is empty and is deleted.

## Rules for a move

- A module that moves keeps its exports; the page imports them by name until its own turn comes.
- Drawing code that moves takes its rows in `art/draws.json` with it in the same commit: the count of drawing calls never grows by a move.
- The tests run the page through `tests/page-harness.mjs`, which binds every name the page imports from `src/`, folders included. A test of a rule imports the rule's module; only a test of the screen runs the page.

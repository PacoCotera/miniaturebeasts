# Pods masters: the painted layer of the Pods screen

> Painted from the accepted candidate PV-D-r3-a4 ([`art/concept-station/pods-v2/`](../../concept-station/pods-v2/README.md)), cut to the rectangles of [`design/style-guide/station-layouts.md`](../../../design/style-guide/station-layouts.md) (Pods). One PNG per piece and state, 1×, straight alpha, text slots empty, placed 1:1 by the builder. **Status: judged by the art director 2026-10-08: the screen fails against the concept; six slices signed, the rest returned (see the art director's column below).**

**How they were made.** The image tool painted each family from the candidate as the reference (the prompts, references, hashes, seconds and outcome of every call are in [`log/calls.jsonl`](log/calls.jsonl): 27 calls, all succeeded, none retried by the tool; 14 of the generations are used, the rest were rejected tries). Each result was keyed off its flat ground (magenta key, or colour-to-alpha on the glass), cut, cleaned and resampled down to the exact rectangle by [`tools/build.py`](tools/build.py); the plates, tabs, panes and frames are 9-sliced from one painted master so their corners are painted once and never stretched. Retro Diffusion was not used: these are soft painted materials, outside the trial's rules. Everything is in the Station's painted layer, so it is full colour and off the 62-colour chrome palette by design; type and the progress arcs are the build's.

## The proof

<img src="composite-pods-read-1024x600.png" width="720" alt="Pods Read, composed from the slices">

*composite-pods-read-1024x600.png: the whole Pods Read screen at 1× from the slices alone, the decided strings typed over them in Inter 16, 20 and 28. The trait pictures are crops of the candidate's painting, the progress arcs and the stamp are stand-ins drawn only for this proof (the stamp is the candidate's placed one), and the lamps and emblems of the rail are not painted. A proof, not a deliverable the page uses. Status: proof.*

<img src="composite-vs-candidate.png" width="720" alt="Composite beside the accepted candidate">

*composite-vs-candidate.png: the composite (left) beside the accepted candidate PV-D-r3-a4 (right). The layout differs on purpose: the layout spec puts the pod on the left third and the page on the right, the candidate has them the other way round. Status: proof.*

<img src="contact-sheet-1x.png" width="720" alt="Contact sheet of every slice at 1x">

*contact-sheet-1x.png: every slice at 1×, on a flat dark ground, named. Status: for review.*

## Slices

Each slice is named by the register id it replaces (`room`, `ring`, `page`, `trait-picture`, `stamp`, `pod`); where the register has none, the id is **proposed** (`rail-tab-*`, `plate-*`, `frame-*`, `room-shelf`). Rectangles are the concept's re-layout (branch `design-pods-relayout`, 962f71d): the pod's box is bottom-centred on (712, 400), the dish is (600, 352, 224, 72), the page (176, 112, 408, 440), the stamp label (888, 248). A tab's x is 176 + 120 i (112 wide), 180 + 104 i (96 wide) or its slot in the compact rail; its y is 48. Hashes and sources: [`slices/manifest.json`](slices/manifest.json).

### Top bar and bottom line (signed)

| Slice id | Size | Rect on the screen | Made by |
| --- | --- | --- | --- |
| `frame-bottom-line-1024x38` | 1024×38 | (0, 562, 1024, 38) | the bar flipped (rule on its top edge), 1024x38 |
| `frame-top-bar-1024x40` | 1024×40 | (0, 0, 1024, 40) | key magenta, cut, 1024x40 |

### Page pane (signed)

| Slice id | Size | Rect on the screen | Made by |
| --- | --- | --- | --- |
| `page-pane-408x440` | 408×440 | (176, 112, 408, 440) | 9-slice of the generated pane, corners kept at 1x |

### Name, origin and message plates

| Slice id | Size | Rect on the screen | Made by |
| --- | --- | --- | --- |
| `plate-message-640x36` | 640×36 | (192, 514, 640, 36) | thin frosted label: 9-slice, rounded |
| `plate-message-640x56` | 640×56 | (192, 494, 640, 56) | thin frosted label: 9-slice, rounded |
| `plate-message-640x76` | 640×76 | (192, 474, 640, 76) | thin frosted label: 9-slice, rounded |
| `plate-name-224x32` | 224×32 | (600, 440, 224, 32) | thin frosted label: colour-to-alpha, 9-slice, rounded |
| `plate-origin-224x40` | 224×40 | (600, 480, 224, 40) | thin frosted label: colour-to-alpha, 9-slice, rounded |

### Pods: one systematic pod in layers

| Slice id | Size | Rect on the screen | Made by |
| --- | --- | --- | --- |
| `pod-large-band` | 160×192 | (632, 208, 160, 192) | the sealing band as a layer |
| `pod-large-crack` | 160×192 | (632, 208, 160, 192) | systematic pod layer: crack, uniform scale, foot on the last row, centred |
| `pod-large-identified` | 160×192 | (632, 208, 160, 192) | the Loika reference sprite |
| `pod-large-mask-accent` | 160×192 | (632, 208, 160, 192) | systematic pod layer: mask-accent, uniform scale, foot on the last row, centred |
| `pod-large-mask-body` | 160×192 | (632, 208, 160, 192) | systematic pod layer: mask-body, uniform scale, foot on the last row, centred |
| `pod-large-pattern-bands` | 160×192 | (632, 208, 160, 192) | systematic pod layer: pattern-bands, uniform scale, foot on the last row, centred |
| `pod-large-pattern-dots` | 160×192 | (632, 208, 160, 192) | systematic pod layer: pattern-dots, uniform scale, foot on the last row, centred |
| `pod-large-pattern-stripes` | 160×192 | (632, 208, 160, 192) | systematic pod layer: pattern-stripes, uniform scale, foot on the last row, centred |
| `pod-large-sealed` | 160×192 | (632, 208, 160, 192) | the Loika reference sprite |
| `pod-large-shade` | 160×192 | (632, 208, 160, 192) | systematic pod layer: shade, uniform scale, foot on the last row, centred |
| `pod-large-shadow` | 176×14 | (624, 393, 176, 14) | contact shadow: centred on x 712 with its middle on the foot line y 400 |
| `pod-medium-band` | 136×168 | (644, 232, 136, 168) | the sealing band as a layer |
| `pod-medium-crack` | 136×168 | (644, 232, 136, 168) | systematic pod layer: crack, uniform scale, foot on the last row, centred |
| `pod-medium-identified` | 136×168 | (644, 232, 136, 168) | the Loika reference sprite |
| `pod-medium-mask-accent` | 136×168 | (644, 232, 136, 168) | systematic pod layer: mask-accent, uniform scale, foot on the last row, centred |
| `pod-medium-mask-body` | 136×168 | (644, 232, 136, 168) | systematic pod layer: mask-body, uniform scale, foot on the last row, centred |
| `pod-medium-pattern-bands` | 136×168 | (644, 232, 136, 168) | systematic pod layer: pattern-bands, uniform scale, foot on the last row, centred |
| `pod-medium-pattern-dots` | 136×168 | (644, 232, 136, 168) | systematic pod layer: pattern-dots, uniform scale, foot on the last row, centred |
| `pod-medium-pattern-stripes` | 136×168 | (644, 232, 136, 168) | systematic pod layer: pattern-stripes, uniform scale, foot on the last row, centred |
| `pod-medium-sealed` | 136×168 | (644, 232, 136, 168) | the Loika reference sprite |
| `pod-medium-shade` | 136×168 | (644, 232, 136, 168) | systematic pod layer: shade, uniform scale, foot on the last row, centred |
| `pod-medium-shadow` | 152×14 | (636, 393, 152, 14) | contact shadow: centred on x 712 with its middle on the foot line y 400 |
| `pod-small-band` | 112×144 | (656, 256, 112, 144) | the sealing band as a layer |
| `pod-small-crack` | 112×144 | (656, 256, 112, 144) | systematic pod layer: crack, uniform scale, foot on the last row, centred |
| `pod-small-identified` | 112×144 | (656, 256, 112, 144) | the Loika reference sprite |
| `pod-small-mask-accent` | 112×144 | (656, 256, 112, 144) | systematic pod layer: mask-accent, uniform scale, foot on the last row, centred |
| `pod-small-mask-body` | 112×144 | (656, 256, 112, 144) | systematic pod layer: mask-body, uniform scale, foot on the last row, centred |
| `pod-small-pattern-bands` | 112×144 | (656, 256, 112, 144) | systematic pod layer: pattern-bands, uniform scale, foot on the last row, centred |
| `pod-small-pattern-dots` | 112×144 | (656, 256, 112, 144) | systematic pod layer: pattern-dots, uniform scale, foot on the last row, centred |
| `pod-small-pattern-stripes` | 112×144 | (656, 256, 112, 144) | systematic pod layer: pattern-stripes, uniform scale, foot on the last row, centred |
| `pod-small-sealed` | 112×144 | (656, 256, 112, 144) | the Loika reference sprite |
| `pod-small-shade` | 112×144 | (656, 256, 112, 144) | systematic pod layer: shade, uniform scale, foot on the last row, centred |
| `pod-small-shadow` | 128×14 | (648, 393, 128, 14) | contact shadow: centred on x 712 with its middle on the foot line y 400 |
| `pod-well-band` | 32×40 | (·, ·, 32, 40) | the sealing band as a layer |
| `pod-well-crack` | 32×40 | (·, ·, 32, 40) | systematic pod layer: crack, uniform scale, foot on the last row, centred |
| `pod-well-identified` | 32×40 | (·, ·, 32, 40) | the Loika reference sprite |
| `pod-well-mask-accent` | 32×40 | (·, ·, 32, 40) | systematic pod layer: mask-accent, uniform scale, foot on the last row, centred |
| `pod-well-mask-body` | 32×40 | (·, ·, 32, 40) | systematic pod layer: mask-body, uniform scale, foot on the last row, centred |
| `pod-well-pattern-bands` | 32×40 | (·, ·, 32, 40) | systematic pod layer: pattern-bands, uniform scale, foot on the last row, centred |
| `pod-well-pattern-dots` | 32×40 | (·, ·, 32, 40) | systematic pod layer: pattern-dots, uniform scale, foot on the last row, centred |
| `pod-well-pattern-stripes` | 32×40 | (·, ·, 32, 40) | systematic pod layer: pattern-stripes, uniform scale, foot on the last row, centred |
| `pod-well-sealed` | 32×40 | (·, ·, 32, 40) | the Loika reference sprite |
| `pod-well-shade` | 32×40 | (·, ·, 32, 40) | systematic pod layer: shade, uniform scale, foot on the last row, centred |
| `pod-well-shadow` | 48×14 | (688, 393, 48, 14) | contact shadow: centred on x 712 with its middle on the foot line y 400 |

### Chapter rail tab plates

| Slice id | Size | Rect on the screen | Made by |
| --- | --- | --- | --- |
| `rail-tab-focused-112x56` | 112×56 | (·, 48, 112, 56) | key magenta, cut, 112x56 |
| `rail-tab-focused-56x56` | 56×56 | (·, 48, 56, 56) | 9-slice of the 112 plate (slants kept) |
| `rail-tab-focused-96x56` | 96×56 | (·, 48, 96, 56) | 9-slice of the 112 plate (slants kept) |
| `rail-tab-read-112x56` | 112×56 | (·, 48, 112, 56) | key magenta, cut, 112x56 |
| `rail-tab-read-56x56` | 56×56 | (·, 48, 56, 56) | 9-slice of the 112 plate (slants kept) |
| `rail-tab-read-96x56` | 96×56 | (·, 48, 96, 56) | 9-slice of the 112 plate (slants kept) |
| `rail-tab-sealed-112x56` | 112×56 | (·, 48, 112, 56) | key magenta, cut, 112x56 |
| `rail-tab-sealed-56x56` | 56×56 | (·, 48, 56, 56) | 9-slice of the 112 plate (slants kept) |
| `rail-tab-sealed-96x56` | 96×56 | (·, 48, 96, 56) | 9-slice of the 112 plate (slants kept) |
| `rail-tab-unread-112x56` | 112×56 | (·, 48, 112, 56) | key magenta, cut, 112x56 |
| `rail-tab-unread-56x56` | 56×56 | (·, 48, 56, 56) | 9-slice of the 112 plate (slants kept) |
| `rail-tab-unread-96x56` | 96×56 | (·, 48, 96, 56) | 9-slice of the 112 plate (slants kept) |

### List column plate (signed)

| Slice id | Size | Rect on the screen | Made by |
| --- | --- | --- | --- |
| `ring-column` | 160×522 | (0, 40, 160, 522) | cut: right part of list-column, bottom leak cropped |

### Wells and hatch

| Slice id | Size | Rect on the screen | Made by |
| --- | --- | --- | --- |
| `ring-hatch` | 112×56 | (24, 488, 112, 56) | a leaf etched into the column glass (colour-to-alpha), 24 px leaf centred, no box |
| `ring-well-current` | 64×64 | (40, 52, 64, 64) | colour-to-alpha on the flat ground, the ring cut square, 64x64 (hollow) |
| `ring-well-empty` | 64×64 | (40, 52, 64, 64) | colour-to-alpha on the flat ground, the ring cut square, 64x64 (hollow) |

### Bench scene, dish, shelf

| Slice id | Size | Rect on the screen | Made by |
| --- | --- | --- | --- |
| `room-bench-stage` | 1024×522 | (0, 40, 1024, 522) | the generated glass wall: horizon flattened, sides and bottom extended from the wall's own strips, window on the pool (712, 424) |
| `room-cradle` | 224×72 | (600, 352, 224, 72) | the frosted dish with its moss bed: colour-to-alpha, cut, scaled evenly into 224x72 (the dish is 201 px wide), bottom on the last row |
| `room-cradle-front` | 224×72 | (600, 352, 224, 72) | the dish's near lip only (rows 44 to 71), drawn over the pod's foot at the foot line y 400 |
| `room-shelf` | 272×40 | (576, 392, 272, 40) | PROPOSED: the glass shelf under the dish and the name; colour-to-alpha, cut, 272x40 |

### Stamp label (signed)

| Slice id | Size | Rect on the screen | Made by |
| --- | --- | --- | --- |
| `stamp-label-120x120` | 120×120 | (888, 248, 120, 120) | cut, 120x120 |

### Picture frames (overlay, transparent inside)

| Slice id | Size | Rect on the screen | Made by |
| --- | --- | --- | --- |
| `trait-picture-frame-120x112` | 120×112 |  | key magenta lip, 9-slice, with a painted-ramp inner shade |
| `trait-picture-frame-120x112-sealed` | 120×112 |  | slats texture tiled by whole slats, under the frame |
| `trait-picture-frame-120x112-unread` | 120×112 |  | frost texture at 0.9 alpha under the frame |
| `trait-picture-frame-120x96` | 120×96 |  | key magenta lip, 9-slice, with a painted-ramp inner shade |
| `trait-picture-frame-120x96-sealed` | 120×96 |  | slats texture tiled by whole slats, under the frame |
| `trait-picture-frame-120x96-unread` | 120×96 |  | frost texture at 0.9 alpha under the frame |
| `trait-picture-frame-184x104` | 184×104 |  | key magenta lip, 9-slice, with a painted-ramp inner shade |
| `trait-picture-frame-184x104-sealed` | 184×104 |  | slats texture tiled by whole slats, under the frame |
| `trait-picture-frame-184x104-unread` | 184×104 |  | frost texture at 0.9 alpha under the frame |
| `trait-picture-frame-184x112` | 184×112 |  | key magenta lip, 9-slice, with a painted-ramp inner shade |
| `trait-picture-frame-184x112-sealed` | 184×112 |  | slats texture tiled by whole slats, under the frame |
| `trait-picture-frame-184x112-unread` | 184×112 |  | frost texture at 0.9 alpha under the frame |
| `trait-picture-frame-184x256` | 184×256 |  | key magenta lip, 9-slice, with a painted-ramp inner shade |
| `trait-picture-frame-184x256-sealed` | 184×256 |  | slats texture tiled by whole slats, under the frame |
| `trait-picture-frame-184x256-unread` | 184×256 |  | frost texture at 0.9 alpha under the frame |
| `trait-picture-frame-184x304` | 184×304 |  | key magenta lip, 9-slice, with a painted-ramp inner shade |
| `trait-picture-frame-184x304-sealed` | 184×304 |  | slats texture tiled by whole slats, under the frame |
| `trait-picture-frame-184x304-unread` | 184×304 |  | frost texture at 0.9 alpha under the frame |
| `trait-picture-frame-376x264` | 376×264 |  | key magenta lip, 9-slice, with a painted-ramp inner shade |
| `trait-picture-frame-376x264-sealed` | 376×264 |  | slats texture tiled by whole slats, under the frame |
| `trait-picture-frame-376x264-unread` | 376×264 |  | frost texture at 0.9 alpha under the frame |
| `trait-picture-frame-376x312` | 376×312 |  | key magenta lip, 9-slice, with a painted-ramp inner shade |
| `trait-picture-frame-376x312-sealed` | 376×312 |  | slats texture tiled by whole slats, under the frame |
| `trait-picture-frame-376x312-unread` | 376×312 |  | frost texture at 0.9 alpha under the frame |

## Second pass, step 2: the re-layout (2026-10-08)

On the rectangles of the concept's composition (page left of centre, pod centred under the cone, stamp at the right):

- **Bench (`room-bench-stage`, 1024×522 at (0,40)):** the candidate's dark teal glass wall with fine vertical panel seams, the cone of light centred on x 712 ending in a soft pool at y 424, **no horizon line** (the generator's floor step is flattened out of the image and the wall's own strips extend its sides and bottom).
- **Dish (`room-cradle`, `room-cradle-front`, 224×72 at (600,352)):** the candidate's thick frosted bowl with its dipping front lip and a bed of dark moss with fine dust and lichen specks inside, scaled evenly (never one axis); the dish is 197 px wide in its 224 px slice. The front layer is the near lip from row 44, drawn over the pod's foot at y 400.
- **Shelf (`room-shelf`, proposed, 272×40 at (576,392)):** the candidate's glass slab under the dish, clear of the name at y 440.
- **Frames at the four new Read sizes** (376×312, 184×304, 184×112, 120×112) and Compare's four, each plain, unread and sealed; the old widths are removed. **Page pane:** only the signed 408×440 remains (the 480 is gone). **Plates:** name 224×32 at (600,440), origin 224×40 at (600,480), message unchanged. **Stamp label** at (888,248), unchanged. **Pods** carry the new boxes; the contact shadow is centred on x 712.
- The composite now follows that layout, beside the candidate.

Known flaws of this step: the pod sits in the dish's rim rather than sunk into a deep bowl (the 72 px rectangle holds a flatter bowl than the candidate's); the moss bed is small and the pod's foot only half hides behind the near lip; the pool's glow is mostly hidden behind the dish; the bench is a stretched window of a larger image, so its seams are slightly wider-spaced than the candidate's; the proof's tab words, emblems, lamps, progress arcs, stamp raster and trait pictures are stand-ins.

## Second pass, step 1: what changed (2026-10-08)

Done to the art director's directions, on the pieces that do not depend on the layout; each judged at 1× on the contact sheet.

- **Rail tabs (12):** the candidate's slanted dark-glass tabs hanging from the rail. Read is teal lit from within; unread is dark frosted glass (dimmed to 0.8, dimmer than the pod and the page); focused is a pale-cyan lit rim on slate (dimmed to 0.88); sealed is the same shape with slats and a notch. The 96 and 56 widths are 9-sliced from the 112 (slants kept). *Not done:* the tabs are separate plates with the 8 px gap; there is no painted joining rail line (the signed top bar carries the rail's rim).
- **Plates (5):** thin pale smoky frosted-glass labels with a 1 px lit top rim, no bevel. *Not done:* the soft shadow is not baked (it would fall outside the rectangle).
- **Wells (2):** thin hollow glass rings; the current one has a cool pale-cyan lit rim and glow, no cream.
- **Hatch:** a leaf etched in the column's glass, 24 px, centred in the 112×56 rectangle, no box.
- **Picture frames (24):** a slate glass lip lit on the top and left only, no lavender, no glints; unread is dark frosted glass at about 0.9 alpha; sealed is lighter glass slats with the middle left clear for the 44×64 key.
- **Pods:** one painted pod form, separable. Each class (large, medium, small, well) has the layers `shade` (grey, 0.5 neutral: colour × 2 × grey), `mask-body`, `mask-accent` (cap and ribs), `pattern-dots`, `pattern-stripes`, `pattern-bands` (white with alpha), `crack` (the cap's crack, so a sealed shell is smooth), `band` (the sealing band), a contact `shadow`, and the Loika reference sprites `identified` and `sealed`. Each is the same pod scaled evenly at its own proportion (about 0.90 wide to tall), centred, foot on the last row; the stem falls short of the box top. `pod-*-glyph` is withheld for the redrawn marks. The proof of the system: [`recolour-proof-large-3x.png`](recolour-proof-large-3x.png), the large pod recoloured five ways from the layers alone.

<img src="recolour-proof-large-3x.png" width="720" alt="One pod, five species, from the layers">

*recolour-proof-large-3x.png: the large pod recoloured from the layers (shade × colour pair, with the dots, stripes or bands pattern in the second colour), shown 3× nearest neighbour. Not a deliverable. Status: proof of the layer system.*

Known flaws of this step: the two lowest dots touch the rib feet and stay in the accent layer, so they show on every pattern; the stripes and bands are generated masks (curved to the shell), not painted; the shade still carries a faint line where the crack was; the sealed `band` layer is faint at 32×40.

## Layers, states and how to place them

- **Order on the stage:** `room-bench-stage` (0,40) → `room-shelf` (proposed, 200,300) → `room-cradle` (232,296) → the pod → `room-cradle-front` (same rect, only the near rim, over the pod's foot).
- **A pod, per size class** (box bottom-centred on (344, 312); `well` is 32×40): `pod-<class>-identified` and `pod-<class>-sealed` are whole sprites; `pod-<class>-body` + `pod-<class>-glyph` + `pod-<class>-band` are the same pod as layers (all box-sized, same origin, so a species' glyph can replace the Loika's). Sealed = body + band minus the crack; identified = body + glyph.
- **Picture frames** are overlays with a transparent middle: the trait picture is rendered at its size first, the frame is drawn over it. `-unread` is the frost over the whole picture, `-sealed` the slats; the key picture (44×64) and the marks go on top.
- **Tabs:** plate only; emblem, word, pips, glint star and the cream focus ring are the build's.

## Sign-off §2, Painted master (art direction column, by the studio)

| Art direction | Capabilities |
| --- | --- |
| From the accepted candidate, owner's notes applied (SS Decided) — **yes**: PV-D-r3-a4 is the reference of every call; the stamp is a 120 label, the ring around the shell carries chapters only (no centre fill painted), the dark glass lab is the bench | Layered source, 1× exports, hashes kept (AD) — **partly**: raw generations, the keyed and cut slices (pod layers separate), the build script and sha256 of every slice and call are kept; there is no .psd, the layers are the separate PNGs and the 9-slice masters |
| Station: painted light, soft shadows, no dither bands or flat fills (SG) — **yes**, with two listed fails (below): no dither or banding in any slice; the only flat areas are the label's bone card and the picture frames' interior (transparent by design) | No text or numbers baked; text slots fit the decided strings at the guide's sizes (AD; SG Type) — **yes**: every plate, tab, pane and bar is empty; the proof sets the strings at 16, 20 and 28 inside the slots; origin at 16 px fits the 320 px plate |
| Companion: hand-pixelled on the 48 ramps | n/a: this is the Station |
| Creature at its area, 300×310+ Station | n/a: the pods are not creatures; they are at their class boxes |
| Same individual in four-gray and on paper; nothing childish (AD) — **no four-gray or paper test run** (not asked for the Station's painted layer); nothing childish: the Loika pod keeps the candidate's finish | One slice per state the screen draws (SS) — **partly**: tabs ×4 states ×3 widths, wells ×2, frames ×3 states ×8 sizes, pods ×2 states ×4 classes; not painted: hatch focused/armed (the ring and plate are the build's), the 16 species' pods and glyphs (only the Loika), the empty-rack cradle is the same slice |
| | Placed 1:1, never scaled (SG Station) — **yes**: every slice is exactly its rectangle; derived widths are 9-sliced here, not at run time |

### Failures and departures, listed

1. **The cradle is squashed.** The candidate's cradle is a dish about 224×80; the spec's rectangle is 224×40. The slice is the painted flat ring resampled to 224×40 (anisotropic, about 0.5 vertically); it reads as a coaster. A rectangle of 224×72 would carry it unsquashed.
2. **The pods are fitted to their boxes anisotropically.** The painted pod is about 0.90 wide to tall; the boxes are 0.83 (large), 0.81 (medium), 0.78 (small), 0.80 (well). The small pod's dots are squeezed about 14 percent. The spec's rule (stem on the top row, foot on the last row, full width) was kept over true proportion.
3. **One species only.** The pods are the Loika (charcoal, cream dots). The signed placeholders remap 16 species by palette; a painted pod has no remap, so the other 15 species need their own painting or a hue pass, and 16 glyphs (only the Loika's three-leaf is cut as a layer).
4. **The sealed cap is smooth and the identified cap is cracked** (as in the candidate), so "sealed = body + band" shows the crack under the band unless the sealed sprite is used; the band layer is faint at 32×40.
5. **The focused tab is the read plate, lit**, not a separate painting: the candidate's focused tab was a brighter cyan whose cream words lost contrast.
6. **Frame lips carry a bright glint at the top right and bottom left** (from the generator's corner light), the same on every size; the picture's inner shade is a soft ramp added at build time.
7. **The bench has a faint horizon** about 170 px above the pool (the generator's floor line), hidden by the rail and the pod in the composite but visible on the empty rack.
8. **Not painted here (not in the brief):** the trait pictures, seeds, the 16 place stamps, chapter emblems, the progress arcs and their stars, the stamp raster, the lamps, the glint star. The proof uses stand-ins for them.
9. **The message plate** is delivered at 640×36, 56 and 76 (one, two and three lines); other widths come back to the studio.
10. The proof's list shows three pods and three empty wells; the progress arcs are drawn by the proof and are not the build's.

## Sign-off §2, art director's column (2026-10-08)

Judged at 1×, the composite beside PV-D-r3-a4 first, then each slice on the contact sheet and on the bench.

**Against the concept: fails.** The owner would recognise their pod and the dark teal glass, not their screen. What differs:

- **Layout departure:** the page and the pod swap sides and the pod leaves the centre of the beam (below).
- **Painting faults:** the deep frosted dish is now a flat coaster, so the pod floats with no bed and no contact. The pod is stretched about 8 % tall. The candidate's angled glass rail is now boxy app buttons, and the unread tabs are bright frost. The name, origin and message plates are heavy bevelled bars. The wells are domed knobs and the hatch is a boxed button (the spec says no boxed buttons). The frame lips are lavender with generator glints. The unread frost is a flat white sheet. The frost tiles, the unread tabs and the bone card are now brighter than the pod, so the specimen is no longer the spotlight. The bench has lost the candidate's glass wall and shows a horizon line.

**Composition: the concept wins.** The owner approved the page on the left and the pod centred under the beam. Their ruling of 2026-10-08 only shrank the stamp; the swap is the spec's own inference. Neither of the spec's reasons needs it: Compare's 408-wide page grid, already specified, fits left of the pod, and which way → goes is an interaction detail. Raised today with the UI designer to re-lay Pods the concept's way round, with the stamp label at the right edge. This is not an owner question, because the owner already approved this arrangement. If it cannot be fitted, the owner sees both arrangements as pictures at 1×, never as geometry. Until then the bench, beam, cradle and shelf are held.

**The studio's three questions**

1. **Cradle:** neither option. Repaint the candidate's dish unsquashed, with the pod sunk into a moss and dust bed and the near rim over its foot. A rectangle of 224×72 running down to y 360 collides with the name at y 344. The rectangle has to grow upward behind the pod (UI designer's call; asked).
2. **Pods:** paint each at its own proportion with a uniform scale. The class box is a maximum, not a mould. The foot sits on y 312, centred on x 344, and the stem may miss the top row (UI designer told).
3. **Species:** not 15 bespoke paintings and not a hue remap of the Loika. The owner wants a generic, systematic pod look (2026-10-07), from one renderer with the species' colour pair and pattern. Paint one pod form as separable painted layers: shading, colour-pair masks, a pattern set, cap and ribs. The glyph is its own layer and waits for the abstract marks.

**Known fails:** 1, 2, 6 and 7 block. 3, 4, 5, 9 and 10 are acceptable for a first delivery. For 8, the missing pieces have to be commissioned (emblems, place stamps, trait pictures, seeds, arcs and lamps) before any Pods screen reaches the owner.

**Signed (6):** `frame-top-bar-1024x40`, `frame-bottom-line-1024x38`, `page-pane-480x440`, `page-pane-408x440`, `ring-column`, `stamp-label-120x120`.

**Returned to the studio, with directions**

- `room-cradle`, `room-cradle-front`, `room-shelf`: the candidate's thick frosted bowl at its own proportion, on its glass shelf, holding the pod in a bed. Never resample one axis. The shelf clears the name rectangle (the table above gives y 304, the layering note y 300; it overlaps y 344 either way).
- `pod-{large,medium,small,well}-{identified,sealed,body,band}`: refit uniformly from the same painting, with a contact shadow in the bed. `pod-*-glyph` is held for the redrawn marks.
- `rail-tab-*` (12): the candidate's angled dark-glass tabs, joined on one rail with a lit rim. Read is teal lit from within. Unread is dark frosted glass, dimmer than the page and never brighter than the pod. Sealed is slats and a notch in the same shape.
- `plate-name-320x32`, `plate-origin-320x40`, `plate-message-640x{36,56,76}`: the candidate's thin pale frosted-glass label with a 1 px lit rim and a soft shadow. No heavy bevel.
- `ring-well-current`, `ring-well-empty`: thin hollow glass rings as in the candidate, not knobs. The current well's lit rim is cool, because cream belongs to the focus ring.
- `ring-hatch`: a leaf etched into the column's glass, with no box.
- `trait-picture-frame-*` (24): a thin slate glass lip lit on the top and left edges only, with no lavender and no glints. Unread is real frosted glass at frostS, darker than the pod. Sealed is lighter glass slats, not blinds, with room for the 44×64 key.
- `room-bench-stage`: after the re-layout, the candidate's dark glass wall with panel seams, the beam from above left and the pool on the pod's axis, with no horizon.

Not to the programme lead or the owner as a delivery.

## Departures from the candidate, and why

- The page and the pod change sides (the layout spec's decision of 2026-10-08), so nothing is cut from the candidate's page; the page pane is painted new in the candidate's glass.
- The stamp's stage plate (the round or square plate behind it) is gone, as decided; the label is a plain bone card.
- The candidate's focused-tab cyan and its lamp icons are not carried over (the build draws the emblem and pips).
- The shelf under the cradle is an extra, proposed (`room-shelf`): the candidate has it, the spec does not.

## Rejected tries (kept in the log, not on disk)

The first cradle, the second cradle (both returned the whole screen), two benches with the pool too low, a glyph try that returned a glowing pod, a name plate that returned a bar, and a thick-bezel frame sheet (rejected for weight).

## Questions for the art director

1. The cradle: accept the 224×40 squash, or change the rectangle to 224×72 (y 288 to 360)?
2. The pods: keep the exact box fit (squeezes the small class 14 percent), or paint each class at its own proportion and let the stem top miss the box's top row?
3. The other 15 species: paint each pod, or accept a hue remap of the Loika's body with the species' glyph and a recoloured foot ring?

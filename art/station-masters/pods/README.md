# Pods masters: the painted layer of the Pods screen

> Painted from the accepted candidate PV-D-r3-a4 ([`art/concept-station/pods-v2/`](../../concept-station/pods-v2/README.md)), cut to the rectangles of [`design/style-guide/station-layouts.md`](../../../design/style-guide/station-layouts.md) (Pods). One PNG per piece and state, 1×, straight alpha, text slots empty, placed 1:1 by the builder. **Status: delivered for the art director's sign-off; nothing here is accepted until it is signed.**

**How they were made.** The image tool painted each family from the candidate as the reference (the prompts, references, hashes, seconds and outcome of every call are in [`log/calls.jsonl`](log/calls.jsonl): 27 calls, all succeeded, none retried by the tool; 14 of the generations are used, the rest were rejected tries). Each result was keyed off its flat ground (magenta key, or colour-to-alpha on the glass), cut, cleaned and resampled down to the exact rectangle by [`tools/build.py`](tools/build.py); the plates, tabs, panes and frames are 9-sliced from one painted master so their corners are painted once and never stretched. Retro Diffusion was not used: these are soft painted materials, outside the trial's rules. Everything is in the Station's painted layer, so it is full colour and off the 62-colour chrome palette by design; type and the progress arcs are the build's.

## The proof

<img src="composite-pods-read-1024x600.png" width="720" alt="Pods Read, composed from the slices">

*composite-pods-read-1024x600.png: the whole Pods Read screen at 1× from the slices alone, the decided strings typed over them in Inter 16, 20 and 28. The trait pictures are crops of the candidate's painting, the progress arcs and the stamp are stand-ins drawn only for this proof (the stamp is the candidate's placed one), and the lamps and emblems of the rail are not painted. A proof, not a deliverable the page uses. Status: proof.*

<img src="composite-vs-candidate.png" width="720" alt="Composite beside the accepted candidate">

*composite-vs-candidate.png: the composite (left) beside the accepted candidate PV-D-r3-a4 (right). The layout differs on purpose: the layout spec puts the pod on the left third and the page on the right, the candidate has them the other way round. Status: proof.*

<img src="contact-sheet-1x.png" width="720" alt="Contact sheet of every slice at 1x">

*contact-sheet-1x.png: every slice at 1×, on a flat dark ground, named. Status: for review.*

## Slices

Each slice is named by the register id it replaces (`room`, `ring`, `page`, `trait-picture`, `stamp`, `pod`); where the register has none, the id is **proposed** (`rail-tab-*`, `plate-*`, `frame-*`, `room-shelf`) and marked so. A tab's x is 176 + 120 i (112 wide), 180 + 104 i (96 wide) or its slot in the compact rail; its y is 48. Hashes and sources: [`slices/manifest.json`](slices/manifest.json).

### Top bar and bottom line

| Slice id | Size | Rect on the screen | Made by |
| --- | --- | --- | --- |
| `frame-bottom-line-1024x38` | 1024×38 | (0, 562, 1024, 38) | the bar flipped (rule on its top edge), 1024x38 |
| `frame-top-bar-1024x40` | 1024×40 | (0, 0, 1024, 40) | key magenta, cut, 1024x40 |

### Page panes

| Slice id | Size | Rect on the screen | Made by |
| --- | --- | --- | --- |
| `page-pane-408x440` | 408×440 | (·, 112, 408, 440) | 9-slice of the generated pane, corners kept at 1x |
| `page-pane-480x440` | 480×440 | (528, 112, 480, 440) | 9-slice of the generated pane, corners kept at 1x |

### Name, origin and message plates

| Slice id | Size | Rect on the screen | Made by |
| --- | --- | --- | --- |
| `plate-message-640x36` | 640×36 | (192, ·, 640, 36) | 9-slice, rounded alpha |
| `plate-message-640x56` | 640×56 | (192, ·, 640, 56) | 9-slice, rounded alpha |
| `plate-message-640x76` | 640×76 | (192, ·, 640, 76) | 9-slice, rounded alpha |
| `plate-name-320x32` | 320×32 | (184, 344, 320, 32) | 9-slice, rounded alpha |
| `plate-origin-320x40` | 320×40 | (184, 384, 320, 40) | 9-slice, rounded alpha (same glass as the name plate) |

### Pods

| Slice id | Size | Rect on the screen | Made by |
| --- | --- | --- | --- |
| `pod-large-band` | 160×192 | (·, ·, 160, 192) | the sealing band as a layer (difference of two draws) |
| `pod-large-body` | 160×192 | (·, ·, 160, 192) | the identified shell without glyph or band |
| `pod-large-glyph` | 160×192 | (·, ·, 160, 192) | the lit glyph and its glow as a layer (difference of two draws) |
| `pod-large-identified` | 160×192 | (·, ·, 160, 192) | key magenta, shell cut, fitted to the class box |
| `pod-large-sealed` | 160×192 | (·, ·, 160, 192) | key magenta, shell cut, fitted to the class box |
| `pod-medium-band` | 136×168 | (·, ·, 136, 168) | the sealing band as a layer (difference of two draws) |
| `pod-medium-body` | 136×168 | (·, ·, 136, 168) | the identified shell without glyph or band |
| `pod-medium-glyph` | 136×168 | (·, ·, 136, 168) | the lit glyph and its glow as a layer (difference of two draws) |
| `pod-medium-identified` | 136×168 | (·, ·, 136, 168) | key magenta, shell cut, fitted to the class box |
| `pod-medium-sealed` | 136×168 | (·, ·, 136, 168) | key magenta, shell cut, fitted to the class box |
| `pod-small-band` | 112×144 | (·, ·, 112, 144) | the sealing band as a layer (difference of two draws) |
| `pod-small-body` | 112×144 | (·, ·, 112, 144) | the identified shell without glyph or band |
| `pod-small-glyph` | 112×144 | (·, ·, 112, 144) | the lit glyph and its glow as a layer (difference of two draws) |
| `pod-small-identified` | 112×144 | (·, ·, 112, 144) | key magenta, shell cut, fitted to the class box |
| `pod-small-sealed` | 112×144 | (·, ·, 112, 144) | key magenta, shell cut, fitted to the class box |
| `pod-well-band` | 32×40 | (·, ·, 32, 40) | the sealing band as a layer (difference of two draws) |
| `pod-well-body` | 32×40 | (·, ·, 32, 40) | the identified shell without glyph or band |
| `pod-well-glyph` | 32×40 | (·, ·, 32, 40) | the lit glyph and its glow as a layer (difference of two draws) |
| `pod-well-identified` | 32×40 | (·, ·, 32, 40) | key magenta, shell cut, fitted to the class box |
| `pod-well-sealed` | 32×40 | (·, ·, 32, 40) | key magenta, shell cut, fitted to the class box |

### Chapter rail tab plates

| Slice id | Size | Rect on the screen | Made by |
| --- | --- | --- | --- |
| `rail-tab-focused-112x56` | 112×56 | (·, 48, 112, 56) | key magenta, cut, 112x56 |
| `rail-tab-focused-56x56` | 56×56 | (·, 48, 56, 56) | 9-slice of the 112 plate (corners kept) |
| `rail-tab-focused-96x56` | 96×56 | (·, 48, 96, 56) | 9-slice of the 112 plate (corners kept) |
| `rail-tab-read-112x56` | 112×56 | (·, 48, 112, 56) | key magenta, cut, 112x56 |
| `rail-tab-read-56x56` | 56×56 | (·, 48, 56, 56) | 9-slice of the 112 plate (corners kept) |
| `rail-tab-read-96x56` | 96×56 | (·, 48, 96, 56) | 9-slice of the 112 plate (corners kept) |
| `rail-tab-sealed-112x56` | 112×56 | (·, 48, 112, 56) | key magenta, cut, 112x56 |
| `rail-tab-sealed-56x56` | 56×56 | (·, 48, 56, 56) | 9-slice of the 112 plate (corners kept) |
| `rail-tab-sealed-96x56` | 96×56 | (·, 48, 96, 56) | 9-slice of the 112 plate (corners kept) |
| `rail-tab-unread-112x56` | 112×56 | (·, 48, 112, 56) | key magenta, cut, 112x56 |
| `rail-tab-unread-56x56` | 56×56 | (·, 48, 56, 56) | 9-slice of the 112 plate (corners kept) |
| `rail-tab-unread-96x56` | 96×56 | (·, 48, 96, 56) | 9-slice of the 112 plate (corners kept) |

### List column: plate, wells, hatch

| Slice id | Size | Rect on the screen | Made by |
| --- | --- | --- | --- |
| `ring-column` | 160×522 | (0, 40, 160, 522) | cut: right part of list-column, bottom leak cropped |
| `ring-hatch` | 112×56 | (24, 488, 112, 56) | key magenta, cut, 112x56 |
| `ring-well-current` | 64×64 | (40, 52, 64, 64) | key magenta, cut, 64x64 |
| `ring-well-empty` | 64×64 | (40, 52, 64, 64) | key magenta, cut, 64x64 |

### Bench scene, cradle, shelf

| Slice id | Size | Rect on the screen | Made by |
| --- | --- | --- | --- |
| `room-bench-stage` | 1024×522 | (0, 40, 1024, 522) | cut: bench-d2 window, bottom extended |
| `room-cradle` | 224×40 | (232, 296, 224, 40) | color-to-alpha on flat ground, cut, resampled 224x40 |
| `room-cradle-front` | 224×40 | (232, 296, 224, 40) | the cradle's near rim only (rows 16 to 39), drawn over the pod's foot |
| `room-shelf` | 288×48 | (200, 304, 288, 48) | PROPOSED: the glass shelf under the cradle; color-to-alpha, cut, 288x48 |

### Stamp label

| Slice id | Size | Rect on the screen | Made by |
| --- | --- | --- | --- |
| `stamp-label-120x120` | 120×120 | (176, 432, 120, 120) | cut, 120x120 |

### Picture frames (overlay, transparent inside)

| Slice id | Size | Rect on the screen | Made by |
| --- | --- | --- | --- |
| `trait-picture-frame-120x96` | 120×96 |  | key magenta lip, 9-slice, with a painted-ramp inner shade |
| `trait-picture-frame-120x96-sealed` | 120×96 |  | slats texture tiled by whole slats, under the frame |
| `trait-picture-frame-120x96-unread` | 120×96 |  | frost texture at 0.9 alpha under the frame |
| `trait-picture-frame-144x112` | 144×112 |  | key magenta lip, 9-slice, with a painted-ramp inner shade |
| `trait-picture-frame-144x112-sealed` | 144×112 |  | slats texture tiled by whole slats, under the frame |
| `trait-picture-frame-144x112-unread` | 144×112 |  | frost texture at 0.9 alpha under the frame |
| `trait-picture-frame-184x104` | 184×104 |  | key magenta lip, 9-slice, with a painted-ramp inner shade |
| `trait-picture-frame-184x104-sealed` | 184×104 |  | slats texture tiled by whole slats, under the frame |
| `trait-picture-frame-184x104-unread` | 184×104 |  | frost texture at 0.9 alpha under the frame |
| `trait-picture-frame-184x256` | 184×256 |  | key magenta lip, 9-slice, with a painted-ramp inner shade |
| `trait-picture-frame-184x256-sealed` | 184×256 |  | slats texture tiled by whole slats, under the frame |
| `trait-picture-frame-184x256-unread` | 184×256 |  | frost texture at 0.9 alpha under the frame |
| `trait-picture-frame-216x112` | 216×112 |  | key magenta lip, 9-slice, with a painted-ramp inner shade |
| `trait-picture-frame-216x112-sealed` | 216×112 |  | slats texture tiled by whole slats, under the frame |
| `trait-picture-frame-216x112-unread` | 216×112 |  | frost texture at 0.9 alpha under the frame |
| `trait-picture-frame-216x304` | 216×304 |  | key magenta lip, 9-slice, with a painted-ramp inner shade |
| `trait-picture-frame-216x304-sealed` | 216×304 |  | slats texture tiled by whole slats, under the frame |
| `trait-picture-frame-216x304-unread` | 216×304 |  | frost texture at 0.9 alpha under the frame |
| `trait-picture-frame-376x264` | 376×264 |  | key magenta lip, 9-slice, with a painted-ramp inner shade |
| `trait-picture-frame-376x264-sealed` | 376×264 |  | slats texture tiled by whole slats, under the frame |
| `trait-picture-frame-376x264-unread` | 376×264 |  | frost texture at 0.9 alpha under the frame |
| `trait-picture-frame-448x312` | 448×312 |  | key magenta lip, 9-slice, with a painted-ramp inner shade |
| `trait-picture-frame-448x312-sealed` | 448×312 |  | slats texture tiled by whole slats, under the frame |
| `trait-picture-frame-448x312-unread` | 448×312 |  | frost texture at 0.9 alpha under the frame |

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

# Pods masters: the painted layer of the Pods screen

> Painted from the accepted candidate PV-D-r3-a4 ([`art/concept-station/pods-v2/`](../../concept-station/pods-v2/README.md)), cut to the rectangles of [`design/style-guide/station-layouts.md`](../../../design/style-guide/station-layouts.md) (Pods). One PNG per piece and state, 1×, straight alpha, text slots empty, placed 1:1 by the builder. **Status: fourth pass judged by the art director 2026-10-08: not yet the concept (the bowl's front and the slab, at the centre of the screen); 43 more slices signed, the eight tabs among them; 14 returned (see the art director's column, fourth pass, below).**

**How they were made.** The image tool painted each family from the candidate as the reference (the prompts, references, hashes, seconds and outcome of every call are in [`log/calls.jsonl`](log/calls.jsonl): 27 calls, all succeeded, none retried by the tool; 14 of the generations are used, the rest were rejected tries). Each result was keyed off its flat ground (magenta key, or colour-to-alpha on the glass), cut, cleaned and resampled down to the exact rectangle by [`tools/build.py`](tools/build.py); the plates, tabs, panes and frames are 9-sliced from one painted master so their corners are painted once and never stretched. Retro Diffusion was not used: these are soft painted materials, outside the trial's rules. Everything is in the Station's painted layer, so it is full colour and off the 62-colour chrome palette by design; type and the progress arcs are the build's.

## The proof

<img src="composite-pods-read-1024x600.png" width="720" alt="Pods Read, composed from the slices">

*composite-pods-read-1024x600.png: the Pods Read page's first state at 1024×600, 1×, from the slices alone with the decided strings typed over them in Inter 16, 20 and 28. **Stand-ins, not masters:** the trait picture (a crop of the candidate's painting), the stamp raster (the candidate's placed stamp), the progress arcs on the list's rings, the tab pips and the trait marks, the focus ring; the tab emblems are the round 2 slices (`rail-emblem-*`), awaiting sign-off. A proof, not a deliverable the page uses. Status: proof.*

<img src="composite-vs-candidate.png" width="720" alt="Composite beside the accepted candidate">

*composite-vs-candidate.png: the composite (left) beside the accepted candidate PV-D-r3-a4 (right). The layout follows the concept's composition (the re-layout of branch `design-pods-relayout`): wells at the far left, the page left of centre showing the chapter as one large 376×312 picture, the pod centred on its dish under the cone, the stamp label at the right. The rail is the hanging tabs of the fourth pass. The trait picture, stamp raster, progress arcs, emblems and lamps are stand-ins. Status: proof.*

<img src="contact-sheet-1x.png" width="720" alt="Contact sheet of every slice at 1x">

*contact-sheet-1x.png: every slice at 1×, on a flat dark ground, named. Status: for review.*

## Slices

Each slice is named by the register id it replaces (`room`, `ring`, `page`, `trait-picture`, `stamp`, `pod`); where the register has none, the id is **proposed** (`rail-tab-*`, `plate-*`, `frame-*`, `room-shelf`). Rectangles follow the layout spec of branch `design-pods-relayout` (637fb1e): the pod's box is bottom-centred on (712, 392), the dish is (600, 328, 224, 96), the page (176, 112, 408, 440) with the portrait frame (264, 160, 232, 312), the stamp label (888, 248). A tab hangs from the top bar's rule at y 40: a full tab (slice 152×40) at x0 + 136 i, a compact tab (slice 72×40) at its place in the run. The name plate is a 9-slice delivered at every 16 px from 80 to 224 wide, 24 tall. Hashes and sources: [`slices/manifest.json`](slices/manifest.json). **Status** (one per slice, also in [`slices/status.json`](slices/status.json) for the builder's place-masters tool, reconciled with the art director's consolidated list of 2026-10-08): *signed* with the pass that signed it, *withdrawn* (not to be placed), *new* (awaiting a verdict); the two frame bars are signed but excluded from placing (the frame redesign).

### None

| Slice id | Size | Rect on the screen | Status | Made by |
| --- | --- | --- | --- | --- |
| `face-24-empty` | 24×24 | (856, 8, 24, 24) | new: a mark of the Station frame (design-station-frame); awaiting verdict | no mibi with you: an empty teal ring |
| `face-belatz-24` | 24×24 | (856, 8, 24, 24) | new: a mark of the Station frame (design-station-frame); awaiting verdict | Belatz with the Companion: the head of the Grow service's standard painting (S09/3982a7117cfa0fc3) reduced to a 20 px disc inside its 2 px teal ring |
| `face-belatz-24-away` | 24×24 | (856, 8, 24, 24) | new: a mark of the Station frame (design-station-frame); awaiting verdict | Belatz, the Companion away: the face full on a dimmed ring |
| `face-loika-24` | 24×24 | (856, 8, 24, 24) | new: a mark of the Station frame (design-station-frame); awaiting verdict | the mibi with the Companion: the face painted at 2K from the standard painting, reduced to a 20 px disc inside its 2 px teal ring |
| `face-loika-24-away` | 24×24 | (856, 8, 24, 24) | new: a mark of the Station frame (design-station-frame); awaiting verdict | the Companion away: the mibi out with it, the face full on a dimmed ring |
| `glint-star-12x12` | 12×12 | (·, ·, 12, 12) | signed (well rings verdict) | the concept's soft four-point spark: colour-to-alpha, cut square, resampled to 12x12 (place at the ring's upper right, about cx + 30, cy - 30) |
| `page-mark-new-10` | 6×6 | (·, ·, 6, 6) | new: the new-to-the-field-guide mark as pods.json now specifies it: a flat bone dot 6x6, 1 px white lit edge, no keyline; awaiting verdict | the 'new to the field guide' mark: a flat bone dot 6x6, a 1 px white lit edge top left, no keyline, no specular; on the trait's name line, 4 px after the name |
| `page-new-mark-12x12` | 12×12 | (·, ·, 12, 12) | withdrawn: superseded by page-mark-new-10 (now a 6x6 flat bone dot) | PROPOSED: the 'new to the field guide' mark, a 12x12 bone bead lit upper left (the page's newMark region of design-pods-relayout 29b6dc9) |
| `rail-emblem-character-read-24x24` | 24×24 |  | signed (emblems round 3) | hand-pixelled at 24x24 on the Station palette (indexed, 62 colours, index 62 transparent); state = colour only |
| `rail-emblem-character-sealed-24x24` | 24×24 |  | signed (emblems round 3) | hand-pixelled at 24x24 on the Station palette (indexed, 62 colours, index 62 transparent); state = colour only |
| `rail-emblem-character-unread-24x24` | 24×24 |  | signed (emblems round 3) | hand-pixelled at 24x24 on the Station palette (indexed, 62 colours, index 62 transparent); state = colour only |
| `rail-emblem-charge-read-24x24` | 24×24 |  | signed (emblems round 4) | hand-pixelled at 24x24 on the Station palette (indexed, 62 colours, index 62 transparent); state = colour only |
| `rail-emblem-charge-sealed-24x24` | 24×24 |  | signed (emblems round 4) | hand-pixelled at 24x24 on the Station palette (indexed, 62 colours, index 62 transparent); state = colour only |
| `rail-emblem-charge-unread-24x24` | 24×24 |  | signed (emblems round 4) | hand-pixelled at 24x24 on the Station palette (indexed, 62 colours, index 62 transparent); state = colour only |
| `rail-emblem-coat-read-24x24` | 24×24 |  | signed (emblems round 3) | hand-pixelled at 24x24 on the Station palette (indexed, 62 colours, index 62 transparent); state = colour only |
| `rail-emblem-coat-sealed-24x24` | 24×24 |  | signed (emblems round 3) | hand-pixelled at 24x24 on the Station palette (indexed, 62 colours, index 62 transparent); state = colour only |
| `rail-emblem-coat-unread-24x24` | 24×24 |  | signed (emblems round 3) | hand-pixelled at 24x24 on the Station palette (indexed, 62 colours, index 62 transparent); state = colour only |
| `rail-emblem-face-read-24x24` | 24×24 |  | signed (emblems round 3) | hand-pixelled at 24x24 on the Station palette (indexed, 62 colours, index 62 transparent); state = colour only |
| `rail-emblem-face-sealed-24x24` | 24×24 |  | signed (emblems round 3) | hand-pixelled at 24x24 on the Station palette (indexed, 62 colours, index 62 transparent); state = colour only |
| `rail-emblem-face-unread-24x24` | 24×24 |  | signed (emblems round 3) | hand-pixelled at 24x24 on the Station palette (indexed, 62 colours, index 62 transparent); state = colour only |
| `rail-emblem-glow-read-24x24` | 24×24 |  | signed (emblems round 3) | hand-pixelled at 24x24 on the Station palette (indexed, 62 colours, index 62 transparent); state = colour only |
| `rail-emblem-glow-sealed-24x24` | 24×24 |  | signed (emblems round 3) | hand-pixelled at 24x24 on the Station palette (indexed, 62 colours, index 62 transparent); state = colour only |
| `rail-emblem-glow-unread-24x24` | 24×24 |  | signed (emblems round 3) | hand-pixelled at 24x24 on the Station palette (indexed, 62 colours, index 62 transparent); state = colour only |
| `rail-emblem-legs-tail-read-24x24` | 24×24 |  | new: Legs & tail round 6: candidate B as the art director corrected it (back line out of the left edge, hock bump, stub tail); awaiting verdict | hand-pixelled at 24x24 on the Station palette (indexed, 62 colours, index 62 transparent); state = colour only |
| `rail-emblem-legs-tail-sealed-24x24` | 24×24 |  | new: Legs & tail round 6: candidate B as the art director corrected it (back line out of the left edge, hock bump, stub tail); awaiting verdict | hand-pixelled at 24x24 on the Station palette (indexed, 62 colours, index 62 transparent); state = colour only |
| `rail-emblem-legs-tail-unread-24x24` | 24×24 |  | new: Legs & tail round 6: candidate B as the art director corrected it (back line out of the left edge, hock bump, stub tail); awaiting verdict | hand-pixelled at 24x24 on the Station palette (indexed, 62 colours, index 62 transparent); state = colour only |
| `rail-emblem-movement-read-24x24` | 24×24 |  | signed (emblems round 4) | hand-pixelled at 24x24 on the Station palette (indexed, 62 colours, index 62 transparent); state = colour only |
| `rail-emblem-movement-sealed-24x24` | 24×24 |  | signed (emblems round 4) | hand-pixelled at 24x24 on the Station palette (indexed, 62 colours, index 62 transparent); state = colour only |
| `rail-emblem-movement-unread-24x24` | 24×24 |  | signed (emblems round 4) | hand-pixelled at 24x24 on the Station palette (indexed, 62 colours, index 62 transparent); state = colour only |
| `rail-emblem-shape-read-24x24` | 24×24 |  | signed (emblems round 4) | hand-pixelled at 24x24 on the Station palette (indexed, 62 colours, index 62 transparent); state = colour only |
| `rail-emblem-shape-sealed-24x24` | 24×24 |  | signed (emblems round 4) | hand-pixelled at 24x24 on the Station palette (indexed, 62 colours, index 62 transparent); state = colour only |
| `rail-emblem-shape-unread-24x24` | 24×24 |  | signed (emblems round 4) | hand-pixelled at 24x24 on the Station palette (indexed, 62 colours, index 62 transparent); state = colour only |
| `rail-emblem-stamina-read-24x24` | 24×24 |  | signed (emblems round 3) | hand-pixelled at 24x24 on the Station palette (indexed, 62 colours, index 62 transparent); state = colour only |
| `rail-emblem-stamina-sealed-24x24` | 24×24 |  | signed (emblems round 3) | hand-pixelled at 24x24 on the Station palette (indexed, 62 colours, index 62 transparent); state = colour only |
| `rail-emblem-stamina-unread-24x24` | 24×24 |  | signed (emblems round 3) | hand-pixelled at 24x24 on the Station palette (indexed, 62 colours, index 62 transparent); state = colour only |

### Top bar and bottom line (signed)

| Slice id | Size | Rect on the screen | Status | Made by |
| --- | --- | --- | --- | --- |
| `frame-bottom-line-1024x38` | 1024×38 | (0, 562, 1024, 38) | signed (pass 1): excluded from placing (the frame redesign) | the bar flipped (rule on its top edge), 1024x38 |
| `frame-cap-back-16` | 16×16 | (·, 574, 16, 16) | new: a mark of the Station frame (design-station-frame); awaiting verdict | the bottom line's back key cap: a 16 px disc, stone face, fog arrow |
| `frame-cap-confirm-16` | 16×16 | (16, 574, 16, 16) | new: a mark of the Station frame (design-station-frame); awaiting verdict | the bottom line's confirm key cap: a 16 px disc, orange face, bone tick, ink keyline, 1 px bevel |
| `frame-cap-confirm-16-dim` | 16×16 | (16, 574, 16, 16) | new: a mark of the Station frame (design-station-frame); awaiting verdict | the confirm key cap for the unavailable state: mist face, slate tick (its own slice) |
| `frame-companion-outline-16x24` | 16×24 | (816, 8, 16, 24) | new: a mark of the Station frame (design-station-frame); awaiting verdict | the Companion's glyph, outline (away); painted large and reduced |
| `frame-companion-solid-16x24` | 16×24 | (816, 8, 16, 24) | new: a mark of the Station frame (design-station-frame); awaiting verdict | the Companion's glyph, solid (docked); painted large and reduced |
| `frame-lamp-12-amber` | 12×12 | (·, ·, 12, 12) | new: a mark of the Station frame (design-station-frame); awaiting verdict | the notice's 12x12 amber lamp (the same lamp as Home's modules) |
| `frame-lamp-8-mint` | 8×8 | (836, 16, 8, 8) | new: a mark of the Station frame (design-station-frame); awaiting verdict | the Companion's lamp, docked: a mint bead |
| `frame-lamp-8-stone` | 8×8 | (836, 16, 8, 8) | new: a mark of the Station frame (design-station-frame); awaiting verdict | the Companion's lamp, away: a stone bead |
| `frame-room-habitat-24` | 24×24 | (16, 8, 24, 24) | new: a mark of the Station frame (design-station-frame); awaiting verdict | the habitat room's mark: a fine engraved line, painted large and reduced to 24x24; at (16,8) in the title zone |
| `frame-room-home-24` | 24×24 | (16, 8, 24, 24) | new: a mark of the Station frame (design-station-frame); awaiting verdict | the home room's mark: the living window, typed by hand: a square-topped window with a cross mullion, and a two-leaf sprout 5 px tall rising from the sill into the lower-left pane; at (16,8) in the title zone |
| `frame-room-library-24` | 24×24 | (16, 8, 24, 24) | new: a mark of the Station frame (design-station-frame); awaiting verdict | the library room's mark: a fine engraved line, painted large and reduced to 24x24; at (16,8) in the title zone |
| `frame-room-research-24` | 24×24 | (16, 8, 24, 24) | new: a mark of the Station frame (design-station-frame); awaiting verdict | the research room's mark: a fine engraved line, painted large and reduced to 24x24; at (16,8) in the title zone |
| `frame-sun-16` | 16×16 | (·, 8, 16, 16) | new: a mark of the Station frame (design-station-frame); awaiting verdict | the world turn's sun mark, 16x16 (placed 4 px before its figure, right-aligned to x 1008) |
| `frame-top-bar-1024x40` | 1024×40 | (0, 0, 1024, 40) | signed (pass 1): excluded from placing (the frame redesign) | key magenta, cut, 1024x40 |

### Page pane (signed)

| Slice id | Size | Rect on the screen | Status | Made by |
| --- | --- | --- | --- | --- |
| `page-pane-256x440` | 256×440 | (152, 112, 256, 440) | signed (pass 8 (d767daa verdict)): re-cut for design-pods-relayout 29b6dc9 | 9-slice of the generated pane, brought to the stage wall's values inside a lit hairline edge |
| `page-pane-408x440` | 408×440 | (176, 112, 408, 440) | withdrawn: signed in pass 1, withdrawn with the page's re-layout (the Read page is 256 wide); Compare still uses 408 | 9-slice of the generated pane, brought to the stage wall's values inside a lit hairline edge |

### Name, origin and message plates

| Slice id | Size | Rect on the screen | Status | Made by |
| --- | --- | --- | --- | --- |
| `plate-message-640x36` | 640×36 | (192, 514, 640, 36) | signed (pass 2) | thin frosted label: 9-slice, rounded |
| `plate-message-640x56` | 640×56 | (192, 494, 640, 56) | signed (pass 2) | thin frosted label: 9-slice, rounded |
| `plate-message-640x76` | 640×76 | (192, 474, 640, 76) | signed (pass 2) | thin frosted label: 9-slice, rounded |
| `plate-name-112x24` | 112×24 | (576, 456, 112, 24) | signed (pass 7b): the 20 px name on its plate (the 0.6 tone signed in pass 6) | thin frosted label, 9-slice (insets 14 px across, 8 px down) from 80 to 224 wide in steps of 16, 24 tall, centred on x 712 |
| `plate-name-128x24` | 128×24 | (568, 456, 128, 24) | signed (pass 7b): the 20 px name on its plate (the 0.6 tone signed in pass 6) | thin frosted label, 9-slice (insets 14 px across, 8 px down) from 80 to 224 wide in steps of 16, 24 tall, centred on x 712 |
| `plate-name-144x24` | 144×24 | (560, 456, 144, 24) | signed (pass 7b): the 20 px name on its plate (the 0.6 tone signed in pass 6) | thin frosted label, 9-slice (insets 14 px across, 8 px down) from 80 to 224 wide in steps of 16, 24 tall, centred on x 712 |
| `plate-name-160x24` | 160×24 | (552, 456, 160, 24) | signed (pass 7b): the 20 px name on its plate (the 0.6 tone signed in pass 6) | thin frosted label, 9-slice (insets 14 px across, 8 px down) from 80 to 224 wide in steps of 16, 24 tall, centred on x 712 |
| `plate-name-176x24` | 176×24 | (544, 456, 176, 24) | signed (pass 7b): the 20 px name on its plate (the 0.6 tone signed in pass 6) | thin frosted label, 9-slice (insets 14 px across, 8 px down) from 80 to 224 wide in steps of 16, 24 tall, centred on x 712 |
| `plate-name-192x24` | 192×24 | (536, 456, 192, 24) | signed (pass 7b): the 20 px name on its plate (the 0.6 tone signed in pass 6) | thin frosted label, 9-slice (insets 14 px across, 8 px down) from 80 to 224 wide in steps of 16, 24 tall, centred on x 712 |
| `plate-name-208x24` | 208×24 | (528, 456, 208, 24) | signed (pass 7b): the 20 px name on its plate (the 0.6 tone signed in pass 6) | thin frosted label, 9-slice (insets 14 px across, 8 px down) from 80 to 224 wide in steps of 16, 24 tall, centred on x 712 |
| `plate-name-224x24` | 224×24 | (520, 456, 224, 24) | signed (pass 7b): the 20 px name on its plate (the 0.6 tone signed in pass 6) | thin frosted label, 9-slice (insets 14 px across, 8 px down) from 80 to 224 wide in steps of 16, 24 tall, centred on x 712 |
| `plate-name-80x24` | 80×24 | (592, 456, 80, 24) | signed (pass 7b): the 20 px name on its plate (the 0.6 tone signed in pass 6) | thin frosted label, 9-slice (insets 14 px across, 8 px down) from 80 to 224 wide in steps of 16, 24 tall, centred on x 712 |
| `plate-name-96x24` | 96×24 | (584, 456, 96, 24) | signed (pass 7b): the 20 px name on its plate (the 0.6 tone signed in pass 6) | thin frosted label, 9-slice (insets 14 px across, 8 px down) from 80 to 224 wide in steps of 16, 24 tall, centred on x 712 |

### Pods: one systematic pod in layers

| Slice id | Size | Rect on the screen | Status | Made by |
| --- | --- | --- | --- | --- |
| `pod-large-band` | 144×176 | (560, 216, 144, 176) | signed (pass 6): layers signed across passes 4 to 7b; the 33 are standing | the sealing band as a layer |
| `pod-large-crack` | 144×176 | (560, 216, 144, 176) | signed (pass 6): layers signed across passes 4 to 7b; the 33 are standing | systematic pod layer: crack, uniform scale, foot on the last row, centred |
| `pod-large-identified` | 144×176 | (560, 216, 144, 176) | signed (pass 6): layers signed across passes 4 to 7b; the 33 are standing | the Loika reference sprite |
| `pod-large-mask-accent` | 144×176 | (560, 216, 144, 176) | signed (pass 6): layers signed across passes 4 to 7b; the 33 are standing | systematic pod layer: mask-accent, uniform scale, foot on the last row, centred |
| `pod-large-mask-body` | 144×176 | (560, 216, 144, 176) | signed (pass 6): layers signed across passes 4 to 7b; the 33 are standing | systematic pod layer: mask-body, uniform scale, foot on the last row, centred |
| `pod-large-pattern-bands` | 144×176 | (560, 216, 144, 176) | signed (pass 6): layers signed across passes 4 to 7b; the 33 are standing | systematic pod layer: pattern-bands, uniform scale, foot on the last row, centred |
| `pod-large-pattern-dots` | 144×176 | (560, 216, 144, 176) | signed (pass 6): layers signed across passes 4 to 7b; the 33 are standing | systematic pod layer: pattern-dots, uniform scale, foot on the last row, centred |
| `pod-large-pattern-stripes` | 144×176 | (560, 216, 144, 176) | signed (pass 6): layers signed across passes 4 to 7b; the 33 are standing | systematic pod layer: pattern-stripes, uniform scale, foot on the last row, centred |
| `pod-large-sealed` | 144×176 | (560, 216, 144, 176) | signed (pass 6): layers signed across passes 4 to 7b; the 33 are standing | the Loika reference sprite |
| `pod-large-shade` | 144×176 | (560, 216, 144, 176) | signed (pass 6): layers signed across passes 4 to 7b; the 33 are standing | systematic pod layer: shade, uniform scale, foot on the last row, centred |
| `pod-large-shadow` | 160×14 | (552, 385, 160, 14) | signed (pass 6): layers signed across passes 4 to 7b; the 33 are standing | contact shadow: centred on x 632 with its middle on the foot line y 392 |
| `pod-medium-band` | 120×152 | (572, 240, 120, 152) | signed (pass 6): layers signed across passes 4 to 7b; the 33 are standing | the sealing band as a layer |
| `pod-medium-crack` | 120×152 | (572, 240, 120, 152) | signed (pass 6): layers signed across passes 4 to 7b; the 33 are standing | systematic pod layer: crack, uniform scale, foot on the last row, centred |
| `pod-medium-identified` | 120×152 | (572, 240, 120, 152) | signed (pass 6): layers signed across passes 4 to 7b; the 33 are standing | the Loika reference sprite |
| `pod-medium-mask-accent` | 120×152 | (572, 240, 120, 152) | signed (pass 6): layers signed across passes 4 to 7b; the 33 are standing | systematic pod layer: mask-accent, uniform scale, foot on the last row, centred |
| `pod-medium-mask-body` | 120×152 | (572, 240, 120, 152) | signed (pass 6): layers signed across passes 4 to 7b; the 33 are standing | systematic pod layer: mask-body, uniform scale, foot on the last row, centred |
| `pod-medium-pattern-bands` | 120×152 | (572, 240, 120, 152) | signed (pass 6): layers signed across passes 4 to 7b; the 33 are standing | systematic pod layer: pattern-bands, uniform scale, foot on the last row, centred |
| `pod-medium-pattern-dots` | 120×152 | (572, 240, 120, 152) | signed (pass 6): layers signed across passes 4 to 7b; the 33 are standing | systematic pod layer: pattern-dots, uniform scale, foot on the last row, centred |
| `pod-medium-pattern-stripes` | 120×152 | (572, 240, 120, 152) | signed (pass 6): layers signed across passes 4 to 7b; the 33 are standing | systematic pod layer: pattern-stripes, uniform scale, foot on the last row, centred |
| `pod-medium-sealed` | 120×152 | (572, 240, 120, 152) | signed (pass 6): layers signed across passes 4 to 7b; the 33 are standing | the Loika reference sprite |
| `pod-medium-shade` | 120×152 | (572, 240, 120, 152) | signed (pass 6): layers signed across passes 4 to 7b; the 33 are standing | systematic pod layer: shade, uniform scale, foot on the last row, centred |
| `pod-medium-shadow` | 136×14 | (564, 385, 136, 14) | signed (pass 6): layers signed across passes 4 to 7b; the 33 are standing | contact shadow: centred on x 632 with its middle on the foot line y 392 |
| `pod-small-band` | 104×128 | (580, 264, 104, 128) | signed (pass 6): layers signed across passes 4 to 7b; the 33 are standing | the sealing band as a layer |
| `pod-small-crack` | 104×128 | (580, 264, 104, 128) | signed (pass 6): layers signed across passes 4 to 7b; the 33 are standing | systematic pod layer: crack, uniform scale, foot on the last row, centred |
| `pod-small-identified` | 104×128 | (580, 264, 104, 128) | signed (pass 6): layers signed across passes 4 to 7b; the 33 are standing | the Loika reference sprite |
| `pod-small-mask-accent` | 104×128 | (580, 264, 104, 128) | signed (pass 6): layers signed across passes 4 to 7b; the 33 are standing | systematic pod layer: mask-accent, uniform scale, foot on the last row, centred |
| `pod-small-mask-body` | 104×128 | (580, 264, 104, 128) | signed (pass 6): layers signed across passes 4 to 7b; the 33 are standing | systematic pod layer: mask-body, uniform scale, foot on the last row, centred |
| `pod-small-pattern-bands` | 104×128 | (580, 264, 104, 128) | signed (pass 6): layers signed across passes 4 to 7b; the 33 are standing | systematic pod layer: pattern-bands, uniform scale, foot on the last row, centred |
| `pod-small-pattern-dots` | 104×128 | (580, 264, 104, 128) | signed (pass 6): layers signed across passes 4 to 7b; the 33 are standing | systematic pod layer: pattern-dots, uniform scale, foot on the last row, centred |
| `pod-small-pattern-stripes` | 104×128 | (580, 264, 104, 128) | signed (pass 6): layers signed across passes 4 to 7b; the 33 are standing | systematic pod layer: pattern-stripes, uniform scale, foot on the last row, centred |
| `pod-small-sealed` | 104×128 | (580, 264, 104, 128) | signed (pass 6): layers signed across passes 4 to 7b; the 33 are standing | the Loika reference sprite |
| `pod-small-shade` | 104×128 | (580, 264, 104, 128) | signed (pass 6): layers signed across passes 4 to 7b; the 33 are standing | systematic pod layer: shade, uniform scale, foot on the last row, centred |
| `pod-small-shadow` | 120×14 | (572, 385, 120, 14) | signed (pass 6): layers signed across passes 4 to 7b; the 33 are standing | contact shadow: centred on x 632 with its middle on the foot line y 392 |
| `pod-well-band` | 40×48 | (44, 60, 40, 48) | new: the well pod at 32x48, the pod centred vertically (rows about 6 to 41) as the art director asked; awaiting verdict | the sealing band as a layer |
| `pod-well-crack` | 40×48 | (44, 60, 40, 48) | new: the well pod at 32x48, the pod centred vertically (rows about 6 to 41) as the art director asked; awaiting verdict | systematic pod layer: crack, uniform scale, foot on the last row, centred |
| `pod-well-identified` | 40×48 | (44, 60, 40, 48) | new: the well pod at 32x48, the pod centred vertically (rows about 6 to 41) as the art director asked; awaiting verdict | the Loika reference sprite |
| `pod-well-mask-accent` | 40×48 | (·, ·, 40, 48) | new: the well pod at 32x48, the pod centred vertically (rows about 6 to 41) as the art director asked; awaiting verdict | systematic pod layer: mask-accent, enclosed pixels filled |
| `pod-well-mask-body` | 40×48 | (·, ·, 40, 48) | new: the well pod at 32x48, the pod centred vertically (rows about 6 to 41) as the art director asked; awaiting verdict | systematic pod layer: mask-body, held with the accent mask |
| `pod-well-pattern-bands` | 40×48 | (44, 60, 40, 48) | new: the well pod at 32x48, the pod centred vertically (rows about 6 to 41) as the art director asked; awaiting verdict | systematic pod layer: pattern-bands, uniform scale, foot on the last row, centred |
| `pod-well-pattern-dots` | 40×48 | (44, 60, 40, 48) | new: the well pod at 32x48, the pod centred vertically (rows about 6 to 41) as the art director asked; awaiting verdict | systematic pod layer: pattern-dots, uniform scale, foot on the last row, centred |
| `pod-well-pattern-stripes` | 40×48 | (44, 60, 40, 48) | new: the well pod at 32x48, the pod centred vertically (rows about 6 to 41) as the art director asked; awaiting verdict | systematic pod layer: pattern-stripes, uniform scale, foot on the last row, centred |
| `pod-well-sealed` | 40×48 | (44, 60, 40, 48) | new: the well pod at 32x48, the pod centred vertically (rows about 6 to 41) as the art director asked; awaiting verdict | the Loika reference sprite |
| `pod-well-shade` | 40×48 | (44, 60, 40, 48) | new: the well pod at 32x48, the pod centred vertically (rows about 6 to 41) as the art director asked; awaiting verdict | systematic pod layer: shade, uniform scale, foot on the last row, centred |
| `pod-well-shadow` | 56×14 | (604, 385, 56, 14) | new: the well pod at 32x48, the pod centred vertically (rows about 6 to 41) as the art director asked; awaiting verdict | contact shadow: centred on x 632 with its middle on the foot line y 392 |

### Chapter rail tabs (hanging, slant baked)

| Slice id | Size | Rect on the screen | Status | Made by |
| --- | --- | --- | --- | --- |
| `rail-tab-fill-open-compact-72x40` | 72×40 | (·, 40, 72, 40) | new: the rail rule of design-pods-relayout 29b6dc9: one fill per state, no lit rim, no teal; awaiting verdict | one fill per state (hairline), a 1 px bevel on its edges, no lit rim; slant 16 baked |
| `rail-tab-fill-open-full-152x40` | 152×40 | (·, 40, 152, 40) | new: the rail rule of design-pods-relayout 29b6dc9: one fill per state, no lit rim, no teal; awaiting verdict | one fill per state (hairline), a 1 px bevel on its edges, no lit rim; slant 16 baked |
| `rail-tab-fill-read-compact-72x40` | 72×40 | (·, 40, 72, 40) | new: the rail rule of design-pods-relayout 29b6dc9: one fill per state, no lit rim, no teal; awaiting verdict | one fill per state (panel), a 1 px bevel on its edges, no lit rim; slant 16 baked |
| `rail-tab-fill-read-full-152x40` | 152×40 | (·, 40, 152, 40) | new: the rail rule of design-pods-relayout 29b6dc9: one fill per state, no lit rim, no teal; awaiting verdict | one fill per state (panel), a 1 px bevel on its edges, no lit rim; slant 16 baked |
| `rail-tab-fill-sealed-compact-72x40` | 72×40 | (·, 40, 72, 40) | new: the rail rule of design-pods-relayout 29b6dc9: one fill per state, no lit rim, no teal; awaiting verdict | one fill per state (panel, slats in bar), a 1 px bevel on its edges, no lit rim; slant 16 baked |
| `rail-tab-fill-sealed-full-152x40` | 152×40 | (·, 40, 152, 40) | new: the rail rule of design-pods-relayout 29b6dc9: one fill per state, no lit rim, no teal; awaiting verdict | one fill per state (panel, slats in bar), a 1 px bevel on its edges, no lit rim; slant 16 baked |
| `rail-tab-fill-unread-compact-72x40` | 72×40 | (·, 40, 72, 40) | new: the rail rule of design-pods-relayout 29b6dc9: one fill per state, no lit rim, no teal; awaiting verdict | one fill per state (panel), a 1 px bevel on its edges, no lit rim; slant 16 baked |
| `rail-tab-fill-unread-full-152x40` | 152×40 | (·, 40, 152, 40) | new: the rail rule of design-pods-relayout 29b6dc9: one fill per state, no lit rim, no teal; awaiting verdict | one fill per state (panel), a 1 px bevel on its edges, no lit rim; slant 16 baked |
| `rail-tab-focused-compact-72x40` | 72×40 | (·, 40, 72, 40) | withdrawn: signed in pass 4; superseded by rail-tab-fill-* (the rail rule of 29b6dc9 takes the lit rim and the teal away) | compact hanging tab, slant baked (9-slice of the full one, slant kept) |
| `rail-tab-focused-full-152x40` | 152×40 | (·, 40, 152, 40) | withdrawn: signed in pass 4; superseded by rail-tab-fill-* (the rail rule of 29b6dc9 takes the lit rim and the teal away) | hanging tab, slant baked: un-sheared, resized to 136x40, sheared 16 px |
| `rail-tab-read-compact-72x40` | 72×40 | (·, 40, 72, 40) | withdrawn: signed in pass 4; superseded by rail-tab-fill-* (the rail rule of 29b6dc9 takes the lit rim and the teal away) | compact hanging tab, slant baked (9-slice of the full one, slant kept) |
| `rail-tab-read-full-152x40` | 152×40 | (·, 40, 152, 40) | withdrawn: signed in pass 4; superseded by rail-tab-fill-* (the rail rule of 29b6dc9 takes the lit rim and the teal away) | hanging tab, slant baked: un-sheared, resized to 136x40, sheared 16 px |
| `rail-tab-sealed-compact-72x40` | 72×40 | (·, 40, 72, 40) | withdrawn: signed in pass 4; superseded by rail-tab-fill-* (the rail rule of 29b6dc9 takes the lit rim and the teal away) | compact hanging tab, slant baked (9-slice of the full one, slant kept) |
| `rail-tab-sealed-full-152x40` | 152×40 | (·, 40, 152, 40) | withdrawn: signed in pass 4; superseded by rail-tab-fill-* (the rail rule of 29b6dc9 takes the lit rim and the teal away) | hanging tab, slant baked: un-sheared, resized to 136x40, sheared 16 px |
| `rail-tab-unread-compact-72x40` | 72×40 | (·, 40, 72, 40) | withdrawn: signed in pass 4; superseded by rail-tab-fill-* (the rail rule of 29b6dc9 takes the lit rim and the teal away) | compact hanging tab, slant baked (9-slice of the full one, slant kept) |
| `rail-tab-unread-full-152x40` | 152×40 | (·, 40, 152, 40) | withdrawn: signed in pass 4; superseded by rail-tab-fill-* (the rail rule of 29b6dc9 takes the lit rim and the teal away) | hanging tab, slant baked: un-sheared, resized to 136x40, sheared 16 px |

### Wells and hatch

| Slice id | Size | Rect on the screen | Status | Made by |
| --- | --- | --- | --- | --- |
| `ring-arc-idle-n4-s0` | 80×80 | (24, 44, 80, 80) | signed (well rings verdict) | chapter 1 of 4: a 2 px dim warm line on the inner edge at radius 24, clockwise from 12 o'clock, equal segments with 2 px gaps |
| `ring-arc-idle-n4-s1` | 80×80 | (24, 44, 80, 80) | signed (well rings verdict) | chapter 2 of 4: a 2 px dim warm line on the inner edge at radius 24, clockwise from 12 o'clock, equal segments with 2 px gaps |
| `ring-arc-idle-n4-s2` | 80×80 | (24, 44, 80, 80) | signed (well rings verdict) | chapter 3 of 4: a 2 px dim warm line on the inner edge at radius 24, clockwise from 12 o'clock, equal segments with 2 px gaps |
| `ring-arc-idle-n4-s3` | 80×80 | (24, 44, 80, 80) | signed (well rings verdict) | chapter 4 of 4: a 2 px dim warm line on the inner edge at radius 24, clockwise from 12 o'clock, equal segments with 2 px gaps |
| `ring-arc-idle-n4-track` | 80×80 | (24, 44, 80, 80) | signed (well rings verdict) | the unlit groove for 4 chapters: a dark 3 px groove at radius 24 with a faint lit lip on its lower-right side |
| `ring-arc-idle-n5-s0` | 80×80 | (24, 44, 80, 80) | signed (well rings verdict) | chapter 1 of 5: a 2 px dim warm line on the inner edge at radius 24, clockwise from 12 o'clock, equal segments with 2 px gaps |
| `ring-arc-idle-n5-s1` | 80×80 | (24, 44, 80, 80) | signed (well rings verdict) | chapter 2 of 5: a 2 px dim warm line on the inner edge at radius 24, clockwise from 12 o'clock, equal segments with 2 px gaps |
| `ring-arc-idle-n5-s2` | 80×80 | (24, 44, 80, 80) | signed (well rings verdict) | chapter 3 of 5: a 2 px dim warm line on the inner edge at radius 24, clockwise from 12 o'clock, equal segments with 2 px gaps |
| `ring-arc-idle-n5-s3` | 80×80 | (24, 44, 80, 80) | signed (well rings verdict) | chapter 4 of 5: a 2 px dim warm line on the inner edge at radius 24, clockwise from 12 o'clock, equal segments with 2 px gaps |
| `ring-arc-idle-n5-s4` | 80×80 | (24, 44, 80, 80) | signed (well rings verdict) | chapter 5 of 5: a 2 px dim warm line on the inner edge at radius 24, clockwise from 12 o'clock, equal segments with 2 px gaps |
| `ring-arc-idle-n5-track` | 80×80 | (24, 44, 80, 80) | signed (well rings verdict) | the unlit groove for 5 chapters: a dark 3 px groove at radius 24 with a faint lit lip on its lower-right side |
| `ring-arc-idle-n6-s0` | 80×80 | (24, 44, 80, 80) | signed (well rings verdict) | chapter 1 of 6: a 2 px dim warm line on the inner edge at radius 24, clockwise from 12 o'clock, equal segments with 2 px gaps |
| `ring-arc-idle-n6-s1` | 80×80 | (24, 44, 80, 80) | signed (well rings verdict) | chapter 2 of 6: a 2 px dim warm line on the inner edge at radius 24, clockwise from 12 o'clock, equal segments with 2 px gaps |
| `ring-arc-idle-n6-s2` | 80×80 | (24, 44, 80, 80) | signed (well rings verdict) | chapter 3 of 6: a 2 px dim warm line on the inner edge at radius 24, clockwise from 12 o'clock, equal segments with 2 px gaps |
| `ring-arc-idle-n6-s3` | 80×80 | (24, 44, 80, 80) | signed (well rings verdict) | chapter 4 of 6: a 2 px dim warm line on the inner edge at radius 24, clockwise from 12 o'clock, equal segments with 2 px gaps |
| `ring-arc-idle-n6-s4` | 80×80 | (24, 44, 80, 80) | signed (well rings verdict) | chapter 5 of 6: a 2 px dim warm line on the inner edge at radius 24, clockwise from 12 o'clock, equal segments with 2 px gaps |
| `ring-arc-idle-n6-s5` | 80×80 | (24, 44, 80, 80) | signed (well rings verdict) | chapter 6 of 6: a 2 px dim warm line on the inner edge at radius 24, clockwise from 12 o'clock, equal segments with 2 px gaps |
| `ring-arc-idle-n6-track` | 80×80 | (24, 44, 80, 80) | signed (well rings verdict) | the unlit groove for 6 chapters: a dark 3 px groove at radius 24 with a faint lit lip on its lower-right side |
| `ring-arc-idle-n7-s0` | 80×80 | (24, 44, 80, 80) | signed (well rings verdict) | chapter 1 of 7: a 2 px dim warm line on the inner edge at radius 24, clockwise from 12 o'clock, equal segments with 2 px gaps |
| `ring-arc-idle-n7-s1` | 80×80 | (24, 44, 80, 80) | signed (well rings verdict) | chapter 2 of 7: a 2 px dim warm line on the inner edge at radius 24, clockwise from 12 o'clock, equal segments with 2 px gaps |
| `ring-arc-idle-n7-s2` | 80×80 | (24, 44, 80, 80) | signed (well rings verdict) | chapter 3 of 7: a 2 px dim warm line on the inner edge at radius 24, clockwise from 12 o'clock, equal segments with 2 px gaps |
| `ring-arc-idle-n7-s3` | 80×80 | (24, 44, 80, 80) | signed (well rings verdict) | chapter 4 of 7: a 2 px dim warm line on the inner edge at radius 24, clockwise from 12 o'clock, equal segments with 2 px gaps |
| `ring-arc-idle-n7-s4` | 80×80 | (24, 44, 80, 80) | signed (well rings verdict) | chapter 5 of 7: a 2 px dim warm line on the inner edge at radius 24, clockwise from 12 o'clock, equal segments with 2 px gaps |
| `ring-arc-idle-n7-s5` | 80×80 | (24, 44, 80, 80) | signed (well rings verdict) | chapter 6 of 7: a 2 px dim warm line on the inner edge at radius 24, clockwise from 12 o'clock, equal segments with 2 px gaps |
| `ring-arc-idle-n7-s6` | 80×80 | (24, 44, 80, 80) | signed (well rings verdict) | chapter 7 of 7: a 2 px dim warm line on the inner edge at radius 24, clockwise from 12 o'clock, equal segments with 2 px gaps |
| `ring-arc-idle-n7-track` | 80×80 | (24, 44, 80, 80) | signed (well rings verdict) | the unlit groove for 7 chapters: a dark 3 px groove at radius 24 with a faint lit lip on its lower-right side |
| `ring-arc-idle-n8-s0` | 80×80 | (24, 44, 80, 80) | signed (well rings verdict) | chapter 1 of 8: a 2 px dim warm line on the inner edge at radius 24, clockwise from 12 o'clock, equal segments with 2 px gaps |
| `ring-arc-idle-n8-s1` | 80×80 | (24, 44, 80, 80) | signed (well rings verdict) | chapter 2 of 8: a 2 px dim warm line on the inner edge at radius 24, clockwise from 12 o'clock, equal segments with 2 px gaps |
| `ring-arc-idle-n8-s2` | 80×80 | (24, 44, 80, 80) | signed (well rings verdict) | chapter 3 of 8: a 2 px dim warm line on the inner edge at radius 24, clockwise from 12 o'clock, equal segments with 2 px gaps |
| `ring-arc-idle-n8-s3` | 80×80 | (24, 44, 80, 80) | signed (well rings verdict) | chapter 4 of 8: a 2 px dim warm line on the inner edge at radius 24, clockwise from 12 o'clock, equal segments with 2 px gaps |
| `ring-arc-idle-n8-s4` | 80×80 | (24, 44, 80, 80) | signed (well rings verdict) | chapter 5 of 8: a 2 px dim warm line on the inner edge at radius 24, clockwise from 12 o'clock, equal segments with 2 px gaps |
| `ring-arc-idle-n8-s5` | 80×80 | (24, 44, 80, 80) | signed (well rings verdict) | chapter 6 of 8: a 2 px dim warm line on the inner edge at radius 24, clockwise from 12 o'clock, equal segments with 2 px gaps |
| `ring-arc-idle-n8-s6` | 80×80 | (24, 44, 80, 80) | signed (well rings verdict) | chapter 7 of 8: a 2 px dim warm line on the inner edge at radius 24, clockwise from 12 o'clock, equal segments with 2 px gaps |
| `ring-arc-idle-n8-s7` | 80×80 | (24, 44, 80, 80) | signed (well rings verdict) | chapter 8 of 8: a 2 px dim warm line on the inner edge at radius 24, clockwise from 12 o'clock, equal segments with 2 px gaps |
| `ring-arc-idle-n8-track` | 80×80 | (24, 44, 80, 80) | signed (well rings verdict) | the unlit groove for 8 chapters: a dark 3 px groove at radius 24 with a faint lit lip on its lower-right side |
| `ring-arc-selected-n4-s0` | 80×80 | (24, 44, 80, 80) | new: repainted: the band solid and with a channel, cut by angle; awaiting verdict | chapter 1 of 4: the solid band cut by angle (clockwise from 12 o'clock), the 1 px boundary ticks left open; a read chapter shows this over the channel |
| `ring-arc-selected-n4-s1` | 80×80 | (24, 44, 80, 80) | new: repainted: the band solid and with a channel, cut by angle; awaiting verdict | chapter 2 of 4: the solid band cut by angle (clockwise from 12 o'clock), the 1 px boundary ticks left open; a read chapter shows this over the channel |
| `ring-arc-selected-n4-s2` | 80×80 | (24, 44, 80, 80) | new: repainted: the band solid and with a channel, cut by angle; awaiting verdict | chapter 3 of 4: the solid band cut by angle (clockwise from 12 o'clock), the 1 px boundary ticks left open; a read chapter shows this over the channel |
| `ring-arc-selected-n4-s3` | 80×80 | (24, 44, 80, 80) | new: repainted: the band solid and with a channel, cut by angle; awaiting verdict | chapter 4 of 4: the solid band cut by angle (clockwise from 12 o'clock), the 1 px boundary ticks left open; a read chapter shows this over the channel |
| `ring-arc-selected-n4-track` | 80×80 | (24, 44, 80, 80) | new: repainted: the band solid and with a channel, cut by angle; awaiting verdict | the open channel for 4 chapters: the concept's band with an engraved channel in its outer half (thin ivory lips, dark inside), a 1 px tick at each chapter boundary; draw it over the solid ring |
| `ring-arc-selected-n5-s0` | 80×80 | (24, 44, 80, 80) | new: repainted: the band solid and with a channel, cut by angle; awaiting verdict | chapter 1 of 5: the solid band cut by angle (clockwise from 12 o'clock), the 1 px boundary ticks left open; a read chapter shows this over the channel |
| `ring-arc-selected-n5-s1` | 80×80 | (24, 44, 80, 80) | new: repainted: the band solid and with a channel, cut by angle; awaiting verdict | chapter 2 of 5: the solid band cut by angle (clockwise from 12 o'clock), the 1 px boundary ticks left open; a read chapter shows this over the channel |
| `ring-arc-selected-n5-s2` | 80×80 | (24, 44, 80, 80) | new: repainted: the band solid and with a channel, cut by angle; awaiting verdict | chapter 3 of 5: the solid band cut by angle (clockwise from 12 o'clock), the 1 px boundary ticks left open; a read chapter shows this over the channel |
| `ring-arc-selected-n5-s3` | 80×80 | (24, 44, 80, 80) | new: repainted: the band solid and with a channel, cut by angle; awaiting verdict | chapter 4 of 5: the solid band cut by angle (clockwise from 12 o'clock), the 1 px boundary ticks left open; a read chapter shows this over the channel |
| `ring-arc-selected-n5-s4` | 80×80 | (24, 44, 80, 80) | new: repainted: the band solid and with a channel, cut by angle; awaiting verdict | chapter 5 of 5: the solid band cut by angle (clockwise from 12 o'clock), the 1 px boundary ticks left open; a read chapter shows this over the channel |
| `ring-arc-selected-n5-track` | 80×80 | (24, 44, 80, 80) | new: repainted: the band solid and with a channel, cut by angle; awaiting verdict | the open channel for 5 chapters: the concept's band with an engraved channel in its outer half (thin ivory lips, dark inside), a 1 px tick at each chapter boundary; draw it over the solid ring |
| `ring-arc-selected-n6-s0` | 80×80 | (24, 44, 80, 80) | new: repainted: the band solid and with a channel, cut by angle; awaiting verdict | chapter 1 of 6: the solid band cut by angle (clockwise from 12 o'clock), the 1 px boundary ticks left open; a read chapter shows this over the channel |
| `ring-arc-selected-n6-s1` | 80×80 | (24, 44, 80, 80) | new: repainted: the band solid and with a channel, cut by angle; awaiting verdict | chapter 2 of 6: the solid band cut by angle (clockwise from 12 o'clock), the 1 px boundary ticks left open; a read chapter shows this over the channel |
| `ring-arc-selected-n6-s2` | 80×80 | (24, 44, 80, 80) | new: repainted: the band solid and with a channel, cut by angle; awaiting verdict | chapter 3 of 6: the solid band cut by angle (clockwise from 12 o'clock), the 1 px boundary ticks left open; a read chapter shows this over the channel |
| `ring-arc-selected-n6-s3` | 80×80 | (24, 44, 80, 80) | new: repainted: the band solid and with a channel, cut by angle; awaiting verdict | chapter 4 of 6: the solid band cut by angle (clockwise from 12 o'clock), the 1 px boundary ticks left open; a read chapter shows this over the channel |
| `ring-arc-selected-n6-s4` | 80×80 | (24, 44, 80, 80) | new: repainted: the band solid and with a channel, cut by angle; awaiting verdict | chapter 5 of 6: the solid band cut by angle (clockwise from 12 o'clock), the 1 px boundary ticks left open; a read chapter shows this over the channel |
| `ring-arc-selected-n6-s5` | 80×80 | (24, 44, 80, 80) | new: repainted: the band solid and with a channel, cut by angle; awaiting verdict | chapter 6 of 6: the solid band cut by angle (clockwise from 12 o'clock), the 1 px boundary ticks left open; a read chapter shows this over the channel |
| `ring-arc-selected-n6-track` | 80×80 | (24, 44, 80, 80) | new: repainted: the band solid and with a channel, cut by angle; awaiting verdict | the open channel for 6 chapters: the concept's band with an engraved channel in its outer half (thin ivory lips, dark inside), a 1 px tick at each chapter boundary; draw it over the solid ring |
| `ring-arc-selected-n7-s0` | 80×80 | (24, 44, 80, 80) | new: repainted: the band solid and with a channel, cut by angle; awaiting verdict | chapter 1 of 7: the solid band cut by angle (clockwise from 12 o'clock), the 1 px boundary ticks left open; a read chapter shows this over the channel |
| `ring-arc-selected-n7-s1` | 80×80 | (24, 44, 80, 80) | new: repainted: the band solid and with a channel, cut by angle; awaiting verdict | chapter 2 of 7: the solid band cut by angle (clockwise from 12 o'clock), the 1 px boundary ticks left open; a read chapter shows this over the channel |
| `ring-arc-selected-n7-s2` | 80×80 | (24, 44, 80, 80) | new: repainted: the band solid and with a channel, cut by angle; awaiting verdict | chapter 3 of 7: the solid band cut by angle (clockwise from 12 o'clock), the 1 px boundary ticks left open; a read chapter shows this over the channel |
| `ring-arc-selected-n7-s3` | 80×80 | (24, 44, 80, 80) | new: repainted: the band solid and with a channel, cut by angle; awaiting verdict | chapter 4 of 7: the solid band cut by angle (clockwise from 12 o'clock), the 1 px boundary ticks left open; a read chapter shows this over the channel |
| `ring-arc-selected-n7-s4` | 80×80 | (24, 44, 80, 80) | new: repainted: the band solid and with a channel, cut by angle; awaiting verdict | chapter 5 of 7: the solid band cut by angle (clockwise from 12 o'clock), the 1 px boundary ticks left open; a read chapter shows this over the channel |
| `ring-arc-selected-n7-s5` | 80×80 | (24, 44, 80, 80) | new: repainted: the band solid and with a channel, cut by angle; awaiting verdict | chapter 6 of 7: the solid band cut by angle (clockwise from 12 o'clock), the 1 px boundary ticks left open; a read chapter shows this over the channel |
| `ring-arc-selected-n7-s6` | 80×80 | (24, 44, 80, 80) | new: repainted: the band solid and with a channel, cut by angle; awaiting verdict | chapter 7 of 7: the solid band cut by angle (clockwise from 12 o'clock), the 1 px boundary ticks left open; a read chapter shows this over the channel |
| `ring-arc-selected-n7-track` | 80×80 | (24, 44, 80, 80) | new: repainted: the band solid and with a channel, cut by angle; awaiting verdict | the open channel for 7 chapters: the concept's band with an engraved channel in its outer half (thin ivory lips, dark inside), a 1 px tick at each chapter boundary; draw it over the solid ring |
| `ring-arc-selected-n8-s0` | 80×80 | (24, 44, 80, 80) | new: repainted: the band solid and with a channel, cut by angle; awaiting verdict | chapter 1 of 8: the solid band cut by angle (clockwise from 12 o'clock), the 1 px boundary ticks left open; a read chapter shows this over the channel |
| `ring-arc-selected-n8-s1` | 80×80 | (24, 44, 80, 80) | new: repainted: the band solid and with a channel, cut by angle; awaiting verdict | chapter 2 of 8: the solid band cut by angle (clockwise from 12 o'clock), the 1 px boundary ticks left open; a read chapter shows this over the channel |
| `ring-arc-selected-n8-s2` | 80×80 | (24, 44, 80, 80) | new: repainted: the band solid and with a channel, cut by angle; awaiting verdict | chapter 3 of 8: the solid band cut by angle (clockwise from 12 o'clock), the 1 px boundary ticks left open; a read chapter shows this over the channel |
| `ring-arc-selected-n8-s3` | 80×80 | (24, 44, 80, 80) | new: repainted: the band solid and with a channel, cut by angle; awaiting verdict | chapter 4 of 8: the solid band cut by angle (clockwise from 12 o'clock), the 1 px boundary ticks left open; a read chapter shows this over the channel |
| `ring-arc-selected-n8-s4` | 80×80 | (24, 44, 80, 80) | new: repainted: the band solid and with a channel, cut by angle; awaiting verdict | chapter 5 of 8: the solid band cut by angle (clockwise from 12 o'clock), the 1 px boundary ticks left open; a read chapter shows this over the channel |
| `ring-arc-selected-n8-s5` | 80×80 | (24, 44, 80, 80) | new: repainted: the band solid and with a channel, cut by angle; awaiting verdict | chapter 6 of 8: the solid band cut by angle (clockwise from 12 o'clock), the 1 px boundary ticks left open; a read chapter shows this over the channel |
| `ring-arc-selected-n8-s6` | 80×80 | (24, 44, 80, 80) | new: repainted: the band solid and with a channel, cut by angle; awaiting verdict | chapter 7 of 8: the solid band cut by angle (clockwise from 12 o'clock), the 1 px boundary ticks left open; a read chapter shows this over the channel |
| `ring-arc-selected-n8-s7` | 80×80 | (24, 44, 80, 80) | new: repainted: the band solid and with a channel, cut by angle; awaiting verdict | chapter 8 of 8: the solid band cut by angle (clockwise from 12 o'clock), the 1 px boundary ticks left open; a read chapter shows this over the channel |
| `ring-arc-selected-n8-track` | 80×80 | (24, 44, 80, 80) | new: repainted: the band solid and with a channel, cut by angle; awaiting verdict | the open channel for 8 chapters: the concept's band with an engraved channel in its outer half (thin ivory lips, dark inside), a 1 px tick at each chapter boundary; draw it over the solid ring |
| `ring-hatch` | 112×56 | (24, 488, 112, 56) | withdrawn: the 112x56 slice of the earlier layout; replaced by ring-hatch-80x56 | a leaf etched into the column glass (colour-to-alpha), 24 px leaf centred, no box |
| `ring-hatch-80x56` | 80×56 | (24, 488, 80, 56) | signed (pass 8 (d767daa verdict)): re-cut for design-pods-relayout 29b6dc9 | the hatch at the 112 px column's width: the same etched leaf centred in 80x56 |
| `ring-well-empty` | 64×64 | (40, 52, 64, 64) | withdrawn: the 64x64 slice; re-exported as ring-well-empty-80x80 (the art director: pad to 80x80 centred on (40,40)) | colour-to-alpha on the flat ground, the ring cut square, 64x64 (hollow) |
| `ring-well-empty-80x80` | 80×80 | (24, 44, 80, 80) | new: re-export of the signed ring-well-empty only, padded to 80x80; awaiting verdict | the signed ring-well-empty re-exported only: padded to 80x80, centred on (40,40) so every well slice shares one origin |
| `ring-well-idle-80x80` | 80×80 | (24, 44, 80, 80) | signed (well rings verdict) | the idle well's thin dark-glass double ring, outer diameter 66, hairlines about 5 px apart; colour-to-alpha, centred in 80x80 |
| `ring-well-selected-80x80` | 80×80 | (24, 44, 80, 80) | signed (well rings verdict) | the selected well's thick warm ivory band (7 px, bone to sand, lit top left) with its soft glow about 4 px outward; colour-to-alpha, scaled so the band's outer diameter is 66, centred in 80x80 |

### List column plate (signed)

| Slice id | Size | Rect on the screen | Status | Made by |
| --- | --- | --- | --- | --- |
| `ring-column` | 160×522 | (0, 40, 160, 522) | withdrawn: the 160 px column of the earlier layout; replaced by ring-column-112x522 | cut: right part of list-column, bottom leak cropped |
| `ring-column-112x522` | 112×522 | (0, 40, 112, 522) | signed (pass 8 (d767daa verdict)): re-cut for design-pods-relayout 29b6dc9 | the list column at the concept's 112 px: the right part of list-column (its lit hairline on the right edge), bottom leak cropped |

### Bench scene, dish, shelf

| Slice id | Size | Rect on the screen | Status | Made by |
| --- | --- | --- | --- | --- |
| `room-bench-stage` | 1024×522 | (0, 40, 1024, 522) | signed (pass 4): re-cut to the layout of design-pods-relayout 29b6dc9 (pool on x 632) | the generated glass wall: horizon flattened, sides and bottom extended from the wall's own strips, window on the pool (632, 424) |
| `room-cradle` | 224×96 | (520, 328, 224, 96) | signed (pass 4) | the deep frosted bowl with its dark dust bed and the cool glow through its wall: opaque cut, scaled evenly into 224x96 (the bowl is 201 px wide), bottom on the last row |
| `room-cradle-front` | 224×96 | (520, 328, 224, 96) | signed (pass 7b) | the bowl's near wall cut along its own near-rim contour (both side walls from row ~19 and the dip's U), plus five uneven grit tufts lapping the pod's foot inside the dip |
| `room-shelf` | 288×72 | (488, 368, 288, 72) | signed (pass 7b): re-cut for the new rectangle (shelf 488,368,288,72) | the concept's slab, a trapezoid in perspective with a deep top face and a lit front edge, with the bowl's contact shadow on it; colour-to-alpha, scaled evenly |
| `room-stamp-case` | 176×328 | (848, 144, 176, 328) | withdrawn: the old 176x328 size; the case is now 152x152 | the dim unlit glass case: translucent (the wall's seams show through), a faint diagonal sheen, dim brushed-metal rails, open at the right |
| `room-stamp-case-152x152` | 152×152 | (856, 232, 152, 152) | signed (pass 8 (d767daa verdict)): with a condition: the front glass over the label (room-stamp-case-152x152-front) | the dim unlit glass case at its new size: translucent, a faint diagonal sheen, dim brushed-metal rails, closed on all four sides |
| `room-stamp-case-152x152-front` | 152×152 | (856, 232, 152, 152) | new: the front glass over the label; awaiting verdict | the case's front glass over the label: a dark tint (0.41) and a faint diagonal sheen; the label's mean brightness falls to about 114 with the stamp's cells at 4.8:1 (WCAG relative luminance) |

### Stamp label (signed)

| Slice id | Size | Rect on the screen | Status | Made by |
| --- | --- | --- | --- | --- |
| `stamp-label-120x120` | 120×120 | (872, 248, 120, 120) | signed (pass 1) | cut, 120x120 |

### Picture frames (overlay, transparent inside)

| Slice id | Size | Rect on the screen | Status | Made by |
| --- | --- | --- | --- | --- |
| `trait-picture-frame-104x160` | 104×160 |  | signed (pass 8 (d767daa verdict)) | key magenta lip, 9-slice, with a painted-ramp inner shade |
| `trait-picture-frame-104x160-sealed` | 104×160 |  | signed (pass 8 (d767daa verdict)) | slats texture tiled by whole slats, under the frame |
| `trait-picture-frame-104x160-unread` | 104×160 |  | signed (pass 8 (d767daa verdict)) | frost texture at 0.9 alpha under the frame |
| `trait-picture-frame-104x64` | 104×64 |  | signed (pass 8 (d767daa verdict)) | key magenta lip, 9-slice, with a painted-ramp inner shade |
| `trait-picture-frame-104x64-sealed` | 104×64 |  | signed (pass 8 (d767daa verdict)) | slats texture tiled by whole slats, under the frame |
| `trait-picture-frame-104x64-unread` | 104×64 |  | signed (pass 8 (d767daa verdict)) | frost texture at 0.9 alpha under the frame |
| `trait-picture-frame-104x96` | 104×96 |  | signed (pass 8 (d767daa verdict)) | key magenta lip, 9-slice, with a painted-ramp inner shade |
| `trait-picture-frame-104x96-sealed` | 104×96 |  | signed (pass 8 (d767daa verdict)) | slats texture tiled by whole slats, under the frame |
| `trait-picture-frame-104x96-unread` | 104×96 |  | signed (pass 8 (d767daa verdict)) | frost texture at 0.9 alpha under the frame |
| `trait-picture-frame-112x112` | 112×112 |  | new: the find picture frame of a sealed chapter at (224,296); awaiting verdict | key magenta lip, 9-slice, with a painted-ramp inner shade |
| `trait-picture-frame-120x112` | 120×112 |  | withdrawn: the old Read picture sizes are withdrawn (design-pods-relayout 29b6dc9) | key magenta lip, 9-slice, with a painted-ramp inner shade |
| `trait-picture-frame-120x112-sealed` | 120×112 |  | withdrawn: the old Read picture sizes are withdrawn (design-pods-relayout 29b6dc9) | slats texture tiled by whole slats, under the frame |
| `trait-picture-frame-120x112-unread` | 120×112 |  | withdrawn: the old Read picture sizes are withdrawn (design-pods-relayout 29b6dc9) | frost texture at 0.9 alpha under the frame |
| `trait-picture-frame-120x96` | 120×96 |  | signed (pass 3) | key magenta lip, 9-slice, with a painted-ramp inner shade |
| `trait-picture-frame-120x96-sealed` | 120×96 |  | signed (pass 6) | slats texture tiled by whole slats, under the frame |
| `trait-picture-frame-120x96-unread` | 120×96 |  | signed (pass 4) | frost texture at 0.9 alpha under the frame |
| `trait-picture-frame-144x176` | 144×176 |  | new: new size of design-pods-relayout 29b6dc9 (the Read page's grid); awaiting verdict | key magenta lip, 9-slice, with a painted-ramp inner shade |
| `trait-picture-frame-144x176-sealed` | 144×176 |  | new: new size of design-pods-relayout 29b6dc9 (the Read page's grid); awaiting verdict | slats texture tiled by whole slats, under the frame |
| `trait-picture-frame-144x176-unread` | 144×176 |  | new: new size of design-pods-relayout 29b6dc9 (the Read page's grid); awaiting verdict | frost texture at 0.9 alpha under the frame |
| `trait-picture-frame-176x144` | 176×144 |  | new: new size of design-pods-relayout 29b6dc9 (the Read page's grid); awaiting verdict | key magenta lip, 9-slice, with a painted-ramp inner shade |
| `trait-picture-frame-176x144-sealed` | 176×144 |  | new: new size of design-pods-relayout 29b6dc9 (the Read page's grid); awaiting verdict | slats texture tiled by whole slats, under the frame |
| `trait-picture-frame-176x144-unread` | 176×144 |  | new: new size of design-pods-relayout 29b6dc9 (the Read page's grid); awaiting verdict | frost texture at 0.9 alpha under the frame |
| `trait-picture-frame-184x104` | 184×104 |  | signed (pass 3) | key magenta lip, 9-slice, with a painted-ramp inner shade |
| `trait-picture-frame-184x104-sealed` | 184×104 |  | signed (pass 6) | slats texture tiled by whole slats, under the frame |
| `trait-picture-frame-184x104-unread` | 184×104 |  | signed (pass 4) | frost texture at 0.9 alpha under the frame |
| `trait-picture-frame-184x112` | 184×112 |  | withdrawn: the old Read picture sizes are withdrawn (design-pods-relayout 29b6dc9) | key magenta lip, 9-slice, with a painted-ramp inner shade |
| `trait-picture-frame-184x112-sealed` | 184×112 |  | withdrawn: the old Read picture sizes are withdrawn (design-pods-relayout 29b6dc9) | slats texture tiled by whole slats, under the frame |
| `trait-picture-frame-184x112-unread` | 184×112 |  | withdrawn: the old Read picture sizes are withdrawn (design-pods-relayout 29b6dc9) | frost texture at 0.9 alpha under the frame |
| `trait-picture-frame-184x256` | 184×256 |  | signed (pass 3) | key magenta lip, 9-slice, with a painted-ramp inner shade |
| `trait-picture-frame-184x256-sealed` | 184×256 |  | signed (pass 6) | slats texture tiled by whole slats, under the frame |
| `trait-picture-frame-184x256-unread` | 184×256 |  | signed (pass 4) | frost texture at 0.9 alpha under the frame |
| `trait-picture-frame-184x304` | 184×304 |  | withdrawn: the old Read picture sizes are withdrawn (design-pods-relayout 29b6dc9) | key magenta lip, 9-slice, with a painted-ramp inner shade |
| `trait-picture-frame-184x304-sealed` | 184×304 |  | withdrawn: the old Read picture sizes are withdrawn (design-pods-relayout 29b6dc9) | slats texture tiled by whole slats, under the frame |
| `trait-picture-frame-184x304-unread` | 184×304 |  | withdrawn: the old Read picture sizes are withdrawn (design-pods-relayout 29b6dc9) | frost texture at 0.9 alpha under the frame |
| `trait-picture-frame-224x160` | 224×160 |  | signed (pass 8 (d767daa verdict)): 224x352 and 224x160 are capped by the spec change (no picture larger than the pod's box: 144x176, 176x144) | key magenta lip, 9-slice, with a painted-ramp inner shade |
| `trait-picture-frame-224x160-sealed` | 224×160 |  | signed (pass 8 (d767daa verdict)): 224x352 and 224x160 are capped by the spec change (no picture larger than the pod's box: 144x176, 176x144) | slats texture tiled by whole slats, under the frame |
| `trait-picture-frame-224x160-unread` | 224×160 |  | signed (pass 8 (d767daa verdict)): 224x352 and 224x160 are capped by the spec change (no picture larger than the pod's box: 144x176, 176x144) | frost texture at 0.9 alpha under the frame |
| `trait-picture-frame-224x352` | 224×352 |  | signed (pass 8 (d767daa verdict)): 224x352 and 224x160 are capped by the spec change (no picture larger than the pod's box: 144x176, 176x144) | key magenta lip, 9-slice, with a painted-ramp inner shade |
| `trait-picture-frame-224x352-sealed` | 224×352 |  | signed (pass 8 (d767daa verdict)): 224x352 and 224x160 are capped by the spec change (no picture larger than the pod's box: 144x176, 176x144) | slats texture tiled by whole slats, under the frame |
| `trait-picture-frame-224x352-unread` | 224×352 |  | signed (pass 8 (d767daa verdict)): 224x352 and 224x160 are capped by the spec change (no picture larger than the pod's box: 144x176, 176x144) | frost texture at 0.9 alpha under the frame |
| `trait-picture-frame-232x312` | 232×312 | (264, 160, 232, 312) | signed (pass 6): confirmed signed by the art director, not placed (the portrait frame is withdrawn from the layout) | the deep portrait frame: key magenta, resampled whole; the opening is 200x280 at 16 px inset |
| `trait-picture-frame-232x312-sealed` | 232×312 | (264, 160, 232, 312) | signed (pass 6): confirmed signed by the art director, not placed (the portrait frame is withdrawn from the layout) | translucent glass slats in the opening, under the deep frame |
| `trait-picture-frame-232x312-unread` | 232×312 | (264, 160, 232, 312) | signed (pass 6): confirmed signed by the art director, not placed (the portrait frame is withdrawn from the layout) | frost in the opening, under the deep frame |
| `trait-picture-frame-376x264` | 376×264 |  | signed (pass 3) | key magenta lip, 9-slice, with a painted-ramp inner shade |
| `trait-picture-frame-376x264-sealed` | 376×264 |  | signed (pass 6) | slats texture tiled by whole slats, under the frame |
| `trait-picture-frame-376x264-unread` | 376×264 |  | signed (pass 4) | frost texture at 0.9 alpha under the frame |

<!-- end of the generated Slices section -->

## Pass 12 - the window without a horizon, the hindquarter as B corrected

- `frame-room-home-24`: the horizon line is removed (it made a third row of panes and read as a grid); the sprout now rises 5 px from the sill into the lower-left pane (two leaves on a stem). The rest is as typed in pass 11.
- `rail-emblem-legs-tail`: round 6, candidate B as the art director corrected it (`emblems/source/legs-tail.txt`, typed rows): the level back line runs out of the left edge so the frame cuts the body, the rump rounds at the right with a stub tail rising at the upper right, the thigh narrows to a hock bump that points back, the shin runs forward-left to a filled paw. Three states. On the compact tab it reads as the back half of an animal on one bent leg; the body is a heavy wedge and the thigh could be fuller. The compact tab in the composites carries it again; the full tab stays word-alone until the verdict. If it still reads as a bird, the motif changes to the tail alone, as the lead said, and it is not drawn yet.


## Pass 11 - the window by hand, four hindquarters, Belatz tighter

- `frame-room-home-24`: typed pixel by pixel (the rule: a pictorial mark is drawn by hand, tools set chrome geometry only; the procedural arch of pass 10b is gone). A square-topped window 21 wide with a cross mullion (four panes), a softer low horizon line across the two lower panes, a two-leaf sprout on the sill, a sill, no arch. The line takes the colour and strength of the other room marks.
- `rail-emblem-legs-tail`: withdrawn after five failed rounds. Four filled side-view hindquarter silhouettes (the rump's arc, the leg to a paw at the lower left, a short tail tuft at the upper right) are typed in `emblems/candidates/legs-tail-{a,b,c,d}.txt` and set on the compact tabs, unread and read, at 1x on `emblems/candidates/legs-tail-candidates-1x.png` (`sheet.py` makes it; a 4x proof sits beside it). A is a round haunch with a straight shin; B an upright rump with a hock bump and a stub tail; C a lean sloping rump with a thin leg; D a heavy rump with a forked tuft. At 1x they are close cousins and read more as a bird's body on one leg than as a hindquarter; the art director's pick decides which to draw further. The word alone carries the tab in the composites until then.
- `face-belatz-24`, `face-belatz-24-away`: re-cropped tighter from the S09 painting (box 62,245 to 182,365 of the 600x620), centred on the eye and beak, no shoulder in the disc; the away variant re-derived. `face-loika-24` untouched.


## Pass 10b - the Home mark, the leg, the new mark

- `frame-room-home-24`: the living window. An arched window frame, a horizon line and one small sprout, drawn procedurally at 16x and reduced, in the colour and strength of the other room marks (read from the research mark). The old house outline is gone.
- `rail-emblem-legs-tail`: round 5, a filled silhouette as Movement's pads are (`emblems/source/legs-tail.txt`, typed rows): a teardrop thigh about 8x10, a 2 px shin angled forward from the hock, a filled 5x3 oval paw, lit edge upper left, no tail. It reads as a leg with a foot; the thigh is still the weakest part (a comma more than a thigh).
- `page-mark-new-10` (id kept, art 6x6, as pods.json now specifies): a flat bone dot, a 1 px white lit edge top left, no keyline, no specular, on the trait's name line 4 px after the name, the name and dot centred together, the dot's centre on the line's middle. It is in the composites there.


## Pass 10 - caps as discs, the composite without the withdrawn pieces

The three key caps are now 16 px discs, the role naming the face: confirm = orange face, bone tick; confirm-dim = mist face, slate tick; back = stone face, fog arrow; ink keyline and a 1 px bevel edge upper left kept. The Read composite has the new caps, no new-mark, no emblem on the Legs & tail tab (the word alone), "Home" with its cap at the right end (back region right-aligned to 1008, the notice's right edge at 904, separators at 404 and 620). Stand-ins still drawn in it: the holdings icons, the pictures, the pips, the trait marks, the focus ring, the arc progress, the stamp raster.


## Pass 9 - frame ids as the spec names them, and the key caps

Renamed, pixels kept: `frame-room-{home,research,library,habitat}-24`, `frame-sun-16`, and the face as `face-loika-24`, `face-loika-24-away`, `face-24-empty`. The lamp is one painted shape per colour, so the ids are `frame-lamp-8-mint`, `frame-lamp-8-stone` and `frame-lamp-12-amber`. `face-belatz-24` and `face-belatz-24-away` are painted from the Grow service's standard painting of Belatz (`prototypes/workbench/grow/out/S09/3982a7117cfa0fc3/station-portrait-600x620.png`, copied to `source/raw/belatz-portrait-600x620.png`): the head and crest, keyed off the painting's cream ground, laid on Loika's dark ground and reduced to the 20 px disc in the 2 px teal ring; nothing scaled from the Companion. The head reads as a blue bird with a crest and a beak; at 20 px the green shoulder at the right edge is the weakest part.

The key caps:

`frame-cap-confirm-16`, `frame-cap-confirm-16-dim` (the tick in mist, its own slice) and `frame-cap-back-16`: 16x16 art-layer key caps, station.json colours only, a flat key with an ink keyline, a panel face and a 1 px bevel edge top and left; the tick orange, the arrow stone (frame.json). Glyph pixels typed by hand (`framecaps` in `tools/build.py`). The composites now place them in place of the stand-ins.


## Pass 8: the d767daa verdict, the frame's marks and the frame language in the composite (2026-10-08)

- **Signed in the d767daa verdict:** `ring-column-112x522`, `ring-hatch-80x56` (the 160 and 112 px ones withdrawn), `page-pane-256x440`, `room-stamp-case-152x152` (on a condition, below), the 15 frames at 224×352, 224×160, 104×160, 104×96 and 104×64 (224×352 and 224×160 are capped by the spec change: no page picture larger than the pod's box, 144×176 or 176×144), the plain portrait frame 232×312 (signed, not placed), and the emblems Shape, Movement and Charge.
- **`room-stamp-case-152x152-front`:** the condition. A front glass layer over the label, 152×152 at (856,232): a dark tint at 0.41 over the label's 120 px (feathered 3 px) and a faint diagonal sheen across the pane, mostly kept off the label. Measured on the label with the real stamp raster (`art/concept-station/pods-v2/layout/stamp-hopper-bench-300.png` at 104 px): the label's mean luma falls from 185 to about 114, the pod's about 110 to 115, and the stamp's cells keep 4.8:1 (WCAG relative luminance, bone against the dark cells).
- **Legs & tail, rethought:** the tail is dropped; the hind leg alone, a 3 px thigh mass going down from the upper left, a sharp backward angle at the hock, the shin down to a 5 px paw ending in two toe nicks. Typed pixels, three states, as in round 3. It reads as a chevron with a foot; the thigh's mass is the weak part at 1×.
- **The selected arcs, `ring-well-empty-80x80` and the centred well pods** were done in 55944fb (the channel cut into the band, the empty ring padded to 80×80, the pod centred in its box). The layout has since given the list pod a 40×48 class (`design-pods-relayout` 05cc4ff): `pod-well-*` is re-cut at 40×48, centred (the Loika fills 40×44).
- **`page-mark-new-10`** replaces my 12×12 bead: the new-to-the-field-guide mark as the layout specifies it, a flat engraved bone dot, 10×10, a 1 px lit edge (white, upper left), an ink keyline, art layer (station.json colours), no specular; the rows are typed by hand in `tools/build.py` (`pagemark`). Frames at 144×176 and 176×144 (the capped one- and two-trait pictures) are added in the three states.
- **The Station frame's marks** (`design-station-frame`, `station-layouts.md` "The frame"), a painted layer at 1×, drawn from larger paintings and reduced: `frame-room-{home,research,library,habitat}-24x24` (the four room marks the frame lists: Pods, Create, Incubator and Probe use the Research mark, Book the Library's); `frame-companion-{solid,outline}-16x24` (docked, away); `frame-lamp-8-mint` (docked), `frame-lamp-8-stone` (away), `frame-lamp-12-amber` (the notice); `frame-sun-16`; and the mibi's face on its teal ring, `face-loika-24` (with you), `face-loika-24-away` (the ring dimmed, the mibi out with the Companion), `face-24-empty` (an empty ring). The face is a 2K painting of the standard mibi's head (from the kit's Pip reference) reduced to a 20 px disc inside a 2 px ring: a Station master drawn from a larger painting, not the Companion's pixel face scaled. Rects are the frame's: room mark (16,8), glyph (816,8), lamp (836,16), face (856,8), sun right-aligned before its figure.
- **The Read composite in the frame language:** the title zone (the Research mark, "Pods"), the holdings, who is out (the outline glyph, the stone lamp, the face on its dimmed ring) and the sun with the turn; the one action (a ✓ cap and "Read Face" in orange, the price, a ← cap and "Home"), the context ("Loika, Face") and the notice (an amber lamp and "something new in Face"); the words as on main (the name alone, "Loika"; the origin "Found on the rock field," / "as a Tuikis felt safe."); the rail at x 152, aligned with the page; the Legs & tail emblem. Stand-ins: the holdings' icons, the ✓ and ← caps, the price icon, the pictures, the stamp raster, the pips and trait marks, the focus ring.

## Well-ring verdict, the rail rule and the page's extras (2026-10-08)

- **Signed in the well-ring verdict:** `ring-well-selected-80x80`, `ring-well-idle-80x80`, `glint-star-12x12`, the 35 idle arcs, and the well pod at its size. Returned and redone:
  - **`ring-well-empty-80x80`:** the signed 64×64 slice re-exported only, padded to 80×80 centred on (40,40), so every well slice shares one origin (the 64×64 file stays, marked withdrawn).
  - **The 35 selected arcs:** the groove at radius 24 is gone (the opening stays clear). The concept's band is used twice: solid, and with an engraved channel in its outer half (thin ivory lips on both sides, dark glass between), each cut by chapter angle, clockwise from 12 o'clock. `ring-arc-selected-n{4..8}-track` is the open channel (the band's ring only, with a 1 px dark tick at every chapter boundary) and `-s{i}` the solid band for chapter i with the tick left open; draw the ring, then the track, then the segments of the read chapters, so progress reads as the band filling. The two bands are cut from the painted ring (one painting, carved by radius and angle), not painted twice: the generator would not keep the ring's geometry on a second pass.
  - **`pod-well-*` (11):** the pod is centred vertically in its 32×48 box (rows 6 to 40 for the Loika's 32×35), and the two enclosed pixels of the accent mask are at (6,12) and (7,12).
- **The rail rule of design-pods-relayout 29b6dc9** (one fill per state, no lit rim, no teal, no notch colour; every edge a 1 px bevel; full tabs 136×40, compact 56×40, touching): `rail-tab-fill-{unread,read,open,sealed}-{full-152x40,compact-72x40}`, the slice being the tab's width plus its 16 px slant. Unread and read are the same panel fill (they differ by word and pips), the open tab is the hairline role, one step lighter, the sealed tab the panel with horizontal slats in the bar role. These are chrome geometry set by the tool (supersampled), not paintings. They replace the painted `rail-tab-*` plates of pass 4, which the new rule withdraws.
- **The Read page's extras:** `trait-picture-frame-112x112` (the find picture's frame for a sealed chapter, at (224,296)); `page-new-mark-12x12` (proposed: a small bone bead for "new to the field guide", at the picture's top centre). The Read page's old picture sizes (184×304, 184×112, 120×112) and the portrait frame (232×312) are withdrawn.
- **Composites** rebuilt: the selected ring with its open channel and the read chapters as solid band, the new tabs, the centred well pods.

## Re-cut to design-pods-relayout 29b6dc9 and emblems round 4 (2026-10-08)

- **The layout moved again** (the owner's rulings on the composite): the pod is the protagonist in a 448 px room on axis x 632; the list column is 112 wide with 80×80 ring slices at (24, 44 + 72 i) and 32×48 pods at (48, 60 + 72 i), a glint star at the selected ring's upper right; the dish is (520,328,224,96), the shelf (488,368,288,72), the name at (520,456,224,24) with its hugging plate centred on x 632, the origin a bone caption at (520,488,224,40) with no plate; the stamp is a detail: the label at (872,248,120,120) in a 152×152 case at (856,232); the Read page is 256 wide at (152,112) as one state, a grid of one to eight traits.
- **New or re-cut slices for it:** `ring-column-112x522`, `ring-hatch-80x56`, `page-pane-256x440`, `room-stamp-case-152x152` (closed on all four sides, translucent and unlit as before), the frames at the grid's picture sizes 224×352, 224×160, 104×160, 104×96 and 104×64 (plain, unread, sealed), and the bench re-windowed so its pool is on x 632. The dish, the shelf (288×72), the pods and the plates keep their painting; their rectangles moved (the manifest has the new ones). The earlier-size slices (`ring-column` 160, `ring-hatch` 112, `room-stamp-case` 176×328, `page-pane-408x440`, the portrait and landscape frames of the earlier layout) stay in the folder with their status; Compare still uses the 408 page and its frames.
- **Statuses:** every slice now carries one status (signed with its pass, withdrawn, or new) in the tables and in `slices/status.json`, reconciled with the art director's consolidated list.
- **Emblems round 4** (hand-written, as round 3): Shape with a distinct rounded head at the left (top at row 9), a 1 px dip for the neck, the back's peak at row 7 and the rump rounding to the flat base; Legs & tail with a 3 px thigh wedge going down from the upper left, a sharp backward hock at mid-height, the shin forward to a 4 px foot ending in a 1 px toe, and the tail leaving the top as a separate open arc sweeping up and back to the right; Movement with 6×4 pads and three 2×2 toes above each in the base colour in an arc, the second print up and to the right; Charge as a leaning spark from the upper right to the lower left, three cuts, and a short fork leaving the middle cut to the right, 2 px wide at its root, never crossing the main stroke. The five signed emblems are unchanged.
- **Composites:** rebuilt on this layout with the rings, the arcs, the glint star and the emblems on their tabs: a chapter of four traits with six full tabs, and a chapter of one trait (the 224×352 picture) with a seven-chapter compact rail; the stand-ins are the pictures (crops of the candidate), the stamp raster, the pips and trait marks, the focus ring and the arcs' progress.

## Well rings from the concept (2026-10-08)

The owner's ruling: the concept's rings are right, the composite's were not. Painted layer, 1×, straight alpha, **80×80 slices centred on the well's centre** (the ring's centre is pixel (40,40)); the ring's outer diameter is 66 inside them, so the glow has 7 px of room.

- **`ring-well-selected-80x80`:** the selected well's thick warm ivory band, 7 px thick, bone on its lit upper left to sand on its lower right (not the focus cream), with a soft warm glow about 4 px outward. Painted from the concept's top well.
- **`ring-well-idle-80x80`:** a thin dark-glass double ring, the hairlines about 5 px apart, from the concept's idle wells (the same painting the signed `ring-well-empty` came from, scaled to 66; `ring-well-empty` is kept as signed, matched to it).
- **`ring-well-current`** (the cyan rim) is withdrawn and removed.
- **Arcs:** `ring-arc-{selected,idle}-n{4..8}-track` is the unlit groove (a dark 3 px groove at radius 24 with a faint lit lip on its lower right), and `ring-arc-{selected,idle}-n{4..8}-s{i}` (i from 0) one segment per chapter, clockwise from 12 o'clock on the inner edge, equal arcs with 2 px gaps: a fine bright engraved line on selected (one step lighter on its upper-left half), a dim warm line on idle. They are drawn by `tools/build.py` at 8× and reduced (geometry, not painting), 70 slices.
- **`glint-star-12x12`:** the concept's soft four-point spark, one master for the well and the rail tab; place it outside the ring at the upper right (about cx + 30, cy − 30).
- **Pods in the wells:** the `well` class is now a 32×48 box (`pod-well-*`, all layers re-cut, the pod bottom-aligned and centred). The Loika's squat shape fills 32×35 of it, so it fills about 60 percent of the ring's 52 px opening, not 85: a taller species would fill more. The two enclosed pixels of `pod-well-mask-accent` are at (6,19) and (7,19) in the new box.
- **Rectangles** wait for the UI designer's column (112 wide, 66 px rings on a 72 pitch): the ring slices go at (cx − 40, cy − 40) and the well pod box at (cx − 16, cy − 24).

## Pass 7c (2026-10-08)

- **`room-stamp-case`, redone as translucent glass:** the wall's seams show through it; its inside reads one step above the wall (mean grey about 46 above the label against the wall's 38, well under the pod's 110); a faint diagonal sheen crosses it; the rails top and bottom are dim brushed metal; a faint hairline marks its left edge; it is still unlit and open at the screen's right edge. It was opaque and darker than the wall before (mean 22).
- The Read composite and `composite-vs-candidate.png` are rebuilt; the stand-ins are listed under the composite.

## Seventh pass (2026-10-08)

To the art director's verdict on pass 6 (the 33 re-cut pods and shadows, the 8 sealed slats, the portrait frame with its states and the 0.6 name plates are signed and unchanged):

- **Name plate at 20 px (owner):** `plate-name-<w>x24`, 80 to 224 wide in steps of 16, 24 tall, centred on x 712 at y 456 (the name's text rectangle is (600,456,224,24)); the composites set the name in Inter 20 medium. The origin has no plate: bone text with a 1 px dark shadow at (600,496,224,40), so the `plate-origin` slice is removed.
- **`room-cradle-front`:** re-cut along the bowl's own near-rim contour, not a row. The contour was read off the bowl's lit rim edge (from the left wall's top edge at row 19, down the dip's U to row 72 and up to the right wall), so both near side walls from their top edge are in front of the pod, its flanks pass behind them, and the dip's U is the front edge. Inside the dip there is no flat band of bed: five uneven grit tufts (5 to 9 px high, ragged tops) lap the pod's round foot. `room-cradle` is unchanged. *Method note:* the front layer is cut from the cradle's own pixels by that contour and by the tufts' profiles (`tools/build.py`, `cradle`), not painted as a separate assembly; the art director signed it.
- **`room-shelf`:** the concept's slab, a trapezoid in perspective with a deep top face, a lit pale-cyan front edge and the bowl's contact shadow on the top face; its rectangle is the UI designer's (592, 368, 240, 72), centred on x 712, front edge at y 440, about 20 px of slab either side of the bowl.
- **`page-pane-408x440`:** brought to the stage wall's values (the inside is about 30 percent of its former brightness), thin dark glass inside the lit hairline edge, so the portrait frame is the page's only lit object.
- **`pod-well-mask-accent`:** the two enclosed pixels at (6,11) and (7,11) are filled; `pod-well-mask-body` is held with it.
- **`room-stamp-case` (new, 176×328 at (848,144)):** the stamp's dim, unlit glass case (owner's decision, `design-pods-relayout` 4699815), open at the screen's right edge; the label (888,248,120,120) stands in it. Redone as translucent glass in pass 7c, below.
- **Composites:** the emblem slots are empty, only the words and pips show.

## Sixth pass (2026-10-08)

Re-cut to the layout of `design-pods-relayout` 637fb1e:

- **Pods:** the large class is 144×176 at (640,216), medium 120×152 at (652,240), small 104×128 at (660,264); the well pod is unchanged. The foot line is y 392, the dip floor 388 (dish row 60): every pod layer is rebuilt at the new box with the foot on its last row, the contact shadow centred on y 392, and the dish's near-lip layer hides the foot behind the wall from row 58. The pod is 0.72 of the bowl's width as in the candidate.
- **Portrait frame:** the Read page's first picture is a portrait in a deep frame, `trait-picture-frame-232x312` at (264,160): a dark smoky glass bezel 16 px thick with a stepped inner bevel and a lit top and left rim, the opening exactly 200×280 at (280,176) (measured on the slice), with `-unread` (dark frost in the opening) and `-sealed` (translucent glass slats) states. It replaces the landscape 376×312 frames, which are removed.
- **Name plate:** a 9-slice delivered at 96, 112, … 224 wide (every 16 px), 32 tall, centred on x 712 (`plate-name-<w>x32`; insets 14 px). Its tone is darker than before (0.6 instead of 0.8) because the beam's pool now lies behind it and the pale plate washed out under the cream word. The name type stays 28 px.
- **Composites:** both rebuilt on the new rectangles (the Read composite sets the plate to the word, "Loika pod" on 160), with `composite-vs-candidate.png`.

## Fifth pass (2026-10-08)

The 14 slices the art director returned, plus the Grid proof's title. The 43 slices signed in the fourth pass are byte-identical (checked against the committed files).

- **`room-cradle-front`:** below the dip the front wall is frosted glass: the dark bed pixels that showed the foot through the wall are replaced, from row 58, by the wall's own colour (row 80) and a milk tone, so the dip is the only edge that opens onto the bed.
- **`room-shelf`:** the full 272 px slab (top face with a soft reflection, a lit front edge), scaled evenly from a new painting (the old one was 70 px visible); its halo is trimmed to the 40-row rectangle. It stands 35 px clear of the 201 px bowl on each side.
- **`trait-picture-frame-*-sealed` (8):** translucent glass slats: the slat texture tinted toward the stage's teal at 0.34 to 0.9 alpha with the top edges lit, no dark gaps, the middle open for the 44×64 key.
- **`pod-*-mask-accent` (4), with `pod-*-mask-body` held with it:** the two pinholes where the crack met the cap are closed (a wider closing and a smoothing pass on the cap rows). The signed layers still derive from the earlier closing, so they did not change.
- **Grid proof:** the page heading is the open chapter's word ("Shape").
- **Not done, waiting on the UI designer** (branch `design-pods-relayout` is still at 6b5bfea): the large pod class at about 144 or a larger dish, the foot line against the dip's floor, the portrait picture in a deep frame, the smaller name label. When the branch moves, the pod boxes and frames are re-cut to its rectangles.

## Fourth pass (2026-10-08)

- **Tabs (8 slices, replacing the 12):** the rail's tabs hang from the top bar's rule, y 40 to 80, each a parallelogram leaning exactly 16 px over its 40 px height (measured on the slices: 0.4 px per row), with the slant and the transparent corners baked. Two forms times four states (unread, read, focused, sealed): full 152×40 (a 136 tab and its slant) and compact 72×40 (a 56 tab). The painted plate is un-sheared to a rectangle, resized and sheared back, so the lit rim follows the slant. Emblem, word, pips, the glint star under the tab and the focus ring are the build's. The twelve slices of the old plates (112, 96, 56 by 56) are removed.
- **Composites:** `composite-pods-read-1024x600.png` is the Read page's first state (one 376×312 picture at (192,160), the trait name under it, a row of 8×8 trait marks right-aligned at y 128) with six full tabs hanging and touching; `composite-pods-grid-1024x600.png` is the Grid state (the four small pictures) with a seven-chapter compact rail, the open chapter's tab full. Stand-ins in both: tab emblems and pips, trait marks, the focus ring, progress arcs, the stamp raster, the picture.

<img src="composite-pods-grid-1024x600.png" width="720" alt="Pods Read, Grid state with a seven-chapter compact rail">

*composite-pods-grid-1024x600.png: the Grid state and a seven-chapter compact rail, from the slices alone with the live strings in Inter. Stand-ins as listed above. Status: proof.*

## Third pass (2026-10-08)

To the art director's second verdict:

- **The dish (224×96 at (600,328)):** the candidate's deep frosted bowl, seen from a lower angle so it is about 2.07 wide to tall (the candidate's 2.06), tall thick walls, the dipping front lip, a bed of dark grey dust and grit sitting below the rim, and the cool glow of the pool coming up through the front wall. No moss. The near-lip layer starts at row 46, so the pod is sunk into the bed by about a third of its lower height behind it.
- **The shelf (272×40 at (576,392)):** the thick glass slab in perspective, its top face visible and its front edge lit. The painted slab is 234 px wide inside the 272 slice (the shape's own proportion), wider than the 199 px bowl.
- **The stage:** darkened to the candidate's values (the mean grey of the area around the dish is 65, the candidate's 65; it was 116), with a vignette toward the corners and the cone softened by a tone curve.
- **Frames:** sealed is now lighter frosted glass slats with soft seams and no dark gaps (dimmed so it stays under the pod); unread is darker frost at 0.84 alpha, so the picture's colour shows faintly through. The Read page's first picture is now the large 376×312 frame in the composite.
- **Pods:** `shade` has no ghost of the crack and the cap is whole in `mask-accent` (the crack's hole is closed); the three lowest dots are in `pattern-dots`; the patterns are quiet marks painted on the shell's curvature (fine meridian lines for stripes, two thin feathered hoops for bands, faded toward the edge, multiplied by the shading and kept under the ribs), never bold bars; the band is darker and thicker at well size and `pod-well-sealed` is rebuilt from it. Because `mask-accent` changed, `mask-body`, `pattern-dots` and `crack` changed with it (they were signed on the earlier mask).
- **Captions and the layering note** describe the new layout.

Not done, waiting on the UI designer: the tabs hung from the top bar at y 40, about 40 tall, abutting along their slants (branch `design-pods-relayout` has not been updated yet); the tab slices are the signed 56 px plates until then.

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

- **Order on the stage:** `room-bench-stage` (0,40) → `room-shelf` (proposed, 576,392) → `room-cradle` (600,328) → `pod-<class>-shadow` (centred on x 712, middle on y 400) → the pod (box bottom-centred on (712, 400)) → `room-cradle-front` (same rect as the dish, only its near lip and the front of its bed from row 46, over the pod's foot).
- **A pod, per size class** (box bottom-centred on (712, 400); `well` is 32×40): `pod-<class>-identified` and `pod-<class>-sealed` are the Loika reference sprites; the systematic pod is `shade` (grey, 0.5 neutral: colour × 2 × grey), `mask-body`, `mask-accent`, `pattern-dots` / `-stripes` / `-bands`, `crack`, `band` and `shadow`, all box-sized with the same origin. A species is body colour on `mask-body`, accent colour on `mask-accent` and the pattern, drawn through `shade`; sealed = layers + `band`, without `crack`; identified = layers + `crack` + its glyph (held).
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

## Sign-off §2, art director's column, second pass (2026-10-08)

Judged at 1×. I compared `composite-vs-candidate.png` first, then each slice on the bench and on a flat dark ground. The stand-ins don't count against the masters: the tab emblems, words and lamps, the progress arcs, the stamp raster and the trait pictures.

**Against the concept: not yet.** The owner would now recognise their composition: the page on the left, the pod centred under the beam, the stamp at the right, the slanted dark-glass rail and the teal glass wall. They would not yet recognise what the pod stands in. The candidate has a deep frosted bowl on a thick glass slab, with the pod sunk in it. The composite has a shallow pie dish heaped with bright green moss, and the pod sits on top of it on a glass sliver. That is the centre of the screen, so it decides the verdict. Remaining differences:

- **Painting (redo):**
  - the dish and its bed;
  - the shelf;
  - the stage is too bright: the cone is about 116 mean grey against the candidate's 65, the wall is lighter, and the corners have no vignette;
  - the sealed frames read as venetian blinds;
  - the unread frost is a pale card, brighter than the pod.
- **Layout (UI designer):**
  1. The dish rectangle (question 1 below).
  2. The candidate's tabs hang from the bar and touch along their slants, about 36 px deep. The spec floats 56 px plates at y 48 with 8 px gaps. Hang them at y 40, about 40 tall, abutting. The studio then re-cuts the signed plates, with no repaint.
  3. The cream focus ring is a rectangle around a slanted tab. It should follow the slant.
  4. The origin line is grey on frost and faint at 1×. Use the cream text colour.
  5. The candidate's page is one large framed picture. The proof shows a 2×2 grid of small frames. The composite that goes to the owner should show the chapter in the concept's state (376×312), with the grid as the second picture.

**Question 1, the dish: grow it, don't accept 72.** The sunk pod and the glowing bowl are the concept's signature. The candidate's bowl is about 2.06 wide to tall, which at 198 px is 96 px.

- **New rectangles:** `room-cradle` and `room-cradle-front` become 224×96 at (600, 328, 224, 96). The bottom stays at y 424.
- **What moves:** nothing else. The pod stays bottom-centred on (712, 400). The near lip dips over its lower 25 to 30 px. The shelf stays (576, 392, 272, 40). The cone stays (592, 104, 240, 320). The name and origin plates stay at y 440 and 480.
- **The pool:** it is painted where the dish lets it show. It lights the shelf's front edge and glows through the frosted bowl wall, as in the candidate.

**Signed this pass (51):**

- `rail-tab-{read,unread,focused,sealed}-{112,96,56}x56` (12)
- `plate-name-224x32`, `plate-origin-224x40`, `plate-message-640x{36,56,76}` (5)
- `ring-well-current`, `ring-well-empty`, `ring-hatch` (3)
- `trait-picture-frame-{120x112,120x96,184x112,184x104,184x304,184x256,376x312,376x264}`, plain (8)
- `pod-{large,medium,small,well}-{identified,sealed,mask-body,crack,pattern-dots,shadow}` (23: the 24 less `pod-well-sealed`)

`pod-well-sealed` is held with the band. The signed set from the first pass stands, except `page-pane-480x440`, which was removed with the re-layout.

**Returned, with directions:**

- `room-cradle`, `room-cradle-front`, at 224×96: the candidate's thick frosted bowl, tall-walled with the dipping front lip, at its own proportion. The pod is sunk a third into a bed of dark grey dust and grit, never bright moss, and the bed sits below the rim. The near-lip layer covers the foot.
- `room-shelf`: the candidate's thick glass slab in perspective, with its top face visible and a lit front edge, wider than the bowl. It is not a sliver with a bar under it.
- `room-bench-stage`: bring the wall to the candidate's values, darker at the edges and corners. Soften the cone to the candidate's strength. Repaint the pool for the new dish.
- `trait-picture-frame-*-sealed` (8): lighter frosted glass slats with soft seams, not dark gaps, and the middle left clear for the 44×64 key.
- `trait-picture-frame-*-unread` (8): darker frosted glass that sits under the pod and the page, with the picture's colour faintly through it.
- `pod-*-shade`: remove the ghost of the crack.
- `pod-*-mask-accent`: move the two lowest dots into `pod-*-pattern-dots`.
- `pod-*-pattern-{stripes,bands}`: paint them on the shell's curvature, under the ribs, carrying the shell's shading. Never flat white bars. The teal stripe proof reads as a beach ball, which is childish.
- `pod-*-band`, `pod-well-sealed`: make the band legible at 32×40.
- Captions: the composite-vs-candidate caption and the layering note still describe the old layout. Bring them up to date.

**To the owner:** not yet. This is no longer neglect, and the gaps are narrow. After the dish rectangle, the bowl, the slab, the stage values and the frame states, this goes as the first Pods masters composite, with the stand-ins listed.

## Sign-off §2, art director's column, fourth pass (2026-10-08)

Judged at 1×. I compared `composite-vs-candidate.png` first, then the dish beside the candidate's, then each slice on a flat dark ground and in a recolour test of the pod layers. These are stand-ins and do not count against the masters: the tab emblems and pips, the trait marks, the focus ring, the progress arcs, the stamp raster and the picture.

**Against the concept: not yet.** The owner would now recognise the rail, the wall, the beam, the page, the wells and the stamp as theirs. They would not recognise the centre. In the candidate, the pod sits in a frosted bowl behind a dipping front lip, on a wide glass slab. In the composite it stands in a glass jar: its lower body shows through the front wall below the dip, and there is no slab. Remaining differences:

- **Painting:** the slab, which is a 70 px sliver hidden behind the bowl; the bowl's front wall, which is see-through where it covers the foot.
- **Layout (UI designer):**
  - The pod is 0.79 of the bowl's width; the candidate's is 0.71 (the large class is 160 in a 201 px bowl). Shrink the class on the dish to about 144, or grow the dish.
  - The foot line at y 400 sits below the dip's floor at about y 388.
  - The candidate's picture is a portrait in a deep frame, not a landscape one.
  - The name plate is bigger and bolder than the candidate's label.
  - The Grid proof titles the page "Coat" while Shape is the open tab.

**Grid:** the compact rail with the open tab full reads at a glance. The emblems will carry the compact tabs.

**Signed this pass (43):**

- `rail-tab-{unread,read,focused,sealed}-{full-152x40,compact-72x40}` (8). The slant, the lit rim and the abutting run match the candidate.
- `room-bench-stage` (the values hold: 89 around the pod against the candidate's 86) and `room-cradle` (the bowl, its dip and its grit are right).
- `trait-picture-frame-*-unread` (8).
- `pod-{large,medium,small,well}-{shade,pattern-stripes,pattern-bands,band,pattern-dots,crack}` (24) and `pod-well-sealed`. The meridians and hoops are quiet and not childish, and the band reads at well size.

**Returned, with directions (14):**

- `room-cradle-front`: make the front wall frosted enough to hide the pod's foot. The dipping lip is the only edge the eye should see.
- `room-shelf`: the candidate's slab, painted to the full 272 px. Show the top face and a lit front edge, standing about 24 px clear of the bowl on each side.
- `trait-picture-frame-*-sealed` (8): these read as a grey metal shutter. Make them glass slats: translucent, with the stage's teal faintly through and the top edges lit from the top left.
- `pod-*-mask-accent` (4; `pod-*-mask-body` is held with it): close the two pinholes where the crack met the cap. Body colour shows through them.

**To the owner:** not yet. The rest of the screen is now art, not neglect. But the pod's bowl is the first thing the owner sees and the slab was directed twice. One narrow pass on these 14 and the layout points above, then it goes as the Pods masters composite beside the concept, with the stand-ins listed.

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

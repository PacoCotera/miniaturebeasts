# Pods masters: the painted layer of the Pods screen

> Painted from the accepted candidate PV-D-r3-a4 ([`art/concept-station/pods-v2/`](../../concept-station/pods-v2/README.md)), cut to the rectangles of [`design/style-guide/station-layouts.md`](../../../design/style-guide/station-layouts.md) (Pods). One PNG per piece and state, 1×, straight alpha, text slots empty, placed 1:1 by the builder. **Status: second pass judged by the art director 2026-10-08: not yet the concept (the dish and its bed); 51 more slices signed; the dish grows to 224×96 (UI designer); the rest returned (see the art director's column, second pass, below).**

**How they were made.** The image tool painted each family from the candidate as the reference (the prompts, references, hashes, seconds and outcome of every call are in [`log/calls.jsonl`](log/calls.jsonl): 27 calls, all succeeded, none retried by the tool; 14 of the generations are used, the rest were rejected tries). Each result was keyed off its flat ground (magenta key, or colour-to-alpha on the glass), cut, cleaned and resampled down to the exact rectangle by [`tools/build.py`](tools/build.py); the plates, tabs, panes and frames are 9-sliced from one painted master so their corners are painted once and never stretched. Retro Diffusion was not used: these are soft painted materials, outside the trial's rules. Everything is in the Station's painted layer, so it is full colour and off the 62-colour chrome palette by design; type and the progress arcs are the build's.

## The proof

<img src="composite-pods-read-1024x600.png" width="720" alt="Pods Read, composed from the slices">

*composite-pods-read-1024x600.png: the whole Pods Read screen at 1× from the slices alone, the decided strings typed over them in Inter 16, 20 and 28. The trait pictures are crops of the candidate's painting, the progress arcs and the stamp are stand-ins drawn only for this proof (the stamp is the candidate's placed one), and the lamps and emblems of the rail are not painted. A proof, not a deliverable the page uses. Status: proof.*

<img src="composite-vs-candidate.png" width="720" alt="Composite beside the accepted candidate">

*composite-vs-candidate.png: the composite (left) beside the accepted candidate PV-D-r3-a4 (right). The layout follows the concept's composition (the re-layout of branch `design-pods-relayout`): wells at the far left, the page left of centre showing the chapter as one large 376×312 picture, the pod centred on its dish under the cone, the stamp label at the right. The rail is the hanging tabs of the fourth pass. The trait picture, stamp raster, progress arcs, emblems and lamps are stand-ins. Status: proof.*

<img src="contact-sheet-1x.png" width="720" alt="Contact sheet of every slice at 1x">

*contact-sheet-1x.png: every slice at 1×, on a flat dark ground, named. Status: for review.*

## Slices

Each slice is named by the register id it replaces (`room`, `ring`, `page`, `trait-picture`, `stamp`, `pod`); where the register has none, the id is **proposed** (`rail-tab-*`, `plate-*`, `frame-*`, `room-shelf`). Rectangles follow the layout spec of branch `design-pods-relayout` (6b5bfea): the pod's box is bottom-centred on (712, 400), the dish is (600, 328, 224, 96), the page (176, 112, 408, 440), the stamp label (888, 248). A tab hangs from the top bar's rule at y 40: a full tab (136 wide, slice 152×40) at x0 + 136 i, a compact tab (56 wide, slice 72×40) at its place in the run, neighbours sharing one slant. Hashes and sources: [`slices/manifest.json`](slices/manifest.json).

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

### Chapter rail tab plates (hanging, slant baked)

| Slice id | Size | Rect on the screen | Made by |
| --- | --- | --- | --- |
| `rail-tab-focused-compact-72x40` | 72×40 | (·, 40, 72, 40) | compact hanging tab, slant baked (9-slice of the full one, slant kept) |
| `rail-tab-focused-full-152x40` | 152×40 | (·, 40, 152, 40) | hanging tab, slant baked: un-sheared, resized to 136x40, sheared 16 px |
| `rail-tab-read-compact-72x40` | 72×40 | (·, 40, 72, 40) | compact hanging tab, slant baked (9-slice of the full one, slant kept) |
| `rail-tab-read-full-152x40` | 152×40 | (·, 40, 152, 40) | hanging tab, slant baked: un-sheared, resized to 136x40, sheared 16 px |
| `rail-tab-sealed-compact-72x40` | 72×40 | (·, 40, 72, 40) | compact hanging tab, slant baked (9-slice of the full one, slant kept) |
| `rail-tab-sealed-full-152x40` | 152×40 | (·, 40, 152, 40) | hanging tab, slant baked: un-sheared, resized to 136x40, sheared 16 px |
| `rail-tab-unread-compact-72x40` | 72×40 | (·, 40, 72, 40) | compact hanging tab, slant baked (9-slice of the full one, slant kept) |
| `rail-tab-unread-full-152x40` | 152×40 | (·, 40, 152, 40) | hanging tab, slant baked: un-sheared, resized to 136x40, sheared 16 px |

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
| `room-cradle` | 224×96 | (600, 328, 224, 96) | the deep frosted bowl with its dark dust bed and the cool glow through its wall: opaque cut, scaled evenly into 224x96 (the bowl is 201 px wide), bottom on the last row |
| `room-cradle-front` | 224×96 | (600, 328, 224, 96) | the bowl's near lip and the front of its bed (rows 46 to 95), drawn over the pod's foot at the foot line y 400 (row 72) |
| `room-shelf` | 272×40 | (576, 392, 272, 40) | PROPOSED: the thick glass slab in perspective with a lit front edge; colour-to-alpha, scaled evenly into 272x40 (79 px wide), bottom on the last row |

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

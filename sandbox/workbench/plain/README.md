# The plain placeholder

The standard look of every mibi is its Grow painting ([grow/](../grow/README.md)): the painting service's Station set over the control passes, derived down to the Companion and the token. The plain renderer is now the **offline placeholder** only: what a mibi wears while its painting is pending, and what the device serves for a view the painting failed twice. It is [plain-renderer.md](../../../design/proposals/plain-renderer.md) technique C reduced to the passes that make the rig look deliberate: `framework/plain.mjs` (`mb-plain/2`), the rasterizer's gbuffer pass finished by a deterministic post-process. No face, no materials, no species sheet: the eye is the rig's two slots, the covering is a grain. Same genome, same bytes.

- `sheet.png`: the one sheet, device size at 1×. Row 1 the accepted Pip (rich 300×310 and HiBit 280×300), the bar. Rows 2–7, one block per species (S01 Loika, S09 Belatz, S12 Peplos): the type specimen and five random individuals as the plain Station 300×310 (portrait view), the plain Companion 280×300 and the plain 48 px token at 1× and 3×.
- `renders/<species>/<individual>/`: portrait-300x310.png, side-300x310.png, companion-280x300.png, token-48.png.
- `render.mjs` (Node, no dependencies) renders with the Grow camera rig (`grow/controls.mjs`, fitted to the species' type specimen); `compose.py` (Python, Pillow) lays the sheet.

## What it does, pass by pass

| Pass | What it contributes |
| --- | --- |
| **gbuffer** (`raster.mjs`) | Per pixel the pigment slot (and its half, and whether a marking field lies there), the Lambert term under the one light (the style guide's: from the viewer's top left, a little in front, whatever the view) and how much the facet faces the viewer; the node in the index buffer, the depth in the depth buffer. The Lambert term is smoothed within each part (about 6 px at the Station, 12 at the master) so the rig's facets read as volumes. |
| **slots** (via the gbuffer) | The ramp each pixel is shaded in: four value masses from the slot's pigment, the shadow cooled, the highlight warmed, a short painted blend with a grainy edge between masses on the Station, a hard grainy step on the Companion. A facet turned away from the viewer on the lit side catches a thin rim. A translucent flap is a flat tint toward the ground, never a dither. |
| **markings** (via the gbuffer) | The field flags smoothed within the part and thresholded, painted as the second pigment's field. |
| **index** | The outline: 1 px in the darkest step of the part's own ramp, never black, one step lighter on the lit side. Where two parts touch, the farther darkens one step at the join. |
| **silhouette** | A soft cast shadow under the body on the plain ground `#f6f3ec`; one flat step on the Companion. |
| **device** | Station: painted light, a fine pixel grain, from the 600×620 master by a 2×2 box. Companion and token: the 48 ramps (ui-kit §2), the 4×4 Bayer only, no alpha, no anti-aliasing. |

The portrait view (`VIEWS.portrait`: the front quarter from the viewer's left, raised about 20°, the face toward viewer-left as Pip stands) is the main view here and in Grow; the sketch's `three-quarter` is the rear quarter.

## To run it again

```sh
cd prototypes/workbench
node sketch/cli.mjs --species S01 --set 5 && node sketch/cli.mjs --species S09 --set 5 && node sketch/cli.mjs --species S12 --set 5
node plain/render.mjs && python3 plain/compose.py
```

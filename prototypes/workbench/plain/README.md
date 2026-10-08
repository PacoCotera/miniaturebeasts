# The plain renderer, first round

The standard look every mibi wears ([plain-renderer.md](../../../design/proposals/plain-renderer.md)), built as the owner decided: **technique C**, the rasterizer's shaded pass finished by a deterministic, stylising post-process (`framework/plain.mjs`), so that toon-shaded 3D can replace it later without repainting the species sheets. This round renders six specimens each of S01 Loika, S09 Belatz and S12 Peplos plain at the three device sizes, beside the accepted Pip and beside their stage 1 portraits, for the owner to judge before any gate is fixed. The faces and materials come from **placeholder species sheets drawn by the genome engineer** (`species-sheets/<species>.json`, each marked `placeholder: true`); the art director's sheets replace them.

- `sheets/S01.png`, `sheets/S09.png`, `sheets/S12.png`: device size at 1×. Row 1 is the bar, the accepted Pip (rich 300×310 and HiBit 280×300). Rows 2–7: the type specimen and five random individuals; per row the plain Station 300×310, the stage 1 portrait where one was painted, the plain Companion 280×300, the portrait's derived Companion, the plain 48 px token at 1× and 3×, and the rig's shaded pass (the control image) for reference.
- `renders/<species>/<individual>/`: the Station master 600×620, the Station 300×310, the Companion 280×300, the token 48, the shaded pass.
- `render.mjs` (Node, no dependencies) renders; `compose.py` (Python, Pillow) lays the sheets.

## The technique, pass by pass

`plainRender(scene, camera, { device, sheet, palette })` takes the same scene the sketch takes and returns bytes. Same genome, same bytes: every value is an integer or a hash of the pixel.

| Pass | What it contributes |
| --- | --- |
| **gbuffer** (new in `raster.mjs`) | Per pixel: the pigment slot (and its half, and whether a marking field lies there), the Lambert term under the light, and how much the facet faces the viewer; the node in the index buffer and the depth in the depth buffer. The light is the style guide's: from the viewer's top left, a little in front, whatever the view. The Lambert term is smoothed within each part (a box of about 6 px at the Station, 12 at the master) so the rig's facets read as round volumes. |
| **slots** (via the gbuffer) | The ramp each pixel is shaded in: four value masses from the slot's pigment, the shadow cooled, the highlight warmed, with a short painted blend and a grainy edge between masses on the Station and a hard, grainy step on the Companion. A facet turned away from the viewer on the lit side catches a thin rim. |
| **markings** (via the gbuffer) | The field flags, smoothed within the part and thresholded, so a patch is a blob and not a facet; painted as the second pigment's field, as Pip's cream patches. |
| **index** (the node per pixel) | The outline: 1 px in the darkest step of the part's own ramp, never black, one step lighter on the lit side (top and left). Where two parts touch, the farther part darkens one step at the join: a contact shade, not a line. |
| **silhouette** (the ground) | A soft cast shadow under the body on the plain ground `#f6f3ec`; one flat step on the Companion. |
| **the species sheet** | What the rig cannot say: the eye (iris and its edge, the pupil set a little toward the light, a catch light top left and a small glint, drawn as an ellipse over the rig's eye and enlarged by the sheet's scale, clipped to the head), the mouth (a short arc low on the muzzle), the material grain (skin: a fine grain; fur: streaks; feathers: scallop rows; scales: a diamond lattice; velvet: a soft grain that darkens turning away), and a colour for a part the rig draws in a slot (the Loika's crest as leaf green, the Belatz's beak as horn). |
| **device** | Station: painted light, a fine pixel grain, anti-aliased from the 600×620 master by a 2×2 box. Companion and token: the 48 ramps (ui-kit §2, as the Retro Diffusion trial exported them), the 4×4 Bayer only, no alpha, no anti-aliasing; the token keeps a 1 px outline and a two-pixel eye. |

Also new: a **portrait view** in `raster.mjs` (`VIEWS.portrait`, the front quarter from the viewer's left, raised about 20°, the face toward viewer-left as Pip stands), now the fifth view of every sketch set. The sketch's `three-quarter` turned out to be the **rear** quarter (the back, the flank and the head in profile), which is why the stage 1 controls showed the face edge-on and the painting model turned heads toward the viewer on its own; the plain renderer uses the portrait view, and the control contract's "main view" should be it. The plain camera is fitted to the species' type specimen with a 7 % margin and shared by its individuals, so the subject fills its frame as Pip does and individuals keep their relative size.

## What the sheets show, and the gap to Pip

The plain now reads as a finished toy: a face that looks at the viewer with catch-lit eyes, one light, masses of value with a grain, an outline, a cast shadow, markings as patches; the Companion keeps the volume at 280×300 and the token keeps the parts at 48. It is not yet Pip:

- **Volume.** The rig's ring solids have 12 sectors and 9 stations; at 300 px their planes still show through the smoothing as a faceted, boxy body (the Loika's chest and the Belatz's box feet). Pip is sculpted round. This is the rasterizer's mesh, not the post-process; the next step is a finer tessellation for the plain pass (or technique A).
- **Colour.** The catalogue's pigments are the v1 swatches: "charcoal" is a cool blue-grey, "cream" a flat buff. Pip's charcoal is warm and its cream glows. The ramp warms highlights and cools shadows, but the pigment table itself is the art director's to retune.
- **The face.** The eye and the mouth are placeholders: an ellipse with a ring, an iris, a pupil and two glints; a two-pixel arc for a mouth. Pip's face is a drawing. The Belatz's eye is a bird's dark bead, the Peplos's a compound dome: both placeholder choices.
- **Materials.** Fur, feathers, scales and velvet are grains on the light, not surfaces; the Peplos's glass flaps are the slot lightened toward the ground. The leaf crest is a green pyramid.
- **The Companion's palette.** Quantised to the kit's 48, the Loika's charcoal lands on the violet-tinted cool neutrals: that is the kit's palette, not a renderer choice, and a question for the ui-kit.
- **Pose.** The reference pose only; the habit poses, idle and walk are P3.

Beside the stage 1 portraits the rule "same creature, less jewelled" holds for silhouette, slots and markings; the portraits have the rounder volumes and the surfaces the plain lacks.

## To run it again

```sh
cd prototypes/workbench
node sketch/cli.mjs --species S01 --set 5 && node sketch/cli.mjs --species S09 --set 5 && node sketch/cli.mjs --species S12 --set 5
node plain/render.mjs && python3 plain/compose.py
```

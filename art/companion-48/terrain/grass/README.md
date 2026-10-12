# The meadow drop's inputs

These are the files [`../../tools/build-meadow-drop.py`](../../tools/build-meadow-drop.py) reads to build [`../meadow/`](../meadow/meadow.json). They are kept here so the drop can be rebuilt from main. Every file is a candidate input, not a shipped piece. The site build copies none of them.

## Rebuild

`python3 -I art/companion-48/tools/build-meadow-drop.py OUT PROOF` writes the sheets, `meadow.json` and `meadow-palette.json` to OUT. Built from these inputs, the output is byte-identical to `terrain/meadow/`.

- **Dependencies:**
  - Python 3 with numpy, Pillow and scipy. scipy is used for `ndimage.label`, which finds the enclosed holes in faces and caps.
  - The tool also imports `pal.py` from the same folder, which reads the signed [`palette/palette.json`](../../palette/palette.json), itself taken from the Companion page's `PALETTE`. Only when that file is missing does it fall back to reading the page.

## What each input is and how it was made

| Input | What it is | How it was made |
| --- | --- | --- |
| `mockup/b1/scene-1x.png` | The b1 meadow scene, at 1×. The tool reads the lawn ramp and the lawn's flecks from it. | **AI-generated.** One Gemini Pro image call repainted our own scripted test scene, with two style references made by the owner from our renders. A script then snapped it to the 96 colours and flattened its soft gradients. |
| `mockup/b1/biome-meadow.json` | The 96 colours: the core 48, then 48 meadow colours, by material. | Computed by script from the b1 scene, in CIE Lab, with flat ramps. |
| `tileset/walls/` | Faces, caps, side columns and wall-foot strips, with `walls.json`. | **AI-generated sources, cut by script.** Faces and caps were cut from three Gemini Pro source sheets (`meadow-src-walls-a1`–`a3.jpg`). The side columns and foot strips were built by script from the walls' own rock. |
| `tileset/props/` | Bushes, ferns, boulders, reeds, flowers and the bridge, with `props.json`. | **AI-generated source, keyed by script.** All were keyed from one Gemini Pro sheet (`meadow-src-props-p1.jpg`) on flat magenta. The bridge posts were redrawn upright by script. |
| `tileset/stairs/` | The stair pieces, with `stairs.json`. | Cut by script from the b1 scene's own stair and trodden earth. |
| `tileset/water/` | Water quarters (two frames each) and the macros, lobes, beaches, bend and band, with `water.json`. | Drawn by script. No generation. |
| `pieces/region/` | The lip quarters' edge geometry, as masks. | Drawn by script. No generation. |
| `decals/` | The tall grass, tuft and flower decals. | Cut from the review place's tiles ([`../../review-place/`](../../review-place/README.md)), which are generated sources down-rendered with a hand pass. |

The source JPGs that `walls.json` and `props.json` name are **not shipped here**. Neither are the b1 repaint or the scripts that cut and drew these inputs. They are kept on the repository's `art-terrain-grass` branch, under `art/companion-48/terrain/grass/` and `art/companion-48/tools/`. Every generation was our own paid call, and no third-party asset is used.

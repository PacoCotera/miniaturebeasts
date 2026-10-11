# The meadow scene at the owner's quality bar, on an 8-bit biome palette

**For the owner's review. Not signed.**

![The cliffs, 1×](screen-cliffs-1x.png) ![The pond, 1×](screen-pond-1x.png)

*Two game screens (450×532) at 1×. With the teal band swapped for blue-violet: `screen-*-noteal-1x.png`. The 3× versions are beside them; the whole scene is `scene-1x.png`.*

- **The repaint.** One Gemini Pro call (`../../sources/terrain-grass-scene-b1.jpg`).
  - Inputs: our approved scene as the image to improve, and the right halves of the owner's two targets as style references (cleared by the owner).
  - The prompt starts from the owner's own: "improve the coloring of this tileset, more colors, better shadowing, HiBit pixel art; correct corners, materials, textures".
  - The deep water was asked for blue to navy, not teal-green.
- **The palette** (`biome-meadow.json`, `biome-meadow.png`, made by `tools/biome-palette.py`).
  - 8-bit indexed: the signed 48 as the core, plus 71 meadow colours, 119 in all.
  - The meadow colours are found per material in CIE Lab, with chroma kept: grass 24, earth 10, wood 8, rock 16, water 16. Shades the core already has are dropped.
  - Seven colours in the teal band carry a blue-violet swap (`alt`), drawn under them in the swatch.
- **The snap.** The scene is area-averaged so a tile is 48 px, and each pixel takes the nearest colour in Lab. Mean colour error against the repaint: 3.7.
- **The hand pass** (`tools/b1-hand.py`). The wooden sign the repaint put on the island is painted out, regrown from the island's own greens.
- **Checks.**
  - Both screens use only the 119 colours. The swap versions use only their swapped set.
  - **Value gap** (`tools/value-gap.py`): the explorer was set on every all-grass spot (97 on the cliffs screen, 32 on the pond screen). Its edge falls in a different four-grey band from the ground beside it on 94 % and 85 % of edge pixels, worst placing 71 %. The signed meadow scores 95 %, worst 33 %.

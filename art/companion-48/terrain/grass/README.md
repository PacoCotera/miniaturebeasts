# The meadow drop's inputs

These are the files [`../../tools/build-meadow-drop.py`](../../tools/build-meadow-drop.py) reads to build [`../meadow/`](../meadow/meadow.json). They are kept here so the drop can be rebuilt from main. Every file is a candidate input, not a shipped piece. The site copies only `terrain/meadow/`.

- `mockup/b1/`: the approved b1 scene at 1× and its 96-colour meadow set (`biome-meadow.json`). The lawn ramp and the palette are read from these.
- `tileset/walls`, `water`, `stairs`, `props`: the tileset candidates, with their JSONs.
- `pieces/region/`: the lip quarters' edge geometry.
- `decals/`: the tall grass and flower decals.

`python3 -I art/companion-48/tools/build-meadow-drop.py OUT PROOF` writes the sheets, `meadow.json` and `meadow-palette.json` to OUT. Built from these inputs, the output is byte-identical to `terrain/meadow/`.

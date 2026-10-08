# Companion 48 px redraw: handover

State of round 4 on 2026-10-08. Everything below is in this folder; nothing in `prototypes/exploration/index.html` has been touched. Run every script with `python3 -I` from `art/companion-48/`.

## Where things are

- `palette/`: the 48 colours (identical to the Companion page's `PALETTE`), the shade (DARK/LIGHT), dither and mix tables, signed. `tools/pal.py` loads it and adds the ramps and the storm table `P.storm` (every colour mixed 30 % toward river, nearest palette colour; sand, clay, paper, bone, white kept). The owner confirmed this light and rejected the teal one (removed).
- `review-place/`: the one place. `work/` holds every piece as one PNG (`props-scripted/` the scripted stone and stone-warm1 that Retro Diffusion replaced; `props-rd/`, `pawn-rd/` every snapped Retro Diffusion result; `candidates/` the pairs for the contact sheet); `sheets/` the six indexed sheets with JSON atlases (indices 0–47, 48 transparent); `still/` the composed 450×600 stills and the comparison figures; `sources/` the paid sources with sidecars, `budget.json` and `extra-spend.json`; `round1/`, `round2/` and `round3/` frozen copies of the earlier rounds (the previous round's work and still are what the contact sheets and the side-by-side compare against).
- `review-place/README.md`: the write-up with the §2 art director's column signed. Update in place: what is true now, no history.

## Rebuild everything

`sh tools/build-all.sh`: the candidates group, the six `pack.py` calls, the contact sheets at 1× and 3× (round 1 beside round 2 where a piece changed), the still (`--light storm`), `beside.py` against round 2, the mixed meadow laydown, the shore test (`shoregrid.py`), the previews, `check.py` with the four-grey renderings. The pawn is not built by this script: `tools/pawn-draw.py DIR` draws the 28 frames, `tools/aseprite-pawn.lua` assembles and exports them on the VM (below), and the exported frames go to `work/pawn/`. The hand pass (`tools/hand-pass.py`) is run once, after the builders and `rd-snap.py`, not by this script: it thins grass2, redraws the dew cup and takes the stones from `work/props-rd/` to `work/props/` (the warm stones as plain rock with a heat vein). Run `build-ground`, the Aseprite pass, `build-pawn`, `build-props` and `rd-snap` first if a source changes, then `hand-pass.py`, then `build-shore.py`, then this script.

## Pipeline per group

| Group | Source | Script | Notes |
| --- | --- | --- | --- |
| Ground: grass ×4, tall ×2, flowers ×2, shade, sand, wet shore | Pro-painted 4×4 grid `sources/C48-T-r1-a1` | `build-ground.py SRC work/ground`, then `aseprite-meadow.lua` on the VM for the eight meadow tiles | grass3 and grass4 at band 18, the others at 8; the Aseprite output overwrote `work/ground/` for those tiles |
| Water, deep (variants a and b × 2 frames), shallows | scripted | `build-water.py work/ground` | small soft Bayer pools that fade over the outer 8 px (any variant joins any other) and crests; no rings; compose lays the variants by a seeded hash |
| Ripple overlay sprites | scripted | `build-ripples.py work/ripples` | 3 sizes × 2 frames, in the props sheet; placed by compose-still's seeded hash, one per 3×3 tiles, only over water |
| Shore set: 16 cardinal masks + 4 diagonal corners, × 2 frames | cut from grass1, sand, shallows, water | `build-shore.py work/ground work/shore`, tested by `shoregrid.py work/shore work/ground work/shore-test` | mask bits N=1 E=2 S=4 W=8, water on that side, rounded land corners; the diagonal corners (`shore-diag-ne/se/sw/nw`) go over a land tile with water on that diagonal and on neither adjacent side; rerun after any ground or water change |
| Props | Pro-painted sheet `sources/C48-P-r1-a1` | `build-props.py SRC work/props` (LIFT 1.18) | the six stones and `stone-step` in `work/props/` are Retro Diffusion results after the hand pass; the round 2 scripted stones are in `work/props-scripted/` |
| Retro Diffusion sprites | painted crops | `rd-sprites.py PROPS_SRC PAWN_SRC OUT [--only a,b] [--run]` then `rd-snap.py OUT work/props-rd work/pawn-rd` | inputs cleaned of the key halo and purple shadow; $0.18 a call; dry run without `--run` |
| Warned strike, HUD icons, caps, bolts, 9-slices | scripted | `build-ui.py work/ui work/props` | |
| Pawn | drawn | `pawn-draw.py DIR [--coat yellow]`, then `aseprite-pawn.lua` on the VM | masks and pixel sets, rim-rule shading; 4 facings (left mirrors right) × walk 3, creep 3, react; `build-pawn.py` (the painted-sheet down-render) is no longer used; `pawn-compare.py` makes the concept side-by-side |
| Tokens | the accepted Pip painting | `build-tokens.py` | |
| Rain tile | scripted | `build-weather.py work/weather` | 10 streaks |
| Still | the pieces | `compose-still.py work OUT --light storm` (canopies and lit stones exempt from the table; diagonal corners over land tiles; ripples as sprites) then `beside.py` | |
| Meadow joins | the meadow tiles | `meadow-check.py work/ground OUT_PREFIX` | |

## Retro Diffusion notes

`rd_pro__topdown` with `input_palette` returns on-palette pixels for img2img sprites and tiles; every call goes through `tools/rd-gen.py` (dry run with `check_cost` first; `--run` to pay; `--input IMG --strength S`; `--ref IMG`; `--remove-bg`; `--seed N`), which writes the raw PNG and a sidecar without key material. The key is `RETRO_DIFFUSION_API_KEY` in the environment; never print or store it. A text-only rain prompt gives a side view; `seam_tiling` has no `check_cost`; `rd_tile__tileset` does not reach 48 px. The service drifts off-model on characters (the pawn) and on objects with a distinctive form (the pod became an egg): the pawn needs a lower strength and a prompt that names no props, one facing at a time, if tried again.

## The VM and Aseprite

Aseprite 1.3.18 runs headless on the operations VM. The wrapper `mb-vm` runs one command there over SSH; files go over with the same wrapper:

```
tar -C review-place/work/ground -cf - grass1.png grass3.png | mb-vm 'mkdir -p ~/c48/in && tar -C ~/c48/in -xf -'
mb-vm 'cat > ~/c48/aseprite-meadow.lua' < tools/aseprite-meadow.lua
mb-vm 'cd ~/c48 && mkdir -p out && aseprite -b --script-param master=grass1 --script-param tiles=grass3,grass4 --script-param band=18 --script-param indir=in --script-param outdir=out --script aseprite-meadow.lua'
mb-vm 'cd ~/c48/out && tar -cf - *.png' > out.tar && tar -C review-place/work/meadow-aseprite -xf out.tar
```

The pawn goes the same way: `tar -C DIR -cf - . | mb-vm 'mkdir -p ~/c48/pawn/in ~/c48/pawn/out && tar -C ~/c48/pawn/in -xf -'`, `mb-vm 'cat > ~/c48/aseprite-pawn.lua' < tools/aseprite-pawn.lua`, `mb-vm 'cd ~/c48/pawn && aseprite -b --script-param indir=in --script-param outdir=out --script ../aseprite-pawn.lua'`, then `mb-vm 'cd ~/c48/pawn/out && tar -cf - *' > out.tar` and untar into `work/pawn/` (the 28 PNGs; `pawn.aseprite` to `work/pawn-aseprite/`).

Keep the script's own output and the tar stream in separate calls. Script parameters arrive in Lua as `app.params`.

## Spend

`python3 -I tools/budget.py review-place/sources` re-sums every sidecar and `extra-spend.json` into `budget.json`: $6.29 in total: round 2 $4.68 (two water tiles, two sprite batches of twelve), round 3 $0.72 (four stone calls), round 4 nothing. Retro Diffusion balance left: $1.32.

## What is open

- The owner's verdict on round 4 (the pawn, above all: the yellow coat against the concept's orange, the hooded explorer, the dark face with two eyes; the warm vein; the water variants).
- Hand pass for the tree, bushes, hut, pod and tokens (the meadow, stones, dew cup, grass2 and the pawn have had one).
- More water variants if the pool pattern still shows; a tool or lantern in the pawn's hand.

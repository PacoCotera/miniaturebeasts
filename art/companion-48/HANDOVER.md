# Companion 48 px redraw: handover

State of round 3 on 2026-10-08. Everything below is in this folder; nothing in `prototypes/exploration/index.html` has been touched. Run every script with `python3 -I` from `art/companion-48/`.

## Where things are

- `palette/`: the 48 colours (identical to the Companion page's `PALETTE`), the shade (DARK/LIGHT), dither and mix tables, signed. `tools/pal.py` loads it and adds the ramps and the storm table `P.storm` (every colour mixed 30 % toward river, nearest palette colour; sand, clay, paper, bone, white kept). The owner confirmed this light and rejected the teal one (removed).
- `review-place/`: the one place. `work/` holds every piece as one PNG (`props-scripted/` the scripted stone and stone-warm1 that Retro Diffusion replaced; `props-rd/`, `pawn-rd/` every snapped Retro Diffusion result; `candidates/` the pairs for the contact sheet); `sheets/` the six indexed sheets with JSON atlases (indices 0–47, 48 transparent); `still/` the composed 450×600 stills and the comparison figures; `sources/` the paid sources with sidecars, `budget.json` and `extra-spend.json`; `round1/` and `round2/` frozen copies of the earlier rounds (round 2's work and still, the side-by-side's previous round).
- `review-place/README.md`: the write-up with the §2 art director's column signed. Update in place: what is true now, no history.

## Rebuild everything

`sh tools/build-all.sh`: the candidates group, the six `pack.py` calls, the contact sheets at 1× and 3× (round 1 beside round 2 where a piece changed), the still (`--light storm`), `beside.py` against round 2, the mixed meadow laydown, the shore test (`shoregrid.py`), the previews, `check.py` with the four-grey renderings. The hand pass (`tools/hand-pass.py`) is run once, after the builders and `rd-snap.py`, not by this script: it derives the creep frames from the walk frames, thins grass2, redraws the dew cup and takes the stones from `work/props-rd/` to `work/props/`. Run `build-ground`, the Aseprite pass, `build-pawn`, `build-props` and `rd-snap` first if a source changes, then `hand-pass.py`, then `build-shore.py`, then this script.

## Pipeline per group

| Group | Source | Script | Notes |
| --- | --- | --- | --- |
| Ground: grass ×4, tall ×2, flowers ×2, shade, sand, wet shore | Pro-painted 4×4 grid `sources/C48-T-r1-a1` | `build-ground.py SRC work/ground`, then `aseprite-meadow.lua` on the VM for the eight meadow tiles | grass3 and grass4 at band 18, the others at 8; the Aseprite output overwrote `work/ground/` for those tiles |
| Water ×2, deep ×2, shallows | scripted | `build-water.py work/ground` | Bayer depth gradient and crests; no rings |
| Ripple overlay sprites | scripted | `build-ripples.py work/ripples` | 3 sizes × 2 frames, in the props sheet; placed by compose-still's seeded hash, one per 3×3 tiles, only over water |
| Shore set: 16 cardinal masks + 4 diagonal corners, × 2 frames | cut from grass1, sand, shallows, water | `build-shore.py work/ground work/shore`, tested by `shoregrid.py work/shore work/ground work/shore-test` | mask bits N=1 E=2 S=4 W=8, water on that side, rounded land corners; the diagonal corners (`shore-diag-ne/se/sw/nw`) go over a land tile with water on that diagonal and on neither adjacent side; rerun after any ground or water change |
| Props | Pro-painted sheet `sources/C48-P-r1-a1` | `build-props.py SRC work/props` (LIFT 1.18) | the six stones and `stone-step` in `work/props/` are Retro Diffusion results after the hand pass; the round 2 scripted stones are in `work/props-scripted/` |
| Retro Diffusion sprites | painted crops | `rd-sprites.py PROPS_SRC PAWN_SRC OUT [--only a,b] [--run]` then `rd-snap.py OUT work/props-rd work/pawn-rd` | inputs cleaned of the key halo and purple shadow; $0.18 a call; dry run without `--run` |
| Warned strike, HUD icons, caps, bolts, 9-slices | scripted | `build-ui.py work/ui work/props` | |
| Pawn | Pro-painted sheet `sources/C48-W-r1-a1` | `build-pawn.py SRC work/pawn`, then `hand-pass.py` for the creep frames | scripted pawn picked; Retro Diffusion walk2 only, off-model; creep = a crouch derived from the walk frames |
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

Keep the script's own output and the tar stream in separate calls. Script parameters arrive in Lua as `app.params`.

## Spend

`python3 -I tools/budget.py review-place/sources` re-sums every sidecar and `extra-spend.json` into `budget.json`: $6.29 in total: round 2 $4.68 (two water tiles, two sprite batches of twelve), round 3 $0.72 (four stone calls). Retro Diffusion balance left: $1.32.

## What is open

- The owner's verdict on round 3 (the stones, the ripples, the shore).
- Hand pass for the tree, bushes, hut, pod, pawn and tokens (only the meadow, the stones, the dew cup, grass2 and the creep frames had one).
- A second variant per water frame, so the depth pools and crests do not repeat on the tile grid; the pawn's ground shadow; the pawn's value margin is one grey step.

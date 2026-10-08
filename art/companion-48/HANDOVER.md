# Companion 48 px redraw: handover

State of round 2 on 2026-10-08. Everything below is in this folder; nothing in `prototypes/exploration/index.html` has been touched. Run every script with `python3 -I` from `art/companion-48/`.

## Where things are

- `palette/`: the 48 colours (identical to the Companion page's `PALETTE`), the shade (DARK/LIGHT), dither and mix tables, signed. `tools/pal.py` loads it and adds the ramps and the two storm tables: `P.storm` (every colour mixed 30 % toward river, nearest palette colour; sand, clay, paper, bone, white kept; the pick) and `P.cool` (45 %, the stronger cast, an alternative).
- `review-place/`: the one place. `work/` holds every piece as one PNG (`props-scripted/` the scripted stone and stone-warm1 that Retro Diffusion replaced; `props-rd/`, `pawn-rd/` every snapped Retro Diffusion result; `candidates/` the pairs for the contact sheet); `sheets/` the six indexed sheets with JSON atlases (indices 0–47, 48 transparent); `still/` the composed 450×600 stills and the comparison figures; `sources/` the paid sources with sidecars, `budget.json` and `extra-spend.json`; `round1/` a frozen copy of round 1.
- `review-place/README.md`: the write-up with the §2 art director's column signed. Update in place: what is true now, no history.

## Rebuild everything

`sh tools/build-all.sh`: the candidates group, the six `pack.py` calls, the contact sheets at 1× and 3× (round 1 beside round 2 where a piece changed), the stills (`--light storm|cool|plain`), `beside.py`, the mixed meadow laydown, the water preview, `check.py` with the four-grey renderings. A piece is changed by editing its PNG in `work/` or re-running its builder first (below).

## Pipeline per group

| Group | Source | Script | Notes |
| --- | --- | --- | --- |
| Ground: grass ×4, tall ×2, flowers ×2, shade, sand, wet shore | Pro-painted 4×4 grid `sources/C48-T-r1-a1` | `build-ground.py SRC work/ground`, then `aseprite-meadow.lua` on the VM for the eight meadow tiles | grass3 and grass4 at band 18, the others at 8; the Aseprite output overwrote `work/ground/` for those tiles |
| Water ×2, deep ×2, shallows | scripted | `build-water.py work/ground` | Bayer depth, crests, two ripple rings |
| Shore set 16 × 2 | cut from grass1, sand, shallows, water | `build-shore.py work/ground work/shore` | mask bits N=1 E=2 S=4 W=8, water on that side; rerun after any ground or water change |
| Props | Pro-painted sheet `sources/C48-P-r1-a1` | `build-props.py SRC work/props` (LIFT 1.18) | stone and stone-warm1 in `work/props/` are the Retro Diffusion picks |
| Retro Diffusion sprites | painted crops | `rd-sprites.py PROPS_SRC PAWN_SRC OUT [--run]` then `rd-snap.py OUT work/props-rd work/pawn-rd` | inputs cleaned of the key halo and purple shadow; $0.18 a call; dry run without `--run` |
| Warned strike, HUD icons, caps, bolts, 9-slices | scripted | `build-ui.py work/ui work/props` | |
| Pawn | Pro-painted sheet `sources/C48-W-r1-a1` | `build-pawn.py SRC work/pawn` | scripted pawn picked; Retro Diffusion walk2 only, off-model |
| Tokens | the accepted Pip painting | `build-tokens.py` | |
| Rain tile | scripted | `build-weather.py work/weather` | 10 streaks |
| Still | the pieces | `compose-still.py work OUT --light storm` (canopies and lit stones exempt from the table) then `beside.py` | |
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

`python3 -I tools/budget.py review-place/sources` re-sums every sidecar and `extra-spend.json` into `budget.json`: $5.57 in total, of which round 2 is $4.68 (two water tiles, two sprite batches of twelve). Retro Diffusion balance left: $2.04.

## What is open

- The owner's verdict on the storm (the pick against the cool alternative), the water, and the Retro Diffusion stones.
- Hand-cleaning of props, pawn and tokens (only the meadow had an Aseprite pass).
- The stone family is mixed (two Retro Diffusion, four scripted).

# Companion 48 px redraw: handover

State of round 11d on 2026-10-08. Everything below is in this folder; nothing in `prototypes/exploration/index.html` has been touched. Run every script with `python3 -I` from `art/companion-48/`.

## Where things are

- `palette/`: the 48 colours (identical to the Companion page's `PALETTE`), the shade (DARK/LIGHT), dither and mix tables, signed. `tools/pal.py` loads it and adds the ramps and the storm table `P.storm` (every colour mixed 30 % toward river, nearest palette colour; sand, clay, paper, bone, white kept). The owner confirmed this light and rejected the teal one (removed).
- `review-place/`: the one place. `work/` holds every piece as one PNG (`props-scripted/` the scripted stone and stone-warm1 that Retro Diffusion replaced; `props-rd/`, `pawn-rd/` every snapped Retro Diffusion result; `candidates/` the pairs for the contact sheet); `sheets/` the six indexed sheets with JSON atlases (indices 0–47, 48 transparent); `still/` the composed 450×600 stills and the comparison figures; `sources/` the paid sources with sidecars, `budget.json` and `extra-spend.json`; `round1/` to `round8/` frozen copies of the earlier rounds (the previous round's work and still are what the contact sheets and the side-by-side compare against).
- `review-place/README.md`: the write-up with the §2 art director's column signed. Update in place: what is true now, no history.

## Rebuild everything

`sh tools/build-all.sh`: the candidates group, the six `pack.py` calls, the contact sheets at 1× and 3× (round 1 beside round 2 where a piece changed), the stills (`--state rain`, `--state clear`), `beside.py` against round 2, the mixed meadow laydown, the shore test (`shoregrid.py`), the previews, `check.py` with the four-grey renderings. The pawn is not built by this script: `tools/pawn-draw.py DIR` draws the 28 frames, `tools/aseprite-pawn.lua` assembles and exports them on the VM (below), and the exported frames go to `work/pawn/`. The hand pass (`tools/hand-pass.py`) is run once, after the builders and `rd-snap.py`, not by this script: it thins grass2, redraws the dew cup and takes the stones from `work/props-rd/` to `work/props/` (the warm stones as plain rock with a heat vein); `tools/hand-pass-props.py` does the same for the three bushes and the three outposts (run after `rd-snap.py`). Run `build-ground`, the Aseprite pass, `build-pawn`, `build-props` and `rd-snap` first if a source changes, then `hand-pass.py`, then `build-shore.py`, then this script.

## Pipeline per group

| Group | Source | Script | Notes |
| --- | --- | --- | --- |
| Ground: grass ×4, tall ×2, flowers ×2, shade, sand, wet shore | Pro-painted 4×4 grid `sources/C48-T-r1-a1` | `build-ground.py SRC work/ground`, then `aseprite-meadow.lua` on the VM for the eight meadow tiles | grass3 and grass4 at band 18, the others at 8; the Aseprite output overwrote `work/ground/` for those tiles |
| Water, deep (variants a and b × 2 frames), shallows | scripted | `build-water.py work/ground` | small soft Bayer pools that fade over the outer 8 px (any variant joins any other) and crests; no rings; compose lays the variants by a seeded hash |
| Ripple overlay sprites | scripted | `build-ripples.py work/ripples` | 3 sizes × 2 frames, in the props sheet; placed by compose-still's seeded hash, one per 3×3 tiles, only over water |
| Shore set: 16 cardinal masks + 4 diagonal corners, × 2 frames | cut from grass1, sand, shallows, water | `build-shore.py work/ground work/shore`, tested by `shoregrid.py work/shore work/ground work/shore-test` | mask bits N=1 E=2 S=4 W=8, water on that side, rounded land corners; the diagonal corners (`shore-diag-ne/se/sw/nw`) go over a land tile with water on that diagonal and on neither adjacent side; rerun after any ground or water change |
| Props | Pro-painted sheet `sources/C48-P-r1-a1` | `build-props.py SRC work/props` (LIFT 1.18) | the six stones, `stone-step`, the three bushes and the three outposts in `work/props/` are Retro Diffusion results after the hand passes; the earlier scripted versions are in `work/props-scripted/` |
| Retro Diffusion sprites | painted crops | `rd-sprites.py PROPS_SRC PAWN_SRC OUT [--only a,b] [--run]` then `rd-snap.py OUT work/props-rd work/pawn-rd` | inputs cleaned of the key halo and purple shadow; $0.18 a call; dry run without `--run` |
| Warned strike, HUD icons, caps, bolts, 9-slices | scripted | `build-ui.py work/ui work/props` | |
| Pawn (from study H, the owner's pick) | the study H frames (`sources/rd-pawn-h/H-*-original-rd.png`) | (round 10: no more service calls for poses; the strides come from `pawn_limbs.py`, drawn by hand) `rd-pawn-h.py sources/rd-pawn-h phase1 --run` (the up facing's passing frame), `... phase2 --run` (every other frame; `... only down-creep2 ... --strength 0.32 --run` for repeats); `sh tools/pawn-h-build.sh` (`pawn-h-pass.py` the hand pass and the hand-derived poses, then Aseprite on the VM, then `work/pawn`); `pawn-h-figures.py` the figures | one seed (48), H's prompt with the facing and pose words changing; 0.45, repeats at 0.32; left = right mirrored; derived frames are listed in `CHOICE` in `pawn-h-pass.py`; `pawn-draw.py` and the studies' scripts are no longer the pawn |
| Tokens | the accepted Pip painting | `build-tokens.py` | |
| Outpost = hut B (lit, dark, dark2) | painted source `sources/C48-H-r6-a1` (`gemini-gen.py`) | `rd-hut-b.py SHEET sources/rd-huts-b lit --run` (3 seeds), then `... states SEED --run`; `hut-b-edit.py sources/rd-huts-b 50 work/hut-b-pre` (seed 50's own pixels, the listed edits only; raw beside edit: `hut-b-vs-raw.py`) (64 px, drawn in B's round form: a cone roof overhanging the walls both sides, a cylinder of logs, the porch with two posts and its own roof, door on a step, window, lantern, sticks, the grass patch and the shadow on it; seed 50 is the reference; the earlier `hut-b.py` is the round 7 56 px version) ; `sh tools/huts-assemble.sh B work/hut-b-pre work/hut-b work/hut-b-aseprite` (Aseprite on the VM); copy `work/hut-b/hut-B-*.png` to `work/props/outpost-*.png` | seed 50 is the one used; `hut-b-figure.py` makes the process picture; the round 6 options (A, C, D, Ch, Dh) and their tools (`rd-huts.py`, `hut-states.py`, `hut-draw.py`, `hut-figures.py`, `aseprite-huts.lua`) stay in the repo and in `round6/` |
| Pawn studies A to I | A to F: `pawn-study.py work/pawn-studies` (built on `pawn-draw.py`'s parts: that file is importable); I: `pawn-chunky.py work/pawn-studies` (A's front, C's side, concept proportions); G, H: `rd-pawn-studies.py sources/rd-pawn-studies --run`, `pawn-study-snap.py`; `pawn-studies-sheet.py work` | no cycles until the lead confirms I; the pawn in the sheets and the still stays round 6's |
| Ground states (rounds 9 and 10) | the meadow set `work/ground` (grouped tufts: `ground-tufts.py round8/work/ground work/ground`, run once; the big charged stone: `stone-big.py work`, run once after `hand-pass.py`) | `pal.py` P.rain / P.clear / P.ground_*; `ground-states.py sheets/ground.json` (atlas states `ground.rain`, `ground.clear`); `compose-still.py work OUT --state rain|clear`; `ground-figure.py` | rain is the default still; clear has no rain; the pawn's coat is amber (COAT in pawn-h-pass.py) |
| Rain tile | scripted | `build-weather.py work/weather` | 10 streaks |
| Still (staged on one focal event: the charged stone's frame 2, the warned ring beside it, the pawn facing them) | the pieces | `compose-still.py work OUT --state rain` (and `--state clear`) (canopies and lit stones exempt from the table; diagonal corners over land tiles; ripples as sprites) then `beside.py` | |
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

`python3 -I tools/budget.py review-place/sources` re-sums every sidecar and `extra-spend.json` into `budget.json`: $15.83 in total: round 2 $4.68 (two water tiles, two sprite batches of twelve), round 3 $0.72 (four stone calls), round 4 nothing, round 5 $0.72 (three outposts and the shaken bush), round 6 $2.33 (the painted hut sheet $0.17, Retro Diffusion huts, 12 calls, $2.16), round 7 $1.98 (hut B, 7 calls $1.26; pawn studies G and H, 4 calls $0.72), round 8 nothing, round 9 $4.50 (the pawn from H: 25 calls). A re-run overwrites the piece's sidecar, so `extra-spend.json` carries the overwritten call. The Retro Diffusion balance is topped up automatically.

## What is open

- The owner's verdict on the pawn built from H (the 28 frames), and on the hut and the ground candidates (unchanged since round 8).
- The pawn's down and up strides are derived by hand and stiffer than H; the service redraws the character at the usual strength on turns and crouches.
- The tree, the pod and the tokens have had no hand pass.

## Round 11 (this round)

Branch `studio-r11` from origin/main. New tools: `tree-r11.py`, `stone-r11.py` (replacing `tree-big.py`, `stone-big.py`), `pawn_limbs.py` additions (`ruff_front`, `ruff_back`, `lean`, `top_dy`), `compose-still.py` (dithered pools, one light direction), `pal.py` (`tree_rain`). Rebuild: `sh tools/build-all.sh` (the Retro Diffusion and Gemini calls are not in it; their sources and sidecars are in `review-place/sources/r11/`). Frozen: `review-place/round10/`. The per-piece finish record is in the README (round 11, item 10).

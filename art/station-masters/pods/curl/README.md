# Curled sleepers (ad-curl, 2026-10-28)

The owner, 2026-10-28 15:08: "paid. small standing by no means it's a curled sleeping mibi." Every nap master at 96x88 was the standing picture fitted into the frame. This folder holds true curled sleeping poses, one per species and stage, to replace them id for id (`manifest.json` `place_as`).

## The brief (one per species and stage)

- **Pose.** The creature lies down, fast asleep, curled the way its body allows. It is lower and wider than it is tall, with a rounded top line and no leg standing under it. Each species' wrap (the line in `tools/curljobs.py` HOW):
  - S01 Loika: the layered `curl` pose. Head on the forepaws, crest flattened forward.
  - S02 Untuva: a round heap with the cap tipped over the eyes and the tail round the front.
  - S03 Tuikis: a ring with the tail to the nose.
  - S04 Hiljan: a cat's doughnut.
  - S05 Tepor: a fox's ball under its tail.
  - S06 Pesko, S07 Azkon: a cub's heap with the head on the paws.
  - S08 Rupar: a fawn with its legs folded and its head on its flank.
  - S09 Belatz: sitting low, the head tucked into the back feathers.
  - S10 Igara: a piglet with its snout on its trotters.
  - S11 Kilpo: legs and head drawn half into the shell.
  - S12 Peplos, S13 Oskol: legs folded under, antennae laid back.
  - S14 Usvel: a spiral coil.
  - S15 Lehten: a squat mound with its leaves drooping.
  - S16 Blikur: lying along the ground, fins folded, the neck curved round to its side.
- **Eyes closed.** Each eye is one soft lid line, with no iris and no white. That line is the one thing that must survive 1x.
- **Same creature.** Colours, markings, finish, light from the upper left and facing all stay as the signed master. The size stays too: the curl's solid area is 0.85 of the master's body area (S01's own curl is 0.80 as an adult and 1.10 as a juvenile).
- **Stages.** Juvenile from the signed juvenile master, adult from the signed adult. There is no elder look: an elder takes the adult stand, so it takes the adult curl.
- **Frame.** 96x88, the stage's one factor from the 304 art (adult x0.276, juvenile x0.2857, as the nap masters), centred on x 48, last solid row on 85 (`tools/curlnap.py`). Ink must stay within x 2-93; every cut does.
- **1x.** The host reduces the frame by 54/152 (adult) and 40/112 (juvenile). The curls land 9-23 px wide and 6-15 px tall, all inside the 26x28 rest rects and the measured curl height of 28 used for the keep-out.
- **Shadow.** Every species except S01 carries the house shadow baked in, as its nap master does: #1e1a22 at alpha 110, an ellipse 0.9 of the curl's width, under the last row. S01 carries none, because the host lays the layered `curl` shadow under it.
- **What reads as asleep at 1x.** A low dome on its shadow, no legs showing, and the head turned into the body. The closed-lid line shows where the head is big enough (S01, S04-S07). At the smallest (S03 and S13 juveniles) it reads as a sleeping lump, which is the right read.

## S01 (0 MXN)

`S01/mibi-{adult,juvenile}-S01-96x88.png` are made from the layered curl pose in ui/assets/stands: base plus leaf crest (Pip's look), by `tools/curlnap.py`. The juvenile is the layered stand's own coat, which is teal. The regraded charcoal juvenile master is not used.

At 1x through the host: adult 24x17, juvenile 18x14 (`S01/proof-S01-curl-1x.png`, day and night, Roots). For comparison, the standing stand is 54 and 40 px tall.

## Proofs

- `proof-juveniles-1x.png`, `proof-rest-1x.png`: every species, today's standing nap beside the new curl, through the host's reduction, in Reeds by day and by night.
- `inputs/`: the composed sheets, `register.json` and the job files.
- `cuts.json`: each cut's scale and ink.

## Owner ruling 10-28: full size

> "full size, we can scale them down later and that is cheap, upscaling is not."

**The masters.** The masters are now the full-size keys, `curl/keys/mibi-<stage>-SXX-curl-304x312.png`.
- Each one is in the stand's own frame, at the signed master's scale.
- They are registered in `slices/` with the same ids (`place_as`).
- The 96x88 naps are reductions derived from the keys, kept for reference only. Do not place them.
- S01's full-size key is its layered curl in Pip's look. The host composes S01 from `ui/assets/stands` per look.

**Round 3, the same day.**
- Adult stand-ins for S04-S08, S10-S12, S14 and S15 (`tools/adultjobs.py`, `adult/cut-adults.py`, full size first), and their curls.
- Held habit keys for S02 (sniff, puff) and S03 (dig, glow) in `habits/keys/`.

**Proof.** `proof-stand-scale-1x.png` shows each species' standing picture beside its curl at the host's stand scale, in Reeds by day:
- adult row: 144/304 x 54/152;
- juvenile row: 104/304 x 40/112;
- S01 at its layered factors, 54/288 and 40/189.

### Host lines: a sleeper at stand scale

1. **`curlOfMibi`** (`views/home-props.mjs`). The world-size curl is the stand-size curl reduced by exactly the factor the standing picture gets:
   - **A species with a layered stand** (S01): `const lay = layeredStand(sp, stage, slot, view, "curl")`. Compose it with `composeStand(lay, drawnLooks(frameOf(sp), mb))`, which is the stand's own scale (54/288, 40/189). Lay the stand's curl shadow under it as `curlBuild` does today, with its `feetRow` on the curl's last ink row.
   - **Every other species:** the master is `mibi-<stage>-SXX-curl-304x312`. Reduce it by `f = look.size[0] / 304 * viewH / slot[1]`, which is the standing picture's own reduction: 0.168 for an adult, 0.122 for a juvenile. The shadow is baked in, so add none.
   - The `id` keys on the master and `f` (and, for S01, on `standVariant`). The `pictures.mjs` case `"curl"` builds `src` the same way.
2. **Sizes at 1x.** The widest curl ink is 47x35 (S01 adult; S07 adult is 47x35 with its shadow 49x37). The juveniles are 10-38 wide.
3. **Rest rects.** The rest rects grow from `[x-13, foot-27, 26, 28]` to `[x-24, foot-34, 48, 35]`. Rest spot changes:
   - Reeds' bank spots (776, 872) still pass: centres 96 apart are at least 48 + 47, and the ramp end and the raincup drop are still clear.
   - Ferns' shelf spots (790, 950) still pass: inks 766-813 and 926-973, clear of the copper lines at 836-840 and 884-890.
   - **Boulders moves to (44, 348) and (140, 348).** At 152 the 48-wide rect reaches x 175, under the shishi [166, 262, 64, 56], whose foot is 317 against the curl top of 314. The new spots are 96 apart and the left one is 28 inside the span.
4. **Keep-out.** Re-derive it in `make-keepout.mjs`/`curl-measure.mjs` from the full-size curl masters at stand scale. The tallest curl is 35 (it was 28), so the sleepers' tag top is 456 - 35 - 32 = 389.
5. **Reeds behind reeds-stone-1** at (822, 525). I re-checked every curl at stand scale: its whole picture (alpha > 0) must lie on the stone's alpha >= 250 with its foot at or above 525.
   - 30 of 32 pass.
   - S01 adult and S07 adult do not (47 wide against a 76 px stone), and nor do their elders.
   - The behind spot must take only a curl that passes. Write it as `rest.behind.maxInk: [43, 30]`, the largest curl that passes (S06 adult), or as a per-species list.
6. **The bed.** It holds 3 curls at a pitch of 48. The widest ink is 47, so they still do not overlap.

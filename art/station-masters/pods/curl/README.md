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

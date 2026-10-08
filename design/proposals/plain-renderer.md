# The plain renderer: the look every mibi wears

**Proposal** from the design editor, 2026-10-08, for the owner and the art director. It is the brief for the **standard look** that the owner decided is the game's art for every mibi ([art pipeline](art-pipeline.md) §1, §3): the picture a mibi opens in, lives in and, for most, keeps for life. The [portrait](the-portrait.md) is the exception a sitting buys. **Decided** marks owner decisions restated; everything else is **Proposal**.

## 1. What it is

A **deterministic render, on the Station, from the rig** ([the workbench](../../prototypes/workbench/README.md)): the same genome gives the same bytes, with no call out and no stored art per individual. It draws:

- **Continuous proportions** from the genome: girth, head, muzzle, ears, legs, tail, flaps, shell, so two Loikas differ in body before colour does.
- **Species pools** for colour with slight per-individual variation (Decided 3), the pigment slots filled from the individual's pool values.
- **Markings** from the mask passes (coat, flaps, cap, mask, rings, shell, belly), painted inside their fields.
- **Materials by covering**: fur, scales, feathers, skin, leaf, shell, sheen, the charged body.
- **The species' face**: eyes, mouth, expression.
- **A pose set and cycles**: the reference pose, the habits a species acts out (dig, glow, puff, sleep curled), an idle and a walk; breathing and a blink by rule.

The rig stays the authority; the renderer adds craft and never a part, a pigment or a gene.

## 2. The look to aim for

Judged against two things. First, **the accepted Pip** (`art/miniature-lives/`, the rich 300×310 and the HiBit 280×300): sculpted, rounded, tactile, one warm light from the top left, a soft cast shadow, big catch-lit eyes, clear markings, saturated colour. Second, **the stage 1 unique Station paintings** (`prototypes/workbench/stage1/sheets/`): what a portrait of the same creature looks like.

The rule: **the plain must sit beside a portrait as the same creature, less jewelled.** Same silhouette, slots, markings and light; the portrait has more material, more sheen, a chosen pose and a place. The plain has cleaner, simpler surfaces and a plain ground. Nobody should read the plain as a draft, and nobody should mistake it for the portrait.

Today's plain look, the rig's shaded pass as the stage 1 sheets show it, is **not the game's art**: flat fills under one light, no outline, two dots for a face, no material, the reference pose. It is the control image. The gap between that and Pip is this brief.

## 3. Technique options

| | A. Toon-shaded 3D on the Pi | B. 2D parts over the rig's silhouette | C. Shaded rig pass with a stylising post-process |
| --- | --- | --- | --- |
| How | the rig's volumes rendered live with cel ramps, a rim light, an outline from the index pass; materials and faces as painted sprites mapped to parts | per-species painted plates (head, body, legs, tail, ears, flaps) assembled and bent to the rig's silhouette and slot map | the deterministic rasterizer as it is, then ramps, an outline from the index, grain, a dither; eye and material sprites composited by part |
| Poses and cycles | free: any pose the rig strikes | a plate set per pose per species | the rig's poses as the rasterizer draws them; cycles as frames |
| Closeness to Pip | the furthest reach, real volume and light; the risk is "3D toy", not clay | closest to a painting; the risk is plates fighting a continuous body | between: honest to the rig, reads finished; a lower ceiling |
| Art hours per species | 6–10 (materials, a face sheet) | 30–50 per stage | 6–10 |
| On the Pi at 1024×600 | yes with a GPU path; six residents moving is the test | yes, cheapest to draw | yes; what the workbench already runs |
| Trade-off | most engineering, most future | most art; proportions beyond the plates break it | least of both; least room to grow |

**Recommendation: C first, built so A can replace it.** The rasterizer exists, is deterministic and is what the control contract rests on; finishing it to the style guide is the shortest road to a plain that sits beside a portrait. Its post-process is what A would also need. B is rejected: continuous proportions are the point, and plates fight them.

## 4. Device budgets, and what runs where

**Decided:** the Station renders, the Companion receives synced frames and never renders or calls out ([devices](../devices.md)).

| | Station (Pi, 1024×600) | Companion (450×600) | Field token |
| --- | --- | --- | --- |
| Subject | 300×310, master 600×620; six residents in the vivarium at once | 280×300, no alpha, the 48 ramps, the 4×4 Bayer only | 48 px |
| Drawn by | the Station, within a second of Grow; a fine pixel grain on creatures, chrome crisp | the Station: the master down-rendered and quantised to the 48 ramps, the outline from the index pass, no anti-aliasing | the species' token rig, slots remapped to the individual's pool values; generic per species (Decided 4) |
| Motion | smooth, by rule from the still (breathing, blink, routines) | stepped frames synced at the dock: idle 2 at 2 Hz, walk 3 at 150 ms; about 85 KB a stage | idle 2, walk 3 |
| To prove | six residents idling at the panel's rate with the instrument live | the frames the ESP32 holds for the mibis it carries | the token rig per species |

## 5. The generic pieces still to paint, per species

The rig cannot say three things (stage 0 report): materials, the face, the pose. These are painted once per species, never per mibi, by the **art director** or an artist under the art director's sign-off (engineers do not draw):

- **The face**: eyes at both sizes, the mouth, a blink, the expressions the habits need.
- **Materials**: a swatch per covering the species carries, as the post-process paints each slot.
- **The type specimen's token**: the 48 px token rig, idle and walk, which every individual borrows with its own pigments.
- **The habits**: the pose set, as rig poses with a face per pose.

About 6–10 art hours per species at C; the first five species first (Loika, Kilpo, Belatz, Peplos, Lehten).

## 6. Test plan

**Six specimens of three species rendered plain beside their portraits, at device size, for the owner.** Loika, Belatz and Peplos (skin, fur, flaps): the type specimen and one random individual each, the plain at 300×310 beside its stage 1 unique Station painting on a true-size Station at 1×, and the plain derived to 280×300 beside the derived portrait on a true-size Companion. The accepted Pip on the same sheet as the bar. Two questions, blind: *same creature?* (pair each plain with its portrait among the species' others) and *finished?* (content if this were all your mibi ever got). A plain read as a draft fails.

## 7. Stages

| Stage | What | Who signs |
| --- | --- | --- |
| **P1. The finish** | the post-process on the rasterizer: ramps, the outline from the index, the eye sprite with its catch light, grain, the plain ground; Loika first against Pip | art director |
| **P2. Faces and materials** | the sheets for the first three species; the test of §6 | art director; owner review |
| **P3. Poses and cycles** | the habit poses, idle and walk on the rig; the Companion frames and the sync size | art director; owner at device size |
| **P4. On the Pi** | the renderer on the Station, six residents live; the down-render; the token rigs | owner review C of the pipeline |
| **P5. The roster** | the remaining species' sheets | art director |

**What the workbench builds first:** P1 on the Loika, so the stage 1 sheets' "plain" column can be redrawn fairly and the §6 test run before any species sheet is painted.

## 8. Decisions for the owner

1. **The technique.** *Recommended:* C, the shaded rig pass with the stylising post-process, built so toon-shaded 3D (A) can take its place later without repainting the species sheets. *Alternative:* A now, if live poses matter more than reaching the test quickly. B is not recommended.
2. **The bar.** *Recommended:* the plain is judged against the accepted Pip and must pass "same creature, less jewelled" beside a portrait; no mibi opens in the shaded pass as it is today. *Alternative:* accept the shaded pass as the testing look, with the finish to follow.
3. **Who paints the species sheets.** *Recommended:* the art director paints the first three (faces, materials, token) and sets the sheet format; an artist under the art director's sign-off paints the rest. *Alternative:* the art director paints all sixteen, slower but one hand.

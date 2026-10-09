# Style guide

One look for every screen. Pictures lead; rules stay short. Per screen: [Companion screens](companion-screens.md) · [Station screens](station-screens.md).

## Miniature Lives on each device

Creatures are sculpted, rounded and tactile, lit from the top left, with expressive eyes, clear markings and saturated, playful colour. The **Companion** draws them in HiBit: detailed pixel art that keeps that volume at 450×600. The **Station** draws the same creature at full resolution with clean light and shading, keeping the same trait boundaries. The same individual survives both, and four-gray and paper.

<table><tr><td valign="top"><img src="../../art/miniature-lives/exports/companion-resident.png" width="300" alt="Companion resident"><br><em>Companion, 450×600 at 1×. Accepted appearance reference (creature only; layout and type not accepted).</em></td>
<td valign="top"><img src="../../art/miniature-lives/exports/lab-known-comparison.png" width="500" alt="Station known comparison"><br><em>Station, 1024×600. Accepted appearance reference (creature only; layout and type not accepted).</em></td></tr></table>

## The Companion

<table><tr><td valign="top"><img src="../../art/concept-homepage/companion-map-hands.png" width="420" alt="Companion reach view concept"><br><em>companion-map-hands: the north star for the map. Approved concept, generated; a reference, not a master.</em></td>
<td valign="top"><img src="../../art/concept-homepage/companion-storm.png" width="280" alt="Companion storm concept"><br><em>companion-storm: the north star for a place. Approved concept, generated. The tree is not shelter.</em></td></tr></table>

- **Palette:** the kit's 48 colours as ramps (cool and warm neutrals, grass, teal, blue, violet, red, orange, yellow, pink, white; values in [ui-kit §2](../proposals/ui-kit.md#2-the-kit)). Nothing off palette.
- **Light:** one light, from the top left. Shade in three or four steps of one ramp. Shadows lean cool, highlights warm.
- **Outline:** 1 px in the darkest step of the part's own ramp, never black; one step lighter on the lit side. Touching parts get a contact shade, not a line.
- **No alpha,** no anti-aliasing, no gradients. Blends are palette tables (dark, light, veil, fade) or the 4×4 Bayer dither. Nothing else.
- **Type:** Mibi 7×9, 2× minimum (14 px caps), 3× for titles. Never 1×.
- **Frame:** HUD 32 · view 532 · bottom line 36. 4 px unit, 6–8 px margins, groups 8 px apart.
- **Shown at 1:1** or a whole-number multiple of 450×600, never a fractional scale.
- **Figures only as prices and counts,** each beside its icon. Everything else is said in play language or shown as a mark.
- **Tokens:** HiBit, never flat blobs. Rounded volume, catch-lit eyes, markings readable at a glance. The pawn and every mibi read in sun, storm, fog and veil; storm and veil never darken them.
- **Weather:** unexplored land is a lavender-grey cloud bank with volume and a lit rim; a fog bank is pale and washed out, never lavender; rain is one clean diagonal sheet.
- Take mood, light and the scale of signs and pawn from the concepts. Their strings and HUD details are not specs.

## The Station

<table><tr><td valign="top"><img src="../../art/concept-homepage/station-research-hands.png" width="460" alt="Station research concept"><br><em>station-research-hands: the quality bar (clean light, real shading, a lit subject). Approved concept, generated; too simple in content.</em></td>
<td valign="top"><img src="../../art/concept-homepage/companion-resident-home-450x600.png" width="225" alt="Resident at home concept"><br><em>companion-resident-home: the warmth the living window carries, drawn at Station resolution. Approved concept, generated.</em></td></tr></table>

- **1024×600, used to the full.** Native resolution everywhere. Never a scaled-up Companion screen or upscaled tokens.
- **Painted light on the painted layer:** one key light from the top left, soft cast shadows, correct form shading, painted gradients. No dither bands and no flat fills in a painting.
- **Flat chrome on the art layer:** bars, panels, panes, tabs and rings are flat fills with one bevel of light and 1 px hairlines, never dithered and never painted. The layers are in [Station screens, Palette and layers](station-screens.md#palette-and-layers).
- **A research instrument:** cool chrome, hairline rules, corner ticks, status lamps, few-word readouts, and equipment: sample bay, pod rack, incubation chamber, Probe dock.
- **One living window per screen,** warm and lively: the only warm light on the screen. Everything outside it is cool and calm.
- **Never a cottage:** no wooden benches, felt, shelves, lamp-lit rooms or evening greens. Glass, enamel, brushed metal, frosted panes.
- **HiBit is allowed:** a fine pixel grain on creatures and world; chrome and type crisp.
- **1× grain, measured.** Cut each 1024×600 capture into the top bar (y 0–40), the stage (y 40–562) and the bottom line (y 562–600). In each region take 2×2 blocks at each of the four grid phases, counting only blocks whose 4×4 surround holds more than one colour. **G2** is the share of those blocks that are one colour, at the best phase. G2 of 0.60 or more is 2× rendering and fails; 0.40 or less is 1× grain; between the two, the region is judged by eye at 1×. Anti-aliased type is never block-uniform, so the bottom line's G2 is at most 0.40.
- **Type:** a smooth face, Inter (OFL), anti-aliased, with tabular figures. The Companion keeps the bitmap face; the two devices share colour roles, not a typeface.
- **Carry more** than the concept: keep its quality, fill the screen with the instrument and its life.

## Creatures on both devices

<table><tr><td valign="top"><img src="../../art/miniature-lives/assets/hibit-plain-280x300.png" width="280" alt="HiBit Pip"><br><em>HiBit, 280×300 at 1×. Accepted.</em></td>
<td valign="top"><img src="../../art/miniature-lives/assets/rich-plain-300x310.png" width="300" alt="Rich Pip"><br><em>Richer treatment, 300×310 at 1×. Accepted.</em></td>
<td valign="top"><img src="../../art/concept-homepage/pip-life-stages.png" width="360" alt="Pip life stages"><br><em>Juvenile, adult, elder. Approved concept, generated; the elder reads calm, not sad.</em></td></tr></table>

- Subject area: 280×300 on the Companion, 300×310 or larger on the Station. In the field, tokens keep the same parts at tile size (48 px).
- Same anatomy, pose language and light on both devices; only inherited traits differ between individuals.
- Draw only what is known. Unknown parts stay frosted, never guessed. Art never changes genes.
- Age reads from proportion and bearing. Elders are calm and dignified: eyes open, leaves held up.

Every mibi wears its **standard look**: the cloud painting made at Grow over the Station's control passes and derived down to the Companion and the token, with the rig placeholder shown until its painting arrives. What is reviewed is the **treatment** (the painting prompt's house rendering to this guide), the species pieces, the control contract and the test sets, not each individual. A **portrait**, earned by research and spent at a sitting, adds the scene, the full moving set, the postmark and the card; no person sees a player's painting or portrait before the player, so the pipeline's validation checks stand in for review there. A mibi's Companion picture, token and idle and walk frames are derived from its own Station painting, never painted small or made by hand for the individual; only the species pieces, such as the generic token for a silhouette not yet painted, are made by hand, once per species.

## Type and colour roles

| Role | Companion | Station |
| --- | --- | --- |
| Name, display | 3× | 4× (28 px caps) |
| Title | 3× (21 px caps) | 3× |
| Body, HUD, bottom line | 2× (14 px caps), cream on ink | Inter 16 px body and readouts, 20 px titles, 28 px names. One exception: on Pods the pod's name label under the dish is 20 px medium |
| Context | mist (N5) | mist on chrome |
| Confirm's verb · Call · ticking counter | orange O3 · teal T3 · yellow Y2 flash | the same hues |
| Warning | red R1 on paper | red, with a shape |
| Focus | orange corner brackets | a warm cream ring; the focused thing lifts |

Materials keep one shape on both devices: Energy a yellow bolt, Data a blue diamond, Essence a green drop. Text on art gets a 1 px dark shadow. Live text is never baked into art. Colour never carries meaning alone.

## Motion vocabulary

- **Companion, stepped frames:** idle 2 frames at 2 Hz; walk 3 frames, 150 ms a step; flame and crackle 2 frames at 4 Hz; water 2 Hz; Call ring 3 frames over 300 ms; slides 110–170 ms; counters +1 per 90 ms with a 260 ms flash.
- **Station, smooth and eased:** the living window moves all the time (breathing, routines, plants, water). The instrument moves only when something happens: doors, rails and lamps in 200–400 ms. Reveals (a frost wipe, a shell clearing) take about two seconds.
- **Both:** the first frame is the still state; nothing means something only by blinking; presses during a motion are consumed.

## What every screen and piece meets

The rules every screen, master and painting meets before it is shown. The looks they hold to are the sections above, [Station screens](station-screens.md), [Station layouts](station-layouts.md) and [Companion screens](companion-screens.md); this section adds what those do not say.

### Judged against its concept

- A screen is judged beside its accepted concept candidate, at device size and 1× (1024×600 or 450×600), on a true-size screen. It reads as that concept with the live text on it.
- It meets its own entry in [Station screens](station-screens.md) or [Companion screens](companion-screens.md): what it reads first, within a second, and every line of its "Pass when" list.

### Masters

- Every master starts from the screen's accepted concept candidate.
- Station masters are painted; Companion masters are hand-pixelled on the 48 ramps and generated pixels never ship, except a mibi's own pictures (Mibi paintings, below).
- Accepted assets are placed, never regenerated or redrawn: Pip, and the genome stamp from the stamp module.
- A master comes as its layered source and its 1× exports, each with its hash.
- A master holds no text and no figures. Each text slot fits the screen's strings as [Station layouts](station-layouts.md) or [Companion screens](companion-screens.md) and the string table give them, at their longest, at the guide's sizes (Station: Inter 16, 20 and 28 px; Companion: Mibi 7×9 at 2× and 3×) without clipping.
- A master gives one slice per state the screen draws. A state is its own slice; the build never recolours or tints art.

### Placed, never drawn

- Art is made by artists and placed by the build, 1:1, at whole pixels. Engineers do not draw: no code-drawn screen, sprite, scene or effect is art.
- The face composes only palette geometry: rectangles, 1 px hairlines and bevels, the focus ring, and the composed line pictures of [lvgl-switch.md §2.2](../proposals/lvgl-switch.md) (exact palette colours, no anti-aliasing, no opacity).
- A placeholder stands only where no master exists yet. It is registered in the asset manifest at its exact size, with `status: placeholder` and the master it waits for.
- A slot with neither a master nor a placeholder is registered with `status: empty` at its exact size and draws nothing. The layout does not move when the slot fills.

### Mibi paintings

How a mibi's painting is made is in the [art pipeline](../proposals/art-pipeline.md) and [the Grow service](../../prototypes/workbench/grow/README.md). Every painting meets these:

- One house rendering for every species: the painting prompt's recipe (light, shading, value-only contour, the house eye, framing, ground). Species notes say only what differs. No species reference image is sent.
- A naturalist's study of a small living animal, never a vinyl collectible.
- Inside the cute envelope, rules E1 to E9 ([workbench](../../prototypes/workbench/README.md)). No part is added, moved or recoloured from the controls.
- The controls come from the genome, in three-quarter and side views. The painting is the same individual as its controls and shows only what is known.
- Validation checks the silhouette, every part, the slot colours and the markings inside their fields. A painting that fails gets one named retry; after that the rig placeholder stands.
- The small sizes are derived from the Station painting, never painted small: the 280×300 Companion resident, the 48 px token, and the idle and walk frames.
- A painting is never regenerated silently. The painter's id is part of its cache key, and nothing hidden is carried in the manifest or the controls.
- Each species' pieces (faces, materials, token) are painted once per species, never per mibi.

### Figures in documents

- Every figure has a caption that says what it is: concept, generated, master, placeholder, wireframe or diagram.

## The Loika, type, grain and tile size

1. **The Loika** is Pip as in the approved art: charcoal, cream belly, orange eyes, three-leaf crest. The lilac long-eared token is retired.
2. **Station type** is a smooth face, Inter, anti-aliased.
3. **Pixel indication on the Station:** a fine grain on creatures and world; chrome and type crisp.
4. **Companion tile size:** 48 px, about 9 across and 11 down; the camera keeps the pawn in the middle third.

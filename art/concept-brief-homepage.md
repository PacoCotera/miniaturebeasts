# Concept brief: homepage art

**Proposal.** A generation brief for new homepage concept art, now that exploration,
the four-button Companion and life stages are designed. Nothing here is generated
yet. Each shot has its placement, size, a ready-to-paste prompt and the checks the
owner applies before accepting it. Accepted images go into a new folder with a
`prompts.json` and `manifest.json` in the same form as
[`miniature-lives/`](miniature-lives/prompts.json): exact prompt, image inputs,
result, hashes.

## Purpose

The homepage pitches the kit to friends and, probably, Kickstarter. Today it mixes an
older hero render (three-button Companion, old screen chrome) with prototype
screenshots. The new set should show the devices as designed and the game as
designed, in the accepted Miniature Lives look, and stay honest about what is
concept and what plays today.

## Rules for every image

1. **Miniature Lives.** Creatures are sculpted, rounded, tactile, softly lit, with
   expressive eyes and clear markings. Companion screens use crisp HiBit pixel art
   (detailed pixel clusters that keep volume, eyes and markings readable at 450×600);
   Station screens use the matched richer treatment of the same creature.
2. **Saturated and playful.** Clear greens, teal, warm orange, sky blue, cream. No dull
   brown or grey palettes, no grimy realism, no sepia. Device shells may be warm
   neutral; screens and creatures carry the colour.
3. **The devices as designed.** Companion: portrait handheld, warm stone shell,
   charcoal corner bumpers, visible screws, wrist strap, 3:4 portrait screen (450×600).
   Below the screen: a directional pad on the left, a small speaker grille in the
   middle, and on the right **Call** directly above **Back**, both to the left of a
   larger **Confirm**. Call is teal with a raised concentric-ring texture and a `)))`
   glyph; Back is dark grey with `←`; Confirm is orange with `✓`. Nothing below
   Confirm. No other face buttons, no knobs, no joystick, no touch. Station: sage
   landscape two-thumb handheld, 1024×600 screen, as in the current hero. Caddy: warm
   stone dock with a four-grey e-paper summary and a thermal printer slot.
4. **Branding.** The wordmark **MINIATURE BEASTS** (and the small device names
   COMPANION, as on the current shell). The Caddy alone also carries a small
   **Dirty Pawz Press** mark (**Decided**); no other device does. No Critter Lab, no
   Beecho, no invented logos or badges.
5. **No invented UI.** Screens show only elements the design names: on the Companion
   in the field, a 26 px HUD (left: Shield bars, two pod outlines, partner; right:
   storm bolts when a storm is on, Energy number, Call slot in teal) and a 34 px
   bottom line (`✓ action` left, place in the middle, `← where Back goes` right). No
   inventories, timers, progress bars, percentages, minimaps, legends, capture,
   training or chat screens. Screen text only where quoted in the prompt, spelled
   exactly; if a model garbles it, regenerate with that text removed and set it in
   the page instead.
6. **Creatures.** Only Pip (an adult hopper: broad squat charcoal quadruped, cream
   belly, large orange eyes with cream rings, tiny smile, three green leaf lobes on
   its crown, plain coat with no pale marks). Any other creature is a clearly
   placeholder token or silhouette, never a new designed species. Art never changes
   genes: no added horns, tails, markings or colours on Pip.
7. **Concept vs. screen.** Device renders and screen concepts are concept art and are
   captioned so ("Concept art"; "Concept screen, not from the build"). The prototype
   screenshots stay on the page as what plays today. Never present a concept as a
   capture. Generated images are labelled as generated in the manifest.

## Shot list

### H1 `hero-kit`: the kit, four-button Companion
- **Goes:** hero, replacing `website/assets/kit-family-concept.webp` (from
  `v1/website/dist/assets/family-concept-v2.png`).
- **Format:** 3:2, 1536×1024, opaque. **Operation:** edit of family-concept-v2, in
  two passes (A: Companion; B: Station and Caddy strings) so each edit stays small.
- **Shows:** the same tabletop render, lighting and devices. The Companion gains its
  fourth button and today's screen chrome; the Station and Caddy lose obsolete words.

Pass A prompt:
```
Use case: precise-object-edit. Asset type: retained 1536x1024 Miniature Beasts hardware family concept render. Edit ONLY the right-hand portrait Companion; preserve every other pixel of the image: sage Station, warm stone Caddy, printer card, tabletop, window light, plants, MINIATURE BEASTS title, camera, perspective and materials.
COMPANION CONTROLS: keep the charcoal directional cross at lower left and the shell size, bumpers, screws and strap. Rearrange the right-hand buttons: a larger orange Confirm button with an embossed white check mark at the lower right; to its left, two equal smaller round buttons stacked vertically, the upper one teal with a raised concentric ring texture and a small engraved ))) wave glyph (Call), the lower one dark charcoal grey with an engraved left arrow (Back). Nothing below Confirm. Between the cross and the buttons a small grid of speaker holes. Small printed shell labels CALL, BACK, CONFIRM in the same restrained grey type as the bezel, if they fit legibly.
COMPANION SCREEN: replace the old blue framed header, title box, name banner and yellow button with a calm full-bleed HiBit pixel scene: Pip, the same charcoal squat quadruped with cream belly, orange eyes with cream rings and three green leaf crown lobes, sitting in a bright green forest clearing, looking up toward the viewer. A thin dark top bar with, at its right end, small teal text "))) call Pip". A thin dark bottom line with orange "✓ Bring Pip along" at left and grey "← menu" at right. No other text.
Constraints: no new buttons, knobs, LEDs, logos or badges; no Critter Lab marks; Dirty Pawz Press only as the small mark on the Caddy; do not shrink the screen; realistic matte printed plastic; concept render, not CAD.
```
Pass B prompt:
```
Use case: precise-object-edit. Asset type: retained 1536x1024 Miniature Beasts hardware family concept render. Change ONLY these screen strings and preserve every other pixel, including both creature portraits and all layout. Station screen header: "Library · Sample A" becomes "Research · Hopper pod". Station footer "Sample used · findings retained" becomes "Findings saved". Station header counts become Data 4, Energy 5, Essence 2 with the same icons. Caddy e-paper: replace "Sample A · used" with "Hopper pod · waiting"; remove "Cached · 14:32" and "Connections unknown" and their icons, leaving clean e-paper; counts become Data 4, Energy 5, Essence 2. Keep "Pip · PIP-001" and "1 resident". Same fonts, colours and four-grey e-paper look. No new text, icons or controls.
```
**Accept when:**
- Call sits directly above Back, both left of a visibly larger Confirm; Call is teal and ringed; pad on the left; no extra controls.
- The only marks are MINIATURE BEASTS and COMPANION; no Sample, Cached or Connections strings remain.
- Pip is identical on all three devices: plain coat, cream belly, orange eyes, three leaves.
- Everything outside the edits matches family-concept-v2 (overlay at 50% to check).

### C1 `companion-map-hands`: the fogged world map, held
- **Goes:** Expedition section, a wide image above the two prototype screenshots.
- **Format:** 3:2, 1536×1024, opaque.
- **Shows:** two hands (no face, no sleeves with logos) hold the Companion in front of
  a soft out-of-focus garden. The screen fills with the world map: purple-grey fog,
  a patch of revealed cells in three states (seen muted, visited bright with white
  pips, cleared with a tick), the dotted range square, the five signs, a storm band to
  the west, and the orange pawn. The thumbs rest on the pad and on Confirm.

```
Use case: stylized-concept. Asset type: Miniature Beasts product concept photograph, exactly 1536x1024 landscape, opaque. Two relaxed hands hold the Companion upright at chest height, slightly angled toward camera, left thumb on the directional cross, right thumb on the orange Confirm button. Shallow depth of field: a bright green garden and warm daylight behind, softly blurred. No face, no body beyond wrists, no rings or watches, no logos on clothing.
DEVICE: the Companion exactly as the supplied hero render: warm stone printed shell, charcoal corner bumpers, visible screws, MINIATURE BEASTS | COMPANION on the top bezel, wrist strap hanging from the side; 3:4 portrait colour screen; below it the cross at left, small speaker holes in the middle, a teal ring-textured Call button directly above a dark grey Back button, both left of a larger orange Confirm. No other buttons, knobs, LEDs or touch hints.
SCREEN, crisp HiBit pixel art on a 450x600 grid: a top-down world map of square cells. Most of the map is soft purple-grey drifting cloud fog. Near the centre a revealed patch of about 20 cells: meadow, wood, a stream, a rocky ledge. Revealed cells are in three states told apart by shape: seen cells drawn muted and desaturated; visited cells in full colour with one to three small white dots; cleared cells in full colour with a small white tick. A dotted white square outlines a 5x5 area around the start cell. A round orange pawn with a small antenna stands on a meadow cell. Small map signs, one per cell: paw prints, a slow pulse of concentric arcs, a yellow lightning bolt, a teal map pin, and a narrow dark burrow hole. At the left edge a diagonal band of rain streaks over the fog. Thin dark HUD bar at top: at left three white shield bars and two empty rounded pod outlines; at right a small amber bolt with "5" and teal "))) pin 1". Thin dark bottom line: orange "✓ Go down" at left, grey "wood · slow beat" in the middle, grey "← Wait · Send home" at right. No other text.
Constraints: saturated playful colour, no brown or grey palette; no creatures on the map; no legend, minimap, timers, percentages or inventory; no Critter Lab marks; Dirty Pawz Press only as the small mark on the Caddy; concept photograph, not CAD.
```
**Accept when:**
- The buttons match rule 3 and the thumbs fall naturally on the pad and Confirm.
- All three cell states, the dotted range square and at least four of the five signs read at homepage size.
- Fog dominates; the revealed patch is small and inviting.
- Screen text is exactly the quoted strings or absent.

### C2 `companion-storm`: a living patch under a storm
- **Goes:** Devices section, 01 / Companion card (the HiBit study moves to Life stages
  or the art page).
- **Format:** 2:3, 1024×1536, opaque.
- **Shows:** the Companion lying almost flat on a mossy stone, seen from above at a
  slight angle. Its screen is a wood under a strong storm: rain, a struck stone
  glowing with charge, a warned strike tile, the pawn under a tree, Pip beside it.
  The HUD shows two Shield bars of three and two storm bolts.

```
Use case: stylized-concept. Asset type: Miniature Beasts product concept photograph, exactly 1024x1536 portrait, opaque. The Companion lies on a mossy rock outdoors, seen from above at about 20 degrees, screen facing camera and filling most of the frame; a few real raindrops bead on the shell; cool bright overcast light. Device exactly as the supplied hero render: warm stone shell, charcoal bumpers, screws, MINIATURE BEASTS | COMPANION bezel; cross at left, speaker holes, teal ring-textured Call directly above dark grey Back, both left of a larger orange Confirm.
SCREEN, crisp HiBit pixel art on a 450x600 grid, top-down three-quarter view of a living wood: lush green grass, three round bushes, one big tree with a dark canopy. Diagonal white rain streaks across the scene and the sky tint is darker teal-green. In a small clearing a grey standing stone crackles with bright yellow-cyan charge. One grass tile has a pulsing yellow square outline with a small bolt inside: the next strike, warned. Under the tree canopy the round orange pawn with a small antenna; beside it Pip in HiBit pixel art: squat charcoal quadruped, cream belly, large orange eyes with cream rings, three green leaf crown lobes, plain coat, looking up at the rain. Top HUD bar: at left a small shield icon with two white bars and one empty bar, two pod outlines (one filled with a small three-leaf mark), a tiny Pip face; towards the right two yellow lightning bolts, then an amber bolt with "5" and teal "))) call". Bottom line: orange "✓ Draw the charge" at left, grey "wood · storm" in the middle, grey "← Wait · Leave" at right. No other text.
Constraints: playful saturated colour even in the storm, no grey murk; no damage effects, explosions, health hearts or percentages; no other creatures; no logo marks besides the wordmark; concept photograph, not CAD.
```
**Accept when:**
- The HUD reads as Shield 2 of 3 and two bolts, with the Call slot teal at the right.
- The charged stone, the warned tile and the shelter of the tree are each distinct.
- Pip matches the accepted HiBit Pip and is the clear partner beside the pawn.
- It still looks like a storm but not brown, grey or frightening.

### S1 `station-research-pod`: a pod waits at the Station
- **Goes:** Station section, "At the bench", replacing `station-research-study.webp`.
- **Format:** generate 1536×1024, screen in a centred 1536×900 band; crop, resample to 1024×600.
- **Shows:** a flat Station screen in the richer treatment. A sealed hopper pod rests
  in a cradle under soft light; it says what it needs. A header carries Energy, Data
  and Essence. Pip appears small, as the species reference the pod's mark points to.

```
Use case: stylized-concept. Asset type: Miniature Beasts Station screen concept, 1536x1024 canvas; the screen occupies a centred 1536x900 band with plain dark margins above and below for cropping to 1024x600. Flat screen design, not a device photograph. Design at 1024x600 first: large shapes, no fine print.
STYLE: the matched richer Miniature Lives treatment: softly sculpted ceramic/resin volumes, directional light from upper left, calm deep teal-blue backdrop, generous space. Not pixel art.
CONTENT: left of centre, the hero subject: a sealed seed-pod about the size of a plum, rounded and slightly ribbed like a smooth seed, warm green shell with a small embossed three-leaf mark, resting in a simple padded cradle under a warm pool of light. Below it the text "Hopper pod" and, in amber, "Needs 2 more Essence". On the right, a small soft portrait of Pip, the known hopper: broad squat charcoal body, cream belly, orange eyes with cream rings, three green leaf crown lobes, plain coat; under it "Hopper · known". Thin header bar across the top with three supply icons and counts, nothing else: a blue data chip "4", an amber energy crystal "5", a green essence droplet "2". No other text.
Constraints: no tables, letters, percentages, DNA helices, lab glassware, progress bars or buttons; do not show the pod's contents or any creature inside it; no other creatures; no logos; saturated, warm and playful.
```
**Accept when:**
- The pod is the subject; it is closed and reveals nothing of what is inside.
- "Needs 2 more Essence" and the three counts (4, 5, 2) read at 1024×600.
- Pip matches the accepted rich Pip (`rich-plain-300x310.png`) without changes.
- No tables or lab-report look; it reads as a game screen.

### K1 `caddy-print`: a card comes out
- **Goes:** Devices section, 03 / Caddy card, beside the summary display.
- **Format:** 3:2, 1536×1024, opaque.
- **Shows:** a close three-quarter view of the Caddy's right end: the printer slot
  feeding out a thermal card of Pip, the four-grey summary screen beside it, the
  docked handhelds' bases just in frame.

```
Use case: stylized-concept. Asset type: Miniature Beasts product concept photograph, exactly 1536x1024 landscape, opaque. Close three-quarter view of the warm stone Caddy dock from the supplied hero render, same materials, bumpers, screws and window light on a wooden table. Right of frame: the printer slot with a small PRINT button and a FEED button beside it, a white thermal paper card curling out about 8 cm. On the card, printed in crisp black dithered thermal print: Pip, a squat quadruped with a dark coat, pale belly, large eyes with pale rings and three leaf crown lobes, plain coat; beneath it "Pip" and "PIP-001", and a thin rule. Left of frame, slightly soft: the four-grey e-paper summary showing a small Pip, a pod outline and three small counts. Above, the lower edges of the docked Companion (warm stone, orange Confirm visible) and the sage Station.
Constraints: MINIATURE BEASTS embossed on the Caddy, plus one small Dirty Pawz Press mark on its front; no Critter Lab mark anywhere, including the card; no QR code, barcode or extra text; no status lights; no colour on the paper; concept photograph, not CAD.
```
**Accept when:**
- The printed Pip has the same silhouette, crown and plain coat as the screen Pip, in black on white only.
- The card says only "Pip" and "PIP-001".
- No marks other than MINIATURE BEASTS; no lights.
- The Caddy matches the hero render's Caddy.

### P1 `partner-patch`: the partner answers the call
- **Goes:** Life section, 01 / Partners.
- **Format:** generate 1024×1536, screen a centred 900×1200 block; crop, keep 900×1200 and 450×600.
- **Shows:** a sunny meadow patch in HiBit. The player has just pressed Call: a teal
  ring spreads from the pawn, a buried pod glints, and Pip trots in to stand beside
  the pawn.

```
Use case: stylized-concept. Asset type: Miniature Beasts Companion screen concept, 1024x1536 canvas; the screen is a centred 900x1200 block (450x600 logical pixels at exactly 2x) on a plain dark margin. Flat screen, not a device photograph.
DESIGN AT LOW RESOLUTION FIRST: deliberate contemporary HiBit pixel art on a 450x600 grid, crisp stepped edges, broad coherent pixel clusters, rounded volume, restrained highlights. No painted-then-pixelated look, no dither spray, no blur.
SCENE: a sunny meadow patch seen top-down in three-quarter view: bright grass, clover, two dew cups sparkling, a small pond edge at one side, a flowering bush. Centre: the round orange pawn with a small antenna; a thin teal ring spreads outward from it across the grass. Lower right a small patch of soil glints where a pod is buried. Pip trots in from the left and stops beside the pawn, looking up at it: squat charcoal quadruped, cream belly, large orange eyes with cream rings, tiny smile, three green leaf crown lobes, plain coat, shown at about 100 logical pixels tall. Top HUD bar: three white shield bars, two pod outlines, a tiny Pip face at left; an amber bolt with "3" and teal "))) call" at right. Bottom line: orange "✓ Dig here" at left, grey "meadow" in the middle, grey "← Wait · Leave" at right. No other text.
Constraints: saturated playful colour; no other creatures; no speech bubbles, hearts, stats or menus; no logos.
```
**Accept when:**
- Pip reads as the same individual as the accepted HiBit Pip at 450×600, 1×.
- The Call ring, the glint and Pip's arrival read as one moment.
- The HUD and bottom line follow rule 5, nothing more.

### L1 `pip-life-stages`: juvenile, adult, elder
- **Goes:** Life section, 02 / Life stages.
- **Format:** 3:2, 1536×1024, transparent RGBA; three 512×1024 cells.
- **Shows:** the same Pip at three stages, richer treatment, same pose and light. Age
  changes size, proportion and bearing, never coat, colour or crown count.

```
Use case: stylized-concept. Asset type: matched transparent Miniature Lives character source, 1536x1024 RGBA, genuinely transparent background. EXACTLY THREE isolated full-body figures of ONE individual, Pip, in three equal 512x1024 cells, same baseline, same three-quarter pose facing viewer-left, same upper-left light, small firm contact shadow under each. No text.
IDENTITY IN ALL THREE: broad squat charcoal quadruped, cream belly, orange eyes with cream rings, tiny curved mouth, three green leaf crown lobes, plain dark coat with absolutely no pale islands or bands. Richer treatment: smooth sculpted ceramic/resin volume, restrained texture, as in the supplied rich Pip.
LEFT, juvenile: about 60 percent of adult height, rounder, larger head and eyes for its body, shorter legs, three small bright green leaf buds. MIDDLE, adult: exactly the supplied rich Pip. RIGHT, elder: same height as adult, heavier and lower-set, calm half-lidded eyes, slightly softer muzzle, three broader deep-green leaves that droop a little; wise and gentle, not frail.
Constraints: no added horns, tails, whiskers, beards, markings, grey hair, wrinkles or colour changes; no accessories, canes or props; no halo, glow or scenery; no checkerboard; do not imply parent and children.
```
**Accept when:**
- Coat, belly, eye colour and three crown lobes are the same in all three.
- Age reads from proportion and bearing alone.
- The adult matches the accepted rich Pip; nobody reads it as a family.
- Transparent alpha with no halo.

## Consistency and order

**Style references** (supplied as image inputs, with their role stated in the
prompt):
- Devices: `v1/website/dist/assets/family-concept-v2.png` (shell, materials, light);
  after H1 is accepted, the new hero replaces it for C1, C2 and K1.
- HiBit Pip: `art/miniature-lives/exports/companion-resident.png` and
  `assets/hibit-plain-source.png` (identity and pixel craft).
- Rich Pip: `art/miniature-lives/assets/rich-plain-source.png` and
  `exports/lab-known-comparison.png`; `art/visual-directions/02-miniature-lives.png`
  for material only.
- Layout truth, not style: `website/assets/prototype-map.webp` and
  `prototype-storm.webp` (fog, pawn, cell grid, bottom line), and the HUD and bottom
  line in `design/proposals/companion-controls.md` §2.
- Not references: `art/references/branded-family.png` and older concept renders (old
  names, knobs, separate Probe).

**Order:** H1 first (it fixes the four-button Companion for every later device shot),
then C1, C2, K1, then the screens S1 and P1, then L1. Judge each at the size the page
shows it and, for screens, at device size at 1×. Keep every original, its exact
prompt and its hash, and caption each image as concept art on the page.

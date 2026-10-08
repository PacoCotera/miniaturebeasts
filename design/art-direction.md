# Art direction

Mibis have to be appealing enough to care about and clear enough to read. A player
should be able to see an inherited difference, recognize an individual and
understand what changed without reading a label. The art carries the game.

## Miniature Lives

**Decided.** Miniature Lives is the accepted look.

- **Creatures:** sculpted, rounded bodies, soft tactile materials, directional
  light, expressive eyes and clear markings. They should feel alive and physical
  even when small.
- **Companion:** a crisp HiBit treatment, meaning detailed pixel art that keeps
  rounded volume, eyes and markings readable at about 280×300 pixels.
- **Station and larger displays:** a matched richer treatment of the same
  creature, with the same trait boundaries.

The reference is the Pip device proof in
[`art/miniature-lives/`](../art/miniature-lives/README.md). It shows the plain
saved Pip and a pale-marked comparison, at Companion and Station size.

The acceptance covers the look and how the two treatments relate. It does not
approve:
- later screen layouts;
- generated creature art in general;
- other species;
- a particular display technology.

C18, an early pixel reference, inspired this direction but is not a style to copy.

## Rules

**Working rules** from the first prototype's screen standard:

- **Design at device size.** Judge art at 450×600 and 1024×600 at 1×, not as a
  scaled-down poster.
- **The creature comes first.** Identity and inherited meaning must read from the
  creature; text supports it.
- **Art never changes genes.** Rendering can't invent body parts, move pigments or
  "repair" a weak result by changing what was inherited. If art fails, the creature
  remains and the failure is shown.
- **Draw only what is known.** During partial research, show reference views that
  reveal no unknown anatomy. Full portraits require full knowledge.
- **Same individual everywhere.** Silhouette, markings and identity survive color,
  four-gray, monochrome and paper.
- **Keep originals.** Original images, exact prompts and source files keep their
  bytes and hashes. Generated images are labelled as generated.
- **Text is separate.** Never bake numbers or labels into artwork.

## Direction for creatures

- **Color:** saturated, playful color and clear highlights. Dull brown and grey
  creatures were rejected.
- **Variety:** broad body plans and coverings (fur, scales, feathers, skin) that
  still read as pets.
- **Passes:** generation works in stages: outline, illustration, "pet-ification",
  then animation.

## Art still to make

All **Open**:

- **Species designs:** a starting roster, with body plans that vary within each
  species.
- **A creature pipeline:** how a genome becomes a sprite and a richer portrait
  without hand-drawing every individual. Generated images from the workbench are
  on hold because they don't match their source genome. **Decided 2026-10-08**
  ([art pipeline](proposals/art-pipeline.md) v2): expression is continuous, with
  no fixed set of looks; the **standard look** rendered from the rig (continuous
  proportions, species colour pools), finished to the style guide, is the game's
  art for every mibi and needs real art investment; the unique cloud-painted
  render, with the rig's renders as its control images, is a **prize** earned by
  research, never the default. "Hand-authored pixel masters" below is
  *superseded* for individuals: masters are per species (plates, token rigs),
  never per mibi.
- **Animation:** idle, movement and reactions; growth stages that keep identity.
- **World art:** tiles, objects, creatures in the world and the map's look at
  450×600. This depends on the exploration design.
- **A UI kit:** frames, focus, icons, typography. The type in the proof is an
  unverified fallback font.
- **Hand-authored pixel masters:** the current images are generated concepts.
- **Caddy and paper:** four-gray and print versions of the same mibi.

## Lessons from rejected work

Rejected screens are kept in the archive as references only:

- **The discovery proposal** drew exploration as a single corridor covered in
  labels, and showed the Station as tables of numbers.
- **The first-person scenic view** made the world a backdrop instead of something
  to act on.
- **Header-image screens** put a picture above a list instead of making the
  picture the interface.

The common failure: the art decorated a process instead of being the thing the
player interacts with.

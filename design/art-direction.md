# Art direction

The look of Miniature Beasts, for artists and for builders placing art. The
style guide in [`style-guide/`](style-guide/README.md) holds the per-screen
rules; how a mibi's art is made is in the [art pipeline](proposals/art-pipeline.md).

Mibis have to be appealing enough to care about and clear enough to read. A player
should be able to see an inherited difference, recognize an individual and
understand what changed without reading a label. The art carries the game.

## Miniature Lives

The look is Miniature Lives. It is cute by charm and craft, as Pip is: tactile,
softly modelled, grounded, with real weight and real anatomy under the charm. It
is never childish: no cartoon simplification, no sticker faces, no toy-like
rendering, no nursery colours, no storybook ornament.

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

## Rules

- **Design at device size.** Judge art at 450×600 and 1024×600 at 1×, not as a
  scaled-down poster.
- **The creature comes first.** Identity and inherited meaning must read from the
  creature; text supports it.
- **The art is the interface.** The player acts on the picture; art never
  decorates a process, a list or a table.
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

## From genome to creature

A mibi's genome is the seed of its look. The rig sets its structure, proportions
and attachments; the painter gives each mibi its standard look when it grows,
painted over the rig's control passes, and the Companion picture, the 48 px
token and the idle and walk frames are derived from that painting. Each painting
is made once and kept. Until it arrives, the player sees the rig placeholder,
which is never the final look. Nothing is hand-made for an individual; species
pieces are painted once per species. The [art pipeline](proposals/art-pipeline.md)
describes the mechanism.

Creatures range from bear-like to cat-, cow- or firefly-like and beyond, with
broad body plans, fur, scales, feathers or skin and real facial features, and
always read as pets. Color is saturated and playful, with clear highlights,
never dull browns and greys. Every expression a genome allows is a cute pet: the
rig's ranges (head and eye size floors, limb bulk caps, roundness) and each
species' colour pools stay inside a cute envelope, and the worst case in each
species' range is what the painting is tested on.

Pods come from one renderer with species parameters (size, proportion, shell
pattern, colour pair, glyph). The pods of a species match, and a shell never
shows its individual's genes; only the dust or moss of its place of origin
varies from pod to pod.

## Not designed yet

- **Species designs:** each species' body plan and cute envelope, with body
  plans that vary within each species.
- **Animation:** idle, movement and reactions; growth stages that keep identity.
- **World art:** tiles, objects, creatures in the world and the map's look at
  450×600. This depends on the exploration design.
- **A UI kit:** frames, focus, icons, typography, including the typeface.
- **Caddy and paper:** four-gray and print versions of the same mibi.

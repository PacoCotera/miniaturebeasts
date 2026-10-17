# Art direction

The look of Miniature Beasts, for artists and for builders placing art. The
style guide in [`style-guide/`](style-guide/README.md) holds the per-screen
rules; how a mibi's art is made is in the [art pipeline](proposals/art-pipeline.md).

Mibis have to be appealing enough to care about and clear enough to read. A player
should be able to see an inherited difference, recognize an individual and
understand what changed without reading a label. The art carries the game.

## The look and feel

This is the general guideline. Every screen on both devices, new or changed, is judged by it. The screens are prototypes and keep changing, and newer direction for the game overrides any rule on this page. The detailed [style guide](style-guide/README.md) sits below it as the current implementation reference: it holds the values and sizes, and this page holds none.

### The feel

A small, well-made field kit for keeping living things. You hold it, and it is warm, calm and a little worn from use. The life inside it is the point: soft, bright and full of character. The device around that life is quiet and practical.

**Why.** The game is care and curiosity about animals you made and raised. The player's attention and affection belong to the mibis, so everything else has to be trustworthy and out of the way: a naturalist's instrument made by someone who loves animals. It is not a gadget showing off, and it is not a toy.

**Three layers, one job each.** Every screen on both devices is built from three layers. Texture, light, colour and motion are decided by the layer, not screen by screen.

| Layer | What it is | Its job | How it looks |
| --- | --- | --- | --- |
| **The life** | the mibis, pods, plants, water, places | to be cared about and read | warm, rich, detailed, the most alive thing on the screen |
| **The instrument** | the housing, the displays, the panes | to hold the life and get out of its way | quiet, matte, dark, simple; one material system on both devices |
| **The signal** | the device's lit marks, its one action, what needs you | to say what changed or what to do | small and exact; it appears only when it means something |

When a screen goes wrong, it is almost always one layer doing another's job: the instrument taking colour or decoration from the life, or the signal lighting up for show. Checking a screen layer by layer finds those faults before they compound.

<table><tr><td valign="top"><img src="../art/concept-homepage/station-research-hands.png" width="460" alt="Station research concept"><br><em>station-research-hands: the three layers in one picture: a lit subject, a quiet device, a few small signals. Approved concept, generated. Its blue display and orange corners are not the rule.</em></td>
<td valign="top"><img src="../art/concept-homepage/companion-resident-home-450x600.png" width="225" alt="Resident at home concept"><br><em>companion-resident-home: the warmth the life layer carries. Approved concept, generated.</em></td></tr></table>

### Textures and materials

**The life is soft and tactile:**
- fur you could stroke, and leaves with a waxy sheen;
- damp moss, smooth stones and clear water;
- creatures modelled like small sculptures, with weight and a soft surface.

Tactility is what makes a picture feel like something alive you could hold, and that is what makes caring for it feel real.

**The instrument is handled gear:**
- matte powder-coated polymer in sage and sand, dark rubber and recessed screws;
- engraved marks, and canvas or braided hose where something is carried or fed;
- a little wear at the edges.

Matte and hard against soft and alive is the contrast that makes the life stand out. The wear says the kit is used and trusted, not new and on display.

**Displays** are dark matte screens that the life and the light stand out against. **Paper, tags and labels** are the field kit's own honest materials, but they never change on screen: anything that changes or that you act on is the machine's display.

There is no gloss, chrome, holographic sheen or shiny plastic. Each would make the instrument compete with the life for the eye.

### Light

**One warm daylight** falls on everything from the top left, with soft shadows that ground every object where it sits.

- **For form:** the creatures are sculpted, and a single directional light is what lets a player read their anatomy. That includes the inherited differences the whole game is about.
- **For place:** a contact shadow makes an object real and in the world. Without one it is a sticker.

**The device's own light** is the signal layer. A lamp lights what it is for, a lit mark shows what changed or what is ready, and the light casts onto what it lights. Because the device never glows for show, every light the player sees means something.

<table><tr><td valign="top"><img src="../prototypes/ui/assets/masters/vivarium/idle-vivarium-day-1024x568.png" width="512" alt="The vivarium by day"><br><em>The vivarium by day: warm key light, soft shadows, moss and water. Master.</em></td>
<td valign="top"><img src="../art/miniature-lives/assets/rich-plain-300x310.png" width="300" alt="Pip, richer treatment"><br><em>Pip lit from the top left: form shading, catch-lit eyes, a soft shadow under the feet. Accepted.</em></td></tr></table>

### Colour mood

Bright life on a calm ground.

- **The life spends the colour budget:** saturated and playful, with clear highlights, and never dull browns and greys.
- **The instrument stays out of it:** sage, sand, rubber and slate.
- **The signal uses colour only as meaning:** its light for progress and change, a warm amber when something needs you, and orange for the one action.

**Why a budget.** The player must see at a glance that this mibi's markings are paler than its parent's, or that its coat changed. Inherited colour can only read if nothing around it is competing in colour. If a screen looks colourful because of its panels, frames or bars rather than its life, the budget has been spent in the wrong place.

### Information density

*Written by the game designer. The numbers that put these principles into practice (words per element, mark sizes, counts) are in the [style guide](style-guide/README.md); this section is the reason behind them.*

<img src="../art/concept-homepage/station-research-hands.png" width="460" alt="Station research concept"><br><em>station-research-hands: one lit subject on a clean display, with depth folded away. Approved concept, generated.</em>

- **One subject per screen.** Every screen is about one thing the player cares about: a mibi, a pod, a crate, a choice. That thing is the largest, best-lit and most detailed thing there. Everything else is smaller, quieter and in its service.
- **Show what the player acts on or watches change, and nothing else.** An object earns its place by doing something the player can see, or by changing over time. Equipment that serves nothing, decoration that explains nothing, and a second picture of something already shown all go.
- **Rich where it matters, calm everywhere else.** The life is dense: fur, markings, moss, light. The machine around it is sparse: a few panes, a few lit marks. Detail is spent on what the player came to see, never spread evenly.
- **Depth is present but folded.** The genome, the rules between copies and the numbers behind a forecast are really there, one press away, for the curious. The first view gives a child the whole meaning without them; the folded view gives a parent the mechanism.
- **A glance before a read.** Each screen is understood in a few seconds by looking, before any word is read: what it is for, what changed, what is waiting. If understanding needs reading, the screen is too dense or draws the wrong thing.
- **Every mark means one thing, everywhere.** A mark the player learns on one screen means the same on every screen and on both devices. Meaning never depends on a legend, a tiny glyph or colour alone.
- **The Companion says less than the Station.** It is a smaller screen carried outdoors, held in a moment of play. It shows the place, the pawn and the next step; the Station holds the reflection, the comparison and the depth.

### Tone of voice

*Written by the game designer. The words budget per element is in the [style guide](style-guide/README.md).*

- **The devices speak little, and plainly.** Words name things and say what happens; they never explain what a picture already shows. A line is short enough to read in a glance, and most screens need only the bottom line.
- **Warm, never cute.** The voice is a calm, kind field companion who knows these animals well. It is never babyish, never gushing, never a lab report. "Moss has grown up", not "Yay! Moss levelled up!" and not "Specimen 12 reached maturity".
- **Play language, not science words.** Pods, mibis, looks, chapters, what it does. Never locus, allele, phenotype, specimen or percentage on the main view. The real terms live in the detail view, for those who open it.
- **Talk about this animal.** "Your Loika", "Moss", "this pod": the player's own mibi by name, the species by its name alone. The device never calls a mibi a creature, a unit or an item.
- **Say what a choice will do, not what to press.** A choice reads as its outcome ("Gone for good. Its place will remember it."), not as an instruction ("Press ✓ to confirm release"). A loss is said once, plainly, and never as a scare.
- **Describe, never promise.** A trait is told by what the animal looks like or does ("nothing ruffles it"), never by an effect the game doesn't have. The voice never sells, nags or hurries the player. Waiting is described ("ready in about ten minutes"), never pushed.
- **Never punish absence.** Coming back is invited by something new to see, never by guilt. There is no "you missed", "hurry" or "don't forget"; there is "Face cleared on your Loika".
- **Honest about the unknown.** What isn't known yet is a surprise, not a blank. "Still a surprise", "something new is under here": the voice makes the unknown tempting, and never guesses.

### Motion character

**The life moves all the time.** It breathes, looks around, potters and sleeps; water and leaves move. Constant small motion is what "alive" looks like.

**The instrument moves only when something happens.** A door opens, a lamp turns on, a crate slides in, a frost clears. These moves are short, eased and physical, the way a well-made mechanism moves. Because the device is otherwise still, every move it makes reads as an event.

**Reveals take their time,** because they are the reward the player came back for. Nothing blinks to get attention, and nothing means something only by moving.

On the Companion the same character is drawn in stepped frames.

<img src="../art/concept-homepage/companion-storm.png" width="280" alt="Companion storm concept"><br><em>companion-storm: weather and life moving in a place, the pawn always readable. Approved concept, generated.</em>

### What it is not

Each of these breaks a layer:

- **Childish:** sticker faces, nursery colours, cartoon simplification or storybook ornament. It undermines the real anatomy and inheritance the game is about.
- **A sci-fi HUD:** neon, holograms, glowing outlines, chrome or glass gloss. The signal and the instrument take over from the life, and it reads cold.
- **A sterile lab, a display cabinet, a desk of papers:** the life becomes a specimen and the warmth goes.
- **A cosy cottage with no equipment:** the instrument disappears, and the care has nothing to happen through.
- **Colour in the chrome:** brown-on-brown panels, cream cards, coloured frames and bars. The instrument spends the life's colour budget.
- **Words where a picture would do:** lists, tables and walls of text. The signal turns into reading.
- **Equipment for show:** lamps, lines and gauges that serve nothing. The instrument pretends to work.

### How the signals so far fit

The rejections and rulings so far are each one layer out of place:
- brown on brown, cream panels and a plastic plaque are the instrument taking colour and attention;
- an egg on a moss cushion, a pixel glyph and jargon are the life and the signal drawn without craft or meaning;
- paper used as a status screen is the instrument's material doing the signal's job;
- "you're editing life" asks the instrument to look like what it does.

New screens, and every iteration of the prototypes, are judged the same way, layer by layer.

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
- **The Station itself:** rugged, matte field gear, the Companion's sibling,
  whose job is keeping small lives going. Its look is in the
  [style guide](style-guide/README.md#the-station).

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
- **World art beyond the meadow:** the biomes after the first terrain slice
  (grass with cliffs, water, a bridge and stairs).
- **Caddy and paper:** four-gray and print versions of the same mibi.

# Home, from the genome side (genome engineer, T-20261016-186)

Written before reading the other critiques. Judged on the device sheet's Home goldens (station-gate `prototypes/face/golden/home/`: docked, fresh, goal, incubator, library, pods) and on the code that feeds them (`station/src/views/home-props.mjs`, `stands.mjs`).

## The one finding that matters

**Home draws species, not individuals. The genome is invisible exactly where the family lives.**

- Every resident in the living window is drawn from its species' stand, by stage and size: `lookOf` → `standLook(species, stage, size)`. The mibi's genome is only part of the picture's name, never of what is drawn.
- In `home-docked.png`, four adult Loikas and two juveniles are pixel-identical: the same crest, eyes and coat.
- On real pods those five open traits differ. Markings is plain or pale patches; Crown is bare head or leaf crest; Eyes run from thin rings to wide pale rings. Of 400 S01 pods, about half show different eyes alone.
- On the deep species the gap is far larger: S03 has 25 traits, S09 27.

Why it matters:

- **The intellectual player loses the payoff.** Create lets them choose which copy a gene keeps. Breeding surfaces hidden looks. Then Home shows the result as a clone of every other member, so the work they did has no visible place to live.
- **The surface misleads the depth.** A player who only sees Home will reasonably conclude that all Loikas are the same, and that crossing two of them is pointless. That is the opposite of the framework, where kinship, hidden copies and blends make every child its own.
- **The cozy player also loses something.** "Which one is Pip?" can only be answered by the name on the bottom line. Pillar 3 ("each mibi is an individual") is undercut by the art.
- **It breaks a standing rule:** "the same individual everywhere". The founder on Create and the bud's shadow on the Incubator are this mibi; on Home it becomes the species again.

I understand why: stands are painted art, and painting every individual is the Grow/portrait pipeline's job. But the framework already describes each individual's look as data: traits → looks → the plain renderer's parts. The cheapest honest step is per-individual variation on the stand, for the few traits a stand can carry as layers or swaps: crest on or off, patches, eye-ring size, coat colour within the pool. The full portrait is not needed for this.

## What Home shows or hides of the mechanics

| Mechanic | On Home today | Verdict |
| --- | --- | --- |
| A pod carries something new | The Pods panel puts a glint on a pod (`podGlints`). Per pod is the right granularity: it says "new here", never what | Good. The asset is named `star:12`; check that it is the house four-point glint, not a star (the marks' family reserves the star shape) |
| Research progress | Nothing: no chapters read against unread, no field-guide fill | Missing. The only "knowledge grows" signal is the Library's lamp |
| The bud | A glow in the Incubator panel and "a Loika bud, growing" | Fine for cozy. The intellectual player gets no hint that chapters are clearing while it grows, the Incubator's best mechanic. One mint tick per cleared chapter on the panel would do it |
| The wish | Nothing | Missing. The wish is the long-term breeding goal, the reason to cross. A lit wish piece ("a resident now carries a piece of your wish") is exactly Home's kind of news |
| Families and lineage | Nothing. Residents carry no relation to each other | Missing. At least the pair you could cross should be readable, and a parent beside its child |
| Breedable pairs and kinship | Nothing | Optional on Home; belongs on the Cross. But a "two adults of one species, unrelated" readiness note would point the curious player to it |
| Self-changing traits | Nothing (and nothing to show yet: only partners change, and the mark is not built) | When built, Home is where the partner's glow coming back brighter after the caves should be seen first |
| Supplies | The header: Energy, Data, Essence | Fine |

## What a curious player can reach from Home

- Pods → identify and read. Incubator → the genome tree, compact. Library → the field guide. A resident → Habitat (one mibi up close). Probe, Cargo.
- That is every door, but each is reached by function, not by curiosity. Nothing on Home says "this resident is hiding a pale copy", "these two are siblings", or "your wish is one cross away".
- The bottom line's goal ("go out with the Companion", "more walks grow the pair") is all logistics. The genome never appears in the goal voice, even when the best next move is genetic: read the chapter that glints, cross the pair that carries the wish.

## What it does well

- **Calm and legible.** Five panels, each one lamp and one action. Nothing nags.
- **The glint on a pod is the right honest hook:** a curiosity gap that is fixed when the pod is found, and paid by reading.
- **The juveniles at the bed and the light by the hour make the place feel alive** without any numbers. Nothing on Home contradicts the framework's rules except the identical residents.

## Proposals, ranked (genome side)

1. **Draw residents as themselves.** Per-individual stand variation for the traits a stand can carry, driven by the genome's looks. Show only what is read: an unread trait draws the species' typical look, and hidden copies never show. This is the one change that makes everything upstream (Create, the Cross, research) visible where the player lives.
2. **One genetic sentence in the goal voice when it is the best next move:**
   - "the glinting pod carries something new";
   - "a cross could bring your wish";
   - "Pip's bud has cleared Coat".

   Same notice zone, no new chrome.
3. **Wish progress on the Library panel:** pieces lit against pieces wished, as marks, not a number.
4. **Kinship at a glance in the living window,** only when a resident is focused: its parent or child glints softly. This needs no new screen and teaches that families exist.
5. **Later:** the partner's self-changing mark shown on its return, the first time a player sees a trait move by itself.

## Where the surface would mislead the depth (summary)

- **Identical residents** say the genome makes no visible difference. That is false, and it is the most expensive misreading the game can teach.
- **A goal voice with no genetics** says the game is about walks and supplies. The framework is about inheritance.
- **No family on Home** says mibis are interchangeable units. Pillar 3 rules that out.

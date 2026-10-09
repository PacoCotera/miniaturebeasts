# Genomics

This document explains how a mibi's genes work: what a species fixes, what one
mibi carries, how its two copies show, how two mibis make a child, and how a
genome is written as a stamp. It is for anyone building the game, and for
readers who want the genetics. What the player does with these rules
(research, shaping, the wish, forecasts, prices and finds) is in
[research and breeding](research-and-breeding.md). How a genome becomes a
painted creature and a pod is in [art direction](art-direction.md).

Players never meet the word locus. The engine runs on loci; the screens show
traits and pictures.

## A worked example: the Loika

The Loika is the simplest species. Every Loika shares the same body plan, skin,
colours and leaf crest shape, fixed by the species. Five things differ between
individuals:

| Chapter | Trait | What shows | How it shows |
| --- | --- | --- | --- |
| Coat | Markings | plain, or pale patches | a recessive switch: pale patches need two copies |
| Face | Crown | bare head, or leaf crest | a dominant switch: one copy is enough |
| Face | Eyes | thin rings to wide pale rings | a blend: the mean of the two copies |
| Movement | Drive | steady to bursts | a blend, and a doing |
| Stamina | Efficiency | thrifty to ordinary | a blend, and a doing |

A Loika that is plain but carries one pale copy looks plain; its pale copy is
hidden and can pass to a child. For example, two unrelated Loikas that are both
plain and both carry pale have, on average, one pale-patched child in four.
Their Eyes blend: each child's eyes fall between its parents', nudged a
little either way. Drive and Efficiency are doings: they move the Loika, they
never change its body, and only breeding changes them.

## Words

| Word | Meaning |
| --- | --- |
| **locus** | A heritable position in the genome. A mibi holds two **copies** at every locus |
| **allele** | A named value a copy can take |
| **look** | What a pair of copies shows. A trait's looks are its pictures and words |
| **trait** | One thing the player reads, with its own words and picture. It is made of one or more loci; a locus belongs to one trait at most |
| **chapter** | A group of traits, read together. Chapters organise the genome for reading; they say nothing about linkage |
| **frame** | One species' definition: what it fixes, what it leaves open, and the values it allows |
| **pool** | The alleles a species allows at an open locus |
| **doing** | A trait that shapes behaviour: movement, stamina, character, glow and charge. Every other trait shapes the body |

## The catalogue: one genome that grows

One catalogue of loci serves every species. It is a trunk with branches:

- **Trunk** loci can be carried by any body that has their part: eyes, head,
  legs, feet, coat, markings, movement.
- **Branch** loci belong to one clan only, such as a turtle's shell or a
  plant's leaves.

A part a species never has gets no locus at all. It is absent, not switched
off, and it is never drawn, read or stamped. A locus is carried only when
something draws it or weighs it.

So species differ in size of genome, not only in values. A starter species
such as the Loika leaves five loci open; the Tuikis leaves forty, behind more
chapters. Genomes grow more complex as the player progresses.

Loci are filed in families. Movement, energy, cognition and fantastic
physiology are doings; every other family is a look.

## How two copies show

Every carried locus holds exactly two copies. How the pair shows depends on the
locus:

- **Continuous loci** (every ratio and rate: eye size, leg length, pace) show
  the mean of their two copies. Expression is continuous; the named alleles are
  the bins the player sees as looks (*thin rings · between · wide pale rings*).
- **Switch loci** are Mendelian. A dominant copy shows; a recessive copy hides
  unless both copies carry it.
- **Part switches** turn one small part on or off in one mibi: a crest, a
  marking field, a mask. The species' **plan switches** (body segments,
  symmetry, limbs, covering) belong to the frame and are never carried by an
  individual.

The copy that does not show is **hidden**. Hidden copies never show, as in
living creatures; only research reveals them. They still pass to children.

A trait may draw on several loci. Eyes, for example, are eye size and eye
spacing together.

Doings never shape the body. Every species' behaviour is a state machine, and
a mibi's doings weigh its transitions.

## Carried and expressed

Each carried locus is either **expressed** or **asleep** in a given mibi.

A locus is **asleep** when it sits behind a part switch that is off in this
mibi. A plain Tuikis still carries the layout, extent, scale, angle and
contrast of markings it does not wear. Sleeping copies pass to children like
any others, and they wake in a child whose switch comes on: two plain parents
can have a striped child wearing stripes neither of them showed.

Art never changes a gene. A genome is never edited to make a body or a
painting work; a body that cannot be built is reported, never repaired.

## The three kinds of locus

Every locus is one of three kinds:

1. **Locked by the species.** The pair is the same in every member of the
   species. It is the species' frame: never read pod by pod, never set by the
   player, never crossed. A mibi whose locked pair differs belongs to another
   species.
2. **Configurable.** A look the player may set when creating a founder, once
   it has been read: as the pod has it, its first copy twice, or its second
   copy twice. Only the pod's own copies are offered.
3. **Self-changing.** A locus that changes only by itself, in the manner of
   epigenetics: neither the player nor a cross changes it.

By default every look is configurable, and doings change only by breeding.
A species may set a trait apart, with the reason kept in its frame: the
Tuikis's Claws, for example, are how it digs, so they change only by breeding.

Each locus in a frame also has one kind of part:

| Kind of part | What it is | Kind of locus |
| --- | --- | --- |
| **Locked** | What makes a species itself: the frame's fixed copies | Locked |
| **Heritable look** | A visible trait that differs between individuals | Configurable, unless the species makes it breeding-only |
| **Heritable doing** | Movement, stamina, character, glow, charge | Breeding-only |
| **Sleeping** | A look behind a part switch that is off in this mibi | Set with its switch's trait |
| **Sealed** | A doings chapter that cannot be read until a find opens it. Its loci are inherited and act from birth | Breeding-only |

No species carries a self-changing locus yet; how one changes is under
[Not designed yet](#not-designed-yet).

## Species frames

Every mibi belongs to one species. There are four levels: body plan, clan,
species and individual. The species list, with their clans and plans, is in
the [taxonomy](proposals/taxonomy.md) and the
[species frames](proposals/species-frames.md).

A frame fixes everything about the species except its open traits. For each
open locus it gives a **pool**: the alleles this species allows there. Colour
pools are the species' own colour and a few neighbours, with slight variation
between individuals, as in real animals.

Every expression is a cute pet. Pools and the body's proportions are bounded
so that no allowed combination leaves the shape a pet reads as. A species is
checked before it is used: its type specimen and two hundred random members
drawn from its pools must all build.

The **type specimen** is the species at its most typical: every open part
switch on, the species' typical copies where the frame names them, and
otherwise the middle of each pool.

## Chapters and traits

Chapters have fixed names, in this order: **Coat, Face, Shape, Legs & Tail,
Movement, Stamina, Character, Glow, Charge**. A species has only the chapters
that hold its open traits, as many as it needs.

Coat, Face, Shape and Legs & Tail are looks. Movement, Stamina, Character, Glow
and Charge are doings.

A **sealed** chapter is always a doings chapter. It names the find that opens
it and holds at least two traits. Sealed chapters belong, for example, to the
Untuva (Character) and the Belatz (Movement).

## A whole genome

A genome names its species and the frame version it was built on, and holds
two copies for every locus its frame carries, with its origin.

A genome is valid when:

- every locus of the frame is present, and no other;
- every locked pair equals the frame's;
- every open copy is in the species' pool (a blended value lies within the
  pool's range);
- the body it describes builds: every part roots on its owner and stays within
  bounds.

A whole genome is valid or it does not exist. Nothing is substituted to make
it pass.

## Research

A pod holds one complete genome; what the player knows of it is partial.
Reading a chapter reveals both copies of every trait in it: what shows, what
hides, what sleeps. Research never changes a pod, and knowing a variant from
one pod never puts it into another. How reading is played and paid for is in
[research and breeding](research-and-breeding.md).

## Creating a mibi

A pod's genome is drawn from its species' pools by the pod's seed, and drawn
again until its body builds, so every pod holds a mibi that can grow. One pod
makes one founder. A founder has no parents: its pod is its origin.

A founder changes only at configurable traits that have been read, using only
the pod's own copies, and only in combinations that make a valid whole genome.
Everything else stays as the pod has it. Creation commits one individual;
incubation and opening introduce that same individual.

## Breeding: the cross

Breeding is within one species, between two different mibis whose locked pairs
match. Sharing a species is necessary but not enough; the other conditions are
game rules, in [research and breeding](research-and-breeding.md).

Each heritable locus is crossed on its own, with no linkage between traits:

| Locus | The child |
| --- | --- |
| **Switch** | Takes one copy from each parent, at random. The look shows by the locus's rule; the other copy hides and can pass on |
| **Sleeping** | Crossed copy by copy like a switch, whether or not the parent wears it. It rides with its switch |
| **Continuous** | Sits between its parents' shown values, nudged by up to 10 percent of the locus range either way, and kept inside the species' pool. Both copies equal the drawn value, so a blend hides nothing |
| **Locked** | Takes the frame's pair. It is never crossed |

A child's copies come only from its parents. There is no mutation.

The child is checked whole before anything is spent. A child that cannot be
built never exists; the cross is not drawn again.

The more removed the two parents' genomes, the better the cross; inbreeding
brings a penalty. How it is measured and what it does are under
[Not designed yet](#not-designed-yet).

A child is known before any reading only where its outcome is certain: both
parents hold the same pair, with both copies equal. A blended trait is never
known before it is read.

A child records its two parents.

## The genome stamp

The genome stamp is the genome code: it carries the actual genome and can be
scanned. It is a postage stamp of square cells, read by the game's own reader.
It is not a QR code and no ordinary scanner reads it.

![Four stamps growing: a Loika, a Tuikis, a Tuikis with a postmark, and a species with 150 open loci](../prototypes/genome-stamp/img/growth.png)
*Stamps grow with the genome: Loika 17×17, Tuikis 25×25, the same Tuikis with a postmark 29×29, and 150 open loci 37×37.*

From the outside in:

- **Perforation:** a dot on every other cell of the outer ring. These are the
  timing marks.
- **Frame:** one solid square line, which the reader finds first.
- **Species border:** pairs of dark and light cells drawn from the species'
  locked frame, the same for every member. It names the species and which way
  is up.
- **Glyph:** the species' 5×5 mark in the top-left corner.
- **Chapter blocks:** both copies of every open locus, chapter by chapter, as
  pairs of cells (copy one above copy two). Locked loci are not stored per
  mibi; every reader carries the species frames.
- **Strip, at the foot:** error correction, the header and the read mask.

A chapter the player has not read is an empty block, never a guess.

![The same Tuikis with every chapter read, and with two chapters unread](../prototypes/genome-stamp/img/station-glowtail-unread.png)
*A Tuikis with Legs & Tail and Character unread: those blocks are empty outlines.*

The header holds the format, the species, the frame version, the stamp's size
and a postmark flag, protected by a checksum. Reed–Solomon error correction
covers the whole stamp, and a read is shown only when both the correction and
the checksum pass.

**Size.** Stamps come in a series of sizes, 17, 21, 25 and so on up to 49
cells a side. Each mibi's stamp takes the smallest that fits its genome, so a
species with more open loci has a visibly larger stamp.

**Postmark.** A portrayed mibi carries a signed postmark of 64 bits on its
stamp. A stamp without one reserves no room for it; a postmark grows the stamp
by one size.

**Versions.** A stamp keeps the frame version its mibi was born with. Readers
keep every frame version, and the list only grows, so old prints keep
decoding.

A child's stamp repeats one of the mother's copies and one of the father's at
every switch locus, so a family lines up on paper.

![A Tuikis mother, child and father](../prototypes/genome-stamp/img/family.png)
*A Tuikis mother, child and father: at each switch locus, the child's upper cells repeat one of the mother's copies and its lower cells one of the father's.*

The stamp's tests, print sheet and scan page are in
[prototypes/genome-stamp](../prototypes/genome-stamp/README.md).

## Codes

Every mibi has a **name code**: nine characters from the genome's digest, the
last a check character, shown in threes (for example `G7F · CD0 · 3H2`). It is a name and a lookup, not the
genome. A stamp's code string can be shared.

## The individual record

Each mibi is one individual. Its identity, heredity, origin and appearance
stay the same on every device and on paper.

A mibi's record keeps its genome, the genome's digest, its name code, the
chapters read, and its origin: the pod it came from, or its two parents.

A saved mibi keeps the frame version it was born with; a change to a species
never rewrites a living mibi. A child is built on its species' current frame.

## Not designed yet

- What "changes only by itself" covers, next to the loci that change only by
  breeding.
- How a self-changing locus changes: what triggers it, when, whether a child
  inherits it, and how it shows.
- The inbreeding penalty's form, and how relatedness is measured.
- Whether the stamp holds a blended value exactly.
- A shareable code string that decodes back to the genome.
- Whether a scanned stamp can ever grant a mibi.

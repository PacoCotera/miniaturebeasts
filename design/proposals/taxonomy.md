# Taxonomy: plans, clans, species, individuals

**Proposal** from game design with the genome engineer, 2026-10-07, for a discussion with the owner before genes, traits, names and art are designed per species (**Decided** 10-07: species design starts with taxonomy). **Decided** marks owner decisions restated here; everything else is **Proposal**. It builds on the [species frames](species-frames.md) and the approved [research loop](research-loop.md). The examples are generated, not drawn: [taxonomy.py](taxonomy/taxonomy.py) makes them by the rules in §3 and builds each one through the species-frame method and the workbench's own resolver, 200 random individuals per species. Run `python3 design/proposals/taxonomy/taxonomy.py --check`; its output is [examples.json](taxonomy/examples.json) and the [plan census](taxonomy/plans.json).

**Decided by the owner on 10-07, folded in:** the growing genome, the four levels, one roster for every kit, and the first 16 with one change: one plant, and a spectral or energy creature in place of the second; before that, 16 species in V1, shown as a grid of 16 on the Station, with seasonal drops about every three months; the first 16 as different from each other as possible (fliers, swimmers, mammal-like, insect-like, slugs, sentient plants); hidden silhouettes for clans and species not yet met; Compare on any living mibi; the clean-room naming stands (the "combination of words" was for the product name).

**One word first.** The website and the breeding design already use *family* for a mibi's kin: "One species. Endless families", the genealogy tree (**Decided** 10-06, homepage). The owner asked that individuals and families never be confused (09-24). So the level between plan and species is called a **clan** here and on screen; *family* keeps meaning parents and children. And the frames' file names *hopper*, *puffcap* and *glowtail* belong to other franchises' creatures, so here the three species are **brinquín**, **copolí** and **farolín** (§5, the clean room; the owner warned that Spanish roots must fit, so the first renames *zacatín* and *ocotín* are withdrawn).

## 1. What a species is, in this game

A species is one **frame** (today on the one 114-pair catalogue; under §2's proposal, on the shared trunk plus its clan's branch): its locked **plan switches** (segments, symmetry, limbs, covering) and every part they fix or switch off, two equal copies in every member, learned once at Identify; a **colour pool** (the pigments a wild pod can carry); its **open chapters**, each a page of traits with their looks; its **sealed chapters** and the **finds** that open them; its **looks/doings rule** (looks shapeable at Create, doings changed only by breeding, with stated overrides, **Decided** default); a **diet** and a **habitat** (frame facts for now: the energy-uptake loci are drafts and the affinities domain has no loci); and a **state machine**: the plan gives the states (walk, hop, waddle, swim, flutter), the species the transitions, and each individual's doings and Character weight them (**Decided** direction, owner 09-25). Two members share everything locked: silhouette, face parts, finish, size class, pod, glyph, stamp border, diet, habitat, field ability and behaviour states. They differ only at the open parts, copy by copy, which is where research, shaping, wishes and crosses happen. Breeding is same-species only (**Decided**) because only two members of one frame carry the same locked pair at every locus: a child is validated as a whole genome against its frame, and a cross of two frames has no frame to be valid against. It would be a new species, and only the generator makes those.

## 2. The central question: one fixed genome, or a genome that grows

The owner: *"What if, rather than a fixed allocation for the data structure, you make it dynamic, so the growth in complexity is very visible. Otherwise we would be forcing all species to have the exact same genome, just with different expressions."*

**Today it is the same genome, differently expressed.** Every frame is drawn from the one 114-pair catalogue: the brinquín, the copolí and the farolín each carry all 114 pairs, and what makes them different species is which loci are locked, switched off or open (species-frames §1). A brinquín carries wing span, fin and tail copies that nothing will ever draw. The Library, the stamp's locked band and the player's sense of "how much is in there" are the same size for the starter and for the most complex species; only the open part differs.

**The alternative the frame method already permits: a pan-genome, a shared trunk plus clan branches.** The **trunk** holds the loci any body can use: eyes, head, legs, feet, coat, markings, movement, stamina, Character. A **branch** holds loci that exist only in one clan: the glow's emission locus for the Fanalia, a top-only cap sheet with its own colour and spots for the Bonetia, a belly field and a crest leaf count for the Trebola (the gaps the three frames list). A species carries the trunk loci for the parts its plan has, plus its clan's branch. Everything else is **absent, not switched off**: the compositional contract already keeps these apart ("switched off" keeps copies that can wake; "unmodeled is not absence", `compositional-contract.md`). Within a species, a part that varies keeps its copies and can sleep (a plain brinquín's markings); across species, a part the plan never has has no locus at all. Absent parts are never drawn, researched, stamped or shown as "not yet". So a simple species is simpler in its genome, its Library page and its stamp, and a late one visibly has more chapters, bigger blocks and a bigger stamp.

**The three species under it** (counted by taxonomy.py from the frames; absent = owner switched off, presence switch off, or an older record nothing draws):

| | Today: pairs carried · open | Absent under the pan-genome | Trunk: locked · open | Clan branch: loci · open | **Genome · open** | Chapters |
| --- | --- | --- | --- | --- | --- | --- |
| Brinquín | 114 · 5 | 59 (wings, tail, ears, fur, fins, radial and second-region parts…) | 50 · 5 | 2 · 0 (cream belly, three leaves: both locked, Pip as approved) | **57 · 5** | 4 |
| Copolí | 114 · 20 | 67 (legs, snout, crown, ears, tail…) | 27 · 20 | 3 · 2 (cap on top, its colour, its spots) | **50 · 22** | 4 + sealed |
| Farolín | 114 · 38 | 46 (wings, ears, fur, fins…) | 30 · 38 | 3 · 2 (glow brightness, glow length, the tail-tip bulb) | **71 · 40** | 7 + Glow |
| Example A (Lanudín) | 114 · 21 | 57 | 36 · 21 | none yet | **57 · 21** | 4 |
| Example B (Remolí) | 114 · 30 | 50 | 34 · 30 | none yet | **64 · 30** | 6 + sealed |
| Example C (Petalú) | 114 · 35 | 51 | 28 · 35 | none yet | **63 · 35** | 6 + sealed |

The frame's size is how many parts a body has, so it doesn't grow in a straight line (a legless copolí has fewer parts than a brinquín). What grows with the player is the **open genome**: 5, 22, 40 pairs, and the stamp, the chapter arcs and the field guide follow it. The Library's frame plate shows only parts the species has, so a copolí's page has no legs section at all.

**What it costs.**
- **The catalogue grows by clan.** A new clan may bring branch loci, written by the genome engineer as catalogue records with their consumers (never by the LLM); each is a catalogue version, and saved mibis keep theirs (**Working rule**). A branch that later suits another clan is promoted to the trunk, a versioned move.
- **The frame registry carries per-clan loci:** each frame lists the trunk loci present and its branch; the codec already packs against a species' pinned definition (`codec-contract.md`), so the payload simply has no slots for absent loci.
- **Art:** the parts library is trunk parts per plan plus branch parts per clan (§7). The glow, the top cap and the belly are each drawn once, for their clan.
- **Breeding stays same-species**; nothing changes there, because a species already shares one frame. The field guide compares species only on trunk traits.
- **The stamp, an engineering note:** the stamp's 25-cell floor comes from the 64 signature bits reserved for the postmark (**Decided** 10-07). If the postmark takes space only when present, the brinquín's stamp can be 17×17 cells, so complexity reads at the low end too.

**Decided** (owner 10-07): **the trunk-and-branch pan-genome**. It is the same frame method with absent loci dropped instead of locked, it answers "the same genome for every species", and it makes the clan a genetic fact, not only a likeness. The three frames convert without changing a single open trait.

## 3. The generative taxonomy

Every level is **read off the locked frame**; none of them picks anatomy first. That keeps the owner's correction that classes emerge from the genome and are never construction templates (10-01), inside the decided established species (10-03).

| Level | What fixes it | In the catalogue (catalogue6) | V1 | Over time |
| --- | --- | --- | --- | --- |
| **Body plan** | The top switches: **segments** (1, 2 or 3 in a row, or a fan), **symmetry** (bilateral, radial), **limbs** (none; feelers in 1–3 groups of 1–2 links; 4 or 6 legs; with or without flaps), **covering** (skin, scales, fur). Always a head with eyes: a pet has a face | **510 plans**: 170 skeletons × 3 coverings. All 510 build at the default proportions ([census](taxonomy/plans.json)), so viability is a species matter (rule 6) | **16 plans**, 14 skeletons, 7 body rigs, 3 coverings | One new plan at most per drop; each needs its rig or limb set (§7) |
| **Clan** | A plan plus a **signature**: an **anchor colour** (1 of 10 body pigments, plus a second pigment on bilateral plans), a **covering finish** (fur length and sweep, scale size), a **defining feature** (snout, crown round or pointed, ears round or pointed, tail: 36 sets) | 10 anchors × 36 features × 1–4 finishes: **360 to 1,440 per plan**, six times that on bilateral plans with the second pigment | **16**, one per species | One or two per drop |
| **Species** | A clan member with its own frame: every other part fixed by its seed, its open traits by tier, its pool (the anchor and 1–3 neighbours on the colour wheel), a sealed chapter and its find | Each of about 50 drawn parts is fixed at one of 2–3 values or opened: **beyond 10^20 per clan**, so never the limit | **16** (**Decided**: a grid of 16) | 4 per seasonal drop |
| **Individual** | Its two copies at every open part | Brinquín 243 genotypes; copolí 2.3×10^10; farolín 4.8×10^20 | | |

**How a new species is generated, by rule.**
1. **Choose** a clan from the approved list, a tier and a seed. That is the only choice; the rest is rule.
2. **Fix.** Every part the clan's signature doesn't set is fixed by the seed, two equal copies: size class, proportions, feet, the other face parts.
3. **Open.** The tier sets how many traits: starter 5–6, early 7–10, mid 12–18, late 24–34 ("genomes grow with the player", **Decided** direction). Traits come from the shared vocabulary (§6), only those the plan can show (a look must be drawn, a doing's owner must be on), about two thirds looks. Colour is open from the early tier, with its pool.
4. **Seal.** A mid or late species may seal one doings chapter behind a find (**Decided** direction, owner 09-27: "rare findings gate access to more complex genomes").
5. **Derive** the pod (size, proportion, shell, colours), the glyph (the clan's two top rows and three seeded rows), the species number (clan · member), diet (by size: medium and large eat fruit), habitat (by covering and limbs), field ability (by the defining feature: wedge feet dig, fins swim) and the state machine (by plan).
6. **Check.** 200 random individuals must build, as in the frame checks. If one doesn't, the trait whose parts failed (big eyes on a small head) is locked for that species, or the seed moves on; a gene is never repaired (`genomic-contract.md`).
7. **Name and describe.** The LLM receives the **name brief**, locked facts only, and returns five name candidates by §5's pattern (each then goes through clearance), the tome's line and the field guide sentences. Each sentence must map to a frame fact, as the workbench's art brief maps every clause to a witness (`compositional-contract.md`), or it is dropped. It never adds a locus, a look or a power. This is the owner's "LLM and algorithmic generation" (09-27) with the genome as the authority.
8. **Sign off.** The art director accepts the type specimen assembled from the plan's parts library (**Decided**: engineers do not do art). Then the species ships as data, the same in every kit (**Decided**).

**How the player meets them.**
- **Biome.** Each species lives in 1–2 land templates by rule: skin at the pond edge and meadow, fur in meadow and wood, scales on rock field and wood, swimmers in ponds and fast water, diggers also in the cave. The prototype already agrees: brinquín meadow and pond, farolín wood and rock, copolí wood, meadow and pond (`prototypes/exploration`).
- **Rarity is the tier.** Starters are common where a new player starts, with no partner needed (**Decided**: a first-time player reaches all starter content). Mid species turn up in fewer cells. Late species sit behind the gates the map already has: the narrow hole (a digger), fast water (a swimmer, which V1 finally gives it), the deep "?" (a tier 2 Probe), Night (a glowing partner). So one species opens the way to the next.
- **Finds.** A sealed chapter is read only with its find, brought back from an expedition (the copolí's crystal, species-frames §3).

**The first 16** (**Decided** 10-07: 16, as different as possible, one plant and one spectral kind; the names and build order are still proposals). Every plan is one of the 510 that build ([examples.json](taxonomy/examples.json) `roster`, checked by the script); no two share a plan, and only two pairs share a skeleton, with a different covering. Tier sets rarity; gates are the map's own.

| # | Species | Plan | Clan | Moves | Covering | Habitat | Tier · gate |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Brinquín (frame *hopper*) | B1·L4 | Trebola | hops | skin | meadow, pond edge | starter |
| 2 | Lanudín (Example A) | B1·L4 | Algodina | grazes, trots | fur | meadow | starter |
| 3 | Copolí (frame *puffcap*) | R1·flaps | Sombrela | waddles | fur | wood, meadow, pond | early · Character sealed (crystal) |
| 4 | Orejolo | B2·L4 | Penacha | prowls | fur | wood, meadow | early |
| 5 | Puntilú | B2·feelers | Hormiguela | tiptoes on many feelers (insect-like) | skin | wood | early |
| 6 | Musguín | B3·none | Brumela | slides (a slug) | skin | pond edge, wood; out in fog banks | early |
| 7 | Farolín (frame *glowtail*) | B2·L4 | Fanalia | scurries, digs, glows | scales | wood, rock field | mid · opens narrow holes, Night |
| 8 | Bambolín | R1·rays | Borlela | wobbles on many short legs | fur | rock field | mid |
| 9 | Charquín | R1·feelers | Flotela | drifts, trailing feelers | skin | pond | mid |
| 10 | Petalú (Example C) | B3·L6·flaps | Volanta | flutters (insect-like) | skin | meadow | mid |
| 11 | Cavito | B3·L6 | Escarabela | crawls, digs (beetle-like) | scales | rock field, cave | mid · Deep ground |
| 12 | Remolí (Example B) | B3·fins | Aletia | swims | scales | pond, fast water | mid · opens fast water |
| 13 | Brisú | B1·L4·flaps | Planela | glides (bat-like) | fur | wood, rock field | late · Night |
| 14 | Arroyín | Bfan2·flaps | Ondela | glides underwater | skin | beyond fast water | late · needs a swimmer |
| 15 | Hojarín | Rfan2·rays | Verdela | walks on its roots (the plant) | skin | wood | late · sealed chapter |
| 16 | Relampín | Bfan3·none | Centela | floats on the storm, a wisp of charge (spectral, energy) | translucent skin | meadow, rock field, only in a storm | late · Charge sealed (storm-glass shard) |

**The spectral kind, Relampín** (owner 10-07: one ghost or energy creature in place of the second plant). **Body plan:** a bilateral fan of three (a head-root and two trailing streamers of two regions each), no limbs, no flaps, body wave on: it ripples like a ribbon of light. **What it is made of in the framework:** a translucent skin (the transparency draft, validated), the glow's emission locus (moved to the trunk, since the Fanalia need it too), and the first loci of the empty **fantastic physiology** domain: **charge** (how much storm Energy it holds), **phase** (how see-through it is, fading by day) and **pull** (how strongly it draws a strike). **Habits:** it eats Energy from struck stones, so it competes with the player; met only while a storm crosses; its field ability, as a partner, draws a stray strike to itself (a proposal, to balance with the Shield). **What the catalogue lacks:** 1 switch (a charged body) and 3 loci, plus the transparency draft and emission (below).

**Art cost.** Variety costs rigs, not species: the 16 need **16 plans** on **14 skeletons**, built from **7 body rigs** (one, two and three regions in a row; radial; two bilateral fans; a radial fan), **3 limb sets** (legs and rays, feelers, flaps) and the **3 coverings** the catalogue has. **Build order:** first **Brinquín, Lanudín, Copolí, Farolín, Orejolo** (three rigs, three coverings, all from frames that already build), so the Station has a living collection early and the first find, digger and Night partner exist; then Remolí, Petalú, Cavito, Puntilú (catalogue-ready, new rigs); then Bambolín, Charquín, Brisú, Arroyín; last Musguín, Hojarín, Relampín, which need the most new loci.

**What the catalogue lacks for the new kinds** (counts are new switches · new loci; what two clans need goes to the trunk, the rest are clan branches, §2):

| Kind | Species | Has today | Missing | New |
| --- | --- | --- | --- | --- |
| Fliers | Petalú, Brisú | flaps (span, chord, sweep), flap stroke and timing | flight itself (a behaviour consumer), flap markings, translucent flaps (the transparency draft) | 0 · 2 |
| Swimmers | Remolí, Arroyín, Charquín | body wave, flaps as fins, fin switch, span and steering (carried, not drawn) | consumers for the 3 fin records; translucency for the drifter | 0 · 0 |
| Insect-like | Petalú, Cavito, Puntilú | six legs, three regions, feelers | antennae (the crown stands in), wing cases (scales stand in) | 2 · 4 |
| Slug | Musguín | legless body with body wave, skin | eye stalks (the crown stands in), a foot skirt, sheen (surface texture has no consumer) | 1 · 2 |
| Sentient plant | Hojarín | a radial fan, rays as roots | leaves on its branches, a leaf covering and a root foot (2 new alleles), feeding on light (the uptake draft), no sentience locus | 1 · 3 |
| Spectral, energy | Relampín | a legless fan body with body wave | a charged body, charge, phase and pull (fantastic physiology); translucency (the draft); emission (moved to the trunk) | 1 · 3 |
| **Total** | | | plus 2 new alleles, consumers for 4 carried records and 2 drafts; every kind of movement still needs its behaviour layer | **5 · 14** |

**Seasonal drops** (**Decided**: about every three months). A drop is **4 species**: two cousins in existing clans (they reuse rigs and make clans readable), one new clan on an existing plan, and at most one new plan (one new rig or limb set). It ships as one signed content pack, the same for every kit: frames, names with their clearance rows, pools, habitats, pod and stamp parameters, and the art parts the art director signed off. The Station takes it over its Wi-Fi; a kit kept offline keeps its roster and catches up later. New species arrive at the next world turn, in their habitats, away from where the player just was (**Decided** arrival guard); saved mibis never change. The grid shows 16 a page, a new page about a year.

**Generated by rule:** Examples A, B and C are frames generated for Lanudín, Remolí and Petalú from clan, tier and seed only (10, 19 and 21 open traits; B's and C's first seeds failed the check and Eyes, then Head, were locked); all built 200 of 200.

![The taxonomy: plans, clans, species and individuals, with the three frames and three generated examples](taxonomy/taxonomy.svg)

*Each box is read off the frame below it. Dashed: later members of a clan, made by the same rule. Numbers from taxonomy.py and the species frames.*

## 4. Relatedness the player can see

| Level | What members share, visibly | Where the player sees it |
| --- | --- | --- |
| **Species** | Everything locked: silhouette, face parts, finish, size; the whole pod (size, proportion, shell, colour pair, glyph); the whole stamp border and glyph; one page | Pod list, the vivarium, the stamp, the Library page |
| **Clan** | The defining feature, drawn with the **same part** (one crest, one pair of ears), and the anchor colour; pods share the **shell pattern** and the anchor tint; stamps share the **clan half of the border** and the glyph's two top rows | The Library shelves species **by clan**, a clan plate above its pages (the botanical tome, **Decided** vibe); pods side by side in the list |
| **Plan** | How the body is built and how it moves | A section of the tome; the animation set |
| **Trait vocabulary** | "Big, wide eyes" is the same picture in every species that opens Eyes | Field guide pages, Create, the forecast |

**What crosses and what doesn't.** Within a species, every heritable copy crosses, looks and doings alike, and sleeping looks can wake in a child. Across species, nothing does, even within a clan: a clan is a resemblance, never a breeding group. Locked parts never cross, and knowing a look never puts it into a pod (**Decided**). The Cross screen lists only adults of the same species, and the Library never draws a lineage line between two species, so the clan's likeness can't read as a promise. The species border on the stamp is the rule made visible: same border, may cross; same clan half only, cousins.

**Not yet met** (**Decided**, owner 10-07): the Library shows clans and species the player hasn't met as hidden silhouettes in their places on the shelf, so the size of the world shows without giving it away.

**Compare, on any living mibi** (owner 10-07: cousins differ by their expressions, and a living mibi can be compared with siblings, relatives and other species). A brief, not a screen: from a mibi, pick **siblings** (same two parents), **relatives** (along its lineage), **any member of its species**, or **any other species**. Chapters and traits line up through the shared vocabulary (§6): the same trait shows both pictures side by side and the differences pulse; a trait the other species doesn't have reads **not in this species** (absent under §2), an unread one **not read yet**, a sealed one **sealed**. Doings such as pace and curiosity compare once read. It is free and changes nothing. It extends research-loop §8's Compare row from pods to living mibis and across species, and the Library's species pages compare on trunk traits. Two of the owner's examples have no locus yet: eye colour (§6) and intelligence (Character holds only curiosity and nerve).

## 5. Naming

**A clean room** (owner, 10-07; the clean-room system stands, and "combination of words" was meant for the product name). Taxonomy, names, descriptions and art come from our own rules and vocabulary (§3, §6), never from or in the style of another franchise's bestiary. The frames' *hopper*, *puffcap* and *glowtail* are withdrawn (an enemy or creature in Metroid, Drawn to Life and The Elder Scrolls; a Legends of Runeterra card; an ARK creature) and stay only as file ids; the renames to confirm are **brinquín**, **copolí** and **farolín**.

- **The pattern to avoid:** two English words, a look plus a body part (glow+tail, puff+cap, flame+wing), the stock pattern of Pokémon, ARK, Runeterra and others.
- **The pattern we use: one name for both markets**, a **Spanish root** for a locked fact (a look, a habit or a habitat) and a **playful ending** (-ín, -í, -ú, -olo). Two or three syllables, sounds a child says in both languages (no *ñ*, *ll* or *th*; a Spanish *j*, as in *Orejolo*, is said as in *jalapeño*, and *qu*, as in *Brinquín*, as in *mosquito*); written with its accent, *Brinquin* where accents can't go.
- **Clans:** an invented root ending in -a, the same in both languages (*the Trebola clan* / *clan Trebola*). The clan is also the genus of a **playful binomial** on the tome page only: *Trebola saltans* (brinquín), *Sombrela lanata* (copolí), *Fanalia lucens* (farolín).
- **Individuals:** the owner names a pet. A new mibi starts with a short name from a bilingual list (Coco, Mora, Kiwi, Nube, Moss, Fig), drawn from its creation, never from its genome; Pip stays the reference art's name. A wild mibi is "a brinquín". The short code (`G7F · CD0 · 3H2`, **Decided**) is the lookup.
- **Rules.** (1) **No gene leaks:** a root names only what every member has, never an open trait's look, and no colour unless it is locked. (2) **The root must fit, read the Mexican way** (owner 10-07: "zacate is grass, so zacatín suggests something related to grass"): its everyday meaning and its slang in Mexico must point at the species' look, habit or habitat, never at something else; a native speaker from Mexico reads every name before it ships. (3) **No collisions:** unique; no species name inside another; at least three letters apart; a clan never shares a species' root. (4) **Clearance, a Working rule:** every candidate is searched on the web before a person sees it ("*name* creature", "monster", "game", "Pokémon", "species", "toy", "brand") and is rejected if it is, or sounds like, an existing creature, character, item, card or brand; the search, its result and the verdict are recorded per name. (5) The namer proposes five per species, a person picks from those that cleared, and a shipped name never changes.

**The 16 species and their clans.** Each name searched on 2026-10-07 with **A** "*name*" creature OR monster OR game OR character OR toy and **B** "*name*" Pokémon OR brand OR species OR mascot; one name serves both markets, so each row is the English and the Spanish check.

| Species | Root: Spanish, English | Why it fits | Clan | Root: Spanish, English | Why it fits | A, B result | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Brinquín | *brinco*, a hop | it hops (Pip's species) | Trebola | *trébol*, clover | the three-leaf crest | both: none | cleared |
| Lanudín | *lanudo*, woolly | the woolly grazer (*lana* is also slang for money: a friendly double meaning) | Algodina | *algodón*, cotton | soft fur | both: none | cleared |
| Copolí | *copo*, a tuft or flake | a ball of fluff | Sombrela | *sombrilla*, parasol | the cap of flaps | both: none | cleared |
| Orejolo | *oreja*, ear | big pointed ears | Penacha | *penacho*, plume or crest | the tuft on its head | both: none | cleared |
| Puntilú | *de puntillas*, on tiptoe | walks on fine feelers | Hormiguela | *hormiga*, ant (*hormiguero*, anthill) | many small legs | both: none | cleared |
| Musguín | *musgo*, moss | eats moss | Brumela | *bruma*, haze | comes out in fog banks | both: none (Brumak, Gears of War, offered as near) | cleared |
| Farolín | *farol*, *farolito*, lantern | the glow at dusk | Fanalia | *fanal*, lamp | the lit tail | both: none | cleared |
| Bambolín | *bambolear*, to sway | wobbles on many legs | Borlela | *borla*, pompom or tassel | a fuzzy round body | both: none | cleared |
| Charquín | *charco*, puddle | drifts in ponds | Flotela | *flotar*, to float | it floats | both: none (Flotzo, Kirby, offered as near) | cleared |
| Petalú | *pétalo*, petal | petal-shaped flaps | Volanta | *volar*, to fly | it flutters | both: none | cleared |
| Cavito | *cavar*, to dig | digs | Escarabela | *escarabajo*, beetle | plated, six-legged | both: none | cleared |
| Remolí | *remolino*, whirlpool | swims in fast water | Aletia | *aleta*, fin | its fins | both: none | cleared |
| Brisú | *brisa*, breeze | glides on it | Planela | *planear*, to glide | its flaps | both: none | cleared |
| Arroyín | *arroyo*, brook | lives in streams | Ondela | *onda*, wave | it glides in waves | both: none | cleared |
| Hojarín | *hoja*, leaf | a plant of leaves | Verdela | *verde*, green | the plant clan | both: none | cleared |
| Relampín | *relámpago*, lightning | born of the storm | Centela | *centella*, flash or spark | a body of charge (*centella asiática* is also a skin-care herb) | both: none (Centella, a plant genus) | cleared |

Cleared spares: Escobín, Sigilín, Solerín, and Nenufí and Lirela (the second plant, cut).

**Withdrawn because the root reads wrong in Mexico:** *Zacatín* (*zacate*, grass, also a scrubbing sponge), *Ocotín* (*ocote*, resinous kindling, not a glow), *Lanolí* (reads as *lanolina*, a cosmetic), *Tambolo* (*tambo*, a barrel or slang for jail), *Felpina* (*felpar*, slang for to die), *Erizola* (*erizo*, slang for broke or craving), *Zancola* (*zancudo*, mosquito), *Limacela* (*limaco* is Spain's word; reads as *lima*), *Caparela* (reads as *Caperucita*), *Bonetia* (*bonete*, a clergy cap or a tree's fruit), *Brotela* (*brote*, also an outbreak), *Raicela* (reads as *raicilla*, an agave spirit), *Antenela* and *Rociela* (read as the given names Antonela and Rocío), *Bigotela* (whiskers the catalogue can't draw yet).

**Rejected by the search** (and the [name screen](name-screen.md) for the first draft):

| Name | Result | Verdict |
| --- | --- | --- |
| glowtail, puffcap, hopper | ARK creature; Legends of Runeterra card; Metroid, Drawn to Life, Elder Scrolls creatures | rejected |
| Bellcap, Tunneler, Splasher (first draft) | Dragon Quest item; Fallout and Bionicle creatures; a game title (name screen) | rejected |
| Pompilú · Campanú · Orelú · Peluchín · Tulín · Flechú · Gorrela | near Pompompurin (Sanrio) · Campanilla and Campanella · Oruro, a Toho figure · a Pokémon game character's Spanish name · a Zelda character · Fletchling (Pokémon) · Gorellina capsule toys | rejected |
| Corazela · Babela · Raizola · Florela · Nimbela (clans) | Corazon Marikit (Monster High) · Babylla (Godzilla game) · Raizo (anime) · Floette, Floragato (Pokémon) · Nimbus (Ninjago) | rejected |
| Pomcap; Gleamtip, Wicktail, Tuftbonnet (name screen's candidates) | Pombon (Pokémon), Pombomb (Cassette Beasts); the other three clear but use the avoided pattern | rejected; not recommended |

Of sixty-nine names searched, thirteen failed the search and fifteen were withdrawn for meaning: the namer always offers spares.

**The temperament chapter's name.** *Nature* is Pokémon's per-individual stat modifier, and the owner is not sure about *Ways*. Three single words that work in both languages, each searched as a Pokémon term: **Character / Carácter** (short, every child knows it in both languages; Pokémon has a "Characteristic" on its summary screen, a different word); **Temperament / Temperamento** (the exact meaning, but long on a chapter tab, and Spanish Pokémon names an ability *Temperamental*); **Humor / Humor** (spelled the same, and Spanish *humor* is mood, but an English-speaking child reads "funny"). *Recommended: Character / Carácter*; this document uses it. The research docs' *misty seed* (an exact Pokémon item) becomes the **sleeping bud** (searched: no item).

## 6. Traits as a vocabulary

One list of traits for every species, so the Library's field guide and the generated sprites use **one parts library**: a look's picture in the field guide is that part drawn at that value. A species shows a **subset**: the traits its plan can draw, minus what its frame fixes (brinquín 5, copolí 12, farolín 23). Counts are from catalogue6: looks per trait are the pictures the field guide can show (both copies, as species-frames §5 counts them).

| Chapter | Traits (looks each) | Traits · loci · looks | Catalogue gaps it needs |
| --- | --- | --- | --- |
| **Coat** | Colour (55: 10 pigments and their pairs), Second colour (21), Markings (17: plain, bands, spots, both, with size, angle, contrast), Fluff (6), Scales (6) | 5 · 12 · 105 | a **belly field** (Pip's cream belly); colour and markings on flaps (the copolí's cap); fur on head, ears and tail; feathers; ridged skin (carried, not drawn); transparency (draft) |
| **Face** | Eyes (6: size, spacing), Snout (8), Crown (7: round or pointed, height), Ears (7), Head (15) | 5 · 15 · 43 | **eye colour** (Pip's orange eyes; eye rings ride on eye size); a crown count (Pip's third leaf); mouth and expressions; whiskers and antennae on the head |
| **Shape** | Size (6), Build (6), Roundness (6), Body (3: egg, barrel, pear), Hind body (3), Back line (3), Waist and spread (6), Flaps (9) | 8 · 13 · 42 | a **single sheet on top** (the copolí's cap sits only on top); the posterior region (carried, not drawn); shells |
| **Legs & tail** | Legs (15), Feet (15: round, pads, digging wedges), Feelers (9), Tail (8), Tail curl (3) | 5 · 13 · 50 | **a bulb at the tail tip** (the farolín's lamp); toes and paws; a tuft |
| **Movement** | Pace, Turning (3 each), Stride, Weave, Flap (6 each) | 5 · 8 · 24 | burst recruitment (draft; Pip's drive rides on pace); fin steering (carried, no consumer) |
| **Stamina** | Strength, Reserve, Thrift (3 each) | 3 · 3 · 9 | recovery, uptake, rest (drafts): diet as a trait |
| **Character** | Curiosity, Nerve (3 each) | 2 · 2 · 6 | more tendencies to weight a state machine (play, company, appetite) |
| **Signature** | one per species, after Character | | **Glow** needs an **emission locus**, the first gap to close |
| **Total** | | **33 · 66 · 279** | domains with no loci: maintenance, affinities (habitat as a gene), reproduction, fantastic physiology |

The other 24 loci are older records no construction draws yet (body length, joint range, fin span…); they are locked today and absent under §2 until a consumer exists. Every gap above is listed in the frames' `notYet.pending`, so the genome engineer's order is the art's order: emission, eye pigment, burst, dorsal sheet, belly field, flap colour (species-frames §7).

## 7. What art needs from taxonomy

A brief, not art. Every item is mastered by the art director once and assembled by rule; a species is an assembly, never a drawing (**Decided**: no per-creature art, engineers do not do art).

- **Creature renderer** (Miniature Lives, **Decided**: HiBit at 280×300 on the Companion, the matched richer treatment at 300×310 on the Station, plus the 48 px creature in the world). For the first 16: **7 body rigs**, **3 limb sets** and **3 coverings** (§3), and **per clan** its branch parts (the cap on top, the belly field, the plant's leaves, the spectral body's translucent glow): the body regions in three forms (egg, barrel, pear) and two sections (round, rounded square; radial round); heads in three sizes; the face set (eyes by size and spacing, snout, crown round or pointed by height, ears round or pointed by length); limbs (legs by drop and girth, three feet, feelers of one or two links, flaps by span, chord and sweep); the tail by length, width and curl. **Shared by all plans:** the three coverings as materials (fur by length and sweep, scales by size and extent, skin), the marking masks, the 16 pigments ramped per the UI kit. **Per plan, an animation set** from its state machine: idle, move (hop, waddle, scurry, swim, flutter), the four bubbles (! ? fruit …), eat, settle, flee, sleep, shed; and four life stages that keep identity, with a calm, dignified elder (**Decided** 10-07).
- **Pod renderer, per clan** (**Decided**: one renderer, species parameters): the shell pattern comes from the plan (segments for radial, soft ribs for fur, plates for scales, smooth dots for skin) and the **anchor tint from the clan**; the second tint, size, proportion and glyph from the species; the dust of its place per pod.
- **Stamp border families** (**Decided**: the stamp, its species border and glyph): the border spells the species number, so its first half (the clan) repeats across a clan like a stamp series, and its second half (the member) completes the species. The glyph's two top rows are the clan's feature. The stamp's builders own the encoding; this is the brief.
- **Tome page template, per clan** (the Library as a botanical tome, **Decided** vibe): a clan plate (the feature part drawn large, the anchor colour, the plan's silhouette, the genus); then a page per species: the pressed type specimen, the name and binomial, its places as stamps, the chapter pages with the vocabulary's pictures and a dotted "more?", lineage as a branch, wishes. Shelf spines in the clan's anchor colour.

## 8. What this changes

- **The catalogue and the frame registry** (**Decided**): loci split into trunk and clan branches; a frame lists the trunk loci it has and its branch, and drops absent ones instead of locking them; the codec packs only those. Emission goes to the trunk (two clans need it); the first branch loci are the top cap sheet and the belly field.
- **`creatures-and-genomics.md`:** "Open: how many species there are" becomes the four levels and their rules, with V1's 16 (**Decided**); naming rules join Identity, with the clean room and the name clearance as **Working rules**. Its Identity section still describes the retired ring; it should say the stamp (**Decided** 10-07).
- **`species-frames.md` and the frame schema:** a `taxonomy` header (plan code, clan, species number as clan · member, name, binomial, clearance record, diet, habitat, ability, state machine); the glyph rule (clan rows over species rows); the pod colour pair as the clan anchor plus one pool neighbour (the three frames already fit: charcoal, coral, lagoon). The files' names *hopper*, *puffcap* and *glowtail* are replaced (§5). Temperament shows as **Character**, not Nature (§5).
- **`research-loop.md`:** §6, pods share a shell pattern and anchor tint per clan; §8's Compare row covers living mibis and other species (§4); the *misty seed* becomes the *sleeping bud* (§5).
- **Station screens:** the 16-species grid (**Decided**) and the Library's hidden silhouettes (**Decided**) in `station-screens.md` and the style guide; drops add a page.
- **The genome stamp:** the 12-bit species field read as clan (7 bits, 128 clans) and member (5 bits, 32 species); the prototype's species 11, 12, 13 become 1·1, 2·1, 3·1. Proposed to the stamp's builders; nothing under `prototypes/` changes here.
- **`world-and-exploration.md`:** habitats and diets per species by rule; the swimmer gate gets its species (Remolí); Night has its glowing partner (Farolín); Deep ground gets Cavito; storm passes get Relampín.
- **`design/style-guide/station-screens.md`, Library:** the shelf groups by clan, a clan plate over its species.
- **The website** keeps "families" for kin; "clan" never appears there until the game uses it.

## 9. Decisions for the owner

**Decided** by the owner on 10-07, one line each: the growing genome (§2); the four levels (§3); one roster for every kit; **16 species in V1** as a Station grid with **seasonal drops** about every three months; the first 16 **as different as possible**, one of each kind, with one plant and one spectral creature; **hidden silhouettes**; **Compare** on living mibis; the **clean-room naming**.

1. **Relampín as the spectral kind** (§3): a bilateral fan of three, legless, translucent and glowing, the first loci of fantastic physiology (charge, phase, pull), eating Energy from struck stones and met only in storms. *Recommended.*
2. **The names, read the Mexican way** (§5): **brinquín**, **copolí** and **farolín** for the three frames, and the 16 species and 16 clan names, each with its root, meaning and clearance; a native speaker from Mexico reads them before they ship. *Recommended.*
3. **The temperament chapter is called Character / Carácter** (§5), over Temperament and Humor. *Recommended.*
4. **The build order and the drop shape** (§3): Brinquín, Lanudín, Copolí, Farolín and Orejolo first; drops of 4 (two cousins, one new clan, at most one new plan). *Recommended.*

**Three questions to open the discussion.**
- Do drops need the Station's Wi-Fi, or should a kit kept offline also get them some other way (a card, the Caddy)?
- Should a new season's species turn up only in its season at first, as a reason to go out, or stay for good from the day it arrives?
- Is intelligence a trait you want players to breed for in V1? It needs a cognition locus the catalogue doesn't have (Character holds curiosity and nerve).

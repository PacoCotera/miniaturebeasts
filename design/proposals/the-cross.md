# The cross: how two mibis make a child

**Proposal** from game design with the genome engineer, 2026-10-08. It gives the minimal cross of the approved [research loop](research-loop.md) (§5, decision 5) its rules, on the [species frames](species-frames.md) and the [taxonomy](taxonomy.md) (§2 trunk and branch, §4 same-species breeding). **Decided** marks owner decisions restated here; everything else is **Proposal**. Numbers are illustrations unless marked.

**Decided 2026-10-08:** continuous loci **blend** (the child sits between its parents with a small spread); switch loci are **Mendelian** (a dominant copy shows, a recessive one hides, sleeping looks can wake); inheritance is **independent per trait**, because this is a breeding game; **mutation is not in the first build** and may come later as an event during incubation, breeding or exploration; mibis will **age and die**, but not today; **the more removed the parents' genomes, the better the cross**, and **inbreeding inflicts a penalty**, whose form is still to be designed (§5, decision 1).

## 1. The rules, per kind of part

A cross takes two adults of one species and makes one child, a new individual with real parents (**Decided**). Every heritable locus is crossed on its own, with no linkage between traits, and nothing else is.

| Kind of part | Rule |
| --- | --- |
| **Switch locus** (a part switch, a pair map, a pigment) | Two copies. The child takes **one copy from each parent, at random**. Which look shows follows the catalogue's own mark for that locus: a dominant switch shows with one `on` copy (the Loika's crown), a recessive one only with two (markings); a pair map shows the copy its order ranks first; a pigment pair shows both side by side. The other copy **hides**, and the child can pass it on. Independent assortment: every locus draws on its own |
| **Sleeping parts** (the five marking loci behind the marking switch) | Crossed like any switch locus, copy by copy, whether or not their switch is on in the parent. They **ride with their switch**: a plain parent still hands down a layout, an extent, a scale, an orientation and a contrast, and a child whose switch comes on wakes them. Two plain Tuikis can have a striped child wearing stripes neither parent showed |
| **Continuous locus** (every ratio and rate) | Each parent contributes one copy. The child's **shown value** is drawn **between the two parents' shown values**, then moved by a **spread**: a random nudge of up to **10 percent of the locus range** either way (eye size runs 0.24–0.32, so the nudge is at most 0.008; glow 0.4–1.0, at most 0.06). The result is **clamped to the catalogue range** and to the species pool. **The hidden copy is the same value:** a blend has nothing to hide, so the child's two copies are equal, and the ring draws its two tracks alike at that spoke. This is the simplest reading of the decision; the alternative, one copy nudged from each parent with the mean shown, keeps the two tracks different but makes the child's shown value sit at the parents' midpoint, which is not what was decided |
| **Allele pool** | The child's copies come **only from the parents' copies**. An Untuva whose parents are coral and plum is never marigold, though marigold is in the species pool. A blended value is clamped to the pool's ends |
| **Locked part** | **Identical in both parents, never crossed.** The child takes the frame's pair. A parent whose locked pair differs is not this species, and the pair is refused (§3) |
| **Sealed chapter** | Its loci are **inherited and act from birth**, by the rules above. They are **unreadable until the find**: the child's ring keeps the notch, and the forecast shows the chapter shut, with no seeds |

Mutation has no place in these rules today. When it comes, it is an **event** with its own picture (a flicker in the incubator, a strange pod, a storm), never a hidden roll inside a cross, so a surprise look always has a story the player saw (**Decided** direction).

Continuous copies are a change for the workbench: today a ratio is two named alleles blended by `copy-mean` (`small` 0.24, `large` 0.32), so a copy is a word. Under blending a copy is a **number in the locus range**, and the catalogue's named alleles become the **bins** the player sees as looks (*thin rings · between · wide pale rings*), as species-frames §1 already treats them. A pod's wild copies are still drawn from the pool's named values.

## 2. The forecast

The Cross screen shows, per trait, **four seed pictures** (research-loop §5): quarters, never percentages, and never a promise.

- **Switches.** For one locus, the Station lays the mother's two copies against the father's two: four pairings, one seed each, resolved by the locus's rule. A dominant crown, `on/off` against `off/off`, gives two crested seeds and two bare. For a trait of several switch loci (markings and its sleeping parts), the seeds are the four pairings of the switch; what each seed wears comes from the sleeping copies that would wake in it. Only the switch is forecast, and the sleeping parts are shown as the sleeping bud on the seeds that hide them.
- **Blends.** No seeds. The trait's picture is drawn **twice, at the two ends of the range the child can land in** (the parents' shown values, widened by the spread and clamped), with the stretch between them shaded: a **range picture**, not a number. A narrow stretch reads as "the child will look like both of them"; a wide one as "anywhere from thin to wide rings". Where the two ends fall in the same bin, one picture, firm.
- **Doings** forecast the same way, with the vocabulary's pictures (a running mibi, a resting one), since a doing's looks are already pictures.
- **Sealed chapters** show shut. **Known for sure** (both parents the same at every locus of the trait) draws one firm seed, which is also what the child will show as known before any read (research-loop §4): a blended trait is never known for sure until read, because of the spread.

The detail view, free and one press away, may show the quarters as counts and the range as two values, for parents who want it; the child-facing view never does.

## 3. Viability and eligibility

The child is **validated whole**, built by the rig against its frame before anything is spent, as every founder is (**Decided:** every offspring is viable). A child that cannot be built never exists; the cross is not re-rolled, the Cross screen marks the clashing traits and offers no Grow button, as Create does for a shape that won't grow. With one draw per trait, most pairs give a buildable child nearly always; the frame checks (200 random individuals from the pools, all built) say which species need watching.

**Ineligible pairs are refused before cost**, on the pick itself, with no seeds drawn:

| Refused | Why |
| --- | --- |
| **Different species** | Only members of one frame share the locked pair at every locus, so a cross of two frames has no frame to be valid against (taxonomy §4). The Cross screen lists only members of the first pick's species; a clan is a resemblance, not a breeding group |
| **The same individual** | One mibi is not a pair. Its disc greys when it is the first pick |
| **Not adult** | A juvenile or an elder of the four life stages is not shown as a pick. Ageing and death come later; until then a mibi is adult from the end of its juvenile stage and stays so |

A mibi out with the Companion as the partner is away, not ineligible: it shows in its place, dimmed, and comes back.

## 4. Relatedness

"The more removed, the better" needs a measure of how removed two genomes are. Two candidates:

| Measure | How it is computed | Needs | Strength | Weakness |
| --- | --- | --- | --- | --- |
| **Pedigree kinship** | From the save's recorded parents (the `parents` field proposed in [family-tree](family-tree.md) §1, parked). The usual coefficient: a wild founder is unrelated to every other founder (**kinship 0**); parent and child 1/4; full siblings 1/4; half siblings 1/8; first cousins 1/16; a mibi with itself 1/2. Walked over the recorded tree, three generations deep is enough | The parents field in the save from the first cross on, since kinship cannot be recovered later | Exact, cheap, independent of how many loci a species opens; wild founders count as unrelated by construction | Unknown for a traded mibi without a lineage record, or for a parent lost before the field existed |
| **Genome identity** | The fraction of heritable loci at which the two carry the same copy pair (a blend counts as the same when both values fall in one bin) | Only the two genomes | Works on any two mibis, traded or not; it is what the stamp overlay already shows (research-loop §7) | Coarse on a starter: a Loika has 5 open loci, so two wild founders match at 2 of 5 by chance; it mistakes convergence for kin, and it reads a line bred toward a wish as inbred because it is |

**Recommended: pedigree kinship, with identity as the fallback.** Kinship is the measure wherever the tree is recorded; where a parent is unknown (a crate from a trade, a founder from before the field), that side counts as a wild founder, and the Station then shows identity in the overlay as a caution, with no penalty from it. This needs the parents field now, which unparks that one line of the family tree and nothing else.

## 5. The inbreeding penalty

Three candidate forms. Each is worked on the same two pairs of Loikas: **two wild founders** (kinship 0) and **two full siblings** of one cross (kinship 1/4). Each must show without words or numbers.

| Form | Rule | Founders (0) | Siblings (1/4) | Shown to the player |
| --- | --- | --- | --- | --- |
| **A. The line stops moving** | The blend's spread shrinks with kinship: spread = 10 percent × (1 − 4 × kinship), and the draw leans toward the parents' midpoint | Drive drawn between 0.9 and 1.3, nudged up to ±0.08 | Drawn at the midpoint, 1.1, with no nudge: the child is the average of its parents, and a line bred brother to sister never gets past the best it has | The range picture narrows to a sliver sitting on the parents' two marks; the two parents' stamps, overlaid on the pick, light the spokes they share |
| **B. What hides, surfaces** | At each switch locus where the child would carry one hidden copy, with chance 2 × kinship it takes that hidden copy twice instead. Sleeping parts wake with their switch | Markings `off/on` × `off/on`: one in four pale | Half of the carrier outcomes turn pale: about two in four pale, and as often a bare head where the crest would have shown. Good and bad surface alike | More of the four seeds show the hidden look, and the sleeping bud opens on them; the child's ring has more matched spokes than its parents' |
| **C. Weaker doings** | Each doing's shown value moves toward its weak end by a fraction equal to the kinship, after the blend. The genes are unchanged; the body is | Efficiency as drawn | Efficiency drawn at 0.75 loses a quarter of its distance to 0.6, landing near 0.71; drive and reserve likewise: the child tires sooner and runs slower than either parent | The doings' seeds droop (a resting posture, a slower stride); in the vivarium the child visibly tires first. Nothing on the ring, since nothing in the genes changed |

**Recommended: B, with A as its second half.** B is genetic and heritable, it is the lesson in one picture (a close cross brings out what the parents hide, the lovely and the ugly), and it is the same mechanism the game already teaches: sleeping looks can wake. A makes the long-term cost real for breeders chasing a wish: a closed line can only average itself, so new wild pods stay worth bringing home. C is the truest to life and the least fair: it punishes the mibi, not the breeder, and the child has done nothing. If the owner wants it, it belongs with ageing, as a shorter life, not a weaker one.

## 6. Worked examples

**A Loika cross: Pip's five traits.** Pip (plain · hides pale; crest · hides bare; rings 0.28; drive 0.9; efficiency 0.8) and Moss, a wild founder (plain · hides pale; bare · only bare; rings 0.25; drive 1.3; efficiency 0.7). Kinship 0, so no penalty.

| Trait | Locus · rule | Pip × Moss | Forecast |
| --- | --- | --- | --- |
| Markings | marking switch · recessive | `off/on` × `off/on` | 1 in 4 pale patches (`on/on`), 3 in 4 plain, 2 of them hiding pale |
| Crown | crown presence · dominant | `on/off` × `off/off` | 2 in 4 leaf crest (hiding bare), 2 in 4 bare head, only bare |
| Eye rings | eye size · blend, range 0.24–0.32, spread 0.008 | shown 0.28 and 0.25 | range picture 0.242–0.288: thin rings to between |
| Drive | cycle rate · blend, 0.6–1.4, spread 0.08 | 0.9 and 1.3 | 0.82–1.38: between to bursts |
| Efficiency | action efficiency · blend, 0.6–1.0, spread 0.04 | 0.8 and 0.7 | 0.66–0.84: thrifty to between |

The child's ring: at the two switch spokes one mark from each parent; at the three blended spokes two equal marks, between the parents'. Known before any read: nothing, since every trait differs between the parents; read Coat and Face to settle the switches, and the blends settle to a bin on reading.

**A Tuikis cross with the glow blended.** Ember (bright 0.9, all evening 0.8; lagoon; plain, hides stripes) and Dusk (0.55, 0.4; lagoon and jade; plain, hides stripes). Glow is a doing on its own chapter (species-frames decision 1).

| Trait | Rule | Ember × Dusk | Forecast |
| --- | --- | --- | --- |
| Glow | emission brightness · blend, 0.4–1.0, spread 0.06 | 0.9 and 0.55 | 0.49–0.96: between to bright |
| Glow length | emission length · blend, 0.3–1.0, spread 0.07 | 0.8 and 0.4 | 0.33–0.87: a flicker to all evening |
| Colour | pigment pair · both show | `lagoon/lagoon` × `lagoon/jade` | 2 in 4 lagoon, 2 in 4 lagoon and jade |
| Markings | switch · recessive, with five sleeping parts | `off/on` × `off/on` | 1 in 4 striped: the stripes' layout, extent, scale, angle and contrast come from the sleeping copies, one from each parent, which neither parent ever wore |

Breed the brightest child back to Ember and kinship is 1/4: under A the glow stops at their average, under B the hidden `on` surfaces in half the carriers, so stripes and the dim end of anything hidden come out together.

## 7. What must be built

**The workbench** (`prototypes/workbench/framework/species.mjs`, where `crossIndividuals` today picks one named copy from each parent at every open locus):
- continuous copies as numbers, with the named alleles as bins and the pool as a range;
- a **kinship-aware cross**: `cross(frame, a, b, {spread, penalty, kinship, rng})`, with a pedigree record per genome (`origin.parents` already holds the digests) and a kinship walk over it;
- **N children** from one pair, with the distribution of looks per trait against the forecast's quarters and range, to see that the quarters are honest;
- **dials**: the spread (0–25 percent), the penalty form (none, A, B, C, A+B) and its strength, so the three forms can be looked at side by side on the same pairs;
- the whole-genome check on every child, counting rejections per species.

**The first Station build:** the Cross screen with its pick, eligibility refusals and the four-seed and range-picture forecast; the cross itself with blending and independent assortment; the **parents field in the save** from the first cross, because kinship cannot be recovered later; the stamp overlay on the pick, with shared spokes lit, as the relatedness picture. The penalty ships as soon as its form is decided, which can be after the screen, but not after the first saved cross.

## 8. Decisions for the owner

1. **The penalty's form.** *Recommended:* **B, what hides surfaces, with A, the narrowing spread, as its second half.** C is set aside for ageing, as a shorter life.
2. **Relatedness.** *Recommended:* **pedigree kinship** from the save's parents field, with genome identity as the fallback where a parent is unknown and as the picture in the stamp overlay. This unparks the parents field of the family tree, and nothing else of it.
3. **The blended child's two copies.** *Recommended:* **both equal to the drawn value**, so a blend hides nothing and the ring's two tracks match at that spoke. The alternative keeps one nudged copy per parent and shows their mean, which keeps the tracks different and pins the child near the midpoint.

**What this changes once decided:** research-loop §7 and family-tree §1, where a child "shares one of each parent's two marks at every spoke" and the stamp verifies lineage at 100 percent, hold for switches only; at a blended spoke the child's marks sit between its parents', and the stamp check becomes a range check there. Research-loop §4's "known where both parents' copies were the same" holds for switches; a blended trait is known only when read. Taxonomy §3's genotype counts per species (a Loika's 243) become counts of bins. `species.mjs` `crossIndividuals` and the frame checks take continuous copies.

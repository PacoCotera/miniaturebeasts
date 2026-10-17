# T-200: the Loika's new looks (the game designer's part: rarity, inheritance, the guide and the pursuit)

Game designer, 2026-10-17. It uses only the framework's existing operators:
- dominant-enable and recessive-enable for switches;
- a dominance order (pair-map) between looks;
- copy-mean for blends.

Pods draw each copy evenly from the pool (`podGenome`), so **a look's rarity comes from its dominance, not from a weight.** That is honest: a rare look is rare because it hides, and it can be bred for. The genome engineer owns the loci, the frame version and the distinctness figure. Colour names and painting are the art director's.

## The looks, their rarity and how they inherit

| Trait (chapter) | Looks | Inheritance | Share on pods (two copies drawn evenly) | Why |
| --- | --- | --- | --- | --- |
| **Colour** (Coat), a new heritable body palette | three body colours: the wild colour (today's charcoal), a second, a third. The art director names and paints them | dominance order: wild > second > third | wild 56%, second 33%, third **11%** | Three steps of rarity from one locus: common, uncommon and rare. The rare one shows only when both copies carry it, so it is a real breeding goal, and 56% of pods carry it hidden |
| **Markings** (Coat), today's switch | plain, marked | **dominant** (marked wins), changed from today's recessive | marked 75%, plain **25%** | Most Loikas now wear marks, so households differ at a glance. Plain becomes the look to breed for |
| **Mark pattern** (Coat), today's locked layout made heritable | patches (today's), spots, stripes | dominance order: patches > spots > stripes | among marked Loikas: patches 56%, spots 33%, stripes **11%** | The owner's "coat marks can be different between individuals". The pattern shows only on a marked Loika. On a plain one it is carried, hidden, and can surface in its children |
| Crest (Face), unchanged | leaf crest, bare head | dominant (crest) | crest 75%, bare 25% | — |
| Eyes (Face), unchanged | thin rings, between, wide pale rings | blend | 27% / 46% / 27% | — |

**Dominance orders, not co-dominance,** for Colour and pattern. A co-dominant pair shows both looks at once ("two side by side"). That doubles the painting, and the word hides which two are shown. Dominance keeps one painted look per mibi and makes "it carries a hidden one" the mechanic's pleasure.

**Why "marked" becomes dominant:** with marks recessive, three in four Loikas are plain, and the new patterns would rarely show. Making marks dominant puts the pattern on most Loikas, which is where the owner wants the difference. It also turns plain into a rare look. The new frame version carries this change; pods on the old version keep the old rule (the genome engineer's versioning).

## How fair it is to breed for

- **Every look is reachable without luck at creation.** Each rare look is carried hidden by over half of pods (third colour 56%, stripes 56%, plain 50%). Reading the Coat chapter shows both copies, and the forecast shows what a cross can give. So the player can find carriers and pair them.
- **No dead ends.** Two carriers of a rare recessive-like look give it a quarter of the time. Two that show it always breed true.
- **Nothing is sold, and nothing is random at creation.** The pursuit runs through reading and crossing, as Pillar 2 asks.

## The field guide

- **The Loika's guide grows from 7 looks to 13:**
  - Colour 3;
  - Markings 2;
  - pattern 3;
  - Crest 2;
  - Eyes 3.
- A pattern counts as seen only on a mibi that shows it (a marked one), and hidden copies never count.
- The rarest looks (the third colour, stripes, plain) are usually the last to fill. So completing the Loika's guide, a sitting milestone, becomes a breeding achievement and not just a reading one.
- **The price note:** Coat grows from 1 trait to 3, so a full Coat read costs 3 Data instead of 1 (1 per trait). That is in line with other species and fine for pacing. The genome engineer confirms the chapter layout.

## The pursuit (the wish and Home)

- A wish can pin Colour, Markings and pattern like any look. The pieces light when a resident shows the pinned look, never by a number.
- **The obvious first wish** for a new player is the rare colour, or stripes, on their favourite Loika. That is the right first breeding goal: visible at Home's size, reachable in one or two generations, and it teaches "hidden copies".
- On Home's pursuit, these are the pieces that will most often be unlit. That is the point: they are the player's thread.

## The game design gate for this ticket

It passes when:
- the frame implements these dominance orders, with the shares measured on 300 pods within a few points of the table;
- old-version pods and mibis are unchanged;
- four random Loikas look distinct well above today's 35% (the genome engineer's figure);
- the field guide counts the 13 looks, with hidden copies never counting.

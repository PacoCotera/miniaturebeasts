# Art pipeline: from genome to signed-off art, cached

**Proposal** from the art director with the genome engineer, 2026-10-07, for the owner. **Decided** marks owner decisions restated here; everything else is **Proposal**. It answers the owner's earlier workbench idea ("design a genome, create a sketch of the creature, and then feed it to Gemini for art") for every level of the [taxonomy](taxonomy.md) (body plan, clan, species, individual) and every life stage, with one change of principle: **images are generated once per archetype, kept, and reused as references; individuals are never generated, they are rendered from signed-off masters by rule.** It builds on the [art direction](../art-direction.md), the [style guide](../style-guide/README.md), the [species frames](species-frames.md) and the [research loop](research-loop.md) §6, and on what the v1 [genome workbench](../../v1/prototype/generator-workbench/README.md) proved and disproved.

![The pipeline, the cache and what reaches players](art-pipeline/pipeline.svg)

*Stages 0–6 left to right; every stage writes to the cache, and generation reads only from it. Below: the reference chain by level, and the four places art reaches players.*

## 1. Principles

1. **Generate at archetype levels; render individuals deterministically on device.** The kit works standalone and the Companion is an ESP32 that cannot call a model (**Decided** 10-07, Project; Devices, 09-26); no hand-made art for individuals (**Decided** 10-01); a species is an assembly, never a drawing (taxonomy §7).
2. **Sketch before art.** Outline, then illustration, then pet-ification, then animation (**Decided** direction 10-02); the image model gets a deterministic sketch as its form authority, never a bare prompt.
3. **Nothing generated ships unprocessed.** Generated images are references for hand-authored masters (style guide, Sign-off; art-direction "hand-authored pixel masters"); a generated illustration ships only critiqued, corrected and labelled.
4. **Art never changes genes.** Rendering cannot invent parts, move pigments or repair a weak result (art-direction Rules; research-loop §5). Only the genome drives the renderer; a plate never feeds back into a frame.
5. **The cache is the source of truth.** Originals, exact prompts and hashes are kept (art-direction "Keep originals"); nothing is regenerated that the library already holds, and generation reads only from the library.
6. **Art director sign-off** on every piece before the owner sees it; engineers place signed-off assets and never draw (**Decided** 10-07).
7. **Clean room.** Our own vocabulary and references only; no other franchise's creature as source, prompt or reference (**Decided** 10-07, Intellectual property).

## 2. The pipeline, stage by stage

### Stage 0: the workbench

The owner: *"we need to revisit the workbench, because we may want to tinker with genomes to lock the species, see if different expressions have noticeable effects."* And his verdict on v1: *"The v1 workbench was a good idea, but the implementation was really bad. The 3D models were a good approach. But the way we edited loci, and the fact that all structures led to slug-like creatures or 6-legged things only, was a letdown. It needed more thinking, a tighter link between the algorithmic generation and the genome framework."*

**What it is.** An internal authoring tool, a page on the sandbox (engineering; it ships no art). The designers and the owner load the catalogue and the frame registry; define or edit a species frame (locked, open, sleeping, sealed; chapters and traits; the clan's branch loci); roll random individuals and crosses; see each one's structural sketch at Companion and Station scale; and **compare expressions side by side**: same frame, one locus changed, N individuals, with a verdict recorded per trait ("reads at 48 px", "reads only on the Station", "invisible: make it a doing"). Its exports are the species-frame JSON, the sketches and the reference sets stage 2 consumes; it writes them to the cache with provenance. No species is locked without it.

**1. Keep the 3D models.** The structural sketch is a parametric body built from the genome's regions and parts: superellipse volumes per region, typed head, tube chains for limbs, thin sheets for flaps and fins, exactly the [compositional contract](../../v1/design/anatomical-source-prototype/compositional-contract.md)'s meshes. One camera rig per body plan renders it the same way every time: a four-view turnaround (front, side, three-quarter lit from the top left, top), flat fills by **pigment slot** (not final colour), marking fields as separate masks, region and part ids as an index pass, and black silhouettes at 48 px, 280×300 and 300×310. So the image model always gets consistent views of one body, and the masters get a slot map to paint into. What v1 lacked was not the mesh but the depiction: diagram-like bulbs, tiny fixed faces, fur as scratch dashes ([anatomical roles](../../v1/prototype/generator-workbench/evidence/anatomical-roles/README.md), [coherent coat](../../v1/prototype/generator-workbench/evidence/coherent-coat/README.md)). The sketch stops at form and slots; craft is the masters' job.

**2. Edit as a designer thinks.** v1 edited copy by copy in an eleven-layer tree of 114 pairs with a "Refresh structure" step ([guided authoring](../../v1/prototype/generator-workbench/evidence/guided-authoring/README.md)). The new editor works at **frame → chapter → trait**, loci underneath and inspectable but never the entry point: switch the plan, lock or open a trait, narrow a pool, and the sketch re-renders at once (no refresh button), with a strip of variants beside it (each look of the trait, or N random individuals of the frame). Crosses take two individuals and show children in the same strip.

**3. Why everything became a slug or a six-legged thing.** The evidence and the code say why, and none of it was the 3D approach:

| Cause | Where | Effect |
| --- | --- | --- |
| **Every limb, wing and head roots on one region.** Chains, flaps and the head attach to `region-root` only; later regions are legless children | `compositional-source-construction.mjs` (the `anchor` node) | A two- or three-region body is a legged bulb towing legless bulbs: a slug or caterpillar |
| **Legs at fixed stations, fixed links.** Bilateral contact pairs sit at ±0.65 or −0.65/0/+0.65 of that one region, always two links, one splay and drop | same file; [anatomical V1 contract](../../v1/design/anatomical-source-prototype/genomic-contract.md) | Three pairs crowd one body: an insect, whatever else the genome says |
| **Equal beads.** Regions on one axis with equal lengths and symmetric bulges until growth and join were added, and the axial map offered only 1, 3 or 5 regions | [random diversity](../../v1/prototype/generator-workbench/evidence/random-diversity/README.md), [body organization](../../v1/prototype/generator-workbench/evidence/body-organization/README.md) | Chained-bulb silhouettes; 13 of 16 winners had three or five regions |
| **Uniform founder sampling, no species.** Every categorical locus drawn independently and evenly (appendage role none/free/contact a third each; two or three pairs half each) | contract, "Founder sampling policy" | A third legless (slugs), half of the legged ones six-legged; no draw aims at a kind of animal |
| **Guards that reject instead of draw.** Unsupported radial, membranes, deformation, markings and roles rejected the draw; the first eligible of up to 1,024 draws was kept | [diversity diagnosis](../../v1/prototype/generator-workbench/evidence/diversity-diagnosis/README.md): 99 of 100 rejected; 1,555 scene rejections in 2,563 draws | Survivors are what the constructor could draw: axial, finned, legless or six-legged |
| **Missing pet parts.** No paws, necks or posture by kind, tiny faces, no partial coats | [critter family](../../v1/prototype/generator-workbench/evidence/critter-family/README.md) learnings 1–3 | Nothing read as a mammal, a bird or a plant even when the counts were right |

![v1: eight random winners, shared camera](../../v1/prototype/generator-workbench/evidence/body-organization/random-comparison.png)

*v1 evidence: the first eligible draw in each of eight seed windows, shared camera. Seven of eight are three-region bodies.*

**What must change, so the 510 plans look like 510 bodies.**
- **In the genome framework** (genome engineer): a **mass hierarchy** per plan (leading, support, posterior) with unequal growth as species-fixed loci; **limb stations per region**, so a plan says which region carries which pair (fore legs on the front region, wings on the back, rays round a fan's hub); **link count, posture and ground contact per limb set** (plantigrade, upright, splayed insect, finned, rooted); a **neck or fused head** and head-to-body ratio as plan facts; and the clan **branch loci** the new kinds need (taxonomy in revision: fliers 0·2, insect-like 2·4, slug 1·2, plants 3·7 new switches·loci).
- **In the generator:** **species first**. A body is built from a frame, never from 114 independent draws; the plan's switches pick one of the **seven body rigs** and the limb sets, and only open traits vary. A guard never rejects into a narrower survivor set: an unsupported part is a missing consumer to build, shown as such. And a **silhouette census**: every plan's default body, rendered as a 48 px silhouette, must differ from every other plan's by a measured margin (shape distance on the silhouette masks), or the plan is merged or redesigned. taxonomy.py checks today that all 510 plans *build*; the census checks that they *look different*.

**4. The tight link.** The workbench and the sketcher import the catalogue, the frame registry and the resolver directly, the same modules [frames.py](species-frames/frames.py) and taxonomy.py read; there is no hand-kept parallel model (v1's anatomical V1 drew from fixed example tuples, `parameters.json`). Every rendered body is validated against the compositional contract (roots, attachment witnesses, bounds) and its frame's checks, and fails visibly; a gene is never repaired.

**Salvage and rebuild.**

| Salvage from `v1/prototype/generator-workbench/` | Rebuild |
| --- | --- |
| The resolver and its guards (`compositional-vocabulary-adapter.mjs`, catalogue6 in `innate-profile-package.mjs`), already reused by frames.py | The editor and journey (React tree of loci, refresh step, browser storage capped at eight proposals) |
| The mesh constructor (graph source, head, chains, sheets, ears, tail, mantle, marking fields) as the sketch's geometry, with the fixes above | Limb rooting, station tables and founder sampling (above); per-plan cameras and the slot and silhouette passes |
| The tree codec and the [genome stamp](../../prototypes/genome-stamp/README.md) encoder for exports | The per-creature "Render mibi" button: generation moves to stage 2, per archetype |
| The evidence tooling: replay by digest, byte-identical regeneration, hashed manifests, the Sharp compositors | The source-derived prompt (`art-prompt-summary`): kept as the sketch's caption, no longer the whole brief |
| The rendering transport's retention rules (request ids, no silent retry, exact prompt kept) for stage 2 | |

### Stages 1–6

| Stage | Inputs | Outputs | Tool | Signs | Cached |
| --- | --- | --- | --- | --- | --- |
| **1. Structural sketch** | a frame, or a genome | turnaround, slot map, marking masks, index pass, silhouettes at 48 px, 280×300, 300×310 | the workbench's sketcher, deterministic | art director: readable at device size, kinds distinct (the frame itself: the owner, in stage 0) | sketch bytes and hash, frame version, sketcher version |
| **2. Plates per level** | the sketch (form authority, attached first) and the signed plates of the level above | **plan:** parts turnaround; **clan:** signature part large, palette, finish; **species:** adult archetype, life stages (juvenile, adult, elder; the embryo as a frosted silhouette), expressions, poses from the state machine, pod; **individual:** illustrations only | Gemini, both image models, hard call budget per batch | none: candidates | every call: prompt, references, model, raw output, hashes |
| **3. Critique and selection** | candidates, the sketch, the style guide checklist | one pick per plate, or a round of two or three changes; a clean-room check (no likeness to another franchise's creature) | art director | **art director** | critique per candidate, verdict, the pick |
| **4. Pixel masters** | the picks, the slot map | the **parts library per body plan**: HiBit parts on the 48 ramps and painted Station parts, drawn in pigment slots, marking masks per region, 48 px token rig, motion frames per the style guide's vocabulary, life-stage variants | Aseprite (layers per slot, tags per motion); Retro Diffusion for drafts only | **art director**, every part | .aseprite sources, exported parts, rig tables |
| **5. Runtime renderer** | a genome, its frame, the parts library | the individual: Companion HiBit, Station rich, Caddy four-grey and print, the stamp face | device code, no model call | art director signs each species' **type specimen** and a sheet of random individuals | renderer version; specimen renders as golden images |
| **6. Text** | the name brief (locked facts only) | five name candidates, the tome line, field-guide sentences, one line per trait look | the LLM within the brief; web clearance per name | a person picks among cleared names | prompt, outputs, clause-to-fact map, clearance rows |

**What v1 taught stages 2–4.** The image model is a good finisher of a clean form and a poor keeper of facts. Given a clean source it returned useful craft (fur that reads, ear interiors), but every return moved something: pigments relocated, a fourth leg lost, a rug added ([coherent coat](../../v1/prototype/generator-workbench/evidence/coherent-coat/README.md)); ten fins for six ([critter family](../../v1/prototype/generator-workbench/evidence/critter-family/README.md)); scales past their field ([faithful pet](../../v1/prototype/generator-workbench/evidence/faithful-pet/README.md)); Pip as a toad or a rodent in four of eleven Station candidates and a drifting ten-change edit ([concept station](../../art/concept-station/README.md)); a dropped leaf crown ([homepage V2](../../art/concept-homepage/README.md)). What held: the source attached first as authority restored the fins; a pre-oriented source with a separate field guide passed; edits of two or three changes hold; one attempt per model with a written checklist; every call recorded with hashes. Retro Diffusion keeps palette and light but not the outline rule, two-frame idles or identity without references, and stops at 256 px ([trial](../../art/retro-diffusion-trial/README.md)). Hence plates are references, masters are drawn, and individuals are composed.

<table><tr><td valign="top"><img src="../../v1/prototype/generator-workbench/evidence/coherent-coat/authored.png" width="240" alt="v1 source"><br><em>v1 source sent to Gemini.</em></td><td valign="top"><img src="../../v1/prototype/generator-workbench/evidence/coherent-coat/gemini-pet.png" width="240" alt="Gemini return"><br><em>The return: good fur, moved pigments, three legs, a rug. A reference, never a mibi.</em></td></tr></table>

**The renderer, per device.** **Companion** (ESP32-S3, LVGL, 16 MB flash): parts as 8-bit indexed sprites; a pigment slot is a palette index remapped to the genome's pigment ramp; markings are 1-bit masks clipped to their region; layers placed by the plan's rig table; budget about 384 KB of parts per plan plus 32 KB of tokens; tokens for every plan, resident parts for the plans the Companion carries, synced at the dock. **Station** (Pi): painted parts in neutral value with shade and highlight layers, gradient-mapped to the pigment ramp; soft marking masks; eased part motion for the living window. **Caddy and paper:** the same parts through a value table the art director signs (each ramp step to one of four greys, then Bayer to one bit at 203 dpi). **Stamp face:** drawn from the genome bits by the stamp encoder; art supplies the clan border families and the glyph style, never the cells. **Draw only what is known:** unread parts render frosted, from the same masks.

## 3. The cache

**Where.** `art/library/`, in the public repository beside `art/miniature-lives/`. Blobs are content-addressed (`objects/sha256/ab/…`); raw generations and rejected candidates are stored through Git LFS; masters, signed plates and manifests are ordinary files. Folders are views: `plan/<plan-code>/v<N>/`, `clan/<clan>/v<N>/`, `species/<species>/v<N>/`, `individual/<code>/v<N>/` (illustrations only), `shared/` (face set, ramps, coverings, marking masks, pod renderer, stamp borders, tome template), `packs/<drop>/` (built content packs), and `index.json` (every artefact's current version and status).

**One manifest per artefact**, in the schema `art/concept-homepage/prompts.json` already uses, extended: `level` · `id` · `version` · `genome` or `seed` and `frameVersion` · `sketch` (hash, sketcher version) · `prompt` (verbatim) · `references` (hash and role each) · `model` and parameters · `outputs` (raw and derived hashes, sizes, crops) · `critique` (checklist, verdict, rounds) · `signoff` (who, date, scope) · `supersedes` · `licence` (CC BY-SA 4.0 for project-held rights, per [LICENSING.md](../../LICENSING.md); generated outputs flagged as generated).

**Reference selection, per level.** At most three references per call: the sketch first, labelled as form authority, and one or two **signed** plates as treatment anchors. A **plan** uses the accepted Miniature Lives pair until its first plan sheet is signed, then the nearest signed plan sheet. A **clan** uses its plan sheet. A **species** uses its clan sheet; life stages, expressions, poses and the pod use the signed adult archetype. An **individual** illustration uses its species archetype plus the individual's own deterministic Station render as authority. Never an unsigned candidate, never another franchise's image, never a whole screen (it gets copied, as Retro Diffusion's A2-2 showed).

**Invalidation.** A plate or master changes only when its **brief** (style guide or treatment) or its **genome** (a new frame version) changes, and then as a **new version**; the old one stays, and a device keeps every master version a saved mibi's frame version needs (rule changes never rewrite creatures, **Working rule**).

**Who reads it.** The website build reads signed plates and type specimens from `index.json`. The Station reads only built **content packs** (signed masters, rig tables, value tables, text), and passes the Companion and Caddy their subsets at the dock. Nothing reads a candidate.

## 4. What is generated and what is rendered

| Output | Generated? | Rendered from | Device constraint |
| --- | --- | --- | --- |
| **Field token** (world, partner) | no; plan plates are references | HiBit token rig, 48 px, palette remap | Companion: the 48 ramps, no alpha, two-frame idle, three-frame walk |
| **Companion resident** (280×300) | no | HiBit parts per plan | ≈384 KB a plan; parts synced at the dock |
| **Station resident** (vivarium, 300×310 and up) | no | painted parts, gradient-mapped | Pi at 1024×600; fine grain on creatures, eased motion |
| **Tome portrait** (Library) | no; the species archetype is its reference | painted parts in the species' habit pose | the one warm thing on the archive page |
| **Pod** | no; one renderer (**Decided**) | shell family per plan, clan tint, species parameters | the same pod on Station and Companion; dust per pod |
| **Stamp face** | no | the stamp encoder; border families and glyph style as masters | monochrome, 203 dpi, must still scan |
| **Website hero** | yes, individual level, a named showcase mibi | critiqued, corrected, labelled "illustration"; device shots are real renderer captures | web sizes; never shown as a capture |
| **Marketing** | yes, as the hero | as the hero | as the hero |
| **Names and text** | yes, the LLM, once per species | templates fill per-individual lines from trait words | shipped as data; no model at runtime |

## 5. Budget and effort

Hours are art hours (pixel artist and art director together); generations are calls. Money is small; hours are the cost.

| Unit | Gemini calls | Retro Diffusion | Art hours | Sign-off |
| --- | --- | --- | --- | --- |
| **Shared, once:** face set with expressions, marking masks, pod shell families, stamp border style, tome template | 16 | 4 requests | 78 | 6 h |
| **Per body rig** (HiBit and painted parts, token rig) | in the plan | in the plan | 40 | |
| **Per limb set** / **per covering** | in the plan | in the plan | 16 / 16 | |
| **Per body plan** (turnaround plates, assembly, animation set from the state machine, life stages) | 12 | 8 Pro + 2 animation | 32 | 3 h |
| **Per clan** (signature and branch parts, clan plate) | 6 | | 11 (+12 for a plant clan) | 1 h |
| **Per species** (archetype, stages, expressions, poses, pod, portrait; part variants, specimen) | 20 | 2 Pro | 15 | 2 h |

**First drop, five species** (§6: 3 body rigs, 2 limb sets, 3 coverings, 5 plans, 5 clans, one plant): **about 206 calls** (cap 240 with retries), **64 Retro Diffusion requests (about $21)**, **580 art hours** (78 + 120 + 32 + 48 + 160 + 67 + 75), about 36 h of sign-off and four owner reviews. Gemini spend, assuming about $0.10 a call on average, is about $25; the first batch's manifests replace that assumption with measured cost. **All 16** (taxonomy in revision: 7 rigs, 3 limb sets, 3 coverings, 16 plans, 16 clans, 2 plants): **about 624 calls (≈$62), 196 requests (≈$64), about 1,400 art hours**. **A seasonal drop** (4 species: two cousins in existing clans, one new clan, at most one new plan): **about 104 calls and $16 in tools, 130–155 art hours**, two cousins alone about 30.

Engineering, outside the art hours: the stage-0 workbench and sketcher about three weeks; the framework changes in §2 and the first drop's branch loci, the genome engineer's two to three weeks; the Companion and Station compositors about two weeks each, the Caddy value path one.

## 6. The first-drop plan

**Which five.** The approved roster (`taxonomy.md`) lists 16 species and marks the starters and early kinds (Loika, Untuva, Tuikis, Hiljan, Tepor: three rigs, two pairs on shared skeletons) as the first to build. The art pipeline should prove itself on one of each kind instead, on distinct plans: **Loika** (S01), the round walker (B1·L4, skin; Pip is the accepted calibration); **Kilpo** (S11), the swimmer (B1·L4, scales, a shell); **Belatz** (S09), the flier (B2·L4·flaps, fur, feathers to come; fur was v1's hardest failure); **Peplos** (S12), the insect-like (B3·L6·flaps, skin); **Lehten** (S15), the walking plant (Rfan2·rays, skin; the most new loci). Three body rigs, two limb sets, all three coverings. Decision 3.

**Order, with the owner's review points.**
1. **Stage 0 first** (weeks 1–3): the workbench, the framework changes, the five frames locked and their expression verdicts, the silhouette census across all five. **Owner review A:** five turnarounds and silhouettes side by side: five kinds of animal, or not?
2. **Shared masters and a vertical slice on Loika** (weeks 3–7): plates against the accepted Pip, the face set, ramps, B1 rig, skin; both compositors; a type specimen and twelve random Loika at 48 px, 280×300, 300×310 and four-grey. **Owner review B:** the slice at device size.
3. **Kilpo, Belatz, Peplos plates** in one batch (weeks 6–9), masters after critique; Lehten's plates once its branch loci land. **Owner review C:** one signed plan sheet per new kind, before masters are drawn.
4. **Masters and specimens for all five** (weeks 8–16); the LLM's names and text, cleared; the content pack built from the library. **Owner review D:** the drop pack on the devices.

## 7. Decisions for the owner

1. **Archetypes generated, individuals rendered.** Images are generated per plan, clan and species, signed and cached; every mibi is composed on the device from masters by its genome; generated individual art exists only as labelled illustration, and not as a cloud feature for players' own mibis until a fidelity check exists. *Recommended.*
2. **Rebuild the workbench as stage 0 before any plate.** Keep its 3D bodies, resolver and evidence tooling; rebuild the editor (frame, chapter, trait), limb rooting and sampling; read the framework directly; adopt the silhouette census as a gate for every plan. About three weeks of engineering ahead of art. *Recommended.*
3. **The first drop is one of each kind** (Loika, Kilpo, Belatz, Peplos, Lehten), not the five starters and early kinds first. It proves fur, scales and skin, three rigs and the hardest genes early, and five look-alikes would undercut the 16-species grid. *Recommended;* the roster's build order should align with it.
4. **The library lives in the public repository** at `art/library/`, with raw and rejected generations in Git LFS and devices fed only by built content packs. *Recommended* over a private bucket: provenance stays with the open project.
5. **Spend and review cadence.** Raise the Gemini monthly cap to cover 240 calls (with margin), top up Retro Diffusion by $25, keep a hard call budget per batch, and see the work at the four review points in §6 rather than every plate. *Recommended.*

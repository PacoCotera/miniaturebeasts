# Pip genetic proof report

Generated from content version `pip-proof-v1` by `node prototype/genetics/report.mjs`. This is a deterministic host fixture report, not a production genome library, final balance, artwork approval, or living critter. It assigns no identity, ownership, or resource changes.

## Coverage and candidate support

- Content validation: passed.
- Combinatorial coverage: 243 valid unordered genotypes from five two-copy loci (3^5). This is a coverage set, not a sample support list or population weighting.
- Authored Pip reference sample support: 2 explicit complete candidates. Neither candidate list nor 243-genotype space implies every combination is supported by a sample.
- The sample's required-fact manifest has 17 entries across baseline modules, fixed loci, and variable loci. Fantastic physiology is explicitly not applicable; unmodeled data are not inferred complete.
- Expression context: healthy, rested adult on firm ground in mild conditions. Other contexts return unsupported.

## Baseline coverage across the eleven families

| Family | Explicit source |
| --- | --- |
| structure | pip.body-plan (class-invariant); form.crown (variable locus) |
| appearance | base.coat (fixed locus); base.ventrum (fixed locus); base.eyes (fixed locus); appearance.rings (variable locus); appearance.markings (variable locus) |
| mechanics-movement | movement.drive (variable locus) |
| sensing-signaling | pip.sensing-signaling (fixed-inherited-module) |
| cognition-tendencies | pip.innate-tendencies (fixed-inherited-module) |
| energy-nutrition | pip.energy-nutrition (fixed-inherited-module); movement.efficiency (variable locus) |
| maintenance-protection | pip.maintenance (fixed-inherited-module) |
| affinities-exposure | pip.affinity (fixed-inherited-module) |
| development-longevity | pip.development (fixed-inherited-module) |
| reproduction | pip.reproduction (fixed-inherited-module) |
| fantastic-physiology | pip.fantastic-exclusion (not-applicable) |

Class invariants provide the Pip body plan. Fixed inherited module references and charcoal/cream/amber two-copy loci pass through a same-class cross. Variable loci control only their declared effects. The five variable loci are not the whole genome.

## Accepted qualitative reference

Input: `form.crown: Cc; appearance.rings: Rr; appearance.markings: Pp; movement.drive: Mm; movement.efficiency: Ee`.

| Phenotype field | Result and source trace |
| --- | --- |
| pip.body-plan | Small rounded, flexible-bodied, six-legged terrestrial plan with short jointed legs and claws; no rigid shell, wings, flight, or specialized swimming. — module:pip.body-plan |
| pip.sensing-signaling | Nearby visual-motion and surface-vibration sensing; quiet chirps; frill display only when the crown is present. — module:pip.sensing-signaling |
| pip.innate-tendencies | Moderate curiosity, caution toward sudden movement, tolerance of familiar individuals, and simple association-learning capacity. — module:pip.innate-tendencies |
| pip.energy-nutrition | Plant-derived nutrition profile, modest energy stores, and recovery between repeated bursts. — module:pip.energy-nutrition |
| pip.maintenance | Minor surface repair; no limb regeneration or implicit armor. — module:pip.maintenance |
| pip.affinity | Preference for mild, shaded, moderately humid settings; numeric thresholds unsupported. — module:pip.affinity |
| pip.development | A smaller juvenile develops into the adult form; a juvenile crown is less developed when present. Lifespan and later transformation are unsupported. — module:pip.development |
| pip.reproduction | This proof permits same-version, two-parent, two-copy Pip inheritance only. — module:pip.reproduction |
| pip.fantastic-exclusion | Fantastic physiology is explicitly not applicable to this Pip content version. — module:pip.fantastic-exclusion |
| base.coat | charcoal body — locus:base.coat |
| base.ventrum | cream underside — locus:base.ventrum |
| base.eyes | amber eyes — locus:base.eyes |
| crown | soft crown frill present — module:pip.body-plan, locus:form.crown |
| eye-rings | pale eye rings present — locus:base.eyes, locus:appearance.rings |
| body-markings | no pale body markings — locus:base.coat, locus:appearance.markings |
| movement | walking, low clambering, and short bursts supported — module:pip.body-plan, locus:movement.drive |
| movement-energy | lower energy cost for the same supported locomotor action than ee — module:pip.energy-nutrition, locus:movement.efficiency |
| frill-display | frill display available — module:pip.sensing-signaling, locus:form.crown |

This genotype expresses crown and rings, carries `p` without pale body markings, and supports short bursts with lower energy cost for the same supported locomotor action than `ee`. It makes no numerical speed, force, energy, or performance claim.

## Research disclosure: one unchanged candidate

The same complete private candidate is used in each projection: `form.crown: Cc; appearance.rings: Rr; appearance.markings: Pp; movement.drive: Mm; movement.efficiency: Ee`. Projection does not modify the candidate genome.

| Knowledge established | Player-facing projection |
| --- | --- |
| No markings copies known | {"locus":"appearance.markings","status":"unknown","knownCopies":[],"unresolvedCopies":2,"phenotype":null} |
| One `p` copy known | {"locus":"appearance.markings","status":"partly-known","knownCopies":["p"],"unresolvedCopies":1,"phenotype":null} |
| Both `Pp` copies known | {"locus":"appearance.markings","status":"known","knownCopies":["P","p"],"unresolvedCopies":0,"phenotype":"no pale body markings","carried":"p variant carried, not expressed"} |

The partial projection never returns the hidden other copy, any other locus, or the complete genome. A sample may support only the candidates explicitly listed in its content; research cannot invent a `pp` option or mutate the source genome.

## One exact compatible child

Parents are same-version Pip candidates. The selected copies and output are:

| Locus | Parent A copy | Parent B copy | Child |
| --- | --- | --- | --- |
| base.coat | charcoal (copy 0) | charcoal (copy 0) | charcoalcharcoal |
| base.ventrum | cream (copy 0) | cream (copy 0) | creamcream |
| base.eyes | amber (copy 0) | amber (copy 0) | amberamber |
| form.crown | c (copy 1) | c (copy 0) | cc |
| appearance.rings | r (copy 1) | R (copy 0) | Rr |
| appearance.markings | p (copy 1) | p (copy 1) | pp |
| movement.drive | M (copy 0) | m (copy 0) | Mm |
| movement.efficiency | E (copy 0) | e (copy 0) | Ee |

The child has these variable effects:

| Effect | Result |
| --- | --- |
| crown | no crown frill |
| eye-rings | pale eye rings present |
| body-markings | pale body markings present |
| movement | walking, low clambering, and short bursts supported |
| movement-energy | lower energy cost for the same supported locomotor action than ee |
| frill-display | frill display unavailable without crown |

Its shared class baseline and fixed inherited modules remain as listed in the baseline table above.

The cross is a pure genome operation. It allocates no individual identity, spends no sample or inventory, does not grant permission, and does not silently repair an invalid child. A later accepted game operation owns those actions.

## Conditional single-locus forecasts

These exact Mendelian forecasts assume valid Pip parents and independent loci in this content version. They are not balance targets or cross-class predictions.

| Locus | Offspring genotype distribution |
| --- | --- |
| form.crown | cc: 50%; Cc: 50% |
| appearance.rings | rr: 25%; Rr: 50%; RR: 25% |
| appearance.markings | pp: 25%; Pp: 50%; PP: 25% |
| movement.drive | mm: 50%; Mm: 50% |
| movement.efficiency | ee: 50%; Ee: 50% |

## Evidence limits

The proof resolves qualitative inherited features under one adult reference context. Numeric physiology, juvenile rendering/behavior, other classes, mutations, linkage, sample-specific research outcomes beyond the explicit support list, production completeness, and hardware behavior are not established. The existing live experiment remains separate and continues to use its older draft module.

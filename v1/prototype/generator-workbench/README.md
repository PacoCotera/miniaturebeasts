# Genome authoring workbench

The workbench helps content authors see how inherited information becomes a creature. Generate a genome, inspect and edit its copies, refresh the structure, compare the result and explicitly request a pet illustration. Each returned image stays attached to its original inputs and exact prompt. This is an authoring tool for Miniature Beasts mibis, separate from resident creation and the device simulator. Visible names follow [branding](../../BRANDING.md); retained source identities, schemas, prompts and browser-storage keys keep their existing spelling.

The [genetics framework](../../specs/genetics.md) owns inherited meaning. The [current compositional contract](../../design/anatomical-source-prototype/compositional-contract.md) owns executable source rules. The tool constructs partial static anatomy and retains replayable records; broad viable pets, physiology, finished pixel art and animation remain incomplete. A versioned source or a successful API call does not establish those outcomes.

## Create and compare a creature

1. **New random genome** creates a new working group with an actual complete eligible input. Failed generation preserves the current group and preview.
2. Expand an attribute in the **eleven-layer genome tree** and edit its labeled ordered copies. All domain headings/counts remain visible; search does not hide unmodeled branches. Consumed, inactive, unimplemented and draft states stay on their records.
3. **Refresh structure** explicitly resolves pending edits. Until then, the last successful preview stays visible and rendering is disabled. Rejection preserves edits and the prior structure. Success retains Before/Current with compatible shared camera/world scale and resets the render draft to the new source brief with notice.
4. Inspect the verified source and edit its **Render prompt**. Wording changes do not change the source genome. Choose an available provider and select **Render mibi** or **Render another version**.
5. Inspect the gallery's original genome/source versions and exact submitted prompts. Older images retain their own bindings across subsequent refreshes and reload.

Before first resolution the preview says **Not generated**. A missing source image or unavailable brief gives an explicit reason. Prompt projection failure does not invalidate a constructed source or change the sampler. Technical clauses, raw records, version selection, exact import/export, compendium drafts, batch tools and the retained Pip view are available through Advanced tools.

The source-derived short brief describes actual shape, counted extremities, material owners and named pigments. Its clause witnesses remain separate from drawing text. [Art handoff](art-template.md) defines source-faithful portrayal and art-first redesign; [rendering contract](rendering-contract.md) defines API admission, job recovery, limits and image retention.

## Working records and recovery

A working-creature UUID groups authoring activity; it is neither a hereditary identity nor ancestry. `originalGenomeId` is its first resolved input digest. The bounded index retains eight associations with current/previous replay recipes and at most 64 exact source record/input references per group. Reload verifies recipes before reopening. **Saved mibis** reopens a group with its own gallery.

Capacity, unreadable storage and quota errors leave the source usable in-session and explain the export requirement; no existing group is silently evicted. Unsubmitted prompt drafts are session state. Completed text belongs to immutable image/job metadata. Older genome slots and browser drafts remain separate. Loopback browser storage does not automatically transfer to HTTPS; export exact recipes and returned image/linked metadata separately.

Imports reconstruct the source from complete inputs and pinned definitions, then verify expected identities. Imported geometry, prompts and results are not authoritative. Invalid import preserves the verified current result. Old inputs retain their exact rules rather than acquiring new copies or a newer consumer.

[The codec](codec-contract.md) supplies a separate bounded reversible tree/string proof. Genome-only and full snapshots have different payloads; shared mode needs the exact catalogue and embedded mode carries it. Lookup `#G/#E` references are not encoded genomes or permission tokens.

## Content authoring

The compendium keeps dimensions, loci/alleles, baselines, operator definitions, naming, classification and experiment records related. Rename metadata without changing stable IDs or rewriting existing creatures. One locus can affect several domains; views reference it rather than clone it. Deprecated definitions remain available to retained packages.

The current compatible draft editor can change labels/purpose, bounded numeric contributions and complete existing pair maps under an immutable typed consumer domain. Save creates a separate versioned fork; **Use draft in experiment** selects it deliberately. **Load active draft starting copies** is another explicit action. Generate samples definitions under the declared founder policy, never treating starting copies as a species template.

IDs, allele order, copy counts, operators/targets/units, applicability/guards, statuses, runtime budgets and exact pigment values/maps remain fixed. Mixed pairs must remain valid. Draft statuses cannot create missing consumers. Recipes retain their exact parent, edited definitions, source references, starting copies and compiled pin; they reconstruct after restart without a transient registry. [Compatible authored foundations](../../design/anatomical-source-prototype/compositional-contract.md#compatible-authored-foundations) owns parent-specific schema and bounds.

Broader authoring should deepen Structure, Appearance and Movement while exposing every other domain and its real gaps. Content definitions need meaning, applicability, contributors, dependencies, inheritance, expression, outputs and valid/invalid cases. LLM-proposed definitions still need explicit validated operators; more names do not establish biological breadth. Standard versioned files are sufficient until an actual editing/query need warrants more.

## Current construction and evidence

| Contract or retained profile | What it provides |
| --- | --- |
| [Compositional source](../../design/anatomical-source-prototype/compositional-contract.md) | Genome-derived region graphs, typed roots/chains/sheets, optional head/face/ears/tail, local materials and provisional static innate profile |
| [Source-art rules](../../design/anatomical-source-prototype/compositional-art-direction.md) | How connected geometry, attachments, pigment fields and materials must remain readable |
| [Anatomical V1](../../design/anatomical-source-prototype/genomic-contract.md) | Fixed head/neck/core and support experiment, retained for exact recovery rather than broad diversity |
| [Local static calibration](../../design/genome-starter-content.md#pet-face-and-material-implementation-proof) | Narrow continuous axial face/material profile and precise ratios/budgets |
| [Pip proof](../genetics/README.md) | Pinned qualitative inheritance and limited research projection |
| [Evidence index](evidence/README.md) | Actual controlled inputs, ordinary draws, browser recovery, rejected art, diversity measurements and API images |

The current source grammar allows serial/fan organization, bilateral/radial local frames, optional typed head, zero chains, separate free/contact roles and rooted thin surfaces. Static root witnesses do not establish legal motion or viable physiology. An eye is not a sensory grant; a covering is not armor, insulation or flight. Incompatible broader movement/energy consumers remain explicit gaps.

Founder sampling and construction are different stages. The connected scene path searches at most 1,024 unmodified complete draws, accepting the first eligible result without animal quotas, attractiveness ranking or repair. Its unsigned requested seed plus zero-based draw index wraps at 32 bits. Exhaustion produces no replacement. The compositional founder state policy and source-specific bounds belong in its exact contract.

## Diagnostic inspection

Selected-locus inspection may use `surface-detail/1` while primary references retain canonical bytes. It depicts retained anisotropic orientation; continuous fine-ridged surfaces receive four neutral quarter-opacity strokes per atlas domain, clipped to solved outline. Omitting `viewOptions.projectionVersion` retains prior bytes, and unknown versions reject. These strokes are inspection ink, not pigment genes or tissue. Inactive turn/reserve contributors cannot imply an applied effect. Compatible comparisons use one union camera rather than normalize bodies separately.

## Run and module boundaries

Use the existing Node 22.12-or-later host runtime and pnpm 11.19.0:

```sh
cd prototype/generator-workbench
pnpm install --frozen-lockfile --ignore-scripts
pnpm run build
pnpm start
```

Standalone entry is **http://127.0.0.1:4381**; build with `CRITTER_BENCH_BASE=/genome/` for the hosted mount. The [platform routes](../platform-server/README.md) separate website, workbench and simulator. The retained Pip UI is at `/legacy`.

Catalogue modules define versioned content. Pure model/construction modules validate copies and resolve causes; presentation consumes results. Authoring adapters retain records/digests/replay, the tree/codec maps literal data, and the browser handles editing and inspection. The server provides bounded same-origin endpoints and rendering transport. Game/device adapters remain separate consumers; this does not place the JavaScript engine on a microcontroller.

`pnpm test` and `pnpm run build` are the existing authoring checks. Each retained evidence page identifies its reproduction commands and actual scope.

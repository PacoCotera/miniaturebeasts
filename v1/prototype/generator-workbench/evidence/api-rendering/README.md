# Actual API pet rendering

Measured3October2026 on the hosted genome workbench. [PR104](https://github.com/PacoCotera/critter-lab/pull/104) uses Google generateContent; live source `a78454e6f489825c8f402a669c0f898220760c70`, existing automatic CI [37159330235](https://github.com/PacoCotera/critter-lab/actions/runs/37159330235) passed. Source builds passed.

## Retained source and literal prompts

[Authored record](authored.record.json) was explicitly reopened and replayed in the guided workspace. Its original and actual genome/input digest is `b97f66a7febc973ab4f51994d9ae054516b12934e7902bc26e7090a7fdb7eeed`, record `compositional-91f86f3171bd1bca11d5`, source6/material4. This historical recipe contains111 copied pairs; it is not silently upgraded to the current114-pair experiment. [Source SVG](source.svg) is the actual displayed structural reference. Browser rasterization supplies the512px PNG; metadata explicitly does not claim pixel equivalence to the replayed SVG.

[Prompt1](prompt-1.txt) is the literal genome-derived short description sent with that image. [Prompt2](prompt-2.txt) adds only “Give it a relaxed, curious expression.” Editing this text changed no inherited input, source record or identity. Both actual jobs retained the same SVG/PNG hashes and distinct submitted-prompt hashes.

| Explicit request | Outcome | Literal evidence |
| --- | --- | --- |
| Original Interactions request | Failed in1second, original generic failure retained | [First failed job](failed-job.json) |
| Diagnostic Interactions request | HTTP400, no usable provider error code | [Diagnostic job](diagnostic-job.json), [failed gallery](failed-gallery.png) |
| Google generateContent, prompt1 | Completed22:46:32–22:46:43UTC; original JPEG310831bytes | [Render1](render-1.jpg), [job1](render-1.json) |
| Google generateContent, prompt2 | Completed22:47:28–22:47:37UTC; original JPEG | [Render2](render-2.jpg), [job2](render-2.json) |

No request was automatically retried or routed to another provider. Four deliberate requests in total, two failed and two completed; this is a bounded actual-use example, not a diversity campaign. Original returned image bytes are retained unchanged. Provider usage/response IDs remain in the corresponding exact job metadata.

## Actual gallery and recovery

[Two-image gallery](gallery-two.png) shows both completed images alongside both historical failures. Inspect this render exposes its original genome, actual source/input, job and exact prompt. After page reload, the same two images reopened from browser retention without re-entering the operator token; switching to the separate random creature and back retained both. Server recovery reads existing jobs rather than generating again. Google credentials remain server-side; no credential appears in these artifacts.

The browser automation download-event capture did not return a file for the Blob-based source/metadata controls. Consequently no successful UI-download claim is made; exact completed artifacts above were retrieved from the original retained server store. Image hash/MIME match the literal job metadata.

## Independent pixel/source assessment

The art assessment examined both actual returned images, source and prompts. Both are readable pet illustrations, alone with a ground shadow. Render2 has stronger directional trunk fur than render1. Neither is an accepted source-faithful master: head/ear/leg pigment placement changes, smooth-head material ownership is inconsistent, and both show three complete leg chains with the far fourth obscured. Added noses, smiles and toe details remain interpretations. Render2 adds circular joint details that make the legs look mechanical. Its expression is not clearly more relaxed; one output per prompt cannot attribute variation to the added sentence.

Transport and retained provenance are delivered. Exact phenotype fidelity, coherent source fur/ears/paint, broad organism range, complete eleven-layer contracts, accepted pet masters and animation remain open. OpenAI has an adapter but is unconfigured and has no actual image evidence.

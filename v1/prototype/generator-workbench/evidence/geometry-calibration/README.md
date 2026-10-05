# Geometry-guided image benchmark

One matched case, `axial-original`, compares Gemini web Images/Pro with a
GPT-6.1 Sol High-directed built-in image tool. Both received the exact same
[prompt](prompt.txt), [geometry image](geometry-reference.png) and original
[C18 reference](../../../../design/game-art-proposals/35-vault-composition/18-c-refined.png).
One call per tool; no corrective retries, other attachments or API migration.
The prompt identifies geometry as structural authority and C18 as craft only.

The [SVG](axial-original.geometry.svg) and [manifest](axial-original.geometry.json)
derive from the retained engine output: five body volumes, six fins rooted in
pairs on volumes 0/2/4, true positions/dimensions and open gaps, russet body
pigment and equal local cream/slate fin masks. Eleven footprints and ten graph
edges are exposed. Elliptic footprints, mask orientation and overlay order are
explicit diagnostic conventions; neutral edges are not modeled tissue.

| Observed gate | Gemini | Sol-directed image tool |
| --- | --- | --- |
| Five volumes, six fins, pair groups and open gaps | Broad visual fidelity passes | Independent genetics review passes broad visual fidelity |
| Pigment roles, no extra anatomy/markings/text | Broad visual fidelity passes | Broad visual fidelity passes |
| Exact source connectors and outlines | Six fin-root stubs lost; exact geometry not accepted | Internal root strokes simplified/partly lost; exact geometry not accepted |
| Craft against C18 | Thin rims, flat fills and dithered shading | Stronger intentional pixel clusters, highlights and contour depth |
| Retained output | [1024×576 PNG](gemini-geometry-01.png) | [1639×960 PNG](builtin-geometry-01.png) |
| Timing evidence | Completion observed within 76.010 seconds | Tool call elapsed 21.289 seconds |

The recorded art and integration assessments agree that the built-in output provides
the more useful style direction **in this pair**. Its coarse apparent pixels and
strong highlights still need calibration. Neither result is finished creature art.
No registered comparison measured centers, extents, mask ratios or exact contours.
Different output sizes and different timing measurements prevent a quality/speed
ranking from this single case. Provider cost was not exposed and is not measured.

Gemini's visible mode is Images/Pro; its raster backend ID is unverified. Full-size
download did not return an artifact; the visible Copy image control supplied the
unedited PNG. The built-in tool exposes no model selector or backend ID. Sol is
the directing model, not a verified raster backend: its official model page lists
image input and an image-generation tool, rather than native image output
([model documentation](https://developers.openai.com/api/docs/models/gpt-6.1-sol),
[image-generation documentation](https://developers.openai.com/api/docs/guides/image-generation)).
See [built-in metadata](builtin-geometry-01.json) and [benchmark manifest](benchmark-manifest.json)
for exact input/output hashes, provider observations and measured limits.

The independent architect/genetics review checked actual graph parity, unchanged
genetic digests, projection isolation, masks and malformed rejection. The art
director inspected the actual raster before either call and independently assessed
Gemini. Genetics and integration review assessed the built-in result; its producer
did not self-approve it. Actual browser integration exposed a sibling SVG clip-ID
collision; the geometry preview now uses its own IDs. The focused regression and
framework build accompany that repair. The [browser proof](workbench-geometry.jpg)
records the existing React/Mantine workbench, not a device or game deployment.

**Stopping boundary:** reference and broad style preservation are proven; strict
geometry and whole-creature construction are not. The current model supplies
volume bounds and graph relationships, but no continuous surface/joining-tissue
construction or physical depth order. Those must be defined algorithmically before
asking either model for a cohesive organism. No extra fin, tail, flesh bridge,
species preset or image-prompt repair was allowed to fill that gap. Sprites,
animation, configured incubation, pet appeal and broad diversity remain open.

# Art

The creatures and the world have to carry the game. Players should understand a
mibi's inherited differences by looking at it, at the size of the device screen.

The accepted direction is **Miniature Lives**; its rules and the art still to
make are in [design/art-direction.md](../design/art-direction.md). This folder
holds the assets.

## What is here

| Folder | What it is | Status |
| --- | --- | --- |
| `miniature-lives/` | Device-size proof of the accepted appearance, with prompts, sources and manifests | Accepted |
| `visual-directions/` | The three directions that were compared; Miniature Lives was chosen | Reference |
| `references/` | Original concept images: device family, genome-field and research-terminal studies | Original references; keep unchanged |
| `companion-concept/` | Original Companion field-partner concept and early studies | Original reference |

Original images keep their exact bytes; manifests and
[`../import-manifest.json`](../import-manifest.json) record hashes. Some READMEs
inside these folders link to older studies that stayed in the archived
repository ([critter-lab@63e824f](https://github.com/PacoCotera/critter-lab/tree/63e824f5dcae8ea5e3906b860873e1603c3c731b/design)).

Rejected studies were not imported: the six-screen discovery proposal
(route-shaped map, label clutter, table-style Station screens), the first-person
scenic and first-partner UI studies, and the header-image screens. They remain in
the archive for reference only.

## Generating art

Concept art, screen concepts and creature studies are generated with the Gemini
image API and judged against a written brief. Generation never accepts anything;
the owner does. These rules bind every session and every specialist brief.

**Brief first.** Before any call, a brief in this folder names each shot: where it
goes, its size, the exact prompt, the reference images and their roles, and the
"accept when" checks. [`concept-brief-homepage.md`](concept-brief-homepage.md) is
the form. The checks are the gate; the prompt is only the attempt.

**Models.** Both are listed for the project's key; record the model per call.

| Use | Model | Why |
| --- | --- | --- |
| Concepts, hero shots, marketing, painted-miniature looks | `gemini-3-pro-image` | Most convincing materials and light; slower and dearer; follows long prompts loosely |
| Fast iteration, screen and sprite studies, sculpt-style references | `gemini-2.5-flash-image` or `gemini-3.1-flash-image` | Seconds per image; follows prompts more literally; render look rather than photo |

**Consistency comes from image inputs, not prose.** For a turnaround, a variant, a
second device shot or a creature across treatments, send the accepted image as an
input and state its role in the prompt. A rear view generated from a front
reference kept the design intact (verified 2026-10-06); the same design described
in words alone did not.

**Two attempts, then change the brief.** If a shot fails its checks twice, do not
run the same prompt a third time: add a reference image, split an edit into
smaller edits, or remove garbled text and set it on the page instead.

**Every batch leaves a folder** in the form of
[`concept-homepage/`](concept-homepage/README.md): `raw/` with the unaltered API
output, `rejected/` with failed attempts, `prompts.json` with every call (prompt
verbatim, inputs and roles, model, config, result, hashes), `manifest.json` with
every file's size, SHA-256 and derivation steps, and a README with the checklist
result per candidate. Generated images are labelled as generated everywhere they
appear.

**Budget.** The key's project has a monthly spending cap. When the API answers
429, stop, record where in `prompts.json`, and report; do not switch keys.

**Not for.** Canonical creature art from a genome (open, see
[art direction](../design/art-direction.md)); captures of the build; anything
presented as more than concept.

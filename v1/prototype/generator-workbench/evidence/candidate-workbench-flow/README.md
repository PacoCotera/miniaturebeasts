# Candidate workbench flow

The authoring tool presents one **Generate creature** action, the constructed
source illustration and its exact **Gemini prompt** before optional genome editing.
The experimental pigment catalogue remains separate from canonical game content.

[Desktop](desktop-browser.png), [narrow window](narrow-browser.png) and
[stacked prompt](narrow-prompt-browser.png) show the corrected interface at
`7b55e1262d3f589ee7f3c1fead71b81a3f8293b7`.
[CI37077911809](https://github.com/PacoCotera/critter-lab/actions/runs/37077911809)
passed the host boundary tests and framework build. Independent architecture,
technical and actual-output UX review passed for this bounded flow.

## Measured browser journey

| Action | Accepted seed | Observed unmodified draws |
| --- | ---: | ---: |
| First Generate | 1062691442 | 75 |
| Second Generate | 2839426486 | 94 |
| Retry after unavailable backend | 238067917 | 46 |

The [first](first-browser.png) and [second](second-browser.png) results required
no manual creature edits. Each displayed prompt matched its compact export's
replayed result; actual Copy followed by a UI paste matched both prompts exactly.
The separate browser clipboard reader returned stale text and supplied no passing
signal. [Unavailable-backend recovery](offline-browser.png) kept the second source,
prompt and accepted identity while explicitly reporting no new creature. Retry
succeeded.

[Original covering import](old-import-browser.png) retained catalogue v1 and exact
scene/prompt identities. Editing a copy cleared stale preview/prompt and disabled
Copy while preserving the pin. Genome editing and Compendium remained reachable.
Existing saved records were not changed.

Functional browser checks ran at `e1e2b68`; the final change only corrected the
responsive header. Final 800px and 1280px captures were inspected again. At800px,
the picker lies inside the112px header and above the navbar; source and prompt
stack without horizontal overflow. The desktop header remains74px.

[Manifest](manifest.json) pins source/artifact hashes and exact retained identities.
`*.compact.json` are actual UI exports. `*.replay.json` are API reconstructions of
those exports; observed sampling counts above remain separate from replay output.
The compact POSTs are under the unchanged64KiB limit. This is not a generation-rate
study, finished pet artwork, a provider result, canonical colour selection or
game/native/hardware acceptance. The construction profile remains narrower than
the desired creature range.

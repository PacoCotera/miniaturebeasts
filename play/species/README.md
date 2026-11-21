# Species: the genome framework and the species frames

What is left of the stage-0 workbench, an editor that was no longer maintained. The editor page, its server and its generated pictures are gone (they stay in git history, before the commit "Retire the species workbench editor"). The game still reads this folder.

| Folder | What it is | Who reads it |
| --- | --- | --- |
| `framework/` | the genome framework: roster, catalogue, resolver, rig, plain renderer, the census tool, `language.mjs` and its generated `language.json` | the Station, the Face, genome-stamp, the Caddy service's mock painter |
| `frames/` | the species frames (`species-S??.json`), and `frames/language/` (the 20 frames the Station fetches at run time, `index.json` first) | the Station (`core.mjs` `loadFrames`), served publicly at `/play/species/frames/` |
| `body/` | two frozen fixtures: `frames/species-S20.json` and `species_v1/S20.json` | genome-stamp's S20 tests, `tests/pin13.test.mjs` |
| `sketch/` | the structural sketch CLI | the Caddy service's `grow/controls.mjs` |
| `grow/` | `controls.mjs` (the Caddy mock painter) and the real-painter set kept for the Caddy service (`service.py`, `art-direction.txt`, `prompt-lab/v8/`, `species/`, `prompts.json`); see `grow/README.md` | `prototypes/caddy` |
| `tools/` | `language-json.mjs` (writes and `--check`s `framework/language.json`), `stands48.mjs` | the gate |
| `tests/` | the framework's own tests | `npm test` here |

## Commands (from this folder)

- `npm run frames` / `npm run frames:check`: rebuild or check the frames from the framework (`framework/build-frames.mjs`).
- `node tools/language-json.mjs --check`: `framework/language.json` matches `language.mjs`.
- `npm run census`: the census (`framework/census.mjs`); it writes `census.json`, `census.md` and `img/silhouettes-48.png` (the `img/` folder is made on the run).
- `npm test`: `node --test tests/*.test.mjs`.

The frames' `source` lines name `v1/prototype/generator-workbench/...`: that is the retired v1 generator workbench, a different thing, and stays as written.

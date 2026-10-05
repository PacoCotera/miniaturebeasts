import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { fixtures } from './fixtures.mjs';
import { renderScene } from './renderer.mjs';
import { encodePng } from './png.mjs';
const output = new URL('../../design/reviews/pixel-01/', import.meta.url);
await mkdir(output, { recursive: true });
for (const scene of ['specimen', 'research', 'family']) {
  for (const profile of ['color', 'mono']) {
    const frame = renderScene(scene, fixtures[scene], profile);
    for (const scale of [1, 3]) {
      const path = new URL(`${scene}-${profile}-${scale}x.png`, output);
      await writeFile(path, encodePng(frame, scale));
      console.log(fileURLToPath(path));
    }
  }
}
await writeFile(new URL('README.md', output), `# Pixel study 01 — provisional fixtures

These are static host-rendered studies, not firmware or approved creature art.
320 × 240 native pixels; 3× exports use integer nearest-neighbor enlargement.
Color uses eight palette entries; monochrome uses only black and white. Both currently use one byte per pixel in the host buffer and indexed PNG.

Specimen: fixture:specimen:014, short ID #014, family FAMILY A, expressed CROWN FRILL and RINGED EYES, collection 2 / 8.
Research: MIST THREAD, GROWING, PALE PATTERN, supplied progress 2 / 3.
Family guide: FAMILY A classification placeholder silhouette; CROWN FRILL and CURLED TAIL. It is not an individual.
All names, traits, art and progress are illustrative. Action strips show initial focus, but these images do not accept input.

Regenerate: node prototype/pixel/export.mjs. See prototype/pixel/README.md for limitations.
`);

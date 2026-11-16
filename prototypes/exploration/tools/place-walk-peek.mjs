// place-walk-2: terrain map round a world tile of a seed (the settled ground): node place-walk-peek.mjs <treeRoot> <seed> <wx> <wy>
import { pathToFileURL } from 'node:url';
const [root, seed, wx, wy] = process.argv.slice(2), { worldTiles, TV } = await import(pathToFileURL(root + '/prototypes/exploration/src/gen7/place.mjs').href), T = worldTiles(+seed);
const ch = { [TV.CLIFF]: '#', [TV.THICKET]: 'T', [TV.WATER]: '~', [TV.DEEP]: '~', [TV.SAND]: 's', [TV.GRASS]: '.', [TV.SCREE]: 'r', [TV.PATH]: 'p' };
for (let y = +wy - 8; y <= +wy + 8; y++) { let s = ''; for (let x = +wx - 14; x <= +wx + 14; x++) s += x === +wx && y === +wy ? 'X' : ch[T(x, y)] || '?'; console.log(s); }

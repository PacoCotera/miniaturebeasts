// One-off, idempotent: brings art/places/ldtk/places.ldtk in step with terrain.json and the set after the open edges and the meadow decor (walk content B5):
// the Terrain IntGrid values cliff, thicket and scrub, the entities WayUp and ReedBank (rectangles, no fields), the DecalKind enum (the desk's decor for the kit's sunflowers).
//   node prototypes/places/tools/ldtk-open-edges-defs.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), repo = path.resolve(here, '..', '..', '..');
const file = path.join(repo, 'art', 'places', 'ldtk', 'places.ldtk');
const P = JSON.parse(readFileSync(file, 'utf8'));
const terrains = JSON.parse(readFileSync(path.join(repo, 'art', 'places', 'terrain.json'), 'utf8')).terrains;
const terrain = P.defs.layers.find((l) => l.identifier === 'Terrain');
for (const t of terrains) if (!terrain.intGridValues.some((v) => v.value === t.value)) terrain.intGridValues.push({ value: t.value, identifier: t.id, color: t.editorColour.toUpperCase(), tile: null, groupUid: 0 });
terrain.intGridValues.sort((a, b) => a.value - b.value);
const opening = P.defs.entities.find((e) => e.identifier === 'Opening');
const area = (identifier, doc, color) => {
  if (P.defs.entities.some((e) => e.identifier === identifier)) return;
  P.defs.entities.push({ ...JSON.parse(JSON.stringify(opening)), identifier, uid: P.nextUid++, doc, color, fieldDefs: [], tags: ['mark'] });
};
area('WayUp', 'a rectangle over the last row of a straight south-facing cliff face, 1 or more cells wide, with straight face one cell either side: the face has broken down into a slope you can walk', '#B8D96B');
area('ReedBank', 'a rectangle over a stretch of shore (grass or sand against water): its dual tiles draw the reed-bank look; nothing blocks', '#4FC3A1');
const decal = P.defs.enums.find((e) => e.identifier === 'DecalKind');
const want = Object.keys(JSON.parse(readFileSync(path.join(repo, 'art', 'places', 'sets', 'ninja-test', 'set.json'), 'utf8')).decals);
const proto = decal.values[0];
decal.values = want.map((id) => decal.values.find((v) => v.id === id) || { ...proto, id });
writeFileSync(file, JSON.stringify(P, null, '\t') + '\n');
console.log('defs updated; decal kinds:', want.join(', '));

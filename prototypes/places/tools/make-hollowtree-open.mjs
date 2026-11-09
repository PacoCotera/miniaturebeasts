// The Hollow Tree in the open style (walk content B7): 24 x 28, no edge ring, every side runs on into the next cell. Writes art/places/ldtk/places/HollowTree.ldtkl from the layout below, by hand-placed
// rectangles and points plus the art desk's meadow-decor density rule (mibi-art 5734abc5). Re-running gives the same file. LDtk opens the result.
//   node prototypes/places/tools/make-hollowtree-open.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hash32 } from '../src/dualgrid.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), repo = path.resolve(here, '..', '..', '..');
const file = path.join(repo, 'art', 'places', 'ldtk', 'places', 'HollowTree.ldtkl');
const project = JSON.parse(readFileSync(path.join(repo, 'art', 'places', 'ldtk', 'places.ldtk'), 'utf8'));
const L = JSON.parse(readFileSync(file, 'utf8'));
const W = 24, H = 28, GRASS = 6, PATH = 5, EARTH = 7, THICKET = 9, SCRUB = 10;
const HX = 14, HY = 13;   // the heart; the hollow tree stands just north of it

// ---- the ground
const t = new Uint8Array(W * H).fill(GRASS);
const rect = (x, y, w, h, v) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) t[j * W + i] = v; };
const at = (x, y) => t[y * W + x];
rect(13, 12, 3, 3, EARTH);                                   // the heart's clearing (radius 1.5), the heart at its middle, the great tree on its north row
rect(19, 14, 3, 5, THICKET); t[14 * W + 19] = GRASS; t[18 * W + 21] = GRASS; t[16 * W + 18] = THICKET;   // a dense thicket in the east, its edge uneven
rect(4, 18, 4, 2, SCRUB);                                    // low scrub, a soft stretch under the western trees
for (const [x, y] of [[16, 25], [16, 24], [16, 23], [15, 22], [15, 21], [15, 20], [15, 19], [15, 18], [15, 17]]) t[y * W + x] = PATH;   // the road from the south, ending short of the clearing
for (const [x, y] of [[3, 14], [4, 14], [5, 14], [6, 14], [7, 14], [8, 13], [9, 13], [10, 13], [11, 13]]) t[y * W + x] = PATH;   // a footpath from the west, ending short of the clearing

// ---- the entities
const proto = {};
for (const l of L.layerInstances) for (const e of l.entityInstances || []) proto[e.__identifier] ||= e;
const defUid = (id) => project.defs.entities.find((e) => e.identifier === id).uid;
let n = 0;
const iid = () => { const h = (k) => (hash32('hollow-open', n, k) >>> 0).toString(16).padStart(8, '0'); n++; const a = h(1), b = h(2), c = h(3), d = h(4); return `${a}-${b.slice(0, 4)}-4${b.slice(5, 8)}-a${c.slice(1, 4)}-${c.slice(4)}${d.slice(0, 4)}`; };
const setField = (fi, v) => {
  fi.__value = v;
  fi.realEditorValues = Array.isArray(v) ? v.map((x) => ({ id: 'V_String', params: [typeof x === 'object' ? `${x.cx},${x.cy}` : x] })) : typeof v === 'number' ? [{ id: 'V_Float', params: [v] }] : [{ id: 'V_String', params: [v] }];
};
// px: the top-left of the entity's 16 px box in pixels (any pixel for props and decals: their foot is the box's bottom middle)
const ent = (id, cx, cy, w = 1, h = 1, fields = {}, px = [cx * 16, cy * 16]) => {
  const e = JSON.parse(JSON.stringify(proto[id] || proto.Opening));
  e.__identifier = id; e.__grid = [cx, cy]; e.iid = iid(); e.width = w * 16; e.height = h * 16; e.px = px; e.defUid = defUid(id);
  e.__tags = id === 'Prop' ? ['prop'] : id === 'Decal' ? ['decal'] : e.__tags; if (!proto[id]) { e.__smartColor = '#4FC3A1'; e.fieldInstances = []; }
  for (const f of e.fieldInstances) if (f.__identifier in fields) setField(f, fields[f.__identifier]);
  return e;
};
const props = [], blocked = new Set();
const prop = (kind, x, y) => { props.push(ent('Prop', x, y, 1, 1, { kind })); blocked.add(y * W + x); };
prop('tree-hollow', HX, HY - 1);
for (const [k, x, y] of [
  ['tree-broad', 5, 5], ['tree-autumn', 8, 4], ['tree-broad', 4, 8], ['tree-autumn', 10, 7], ['tree-broad', 7, 10], ['tree-autumn', 12, 5],   // the grove in the north-west
  ['tree-autumn', 18, 5], ['tree-broad', 20, 7], ['tree-broad', 17, 9], ['tree-autumn', 20, 10],                                                // the north-east
  ['tree-broad', 5, 16], ['tree-autumn', 9, 17], ['tree-broad', 3, 21], ['tree-autumn', 7, 22],                                                  // the west
  ['tree-autumn', 11, 21], ['tree-broad', 12, 24], ['tree-broad', 19, 22], ['tree-autumn', 20, 20], ['tree-broad', 19, 12],                     // the south
  ['bush-small', 11, 16], ['bush-small', 17, 14], ['bush-small', 8, 12]]) prop(k, x, y);

const marks = [];
marks.push(ent('Heart', HX, HY, 1, 1, { kinds: ['moment', 'nest'], species: ['hiljan'], revealLine: 'A Hiljan watches a fruit roll among the roots.', reachBy: 'none' }));
marks.push(ent('Clue', 9, 24, 1, 1, { tell: 'prints', path: [{ cx: 9, cy: 24 }, { cx: 10, cy: 22 }, { cx: 11, cy: 19 }, { cx: 12, cy: 17 }, { cx: 13, cy: 15 }, { cx: 14, cy: 14 }] }));
const finds = [[17, 16, ['pod'], 1], [9, 9, ['fruit', 'dew'], 1], [17, 23, ['stone'], 1], [6, 13, ['pod', 'fruit'], 0.5], [15, 6, ['fruit', 'dew'], 0.5], [9, 25, ['stone', 'material'], 0.5], [20, 4, ['dew'], 0.5], [10, 11, ['pod', 'material'], 0.5]];
for (const [x, y, kinds, chance] of finds) marks.push(ent('Find', x, y, 1, 1, { kinds, chance }));
marks.push(ent('Landmark', HX, HY - 1, 1, 1, { prop: 'tree-hollow', label: 'the hollow tree' }));
for (const [side, x, y, w, h] of [['N', 6, 0, 12, 1], ['S', 8, 27, 14, 1], ['W', 0, 8, 1, 14], ['E', 23, 4, 1, 10]]) marks.push(ent('Opening', x, y, w, h, { side }));
for (const [x, y, w, h, species] of [[2, 22, 4, 3, []], [17, 2, 4, 3, []], [9, 14, 3, 2, ['hiljan']]]) marks.push(ent('CreatureSpawn', x, y, w, h, { species, count: 1 }));

// ---- the meadow decor (the desk's density rule): per 10 open tiles 2.5 tufts and 1.5 flowers, mostly in loose drifts of 2-3, an accent clump at most 1 in 40 tiles and 4 tiles from another, never two in a tile, about 6 tiles in 10 bare
const used = new Set(), decals = [];
const near = (x, y, r) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (blocked.has((y + dy) * W + x + dx)) return true; return false; };
const keep = new Set([[HX, HY], ...finds.map(([x, y]) => [x, y]), [9, 24]].map(([x, y]) => y * W + x));
const nearHeart = (x, y) => Math.max(Math.abs(x - HX), Math.abs(y - HY)) <= 2;
const open = [];
for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) if (at(x, y) === GRASS && !nearHeart(x, y) && !blocked.has(y * W + x) && !keep.has(y * W + x) && !near(x, y, 0)) open.push([x, y]);
const free = ([x, y]) => !nearHeart(x, y) && x >= 2 && y >= 2 && x < W - 2 && y < H - 2 && at(x, y) === GRASS && !blocked.has(y * W + x) && !keep.has(y * W + x) && !used.has(y * W + x);
const order = open.map(([x, y], i) => [hash32('decor', x, y), x, y]).sort((a, b) => a[0] - b[0]);
const put = (kind, x, y, k) => {
  used.add(y * W + x);
  const dx = (hash32('nudge', x, y) % 7) - 3, dy = -(hash32('nudge-y', x, y) % 4);   // whole master pixels inside the tile
  decals.push(ent('Decal', x, y, 1, 1, { kind }, [x * 16 + dx, y * 16 + dy]));
  void k;
};
const nOpen = open.length, wantTuft = Math.round(nOpen * 0.25), wantFlower = Math.round(nOpen * 0.15), wantClump = Math.floor(nOpen / 40);
const TUFT = ['tuft-fan', 'tuft-lean', 'tuft-small'], FLOWER = ['flower-daisy', 'flower-buttercup', 'flower-daisy-pair', 'flower-blue-pair', 'flower-pink-three'];
let tufts = 0, flowers = 0, clumps = 0; const clumpAt = [];
for (const [h, x, y] of order) {
  if (!free([x, y])) continue;
  if (clumps < wantClump && h % 4 === 0 && clumpAt.every(([a, b]) => Math.max(Math.abs(a - x), Math.abs(b - y)) >= 4)) { put('clump-tall', x, y); clumps++; clumpAt.push([x, y]); continue; }
  if (flowers < wantFlower && h % 5 < 2) {
    const kind = FLOWER[h % FLOWER.length]; put(kind, x, y); flowers++;
    const more = h % 3 === 0 ? 0 : 1 + (h % 2);   // some stay alone; others get 1-2 more within 2 tiles, 70% the same kind
    for (let m = 0; m < more; m++) { for (const [dx, dy] of [[1, 1], [-1, 1], [2, 0], [-2, 1], [0, 2], [1, -1]].slice(h % 3)) { const q = [x + dx, y + dy]; if (free(q)) { put((hash32('kind', q[0], q[1]) % 10) < 7 ? kind : FLOWER[(h >> 3) % FLOWER.length], q[0], q[1]); flowers++; break; } } }
    continue;
  }
  if (tufts < wantTuft && h % 5 < 3) { put(TUFT[h % TUFT.length], x, y); tufts++; }
}
const counts = { open: nOpen, tufts, flowers, clumps, bare: nOpen - tufts - flowers - clumps };

// ---- the level
L.pxWid = W * 16; L.pxHei = H * 16;
for (const layer of L.layerInstances) {
  layer.__cWid = W; layer.__cHei = H;
  if (layer.__identifier === 'Terrain') layer.intGridCsv = Array.from(t);
  else if (layer.__identifier === 'Props') layer.entityInstances = props;
  else if (layer.__identifier === 'Decals') layer.entityInstances = decals;
  else if (layer.__identifier === 'Marks') layer.entityInstances = marks;
  else if (layer.__identifier === 'Canopy') layer.entityInstances = [];
}
const mood = L.fieldInstances.find((f) => f.__identifier === 'mood');
setField(mood, 'Dappled and hushed; groves of broad trees with the meadow running on between them past every side, a dense thicket in the east, and the great hollow tree on its worn clearing.');
writeFileSync(file, JSON.stringify(L, null, '\t') + '\n');
console.log('HollowTree written', JSON.stringify(counts));

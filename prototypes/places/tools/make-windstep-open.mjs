// Windstep in the open style (walk content B5): 24 x 28, no edge ring, every side runs on into the next cell. Writes art/places/ldtk/places/Windstep.ldtkl from the layout below, by hand-placed
// rectangles and points plus the art desk's meadow-decor density rule (mibi-art 5734abc5, manifest.json "density"). Re-running gives the same file. LDtk opens the result.
//   node prototypes/places/tools/make-windstep-open.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hash32 } from '../src/dualgrid.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), repo = path.resolve(here, '..', '..', '..');
const file = path.join(repo, 'art', 'places', 'ldtk', 'places', 'Windstep.ldtkl');
const project = JSON.parse(readFileSync(path.join(repo, 'art', 'places', 'ldtk', 'places.ldtk'), 'utf8'));
const L = JSON.parse(readFileSync(file, 'utf8'));
const W = 24, H = 28, GRASS = 6, PATH = 5, EARTH = 7, CLIFF = 8, THICKET = 9, SCRUB = 10, WATER = 2, DEEP = 1;

// ---- the ground
const t = new Uint8Array(W * H).fill(GRASS);
const rect = (x, y, w, h, v) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) t[j * W + i] = v; };
const at = (x, y) => t[y * W + x];
rect(3, 3, 8, 5, CLIFF);                                    // the raised land in the north-west: its face on row 7, a way up at x 6-7
rect(17, 10, 5, 7, WATER); for (const [x, y] of [[17, 10], [21, 10], [17, 16], [21, 16]]) t[y * W + x] = GRASS;   // the lake in the east, its corners rounded
rect(19, 12, 2, 3, DEEP);
rect(2, 17, 3, 5, THICKET); t[17 * W + 2] = GRASS; t[21 * W + 4] = GRASS; t[19 * W + 5] = THICKET;   // a thicket in the west, its edge uneven
rect(3, 12, 4, 2, SCRUB);                                    // low scrub, a soft stretch
rect(11, 12, 3, 3, EARTH);                                   // the heart's clearing (radius 1.5), the heart at its middle
for (const [x, y] of [[11, 25], [11, 24], [11, 23], [12, 22], [12, 21], [12, 20], [12, 19], [12, 18], [12, 17]]) t[y * W + x] = PATH;   // the road from the south, ending short of the clearing
for (const [x, y] of [[7, 9], [8, 10], [8, 11], [9, 12]]) t[y * W + x] = PATH;   // a footpath from the way up toward the clearing

// ---- the entities
const proto = {};
for (const l of L.layerInstances) for (const e of l.entityInstances || []) proto[e.__identifier] ||= e;
const defUid = (id) => project.defs.entities.find((e) => e.identifier === id).uid;
let n = 0;
const iid = () => { const h = (k) => (hash32('windstep-open', n, k) >>> 0).toString(16).padStart(8, '0'); n++; const a = h(1), b = h(2), c = h(3), d = h(4); return `${a}-${b.slice(0, 4)}-4${b.slice(5, 8)}-a${c.slice(1, 4)}-${c.slice(4)}${d.slice(0, 4)}`; };
const setField = (fi, v) => {
  fi.__value = v;
  fi.realEditorValues = Array.isArray(v) ? v.map((x) => ({ id: 'V_String', params: [typeof x === 'object' ? `${x.cx},${x.cy}` : x] })) : typeof v === 'number' ? [{ id: 'V_Float', params: [v] }] : [{ id: 'V_String', params: [v] }];
};
// px: the top-left of the entity's 16 px box in pixels (any pixel for props and decals: their foot is the box's bottom middle)
const ent = (id, cx, cy, w = 1, h = 1, fields = {}, px = [cx * 16, cy * 16]) => {
  const e = JSON.parse(JSON.stringify(proto[id] || proto.Opening));
  e.__identifier = id; e.__grid = [cx, cy]; e.iid = iid(); e.width = w * 16; e.height = h * 16; e.px = px; e.defUid = defUid(id);
  e.__tags = id === 'Prop' ? ['prop'] : id === 'Decal' ? ['decal'] : e.__tags; if (!proto[id]) { e.__smartColor = id === 'WayUp' ? '#B8D96B' : '#4FC3A1'; e.fieldInstances = []; }
  for (const f of e.fieldInstances) if (f.__identifier in fields) setField(f, fields[f.__identifier]);
  return e;
};
const props = [], blocked = new Set();
const prop = (kind, x, y) => { props.push(ent('Prop', x, y, 1, 1, { kind })); blocked.add(y * W + x); };
for (const [k, x, y] of [['tree-broad', 8, 15], ['tree-autumn', 7, 20], ['tree-broad', 9, 22], ['tree-autumn', 15, 23], ['tree-broad', 20, 21], ['tree-broad', 16, 7], ['tree-autumn', 20, 8], ['tree-broad', 5, 25], ['tree-autumn', 15, 18], ['bush-small', 10, 25], ['bush-small', 14, 10]]) prop(k, x, y);

const marks = [];
marks.push(ent('Heart', 12, 13, 1, 1, { kinds: ['spring', 'moment'], species: [], revealLine: 'Clear water rises in the grass.', reachBy: 'none' }));
marks.push(ent('Clue', 8, 21, 1, 1, { tell: 'shimmer', path: [{ cx: 8, cy: 21 }, { cx: 9, cy: 19 }, { cx: 10, cy: 17 }, { cx: 11, cy: 15 }, { cx: 12, cy: 14 }] }));
const finds = [[15, 15, ['pod'], 1], [8, 9, ['fruit', 'dew'], 1], [21, 18, ['stone'], 1], [9, 17, ['pod', 'fruit'], 0.6], [14, 8, ['fruit', 'dew'], 0.6], [20, 24, ['stone', 'material'], 0.6], [3, 23, ['dew'], 0.6], [13, 24, ['pod', 'material'], 0.6]];
for (const [x, y, kinds, chance] of finds) marks.push(ent('Find', x, y, 1, 1, { kinds, chance }));
marks.push(ent('Landmark', 17, 19, 1, 1, { prop: 'tree-autumn', label: 'the lone tree' }));
prop('tree-autumn', 17, 19);
for (const [side, x, y, w, h] of [['N', 12, 0, 10, 1], ['S', 4, 27, 16, 1], ['W', 0, 10, 1, 15], ['E', 23, 3, 1, 7]]) marks.push(ent('Opening', x, y, w, h, { side }));
for (const [x, y, w, h] of [[5, 22, 3, 3], [17, 3, 4, 3], [13, 17, 3, 2]]) marks.push(ent('CreatureSpawn', x, y, w, h, { species: [], count: 1 }));
marks.push(ent('WayUp', 6, 7, 2, 1));
marks.push(ent('ReedBank', 16, 11, 2, 5));

// ---- the meadow decor (the desk's density rule): per 10 open tiles 2.5 tufts and 1.5 flowers, mostly in loose drifts of 2-3, an accent clump at most 1 in 40 tiles and 4 tiles from another, never two in a tile, about 6 tiles in 10 bare
const used = new Set(), decals = [];
const near = (x, y, r) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (blocked.has((y + dy) * W + x + dx)) return true; return false; };
const keep = new Set([[12, 13], ...finds.map(([x, y]) => [x, y]), [8, 21]].map(([x, y]) => y * W + x));
const nearHeart = (x, y) => Math.max(Math.abs(x - 12), Math.abs(y - 13)) <= 2;
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
setField(mood, 'Airy and open; the meadow runs on past every side, a raised ledge with a way up stands in the north-west, a lake with a reed bank in the east, and a lone tree on the open ground.');
writeFileSync(file, JSON.stringify(L, null, '\t') + '\n');
console.log('Windstep written', JSON.stringify(counts));

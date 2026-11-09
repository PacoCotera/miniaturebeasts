// The shared writer of the open-style levels (walk content B7-B9): a 24 x 28 place from a spec of hand-placed rectangles and points, plus the art desk's meadow-decor density rule
// (mibi-art 5734abc5). Used by make-hollowtree-open.mjs, make-splitstone-open.mjs and make-reedpool-open.mjs; re-running gives the same file. LDtk opens the result.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hash32 } from '../src/dualgrid.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), repo = path.resolve(here, '..', '..', '..');
export const W = 24, H = 28;
export const T = { DEEP: 1, WATER: 2, SAND: 3, MUD: 4, PATH: 5, GRASS: 6, EARTH: 7, CLIFF: 8, THICKET: 9, SCRUB: 10 };

// The ground: a Uint8Array(W * H) of grass and the rectangles painted over it.
export function ground() {
  const t = new Uint8Array(W * H).fill(T.GRASS);
  return {
    t,
    rect: (x, y, w, h, v) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) t[j * W + i] = v; },
    blob: (cx, cy, rx, ry, v) => { for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (((i - cx) / rx) ** 2 + ((j - cy) / ry) ** 2 <= 1) t[j * W + i] = v; },   // an ellipse, for ground that is not a box
    ring: (of, v) => { const src = t.slice(); for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (src[j * W + i] === T.GRASS) { let near = false; for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) if (src[(j + dj) * W + i + di] === of) near = true; if (near) t[j * W + i] = v; } },   // every grass cell next to `of` (8 neighbours) becomes v: a shore all round
    set: (pts, v) => { for (const [x, y] of pts) t[y * W + x] = v; },
  };
}

// spec: { file: 'Name', tag, terrain (Uint8Array), props: [[kind, x, y]], heart: { x, y, fields }, clue: { x, y, fields }, finds: [[x, y, kinds, chance]], landmark: { x, y, prop, label },
//         openings: [[side, x, y, w, h]], spawns: [[x, y, w, h, species]], extra: [{ id, x, y, w, h }] (WayUp, ReedBank), names?, mood, decorOn (terrain value, default grass), keep: [[x, y]] }
export function writeLevel(spec) {
  const file = path.join(repo, 'art', 'places', 'ldtk', 'places', spec.file + '.ldtkl');
  const project = JSON.parse(readFileSync(path.join(repo, 'art', 'places', 'ldtk', 'places.ldtk'), 'utf8'));
  const L = JSON.parse(readFileSync(file, 'utf8'));
  const t = spec.terrain, at = (x, y) => t[y * W + x];
  const proto = {};
  for (const l of L.layerInstances) for (const e of l.entityInstances || []) proto[e.__identifier] ||= e;
  const defUid = (id) => project.defs.entities.find((e) => e.identifier === id).uid;
  let n = 0;
  const iid = () => { const h = (k) => (hash32(spec.tag, n, k) >>> 0).toString(16).padStart(8, '0'); n++; const a = h(1), b = h(2), c = h(3), d = h(4); return `${a}-${b.slice(0, 4)}-4${b.slice(5, 8)}-a${c.slice(1, 4)}-${c.slice(4)}${d.slice(0, 4)}`; };
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
  for (const [kind, x, y] of spec.props) { props.push(ent('Prop', x, y, 1, 1, { kind })); blocked.add(y * W + x); }
  const lm = spec.landmark, hx = spec.heart.x, hy = spec.heart.y;
  const marks = [];
  marks.push(ent('Heart', hx, hy, 1, 1, spec.heart.fields));
  marks.push(ent('Clue', spec.clue.x, spec.clue.y, 1, 1, spec.clue.fields));
  for (const [x, y, kinds, chance] of spec.finds) marks.push(ent('Find', x, y, 1, 1, { kinds, chance }));
  marks.push(ent('Landmark', lm.x, lm.y, 1, 1, { prop: lm.prop, label: lm.label }));
  for (const [side, x, y, w, h] of spec.openings) marks.push(ent('Opening', x, y, w, h, { side }));
  for (const [x, y, w, h, species] of spec.spawns) marks.push(ent('CreatureSpawn', x, y, w, h, { species, count: 1 }));
  for (const e of spec.extra || []) marks.push(ent(e.id, e.x, e.y, e.w, e.h));

  // ---- the meadow decor (the desk's density rule): per 10 open tiles 2.5 tufts and 1.5 flowers, mostly in loose drifts of 2-3, an accent clump at most 1 in 40 tiles and 4 tiles from another, never two in a tile, about 6 tiles in 10 bare
  const used = new Set(), decals = [], decorOn = spec.decorOn ?? T.GRASS;
  const near = (x, y, r) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (blocked.has((y + dy) * W + x + dx)) return true; return false; };
  const keep = new Set([[hx, hy], ...spec.finds.map(([x, y]) => [x, y]), [spec.clue.x, spec.clue.y], ...(spec.keep || [])].map(([x, y]) => y * W + x));
  const nearHeart = (x, y) => Math.max(Math.abs(x - hx), Math.abs(y - hy)) <= 2;
  const open = [];
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) if (at(x, y) === decorOn && !nearHeart(x, y) && !blocked.has(y * W + x) && !keep.has(y * W + x) && !near(x, y, 0)) open.push([x, y]);
  const free = ([x, y]) => !nearHeart(x, y) && x >= 2 && y >= 2 && x < W - 2 && y < H - 2 && at(x, y) === decorOn && !blocked.has(y * W + x) && !keep.has(y * W + x) && !used.has(y * W + x);
  const order = open.map(([x, y]) => [hash32('decor', x, y), x, y]).sort((a, b) => a[0] - b[0]);
  const put = (kind, x, y) => {
    used.add(y * W + x);
    const dx = (hash32('nudge', x, y) % 7) - 3, dy = -(hash32('nudge-y', x, y) % 4);   // whole master pixels inside the tile
    decals.push(ent('Decal', x, y, 1, 1, { kind }, [x * 16 + dx, y * 16 + dy]));
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
  setField(L.fieldInstances.find((f) => f.__identifier === 'mood'), spec.mood);
  if (spec.names) setField(L.fieldInstances.find((f) => f.__identifier === 'names'), spec.names);
  writeFileSync(file, JSON.stringify(L, null, '\t') + '\n');
  console.log(spec.file + ' written', JSON.stringify(counts));
}

// Generator 7, chunk G3: props and decor on world coordinates. Pure: no page state, DOM, storage, clock or Math.random.
// Every prop and decal here is a function of the realm seed and a WORLD tile position, never of a cell: a cell asks for the rectangle of the world it shows and gets the same props the
// neighbour gets for the same tiles (scheme Rule 2, the variety scheme's per-biome table). Nothing snaps to the cell grid; groves and outcrops follow the field.
//
// How a cluster (a grove, an outcrop, a pair, a drift of tall grass) is made, all by position:
//   - seeds: one per world block per kind per biome (block size and share from TABLE), jittered inside the block, kept when a hash and a noise field (FastNoiseLite) allow it and when the biome at
//     the seed's own (jittered) position is that biome, so a biome thins into the next over a few tiles and never on a cell edge;
//   - claim: a tile belongs to the cluster of the nearest seed of its kind (a Voronoi cell), so two clusters never overlap and no cluster depends on another of its kind;
//   - growth: from the seed onto tiles of its own claim, trunk by trunk, each touching the cluster (crowns touch) and none beside another, until the cluster has its size; a cluster that
//     cannot reach its smallest size (a grove of 4) is dropped whole, leaving a clearing;
//   - kinds come in an order (trees, rocks, stumps, bushes, tall-grass sweeps); a later kind never stands on a tile an earlier kind holds. Each tile's answer is a function of the world.
// Where props stand: never on a tile beside water, thicket or the cliff's lip (so a prop never closes a gap), never beside a trail, never at a way up, never near the Hollow Tree's clearing, and only
// on a plain tile (the tile and its eight neighbours one terrain: one full cell clear of every lip, shore and edge). Tufts, flowers and clumps sit wholly inside a plain cell too. Scrub shrubs (the desk's
// shrub-1..4) stand sparsely inside scrub patches, a full cell off every scrub edge, never touching each other; scrub holds no other prop or decal.
// Raised land's top is dressed like the low ground of its biome by the same scatter. Decals (tufts, flowers, clumps) follow the art desk's meadow density on every grass tile.
import { noiseField } from './world.mjs';
import { reedClumps } from './reeds.mjs';
import { RULES } from './rules.mjs';
import SPRITES from '../../../../art/places/sets/ninja-test/set.json' with { type: 'json' };   // the sprites' sizes and feet (every sprite is drawn at 1x), read by the no-overlap rule

// a sprite's rectangle on the 48 px world frame, from the point its foot stands on: [left, top, width, height]; null for a kind the set does not hold
const spriteRect = (s, ax, ay) => (s ? [ax - s.anchor[0], ay - s.anchor[1], s.rect[2], s.rect[3]] : null);
const overlaps = (a, b) => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];

export const TERR = { DEEP: 1, WATER: 2, SAND: 3, MUD: 4, PATH: 5, GRASS: 6, EARTH: 7, CLIFF: 8, THICKET: 9, SCRUB: 10, LITTER: 11, DRY: 12, TURF: 13, SCREE: 14 };
const { DEEP, WATER, SAND, PATH, GRASS, CLIFF, THICKET, SCRUB, LITTER, DRY, TURF, SCREE } = TERR;
const OPEN = t => t === GRASS || t === DRY || t === TURF;   // the open low ground a prop may stand on (the biome grounds are patches of it)

// ---- the table (variety scheme section 2; where it gives no number, the pick is marked and listed in the report) ----
// trees/rocks/bushes: { B: block size in tiles, used: share of blocks that hold a cluster, size: [min, max] trees, keep: smallest size kept }, stumps: { B, used }, sweeps: as trees (tall grass).
// reeds: share of 4 x 4 stretches of shore with the reed-bank look. pads: lily pads, share of open-water tiles. broad: share of groves of the broad kind (the rest autumn).
export const FAMS = ['trees', 'rocks', 'stumps', 'bushes', 'sweeps'];
export const TABLE = RULES.biomes;
export const BIOME_IDS = Object.keys(TABLE);
// props per 100 tiles a table row asks for (on tiles where the kind may stand)
export const expectedPer100 = (biome, fam) => { const P = TABLE[biome][fam]; if (!P) return 0; const m = P.size ? (P.size[0] + P.size[1]) / 2 : 1; return 100 * P.used * m / (P.B * P.B); };

// the sweeps of tall grass are still pictures now: the signed tufts-2 and tufts-3, each as it is and mirrored (art director: mirrored at random, no new paint)
export const SWEEPS = ['tall-grass', 'tall-grass-b', 'tall-grass-m', 'tall-grass-bm'];
// the three signed boulder shapes and their mirrors (the art director's rock family, mibi-art ffa823829): an outcrop's rocks each take a shape by the rule's shares (props.groves.rockShapes) and a mirror by hash
const ROCK_SHAPES = ['rock-a', 'rock-b', 'rock-big'];
const KINDS = { broad: 'tree-broad', autumn: 'tree-autumn', bushes: ['bush-big', 'bush-round', 'bush-small'], stump: 'stump', hollow: 'tree-hollow' };
export const TREE_KINDS = [KINDS.broad, KINDS.autumn];
export const ROCK_KINDS = ROCK_SHAPES.flatMap(s => [s, `${s}-m`]);
export const BUSH_KINDS = KINDS.bushes;
export const HOLLOW = 'tree-hollow';
// the meadow scatter's plants (the art director's quiet-ground rule, art/places/map-rules.json meadow.scatter): a kind of the rule is one or more slots of the set, each drawn in three sizes (young, middle, grown) and mirrored;
// the set's names are sc-<slot>[-young|-grown][-m]; the six grass flecks keep their own names (fleck-0 .. fleck-5, mirrored fleck-0m ..), one size
export const SCATTER_SLOTS = {
  'flower-pink': ['flowers-1'], 'flower-white': ['flowers-2'], 'flower-yellow': ['flowers-3'], 'flower-blue': ['flowers-blue-pair'],
  tuft: ['tufts-1', 'tufts-2', 'tufts-3'], clump: ['clump-tall', 'clump-tall-s'], shrub: ['shrub-1', 'shrub-2', 'shrub-3', 'shrub-4'], bush: ['bush-round'],
};
export const isScatterPlant = kind => kind.startsWith('sc-') || /^fleck-\d/.test(kind);
// the scrub shrubs (the desk's shrub-1..4, mibi-art 34a8dc49c): on the inside of a scrub patch only, never on neighbouring tiles (a shrub is 15 px in a 16 px tile, so two in a row would touch); at this raw rate about
// one in three of the scrub tiles a shrub may stand on holds one (one in two is a checkerboard, a lattice)
export const SHRUBS = ['shrub-1', 'shrub-2', 'shrub-3', 'shrub-4'];
// the grass flecks (art director signed: single blades, pale pairs, 2-blade flicks; mibi-art 633e4d641, out/scatter-rule.md): tiny texture on open grass, about one tile in 2.5, one a tile, in its tile with a pixel's margin
// All the numbers of the rules above (the table, the raw rates of tufts, flowers, clumps and flecks, the neighbourhood sizes, the hollow tree's clearing) are in art/places/map-rules.json.

// ---- integer hashing by position ----
const mix = h => { h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return h >>> 0; };
const H = (seed, tag, x, y, z = 0) => { let h = Math.imul(seed | 0, 0x9e3779b1) ^ Math.imul(tag, 0x85ebca6b); h = mix(h ^ Math.imul(x | 0, 0xc2b2ae35)); h = mix(h ^ Math.imul(y | 0, 0x27d4eb2f)); return mix(h ^ Math.imul(z | 0, 0x165667b1)); };
const U = (seed, tag, x, y, z) => H(seed, tag, x, y, z) / 4294967296;
const TAG = { SEED: 100, POS: 200, JIT: 300, GROW: 400, SIZE: 500, KIND: 600, USE: 700, HOLLOW: 800, CLUMP: 900, FLOWER: 910, FLKIND: 920, FLOFF: 930, TUFT: 940, TUFTKIND: 950, NUDGE: 960, REED: 970, PAD: 980, PEB: 990, MEM: 1000, SHRUB: 1010, REEDB: 1020, FLECK: 1030, OVERLAP: 1040, ROCK: 1050, SC: 1060, GROUND: 1100 };
const key = (x, y) => y * 8192 + x;
const CS = 16;                                           // coarse cells of the seed index, in tiles
const sizeRange = P => P.size || [1, 1];

// land: { T(gx, gy) terrain value (outside the map: thicket), biome(gx, gy) biome id, W, H (world tiles), wayups: [{ x, y, w, h }] (all of them),
//         slots: [{ ax, ay, biome, x0, y0, x1, y1 }] (the atlas slots in world tiles) }
// rules: the map rules (art/places/map-rules.json); a changed copy shows what a change does
export function createDecor(seed, land, rules = RULES, presetSites = null) {
  const { T, biome } = land, TABLE = rules.biomes, BIOME_IDS = Object.keys(TABLE);
  const { props: PR, meadow: MD, shrubs: SH, water: WA, reeds: RE } = rules, GV = PR.groves, HO = PR.hollow, CLEAR = PR.clear;
  const nG = noiseField(seed, 'g3-grove', GV.noise.scale, 'FBm', GV.noise.octaves);
  const inMap = (x, y) => x >= 0 && y >= 0 && x < land.W && y < land.H;
  // ---- way ups: the cells under them (the lip does not block there) and the zone kept clear round them
  const wayCell = new Set(), wayZone = new Set();
  for (const a of land.wayups) {
    for (let y = a.y; y < a.y + a.h; y++) for (let x = a.x; x < a.x + a.w; x++) wayCell.add(key(x, y));
    const WZ = PR.wayZone;
    for (let y = a.y - WZ.up; y <= a.y + a.h - 1 + WZ.down; y++) for (let x = a.x - WZ.left; x <= a.x + a.w - 1 + WZ.right; x++) wayZone.add(key(x, y));
  }
  // ---- tile classes: solid (water, thicket, the cliff's lip), path
  const cls = new Map();
  const isLip = (x, y) => T(x, y) === CLIFF && !wayCell.has(key(x, y)) && (T(x + 1, y) !== CLIFF || T(x - 1, y) !== CLIFF || T(x, y + 1) !== CLIFF || T(x, y - 1) !== CLIFF);
  const flags = (x, y) => {
    if (!inMap(x, y)) return 1;
    const k = key(x, y), hit = cls.get(k); if (hit !== undefined) return hit;
    const t = T(x, y), f = (t === WATER || t === DEEP || t === THICKET || isLip(x, y) ? 1 : 0) | (t === PATH ? 2 : 0) | (isLip(x, y) ? 4 : 0);
    if (cls.size > 600000) cls.clear();
    cls.set(k, f); return f;
  };
  // a plain tile: it and its eight neighbours are one terrain, so no edge, shore or lip is drawn on it or beside it (the art director, 2026-11-09: props keep one full cell clear of every lip, shore and
  // edge; tufts sit wholly inside a plain cell; only decor made for an edge, the shore pebbles and the reed banks, sits on one)
  const plainMemo = new Map();
  const plain = (x, y) => {
    const k = key(x, y), hit = plainMemo.get(k); if (hit !== undefined) return hit;
    const t = T(x, y); let ok = true;
    for (let dy = -CLEAR; dy <= CLEAR && ok; dy++) for (let dx = -CLEAR; dx <= CLEAR; dx++) if (T(x + dx, y + dy) !== t) { ok = false; break; }
    if (plainMemo.size > 600000) plainMemo.clear();
    plainMemo.set(k, ok); return ok;
  };
  const near9 = (x, y, bit) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (flags(x + dx, y + dy) & bit) return true; return false; };
  const lip = (x, y) => (flags(x, y) & 4) !== 0;

  // ---- the Hollow Tree: a site in each region of Woods or Tallwood, on a clearing of plain grass (nothing is drawn on the terrain here: the clearing is the absence of props) ----
  let sites = presetSites;   // the Hollow Tree sites may be given (made off the page by src/realm-worker.mjs): a list of { x, y, slot }
  const CL = HO.clearing, clearing = (x, y) => { for (let dy = -CL.up; dy <= CL.down; dy++) for (let dx = -CL.left; dx <= CL.right; dx++) { { const tt = T(x + dx, y + dy); if ((!OPEN(tt) && tt !== LITTER) || flags(x + dx, y + dy) !== 0) return false; } } return true; };
  const hollowSites = () => {
    if (sites) return sites;
    sites = [];
    for (const s of land.slots) {
      if (s.biome !== 'woods' && s.biome !== 'tallwood') continue;
      const tx = Math.floor((s.x0 + s.x1) / 2) + ((H(seed, TAG.HOLLOW, s.ax, s.ay) % 161) - 80), ty = Math.floor((s.y0 + s.y1) / 2) + ((H(seed, TAG.HOLLOW + 1, s.ax, s.ay) % 221) - 110);
      let found = null;
      for (let r = 0; r <= 90 && !found; r += 3) for (let k = 0; k < 8 * Math.max(r / 3, 1) && !found; k++) {   // rings round the target
        const a = (2 * Math.PI * k) / (8 * Math.max(r / 3, 1)) + (H(seed, TAG.HOLLOW + 2, s.ax, s.ay) % 100) / 100, x = Math.round(tx + r * Math.cos(a)), y = Math.round(ty + r * Math.sin(a));
        if (x < s.x0 + 8 || y < s.y0 + 8 || x > s.x1 - 8 || y > s.y1 - 8 || !clearing(x, y)) continue;
        found = { x, y };
      }
      if (found) sites.push({ ...found, slot: [s.ax, s.ay] });
    }
    return sites;
  };
  // the tiles other props keep off: the hollow tree's footprint (5 x 2) and two tiles round it; a crown (3 wide, 3 up) must keep two tiles from the tree's own box
  const hollowNear = (x, y, tree) => {
    const B = tree ? HO.keepOff.tree : HO.keepOff.other;
    for (const h of hollowSites()) {
      if (x >= h.x - B.left && x <= h.x + B.right && y >= h.y - B.up && y <= h.y + B.down) return true;
    }
    return false;
  };

  // ---- seeds ----
  const seedMemo = FAMS.map(() => new Map());
  const usedAt = (P, b, x, y) => Math.min(1, Math.max(0, P.used * (1 + GV.usedSwing * nG(x, y))));
  function seedsIn(fi, cx, cy) {
    const memo = seedMemo[fi], ck = cy * 4096 + cx, hit = memo.get(ck); if (hit) return hit;
    const fam = FAMS[fi], out = [], x0 = cx * CS, y0 = cy * CS;
    BIOME_IDS.forEach((b, bi) => {
      const P = TABLE[b][fam]; if (!P) return;
      const B = P.B, m = B >> 2;
      for (let by = Math.floor(y0 / B); by <= Math.floor((y0 + CS - 1) / B); by++) for (let bx = Math.floor(x0 / B); bx <= Math.floor((x0 + CS - 1) / B); bx++) {
        const h = H(seed, TAG.SEED + fi, bx, by, bi), px = bx * B + m + ((h >>> 8) % (B - 2 * m)), py = by * B + m + ((h >>> 16) % (B - 2 * m));
        if (Math.floor(px / CS) !== cx || Math.floor(py / CS) !== cy || !inMap(px, py)) continue;
        if (U(seed, TAG.USE + fi, bx, by, bi) >= usedAt(P, b, px, py)) continue;
        if (biome(px + (H(seed, TAG.JIT + fi, bx, by, bi) % 13) - 6, py + (H(seed, TAG.JIT + fi + 10, bx, by, bi) % 13) - 6) !== b) continue;
        const [lo, hi] = sizeRange(P), size = lo + (H(seed, TAG.SIZE + fi, bx, by, bi) % (hi - lo + 1)), rmax = GV.reach.base + GV.reach.perSize * size;
        let kind = null;
        if (fam === 'trees') kind = U(seed, TAG.KIND, bx, by, bi) < (TABLE[b].broad ?? 0.5) ? KINDS.broad : KINDS.autumn;
        out.push({ fi, x: px, y: py, size, rmax, rmax2: rmax * rmax, kind, b, P, k: (fi * 16 + bi) * 1e9 + by * 40000 + bx, h });
      }
    });
    memo.set(ck, out); if (memo.size > 40000) memo.clear();
    return out;
  }
  // the seed whose claim the tile lies in (the nearest of its kind within its reach); `inner`: only when the tile is at least 0.75 tile from every other seed's claim (the bisector),
  // so two tiles beside each other, corners too, never belong to two clusters
  function owner(fi, x, y, inner = false) {
    const cx = Math.floor(x / CS), cy = Math.floor(y / CS); let best = null, bd = Infinity;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) for (const s of seedsIn(fi, cx + dx, cy + dy)) {
      const d = (s.x - x) * (s.x - x) + (s.y - y) * (s.y - y);
      if (d < bd || (d === bd && s.k < best.k)) { best = s; bd = d; }
    }
    if (!best || bd > best.rmax2) return null;
    if (inner) {
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) for (const s of seedsIn(fi, cx + dx, cy + dy)) {
        if (s === best) continue;
        const d = (s.x - x) * (s.x - x) + (s.y - y) * (s.y - y), len = Math.hypot(s.x - best.x, s.y - best.y);
        if ((d - bd) / (2 * len) < GV.bisector) return null;
      }
    }
    return best;
  }

  // ---- where each kind may stand ----
  const stands = (fi, x, y) => {
    if (!inMap(x, y)) return false;
    const t = T(x, y);
    if (fi === 4) return (OPEN(t) || t === CLIFF) && plain(x, y) && !near9(x, y, 4) && !hollowNear(x, y, false);
    if (!(OPEN(t) || t === LITTER || t === CLIFF || (fi === 1 && (t === SAND || t === SCREE)))) return false;
    return plain(x, y) && !near9(x, y, 1) && !near9(x, y, 2) && !wayZone.has(key(x, y)) && !hollowNear(x, y, fi === 0);
  };
  // a tile an earlier kind holds, or (for a prop that blocks) one beside it: no two props that block ever touch, even at a corner, so a ring of them cannot close a gap
  const earlier = (fi, x, y) => {
    for (let f = 0; f < fi; f++) {
      if (fi === 4) { if (memberOf(f, x, y)) return true; continue; }
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (memberOf(f, x + dx, y + dy)) return true;
    }
    return false;
  };

  // would a tile added to a cluster close a pocket: a free tile within two of it that the cluster's trunks and the walls leave no way out of (a 5 x 5 look-out is enough: a cluster is small)
  const pocket = (members, cx, cy) => {
    const R = 5, W = 2 * R + 1, blocked = new Uint8Array(W * W), at = (x, y) => (y - cy + R) * W + x - cx + R;
    for (let y = cy - R; y <= cy + R; y++) for (let x = cx - R; x <= cx + R; x++) if (flags(x, y) & 1) blocked[at(x, y)] = 1;
    for (const m of members) if (Math.abs(m.x - cx) <= R && Math.abs(m.y - cy) <= R) blocked[at(m.x, m.y)] = 1;
    blocked[at(cx, cy)] = 1;
    const out = new Uint8Array(W * W), q = [];
    for (let i = 0; i < W; i++) for (const [x, y] of [[cx - R + i, cy - R], [cx - R + i, cy + R], [cx - R, cy - R + i], [cx + R, cy - R + i]]) { const k = at(x, y); if (!blocked[k] && !out[k]) { out[k] = 1; q.push([x, y]); } }
    for (let h = 0; h < q.length; h++) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = q[h][0] + dx, y = q[h][1] + dy; if (Math.abs(x - cx) > R || Math.abs(y - cy) > R) continue; const k = at(x, y); if (!blocked[k] && !out[k]) { out[k] = 1; q.push([x, y]); } }
    for (let y = cy - 2; y <= cy + 2; y++) for (let x = cx - 2; x <= cx + 2; x++) { const k = at(x, y); if (!blocked[k] && !out[k]) return true; }
    return false;
  };

  // ---- clusters ----
  const clusterMemo = FAMS.map(() => new Map());
  function cluster(fi, s) {
    const memo = clusterMemo[fi], hit = memo.get(s.k); if (hit) return hit;
    const members = [], set = new Map(), P = s.P, keep = P.keep || 1, touch2 = GV.touchD2[FAMS[fi]], minD2 = P.minD2 || GV.minD2;
    const ok = (x, y) => owner(fi, x, y, fi !== 4) === s && stands(fi, x, y) && !earlier(fi, x, y);
    const add = (x, y) => { const j = members.length, m = { x, y, kind: memberKind(fi, s, x, y) }; members.push(m); set.set(key(x, y), m.kind); return j; };
    // the first member is the seed's own tile (a seed on water, thicket or beside a wall holds no cluster: a grove thins toward a shore instead of crowding onto it)
    const first = ok(s.x, s.y) ? [s.x, s.y] : null;
    if (first && fi !== 2) {
      add(first[0], first[1]);
      while (members.length < s.size) {
        let best = null, bh = Infinity;
        for (const m of members) for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
          const x = m.x + dx, y = m.y + dy; if (set.has(key(x, y))) continue;
          if (fi === 4) { if (Math.abs(dx) > 1 || Math.abs(dy) > 1) continue; }
          else if (dx * dx + dy * dy > touch2) continue;
          if ((x - s.x) * (x - s.x) + (y - s.y) * (y - s.y) > s.rmax2) continue;
          let apart = true, close = false;   // never beside another, not even at a corner (a wood's groves may touch at a corner, a closed canopy side by side)
          if (fi !== 4) for (const q of members) { const d2 = (q.x - x) * (q.x - x) + (q.y - y) * (q.y - y); if (d2 < minD2) { apart = false; break; } if (d2 <= 2) close = true; }
          if (!apart) continue;
          const g = H(seed, TAG.GROW + fi, x, y, s.h); if (g >= bh) continue;
          if (!ok(x, y) || (close && pocket(members, x, y))) continue;
          best = [x, y]; bh = g;
        }
        if (!best) break;
        add(best[0], best[1]);
      }
    } else if (first) add(first[0], first[1]);
    const c = members.length >= keep ? { members, set } : { members: [], set: new Map() };
    memo.set(s.k, c); if (memo.size > 40000) memo.clear();
    return c;
  }
  // a stump has no cluster: its seed tile (or the nearest) is it
  function memberKind(fi, s, x, y) {
    if (fi === 0) return U(seed, TAG.MEM, x, y, s.h) < GV.otherKindShare ? (s.kind === KINDS.broad ? KINDS.autumn : KINDS.broad) : s.kind;   // about one tree in seven of the other kind
    if (fi === 1) {                                                                                                                // each rock of an outcrop: a shape by the rule's shares, a mirror by hash
      const u = U(seed, TAG.ROCK, x, y, s.h), sh = GV.rockShapes; let c = 0, shape = ROCK_SHAPES[ROCK_SHAPES.length - 1];
      for (const n of ROCK_SHAPES) { c += sh[n]; if (u < c) { shape = n; break; } }
      return H(seed, TAG.ROCK + 1, x, y, s.h) & 1 ? `${shape}-m` : shape;
    }
    if (fi === 2) return KINDS.stump;
    if (fi === 3) return KINDS.bushes[H(seed, TAG.MEM, x, y, s.h) % 3];
    return SWEEPS[H(seed, TAG.MEM + 1, x, y, s.h) % SWEEPS.length];
  }
  function memberOf(fi, x, y) { const s = owner(fi, x, y); if (!s) return null; return cluster(fi, s).set.get(key(x, y)) || null; }

  // ---- scrub shrubs: a scrub tile whose 3 x 3 is all scrub (a full cell off every scrub edge) may hold one by hash; of two candidates on neighbouring tiles (side by side) the lower hash wins, so none ever touch ----
  // The most the no-touching rule allows (art director, final): every eligible scrub tile (plain: a full cell off the patch edge) takes a shrub unless a neighbour at its side holds one, the tiles taken in an order
  // of per-tile hashes (a greedy maximal choice, never an even lattice, a checkerboard at most), the answer a function of the world alone. A patch with no eligible tile (1 or 2 cells across) takes one shrub
  // on its lowest-hash tile.
  const SIDE4 = [[1, 0], [-1, 0], [0, 1], [0, -1]], shrubMemo = new Map(), patchMemo = new Map();
  const shrubCand = (x, y) => inMap(x, y) && T(x, y) === SCRUB && plain(x, y);
  const prio = (x, y) => U(seed, TAG.SHRUB + 1, x, y);
  const before = (a, b, x, y) => { const v = prio(a, b), u = prio(x, y); return v < u || (v === u && (b < y || (b === y && a < x))); };
  const bigShrub = (x, y) => {   // an eligible tile: taken when no side neighbour that comes before it in the order is taken
    const k = key(x, y), hit = shrubMemo.get(k); if (hit !== undefined) return hit;
    let r = shrubCand(x, y);
    if (r) for (const [dx, dy] of SIDE4) { const a = x + dx, b = y + dy; if (shrubCand(a, b) && before(a, b, x, y) && bigShrub(a, b)) { r = false; break; } }
    if (shrubMemo.size > 400000) shrubMemo.clear();
    shrubMemo.set(k, r); return r;
  };
  // the scrub patch of a tile (4-connected, at most 80 tiles read): the tile that takes the patch's one shrub when the patch has no eligible tile, else null
  const smallPatchShrub = (x, y) => {
    const k = key(x, y), hit = patchMemo.get(k); if (hit !== undefined) return hit;
    const seen = new Map([[k, 1]]), q = [[x, y]];
    let eligible = false;
    for (let h = 0; h < q.length && q.length <= SH.smallPatchMax; h++) {
      const [px, py] = q[h]; if (shrubCand(px, py)) eligible = true;
      for (const [dx, dy] of SIDE4) { const a = px + dx, b = py + dy; if (inMap(a, b) && T(a, b) === SCRUB && !seen.has(key(a, b))) { seen.set(key(a, b), 1); q.push([a, b]); } }
    }
    let pick = null;
    if (!eligible && q.length <= SH.smallPatchMax) for (const [a, b] of q) if (!pick || before(a, b, pick[0], pick[1])) pick = [a, b];
    for (const [a, b] of q) patchMemo.set(key(a, b), pick && pick[0] === a && pick[1] === b);
    if (patchMemo.size > 400000) patchMemo.clear();
    return patchMemo.get(k);
  };
  const shrubAt = (x, y) => inMap(x, y) && T(x, y) === SCRUB && (bigShrub(x, y) || smallPatchShrub(x, y));

  // ---- the decor of the biome grounds (map-rules.json `ground`, the art director's per-100 values): leaf litter, dry grass, short turf and scree each take pieces on their plain tiles (a full cell clear of every edge) ----
  // One draw a tile picks at most one entry (by the entries' rates in order); of two candidates beside each other, corners too, the lower hash wins, so none ever touch (a greedy choice, a function of the world alone).
  // A rock entry (`prop`) is a prop that blocks its tile and also keeps clear of every other prop (it never stands beside one, so it can close no gap); the rest are flat decals that block nothing.
  const GROUND_OF = { [LITTER]: 'litter', [DRY]: 'drygrass', [TURF]: 'turf', [SCREE]: 'scree' }, GD = rules.ground || {};
  const NB8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]], gCand = new Map(), gTake = new Map();
  const gEntry = (x, y) => {   // the entry the tile's draw falls in, or null (also null where the tile may hold none)
    const k = key(x, y), hit = gCand.get(k); if (hit !== undefined) return hit;
    let r = null;
    const G = inMap(x, y) ? GD[GROUND_OF[T(x, y)]] : null;
    if (G && G.entries.length && plain(x, y) && !wayZone.has(k) && !hollowNear(x, y, false)) {
      let u = U(seed, TAG.GROUND, x, y), c = 0;
      for (const e of G.entries) { c += e.per100 / 100 * (e.scale || G.drawScale); if (u < c) { r = e; break; } }
      if (r && r.prop && earlier(5, x, y)) r = null;   // a rock keeps off every other prop
    }
    if (gCand.size > 600000) gCand.clear();
    gCand.set(k, r); return r;
  };
  const gBefore = (a, b, x, y) => { const v = U(seed, TAG.GROUND + 1, a, b), u = U(seed, TAG.GROUND + 1, x, y); return v < u || (v === u && (b < y || (b === y && a < x))); };
  const groundAt = (x, y) => {   // the entry a tile takes, or null
    const e = gEntry(x, y); if (!e) return null;
    const k = key(x, y), hit = gTake.get(k); if (hit !== undefined) return hit ? e : null;
    let ok = true;
    for (const [dx, dy] of NB8) { const a = x + dx, b = y + dy; if (gEntry(a, b) && gBefore(a, b, x, y) && groundAt(a, b)) { ok = false; break; } }
    if (gTake.size > 600000) gTake.clear();
    gTake.set(k, ok); return ok ? e : null;
  };

  // ---- the props of a rectangle of tiles: { kind, x, y } in world tiles (the foot tile), sorted by foot row, column, kind ----
  function propsIn(x0, y0, x1, y1) {
    const out = [], R = 9;
    for (let fi = 0; fi < FAMS.length; fi++) {
      const seen = new Set();
      for (let cy = Math.floor((y0 - R) / CS); cy <= Math.floor((y1 + R) / CS); cy++) for (let cx = Math.floor((x0 - R) / CS); cx <= Math.floor((x1 + R) / CS); cx++) {
        for (const s of seedsIn(fi, cx, cy)) {
          if (s.x < x0 - R || s.x > x1 + R || s.y < y0 - R || s.y > y1 + R || seen.has(s.k)) continue; seen.add(s.k);
          for (const m of cluster(fi, s).members) if (m.x >= x0 && m.x <= x1 && m.y >= y0 && m.y <= y1) out.push({ kind: m.kind, x: m.x, y: m.y, fam: FAMS[fi], cluster: s.k });
        }
      }
    }
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (shrubAt(x, y)) out.push({ kind: SHRUBS[H(seed, TAG.SHRUB + 2, x, y) % SHRUBS.length], x, y, fam: 'shrubs', cluster: -2 });
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const e = groundAt(x, y); if (e && e.prop) out.push({ kind: e.kinds[H(seed, TAG.GROUND + 2, x, y) % e.kinds.length], x, y, fam: 'ground', cluster: -4 }); }
    for (const h of hollowSites()) if (h.x >= x0 && h.x <= x1 && h.y >= y0 && h.y <= y1) out.push({ kind: HOLLOW, x: h.x, y: h.y, fam: 'landmark', cluster: -1 });
    return out.sort((a, b) => a.y - b.y || a.x - b.x || (a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : 0));
  }
  // the tiles a prop of the list stands on (the hollow tree: five by two)
  const footprint = p => (p.kind === HOLLOW ? [[-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [-1, -1], [0, -1], [1, -1]].map(([dx, dy]) => [p.x + dx, p.y + dy]) : p.fam === 'sweeps' ? [] : [[p.x, p.y]]);

  // ---- decals: the desk's meadow density on every grass tile (and raised land's top), pebbles on sand, lily pads on open water ----
  // (the cliff's face is drawn over the tile below the lip and its rim over the tile above, so nothing is laid within a tile of a lip)
  const grassTile = (x, y) => { const t = T(x, y); return inMap(x, y) && (t === GRASS || t === CLIFF) && plain(x, y) && !near9(x, y, 4); };
  const openWater = (x, y) => { for (let dy = -WA.padClear; dy <= WA.padClear; dy++) for (let dx = -WA.padClear; dx <= WA.padClear; dx++) if (T(x + dx, y + dy) !== WATER) return false; return true; };

  // ---- the meadow scatter (the art director's quiet-ground rule, map-rules.json meadow.scatter) ----
  // One noise field on the world's 16 px master cells (a world tile is 3 x 3 of them; every picture is drawn at 1x on the 48 px frame, so a cell is 16 px on the screen): its top `patchShare` is the patch zone, a patch
  // is the basin of one peak of the field (the same peak from every cell of it, so the same in every view); a patch has one dominant kind (from the peak's hash), thins from its centre (the field at the cell, scaled
  // between the zone's threshold and its own peak) to its edge, and its pieces grow from young at the edge to grown at the centre. Between patches a thin open scatter of single tufts and flecks.
  // Pieces never overlap: each takes the first of up to four places in its cell whose foot box (0.7 of its width by a quarter of its height, one pixel clear) meets no piece of a higher hash and no prop's picture;
  // a piece's fate depends only on higher-hash pieces round it, so a cell and its neighbour keep the same pieces (the answer is a function of the world alone).
  const SC = MD.scatter, CELL = 16, PER = 3;
  const scField = noiseField(seed, 'g3-meadow', 1 / SC.noiseScale, 'FBm', SC.noiseOctaves);
  const ck = (cx, cy) => cy * 262144 + cx;   // a cell's key (cell columns stay under 262144)
  const fMemo = new Map();
  const fAt = (cx, cy) => { const k = ck(cx, cy), hit = fMemo.get(k); if (hit !== undefined) return hit; const v = scField(cx, cy); if (fMemo.size > 400000) fMemo.clear(); fMemo.set(k, v); return v; };
  let zoneAt = null;   // the field's level above which a cell is in a patch, and the level of the highest peaks: quantiles of an even sample of the map's cells (the place's cells)
  const levels = () => {
    if (zoneAt) return zoneAt;
    const W3 = Math.max(land.W, 1) * PER, H3 = Math.max(land.H, 1) * PER, step = Math.max(1, Math.ceil(Math.sqrt((W3 * H3) / 12000))), vals = [];
    for (let y = 0; y < H3; y += step) for (let x = 0; x < W3; x += step) vals.push(scField(x, y));
    vals.sort((a, b) => a - b);
    const q = p => vals[Math.min(vals.length - 1, Math.max(0, Math.floor(p * vals.length)))];
    return (zoneAt = { thr: q(1 - SC.patchShare), top: q(0.995) });
  };
  const peakMemo = new Map();
  const NB = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
  const peakOf = (cx, cy) => {   // the cell's patch: the peak the steepest climb from it ends on (ties to the first of the eight neighbours)
    const hit = peakMemo.get(ck(cx, cy)); if (hit) return hit;
    const path = []; let x = cx, y = cy;
    for (let n = 0; n < 60; n++) {
      const known = peakMemo.get(ck(x, y)); if (known) { path.forEach(([a, b]) => peakMemo.set(ck(a, b), known)); return known; }
      path.push([x, y]);
      let bx = x, by = y, bv = fAt(x, y);
      for (const [dx, dy] of NB) { const v = fAt(x + dx, y + dy); if (v > bv) { bv = v; bx = x + dx; by = y + dy; } }
      if (bx === x && by === y) break;
      x = bx; y = by;
    }
    const peak = { x, y, v: fAt(x, y) };
    if (peakMemo.size > 400000) peakMemo.clear();
    path.forEach(([a, b]) => peakMemo.set(ck(a, b), peak));
    return peak;
  };
  const pickOf = (table, u) => { let t = 0, last = null; for (const k in table) { if (typeof table[k] !== 'number') continue; t += table[k]; last = k; if (u < t) return k; } return last; };
  const SCU = (salt, cx, cy, k = 0) => U(seed, TAG.SC + salt, cx, cy, k);
  // a sprite of a kind in a step: the set's name and its rect and anchor
  const sprite = name => SPRITES.decals[name];
  const scName = (kind, step, u, m) => {
    if (kind === 'fleck') { const f = Math.floor(u * 6); return `fleck-${f}${m ? 'm' : ''}`; }
    const slots = SCATTER_SLOTS[kind];
    return `sc-${slots[Math.floor(u * slots.length)]}${step === 'mid' ? '' : '-' + step}${m ? '-m' : ''}`;
  };
  // the foot box of a sprite whose foot stands at (fx, fy): [x, y, w, h]
  const footBox = (s, fx, fy) => { const bw = Math.max(5, Math.floor(s.rect[2] * 0.7)), bh = Math.max(3, Math.floor(s.rect[3] * 0.25)); return [fx - (bw >> 1), fy - bh + 1, bw, bh]; };
  const grown = (r, d) => [r[0] - d, r[1] - d, r[2] + 2 * d, r[3] + 2 * d];
  // the pieces a cell holds before the no-overlap rule: [{ cx, cy, k, name, tries: [[fx, fy], ..], prio }]; none in a cell whose tile is not plain grass
  function cellPieces(cx, cy, tileOk) {
    const tx = Math.floor(cx / PER), ty = Math.floor(cy / PER);
    if (!tileOk(tx, ty)) return [];
    const { thr, top } = levels(), peak = peakOf(cx, cy), f = fAt(cx, cy), inz = f > thr && peak.v > thr;
    const w = inz ? Math.min(1, Math.max(0, (f - thr) / Math.max(peak.v - thr, 1e-6))) : 0, PD = SC.patchDensity;
    const lam = inz ? PD.edge + (PD.peak - PD.edge) * w : SC.openDensity;
    let n = Math.floor(lam); if (SCU(1, cx, cy) < lam - n) n++;
    const out = [], dom = inz ? pickOf(SC.dominants, U(seed, TAG.SC + 2, peak.x, peak.y)) : null;
    for (let k = 0; k < n; k++) {
      let kind, step;
      if (inz) {
        kind = SCU(3, cx, cy, k) < SC.dominantShare ? dom : pickOf(SC.mixed, SCU(4, cx, cy, k));
        if (SCU(5, cx, cy, k) > SC.kindKeep[kind]) continue;   // the big kinds thin out: a share of their draws is dropped
        const v = w + (SCU(6, cx, cy, k) - 0.5) * SC.steps.jitter;
        step = v > SC.steps.grownAbove ? 'grown' : v < SC.steps.youngBelow ? 'young' : 'mid';
      } else {
        kind = SCU(7, cx, cy, k) < SC.openKinds.tuft ? 'tuft' : 'fleck';
        step = SCU(8, cx, cy, k) < 0.55 ? 'young' : 'mid';
      }
      const name = scName(kind, step, SCU(9, cx, cy, k), SCU(10, cx, cy, k) < 0.5), s = sprite(name);
      if (!s) continue;
      const jit = SC.standJitter.kinds.includes(kind) ? SC.standJitter.amountTiles * CELL : 0, tries = [];
      for (let t = 0; t < 4; t++) {
        let fx = cx * CELL + 1 + Math.floor(SCU(11 + 4 * t, cx, cy, k) * 14), fy = cy * CELL + 4 + Math.floor(SCU(12 + 4 * t, cx, cy, k) * 12);
        if (jit) { fx += Math.round((SCU(13 + 4 * t, cx, cy, k) - 0.5) * 2 * jit); fy += Math.round((SCU(14 + 4 * t, cx, cy, k) - 0.5) * 2 * jit); }
        tries.push([fx, fy]);
      }
      out.push({ cx, cy, k, name, s, tries, prio: H(seed, TAG.SC + 40, cx, cy, k) });
    }
    return out;
  }
  // the scatter of a rectangle of tiles: the pieces whose foot lies in it. tileOk(tx, ty): a tile that may hold meadow; walls: the rectangles of the props round the area (a piece never meets one)
  function scatterIn(x0, y0, x1, y1, tileOk, walls) {
    const cells = new Map(), res = new Map();
    const piecesOf = (cx, cy) => { const k = ck(cx, cy), hit = cells.get(k); if (hit) return hit; const v = cellPieces(cx, cy, tileOk); cells.set(k, v); return v; };
    const wallNear = c => { const r = [c.cx * CELL - CELL, c.cy * CELL - CELL, 3 * CELL, 3 * CELL]; return walls.some(wl => overlaps(r, wl)); };
    const wallOk = new Map();
    const cellFree = c => { const k = ck(c.cx, c.cy); let v = wallOk.get(k); if (v === undefined) { v = !wallNear(c); wallOk.set(k, v); } return v; };
    const before = (a, b) => a.prio < b.prio || (a.prio === b.prio && (a.cy < b.cy || (a.cy === b.cy && (a.cx < b.cx || (a.cx === b.cx && a.k < b.k)))));
    // the place a piece takes: the first of its four whose foot box (a pixel clear) meets no accepted piece of a higher hash, and whose picture meets no prop; -1 when none
    const resolve = c => {
      const key3 = ck(c.cx, c.cy) * 8 + c.k, hit = res.get(key3); if (hit !== undefined) return hit;
      res.set(key3, -1);   // a piece's fate reads only pieces before it, so no cycle; the guard is for safety
      let take = -1;
      if (!cellFree(c)) { res.set(key3, -1); return -1; }
      for (let t = 0; t < 4 && take < 0; t++) {
        const [fx, fy] = c.tries[t];
        if (!tileOk(Math.floor(fx / 48), Math.floor(fy / 48))) continue;   // a jittered foot never leaves plain grass
        const pic =[fx - c.s.anchor[0], fy - c.s.anchor[1], c.s.rect[2], c.s.rect[3]];
        if (MD.noOverlap) {
          if (walls.some(wl => overlaps(pic, wl))) continue;
          const mine = grown(footBox(c.s, fx, fy), 1); let blocked = false;
          for (let dy = -2; dy <= 2 && !blocked; dy++) for (let dx = -2; dx <= 2 && !blocked; dx++) for (const o of piecesOf(c.cx + dx, c.cy + dy)) {
            if (o === c || !before(o, c)) continue;
            const r = resolve(o); if (r < 0) continue;
            if (overlaps(mine, footBox(o.s, o.tries[r][0], o.tries[r][1]))) { blocked = true; break; }
          }
          if (blocked) continue;
        }
        take = t;
      }
      res.set(key3, take); return take;
    };
    const out = [];
    for (let cy = y0 * PER - 2; cy <= y1 * PER + PER + 1; cy++) for (let cx = x0 * PER - 2; cx <= x1 * PER + PER + 1; cx++) {
      for (const c of piecesOf(cx, cy)) {
        const t = resolve(c); if (t < 0) continue;
        const [fx, fy] = c.tries[t], tx = Math.floor(fx / 48), ty = Math.floor(fy / 48);
        if (tx < x0 || tx > x1 || ty < y0 || ty > y1) continue;
        out.push({ kind: c.name, x: tx, y: ty, dx: 0, dy: 0, mx: fx - tx * 48, my: fy - ty * 48 });
      }
    }
    return out;
  }
  // the decals of a rectangle of tiles: { kind, x, y (the foot's tile), dx, dy, mx, my (the foot's pixel in the tile's 48 px frame) }: the meadow scatter on grass, pebbles on sand, lily pads on open water.
  // A prop always wins: no decal meets a prop's picture (meadow.noOverlap); the scatter keeps its own foot boxes apart.
  function decalsIn(x0, y0, x1, y1) {
    const occ = new Set(), walls = [];
    for (const p of propsIn(x0 - 4, y0 - 4, x1 + 4, y1 + 5)) { for (const [a, b] of footprint(p)) occ.add(key(a, b)); const r = spriteRect(SPRITES.props[p.kind], p.x * 48 + 24, p.y * 48 + 47); if (r) walls.push(r); }
    const tileOk = (x, y) => inMap(x, y) && (T(x, y) === GRASS || T(x, y) === CLIFF) && grassTile(x, y) && !occ.has(key(x, y));
    const out = scatterIn(x0, y0, x1, y1, tileOk, MD.noOverlap ? walls : []);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {   // the ground decor: a flat piece in its tile, wholly inside it (a pixel's margin), never meeting a prop's picture
      const e = groundAt(x, y); if (!e || e.prop) continue;
      const kind = e.kinds[H(seed, TAG.GROUND + 2, x, y) % e.kinds.length], s = SPRITES.decals[kind]; if (!s) continue;
      const w = s.rect[2], h = s.rect[3], ax = s.anchor[0], ay = s.anchor[1];
      const mx = ax + 1 + H(seed, TAG.GROUND + 3, x, y) % Math.max(1, 46 - w + 1), my = ay + 1 + H(seed, TAG.GROUND + 4, x, y) % Math.max(1, 46 - h + 1);
      if (MD.noOverlap && walls.some(wl => overlaps([x * 48 + mx - ax, y * 48 + my - ay, w, h], wl))) continue;
      out.push({ kind, x, y, dx: 0, dy: 0, mx, my });
    }
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (!inMap(x, y)) continue;
      const t = T(x, y); let kind = null;
      if ((t === SAND || t === SCREE) && !occ.has(key(x, y)) && !lip(x, y)) {
        if (U(seed, TAG.PEB, x, y) < (TABLE[biome(x, y)] || TABLE.mixed).pebbles) kind = ['pebbles-a', 'pebbles-b', 'pebbles-c'][H(seed, TAG.PEB + 1, x, y) % 3];
      } else if (t === WATER) {
        const pr = (TABLE[biome(x, y)] || TABLE.mixed).pads;
        if (pr && U(seed, TAG.PAD, x, y) < pr && openWater(x, y)) kind = U(seed, TAG.PAD + 1, x, y) < 0.25 ? 'lily-pad-flower' : 'lily-pad';   // about one pad in four carries the flower (the signed variant)
      }
      if (!kind) continue;
      if (MD.noOverlap) { const r = spriteRect(SPRITES.decals[kind], x * 48 + 24, y * 48 + 47); if (r && walls.some(w => overlaps(r, w))) continue; }
      out.push({ kind, x, y, dx: 0, dy: 0 });
    }
    return out;
  }

  // ---- reed banks: 4 x 4 stretches of shore (world-aligned), a share of them by biome; only where the stretch holds a shore (water beside grass or sand) ----
  const shoreCorner = (x, y) => {   // the dual tile at the corner of tiles (x-1..x, y-1..y): water with grass or sand
    let w = false, g = false; for (const [a, b] of [[x - 1, y - 1], [x, y - 1], [x - 1, y], [x, y]]) { const t = T(a, b); if (t === WATER) w = true; else if (t === GRASS || t === SAND) g = true; else return false; }
    return w && g;
  };
  const SS = RE.stretch;
  const stretchHasShore = (bx, by) => { for (let y = by * SS; y < by * SS + SS; y++) for (let x = bx * SS; x < bx * SS + SS; x++) if (shoreCorner(x, y)) return true; return false; };
  // the stretches of a rectangle of dual tiles: [{ bx, by }] (a stretch is the dual tiles 4bx .. 4bx+3, 4by .. 4by+3)
  function reedsIn(x0, y0, x1, y1) {
    const out = [];
    for (let by = Math.floor(y0 / SS); by <= Math.floor(y1 / SS); by++) for (let bx = Math.floor(x0 / SS); bx <= Math.floor(x1 / SS); bx++) {
      const cx = bx * SS + SS / 2, cy = by * SS + SS / 2; if (!inMap(cx, cy)) continue;
      if (U(seed, TAG.REED, bx, by) >= (TABLE[biome(cx, cy)] || TABLE.mixed).reeds) continue;
      if (stretchHasShore(bx, by)) out.push({ bx, by });
    }
    return out;
  }
  // the reed clumps of the stretches round a rectangle of tiles (the desk's scatter rule, reeds.mjs, seeded by world tile): { kind: 'reed-shore-1' .. 'reed-water-2' (+ 'm' mirrored), tx, ty (the base's tile),
  // px, py (the base in native pixels, 16 a tile, world frame), water }; the clumps whose base tile lies in x0 - 2 .. x1 + 2, y0 .. y1 + 3 (a reed is up to 34 px tall: its top hangs two tiles above its base)
  const reedH = (x, y, z) => U(seed, TAG.REEDB, x, y, z);
  function reedClumpsIn(x0, y0, x1, y1) {
    const out = [];
    for (const r of reedsIn(x0 - SS, y0 - SS, x1 + SS, y1 + SS)) {   // the dual-tile range of reedsIn: stretches are SS x SS tiles at SS * bx, SS * by; a clump may stand a tile off its own stretch
      for (const c of reedClumps(T, reedH, { x0: SS * r.bx, y0: SS * r.by, x1: SS * r.bx + SS - 1, y1: SS * r.by + SS - 1 }, rules)) {
        const tx = Math.floor(c.x / 16), ty = Math.floor(c.y / 16);
        if (tx < x0 - RE.reach.side || tx > x1 + RE.reach.side || ty < y0 - RE.reach.above || ty > y1 + RE.reach.below) continue;   // as propsIn: within two tiles sideways, three below
        out.push({ kind: `reed-${c.sprite}${c.mirror ? 'm' : ''}`, tx, ty, px: c.x, py: c.y, water: c.water });
      }
    }
    return out;
  }
  const free = (fi, x, y) => stands(fi, x, y) && !earlier(fi, x, y);   // a tile this kind could take (what the table's density is counted on)
  return { propsIn, decalsIn, reedsIn, reedClumpsIn, hollowSites, footprint, shoreCorner, stands, free, isLip: lip, flags, memberOf, grassTile, plain };
}

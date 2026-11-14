// The level rules of place design A1.2. All failures of a level are collected, each naming the level, the rule and the cell.
// Terrain classes (terrain.json `play`): "standable" = anything but block and deep (you can stand or wade there); "foot" = walk, scree, bank
// (walkable without a partner). Reachability floods over foot cells that no prop footprint blocks; a heart that names a `reachBy` is allowed
// to be out of foot reach (and so are the finds).
import { BakeError, PLACE_SIZES } from './ldtk.mjs';
import { cliffInfo, gullies, thicketDonor } from './openedges.mjs';

// Groves, not an orchard (walk content, lead's look at the Hollow Tree's whole view): the trees of a place stand in clumps of 3-5 that touch or overlap their crowns, with open
// glades between and a few lone trees; never an even lattice, rows or rings. Measured on the nearest-neighbour spacing of the standing things (trees and boulders), in cells.
export const GROVE = { minTrees: 12, touch: 2.3, minTouching: 0.4, minCv: 0.35, lone: 4, minLone: 2 };
export function groveStats(ir) {
  const trees = ir.props.filter((p) => /^(tree-(broad|autumn)|boulder-(grey|brown)|rock-(a|b|big)(-m)?)$/.test(p.kind)).map((p) => [p.cx, p.cy]);
  const nn = trees.map((a, i) => Math.min(...trees.filter((_, j) => j !== i).map((b) => Math.hypot(a[0] - b[0], a[1] - b[1]))));
  const mean = nn.reduce((s, v) => s + v, 0) / (nn.length || 1), sd = Math.sqrt(nn.reduce((s, v) => s + (v - mean) ** 2, 0) / (nn.length || 1));
  return { trees: trees.length, mean, cv: mean ? sd / mean : 0, touching: nn.filter((v) => v <= GROVE.touch).length, lone: nn.filter((v) => v >= GROVE.lone).length };
}

export const standable = (play) => play !== 'block' && play !== 'deep';
export const onFoot = (play) => play === 'walk' || play === 'scree' || play === 'bank' || play === 'cliff';   // 'cliff': its top walks; its lip and face are blocked cells (openedges.cliffInfo)

// The open style (walk content B5): a 24 x 28 place has no edge ring; its sides run on into the neighbour cell. Today's 18 x 22 places keep their walls.
export const isOpenStyle = (ir) => ir.w === 24 && ir.h === 28;

export function spriteFor(tileset, group, kind) {
  const i = tileset.sprites.findIndex((s) => s.group === group && s.kind === kind);
  return i < 0 ? null : { index: i, sprite: tileset.sprites[i] };
}

// Cells blocked by prop footprints: Set of y * w + x. footprint is flat dx, dy pairs.
export function footprintCells(ir, tileset) {
  const cells = new Map(); // cell -> prop
  for (const p of ir.props) {
    const s = spriteFor(tileset, 'prop', p.kind);
    if (!s) continue;
    const fp = s.sprite.footprint;
    for (let i = 0; i + 1 < fp.length; i += 2) {
      const x = p.cx + fp[i], y = p.cy + fp[i + 1];
      if (x >= 0 && y >= 0 && x < ir.w && y < ir.h) cells.set(y * ir.w + x, p);
    }
  }
  return cells;
}

// The tiles a crown hangs over, as the page's adapter reckons them (adapter.mjs: a crown's box at 48 px, a tile's pawn as its centre and a margin round it).
export const CROWN_MARGIN = 6;
export const BAND_DEPTH = 2;   // tiles of the place's edge band: nothing to take lies in it
export function crownCover(ir, tileset) {
  const crowns = [];
  for (const p of ir.props) { const s = spriteFor(tileset, 'prop', p.kind); if (s && s.sprite.canopy >= 0) crowns.push([s.sprite.canopy, p.x, p.y]); }
  for (const c of ir.canopy) { const s = spriteFor(tileset, 'canopy', c.kind); if (s) crowns.push([s.index, c.x, c.y]); }
  const under = new Set();
  for (const [k, fx, fy] of crowns) {
    const s = tileset.sprites[k], left = fx - s.anchor48[0], top = fy - s.anchor48[1];
    for (let y = 0; y < ir.h; y++) for (let x = 0; x < ir.w; x++) {
      const px = x * 48 + 24, py = y * 48 + 28;
      if (px > left - CROWN_MARGIN && px < left + s.w48 + CROWN_MARGIN && py > top - CROWN_MARGIN && py < top + s.h48 + CROWN_MARGIN) under.add(y * ir.w + x);
    }
  }
  return under;
}

export const arrival = (o, w, h) => {
  const mid = (o.from + o.to) >> 1;
  return o.side === 'N' ? { x: mid, y: 0 } : o.side === 'S' ? { x: mid, y: h - 1 } : o.side === 'W' ? { x: 0, y: mid } : { x: w - 1, y: mid };
};

export function floodFrom(start, ir, playOf, blocked) {
  const { w, h } = ir;
  const seen = new Uint8Array(w * h);
  const ok = (x, y) => x >= 0 && y >= 0 && x < w && y < h && !seen[y * w + x] && onFoot(playOf(ir.terrain[y * w + x])) && !blocked.has(y * w + x);
  const stack = [];
  if (ok(start.x, start.y)) { seen[start.y * w + start.x] = 1; stack.push([start.x, start.y]); }
  while (stack.length) {
    const [x, y] = stack.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (ok(x + dx, y + dy)) { seen[(y + dy) * w + x + dx] = 1; stack.push([x + dx, y + dy]); }
    }
  }
  return seen;
}

// ctx: { terrains: terrain.json list, sets: Map(set id -> baked tile set object) }. Returns a list of BakeError.
export function checkRules(ir, ctx) {
  const id = ir.id, w = ir.w, h = ir.h;
  const errors = [];
  const fail = (rule, text, cell) => errors.push(new BakeError(id, rule, text, cell && { x: cell.x, y: cell.y }));
  const playOf = (v) => ctx.terrains.find((t) => t.value === v)?.play;
  const play = (x, y) => playOf(ir.terrain[y * w + x]);
  if (!ir.names.length || ir.names.some((n) => !n)) fail('names', 'the level needs at least one place name');
  const tileset = ctx.sets.get(ir.tileset);
  if (!tileset) { fail('tileset', `the tile set "${ir.tileset}" does not exist`); return errors; }

  // kinds the set must provide
  for (const [group, list] of [['prop', ir.props], ['decal', ir.decals], ['canopy', ir.canopy]]) {
    for (const p of list) if (!spriteFor(tileset, group, p.kind)) fail('kind-missing', `the tile set ${ir.tileset} has no ${group} "${p.kind}"`, { x: p.cx, y: p.cy });
  }
  const blocked = footprintCells(ir, tileset);
  const cliffs = cliffInfo(ir, ctx.terrains);
  for (const c of cliffs.ringCells) if (!blocked.has(c)) blocked.set(c, { kind: 'the cliff' });   // the lip counts as a prop-sized obstacle for the slot rules
  const walls = new Set([...blocked.keys(), ...cliffs.blockCells]);   // relief: every cell that cannot be walked: footprints, and the cliff's ring, face and flank cells
  const open = isOpenStyle(ir);
  for (const [cell, p] of blocked) {
    const x = cell % w, y = (cell / w) | 0;
    if (!standable(play(x, y))) fail('prop-footprint', `the footprint of ${p.kind} stands on ${play(x, y)} terrain`, { x, y });
  }

  // heart
  if (ir.hearts.length !== 1) fail('heart-count', `a place has exactly one Heart, this one has ${ir.hearts.length}`);
  const heart = ir.hearts[0];
  if (heart && !heart.kinds.length) fail('heart-kinds', 'the Heart lists no kind', { x: heart.x, y: heart.y });

  // openings
  if (ir.openings.length < 2 || ir.openings.length > 4) fail('opening-count', `a place has 2 to 4 Openings, this one has ${ir.openings.length}`);
  const arrivals = [];
  for (const o of ir.openings) {
    const edge = o.side === 'N' ? o.y === 0 && o.ch === 1 : o.side === 'S' ? o.y === h - 1 && o.ch === 1 : o.side === 'W' ? o.x === 0 && o.cw === 1 : o.x === w - 1 && o.cw === 1;
    const lim = o.side === 'N' || o.side === 'S' ? w : h;
    if (!edge || o.from < 0 || o.to >= lim) { fail('opening-edge', `the ${o.side} Opening must lie on the ${o.side} edge, one cell deep, inside the place`, { x: o.x, y: o.y }); continue; }
    const a = arrival(o, w, h);
    if (!onFoot(play(a.x, a.y))) { fail('opening-arrival', `the arrival cell of the ${o.side} Opening is ${play(a.x, a.y)} terrain, not walkable`, a); continue; }
    if (blocked.has(a.y * w + a.x)) { fail('opening-arrival', `the arrival cell of the ${o.side} Opening is under a prop footprint`, a); continue; }
    arrivals.push({ ...a, side: o.side });
  }
  const floods = arrivals.map((a) => floodFrom(a, ir, playOf, walls));

  if (heart && heart.reachBy === 'none') {
    const near = (x, y, seen) => seen[y * w + x] || [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => x + dx >= 0 && y + dy >= 0 && x + dx < w && y + dy < h && seen[(y + dy) * w + x + dx]);
    floods.forEach((seen, k) => { if (!near(heart.x, heart.y, seen)) fail('heart-reach', `the Heart cannot be reached on foot from the ${arrivals[k].side} Opening and names no reachBy`, { x: heart.x, y: heart.y }); });
  }

  // clues
  if (ir.clues.length < 1 || ir.clues.length > 3) fail('clue-count', `a place has 1 to 3 Clues, this one has ${ir.clues.length}`);
  for (const c of ir.clues) {
    if (!c.points.length) { fail('clue-point', 'a Clue has no points'); continue; }
    for (const p of c.points) {
      if (p.x < 0 || p.y < 0 || p.x >= w || p.y >= h) fail('clue-point', 'a Clue point lies outside the place', p);
      else if (!standable(play(p.x, p.y))) fail('clue-point', `a Clue point is on ${play(p.x, p.y)} terrain`, p);
    }
    const last = c.points[c.points.length - 1];
    if (heart && Math.max(Math.abs(last.x - heart.x), Math.abs(last.y - heart.y)) > 1) fail('clue-end', `the last Clue point is ${Math.max(Math.abs(last.x - heart.x), Math.abs(last.y - heart.y))} cells from the Heart; it must end within 1`, last);
  }

  // finds
  const maxFinds = open ? 8 : 6;
  if (ir.finds.length < 2 || ir.finds.length > maxFinds) fail('find-count', `a place has 2 to ${maxFinds} Finds, this one has ${ir.finds.length}`);
  for (const f of ir.finds) {
    if (walls.has(f.y * w + f.x)) fail('find-footprint', 'a Find lies under a prop footprint', f);
    else if (!standable(play(f.x, f.y))) fail('find-reach', `a Find is on ${play(f.x, f.y)} terrain`, f);
    else if (heart && heart.reachBy === 'none' && floods.length && !floods.some((s) => s[f.y * w + f.x])) fail('find-reach', 'a Find cannot be reached on foot from any Opening', f);
  }

  // slot-clear: what a player can take is never hidden. No Heart and no Find under a crown, in the edge band, and (Finds only: the Heart stands at its
  // landmark by design) within 1 cell of a prop footprint.
  { const under = crownCover(ir, tileset);
    const inBand = (x, y) => x < BAND_DEPTH || y < BAND_DEPTH || x >= w - BAND_DEPTH || y >= h - BAND_DEPTH;
    const nearProp = (x, y) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (blocked.has((y + dy) * w + x + dx)) return true; return false; };
    const slots = [...ir.hearts.map((s) => ({ ...s, what: 'Heart', prop: false })), ...ir.finds.map((s) => ({ ...s, what: 'Find', prop: true }))];
    for (const s of slots) {
      if (s.x < 0 || s.y < 0 || s.x >= w || s.y >= h) continue;
      if (under.has(s.y * w + s.x)) fail('slot-clear', `a ${s.what} lies under a crown, where a player cannot see it`, s);
      else if (inBand(s.x, s.y)) fail('slot-clear', `a ${s.what} lies in the edge band (the outer ${BAND_DEPTH} cells)`, s);
      else if (s.prop && nearProp(s.x, s.y)) fail('slot-clear', `a ${s.what} lies within 1 cell of a prop footprint`, s);
    }
  }

  // landmarks
  if (ir.landmarks.length < 1 || ir.landmarks.length > 3) fail('landmark-count', `a place has 1 to 3 Landmarks, this one has ${ir.landmarks.length}`);
  for (const l of ir.landmarks) {
    const s = spriteFor(tileset, 'prop', l.prop);
    if (!s) fail('landmark-sprite', `the Landmark prop "${l.prop}" is not in the tile set ${ir.tileset}`, l);
    else if (!(s.sprite.frames24.length && s.sprite.w24 > 0)) fail('landmark-sprite', `the Landmark prop "${l.prop}" has no 24 px version`, l);
  }

  // spawns
  if (ir.spawns.length > 4) fail('spawn-count', `a place has 0 to 4 CreatureSpawns, this one has ${ir.spawns.length}`);
  for (const s of ir.spawns) {
    for (let y = s.y; y < s.y + s.h; y++) for (let x = s.x; x < s.x + s.w; x++) {
      if (x >= w || y >= h) { fail('spawn-zone', 'a CreatureSpawn zone reaches outside the place', { x, y }); }
      else if (!standable(play(x, y))) fail('spawn-zone', `a CreatureSpawn zone covers ${play(x, y)} terrain`, { x, y });
    }
  }
  if (!PLACE_SIZES.some(([pw, ph]) => w === pw && h === ph)) fail('size', `size ${w} x ${h}`);

  // the open style's rules (walk content B5; the art desk's manifest, bake rules): no edge ring, an edge closes only where the land has a reason, the seam is one meadow
  for (const g of gullies(ir, ctx.terrains)) fail('cliff-foot', 'a column of cliff, one low row, cliff again: a 1-row gully the face cannot be drawn in', g);
  for (const a of ir.wayups || []) {
    const cl = (x, y) => cliffs.isCliff(x, y) && ir.terrain[y * w + x] === ctx.terrains.find((t) => t.id === 'cliff').value;
    for (let x = a.x - 1; x <= a.x + a.w; x++) if (!cl(x, a.y)) fail('wayup', 'a WayUp area sits on cliff cells with the face straight one cell either side', { x, y: a.y });
    for (let x = a.x - 1; x <= a.x + a.w; x++) if (cl(x, a.y + 1)) fail('wayup', 'the cell below a WayUp area and its two neighbours is not cliff (a straight south face)', { x, y: a.y + 1 });
  }
  if (open) {
    const sides = { N: (k) => ({ x: k, y: 0 }), S: (k) => ({ x: k, y: h - 1 }), W: (k) => ({ x: 0, y: k }), E: (k) => ({ x: w - 1, y: k }) };
    for (const [side, at] of Object.entries(sides)) {
      const len = side === 'N' || side === 'S' ? w : h; let walk = 0;
      for (let k = 0; k < len; k++) { const p = at(k); if (onFoot(play(p.x, p.y)) && !walls.has(p.y * w + p.x)) walk++; }
      if (walk * 3 < len * 2) fail('two-thirds-open', `the ${side} side is walkable on ${walk} of ${len} cells; an open place keeps at least two thirds of every side walkable`);
    }
    // seam-ground and path-short: the last 2 rows and columns are the land's grass, with no prop footprint, crown or decal on them, so any two open sides meet as one meadow
    const grass = ctx.terrains.find((t) => t.id === 'grass').value, path = ctx.terrains.find((t) => t.id === 'path').value, under = crownCover(ir, tileset);
    const near = (x, y) => Math.min(x, y, w - 1 - x, h - 1 - y) < 2;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!near(x, y)) continue;
      const v = ir.terrain[y * w + x];
      if (v === path) fail('path-short', 'a path stops at least 2 cells before an open side', { x, y });
      else if (v !== grass) fail('seam-ground', 'the last 2 rows of a side are grass (the land\'s base ground), the same on both sides of a seam', { x, y });
      else if (blocked.has(y * w + x) || under.has(y * w + x)) fail('seam-ground', 'no prop footprint or crown on the last 2 rows of a side', { x, y });
    }
    for (const d of ir.decals) if (near(d.cx, d.cy)) fail('seam-ground', 'no decal on the last 2 rows of a side', { x: d.cx, y: d.cy });
    // closed-look: every opening can show its closed look, the set's dense thicket, so the level holds a 3 x 3 block of it to stamp from (the adapter's closedLooks)
    if (!thicketDonor(ir, ctx.terrains)) fail('closed-look', 'the level holds no 3 x 3 block of dense thicket, the donor of its openings\' closed looks');
    // grove-lattice: the trees stand in groves with glades between, not an even lattice
    { const g = groveStats(ir);
      if (g.trees >= GROVE.minTrees) {
        if (g.touching < Math.ceil(g.trees * GROVE.minTouching)) fail('grove-lattice', `only ${g.touching} of ${g.trees} trees touch another (crowns overlap within ${GROVE.touch} cells); groves need at least ${Math.ceil(g.trees * GROVE.minTouching)}`);
        if (g.cv < GROVE.minCv) fail('grove-lattice', `the trees' nearest-neighbour spacing varies by only ${g.cv.toFixed(2)} (an even lattice); groves and glades vary by at least ${GROVE.minCv}`);
        if (g.lone < GROVE.minLone) fail('grove-lattice', `${g.lone} lone trees (no neighbour within ${GROVE.lone} cells); a few stand alone, at least ${GROVE.minLone}`);
      } }
  }
  return errors;
}

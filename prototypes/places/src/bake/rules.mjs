// The level rules of place design A1.2. All failures of a level are collected, each naming the level, the rule and the cell.
// Terrain classes (terrain.json `play`): "standable" = anything but block and deep (you can stand or wade there); "foot" = walk, scree, bank
// (walkable without a partner). Reachability floods over foot cells that no prop footprint blocks; a heart that names a `reachBy` is allowed
// to be out of foot reach (and so are the finds).
import { BakeError, PLACE_W, PLACE_H } from './ldtk.mjs';

export const standable = (play) => play !== 'block' && play !== 'deep';
export const onFoot = (play) => play === 'walk' || play === 'scree' || play === 'bank';

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
  const floods = arrivals.map((a) => floodFrom(a, ir, playOf, blocked));

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
  if (ir.finds.length < 2 || ir.finds.length > 6) fail('find-count', `a place has 2 to 6 Finds, this one has ${ir.finds.length}`);
  for (const f of ir.finds) {
    if (blocked.has(f.y * w + f.x)) fail('find-footprint', 'a Find lies under a prop footprint', f);
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
  if (w !== PLACE_W || h !== PLACE_H) fail('size', `size ${w} x ${h}`);
  return errors;
}

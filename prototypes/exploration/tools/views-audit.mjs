// The views audit (owner, 2026-11-08: "the map generation is not consistent across its different zoom levels"): the world has ONE truth for each edge of a cell
// (open, stair, cliff, scree or bank, water, the map's end) and the map, the reach view and the cell itself must all draw it. This compares the world's edge with what the cell's
// layout actually draws and lets the explorer cross, for every cell of a world, and counts the mismatches by kind.
//   node prototypes/exploration/tools/views-audit.mjs [seedFrom seedTo] [--gens 6,2]       the table (a sweep of seeds 1-200 takes a minute or two)
// auditPage(page, G) audits the world mounted on a page (generator 6: baked places); auditGenerated(G, seed) audits generator 2 and 5 worlds' generated places.
import { MW, MH, T, T_BLOCK, L, TERR, sideKind } from "../src/world.mjs";

export const SIDES = ["up", "down", "left", "right"];
const WET = new Set([T.WATER, T.DEEP, T.ISLE, T.STEP, T.WADE]);

// The world's truth for a side of a cell (world.mjs sideKind): 'mapend', 'open', 'stair', 'cliff', 'scree', 'bank', 'water' (a neighbour nobody walks) or 'wade'.
export const worldSide = sideKind;

// The border tiles of a side: [index, depth, along] (corners excluded from the drawn-kind counts by the callers).
const border = (lay, dir, depth) => { const out = [], w = lay.w, h = lay.h;
  if (dir === "up" || dir === "down") for (let x = 0; x < w; x++) out.push([(dir === "up" ? depth : h - 1 - depth) * w + x, x]);
  else for (let y = 0; y < h; y++) out.push([y * w + (dir === "left" ? depth : w - 1 - depth), y]);
  return out; };

// What the layout shows and allows on a side.
export function layoutSide(lay, dir) {
  const walk = i => !T_BLOCK[lay.tiles[i]], along = dir === "up" || dir === "down" ? lay.w : lay.h;
  const exits = border(lay, dir, 0).filter(([i, k]) => k >= 3 && k < along - 3 && walk(i)).map(([, k]) => k);   // the corners belong to two sides: a band's shore at the foot of the next side is not an exit
  const mid = ([, k]) => k >= 2 && k < along - 2;
  const kinds = new Set(); for (const d of [0, 1]) for (const [i, k] of border(lay, dir, d)) if (mid([i, k]) && lay.terr && lay.terr[i]) kinds.add(lay.terr[i]);
  const water = border(lay, dir, 0).filter(mid).filter(([i]) => WET.has(lay.tiles[i])).length, total = border(lay, dir, 0).filter(mid).length;
  const stair = (lay.stairs || []).find(q => q.dir === dir) || null, cross = (lay.cross || []).find(q => q.dir === dir) || null;
  const stairTiles = [...kinds].some(k => k === TERR.STAIR || k === TERR.LANDING || k === TERR.FOOT || k === TERR.APRON_TOP);
  const exitsAt = border(lay, dir, 0).filter(([i, k]) => k >= 3 && k < along - 3 && walk(i)).map(([i]) => [i % lay.w, (i / lay.w) | 0]);
  return { exits, exitsAt, lip: kinds.has(TERR.LIP) || kinds.has(TERR.FACE) || kinds.has(TERR.SIDE) || kinds.has(TERR.SHADOW), stairTiles, stair, cross, waterShare: total ? water / total : 0,
    wetTiles: water, soft: [0, 1, 2, 3, 4].some(d => border(lay, dir, d).some(([i]) => lay.tiles[i] === T.SCREE || lay.tiles[i] === T.BANK)) };
}

// The mismatches of one side: a list of kind names (empty: the views agree).
export function sideMismatches(G, lay, c, dir) {
  const w = worldSide(G, c, dir), s = layoutSide(lay, dir), out = [];
  const stairExit = s.stair ? s.exits.some(k => k === s.stair.s || k === s.stair.s + 1) : false;
  const linked = !lay.baked || lay.reach[0] === undefined ? true : null;   // a baked place's reach starts at its arrival tile: every way out must be joined to it
  const joined = (x, y) => linked || lay.reach[y * lay.w + x] === 1;
  if (w === "open") { if (!s.exits.length) out.push("open: no opening"); else if (!s.exitsAt.some(([x, y]) => joined(x, y))) out.push("open: opening not joined to the place"); if (s.stair) out.push("open: stair drawn"); if (s.lip) out.push("open: lip drawn"); }
  else if (w === "stair") { if (!s.stair || !s.stairTiles) out.push("stair: not drawn"); else if (!stairExit) out.push("stair: not walkable"); else if (!joined(s.stair.entry.x, s.stair.entry.y)) out.push("stair: entry not joined to the place"); if (!s.lip) out.push("stair: no cliff either side"); }
  else if (w === "cliff") { if (!s.lip) out.push("cliff: no lip"); if (lay.baked && s.exits.length) out.push("cliff: opening"); if (s.stair) out.push("cliff: stair drawn"); }
  else if (w === "scree" || w === "bank") { if (!s.cross || !s.soft) out.push(w + ": no crossing"); else if (!joined(s.cross.entry.x, s.cross.entry.y)) out.push(w + ": crossing not joined to the place"); if (!s.lip) out.push(w + ": no lip"); }
  else if (w === "water" || w === "wade") { if (s.waterShare < 0.5 && !(G.land[c] === L.WATER && s.wetTiles >= 4)) out.push(w + ": water not drawn"); if (lay.baked && s.exits.length) out.push(w + ": opening"); if (s.stair) out.push(w + ": stair drawn"); }
  else if (w === "mapend") { if (lay.baked && s.exits.length) out.push("mapend: opening"); if (s.stair) out.push("mapend: stair drawn"); }
  // Walk content B5 (every edge that refuses looks closed, and an open-looking edge never refuses), for a place in the open style (no wall of trees; a 24 x 28 baked place): the whole side, corners included.
  if (lay.baked && lay.w === 24 && lay.h === 28) {
    const along = dir === "up" || dir === "down" ? lay.w : lay.h, edge = [0, 1].flatMap(d => border(lay, dir, d).map(([i, k]) => ({ i, k, d })));
    const blockedEdge = edge.filter(e => T_BLOCK[lay.tiles[e.i]]);
    if (w === "open" && blockedEdge.some(e => e.k >= 2 && e.k < along - 2)) out.push("open: an open-looking edge refuses a step");
    if (w === "mapend") { const stamped = new Set((lay.closure ? lay.closure.patches : []).map(p => p.y * lay.w + p.x)); if (edge.some(e => !stamped.has(e.i))) out.push("mapend: the edge is not drawn closed (a thicket)"); }
    if (w === "cliff") { for (const k of [0, 1]) if (border(lay, dir, k).some(([i]) => !T_BLOCK[lay.tiles[i]])) out.push("cliff: the edge rows are not closed"); }
  }
  return out;
}

// Every layout cell of a world: { cell, key } for the cells a place is built for (passable land and fords, islands left out).
export function placeCells(G) { const out = []; for (let c = 0; c < MW * MH; c++) { if (G.island[c] || G.land[c] === L.CLIFF) continue; if (G.land[c] === L.WATER && G.ford[c] !== 1 && !(G.soft && G.soft.wade[c])) continue; out.push(c); } return out; }

// The table: { 'kind': { baked, generated } } counters, and the first examples.
export function newTally() { return { cells: 0, sides: 0, bad: 0, byKind: {}, examples: {} }; }
export function tally(t, mm, tag, info) {
  t.sides++;
  for (const k of mm) { t.bad++; const key = k + " [" + tag + "]"; t.byKind[key] = (t.byKind[key] || 0) + 1; (t.examples[key] = t.examples[key] || []).length < 3 && t.examples[key].push(info); }
}

// Generator 6 on a page: baked places (and generated fords). `page` is a makePage; the world is remounted per seed and biome.
export function auditPage(page, seed, biome, t) {
  page.run(`(() => { G = worldOf(${seed}, 6, ${JSON.stringify(biome)}); S.seed = ${seed}; S.gen = 6; layoutCache.clear(); startExpedition('weather', G.spawns[0]); S.exp.range = 99; })()`);
  const G = page.run("G");
  for (const c of placeCells(G)) {
    const lay = page.run(`(() => { const l = layout('${c}'); applyLines(l); return l; })()`), tag = lay.baked ? "baked" : "generated";
    t.cells++;
    if (lay.baked && !(lay.heart && lay.heart.path && lay.heart.path.length)) tally(t, ["cell: heart not reachable from the way in"], tag, `seed ${seed} ${biome} cell ${c} (${lay.baked.id})`);
    for (const dir of SIDES) tally(t, sideMismatches(G, lay, c, dir), tag, `seed ${seed} ${biome} cell ${c} ${dir} (${lay.baked ? lay.baked.id : "gen2"})`);
  }
}

// Generator 2 and 5 on the world alone (their places are generated).
export function auditGenerated(G, seed, biome, t) {
  for (const c of placeCells(G)) {
    const lay = genPlaceOf(G, seed, c);
    t.cells++;
    for (const dir of SIDES) tally(t, sideMismatches(G, lay, c, dir), "generated", `seed ${seed} ${biome} gen ${G.gen} cell ${c} ${dir}`);
  }
}
let genPlaceOf = null;
export function setGenPlace(f) { genPlaceOf = f; }

export function report(t, title) {
  const lines = [`${title}: ${t.cells} cells, ${t.sides} sides, ${t.bad} mismatches`];
  for (const k of Object.keys(t.byKind).sort()) lines.push(`  ${String(t.byKind[k]).padStart(6)}  ${k}   e.g. ${t.examples[k][0]}`);
  return lines.join("\n");
}

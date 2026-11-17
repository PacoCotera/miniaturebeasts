// The playtest world check (lock-playtest-world, owner 2026-11-10 20:18, review item 4): which seeds a new world may take.
// A seed passes when, on the frozen land (REALM_REV, REALM_BIOME_V):
//   (a) the first trip finds a pod and pays for the first Grow: tools/first-trip-bot.mjs (a pod, the Data to identify it and read one trait, the Energy of the first Grow's price);
//   (b) every find lies on a tile reached from the place's way in: in every place of the home region and of the four ring-1 regions (what a playtest hour reaches), each counted item has its tile, or a
//       tile beside it, on the walk from a way in (the pawn's own walk: the page's entryPoint and the tiles along each way in, then four-way steps over every tile that is not blocked ground or a standing feature);
//   (c) every place can reach "0 to take": the places' counted items (the page's leftItems, with the veil lifted so every item counts) are all of a kind the page takes, a pod has its tile, and every one
//       is reached by (b): taking every counted item brings leftCounts to 0, nothing counted out of reach or never takeable.
// A failing seed lists its first failing place and item.
//   node tools/playtest-world-check.mjs --from 1 --to 200 --rows rows-1-200.json     (shard by --from/--to; each seed is about 3 minutes, the realm's 1500 places are built)
//   node tools/playtest-world-check.mjs --list rows-a.json rows-b.json ...             (the rows merged, the passing seeds written to src/playtest-seeds.mjs)
import { writeFileSync, readFileSync } from "node:fs";
import { firstTrip } from "./first-trip-bot.mjs";
import { makePage } from "../tests/page-harness.mjs";
import { REALM_REV } from "../src/gen7/region.mjs";
import { REALM_BIOME_V } from "../src/regions.mjs";

export const RING1 = [[2, 1], [3, 2], [2, 3], [1, 2]];   // the four slots round region 1 (slot 2,2)
export const LIST_FILE = new URL("../src/playtest-seeds.mjs", import.meta.url);

// The scan of the mounted region, in the page: every walkable place with something counted to take.
const SCAN = `(() => {
  unveiled = () => true;   // every item counts, seen or not: the check is of the land, not of what a Call has shown
  S.exp.live = {};
  const OPEN = { N: 'down', S: 'up', W: 'right', E: 'left' }, D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]], KINDS = ['pod', 'charge', 'warm', 'dew', 'tuft', 'strike'];
  let places = 0, withItems = 0, items = 0; const fails = [];
  for (let c = 0; c < MW * MH; c++) {
    if (!G.comp[c] || G.land[c] === L.WATER || G.island[c] || !passable(c)) continue;
    places++; const key = String(c), lay = layout(key); ensureLive(key);
    const its = leftItems(c).filter(i => !i.cave); if (!its.length) continue;
    withItems++; items += its.length;
    // the ground walked from every way in the pawn can come by (and from where a walk with no side starts)
    // the ways in: the tile the pawn arrives on from each side (entryPoint) and every tile along each opening that is not closed (a gate takes the partner), as adapt7.mjs floods them
    // what stops the pawn for good: a blocked tile or a standing feature (stone, cup, bush, beacon...); a creature, the partner, a pod, a fruit and a tuft move or are taken in the walk
    const solid = (x, y) => T_BLOCK[lay.tiles[y * lay.w + x]] || !!featAt(lay, key, x, y);
    const reached = new Uint8Array(lay.w * lay.h), ways = (lay.openings || []).filter(o => openingKind(lay, o).kind !== 'closed');
    const starts = [entryPoint(lay, key, undefined), ...ways.map(o => entryPoint(lay, key, OPEN[o.side]))];
    for (const o of ways) for (let k = o.from - 1; k <= o.to - 1; k++) starts.push(o.side === 'N' ? { x: k, y: 0 } : o.side === 'S' ? { x: k, y: lay.h - 1 } : o.side === 'W' ? { x: 0, y: k } : { x: lay.w - 1, y: k });   // adapt7.mjs runPts
    const q = [];
    for (const e of starts) if (e && e.x >= 0 && e.y >= 0 && e.x < lay.w && e.y < lay.h && !reached[e.y * lay.w + e.x] && !(solid(e.x, e.y))) { reached[e.y * lay.w + e.x] = 1; q.push([e.x, e.y]); }
    for (let k = 0; k < q.length; k++) { const [cx, cy] = q[k];
      for (const [dx, dy] of D4) { const X = cx + dx, Y = cy + dy, i = Y * lay.w + X; if (X < 0 || Y < 0 || X >= lay.w || Y >= lay.h || reached[i] || solid(X, Y)) continue; reached[i] = 1; q.push([X, Y]); } }
    const at = (x, y) => x >= 0 && y >= 0 && x < lay.w && y < lay.h && reached[y * lay.w + x];
    for (const it of its) {
      let why = null;
      if (!KINDS.includes(it.k)) why = 'a counted kind the page does not take: ' + it.k;
      else if (!(it.x >= 0 && it.y >= 0)) why = 'no tile';
      else if (!(at(it.x, it.y) || at(it.x + 1, it.y) || at(it.x - 1, it.y) || at(it.x, it.y + 1) || at(it.x, it.y - 1))) why = 'no way from the place\\'s way in reaches ' + it.k + ' at ' + it.x + ',' + it.y;
      if (why) { fails.push({ cell: c, k: it.k, x: it.x, y: it.y, why }); break; }
    }
    if (fails.length) break;   // the first failing place and item is what the seed reports
  }
  return { places, withItems, items, fails };
})`;

// One seed: the first trip, then the reach of the home region and the four ring-1 regions.
export function checkSeed(seed, { regions = 5, trip: playTrip = true } = {}) {   // regions < 5 and trip false are for looking at one failure, never for the list
  const row = { seed, ok: false, trip: null, reach: null };
  const trip = playTrip ? firstTrip(seed) : { ok: true };
  row.trip = { ok: trip.ok, why: trip.why, pods: trip.pods, data: trip.data, energy: trip.energy, actions: trip.actions };
  const p = makePage({ gen: 7, console: "silent" });
  p.run(`newWorld(${seed}); TEST.calm = true;`);
  const ids = ["g1", ...RING1.map((s) => p.run(`openRegion(${JSON.stringify(s)})`))].slice(0, regions);
  p.run(`startExpedition('weather', G.spawns[0]);`);
  const reach = { regions: [], fail: null };
  for (const id of ids) {
    const r = p.run(`inRegion(${JSON.stringify(id)}, ${SCAN})`);
    reach.regions.push({ id, places: r.places, withItems: r.withItems, items: r.items });
    if (r.fails.length) { reach.fail = { region: id, ...r.fails[0] }; break; }   // the first failing region ends the seed's scan
  }
  row.reach = reach;
  row.ok = row.trip.ok && !reach.fail;
  return row;
}

export const listText = (seeds, from, to) => `// The playtest worlds (tools/playtest-world-check.mjs, lock-playtest-world; owner 2026-11-10 20:18: "new worlds only from seeds the bots have walked").
// The seeds of ${from}-${to} that passed on the land of REALM_REV ${REALM_REV} and REALM_BIOME_V ${REALM_BIOME_V}: a pod and the first Grow on the first trip, every find reached from its place's way in,
// every place able to reach "0 to take" (home region and ring 1). A new world picks its seed from PLAYTEST_SEEDS and nowhere else; when the land changes this file is made again.
export const PLAYTEST_REALM_REV = ${REALM_REV};
export const PLAYTEST_BIOME_V = ${REALM_BIOME_V};
export const PLAYTEST_SEEDS = [${seeds.join(", ")}];
`;

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  const a = process.argv.slice(2), arg = (k, d) => { const i = a.indexOf("--" + k); return i < 0 ? d : a[i + 1]; };
  if (a.includes("--list")) {
    const rows = a.slice(a.indexOf("--list") + 1).flatMap((f) => JSON.parse(readFileSync(f, "utf8"))).sort((x, y) => x.seed - y.seed);
    const ok = rows.filter((r) => r.ok), bad = rows.filter((r) => !r.ok);
    for (const r of bad) console.log(`seed ${r.seed}: ` + [!r.trip.ok ? "first trip: " + r.trip.why : "", r.reach.fail ? `region ${r.reach.fail.region} place ${r.reach.fail.cell}: ${r.reach.fail.why}` : ""].filter(Boolean).join(" | "));
    writeFileSync(LIST_FILE, listText(ok.map((r) => r.seed), rows[0].seed, rows[rows.length - 1].seed));
    console.log(`${ok.length} of ${rows.length} seeds pass; list written to src/playtest-seeds.mjs`);
  } else {
    const from = +arg("from", 1), to = +arg("to", 200), out = arg("rows", null), rows = [];
    for (let s = from; s <= to; s++) {
      const r = checkSeed(s, { regions: +arg("regions", 5), trip: !a.includes("--no-trip") }); rows.push(r);
      console.log(`seed ${s}: ${r.ok ? "ok" : "FAIL"} ${r.trip.ok ? "" : "trip: " + r.trip.why + " "}${r.reach.fail ? `region ${r.reach.fail.region} place ${r.reach.fail.cell}: ${r.reach.fail.why}` : ""}`);
      if (out) writeFileSync(out, JSON.stringify(rows));
    }
  }
}

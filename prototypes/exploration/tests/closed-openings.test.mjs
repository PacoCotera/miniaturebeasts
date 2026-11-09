// Walk content B8: an opening never promises a way that is closed, and never is the way in. The page asks which sides of a cell the land refuses (closedSidesOf: wide water, a cliff, fast water,
// the map's edge, whatever the tier); the adapter draws each such opening as its closed look (the set's thicket over its span, blocked) and never arrives at it. This replaces B3's stop-gap
// (the closed path drawn as grass). The range line is another thing and still moves with the tier (range-line.test.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";
import { T_BLOCK } from "../src/world.mjs";

const plain = (x) => JSON.parse(JSON.stringify(x));
const SIDE = { N: "up", S: "down", W: "left", E: "right" };

test("on every land cell of three worlds no opening stands on a side the land refuses, and the way in is never on one", () => {
  let cells = 0, shut = 0;
  for (const seed of [7, 13, 42]) {
    const p = makePage({ gen: 6, console: "silent" }); p.run(`newWorld(${seed}); TEST.calm = true; S.tier = 2; startExpedition('weather', G.spawns[0]);`);
    const rows = plain(p.run(`(() => { const out = []; for (let c = 0; c < MW * MH; c++) { if (!G.comp[c] || G.land[c] === L.WATER) continue; const lay = layout(String(c)); out.push({ c, closed: [...closedSidesOf(c)], open: lay.openings.map(o => o.side), spawn: lay.spawnPt, w: lay.w, h: lay.h }); } return out; })()`));
    for (const r of rows) {
      cells++; shut += r.closed.length;
      for (const s of r.closed) assert.ok(!r.open.includes(s), `seed ${seed} cell ${r.c}: an opening on the refused side ${s}`);
    }
  }
  assert.ok(cells > 100 && shut > 0, `${cells} cells, ${shut} refused sides seen`);
});

test("a refused side with an opening of its own shows the closed look: the thicket over the opening, blocked, no opening, and never the arrival", () => {
  const p = makePage({ gen: 6, console: "silent" }); p.run("newWorld(13); TEST.calm = true; S.tier = 2; startExpedition('weather', G.spawns[0]);");
  const base = plain(p.run(`(() => { for (let c = 0; c < MW * MH; c++) { if (!G.comp[c] || G.land[c] === L.WATER) continue; const lay = layout(String(c)); if (lay.baked.w === 24 && lay.baked.id.startsWith('Windstep') && lay.openings.length >= 3) return { c, sides: lay.openings.map(o => o.side), first: lay.openings[0].side, spawn: lay.spawnPt }; } return null; })()`));
  assert.ok(base, "a Windstep cell with three or more openings");
  const side = base.first;   // refuse the way in: the page must find another
  p.run(`closedSidesOf = () => new Set(['${side}']); layoutCache.clear();`);
  const shut = plain(p.run(`(() => { const lay = layout('${base.c}'), looks = lay.closedLooks.find(l => l.side === '${side}'); return { sides: lay.openings.map(o => o.side), spawn: lay.spawnPt, cells: looks.cells.map(q => ({ x: q.x, y: q.y, block: T_BLOCK[lay.tiles[(q.y + lay.baked.oy) * lay.w + q.x + lay.baked.ox]], patch: lay.closure.patches.some(t => t.x === q.x && t.y === q.y) })), w: lay.w }; })()`));
  assert.ok(!shut.sides.includes(side), "no opening on the refused side");
  assert.ok(shut.cells.length >= 16 && shut.cells.every((q) => q.block && q.patch), "every cell of the closed look blocks and shows the thicket");
  assert.notDeepEqual(shut.spawn, base.spawn, "the way in is not on the closed opening");
  assert.ok(!T_BLOCK[plain(p.run(`(() => { const lay = layout('${base.c}'); return lay.tiles[lay.spawnPt.y * lay.w + lay.spawnPt.x]; })()`))], "the arrival walks");
});

// night step 4: the dew's prints at her bed, the lamp's three tiles, the night map (night-step-4-1)
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";
import { DAY } from "../src/data/words.mjs";

const page = () => makePage({ gen: 7, console: "collect", els: true, canvas: true, raf: "count" });
const find = `(() => { for (const c of [...new Set(S.cr.filter(q => q.sp === 0).map(q => q.c))]) { if (!G.comp[c] || G.land[c] === L.WATER) continue; const key = String(c), lay = layout(key), live = ensureLive(key);
  for (const q of live.cr) if (q.sp === 0 && q.ind) return JSON.stringify({ key, id: q.id }); delete S.exp.live[key]; } return 'null'; })()`;
const nightAt = DAY.parts.slice(0, -1).reduce((a, q) => a + q[1], 0) + 5;   // five light into the night

test("at night a wild one 4 tiles off is not in sight and one 3 off is; by day both are", () => {
  const p = page(); p.run("newWorld(7); TEST.calm = true; startExpedition('weather', G.spawns[0]);");
  const pick = JSON.parse(p.run(find)); assert.ok(pick);
  const out = JSON.parse(p.run(`(() => {
    const key = ${JSON.stringify(pick.key)}; S.exp.pos = key; enterPatch(key); const lay = curLay(), P = S.exp.patch; S.exp.fog = null;
    const r = (spent) => { S.day.spent = spent; return { sight: sightR(lay), at3: inSight(P.x + 3, P.y), at4: inSight(P.x + 4, P.y), at3d: inSight(P.x + 2, P.y + 2) }; };
    return JSON.stringify({ day: r(100), night: r(${nightAt}), dusk: r(${DAY.light - DAY.parts[5][1] - 5}), call: S.day.spent });
  })()`));
  assert.equal(out.day.sight, 99); assert.ok(out.day.at4);
  assert.equal(out.night.sight, 3, "the lamp's three tiles"); assert.ok(out.night.at3 && out.night.at3d && !out.night.at4);
  assert.equal(out.dusk.sight, 99, "dusk keeps the day's sight");
  assert.deepEqual(p.errors, []);
});

test("the night map shows only your own cell, the flag and lit outposts; by day every cell shows", () => {
  const p = makePage({ console: "silent", canvas: true });
  p.run("TEST.calm = true; newWorld(7, 2); ensureMap();");
  const cell = p.run("[...Array(MW * MH).keys()].find(c => { const q = cxy(c); return q.x >= 3 && q.y >= 3 && q.x < MW - 3 && q.y < MH - 3; })");
  p.run(`startExpedition('weather', ${cell}); S.exp.fog = null;`);
  const night = p.run("HEX.indexOf(HEX[C.night])");
  const solid = (c) => p.run(`(() => { const q = cxy(${c}), px = scr.px(), W = scr.width; let n = 0; for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) if (px[(MAP_Y + q.y * CELL + y) * W + MAP_X + q.x * CELL + x] === ${night}) n++; return n; })()`);
  const other = p.run(`[...Array(MW * MH).keys()].find(c => c !== ${cell} && c !== S.exp.pos && !depotCells(S.seed).has(c))`);
  p.run("S.day.spent = " + nightAt + "; scr.px().fill(-1); drawMap('walk', 0);");
  assert.equal(solid(other), 26 * 26, "a far cell is the night veil, whole");
  assert.ok(solid(cell) < 26 * 26 / 2, "the flag's cell and your own are clear");
  p.run("S.day.spent = 100; scr.px().fill(-1); drawMap('walk', 0);");
  assert.ok(solid(other) < 26 * 26, "by day the cell shows");
});

test("read at her bed in the morning, her prints give sleep-curled's third line, and point; by dry day they do not", () => {
  const p = page(); p.run("newWorld(7); TEST.calm = true; startExpedition('weather', G.spawns[0]);");
  const pick = JSON.parse(p.run(find)); assert.ok(pick);
  const out = JSON.parse(p.run(`(() => {
    const key = ${JSON.stringify(pick.key)}; S.exp.pos = key; enterPatch(key); const lay = curLay(), live = curLive(), c = live.cr.find(q => q.id === ${pick.id}), P = S.exp.patch;
    S.known = [0, ...S.known.filter(k => k !== 0)]; live.strike = null; S.exp.stray = null; S.exp.fog = null;
    const dewy = (spent) => { S.day.spent = spent; return printsHere().filter(q => q.to); };
    const morning = dewy(${DAY.parts[0][1] + 20}), bed = morning.find(q => q.part === 'night' || q.part === 'dusk');
    if (!bed) return JSON.stringify({ none: 1, n: morning.length });
    const rec = () => (S.habits[c.id] || {}).sleep, before = rec() && rec().got.place ? 1 : 0;
    c.x = Math.min(lay.w - 2, bed.stand.x + 6); c.y = bed.stand.y; c.gone = null;
    readPrints(bed);
    const after = rec().got.place ? 1 : 0, card = habWant(c.id, 'sleep');
    const dry = dewy(${DAY.parts[0][1] + DAY.parts[1][1] + 20}).length;
    return JSON.stringify({ before, after, card, dry, to: !!bed.to, line: printsLine(bed) });
  })()`));
  if (out.none) return;   // this seed's Loika keeps her bed through the morning: nothing to read
  assert.equal(out.before, 0); assert.equal(out.after, 1, "sleep-curled's where-she-goes is filled");
  assert.notEqual(out.card, "place", "the card no longer asks it");
  assert.match(out.line, /left for .* at first light|left for .* in the morning/, out.line);
  assert.equal(out.dry, 0, "by dry day the prints do not point");
  assert.deepEqual(p.errors, []);
});

test("at dusk the prints at her afternoon haunt point to her bed", () => {
  const p = page(); p.run("newWorld(7); TEST.calm = true; startExpedition('weather', G.spawns[0]);");
  const pick = JSON.parse(p.run(find)); assert.ok(pick);
  const out = JSON.parse(p.run(`(() => {
    const key = ${JSON.stringify(pick.key)}; S.exp.pos = key; enterPatch(key); S.exp.fog = null;
    S.day.spent = ${DAY.light - DAY.parts[5][1] - DAY.parts[4][1] + 5};
    const l = printsHere().find(q => q.part === 'afternoon');
    return JSON.stringify({ has: !!l, to: l && !!l.to, toPart: l && l.toPart, line: l && printsLine(l) });
  })()`));
  if (!out.has) return;   // her afternoon haunt is her bed's own: nothing left
  assert.ok(out.to && out.toPart === "dusk", JSON.stringify(out)); assert.match(out.line, /left for her bed at dusk/);
  assert.deepEqual(p.errors, []);
});

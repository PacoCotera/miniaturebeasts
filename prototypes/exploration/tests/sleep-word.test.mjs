// sleep-word-fix-1: a curled-up Loika's bottom-bar word reads asleep, not grazing; stirred it reads ears up
//   node --test prototypes/exploration/tests/sleep-word.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";
import { DAY, WORDS } from "../src/words.mjs";

const nightAt = DAY.parts.slice(0, -1).reduce((a, q) => a + q[1], 0) + 5;

test("asleep at ease 0 the bar says asleep; stirred (ease 1) it says ears up", () => {
  const p = makePage({ gen: 7, console: "collect", els: true, canvas: true, raf: "count" });
  p.run("newWorld(7); TEST.calm = true; startExpedition('weather', G.spawns[0]);");
  const pick = JSON.parse(p.run(`(() => { for (const c of [...new Set(S.cr.filter(q => q.sp === 0).map(q => q.c))]) { if (!G.comp[c] || G.land[c] === L.WATER) continue; const key = String(c), lay = layout(key), live = ensureLive(key);
    for (const q of live.cr) if (q.sp === 0 && q.ind) return JSON.stringify({ key, id: q.id }); delete S.exp.live[key]; } return 'null'; })()`));
  assert.ok(pick, "a Loika in a mounted place");
  const out = JSON.parse(p.run(`(() => { const key = ${JSON.stringify(pick.key)}; S.exp.pos = key; enterPatch(key); S.exp.storm = null; S.exp.fog = null; const lay = curLay(), live = curLive(), c = live.cr.find(q => q.id === ${pick.id}), P = S.exp.patch;
    S.known = [0, ...S.known.filter(k => k !== 0)]; S.day.spent = ${nightAt}; live.strike = null; S.exp.stray = null; lay.easeG = { cov: new Set(), blk: new Set() }; c.ind.doings.late = 0;
    c.ease = 0; c.quiet = 0; c.crowd = 0; c.st = 'idle'; c.gone = null; c.hide = 0; c.hb = null; delete c.wary;
    const bed = hauntStand(hauntAt(c.ind.hs, c.ind.doings, dayPart()), hauntFree(lay, key, null)); c.x = bed.x; c.y = bed.y; c.ind.go = { part: dayPart(), t: { x: c.x, y: c.y } };
    habDay()[habKey(c, 'sleep')] = 'played';
    P.x = c.x + 1; P.y = c.y;
    const a = curledNow(c), wa = wildCtx(c, 'Marsh'); c.ease = 1; const b = curledNow(c), wb = wildCtx(c, 'Marsh');
    return JSON.stringify({ a, b, wa, wb }); })()`));
  assert.ok(out.a && !out.b, "curled at ease 0, not curled once stirred");
  assert.ok(out.wa && out.wa.every(s => !/grazing/.test(s)) && out.wa.some(s => s.includes(WORDS.habit.asleep)), "asleep reads asleep: " + JSON.stringify(out.wa));
  assert.ok(out.wb && out.wb.includes("Marsh · " + WORDS.ease.stage[1]) && !out.wb.includes("Marsh · " + WORDS.habit.asleep),"stirred reads ears up: " + JSON.stringify(out.wb));
  assert.deepEqual(p.errors, []);
});

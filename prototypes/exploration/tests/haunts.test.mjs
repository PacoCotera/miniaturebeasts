// The wild Loika's haunts, routines and names (walk-design-1 W2; canon: the book's page on the wild Loika's routines): the pure overlay (src/gen7/haunts.mjs), and the page's use of it.
//   node --test prototypes/exploration/tests/haunts.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { makePage } from "./page-harness.mjs";
import { LOIKA_POOL, NAMES, ROUTINE, HAUNT_KINDS, sitesOf, spotsFor, doingsOf, haunts0, hauntsOn, nightStep, haunt, routineOf, nameOf, isLate } from "../src/gen7/haunts.mjs";
import { DAY } from "../src/words.mjs";
import { routineBase } from "../src/walk-data.mjs";

const frame = JSON.parse(readFileSync(new URL("../../species/frames/language/species-S01.json", import.meta.url), "utf8"));

// a small place: water to the east, a reed bank, two sweeps, two groves (one hollow), two rocks
const view = () => ({ w: 24, h: 28, reeds: [{ x: 18, y: 6, w: 3, h: 3 }],
  props: [{ fam: "sweeps", x: 4, y: 4 }, { fam: "sweeps", x: 12, y: 20 }, { fam: "sweeps", x: 6, y: 24 }, { fam: "trees", kind: "tree-broad", x: 8, y: 9 }, { fam: "trees", kind: "tree-broad", x: 9, y: 9 },
    { fam: "trees", kind: "tree-hollow", x: 15, y: 14 }, { fam: "trees", kind: "tree-broad", x: 16, y: 15 }, { fam: "rocks", kind: "boulder-a", x: 3, y: 14 }, { fam: "rocks", kind: "boulder-e", x: 20, y: 22 }],
  water: (x, y) => x >= 22, land: (x, y) => x < 22 });

test("the pool in haunts.mjs is the Loika frame's own: attitude, drive and efficiency", () => {
  const row = id => frame.loci.find(l => l.id === id);
  assert.deepEqual(row("appearance.attitude").weights, LOIKA_POOL.attitude);
  assert.deepEqual(row("appearance.attitude").alleles.slice().sort(), Object.keys(LOIKA_POOL.attitude).sort());
  assert.deepEqual(row("movement.cycle-rate").alleles.slice().sort(), ["high", "low"]);
  assert.deepEqual(row("energy.action-efficiency").alleles.slice().sort(), ["high", "low"]);
});

test("a place offers every kind of site it holds, in a fixed order", () => {
  const s = sitesOf(view()), kinds = new Set(s.map(x => x.k));
  for (const k of HAUNT_KINDS) assert.ok(kinds.has(k), "has " + k);
  assert.ok(s.some(x => x.k === "grove" && x.hollow), "the Hollow Tree is a grove with a hollow");
  assert.deepEqual(sitesOf(view()), s);
});

test("a Loika's doings are drawn from the pool, and a Loika has three haunts and a bed of the place's sites", () => {
  const sites = sitesOf(view()); let wary = 0, bold = 0, early = 0, late = 0;
  for (let id = 1; id <= 60; id++) {
    const d = doingsOf(7, id); assert.deepEqual(d, doingsOf(7, id));
    assert.ok(d.drive >= .6 && d.drive <= 1.4 && d.wary >= 0 && d.wary <= 1);
    d.wary >= .5 ? wary++ : bold++; isLate(d) ? late++ : early++;
    const h = haunts0(7, id, sites, d);
    for (const k of ["water", "grass", "third", "bed"]) assert.ok(sites.includes(h[k]), k);
    assert.notEqual(h.bed, h.third, "the bed is never the third haunt");
    assert.ok(["reed", "shore"].includes(h.water.k) && h.grass.k === "sweep");
    assert.equal(h.third.k, d.wary >= .5 ? "outcrop" : "grove");
    assert.ok(["grove", "sweep"].includes(h.bed.k));
  }
  assert.ok(wary && bold && early && late, "the pool gives both sides of each doing");
});

test("an early one and a late one are never at the same haunt at the same part of day (night: each at its own bed)", () => {
  for (const [part] of DAY.parts) if (part !== "night") assert.notEqual(ROUTINE.early[part], ROUTINE.late[part], part);
  assert.equal(ROUTINE.early.dawn, "W"); assert.equal(ROUTINE.late.dawn, "B");
  assert.equal(ROUTINE.early.dusk, "B", "an early one is bedded before the dusk is done"); assert.equal(ROUTINE.late.dusk, "W");
  assert.equal(ROUTINE.early.night, "B"); assert.equal(ROUTINE.late.night, "B");
});

test("individuals move haunts overnight within their place: one or two change, always to the place's own sites", () => {
  const sites = sitesOf(view()); let changed1 = 0, changed2 = 0;
  for (let id = 1; id <= 40; id++) {
    const d = doingsOf(7, id); let hs = haunts0(7, id, sites, d);
    for (let n = 1; n <= 6; n++) {
      const next = nightStep(7, id, hs, sites, n), diff = ["water", "grass", "third"].filter(k => next[k] !== hs[k]).length;
      assert.ok(diff <= 2); if (diff === 1) changed1++; if (diff === 2) changed2++;
      for (const k of ["water", "grass", "third", "bed"]) assert.ok(sites.includes(next[k]));
      assert.deepEqual(hauntsOn(7, id, sites, d, n).water, hauntsOn(7, id, sites, d, n).water);
      hs = next;
    }
    assert.deepEqual(hauntsOn(7, id, sites, d, 6), hs, "the haunts after n nights are a pure walk");
  }
  assert.ok(changed1 && changed2, "a night changes one haunt or two");
});

test("the front and the side spot of a site lie 3 to 5 tiles off", () => {
  const site = { k: "reed", x: 10, y: 10 }, ok = (x, y) => x >= 0 && y >= 0 && x < 24 && y < 28;
  const s = spotsFor(site, ok); assert.ok(s.front && s.side);
  assert.ok(s.front[1] - site.y >= 3 && s.front[1] - site.y <= 5); assert.ok(Math.abs(s.side[0] - site.x) >= 3 && Math.abs(s.side[0] - site.x) <= 5);
  assert.deepEqual(spotsFor(site, () => false), { front: null, side: null });
});

test("44 names, none repeated until the 45th Loika, none a book name, and a realm's order is its own", () => {
  assert.equal(NAMES.length, 44); assert.equal(new Set(NAMES).size, 44);
  for (const bad of ["Bramble", "Sable", "Pip", "Rust", "Thistle", "Ember", "Dapple", "Moss", "Tita"]) assert.ok(!NAMES.includes(bad), bad);
  const first = Array.from({ length: 44 }, (_, i) => nameOf(7, i)); assert.equal(new Set(first).size, 44);
  assert.equal(nameOf(7, 44), nameOf(7, 0));
  assert.notDeepEqual(first, Array.from({ length: 44 }, (_, i) => nameOf(8, i)));
});

test("the Loika is the kind with a routine base", () => { assert.equal(routineBase(0).haunts, 3); assert.equal(routineBase(1), null); });

// ---------- the page ----------
const page = () => makePage({ gen: 7, console: "collect", els: true, canvas: true, raf: "count" });
const dist = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

test("on the page a Loika is at its routine's haunt at dawn and somewhere else at dusk, and moves there", () => {
  const p = page(); p.run("newWorld(7); TEST.calm = true; startExpedition('weather', G.spawns[0]);");
  // the first place with a Loika whose dawn and dusk haunts lie well apart
  const pick = JSON.parse(p.run(`(() => { for (const c of [...new Set(S.cr.filter(q => q.sp === 0).map(q => q.c))]) { if (!G.comp[c] || G.land[c] === L.WATER) continue; const key = String(c), lay = layout(key), live = ensureLive(key);
      for (const q of live.cr) if (q.sp === 0 && q.ind) { const a = hauntAt(q.ind.hs, q.ind.doings, 'dawn'), b = hauntAt(q.ind.hs, q.ind.doings, 'dusk'); if (Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) >= 5) return JSON.stringify({ key, id: q.id, name: q.ind.name }); }
      delete S.exp.live[key]; } return 'null'; })()`));
  assert.ok(pick, "a Loika with a dawn haunt and a dusk haunt apart");
  const at = (day, part) => JSON.parse(p.run(`(() => { S.day.spent = ${day}; delete S.exp.live[${JSON.stringify(pick.key)}]; const c = ensureLive(${JSON.stringify(pick.key)}).cr.find(q => q.id === ${pick.id}); const h = hauntAt(c.ind.hs, c.ind.doings, ${JSON.stringify(part)}); return JSON.stringify({ x: c.x, y: c.y, h: { x: h.x, y: h.y, k: h.k } }); })()`));
  const dawn = at(0, "dawn"), dusk = at(150, "dusk");
  assert.ok(dist(dawn, dawn.h) <= 3, "at dawn it is at its haunt: " + JSON.stringify(dawn));
  assert.ok(dist(dusk, dusk.h) <= 3, "at dusk it is at its dusk haunt");
  assert.ok(dist(dawn, dusk) >= 3, "somewhere else at dusk");
  // and the routine moves it: from the dawn place to the dusk haunt by ticks of the day
  p.run(`S.exp.live = {}; S.day.spent = 0; ensureLive(${JSON.stringify(pick.key)}); S.exp.pos = ${JSON.stringify(pick.key)}; enterPatch(S.exp.pos);`);
  const before = JSON.parse(p.run(`(() => { const c = curLive().cr.find(q => q.id === ${pick.id}); return JSON.stringify({ x: c.x, y: c.y }); })()`));
  p.run("S.day.spent = 150;");
  for (let i = 0; i < 15; i++) { p.run("advance('patch', { noise: 'act' })"); p.pass(1200); if (!p.run("!!S.exp")) break; }
  const after = JSON.parse(p.run(`(() => { const c = curLive().cr.find(q => q.id === ${pick.id}); return c ? JSON.stringify({ x: c.x, y: c.y }) : 'null'; })()`));
  assert.ok(after && dist(after, dusk.h) <= 2, "the routine brought it to its dusk haunt");
  assert.ok(after && dist(before, after) >= 3, "the routine walked it away from its dawn spot by dusk: " + JSON.stringify({ before, after, dawn, dusk, st: p.run(`curLive().cr.find(q => q.id === ${pick.id}).st`), go: p.run(`JSON.stringify(curLive().cr.find(q => q.id === ${pick.id}).ind.go)`), P: p.run("JSON.stringify(S.exp.patch)"), part: p.run("dayPart()") }));
  assert.deepEqual(p.errors, []);
});

test("facing a Loika in sight, the bottom line names it and says where it keeps this part of day; before it is met it has no name", () => {
  const p = page(); p.run("newWorld(7); TEST.calm = true; startExpedition('weather', G.spawns[0]);");
  const r = JSON.parse(p.run(`(() => { for (const c of [...new Set(S.cr.filter(q => q.sp === 0).map(q => q.c))]) { if (!G.comp[c] || G.land[c] === L.WATER) continue; const key = String(c); layout(key); S.exp.pos = key; enterPatch(key);
      const live = curLive(), q = live.cr.find(z => z.sp === 0 && z.ind); if (!q) { S.exp.live = {}; continue; }
      const P = S.exp.patch, f = frontOf(P); q.x = f.x; q.y = f.y; q.hide = 0; S.known = [0, ...S.known.filter(k => k !== 0)];
      if (!inSight(q.x, q.y)) { S.exp.live = {}; continue; }
      S.named = {}; const before = [].concat(lineBase().ctx).join('|'); advance('patch', { noise: 'act' }); const F = frontOf(S.exp.patch), c2 = curLive().cr.find(z => z.id === q.id);
      c2.x = F.x; c2.y = F.y; const after = [].concat(lineBase().ctx).join('|');
      return JSON.stringify({ name: q.ind.name, before, after, named: S.named[q.id] }); } return 'null'; })()`));
  assert.ok(r, "a Loika in sight in front of the pawn");
  assert.ok(!r.before.includes(r.name), "no name before it is met: " + r.before);
  assert.equal(r.named, r.name, "met once it is in sight");
  assert.ok(r.after.includes(r.name), "the bottom line names it: " + r.after);
});

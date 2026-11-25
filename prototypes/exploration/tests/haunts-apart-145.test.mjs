// #145 (design f1cf4262ae, 2026-11-24 20:48 MX): "a Loika's day moves. (1) Haunts whose stand tiles coincide (or lie within 2 tiles) count as one haunt. (2) Two parts of day in a row never keep her at the same haunt: at each part's turn she goes to a different one, at least 3 tiles away; ... Seeded, the same realm gives the same day."
//   node --test prototypes/exploration/tests/haunts-apart-145.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { makePage } from "./page-harness.mjs";
import { hauntsApart, haunts0, hauntsOn, sitesOf, doingsOf } from "../src/gen7/haunts.mjs";

const raw = readFileSync(new URL("./fixtures/owner-note-145-hazel.save.json", import.meta.url), "utf8");
const load = () => makePage({ gen: 7, console: "collect", els: true, canvas: true, raf: "count", store: { "mb-save-v8": raw } });
const hz = `curLive().cr.find(c => c.ind && c.ind.name === 'Hazel')`;
const four = hs => ["water", "grass", "third", "bed"].map(k => ({ k: hs[k].k, x: hs[k].x, y: hs[k].y }));
const cheb = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

test("a view with sites close together: the four haunts stand pairwise >= 3 apart, and the same seed gives the same haunts", () => {
  const view = { w: 24, h: 22, props: [], reeds: [{ x: 15, y: 3, w: 2, h: 2 }, { x: 5, y: 8, w: 2, h: 2 }], water: (x, y) => x >= 15 && y >= 3 && x <= 17 && y <= 4, land: () => true };
  const sites = sitesOf(view), d = doingsOf(64, 7);
  const a = haunts0(64, 7, sites, d), b = haunts0(64, 7, sites, d);
  assert.deepEqual(a, b);
  assert.ok(hauntsApart(a), JSON.stringify(four(a)));
  const walked = hauntsOn(64, 7, sites, d, 6);
  assert.ok(hauntsApart(walked), JSON.stringify(four(walked)));
  assert.deepEqual(walked, hauntsOn(64, 7, sites, d, 6));
});

test("his save: Hazel's stored haunts break the rule; loaded, they are chosen again, 3 apart, the same twice", () => {
  const stored = JSON.parse(raw);
  const before = stored.exp.live[stored.exp.patch.key].cr.find(c => c.ind && c.ind.name === "Hazel").ind.hs;
  assert.ok(!hauntsApart(before), "the stored set breaks the rule: " + JSON.stringify(four(before)));
  const runs = [0, 1].map(() => { const p = load(); p.run(`advance('patch', { noise: 'act' })`); p.pass(1200); return JSON.parse(p.run(`JSON.stringify(${hz}.ind.hs)`)); });
  assert.ok(hauntsApart(runs[0]), JSON.stringify(four(runs[0])));
  assert.deepEqual(runs[0], runs[1]);
  console.log("Hazel before", JSON.stringify(four(before)), "after", JSON.stringify(four(runs[0])));
});

test("his save through one day: her stand changes at every part's turn from dawn to dusk, never to a tile within 2 of the last", () => {
  const p = load();
  const at = () => JSON.parse(p.run(`JSON.stringify((c => ({ part: dayPart(), x: c.x, y: c.y }))(${hz}))`));
  const stands = [];
  for (let s = 157; s < 560; s += 25) {
    p.run(`S.day.spent = ${s}; advance('patch', { noise: 'creep' })`); p.pass(1200);
    const h = at(); stands.push(h);
  }
  const lastOf = {}, order = [];
  for (const h of stands) { lastOf[h.part] = h; if (!order.includes(h.part)) order.push(h.part); }
  const parts = order.filter(n => n !== "night");
  assert.ok(parts.length >= 3, "morning to dusk seen: " + order);
  for (let i = 1; i < parts.length; i++) assert.ok(cheb(lastOf[parts[i - 1]], lastOf[parts[i]]) >= 3, `${parts[i - 1]} -> ${parts[i]}: ${JSON.stringify([lastOf[parts[i - 1]], lastOf[parts[i]]])}`);
});

test("a place whose haunts cannot be made 3 apart is tried once a night per creature, not every tick", () => {
  const p = load();
  p.run(`curLive()`);
  // every site on one tile: no set of four can stand 3 apart, so hauntsKept returns a set that still fails
  p.run(`(function () { const lay = layout(S.exp.patch.key); lay.haunts = [{ k: 'reed', x: 5, y: 5 }, { k: 'shore', x: 5, y: 5 }]; globalThis.__calls = 0; const orig = hauntsKept; hauntsKept = function () { globalThis.__calls++; return orig.apply(this, arguments); }; })()`);
  const n = () => +p.run(`globalThis.__calls`);
  p.run(`for (let i = 0; i < 40; i++) keepHaunts(curLive(), S.exp.patch.key)`);
  const first = n(), cr = +p.run(`curLive().cr.filter(c => c.ind && c.ind.hs && !hauntsApart(c.ind.hs)).length`);
  assert.ok(cr > 0, "some creature still breaks the rule in the small place");
  assert.ok(first > 0 && first <= cr, `rebuilt once per creature, not 40 times: ${first} calls for ${cr} creatures`);
  p.run(`for (let i = 0; i < 40; i++) keepHaunts(curLive(), S.exp.patch.key)`);
  assert.equal(n(), first, "no more calls the same night");
  p.run(`S.turn++; for (let i = 0; i < 40; i++) keepHaunts(curLive(), S.exp.patch.key)`);
  assert.ok(n() > first && n() <= first * 2, "tried again the next night, once");
});

// G1, the watch in one place: the carry table, ease, sight, wind, keeping still as one act, notes and their range, the individuals, and the bot's day.
//   node --test prototypes/exploration/tests/g1-watch.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import * as G from "../src/g1-watch.mjs";
import { INDIVIDUALS } from "../src/g1-individuals.mjs";
import { individualOf, SEEDS } from "../tools/g1-make-individuals.mjs";
import { playDay } from "../tools/g1-bot.mjs";

const day = (seed = 7, o = {}) => { const S = G.makeDay(seed); Object.assign(S.ind, { wary: 0, tell: 3, late: false }, o.ind); S.rain = o.rain ?? null; if (o.wind) S.wind = S.wind.map(() => o.wind); return S; };

test("her individuals match the species framework's Loika frame, one per seed, with wariness from her genes", () => {
  assert.equal(INDIVIDUALS.length, SEEDS);
  for (const s of [1, 2, 57, 200]) { const i = individualOf(s); assert.deepEqual(INDIVIDUALS[s - 1], [i.wary, i.tell, i.late ? 1 : 0]); }
  assert.ok(INDIVIDUALS.every(r => [-1, 0, 1].includes(r[0]) && r[1] >= 2 && r[1] <= 4));
  assert.deepEqual(new Set(INDIVIDUALS.map(r => r[0])), new Set([-1, 0, 1]), "calm, steady and wary ones all occur");
});

test("the carry table: gait, ground, wind, rain, wariness; never below 1", () => {
  const S = day(7, { wind: "N" }); S.L.x = 7; S.L.y = 4;
  assert.equal(G.carryAt(S, 7, 6, "creep").v, 4, "grass, creeping, you south of her and the wind blowing north from you to her: upwind +2");
  const at = (x, y, gait, o) => { const T = day(7, o); T.L.x = 7; T.L.y = 4; return G.carryAt(T, x, y, gait).v; };
  assert.equal(at(9, 4, "creep", { wind: "N" }), 3, "sand +1, wind across");
  assert.equal(at(9, 4, "walk", { wind: "N" }), 5, "walking carries 4");
  assert.equal(at(4, 4, "creep", { wind: "N" }), 1, "reeds -1");
  assert.equal(at(4, 4, "creep", { wind: "W" }), 1, "reeds -1, downwind -1: 2-1-1 = 0, never below 1");
  assert.equal(at(4, 4, "creep", { wind: "E" }), 3, "reeds -1, upwind +2");
  assert.equal(at(9, 4, "creep", { wind: "E" }), 2, "sand +1, downwind -1");
  assert.equal(at(9, 4, "creep", { wind: "W" }), 5, "sand +1, upwind +2");
  assert.equal(at(9, 4, "creep", { wind: "N", ind: { wary: 1 } }), 4, "a wary one +1");
  assert.equal(at(9, 4, "creep", { wind: "N", ind: { wary: -1 } }), 2, "a calm one -1");
  assert.equal(at(9, 4, "creep", { wind: "N", rain: { s: 0, e: 50 } }), 2, "rain -1");
});

test("ease in four stages: a heard step raises it, quiet actions lower it, a third heard step sends her away for the day", () => {
  const S = day(7, { wind: "N" }); S.P.x = 9; S.P.y = 6; S.L.x = 7; S.L.y = 4;
  assert.equal(S.L.ease, 0);
  G.step(S, "up", "creep"); assert.equal(S.L.ease, 1, "ears up"); assert.equal(S.L.gone, false);
  G.wait(S); assert.equal(S.L.ease, 1); G.wait(S); assert.equal(S.L.ease, 0, "two quiet actions settle ears up");
  G.step(S, "left", "creep"); G.step(S, "up", "creep"); assert.equal(S.L.ease, 2, "watching");
  G.wait(S); G.wait(S); assert.equal(S.L.ease, 2); G.wait(S); assert.equal(S.L.ease, 1, "watching settles after three");
  G.step(S, "down", "creep"); assert.equal(S.L.ease, 2); G.step(S, "left", "creep"); assert.equal(S.L.ease, 3, "gone"); assert.equal(S.L.gone, true);
  assert.ok(S.log.goneAt !== null);
});

test("props and raised edges block sight: a step behind a stone is not heard, and a note needs sight", () => {
  const S = day(7, { wind: "N" }); S.L.x = 7; S.L.y = 4;
  assert.equal(G.los({ x: 7, y: 10 }, S.L), false, "the stone wall");
  assert.equal(G.los({ x: 9, y: 4 }, S.L), true);
  assert.equal(G.heardAt(S, 7, 6, "walk"), true);
  S.L.x = 7; S.L.y = 6; assert.equal(G.heardAt(S, 7, 10, "walk"), false, "out of reach and behind the wall");
});

test("the wind turns by part of day, from the seed", () => {
  const a = G.makeDay(3), b = G.makeDay(3), c = G.makeDay(4);
  assert.deepEqual(a.wind, b.wind); assert.equal(a.wind.length, 6);
  assert.ok(G.makeDay(3).wind.some((w, i, all) => w !== all[0]) || G.makeDay(5).wind.some((w, i, all) => w !== all[0]) || c.wind.some((w, i, all) => w !== all[0]), "some day turns");
});

test("keeping still is ONE act: it runs until her ease changes, a tell starts, the weather or the part turns, or ten light; each Wait spends light", () => {
  const S = day(7, { wind: "N" }); const h = G.hold(S);
  assert.equal(h.n, 10); assert.equal(h.why, "ten"); assert.equal(S.light, 10, "ten Waits, ten light"); assert.equal(S.log.holds, 1); assert.equal(S.log.waits, 10);
  const T = day(7, { wind: "N" }); T.light = 15; const hp = G.hold(T); assert.equal(hp.why, "part"); assert.equal(hp.n, 5, "dawn turns at 20");
  const R = day(7, { wind: "N", rain: { s: 30, e: 60 } }); R.light = 25; const hr = G.hold(R); assert.equal(hr.why, "weather"); assert.equal(R.light, 30, "rain began");
  const E = day(7, { wind: "N" }); E.P.x = 9; E.P.y = 5; G.step(E, "up", "creep"); assert.equal(E.L.ease, 1); const he = G.hold(E); assert.equal(he.why, "ease"); assert.equal(he.n, 2);
  const D = day(7, { wind: "N" }); D.light = 151; D.sleepAt = 154; const hd = G.hold(D); assert.equal(hd.why, "tell"); assert.equal(D.L.habit.k, "sleep");
});

test("a habit plays on its cause: rain then the moment it stops, a wary one near, dusk; and a heard step in a habit loses it", () => {
  const S = day(7, { wind: "N", rain: { s: 20, e: 40 } }); S.light = 39; G.wait(S);
  assert.equal(S.L.habit.k, "shake", "the rain stopped: she shivers"); S.P.x = 6; S.P.y = 9;
  const beats = []; while (S.L.habit) { beats.push(S.L.habit.n); G.wait(S); }
  assert.equal(beats.length, S.ind.tell + 4, "the tell, then four beats"); assert.equal(S.done.shake, "played");
  const C = day(7, { wind: "N" }); C.ma = 100; C.light = 99; G.wait(C); assert.ok(C.M.here); assert.equal(C.L.habit.k, "calm", "a wary one comes near");
  const Z = day(7, { wind: "N", rain: { s: 20, e: 40 } }); Z.P.x = 9; Z.P.y = 5; Z.light = 39; G.wait(Z); assert.ok(Z.L.habit);
  G.step(Z, "up", "creep"); G.step(Z, "up", "creep"); assert.equal(Z.L.habit, null, "she stops"); assert.equal(Z.done.shake, "lost");
});

test("a note carries its range; the first note of a habit pays +1 Data and, near, a sample (a tuft after shake-dry)", () => {
  const S = day(7, { wind: "N", rain: { s: 20, e: 40 } }); S.light = 39; G.wait(S); assert.equal(S.L.habit.k, "shake");
  S.P.x = 3; S.P.y = 4; G.face(S); assert.equal(G.noteState(S).range, "mid");
  const n1 = G.note(S); assert.equal(n1.ok, true); assert.equal(n1.range, "mid"); assert.equal(S.data, 1); assert.equal(S.samples.length, 0, "no sample from mid");
  assert.equal(G.note(S).why, "dup", "one note per range");
  S.P.x = 6; S.P.y = 4; G.face(S);
  const n2 = G.note(S); assert.equal(n2.range, "near"); assert.equal(S.data, 1, "only the first note pays Data"); assert.deepEqual(S.samples, ["a tuft"]); assert.equal(S.notes.shake.best, "near"); assert.equal(S.notes.shake.first, "mid");
  const F = day(7, { wind: "N", rain: { s: 20, e: 40 } }); F.light = 39; G.wait(F); F.P.x = 7; F.P.y = 13; G.face(F); assert.equal(G.noteState(F).ok, false, "behind the wall"); assert.equal(G.noteState(F).why, "sight");
  const B = day(7, { wind: "N", rain: { s: 20, e: 40 } }); B.light = 39; G.wait(B); B.P.x = 5; B.P.y = 4; B.P.dir = "down"; assert.equal(G.noteState(B).why, "face");
  assert.equal(G.rangeOf(6), "far"); assert.equal(G.rangeOf(5), "mid"); assert.equal(G.rangeOf(3), "mid"); assert.equal(G.rangeOf(2), "near");
});

test("the line under her says in words whether the next step would be heard", () => {
  const S = day(7, { wind: "N" }); S.P.x = 9; S.P.y = 6; S.P.dir = "up"; S.L.x = 7; S.L.y = 4;
  assert.match(G.hearLine(S), /creep heard/); S.P.x = 3; S.P.y = 8; S.P.dir = "up"; S.L.x = 7; S.L.y = 4; assert.match(G.hearLine(S), /creep unheard/);
});

test("the bot's days: every HONEST day on seeds 1 to 40 notes something (E3), and a run is repeatable", () => {
  for (let s = 1; s <= 40; s++) { const r = playDay(s, "HONEST"); assert.equal(r.empty, false, "seed " + s + " has a note"); }
  assert.deepEqual(playDay(9, "HONEST"), playDay(9, "HONEST"));
});

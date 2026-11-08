// A fixed-policy bot that plays whole expeditions on the Companion page, in the test sandbox, and gives a digest of the realm it leaves behind.
// It is the golden run of the realm work: recorded on the v8 page, and the
// v9 page with one region must give the same digest. The page is played only through its keys (page-harness.mjs), the Date stands still, and
// every choice comes from the bot's own generator, so one (seed, generator, expeditions) gives one digest, byte for byte.
//   node prototypes/exploration/tools/realm-run.mjs [--seed 7] [--gen 5] [--exp 20] [--mibis 0] [--dock 0] [--stop-mid] [--save out.json] [--record]
//   --mibis n    n grown mibis ride with the Companion from the start (the Station hands them over)
//   --dock n     the Companion docks at the Station before every n-th expedition (the crates are opened, then it is lifted); it also docks whenever the Probe is broken
//   --stop-mid   stop expedition --exp after its walk out, still on the map, and keep that save (the save of an expedition under way)
//   --save f     writes the page's save (the bytes it stored) to f
//   --record     rewrites tests/realm-run.golden.json
import { writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { makePage } from "../tests/page-harness.mjs";
import { freshSt, dockKey, openBay, DEFAULT_SETTINGS } from "../../station/src/state.mjs";

import { FIXED_DATE, newPage, makeWalker } from "./walker.mjs";
export { FIXED_DATE };   // 3 Nov 2026, 09:00 UTC: the page's clock for every run
const DIRS = ["up", "right", "down", "left"];

// canonical text of a value: keys sorted, so the digest does not depend on the order a page builds its objects in
export const canon = v => v === null || typeof v !== "object" ? JSON.stringify(v === undefined ? null : v)
  : Array.isArray(v) ? "[" + v.map(canon).join(",") + "]" : "{" + Object.keys(v).sort().map(k => JSON.stringify(k) + ":" + canon(v[k])).join(",") + "}";
export const sha = s => createHash("sha256").update(s).digest("hex");

// the state the digest covers: the realm as the page holds it (S), whichever way the page stores it
const STATE = `(() => { const u = {}, s = S; for (const k of ["seed", "gen", "wid", "turn", "expN", "trips", "revealed", "visited", "called", "signs", "pins", "cells", "pods", "cr", "veil", "svy", "opened",
  "skulls", "lastStorm", "known", "found", "met", "firsts", "mibis", "carried", "lead", "tier", "shield", "deepRead", "bay", "hold", "exp", "report", "log", "hist", "totalActions", "walkTurn", "phase"]) if (s[k] !== undefined) u[k] = s[k];
  u.lastPos = s.ui && s.ui.lastPos; return JSON.parse(JSON.stringify(u)); })()`;

export function runBot({ seed = 7, gen = 5, expeditions = 20, mibis = 0, dock = 0, stopMid = false } = {}) {
  const p = makePage({ console: "silent", date: FIXED_DATE });
  let x = (seed * 2654435761 + gen * 40503) >>> 0;
  const rng = n => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return (x >>> 8) % n; };   // the bot's own: it never touches the page's draws
  p.run(`newWorld(${seed}, ${gen})`);
  for (let i = 1; i <= mibis; i++) p.run(`S.mibis.push({ id: ${i}, name: 'Mibi${i}', sp: ${(i - 1) % 3}, born: -9, outings: 0, notches: 0, bonded: false, care: 0, tends: 0, tendDay: null, grownTurn: null }); S.carried.push(${i}); S.nextId = Math.max(S.nextId || 1, ${i + 1}); save();`);
  const S = () => p.S, pos = () => p.run("S.exp ? S.exp.pos : -1"), phase = () => p.S.phase;
  let presses = 0;
  const key = k => { if (++presses > 20000) throw new Error("runaway: phase " + phase()); p.key(k); };
  const steps = [], crates = { sealed: 0 };
  // a dock at the Station: seated, the bay opened, lifted (the Station's own code, with the clock held)
  const st = freshSt(p.S.wid, p.S.turn, FIXED_DATE); let hour = 0;
  st.mibis = p.S.mibis.map(m => ({ id: m.id, name: m.name, sp: m.sp, born: m.born })); p.writeSt(st);
  const atStation = () => { const now = FIXED_DATE + 3600000 * ++hour;
    if (!dockKey(st, p.sv(), DEFAULT_SETTINGS, now).docked) throw new Error("the Station did not seat the Companion"); p.writeSt(st);
    openBay(st, p.sv(), DEFAULT_SETTINGS, now); p.writeSt(st);
    if (!dockKey(st, p.sv(), DEFAULT_SETTINGS, now + 60000).lifted) throw new Error("the Station did not lift the Companion"); p.writeSt(st);
    for (let g = 0; g < 6 && phase() !== "sealed" && phase() !== "setup"; g++) key("back"); };

  // in a place: a Call, some steps and presses on what is faced, a second Call, then Leave
  const inPlace = () => {
    key("call");
    p.run("TEST.findHeart()");   // a Call no longer counts a place explored, its heart does: the bot's walk finds it (C16 will walk there for real). A walk that only revisits found places finds nothing new and seals nothing, so the world turns less often than once per expedition.
    for (let i = 0, n = 5 + rng(6); i < n && phase() === "patch"; i++) { key(DIRS[rng(4)]); if (rng(3) === 0 && phase() === "patch") key("confirm"); }
    if (phase() === "patch") key("call");
    for (let guard = 0; phase() === "patch" && guard < 6; guard++) {
      key("back");
      if (phase() === "menu") { const ids = p.run("menuItems().map(i => i.id)"); const at = ids.indexOf("leave"); if (at < 0) { key("back"); break; }
        p.run(`S.ui.menuSel = ${at};`); key("confirm"); } }
  };

  // one expedition: out along a random walk (places on the way), then back along the same path to the start, then End expedition
  const expedition = n => {
    const mid = stopMid && n === expeditions;
    if ((dock && n % dock === 0) || S().shield <= 0) atStation();
    if (phase() === "sealed") key("confirm");
    while (phase() === "report" || phase() === "menu") key("back");
    key("confirm"); key("confirm");   // Weather, the first start offered
    if (!S().exp) throw new Error("expedition " + n + " did not start (phase " + phase() + ")");
    const start = pos();
    const budget = mid ? 40 : 16 + (n * 7) % 23;
    let moved = 0, tries = 0, heading = -1, run = 0;
    while (moved < budget && tries < budget * 6 && S().exp && phase() === "map") {
      tries++; const before = pos(); if (heading < 0 || run <= 0) { heading = rng(4); run = 3 + rng(5); }
      key(DIRS[heading]); run--; if (pos() !== before) moved++; else run = 0;   // keep a heading for a few steps; turn when blocked
      if (S().exp && phase() === "map" && rng(3) === 0) { key("confirm"); if (phase() === "patch") inPlace(); }
    }
    if (mid) { steps.push({ n, presses, mid: true }); return false; }
    // back to the start, along cells already visited, by the page's own rule for a step (canStep)
    const road = from => p.run(`(() => { const goal = ${start}, seen = new Map([[${from}, null]]), q = [${from}];
      for (let i = 0; i < q.length; i++) { const c = q[i]; if (c === goal) break;
        for (const d of ["up", "right", "down", "left"]) { if (!canStep(c, d)) continue; const t = c + (d === "up" ? -MW : d === "down" ? MW : d === "left" ? -1 : 1);
          if (!seen.has(t) && (S.visited[t] || t === goal)) { seen.set(t, [c, d]); q.push(t); } } }
      const out = []; for (let c = goal; seen.get(c); c = seen.get(c)[0]) out.unshift(seen.get(c)[1]); return seen.has(goal) ? out : null; })()`);
    for (let stall = 0; S().exp && pos() !== start && stall < 60; stall++) {
      if (phase() !== "map") { key("back"); continue; }
      const way = road(pos()); if (!way) throw new Error("expedition " + n + ": no road back from " + pos() + " to " + start);
      for (const d of way) { if (phase() !== "map") break; key(d); }
    }
    if (S().exp && pos() === start) {
      key("back");   // the map's menu: End expedition is its first row
      if (phase() === "menu") { const ids = p.run("menuItems().map(i => i.id)"); p.run(`S.ui.menuSel = ${Math.max(0, ids.indexOf("end"))};`); key("confirm"); }
      for (let g = 0; S().exp && g < 4; g++) key("confirm");   // Cargo: End expedition
    }
    if (S().exp) { const why = "expedition " + n + " did not end (phase " + phase() + ", pos " + pos() + ", start " + start + ")"; throw new Error(why); }
    return true;
  };

  for (let n = 1; n <= expeditions; n++) {
    const ended = expedition(n);
    if (!ended) break;
    const sealedNow = S().report && S().report.sealed ? 1 : 0; crates.sealed += sealedNow;
    steps.push({ n, presses, turn: S().turn, bay: S().bay.length, d: sha(canon(p.run(STATE))).slice(0, 16) });
  }
  const state = p.run(STATE), digest = sha(canon(state));
  return { seed, gen, expeditions, mibis, dock, stopMid, presses, digest, steps, summary: summary(state), save: p.store[p.KEY], page: p };
}

// what a reader of the golden file wants to see without running anything
export function summary(s) {
  const cells = o => Object.values(o || {}).filter(Boolean).length;
  return { turn: s.turn, expN: s.expN, gen: s.gen, revealed: cells(s.revealed), visited: cells(s.visited), called: cells(s.called), pods: s.pods.length, creatures: s.cr.length,
    bay: s.bay.length, hold: s.hold ? { e: s.hold.e, d: s.hold.d, s: s.hold.s, pods: s.hold.pods.length } : null, mibis: s.mibis.length, carried: s.carried.length, known: s.known.length, exp: s.exp ? s.exp.n : null };
}

// ---- Pacing (walk slice C16, W§9): a bot that walks to the tell and the heart of generator 6's places and measures the walk. Pure play through the page's keys, calm weather (no storm, no fog bank). ----
// A visit is one place: the arrival (the action count on entering), the tell (the first action at which the heart's tell shows through the veil, within TELL_R of the explorer),
// the heart (found), the whole place (the heart found and every thing the screen offers taken: the Call at the heart lifts what lies round it, the reveal lists the rest).
// Its policy: Call on arrival, walk to the heart, dismiss the reveal (free), Call at the heart, take every shown thing once, leave; the next place is the nearest cell whose heart is not found,
// rings out from the start. After the last place it walks home along the cells it came by. An action is the page's own count (ex.actions): a Call, a step in a place or on the map, a ✓.
export function paceRun(seed, { places = 1, verbose = false, calm = true } = {}) {
  const p = newPage(seed, { calm }), w = makeWalker(p, { verbose, tag: "pace " + seed }), { key, phase, acts } = w;
  const visits = [], tellNow = () => p.run("(() => { const P = S.exp.patch, h = heartOf(P.key); return !!h && tellShows(h, P); })()");
  const reveal = () => { if (p.run("!!RT.view")) key("confirm"); };   // a press ends the arrival look or the reveal and is consumed: no action
  const visit = () => {
    reveal();
    const arrive = acts(), info = p.run("(() => { const lay = layout(S.exp.patch.key), h = heartOf(S.exp.patch.key); return { id: lay.baked ? lay.baked.id : 'generated', cell: lay.cell, kind: h.kind, path: h.path.length, from: Math.abs(h.x - S.exp.patch.x) + Math.abs(h.y - S.exp.patch.y) }; })()");
    const v = { ...info, tell: null, heart: null, whole: null, taken: 0, calls: 0 }, since = () => acts() - arrive;
    const note = () => { if (v.tell == null && tellNow()) v.tell = since() - v.calls; if (v.heart == null && w.heartInfo().found) v.heart = since(); };
    note(); key("call"); v.calls++; note();
    for (let i = 0; i < 80 && phase() === "patch" && !w.heartInfo().found; i++) { const h = w.heartInfo(), before = acts(); w.walk(h.x, h.y, false, 1); note(); if (acts() === before) break; }   // one step at a time, so the tell and the find are timed
    reveal();
    if (v.heart != null && phase() === "patch") {
      const h = w.heartInfo(); w.walk(h.x, h.y, false, 12); key("call"); v.calls++;
      const tried = new Set();
      for (let g = 0; g < 40 && phase() === "patch"; g++) {
        const it = w.items().find((i) => !tried.has(i.k + i.x + "," + i.y)); if (!it) break;
        tried.add(it.k + it.x + "," + it.y);
        if (!w.walk(it.x, it.y, false, 40)) continue;
        const before = w.itemCount(); key(w.facing(it.x, it.y)); key("confirm");
        if (p.S.ui && p.S.ui.swap) key("back");
        if (w.itemCount() < before) v.taken++;
      }
      v.whole = since();
    }
    w.leave(); visits.push(v);
    if (verbose) console.log(`  [${seed}] ${v.id} ${v.kind}: tell ${v.tell} heart ${v.heart} whole ${v.whole} (path ${v.path}, taken ${v.taken})`);
  };
  key("confirm"); key("confirm");   // Weather, the first glint
  const start = p.S.exp.pos; let mapSteps = 0;
  for (let n = 0; n < places && phase() === "map"; n++) {
    const way = w.road(w.unfound()); if (!way) break;
    const a = acts(); w.steps(way); mapSteps += acts() - a;
    key("confirm"); if (phase() !== "patch") break;
    visit();
  }
  const a = acts(), home = w.wayHome(); if (home) w.steps(home); mapSteps += acts() - a;
  return { seed, places: visits.length, total: acts(), mapSteps, home: p.S.exp.pos === start, cargo: w.cargo(), visits };
}
export const PACE_SEEDS = [7, 13, 42];

const GOLDEN = new URL("../tests/realm-run.golden.json", import.meta.url);
export const RUN = { seed: 7, gen: 5, expeditions: 20, mibis: 0, dock: 0 };   // the golden run

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  const a = process.argv.slice(2), arg = (k, d) => { const i = a.indexOf("--" + k); return i < 0 ? d : +a[i + 1]; };
  const opts = { seed: arg("seed", RUN.seed), gen: arg("gen", RUN.gen), expeditions: arg("exp", RUN.expeditions), mibis: arg("mibis", 0), dock: arg("dock", 0), stopMid: a.includes("--stop-mid") };
  if (a.includes("--pace")) {   // node tools/realm-run.mjs --pace [--seeds 7,13,42] [--verbose]: the 3-minute shape (one place and home) and the 15-minute shape (four places and home)
    const si = a.indexOf("--seeds"), seeds = si < 0 ? PACE_SEEDS : a[si + 1].split(",").map(Number), verbose = a.includes("--verbose");
    for (const seed of seeds) for (const [name, places] of [["3-minute", 1], ["15-minute", 4]]) {
      const r = paceRun(seed, { places, verbose, calm: !a.includes("--storm") }), f = (k) => r.visits.map((v) => v[k]).join("/");
      console.log(`seed ${seed} ${name}: ${r.total} actions (${r.mapSteps} on the map), ${r.places} places, home ${r.home}; carries ${r.cargo.e}E ${r.cargo.d}D ${r.cargo.s}S ${r.cargo.pods}p; tell ${f("tell")}, heart ${f("heart")}, whole place ${f("whole")}; kinds ${f("kind")}; ${f("id")}`);
    }
    process.exit(0);
  }
  const r = runBot(opts);
  const { save, page, ...pub } = r;
  const at = a.indexOf("--save"); if (at >= 0) writeFileSync(a[at + 1], r.save);
  if (a.includes("--record")) { writeFileSync(GOLDEN, JSON.stringify({ note: "Recorded by tools/realm-run.mjs on the v10 page (the release: a new realm is generator 5, life by land): 20 expeditions, seed 7, generator 5, no mibis. Retaken once at the release; the digest moves only with the world.", ...pub }, null, 1) + "\n"); console.log("recorded", pub.digest); }
  else console.log(JSON.stringify(pub, null, 1));
}

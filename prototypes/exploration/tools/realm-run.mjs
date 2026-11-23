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
const STATE = `(() => { flushRipe(); const u = {}, s = S; for (const k of ["seed", "gen", "wid", "turn", "expN", "trips", "revealed", "visited", "called", "signs", "pins", "cells", "pods", "cr", "veil", "svy", "opened",
  "skulls", "lastStorm", "known", "found", "met", "firsts", "mibis", "carried", "lead", "tier", "shield", "deepRead", "bay", "hold", "exp", "report", "log", "hist", "totalActions", "walkTurn", "phase"]) if (s[k] !== undefined) u[k] = s[k];
  u.lastPos = s.ui && s.ui.lastPos; return JSON.parse(JSON.stringify(u)); })()`;

export function runBot({ seed = 7, gen = 7, expeditions = 20, mibis = 0, dock = 0, stopMid = false } = {}) {
  const p = makePage({ console: "silent", date: FIXED_DATE, gen });
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
    p.run("TEST.exploreHere()");   // a Call does not count a place explored, walking most of it does: the bot walks a few steps and Calls, so the place is counted walked here (it is what makes the walk turn the world)
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
    // Weather, then the first start offered: two presses from the expedition choice; after an empty walk the sealed screen's ✓ ("Back to the pod") opens the start pick at once, so one is left
    for (let g = 0; g < 2 && !S().exp; g++) key("confirm");
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

// ---- Pacing (walk slice C16, W§9; generator 7): a bot that walks places, takes what they show and measures the walk. Pure play through the page's keys, calm weather (no storm, no fog bank). ----
// A visit is one place: a Call on arrival, then the middle and each quarter of the place with a Call at each, taking every thing the screen offers (pods, charged and warm stones, dew, tufts, and a
// ✓ on each strike mark: the Data comes by a reading), then leaving. The next place is the nearest cell not yet entered, rings out from the start. After the last place it walks home along the
// cells it came by. An action is the page's own count (ex.actions): a Call, a step in a place or on the map, a ✓.
export function paceRun(seed, { places = 1, verbose = false, calm = true } = {}) {
  const p = newPage(seed, { calm }), w = makeWalker(p, { verbose, tag: "pace " + seed }), { key, phase, acts } = w;
  const visits = [];
  const takeAll = (v) => {
    const tried = new Set();
    for (let g = 0; g < 40 && phase() === "patch"; g++) {
      const it = w.items().find((i) => !tried.has(i.k + i.x + "," + i.y)); if (!it) break;
      tried.add(it.k + it.x + "," + it.y);
      if (!w.walk(it.x, it.y, false, 40)) continue;
      const before = w.itemCount(); key(w.facing(it.x, it.y)); key("confirm");
      if (p.S.ui && p.S.ui.swap) key("back");
      if (w.itemCount() < before) { v.taken++; if (it.k === "strike") v.readings++; }
    }
  };
  const visit = () => {
    if (p.run("!!RT.view")) key("confirm");   // a press ends the arrival look and is consumed: no action
    const arrive = acts(), v = { cell: p.run("layout(S.exp.patch.key).cell"), land: p.run("layout(S.exp.patch.key).name"), taken: 0, readings: 0, calls: 0, whole: null }, since = () => acts() - arrive;
    const lay = p.run("(() => { const l = layout(S.exp.patch.key); return { w: l.w, h: l.h }; })()");
    for (const [fx, fy] of [[.5, .5], [.25, .3], [.75, .3], [.25, .75], [.75, .75]]) {
      if (phase() !== "patch") break;
      w.walk(Math.round(lay.w * fx), Math.round(lay.h * fy), true, 40); key("call"); v.calls++; takeAll(v);
    }
    v.whole = since(); w.leave(); visits.push(v);
    if (verbose) console.log(`  [${seed}] cell ${v.cell} ${v.land}: whole ${v.whole}, taken ${v.taken}, readings ${v.readings}`);
  };
  key("confirm"); key("confirm");   // Weather, the first glint
  const start = p.S.exp.pos; let mapSteps = 0;
  key("confirm"); if (phase() === "patch") visit();   // the start cell's own place first
  for (let n = 1; n < places && phase() === "map"; n++) {
    const way = w.road(w.unvisited()); if (!way) break;
    const a = acts(); w.steps(way); mapSteps += acts() - a;
    key("confirm"); if (phase() !== "patch") break;
    visit();
  }
  if (phase() === "patch") w.leave();
  const a = acts(), home = w.wayHome(); if (home) w.steps(home); mapSteps += acts() - a;
  const fieldD = p.run("S.exp.dField || 0"), actD = p.run("S.exp.dAct || 0");
  return { seed, places: visits.length, total: acts(), mapSteps, home: p.S.exp.pos === start, cargo: w.cargo(), fieldD, actD, visits };
}
export const PACE_SEEDS = [7, 13, 42];

// ---- E6 (walk W1): the world turns by light spent, never by trips taken ----
// Over seeds, two bots spend the same light (LIGHT, five days) on the page's own advance / startExpedition / endExpedition: one makes camp after every find-sized trip (CAMP_EVERY actions, then End expedition at the
// flag), the other walks whole days (the night ends each). World turns per 1,000 light must agree within 5%. And a day spent on Wait alone gathers less than a day walked (first-trip-bot's walk over the whole reach), on every seed.
//   node tools/realm-run.mjs --e6 [--from 1] [--to 200]
export const E6 = { light: 1000, campEvery: 12, budgetMs: 150000, progressEvery: 100 };
// A seed is capped at a wall-clock budget (E6.budgetMs per bot, default 150 s): past it the bot stops and returns unfinished:true with its turns and light so far, and the run logs and counts it.
// Progress (seed, mode, light, turns, elapsed) goes to stderr every E6.progressEvery actions, so a long run shows it is alive.
const e6Log = line => { process.stderr.write(line + "\n"); };
export function e6Turns(seed, mode, { budgetMs = E6.budgetMs, log = e6Log } = {}) {
  const p = newPage(seed, { calm: true }), t0 = Date.now();
  const open = () => { if (!p.S.exp) p.run("startExpedition('weather', G.spawns[0])"); };
  const spend = () => { p.run("advance('map')"); p.pass(1200); };   // the night no longer ends the walk (it goes on into the next day)
  let sinceCamp = 0, n = 0;
  while (p.S.totalActions < E6.light) {
    open();
    spend(); sinceCamp++; n++;
    if (mode === "camp" && p.S.exp && sinceCamp >= E6.campEvery) { p.run("S.ui.lastPos = S.exp.pos; endExpedition('sent')"); sinceCamp = 0; }
    if (n % E6.progressEvery === 0) log(`  e6 seed ${seed} ${mode}: light ${p.S.totalActions}/${E6.light}, world turns ${p.S.turn}, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    if (Date.now() - t0 > budgetMs) return { turns: p.S.turn, light: p.S.totalActions, unfinished: true };
  }
  if (p.S.exp) p.run("endExpedition('sent')");
  return { turns: p.S.turn, light: p.S.totalActions };
}
export function e6WaitVsWalk(seed) {
  const p = newPage(seed, { calm: true });
  p.run("startExpedition('weather', G.spawns[0])");
  // a day of Waits alone: the day's light (DAY.light) ends it. The night no longer ends the walk (owner 11-22: an expedition ends only when the player says so), so the loop stops when the first night has passed
  // (ex.nights) instead of waiting for the walk to end, which it never does (it ran for ever: e6-overnight-1); a cap on the loop is a second guard
  for (let i = 0; p.S.exp && !(p.S.exp.nights >= 1) && i < 2000; i++) { p.run("waitTick('map')"); p.pass(1200); }
  const r = p.S.report, c = (r && r.sealed) || (p.S.exp && p.S.exp.cargo), waited = c ? (c.pods ? c.pods.length : 0) + c.e + c.d + c.s : 0;
  return { waited, light: p.S.totalActions, turn: p.S.turn };
}

const GOLDEN = new URL("../tests/realm-run.golden.json", import.meta.url);
export const RUN = { seed: 7, gen: 7, expeditions: 20, mibis: 0, dock: 0 };   // the golden run

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  const a = process.argv.slice(2), arg = (k, d) => { const i = a.indexOf("--" + k); return i < 0 ? d : +a[i + 1]; };
  const opts = { seed: arg("seed", RUN.seed), gen: arg("gen", RUN.gen), expeditions: arg("exp", RUN.expeditions), mibis: arg("mibis", 0), dock: arg("dock", 0), stopMid: a.includes("--stop-mid") };
  if (a.includes("--e6")) {
    const { firstTrip } = await import("./first-trip-bot.mjs");
    const from = arg("from", 1), to = arg("to", 200); let tc = 0, tw = 0, lc = 0, lw = 0, worstDev = 0, bad = [], unfinished = [];
    for (let s = from; s <= to; s++) {
      const c = e6Turns(s, "camp"), d = e6Turns(s, "day");
      if (c.unfinished || d.unfinished) { const row = `seed ${s}: unfinished (camp ${c.turns} turns / ${c.light} light${c.unfinished ? " cut" : ""}, day ${d.turns} / ${d.light}${d.unfinished ? " cut" : ""}): wall-clock budget ${E6.budgetMs / 1000} s`; unfinished.push(row); console.log(row); continue; }
      tc += c.turns; tw += d.turns; lc += c.light; lw += d.light;
      const rc = c.turns / c.light * 1000, rd = d.turns / d.light * 1000, dev = Math.abs(rc - rd) / Math.max(rc, rd, 1e-9); worstDev = Math.max(worstDev, dev);
      const wv = e6WaitVsWalk(s), wk = firstTrip(s, { calm: true, all: true, budget: 200, oneDay: true }), walked = wk.gathered || 0;
      if (!(wv.waited < walked)) bad.push(`seed ${s}: waited ${wv.waited}, walked ${walked}`);
      console.log(`seed ${s}: camp ${c.turns} turns / ${c.light} light, day ${d.turns} / ${d.light}, dev ${(dev * 100).toFixed(1)}%; wait-only ${wv.waited}, walked ${walked}`);
    }
    const rc = tc / lc * 1000, rd = tw / lw * 1000;
    console.log(`E6 unfinished seeds: ${unfinished.length} of ${to - from + 1}`);
    console.log(`E6 seeds ${from}-${to}:camp bot ${rc.toFixed(3)} world turns per 1,000 light, whole-day bot ${rd.toFixed(3)}, difference ${(Math.abs(rc - rd) / Math.max(rc, rd) * 100).toFixed(2)}% (worst seed ${(worstDev * 100).toFixed(1)}%); wait-only below walked on every seed: ${bad.length === 0}`);
    for (const b of bad) console.log("  FAIL " + b);
    process.exit(bad.length || Math.abs(rc - rd) / Math.max(rc, rd) > 0.05 ? 1 : 0);
  }
  if (a.includes("--pace")) {   // node tools/realm-run.mjs --pace [--seeds 7,13,42] [--verbose]: the 3-minute shape (one place and home) and the 15-minute shape (four places and home)
    const si = a.indexOf("--seeds"), seeds = si < 0 ? PACE_SEEDS : a[si + 1].split(",").map(Number), verbose = a.includes("--verbose");
    for (const seed of seeds) for (const [name, places] of [["3-minute", 1], ["15-minute", 4]]) {
      const r = paceRun(seed, { places, verbose, calm: !a.includes("--storm") }), f = (k) => r.visits.map((v) => v[k]).join("/");
      console.log(`seed ${seed} ${name}: ${r.total} actions (${r.mapSteps} on the map), ${r.places} places, home ${r.home}; carries ${r.cargo.e}E ${r.cargo.d}D (${r.fieldD} from strikes, ${r.actD} from creatures) ${r.cargo.s}S ${r.cargo.pods}p; whole place ${f("whole")}; readings ${f("readings")}, taken ${f("taken")}; cells ${f("cell")}`);
    }
    process.exit(0);
  }
  const r = runBot(opts);
  const { save, page, ...pub } = r;
  const at = a.indexOf("--save"); if (at >= 0) writeFileSync(a[at + 1], r.save);
  if (a.includes("--record")) { writeFileSync(GOLDEN, JSON.stringify({ note: "Recorded by tools/realm-run.mjs on the v10 page (the release: a new realm is generator 5, life by land): 20 expeditions, seed 7, generator 5, no mibis. Retaken once at the release; the digest moves only with the world.", ...pub }, null, 1) + "\n"); console.log("recorded", pub.digest); }
  else console.log(JSON.stringify(pub, null, 1));
}

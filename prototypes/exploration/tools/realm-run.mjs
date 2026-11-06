// A fixed-policy bot that plays whole expeditions on the Companion page, in the test sandbox, and gives a digest of the realm it leaves behind.
// It is the golden run of the realm work: recorded on the v8 page, and the
// v9 page with one region must give the same digest. The page is played only through its keys (page-harness.mjs), the Date stands still, and
// every choice comes from the bot's own generator, so one (seed, generator, expeditions) gives one digest, byte for byte.
//   node prototypes/exploration/tools/realm-run.mjs [--seed 7] [--gen 3] [--exp 20] [--mibis 0] [--dock 0] [--stop-mid] [--save out.json] [--record]
//   --mibis n    n grown mibis ride with the Companion from the start (the Station hands them over)
//   --dock n     the Companion docks at the Station before every n-th expedition (the crates are opened, then it is lifted); it also docks whenever the Probe is broken
//   --stop-mid   stop expedition --exp after its walk out, still on the map, and keep that save (the save of an expedition under way)
//   --save f     writes the page's save (the bytes it stored) to f
//   --record     rewrites tests/realm-run.golden.json
import { writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { makePage } from "../tests/page-harness.mjs";
import { freshSt, dockKey, openBay, DEFAULT_SETTINGS } from "../../station/src/state.mjs";

export const FIXED_DATE = Date.UTC(2026, 10, 3, 9, 0, 0);   // 3 Nov 2026, 09:00 UTC: the page's clock for every run
const DIRS = ["up", "right", "down", "left"];

// canonical text of a value: keys sorted, so the digest does not depend on the order a page builds its objects in
export const canon = v => v === null || typeof v !== "object" ? JSON.stringify(v === undefined ? null : v)
  : Array.isArray(v) ? "[" + v.map(canon).join(",") + "]" : "{" + Object.keys(v).sort().map(k => JSON.stringify(k) + ":" + canon(v[k])).join(",") + "}";
export const sha = s => createHash("sha256").update(s).digest("hex");

// the state the digest covers: the realm as the page holds it (S), whichever way the page stores it
const STATE = `(() => { const u = {}, s = S; for (const k of ["seed", "gen", "wid", "turn", "expN", "trips", "revealed", "visited", "called", "signs", "pins", "cells", "pods", "cr", "veil", "svy", "opened",
  "skulls", "lastStorm", "known", "found", "met", "firsts", "mibis", "carried", "lead", "tier", "shield", "deepRead", "bay", "hold", "exp", "report", "log", "hist", "totalActions", "walkTurn", "phase"]) if (s[k] !== undefined) u[k] = s[k];
  u.lastPos = s.ui && s.ui.lastPos; return JSON.parse(JSON.stringify(u)); })()`;

export function runBot({ seed = 7, gen = 3, expeditions = 20, mibis = 0, dock = 0, stopMid = false } = {}) {
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

const GOLDEN = new URL("../tests/realm-run.golden.json", import.meta.url);
export const RUN = { seed: 7, gen: 3, expeditions: 20, mibis: 0, dock: 0 };   // the golden run

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  const a = process.argv.slice(2), arg = (k, d) => { const i = a.indexOf("--" + k); return i < 0 ? d : +a[i + 1]; };
  const opts = { seed: arg("seed", RUN.seed), gen: arg("gen", RUN.gen), expeditions: arg("exp", RUN.expeditions), mibis: arg("mibis", 0), dock: arg("dock", 0), stopMid: a.includes("--stop-mid") };
  const r = runBot(opts);
  const { save, page, ...pub } = r;
  const at = a.indexOf("--save"); if (at >= 0) writeFileSync(a[at + 1], r.save);
  if (a.includes("--record")) { writeFileSync(GOLDEN, JSON.stringify({ note: "Recorded on the v8 page by tools/realm-run.mjs: 20 expeditions, seed 7, generator 3, no mibis. The v9 page with one region must give the same digest.", ...pub }, null, 1) + "\n"); console.log("recorded", pub.digest); }
  else console.log(JSON.stringify(pub, null, 1));
}

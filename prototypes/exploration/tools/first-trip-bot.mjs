// The first-trip bot (loop audit 3.18, walk slice C16): a fresh save, generator 6, the first walk of a new world, played through the page's keys only.
// It plays like a player who follows what the screen offers: pick the first glint, go into the place, Call, walk to the tell (the heart), take the pods the Call shows,
// leave, step to the nearest cell whose heart is not found, and repeat. It stops when the Probe holds a pod and the Data the Station asks first, then walks home and ends the walk.
// What the Station asks first (station/src/state.mjs PRICE): to identify the pod 1 Data, to read its first trait 1 Data; the Probe's tier 2 (12 Energy + 4 Data) is a later goal.
//   node prototypes/exploration/tools/first-trip-bot.mjs [--from 1] [--to 200] [--calm] [--verbose]
import { makePage } from "../tests/page-harness.mjs";
import { FIXED_DATE } from "./realm-run.mjs";

export const NEXT_DATA = 2;     // Data held at the end of the first walk: identify the pod (1) and read one trait (1)
export const BUDGET = 400;      // actions of the first walk before the bot gives up looking (the 15-minute walk of W§9 is 500-650)
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

// The first step of a shortest walk to a tile beside (x, y) (or onto it when `onto`), creatures and things in the way; null when boxed in or there.
const NEXT_STEP = `(x, y, onto) => { const P = S.exp.patch, lay = layout(P.key), D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }, seen = new Map([[P.y * lay.w + P.x, null]]), q = [[P.x, P.y]];
  const done = (X, Y) => onto ? X === x && Y === y : Math.abs(X - x) + Math.abs(Y - y) === 1;
  if (done(P.x, P.y)) return 'here';
  while (q.length) { const [cx, cy] = q.shift();
    for (const [dir, [dx, dy]] of Object.entries(D)) { const X = cx + dx, Y = cy + dy, i = Y * lay.w + X;
      if (X < 0 || Y < 0 || X >= lay.w || Y >= lay.h || seen.has(i) || occupant(P.key, X, Y, 'player')) continue;
      seen.set(i, [cy * lay.w + cx, dir]); if (done(X, Y)) { let j = i, st = null; while (seen.get(j)) { st = seen.get(j)[1]; j = seen.get(j)[0]; } return st; } q.push([X, Y]); } }
  return null; }`;

export function firstTrip(seed, { calm = false, verbose = false, budget = BUDGET } = {}) {
  const p = makePage({ console: "silent", date: FIXED_DATE, gen: 6 });
  p.run(`newWorld(${seed}); ${calm ? "TEST.calm = true;" : ""}`);
  const S = () => p.S, phase = () => p.S.phase, acts = () => (p.S.exp ? p.S.exp.actions : 0);
  const next = p.run("(" + NEXT_STEP + ")");
  const log = []; const say = (m) => { if (verbose) console.log(`  [${seed}] a${acts()} ${m}`); log.push(m); };
  let presses = 0;
  const key = (k) => { if (++presses > 6000) throw new Error("runaway: phase " + phase()); p.key(k); };
  const cargo = () => p.run("({ e: S.exp.cargo.e, d: S.exp.cargo.d, s: S.exp.cargo.s, pods: S.exp.cargo.pods.length })");
  const enough = () => { const c = cargo(); return c.pods >= 1 && c.d >= NEXT_DATA; };
  const out = { seed, ok: false, why: "", actions: 0, places: 0, hearts: 0, pods: 0, data: 0, energy: 0, firstPodAt: null, firstDataAt: null };

  // Walk in the open place toward a tile (beside it, or onto it); stops after n steps, when there, or when boxed in.
  const walk = (x, y, onto, n = 80) => {
    for (let i = 0; i < n && phase() === "patch"; i++) {
      const st = next(x, y, onto); if (st === "here") return true; if (!st) return false;
      key(st); if (budgetGone()) return false;
    }
    return false;
  };
  const budgetGone = () => acts() >= budget;
  // Face a pod and dig it up.
  const takePodAt = (id) => {
    for (let n = 0; n < 6 && phase() === "patch"; n++) {
      const pod = p.S.pods.find((q) => q.id === id); if (!pod) return true;
      if (!walk(pod.x, pod.y, false)) return false;
      const P = p.S.exp.patch, dir = Object.keys(DIRS).find((d) => P.x + DIRS[d][0] === pod.x && P.y + DIRS[d][1] === pod.y);
      key(dir); key("confirm");
      if (p.S.exp.cargo.pods.some((q) => q.id === id)) { say("took pod " + id); return true; }
      if (p.S.ui && p.S.ui.swap) { key("back"); return false; }   // a full bag: not on the first walk
    }
    return false;
  };
  // The pods this place shows (announced, lying in the open), nearest first.
  const shownPods = () => p.run(`(() => { const P = S.exp.patch, out = []; for (const q of S.pods) if (q.k === P.key && q.x >= 0 && !q.h) out.push({ id: q.id, d: Math.abs(q.x - P.x) + Math.abs(q.y - P.y) }); return out.sort((a, b) => a.d - b.d); })()`);
  const hiddenPods = () => p.run(`S.pods.filter(q => q.k === S.exp.patch.key && q.x >= 0 && q.h).length`);
  const heartInfo = () => p.run(`(() => { const P = S.exp.patch, h = heartOf(P.key), lay = layout(P.key); return h ? { x: h.x, y: h.y, kind: h.kind, found: heartFound(lay.cell) } : null; })()`);
  const room = () => { const c = p.run("S.exp.hold - S.exp.cargo.pods.length"); return c > 0; };

  // One place: Call, walk to the tell, take what the Call shows, Call again at the heart, then leave.
  const inPlace = () => {
    out.places++;
    key("call");
    // what the Call showed first, then the walk to the tell; a second Call where the heart was found (the reveal lists what is left); what is shown is taken
    for (const q of shownPods()) { if (!room()) break; takePodAt(q.id); }
    let h = heartInfo();
    if (h && phase() === "patch" && !budgetGone()) walk(h.x, h.y, false, 40);   // to the heart, found already or not: the Call there reaches what lies around it
    if (phase() === "patch" && !budgetGone()) key("call");
    for (const q of shownPods()) { if (!room()) break; takePodAt(q.id); }
    if (phase() === "patch") p.run("leavePatch()");
  };

  // Map: the cell with an unfound heart nearest the start (rings out from it, a walker stays near home), then the shortest way there by the page's own canStep; not this cell.
  const road = (goal) => p.run(`(() => { const from = S.exp.pos, start = S.exp.start, goal = ${JSON.stringify(goal)}, seen = new Map([[from, null]]), dist = new Map([[from, 0]]), q = [from];
    for (let i = 0; i < q.length; i++) { const c = q[i];
      for (const d of ['up', 'right', 'down', 'left']) { if (!canStep(c, d) || !inRange(stepCell(c, d))) continue; const t = stepCell(c, d); if (t < 0 || seen.has(t)) continue; seen.set(t, [c, d]); dist.set(t, dist.get(c) + 1); q.push(t); } }
    const cand = goal.filter(c => c !== from && seen.has(c)).sort((a, b) => cdist(a, start) - cdist(b, start) || dist.get(a) - dist.get(b) || a - b)[0];
    if (cand === undefined) return null;
    const out = []; for (let k = cand; seen.get(k); k = seen.get(k)[0]) out.unshift(seen.get(k)[1]); return out; })()`);
  const unfound = () => p.run(`(() => { const out = []; for (let c = 0; c < MW * MH; c++) if (G.comp[c] && G.land[c] !== L.WATER && passable(c) && !G.island[c] && !heartFound(c) && c !== G.gate) out.push(c); return out; })()`);

  // ---- the walk ----
  key("confirm"); key("confirm");   // Weather, then the first glint offered
  if (!p.S.exp) { out.why = "no walk started"; return out; }
  const start = p.S.exp.pos;
  say("start cell " + start);
  let enteredHere = false;
  for (let guard = 0; guard < 60 && !budgetGone() && !enough(); guard++) {
    if (phase() === "map") {
      if (!enteredHere) { enteredHere = true; key("confirm"); if (phase() === "patch") { say("in place " + p.S.exp.pos); inPlace(); continue; } }
      const way = road(unfound()); if (!way) { out.why = "no cell with an unfound heart in reach"; break; }
      for (const d of way) { if (phase() !== "map" || budgetGone()) break; key(d); }
      if (phase() === "map") { key("confirm"); if (phase() === "patch") { say("in place " + p.S.exp.pos); inPlace(); } }
    } else if (phase() === "patch") { inPlace(); }
    else { key("back"); }
    const c = cargo(); if (out.firstPodAt == null && c.pods) out.firstPodAt = acts(); if (out.firstDataAt == null && c.d >= NEXT_DATA) out.firstDataAt = acts();
  }
  const c = cargo(); out.pods = c.pods; out.data = c.d; out.energy = c.e; out.actions = acts(); out.hearts = p.run("S.exp.stats.hearts || 0");
  out.ok = c.pods >= 1 && c.d >= NEXT_DATA;
  if (!out.ok && !out.why) out.why = c.pods < 1 ? (c.d < NEXT_DATA ? "no pod, " + c.d + " Data" : "no pod") : "only " + c.d + " Data";
  out.log = log; Object.defineProperty(out, "page", { value: p, enumerable: false });
  return out;
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  const a = process.argv.slice(2), arg = (k, d) => { const i = a.indexOf("--" + k); return i < 0 ? d : +a[i + 1]; };
  const from = arg("from", 1), to = arg("to", 200), calm = a.includes("--calm"), verbose = a.includes("--verbose");
  const rows = []; for (let s = from; s <= to; s++) rows.push(firstTrip(s, { calm, verbose }));
  const ok = rows.filter((r) => r.ok), bad = rows.filter((r) => !r.ok);
  const med = (k) => { const v = ok.map((r) => r[k]).filter((x) => x != null).sort((x, y) => x - y); return v.length ? v[v.length >> 1] : null; };
  for (const r of bad) console.log(`seed ${r.seed}: ${r.why} (actions ${r.actions}, places ${r.places}, hearts ${r.hearts}, pods ${r.pods}, data ${r.data})`);
  console.log(`first trip, seeds ${from}-${to}${calm ? " (calm)" : ""}: ${ok.length} of ${rows.length} found a pod and ${NEXT_DATA} Data; actions to the first pod: median ${med("firstPodAt")}, to the Data: median ${med("firstDataAt")}, in all: median ${med("actions")}, max ${Math.max(...ok.map((r) => r.actions), 0)}`);
  const pct = (k, q) => { const v = rows.map((r) => r[k]).sort((x, y) => x - y); return v[Math.min(v.length - 1, Math.floor(v.length * q))]; };
  console.log(`actions in all: p90 ${pct("actions", .9)}; walks over 130 actions (the 3-minute shape of W§9): ${rows.filter((r) => r.actions > 130).length}; places entered: median ${med("places")}; Data held: median ${med("data")}, Energy held: median ${med("energy")}, pods held: median ${med("pods")}`);
}

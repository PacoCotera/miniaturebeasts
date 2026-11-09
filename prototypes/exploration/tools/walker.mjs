// The walker: the moves of the bots that play the Companion page through its keys (first-trip-bot.mjs, realm-run.mjs's pacing mode).
// It plays like a player who follows what the screen offers: Call, walk to the tell (the heart), take what is shown, step to the cell whose heart is not found, go home.
import { makePage } from "../tests/page-harness.mjs";

export const FIXED_DATE = Date.UTC(2026, 10, 3, 9, 0, 0);   // 3 Nov 2026, 09:00 UTC: the page's clock for every run
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

// The first step of a shortest walk to a tile beside (x, y) (or onto it when `onto`), creatures and things in the way; 'here' when there, null when boxed in.
const NEXT_STEP = `(x, y, onto) => { const P = S.exp.patch, lay = layout(P.key), D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }, seen = new Map([[P.y * lay.w + P.x, null]]), q = [[P.x, P.y]];
  const done = (X, Y) => onto ? X === x && Y === y : Math.abs(X - x) + Math.abs(Y - y) === 1;
  if (done(P.x, P.y)) return 'here';
  while (q.length) { const [cx, cy] = q.shift();
    for (const [dir, [dx, dy]] of Object.entries(D)) { const X = cx + dx, Y = cy + dy, i = Y * lay.w + X;
      if (X < 0 || Y < 0 || X >= lay.w || Y >= lay.h || seen.has(i) || occupant(P.key, X, Y, 'player')) continue;
      seen.set(i, [cy * lay.w + cx, dir]); if (done(X, Y)) { let j = i, st = null; while (seen.get(j)) { st = seen.get(j)[1]; j = seen.get(j)[0]; } return st; } q.push([X, Y]); } }
  return null; }`;

// A fresh page at generator 6 (or `gen`), a new world of `seed`.
export function newPage(seed, { gen = 6, calm = false } = {}) {
  const p = makePage({ console: "silent", date: FIXED_DATE, gen });
  p.run(`newWorld(${seed}); ${calm ? "TEST.calm = true;" : ""}`);
  return p;
}

export function makeWalker(p, { budget = 1e9, verbose = false, tag = "" } = {}) {
  const phase = () => p.S.phase, acts = () => (p.S.exp ? p.S.exp.actions : 0), next = p.run("(" + NEXT_STEP + ")");
  const log = [], say = (m) => { if (verbose) console.log(`  [${tag}] a${acts()} ${m}`); log.push(m); };
  let presses = 0;
  const key = (k) => { if (++presses > 20000) throw new Error("runaway: phase " + phase()); p.key(k); };
  const budgetGone = () => acts() >= budget;
  const cargo = () => p.run("(S.exp ? { e: S.exp.cargo.e, d: S.exp.cargo.d, s: S.exp.cargo.s, pods: S.exp.cargo.pods.length, hold: S.exp.hold } : { e: 0, d: 0, s: 0, pods: 0, hold: 0 })");
  const room = () => !!p.run("S.exp") && p.run("S.exp.hold - S.exp.cargo.pods.length") > 0;

  // in the open place: toward a tile (beside it, or onto it); stops after n steps, when there, or when boxed in
  const walk = (x, y, onto, n = 80) => {
    for (let i = 0; i < n && phase() === "patch"; i++) {
      const st = next(x, y, onto); if (st === "here") return true; if (!st) return false;
      key(st); if (budgetGone()) return false;
    }
    return false;
  };
  const facing = (x, y) => { const P = p.S.exp.patch; return Object.keys(DIRS).find((d) => P.x + DIRS[d][0] === x && P.y + DIRS[d][1] === y); };
  // the pods this place shows (announced, lying in the open), nearest first
  const shownPods = () => p.run(`(() => { const P = S.exp && S.exp.patch, out = []; if (!P) return out; for (const q of S.pods) if (q.k === P.key && q.x >= 0 && !q.h) out.push({ id: q.id, d: Math.abs(q.x - P.x) + Math.abs(q.y - P.y) }); return out.sort((a, b) => a.d - b.d); })()`);
  // Face a pod and dig it up; false when it cannot be (boxed in, or a full bag: the choice is not made here).
  const takePodAt = (id) => {
    for (let n = 0; n < 6 && phase() === "patch"; n++) {
      const pod = p.S.pods.find((q) => q.id === id); if (!pod) return true; if (!p.S.exp) return false;
      if (!walk(pod.x, pod.y, false)) return false;
      key(facing(pod.x, pod.y)); key("confirm");
      if (p.S.exp.cargo.pods.some((q) => q.id === id)) { say("took pod " + id); return true; }
      if (p.S.ui && p.S.ui.swap) { key("back"); return false; }
    }
    return false;
  };
  const takeShownPods = () => { for (const q of shownPods()) { if (!room()) break; takePodAt(q.id); } };
  const heartInfo = () => p.run(`(() => { const P = S.exp.patch, h = heartOf(P.key), lay = layout(P.key); return h ? { x: h.x, y: h.y, kind: h.kind, found: heartFound(lay.cell), cell: lay.cell, path: h.path.length } : null; })()`);
  // everything the place still offers that the screen shows (the page's own leftItems), nearest first
  const items = () => p.run(`(() => { const P = S.exp.patch, c = layout(P.key).cell; return leftItems(c).filter(i => !i.cave).map(i => ({ k: i.k, x: i.x, y: i.y, d: Math.abs(i.x - P.x) + Math.abs(i.y - P.y) })).sort((a, b) => a.d - b.d); })()`);
  const itemCount = () => p.run(`leftTotal(layout(S.exp.patch.key).cell)`);

  // leave the place for the map
  const leave = () => { if (phase() === "patch") p.run("leavePatch()"); };

  // map: the cell with an unfound heart nearest the start (rings out from it), then the shortest way there by the page's own canStep; null when none is in reach
  const road = (goal) => p.run(`(() => { const from = S.exp.pos, start = S.exp.start, goal = ${JSON.stringify(goal)}, seen = new Map([[from, null]]), dist = new Map([[from, 0]]), q = [from];
    for (let i = 0; i < q.length; i++) { const c = q[i];
      for (const d of ['up', 'right', 'down', 'left']) { if (!canStep(c, d) || !inRange(stepCell(c, d))) continue; const t = stepCell(c, d); if (t < 0 || seen.has(t)) continue; seen.set(t, [c, d]); dist.set(t, dist.get(c) + 1); q.push(t); } }
    const cand = goal.filter(c => c !== from && seen.has(c)).sort((a, b) => cdist(a, start) - cdist(b, start) || dist.get(a) - dist.get(b) || a - b)[0];
    if (cand === undefined) return null;
    const out = []; for (let k = cand; seen.get(k); k = seen.get(k)[0]) out.unshift(seen.get(k)[1]); return out; })()`);
  const unfound = () => p.run(`(() => { const out = []; for (let c = 0; c < MW * MH; c++) if (G.comp[c] && G.land[c] !== L.WATER && passable(c) && !G.island[c] && !heartFound(c) && c !== G.gate) out.push(c); return out; })()`);
  // the way back to the start along cells already visited (the page's rule for a step)
  const wayHome = () => p.run(`(() => { const goal = S.exp.start, from = S.exp.pos, seen = new Map([[from, null]]), q = [from];
    for (let i = 0; i < q.length; i++) { const c = q[i]; if (c === goal) break;
      for (const d of ['up', 'right', 'down', 'left']) { if (!canStep(c, d)) continue; const t = stepCell(c, d); if (t < 0 || seen.has(t) || !(S.visited[t] || t === goal)) continue; seen.set(t, [c, d]); q.push(t); } }
    if (!seen.has(goal)) return null; const out = []; for (let k = goal; seen.get(k); k = seen.get(k)[0]) out.unshift(seen.get(k)[1]); return out; })()`);
  // walk the map along a list of steps; false if the phase changed or the budget ran out
  const steps = (way) => { for (const d of way) { if (phase() !== "map" || budgetGone()) return false; key(d); } return true; };

  return { p, key, phase, acts, cargo, room, walk, facing, shownPods, takePodAt, takeShownPods, heartInfo, items, itemCount, leave, road, unfound, wayHome, steps, budgetGone, say, log };
}

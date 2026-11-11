// The first-trip bot (loop audit 3.18, walk slice C16): a fresh save, generator 7, the first walk of a new world, played through the page's keys only (walker.mjs).
// It plays like a player who follows what the screen offers: pick the first glint, go into the place, Call, take what the Call shows (the pods, the stones, and a ✓ on each strike mark: the Data comes
// by a reading), leave, step to the nearest cell it has not been into, and repeat. It stops when the Probe holds a pod and the Data the Station asks first.
// What the Station asks first (station/src/state.mjs PRICE): to identify the pod 1 Data, to read its first trait 1 Data; the Probe's tier 2 (12 Energy + 4 Data) is a later goal.
//   node prototypes/exploration/tools/first-trip-bot.mjs [--from 1] [--to 200] [--calm] [--verbose]
import { newPage, makeWalker } from "./walker.mjs";

export const NEXT_DATA = 2;     // Data held at the end of the first walk: identify the pod (1) and read one trait (1)
export const BUDGET = 900;      // actions of the first walk before the bot gives up looking: it goes into the start and its eight neighbours properly (about 90 actions a place) and then the rest of the reach

export function firstTrip(seed, { calm = false, verbose = false, budget = BUDGET } = {}) {
  const p = newPage(seed, { calm }), w = makeWalker(p, { budget, verbose, tag: String(seed) }), { key, phase, acts, cargo } = w;
  const enough = () => { const c = cargo(); return c.pods >= 1 && c.d >= NEXT_DATA; };
  const out = { seed, ok: false, why: "", actions: 0, places: 0, readings: 0, pods: 0, data: 0, energy: 0, firstPodAt: null, firstDataAt: null };

  // One place: Call, take what it shows (pods, stones, strike marks: a press on each), and leave. A place is gone into properly (a Call at its four quarters and its middle) or quickly (the way in and the
  // middle). The first walk goes into the start and the cells round it properly (the pods lie in reach, the first strike mark within one cell), then into the rest of the reach quickly, then back for the rest properly.
  const QUICK = [[.5, .5]], THOROUGH = [[.25, .25], [.75, .25], [.25, .75], [.75, .75], [.5, .5]];
  const inPlace = (thorough = false) => {
    out.places++; w.say("in place " + p.S.exp.pos + (thorough ? " (properly)" : ""));
    key("call"); w.takeShownPods(); takeReadings();
    for (const [fx, fy] of thorough ? THOROUGH : QUICK) { if (enough() || phase() !== "patch" || w.budgetGone()) break; if (!walkTo(fx, fy)) continue; key("call"); w.takeShownPods(); takeReadings(); }
    // A properly-visited place with no pod held yet: Call on over a lattice a Call's reach apart (7 tiles round, so 8 apart) until a pod shows, the stop nearest first.
    if (thorough && cargo().pods < 1 && phase() === "patch") {
      const lay = p.run("(() => { const l = layout(S.exp.patch.key); return { w: l.w, h: l.h }; })()"), left = [];
      for (let y = 3; y < lay.h; y += 8) for (let x = 3; x < lay.w; x += 8) left.push([x, Math.min(y, lay.h - 3)]);
      if (lay.w - 1 - left[left.length - 1][0] > 3) for (let y = 3; y < lay.h; y += 8) left.push([lay.w - 3, Math.min(y, lay.h - 3)]);
      while (left.length && phase() === "patch" && cargo().pods < 1 && !w.budgetGone()) {
        const q = p.S.exp.patch; left.sort((a, b) => Math.hypot(a[0] - q.x, a[1] - q.y) - Math.hypot(b[0] - q.x, b[1] - q.y));
        const [x, y] = left.shift(); w.walkNear(x, y, 40); if (phase() !== "patch") break; key("call"); w.takeShownPods(); takeReadings();
      }
    }
    w.leave();
  };
  // every strike mark the Call shows, nearest first: walk beside it, face it, press ✓
  const takeReadings = () => {
    for (let g = 0; g < 8 && phase() === "patch" && !w.budgetGone(); g++) {
      const m = w.items().find((i) => i.k === "strike"); if (!m) break;
      if (!w.walk(m.x, m.y, false, 60)) break;
      const before = cargo().d; key(w.facing(m.x, m.y)); key("confirm");
      if (cargo().d > before) { out.readings++; w.say("read a strike mark"); } else break;
    }
  };
  // a few steps toward a point of the place (fractions of its width and height), to see more of it
  const walkTo = (fx, fy) => { const lay = p.run("(() => { const l = layout(S.exp.patch.key); return { w: l.w, h: l.h }; })()"); return w.walkNear(Math.round(lay.w * fx), Math.round(lay.h * fy), 40) || phase() === "patch"; };   // the open tile nearest the aim: the aim itself may be a tree, a stone or a mark

  key("confirm"); key("confirm");   // Weather, then the first glint offered
  if (!p.S.exp) { out.why = "no walk started"; return out; }
  w.say("start cell " + p.S.exp.pos);
  // A cell crossed on the map is "visited" to the page but not gone into: the bot keeps its own lists of the places it has been into, and into properly.
  const entered = new Set(), proper = new Set(), cellsInReach = () => p.run("(() => S.exp.reach.filter(c => G.comp[c] && G.land[c] !== L.WATER && passable(c) && !G.island[c]))()");   // the cave-gate cell too: its ground is walked like any other (only the cave under it is gated)
  const near = (() => { const s = p.run("cxy(S.exp.start)"); return (c) => { const q = p.run(`cxy(${c})`); return Math.max(Math.abs(q.x - s.x), Math.abs(q.y - s.y)) <= 1; }; })();
  const STAGES = [(c) => near(c) && !proper.has(c), (c) => !entered.has(c), (c) => !proper.has(c)];   // the start and its neighbours properly; every cell in reach quickly; every cell properly
  let stage = 0;
  const went = () => { const thorough = stage !== 1; entered.add(p.S.exp.pos); if (thorough) proper.add(p.S.exp.pos); inPlace(thorough); };
  key("confirm"); if (phase() === "patch") went();   // the start cell's own place first
  for (let guard = 0; guard < 80 && !w.budgetGone() && !enough(); guard++) {
    if (phase() === "map") {
      let way = null, goal = [];
      while (stage < STAGES.length) { goal = cellsInReach().filter(STAGES[stage]); way = goal.length ? w.road(goal) : null; if (way) break; stage++; }
      if (!way) { out.why = "no cell left to go into in reach"; break; }
      w.steps(way);
      if (phase() === "map") { key("confirm"); if (phase() === "patch") went(); }
    } else if (phase() === "patch") went();
    else key("back");
    const c = cargo(); if (out.firstPodAt == null && c.pods) out.firstPodAt = acts(); if (out.firstDataAt == null && c.d >= NEXT_DATA) out.firstDataAt = acts();
  }
  if (!p.S.exp) { out.sealed = true; out.why = "sealed before the walk was done (the Probe's shield ran out)"; return out; }
  const c = cargo(); out.pods = c.pods; out.data = c.d; out.energy = c.e; out.actions = acts();
  out.ok = c.pods >= 1 && c.d >= NEXT_DATA;
  if (!out.ok && !out.why) out.why = c.pods < 1 ? (c.d < NEXT_DATA ? "no pod, " + c.d + " Data" : "no pod") : "only " + c.d + " Data";
  out.log = w.log; Object.defineProperty(out, "page", { value: p, enumerable: false });
  return out;
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  const a = process.argv.slice(2), arg = (k, d) => { const i = a.indexOf("--" + k); return i < 0 ? d : +a[i + 1]; };
  const from = arg("from", 1), to = arg("to", 200), calm = a.includes("--calm"), verbose = a.includes("--verbose");
  const rows = []; for (let s = from; s <= to; s++) rows.push(firstTrip(s, { calm, verbose }));
  const ok = rows.filter((r) => r.ok), bad = rows.filter((r) => !r.ok);
  const med = (k) => { const v = ok.map((r) => r[k]).filter((x) => x != null).sort((x, y) => x - y); return v.length ? v[v.length >> 1] : null; };
  for (const r of bad) console.log(`seed ${r.seed}: ${r.why} (actions ${r.actions}, places ${r.places}, readings ${r.readings}, pods ${r.pods}, data ${r.data})`);
  console.log(`first trip, seeds ${from}-${to}${calm ? " (calm)" : ""}: ${ok.length} of ${rows.length} found a pod and ${NEXT_DATA} Data; actions to the first pod: median ${med("firstPodAt")}, to the Data: median ${med("firstDataAt")}, in all: median ${med("actions")}, max ${Math.max(...ok.map((r) => r.actions), 0)}`);
  if (bad.length) process.exitCode = 1;   // a trip that found no pod and the Data fails the run (the release check plays one)
  const pct = (k, q) => { const v = rows.map((r) => r[k]).sort((x, y) => x - y); return v[Math.min(v.length - 1, Math.floor(v.length * q))]; };
  console.log(`actions in all: p90 ${pct("actions", .9)}; walks over 130 actions (the 3-minute shape of W§9): ${rows.filter((r) => r.actions > 130).length}; places entered: median ${med("places")}; readings: median ${med("readings")}; Data held: median ${med("data")}, Energy held: median ${med("energy")}, pods held: median ${med("pods")}`);
}

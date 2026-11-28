// The first-trip bot (loop audit 3.18, walk slice C16): a fresh save, generator 7, the first walk of a new world, played through the page's keys only (walker.mjs).
// It plays like a player who follows what the screen offers: pick the first glint, go into the place, Call, take what the Call shows (the pods, the stones, and a ✓ on each strike mark: the Data comes
// by a reading), leave, step to the nearest cell it has not been into, and repeat. It stops when the Probe holds the Data and Energy the Station asks first (W5: no anonymous pod).
// What the Station asks first (station/src/state.mjs PRICE): to identify the pod 1 Data, to read its first trait 1 Data; the Probe's tier 2 (12 Energy + 4 Data) is a later goal.
//   node prototypes/exploration/tools/first-trip-bot.mjs [--from 1] [--to 200] [--calm] [--verbose] [--end]
// --end: after the trip, walk home and End the expedition, and check the Companion shows the packing screen (packingScreen below); the release check runs one trip so.
import { newPage, makeWalker } from "./walker.mjs";

const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
export const WANT_PODS = 0;   // W5: no anonymous pod lies in the land any more; the first Grow's pod is the nursery's waiting pod (Station picture 14), so the first walk is held to its Data and its Energy only
export const NEXT_DATA = 2;    // Data held at the end of the first walk: identify the pod (1) and read one trait (1)
const { PRICE } = await import("../../station/src/state.mjs");
export const GROW_E = PRICE.growE;   // Energy held at the end of the first walk: the first Grow's price today (growCost: PRICE.growE Energy, no Essence for the first mibi, no Data with no trait changed); lock-playtest-world
export const BUDGET = 900;      // actions of the first walk before the bot gives up looking: it goes into the start and its eight neighbours properly (about 90 actions a place) and then the rest of the reach

// all: never stop for having enough, walk the reach until the budget or the night's end (the E6 check's walked day, tools/realm-run.mjs --e6)
// oneDay: stop at the first night's end; otherwise the walk goes on into the next day, as a player's does (walk W1: the night seals the hold into a crate and the day starts again at dawn): up to MAX_DAYS, the crates' finds added up
export const MAX_DAYS = 3;
export function firstTrip(seed, { calm = false, verbose = false, budget = BUDGET, all = false, oneDay = false } = {}) {
  const p = newPage(seed, { calm }), w = makeWalker(p, { budget, verbose, tag: String(seed) }), { key, phase, acts } = w;
  const bank = { e: 0, d: 0, s: 0, pods: 0 }; let days = 1, actsBefore = 0;   // the finds of the days before, as sealed in their crates
  const cargo = () => { const c = w.cargo(); return { ...c, e: c.e + bank.e, d: c.d + bank.d, s: c.s + bank.s, pods: c.pods + bank.pods }; };
  const bankNight = () => { const r = p.S.report, c = r && r.reason === "night" ? r.sealed : null; if (c) { bank.e += c.e; bank.d += c.d; bank.s += c.s; bank.pods += c.pods.length; } actsBefore += p.S.hist[p.S.hist.length - 1].actions; };
  const nextDay = () => {   // the night ended the day: bank its crate and lift again from the sealed screen (Next expedition, Weather, the first glint)
    if (!p.S.report || p.S.report.reason !== "night" || oneDay || days >= MAX_DAYS) return false;
    bankNight(); days++; w.say("night: the day ends, day " + days);
    if (phase() === "sealed") key("confirm");
    for (let g = 0; g < 2 && !p.S.exp; g++) key("confirm");
    return !!p.S.exp;
  };
  const enough = () => { if (all) return false; const c = cargo(); return c.pods >= WANT_PODS && c.d >= NEXT_DATA && c.e >= GROW_E; };
  const out = { seed, ok: false, why: "", actions: 0, places: 0, readings: 0, pods: 0, data: 0, energy: 0, firstPodAt: null, firstDataAt: null };

  // One place: Call, take what it shows (pods, stones, strike marks: a press on each), and leave. A place is gone into properly (a Call at its four quarters and its middle) or quickly (the way in and the
  // middle). The first walk goes into the start and the cells round it properly (the pods lie in reach, the first strike mark within one cell), then into the rest of the reach quickly, then back for the rest properly.
  const QUICK = [[.5, .5]], THOROUGH = [[.5, .5], [.25, .25], [.75, .25], [.25, .75], [.75, .75]];
  const inPlace = (thorough = false) => {
    out.places++; w.say("in place " + p.S.exp.pos + (thorough ? " (properly)" : ""));
    key("call"); w.takeShownPods(); takeReadings();
    for (const [fx, fy] of thorough ? THOROUGH : QUICK) { if (enough() || phase() !== "patch" || w.budgetGone()) break; if (!walkTo(fx, fy)) continue; key("call"); w.takeShownPods(); takeReadings(); }
    // A properly-visited place with no pod held yet: Call on over a lattice a Call's reach apart (7 tiles round, so 8 apart) until a pod shows, the stop nearest first.
    if (thorough && WANT_PODS && cargo().pods < 1 && phase() === "patch") {
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
      const before = cargo().d;
      if (!w.walk(m.x, m.y, false, 60)) break;
      // a key toward a free tile walks onto it (there is no turn in place), so the press is made from the tile beside the mark, arrived at moving toward it; the standing-on press is the last try
      if (p.S.exp.patch.dir === w.facing(m.x, m.y)) key("confirm");
      else { key(w.facing(m.x, m.y)); key("confirm"); }
      if (cargo().d === before && phase() === "patch") {
        for (const d of ["up", "right", "down", "left"]) {
          const [dx, dy] = DIRS[d]; if (cargo().d > before || phase() !== "patch") break;
          if (!w.walk(m.x - 2 * dx, m.y - 2 * dy, true, 60)) continue;
          key(d); if (p.S.exp.patch.x === m.x - dx && p.S.exp.patch.y === m.y - dy) key("confirm");
        }
      }
      if (cargo().d > before) { out.readings++; w.say("read a strike mark"); } else break;
    }
    // the Energy of the first Grow's price (lock-playtest-world): a warm or storm-charged stone the Call shows, drawn while the hold is short of it
    for (let g = 0; g < 4 && phase() === "patch" && !w.budgetGone() && cargo().e < GROW_E; g++) {
      const m = w.items().find((i) => i.k === "warm" || i.k === "charge"); if (!m) break;
      if (!w.walk(m.x, m.y, false, 60)) break;
      const before = cargo().e; key(w.facing(m.x, m.y)); key("confirm");
      if (cargo().e > before) w.say("drew a stone"); else break;
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
    if (!p.S.exp && !nextDay()) break;   // the night ended the day (walk W1: on to the next day) or the Probe broke
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
  if (!p.S.exp && p.S.report && p.S.report.reason === "night") {   // the day's 200 light ran out on the walk: the night sealed the hold into a crate (nothing is lost), and the finds are the crate's
    bankNight(); out.night = true; out.days = days; out.actions = actsBefore;
    out.pods = bank.pods; out.data = bank.d; out.energy = bank.e; out.gathered = bank.pods + bank.e + bank.d + bank.s;
    out.ok = out.pods >= WANT_PODS && out.data >= NEXT_DATA && out.energy >= GROW_E; if (!out.ok) out.why = "the day ended: " + out.pods + " pods, " + out.data + " Data, " + out.energy + " Energy";
    out.log = w.log; Object.defineProperty(out, "page", { value: p, enumerable: false }); Object.defineProperty(out, "walker", { value: w, enumerable: false }); return out; }
  if (!p.S.exp) { out.sealed = true; out.why = "sealed before the walk was done (the Probe's shield ran out)"; return out; }
  const c = cargo(); out.pods = c.pods; out.data = c.d; out.energy = c.e; out.actions = actsBefore + acts(); out.days = days;
  out.ok = c.pods >= WANT_PODS && c.d >= NEXT_DATA && c.e >= GROW_E; out.gathered = c.pods + c.e + c.d + c.s;
  if (!out.ok && !out.why) out.why = c.pods < WANT_PODS ? (c.d < NEXT_DATA ? "no pod, " + c.d + " Data" : "no pod") : c.d < NEXT_DATA ? "only " + c.d + " Data" : "only " + c.e + " Energy, the first Grow costs " + GROW_E;
  out.log = w.log; Object.defineProperty(out, "page", { value: p, enumerable: false }); Object.defineProperty(out, "walker", { value: w, enumerable: false });
  return out;
}

// The end of the trip, the release check's one assertion for it: from the held finds the bot walks home, opens the menu (End expedition is on top), confirms Cargo, and the Companion shows the packing
// screen: the hold sealed into a crate that slides into the bay ("Sealed", the crate's expedition, its pod and supplies). Returns what is wrong, or "" when the screen is there.
export function packingScreen(out) {
  const p = out.page, w = out.walker;
  w.leave();
  if (p.S.phase === "map") { const way = w.wayHome(); if (!way) return "no way home to end the expedition"; for (const d of way) w.key(d); }
  if (p.S.phase !== "map") return "not on the map at the flag: " + p.S.phase;
  w.key("back"); w.key("confirm");   // the menu, then its first item: End expedition
  if (p.S.phase !== "cargo") return "End expedition did not open Cargo: " + p.S.phase;
  w.key("confirm");
  if (p.S.phase !== "sealed") return "ending the expedition did not show the packing screen, the phase is " + p.S.phase;
  const r = p.S.report, c = r && r.sealed;
  if (!c || p.S.bay.length !== 1 || p.S.bay[0].id !== c.id) return "the hold was not sealed into a crate in the bay";
  if (c.pods.length < WANT_PODS || c.d < NEXT_DATA) return "the crate lacks the finds: " + c.pods.length + " pods, " + c.d + " Data";
  p.pass(800); p.run("drawSealed(" + p.clock.t / 1000 + ")");   // the screen draws, the crate in at its place (a throw fails the check)
  return "";
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  const a = process.argv.slice(2), arg = (k, d) => { const i = a.indexOf("--" + k); return i < 0 ? d : +a[i + 1]; };
  const from = arg("from", 1), to = arg("to", 200), calm = a.includes("--calm"), verbose = a.includes("--verbose");
  const rows = []; for (let s = from; s <= to; s++) rows.push(firstTrip(s, { calm, verbose }));
  if (a.includes("--end")) for (const r of rows.filter((x) => x.ok)) { const bad = packingScreen(r); if (bad) { r.ok = false; r.why = bad; } }   // the release check ends each trip and looks for the packing screen
  const ok = rows.filter((r) => r.ok), bad = rows.filter((r) => !r.ok);
  const med = (k) => { const v = ok.map((r) => r[k]).filter((x) => x != null).sort((x, y) => x - y); return v.length ? v[v.length >> 1] : null; };
  for (const r of bad) console.log(`seed ${r.seed}: ${r.why} (actions ${r.actions}, places ${r.places}, readings ${r.readings}, pods ${r.pods}, data ${r.data})`);
  console.log(`first trip, seeds ${from}-${to}${calm ? " (calm)" : ""}: ${ok.length} of ${rows.length} held ${NEXT_DATA} Data and the first Grow's Energy (no pod: W5); actions to the first pod: median ${med("firstPodAt")}, to the Data: median ${med("firstDataAt")}, in all: median ${med("actions")}, max ${Math.max(...ok.map((r) => r.actions), 0)}`);
  if (bad.length) process.exitCode = 1;   // a trip that found no pod and the Data fails the run (the release check plays one)
  const pct = (k, q) => { const v = rows.map((r) => r[k]).sort((x, y) => x - y); return v[Math.min(v.length - 1, Math.floor(v.length * q))]; };
  console.log(`actions in all: p90 ${pct("actions", .9)}; walks over 130 actions (the 3-minute shape of W§9): ${rows.filter((r) => r.actions > 130).length}; places entered: median ${med("places")}; readings: median ${med("readings")}; Data held: median ${med("data")}, Energy held: median ${med("energy")}, pods held: median ${med("pods")}`);
}

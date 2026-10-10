// Home in each of its capture points on the Station page (?test: the face in test mode), as the layer check and the goldens take them: the four states of the brief (docked, away, fresh, waiting) and one capture for each
// other state a region of home.json lists (the bed, the Cargo module, the Incubator, the Probe, the Library, the knob), each reached by the page's own state and asserted (screen, focus) before `visit(name, page)` is called.
// Taken with reduced motion (the walk and the events jump to their end), so the pixels are the same every time; the timed events are taken on a virtual clock at exact instants (`timed`).
// Returns { fails }.
import { openStation } from "./station-page.mjs";

// the scene: what the page's state holds, as a function run in the page (the state is the page's own; the hooks seed through the rules)
const SCENES = {
  fresh:      { f: "room", set: () => {} },
  docked:     { f: "room", set: (w) => { w.adults(4); w.young(3); w.carry([0, 1]); w.crates(2); w.pods(3); w.bud(false); } },
  away:       { f: "room", set: (w) => { w.adults(4); w.young(3); w.carry([0]); w.away(); w.pods(3); } },
  waiting:    { f: "room", set: (w) => { w.adults(2); w.pods(6); w.waiting(2); } },
  "bed-none": { f: "room", set: (w) => { w.adults(3); } },
  "cargo-empty": { f: "cargo", set: (w) => { w.adults(2); w.pods(2); } },
  "incubator-empty":    { f: "incubator", set: (w) => { w.adults(2); } },
  "incubator-growing":  { f: "incubator", set: (w) => { w.adults(2); w.bud(false); } },
  "incubator-ready":    { f: "incubator", set: (w) => { w.adults(2); w.bud(true); } },
  "incubator-painting": { f: "incubator", set: (w) => { w.adults(2); w.painting(); } },
  "probe-docked":  { f: "probe", set: (w) => { w.adults(2); } },
  "probe-away":    { f: "probe", set: (w) => { w.adults(2); w.away(); } },
  "probe-sitting": { f: "probe", set: (w) => { w.adults(2); w.sitting(); } },
  "library-empty": { f: "library", set: (w) => { w.known([]); } },
  "library-pages": { f: "library", set: (w) => { w.adults(2); } },
  "knob-rest":     { f: "room", set: (w) => { w.adults(2); } },
  "knob-focused":  { f: "knob", set: (w) => { w.adults(2); } },
  "vivarium-focused": { f: "vivarium", set: (w) => { w.adults(3); } },
  "resident-focused": { f: "resident:0", set: (w) => { w.adults(3); w.carry([2]); } },
  "twelve": { f: "room", motionOnly: true, set: (w) => { w.bays(12); w.adults(12); } },
  "sleeper-focused":  { f: "resident:2", set: (w) => { w.adults(3); w.carry([2]); } },
};
// the helpers the scenes call, in the page
export const WORLD = () => ({
  // the Companion's part of the save is re-read from storage on every save: an edit to it is written there at once
  persist() { const S = window.__st; localStorage.setItem("mb-save-v8", JSON.stringify({ ...S.SV, st: S.ST })); },
  reset() { const S = window.__st, st = S.ST, sv = S.SV; st.mibis = []; st.tray = []; st.waiting = []; st.bud = null; st.sitting = null; sv.bay = []; st.devBay = []; sv.carried = []; sv.with = null; st.dock = { docked: true, at: 1 }; st.accepted = []; st.nextMibi = 1; st.knownIds = []; S.UI.meet = null; Object.assign(S.UI.cargo, { state: "bay", crate: 0, at: 0, mend: null, run: null, shown: null }); this.persist(); },
  bays(n) { window.__st.settings.bays = n; },
  adults(n) { const st = window.__st.ST, k = st.mibis.length; window.__st.seedAdults("S01", 5, n); for (const m of st.mibis.slice(k)) m.paint = { state: "landed" }; },
  young(n) { const st = window.__st.ST; const k = st.mibis.length; window.__st.seedAdults("S01", 77, n); for (const m of st.mibis.slice(k)) { m.born = st.turn; m.paint = { state: "landed" }; } },
  carry(ix) { const st = window.__st.ST; window.__st.SV.carried = ix.map((i) => st.mibis[i].id); this.persist(); },
  away() { window.__st.ST.dock = { docked: false, at: 1 }; },
  crates(n) { window.__st.SV.bay = Array.from({ length: n }, (_, i) => ({ id: "c" + i, n: i + 1, turn: 0, at: 1, e: 3, d: 3, s: 4, pods: [], met: [], explored: 0, of: 0, lines: [] })); this.persist(); },
  pods(n) { const S = window.__st; for (let i = 0; i < n; i++) S.seedPod("S01", 3 + i); },
  waiting(n) { const st = window.__st.ST; for (let i = 0; i < n; i++) st.waiting.push({ ...st.tray[i], id: "wait" + i }); },
  bud(ready) { const st = window.__st.ST; st.bud = { kind: "founder", species: "S01", sp: 0, gs: 5, genome: st.mibis[0]?.genome ?? null, sha: "bud", code: "BUD", start: Date.now() - (ready ? 1e8 : 1000), minutes: 20, firstEver: false, parents: null, from: { n: 0, g: "meadow", how: "ground", podId: null }, read: [], shaped: false, early: false }; },
  painting() { const st = window.__st.ST, m = st.mibis[st.mibis.length - 1]; if (m) m.paint = { state: "sent" }; },
  sitting() { window.__st.ST.sitting = { mibi: window.__st.ST.mibis[0]?.id ?? 1 }; },
  known(ids) { window.__st.ST.knownIds = ids; },
});

// The two timed points, on the virtual clock at exact instants (motion on): the rest knob pressed 100 ms into events.rest (the knob settling, the ring gone) and the crates arriving at 375 ms of events.crateIn.
const TIMED = {
  "knob-pressed": { scene: "knob-focused", at: 100, go: (w) => window.__st.intent({ screen: "home", target: "knob", verb: "confirm" }) },
  "walk-8000ms": { scene: "twelve", at: 8000, pre: 0, go: () => {} },   // twelve residents walking, 8000 ms of the face's clock into Home: the walk's reference for the three builds (B4b)
  "crates-arriving": { scene: "away", at: 375, go: (w) => { w.crates(3); window.__st.dockKey(); } },
};

export async function homeStates(visit, { motion = false, timed = true } = {}) {
  const r = await staticStates(visit, { motion });
  if (!timed || motion) return r;
  const t = await timedStates(visit); return { fails: [...r.fails, ...t.fails] };
}
async function timedStates(visit) {
  const { page, fails, fail, step, close } = await openStation({ motion: true, clock: true });
  await page.evaluate((src) => { window.__world = eval(src)(); }, `(${WORLD.toString()})`);
  try {
    for (const [name, tp] of Object.entries(TIMED)) {
      const sc = SCENES[tp.scene];
      await page.evaluate(([setSrc, f]) => { const w = window.__world; w.reset(); eval(`(${setSrc})`)(w); const S = window.__st; S.UI.home.f = f; S.UI.idle = false; S.goto("home"); }, [sc.set.toString(), sc.f]);
      if (tp.pre !== 0) await step(1200);   // the screen change's dither is over and the walk is under way
      await page.evaluate(([goSrc]) => { eval(`(${goSrc})`)(window.__world); }, [tp.go.toString()]); await step(tp.at);
      const u = await page.evaluate(() => ({ screen: window.__st.UI.screen, holding: window.__st.holding() })); if (u.screen !== "home") fail(`home-${name}: on ${u.screen}`);
      await visit("home-" + name, page, fail);
      await step(1000); await page.evaluate(() => { window.__st.UI.idle = false; });   // the event plays out (the rest ends in Idle: the next scene wakes)
    }
    const errs = await page.evaluate(() => ({ render: window.__st.renderErrors, face: window.__st.faceErrors })); if (errs.render.length || errs.face.length) fail("errors on the page: " + [...errs.render, ...errs.face].slice(0, 3).join(" | "));
  } finally { await close(); }
  return { fails };
}
async function staticStates(visit, { motion }) {
  const { page, fails, fail, close } = await openStation({ motion });
  await page.evaluate(`(${WORLD.toString()})`).catch(() => {});
  await page.evaluate((src) => { window.__world = eval(src)(); }, `(${WORLD.toString()})`);
  const apply = (name, sc) => page.evaluate(([setSrc, f]) => {
    const w = window.__world; w.reset(); eval(`(${setSrc})`)(w);
    const S = window.__st; S.UI.home.f = f.startsWith("resident:") ? "resident." + S.ST.mibis[+f.slice(9)].id : f; S.UI.idle = false; S.goto("home");
  }, [sc.set.toString(), sc.f]);
  try {
    for (const [name, sc] of Object.entries(SCENES)) {
      if (sc.motionOnly) continue;   // taken on the virtual clock below
      await apply(name, sc); await page.waitForTimeout(900);
      const u = await page.evaluate(() => ({ screen: window.__st.UI.screen, focus: window.__st.UI.home.f, idle: window.__st.UI.idle }));
      if (u.screen !== "home" || u.idle) fail(`home-${name}: on ${u.screen}${u.idle ? " (idle)" : ""}`);
      await visit("home-" + name, page, fail);
    }
    const errs = await page.evaluate(() => ({ render: window.__st.renderErrors, face: window.__st.faceErrors })); if (errs.render.length || errs.face.length) fail("errors on the page: " + [...errs.render, ...errs.face].slice(0, 3).join(" | "));
  } finally { await close(); }
  return { fails };
}

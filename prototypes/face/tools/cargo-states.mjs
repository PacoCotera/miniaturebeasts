// Cargo in each of its capture points on the Station page (?test: the face in test mode), as the layer check and the goldens take them: the bay (`cargo-bay`, one to three walk crates; `cargo-bay-empty`; `cargo-bay-away`, the bay shut;
// the waiting mark), one crate opening at each step of events.opening.crate (at 0, 200, 500, 800, 1200 and 1650 ms of a crate) and at its end, and the report (`cargo-report`, `cargo-report-waiting`).
// The still states are taken with reduced motion on a virtual clock the tool steps (every event at its end; the opening's cuts at their times); the opening's steps and the crates sliding in are taken with motion on, at exact
// instants of the face's clock. Each point is reached by the page's own state and the keys, and asserted (screen, state) before `visit(name, page, fail)` is called. Returns { fails }.
import { openStation } from "./station-page.mjs";
import { WORLD } from "./home-states.mjs";

// the helpers the scenes call, in the page, beside Home's: crates of pods with a walk behind them
const CARGO = () => ({
  LINES: ["The meadow's mist burned off by noon", "A pond filled behind the rocks", "Something stirred in the wood"],
  // n crates of `pods` pods each (the species alternate), each with the reach of its walk and the world lines it brings
  crates(n, pods = 2, { lines = [], explored = 5, of = 20 } = {}) {
    const S = window.__st; S.SV.bay = Array.from({ length: n }, (_, i) => ({ id: "c" + i, n: i + 1, turn: S.ST.turn + 3 + 2 * i, at: 1, e: 3, d: 3, s: 4, met: [], explored: explored * (i + 1), of,
      lines: i === n - 1 ? lines : [], pods: Array.from({ length: pods }, (_, j) => ({ id: "p" + j, species: "S01", sp: 0, g: ["meadow", "pond", "rock", "wood", "cave"][(i + j) % 5], how: "calm", gs: 11 + 7 * i + j, k: null })) }));
    this.persist();
  },
  // the counters and the turn as a fresh scene has them: the goldens do not carry the last scene's gains
  fresh() { const st = window.__st.ST; st.e = 4; st.d = 3; st.s = 6; this.persist(); },
  mend(m) { window.__st.UI.cargo.mend = m; },
  waitingPods(n) { const st = window.__st.ST; for (let i = 0; i < n; i++) st.waiting.push({ ...st.tray[i % st.tray.length], id: "wait" + i }); },
});
// the scenes: what the page's state holds; `to` is where each is taken
const SCENES = {
  "bay":        { set: (w) => { w.adults(2); w.crates(2); } },
  "bay-one":    { set: (w) => { w.adults(2); w.crates(1); } },
  "bay-three":  { set: (w) => { w.adults(2); w.crates(3); w.pods(1); } },
  "bay-empty":  { set: (w) => { w.adults(2); w.pods(2); } },
  "bay-away":   { set: (w) => { w.adults(2); w.away(); } },
  "bay-waiting":{ set: (w) => { w.adults(2); w.pods(6); w.waitingPods(2); } },
  "report":         { open: 3, set: (w) => { w.adults(2); w.pods(1); w.crates(3, 3, { lines: w.LINES }); w.mend({ free: 0, paid: 2, broke: false, spent: 2 }); } },
  "report-small":   { open: 1, set: (w) => { w.adults(2); w.crates(1, 1); } },
  "report-waiting": { open: 2, set: (w) => { w.adults(2); w.pods(5); w.crates(2, 2, { lines: w.LINES.slice(0, 1) }); w.mend({ free: 2, paid: 0, broke: true, spent: 0 }); } },
};
// the opening, one crate of three pods, at the instants of its steps (events.opening.crate) and at its end: motion on, the face's own clock ("at 0" is the first frame, 1 ms in, with the dither still fully over the stage; `opening-90` is the dither half cleared)
const STEPS = { "opening-0": 1, "opening-90": 90, "opening-200": 200, "opening-500": 500, "opening-800": 800, "opening-1200": 1200, "opening-1650": 1650, "opening-end": 3090 };
const TIMED = { "crates-arriving": { set: (w) => { w.adults(2); w.away(); w.crates(3, 2); }, at: 375, go: () => window.__st.dockKey() } };

async function apply(page, sc, name, motion) {
  await page.evaluate(([setSrc, open]) => { const w = window.__world; w.reset(); w.fresh(); eval(`(${setSrc})`)(w); const S = window.__st; S.UI.idle = false; S.goto("cargo"); }, [sc.set.toString(), sc.open ?? 0]);
}
export async function cargoStates(visit, { motion = false, timed = true } = {}) {
  const r = await still(visit); if (motion || !timed) return r;
  const t = await timedStates(visit); return { fails: [...r.fails, ...t.fails] };
}
const world = (page) => page.evaluate((src) => { window.__world = Object.assign(eval(src[0])(), eval(src[1])()); }, [`(${WORLD.toString()})`, `(${CARGO.toString()})`]);
async function still(visit) {
  const { page, fails, fail, step, close } = await openStation({ motion: false, clock: true });
  await world(page);
  try {
    for (const [name, sc] of Object.entries(SCENES)) {
      await apply(page, sc, name);
      await step(400);
      if (sc.open) {   // the real way: ✓ Open the bay, the crates open at their pace (each step a cut), the report shows
        await page.evaluate(() => window.__st.press("confirm")); await step(sc.open * 3000 + 400);
      }
      const u = await page.evaluate(() => ({ screen: window.__st.UI.screen, state: window.__st.UI.cargo.state, props: window.__st.props?.state })); const want = sc.open ? "report" : "bay";
      if (u.screen !== "cargo" || u.state !== want || u.props !== want) fail(`cargo-${name}: on ${u.screen}, state ${u.state}, props ${u.props}`);
      await visit("cargo-" + name, page, fail);
    }
    const errs = await page.evaluate(() => ({ render: window.__st.renderErrors, face: window.__st.faceErrors })); if (errs.render.length || errs.face.length) fail("errors on the page: " + [...errs.render, ...errs.face].slice(0, 3).join(" | "));
  } finally { await close(); }
  return { fails };
}
async function timedStates(visit) {
  const { page, fails, fail, step, close } = await openStation({ motion: true, clock: true });
  await world(page);
  try {
    for (const [name, at] of Object.entries(STEPS)) {
      await apply(page, { set: (w) => { w.adults(2); w.pods(1); w.crates(1, 3, { lines: ["The meadow's mist burned off by noon"] }); } }, name);
      await step(1200);   // the screen change's dither is over
      await page.evaluate(() => window.__st.press("confirm")); await step(at);
      const u = await page.evaluate(() => ({ screen: window.__st.UI.screen, state: window.__st.UI.cargo.state })); const want = name === "opening-end" ? "report" : "opening";
      if (u.screen !== "cargo" || u.state !== want) fail(`cargo-${name}: on ${u.screen}, state ${u.state}`);
      await visit("cargo-" + name, page, fail);
      await step(3500);
    }
    for (const [name, tp] of Object.entries(TIMED)) {
      await apply(page, { set: tp.set }, name); await step(1200); await page.evaluate(tp.go); await step(tp.at);
      await visit("cargo-" + name, page, fail); await step(1500);
    }
    const errs = await page.evaluate(() => ({ render: window.__st.renderErrors, face: window.__st.faceErrors })); if (errs.render.length || errs.face.length) fail("errors on the page: " + [...errs.render, ...errs.face].slice(0, 3).join(" | "));
  } finally { await close(); }
  return { fails };
}

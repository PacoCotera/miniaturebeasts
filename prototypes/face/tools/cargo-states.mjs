// Cargo (the Bay) in each of its capture points on the Station page (?test: the face in test mode), as the layer check and the goldens take them: the bay at rest (one to three walk crates; nothing in; away; pods waiting on the mat; a portrait crate in,
// docked and away), the end (pods came, none), one crate opening at the instants of its steps (events.opening: the lift, the contents' dither halfway, the materials answering and in flight, the hatch open, a pod in flight and halfway through its swap,
// a pod landing on the mat, a find in flight, the crate done), the opening with three crates and with the portrait crate, the frame after ✓ Skip, and the dock arrival (T-20261016-48, -58, -112).
// The still states are taken with reduced motion on a virtual clock the tool steps (every event at its end; the opening's cuts at their times); the opening's steps are taken with motion on, at exact instants of the face's clock. Each point is reached by
// the page's own state and the keys, and asserted (screen, state) before `visit(name, page, fail)` is called. Returns { fails }.
import { openStation } from "./station-page.mjs";
import { WORLD } from "./home-states.mjs";
import { portraitFixture } from "./portrait-fixture.mjs";
import { digestOf } from "../../station/src/portrait-source.mjs";

const PICTURED = await digestOf(portraitFixture());   // the test card's digest (the painting is not a portrait, not art), as the Habitat card takes it

// the helpers the scenes call, in the page, beside Home's: crates of pods with a walk behind them
const CARGO = () => ({
  LINES: ["The meadow's mist burned off by noon", "A pond filled behind the rocks", "Something stirred in the wood"],
  // n crates of `pods` pods each (the species alternate), each with the reach of its walk; the first holds the finds named
  crates(n, pods = 2, { finds = [], explored = 5, of = 20 } = {}) {
    const S = window.__st; S.SV.bay = Array.from({ length: n }, (_, i) => ({ id: "c" + i, n: i + 1, turn: S.ST.turn + 3 + 2 * i, at: 1, e: 3, d: 3, s: 4, met: [], explored: explored * (i + 1), of,
      lines: [], ...(i === 0 && finds.length ? { finds } : {}), pods: Array.from({ length: pods }, (_, j) => ({ id: "p" + j, species: "S01", sp: 0, g: ["meadow", "pond", "rock", "wood", "cave"][(i + j) % 5], how: "calm", gs: 11 + 7 * i + j, k: null })) }));
    this.persist();
  },
  // the counters and the turn as a fresh scene has them: the goldens do not carry the last scene's gains
  fresh() { const st = window.__st.ST; st.e = 4; st.d = 3; st.s = 6; st.sittingCrates = []; this.persist(); },
  // a portrait crate, ready: the first mibi's sitting (its painting: the test card when `picture`, else the frame alone)
  crateSitting(picture) {
    const S = window.__st, st = S.ST, m = st.mibis[0]; st.sittingCrates = [{ id: "sc1", mibiId: m.id, start: -1e10, painted: true }]; m.portrait = { state: "painting", crate: "sc1", ...(picture ? { digest: window.__portrait.digest } : {}) };
    if (picture) { const r = S.portraitSource(window.__portrait.digest, eval(`(${window.__portrait.fixture})`)()); if (!r.ok) throw new Error("portrait fixture: " + r.error); }
    this.persist();
  },
  // the dock arrival's world: `crates` crates (the second holds a species new to the player), two mibis asked home, one asked to go, the Probe a plate short
  arrivalScene(crates) { this.adults(4); this.away(); this.crates(crates, 2); const S = window.__st, st = S.ST; st.knownIds = ["S01"]; if (crates > 1) { S.SV.bay[1].pods[0].species = "S02"; S.SV.bay[1].pods[0].sp = 1; } st.probe = { shield: 1, smax: 3, tier: 1, seq: 1 }; st.carryReqs = []; st.carrySeq = 0; S.SV.carried = [];
    if (crates) { st.carryReqs = [{ seq: 1, op: "home", id: st.mibis[0].id }, { seq: 2, op: "home", id: st.mibis[1].id }, { seq: 3, op: "add", id: st.mibis[2].id }]; st.carrySeq = 3; S.SV.carried = [st.mibis[0].id, st.mibis[1].id]; } this.persist(); },
  waitingPods(n) { const st = window.__st.ST; for (let i = 0; i < n; i++) st.waiting.push({ ...st.tray[i % st.tray.length], id: "wait" + i }); },
});
// the still scenes: what the page's state holds. `open`: ✓ Open them all and wait it out (the end); `crates`: how many walk crates the run opens
const SCENES = {
  "bay":          { set: (w) => { w.adults(2); w.pods(2); w.crates(3); w.waitingPods(1); } },
  "bay-one":      { set: (w) => { w.adults(2); w.crates(1); } },
  "bay-two":      { set: (w) => { w.adults(2); w.crates(2); w.pods(1); } },
  "bay-empty":    { set: (w) => { w.adults(2); w.pods(2); } },
  "bay-away":     { set: (w) => { w.adults(2); w.away(); } },
  "bay-waiting":  { set: (w) => { w.adults(2); w.pods(6); w.waitingPods(2); } },
  "bay-waiting-many": { set: (w) => { w.adults(2); w.pods(6); w.waitingPods(5); } },
  "bay-portrait": { set: (w) => { w.adults(2); w.pods(2); w.crates(2); w.crateSitting(true); } },
  "bay-portrait-away": { set: (w) => { w.adults(2); w.away(); w.crateSitting(false); } },
  "end":          { open: true, set: (w) => { w.adults(2); w.pods(2); w.crates(3, 2, { finds: ["pearl"] }); w.waitingPods(1); } },
  "end-no-pods":  { open: true, set: (w) => { w.adults(2); w.crates(1, 0); } },
};
// one crate opening (two free wells, a third pod for the mat, a find), at the instants of its steps: motion on, the face's own clock ("at 0" is the first frame, 1 ms in: the crate lifting in its berth)
const ONE = (w) => { w.adults(2); w.pods(4); w.crates(1, 3, { finds: ["pearl"] }); };
const STEPS = { "opening-0": 1, "opening-dither": 290, "opening-500": 600, "opening-materials": 1000, "opening-hatch": 1600, "opening-pod": 2000, "opening-swap": 2390, "opening-mat": 3000, "opening-find": 3200, "opening-done": 3690 };
// three crates (a pod in flight in the first; the second lifting with the first done), then with a portrait crate in: its painting rising and on its way
const THREE_WALK = (w) => { w.adults(2); w.pods(1); w.crates(3, 2); };
const THREE = (w) => { w.adults(2); w.pods(1); w.crates(3, 2); w.crateSitting(true); };
const MANY = { "opening-three": [THREE_WALK, 2000], "opening-three-second": [THREE_WALK, 3080 + 2000], "opening-portrait": [THREE, 3 * 3080 + 400], "opening-portrait-travel": [THREE, 3 * 3080 + 1000] };
// the dock arrival (T-20261016-48, -58, -112), on Cargo itself (no transition), from the Dock: two crates (one holding a species new to the player, S02), two mibis asked home, one asked to go, the Probe a plate short (mended free);
// `arrival-2200` is the show with two arrivals, `arrival-choice` the strip over the rack, `arrival-empty-trip` the empty trip's ribbon and band before it closes by itself.
const TIMED = {
  "arrival-2200": { set: (w) => w.arrivalScene(2), at: 2200, go: () => window.__st.dockKey() },
  "arrival-choice": { set: (w) => w.arrivalScene(2), at: 3700, go: () => window.__st.dockKey() },
  "arrival-empty-trip": { set: (w) => w.arrivalScene(0), at: 2000, go: () => window.__st.dockKey() },
};

async function apply(page, sc) {
  await page.evaluate(([setSrc]) => { const w = window.__world; w.reset(); w.fresh(); eval(`(${setSrc})`)(w); const S = window.__st; S.UI.idle = false; S.UI.cargo.state = "bay"; S.UI.cargo.run = null; S.UI.cargo.shown = null; S.goto("cargo"); }, [sc.set.toString()]);
}
export async function cargoStates(visit, { motion = false, timed = true } = {}) {
  const r = await still(visit); if (motion || !timed) return r;
  const t = await timedStates(visit); return { fails: [...r.fails, ...t.fails] };
}
const world = (page) => page.evaluate((src) => { window.__world = Object.assign(eval(src[0])(), eval(src[1])()); window.__portrait = { digest: src[2], fixture: src[3] }; }, [`(${WORLD.toString()})`, `(${CARGO.toString()})`, PICTURED, portraitFixture.toString()]);
async function still(visit) {
  const { page, fails, fail, step, close } = await openStation({ motion: false, clock: true });
  await world(page);
  try {
    for (const [name, sc] of Object.entries(SCENES)) {
      await apply(page, sc);
      await step(400);
      if (sc.open) {   // the real way: ✓ Open them all, the crates open at their pace (each step a cut), the end shows
        await page.evaluate(() => window.__st.press("confirm")); await step(12000);
      }
      const u = await page.evaluate(() => ({ screen: window.__st.UI.screen, state: window.__st.UI.cargo.state, props: window.__st.props?.state })); const want = sc.open ? "end" : "bay";
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
    const open = async (name, set, at, want = "opening") => {
      await apply(page, { set }); await step(1200);   // the screen change's dither is over
      await page.evaluate(() => window.__st.press("confirm")); await step(at);
      const u = await page.evaluate(() => ({ screen: window.__st.UI.screen, state: window.__st.UI.cargo.state })); if (u.screen !== "cargo" || u.state !== want) fail(`cargo-${name}: on ${u.screen}, state ${u.state}`);
      await visit("cargo-" + name, page, fail); await step(14000);
    };
    for (const [name, at] of Object.entries(STEPS)) await open(name, ONE, at, name === "opening-done" ? "opening" : "opening");
    for (const [name, [set, at]] of Object.entries(MANY)) await open(name, set, at);
    for (const [name, tp] of Object.entries(TIMED)) {
      await apply(page, { set: tp.set }); await step(1200); await page.evaluate(tp.go); await step(tp.at);
      await visit("cargo-" + name, page, fail); await step(1500);
    }
    {   // ✓ Skip (build spec 8.4): ✓ Open them all, 1000 ms into the opening a second ✓ ends the crate, and the frame after the skip is the end (one crate)
      await apply(page, { set: (w) => { w.adults(2); w.pods(1); w.crates(1, 3, { finds: ["pearl"] }); } });
      await step(1200); await page.evaluate(() => window.__st.press("confirm")); await step(1000); await page.evaluate(() => window.__st.press("confirm")); await step(16);
      const u = await page.evaluate(() => ({ screen: window.__st.UI.screen, state: window.__st.UI.cargo.state }));
      if (u.screen !== "cargo" || u.state !== "end") fail(`cargo-opening-skip: on ${u.screen}, state ${u.state}`);
      await visit("cargo-opening-skip", page, fail); await step(1500);
    }
    const errs = await page.evaluate(() => ({ render: window.__st.renderErrors, face: window.__st.faceErrors })); if (errs.render.length || errs.face.length) fail("errors on the page: " + [...errs.render, ...errs.face].slice(0, 3).join(" | "));
  } finally { await close(); }
  return { fails };
}

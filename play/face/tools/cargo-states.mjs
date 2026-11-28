// The Bay in each of its capture points on the Station page (?test: the face in test mode), as the layer check and the goldens take them: the Bay at rest (one to three crates waiting, the Bay full with a fourth aboard, a portrait crate,
// nothing, away with the crates waiting), a crate open on the table, and the end after ▼ All at once. The states are taken with reduced motion on a virtual clock the tool steps (every event at its end); the page's own state and the keys
// make each one, and (screen, state) are asserted before `visit(name, page, fail)` is called. Returns { fails }. The wide form (1024 x 600) is what the goldens carry; the phone's narrow form is the played test's and the stills'.
import { openStation } from "./station-page.mjs";
import { WORLD } from "./home-states.mjs";
import { boneCanvas } from "./portrait-fixture.mjs";
import { digestOf } from "../../station/src/portrait-source.mjs";

const PICTURED = await digestOf(boneCanvas());   // the bone canvas's digest (the painting is not a portrait, not art), as the Habitat card takes it

// the helpers the scenes call, in the page, beside Home's: crates of pods that crossed at the dock (the Station-held list; the rest stay aboard)
const CARGO = () => ({
  // n crates of `pods` pods each (the species alternate): the first three cross to the Bay (st.bayHeld), the rest stay aboard
  crates(n, pods = 2) {
    const S = window.__st, all = Array.from({ length: n }, (_, i) => ({ id: "c" + i, n: i + 1, turn: S.ST.turn + 3 + 2 * i, at: 1, e: 3, d: 3, s: 4, met: [], explored: 5 * (i + 1), of: 20, lines: [],
      pods: Array.from({ length: pods }, (_, j) => ({ id: "p" + j, species: "S01", sp: 0, g: ["meadow", "pond", "rock", "wood", "cave"][(i + j) % 5], how: "calm", gs: 11 + 7 * i + j, k: null })) }));
    S.ST.bayHeld = all.slice(0, 3); S.SV.bay = all.slice(3); S.ST.accepted = []; this.persist();
  },
  // the counters and the turn as a fresh scene has them: the goldens do not carry the last scene's gains
  fresh() { const st = window.__st.ST; st.e = 4; st.d = 3; st.s = 6; st.sittingCrates = []; st.bayHeld = []; this.persist(); },
  // a portrait crate, ready: the first mibi's sitting (its painting: the bone canvas when `picture`, else the frame alone)
  crateSitting(picture) {
    const S = window.__st, st = S.ST, m = st.mibis[0]; st.sittingCrates = [{ id: "sc1", mibiId: m.id, start: -1e10, painted: true }]; m.portrait = { state: "painting", crate: "sc1", ...(picture ? { digest: window.__portrait.digest } : {}) };
    if (picture) { const r = S.portraitSource(window.__portrait.digest, eval(`(${window.__portrait.fixture})`)()); if (!r.ok) throw new Error("portrait fixture: " + r.error); }
    this.persist();
  },
});
// the still scenes: what the page's state holds. `press`: the keys pressed on the Bay after it shows (the table's crate open; ▼ All at once); `want`: whether the Bay then has a crate waiting
const SCENES = {
  "bay":          { set: (w) => { w.adults(2); w.pods(2); w.crates(3); } },
  "bay-one":      { set: (w) => { w.adults(2); w.crates(1); } },
  "bay-two":      { set: (w) => { w.adults(2); w.crates(2); w.pods(1); } },
  "bay-empty":    { set: (w) => { w.adults(2); w.pods(2); } },
  "bay-away":     { set: (w) => { w.adults(2); w.away(); w.crates(2); } },
  "bay-full":     { set: (w) => { w.adults(2); w.pods(1); w.crates(4); } },
  "bay-portrait": { set: (w) => { w.adults(2); w.pods(2); w.crates(2); w.crateSitting(false); } },
  "open":         { press: ["confirm"], set: (w) => { w.adults(2); w.pods(2); w.crates(3, 3); } },
  "open-no-pod":  { press: ["confirm"], set: (w) => { w.adults(2); w.crates(1, 0); } },
  "end":          { press: ["down"], set: (w) => { w.adults(2); w.pods(2); w.crates(3, 2); } },
};
async function apply(page, sc) {
  await page.evaluate(([setSrc]) => { const w = window.__world; w.reset(); w.fresh(); eval(`(${setSrc})`)(w); const S = window.__st; S.UI.idle = false; S.UI.lastInput = performance.now(); S.UI.cargo.state = "bay"; S.UI.cargo.open = false; S.UI.cargo.sum = null; S.UI.cargo.portrait = null; S.goto("cargo"); }, [sc.set.toString()]);
}
export async function cargoStates(visit) {
  const { page, fails, fail, step, close } = await openStation({ motion: false, clock: true });
  await page.evaluate((src) => { window.__world = Object.assign(eval(src[0])(), eval(src[1])()); window.__portrait = { digest: src[2], fixture: src[3] }; }, [`(${WORLD.toString()})`, `(${CARGO.toString()})`, PICTURED, boneCanvas.toString()]);
  try {
    for (const [name, sc] of Object.entries(SCENES)) {
      await apply(page, sc);
      await step(400);
      for (const k of sc.press ?? []) { await page.evaluate((key) => window.__st.press(key), k); await step(200); }
      const u = await page.evaluate(() => ({ screen: window.__st.UI.screen, state: window.__st.UI.cargo.state, props: window.__st.props?.state }));
      if (u.screen !== "cargo" || u.state !== "bay" || u.props !== "bay") fail(`cargo-${name}: on ${u.screen}, state ${u.state}, props ${u.props}`);
      await visit("cargo-" + name, page, fail);
    }
    const errs = await page.evaluate(() => ({ render: window.__st.renderErrors, face: window.__st.faceErrors })); if (errs.render.length || errs.face.length) fail("errors on the page: " + [...errs.render, ...errs.face].slice(0, 3).join(" | "));
  } finally { await close(); }
  return { fails };
}

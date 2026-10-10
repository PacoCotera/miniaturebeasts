// The Incubator in each of its capture points on the Station page (?test: the face in test mode), as the layer check and the goldens take them: `incubator-empty` (a pod in the rack: ✓ Choose a pod), `incubator-growing` (the wait's first half),
// `incubator-growing-late` (the second half, a leaf filling), `incubator-ready` (the waiting lamp on), and with motion on at exact instants of the face's clock: the hatch (`incubator-hatch-100` and `-300` the still beat,
// `-650` the crack, `-850` the opening, `-1100` the juvenile standing, `-1500` its first step, `-2000`) and growNow (`incubator-growNow-200` the leaves turning whole, `incubator-growNow-420` the ready state).
// Each point is reached by the page's own state and the keys, and asserted (screen, state) before `visit(name, page, fail)` is called. Returns { fails }.
import { openStation } from "./station-page.mjs";
import { WORLD } from "./home-states.mjs";

const INC = () => ({
  fresh() { const st = window.__st.ST; st.e = 9; st.d = 4; st.s = 9; st.firstMibi = false; st.bud = null; this.persist(); },
  // a bud `min` minutes into its 20 (ready: all of them)
  budAt(min) { const st = window.__st.ST; this.bud(false); st.bud.start = Date.now() - min * 60000; this.persist(); },
  open() { window.__st.goto("incubator"); },
});
const SCENES = {
  "empty":        { want: "empty",   set: (w) => { w.pods(1); } },
  "growing":      { want: "growing", set: (w) => { w.adults(2); w.budAt(2); } },
  "growing-late": { want: "growing", set: (w) => { w.adults(2); w.budAt(13.2); } },
  "ready":        { want: "ready",   set: (w) => { w.adults(2); w.bud(true); } },
};
const WORLDS = (page) => page.evaluate((src) => { window.__world = Object.assign(eval(src[0])(), eval(src[1])()); }, [`(${WORLD.toString()})`, `(${INC.toString()})`]);
async function apply(page, sc) {
  await page.evaluate(([setSrc]) => { const w = window.__world; w.reset(); w.fresh(); eval(`(${setSrc})`)(w); const S = window.__st; S.UI.idle = false; S.UI.inc = {}; w.open(); }, [sc.set.toString()]);
}
// the timed points: the scene, the key that starts the event, the instants after it
const TIMED = {
  "hatch-100":  { scene: "ready", go: () => window.__st.press("confirm"), at: 100,  want: "hatch" },
  "hatch-300":  { scene: "ready", go: () => window.__st.press("confirm"), at: 300,  want: "hatch" },
  "hatch-650":  { scene: "ready", go: () => window.__st.press("confirm"), at: 650,  want: "hatch" },
  "hatch-850":  { scene: "ready", go: () => window.__st.press("confirm"), at: 850,  want: "hatch" },
  "hatch-1100": { scene: "ready", go: () => window.__st.press("confirm"), at: 1100, want: "hatch" },
  "hatch-1500": { scene: "ready", go: () => window.__st.press("confirm"), at: 1500, want: "hatch" },
  "hatch-2000": { scene: "ready", go: () => window.__st.press("confirm"), at: 2000, want: "hatch" },
  "growNow-200": { scene: "growing-late", go: () => window.__st.press("confirm"), at: 200, want: "growing" },
  "growNow-420": { scene: "growing-late", go: () => window.__st.press("confirm"), at: 420, want: "ready" },
};
export async function incubatorStates(visit, { motion = false, timed = true } = {}) {
  const r = await still(visit); if (motion || !timed) return r;
  const t = await timedStates(visit); return { fails: [...r.fails, ...t.fails] };
}
async function still(visit) {
  const { page, fails, fail, step, close } = await openStation({ motion: false, clock: true });
  await WORLDS(page);
  try {
    for (const [name, sc] of Object.entries(SCENES)) {
      await apply(page, sc); await step(400);
      const u = await page.evaluate(() => ({ screen: window.__st.UI.screen, props: window.__st.props?.state })); if (u.screen !== "incubator" || u.props !== sc.want) fail(`incubator-${name}: on ${u.screen}, props ${u.props}`);
      await visit("incubator-" + name, page, fail);
    }
    const errs = await page.evaluate(() => ({ render: window.__st.renderErrors, face: window.__st.faceErrors })); if (errs.render.length || errs.face.length) fail("errors on the page: " + [...errs.render, ...errs.face].slice(0, 3).join(" | "));
  } finally { await close(); }
  return { fails };
}
async function timedStates(visit) {
  const { page, fails, fail, step, close } = await openStation({ motion: true, clock: true });
  await WORLDS(page);
  try {
    for (const [name, tp] of Object.entries(TIMED)) {
      await apply(page, SCENES[tp.scene]); await step(1200);   // the screen change's dither is over
      await page.evaluate(tp.go); await step(tp.at);
      const u = await page.evaluate(() => ({ screen: window.__st.UI.screen, props: window.__st.props?.state }));
      if (u.screen !== "incubator" || u.props !== tp.want) fail(`incubator-${name}: on ${u.screen}, props ${u.props}`);
      await visit("incubator-" + name, page, fail); await step(3000);
    }
    const errs = await page.evaluate(() => ({ render: window.__st.renderErrors, face: window.__st.faceErrors })); if (errs.render.length || errs.face.length) fail("errors on the page: " + [...errs.render, ...errs.face].slice(0, 3).join(" | "));
  } finally { await close(); }
  return { fails };
}

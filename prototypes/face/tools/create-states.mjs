// Create in each of its capture points on the Station page (?test: the face in test mode), as the layer check and the goldens take them: `create-nothingRead`, `create-shape` (a trait read, as the pod is), `create-shape-changed`
// (a rolled look: the tag, the diamond pip), `create-shape-clash` (the red edge, the ✕ in the line and on the pip, no ✓ cap), `create-shape-doing` (breed to change, the breed mark), `create-shape-onelook`, `create-shape-short` (the dimmed ✓,
// the short figure amber), `create-shape-busy` (a bud in the small chamber, Grow blocked), `create-shape-first` (the first founder: five leaves), and with motion on at exact instants of the face's clock: the roll's dither
// halfway (`create-roll-100`) and the grow event (`create-grow-150` the stamp printing, `create-grow` at 600 ms the pod travelling behind the work tray, `create-grow-end` at 890 ms, the travel over and the jump still to come; `create-grow-nothing`, Grow from nothing read 20 ms in: a cut, the whole stamp from the first frame).
// Each point is reached by the page's own state and the keys, and asserted (screen, state) before `visit(name, page, fail)` is called. Returns { fails }.
import { openStation } from "./station-page.mjs";
import { WORLD } from "./home-states.mjs";

// the helpers the scenes call, in the page: a pod with `n` chapters read, Create opened on it
const CREATE = () => ({
  fresh() { const st = window.__st.ST; st.e = 9; st.d = 4; st.s = 6; st.firstMibi = false; st.bud = null; this.persist(); },
  shape(species, gs, n) { const S = window.__st; S.seedPod(species, gs); const p = S.ST.tray.at(-1); S.readSome(p.id, n); S.openCreate(p.id); return p.id; },
  at(f) { window.__st.UI.create.f = f; },
});
// species, genome seed, chapters read, the trait the ring starts on, what else the scene sets (in the page)
const SCENES = {
  "nothingRead":   { want: "nothingRead", set: (w) => { w.shape("S01", 3, 0); } },
  "shape":         { want: "shape", set: (w) => { w.shape("S01", 3, 2); w.at(1); } },
  "shape-changed": { want: "shape", set: (w) => { w.shape("S01", 3, 2); w.at(1); window.__st.intent({ screen: "create", target: "roll", verb: "step:down" }); } },
  "shape-clash":   { want: "shape", set: (w) => { w.shape("S01", 3, 2); w.at(1); window.__st.intent({ screen: "create", target: "roll", verb: "step:down" }); const c = window.__st.UI.create; c.clash = [Object.keys(c.choices)[0]]; } },   // no frame in the registry clashes today: the mark is taken as the rules would set it
  "shape-doing":   { want: "shape", set: (w) => { w.shape("S01", 3, 4); w.at(3); } },
  "shape-onelook": { want: "shape", set: (w) => { w.shape("S01", 4, 4); w.at(0); } },
  "shape-short":   { want: "shape", set: (w) => { w.shape("S01", 3, 2); w.at(1); const st = window.__st.ST; st.s = 1; st.e = 9; w.persist(); } },
  "shape-busy":    { want: "shape", set: (w) => { w.shape("S01", 3, 2); w.at(1); w.bud(false); } },
  "shape-first":   { want: "shape", set: (w) => { w.shape("S01", 3, 2); w.at(1); window.__st.ST.firstMibi = true; } },
};
const WORLDS = (page) => page.evaluate((src) => { window.__world = Object.assign(eval(src[0])(), eval(src[1])()); }, [`(${WORLD.toString()})`, `(${CREATE.toString()})`]);
// the timed points: the scene, the key or intent that starts the event, and the instant after it
const TIMED = {
  "roll-100":   { scene: "shape", go: () => window.__st.intent({ screen: "create", target: "roll", verb: "step:down" }), at: 100 },
  "grow-150":   { scene: "shape-changed", go: () => window.__st.press("confirm"), at: 150, want: "grow" },
  "grow":       { scene: "shape-changed", go: () => window.__st.press("confirm"), at: 600, want: "grow" },
  "grow-end":   { scene: "shape-changed", go: () => window.__st.press("confirm"), at: 890, want: "grow" },
  "grow-nothing": { scene: "nothingRead", go: () => window.__st.press("confirm"), at: 20, want: "grow" },
};
async function apply(page, sc) {
  await page.evaluate(([setSrc]) => { const w = window.__world; w.reset(); w.fresh(); w.adults(2); eval(`(${setSrc})`)(w); const S = window.__st; S.UI.idle = false; }, [sc.set.toString()]);
}
export async function createStates(visit, { motion = false, timed = true } = {}) {
  const r = await still(visit); if (motion || !timed) return r;
  const t = await timedStates(visit); return { fails: [...r.fails, ...t.fails] };
}
async function still(visit) {
  const { page, fails, fail, step, close } = await openStation({ motion: false, clock: true });
  await WORLDS(page);
  try {
    for (const [name, sc] of Object.entries(SCENES)) {
      await apply(page, sc); await step(400);
      const u = await page.evaluate(() => ({ screen: window.__st.UI.screen, props: window.__st.props?.state })); if (u.screen !== "create" || u.props !== sc.want) fail(`create-${name}: on ${u.screen}, props ${u.props}`);
      await visit("create-" + name, page, fail);
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
      const u = await page.evaluate(() => ({ screen: window.__st.UI.screen, props: window.__st.props?.state })); const want = tp.want ?? SCENES[tp.scene].want;
      if (u.screen !== "create" || u.props !== want) fail(`create-${name}: on ${u.screen}, props ${u.props}`);
      await visit("create-" + name, page, fail); await step(2000);
    }
    const errs = await page.evaluate(() => ({ render: window.__st.renderErrors, face: window.__st.faceErrors })); if (errs.render.length || errs.face.length) fail("errors on the page: " + [...errs.render, ...errs.face].slice(0, 3).join(" | "));
  } finally { await close(); }
  return { fails };
}

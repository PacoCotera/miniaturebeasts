// The Incubator in each of its capture points on the Station page (?test: the face in test mode), as the layer check and the goldens take them: `incubator-empty` (a pod in the rack: ✓ Choose a pod), `incubator-growing` (the wait's first half),
// `incubator-growing-late` (the second half, a leaf filling), `incubator-ready`, `incubator-panel-grownow` (✓ Hatch now above ❀ 4: the Hatch now? panel), and with motion on at exact instants of the face's clock: the hatch (`incubator-hatch-100` and `-300` the still beat,
// `-650` the crack, `-850` the opening, `-1100` the juvenile standing, `-1500` its first step, `-2000`) and growNow (`incubator-growNow-200` the leaves turning whole, `incubator-growNow-420` the hatch, which Hatch now starts as the leaves end).
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
  "panel-grownow": { want: "growing", panel: true, set: (w) => { w.adults(2); w.budAt(2); } },   // ✓ Hatch now at ❀ 9 (above ❀ 4) opens the Hatch now? panel, the ring on Hatch now
  "ready-moving": { want: "ready", timedOnly: true, set: (w) => { w.adults(2); w.bud(true); const S = window.__st; S.settings.motionSets = true; S.settings.stationTime = "12:00"; } },
};
const WORLDS = (page) => page.evaluate((src) => { window.__world = Object.assign(eval(src[0])(), eval(src[1])()); }, [`(${WORLD.toString()})`, `(${INC.toString()})`]);
async function apply(page, sc) {
  await page.evaluate(([setSrc, panel]) => { const w = window.__world; w.reset(); w.fresh(); eval(`(${setSrc})`)(w); const S = window.__st; S.UI.idle = false; S.UI.inc = {}; S.UI.panel = null; w.open(); if (panel) S.press("confirm"); }, [sc.set.toString(), !!sc.panel]);
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
  // Station M1 §2.5: the hatch with S01's moving set on its stand-in close cells, under the developer switch; 2720 (the R2 cut point) is taken last so the others keep their mibis
  ...Object.fromEntries([1090, 2500, 5440, 5840, 2720].map((at) => [`hatch-moving-${at}`, { scene: "ready-moving", go: () => window.__st.press("confirm"), at, want: "hatch" }])),
  "growNow-200": { scene: "growing-late", go: () => window.__st.press("confirm"), at: 200, want: "growing" },
  "growNow-420": { scene: "growing-late", go: () => window.__st.press("confirm"), at: 420, want: "hatch" },
  // ✓ Skip (lvgl-switch.md §2.1): 1100 ms into the hatch a second ✓ skips it; the frame after the skip is the hand-off to the meet (one mibi up close). Taken last: it hatches a mibi
  "hatch-skip": { scene: "ready", go: () => window.__st.press("confirm"), at: 1100, skip: true, want: "habitat" },
};
// The hatch's name and code, read from the props at each hatch frame: one name and one code (never the fixture's "BUD") across every frame; the Habitat's meet takes the same name (habitat-states.mjs)
export const hatched = { name: null };
export async function incubatorStates(visit, { motion = false, timed = true } = {}) {
  const r = await still(visit); if (motion || !timed) return r;
  const t = await timedStates(visit); return { fails: [...r.fails, ...t.fails] };
}
async function still(visit) {
  const { page, fails, fail, step, close } = await openStation({ motion: false, clock: true });
  await WORLDS(page);
  try {
    for (const [name, sc] of Object.entries(SCENES)) {
      if (sc.timedOnly) continue;
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
      if (tp.skip) { await page.evaluate(() => window.__st.press("confirm")); await step(16); }   // the skip, and the frame after it
      const u = await page.evaluate(() => ({ screen: window.__st.UI.screen, props: window.__st.props?.state }));
      if (tp.skip ? u.screen !== tp.want : u.screen !== "incubator" || u.props !== tp.want) fail(`incubator-${name}: on ${u.screen}, props ${u.props}`);
      await visit("incubator-" + name, page, fail);
      if (/^hatch-\d+$/.test(name)) {
        const h = await page.evaluate(() => { const S = window.__st, m = S.ST.mibis[S.ST.mibis.length - 1], r = S.props?.regions; return { name: m.name, code: m.code, ribbon: r?.ribbon ?? "", shown: r?.code ?? "" }; });
        if (/BUD/.test(h.code) || /BUD/.test(JSON.stringify(h.shown))) fail(`incubator-${name}: the code is the fixture's BUD: ${h.code}`);
        hatched.seen ??= h; if (h.name !== hatched.seen.name || h.code !== hatched.seen.code || JSON.stringify(h.shown) !== JSON.stringify(hatched.seen.shown)) fail(`incubator-${name}: the hatch changed name or code across frames: ${JSON.stringify(h)} against ${JSON.stringify(hatched.seen)}`);
        if (h.ribbon && !h.ribbon.includes(h.name)) fail(`incubator-${name}: the ribbon "${h.ribbon}" does not carry the mibi's name ${h.name}`);
        hatched.name = h.name;
      }
      await step(/moving/.test(name) ? 7000 : 3000);
      await page.evaluate(() => { const S = window.__st; S.settings.motionSets = false; S.settings.stationTime = null; });
    }
    const errs = await page.evaluate(() => ({ render: window.__st.renderErrors, face: window.__st.faceErrors })); if (errs.render.length || errs.face.length) fail("errors on the page: " + [...errs.render, ...errs.face].slice(0, 3).join(" | "));
  } finally { await close(); }
  return { fails };
}

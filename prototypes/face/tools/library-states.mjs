// The Library spread in each of its capture points on the Station page (?test: the face in test mode), as the layer check and the goldens take them: `library-spread` (the wireframe 20 scene: Loika found and portrayed, Untuva, Tuikis
// and Belatz found at progress one, three and four with the guide complete, Hiljan met, the rest empty, the ring on Tuikis), `library-spread-empty` (a fresh world: sixteen empty frames, the ring on the first), `library-spread-complete` (the ring
// on a portrayed, complete frame: over the gilt corner and the seal) and `library-book` (✓ on a found frame: the Book, "not built yet", ← Library). Each is reached by the page's own state and asserted (screen, state, ring) before `visit(name, page, fail)`
// is called. Taken with reduced motion. Returns { fails }.
import { openStation } from "./station-page.mjs";
import { WORLD } from "./home-states.mjs";

const SCENES = {
  spread: { i: 2, state: "spread", cur: "frame.S03", set: (w) => {
    const S = window.__st, st = S.ST; w.adults(1); st.mibis[0].portrait = { state: "delivered" };   // Loika: a mibi that sat for a portrait
    st.knownIds = ["S01", "S02", "S03", "S09"]; st.metIds = ["S04"]; S.seedAdults("S09", 9, 1); S.fillGuide("S01", 0.3); S.fillGuide("S02", 0); S.fillGuide("S03", 0.55); S.fillGuide("S09", 1);
    for (const m of st.mibis) m.paint = { state: "landed" }; } },
  "spread-empty": { i: 0, state: "spread", cur: "frame.S01", set: () => {} },
  "spread-complete": { i: 8, state: "spread", cur: "frame.S09", set: (w) => {
    const S = window.__st, st = S.ST; S.seedAdults("S09", 9, 1); for (const m of st.mibis) { m.paint = { state: "landed" }; m.portrait = { state: "delivered" }; } st.knownIds = ["S09"]; S.fillGuide("S09", 1); } },
  book: { i: 2, state: "notBuilt", cur: undefined, press: { screen: "library", target: "frame.S03", verb: "confirm" }, set: (w) => {
    const S = window.__st, st = S.ST; st.knownIds = ["S01", "S02", "S03"]; S.fillGuide("S03", 0.55); } },
};
async function enter(page, sc) {
  await page.evaluate(([setSrc, spec]) => {
    const w = window.__world; w.reset(); eval(`(${setSrc})`)(w); const S = window.__st; S.UI.idle = false; S.settings.light = "day"; S.UI.lib.f = "spread"; S.UI.lib.page = 0; S.UI.lib.i = spec.i;
    S.goto("library"); S.UI.lib.i = spec.i;
    if (spec.press) S.intent(spec.press);
  }, [sc.set.toString(), { i: sc.i, press: sc.press ?? null }]);
}
export async function libraryStates(visit) {
  const { page, fails, fail, close } = await openStation({ motion: false });
  await page.evaluate((src) => { window.__world = eval(src)(); }, `(${WORLD.toString()})`);
  try {
    for (const [name, sc] of Object.entries(SCENES)) {
      await enter(page, sc); await page.waitForTimeout(900);
      const u = await page.evaluate(() => ({ screen: window.__st.UI.screen, state: window.__st.props?.state, cur: window.__st.props?.focus?.cur, f: window.__st.UI.lib.f }));
      if (u.screen !== "library" || u.state !== sc.state) fail(`library-${name}: on ${u.screen}, ${u.state}`);
      if (sc.cur && u.cur !== sc.cur) fail(`library-${name}: the ring is on ${u.cur}, not ${sc.cur}`);
      await visit("library-" + name, page, fail);
    }
    const errs = await page.evaluate(() => ({ render: window.__st.renderErrors, face: window.__st.faceErrors })); if (errs.render.length || errs.face.length) fail("errors on the page: " + [...errs.render, ...errs.face].slice(0, 3).join(" | "));
  } finally { await close(); }
  return { fails };
}

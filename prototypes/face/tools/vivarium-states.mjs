// The Vivarium's whole in each of its capture points on the Station page (?test: the face in test mode), as the layer check and the goldens take them: `vivarium-docked` (seven mibis at home, the carried two asleep on the bed, eight bays, the ring on the first
// resident), `vivarium-away` (the Companion out: the bed shows its mark, the carried two are tiles with the outline glyph), `vivarium-mibi-out` (the same, the ring on an out mibi's tile), `vivarium-empty` (a fresh world's, six free bays, no ring),
// `vivarium-tile` (the ring on a housed tile), `vivarium-sleeper` (the ring on a sleeper) and `vivarium-twelve` (twelve residents, twelve compact tiles) `vivarium-empty-away` (the nest and its mark), `vivarium-docked-dawn|day|dusk|night` (the same scene in the four lights, for the art director) and, on a virtual clock with motion, `vivarium-walk-8000ms` (twelve walking, 8000 ms in).
// Each is reached by the page's own state and asserted (screen, state, ring) before `visit(name, page, fail)` is called. Taken with reduced motion (the walk at its start), the last on a virtual clock. Returns { fails }.
import { openStation } from "./station-page.mjs";
import { WORLD } from "./home-states.mjs";

const SCENES = {
  docked:  { f: null, state: "rest", set: (w) => { w.bays(8); w.adults(4); w.young(3); w.carry([0, 1]); } },
  away:    { f: null, state: "rest", set: (w) => { w.bays(8); w.adults(4); w.young(3); w.carry([0, 1]); w.away(); } },
  "mibi-out": { f: "tile:0", state: "rest", set: (w) => { w.bays(8); w.adults(4); w.young(3); w.carry([0, 1]); w.away(); } },
  empty:   { f: null, state: "empty", set: (w) => { w.bays(6); } },
  tile:    { f: "tile:3", state: "rest", set: (w) => { w.bays(8); w.adults(4); w.young(3); w.carry([0, 1]); } },
  sleeper: { f: "resident:1", state: "rest", set: (w) => { w.bays(8); w.adults(4); w.young(3); w.carry([0, 1]); } },
  twelve:  { f: null, state: "rest", set: (w) => { w.bays(12); w.adults(12); window.__st.ST.mibis.forEach((m, i) => { m.id = [1075, 188, 479, 7, 191, 2808, 2, 2135, 3151, 5426, 5138, 2486][i]; }); } },   // ids whose start seeds (hash(id)) put the twelve across the 992 px walk band, 79 px apart
  "empty-away": { f: null, state: "empty", set: (w) => { w.bays(6); w.away(); } },
  "docked-dawn":  { f: null, state: "rest", light: "dawn",  set: (w) => { w.bays(8); w.adults(4); w.young(3); w.carry([0, 1]); } },
  "docked-day":   { f: null, state: "rest", light: "day",   set: (w) => { w.bays(8); w.adults(4); w.young(3); w.carry([0, 1]); } },
  "docked-dusk":  { f: null, state: "rest", light: "dusk",  set: (w) => { w.bays(8); w.adults(4); w.young(3); w.carry([0, 1]); } },
  "docked-night": { f: null, state: "rest", light: "night", set: (w) => { w.bays(8); w.adults(4); w.young(3); w.carry([0, 1]); } },
  // fix 14 (§14.4): capture states, not goldens: the vivarium-docked seed with a juvenile resident focused, one a light; its ring crosses the dark grain and the lit moss (the 2 px floor, layer-check rule F2; the CD's frames)
  ...Object.fromEntries(["dawn", "day", "dusk", "night"].map((l) => ["resident-focused-" + l, { f: "resident:4", state: "rest", light: l, captureOnly: true, set: (w) => { w.bays(8); w.adults(4); w.young(3); w.carry([0, 1]); } }])),
};
async function enter(page, sc) {
  await page.evaluate(([setSrc, f, light]) => {
    const w = window.__world; w.reset(); eval(`(${setSrc})`)(w); const S = window.__st; S.UI.idle = false; S.settings.light = light ?? "day";   // null: the page's own light (the clock, fixed to day in test mode); the four lights by hand for the art director's capture points
    S.UI.viv.f = f ? (f.startsWith("tile:") ? "tile." : "resident.") + S.ST.mibis[+f.slice(f.indexOf(":") + 1)].id : null; S.UI.hab.id = null; S.goto("vivarium"); if (f) S.UI.viv.f = (f.startsWith("tile:") ? "tile." : "resident.") + S.ST.mibis[+f.slice(f.indexOf(":") + 1)].id;
  }, [sc.set.toString(), sc.f, sc.light ?? null]);
}
export async function vivariumStates(visit, { motion = false, timed = true } = {}) {
  const r = await still(visit); if (motion || !timed) return r;
  const t = await walk(visit); return { fails: [...r.fails, ...t.fails] };
}
async function still(visit) {
  const { page, fails, fail, close } = await openStation({ motion: false });
  await page.evaluate((src) => { window.__world = eval(src)(); }, `(${WORLD.toString()})`);
  try {
    for (const [name, sc] of Object.entries(SCENES)) {
      await enter(page, sc); await page.waitForTimeout(900);
      const u = await page.evaluate(() => ({ screen: window.__st.UI.screen, state: window.__st.props?.state, cur: window.__st.props?.focus?.cur, n: window.__st.props?.regions?.tiles?.items?.length }));
      if (u.screen !== "vivarium" || u.state !== sc.state) fail(`vivarium-${name}: on ${u.screen}, ${u.state}`);
      await visit("vivarium-" + name, page, fail, sc.captureOnly ? { captureOnly: true } : undefined);
    }
    const errs = await page.evaluate(() => ({ render: window.__st.renderErrors, face: window.__st.faceErrors })); if (errs.render.length || errs.face.length) fail("errors on the page: " + [...errs.render, ...errs.face].slice(0, 3).join(" | "));
  } finally { await close(); }
  return { fails };
}
async function walk(visit) {
  const { page, fails, fail, step, close } = await openStation({ motion: true, clock: true });
  await page.evaluate((src) => { window.__world = eval(src)(); }, `(${WORLD.toString()})`);
  try {
    await enter(page, SCENES.twelve); await step(40); await step(8000);
    const u = await page.evaluate(() => ({ screen: window.__st.UI.screen, n: window.__st.props?.regions?.residents?.length })); if (u.screen !== "vivarium" || u.n !== 12) fail("vivarium-walk-8000ms: " + JSON.stringify(u));
    await visit("vivarium-walk-8000ms", page, fail);
    // Station M1: the moving household on its stand-in cells under the developer switch (S01 adult ×6, S01 juvenile ×5, S05 juvenile ×1), the Station time noon, 8000 ms in
    await page.evaluate(() => { const w = window.__world, S = window.__st; w.reset(); w.bays(12); w.adults(6); w.young(5); const st = S.ST, k = st.mibis.length; S.seedAdults("S05", 9, 1); for (const m of st.mibis.slice(k)) { m.born = st.turn; m.paint = { state: "landed" }; }
      S.settings.motionSets = true; S.settings.stationTime = "12:00"; S.UI.idle = false; S.UI.hab.id = null; S.UI.viv.f = "tile." + st.mibis[0].id; S.goto("vivarium"); S.UI.viv.f = "tile." + st.mibis[0].id; });
    await step(40); await step(8000);
    { const m = await page.evaluate(() => ({ screen: window.__st.UI.screen, moving: (window.__st.props?.regions?.residents ?? []).filter((r) => r.moving).length })); if (m.screen !== "vivarium" || m.moving !== 12) fail("vivarium-moving-8000ms: " + JSON.stringify(m)); }
    await visit("vivarium-moving-8000ms", page, fail);
    await page.evaluate(() => { window.__st.settings.motionSets = false; window.__st.settings.stationTime = null; });
    const errs = await page.evaluate(() => ({ render: window.__st.renderErrors, face: window.__st.faceErrors })); if (errs.render.length || errs.face.length) fail("errors on the page: " + [...errs.render, ...errs.face].slice(0, 3).join(" | "));
  } finally { await close(); }
  return { fails };
}

// Idle in each of its capture points on the Station page (?test: the face in test mode), as the layer check and the goldens take them: `idle-docked` (the carried set asleep on the bed), `idle-away` (the Companion's mark, nothing drawn
// for it until its master), `idle-none` (the nest alone), each with the line frame.json idle.strings.order gives, and `idle-walk-8000ms` (twelve residents walking, 8000 ms of the face's clock into Idle, the reference of the three builds).
// The still points are taken with reduced motion; the walk on a virtual clock with motion. Each is reached by the page's own state (Idle on the screen under it) and asserted before `visit(name, page, fail)` is called. Returns { fails }.
import { openStation } from "./station-page.mjs";
import { WORLD } from "./home-states.mjs";

const SCENES = {
  docked: { line: "two crates wait in the bay", set: (w) => { w.adults(4); w.young(2); w.carry([0, 1]); w.crates(2); } },
  away:   { line: /^\S+ is out with the Companion$/, set: (w) => { w.adults(4); w.young(2); w.carry([0]); w.away(); } },
  none:   { line: "a bud is growing", set: (w) => { w.adults(3); w.bud(false); } },
  empty:  { line: "", set: (w) => { w.adults(2); } },
  twelve: { line: "", timed: true, set: (w) => { w.bays(12); w.adults(12); } },
};
async function enter(page, sc) {
  await page.evaluate(([setSrc]) => { const w = window.__world; w.reset(); eval(`(${setSrc})`)(w); const S = window.__st; S.UI.home.f = "room"; S.goto("home"); S.UI.idle = true; }, [sc.set.toString()]);
}
export async function idleStates(visit, { motion = false, timed = true } = {}) {
  const r = await still(visit); if (motion || !timed) return r;
  const t = await walk(visit); return { fails: [...r.fails, ...t.fails] };
}
async function still(visit) {
  const { page, fails, fail, close } = await openStation({ motion: false });
  await page.evaluate((src) => { window.__world = eval(src)(); }, `(${WORLD.toString()})`);
  try {
    for (const [name, sc] of Object.entries(SCENES)) {
      if (sc.timed) continue;
      await enter(page, sc); await page.waitForTimeout(900);
      const u = await page.evaluate(() => ({ idle: window.__st.UI.idle, props: window.__st.props && { idle: window.__st.props.idle, line: window.__st.props.frame?.idle?.line, bed: window.__st.props.regions?.bed?.state } }));
      const bed = { docked: "docked", away: "away", none: "none", empty: "none" }[name];
      if (!u.idle || !u.props?.idle || (sc.line instanceof RegExp ? !sc.line.test(u.props.line) : u.props.line !== sc.line) || (name !== "empty" && name !== "none" ? u.props.bed !== bed : false)) fail(`idle-${name}: ${JSON.stringify(u)}`);
      await visit("idle-" + name, page, fail);
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
    const u = await page.evaluate(() => ({ idle: window.__st.UI.idle, n: window.__st.props?.regions?.residents?.length })); if (!u.idle || u.n !== 12) fail("idle-walk-8000ms: " + JSON.stringify(u));
    await visit("idle-walk-8000ms", page, fail);
    const errs = await page.evaluate(() => ({ render: window.__st.renderErrors, face: window.__st.faceErrors })); if (errs.render.length || errs.face.length) fail("errors on the page: " + [...errs.render, ...errs.face].slice(0, 3).join(" | "));
  } finally { await close(); }
  return { fails };
}

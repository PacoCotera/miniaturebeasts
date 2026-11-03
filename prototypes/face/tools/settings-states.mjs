// The hold ring in each of its capture points on the Station page (?test): the ring drawn over a screen that is not built yet (a calm ground), with the developer setting realmSleep on and UI.hold set, as a plate that holds
// ✓ will set them. ✓ is pressed and released through the page's own keys; the clock is virtual, so a frame is taken at an exact instant: `hold-0ms`, `hold-1000ms`, `hold-2000ms`, `hold-3000ms` (full, the intent said),
// `hold-release-150ms` (✓ let go at 1500 ms, 150 ms later), and with reduced motion `hold-quarter-1` to `hold-quarter-3` (the fill in quarters). Returns { fails }.
import { openStation } from "./station-page.mjs";

async function arm(page, step) {
  await page.evaluate(() => { const S = window.__st; S.settings.realmSleep = true; S.UI.hold = true; S.UI.idle = false; S.goto("cross"); });
  await step(400);
  const u = await page.evaluate(() => ({ screen: window.__st.UI.screen, hold: !!window.__st.props?.frame?.hold })); return u;
}
const press = (page) => page.evaluate(() => window.__st.act("confirm"));
const lift = (page) => page.evaluate(() => window.__st.release("confirm"));
const said = (page) => page.evaluate(() => window.__st.said().filter((m) => m.verb === "confirm:held").length);
async function run(visit, { motion, points }) {
  const { page, fails, fail, step, close } = await openStation({ motion, clock: true });
  try {
    const u = await arm(page, step); if (u.screen !== "cross" || !u.hold) fail("the ring is not armed: " + JSON.stringify(u));
    await page.evaluate(() => window.__st.said());
    await press(page); let t = 0;
    for (const p of points) {
      if (p.liftAt != null) { await step(p.liftAt - t); t = p.liftAt; await lift(page); }   // ✓ let go at liftAt, the point taken at `at`
      if (p.at > t) await step(p.at - t); t = p.at;
      await visit(p.name, page, fail);
      if (p.said != null) { const n = await said(page); if (n !== p.said) fail(`${p.name}: confirm:held said ${n} times, expected ${p.said}`); }
    }
    const errs = await page.evaluate(() => ({ render: window.__st.renderErrors, face: window.__st.faceErrors })); if (errs.render.length || errs.face.length) fail("errors on the page: " + [...errs.render, ...errs.face].slice(0, 3).join(" | "));
  } finally { await close(); }
  return { fails };
}
export async function settingsStates(visit) {
  const a = await run(visit, { motion: true, points: [{ name: "hold-0ms", at: 0, said: 0 }, { name: "hold-1000ms", at: 1000, said: 0 }, { name: "hold-2000ms", at: 2000, said: 0 }, { name: "hold-3000ms", at: 3000, said: 1 }] });
  const b = await run(visit, { motion: true, points: [{ name: "hold-release-150ms", at: 1650, liftAt: 1500, said: 0 }] });
  const c = await run(visit, { motion: false, points: [{ name: "hold-quarter-1", at: 800, said: 0 }, { name: "hold-quarter-2", at: 1600, said: 0 }, { name: "hold-quarter-3", at: 2400, said: 0 }] });
  return { fails: [...a.fails, ...b.fails, ...c.fails] };
}

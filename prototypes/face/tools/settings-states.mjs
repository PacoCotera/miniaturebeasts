// The hold ring in each of its capture points on the Station page (?test): the ring drawn over a screen that is not built yet (a calm ground), with the developer setting realmSleep on and UI.hold set, as a plate that holds
// ✓ will set them. ✓ is pressed and released through the page's own keys; the clock is virtual, so a frame is taken at an exact instant: `hold-0ms`, `hold-1000ms`, `hold-2000ms`, `hold-3000ms` (full, the intent said),
// and Settings itself (settings.json) with the developer setting realmSleep on: each row focused (`settings-realm`, `settings-companion`, `settings-sleeping-none`), the sleep row focused with the Companion docked and keyed, lifted, and docked with no key the Station trusts.
// `hold-release-150ms` (✓ let go at 1500 ms, 150 ms later), and with reduced motion `hold-quarter-1` to `hold-quarter-3` (the fill in quarters). Returns { fails }.
import { openStation } from "./station-page.mjs";
import { WORLD } from "./home-states.mjs";

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
  const d = await screens(visit);
  return { fails: [...a.fails, ...b.fails, ...c.fails, ...d.fails] };
}

// Settings: the scene is the page's own state (a realm began on 4 Nov 2026 with three regions, a few mibis and pods, a Companion A the Station knows), the developer setting on, the ring on a row; reduced motion, the clock and the date pinned
const SCREENS = [
  { name: "settings-realm", f: "realm", docked: true, key: true },
  { name: "settings-companion", f: "companion", docked: true, key: true },
  { name: "settings-sleeping-none", f: "sleeping", docked: true, key: true },
  { name: "settings-sleep-docked", f: "sleep", docked: true, key: true },
  { name: "settings-sleep-lifted", f: "sleep", docked: false, key: true },
  { name: "settings-cannot-sign", f: "sleep", docked: true, key: false },
];
async function screens(visit) {
  const { page, fails, fail, close } = await openStation({ motion: false });
  await page.evaluate((src) => { window.__world = eval(src)(); }, `(${WORLD.toString()})`);
  try {
    for (const sc of SCREENS) {
      await page.evaluate(([name, f, docked, key]) => {
        const w = window.__world; w.reset(); w.adults(5); w.young(2); w.pods(3); w.seen();
        const S = window.__st, sv = S.SV; sv.v = 9; sv.wid = sv.wid || "wtest00001"; sv.began = Date.UTC(2026, 10, 4, 12); sv.turn = 41; S.ST.turn = 41; sv.regions = [{ id: "g1" }, { id: "g2" }, { id: "g3" }]; w.persist();
        const map = JSON.parse(localStorage.getItem("mb-station-companions")); const me = map.known.find((k) => k.id === map.active); me.name = "Companion A"; me.at = Date.UTC(2026, 10, 4, 12);
        if (key) { me.pub = "A".repeat(43); delete me.pubMismatch; } else delete me.pub;
        localStorage.setItem("mb-station-companions", JSON.stringify(map));
        S.ST.dock = docked ? { docked: true, at: 1 } : { docked: false, at: 1 };
        S.settings.realmSleep = true; S.settings.stationDate = "2026-10-17"; S.settings.stationTime = "12:00"; S.settings.light = "day";
        S.UI.idle = false; S.UI.lastInput = performance.now(); S.goto("settings"); S.UI.settings.f = f;
      }, [sc.name, sc.f, sc.docked, sc.key]);
      await page.waitForTimeout(600);
      const u = await page.evaluate(() => ({ screen: window.__st.UI.screen, f: window.__st.props?.focus?.cur }));
      if (u.screen !== "settings") fail(`${sc.name}: on ${u.screen}`);
      if (u.f !== sc.f) fail(`${sc.name}: the ring is on ${u.f}, not ${sc.f}`);
      await visit(sc.name, page, fail);
    }
    const errs = await page.evaluate(() => ({ render: window.__st.renderErrors, face: window.__st.faceErrors })); if (errs.render.length || errs.face.length) fail("errors on the page: " + [...errs.render, ...errs.face].slice(0, 3).join(" | "));
  } finally { await close(); }
  return { fails };
}

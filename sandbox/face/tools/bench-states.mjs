// The Probe bench in each of its capture points on the Station page (?test: the face in test mode), as the layer check and the goldens take them: `bench` (docked, tier 1, two of the three plates whole, the ring on the plates, the switch off,
// ⚡ 14 ◆ 6), `bench-panel-upgrade` (affordable, ✓ on the slot opened the Fit the upgrade? panel, the switch on; `bench-armed` is retired with the arm, T-20261016-53), `bench-away` (the Probe away, the switch off, the ring on the switch) and `bench-tier2` (four whole plates, the upgrade fitted, the ring on the slot,
// the switch on). Each is reached by the page's own state and asserted (screen, state, the plates, the switch, the slot, the ring) before `visit(name, page, fail)` is called. Taken with reduced motion. Returns { fails }.
import { openStation } from "./station-page.mjs";
import { WORLD } from "./home-states.mjs";

const SCENES = {
  bench: { ui: { f: "plates", install: false }, state: "docked", cur: "plates", plates: { tier: 1, whole: 2 }, sw: "off", slot: "ready", set: () => {
    const S = window.__st, st = S.ST; st.e = 14; st.d = 6; st.s = 0; st.dock = { docked: true, at: 1 }; st.probe = { shield: 2, smax: 3, tier: 1, seq: (S.SV.probeSeen || 0) + 1 }; st.mendFull = false; Object.assign(S.UI.bench, { f: "plates", install: false }); } },
  "bench-panel-upgrade": { ui: { f: "slot", install: false }, panel: true, state: "docked", cur: "slot", plates: { tier: 1, whole: 2 }, sw: "on", slot: "ready", set: () => {
    const S = window.__st, st = S.ST; st.e = 14; st.d = 6; st.s = 0; st.dock = { docked: true, at: 1 }; st.probe = { shield: 2, smax: 3, tier: 1, seq: (S.SV.probeSeen || 0) + 1 }; st.mendFull = true; Object.assign(S.UI.bench, { f: "slot", install: false }); } },
  "bench-away": { ui: { f: "switch", install: false }, state: "away", cur: "switch", plates: null, sw: "off", slot: "dim", set: () => {
    const S = window.__st, st = S.ST; st.e = 14; st.d = 6; st.s = 0; st.dock = { docked: false, at: 1 }; st.probe = { shield: 3, smax: 3, tier: 1, seq: (S.SV.probeSeen || 0) + 1 }; st.mendFull = false; Object.assign(S.UI.bench, { f: "switch", install: false }); } },
  "bench-tier2": { ui: { f: "slot", install: false }, state: "docked", cur: "slot", plates: { tier: 2, whole: 4 }, sw: "on", slot: "fitted", set: () => {
    const S = window.__st, st = S.ST; st.e = 14; st.d = 6; st.s = 0; st.dock = { docked: true, at: 1 }; st.probe = { shield: 4, smax: 4, tier: 2, seq: (S.SV.probeSeen || 0) + 1 }; st.mendFull = true; Object.assign(S.UI.bench, { f: "slot", install: false }); } },
};
async function enter(page, sc) {
  await page.evaluate(([setSrc, spec]) => {
    const w = window.__world; w.reset(); eval(`(${setSrc})`)(); const S = window.__st; S.UI.idle = false; S.settings.light = "day"; S.goto("bench"); Object.assign(S.UI.bench, spec.ui); S.UI.panel = spec.panel ? { screen: "bench", id: "fitUpgrade", focus: "" } : null;   // ✓ on the slot has opened the panel
  }, [sc.set.toString(), { ui: sc.ui, panel: !!sc.panel }]);
}
export async function benchStates(visit) {
  const { page, fails, fail, close } = await openStation({ motion: false });
  await page.evaluate((src) => { window.__world = eval(src)(); }, `(${WORLD.toString()})`);
  try {
    for (const [name, sc] of Object.entries(SCENES)) {
      await enter(page, sc); await page.waitForTimeout(900);
      const u = await page.evaluate(() => { const p = window.__st.props; return { screen: window.__st.UI.screen, state: p?.state, cur: p?.focus?.cur, plates: p?.regions?.plates ?? null, sw: p?.regions?.switch?.state, slot: p?.regions?.slot?.state, armed: p?.focus?.armed ?? null }; });
      if (u.screen !== "bench" || u.state !== sc.state) fail(`${name}: on ${u.screen}, ${u.state}`);
      if (u.cur !== sc.cur) fail(`${name}: the ring is on ${u.cur}, not ${sc.cur}`);
      if (JSON.stringify(u.plates) !== JSON.stringify(sc.plates)) fail(`${name}: the plates are ${JSON.stringify(u.plates)}, not ${JSON.stringify(sc.plates)}`);
      if (u.sw !== sc.sw || u.slot !== sc.slot) fail(`${name}: the switch is ${u.sw} and the slot ${u.slot}, not ${sc.sw} and ${sc.slot}`);
      await visit(name, page, fail);
    }
    const errs = await page.evaluate(() => ({ render: window.__st.renderErrors, face: window.__st.faceErrors })); if (errs.render.length || errs.face.length) fail("errors on the page: " + [...errs.render, ...errs.face].slice(0, 3).join(" | "));
  } finally { await close(); }
  return { fails };
}

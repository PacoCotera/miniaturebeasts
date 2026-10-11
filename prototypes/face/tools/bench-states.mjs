// The Probe bench in each of its capture points on the Station page (?test: the face in test mode), as the layer check and the goldens take them: `bench` (wireframe 11: docked, tier 1, two of the three plates whole, the ring on the plates,
// the switch off, ⚡ 14 ◆ 6), `bench-armed` (11b: affordable, the upgrade armed, the ring on the slot, the switch on), `bench-away` (11c: the Probe away, the switch off, the ring on the switch) and `bench-tier2` (11d: four whole plates,
// the upgrade fitted, the ring on the slot, the switch on). Each is reached by the page's own state and asserted (screen, state, the plates, the switch, the slot, the ring) before `visit(name, page, fail)` is called. Taken with reduced
// motion. Returns { fails }.
import { openStation } from "./station-page.mjs";
import { WORLD } from "./home-states.mjs";

const SCENES = {
  bench: { ui: { f: "plates", arm: 0, install: false }, state: "docked", cur: "plates", plates: { tier: 1, whole: 2 }, sw: "off", slot: "ready", set: () => {
    const S = window.__st, st = S.ST; st.e = 14; st.d = 6; st.s = 0; st.dock = { docked: true, at: 1 }; st.probe = { shield: 2, smax: 3, tier: 1, seq: (S.SV.probeSeen || 0) + 1 }; st.mendFull = false; Object.assign(S.UI.bench, { f: "plates", arm: 0, install: false }); } },
  "bench-armed": { ui: { f: "slot", arm: 1, install: false }, state: "docked", cur: "slot", plates: { tier: 1, whole: 2 }, sw: "on", slot: "armed", set: () => {
    const S = window.__st, st = S.ST; st.e = 14; st.d = 6; st.s = 0; st.dock = { docked: true, at: 1 }; st.probe = { shield: 2, smax: 3, tier: 1, seq: (S.SV.probeSeen || 0) + 1 }; st.mendFull = true; Object.assign(S.UI.bench, { f: "slot", arm: 1, install: false }); } },
  "bench-away": { ui: { f: "switch", arm: 0, install: false }, state: "away", cur: "switch", plates: null, sw: "off", slot: "dim", set: () => {
    const S = window.__st, st = S.ST; st.e = 14; st.d = 6; st.s = 0; st.dock = { docked: false, at: 1 }; st.probe = { shield: 3, smax: 3, tier: 1, seq: (S.SV.probeSeen || 0) + 1 }; st.mendFull = false; Object.assign(S.UI.bench, { f: "switch", arm: 0, install: false }); } },
  "bench-tier2": { ui: { f: "slot", arm: 0, install: false }, state: "docked", cur: "slot", plates: { tier: 2, whole: 4 }, sw: "on", slot: "fitted", set: () => {
    const S = window.__st, st = S.ST; st.e = 14; st.d = 6; st.s = 0; st.dock = { docked: true, at: 1 }; st.probe = { shield: 4, smax: 4, tier: 2, seq: (S.SV.probeSeen || 0) + 1 }; st.mendFull = true; Object.assign(S.UI.bench, { f: "slot", arm: 0, install: false }); } },
};
async function enter(page, sc) {
  await page.evaluate(([setSrc, spec]) => {
    const w = window.__world; w.reset(); eval(`(${setSrc})`)(); const S = window.__st; S.UI.idle = false; S.settings.light = "day"; S.goto("bench"); Object.assign(S.UI.bench, spec.ui);
  }, [sc.set.toString(), { ui: sc.ui }]);
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

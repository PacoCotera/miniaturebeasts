// Pods in each of its states on the Station page (?test: the face in test mode), as the layer check and the goldens take them: a fresh crate of two S04 pods docked and opened, then the eight states in order, each reached
// by the page's own hooks and asserted (screen, view, focus, cmp) before `visit(name, page)` is called. Returns { fails }.
import { openStation } from "./station-page.mjs";

export async function podsStates(visit) {
  const { page, fails, fail, close } = await openStation();
  await page.evaluate(() => window.__st.seedCrate("S04", 2, 4101)); await page.evaluate(() => window.__st.act("dock")); await page.waitForTimeout(300);
  await page.evaluate(() => window.__st.openBay()); await page.waitForTimeout(3300); await page.evaluate(() => window.__st.unlock());
  const pods = await page.evaluate(() => window.__st.ST.tray.filter((p) => p.species === "S04" && !p.idd).map((p) => p.id));   // a fresh crate of two pods of one species, as journey.mjs compareShot does
  if (pods.length !== 2) fail("no two pods of one species in the rack");
  const ui = () => page.evaluate(() => ({ screen: window.__st.UI.screen, view: window.__st.UI.pods.view, cur: window.__st.UI.pods.cur, focus: window.__st.UI.pods.focus.cur, cmp: !!window.__st.UI.pods.cmp }));
  const at = async (name, want) => {
    await page.waitForTimeout(700);
    const u = await ui(); for (const [k, v] of Object.entries(want)) if (u[k] !== v) fail(`${name}: ${k} is ${JSON.stringify(u[k])}, wanted ${JSON.stringify(v)}`);
    await visit(name, page, fail);
  };
  const go = async (id, f, view, ci) => { for (let i = 0; i < 2; i++) { await page.evaluate(([id, f, view, ci]) => window.__st.podsGo(id, f, view, ci), [id, f, view, ci]); await page.waitForTimeout(300); } };   // twice: the targets of the state are known after its first frame
  try {
    await go(pods[0], "place.0", "collection"); await at("collection", { screen: "pods", view: "collection", focus: "place.0" });
    await go(pods[0], "pod", "overview"); await at("overview, unidentified", { view: "overview", focus: "pod" });
    await page.evaluate((ids) => { for (const id of ids) window.__st.skipRead(id); }, pods);
    await go(pods[0], "pod", "overview"); await at("overview, identified, pod focused", { view: "overview", focus: "pod" });
    await go(pods[0], "kin.0", "overview"); await at("overview, kin focused", { view: "overview", focus: "kin.0", cmp: false });
    await go(pods[0], "hatch", "overview"); await at("overview, hatch focused", { view: "overview", focus: "hatch" });
    await go(pods[0], "rail.0", "overview"); await at("overview, a rail tab focused", { view: "overview", focus: "rail.0" });
    await go(pods[0], "rail.0", "chapter", 0); await at("chapter page", { view: "chapter", focus: "rail.0" });
    await go(pods[0], "kin.0", "overview"); await page.evaluate(() => window.__st.act("confirm")); await at("compare", { screen: "pods", cmp: true });
    const errs = await page.evaluate(() => ({ render: window.__st.renderErrors, face: window.__st.faceErrors })); if (errs.render.length || errs.face.length) fail("errors on the page: " + [...errs.render, ...errs.face].slice(0, 3).join(" | "));
  } finally { await close(); }
  return { fails };
}

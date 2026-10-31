// Pods in each of its states on the Station page (?test: the face in test mode), as the layer check and the goldens take them: the pod inventory (the pod inventory's design and every state it names),
// its filter tray and Find, the reading screen v2 (the reading screen spec: the six signed states, a chapter open, not enough Data, a sealed chapter, a sealed pod, the stamp moment and view)
// and Compare. Each scene is set by the page's own hooks (a fresh tray of seeded pods, the materials, the world turn), reached through window.__st.podsAt and
// asserted (screen, view, focus) before `visit(name, page)` is called. Returns { fails }.
import { openStation } from "./station-page.mjs";

export async function podsStates(visit) {
  const { page, fails, fail, close } = await openStation();
  const ui = () => page.evaluate(() => ({ screen: window.__st.UI.screen, view: window.__st.UI.pods.view, focus: window.__st.UI.pods.focus.cur, cmp: !!window.__st.UI.pods.cmp }));
  const at = async (name, want) => {
    await page.waitForTimeout(700);
    const u = await ui(); for (const [k, v] of Object.entries(want)) if (u[k] !== v) fail(`${name}: ${k} is ${JSON.stringify(u[k])}, wanted ${JSON.stringify(v)}`);
    await visit(name, page, fail);
  };
  // a scene: the tray emptied, `pods` seeded ([species, seed, identify?, chapters read]), the materials and the world turn set; then the Pods UI as `to` says (podsAt), twice (the targets are known after the first frame)
  const scene = (pods, o = {}) => page.evaluate(([pods, o]) => window.__st.podsScene(pods, o), [pods, o]);
  const to = async (o) => { for (let i = 0; i < 2; i++) { await page.evaluate((o) => window.__st.podsAt(o), o); await page.waitForTimeout(250); } };
  const key = async (k) => { await page.evaluate((k) => window.__st.act(k), k); await page.waitForTimeout(250); };
  const TWELVE = [["S01", 11, 1, 2], ["S01", 12, 1, 0], ["S02", 13, 1, 1], ["S01", 14, 0, 0], ["S03", 15, 1, 8], ["S02", 16, 1, 0], ["S04", 17, 1, 0], ["S01", 18, 1, 4], ["S02", 19, 0, 0], ["S03", 20, 1, 0], ["S04", 21, 1, 2], ["S01", 22, 1, 1]];
  try {
    // ---- the inventory ----
    await scene([]); await to({ view: "inventory", focus: "sort" }); await at("inventory, no pods", { screen: "pods", view: "inventory", focus: "sort" });
    await scene([["S01", 11, 0, 0]]); await to({ view: "inventory", focus: "card.0" }); await at("inventory, one sealed pod", { view: "inventory", focus: "card.0" });
    await scene(TWELVE, { goal: ["S01", 0] }); await to({ view: "inventory", focus: "card.0" }); await at("inventory, twelve pods", { view: "inventory", focus: "card.0" });
    await to({ view: "inventory", focus: "act.0" }); await at("inventory, the panel's first button", { view: "inventory", focus: "act.0" });
    await to({ view: "inventory", focus: "card.4", sort: "species" }); await at("inventory, sorted by species", { view: "inventory", focus: "card.4" });
    await to({ view: "inventory", focus: "card.0", chips: ["S02", "unread"] }); await at("inventory, filtered", { view: "inventory", focus: "card.0" });
    await to({ view: "filter", focus: "tchip.2.1", chips: ["S02"] }); await at("inventory, the filter tray", { view: "filter", focus: "tchip.2.1" });
    await to({ view: "inventory", focus: "chip.1", chips: ["S04", "sealed"] }); await at("inventory, no matches", { view: "inventory", focus: "chip.1" });   // the ring on the last chip, the one most likely undone (review round 2)
    await to({ view: "find", focus: "word.0", find: { letter: "L" } }); await at("inventory, find", { view: "find", focus: "word.0" });
    await scene(TWELVE, { turn: 9, s: 1 }); await to({ view: "inventory", focus: "act.2" }); await at("inventory, drying", { view: "inventory", focus: "act.2" });   // twelve turns from turn 1: four left, amber; ❀1 short of the ❀2
    await scene([["S01", 31, 1, 1], ["S02", 32, 1, 0], ["S01", 33, 1, 0], ["S03", 34, 1, 0]], { dried: 2 }); await to({ view: "inventory", focus: "card.0" }); await at("inventory, a pod dried", { view: "inventory", focus: "card.0" });
    await scene([["S01", 41, 1, 1]]); await to({ view: "inventory", focus: "act.4", ask: 0 }); await at("inventory, let it go asks", { view: "inventory", focus: "act.4" });
    await scene(Array.from({ length: 40 }, (_, i) => [["S01", "S02", "S03", "S04"][i % 4], 100 + i, i % 5 ? 1 : 0, i % 3])); await to({ view: "inventory", focus: "card.19", first: 5 }); await at("inventory, forty pods", { view: "inventory", focus: "card.19" });
    // ---- the reading screen v2 (the reading screen spec: the six signed states, then §2.6's and §2.7's) ----
    const R = (o) => ({ view: "room", bench: 0, ...o });
    await scene([["S01", 51, 1, 0], ["S01", 52, 1, 0]], { rich: true, e: 11, d: 11, s: 17 }); await to(R({ focus: "rail", lane: 0, at: "rail" })); await at("read, Loika fresh, Coat in hand", { view: "room", focus: "rail" });
    await to(R({ focus: "key", lane: 1, at: "right" })); await at("read, Face open, unread", { view: "room", focus: "key" });
    // the signed states of Face (the UI/UX decision of 2026-10-30, M2): a goal on Crown (the carried bare head), Face already read on another Loika (so this pod's Face lane glints and its leaf crest is a look new to the collection), the stamp taught
    await scene([["S01", 53, 1, 1], ["S01", 3, 1, 2]], { rich: true, e: 11, d: 11, s: 17, mate: "S01", fresh: true, taught: true, wish: { S01: { crown: "bare head" } } }); await to(R({ focus: "rail", lane: 1, at: "rail" })); await at("read, Coat read, Face in hand", { view: "room", focus: "rail" });
    await to(R({ focus: "key", lane: 1, at: "right" })); await key("confirm"); await page.waitForTimeout(1000); await at("read, Face after the read", { view: "room", focus: "plate.0" });
    await key("confirm"); await page.waitForTimeout(300); await at("read, the Crown detail", { view: "room", focus: "trait" });
    await scene([["S01", 54, 1, 2], ["S01", 52, 1, 1]], { rich: true, e: 11, d: 11, s: 17 }); await to(R({ focus: "rail", lane: 2, at: "rail" })); await at("read, Movement in hand, the sprout", { view: "room", focus: "rail" });
    // Data below the price (M1): the key dim, the reason in the foot, "Data comes as your mibis grow" beside it
    await scene([["S01", 55, 1, 0], ["S01", 52, 1, 1]], { rich: true, d: 0 }); await to(R({ focus: "key", lane: 0, at: "right" })); await at("read, not enough Data", { view: "room", focus: "key" });
    await scene([["S03", 61, 1, 2], ["S03", 62, 1, 1]], { rich: true, e: 11, d: 11, s: 17 }); await to(R({ focus: "rail", lane: 2, at: "rail" })); await at("read, Tuikis, Shape in hand", { view: "room", focus: "rail" });
    await scene([["S02", 71, 1, 3], ["S02", 72, 1, 1]], { rich: true, why: "a new species" }); await to(R({ focus: "rail", lane: 3, at: "rail" })); await at("read, a sealed chapter, the pod's reason", { view: "room", focus: "rail" });
    await scene([["S01", 81, 0, 0]]); await to(R({ focus: "key" })); await at("read, a sealed pod, Identify", { view: "room", focus: "key" });
    await scene([["S01", 91, 1, 0]], { firstRead: true }); await to(R({ focus: "key", lane: 0, at: "right" })); await key("confirm"); await page.waitForTimeout(2600); await at("read, the stamp moment", { view: "room", focus: "hold" });
    await key("back"); await page.waitForTimeout(600); await to(R({ focus: "rail", lane: 0, at: "rail" })); await key("up"); await page.waitForTimeout(800); await at("read, the stamp view", { view: "room", focus: "stamp" });
    await scene([["S01", 92, 1, 2], ["S01", 93, 1, 1]], { rich: true });     await to({ view: "inventory", focus: "card.0", cmp: 1 }); await at("compare", { screen: "pods", cmp: true });
    // the Compare rails' cases (the UI/UX decision of 2026-10-30, item 10): B, ▼ to a chapter that is the same with the difference in another; D, nothing read on both; a kin whose unread lane glints (the bracket on it)
    await scene([["S01", 92, 1, 2], ["S01", 96, 1, 2]], { rich: true }); await to({ view: "inventory", focus: "card.0", cmp: 1 }); await key("down"); await at("compare, the next chapter the same", { screen: "pods", cmp: true });
    await scene([["S01", 94, 1, 1], ["S01", 95, 1, 0]], { rich: true }); await to({ view: "inventory", focus: "card.0", cmp: 1 }); await at("compare, nothing read on both", { screen: "pods", cmp: true });
    await scene([["S01", 92, 1, 2], ["S01", 93, 1, 1]], { rich: true, fresh: true }); await to({ view: "inventory", focus: "card.0", cmp: 1 }); await key("down"); await at("compare, a kin's unread lane glints", { screen: "pods", cmp: true });
    const errs = await page.evaluate(() => ({ render: window.__st.renderErrors, face: window.__st.faceErrors })); if (errs.render.length || errs.face.length) fail("errors on the page: " + [...errs.render, ...errs.face].slice(0, 3).join(" | "));
  } finally { await close(); }
  return { fails };
}

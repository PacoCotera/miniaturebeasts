// The store screen (store.json) in each of its capture points on the Station page (?test: the face in test mode), as the goldens take them: `store-bench` (the Loika pod on the bench with Coat read, 9 Data in its store, the Put-in panel on 4),
// `store-bench-bar` (the ring on the bar, a read chapter under it), `store-bench-paid` (every chapter paid for: no Put-in panel), `store-teaser` (three chapters read while the Companion was out: the card that counts them) and
// `store-chapter` (the Face page: the close-up slot, the looks with their marks, FIRST TIME SEEN, the key to the marks, the promises) with `store-chapter-last` (the same page when it is the last of the show). Each is reached by the page's own hooks
// (podsScene seeds the pod and reads its chapters, podsAt puts it on the bench, then UI.store and goto) and asserted (screen, state, ring) before `visit(name, page, fail)` is called. Taken with reduced motion. Returns { fails }.
import { openStation } from "./station-page.mjs";

const SCENES = [
  { name: "store-bench", pods: [["S01", 51, 1, 1]], opts: { rich: true, d: 15, e: 11, s: 17 }, store: 9, ui: { view: "bench", from: "room", f: "put", amount: 4 }, state: "bench", cur: "put" },
  { name: "store-bench-bar", pods: [["S01", 51, 1, 1]], opts: { rich: true, d: 15, e: 11, s: 17 }, store: 9, ui: { view: "bench", from: "room", f: "bar", i: 0 }, state: "bench", cur: "bar" },
  { name: "store-bench-paid", pods: [["S01", 51, 1, 1]], opts: { rich: true, d: 15, e: 11, s: 17 }, store: 99, ui: { view: "bench", from: "room", f: "bar" }, state: "bench", cur: "bar" },
  { name: "store-teaser", pods: [["S01", 51, 1, 3]], opts: { rich: true, d: 6, e: 11, s: 17 }, store: 0, ui: { view: "teaser", from: "home", teaser: { chapters: [{ id: "face", firsts: 2 }, { id: "shape", firsts: 2 }] }, show: ["face", "shape"] }, state: "teaser", cur: "go" },
  { name: "store-chapter", pods: [["S01", 53, 1, 2]], opts: { rich: true, d: 6, e: 11, s: 17, fresh: true }, store: 0, ui: { view: "chapter", from: "home", chapter: "face", show: ["shape"] }, state: "chapter", cur: "" },
  { name: "store-chapter-last", pods: [["S01", 53, 1, 2]], opts: { rich: true, d: 6, e: 11, s: 17, fresh: true }, store: 0, ui: { view: "chapter", from: "home", chapter: "face", show: [] }, state: "chapter", cur: "" },
];

export async function storeStates(visit) {
  const { page, fails, fail, close } = await openStation({ motion: false });
  try {
    for (const sc of SCENES) {
      for (let i = 0; i < 2; i++) {
        await page.evaluate((sc) => {
          const S = window.__st; S.UI.lastInput = performance.now(); S.UI.idle = false; S.settings.light = "day";
          S.podsScene(sc.pods, sc.opts); S.podsAt({ view: "room", bench: 0, focus: "rail" });
          const p = S.ST.tray[0]; if (sc.store) p.store = { d: sc.store, ms: 0 }; else delete p.store;
          S.UI.store = { view: "bench", from: "room", f: null, amount: undefined, i: undefined, chapter: null, show: [], teaser: null, ...sc.ui }; S.goto("store");
        }, sc);
        await page.waitForTimeout(450);
      }
      const u = await page.evaluate(() => { const p = window.__st.props; return { screen: window.__st.UI.screen, state: p?.state, cur: p?.focus?.cur, put: !!p?.regions?.put, store: !!p?.regions?.store }; });
      if (u.screen !== "store" || u.state !== sc.state) fail(`${sc.name}: on ${u.screen}, ${u.state}`);
      if (u.cur !== sc.cur) fail(`${sc.name}: the ring is on ${JSON.stringify(u.cur)}, not ${JSON.stringify(sc.cur)}`);
      if (sc.name === "store-bench-paid" && u.put) fail(`${sc.name}: the Put-in panel shows with everything paid`);
      await visit(sc.name, page, fail);
    }
    const errs = await page.evaluate(() => ({ render: window.__st.renderErrors, face: window.__st.faceErrors })); if (errs.render.length || errs.face.length) fail("errors on the page: " + [...errs.render, ...errs.face].slice(0, 3).join(" | "));
  } finally { await close(); }
  return { fails };
}

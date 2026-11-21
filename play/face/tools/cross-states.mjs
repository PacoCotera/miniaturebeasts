// The Cross screen's goldens (cross.json): the splice as the face draws it from the Station's own props, on the page's state (reduced motion, the clock and the date pinned). Each scene is two adults of S01 (Loika, whose
// chapters are Coat, Face, Shape, Legs & tail, Movement and Stamina), what each parent has read, and the screen's state: the overview (every chapter at once) or one chapter (▼ walks them in ring order).
//   overview-read     both parents have read every chapter: the gates, seeds, tracks and bands, the modules open
//   overview-mixed    a parent has read less: the unread chapters frost with the words that say what to read, the dashed edge on the module of the parent who lacks it
//   overview-wish     a pinned look the pair can reach (the lit glint on its first row)
//   chapter-coat      the Coat chapter under the shared rail: buses, plates, gates and the four outcomes per trait
//   chapter-face      the Face chapter, a switch-heavy one
//   chapter-unread    a chapter one parent has not read: that parent's wires dashed, the child's slots frost, the words "read {parent}'s {chapter}"
//   family            direct kin: the head, the refusal and no seeds drawn
//   pricey            the pair cannot pay: the dimmed ✓ with the short figures
//   busy              the incubator is busy: the refusal in the notice and no ✓ cap
//   away              the partner is out with the Companion: its portrait dimmed, "away with you"
//   alone             no adult of its kind to pair
import { openStation } from "./station-page.mjs";
import { WORLD } from "./home-states.mjs";

const SCENES = [
  { name: "cross-overview-read", set: (S) => { const [a, b] = S.ST.mibis; a.read = b.read = S.chapters; S.UI.cross = { aId: a.id, bId: b.id, state: 0, fc: null, clash: [] }; } },
  { name: "cross-overview-mixed", set: (S) => { const [a, b] = S.ST.mibis; a.read = S.chapters.slice(0, 4); b.read = S.chapters.slice(0, 2); S.UI.cross = { aId: a.id, bId: b.id, state: 0, fc: null, clash: [] }; } },
  { name: "cross-overview-wish", set: (S) => { const [a, b] = S.ST.mibis; a.read = b.read = S.chapters; S.ST.wish = { S01: S.wishOf(a, b) }; S.UI.cross = { aId: a.id, bId: b.id, state: 0, fc: null, clash: [] }; } },
  { name: "cross-chapter-coat", set: (S) => { const [a, b] = S.ST.mibis; a.read = b.read = S.chapters; S.UI.cross = { aId: a.id, bId: b.id, state: 1, fc: null, clash: [] }; } },
  { name: "cross-chapter-face", set: (S) => { const [a, b] = S.ST.mibis; a.read = b.read = S.chapters; S.UI.cross = { aId: a.id, bId: b.id, state: 2, fc: null, clash: [] }; } },
  { name: "cross-chapter-shape", set: (S) => { const [a, b] = S.ST.mibis; a.read = b.read = S.chapters; S.UI.cross = { aId: a.id, bId: b.id, state: 3, fc: null, clash: [] }; } },
  { name: "cross-chapter-unread", set: (S) => { const [a, b] = S.ST.mibis; a.read = S.chapters.slice(0, 3); b.read = S.chapters.slice(0, 1); S.UI.cross = { aId: a.id, bId: b.id, state: 2, fc: null, clash: [] }; } },
  { name: "cross-chapter-wish", set: (S) => { const [a, b] = S.ST.mibis; a.read = b.read = S.chapters; S.ST.wish = { S01: S.wishOf(a, b) }; S.UI.cross = { aId: a.id, bId: b.id, state: S.wishChapter(a, b), fc: null, clash: [] }; } },
  { name: "cross-family", set: (S) => { S.siblings(); const [a, b] = S.ST.mibis.slice(-2); a.read = b.read = S.chapters; S.UI.cross = { aId: a.id, bId: b.id, state: 0, fc: null, clash: [] }; } },
  { name: "cross-pricey", set: (S) => { const [a, b] = S.ST.mibis; a.read = b.read = S.chapters; S.ST.e = 0; S.ST.s = 0; S.UI.cross = { aId: a.id, bId: b.id, state: 0, fc: null, clash: [] }; } },
  { name: "cross-busy", set: (S) => { const [a, b] = S.ST.mibis; a.read = b.read = S.chapters; S.ST.bud = { kind: "founder", species: "S01", start: Date.now(), minutes: 20 }; S.UI.cross = { aId: a.id, bId: b.id, state: 0, fc: null, clash: [] }; } },
  { name: "cross-away", set: (S) => { const [a, b] = S.ST.mibis; a.read = b.read = S.chapters; S.carry(b.id); S.UI.cross = { aId: a.id, bId: b.id, state: 0, fc: null, clash: [] }; } },
  { name: "cross-alone", set: (S) => { const [a] = S.ST.mibis; a.read = S.chapters; S.ST.mibis.splice(1); S.UI.cross = { aId: a.id, bId: null, state: 0, fc: null, clash: [] }; } },
  // no species frame has a sealed chapter today (the seal is a future gate): the last scenes shut Loika's Stamina by hand, the page's frame only, to draw the find and the words that say what opens it
  { name: "cross-sealed-overview", set: (S) => { const [a, b] = S.ST.mibis; S.seal(S); a.read = b.read = S.chapters.slice(0, 5); S.UI.cross = { aId: a.id, bId: b.id, state: 0, fc: null, clash: [] }; } },
  { name: "cross-sealed-chapter", set: (S) => { const [a, b] = S.ST.mibis; S.seal(S); a.read = b.read = S.chapters.slice(0, 5); S.UI.cross = { aId: a.id, bId: b.id, state: 6, fc: null, clash: [] }; } },
];

export async function crossStates(visit) {
  const { page, fails, fail, close } = await openStation({ motion: false });
  await page.evaluate((src) => { window.__world = eval(src)(); }, `(${WORLD.toString()})`);
  try {
    for (const sc of SCENES) {
      await page.evaluate(([setSrc]) => {
        const w = window.__world; w.reset(); w.adults(2); w.seen(); window.__st.ST.wish = {}; Object.assign(window.__st.ST, { e: 4, d: 3, s: 6 });
        const S = window.__st, helpers = {
          seal: (T) => { const c = S.frameOf("S01").chapters[5]; c.sealed = true; c.findKind = "crystal"; c.opensWith = "a crystal find"; void T; },
          ST: S.ST, UI: S.UI, frameOf: S.frameOf, chapters: S.frameOf("S01").chapters.map((c) => c.id),
          carry: (id) => { S.SV.carried = [id]; w.persist(); w.away(); },
          siblings: () => { S.seedSiblings("S01", 31); },
          wishOf: (a, b) => { const t = S.forecastOf(a.id, b.id).traits.find((q) => q.kind === "switch" && typeof q.seeds[0].look === "string"); return { [t.trait]: t.seeds[1].label }; },
          wishChapter: (a, b) => { const fc = S.forecastOf(a.id, b.id), t = fc.traits.find((q) => q.kind === "switch" && typeof q.seeds[0].look === "string"); return fc.chapters.findIndex((c) => c.traits.includes(t.trait)) + 1; },
        };
        eval(`(${setSrc})`)(helpers);
        S.settings.stationDate = "2026-10-17"; S.settings.stationTime = "12:00"; S.settings.light = "day"; S.UI.idle = false; S.UI.lastInput = performance.now(); S.goto("cross");
      }, [sc.set.toString()]);
      await page.waitForTimeout(700);
      const u = await page.evaluate(() => ({ screen: window.__st.UI.screen, state: window.__st.props?.state }));
      if (u.screen !== "cross") fail(`${sc.name}: on ${u.screen}`);
      await visit(sc.name, page, fail);
    }
    const errs = await page.evaluate(() => ({ render: window.__st.renderErrors, face: window.__st.faceErrors })); if (errs.render.length || errs.face.length) fail("errors on the page: " + [...errs.render, ...errs.face].slice(0, 3).join(" | "));
  } finally { await close(); }
  return { fails };
}

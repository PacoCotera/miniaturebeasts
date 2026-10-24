// The Library's Level 1 in each of its capture points on the Station page (?test: the face in test mode), as the layer check and the goldens take them: `library-l1-first` (only the Loika met), `library-l1-mid` (a mid-game catalogue:
// six found, four met, the rest unmet, the wish on a found species and a face chip on one), `library-l1-new` (glints and "three new looks"), `library-l1-roomkey` (the Library room key from Home: the ring on the last species visited)
// and `library-l1-dither` (✓ on Home's Library bezel: the frame at the midpoint of the 180 ms stage dither, motion on, virtual clock). Each is reached by the page's own state and asserted (screen, state, the cells' states,
// the ring, the subject) before `visit(name, page, fail)` is called. Taken with reduced motion (the glints solid), except the dither. Returns { fails }.
import { openStation } from "./station-page.mjs";
import { WORLD } from "./home-states.mjs";

// a scene starts from nothing known (`bare`, in enter): no species found or met, no guide, no wish and no face, so the cells each scene shows are exactly the ones it sets. `seen()` takes the seen record up to the guide (nothing new).
const MID = (w, bare, seen) => {
  const S = window.__st, st = S.ST; w.adults(1); bare(); const m = st.mibis[0]; m.portrait = { state: "delivered" }; st.face = { S01: m.id };   // the Loika's face: its portrayed mibi
  st.knownIds = ["S02", "S03", "S07", "S09", "S12"]; st.metIds = ["S04", "S05", "S10", "S14"];
  for (const [id, k] of [["S02", 0.15], ["S03", 0.3], ["S07", 0.2], ["S09", 0.4], ["S12", 0.25]]) S.fillGuide(id, k);
  const t = Object.keys(st.guide.S03)[0]; st.wish = { S03: { [t]: st.guide.S03[t][0] } }; seen();   // the wish on the Tuikis
};
const SCENES = {
  "l1-first": { l1: null, cur: "cell.S01", subject: "", expect: { found: [], met: ["S01"] }, set: (w, bare, seen) => { const st = window.__st.ST; bare(); st.metIds = ["S01"]; seen(); } },
  "l1-mid": { l1: "S01", cur: "cell.S01", subject: "", expect: { found: ["S01", "S02", "S03", "S07", "S09", "S12"], met: ["S04", "S05", "S10", "S14"], wish: ["S03"], face: ["S01"] }, set: MID },
  "l1-new": { l1: "S02", cur: "cell.S02", subject: "three new looks", expect: { found: ["S01", "S02", "S03"], met: ["S05"], glint: ["S02", "S03"] }, set: (w, bare, seen) => {
    const S = window.__st, st = S.ST; w.adults(1); bare(); st.knownIds = ["S02", "S03"]; st.metIds = ["S05"]; S.fillGuide("S02", 0.3); S.fillGuide("S03", 0.3); seen();
    const drop = (id, n) => { for (const t of Object.keys(st.libSeen[id] ?? {})) while (n > 0 && st.libSeen[id][t].length > 1) { st.libSeen[id][t].pop(); n--; } };   // looks found since the record: the last found of the traits with more than one
    drop("S02", 2); drop("S03", 1); } },
  "l1-roomkey": { l1: "S09", cur: "cell.S09", subject: "", via: "room", expect: { found: ["S01", "S02", "S03", "S07", "S09", "S12"], met: ["S04", "S05", "S10", "S14"], wish: ["S03"], face: ["S01"] }, set: MID },
  "l1-dither": { l1: "S12", cur: "cell.S03", via: "bezel", timed: 90, expect: { found: ["S01", "S02", "S03", "S07", "S09", "S12"], met: ["S04", "S05", "S10", "S14"] }, set: MID },
};
async function enter(page, sc) {
  await page.evaluate(([setSrc, l1, via]) => {
    const w = window.__world, S = window.__st; S.UI.lib.pending = null; w.reset(); const st = S.ST;   // the last scene's visit is dropped unrecorded
    const bare = () => { st.knownIds = []; st.metIds = []; st.guide = {}; st.readOnce = {}; st.wish = {}; st.face = {}; }, seen = () => { st.libSeen = JSON.parse(JSON.stringify(st.guide)); };
    eval(`(${setSrc})`)(w, bare, seen); S.UI.idle = false; S.settings.light = "day"; S.UI.lib.l1 = l1;
    if (via) { S.UI.home.f = via === "bezel" ? "library" : "room"; S.goto("home"); } else S.goto("library");
  }, [sc.set.toString(), sc.l1, sc.via ?? null]);
}
const wayIn = (page, sc) => page.evaluate((via) => window.__st.intent(via === "bezel" ? { screen: "home", target: "library", verb: "confirm" } : { screen: "home", target: "room", verb: "room:library" }), sc.via);
// the scene is what it claims: the screen, the state, the cells' states and marks (read from the props the face is given), the ring and the subject
async function assertScene(page, name, sc, fail) {
  const u = await page.evaluate(() => ({ screen: window.__st.UI.screen, p: window.__st.props }));
  if (u.screen !== "library" || u.p?.state !== "all") { fail(`library-${name}: on ${u.screen}, ${u.p?.state}`); return; }
  const cells = u.p.regions.cells, ids = (f) => cells.filter(f).map((c) => c.id), E = sc.expect;
  const found = ids((c) => c.status === "found"), met = ids((c) => c.status === "met");
  if (cells.length !== 16 || JSON.stringify(found) !== JSON.stringify(E.found) || JSON.stringify(met) !== JSON.stringify(E.met)) fail(`library-${name}: the cells are found ${found}, met ${met}; want found ${E.found}, met ${E.met}`);
  for (const [k, f] of [["wish", (c) => c.wish], ["face", (c) => !!c.face], ["glint", (c) => c.glint]]) if (E[k] && JSON.stringify(ids(f)) !== JSON.stringify(E[k])) fail(`library-${name}: ${k} on ${ids(f)}, want ${E[k]}`);
  if (sc.cur && u.p.focus.cur !== sc.cur) fail(`library-${name}: the ring is on ${u.p.focus.cur}, not ${sc.cur}`);
  if (sc.subject != null && u.p.frame.line.subject !== sc.subject) fail(`library-${name}: the subject reads "${u.p.frame.line.subject}", not "${sc.subject}"`);
}
const noErrors = async (page, fail) => { const errs = await page.evaluate(() => ({ render: window.__st.renderErrors, face: window.__st.faceErrors })); if (errs.render.length || errs.face.length) fail("errors on the page: " + [...errs.render, ...errs.face].slice(0, 3).join(" | ")); };
// the still pass: reduced motion, every scene without a timed event
async function stillStates(visit) {
  const { page, fails, fail, close } = await openStation({ motion: false });
  await page.evaluate((src) => { window.__world = eval(src)(); }, `(${WORLD.toString()})`);
  try {
    for (const [name, sc] of Object.entries(SCENES)) {
      if (sc.timed) continue;
      await enter(page, sc); await page.waitForTimeout(sc.via ? 400 : 900);
      if (sc.via) { await wayIn(page, sc); await page.waitForTimeout(900); }
      await assertScene(page, name, sc, fail);
      await visit("library-" + name, page, fail);
    }
    await noErrors(page, fail);
  } finally { await close(); }
  return { fails };
}
// the timed pass: motion on, a virtual clock. The way in is taken once Home's own screen change is over, and the frame is taken `timed` ms after it (the stage dither's midpoint).
async function timedStates(visit) {
  const { page, fails, fail, step, close } = await openStation({ motion: true, clock: true });
  await page.evaluate((src) => { window.__world = eval(src)(); }, `(${WORLD.toString()})`);
  try {
    for (const [name, sc] of Object.entries(SCENES)) {
      if (!sc.timed) continue;
      await enter(page, sc); await step(1200);   // Home's screen change is over
      await wayIn(page, sc); await step(sc.timed);
      await assertScene(page, name, sc, fail);
      await visit("library-" + name, page, fail); await step(2000);
    }
    await noErrors(page, fail);
  } finally { await close(); }
  return { fails };
}
export async function libraryStates(visit, { motion = false, timed = true } = {}) {
  const r = await stillStates(visit); if (motion || !timed) return r;
  const t = await timedStates(visit); return { fails: [...r.fails, ...t.fails] };
}

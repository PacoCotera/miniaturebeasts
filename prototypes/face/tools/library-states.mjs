// The Library in each of its capture points on the Station page (?test: the face in test mode), as the layer check and the goldens take them. Level 1: `library-l1-first` (only the Loika met), `library-l1-mid` (a mid-game
// catalogue: six found, four met, the rest unmet, the wish on the Tuikis alone and on the Loika beside its face chip; the room key and the dither take it with the Tuikis's wish only), `library-l1-new` (glints and "three new looks"), `library-l1-roomkey` (the Library room key from Home: the ring
// on the last species visited) and `library-l1-dither` (✓ on Home's Library bezel: the frame at the midpoint of the 180 ms stage dither, motion on, virtual clock); the Loika's guide is filled in each (the art director, L4-AD1) and
// the seen record taken after it. Level 2 (library.species): the Loika at mid, its Coat lit, a met-only sheet, glints, a wish no one carries, the Untuva with Character shut, the Hiljan, the Kilpo, the Belatz, the Belatz's Coat
// lit complete, the Blikur and the Loika late (colour chips). Level 3 (library.family, far): a Loika lineage of two blocks (`library-l3-far`, the ring on Moss) and of one (`library-l3-far-one-family`, on Dot). Each is reached by the page's own state and the player's keys and intents, the Library's pictures made (window.__st.libraryWarm: they are made off the open path in
// play), and asserted (screen, state, what the props show, the ring, the line) before `visit(name, page, fail)` is called. Taken with reduced motion (the glints solid), except the dither. Returns { fails }.
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openStation } from "./station-page.mjs";
import { WORLD } from "./home-states.mjs";
import * as S from "../../station/src/state.mjs";
import { setFrames } from "../../station/src/genome.mjs";
import { buildLineage } from "../../station/tests/fixtures/lineage.mjs";

const MID_S01 = JSON.parse(readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../station/tests/fixtures/specimen/states/mid.json"), "utf8")).S01;   // the approved Loika at mid (the sheet generator's review state)
// a scene starts from nothing known (`bare`, in enter): no species found or met, no guide, no wish, no face and no sittings, so what each scene shows is exactly what it sets. `seen()` takes the seen record up to the guide (nothing new).
const MID = (w, bare, seen, mid, arg) => {
  const S = window.__st, st = S.ST; w.adults(1); bare(); const m = st.mibis[0]; m.portrait = { state: "delivered" }; st.face = { S01: m.id };   // the Loika's face: its portrayed mibi
  st.knownIds = ["S02", "S03", "S07", "S09", "S12"]; st.metIds = ["S04", "S05", "S10", "S14"];
  for (const [id, k] of [["S01", 0.4], ["S02", 0.15], ["S03", 0.3], ["S07", 0.2], ["S09", 0.4], ["S12", 0.25]]) S.fillGuide(id, k);
  const t = Object.keys(st.guide.S03)[0], tl = Object.keys(st.guide.S01)[0]; st.wish = { S03: { [t]: st.guide.S03[t][0] } }; if (arg?.loikaWish) st.wish.S01 = { [tl]: st.guide.S01[tl][0] }; seen();   // the wish on the Tuikis (alone); in one scene on the Loika too (beside its face chip)
};
const MID_EXPECT = { found: ["S01", "S02", "S03", "S07", "S09", "S12"], met: ["S04", "S05", "S10", "S14"], wish: ["S03"], face: ["S01"] };
const L1 = {
  "l1-first": { l1: null, cur: "cell.S01", subject: "", expect: { found: [], met: ["S01"] }, set: (w, bare, seen) => { const st = window.__st.ST; bare(); st.metIds = ["S01"]; seen(); } },
  "l1-mid": { l1: "S01", cur: "cell.S01", subject: "", expect: { ...MID_EXPECT, wish: ["S01", "S03"] }, set: MID, arg: { loikaWish: true } },
  "l1-new": { l1: "S02", cur: "cell.S02", subject: "three new looks", expect: { found: ["S01", "S02", "S03"], met: ["S05"], glint: ["S02", "S03"] }, set: (w, bare, seen) => {
    const S = window.__st, st = S.ST; w.adults(1); bare(); st.knownIds = ["S02", "S03"]; st.metIds = ["S05"]; S.fillGuide("S01", 0.4); S.fillGuide("S02", 0.3); S.fillGuide("S03", 0.3); seen();   // the Loika's guide filled, and seen: nothing new for it
    const drop = (id, n) => { for (const t of Object.keys(st.libSeen[id] ?? {})) while (n > 0 && st.libSeen[id][t].length > 1) { st.libSeen[id][t].pop(); n--; } };   // looks found since the record: the last found of the traits with more than one
    drop("S02", 2); drop("S03", 1); } },
  "l1-roomkey": { l1: "S09", cur: "cell.S09", subject: "", via: "room", expect: MID_EXPECT, set: MID },
  "l1-dither": { l1: "S12", cur: "cell.S03", via: "bezel", timed: 90, expect: { found: MID_EXPECT.found, met: MID_EXPECT.met }, set: MID },
};

// ---- Level 2: the guide as the sheet generator's review states (set directly, or by fillGuide, which leaves a sealed chapter shut below a share of 1) ----
const LOIKA = (w, bare, seen, mid, extra = {}) => {
  const S = window.__st, st = S.ST; w.adults(2); bare(); const [m] = st.mibis; m.portrait = { state: "delivered" }; st.face = { S01: m.id };
  st.guide.S01 = JSON.parse(JSON.stringify(mid)); for (const [t, ls] of Object.entries(extra.add ?? {})) st.guide.S01[t] = [...(st.guide.S01[t] ?? []), ...ls];
  seen(); for (const [t, n] of Object.entries(extra.fresh ?? {})) st.libSeen.S01[t] = st.libSeen.S01[t].slice(0, -n);   // the last n found of a trait are new this visit
  if (extra.wish) { st.wish = { S01: { [extra.wish[0]]: extra.wish[1] } }; if (extra.unread) for (const q of st.mibis) q.read = []; }   // a mibi carries a look only in a chapter it has read
};
const GUIDE = (w, bare, seen, mid, [id, k]) => { const S = window.__st, st = S.ST; bare(); st.knownIds = [id]; S.fillGuide(id, k); seen(); };
const L2 = {
  "l2-loika-mid": { species: "S01", set: LOIKA, expect: { plates: 4, glints: 0, shelf: true, face: true, families: 2 } },
  "l2-coat-lit": { species: "S01", lit: "coat", set: LOIKA, expect: { plates: 4, glints: 0, shelf: false, page: true } },
  "l2-met-only": { species: "S02", met: true, set: (w, bare) => { const st = window.__st.ST; bare(); st.metIds = ["S02"]; }, expect: { plates: 0, glints: 0, shelf: false, ring: "" } },
  "l2-new": { species: "S01", set: LOIKA, arg: { fresh: { colour: 2, markings: 1 } }, expect: { plates: 4, glints: 3, shelf: true } },
  "l2-wish-uncarried": { species: "S01", set: LOIKA, arg: { wish: ["colour", "russet"], unread: true }, expect: { plates: 4, shelf: true, wish: [false] } },
  "l2-shut": { species: "S02", set: GUIDE, arg: ["S02", 0.5], expect: { plates: 3, shut: ["character"], shelf: true } },
  "l2-hiljan": { species: "S04", set: GUIDE, arg: ["S04", 1], expect: { plates: 5, shelf: true } },
  "l2-kilpo": { species: "S11", set: GUIDE, arg: ["S11", 0.6], expect: { plates: 5, shut: ["stamina"], shelf: true } },
  "l2-belatz": { species: "S09", set: GUIDE, arg: ["S09", 0.5], expect: { plates: 6, shut: ["movement"], shelf: true } },
  "l2-belatz-coat-lit-complete": { species: "S09", lit: "coat", set: GUIDE, arg: ["S09", 1], expect: { plates: 7, shelf: false, page: true } },
  "l2-blikur": { species: "S16", set: GUIDE, arg: ["S16", 0.6], expect: { plates: 7, shut: ["charge"], shelf: true } },
  "l2-loika-late": { species: "S01", set: LOIKA, arg: { add: { colour: ["charcoal and ash", "ash"] } }, expect: { plates: 4, shelf: true } },
};

// ---- Level 3: a Loika lineage (station/tests/fixtures/lineage.mjs), built here and put in the page's save; reached by the player's way in (Level 2's family face, ✓ See the family: close, drawn as not built until
// its screen is) and ← (the tree exceeds CLOSE's view: FAR), the ring on the entry mibi: `full` (two blocks, a joined cross, a shed-pod child, released mibis and a bud; Moss the entry) and `one` (one block; Dot) ----
const L3 = { "l3-far": { which: "full", entry: "Moss", blocks: 2 }, "l3-far-one-family": { which: "one", entry: "Dot", blocks: 1 } };
const FRAMES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../workbench/frames");
function lineageSave(which) {
  setFrames(readdirSync(FRAMES).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(FRAMES, f), "utf8"))));
  const st = S.freshSt("w1", 3, 0); st.mibis = []; st.nextMibi = 1; st.bud = null; st.turn = 0; const by = buildLineage(st, which, { turn: 0 });
  return { mibis: st.mibis, bud: st.bud, next: st.nextMibi, names: st.namesUsed, ids: Object.fromEntries(Object.entries(by).map(([n, m]) => [n, m.id])) };
}
const LINEAGE = (w, bare, seen, mid, save) => {
  const S = window.__st, st = S.ST; bare(); st.mibis = JSON.parse(JSON.stringify(save.mibis)); for (const m of st.mibis) m.born += st.turn; st.nextMibi = save.next; st.namesUsed = [...save.names];
  st.bud = save.bud ? { ...JSON.parse(JSON.stringify(save.bud)), start: Date.now() } : null; st.knownIds = ["S01"]; S.fillGuide("S01", 0.4); seen();
};
async function assertL3(page, name, sc, fail) {
  const u = await page.evaluate(() => ({ screen: window.__st.UI.screen, p: window.__st.props })), p = u.p, must = (ok, m) => { if (!ok) fail(`library-${name}: ${m}`); };
  if (u.screen !== "library.family" || p?.screen !== "library.family") { fail(`library-${name}: on ${u.screen}`); return; }
  must(p.state === "far", `the state is ${p.state}, not far`); must(/^lineage-far-S01-[0-9a-f]{8}$/.test(p.regions.far.picture), `the picture ${p.regions.far.picture}`);
  must(p.focus.cur === "node." + sc.ids[sc.entry], `the ring is on ${p.focus.cur}, not ${sc.entry}`); must(p.regions.lineage.nodes.every((n) => n.u >= 0), "the nodes are placed");
  must(p.frame.top.readout.text === "Loika family" && p.frame.top.readout.mark === "species-mark-S01-10", "the readout"); must(p.frame.line.ok === "Zoom in" && p.frame.line.back === "Loika", "the line " + JSON.stringify(p.frame.line));
  const pods = p.regions.lineage.nodes.filter((n) => n.kind === "pod"); must(pods.every((n) => n.row === 0) && !p.focus.targets.some((t) => t.id.startsWith("pod.")), "the founders' pods in row 0, never targets");
}

async function enter(page, sc, prewarm = false) {
  await page.evaluate(([setSrc, l1, via, prewarm, mid, arg]) => {
    const w = window.__world, S = window.__st; S.UI.lib.pending = null; w.reset(); const st = S.ST;   // the last scene's visit is dropped unrecorded
    const bare = () => { st.knownIds = []; st.metIds = []; st.guide = {}; st.readOnce = {}; st.wish = {}; st.face = {}; st.moments = {}; }, seen = () => { st.libSeen = JSON.parse(JSON.stringify(st.guide)); };
    eval(`(${setSrc})`)(w, bare, seen, mid, arg); S.UI.idle = false; S.settings.light = "day"; S.UI.lib.l1 = l1;
    if (prewarm) S.goto("library"); else if (via) { S.UI.home.f = via === "bezel" ? "library" : "room"; S.goto("home"); } else S.goto("library");
  }, [sc.set.toString(), sc.l1 ?? null, sc.via ?? null, prewarm, MID_S01, sc.arg]);
}
const wayIn = (page, sc) => page.evaluate((via) => window.__st.intent(via === "bezel" ? { screen: "home", target: "library", verb: "confirm" } : { screen: "home", target: "room", verb: "room:library" }), sc.via);
// the Library's pictures the props asked for, made now (in play they are made off the open path, one a tick), and the frames that name them
async function settle(page, wait = (ms) => page.waitForTimeout(ms)) { for (let i = 0; i < 20; i++) { const n = await page.evaluate(() => window.__st.libraryWarm()); await wait(120); if (!n && !(await page.evaluate(() => window.__st.libraryWaiting().length))) return; } }
// the scene is what it claims: the screen, the state, the cells' states and marks (read from the props the face is given), the ring and the subject
async function assertL1(page, name, sc, fail) {
  const u = await page.evaluate(() => ({ screen: window.__st.UI.screen, p: window.__st.props }));
  if (u.screen !== "library" || u.p?.state !== "all") { fail(`library-${name}: on ${u.screen}, ${u.p?.state}`); return; }
  const cells = u.p.regions.cells, ids = (f) => cells.filter(f).map((c) => c.id), E = sc.expect;
  const found = ids((c) => c.status === "found"), met = ids((c) => c.status === "met");
  if (cells.length !== 16 || JSON.stringify(found) !== JSON.stringify(E.found) || JSON.stringify(met) !== JSON.stringify(E.met)) fail(`library-${name}: the cells are found ${found}, met ${met}; want found ${E.found}, met ${E.met}`);
  for (const [k, f] of [["wish", (c) => c.wish], ["face", (c) => !!c.face], ["glint", (c) => c.glint]]) if (E[k] && JSON.stringify(ids(f)) !== JSON.stringify(E[k])) fail(`library-${name}: ${k} on ${ids(f)}, want ${E[k]}`);
  if (cells.some((c) => c.status !== "unmet" && !c.picture)) fail(`library-${name}: a cell picture is not made yet`);
  if (sc.cur && u.p.focus.cur !== sc.cur) fail(`library-${name}: the ring is on ${u.p.focus.cur}, not ${sc.cur}`);
  if (sc.subject != null && u.p.frame.line.subject !== sc.subject) fail(`library-${name}: the subject reads "${u.p.frame.line.subject}", not "${sc.subject}"`);
}
async function assertL2(page, name, sc, fail) {
  const u = await page.evaluate(() => ({ screen: window.__st.UI.screen, p: window.__st.props })), E = sc.expect, p = u.p;
  if (u.screen !== "library.species" || p?.screen !== "library.species") { fail(`library-${name}: on ${u.screen}`); return; }
  const R = p.regions, want = sc.lit ? "lit" : "sheet", must = (ok, m) => { if (!ok) fail(`library-${name}: ${m}`); };
  must(p.state === want, `the state is ${p.state}, not ${want}`); must(p.frame.top.readout.mark === `species-mark-${sc.species}-10`, "the readout's mark");
  must(/^library-sheet-/.test(R.sheet.picture) && (!sc.lit || R.sheet.picture.endsWith("-lit-" + sc.lit)), `the sheet picture is made (${R.sheet.picture})`);
  must(R.sheet.met === !!sc.met, "met-only"); must(R.sheet.plates.length === E.plates, `${R.sheet.plates.length} open plates, want ${E.plates}`);
  for (const ch of E.shut ?? []) must(!R.sheet.plates.some((q) => q.id === "chapter." + ch), `${ch} is shut: not a target`);
  if (E.glints != null) must(R.sheet.glints.length === E.glints, `${R.sheet.glints.length} glints, want ${E.glints}`);
  must(R.shelf.shown === E.shelf, `the shelf ${R.shelf.shown ? "shown" : "hidden"}`); must(!!R.page.picture === !!E.page, `the page ${R.page.picture || "none"}`);
  if (E.face) must(!!R.shelf.face, "the face"); if (E.families != null) must(R.shelf.families.length === E.families, `${R.shelf.families.length} family faces`);
  if (E.wish) must(JSON.stringify(R.shelf.wish.map((q) => q.carried)) === JSON.stringify(E.wish), `the wish carried ${R.shelf.wish.map((q) => q.carried)}`);
  const ring = E.ring ?? (sc.lit ? "chapter." + sc.lit : R.sheet.plates[0]?.id ?? ""); must(p.focus.cur === ring, `the ring is on ${p.focus.cur}, not ${ring}`);
  if (sc.met) must(p.frame.line.ok === null && p.frame.line.subject === "seen, no pod identified yet", "the met-only line");
  else if (sc.lit) must(p.frame.line.back === "Clear" && /^Clear /.test(p.frame.line.ok), "the lit line"); else must(p.frame.line.back === "Library" && /^Show /.test(p.frame.line.ok), "the sheet line");
}
const noErrors = async (page, fail) => { const errs = await page.evaluate(() => ({ render: window.__st.renderErrors, face: window.__st.faceErrors })); if (errs.render.length || errs.face.length) fail("errors on the page: " + [...errs.render, ...errs.face].slice(0, 3).join(" | ")); };
// the still pass: reduced motion, every scene without a timed event
async function stillStates(visit) {
  const { page, fails, fail, close } = await openStation({ motion: false });
  await page.evaluate((src) => { window.__world = eval(src)(); }, `(${WORLD.toString()})`);
  try {
    for (const [name, sc] of Object.entries(L1)) {
      if (sc.timed) continue;
      await enter(page, sc); await page.waitForTimeout(sc.via ? 400 : 900);
      if (sc.via) { await wayIn(page, sc); await page.waitForTimeout(900); }
      await settle(page); await assertL1(page, name, sc, fail);
      await visit("library-" + name, page, fail);
    }
    for (const [name, sc] of Object.entries(L2)) {
      await enter(page, sc); await page.waitForTimeout(300);
      await page.evaluate((id) => window.__st.intent({ screen: "library", target: "cell." + id, verb: "confirm" }), sc.species); await page.waitForTimeout(300); await settle(page);   // Level 1's ✓ Open {species}
      if (sc.lit) { await page.evaluate((ch) => window.__st.intent({ screen: "library.species", target: "chapter." + ch, verb: "confirm" }), sc.lit); await page.waitForTimeout(300); await settle(page); }   // ✓ Show {Chapter}
      await assertL2(page, name, sc, fail);
      await visit("library-" + name, page, fail);
    }
    for (const [name, sc] of Object.entries(L3)) {   // Level 1's ✓ Open Loika, Level 2's family face ✓ See the family (close), then ← (the tree exceeds the view: FAR)
      const save = lineageSave(sc.which); sc.ids = save.ids;
      await enter(page, { set: LINEAGE, l1: "S01", arg: save }); await page.waitForTimeout(300);
      await page.evaluate(() => window.__st.intent({ screen: "library", target: "cell.S01", verb: "confirm" })); await page.waitForTimeout(300); await settle(page);
      await page.evaluate((id) => window.__st.intent({ screen: "library.species", target: "family." + id, verb: "confirm" }), save.ids[sc.entry]); await page.waitForTimeout(300);
      await page.evaluate(() => window.__st.intent({ screen: "library.family", target: "screen", verb: "back" })); await page.waitForTimeout(500);
      await assertL3(page, name, sc, fail);
      await visit("library-" + name, page, fail);
    }
    await noErrors(page, fail);
  } finally { await close(); }
  return { fails };
}
// the timed pass: motion on, a virtual clock. Level 1's pictures are made first (Level 1 once, then Home), so the frame at the dither's midpoint shows them as play does once they are made; the way in is taken once Home's
// own screen change is over, and the frame is taken `timed` ms after it (the stage dither's midpoint).
async function timedStates(visit) {
  const { page, fails, fail, step, close } = await openStation({ motion: true, clock: true });
  await page.evaluate((src) => { window.__world = eval(src)(); }, `(${WORLD.toString()})`);
  try {
    for (const [name, sc] of Object.entries(L1)) {
      if (!sc.timed) continue;
      await enter(page, sc, true); await step(200); await settle(page, () => step(120));
      await page.evaluate((via) => { const S = window.__st; S.UI.home.f = via === "bezel" ? "library" : "room"; S.goto("home"); }, sc.via);
      await step(1200);   // Home's screen change is over
      await wayIn(page, sc); await step(sc.timed);
      await assertL1(page, name, sc, fail);
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

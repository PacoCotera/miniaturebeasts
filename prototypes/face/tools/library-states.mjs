// The Library spread in each of its capture points on the Station page (?test: the face in test mode), as the layer check and the goldens take them: `library-spread` (the wireframe 20 scene: Loika found and portrayed, Untuva, Tuikis
// and Belatz found at progress one, three and four with the guide complete, Hiljan met, the rest empty, the ring on Tuikis), `library-spread-empty` (a fresh world: sixteen empty frames, the ring on the first), `library-spread-complete` (the ring
// on a portrayed, complete frame: over the gilt corner and the seal) and `library-book-shut` (✓ on a found frame: the spread, the same ring, the plate "Its Book is not open yet"). Each is reached by the page's own state and asserted (screen, state, ring) before `visit(name, page, fail)`
// is called. Taken with reduced motion, except `library-book-shut`, a timed pass (the Book shut: ✓ on a found frame, the plate 400 ms into its 4 s event, motion on, virtual clock). Returns { fails }.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openStation } from "./station-page.mjs";
import { WORLD } from "./home-states.mjs";

const ALL = ["S01", "S02", "S03", "S04", "S05", "S06", "S07", "S08", "S09", "S10", "S11", "S12", "S13", "S14", "S15", "S16"];
// a scene starts from nothing known (`bare`, in enter): no species found or met and no guide filled, so the frames each scene shows are exactly the ones it sets
const SCENES = {
  spread: { i: 2, state: "spread", cur: "frame.S03", expect: { found: ["S01", "S02", "S03", "S09"], met: ["S04"], progress: { S01: 2, S02: 1, S03: 3, S09: 4 } }, set: (w) => {
    const S = window.__st, st = S.ST; w.adults(1); st.mibis[0].portrait = { state: "delivered" }; bare();   // Loika: a mibi that sat for a portrait
    S.seedAdults("S09", 9, 1); st.knownIds = ["S01", "S02", "S03", "S09"]; st.metIds = ["S04"]; S.fillGuide("S01", 0.3); S.fillGuide("S02", 0.1); S.fillGuide("S03", 0.55); S.fillGuide("S09", 1);
    for (const m of st.mibis) m.paint = { state: "landed" }; } },
  "spread-empty": { i: 0, state: "spread", cur: "frame.S01", expect: { found: [], met: [] }, set: () => { bare(); } },
  "spread-complete": { i: 8, state: "spread", cur: "frame.S09", expect: { found: ["S09"], met: [], progress: { S09: 4 } }, set: () => {
    const S = window.__st, st = S.ST; bare(); S.seedAdults("S09", 9, 1); for (const m of st.mibis) { m.paint = { state: "landed" }; m.portrait = { state: "delivered" }; } st.knownIds = ["S09"]; S.fillGuide("S09", 1); } },
  "book-shut": { i: 2, state: "spread", cur: "frame.S03", timed: 400, press: { screen: "library", target: "frame.S03", verb: "confirm" }, expect: { found: ["S03"], met: [] }, set: () => {
    const S = window.__st, st = S.ST; bare(); st.knownIds = ["S03"]; S.fillGuide("S03", 0.55); } },
};
async function enter(page, sc) {
  await page.evaluate(([setSrc, spec]) => {
    const w = window.__world; w.reset(); const bare = () => { const st = window.__st.ST; st.knownIds = []; st.metIds = []; st.guide = {}; st.readOnce = {}; }; eval(`(${setSrc})`)(w); const S = window.__st; S.UI.idle = false; S.settings.light = "day"; S.UI.lib.f = "spread"; S.UI.lib.page = 0; S.UI.lib.i = spec.i;
    S.goto("library"); S.UI.lib.i = spec.i;
  }, [sc.set.toString(), { i: sc.i }]);
}
// the scene is what it claims: the screen, the state, the frames' statuses and progress (read from the props the face is given) and the ring
async function assertScene(page, name, sc, fail) {
  const u = await page.evaluate(() => ({ screen: window.__st.UI.screen, state: window.__st.props?.state, cur: window.__st.props?.focus?.cur, f: window.__st.UI.lib.f }));
  if (u.screen !== "library" || u.state !== sc.state) fail(`library-${name}: on ${u.screen}, ${u.state}`);
  if (sc.state === "spread") {
    const items = await page.evaluate(() => { const r = window.__st.props?.regions; return r ? [...r.leftPage.items, ...r.rightPage.items].map((x) => ({ id: x.id, status: x.status, progress: x.progress })) : []; });
    const found = items.filter((x) => x.status === "found").map((x) => x.id), met = items.filter((x) => x.status === "met").map((x) => x.id), unmet = items.filter((x) => x.status === "unmet").length;
    if (items.length !== 16 || JSON.stringify(found) !== JSON.stringify(sc.expect.found) || JSON.stringify(met) !== JSON.stringify(sc.expect.met) || unmet !== 16 - found.length - met.length) fail(`library-${name}: the frames are found ${found}, met ${met}, ${unmet} unmet; want found ${sc.expect.found}, met ${sc.expect.met}`);
    for (const [id, want] of Object.entries(sc.expect.progress ?? {})) { const got = items.find((x) => x.id === id)?.progress; if (got !== want) fail(`library-${name}: ${id} reads progress ${got}, want ${want}`); }
  } else { const k = await page.evaluate(() => ({ known: window.__st.ST.knownIds, met: window.__st.ST.metIds })); if (JSON.stringify(k.known) !== JSON.stringify(sc.expect.found)) fail(`library-${name}: known ${k.known}`); }
  if (sc.cur && u.cur !== sc.cur) fail(`library-${name}: the ring is on ${u.cur}, not ${sc.cur}`);
}
const noErrors = async (page, fail) => { const errs = await page.evaluate(() => ({ render: window.__st.renderErrors, face: window.__st.faceErrors })); if (errs.render.length || errs.face.length) fail("errors on the page: " + [...errs.render, ...errs.face].slice(0, 3).join(" | ")); };
// the still pass: reduced motion, every scene without a timed event
async function stillStates(visit) {
  const { page, fails, fail, close } = await openStation({ motion: false });
  await page.evaluate((src) => { window.__world = eval(src)(); }, `(${WORLD.toString()})`);
  try {
    for (const [name, sc] of Object.entries(SCENES)) {
      if (sc.timed) continue;
      await enter(page, sc); await page.waitForTimeout(900);
      await assertScene(page, name, sc, fail);
      await visit("library-" + name, page, fail);
    }
    await noErrors(page, fail);
  } finally { await close(); }
  return { fails };
}
// the timed pass: motion on, a virtual clock. The message plate is an event (4 s, no fade), so the key is pressed after the screen change's dither is over and the frame is taken `timed` ms into the event.
async function timedStates(visit) {
  const { page, fails, fail, step, close } = await openStation({ motion: true, clock: true });
  await page.evaluate((src) => { window.__world = eval(src)(); }, `(${WORLD.toString()})`);
  const shut = JSON.parse(readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../ui/specs/station/library.json"), "utf8")).spread.strings.bookShut;
  try {
    for (const [name, sc] of Object.entries(SCENES)) {
      if (!sc.timed) continue;
      await enter(page, sc); await step(1200);   // the screen change's dither is over
      await page.evaluate((press) => window.__st.intent(press), sc.press); await step(sc.timed);
      await assertScene(page, name, sc, fail);
      const p = await page.evaluate(() => ({ msg: window.__st.msg, type: window.__st.check().log.type ?? [] }));
      if (p.msg !== shut) fail(`library-${name}: the message plate says "${p.msg}", not "${shut}"`);
      if (!p.type.some((t) => t.region === "plate" && t.text === shut)) fail(`library-${name}: the face drew no plate with "${shut}"`);
      await visit("library-" + name, page, fail); await step(4000);
    }
    await noErrors(page, fail);
  } finally { await close(); }
  return { fails };
}
export async function libraryStates(visit, { motion = false, timed = true } = {}) {
  const r = await stillStates(visit); if (motion || !timed) return r;
  const t = await timedStates(visit); return { fails: [...r.fails, ...t.fails] };
}

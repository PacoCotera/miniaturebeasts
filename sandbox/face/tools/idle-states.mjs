// Idle in each of its capture points on the Station page (?test: the face in test mode), as the layer check and the goldens take them: `idle-docked` (the carried two are not drawn; the nest alone), `idle-away`, `idle-none` (the nest alone), `idle-meet-reeds` (a mibi housed in Reeds met while the room on the face is Roots: Reeds' painting), each with the line frame.json idle.strings.order gives, and `idle-walk-8000ms` (eight residents walking, 8000 ms of the face's clock into Idle, the reference of the three builds).
// The still points are taken with reduced motion; the walk on a virtual clock with motion. Each is reached by the page's own state (Idle on the screen under it) and asserted before `visit(name, page, fail)` is called. Returns { fails }.
import { openStation } from "./station-page.mjs";
import { WORLD } from "./home-states.mjs";

const SCENES = {
  docked: { line: "Two crates wait in the Bay", set: (w) => { w.adults(4); w.young(2); w.carry([0, 1]); w.crates(2); } },
  "docked-dawn":  { line: "Two crates wait in the Bay", light: "dawn",  set: (w) => { w.adults(4); w.young(2); w.carry([0, 1]); w.crates(2); } },   // the docked scene at three lights (fix 7: the residents take the grade)
  "docked-dusk":  { line: "Two crates wait in the Bay", light: "dusk",  set: (w) => { w.adults(4); w.young(2); w.carry([0, 1]); w.crates(2); } },
  "docked-night": { line: "Two crates wait in the Bay", light: "night", set: (w) => { w.adults(4); w.young(2); w.carry([0, 1]); w.crates(2); } },
  away:   { line: /^\S+ is out with the Companion$/, set: (w) => { w.adults(4); w.young(2); w.carry([0]); w.away(); } },
  none:   { line: "A bud is growing", set: (w) => { w.adults(3); w.bud(false); } },
  empty:  { line: "", set: (w) => { w.adults(2); } },
  eight: { line: "", timed: true, set: (w) => { w.rooms(1); w.adults(8); } },
  // R3 (the rooms design): Boulders by night, six residents, one behind the stone (its id is chosen so that its start seed puts its feet just above the stone's foot); the room has no bed
  // R5 carried (T-20261027-318, UI/UX's R5 read): Idle shows the room of the mibi being met: two rooms, the room on the face is Roots (0), three mibis housed in Reeds (1) and one of them met, so the painting is Reeds' (its sedge-seam occluder against the walk band)
  "meet-reeds": { line: "", room: "reeds", n: 3, set: (w) => { const st = window.__st.ST; w.rooms(2); w.adults(2); st.face.room = 1; w.adults(3); st.face.room = 0; w.meet(st.mibis.length - 1); } },
  "room-boulders-night": { line: "", light: "night", room: "boulders", set: (w) => { w.rooms(4); window.__st.ST.face.room = 2; w.adults(6); window.__st.ST.mibis[3].id = 139; } },
};
async function enter(page, sc) {
  await page.evaluate(([setSrc, light]) => { const w = window.__world; w.reset(); eval(`(${setSrc})`)(w); const S = window.__st; S.settings.light = light; S.UI.home.f = "room"; S.goto("home"); S.UI.idle = true; }, [sc.set.toString(), sc.light ?? "day"]);
}
export async function idleStates(visit, { motion = false, timed = true } = {}) {
  const r = await still(visit); if (motion || !timed) return r;
  const t = await walk(visit); return { fails: [...r.fails, ...t.fails] };
}
async function still(visit) {
  const { page, fails, fail, close } = await openStation({ motion: false });
  await page.evaluate((src) => { window.__world = eval(src)(); }, `(${WORLD.toString()})`);
  try {
    for (const [name, sc] of Object.entries(SCENES)) {
      if (sc.timed) continue;
      await enter(page, sc); await page.waitForTimeout(900);
      const u = await page.evaluate(() => ({ idle: window.__st.UI.idle, props: window.__st.props && { idle: window.__st.props.idle, line: window.__st.props.frame?.idle?.line, bed: window.__st.props.regions?.bed?.state, room: window.__st.props.regions?.room?.id, residents: window.__st.props.regions?.residents?.length } }));
      if (!u.idle || !u.props?.idle || (sc.line instanceof RegExp ? !sc.line.test(u.props.line) : u.props.line !== sc.line) || (name !== "empty" && name !== "none" && !sc.room ? u.props.bed !== "empty" : false) || (sc.room && (u.props.room !== sc.room || u.props.residents !== (sc.n ?? 6)))) fail(`idle-${name}: ${JSON.stringify(u)}`);   // R4b: the bed is the resters' alone: empty with nobody resting (the carried set is never drawn)
      await visit("idle-" + name, page, fail);
    }
    const errs = await page.evaluate(() => ({ render: window.__st.renderErrors, face: window.__st.faceErrors })); if (errs.render.length || errs.face.length) fail("errors on the page: " + [...errs.render, ...errs.face].slice(0, 3).join(" | "));
  } finally { await close(); }
  return { fails };
}
async function walk(visit) {
  const { page, fails, fail, step, close } = await openStation({ motion: true, clock: true });
  await page.evaluate((src) => { window.__world = eval(src)(); }, `(${WORLD.toString()})`);
  try {
    await enter(page, SCENES.eight); await step(40); await step(8000);
    const u = await page.evaluate(() => ({ idle: window.__st.UI.idle, n: window.__st.props?.regions?.residents?.length })); if (!u.idle || u.n !== 8) fail("idle-walk-8000ms: " + JSON.stringify(u));
    await visit("idle-walk-8000ms", page, fail);
    // Station M1: the night on Idle, Pip alone asleep on its stand-in cells under the developer switch, the Station time 23:00, 60 s of the face's clock (a stir or two)
    await page.evaluate(() => { const S = window.__st; S.settings.motionSets = true; S.settings.stationTime = "23:00"; S.settings.light = "night"; });
    await enter(page, { light: "night", set: (w) => { w.adults(1); } }); await step(40); await step(60000);
    { const u = await page.evaluate(() => ({ idle: window.__st.UI.idle, rest: window.__st.props?.regions?.residents?.map((r) => r.rest) })); if (!u.idle || u.rest?.[0] !== "asleep") fail("idle-night-pip-60000ms: " + JSON.stringify(u)); }
    await visit("idle-night-pip-60000ms", page, fail);
    await page.evaluate(() => { const S = window.__st; S.settings.motionSets = false; S.settings.stationTime = "12:00"; S.settings.light = "day"; });
    const errs = await page.evaluate(() => ({ render: window.__st.renderErrors, face: window.__st.faceErrors })); if (errs.render.length || errs.face.length) fail("errors on the page: " + [...errs.render, ...errs.face].slice(0, 3).join(" | "));
  } finally { await close(); }
  return { fails };
}

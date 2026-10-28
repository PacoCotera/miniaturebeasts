// The Vivarium's whole in each of its capture points on the Station page (?test: the face in test mode), as the layer check and the goldens take them: `vivarium-docked` (seven mibis at home, the carried two asleep on the bed, eight bays, the ring on the first
// resident), `vivarium-away` (the Companion out: the bed shows its mark, the carried two are tiles with the outline glyph), `vivarium-mibi-out` (the same, the ring on an out mibi's tile), `vivarium-empty` (a fresh world's, six free bays, no ring),
// `vivarium-tile` (the ring on a housed tile), `vivarium-sleeper` (the ring on a sleeper) and `vivarium-eight` (eight residents, a full room's eight places) `vivarium-empty-away`, `vivarium-room-reeds|boulders|ferns` (the other three rooms by day, six residents, one behind the room's first occluder), (the nest and its mark), `vivarium-docked-dawn|day|dusk|night` (the same scene in the four lights, for the art director) and, on a virtual clock with motion, `vivarium-walk-8000ms` (twelve walking, 8000 ms in).
// Each is reached by the page's own state and asserted (screen, state, ring) before `visit(name, page, fail)` is called. Taken with reduced motion (the walk at its start), the last on a virtual clock. Returns { fails }.
import { openStation } from "./station-page.mjs";
import { WORLD } from "./home-states.mjs";

const SCENES = {
  docked:  { f: null, state: "rest", set: (w) => { w.rooms(1); w.adults(4); w.young(3); w.carry([0, 1]); } },
  away:    { f: null, state: "rest", set: (w) => { w.rooms(1); w.adults(4); w.young(3); w.carry([0, 1]); w.away(); } },
  "mibi-out": { f: "tile:0", state: "rest", set: (w) => { w.rooms(1); w.adults(4); w.young(3); w.carry([0, 1]); w.away(); } },
  empty:   { f: null, state: "empty", set: (w) => { w.rooms(1); } },
  tile:    { f: "tile:3", state: "rest", set: (w) => { w.rooms(1); w.adults(4); w.young(3); w.carry([0, 1]); } },
  sleeper: { f: "resident:1", state: "rest", set: (w) => { w.rooms(1); w.adults(4); w.young(3); w.carry([0, 1]); } },
  eight:   { f: null, state: "rest", set: (w) => { w.rooms(1); w.adults(8); window.__st.ST.mibis.forEach((m, i) => { m.id = [1075, 188, 479, 7, 191, 2808, 2, 2135][i]; }); } },   // ids whose start seeds (hash(id)) put the eight across the 992 px walk band
  "empty-away": { f: null, state: "empty", set: (w) => { w.rooms(1); w.away(); } },
  "docked-dawn":  { f: null, state: "rest", light: "dawn",  set: (w) => { w.rooms(1); w.adults(4); w.young(3); w.carry([0, 1]); } },
  "docked-day":   { f: null, state: "rest", light: "day",   set: (w) => { w.rooms(1); w.adults(4); w.young(3); w.carry([0, 1]); } },
  "docked-dusk":  { f: null, state: "rest", light: "dusk",  set: (w) => { w.rooms(1); w.adults(4); w.young(3); w.carry([0, 1]); } },
  "docked-night": { f: null, state: "rest", light: "night", set: (w) => { w.rooms(1); w.adults(4); w.young(3); w.carry([0, 1]); } },
  // R3 (the rooms design): the other three rooms by day, six residents, one behind the room's first occluder that has a picture (its id is chosen so that its start seed, hash(id), puts its feet just above the occluder's foot, as `twelve`'s ids spread the twelve; since R4c every walker restarts from its seed in the room shown, so the id is picked per room on the room's own levels: 94 at (246, 516) behind sedge-2, 106 at (199, 511) behind stone-2, 349 at (59, 521) behind fern-1)
  "room-reeds":    { f: null, state: "rest", room: "reeds",    set: (w) => { w.rooms(4); window.__st.ST.face.room = 1; w.adults(6); window.__st.ST.mibis[3].id = 94; } },   // behind reeds-sedge-2
  "room-boulders": { f: null, state: "rest", room: "boulders", set: (w) => { w.rooms(4); window.__st.ST.face.room = 2; w.adults(6); window.__st.ST.mibis[3].id = 106; } },   // behind boulders-stone-2
  "room-ferns":    { f: null, state: "rest", room: "ferns",    set: (w) => { w.rooms(4); window.__st.ST.face.room = 3; w.adults(6); window.__st.ST.mibis[3].id = 349; } },   // behind ferns-fern-1
  // R4 (the rooms design §2): Roots, six residents at their start, one of them on the terrace (ids whose seeds, hash(id), start one on the raised level: the first draw's r mod 4 is 0 for id 3 and not for the others); the main floor's walkers are in front of it by their feet
  "level-roots":   { f: null, state: "rest", room: "roots", set: (w) => { w.rooms(1); w.adults(6); window.__st.ST.mibis.forEach((m, i) => { m.id = [3, 1, 2, 4, 5, 7][i]; }); } },
  // R5 (T-20261027-318; the rooms design): the rooms pane and the add-a-room decision, set last in the page so the Energy and the rooms they set are in no earlier scene's top bar. The save's `rooms` is the rooms bought (the new-room chip's price), settings.rooms the rooms shown
  "room-new":   { f: "room.new", state: "rest", set: (w) => { const st = window.__st.ST; w.rooms(1); st.rooms = 1; st.e = 9; w.adults(6); } },   // one room, six of eight places: the ring on the new-room chip, its lamp mint (4 Energy, price 4)
  "room-empty": { f: "room.1", state: "empty", set: (w) => { const st = window.__st.ST; w.rooms(2); st.rooms = 2; st.e = 9; w.adults(3); st.face.room = 1; } },   // two rooms: the second shown empty, eight free places, the ring on its chip
  "rooms-four": { f: "room.2", state: "rest", set: (w) => { const st = window.__st.ST; w.rooms(4); st.rooms = 4; st.e = 9; st.face.room = 0; w.adults(3); st.face.room = 1; w.adults(2); st.face.room = 2; w.adults(4); } },   // all four rooms (no new-room chip), the third shown
  "room-short": { f: "room.new", state: "rest", set: (w) => { const st = window.__st.ST; w.rooms(1); st.rooms = 1; st.e = 3; w.adults(6); } },   // short of Energy: the dimmed cap, the short icon, its lamp stone
  "panel-add-room": { name: "panel-add-room", f: "room.new", state: "rest", panel: "addRoom", set: (w) => { const st = window.__st.ST; w.rooms(1); st.rooms = 1; st.e = 9; w.adults(6); } },   // the Add a room? panel over the whole, the ring on Add the room
  // fix 14 (§14.4): capture states, not goldens: the vivarium-docked seed with a juvenile resident focused, one a light; its ring crosses the dark grain and the lit moss (the 2 px floor, layer-check rule F2; the CD's frames)
  "four-loikas": { f: null, state: "rest", captureOnly: true, set: (w) => { w.rooms(1); const st = window.__st.ST, k = st.mibis.length; for (const seed of [1, 22, 25, 52]) window.__st.seedAdults("S01", seed, 1); st.mibis.slice(k).forEach((m, i) => { m.paint = { state: "landed" }; m.id = [1075, 479, 2, 5426][i]; }); } },   // T-20261016-201 proof: four Loikas whose read looks differ (patches with the crest; stripes on a bare head; stripes and patches with the crest; patches on a bare head), each drawn as itself
  ...Object.fromEntries(["dawn", "day", "dusk", "night"].map((l) => ["resident-focused-" + l, { f: "resident:4", state: "rest", light: l, captureOnly: true, set: (w) => { w.rooms(1); w.adults(4); w.young(3); w.carry([0, 1]); } }])),
};
async function enter(page, sc) {
  await page.evaluate(([setSrc, f, light, panel]) => {
    const w = window.__world; w.reset(); eval(`(${setSrc})`)(w); const S = window.__st; S.UI.idle = false; S.settings.light = light ?? "day";   // null: the page's own light (the clock, fixed to day in test mode); the four lights by hand for the art director's capture points
    const fid = (f) => (/^room\./.test(f) ? f : (f.startsWith("tile:") ? "tile." : "resident.") + S.ST.mibis[+f.slice(f.indexOf(":") + 1)].id);
    S.UI.viv.f = f ? fid(f) : null; S.UI.hab.id = null; S.goto("vivarium"); if (f) S.UI.viv.f = fid(f);
    if (panel) S.UI.panel = { screen: "vivarium", id: panel, focus: "" };   // after the screen change, which closes a panel
  }, [sc.set.toString(), sc.f, sc.light ?? null, sc.panel ?? null]);
}
export async function vivariumStates(visit, { motion = false, timed = true } = {}) {
  const r = await still(visit); if (motion || !timed) return r;
  const t = await walk(visit); return { fails: [...r.fails, ...t.fails] };
}
async function still(visit) {
  const { page, fails, fail, close } = await openStation({ motion: false });
  await page.evaluate((src) => { window.__world = eval(src)(); }, `(${WORLD.toString()})`);
  try {
    for (const [name, sc] of Object.entries(SCENES)) {
      await enter(page, sc); await page.waitForTimeout(900);
      const u = await page.evaluate(() => ({ screen: window.__st.UI.screen, state: window.__st.props?.state, cur: window.__st.props?.focus?.cur, n: window.__st.props?.regions?.tiles?.items?.length, room: window.__st.props?.regions?.room?.id, residents: window.__st.props?.regions?.residents?.length }));
      if (u.screen !== "vivarium" || u.state !== sc.state || (/^room\./.test(sc.f ?? "") && u.cur !== sc.f) || (sc.room && (u.room !== sc.room || u.residents !== 6))) fail(`vivarium-${name}: on ${u.screen}, ${u.state}, the room ${u.room}, ${u.residents} residents`);
      await visit(sc.name ?? "vivarium-" + name, page, fail, sc.captureOnly ? { captureOnly: true } : undefined);
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
    const u = await page.evaluate(() => ({ screen: window.__st.UI.screen, n: window.__st.props?.regions?.residents?.length })); if (u.screen !== "vivarium" || u.n !== 8) fail("vivarium-walk-8000ms: " + JSON.stringify(u));
    await visit("vivarium-walk-8000ms", page, fail);
    // The developer switch "Motion sets (stand-ins)", a mechanism golden (not art): the moving household on its stand-in cells (S01 adult ×6, S01 juvenile ×5, S05 juvenile ×1), the Station time noon, 8000 ms in
    await page.evaluate(() => { const w = window.__world, S = window.__st; w.reset(); w.rooms(2); w.adults(6); w.young(5); const st = S.ST, k = st.mibis.length; S.seedAdults("S05", 9, 1); for (const m of st.mibis.slice(k)) { m.born = st.turn; m.paint = { state: "landed" }; }
      { const a = st.mibis[7], b = st.mibis[11]; for (const f of ["room", "slot", "bay"]) [a[f], b[f]] = [b[f], a[f]]; }   // twelve housed are two rooms and the first room shows eight: the S05 juvenile takes the eighth place of the first room, so the moving household is the one in view
      S.settings.motionSets = true; S.settings.stationTime = "12:00"; S.UI.idle = false; S.UI.hab.id = null; S.UI.viv.f = "tile." + st.mibis[0].id; S.goto("vivarium"); S.UI.viv.f = "tile." + st.mibis[0].id; });
    await step(40); await step(8000);
    { const m = await page.evaluate(() => ({ screen: window.__st.UI.screen, moving: (window.__st.props?.regions?.residents ?? []).filter((r) => r.moving).length })); if (m.screen !== "vivarium" || m.moving !== 1) fail("vivarium-moving-8000ms: " + JSON.stringify(m)); }
    await visit("vivarium-moving-8000ms", page, fail);
    await page.evaluate(() => { window.__st.settings.motionSets = false; window.__st.settings.stationTime = "12:00"; });
    // R4: Ferns, five adults and a juvenile; the juvenile (id 315, 2 px a tick) is on the shelf's ramp 4000 ms in, coming down it (ids whose seeds put the four others elsewhere)
    await page.evaluate(() => { const w = window.__world, S = window.__st; w.reset(); w.rooms(4); S.ST.face.room = 3; w.adults(5); w.young(1); S.ST.mibis.forEach((m, i) => { m.id = [10, 20, 30, 40, 50, 315][i]; }); S.UI.idle = false; S.settings.light = "day"; S.UI.viv.f = null; S.UI.hab.id = null; S.goto("home"); });
    await step(80);   // Home is drawn once, so that the walk starts again from the seeds (the clock of the earlier scenes is not this scene's: the stills replay the ticks since the walk's origin)
    await page.evaluate(() => window.__st.goto("vivarium")); await step(40); await step(4000);
    { const u = await page.evaluate(() => ({ screen: window.__st.UI.screen, room: window.__st.props?.regions?.room?.id, n: window.__st.props?.regions?.residents?.length })); if (u.screen !== "vivarium" || u.room !== "ferns" || u.n !== 6) fail("vivarium-ramp-ferns-4000ms: " + JSON.stringify(u)); }
    await visit("vivarium-ramp-ferns-4000ms", page, fail);
    const errs = await page.evaluate(() => ({ render: window.__st.renderErrors, face: window.__st.faceErrors })); if (errs.render.length || errs.face.length) fail("errors on the page: " + [...errs.render, ...errs.face].slice(0, 3).join(" | "));
  } finally { await close(); }
  return { fails };
}

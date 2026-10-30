// The Vivarium in each of its capture points on the Station page (?test: the face in test mode), as the layer check and the goldens take them (the collection v2 design §12, the Builder checklist): the room view (docked, away,
// empty in each room, one, eight, twelve, forty and forty in the other three rooms, a walker focused under a crossing one, the levels, the room states, the four lights), the carry (picked up, over another room's drop spot, a swap into a
// full room, at night), the Tucked away page, bring out and a mibi coming out, the pick of two, the house view (twelve, forty, a carry, a traveller), all full with a bud waiting, the chips and the Add a room panel; and, on a virtual clock,
// the walk 8000 ms in, the moving sets 8000 ms in and a walker climbing. Each is reached by the page's own state (UI.viv: the view, the cold page, the carry, the pick) and asserted (screen, state, view, ring) before
// `visit(name, page, fail)` is called. Taken with reduced motion (the walk at its start), the timed ones on a virtual clock. Returns { fails }.
import { openStation } from "./station-page.mjs";
import { WORLD } from "./home-states.mjs";

// the scene's helpers, in the page: a world of n mibis in a room (`fill`), the ids that spread a room's walkers, and the Vivarium's UI
const VIV = () => ({
  // forty: four full rooms and eight tucked away, the species mixed so the card's looks line has something to say
  forty() { const S = window.__st, st = S.ST, w = window.__world; w.rooms(4); st.rooms = 4; st.e = 9;
    st.face.room = 0; w.adults(8); st.mibis.slice(0, 8).forEach((m, i) => { m.tucked = { turn: st.turn | 0, seq: i + 1, from: 0 }; m.room = m.slot = m.bay = null; }); st.tuckSeq = 8;   // the eight tucked away first, so the rooms fill after them
    for (let r = 0; r < 4; r++) { st.face.room = r; w.adults(8); }
    const A = st.mibis.slice(8); for (let r = 0; r < 4; r++) for (let s = 0; s < 8; s++) { const m = A[r * 8 + s]; m.room = r; m.slot = s; m.bay = r * 8 + s; } },
  viv(o) { const S = window.__st, v = S.UI.viv; Object.assign(v, { view: "room", page: 0, carry: null, pick: null, last: null }, o); },
});
const SCENES = {
  docked:  { f: null, state: "rest", set: (w) => { w.rooms(1); w.adults(4); w.young(3); w.carry([0, 1]); } },
  away:    { f: null, state: "rest", set: (w) => { w.rooms(1); w.adults(4); w.young(3); w.carry([0, 1]); w.away(); } },
  empty:   { f: null, state: "empty", set: (w) => { w.rooms(1); } },
  "empty-reeds":    { f: null, state: "empty", room: "reeds", set: (w) => { w.rooms(4); window.__st.ST.rooms = 4; w.adults(2); window.__st.ST.face.room = 1; } },
  "empty-boulders": { f: null, state: "empty", room: "boulders", set: (w) => { w.rooms(4); window.__st.ST.rooms = 4; w.adults(2); window.__st.ST.face.room = 2; } },
  "empty-ferns":    { f: null, state: "empty", room: "ferns", set: (w) => { w.rooms(4); window.__st.ST.rooms = 4; w.adults(2); window.__st.ST.face.room = 3; } },
  "empty-away": { f: null, state: "rest", set: (w) => { w.rooms(1); w.adults(2); w.carry([0, 1]); w.away(); } },   // every mibi of the room away: as empty, the ring on its chip
  one:     { f: null, state: "rest", set: (w) => { w.rooms(1); w.adults(1); } },
  eight:   { f: null, state: "rest", set: (w) => { w.rooms(1); w.adults(8); window.__st.ST.mibis.forEach((m, i) => { m.id = [1075, 188, 479, 7, 191, 2808, 2, 2135][i]; }); } },   // ids whose start seeds spread the eight
  "twelve-v2": { f: null, state: "rest", set: (w) => { const st = window.__st.ST; w.rooms(2); st.rooms = 2; w.adults(5); w.young(3); st.face.room = 1; w.adults(3); for (const m of st.mibis.slice(8)) m.room = 1; st.mibis.slice(8).forEach((m, i) => { m.slot = i; }); st.face.room = 0; } },   // Roots full (5 walking, 3 resting), Reeds 3
  forty:   { f: null, state: "rest", set: (w) => { window.__viv.forty(); window.__st.ST.face.room = 0; } },
  "forty-reeds":    { f: null, state: "rest", room: "reeds", set: (w) => { window.__viv.forty(); window.__st.ST.face.room = 1; } },
  "forty-boulders": { f: null, state: "rest", room: "boulders", set: (w) => { window.__viv.forty(); window.__st.ST.face.room = 2; } },
  "forty-ferns":    { f: null, state: "rest", room: "ferns", set: (w) => { window.__viv.forty(); window.__st.ST.face.room = 3; } },
  // R4b (UI/UX, the R4b layout read Overlaps): a walker in front by depth crosses the focused one's ring and its name tag: the focus set is drawn above the walkers (resident.order). Five on Roots, the ring on the fourth
  "focus-crossed": { f: "resident:3", state: "rest", set: (w) => { w.rooms(1); w.adults(5); window.__st.ST.mibis.forEach((m, i) => { m.id = [301, 1627, 1643, 1923, 762][i]; }); } },
  ...Object.fromEntries(["dawn", "day", "dusk", "night"].map((l) => ["docked-" + l, { f: null, state: "rest", light: l, set: (w) => { w.rooms(1); w.adults(4); w.young(3); w.carry([0, 1]); } }])),
  // R3 (the rooms design): the other three rooms by day, six residents
  "room-reeds":    { f: null, state: "rest", room: "reeds",    set: (w) => { w.rooms(4); window.__st.ST.face.room = 1; w.adults(6); window.__st.ST.mibis[3].id = 94; } },
  "room-boulders": { f: null, state: "rest", room: "boulders", set: (w) => { w.rooms(4); window.__st.ST.face.room = 2; w.adults(6); window.__st.ST.mibis[3].id = 106; } },
  "room-ferns":    { f: null, state: "rest", room: "ferns",    set: (w) => { w.rooms(4); window.__st.ST.face.room = 3; w.adults(6); window.__st.ST.mibis[3].id = 349; } },
  "level-roots":   { f: null, state: "rest", room: "roots", set: (w) => { w.rooms(1); w.adults(6); window.__st.ST.mibis.forEach((m, i) => { m.id = [3, 1, 2, 4, 5, 7][i]; }); } },
  "room-new":   { f: "room.new", state: "rest", set: (w) => { const st = window.__st.ST; w.rooms(1); st.rooms = 1; st.e = 9; w.adults(6); } },   // one room, six of eight places: the ring on Add a room
  "room-empty": { f: "room.1", state: "empty", set: (w) => { const st = window.__st.ST; w.rooms(2); st.rooms = 2; st.e = 9; w.adults(3); st.face.room = 1; } },   // two rooms: the second shown empty, the ring on its chip
  "rooms-four": { f: "room.2", state: "rest", set: (w) => { const st = window.__st.ST; w.rooms(4); st.rooms = 4; st.e = 9; st.face.room = 0; w.adults(3); st.face.room = 1; w.adults(2); st.face.room = 2; w.adults(4); } },   // all four rooms (no Add a room chip), the third shown
  "room-short": { f: "room.new", state: "rest", set: (w) => { const st = window.__st.ST; w.rooms(1); st.rooms = 1; st.e = 3; w.adults(6); } },   // short of Energy: the dimmed cap
  "panel-add-room": { name: "panel-add-room", f: "room.new", state: "rest", panel: "addRoom", set: (w) => { const st = window.__st.ST; w.rooms(1); st.rooms = 1; st.e = 9; w.adults(6); } },
  // the carry (§3): picked up where it stands (the hand on itself); carried to another room's drop spot; a swap into a full room; at night (a sleeper stays curled in hand)
  "pick-up": { f: "resident:1", state: "rest", viv: { carry: "move:1" }, set: (w) => { const st = window.__st.ST; w.rooms(2); st.rooms = 2; w.adults(5); st.face.room = 0; } },
  carry:   { f: "drop.0", state: "rest", room: "reeds", viv: { carry: "move:1:0" }, set: (w) => { const st = window.__st.ST; w.rooms(2); st.rooms = 2; w.adults(5); st.face.room = 1; w.adults(3); for (const m of st.mibis.slice(5)) m.room = 1; st.mibis.slice(5).forEach((m, i) => { m.slot = i; }); } },   // Bean from Roots over Reeds' first drop spot: "Reeds 3 of 8, then 4 of 8"
  "carry-swap-full": { f: "resident:8", state: "rest", room: "reeds", viv: { carry: "move:1:0" }, set: (w) => { const st = window.__st.ST; w.rooms(2); st.rooms = 2; w.adults(5); w.adults(8); for (const m of st.mibis.slice(5)) m.room = 1; st.mibis.slice(5).forEach((m, i) => { m.slot = i; }); st.face.room = 1; } },   // Reeds full: over Pip, "Swap Bean and Pip", "Reeds is full"
  "night-carry": { f: "resident:1", state: "rest", light: "night", time: "23:00", viv: { carry: "move:1" }, set: (w) => { const st = window.__st.ST; w.rooms(1); w.adults(4); } },
  // the Tucked away page (§3): eight in the cold recess, the ring on the first; bring out (a tucked mibi in hand over a free drop spot); coming out (its silhouette and the lamp on its spot)
  tucked:  { f: "tucked:5", state: "rest", viv: { view: "tucked" }, set: (w) => { const st = window.__st.ST; w.rooms(1); w.adults(5); w.adults(3); st.mibis.slice(5).forEach((m, i) => { m.tucked = { turn: st.turn | 0, seq: i + 1, from: 0 }; m.room = m.slot = m.bay = null; }); st.tuckSeq = 3; } },
  "bring-out": { f: "drop.0", state: "rest", viv: { carry: "out:5:0" }, set: (w) => { const st = window.__st.ST; w.rooms(1); st.e = 9; w.adults(5); w.adults(1); const m = st.mibis[5]; m.tucked = { turn: st.turn | 0, seq: 1, from: 0 }; m.room = m.slot = m.bay = null; st.tuckSeq = 1; } },
  "coming-out": { f: "resident:5", state: "rest", set: (w) => { const st = window.__st.ST; w.rooms(1); w.adults(5); w.adults(1); const m = st.mibis[5]; m.tucked = { turn: st.turn | 0, seq: 1, from: 0, out: (st.turn | 0) + 2, shift: 2, spot: 0 }; m.room = 0; m.slot = 5; m.bay = 5; } },
  // the pick of two (§3): Dot framed, the ring on its best partner
  "pick-two": { f: "resident:2", state: "rest", viv: { pick: 0 }, set: (w) => { w.rooms(1); w.adults(5); } },
  // the house view (§5): twelve, forty, a carry over another room's free place, a traveller under the ring
  "house-twelve":  { f: null, state: "rest", viv: { view: "house" }, set: (w) => { const st = window.__st.ST; w.rooms(2); st.rooms = 2; w.adults(5); w.young(3); w.adults(3); for (const m of st.mibis.slice(8)) m.room = 1; st.mibis.slice(8).forEach((m, i) => { m.slot = i; }); st.face.room = 0; } },
  "house-forty":   { f: null, state: "rest", viv: { view: "house" }, set: (w) => { window.__viv.forty(); window.__st.ST.face.room = 0; } },
  "house-carry":   { f: "house.free.1.3", state: "rest", viv: { view: "house", carry: "move:1" }, set: (w) => { const st = window.__st.ST; w.rooms(2); st.rooms = 2; w.adults(5); w.adults(3); for (const m of st.mibis.slice(5)) m.room = 1; st.mibis.slice(5).forEach((m, i) => { m.slot = i; }); st.face.room = 0; } },
  "house-traveller": { f: "house:0", state: "rest", viv: { view: "house" }, set: (w) => { const st = window.__st.ST; w.rooms(2); st.rooms = 2; w.adults(4); w.young(2); w.carry([0, 1]); w.away(); } },
  // all full with a bud waiting (§7): the notice "Full · a bud waits", four full rooms
  "full-bud": { f: null, state: "rest", set: (w) => { window.__viv.forty(); window.__world.bud(true); window.__st.ST.face.room = 0; } },
};
async function enter(page, sc) {
  await page.evaluate(([setSrc, f, light, panel, viv, time]) => {
    const w = window.__world; w.reset(); const S = window.__st; S.ST.rooms = 1; S.ST.e = 6; S.ST.tuckSeq = 0; eval(`(${setSrc})`)(w); S.UI.idle = false; S.settings.light = light ?? "day"; S.settings.stationTime = time ?? "12:00";
    const mid = (i) => S.ST.mibis[+i].id;
    const fid = (f) => (/^(room|drop|plate|house\.free)\./.test(f) ? f : f.startsWith("tucked:") ? "tucked." + mid(f.slice(7)) : f.startsWith("house:") ? "house." + mid(f.slice(6)) : "resident." + mid(f.slice(f.indexOf(":") + 1)));
    const o = {}; if (viv?.view) o.view = viv.view;
    if (viv?.carry) { const [kind, i, room] = viv.carry.split(":"), m = S.ST.mibis[+i]; o.carry = { id: m.id, kind, room: m.room ?? null, view: "room", page: 0, from: room != null ? +room : S.ST.face.room }; }
    if (viv?.pick != null) o.pick = { a: mid(viv.pick) };
    S.UI.hab.id = null; S.UI.panel = null; S.goto("vivarium"); window.__viv.viv(o); S.UI.viv.f = f ? fid(f) : null;   // after the screen change (the way in resets the view)
    if (panel) S.UI.panel = { screen: "vivarium", id: panel, focus: "" };
  }, [sc.set.toString(), sc.f, sc.light ?? null, sc.panel ?? null, sc.viv ?? null, sc.time ?? null]);
}
export async function vivariumStates(visit, { motion = false, timed = true } = {}) {
  const r = await still(visit); if (motion || !timed) return r;
  const t = await walk(visit); return { fails: [...r.fails, ...t.fails] };
}
async function prepare(page) { await page.evaluate(([a, b]) => { window.__world = eval(a)(); window.__viv = eval(b)(); }, [`(${WORLD.toString()})`, `(${VIV.toString()})`]); }
async function still(visit) {
  const { page, fails, fail, close } = await openStation({ motion: false });
  await prepare(page);
  try {
    for (const [name, sc] of Object.entries(SCENES)) {
      await enter(page, sc); await page.waitForTimeout(900);
      const u = await page.evaluate(() => ({ screen: window.__st.UI.screen, state: window.__st.props?.state, view: window.__st.props?.view, cur: window.__st.props?.focus?.cur, room: window.__st.props?.regions?.room?.id }));
      const want = sc.viv?.view ?? "room";
      if (u.screen !== "vivarium" || u.state !== sc.state || u.view !== want || (sc.f && /^(room|drop|house\.free)\./.test(sc.f) && u.cur !== sc.f) || (sc.room && u.room !== sc.room)) fail(`vivarium-${name}: on ${u.screen}, ${u.state}, the ${u.view} view, the room ${u.room}, the ring on ${u.cur}`);
      await visit(sc.name ?? "vivarium-" + name, page, fail, sc.captureOnly ? { captureOnly: true } : undefined);
    }
    const errs = await page.evaluate(() => ({ render: window.__st.renderErrors, face: window.__st.faceErrors })); if (errs.render.length || errs.face.length) fail("errors on the page: " + [...errs.render, ...errs.face].slice(0, 3).join(" | "));
  } finally { await close(); }
  return { fails };
}
async function walk(visit) {
  const { page, fails, fail, step, close } = await openStation({ motion: true, clock: true });
  await prepare(page);
  try {
    await enter(page, SCENES.eight); await step(40); await step(8000);
    const u = await page.evaluate(() => ({ screen: window.__st.UI.screen, n: window.__st.props?.regions?.residents?.length })); if (u.screen !== "vivarium" || u.n !== 8) fail("vivarium-walk-8000ms: " + JSON.stringify(u));
    await visit("vivarium-walk-8000ms", page, fail);
    // The developer switch "Motion sets (stand-ins)", a mechanism golden (not art): at the room view's one scale the moving sets' atlases (cut at Home's world size) do not play: every mibi walks as its stand translated (vivarium.json notes.scale)
    await page.evaluate(() => { const w = window.__world, S = window.__st; w.reset(); w.rooms(2); w.adults(6); w.young(5); const st = S.ST, k = st.mibis.length; S.seedAdults("S05", 9, 1); for (const m of st.mibis.slice(k)) { m.born = st.turn; m.paint = { state: "landed" }; }
      { const a = st.mibis[7], b = st.mibis[11]; for (const f of ["room", "slot", "bay"]) [a[f], b[f]] = [b[f], a[f]]; }
      S.settings.motionSets = true; S.settings.stationTime = "12:00"; S.UI.idle = false; S.UI.hab.id = null; S.goto("vivarium"); S.UI.viv.f = "resident." + st.mibis[0].id; });
    await step(40); await step(8000);
    { const m = await page.evaluate(() => ({ screen: window.__st.UI.screen, moving: (window.__st.props?.regions?.residents ?? []).filter((r) => r.moving).length })); if (m.screen !== "vivarium" || m.moving !== 0) fail("vivarium-moving-8000ms: " + JSON.stringify(m)); }
    await visit("vivarium-moving-8000ms", page, fail);
    await page.evaluate(() => { window.__st.settings.motionSets = false; window.__st.settings.stationTime = "12:00"; });
    // R4: a walker climbing: Ferns, five adults and a juvenile on the shelf's ramp 4000 ms in (ids whose seeds put the juvenile on the join then)
    for (const [name, room, ids, ms] of [["vivarium-ramp-ferns-4000ms", 3, [10, 20, 30, 40, 50, 315], 4000]]) {
      await page.evaluate(([room, ids]) => { const w = window.__world, S = window.__st; w.reset(); w.rooms(4); S.ST.face.room = room; w.adults(ids.length - 1); w.young(1); S.ST.mibis.forEach((m, i) => { m.id = ids[i]; }); S.UI.idle = false; S.settings.light = "day"; S.UI.viv.f = null; S.UI.hab.id = null; S.goto("home"); }, [room, ids]);
      await step(80);   // Home is drawn once, so that the walk starts again from the seeds
      await page.evaluate(() => window.__st.goto("vivarium")); await step(40); await step(ms);
      { const u = await page.evaluate(() => ({ screen: window.__st.UI.screen, room: window.__st.props?.regions?.room?.id, n: window.__st.props?.regions?.residents?.length })); if (u.screen !== "vivarium" || u.n !== ids.length) fail(name + ": " + JSON.stringify(u)); }
      await visit(name, page, fail);
    }
    const errs = await page.evaluate(() => ({ render: window.__st.renderErrors, face: window.__st.faceErrors })); if (errs.render.length || errs.face.length) fail("errors on the page: " + [...errs.render, ...errs.face].slice(0, 3).join(" | "));
  } finally { await close(); }
  return { fails };
}

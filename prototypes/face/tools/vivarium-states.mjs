// The Vivarium in each of its capture points on the Station page (?test: the face in test mode), as the layer check and the goldens take them (the collection v2 design §12, the Builder checklist): the room view (docked, away,
// empty in each room, one, eight, twelve, forty and forty in the other three rooms, a walker focused under a crossing one, the levels, the room states, the four lights), a mibi coming out, all full with a bud waiting, the chips and the Add a room panel; and, on a virtual clock,
// the walk 8000 ms in, the moving sets 8000 ms in and a walker climbing. Each is reached by the page's own state (UI.viv) and asserted (screen, state, view, ring) before
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
  // the Wall: `per` mibis in each room (a room a place in the bought order), `tucked` more tucked away, `settle` the last rooms still settling
  fill(per, tucked = 0, settle = 0) { const S = window.__st, st = S.ST, w = window.__world; w.rooms(per.length); st.rooms = per.length; st.e = 9;
    if (tucked) { st.face.room = 0; w.adults(tucked); st.mibis.slice(0, tucked).forEach((m, i) => { m.tucked = { turn: st.turn | 0, seq: i + 1, from: 0 }; m.room = m.slot = m.bay = null; }); st.tuckSeq = tucked; }
    const k0 = st.mibis.length; per.forEach((n, r) => { st.face.room = r % 4; if (n) w.adults(n); }); let at = k0; per.forEach((n, r) => { for (let s2 = 0; s2 < n; s2++) { const m = st.mibis[at++]; m.room = r; m.slot = s2; m.bay = r * 8 + s2; } });
    st.roomMeta = per.map((_, r) => ({ theme: ["roots", "reeds", "boulders", "ferns"][r] ?? null, settleUntil: r >= per.length - settle ? (st.turn | 0) + 2 : 0 })); st.face.room = 0; },
  // the partner pick's world: Roots holds Oak, Elm, Fen (A) and Wren (Fen's sibling, a child of Oak and Elm), Reeds Moss, Pip, Bud (young) and Sky (on a breather)
  pairs() { const S = window.__st, st = S.ST, ms = (window.__viv.fill([4, 4]), st.mibis), [oak, elm, fen, wren, , , bud, sky] = ms, par = [{ id: oak.id, name: oak.name }, { id: elm.id, name: elm.name }];
    fen.parents = par; wren.parents = par.map((q) => ({ ...q })); oak.born = 1; elm.born = 2; bud.born = st.turn | 0; st.turn = (st.turn | 0) + 1; sky.restUntil = st.turn + 2; },
  viv(o) { const S = window.__st, v = S.UI.viv; Object.assign(v, { view: "room", page: 0, last: null, sort: "room", filter: "all", pick: null, row0: 0, first: 0, nudge: null, move: null, moveFirst: 0, pair: null }, o); },
});
const WALL = (o) => ({ wall: true, state: "wall", f: null, ...o });
const SCENES = {
  // the Wall (the inventory page): none, one, twelve, forty, eighty, one room, ten rooms (the rail's two ends), each sort and filter, a settling room, an empty room, the ring on each stop, Add a room
  "wall-none":     WALL({ state: "none", viv: { view: "wall" }, set: (w) => { w.rooms(1); } }),
  "wall-one":      WALL({ viv: { view: "wall" }, set: (w) => { w.rooms(1); w.adults(1); } }),
  "wall-twelve":   WALL({ viv: { view: "wall" }, set: (w) => { window.__viv.fill([5, 7]); } }),
  "wall-forty":    WALL({ viv: { view: "wall" }, set: (w) => { window.__viv.fill([8, 8, 8, 8], 8); } }),
  "wall-eighty":   WALL({ viv: { view: "wall" }, set: (w) => { window.__viv.fill([8, 8, 8, 8, 8, 8, 8, 8, 8, 8]); } }),
  "wall-one-room": WALL({ viv: { view: "wall" }, set: (w) => { w.rooms(1); window.__viv.fill([6]); } }),
  "wall-ten-top":    WALL({ viv: { view: "wall" }, set: (w) => { window.__viv.fill([3, 3, 3, 3, 3, 3, 3, 3, 3, 3], 4); } }),
  "wall-ten-bottom": WALL({ viv: { view: "wall", first: 9 }, f: "rail.9", set: (w) => { window.__viv.fill([3, 3, 3, 3, 3, 3, 3, 3, 3, 3], 4); } }),
  "wall-sort-kind": WALL({ viv: { view: "wall", sort: "kind" }, set: (w) => { window.__viv.fill([5, 7]); } }),
  "wall-sort-age":  WALL({ viv: { view: "wall", sort: "age" }, set: (w) => { window.__viv.fill([5, 7]); } }),
  "wall-filter-room": WALL({ viv: { view: "wall", filter: "1" }, set: (w) => { window.__viv.fill([5, 7]); } }),
  "wall-filter-tucked": WALL({ viv: { view: "wall", filter: "tucked" }, set: (w) => { window.__viv.fill([5, 7], 4); } }),
  "wall-filter-settling": WALL({ viv: { view: "wall", filter: "2" }, set: (w) => { window.__viv.fill([5, 7, 0], 0, 1); } }),
  "wall-filter-empty": WALL({ viv: { view: "wall", filter: "1" }, set: (w) => { window.__viv.fill([5, 0]); } }),
  "wall-ring-rail": WALL({ viv: { view: "wall" }, f: "rail.1", set: (w) => { window.__viv.fill([5, 7]); } }),
  "wall-ring-toolbar": WALL({ viv: { view: "wall" }, f: "sort.kind", set: (w) => { window.__viv.fill([5, 7]); } }),
  "wall-ring-wall": WALL({ viv: { view: "wall" }, f: "cell:3", set: (w) => { window.__viv.fill([5, 7]); } }),
  "wall-ring-card": WALL({ viv: { view: "wall" }, f: "plate.1", set: (w) => { window.__viv.fill([5, 7]); } }),
  "wall-ring-band": WALL({ viv: { view: "wall" }, f: "band", set: (w) => { window.__viv.fill([5, 7]); } }),
  "wall-move":          WALL({ viv: { view: "wall", moveI: 1 }, set: (w) => { window.__viv.fill([5, 3]); } }),
  "wall-move-full":     WALL({ viv: { view: "wall", moveI: 0 }, set: (w) => { window.__viv.fill([3, 8]); } }),
  "wall-move-settling": WALL({ viv: { view: "wall", moveI: 0 }, set: (w) => { window.__viv.fill([3, 2, 0], 0, 1); } }),
  "wall-pick-zero":  WALL({ viv: { view: "wall", pick: { on: true, ids: [] } }, set: (w) => { window.__viv.fill([5, 7]); } }),
  "wall-pick-three": WALL({ viv: { view: "wall", pickI: [0, 2, 4] }, f: "cell:1", set: (w) => { window.__viv.fill([5, 7]); } }),
  "wall-pick-out":   WALL({ viv: { view: "wall", filter: "0", pickI: [0, 6, 8] }, f: "cell:1", set: (w) => { window.__viv.fill([5, 7]); } }),
  "wall-pick-held":  WALL({ viv: { view: "wall", pickI: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] }, f: "plate.1", set: (w) => { window.__viv.fill([5, 7]); } }),
  "wall-pick-move":  WALL({ viv: { view: "wall", pickI: [0, 2, 4], moveMany: true }, set: (w) => { window.__viv.fill([5, 3, 6]); } }),
  // the swap into a full room (the design §6): Reeds is full; its residents as 64 px faces, the ones that cannot move dim and held with their reason, the several-picked choose state
  "wall-swap":         WALL({ viv: { view: "wall", moveI: 0, swapRoom: 1 }, f: "swap:3", set: (w) => { window.__viv.fill([3, 8]); } }),
  "wall-swap-held":    WALL({ viv: { view: "wall", moveI: 0, swapRoom: 1 }, f: "swap:4", set: (w) => { window.__viv.fill([3, 8]); w.carry([4]); const st = window.__st.ST, m = st.mibis[5]; m.tucked = { turn: st.turn | 0, seq: 1, from: 1, out: (st.turn | 0) + 2, shift: 2, spot: 0 }; m.room = 1; m.slot = 2; } }),
  "wall-swap-several": WALL({ viv: { view: "wall", pickI: [0, 1, 2], moveMany: true, swapRoom: 1 }, f: "swap:3", set: (w) => { window.__viv.fill([3, 7]); } }),
  "wall-swap-chosen":  WALL({ viv: { view: "wall", pickI: [0, 1, 2], moveMany: true, swapRoom: 1, chosenI: [3] }, f: "swap:4", set: (w) => { window.__viv.fill([3, 7]); } }),
  // Breed opens the partner pick (the breeding design §3): A's species only, the card the pair card; Breed held on a breather
  "wall-pair":        WALL({ viv: { view: "wall", pairI: 2 }, set: (w) => { window.__viv.pairs(); } }),
  "wall-pair-kin":    WALL({ viv: { view: "wall", pairI: 2 }, f: "cell:3", set: (w) => { window.__viv.pairs(); } }),
  "wall-pair-rest":   WALL({ viv: { view: "wall", pairI: 2 }, f: "cell:7", set: (w) => { window.__viv.pairs(); } }),
  "wall-pair-young":  WALL({ viv: { view: "wall", pairI: 2 }, f: "cell:6", set: (w) => { window.__viv.pairs(); } }),
  "wall-pair-plate":  WALL({ viv: { view: "wall", pairI: 2 }, f: "plate.0", set: (w) => { window.__viv.pairs(); } }),
  "wall-breed-held":  WALL({ viv: { view: "wall", lastI: 2 }, f: "plate.4", set: (w) => { window.__viv.pairs(); window.__st.ST.mibis[2].restUntil = (window.__st.ST.turn | 0) + 2; } }),
  "wall-swap-keep":   WALL({ viv: { view: "wall", pickI: [0, 1, 2], moveMany: true, swapRoom: 1, chosenI: [3] }, f: "swap:3", set: (w) => { window.__viv.fill([3, 7]); } }),
  "wall-swap-stays":  WALL({ viv: { view: "wall", pickI: [0, 1, 3], moveMany: true, swapRoom: 1 }, f: "swap:3", set: (w) => { window.__viv.fill([3, 7]); } }),
  "wall-pair-half":   WALL({ viv: { view: "wall", pairI: 2 }, f: "cell:4", set: (w) => { window.__viv.pairs(); const ms = window.__st.ST.mibis; ms[4].parents = [{ id: ms[0].id, name: ms[0].name }, { id: ms[5].id, name: ms[5].name }]; } }),
  "wall-pair-64":     WALL({ viv: { view: "wall", pairI: 2 }, set: (w) => { window.__viv.fill([8, 8, 8]); const st = window.__st.ST; st.turn = (st.turn | 0) + 1; st.mibis[9].restUntil = st.turn + 2; st.mibis[10].tucked = { turn: st.turn, seq: 1, from: 1 }; } }),
  "wall-dawn":  WALL({ light: "dawn",  viv: { view: "wall" }, set: (w) => { window.__viv.fill([5, 7]); } }),
  "wall-dusk":  WALL({ light: "dusk",  viv: { view: "wall" }, set: (w) => { window.__viv.fill([5, 7]); } }),
  "wall-night": WALL({ light: "night", viv: { view: "wall" }, set: (w) => { window.__viv.fill([5, 7]); } }),
  // Add a room with the find requirement on (the themed find): needs a find, found short of Energy, found and live, several found
  "wall-add-needs-find":   WALL({ viv: { view: "wall" }, f: "rail.add", set: (w) => { window.__viv.fill([5, 7]); window.__st.settings.roomRules = { needFind: true }; window.__st.ST.finds = []; } }),
  "wall-add-found-short":  WALL({ viv: { view: "wall" }, f: "rail.add", set: (w) => { window.__viv.fill([5, 7]); window.__st.settings.roomRules = { needFind: true }; window.__st.ST.finds = ["boulders"]; window.__st.ST.e = 3; } }),
  "wall-add-found":        WALL({ viv: { view: "wall" }, f: "rail.add", set: (w) => { window.__viv.fill([5, 7]); window.__st.settings.roomRules = { needFind: true }; window.__st.ST.finds = ["boulders"]; } }),
  "wall-add-several":      WALL({ viv: { view: "wall" }, f: "rail.add", set: (w) => { window.__viv.fill([5, 7]); window.__st.settings.roomRules = { needFind: true }; window.__st.ST.finds = ["boulders", "ferns"]; } }),
  "wall-panel-add-room":   WALL({ viv: { view: "wall" }, f: "rail.add", panel: "addRoom", set: (w) => { window.__viv.fill([5, 7]); } }),
  "wall-add-short": WALL({ viv: { view: "wall" }, f: "rail.add", set: (w) => { window.__viv.fill([5, 7]); window.__st.ST.e = 3; } }),

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
  "coming-out": { f: "resident:5", state: "rest", set: (w) => { const st = window.__st.ST; w.rooms(1); w.adults(5); w.adults(1); const m = st.mibis[5]; m.tucked = { turn: st.turn | 0, seq: 1, from: 0, out: (st.turn | 0) + 2, shift: 2, spot: 0 }; m.room = 0; m.slot = 5; m.bay = 5; } },
  // all full with a bud waiting (§7): the notice "Full · a bud waits", four full rooms
  "full-bud": { f: null, state: "rest", set: (w) => { window.__viv.forty(); window.__world.bud(true); window.__st.ST.face.room = 0; } },
};
// each scene is a press (UI.lastInput): a group of sixty scenes lasts about a minute, and the Station goes to Idle after a minute without one (intents/frame.mjs idleTick)
async function enter(page, sc) {
  await page.evaluate(([setSrc, f, light, panel, viv, time]) => {
    const w = window.__world; w.reset(); const S = window.__st; S.ST.rooms = 1; S.ST.e = 6; S.ST.tuckSeq = 0; delete S.settings.roomRules; eval(`(${setSrc})`)(w); S.UI.idle = false; S.UI.lastInput = performance.now(); S.settings.light = light ?? "day"; S.settings.stationTime = time ?? "12:00";
    const mid = (i) => S.ST.mibis[+i].id;
    const fid = (f) => (/^(room|plate|rail|sort|band|pill)/.test(f) ? f : f.startsWith("cell:") ? "cell." + mid(f.slice(5)) : f.startsWith("swap:") ? "swap." + mid(f.slice(5)) : "resident." + mid(f.slice(f.indexOf(":") + 1)));
    const o = { ...(viv ?? {}) }; if (o.moveI != null) { o.move = { id: mid(o.moveI) }; delete o.moveI; } if (o.lastI != null) { o.last = mid(o.lastI); delete o.lastI; } if (o.pairI != null) { o.pair = { a: mid(o.pairI) }; delete o.pairI; } if (o.pickI) { o.pick = { on: true, ids: o.pickI.map(mid) }; delete o.pickI; } if (o.moveMany) { o.move = { ids: o.pick.ids.slice() }; delete o.moveMany; } if (o.swapRoom != null) { o.move = { ...o.move, swap: { room: o.swapRoom, chosen: (o.chosenI ?? []).map(mid) } }; delete o.swapRoom; delete o.chosenI; }
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
  const all = [];
  // the Wall's scenes and the room view's each get a page of their own: the face holds a limited table of pictures, and eighty portraits in three sizes fill it
  for (const group of [Object.entries(SCENES).filter(([, s]) => s.wall), Object.entries(SCENES).filter(([, s]) => !s.wall)]) {
    const { page, fails, fail, close } = await openStation({ motion: false });
    await prepare(page);
    try {
      for (const [name, sc] of group) {
        if (process.env.VIV_ONLY && !new RegExp(process.env.VIV_ONLY).test(name)) continue;   // a debugging aid: only the scenes named by this pattern
        await enter(page, sc); await page.waitForTimeout(900);
        const u = await page.evaluate(() => ({ screen: window.__st.UI.screen, state: window.__st.props?.state, view: window.__st.props?.view, cur: window.__st.props?.focus?.cur, room: window.__st.props?.regions?.room?.id }));
        const want = sc.viv?.view ?? "room";
        if (sc.wall) { if (u.screen !== "vivarium" || u.view !== "wall" || u.state !== sc.state || (sc.f && !/^(cell|swap):/.test(sc.f) && u.cur !== sc.f)) fail(`vivarium-${name}: on ${u.screen}, ${u.state}, the ${u.view} view, the ring on ${u.cur}`); await visit(sc.name ?? "vivarium-" + name, page, fail); continue; }
        if (u.screen !== "vivarium" || u.state !== sc.state || u.view !== want || (sc.f && /^room\./.test(sc.f) && u.cur !== sc.f) || (sc.room && u.room !== sc.room)) fail(`vivarium-${name}: on ${u.screen}, ${u.state}, the ${u.view} view, the room ${u.room}, the ring on ${u.cur}`);
        await visit(sc.name ?? "vivarium-" + name, page, fail, sc.captureOnly ? { captureOnly: true } : undefined);
      }
      const errs = await page.evaluate(() => ({ render: window.__st.renderErrors, face: window.__st.faceErrors })); if (errs.render.length || errs.face.length) fail("errors on the page: " + [...errs.render, ...errs.face].slice(0, 3).join(" | "));
    } finally { await close(); }
    all.push(...fails);
  }
  return { fails: all };
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
      await page.evaluate(() => { window.__st.goto("vivarium"); window.__viv.viv({}); }); await step(40); await step(ms);   // the room view, as the walk states are
      { const u = await page.evaluate(() => ({ screen: window.__st.UI.screen, room: window.__st.props?.regions?.room?.id, n: window.__st.props?.regions?.residents?.length })); if (u.screen !== "vivarium" || u.n !== ids.length) fail(name + ": " + JSON.stringify(u)); }
      await visit(name, page, fail);
    }
    const errs = await page.evaluate(() => ({ render: window.__st.renderErrors, face: window.__st.faceErrors })); if (errs.render.length || errs.face.length) fail("errors on the page: " + [...errs.render, ...errs.face].slice(0, 3).join(" | "));
  } finally { await close(); }
  return { fails };
}

// One mibi up close in each of its capture points on the Station page (?test: the face in test mode), as the layer check and the goldens take them: `habitat-rest` (an adult at home, the ring on it), `habitat-meet` (the new mibi, the meet ribbon in
// the tag's place), `habitat-out` (the mibi out with the Companion while it is away: the out mark, the ring on the name), `habitat-card` (a
// bonded bred mibi: the heart, three notches, where it came from, plates read and unread), `habitat-plate` (the ring on an unread plate), `habitat-door` (the Companion's set, a request waiting), `habitat-door-away`, `habitat-cross` (partners, one out
// while the Companion is away), `habitat-portrait` (a sitting held), `habitat-portrait-painting` (its sitting begun, the crate on its way), `habitat-portrait-pictured` (its picture landed: the bone canvas, not a portrait; ✓ Look at the portrait), `habitat-portrait-portrayed` (its portrait came, no picture yet: the paper window; both with the stamp's portrayed corner), `habitat-panel-wild` (the Return panel; `habitat-wild-armed` is retired with the arm, T-20261016-51), `habitat-tile` (the ring on a tile), `habitat-eight` (a full room's eight places), `habitat-move` (the ring on a room's chip: ✓ Move here), `habitat-move-full` (✓ on a full room's dimmed Move: its plate), `habitat-wild-young-card` (a young mibi's Return panel), `habitat-wild-bonded-pressed` (✓ on the held Return of a bonded juvenile), `habitat-docked-dawn|day|dusk|night` (the four lights, for the art director)
// and the namer over it: `habitat-namer` (the meet's first ✓: Fig selected, the ring on Done), `habitat-namer-typed`, `habitat-namer-accents`, `habitat-namer-refused`, `habitat-namer-empty`, `habitat-namer-full`.
// Each is reached by the page's own state and asserted (screen, state, ring, namer) before `visit(name, page, fail)` is called. Taken with reduced motion. Returns { fails }.
import { openStation } from "./station-page.mjs";
import { WORLD } from "./home-states.mjs";
import { hatched } from "./incubator-states.mjs";
import { boneCanvas } from "./portrait-fixture.mjs";
import { digestOf } from "../../station/src/portrait-source.mjs";

const PICTURED = await digestOf(boneCanvas());   // the bone canvas's digest, computed by the model's own function

// keys: the namer's presses after it opens ("target" on the namer screen); open: how the namer is opened ("meet" ✓ on the new mibi, "rename" ✓ on the name)
const SCENES = {
  rest: { shown: 0, f: "resident", state: "rest", set: (w) => { w.rooms(1); w.adults(4); } },
  meet: { shown: 2, f: "resident", state: "meet", meet: true, set: (w) => { w.rooms(1); w.adults(2); w.bud(true); window.__st.openBud(); } },
  out: { shown: 0, f: "name", state: "out", set: (w) => { w.rooms(1); w.adults(4); w.carry([0]); w.away(); } },
  card: { shown: 1, f: "plate.0", state: "rest", set: (w) => { w.rooms(1); w.adults(4); const m = window.__st.ST.mibis[1], fr = window.__st.frameOf("S01"); m.bonded = true; m.notches = 3; m.mem = "pond"; m.from = { ...m.from, of: [window.__st.ST.mibis[0].name, window.__st.ST.mibis[2].name] }; m.read = fr.chapters.filter((c, i) => i !== 0 && !c.sealed).map((c) => c.id); } },
  plate: { shown: 0, f: "plate.1", state: "rest", set: (w) => { w.rooms(1); w.adults(4); const m = window.__st.ST.mibis[0], fr = window.__st.frameOf("S01"); m.read = fr.chapters.filter((c, i) => i !== 1 && !c.sealed).map((c) => c.id); window.__st.ST.d = 9; } },
  door: { shown: 0, f: "door", state: "rest", set: (w) => { w.rooms(1); w.adults(4); w.carry([1]); window.__st.intent({ screen: "habitat", target: "door", verb: "confirm" }); } },
  "door-away": { shown: 0, f: "door", state: "rest", set: (w) => { w.rooms(1); w.adults(4); w.carry([1, 2]); w.away(); } },
  cross: { shown: 0, f: "cross", state: "rest", set: (w) => { w.rooms(1); w.adults(4); w.carry([1]); w.away(); } },
  portrait: { shown: 0, f: "portrait", state: "rest", set: (w) => { w.rooms(1); w.adults(4); const st = window.__st.ST; st.sitting = { source: "dev", key: null, at: 0 }; Object.assign(st.mibis[0], { habits: ["calm"], walked: ["wood"], places: ["wood"] }); } },   // a pose seen and a place been to: the sitting is held and nothing blocks it, so the golden proves the door open (✓ Portray {name})
  "portrait-painting": { shown: 0, f: "portrait", state: "rest", set: (w) => { w.rooms(1); w.adults(4); const S = window.__st; S.ST.sitting = { source: "dev", key: null, at: 0 }; S.ST.mibis[0].portrait = { state: "painting" }; } },
  "portrait-portrayed": { shown: 0, f: "portrait", state: "rest", set: (w) => { w.rooms(1); w.adults(4); const S = window.__st; S.ST.sitting = { source: "dev", key: null, at: 0 }; S.ST.mibis[0].portrait = { state: "delivered" }; } },
  "portrait-pictured": { shown: 0, f: "portrait", state: "rest", pictured: true, set: (w) => { w.rooms(1); w.adults(4); window.__st.ST.sitting = { source: "dev", key: null, at: 0 }; } },   // its portrait came and its picture landed: the bone canvas over the frame's window (not a portrait, not art)
  "young-night": { shown: 1, f: "resident", state: "rest", light: "night", set: (w) => { w.rooms(1); w.adults(1); w.young(1); } },   // a juvenile up close at 304x312, the largest graded picture (fix 7)
  "panel-wild": { shown: 3, f: "wild", state: "rest", panel: true, set: (w) => { w.rooms(1); w.adults(3); w.young(1); const st = window.__st.ST; st.mibis[3].born = st.turn - 4; } },   // ✓ on Wild opens the Return panel (the ring on Keep); retires habitat-wild-armed (the arm no longer exists, T-20261016-51)
  tile: { shown: 2, f: "tile:2", state: "rest", set: (w) => { w.rooms(1); w.adults(4); } },
  eight: { shown: 5, f: "resident", state: "rest", set: (w) => { w.rooms(1); w.adults(8); } },   // R6: a full room's eight places (was twelve, two rooms of the old twelve bays)
  // R6 (T-20261027-319): moving up close (the ring on a room's chip), the house rule's plates and the Return card of a young mibi
  move: { shown: 0, f: "room.1", state: "rest", set: (w) => { w.rooms(2); w.adults(4); const m = window.__st.ST.mibis[3]; m.room = 1; m.slot = 0; m.bay = 8; } },   // two rooms, the second with one mibi: ✓ Move Dot here, seven places free
  "wild-young-card": { shown: 3, f: "wild", state: "rest", panel: true, set: (w) => { w.rooms(1); w.adults(3); w.young(1); } },   // a young mibi's Return panel: its pod comes once grown
  "docked-dawn": { shown: 0, f: "resident", state: "rest", light: "dawn", set: (w) => { w.rooms(1); w.adults(4); } },
  "docked-day": { shown: 0, f: "resident", state: "rest", light: "day", set: (w) => { w.rooms(1); w.adults(4); } },
  "docked-dusk": { shown: 0, f: "resident", state: "rest", light: "dusk", set: (w) => { w.rooms(1); w.adults(4); } },
  "docked-night": { shown: 0, f: "resident", state: "rest", light: "night", set: (w) => { w.rooms(1); w.adults(4); } },
  // fix 14 (§14.4): capture states, not goldens: a juvenile up close with the ring on its footprint, one a light (the 2 px floor, layer-check rule F2; the CD's frames)
  ...Object.fromEntries(["dawn", "day", "dusk", "night"].map((l) => ["resident-focused-" + l, { shown: 4, f: "resident", state: "rest", light: l, captureOnly: true, set: (w) => { w.rooms(1); w.adults(4); w.young(3); } }])),
  namer: { shown: 0, f: "resident", state: "rest", meet: true, open: true, set: (w) => { w.rooms(1); w.adults(4); } },
  "namer-typed": { shown: 0, f: "resident", state: "rest", open: "rename", keys: ["act.suggest", "x:back", "key.12", "key.14", "key.13", "key.4"], set: (w) => { w.rooms(1); w.adults(4); } },
  "namer-accents": { shown: 0, f: "resident", state: "rest", open: "rename", keys: ["x:back", "key.3", "mod.page"], set: (w) => { w.rooms(1); w.adults(4); } },
  "namer-refused": { shown: 0, f: "resident", state: "rest", open: "rename", keys: ["x:back", "key.0", "act.done"], set: (w) => { w.rooms(1); w.adults(4); } },
  "namer-empty": { shown: 0, f: "resident", state: "rest", open: "rename", keys: ["x:back"], set: (w) => { w.rooms(1); w.adults(4); } },
  "namer-full": { shown: 0, f: "resident", state: "rest", open: "rename", keys: ["x:back", "key.22", ...Array(9).fill(["mod.shift", "key.22"]).flat()], set: (w) => { w.rooms(1); w.adults(4); } },
};
// R6: the scenes where ✓ was pressed on a held target and its message plate stands (4000 ms): taken with motion and the virtual clock, 400 ms after the press, as the plate is an event (reduced motion cuts it away)
const PRESSED = {
  "move-full": { shown: 8, f: "room.0", state: "rest", plate: "The Roots room is full\\nMove one of its mibis out", set: (w) => { w.rooms(2); w.adults(9); } },   // Roots is full and the mibi up close lives in Reeds: ✓ on the dimmed Move plays the full-room plate
  "wild-bonded-pressed": { shown: 3, f: "wild", state: "rest", plate: "A bond is for good\\n\\w+ stays with you\\nCarried and tended, \\w+ grows up", set: (w) => { w.rooms(1); w.adults(3); w.young(1); const m = window.__st.ST.mibis[3]; m.bonded = true; } },   // a bonded juvenile: ✓ on the held Return plays its three lines
};
async function enter(page, sc) {
  await page.evaluate(([setSrc, spec]) => {
    const w = window.__world; w.reset(); eval(`(${setSrc})`)(w); const S = window.__st, ST = S.ST; S.UI.idle = false; S.UI.hab.namer = null; S.settings.light = spec.light ?? "day";
    const id = ST.mibis[spec.shown].id; S.UI.hab.id = id; S.UI.meet = spec.meet ? id : null; S.UI.hab.f = spec.f.startsWith("tile:") ? "tile." + ST.mibis[+spec.f.slice(5)].id : spec.f;
    if (spec.pictured) { const r = S.portraitSource(spec.digest, eval(`(${spec.fixture})`)()); if (!r.ok) throw new Error("portrait fixture: " + r.error); ST.mibis[spec.shown].portrait = { state: "delivered", digest: spec.digest }; }   // the session store only (pixels, never the save); the digest goes on ST as every scene sets ST
    S.goto("habitat"); S.UI.hab.f = spec.f.startsWith("tile:") ? "tile." + ST.mibis[+spec.f.slice(5)].id : spec.f; S.UI.hab.id = spec.f.startsWith("tile:") ? ST.mibis[+spec.f.slice(5)].id : id;
    S.UI.panel = null; if (spec.panel) S.intent({ screen: "habitat", target: "wild", verb: "confirm" });
    if (spec.open) S.intent(spec.open === true ? { screen: "habitat", target: "resident", verb: "confirm" } : { screen: "habitat", target: "name", verb: "confirm" });
    for (const k of spec.keys ?? []) { const [t, v] = k.startsWith("x:") ? ["act.done", k.slice(2)] : [k, "confirm"]; S.intent({ screen: "namer", target: t, verb: v }); }
  }, [sc.set.toString(), { shown: sc.shown, f: sc.f, meet: !!sc.meet, light: sc.light ?? null, panel: !!sc.panel, open: sc.open ?? null, keys: sc.keys ?? null, pictured: !!sc.pictured, digest: PICTURED, fixture: boneCanvas.toString() }]);
}
// Station M1: Greet up close on S01's stand-in close cells under the developer switch, on the virtual clock at 0, 450, 900 and 1350 ms of the moment
async function moments(visit) {
  const { page, fails, fail, step, close } = await openStation({ motion: true, clock: true });
  await page.evaluate((src) => { window.__world = eval(src)(); }, `(${WORLD.toString()})`);
  try {
    for (const at of [0, 450, 900, 1350]) {
      await page.evaluate(() => { const S = window.__st; S.settings.motionSets = true; S.settings.stationTime = "12:00"; });
      await enter(page, SCENES.rest); await step(1200);
      await page.evaluate(() => window.__st.intent({ screen: "habitat", target: "resident", verb: "confirm" })); await step(at || 1);   // at 0: the moment's first frame (a frame must run for the face to draw it)
      const u = await page.evaluate(() => ({ screen: window.__st.UI.screen, moving: !!window.__st.props?.regions?.resident?.moving })); if (u.screen !== "habitat" || !u.moving) fail(`habitat-moment-S01-${at}: ` + JSON.stringify(u));
      await visit("habitat-moment-S01-" + at, page, fail); await step(2500);
    }
    await page.evaluate(() => { const S = window.__st; S.settings.motionSets = false; S.settings.stationTime = "12:00"; });
    const errs = await page.evaluate(() => ({ render: window.__st.renderErrors, face: window.__st.faceErrors })); if (errs.render.length || errs.face.length) fail("errors on the page: " + [...errs.render, ...errs.face].slice(0, 3).join(" | "));
  } finally { await close(); }
  return { fails };
}
// R6: ✓ on a held target (a full room's dimmed Move, a bonded juvenile's Return): the plate stands over the screen
async function pressed(visit) {
  const { page, fails, fail, step, close } = await openStation({ motion: true, clock: true });
  await page.evaluate((src) => { window.__world = eval(src)(); }, `(${WORLD.toString()})`);
  try {
    for (const [name, sc] of Object.entries(PRESSED)) {
      await enter(page, sc); await step(1200);
      await page.evaluate((f) => window.__st.intent({ screen: "habitat", target: f, verb: "confirm" }), sc.f); await step(400);
      const u = await page.evaluate(() => ({ screen: window.__st.UI.screen, cur: window.__st.props?.focus?.cur, msg: window.__st.msg })); if (u.screen !== "habitat" || u.cur !== sc.f || !new RegExp("^" + sc.plate + "$").test(u.msg)) fail(`habitat-${name}: ${JSON.stringify(u)}`);
      await visit("habitat-" + name, page, fail);
    }
    const errs = await page.evaluate(() => ({ render: window.__st.renderErrors, face: window.__st.faceErrors })); if (errs.render.length || errs.face.length) fail("errors on the page: " + [...errs.render, ...errs.face].slice(0, 3).join(" | "));
  } finally { await close(); }
  return { fails };
}
export async function habitatStates(visit, { motion = false, timed = true } = {}) {
  const r = await stillStates(visit); if (motion || !timed) return r;
  const t = await moments(visit), p = await pressed(visit); return { fails: [...r.fails, ...t.fails, ...p.fails] };
}
async function stillStates(visit) {
  const { page, fails, fail, close } = await openStation({ motion: false });
  await page.evaluate((src) => { window.__world = eval(src)(); }, `(${WORLD.toString()})`);
  try {
    for (const [name, sc] of Object.entries(SCENES)) {
      await enter(page, sc); await page.waitForTimeout(900);
      const u = await page.evaluate(() => ({ screen: window.__st.UI.screen, state: window.__st.props?.state, cur: window.__st.props?.focus?.cur, namer: window.__st.props?.overlay?.id ?? null, picture: window.__st.props?.regions?.portrait?.picture }));
      if (sc.pictured && u.picture !== `portrait:${PICTURED}:40x30`) fail(`habitat-${name}: the props carry the picture ${u.picture}`);
      if (u.screen !== "habitat" || u.state !== sc.state) fail(`habitat-${name}: on ${u.screen}, ${u.state}`);
      if (!!sc.open !== (u.namer === "namer")) fail(`habitat-${name}: the namer is ${u.namer ?? "closed"}`);
      if (name === "meet") {   // the meet shows the hatched mibi (the new one, index 2), and its name is the Incubator's hatch name when that ran in this process
        const m = await page.evaluate(() => ({ shown: window.__st.props?.regions?.resident?.name, last: window.__st.ST.mibis[2]?.name, code: window.__st.ST.mibis[2]?.code }));
        if (m.shown !== m.last || /BUD/.test(m.code)) fail(`habitat-meet: shows ${m.shown}, the new mibi is ${m.last} (code ${m.code})`);
        if (hatched.name && m.shown !== hatched.name) fail(`habitat-meet: the meet's name ${m.shown} is not the hatch's ${hatched.name}`);
      }
      await visit("habitat-" + name, page, fail, sc.captureOnly ? { captureOnly: true } : undefined);
    }
    const errs = await page.evaluate(() => ({ render: window.__st.renderErrors, face: window.__st.faceErrors })); if (errs.render.length || errs.face.length) fail("errors on the page: " + [...errs.render, ...errs.face].slice(0, 3).join(" | "));
  } finally { await close(); }
  return { fails };
}

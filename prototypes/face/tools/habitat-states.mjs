// One mibi up close in each of its capture points on the Station page (?test: the face in test mode), as the layer check and the goldens take them: `habitat-rest` (an adult at home, the ring on it), `habitat-meet` (the new mibi, the meet ribbon in
// the tag's place), `habitat-meet-placeholder` (the same while its painting is on its way: the placeholder and the waiting lamp), `habitat-out` (the mibi out with the Companion while it is away: the out mark, the ring on the name), `habitat-card` (a
// bonded bred mibi: the heart, three notches, where it came from, plates read and unread), `habitat-plate` (the ring on an unread plate), `habitat-door` (the Companion's set, a request waiting), `habitat-door-away`, `habitat-cross` (partners, one out
// while the Companion is away), `habitat-portrait` (a sitting held), `habitat-wild-armed`, `habitat-tile` (the ring on a tile), `habitat-twelve` (twelve compact tiles), `habitat-docked-dawn|day|dusk|night` (the four lights, for the art director)
// and the namer over it: `habitat-namer` (the meet's first ✓: Fig selected, the ring on Done), `habitat-namer-typed`, `habitat-namer-accents`, `habitat-namer-refused`, `habitat-namer-empty`, `habitat-namer-full`.
// Each is reached by the page's own state and asserted (screen, state, ring, namer) before `visit(name, page, fail)` is called. Taken with reduced motion. Returns { fails }.
import { openStation } from "./station-page.mjs";
import { WORLD } from "./home-states.mjs";

// keys: the namer's presses after it opens ("target" on the namer screen); open: how the namer is opened ("meet" ✓ on the new mibi, "rename" ✓ on the name)
const SCENES = {
  rest: { shown: 0, f: "resident", state: "rest", set: (w) => { w.bays(8); w.adults(4); } },
  meet: { shown: 0, f: "resident", state: "meet", meet: true, set: (w) => { w.bays(8); w.adults(4); } },
  "meet-placeholder": { shown: 0, f: "resident", state: "meet", meet: true, set: (w) => { w.bays(8); w.adults(4); window.__st.ST.mibis[0].paint = { state: "sent" }; } },
  out: { shown: 0, f: "name", state: "out", set: (w) => { w.bays(8); w.adults(4); w.carry([0]); w.away(); } },
  card: { shown: 1, f: "plate.0", state: "rest", set: (w) => { w.bays(8); w.adults(4); const m = window.__st.ST.mibis[1], fr = window.__st.frameOf("S01"); m.bonded = true; m.notches = 3; m.mem = "pond"; m.from = { ...m.from, of: [window.__st.ST.mibis[0].name, window.__st.ST.mibis[2].name] }; m.read = fr.chapters.filter((c, i) => i !== 0 && !c.sealed).map((c) => c.id); } },
  plate: { shown: 0, f: "plate.1", state: "rest", set: (w) => { w.bays(8); w.adults(4); const m = window.__st.ST.mibis[0], fr = window.__st.frameOf("S01"); m.read = fr.chapters.filter((c, i) => i !== 1 && !c.sealed).map((c) => c.id); window.__st.ST.d = 9; } },
  door: { shown: 0, f: "door", state: "rest", set: (w) => { w.bays(8); w.adults(4); w.carry([1]); window.__st.intent({ screen: "habitat", target: "door", verb: "confirm" }); } },
  "door-away": { shown: 0, f: "door", state: "rest", set: (w) => { w.bays(8); w.adults(4); w.carry([1, 2]); w.away(); } },
  cross: { shown: 0, f: "cross", state: "rest", set: (w) => { w.bays(8); w.adults(4); w.carry([1]); w.away(); } },
  portrait: { shown: 0, f: "portrait", state: "rest", set: (w) => { w.bays(8); w.adults(4); window.__st.ST.sitting = { source: "dev", key: null, at: 0 }; } },
  "wild-armed": { shown: 3, f: "wild", state: "rest", arm: true, set: (w) => { w.bays(8); w.adults(3); w.young(1); const st = window.__st.ST; st.mibis[3].born = st.turn - 4; } },
  tile: { shown: 2, f: "tile:2", state: "rest", set: (w) => { w.bays(8); w.adults(4); } },
  twelve: { shown: 5, f: "resident", state: "rest", set: (w) => { w.bays(12); w.adults(12); } },
  "docked-dawn": { shown: 0, f: "resident", state: "rest", light: "dawn", set: (w) => { w.bays(8); w.adults(4); } },
  "docked-day": { shown: 0, f: "resident", state: "rest", light: "day", set: (w) => { w.bays(8); w.adults(4); } },
  "docked-dusk": { shown: 0, f: "resident", state: "rest", light: "dusk", set: (w) => { w.bays(8); w.adults(4); } },
  "docked-night": { shown: 0, f: "resident", state: "rest", light: "night", set: (w) => { w.bays(8); w.adults(4); } },
  namer: { shown: 0, f: "resident", state: "rest", meet: true, open: true, set: (w) => { w.bays(8); w.adults(4); } },
  "namer-typed": { shown: 0, f: "resident", state: "rest", open: "rename", keys: ["act.suggest", "x:back", "x:back", "key.12", "key.14", "key.13", "key.4"], set: (w) => { w.bays(8); w.adults(4); } },
  "namer-accents": { shown: 0, f: "resident", state: "rest", open: "rename", keys: ["x:back", "key.3", "mod.page"], set: (w) => { w.bays(8); w.adults(4); } },
  "namer-refused": { shown: 0, f: "resident", state: "rest", open: "rename", keys: ["x:back", "key.0", "act.done"], set: (w) => { w.bays(8); w.adults(4); } },
  "namer-empty": { shown: 0, f: "resident", state: "rest", open: "rename", keys: ["x:back", "x:back"], set: (w) => { w.bays(8); w.adults(4); } },
  "namer-full": { shown: 0, f: "resident", state: "rest", open: "rename", keys: ["x:back", ...Array(10).fill("key.22")], set: (w) => { w.bays(8); w.adults(4); } },
};
async function enter(page, sc) {
  await page.evaluate(([setSrc, spec]) => {
    const w = window.__world; w.reset(); eval(`(${setSrc})`)(w); const S = window.__st, ST = S.ST; S.UI.idle = false; S.UI.hab.namer = null; S.UI.hab.wildArm = 0; S.settings.light = spec.light ?? "day";
    const id = ST.mibis[spec.shown].id; S.UI.hab.id = id; S.UI.meet = spec.meet ? id : null; S.UI.hab.f = spec.f.startsWith("tile:") ? "tile." + ST.mibis[+spec.f.slice(5)].id : spec.f;
    S.goto("habitat"); S.UI.hab.f = spec.f.startsWith("tile:") ? "tile." + ST.mibis[+spec.f.slice(5)].id : spec.f; S.UI.hab.id = spec.f.startsWith("tile:") ? ST.mibis[+spec.f.slice(5)].id : id;
    if (spec.arm) S.UI.hab.wildArm = 1;
    if (spec.open) S.intent(spec.open === true ? { screen: "habitat", target: "resident", verb: "confirm" } : { screen: "habitat", target: "name", verb: "confirm" });
    for (const k of spec.keys ?? []) { const [t, v] = k.startsWith("x:") ? ["act.done", k.slice(2)] : [k, "confirm"]; S.intent({ screen: "namer", target: t, verb: v }); }
  }, [sc.set.toString(), { shown: sc.shown, f: sc.f, meet: !!sc.meet, light: sc.light ?? null, arm: !!sc.arm, open: sc.open ?? null, keys: sc.keys ?? null }]);
}
export async function habitatStates(visit) {
  const { page, fails, fail, close } = await openStation({ motion: false });
  await page.evaluate((src) => { window.__world = eval(src)(); }, `(${WORLD.toString()})`);
  try {
    for (const [name, sc] of Object.entries(SCENES)) {
      await enter(page, sc); await page.waitForTimeout(900);
      const u = await page.evaluate(() => ({ screen: window.__st.UI.screen, state: window.__st.props?.state, cur: window.__st.props?.focus?.cur, namer: window.__st.props?.overlay?.id ?? null }));
      if (u.screen !== "habitat" || u.state !== sc.state) fail(`habitat-${name}: on ${u.screen}, ${u.state}`);
      if (!!sc.open !== (u.namer === "namer")) fail(`habitat-${name}: the namer is ${u.namer ?? "closed"}`);
      await visit("habitat-" + name, page, fail);
    }
    const errs = await page.evaluate(() => ({ render: window.__st.renderErrors, face: window.__st.faceErrors })); if (errs.render.length || errs.face.length) fail("errors on the page: " + [...errs.render, ...errs.face].slice(0, 3).join(" | "));
  } finally { await close(); }
  return { fails };
}

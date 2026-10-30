// The sitting in each of its capture points on the Station page (?test: the face in test mode), as the layer check and the goldens take them (sitting.json; S01 adult "Dot", noon, reduced motion unless timed), each reached
// from Habitat's Portrait ✓ by the page's own keys: `sitting-pose` (three habits seen, the ring on card.0, the window Habitat's own), `sitting-pose-curl` (the ring on sleep-curled: the curl in the window, feet 380),
// `sitting-pose-one` (one habit, sleep-curled: one card), `sitting-pose-juvenile` (a juvenile's cards and window), `sitting-place` (two places, the ring on card.1: the pond in its day light, step 0 done),
// `sitting-place-night` (the same at night: the place step stays day light, the resident ungraded), `sitting-place-five` (five places, the ring on card.4), `sitting-confirm` (calm at the pond: the gilt at rest, the pair),
// `sitting-confirm-armed` (the first ✓: the lit gilt, "Again: portray Dot"), `sitting-begin-150ms` (the second ✓, motion on, a virtual clock: the lit gilt mid-dither), `sitting-portrait` (portrayed, the bone canvas at 528×392
// as habitat-portrait-pictured's, 1:1 in the gilt's opening; the stamp with the portrayed corner; every step done) and `sitting-portrait-long-name` (a ten-letter widest name: the heading at 16 px in 248).
// Each is asserted (screen, state, ring, armed, the heading's text) before `visit(name, page, fail)` is called. Returns { fails }.
import { openStation } from "./station-page.mjs";
import { WORLD } from "./home-states.mjs";
import { boneCanvas } from "./portrait-fixture.mjs";
import { digestOf } from "../../station/src/portrait-source.mjs";

const PICTURED = await digestOf(boneCanvas());   // the bone canvas's digest (habitat-states.mjs)
const THREE = ["shake-dry", "calm", "sleep-curled"], POND = ["pond"], FOUR = ["pond", "rock", "wood", "cave"];   // the pod's place is the meadow (seedAdults): the places are the meadow, then the walk
// keys: the presses after Habitat's Portrait ✓ ("pose:<habit>" and "place:<place>" move the ring to that card with the pad, then nothing more; "confirm" is ✓)
const SCENES = {
  pose: { habits: THREE, walked: POND, keys: [], state: "pose", cur: "card.0" },
  "pose-curl": { habits: THREE, walked: POND, keys: ["pose:sleep-curled"], state: "pose", pose: "sleep-curled" },
  "pose-one": { habits: ["sleep-curled"], walked: POND, keys: [], state: "pose", cur: "card.0" },
  "pose-juvenile": { juvenile: true, habits: THREE, walked: POND, keys: [], state: "pose", cur: "card.0" },
  place: { habits: THREE, walked: POND, keys: ["confirm", "place:pond"], state: "place", cur: "card.1" },
  "place-night": { light: "night", habits: THREE, walked: POND, keys: ["confirm", "place:pond"], state: "place", cur: "card.1" },
  "place-five": { habits: THREE, walked: FOUR, keys: ["confirm", "place:cave"], state: "place", cur: "card.4" },
  confirm: { habits: THREE, walked: POND, keys: ["pose:calm", "confirm", "place:pond", "confirm"], state: "confirm", cur: "room", armed: null },
  "confirm-armed": { habits: THREE, walked: POND, keys: ["pose:calm", "confirm", "place:pond", "confirm", "confirm"], state: "confirm", cur: "room", armed: "room" },
  portrait: { habits: THREE, walked: POND, portrait: true, keys: [], state: "portrait", cur: "room" },
  "portrait-long-name": { name: "WWWWWWWWWW", habits: THREE, walked: POND, portrait: true, keys: [], state: "portrait", cur: "room" },
};
// The world: Dot alone in eight bays, docked, its habits seen and its places been; a sitting held (or, portrayed, calm at the pond with the bone canvas held as its picture); Habitat up close with the ring on Portrait, then ✓
async function enter(page, sc) {
  await page.evaluate(([spec, digest, fx]) => {
    const w = window.__world; w.reset(); w.rooms(1); if (spec.juvenile) w.young(1); else w.adults(1);
    const S = window.__st, st = S.ST, m = st.mibis[0]; m.name = spec.name ?? "Dot"; Object.assign(m, { habits: spec.habits.slice(), walked: spec.walked.slice() });
    if (spec.portrait) { const r = S.portraitSource(digest, eval(`(${fx})`)()); if (!r.ok) throw new Error("portrait fixture: " + r.error); m.portrait = { state: "delivered", pose: "calm", place: "pond", crate: "sit1", start: 0, at: 0, digest }; }
    else st.sitting = { source: "dev", key: null, at: 0 };
    S.settings.light = spec.light ?? "day"; S.settings.stationTime = "12:00"; S.UI.idle = false; S.UI.panel = null; S.UI.hab.namer = null; S.UI.meet = null; S.UI.hab.id = m.id; S.goto("habitat"); S.UI.hab.f = "portrait"; w.persist();
    S.intent({ screen: "habitat", target: "portrait", verb: "confirm" });
  }, [{ juvenile: !!sc.juvenile, name: sc.name ?? null, habits: sc.habits, walked: sc.walked, portrait: !!sc.portrait, light: sc.light ?? null }, PICTURED, boneCanvas.toString()]);
}
// the presses: a card named by its habit or place is reached with the pad from the ring's card (the cards' grid is 3 × 2, focus.pose.graph), one press a frame
async function press(page, keys, wait) {
  for (const k of keys) {
    const m = k.match(/^(pose|place):(.+)$/);
    if (!m) { await page.evaluate((k) => window.__st.act(k), k); await wait(); continue; }
    const to = await page.evaluate(([kind, id]) => { const p = window.__st.props; return { at: p.regions.cards.items.findIndex((c) => c[kind] === id), cur: +String(p.focus.cur).slice(5) }; }, [m[1], m[2]]);
    if (to.at < 0) throw new Error(`no ${m[1]} card ${m[2]}`);
    const col = (i) => i % 3, row = (i) => Math.floor(i / 3);
    for (let i = row(to.cur); i < row(to.at); i++) { await page.evaluate(() => window.__st.act("down")); await wait(); }
    for (let i = row(to.cur); i > row(to.at); i--) { await page.evaluate(() => window.__st.act("up")); await wait(); }
    for (let i = col(to.cur); i < col(to.at); i++) { await page.evaluate(() => window.__st.act("right")); await wait(); }
    for (let i = col(to.cur); i > col(to.at); i--) { await page.evaluate(() => window.__st.act("left")); await wait(); }
  }
}
const look = (page) => page.evaluate(() => { const S = window.__st, p = S.props; return { screen: S.UI.screen, state: p?.state, cur: p?.focus?.cur, armed: p?.focus?.armed ?? null, pose: p?.regions?.resident?.pose ?? null, heading: p?.regions?.heading?.text, glass: p?.regions?.glass?.picture, gilt: p?.regions?.gilt?.picture, portrait: p?.regions?.portrait?.picture, corner: p?.regions?.stamp?.corner }; });
function asserts(name, sc, u, fail) {
  if (u.screen !== "sitting" || u.state !== sc.state) fail(`${name}: on ${u.screen}, ${u.state}`);
  if (sc.cur && u.cur !== sc.cur) fail(`${name}: the ring on ${u.cur}, not ${sc.cur}`);
  if (sc.pose && u.pose !== sc.pose) fail(`${name}: the resident's pose is ${u.pose}, not ${sc.pose}`);
  if ("armed" in sc && u.armed !== sc.armed) fail(`${name}: armed ${u.armed}`);
  if (sc.state === "place" && !/^sitting-backdrop-pond-|^sitting-backdrop-cave-/.test(u.glass ?? "")) fail(`${name}: the glass is ${u.glass}`);
  if (sc.portrait && (u.portrait !== `portrait:${PICTURED}:528x392` || !u.corner)) fail(`${name}: the portrait ${u.portrait}, the corner ${u.corner}`);
}
async function stillStates(visit) {
  const { page, fails, fail, close } = await openStation({ motion: false });
  await page.evaluate((src) => { window.__world = eval(src)(); }, `(${WORLD.toString()})`);
  const wait = () => page.waitForTimeout(120);
  try {
    for (const [name, sc] of Object.entries(SCENES)) {
      await enter(page, sc); await page.waitForTimeout(400); await press(page, sc.keys, wait); await page.waitForTimeout(900);
      asserts("sitting-" + name, sc, await look(page), fail);
      await visit("sitting-" + name, page, fail);
    }
    const errs = await page.evaluate(() => ({ render: window.__st.renderErrors, face: window.__st.faceErrors })); if (errs.render.length || errs.face.length) fail("errors on the page: " + [...errs.render, ...errs.face].slice(0, 3).join(" | "));
  } finally { await close(); }
  return { fails };
}
// sitting-begin-150ms: motion on, a virtual clock; the second ✓ on the armed confirm plays events.begin, the lit gilt dithering out over 300 ms, taken at 150
async function timedStates(visit) {
  const { page, fails, fail, step, close } = await openStation({ motion: true, clock: true });
  await page.evaluate((src) => { window.__world = eval(src)(); }, `(${WORLD.toString()})`);
  try {
    const sc = SCENES["confirm-armed"]; await enter(page, sc); await step(600); await press(page, sc.keys, () => step(400));
    const u = await look(page); asserts("sitting-begin-150ms (armed)", sc, u, fail);
    await page.evaluate(() => window.__st.act("confirm")); await step(150);
    const b = await look(page); if (b.screen !== "sitting" || b.state !== "begin") fail(`sitting-begin-150ms: on ${b.screen}, ${b.state}`);
    await visit("sitting-begin-150ms", page, fail);
    await step(1200);
    const errs = await page.evaluate(() => ({ render: window.__st.renderErrors, face: window.__st.faceErrors })); if (errs.render.length || errs.face.length) fail("errors on the page: " + [...errs.render, ...errs.face].slice(0, 3).join(" | "));
  } finally { await close(); }
  return { fails };
}
export async function sittingStates(visit, { motion = false, timed = true } = {}) {
  const r = await stillStates(visit); if (motion || !timed) return r;
  const t = await timedStates(visit); return { fails: [...r.fails, ...t.fails] };
}

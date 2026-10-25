// Home in each of its capture points on the Station page (?test: the face in test mode), as the layer check and the goldens take them: rest with nothing needed (the goal in the line) and with two needs, each bezel and each station focused, the Vivarium's readout
// (all at home, some away, none at home), the Incubator in each state, the Bay waiting with a portrait crate in, the Companion docked and away and the Pods station empty and full. Each is reached by the page's own state and asserted (screen, focus) before
// `visit(name, page)` is called. Taken with reduced motion (the events jump to their end), so the pixels are the same every time; the date and the clock are pinned (the page's dev settings: Station date and time).
// Returns { fails }.
import { openStation } from "./station-page.mjs";

// the scene: what the page's state holds, as a function run in the page (the state is the page's own; the hooks seed through the rules)
export const SCENES = {
  fresh:               { f: "room", set: () => {} },
  "rest-goal":         { f: "room", set: (w) => { w.young(2); w.carry([0, 1]); } },   // nothing needs the player: the goal is the line
  "rest-needs":        { f: "room", set: (w) => { w.adults(3); w.carry([0]); w.crates(2); w.bud(true); w.pods(2); w.seen(); } },   // crates, then the bud: two needs in the line
  "focus-vivarium":    { f: "vivarium", set: (w) => { w.adults(3); w.pods(2); w.seen(); } },
  "focus-library":     { f: "library", set: (w) => { w.adults(3); w.pods(2); w.seen(); } },
  "focus-pods":        { f: "pods", set: (w) => { w.adults(3); w.pods(3); w.seen(); } },
  "focus-incubator":   { f: "incubator", set: (w) => { w.adults(3); w.bud(false); } },
  "focus-companion":   { f: "companion", set: (w) => { w.adults(3); w.carry([0]); } },
  "focus-companion-away": { f: "companion", set: (w) => { w.adults(3); w.carry([0]); w.away(); } },
  "focus-bay":         { f: "bay", set: (w) => { w.adults(3); w.crates(2); } },
  "vivarium-all-home":   { f: "room", set: (w) => { w.adults(4); w.young(2); } },
  "vivarium-some-away":  { f: "room", set: (w) => { w.adults(4); w.young(2); w.carry([0, 1]); w.away(); } },
  "window-dawn":         { f: "room", light: "dawn", time: "06:30", set: (w) => { w.adults(4); w.young(2); } },   // the window in each light (day is the scenes above)
  "window-dusk":         { f: "room", light: "dusk", time: "18:30", set: (w) => { w.adults(4); w.young(2); } },
  "window-night":        { f: "room", light: "night", time: "23:30", set: (w) => { w.adults(4); w.young(2); } },   // the residents asleep in place
  "window-six-of-eight": { f: "room", set: (w) => { w.adults(5); w.young(3); } },   // eight at home: the window shows six
  "event-tag":           { f: "room", set: (w) => { w.adults(3); w.young(1); w.meet(3); } },   // a mibi grew up: its name tag until the player visits it
  "vivarium-none-home":  { f: "room", set: (w) => { w.adults(2); w.carry([0, 1]); w.away(); } },
  "incubator-empty":     { f: "room", set: (w) => { w.adults(2); } },
  "incubator-can":       { f: "room", set: (w) => { w.adults(2); w.pods(1); w.seen(); w.identified(1); w.readOne(); } },   // a pod can incubate
  "incubator-growing":   { f: "room", set: (w) => { w.adults(2); w.bud(false); } },
  "incubator-half":     { f: "room", set: (w) => { w.adults(2); w.bud(false, 0.5); } },   // the bud at about half: the lit bar's clip is seen (build spec section 14)
  "incubator-ready":     { f: "room", set: (w) => { w.adults(2); w.bud(true); } },
  "bay-waiting":         { f: "room", set: (w) => { w.adults(2); w.crates(3); } },
  "bay-portrait":        { f: "room", set: (w) => { w.adults(2); w.crates(2); w.portrait(); } },
  "companion-docked":    { f: "room", set: (w) => { w.adults(3); w.carry([0]); } },
  "companion-away":      { f: "room", set: (w) => { w.adults(3); w.carry([0]); w.away(); } },
  "pods-empty":          { f: "room", set: (w) => { w.adults(2); } },
  "pods-full":           { f: "room", set: (w) => { w.adults(2); w.pods(6); w.seen(); } },
  "library-0-new":       { f: "room", set: (w) => { w.adults(3); w.libNew(0); } },   // the Library opened full screen: the specimen of the species with the fewest looks unfound, no new caption, no glint (build spec 4.2)
  "library-3-new":       { f: "room", set: (w) => { w.adults(3); w.libNew(3); } },   // three looks found since: "3 new" and a glint on each bead (reduced motion: the glints simply show)
  "library-focused":     { f: "library", set: (w) => { w.adults(3); w.libNew(3); } },
};
// the helpers the scenes call, in the page
export const WORLD = () => ({
  // the Companion's part of the save is re-read from storage on every save: an edit to it is written there at once
  persist() { const S = window.__st; localStorage.setItem("mb-save-v8", JSON.stringify({ ...S.SV, st: S.ST })); },
  reset() { const S = window.__st, st = S.ST, sv = S.SV; S.UI.meet = null; st.mibis = []; st.tray = []; st.waiting = []; st.bud = null; st.sitting = null; st.sittingCrates = []; sv.bay = []; st.devBay = []; sv.carried = []; sv.with = null; st.dock = { docked: true, at: 1 }; st.accepted = []; st.nextMibi = 1; st.nameN = 0; st.namesUsed = []; st.knownIds = []; st.libSeen = {}; S.UI.meet = null; S.UI.home.f = "room"; this.persist(); },
  libNew(n) { const st = window.__st.ST; st.libSeen = JSON.parse(JSON.stringify(st.guide)); let k = n; for (const t of Object.keys(st.libSeen.S01 ?? {})) while (k > 0 && st.libSeen.S01[t].length > 1) { st.libSeen.S01[t].pop(); k--; } },   // the Library opened full screen, then n looks found since
  adults(n) { const st = window.__st.ST, k = st.mibis.length; window.__st.seedAdults("S01", 5, n); for (const m of st.mibis.slice(k)) m.paint = { state: "landed" }; },
  young(n) { const st = window.__st.ST; const k = st.mibis.length; window.__st.seedAdults("S01", 77, n); for (const m of st.mibis.slice(k)) { m.born = st.turn; m.paint = { state: "landed" }; } },
  meet(i) { const S = window.__st; S.UI.meet = S.ST.mibis[i].id; },
  carry(ix) { const st = window.__st.ST; window.__st.SV.carried = ix.map((i) => st.mibis[i].id); this.persist(); },
  away() { window.__st.ST.dock = { docked: false, at: 1 }; },
  crates(n) { window.__st.SV.bay = Array.from({ length: n }, (_, i) => ({ id: "c" + i, n: i + 1, turn: 0, at: 1, e: 3, d: 3, s: 4, pods: [], met: [], explored: 0, of: 0, lines: [] })); this.persist(); },
  bays(n) { window.__st.settings.bays = n; },
  waiting(n) { const st = window.__st.ST; for (let i = 0; i < n; i++) st.waiting.push({ ...st.tray[i], id: "wait" + i }); },
  sitting() { window.__st.ST.sitting = { mibi: window.__st.ST.mibis[0]?.id ?? 1 }; },
  unread(i) { const m = window.__st.ST.mibis[i]; if (m) m.read = []; this.persist(); },
  known(ids) { window.__st.ST.knownIds = ids; },
  portrait() { const st = window.__st.ST; st.sittingCrates.push({ id: "sit1", mibiId: st.mibis[0].id, pose: "stand", place: "meadow", start: 0, source: "x", painted: true, opened: false }); },   // a sitting crate that is ready
  pods(n) { const S = window.__st; for (let i = 0; i < n; i++) S.seedPod("S01", 3 + i); },
  seen() { for (const p of window.__st.ST.tray) p.seen = 1; },   // Pods has drawn them: only a glint or a waiting pod would need the player
  bud(ready, frac) { const S = window.__st, st = S.ST, gs = 5, genome = S.podGenome(S.frameOf("S01"), gs), sha = S.genomeSha(genome); st.bud = { kind: "founder", species: "S01", sp: 0, gs, genome, sha, code: S.nameCode(sha), start: Date.now() - (ready ? 1e8 : frac ? frac * 20 * 60000 : 1000), minutes: 20, firstEver: false, parents: null, from: { n: 0, g: "meadow", how: "ground", podId: null }, read: [], shaped: [], early: false }; },
  identified(n) { const S = window.__st; for (const p of S.ST.tray.slice(0, n)) S.readSome(p.id, 0); },
  readOne() { const S = window.__st; for (const p of S.ST.tray.slice(0, 1)) S.readSome(p.id, 1); },
});

export async function homeStates(visit, { motion = false } = {}) {
  const { page, fails, fail, close } = await openStation({ motion });
  await page.evaluate((src) => { window.__world = eval(src)(); }, `(${WORLD.toString()})`);
  const apply = (sc) => page.evaluate(([setSrc, f, lt, tm]) => {
    const w = window.__world; w.reset(); eval(`(${setSrc})`)(w);
    const S = window.__st; S.settings.light = lt; S.settings.stationTime = tm; S.settings.stationDate = "2026-10-17"; S.UI.home.f = f; S.UI.idle = false; S.goto("home");
  }, [sc.set.toString(), sc.f, sc.light ?? "day", sc.time ?? "12:00"]);
  try {
    for (const [name, sc] of Object.entries(SCENES)) {
      await apply(sc); await page.waitForTimeout(600);
      const u = await page.evaluate(() => ({ screen: window.__st.UI.screen, focus: window.__st.UI.home.f, idle: window.__st.UI.idle }));
      if (u.screen !== "home" || u.idle) fail(`home-${name}: on ${u.screen}${u.idle ? " (idle)" : ""}`);
      if (u.focus !== sc.f) fail(`home-${name}: the ring is on ${u.focus}, not ${sc.f}`);
      await visit("home-" + name, page, fail);
    }
    const errs = await page.evaluate(() => ({ render: window.__st.renderErrors, face: window.__st.faceErrors })); if (errs.render.length || errs.face.length) fail("errors on the page: " + [...errs.render, ...errs.face].slice(0, 3).join(" | "));
  } finally { await close(); }
  return { fails };
}

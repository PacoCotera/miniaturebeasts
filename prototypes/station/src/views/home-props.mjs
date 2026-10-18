// The Home props (lvgl-switch.md §2.1, §4 L2.2): pure selectors from the state, the focus and the presentation to the props of the face's Home words. Props name *what*, never *where*: strings, states, counts,
// asset ids, flags, seeds and the focus targets by id; no rectangle, no measure, no layout rule (the words place everything from home.json). The output is plain JSON:
// { props (state, regions, focus), line (the bottom line, for the frame), requests (the pictures the host makes ready before the props), need (the notice's key and its action) }.
// Runs in Node, tested there (tests/home-props.test.mjs); the shape is home.props.json. Sitting crates and the Cargo screen are L2.2's second PR (cargo.json); here the bay's crates are the walk crates.
import * as S from "../state.mjs";
import { frameOf, genomeDigest } from "../genome.mjs";
import { movingIds, playable } from "../moving.mjs";
import { standLook } from "../stands.mjs";
import { drawnLooks } from "../looks.mjs";
import { layeredStand, standPictureId } from "../layered-stand.mjs";
import { goalWords } from "./goal-words.mjs";

const SPELL = ["no", "one", "two", "three", "four", "five", "six"];
const COUNT = ["", "a", "two", "three", "four", "five", "six"];
const fill = (t, o) => t.replace(/\{(\w+)\}/g, (_, k) => (k in o ? o[k] : "{" + k + "}"));
const hash = (n) => (Math.imul(n + 1, 2654435761) >>> 0) % 65521;
// A mibi's picture id carries its stage (a juvenile takes the art director's stand-in at its size when one is placed): mibi:<genome digest>:<juvenile|adult|elder>:<w>x<h>
export const mibiPictureId = (digest, stage, [w, h], light = "day") => `mibi:${digest}:${stage}:${w}x${h}${light === "day" ? "" : ":" + light}`;   // fix 7: a graded resident names its light (dawn, dusk, night); at day the id is the master's own, unchanged
// An adult or elder without its signed stand takes its species' juvenile stand, 1:1 in its own size (stands.mjs, station-layouts.md Composed states, rule 5): the picture is named by the stage and size it is drawn at.
export const lookOf = (st, mb, size, settings) => standLook(S.speciesOf(mb), S.mibiStage(st, mb, settings), size);
// the picture's id and the stage and size it is drawn at, for every caller that names a mibi's picture (the views' requests and the host's swap dither); the light is the scene's (fix 7), the grade's source the master drawn
// A species with a layered stand at the place (layered-stand.mjs) draws each mibi as itself: the picture is the stand's variant for the mibi's drawn looks (looks.mjs drawnLooks), named by that variant, so two mibis with the same looks
// are one picture and a child that is read later is a new one; the request carries the looks. Every other stand is the species' own, named by the genome's digest, as before.
export const mibiPictureOf = (st, mb, size, settings, light = "day", view = "default") => {
  const sp = S.speciesOf(mb), grown = S.mibiStage(st, mb, settings), stand = layeredStand(sp, grown, size, view);
  if (stand) { const looks = drawnLooks(frameOf(sp), mb); return { id: standPictureId(stand, looks, light), stage: grown, size: [...stand.size], looks }; }
  const { stage, size: drawn } = lookOf(st, mb, size, settings);
  return { id: mibiPictureId(genomeDigest(mb.genome), stage, drawn, light), stage, size: drawn };
};
export const mibiReq = (req, st, mb, size, settings, light = "day", view = "default") => { const p = mibiPictureOf(st, mb, size, settings, light, view); return req({ kind: "mibi", id: p.id, mibi: mb.id, stage: p.stage, species: S.speciesOf(mb), size: p.size, ...(p.looks ? { looks: p.looks, view } : {}), ...(light === "day" ? {} : { light }) }); };
const WORD_STAGE = (spec, st) => spec.strings.stages[st] ?? st;

// m: { st, sv, settings, docked, ui: { meet }, focus: id | null, spec home.json, frame frame.json }; the need is state.mjs's needKey, the words are home.json's
// The notice and the action of a need, from strings.needs. A count is spelled to the picture's most; above it the count is dropped.
export function wordsOf(need, spec) {
  if (!need) return { notice: "", action: null };
  const N = spec.strings.needs[need.key], word = need.n != null && need.n >= 1 && need.n <= need.max ? COUNT[need.n] : "";
  let notice = need.n === 1 && N.noticeOne ? N.noticeOne : N.notice;
  const vals = { count: word, name: need.name, a: need.a, species: need.species };
  if (need.short && N.short) notice = N.short;
  notice = fill(notice, vals).replace(/\s{2,}/g, " ").trim();
  if (need.short) notice += " " + need.short;
  return { notice, action: fill(N.action, vals) };
}

// The living window's people, shared by Home's glass, Idle's painting and (later) the Vivarium's whole: the residents at home (a seed each, the face steps the walk), the carried set asleep on the bed when docked, and the bed's state, its picture by the light and, away, its mark. R: the spec's regions (resident sizes, bed rect and sleepers); req/ph: the view's request makers.
// The light of an hour (frame.json light.from: [[start hour, light], …]): a light runs until the next start, the last wraps midnight. The hour is the host's; a view never reads a clock.
export function lightAt(hour, L) {
  const from = [...L.from].sort((a, b) => a[0] - b[0]), at = from.filter(([h]) => h <= hour).at(-1) ?? from.at(-1);
  return at[1];
}

// The rest (Station M1 §2.6, the game designer's R1): awake or asleep by the Station time, a pure function over the whole household. Each sleep group settles and wakes across a window (rules.windowS) that opens at its light change, one
// resident at a time in the window's order (settle: elder, juvenile, adult; wake: juvenile, adult, elder; inside a stage by seed, then id): member k of n flips at window start + ⌊k·W/n⌋ + (seed mod max(1, ⌊W/(2n)⌋)) s.
// Groups: nocturnal (rules.nocturnal, every stage), early (every elder and rules.early.species, every stage), diurnal (the rest). The diurnal 06:00 wake window holds the diurnal and early groups together.
// here: [{ id, seed, species, stage }]; time: seconds of the day; rules: vivarium.json rules.rest. Returns { <id>: "awake" | "asleep" }.
const secOf = (hhmm) => { const [h, mm] = hhmm.split(":").map(Number); return h * 3600 + mm * 60; };
export function restOf(here, time, rules) {
  const W = rules.windowS, out = {}, groupOf = (r) => (rules.nocturnal.includes(r.species) ? "nocturnal" : rules.early.stages.includes(r.stage) || rules.early.species.includes(r.species) ? "early" : "diurnal");
  const flips = {};   // id -> { settle, wake } in seconds of the day
  const rank = (dir, start, members) => {
    const order = rules.order[dir], n = members.length, slot = Math.max(1, Math.floor(W / (2 * n)));
    members.slice().sort((a, b) => order.indexOf(a.stage) - order.indexOf(b.stage) || a.seed - b.seed || String(a.id).localeCompare(String(b.id)))
      .forEach((r, k) => { (flips[r.id] ??= {})[dir] = (start + Math.floor(k * W / n) + (r.seed % slot)) % 86400; });
  };
  for (const dir of ["settle", "wake"]) {
    const byStart = new Map(); for (const r of here) { const t = secOf(rules[dir][groupOf(r)]); if (!byStart.has(t)) byStart.set(t, []); byStart.get(t).push(r); }
    for (const [t, members] of byStart) rank(dir, t, members);
  }
  for (const r of here) { const { settle, wake } = flips[r.id], t = ((time % 86400) + 86400) % 86400; out[r.id] = (settle <= wake ? t >= settle && t < wake : t >= settle || t < wake) ? "asleep" : "awake"; }   // asleep from the settle flip to the wake flip, wrapping midnight
  return out;
}
// A resident's moving set (Station M1 §2.2): { set, walk, shadow } when its species and stage have one and it may play (every cell a placed master, or the developer's "Motion sets (stand-ins)", or the face tests); else "" (a still, main's walk)
export function movingProp(mb, stage, req, m, parts = ["walk", "shadow"]) {
  const sp = S.speciesOf(mb), I = movingIds(sp, stage, mb.look ?? "species", m.light ?? "day"); if (!I || !(m.motionSets || playable(sp, stage))) return "";   // named by the mibi's look (layer-bake §7): `species` until the bake slot gives mibis a look
  const out = { set: sp }; for (const k of parts) out[k] = req({ kind: "moving", id: I[k] }); return out;
}

export function livingOf(m, R, req, ph, L) {
  const { st, sv, settings } = m, docked = !!m.docked, carried = S.carriedIds(st, sv), here = S.homeMibis(st, sv);
  const stageOf = (mb) => S.mibiStage(st, mb, settings);
  const sizeOf = (mb) => R.resident[stageOf(mb) === "juvenile" ? "juvenile" : "adult"];
  const pic = (mb, size) => mibiReq(req, st, mb, size, settings, m.light, m.view ?? "home");
  const person = (mb, extra = {}) => { const size = extra.nap ? R.bed.sleepers.ink.max : sizeOf(mb); delete extra.nap; const look = lookOf(st, mb, size, settings); return { id: String(mb.id), name: mb.name, stage: look.stage, picture: pic(mb, size), waiting: false, ...extra }; };   // `stage` is the stage drawn: a juvenile stand sizes the box, the ring, the lift and the lamp as a juvenile's
  const rest = m.time != null && m.restRules ? restOf(here.map((mb) => ({ id: String(mb.id), seed: hash(mb.id), species: S.speciesOf(mb), stage: stageOf(mb) })), m.time, m.restRules) : null;   // the residents at home; never the bed's carried sleepers, never one out
  const residents = here.map((mb) => { const p = person(mb, { seed: hash(mb.id) }), mv = movingProp(mb, stageOf(mb), req, m); if (mv) p.moving = mv; if (rest) p.rest = rest[String(mb.id)]; return p; });
  const sleepers = docked ? carried.slice(0, R.bed.sleepers.max).map((id) => S.mibiById(st, id)).filter(Boolean).map((mb) => { const p = person(mb, { seed: hash(mb.id), nap: true }), mv = movingProp(mb, stageOf(mb), req, m, ["nap"]); if (mv) p.moving = mv; return p; }) : [];
  const bed = {
    state: docked ? (sleepers.length ? "docked" : "none") : "away",
    picture: req({ kind: "slot", id: `home-bed-${m.light}-${R.bed.rect[2]}x${R.bed.rect[3]}`, master: `${L.bed[m.light]}-${R.bed.rect[2]}x${R.bed.rect[3]}`, size: R.bed.rect.slice(2), until: "the bed masters" }),   // the bed of the light, in every state
    mark: docked ? "" : ph(R.bed.markPicture, R.bed.mark),   // away only: the Companion's mark (home-bed-mark-16x24), 1:1 over the bed
    sleepers,
  };
  return { residents, sleepers, bed };
}

export function homeBuild(m, spec, frame) {
  const { st, sv, settings } = m, requests = [], req = (r) => { requests.push(r); return r.id; };
  const R = spec.regions, docked = !!m.docked, carried = S.carriedIds(st, sv), here = S.homeMibis(st, sv);
  const plate = () => slot("plate-device-320x88", [320, 88], "the device plate (fix 2: the module's plate, placed 1:1)");   // each module's plate: a slot, drawn once the master is placed and nothing before (rule 4, F6)
  const slot = (master, size, until) => req({ kind: "slot", id: `${master}:${size.join("x")}`, master, size, until: until || "the Home masters (station-layouts.md, Home, Cargo and Idle: the masters)" });
  // a PH plate or hollow (home.json placeholders): a picture of the register, status placeholder, until its master
  const ph = (id, size, hollow = false) => req({ kind: "ph", id, size, hollow, until: "its master (home.json placeholders)" });
  const facts = S.needKey(st, sv, settings, m.ui ?? {}), need = facts && { ...facts, module: spec.strings.needs[facts.key].module }, lampOf = (mod) => (need && need.module === mod && !need.soft ? "needsYou" : null);

  // the living window: the glass's master of the light, the residents at home walking, the bed with the carried set asleep
  const lw = livingOf({ st, sv, settings, docked, light: m.light, time: m.time, restRules: m.restRules, motionSets: m.motionSets }, R, req, ph, frame.light);
  const { residents, sleepers, bed } = lw;
  // the modules
  const crates = docked ? S.bayCrates(st, sv).length : 0;
  const cargoState = !docked ? "away" : crates ? "crates" : st.waiting.length ? "waiting" : "empty";
  const cargo = {
    plate: plate(), state: cargoState, crates: Math.min(crates, R.cargo.max), lamp: lampOf("cargo") ?? "off",
    bay: slot(`home-bay-${cargoState === "away" ? "shut" : "open"}-176x72`, R.cargo.bay.slice(2)),
    crate: ph(`home-crate-${R.cargo.crate.join("x")}`, R.cargo.crate), waiting: cargoState === "waiting" ? req({ kind: "waiting", id: "waiting:24" }) : "",
  };
  const rackSize = R.pods.wells.slots, podSize = R.pods.pod.size;
  const wells = Array.from({ length: rackSize }, (_, i) => {
    const q = st.tray[i];
    if (!q) return { pod: "", glint: "" };
    const sp = q.idd || st.knownIds.includes(S.speciesOf(q)) ? S.speciesOf(q) : null;
    return { pod: req({ kind: "rackpod", id: `rackpod:${sp ?? "unknown"}`, species: sp, size: podSize }), glint: q.idd && S.podGlints(st, q) ? req({ kind: "star", id: "star:12" }) : "" };
  });
  const pods = { plate: plate(), lamp: lampOf("pods") ?? (st.tray.length ? "well" : "off"), well: slot("home-well-32x32", R.pods.wells.size), wells };
  const bud = st.bud, ready = S.budReady(st, settings);
  const incState = !bud ? "empty" : ready ? "ready" : "growing";
  const incubator = {
    plate: plate(), state: incState, lamp: lampOf("incubator") ?? (incState === "growing" ? "well" : "off"),
    chamber: slot(`home-chamber-${incState === "painting" ? "empty" : incState}-72x72`, R.incubator.chamber.slice(2)),
  };
  const pr = docked ? S.probeNow(st, sv) : null;
  const held = !!st.sitting;
  const probe = {
    plate: plate(), state: docked ? "docked" : "away", lamp: lampOf("probe") ?? (docked ? "well" : "off"),
    cradle: slot(`home-cradle-${docked ? "full" : "empty"}-96x72`, R.probe.cradle.slice(2)),
    shields: { count: pr ? Math.min(pr.smax, R.probe.shields.count) : 0, whole: pr ? Math.min(pr.shield, pr.smax) : 0, wholePicture: ph(R.probe.shields.pictures.whole, R.probe.shields.size), gonePicture: ph(R.probe.shields.pictures.gone, R.probe.shields.size, true) },
    frame: held ? ph(R.probe.slotPicture, R.probe.slot.slice(2)) : "",
  };
  const found = st.knownIds.length;
  const library = { plate: plate(), state: found ? "pages" : "empty", lamp: lampOf("library") ?? (found ? "well" : "off"), journal: slot("home-journal-104x72", R.library.journal.slice(2)) };

  const regions = { glass: { picture: req({ kind: "slot", id: `home-glass-${m.light}:${R.glass.rect[2]}x${R.glass.rect[3]}`, master: `${spec.light.pictures[m.light]}-${R.glass.rect[2]}x${R.glass.rect[3]}`, size: [R.glass.rect[2], R.glass.rect[3]], until: "the Home masters (the glass by the light)" }) }, residents, bed, cargo, pods, incubator, probe, library };

  // the focus: the targets present, in the spec's group order; the ring is on `cur` or nowhere ("room")
  const targets = [{ id: "vivarium", group: "vivarium" }];
  for (const r of residents) targets.push({ id: "resident." + r.id, group: "resident" });
  for (const r of sleepers) targets.push({ id: "resident." + r.id, group: "resident" });
  for (const k of ["cargo", "pods", "incubator", "probe", "library", "knob"]) targets.push({ id: k, group: "column" });
  const cur = m.focus && targets.some((t) => t.id === m.focus) ? m.focus : "room";
  const focus = { cur, targets };

  const line = lineOf(m, spec, { frame, cur, residents, sleepers, here, cargoState, crates, pods, incubator, probe, library, need });
  return { props: { state: "home", regions, focus }, line, requests, need, targets };
}

// ---- the bottom line for the focus (home.json line) ----
function lineOf(m, spec, v) {
  const { st } = m, Sg = spec.strings, { notice, action } = wordsOf(v.need, spec), cur = v.cur;
  const spelled = (n) => SPELL[n] ?? "many", plural = (t, n, key) => fill(n === 1 && t[key + "One"] ? t[key + "One"] : t[key], { count: spelled(n) });
  // the notice zone: the first-group need as now (amber, its lamp, the goal does not show); else the goal (mist, no lamp); else the soft need (couldGrow short, toRead, budGrowing) as now. needKey and the room's ✓ are unchanged.
  const goal = S.goalKey(st, m.sv, m.settings), first = v.need && ((["crates", "budReady", "meet", "newPods", "glints", "waitingPods"].includes(v.need.key) && !v.need.soft) || (v.need.key === "couldGrow" && !v.need.short));
  const goalWords_ = !first && goal ? goalWords(goal, !!m.docked, v.frame) : null;
  const base = { back: null, need: goalWords_ ? "" : notice, ...(goalWords_ ? { goal: goalWords_ } : {}) };
  if (cur === "room") return { ...base, ok: action, subject: "" };
  if (cur === "vivarium") {
    const n = v.residents.length + v.sleepers.length, S0 = Sg.subjects.vivarium;   // the mibis in the window: the residents and, docked, the sleepers on the bed
    return { ...base, ok: Sg.actions.vivarium, subject: n === 0 ? S0.none : n === 1 ? S0.one : n <= 6 ? fill(S0.few, { count: spelled(n) }) : S0.many };
  }
  if (cur.startsWith("resident.")) {
    const id = +cur.slice(9), mb = S.mibiById(st, id), asleep = v.sleepers.some((s) => +s.id === id);
    if (!mb) return { ...base, ok: null, subject: "" };
    const stage = WORD_STAGE(spec, S.mibiStage(st, mb, m.settings)), sp = S.spName(mb);
    return { ...base, ok: fill(Sg.actions.resident, { name: mb.name }), subject: fill(asleep ? Sg.subjects.sleeper : Sg.subjects.resident, { a: S.aAn(stage).split(" ")[0], stage, species: sp }) };
  }
  const S1 = Sg.subjects;
  if (cur === "cargo") {
    const n = v.crates, w = st.waiting.length;
    return { ...base, ok: Sg.actions.cargo, subject: v.cargoState === "away" ? S1.cargo.away : n ? (n === 1 ? S1.cargo.one : fill(S1.cargo.few, { count: spelled(n) })) : w ? (w === 1 ? S1.cargo.waitingOne : fill(S1.cargo.waiting, { count: spelled(w) })) : S1.cargo.empty };
  }
  if (cur === "pods") { const n = st.tray.length; return { ...base, ok: Sg.actions.pods, subject: n === 0 ? S1.pods.empty : n === 1 ? S1.pods.one : fill(S1.pods.few, { count: spelled(n) }) }; }
  if (cur === "incubator") {
    const B = st.bud, sp = B ? S.spName(B) : "";
    return { ...base, ok: Sg.actions.incubator, subject: !B ? S1.incubator.empty : fill(v.incubator.state === "ready" ? S1.incubator.ready : S1.incubator.growing, { species: sp }) };
  }
  // the Probe's context follows the Probe goal wherever it comes from: the second goal beside a rung, or the goal itself
  const pk = goal && (goal.probe ? goal.probe.key : goal.key === "probe" ? (goal.step.key === "fit" ? "fit" : "save") : null);
  if (cur === "probe") return { ...base, ok: Sg.actions.probe, subject: v.probe.state === "docked" ? (pk === "fit" ? S1.probe.fit : pk === "save" ? S1.probe.save : S1.probe.docked) : S1.probe.away };
  if (cur === "library") return { ...base, ok: Sg.actions.library, subject: v.library.state === "pages" ? S1.library.pages : S1.library.empty };
  if (cur === "knob") return { ...base, ok: Sg.actions.knob, subject: S1.knob };
  return base;
}

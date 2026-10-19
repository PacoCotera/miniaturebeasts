// The Home props (lvgl-switch.md §2.1): pure selectors from the state, the focus and the presentation to the props of the face's Home words (screens/home_frame.c). Props name *what*, never *where*: strings, states, counts, flags and the
// focus targets by id; no rectangle, no measure, no layout rule (the words place everything from home.json). The output is plain JSON: { props (state, regions, focus), requests (none: Home draws no host picture), needs (the needs that hold, in
// their order), targets }. The living window's shared selectors (livingOf, restOf, lightAt, the figure and picture ids) are Idle's and the Vivarium's whole, and stay here.
import * as S from "../state.mjs";
import { frameOf, genomeDigest } from "../genome.mjs";
import { movingIds, playable, movingFigure } from "../moving.mjs";
import { standLook } from "../stands.mjs";
import { asset as assetOf } from "../../../ui/assets.mjs";
import { drawnLooks } from "../looks.mjs";
import { layeredStand, standPictureId, standFigure, curlFactor, curlPicture } from "../layered-stand.mjs";
import { keyToken } from "../looks.mjs";
import { goalWords } from "./goal-words.mjs";
import { readyCrates, bayState } from "../sitting.mjs";

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
  const sp = S.speciesOf(mb), grown = mb.stage ?? S.mibiStage(st, mb, settings), stand = layeredStand(sp, grown, size, view);
  if (stand) { const looks = drawnLooks(frameOf(sp), mb); return { id: standPictureId(stand, looks, light), stage: grown, size: [...stand.size], looks }; }
  const { stage, size: drawn } = lookOf(st, mb, size, settings);
  return { id: mibiPictureId(genomeDigest(mb.genome), stage, drawn, light), stage, size: drawn };
};
// A standing mibi's figure, [dx, dy, W, H]: the drawn bbox of its composed figure in its picture, or null when the picture is not a layered stand
export const figureOf = (st, mb, size, settings, view = "default") => {
  const sp = S.speciesOf(mb), stand = layeredStand(sp, mb.stage ?? S.mibiStage(st, mb, settings), size, view); if (!stand) return null;
  return standFigure(stand, drawnLooks(frameOf(sp), mb));
};
// A sleeper's curl at the world size: the nap master reduced by the standing figure's factor for its stage, with its own shadow. { id, figure, request } when the nap master is placed; else null (the 96 × 88 nap picture as it was)
export function curlOfMibi(st, mb, nap, slot, settings, light, view) {
  const look = lookOf(st, mb, nap, settings); if (look.step === 3) return null;
  const sp = S.speciesOf(mb), master = `mibi-${look.stage === "juvenile" ? "juvenile" : "adult"}-${sp}-${nap[0]}x${nap[1]}`, f = curlFactor(look.stage, view, slot[1]); if (!f) return null;
  const src = assetOf(master); if (!src) return null;
  const pic = curlPicture(src, sp, look.stage, f, view, master); if (!pic.figure) return null;
  const ms = look.stage === "juvenile" ? "juvenile" : "adult", day = `mibi:${sp}~${keyToken(`curl|${master}|${view}|${f}`)}:${ms}:${pic.w}x${pic.h}`;
  return { id: day + (light === "day" ? "" : ":" + light), figure: pic.figure, request: { kind: "curl", id: day + (light === "day" ? "" : ":" + light), day, master, species: sp, stage: look.stage, view, factor: f, ...(light === "day" ? {} : { light }) } };
}
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
  const sp = S.speciesOf(mb), I = movingIds(sp, stage, mb.look ?? "species", m.light ?? "day"); if (!I || !(m.motionSets || playable(sp, stage))) return "";   // named by the mibi's look (the layer bake): `species` until the bake slot gives mibis a look
  const out = { set: sp }; for (const k of parts) out[k] = req({ kind: "moving", id: I[k] }); return out;
}

export function livingOf(m, R, req, ph, L) {
  const { st, sv, settings } = m, docked = !!m.docked || !!m.sendoff, carried = S.carriedIds(st, sv), here = S.homeMibis(st, sv);   // the lift's send-off keeps the bed docked until it ends (m.sendoff: home.json events.sendoff)
  const stageOf = (mb) => S.mibiStage(st, mb, settings);
  const sizeOf = (mb) => R.resident[stageOf(mb) === "juvenile" ? "juvenile" : "adult"];
  const pic = (mb, size) => mibiReq(req, st, mb, size, settings, m.light, m.view ?? "home");
  // A species with a layered stand draws a moving resident as that stand translated along its path, with no walk cycle, until its atlases carry the layers at world size: it keeps its own coat and marks, at the stand's size
  const standOf = (mb) => layeredStand(S.speciesOf(mb), stageOf(mb), sizeOf(mb), m.view ?? "home");
  const person = (mb, extra = {}) => {
    const nap = !!extra.nap, kept = nap && !!extra.noCurl; delete extra.nap; delete extra.noCurl;   // kept: a moving nap set draws its own atlas at the old nap size
    const curl = nap && !kept ? curlOfMibi(st, mb, R.bed.sleepers.ink.max, sizeOf(mb), settings, m.light ?? "day", m.view ?? "home") : null;   // a sleeper takes the world-size curl when its nap master is placed
    const standing = nap && !kept && !curl, size = nap && !standing ? R.bed.sleepers.ink.max : sizeOf(mb);   // with no nap picture at all it sleeps as its standing figure, never at the old size
    const look = lookOf(st, mb, size, settings), figure = curl ? curl.figure : nap && !standing ? null : figureOf(st, mb, size, settings, m.view ?? "home");
    return { id: String(mb.id), name: mb.name, stage: look.stage, picture: curl ? req(curl.request) : pic(mb, size), ...(figure ? { figure } : {}), waiting: false, ...extra };
  };
  const rest = m.time != null && m.restRules ? restOf(here.map((mb) => ({ id: String(mb.id), seed: hash(mb.id), species: S.speciesOf(mb), stage: stageOf(mb) })), m.time, m.restRules) : null;   // the residents at home; never the bed's carried sleepers, never one out
  const residents = here.map((mb) => { const p = person(mb, { seed: hash(mb.id) }), mv = standOf(mb) ? "" : movingProp(mb, stageOf(mb), req, m); if (mv) { p.moving = mv; const mf = movingFigure(mv.walk); if (mf) p.figure = mf; else delete p.figure; } /* a moving resident's figure is its atlas's (measured once), not its stand's */ if (rest) p.rest = rest[String(mb.id)];
    if (p.rest === "asleep" && !mv && standOf(mb)) { const c = curlOfMibi(st, mb, R.bed.sleepers.ink.max, sizeOf(mb), settings, m.light ?? "day", m.view ?? "home"); if (c) { p.curl = req(c.request); p.curlFigure = c.figure; } }   // a sleeping resident with a curl draws it in place, its foot on its feet line; on waking it cuts back to its stand
    return p; });
  const sleepers = docked ? carried.slice(0, R.bed.sleepers.max).map((id) => S.mibiById(st, id)).filter(Boolean).map((mb) => { const mv = standOf(mb) ? "" : movingProp(mb, stageOf(mb), req, m, ["nap"]), p = person(mb, { seed: hash(mb.id), nap: true, noCurl: !!mv }); if (mv) p.moving = mv; if (m.sendoff) p.stand = pic(mb, sizeOf(mb)); return p; }) : [];
  const bed = {
    state: docked ? (sleepers.length ? "docked" : "none") : "away",
    picture: req({ kind: "slot", id: `home-bed-${m.light}-${R.bed.rect[2]}x${R.bed.rect[3]}`, master: `${L.bed[m.light]}-${R.bed.rect[2]}x${R.bed.rect[3]}`, size: R.bed.rect.slice(2), until: "the bed masters" }),   // the bed of the light, in every state
    mark: docked ? "" : ph(R.bed.markPicture, R.bed.mark),   // away only: the Companion's mark (home-bed-mark-16x24), 1:1 over the bed
    sleepers, ...(m.sendoff ? { sendoff: true } : {}),
  };
  return { residents, sleepers, bed };
}


// ---- Home: the top bar's words, the line, the two windows and the four stations ----
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// The bar's date and clock from the device's: date { y, m (0 to 11), d }, seconds of the day. "Sat 17 Oct" and "09:41".
export const dateWords = ({ y, m, d }) => `${DAYS[new Date(Date.UTC(y, m, d)).getUTCDay()]} ${d} ${MONTHS[m]}`;
export const clockWords = (secs) => { const h = Math.floor(secs / 3600) % 24, mm = Math.floor(secs / 60) % 60; return String(h).padStart(2, "0") + ":" + String(mm).padStart(2, "0"); };

// The needs that hold, in the order of home.json strings.line.order (the facts of state.needKey's, one each; a soft need is not a need: the goal takes the line). portrait: a sitting crate is ready.
export function homeNeeds(st, sv, settings, ui = {}, now = Date.now()) {
  const out = [], cs = S.bayCrates(st, sv), art = (w) => S.aAn(w).split(" ")[0];
  if (S.docked(st) && cs.length) out.push({ key: "crates", n: cs.length, max: 3, act: "cargo" });
  if (S.budReady(st, settings)) out.push({ key: "budReady", act: "incubator" });
  if (readyCrates(st, settings, now).length) out.push({ key: "portrait", act: "cargo" });
  const meet = ui.meet != null ? S.mibiById(st, ui.meet) : null; if (meet) out.push({ key: "meet", name: meet.name, act: "meet" });
  const unseen = st.tray.filter((p) => !p.idd && !p.seen); if (unseen.length) out.push({ key: "newPods", n: unseen.length, max: 6, act: "pods" });
  const glint = st.tray.filter((p) => S.podGlints(st, p)); if (glint.length) out.push({ key: "glints", n: glint.length, max: 6, act: "pods" });
  if (st.waiting.length) out.push({ key: "waitingPods", n: st.waiting.length, max: 6, act: "pods" });
  const grow = couldIncubate(st, settings); if (grow) out.push({ key: "couldGrow", species: S.spName(grow), a: art(S.spName(grow)), act: "pods" });
  return out;
}
// The pod that could be incubated now (read, a bay free, the price in hand), or null: needKey's couldGrow with no short.
function couldIncubate(st, settings) {
  const grown = st.tray.filter((p) => p.idd && p.read.length && !st.bud); if (!grown.length || S.bayFull(st, settings)) return null;
  const c = S.growCost(st, {}, settings); return S.canPay(st, c.e, 0, c.s) ? grown[0] : null;
}

// m: { st, sv, settings, docked, ui, focus: id | null, time (seconds of the day), date { y, m, d }, now (ms), place, spec home.json, frame frame.json }
export function homeBuild(m, spec, frame) {
  const { st, sv, settings } = m, now = m.now ?? Date.now(), Sg = spec.strings, T = Sg.stations, docked = !!m.docked, fill = (t, o) => t.replace(/\{(\w+)\}/g, (_, k) => (k in o ? o[k] : "{" + k + "}"));
  const needs = homeNeeds(st, sv, settings, m.ui ?? {}, now);
  // the stations: the lines and the lamp
  const pods = (() => {
    const n = st.tray.length, seen = new Set(st.tray.filter((q) => q.idd || st.knownIds.includes(S.speciesOf(q))).map((q) => S.speciesOf(q))), k = seen.size;
    const amber = st.tray.some((p) => !p.idd && !p.seen) || st.tray.some((p) => S.podGlints(st, p));
    return { line1: n ? fill(T.pods.count, { n }) : T.pods.empty, line2: n && k >= 2 ? fill(T.pods.kinds, { k }) : "", lamp: amber ? "needsYou" : "off" };
  })();
  const incubator = (() => {
    const bud = st.bud, ready = S.budReady(st, settings), state = !bud ? "empty" : ready ? "ready" : "growing", name = bud ? S.spName(bud) : "", I = T.incubator, grow = !bud && couldIncubate(st, settings);
    return { state, line1: state === "empty" ? I.empty : state === "growing" ? I.growing : I.ready, line2: state === "empty" ? (grow ? I.canIncubate : "") : fill(I.species, { a: S.aAn(name).split(" ")[0], Species: name }), lamp: ready ? "needsYou" : "off" };
  })();
  const companion = (() => {
    const c = S.carriedIds(st, sv), id = c.includes(sv?.lead) ? sv.lead : c[0] ?? null, mb = id == null ? null : S.mibiById(st, id), C = T.companion;
    return { state: docked ? "docked" : "away", line1: mb ? fill(docked ? C.docked : C.away, { name: mb.name }) : "", line2: "", lamp: "off" };
  })();
  const bay = (() => {
    const cs = docked ? S.bayCrates(st, sv) : [], bs = bayState(st, sv, settings, now), B = T.bay, trips = new Set(cs.map((c) => c.turn)).size;   // bayState: the walk crates while docked and the portrait crates that are ready; amber when anything waits
    return { state: cs.length ? "waiting" : "clear", berths: bs.sitting ? 4 : 3, line1: cs.length ? fill(cs.length === 1 ? B.waitingOne : B.waiting, { n: cs.length }) : B.clear, line2: cs.length ? (trips <= 1 ? B.lastTrip : fill(B.trips, { n: trips })) : "", lamp: bs.amber ? "needsYou" : "off" };
  })();
  // the windows: the Vivarium's readout (each part only when non-zero; "all on a trip" when nobody is home)
  const housed = S.housed(st), onTrip = housed.filter((mb) => S.isAway(st, sv, mb)).length, atHome = housed.length - onTrip, R = Sg.readout;
  const readout = !housed.length ? "" : atHome === 0 ? R.allTrip : [atHome ? fill(R.home, { n: atHome }) : "", onTrip ? fill(R.trip, { m: onTrip }) : ""].filter(Boolean).join(R.sep);
  // the focus: the six targets, the ring on `cur` or nowhere
  const targets = ["vivarium", "library", "pods", "incubator", "companion", "bay"].map((id) => ({ id, group: id }));
  const cur = m.focus && targets.some((t) => t.id === m.focus) ? m.focus : "room";
  const line = lineOf(m, spec, frame, { cur, needs, docked, companion });
  const regions = { bar: { place: m.place ?? "", date: m.date ? dateWords(m.date) : "", clock: m.time != null ? clockWords(m.time) : "" }, line, vivarium: { readout }, library: {}, pods, incubator, companion, bay };
  return { props: { state: "home", regions, focus: { cur, targets } }, requests: [], needs, targets };
}

// ---- the line (home.json strings.line) ----
// At rest: the needs (at most two: the first by its action with the ✓ cap, the second by its notice), else the goal. On a target: its verb, and its subject if it has one. The Companion away has no verb: it says it is on a trip.
function lineOf(m, spec, frame, v) {
  const Sg = spec.strings, { cur } = v;
  if (cur === "room") {
    if (v.needs.length) return { needs: v.needs.slice(0, spec.regions.line.needs).map((nd, i) => { const w = wordsOf(nd, spec); return i === 0 ? (Sg.needs[nd.key].lineAction ?? w.action) : w.notice; }) };   // the first by the verb the line names (lineAction where the Bay's name is capitalised), the second by its notice
    const goal = S.goalKey(m.st, m.sv, m.settings), g = goal && goalWords(goal, !!m.docked, frame);
    return g ? { goal: g } : {};
  }
  if (cur === "companion" && !v.docked) return { note: Sg.notes.companionAway };
  return { verb: Sg.actions[cur] };
}

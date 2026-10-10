// The Home props (lvgl-switch.md §2.1, §4 L2.2): pure selectors from the state, the focus and the presentation to the props of the face's Home words. Props name *what*, never *where*: strings, states, counts,
// asset ids, flags, seeds and the focus targets by id; no rectangle, no measure, no layout rule (the words place everything from home.json). The output is plain JSON:
// { props (state, regions, focus), line (the bottom line, for the frame), requests (the pictures the host makes ready before the props), need (the notice's key and its action) }.
// Runs in Node, tested there (tests/home-props.test.mjs); the shape is home.props.json. Sitting crates and the Cargo screen are L2.2's second PR (cargo.json); here the bay's crates are the walk crates.
import * as S from "../state.mjs";
import { frameOf } from "../genome.mjs";

const SPELL = ["no", "one", "two", "three", "four", "five", "six"];
const COUNT = ["", "a", "two", "three", "four", "five", "six"];
const fill = (t, o) => t.replace(/\{(\w+)\}/g, (_, k) => (k in o ? o[k] : "{" + k + "}"));
const hash = (n) => (Math.imul(n + 1, 2654435761) >>> 0) % 65521;
// A painting that has not landed is on its way: the waiting lamp of a resident, and the Incubator's.
const paintWaiting = (mibi) => !mibi.paint || ["queued", "painting", "capped", "sent"].includes(mibi.paint.state);
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

export function homeBuild(m, spec, frame) {
  const { st, sv, settings } = m, requests = [], req = (r) => { requests.push(r); return r.id; };
  const R = spec.regions, docked = !!m.docked, carried = S.carriedIds(st, sv), here = S.homeMibis(st, sv);
  const slot = (master, size, until) => req({ kind: "slot", id: `${master}:${size.join("x")}`, master, size, until: until || "the Home masters (station-layouts.md, Home, Cargo and Idle: the masters)" });
  // a PH plate or hollow (home.json placeholders): a picture of the register, status placeholder, until its master
  const ph = (id, size, hollow = false) => req({ kind: "ph", id, size, hollow, until: "its master (home.json placeholders)" });
  const facts = S.needKey(st, sv, settings, m.ui ?? {}), need = facts && { ...facts, module: spec.strings.needs[facts.key].module }, lampOf = (mod) => (need && need.module === mod ? "needsYou" : null);

  // the living window: the glass's master (day), the residents at home walking, the bed with the carried set asleep
  const stageOf = (mb) => S.mibiStage(st, mb, settings);
  const sizeOf = (mb) => R.resident[stageOf(mb) === "juvenile" ? "juvenile" : "adult"];
  const pic = (mb, size) => req({ kind: "mibi", id: `mibi:${mb.id}:${size.join("x")}`, mibi: mb.id, species: S.speciesOf(mb), size });
  const person = (mb, extra = {}) => { const size = extra.nap ? R.bed.sleepers.ink.max : sizeOf(mb); delete extra.nap; return { id: String(mb.id), name: mb.name, stage: stageOf(mb), picture: pic(mb, size), waiting: paintWaiting(mb), ...extra }; };
  const residents = here.map((mb) => person(mb, { seed: hash(mb.id) }));
  const sleepers = docked ? carried.slice(0, R.bed.sleepers.max).map((id) => S.mibiById(st, id)).filter(Boolean).map((mb) => person(mb, { seed: 0, nap: true })) : [];
  const bed = {
    state: docked ? (sleepers.length ? "docked" : "none") : "away",
    picture: ph(`home-bed-${R.bed.rect[2]}x${R.bed.rect[3]}`, R.bed.rect.slice(2)),   // the bed's PH plate in every state; no Companion mark is drawn until the art director's hand-drawn mark (home-bed-mark-16x24) lands
    sleepers,
  };

  // the modules
  const crates = docked ? S.bayCrates(st, sv).length : 0;
  const cargoState = !docked ? "away" : crates ? "crates" : st.waiting.length ? "waiting" : "empty";
  const cargo = {
    state: cargoState, crates: Math.min(crates, R.cargo.max), lamp: lampOf("cargo") ?? "off",
    bay: slot(cargoState === "away" ? "home-bay-shut" : "home-bay-open", R.cargo.bay.slice(2)),
    crate: ph(`home-crate-${R.cargo.crate.join("x")}`, R.cargo.crate), waiting: cargoState === "waiting" ? req({ kind: "waiting", id: "waiting:24" }) : "",
  };
  const rackSize = R.pods.wells.slots, podSize = R.pods.pod.size;
  const wells = Array.from({ length: rackSize }, (_, i) => {
    const q = st.tray[i];
    if (!q) return { pod: "", glint: "" };
    const sp = q.idd || st.knownIds.includes(S.speciesOf(q)) ? S.speciesOf(q) : null;
    return { pod: ph(`home-rack-pod-${podSize.join("x")}`, podSize), glint: q.idd && S.podGlints(st, q) ? req({ kind: "star", id: "star:12" }) : "" };
  });
  const pods = { lamp: lampOf("pods") ?? (st.tray.length ? "well" : "off"), well: slot("home-well", R.pods.wells.size), wells };
  const bud = st.bud, ready = S.budReady(st, settings), progress = bud ? S.budProgress(st, settings) : 0;
  const painting = !bud && st.mibis.length > 0 && paintWaiting(st.mibis[st.mibis.length - 1]) && !st.mibis[st.mibis.length - 1].released;
  const incState = !bud ? (painting ? "painting" : "empty") : ready ? "ready" : "growing";
  const total = bud ? Math.min(bud.minutes || 0, R.incubator.leaves.max) : 0;
  const incubator = {
    state: incState, lamp: lampOf("incubator") ?? (incState === "growing" ? "well" : incState === "painting" ? "waiting" : "off"),
    chamber: slot(`home-chamber-${incState === "painting" ? "empty" : incState}`, R.incubator.chamber.slice(2)),
    leaves: { total, rows: Math.ceil(total / R.incubator.leaves.perRow), full: bud ? (ready ? total : Math.min(total, Math.floor(progress * total))) : 0, emptyPicture: ph(`home-leaf-empty-${R.incubator.leaves.leaf.join("x")}`, R.incubator.leaves.leaf, true), fullPicture: ph(`home-leaf-${R.incubator.leaves.leaf.join("x")}`, R.incubator.leaves.leaf) },
  };
  const pr = docked ? S.probeNow(st, sv) : null;
  const held = !!st.sitting;
  const probe = {
    state: docked ? "docked" : "away", lamp: lampOf("probe") ?? (docked ? "well" : "off"),
    cradle: slot(docked ? "home-cradle-full" : "home-cradle-empty", R.probe.cradle.slice(2)),
    shields: { count: pr ? Math.min(pr.smax, R.probe.shields.count) : 0, whole: pr ? Math.min(pr.shield, pr.smax) : 0, wholePicture: ph(`home-shield-${R.probe.shields.size.join("x")}`, R.probe.shields.size), gonePicture: ph(`home-shield-gone-${R.probe.shields.size.join("x")}`, R.probe.shields.size, true) },
    frame: held ? ph(`home-sitting-${R.probe.slot.slice(2).join("x")}`, R.probe.slot.slice(2)) : "",
  };
  const found = st.knownIds.length;
  const library = { state: found ? "pages" : "empty", lamp: lampOf("library") ?? (found ? "well" : "off"), journal: slot("home-journal", R.library.journal.slice(2)) };

  const regions = { glass: { picture: slot("home-glass-day", [R.glass.rect[2], R.glass.rect[3]]) }, residents, bed, cargo, pods, incubator, probe, library };

  // the focus: the targets present, in the spec's group order; the ring is on `cur` or nowhere ("room")
  const targets = [{ id: "vivarium", group: "vivarium" }];
  for (const r of residents) targets.push({ id: "resident." + r.id, group: "resident" });
  for (const r of sleepers) targets.push({ id: "resident." + r.id, group: "resident" });
  for (const k of ["cargo", "pods", "incubator", "probe", "library", "knob"]) targets.push({ id: k, group: "column" });
  const cur = m.focus && targets.some((t) => t.id === m.focus) ? m.focus : "room";
  const focus = { cur, targets };

  const line = lineOf(m, spec, { cur, residents, sleepers, here, cargoState, crates, pods, incubator, probe, library, need });
  return { props: { state: "home", regions, focus }, line, requests, need, targets };
}

// ---- the bottom line for the focus (home.json line) ----
function lineOf(m, spec, v) {
  const { st } = m, Sg = spec.strings, { notice, action } = wordsOf(v.need, spec), cur = v.cur;
  const spelled = (n) => SPELL[n] ?? "many", plural = (t, n, key) => fill(n === 1 && t[key + "One"] ? t[key + "One"] : t[key], { count: spelled(n) });
  const base = { back: null, need: notice };
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
  if (cur === "probe") return { ...base, ok: Sg.actions.probe, subject: v.probe.state === "docked" ? S1.probe.docked : S1.probe.away };
  if (cur === "library") return { ...base, ok: Sg.actions.library, subject: v.library.state === "pages" ? S1.library.pages : S1.library.empty };
  if (cur === "knob") return { ...base, ok: Sg.actions.knob, subject: S1.knob };
  return base;
}

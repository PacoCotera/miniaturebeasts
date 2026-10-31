// The reading screen v2 (the reading screen spec, signed 2026-10-29): one pod on the bench, read as a specimen in its chamber with its gene-tag rail on the shelf (the left frame) and the chapter in hand as
// field-guide plates (the right frame). Pure selectors from the state and the Pods UI to the props of the face's words (regions.read): what is drawn, never where (the words place it from pods.json
// regions.read). Two levels: the pod (the rail and the right frame) and the detail of a read trait; the stamp in progress over the left glass, taught once.
//   ui.pods: lane (the chapter in hand, a lane of the rail), at ("rail" | "right" | "detail" | "stamp"), plate (the focused plate), trait (the detail's trait), reading ({ pod, chapter, until, cost, newLook, k }), moment ({ pod, block }), shake
import * as S from "../state.mjs";
import { frameOf, traitState, traitKind, stampSizing, stampBlocks } from "../genome.mjs";
import { fill } from "./words.mjs";
import { railLanes, railLayout } from "../reading-rail.mjs";

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const slot = (req, id, size, until) => req({ kind: "slot", id, master: id, size, until: until ?? "the reading screen's cut (the reading screen spec §3)" });
const podFrame = (p) => frameOf(S.speciesOf(p));
export const sealedShut = (ch, settings) => !!ch.sealed && !settings.sealedOpen;
const isDoings = (ch) => ch.traits.every((t) => t.nature === "doing");
// The lane growing teaches free (the sprout): the first unread chapter that holds no look, its traits all doings (the signed mockups: the Loika's and the Tuikis' Movement). The game designer settles it.
export function sproutLane(fr, p, settings) { const i = fr.chapters.findIndex((c) => !p.read.includes(c.id) && !sealedShut(c, settings) && isDoings(c)); return i; }
// The recommended lane (§2.6, 1): a goal glint, then a glint, never the sprout lane while another lane is unread, a fresh pod its first lane
export function recommendedLane(st, p, settings = S.DEFAULT_SETTINGS) {
  if (!p || !p.idd) return 0; const fr = podFrame(p), chs = fr.chapters, goal = new Set(S.podGoalTraits(st, p)), sp = sproutLane(fr, p, settings);
  const unread = chs.map((c, i) => [c, i]).filter(([c]) => !p.read.includes(c.id) && !sealedShut(c, settings));
  if (!p.read.length && !unread.some(([c]) => S.glint(st, p, c.id))) return 0;
  const pick = unread.find(([c]) => S.glint(st, p, c.id) && c.traits.some((t) => goal.has(t.id))) ?? unread.find(([c]) => S.glint(st, p, c.id)) ?? unread.find(([, i]) => i !== sp) ?? unread[0];
  return pick ? pick[1] : 0;
}
// The part of the body a chapter reads (the cut tool's masks): Coat the body, Face the head (with its own crest once read), Movement and Legs the legs; the others have no part and draw none
export function partOf(species, ch, read) {
  const id = ch.id; if (species === "S01") return id === "coat" ? "coat" : id === "face" ? (read.includes("face") ? "face" : "head") : id === "movement" ? "legs" : "";
  if (species === "S03") return id === "coat" ? "coat" : id === "face" ? "face" : id === "shape" ? "shape" : id === "legs-tail" || id === "movement" ? "legs" : "";
  return "";
}
// The place the specimen stands at: Face (the head) close when its chapter is open, the detail of a head trait closer; the body chapters keep the overview
export function placeOf(ch, at) { const head = ch && ch.id === "face"; if (at === "detail") return head ? "detail" : "overview"; if (at === "right" && head) return "close"; return "overview"; }
// The chamber's picture id for a pod, a place, what is read and the chapter in hand (one picture of one size for every place)
export function chamberReq(req, p, place, read, hand, outline) {
  const sid = S.speciesOf(p), fr = frameOf(sid), ch = fr.chapters.find((c) => c.id === hand) ?? null, part = ch ? partOf(sid, ch, read) : "";
  const tints = sid === "S03" ? read.map((c) => { const x = fr.chapters.find((y) => y.id === c); return x ? [partOf(sid, x, read), c] : null; }).filter((t) => t && t[0]) : [];
  const key = `${read.slice().sort().join("+") || "-"}:${hand || "-"}:${part || "-"}:${outline ? "o" : "t"}`;
  return req({ kind: "readchamber", id: `readchamber:${p.id}:${place}:${railHash(key)}`, species: sid, pod: p.id, place, read: [...read], hand: hand || "", outline: !!outline, part, tints });
}
const railKey = (lanes) => lanes.map((l) => l.state[0] + l.traits.map((t) => (t.look ? t.look.join("/") + t.pattern.join("") : t.lv ? t.lv.join("") + t.gait.join("") : t.nature[0] + (t.looks ?? ""))).join(".")).join("|");
let railHash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h.toString(16).padStart(8, "0"); };
export function railReq(req, st, p, settings, read, small = false) {
  const fr = podFrame(p), lanes = railLanes(st, fr, { ...p, read }, settings, S);
  return { id: req({ kind: "readrail", id: `readrail:${S.speciesOf(p)}:${railHash(railKey(lanes))}${small ? ":small" : ""}`, lanes, small, species: S.speciesOf(p) }), lanes };
}
// The rail of a pod as the panel and Compare take it (the reading screen spec §4, the same renderer at the small size, 272 x 40 on the dark inset): the picture and, per lane, its chapter, trait count, state and the marks over it:
// a glint and the goal's star while unread, and (Compare's `diffIn`, the chapter ids that hold a trait in compareDiff) the differs mark; `hand` is Compare's open chapter (the bracket), `nudge` its stop's direction.
export function miniRailProps(req, st, p, settings, o = {}) {
  if (!p || !p.idd) return null; const fr = podFrame(p), rr = railReq(req, st, p, settings, p.read, true), goal = new Set(S.podGoalTraits(st, p)), diffIn = o.diffIn ?? new Set();
  const out = { pic: rr.id, inset: slot(req, "reading-inset-24x24", [24, 24]), lanes: rr.lanes.map((l, i) => { const c = fr.chapters[i], marks = [];
    if (l.state === "unread") { if (S.glint(st, p, c.id)) marks.push("glint"); if (c.traits.some((t) => goal.has(t.id))) marks.push("goal"); }
    if (diffIn.has(c.id)) marks.push("differs");
    return { id: c.id, n: c.traits.length, state: l.state, marks }; }),
    marks: { glint: slot(req, "reading-glint-12x12", [12, 12]), star: slot(req, "reading-star-12x12", [12, 12]) } };
  if (o.hand != null) { out.hand = o.hand; out.nudge = o.nudge ?? 0; out.marks.differs = slot(req, "reading-differs-12x12", [12, 12]); }   // Compare's: the bracket and the differs mark
  return out;
}
const discReq = (req, sid, t, ch, d, o = {}) => req({ kind: "readdisc", id: `readdisc:${sid}:${railHash(t.id + ":" + (o.q ? "?" : o.glyph ? "g" + o.glyph : o.look ?? "-"))}:${d}${o.veil ? ":v" : ""}${o.alpha ? ":a" : ""}${o.carried ? ":c" : ""}`, species: sid, trait: t.id, chapter: ch.id, d, look: o.look ?? null, q: !!o.q, ghost: !!o.q, carried: !!o.carried, veil: o.veil ?? 0, alpha: o.alpha ?? null, glyph: o.glyph ?? null });
// the template's looks of a trait (the looks the species can take, small and faint, no names): at most three
const templateOf = (st, fr, t) => { const all = Array.isArray(t.looks) ? t.looks : S.guideLooks(st, fr.species.id, t.id); return (all.length ? all : ["", "", ""]).slice(0, 3); };
// the sizes of the right frame's discs by layout (§2.5): shown r, carried r, template chip r
const RADII = { 1: [52, 34, 21], 2: [44, 29, 21], 3: [32, 21, 18], 4: [26, 17, 14] };
const READ_R = { 1: [46, 30], 2: [46, 30], 3: [32, 21], 4: [26, 17] };
export const KIND_LINE = { only: "only", hides: "hides", blend: "blend", asleep: "asleep" };

// The reading screen's view. view: the Pods view being built; m: { st, settings, ui, focus, now }; spec: pods.json; req: the requests' collector.
export function readView(view, m, spec, req) {
  const { st, settings, ui } = m, Sg = spec.strings.read, p = S.benchPod(st), R = spec.regions.read;
  view.mode = "read"; view.cur = p ? p.id : null;
  const out = { base: slot(req, R.ground.id, R.ground.rect.slice(2)), lamp: "", glyph: slot(req, R.glyph.id, R.glyph.rect.slice(2)), name: "", why: "", chamber: "", from: "", rail: null, right: null, reading: null, stamp: null,
    marks: { glint: slot(req, "reading-glint-11x11", [11, 11]), star: slot(req, "reading-star-11x11", [11, 11]) } };
  view.read = out;
  if (!p) { view.line = { ok: null, back: spec.strings.room.foot.backPods, subject: "", need: "" }; view.targets = []; view.resolve = {}; prune(out); return view; }
  out.name = p.idd ? S.cap(S.spName(p)) : spec.strings.inv.sealedPod; out.why = typeof p.why === "string" ? p.why : "";   // the pod's reason, when the Companion sent one ("a new species", "you fed it"): drawn if present
  const sid = S.speciesOf(p), fr = podFrame(p), chs = p.idd ? fr.chapters : [];
  // an unidentified pod: the chamber empty under its light, no rail (no stamp yet); the right frame offers Identify on the price key
  if (!p.idd) {
    out.chamber = slot(req, "reading-chamber-overview-548x356", [548, 356]); const c = S.identifyCost(st, settings), short = st.d < c;
    out.right = { form: "identify", chapter: { id: "", name: Sg.identifyHead, marks: [], tick: false, lock: false }, plates: [{ trait: "", kind: Sg.identifyLine, shown: { pic: req({ kind: "pod", id: `pod:-:s:88x112`, species: null, state: "sealed", size: [88, 112] }), caption: "" } }],
      key: { price: String(c), state: short ? "dim" : "lit", pic: slot(req, `reading-key-${short ? "dim" : "lit"}-104x49`, [104, 49]), diamond: slot(req, "reading-diamond-16x16", [16, 16]) }, beside: { sprout: "", text: short ? Sg.dataGrows : "" }, chip: null, mate: null, plate: slot(req, R.right.plate.id, [40, 40]), glow: slot(req, "reading-plate-glow-character-200x120", [200, 120]) };
    view.line = { ok: short ? null : Sg.identify, price: short ? "" : "◆ " + c, back: spec.strings.room.foot.backPods, subject: "", need: short ? fill(Sg.needs, { n: c, have: st.d }) : "" };
    view.targets = [{ id: "key", group: "key" }]; view.resolve = {}; prune(out); return view;
  }
  const k = clamp(ui.lane ?? recommendedLane(st, p, settings), 0, chs.length - 1), ch = chs[k], at = ui.at ?? "rail", reading = ui.reading && ui.reading.pod === p.id ? ui.reading : null;   // the host ends it (800 ms, a key, or at once with reduced motion)
  const read = p.read.filter((c) => chs.some((x) => x.id === c)), sealed = sealedShut(ch, settings) && !p.read.includes(ch.id), isRead = p.read.includes(ch.id);
  const place = placeOf(ch, at), outline = place === "overview" && !sealed;
  // the chamber: the specimen at its place, the part of the chapter in hand tinted (outlined at the overview; a sealed part outlined only); the dither's source when the place moved
  out.chamber = chamberReq(req, p, place, read, sealed ? "" : ch.id, outline);
  if (sealed) out.chamber = chamberReq(req, p, place, read, ch.id, true);
  if (ui.fromChamber && ui.fromChamber !== out.chamber) out.from = ui.fromChamber;
  // the rail: the lanes, the chapter in hand (the bracket), the trait in the detail, the stamp notch once taught
  const rr = railReq(req, st, p, settings, read), sp = sproutLane(fr, p, settings), goal = new Set(S.podGoalTraits(st, p));
  out.rail = { pic: rr.id, hand: k, trait: at === "detail" ? clamp(ui.trait ?? 0, 0, ch.traits.length - 1) : -1, notch: !!st.stampTaught, nudge: ui.nudge ? ui.nudge.dir : 0,
    lanes: rr.lanes.map((l, i) => { const c = chs[i], marks = [];
      if (l.state === "unread") { if (S.glint(st, p, c.id)) marks.push("glint"); if (c.traits.some((t) => goal.has(t.id))) marks.push("goal"); }
      return { id: c.id, n: c.traits.length, state: l.state, marks }; }) };
  // the read in progress: the pictures it runs between (the chamber and the rail as they were), the lamp lit
  if (reading) { const before = reading.read ?? read.filter((c) => c !== reading.chapter);
    out.reading = { lane: chs.findIndex((c) => c.id === reading.chapter), chamber: chamberReq(req, p, place, before, ch.id, outline), rail: railReq(req, st, p, settings, before).id, chip: !!reading.reward,
      sweep: slot(req, "reading-sweep-28x356", [28, 356]), shine: slot(req, "reading-shine-40x63", [40, 63]) };
    out.lamp = slot(req, "reading-lamp-lit-36x26", [36, 26]); }
  // the right frame: the chapter in hand
  out.right = rightOf(m, spec, req, p, fr, ch, k, { at, isRead, sealed, sprout: sp === k, goal, reading });
  if (reading && out.right && !out.right.key) out.right.key = { price: String(reading.cost ?? ""), state: "pressed", pic: slot(req, "reading-key-pressed-104x49", [104, 49]), diamond: slot(req, "reading-diamond-16x16", [16, 16]), pressOnly: true };   // the key shows pressed for the read's first 80 ms
  // the stamp: the one-time moment at the end of the first read ever, and the stamp view (▲ on the rail) once taught
  const moment = ui.moment && ui.moment.pod === p.id ? ui.moment : null;
  if (moment || at === "stamp" || ui.folding) out.stamp = stampOf(req, st, p, fr, rr, moment ?? (ui.folding?.was === "moment" ? { chapter: null } : null), Sg, settings);
  view.line = lineOf(m, spec, out, p, ch, { at, isRead, sealed, reading, moment });
  view.targets = targetsOf(out, { at, isRead, sealed, reading, moment, ch });
  view.resolve = {}; prune(out);
  return view;
}
// a key whose value is null is not sent (the face reads an absent key as not shown)
function prune(o) { if (!o || typeof o !== "object") return o; if (Array.isArray(o)) { o.forEach(prune); return o; } for (const k of Object.keys(o)) { if (o[k] == null) delete o[k]; else prune(o[k]); } return o; }
function rightOf(m, spec, req, p, fr, ch, k, o) {
  const { st, settings, ui } = m, Sg = spec.strings.read, R = spec.regions.read.right, sid = fr.species.id;
  const marks = []; if (!o.isRead && !o.sealed) { if (S.glint(st, p, ch.id)) marks.push("glint"); if (ch.traits.some((t) => o.goal.has(t.id))) marks.push("goal"); }
  const base = { chapter: { id: ch.id, name: ch.name, marks, tick: o.isRead, lock: o.sealed }, plate: slot(req, R.plate.id, [40, 40]), glow: slot(req, `reading-plate-glow-${ch.id === "legs-tail" ? "legs" : ch.id === "charge" ? "glow" : ch.id}-200x120`, [200, 120]),
    tick: slot(req, `reading-tick-${ch.id === "legs-tail" ? "legs" : ch.id === "charge" ? "glow" : ch.id}-20x20`, [20, 20]), glint: slot(req, "reading-glint-16x16", [16, 16]), star: slot(req, "reading-star-16x16", [16, 16]), lock: slot(req, "reading-lock-14x16", [14, 16]),
    badgeGlint: slot(req, "reading-badge-glint-20x20", [20, 20]), badgeStar: slot(req, "reading-badge-star-20x20", [20, 20]), moon: slot(req, "reading-moon-8x8", [8, 8]), chip: null, key: null, beside: { sprout: "", text: "" }, mate: null };
  if (o.sealed) {
    const pic = ch.findKind ? req({ kind: "slot", id: `find-${ch.findKind}-112x112`, master: `find-${ch.findKind}-112x112`, size: [112, 112], until: "the find picture" }) : "";
    return { ...base, form: "sealed", plates: [{ trait: "", kind: Sg.sealed, shown: { pic, caption: "" } }] };
  }
  const n = ch.traits.length, want = st.wish[sid] || {};
  if (o.at === "detail") return { ...base, ...detailOf(m, spec, req, p, fr, ch, clamp(ui.trait ?? 0, 0, n - 1)), form: "detail" };
  if (!o.isRead) {   // unread: the "?" discs on the ghost of the first look, the template chips, the price key and the line beside it
    const [r, rc, rch] = RADII[Math.min(4, n)], cost = S.readCost(st, p, ch.id, settings) ?? 0, short = st.d < cost, pressed = false;
    const plates = ch.traits.map((t) => ({ trait: t.name, kind: "", shown: { pic: discReq(req, sid, t, ch, 2 * r, { q: true, look: templateOf(st, fr, t)[0] || null }), caption: "" }, carried: { pic: discReq(req, sid, t, ch, 2 * rc, { q: true, carried: true }), caption: "" },
      chips: templateOf(st, fr, t).map((look, i) => discReq(req, sid, t, ch, 2 * rch, t.nature === "doing" || glyphOf(t) !== "bar" ? { glyph: `${glyphOf(t)}${i}`, alpha: 0.92 } : { look: look || null, alpha: 0.92 })) }));   // the drawn template glyphs: gaits, amounts, Build, Haunch, Topline, Eyes
    return { ...base, form: "unread", plates, key: { price: String(cost), state: short ? "dim" : pressed ? "pressed" : "lit", pic: slot(req, `reading-key-${short ? "dim" : pressed ? "pressed" : "lit"}-104x49`, [104, 49]), diamond: slot(req, "reading-diamond-16x16", [16, 16]) },
      beside: o.sprout ? { sprout: slot(req, "reading-sprout-20x18", [20, 18]), text: Sg.sprout } : { sprout: "", text: short ? Sg.dataGrows : "" } };
  }
  // read: the pair on each plate (shown over carried), the captions, the trait and its kind line; the reward chip after a read that paid for a new look
  const [r, rc] = READ_R[Math.min(4, n)];
  const plates = ch.traits.map((t) => { const s = traitState(fr, t, p.genome), two = pair(s), differs = two[1] != null && two[1] !== two[0], goalHere = want[t.id] && s.carried.includes(want[t.id]);
    return { trait: t.name, kind: Sg.kinds[KIND_LINE[s.kind === "asleep" ? "asleep" : traitKind(fr, t)] ?? "hides"] ?? "",
      shown: { pic: discReq(req, sid, t, ch, 2 * r, t.nature === "doing" ? { glyph: `${glyphOf(t)}${lookIndex(fr, t, two[0])}` } : { look: two[0] }), caption: String(two[0] ?? "") },
      carried: { pic: discReq(req, sid, t, ch, 2 * rc, t.nature === "doing" ? { glyph: `${glyphOf(t)}${lookIndex(fr, t, two[1] ?? two[0])}`, veil: 0.28 } : { look: two[1] ?? two[0], veil: 0.28 }), caption: differs ? String(two[1]) : "" },
      glint: !!(p.first && p.first.includes(t.id)), goal: !!goalHere }; });
  return { ...base, form: "read", plates, chip: o.reading && o.reading.reward ? { n: o.reading.reward, pic: slot(req, "reading-chip-86x32", [86, 32]), diamond: slot(req, "reading-diamond-13x13", [13, 13]) } : null };
}
const pair = (s) => [s.shows, s.hides ?? (s.halves ? (s.halves[0] === s.shows ? s.halves[1] : s.halves[0]) : s.shows)];
const glyphOf = (t) => (/pace|stride|weave|drive|turning|flap/.test(t.id) ? "gait" : /hind|haunch/.test(t.id) ? "haunch" : /build|body|roundness/.test(t.id) ? "build" : /back-line|topline/.test(t.id) ? "topline" : /eye/.test(t.id) ? "eyes" : "bar");
const lookIndex = (fr, t, look) => { const all = Array.isArray(t.looks) ? t.looks : []; return Math.max(0, all.indexOf(look)) % 3; };
// The detail of a read trait (§2.6, 5): the pair large, its captions and kind; with a mate at home, the odds of each look its child can show, eight seeds a row
function detailOf(m, spec, req, p, fr, ch, ti) {
  const { st, settings } = m, Sg = spec.strings.read, sid = fr.species.id, t = ch.traits[ti], s = traitState(fr, t, p.genome), two = pair(s), differs = two[1] != null && two[1] !== two[0], want = (st.wish[sid] || {})[t.id];
  const plate = { trait: t.name, kind: Sg.kinds[KIND_LINE[s.kind === "asleep" ? "asleep" : traitKind(fr, t)] ?? "hides"] ?? "", shown: { pic: discReq(req, sid, t, ch, 112, t.nature === "doing" ? { glyph: `${glyphOf(t)}${lookIndex(fr, t, two[0])}` } : { look: two[0] }), caption: String(two[0] ?? "") },
    carried: { pic: discReq(req, sid, t, ch, 74, t.nature === "doing" ? { glyph: `${glyphOf(t)}${lookIndex(fr, t, two[1] ?? two[0])}`, veil: 0.28 } : { look: two[1] ?? two[0], veil: 0.28 }), caption: differs ? String(two[1]) : "" },
    glint: !!(p.first && p.first.includes(t.id)), goal: !!(want && s.carried.includes(want)) };
  const mate = st.mibis.find((x) => !x.released && S.speciesOf(x) === sid && S.isAdult(st, x, settings));
  let odds = null;
  if (mate && mate.genome && t.nature !== "doing") { const rows = childOdds(fr, t, p.genome, mate.genome).slice(0, 2);
    odds = { name: mate.name, glyph: slot(req, "reading-podline-23x29", [23, 29]), rows: rows.map((rw) => ({ pic: discReq(req, sid, t, ch, 44, { look: rw.look }), seeds: Math.round(rw.p * 8), odds: oddsWords(rw.p, Sg), goal: !!want && rw.look === want })) }; }
  return { plates: [plate], mate: odds, chapter: { id: ch.id, name: t.name, marks: [], tick: true, lock: false } };
}
// The looks a child of the two can show on one trait, and how likely each is: every pairing of one copy from each, per locus of the trait
export function childOdds(fr, t, ga, gb) {
  const loci = t.loci.filter((l) => Array.isArray(ga.loci?.[l]) && Array.isArray(gb.loci?.[l])); if (!loci.length) return [];
  const tally = new Map(); let n = 0;
  const walk = (i, loc) => { if (i === loci.length) { const g = { ...ga, loci: { ...ga.loci, ...loc } }, look = traitState(fr, t, g).shows; tally.set(look, (tally.get(look) ?? 0) + 1); n++; return; }
    const l = loci[i]; for (const a of ga.loci[l]) for (const b of gb.loci[l]) walk(i + 1, { ...loc, [l]: [a, b] }); };
  walk(0, {}); return [...tally.entries()].map(([look, c]) => ({ look, p: c / n })).sort((a, b) => a.p - b.p || String(a.look).localeCompare(String(b.look)));
}
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
function oddsWords(p, Sg) { const den = 16, num = Math.round(p * den); if (num >= den) return Sg.oddsAll; const g = gcd(num, den); return fill(Sg.odds, { a: num / g, b: den / g }); }
// The stamp in progress (§2.7): the plate, the stamp at its cells (8 px for the Loika, 6 for the Tuikis: as large as the 224 box takes), the blocks lane by lane, the gathered picture
function stampOf(req, st, p, fr, rr, moment, Sg, settings) {
  const sid = fr.species.id, { N, cell: c120 } = stampSizing(fr, p.genome); if (!N) return null; const cell = Math.max(2, Math.floor(224 / N)), size = (N + 2) * cell, plate = N * cell + 32;   // the Loika 25 cells at 8 px (200) on its 232 plate, the Tuikis 37 at 6 (222) on 254
  const blocks120 = stampBlocks(fr, p.genome), blocks = fr.chapters.map((c) => { const b = blocks120[c.id]; return b ? { col: b[0] / c120, row: b[1] / c120, cols: b[2] / c120, rows: b[3] / c120 } : { col: 0, row: 0, cols: 0, rows: 0 }; });   // each chapter's block in the stamp's cells (its own layout), the face multiplies by the cell
  const read = p.read.filter((c) => fr.chapters.some((x) => x.id === c)), stamp = req({ kind: "readstamp", id: `readstamp:${p.id}:${railHash(read.slice().sort().join("+"))}:${cell}`, species: sid, pod: p.id, read, cell, size });
  const lay = railLayoutOf(rr.lanes), pieces = rr.lanes.map((l, i) => ({ from: [lay.lanes[i].x - 40, 0, lay.lanes[i].w, 71], to: [blocks[i].col * cell, blocks[i].row * cell, blocks[i].cols * cell, blocks[i].rows * cell] }));
  const gather = req({ kind: "readgather", id: `readgather:${rr.id.slice(9)}:${cell}`, rail: rr.id, size, pieces });
  const block = moment ? fr.chapters.findIndex((c) => c.id === moment.chapter) : -1;
  return { plate: req({ kind: "readplate", id: `readplate:${plate}`, size: plate }), stamp, gather, size, plateSize: plate, cell, blocks, block, mode: moment ? "moment" : "view", line: moment ? Sg.stampLine : "", veil: req({ kind: "slot", id: "reading-veil-548x462", master: "reading-veil-548x462", size: [548, 462], until: "the reading screen's cut" }) };
}
const railLayoutOf = (lanes) => railLayout(lanes.map((l) => l.traits.length));
// The bottom line (§2.6, §2.9): the verb of what has the ring; ← names its target ("Pods" on the pod level, the chapter in the detail, the pod in the stamp view)
function lineOf(m, spec, out, p, ch, o) {
  const Sg = spec.strings.read, back = spec.strings.room.foot.backPods, R = out.right;
  if (o.moment || o.reading) return { ok: null, back: o.moment ? null : back, subject: "", need: "" };
  if (o.at === "stamp") return { ok: null, back: out.name, subject: "", need: "" };
  if (o.at === "detail") return { ok: null, back: ch.name, subject: "", need: "" };
  if (o.sealed) return { ok: null, back, subject: "", need: "" };
  if (o.at === "right" && !o.isRead) { const short = R.key?.state === "dim"; return short ? { ok: null, back, subject: "", need: fill(Sg.needs, { n: R.key.price, have: m.st.d }) } : { ok: fill(Sg.read, { chapter: ch.name }), price: "◆ " + R.key.price, back, subject: "", need: "" }; }
  if (o.at === "right" && o.isRead) { const i = clamp(m.ui.plate ?? 0, 0, ch.traits.length - 1); return { ok: fill(Sg.closer, { trait: ch.traits[i].name }), back, subject: "", need: "" }; }
  return { ok: fill(Sg.open, { chapter: ch.name }), back, subject: "", need: "" };
}
// The targets: the rail (its keys step the bracket: the host's), the plates of a read chapter or the price key of an unread one, the detail's trait, the stamp view; one target while a read or the moment holds
function targetsOf(out, o) {
  if (o.reading || o.moment) return [{ id: "hold", group: "hold" }];
  if (o.at === "stamp") return [{ id: "stamp", group: "stamp" }];
  if (o.at === "detail") return [{ id: "trait", group: "trait" }];
  if (o.at === "right") return o.isRead ? out.right.plates.map((_, i) => ({ id: "plate." + i, group: "plate", index: i })) : [{ id: "key", group: "key" }];
  return [{ id: "rail", group: "rail" }];
}

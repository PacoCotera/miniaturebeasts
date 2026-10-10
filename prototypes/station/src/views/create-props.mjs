// The Create props (lvgl-switch.md §2.1, §4 R; create.json): pure selectors from the state, the screen's UI state and the presentation to the props of the face's Create words. Props name *what*, never *where*: states, counts,
// asset ids, strings, flags and which trait and look is chosen; no rectangle, no measure, no layout rule, no colour (the words place everything from create.json). The output is plain JSON:
// { props (state, regions, focus), line (the bottom line, for the frame), requests (the pictures the host makes ready before the props) }.
// Runs in Node, tested there (tests/create-props.test.mjs); the shape is create.props.json.
//   m: { st, settings, ui: { create: { podId, pod, choices, f, clash, grown } } }, spec create.json, pods pods.json
//   ui.create.grown is what ✓ Grow it made (intents/create.mjs): { code, cost }; it holds the screen in its grow state while the pod, no longer in the rack, travels.
import * as S from "../state.mjs";
import { frameOf, traitState, genomeDigest, stampSizing, codeText } from "../genome.mjs";
import { slot, railOf } from "./pods-props.mjs";

const fill = (t, o) => t.replace(/\{([^}]+)\}/g, (_, k) => (k in o ? o[k] : "{" + k + "}"));
const SPELL = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const slug = (x) => String(x ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const fnv = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); };
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// The traits a pod can be shaped on: the read ones, in chapter order, with their chapter (the ring order of ◀ ▶).
export const reviewTraits = (p, frame) => frame.chapters.filter((c) => p.read.includes(c.id)).flatMap((c) => c.traits.map((t) => ({ c, t })));
// The pod Create is on: the screen's own copy while it grows (the rack no longer holds it), else the rack's.
export const createPod = (st, cr) => cr.pod ?? st.tray.find((q) => q.id === cr.podId) ?? null;
// The founder's picture id for the choices made (the picture the roll's dither starts from and ends on): the unread parts frosted; nothing read, every part (frost on the founder's own outline).
const mistyOf = (fr, p) => fr.chapters.filter((c) => !p.read.includes(c.id)).flatMap((c) => c.traits.map((t) => t.id));
export function founderPicture(p, choices, size) {
  const fr = frameOf(S.speciesOf(p)), misty = mistyOf(fr, p), none = !p.read.length;
  return { id: `founder:${S.speciesOf(p)}:${genomeDigest(S.founderGenome(p, choices))}:${none ? "all" : fnv(misty.join(","))}:${size.join("x")}`, misty, none };
}

export function createBuild(m, spec, pods) {
  const { st, settings } = m, cr = m.ui.create, requests = [], req = (r) => { requests.push(r); return r.id; };
  const p = createPod(st, cr), fr = frameOf(S.speciesOf(p)), R = spec.regions, list = reviewTraits(p, fr), changed = S.changedTraits(cr.choices), grown = !!cr.grown;
  const state = grown ? "grow" : list.length ? "shape" : "nothingRead";
  const ph = (id, size, hollow, until) => req({ kind: "ph", id, size, hollow, until });
  const stale = "its master (create.json placeholders)";
  const f = clamp(cr.f, 0, Math.max(0, list.length - 1)), cur = list[f] ?? null, genome = S.founderGenome(p, cr.choices);
  const regions = {};

  // the bench: the Create master, until it lands the collection's
  regions.bench = { room: [slot(req, R.bench.slice, R.bench.rect, "the Create stage master"), slot(req, R.bench.until, R.bench.rect, "the room master")] };

  // the rail: one tab a chapter, a pip a trait (filled, hollow, a changed diamond or a clash cross); the open tab is the focused trait's chapter, its pip lifted
  const open = cur ? fr.chapters.findIndex((c) => c === cur.c) : -1, rail = railOf(m, pods, p, fr.chapters, req, open, null);
  rail.focused = null;
  rail.tabs.forEach((tab, i) => {
    const c = fr.chapters[i], read = p.read.includes(c.id), n = tab.pips;
    tab.glint = false;
    tab.marks = c.traits.slice(0, n).map((t) => (!read ? "hollow" : cr.clash.includes(t.id) ? "clash" : cr.choices[t.id] ? "changed" : "filled"));
    tab.lift = cur && cur.c === c ? Math.min(c.traits.indexOf(cur.t), n - 1) : -1;
  });
  regions.rail = rail;   // the changed and clash pips are the words' chrome rects (create.json: the kit's chrome), never pictures

  // the roll: three pictures (as the pod is, only the first copy, only the second copy) or one; the chosen one ringed
  if (list.length) {
    const opts = S.rollOptions(p, cur.t.id), rolls = opts.length > 1, pic = (look) => ph(`roll-${S.speciesOf(p)}-${slug(cur.t.name)}-${slug(look)}-128x72`, R.roll.picture.size, false, "the roll picture master (cut from the painting)");
    const chosen = rolls ? (cr.choices[cur.t.id] || 0) : 0, clash = cr.clash.includes(cur.t.id);
    const pictures = rolls ? opts.map((o) => pic(o.look)) : [pic(traitState(fr, cur.t, genome).shows)];
    regions.roll = { form: rolls ? "roll" : "single", chosen, clash, pictures, notches: rolls };   // the notches are the words' chrome, drawn only while the trait rolls
  }

  // the trait line: the focused trait and its chosen look; the changed tag, the clash cross or the breed mark (the tag's plate and the mark are named in every state: the face keeps their nodes)
  const T = spec.strings.traitLine, tagPic = ph("plate-name-88x24", [88, 24], false, "the changed tag plate (to be cut)"), breedPic = slot(req, "mark-breed-28x16", [0, 0, 28, 16], "the breed mark master");
  let line = { text: T.none, tag: tagPic, changed: false, breed: breedPic, doing: false, clash: false };
  if (cur) {
    const opts = S.rollOptions(p, cur.t.id), choice = cr.choices[cur.t.id] || 0, own = traitState(fr, cur.t, genome), name = cur.t.name;
    if (cr.clash.includes(cur.t.id)) line = { ...line, text: fill(T.clash, { Trait: name }), clash: true };
    else if (cur.t.nature === "doing") line = { ...line, text: fill(T.doing, { Trait: name }), doing: true };
    else if (opts.length <= 1) line = { ...line, text: fill(T.oneLook, { Trait: name }) };
    else if (choice) line = { ...line, text: fill(T.only, { Trait: name, "look line": own.line }), changed: true };
    else if (own.kind === "asleep") line = { ...line, text: fill(T.asleep, { Trait: name, shows: own.shows, sleeping: own.asleep }) };
    else line = { ...line, text: fill(T.asPod, { Trait: name }) };
  }
  regions.traitLine = line;

  // the work tray, the founder, the pod and its dish, the origin, the small chamber
  ph("create-chamber-front-400x320", R.chamber.rect.slice(2), true, stale);   // registered, nothing drawn: a front plate would cover the founder, the bud and the arriving pod (art director, 2026-10-10)
  regions.chamber = { back: ph("create-chamber-400x320", R.chamber.rect.slice(2), false, stale) };
  const fp = founderPicture(p, cr.choices, R.founder.rect.slice(2));
  regions.founder = { picture: req({ kind: "founder", id: fp.id, pod: p.id, choices: cr.choices, species: S.speciesOf(p), misty: fp.misty, ghost: fp.none, size: R.founder.rect.slice(2) }) };
  const sizeClass = fr.pod?.sizeClass ?? "medium", box = pods.classes.pod[sizeClass];
  regions.pod = { sizeClass, picture: req({ kind: "pod", id: `pod:${S.speciesOf(p)}:i:${box.join("x")}`, species: S.speciesOf(p), state: "identified", size: box }) };
  regions.cradle = { cradle: slot(req, "room-cradle", R.cradle.rect, "the dish master"), front: slot(req, "room-cradle-front", R.cradleFront.rect, "the dish's front layer") };
  regions.origin = S.podOriginLines(p);
  ph("create-dome-front-176x224", R.dome.rect.slice(2), true, stale);   // registered, nothing drawn
  regions.dome = { back: ph("create-dome-176x224", R.dome.rect.slice(2), false, stale) };
  regions.bud = { picture: ph("bud-small-64x80", R.bud.rect.slice(2), false, stale), busy: !!st.bud && !grown };   // another bud is growing: its glow in the small chamber

  // the leaves the bud will take, every one empty: the minutes it will grow
  regions.leaves = { total: S.budMinutes(st, changed.length, settings), full: 0, rows: 0, empty: ph("leaf-small-empty-8x12", R.leaves.leaf, true, stale), filled: ph("leaf-small-full-8x12", R.leaves.leaf, false, stale) };

  // the stamp of the read and changed chapters, and the code (printed at Grow)
  const readIds = [...new Set([...p.read, ...fr.chapters.filter((c) => c.traits.some((t) => changed.includes(t.id))).map((c) => c.id)])], sz = stampSizing(fr, genome);
  regions.stamp = { size: sz.size, N: sz.N, cell: sz.cell, asset: req({ kind: "stamp", id: `stamp:${genomeDigest(genome)}:${[...readIds].sort().join(",")}:${sz.size}`, pod: p.id, species: S.speciesOf(p), read: readIds, size: sz.size, choices: cr.choices }) };
  regions.code = grown ? codeText(cr.grown.code) : "";

  // the bottom line: ✓ Grow it and the price, what stays a surprise, the first block (the rules' order, growBlockKey) with its notice; ← the pod
  const Sg = spec.strings, cost = grown ? cr.grown.cost : S.growCost(st, cr.choices, settings), key = grown ? null : S.growBlockKey(st, p, cr.choices, settings, cr.clash);
  const unread = fr.chapters.filter((c) => !p.read.includes(c.id)), name = S.spName(p);
  const subject = !unread.length ? S.cap(S.aAn(name)) + ", fully known" : unread.length === fr.chapters.length ? Sg.surprise.all : unread.length === 1 ? fill(Sg.surprise.one, { Chapter: unread[0].name }) : fill(Sg.surprise.more, { "n in words": SPELL[unread.length] ?? "many" });
  const bottom = { ok: Sg.action, price: S.priceText(cost.e, cost.d, cost.s), back: S.cap(name), subject, need: null };
  if (key && key.key === "short") { bottom.dim = true; bottom.short = key.short; bottom.need = fill(pods.strings.needMore, { icons: key.short }); }   // short: the dimmed ✓, the short figures amber
  else if (key) { bottom.blocked = true; bottom.need = key.key === "busy" ? Sg.notices.busy : key.key === "noBay" ? Sg.notices.noBay : key.key === "clash" ? Sg.notices.clash : null; }   // busy, no bay, clash: no ✓ cap, the verb and the price in mist

  const props = { state, regions, focus: { cur: list.length ? "roll" : "room", targets: list.length ? [{ id: "roll", group: "roll" }] : [] } };
  return { props, line: bottom, requests };
}

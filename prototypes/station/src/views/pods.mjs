// The Pods view: pure selectors from the state, the focus and the presentation progress to the props of each region
// (technical-architecture.md §5.1, §5.2). No coordinates but the spec file's, no canvas, no keys; the output is plain
// JSON: the props of the screen's components, the focus targets, the bottom line, and the pictures it asks for (each a
// plain request the asset manifest registers). Runs in Node, tested there.
import * as S from "../state.mjs";
import { frameOf, traitState, chapterSeal, genomeDigest, stampSizing } from "../genome.mjs";
import { railTabs, pageGrid, repeat } from "../../../ui/layout.mjs";
import { wrap } from "../../../ui/components/text.mjs";

const PLACE_KEYS = ["meadow", "pond", "rock", "wood", "cave"];
const podFrame = (p) => frameOf(S.speciesOf(p));
const shellFrame = (st, p) => (st.knownIds.includes(S.speciesOf(p)) ? podFrame(p) : null);
const railWord = (c, spec) => (c.id === "legs-tail" ? spec.strings.legsTail.rail : c.name);
const headingWord = (c, spec) => (c.id === "legs-tail" ? spec.strings.legsTail.heading : c.name);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
// No digits where a picture or a word does: a count in a sentence is said in words (the frame's shared need line on Pods); an amount beside a material icon is a price or a shortfall and stays in figures.
const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
export const inWords = (text) => (text || "").replace(/\d+(?! [⚡◆❀])/g, (n) => WORDS[+n] ?? "many");
// The origin without the expedition's number (a digit would wrap alone onto a second line).
const originOf = (p) => S.podOrigin(p).replace(/ · expedition \d+$/, "");

// m: { st, settings, docked, ui: { cur, anchor, ci, cmp, wildArm }, focus: id | null, present: { idCut: { pod, p } | null, read: { pod, chapter, p } | null, ribbon: pod id | null } }
// ctx: the components' context (the spec and the type metrics, to wrap the origin)
export function podsView(m, spec, ctx) {
  const { st, settings, ui, docked, present = {} } = m, R = spec.regions, C = spec.colours, requests = [], focus = m.focus ?? null;
  const req = (r) => { requests.push(r); return r.id; };
  const cur = S.podById(st, ui.cur), rack = settings.rack || S.RACK;
  const view = { mode: ui.cmp ? "compare" : "read", cur: cur ? cur.id : null, requests };
  const flagsOf = (p) => { const fr = podFrame(p); return fr ? fr.chapters.map((c) => ({ traits: c.traits.length, read: p.read.includes(c.id) ? 1 : 0, glint: S.glint(st, p, c.id), sealed: !!c.sealed && !settings.sealedOpen })) : []; };

  // the rail's chapters of the pod under the beam
  const fr = cur && cur.idd ? podFrame(cur) : null, chapters = fr ? fr.chapters : [];
  const focusRail = focus && focus.startsWith("rail.") ? +focus.slice(5) : null;
  const ci = chapters.length ? clamp(focusRail ?? ui.ci ?? 0, 0, chapters.length - 1) : 0;

  if (view.mode === "compare") return compareView(view, m, spec, ctx, req);

  // the list: one slot per well, the hatch
  const wells = [];
  for (let i = 0; i < rack; i++) {
    const q = st.tray[i], current = !!q && q.id === ui.cur, base = req({ kind: "well", id: `well:${current ? "lit" : "quiet"}`, current });
    if (!q) { wells.push({ base, pod: null, ring: null, place: null }); continue; }
    const f = q.idd ? podFrame(q) : null, flags = q.idd ? flagsOf(q) : [];
    wells.push({
      base,
      pod: req({ kind: "pod", id: `pod:${shellFrame(st, q) ? S.speciesOf(q) : "-"}:${q.idd ? "i" : "s"}:32x40`, species: shellFrame(st, q) ? S.speciesOf(q) : null, state: q.idd ? "identified" : "sealed", size: R.well.pod.size }),
      ring: req({ kind: "ring", id: `ring:${q.idd ? S.speciesOf(q) : "-"}:${q.idd ? 1 : 0}:${flags.map((x) => x.read + (x.glint ? "g" : "") + (x.sealed ? "s" : "") + x.traits).join(",")}`, species: f ? S.speciesOf(q) : null, idd: q.idd ? 1 : 0, flags }),
      place: PLACE_KEYS.includes(q.g) ? req({ kind: "place", id: `place:${q.g}`, place: q.g }) : null,
    });
  }
  view.list = { colours: { pane: C.listPane, edge: C.listEdge, rule: C.listRule }, wells, hatch: req({ kind: "hatch", id: "hatch:112x56" }) };

  // the specimen
  const sizeClass = cur ? (shellFrame(st, cur)?.pod?.sizeClass ?? "medium") : null, box = cur ? spec.classes.pod[sizeClass] : null;
  const idCut = present.idCut && cur && present.idCut.pod === cur.id ? present.idCut.p : null;
  view.specimen = {
    colours: { name: C.name, origin: C.origin, cut: "white" }, beam: req({ kind: "beam", id: "beam:240x232" }), cradle: req({ kind: "cradle", id: "cradle:224x40" }),
    pod: cur ? {
      size: box,
      sealed: req({ kind: "pod", id: `pod:${shellFrame(st, cur) ? S.speciesOf(cur) : "-"}:s:${box.join("x")}`, species: shellFrame(st, cur) ? S.speciesOf(cur) : null, state: "sealed", size: box }),
      identified: cur.idd ? req({ kind: "pod", id: `pod:${S.speciesOf(cur)}:i:${box.join("x")}`, species: S.speciesOf(cur), state: "identified", size: box }) : null,
    } : null,
    cut: cur && cur.idd ? idCut : null,
    name: cur ? (cur.idd ? S.cap(S.spName(cur)) : spec.strings.unknownPod) : null,
    origin: cur ? wrap(ctx, originOf(cur), R.origin.rect[2], R.origin.px).slice(0, R.origin.lines) : [],
    ribbon: cur && present.ribbon === cur.id ? spec.strings.newSpecies : null,
    ribbonColours: { fill: C.ribbonFill, edge: C.ribbonEdge, text: C.ribbonText },
  };
  view.box = box ? [R.pod.axis - Math.round(box[0] / 2), R.pod.feet - box[1], box[0], box[1]] : null;

  // the rail, the page and the stamp: only once identified
  view.rail = null; view.page = null; view.stamp = null;
  if (cur && cur.idd && fr) {
    view.rail = { colours: C.rail, ground: C.ground, focused: focusRail, tabs: chapters.map((c, i) => {
      const read = cur.read.includes(c.id), sealed = !!c.sealed && !settings.sealedOpen, n = Math.min(c.traits.length, 6), wipe = present.read && present.read.pod === cur.id && present.read.chapter === c.id ? present.read.p : null;
      return { id: c.id, word: railWord(c, spec), state: read ? "read" : sealed ? "sealed" : "unread", pips: n, filled: read ? (wipe == null ? n : Math.ceil(wipe * n)) : 0, glint: S.glint(st, cur, c.id), emblem: req({ kind: "emblem", id: `emblem:${c.id}:24`, chapter: c.id }) };
    }), star: req({ kind: "star", id: "star:12" }) };
    view.rail.slats = "slats:";
    if (view.rail.tabs.some((t) => t.state === "sealed")) for (const w of new Set([...railTabs(R.rail, chapters.length).tabs, ...railTabs(R.rail, chapters.length, 0).tabs].map((t) => t[2]))) req({ kind: "slats", id: `slats:${w}x${R.rail.rect[3]}`, w, h: R.rail.rect[3] });   // the widths the rail's own rule gives
    const ch = chapters[ci];
    view.page = pageView(m, spec, cur, fr, ch, headingWord(ch, spec), R.page, req, present, null);
    const sz = stampSizing(fr), read = fr.chapters.filter((c) => cur.read.includes(c.id)).map((c) => c.id);
    view.stamp = { colours: C.stampLabel, size: sz.size, asset: req({ kind: "stamp", id: `stamp:${genomeDigest(cur.genome)}:${[...read].sort().join(",")}:${sz.size}`, pod: cur.id, species: S.speciesOf(cur), read, size: sz.size }) };
  }
  view.empty = !cur;
  view.chapters = chapters.length;
  view.line = lineOf(m, spec, cur, chapters, ci);
  view.targets = targetsOf(view, st, spec, rack, cur, chapters.length, ci);
  return view;
}

// One chapter's page: the cells on the grid by the trait count, each a picture rendered at its size, the marks inside it.
function pageView(m, spec, p, fr, ch, word, region, req, present, diffIds, key = "page") {
  const { st, settings } = m, C = spec.colours, read = p.read.includes(ch.id), sealed = !!ch.sealed && !settings.sealedOpen, traits = ch.traits.slice(0, 6), grid = pageGrid(region, traits.length);
  const [pw, ph] = grid.picture ?? [0, 0], wipeOf = present.read && present.read.pod === p.id && present.read.chapter === ch.id ? present.read.p : null;
  const cells = traits.map((t) => {
    const cell = { name: t.name, lines: [], marks: [], diff: !!(diffIds && diffIds.includes(t.id)) };
    if (sealed) { cell.sealed = true; cell.seals = req({ kind: "key", id: "key:44x64" }); return cell; }
    if (!read) { cell.frost = true; return cell; }
    const state = traitState(fr, t, p.genome);
    cell.picture = req({ kind: "trait", id: `trait:${genomeDigest(p.genome)}:${t.id}:${pw}x${ph}`, pod: p.id, species: S.speciesOf(p), trait: t.id, w: pw, h: ph });
    cell.lines = [state.line];
    const small = ph < spec.page.marks.smallUnder, [sw, sh] = small ? spec.page.marks.seedSmall : spec.page.marks.seed;
    const seed = (choice) => req({ kind: "seed", id: `seed:${genomeDigest(p.genome)}:${t.id}:${choice}:${sw}x${sh}`, pod: p.id, species: S.speciesOf(p), trait: t.id, choice, w: sw, h: sh });
    if (state.kind === "hides") cell.marks.push({ kind: "seed", asset: seed(state.hiddenChoice) });
    if (state.kind === "blend") cell.marks.push({ kind: "seed2", asset: seed(1) }, { kind: "seed", asset: seed(2) });
    if (state.kind === "only") cell.marks.push({ kind: "only", asset: req({ kind: "base", id: "base:72x8" }) });
    if (state.kind === "asleep") cell.marks.push({ kind: "asleep", asset: req({ kind: "asleep", id: "asleep:24x16" }) });
    if (state.doing) cell.marks.push({ kind: "doing", asset: req({ kind: "doing", id: "doing:28x16" }) });
    if (wipeOf != null && wipeOf < 1) cell.wipe = wipeOf;
    return cell;
  });
  const frost = (w, h) => req({ kind: "frost", id: `frost:${w}x${h}`, w, h }), slats = (w, h) => req({ kind: "slats", id: `slats:${w}x${h}`, w, h });
  for (const c of cells) { if (c.frost || c.wipe != null) frost(pw, ph); if (c.sealed) slats(pw, ph); }
  return { region: key, heading: word ? { emblem: req({ kind: "emblem", id: `emblem:${ch.id}:24`, chapter: ch.id }), word } : null, cells, overflow: grid.overflow || ch.traits.length > 6, frost: "frost:", slats: "slats:", colours: { ...C.page, diff: C.diff }, marks: spec.page.marks, diff: { edge: spec.page.diff.edge, inset: spec.page.diff.inset }, bracket: diffIds ? req({ kind: "bracket", id: "bracket:12x12" }) : null };
}

function compareView(view, m, spec, ctx, req) {
  const { st, settings, ui, present = {} } = m, R = spec.regions, C = spec.colours, c = ui.cmp, A = S.podById(st, c.a), B = S.podById(st, c.b);
  const fr = A && podFrame(A); if (!A || !B || !fr) return { ...view, mode: "read", cur: null, broken: true };
  const chs = fr.chapters, ci = clamp(c.ci, 0, chs.length - 1), ch = chs[ci], diff = S.compareDiff(st, A, B) || [];
  const both = A.read.includes(ch.id) && B.read.includes(ch.id), ids = both ? diff : [];
  const side = (p, region, key) => {
    const page = pageView(m, spec, p, fr, ch, null, region, req, present, ids, key);
    page.heading = { pod: req({ kind: "pod", id: `pod:${S.speciesOf(p)}:i:32x40`, species: S.speciesOf(p), state: "identified", size: R.compareA.pod }), place: PLACE_KEYS.includes(p.g) ? req({ kind: "place", id: `place:${p.g}`, place: p.g }) : null };
    return page;
  };
  const compareRegion = (key) => ({ ...R[key === "compareB" ? "compareA" : key], rect: R[key].rect });
  view.pages = [side(A, compareRegion("compareA"), "compareA"), side(B, compareRegion("compareB"), "compareB")];
  view.rail = { colours: C.rail, ground: C.ground, focused: null, slats: "slats:", tabs: chs.map((x, i) => ({ id: x.id, word: railWord(x, spec), state: A.read.includes(x.id) && B.read.includes(x.id) ? "read" : "unread", pips: Math.min(x.traits.length, 6), filled: A.read.includes(x.id) && B.read.includes(x.id) ? Math.min(x.traits.length, 6) : 0, glint: false, emblem: req({ kind: "emblem", id: `emblem:${x.id}:24`, chapter: x.id }) })), star: req({ kind: "star", id: "star:12" }), current: ci };
  view.line = { back: "Pods", subject: "two " + S.spName(A) + " pods", need: !diff.length ? spec.strings.compareSame : ch.traits.some((t) => diff.includes(t.id)) ? spec.strings.compareHere : spec.strings.compareElsewhere };
  view.targets = [];
  return view;
}

// The bottom line: the one action and its price, where ← goes, the subject, what needs you.
function lineOf(m, spec, p, chapters, ci) {
  const { st, settings, ui, docked } = m, f = m.focus ?? "pod", glintNeed = S.podGlints(st, p || {}) ? "something new here" : null;
  if (!p) return { back: "Home", subject: spec.strings.empty, need: !docked ? spec.strings.dockToBring : m.crates > 0 ? spec.strings.openBay : spec.strings.explore };
  const subj = S.podName(p) + " · " + (S.PLACE_WORD[p.g] || "");
  if (f === "pod") {
    if (!p.idd) { const cost = S.identifyCost(st, settings); return { ok: "Identify", price: cost ? cost + " ⚡" : "free", dim: st.e < cost, back: "Home", subject: subj }; }
    if (!p.read.length) return { ok: chapters.length ? "Read its chapters" : "", back: "Home", subject: subj, need: glintNeed };
    const b = S.growBlock(st, p, {}, settings, []); return { ok: "Shape a founder", price: b && !/needs/.test(b) ? b : "", dim: !!b && !/needs/.test(b), back: "Home", subject: subj, need: glintNeed };
  }
  if (f.startsWith("rail.")) {
    const ch = chapters[+f.slice(5)]; if (!ch) return { back: "Home" };
    const b = S.readBlock(st, p, ch.id, settings), fr = podFrame(p);
    if (b === null) return { back: "Home", subject: ch.name + " · read", need: glintNeed };
    if (b.startsWith("sealed")) return { back: "Home", subject: ch.name + " · sealed · opens with " + chapterSeal(fr, ch) };
    const cost = S.readCost(st, p, ch.id, settings), half = (st.readOnce[fr.species.id] || []).includes(ch.id) && cost > 0;
    return { ok: "Read " + ch.name, price: b ? b : cost === 0 ? "free" : cost + " ◆" + (half ? " · half" : ""), dim: !!b, back: "Home", subject: subj, need: S.glint(st, p, ch.id) ? "something new here" : null };
  }
  if (f.startsWith("list.") && f !== "list.hatch") {
    const i = +f.slice(5), q = st.tray[i]; if (!q) return { back: "Home" };
    const A = S.podById(st, ui.anchor), tail = S.podName(q);
    if (A && A !== q && S.canCompare(st, A, q)) return { ok: "Compare", price: "free", back: "Home", subject: tail + " · " + (S.PLACE_WORD[q.g] || "") };
    return { ok: "Look at this pod", back: "Home", subject: tail + " · " + originOf(q) };
  }
  if (f === "list.hatch") return { ok: ui.wildArm ? "Again: return it" : "Return to the wild", price: "+1 ❀", back: "Home", subject: "the hatch · " + S.podName(p) + " back to the " + (S.PLACE_WORD[p.g] || "wild") };
  return { back: "Home" };
}

// The focus targets: each a rectangle from the spec (the slots, the hatch, the pod's box, the rail's tabs); the graph is the spec's.
function targetsOf(view, st, spec, rack, cur, nChapters, ci) {
  const R = spec.regions, t = [];
  if (view.rail && view.rail.tabs.length) railTabs(R.rail, view.rail.tabs.length).tabs.forEach((r, i) => t.push({ id: "rail." + i, group: "rail", index: i, rect: r }));
  if (cur && view.box) t.push({ id: "pod", group: "pod", rect: view.box });
  st.tray.slice(0, rack).forEach((q, i) => t.push({ id: "list." + i, group: "list", index: i, rect: repeat(R.well.rect, i, R.well.pitch) }));
  if (cur) t.push({ id: "list.hatch", group: "list", index: R.list.slots, rect: R.hatch.rect.slice() });
  return t;
}
export { targetsOf };

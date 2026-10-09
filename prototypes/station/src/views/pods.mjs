// The Pods view: pure selectors from the state, the focus and the presentation progress to the props of each region
// (technical-architecture.md §5.1, §5.2). No coordinates but the spec file's, no canvas, no keys; the output is plain
// JSON: the props of the screen's components, the focus targets, the bottom line, and the pictures it asks for (each a
// plain request the asset manifest registers). Runs in Node, tested there.
import * as S from "../state.mjs";
import { frameOf, traitState, genomeDigest, stampSizing } from "../genome.mjs";
import { slantTabs, pageGrid } from "../../../ui/layout.mjs";
import { wrap } from "../../../ui/components/text.mjs";
import { placeRect, kinRect } from "../../../ui/components/list.mjs";

const PLACE_KEYS = ["meadow", "pond", "rock", "wood", "cave"];
const podFrame = (p) => frameOf(S.speciesOf(p));
// A picture the room needs at a size: the placed master of that id when it is exactly that size, an empty slot (nothing drawn, never scaled) when it is not.
const slot = (req, master, rect, until) => { const size = rect.slice(2); return req({ kind: "slot", id: `${master}:${size.join("x")}`, master, size, until }); };
// An unidentified pod is the unknown pod: its own pictures, never a species' shell, even when the species is known.
const shellFrame = (st, p) => (p.idd && st.knownIds.includes(S.speciesOf(p)) ? podFrame(p) : null);
const railWord = (c, spec) => (c.id === "legs-tail" ? spec.strings.legsTail.rail : c.name);
const headingWord = (c, spec) => (c.id === "legs-tail" ? spec.strings.legsTail.heading : c.name);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
// No digits where a picture or a word does: a count in a sentence is said in words (the frame's shared need line on Pods); an amount beside a material icon is a price or a shortfall and stays in figures.
const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
export const inWords = (text) => (text || "").replace(/\d+(?! [⚡◆❀])/g, (n) => WORDS[+n] ?? "many");

// m: { st, settings, docked, crates, ui: { view, cur, ci, cmp, wildArm }, focus: id | null, present: { idCut: { pod, p } | null, read: { pod, chapter, p } | null, ribbon: pod id | null } }
// ctx: the components' context (the spec and the type metrics, to wrap the origin)
// Pods is three states (station-layouts.md, Pods): the collection, a pod's overview, a chapter's page; Compare is the overview's. The view reads `ui.view`.
export function podsView(m, spec, ctx) {
  const { st, settings, ui } = m, requests = [], focus = m.focus ?? null;
  const req = (r) => { requests.push(r); return r.id; };
  const cur = S.podById(st, ui.cur), view = { mode: ui.cmp ? "compare" : ui.view, cur: cur ? cur.id : null, requests, empty: !st.tray.length };
  const fr = cur && cur.idd ? podFrame(cur) : null, chapters = fr ? fr.chapters : [];
  const focusRail = focus && focus.startsWith("rail.") ? +focus.slice(5) : null;
  const ci = chapters.length ? clamp(focusRail ?? ui.ci ?? 0, 0, chapters.length - 1) : 0;
  view.chapters = chapters.length;
  if (view.mode === "compare") return compareView(view, m, spec, ctx, req);
  if (view.mode === "collection" || !cur) return collectionView(view, m, spec, ctx, req);
  const R = spec.regions[view.mode];
  const rail = railOf(m, spec, cur, chapters, req, view.mode === "chapter" ? ci : -1, focusRail);
  view.rail = rail; view.box = null;
  view.specimen = specimenOf(m, spec, ctx, cur, R, req, view.mode);
  view.box = view.specimen.pod ? [R.pod.axis - Math.round(view.specimen.pod.size[0] / 2), R.pod.feet - view.specimen.pod.size[1], ...view.specimen.pod.size] : null;
  view.page = null; view.stamp = null; view.kin = []; view.hatch = null; view.stampCase = null;
  if (view.mode === "chapter") {
    const ch = chapters[ci];
    view.page = { ...pageView(m, spec, cur, fr, ch, headingWord(ch, spec), R.page, req, m.present || {}, null), pane: R.page.pane };
  } else {
    if (cur.idd && fr) {
      const sz = stampSizing(fr, cur.genome), read = fr.chapters.filter((c) => cur.read.includes(c.id)).map((c) => c.id);
      view.stamp = { colours: spec.colours.stampLabel, size: sz.size, asset: req({ kind: "stamp", id: `stamp:${genomeDigest(cur.genome)}:${[...read].sort().join(",")}:${sz.size}`, pod: cur.id, species: S.speciesOf(cur), read, size: sz.size }) };
      view.stampCase = { back: slot(req, "room-stamp-case-152x152", R.stampCase.rect, "the stamp case master"), front: slot(req, "room-stamp-case-152x152-front", R.stampCaseFront.rect, "the case's front glass") };
    }
    // the kin: same-species pods that can be compared, small, at most six; none for a pod not yet identified (its species is not known)
    const kin = cur.idd ? st.tray.filter((q) => q !== cur && q.idd && S.canCompare(st, cur, q)).slice(0, R.kin.max) : [];
    view.kin = kin.map((q) => ({ id: q.id, ring: req({ kind: "kinring", id: `kinring:${R.kin.first[2]}`, size: R.kin.first[2], band: R.kin.band }), pod: req({ kind: "pod", id: `pod:${S.speciesOf(q)}:i:${R.kin.pod.join("x")}`, species: S.speciesOf(q), state: "identified", size: R.kin.pod }) }));
    view.hatch = req({ kind: "hatch", id: `hatch:${R.hatch.rect.slice(2).join("x")}`, size: R.hatch.rect.slice(2) });
  }
  view.line = lineOf(m, spec, cur, chapters, ci, view);
  view.targets = targetsOf(view, st, spec, ctx, cur);
  return view;
}
// The name plate's width: the name and its padding, rounded up to the series' step, between its least and its most.
const plateWidth = (ctx, N, text) => Math.min(N.plate.max, Math.max(N.plate.min, Math.ceil((ctx.measure(text, N.px, N.weight) + 2 * N.plate.pad) / N.plate.round) * N.plate.round));
// The most traits a page holds: the upper end of its grid table.
const maxTraits = (page) => Math.max(...Object.keys(page.grid).map((k) => Number(k.split("-").at(-1))));

// the rail of the pod: one tab a chapter; `open` is the chapter page's open tab (-1 on the overview, where none is open)
function railOf(m, spec, cur, chapters, req, open, focused) {
  if (!cur.idd || !chapters.length) return null;
  const { st, settings, present = {} } = m;
  return { colours: spec.colours.rail, ground: spec.colours.ground, focused, open, slats: "slats:", star: req({ kind: "star", id: "star:12" }), tabs: chapters.map((c) => {
    const read = cur.read.includes(c.id), sealed = !!c.sealed && !settings.sealedOpen, n = Math.min(c.traits.length, maxTraits(spec.regions.chapter.page)), wipe = present.read && present.read.pod === cur.id && present.read.chapter === c.id ? present.read.p : null;
    return { id: c.id, word: railWord(c, spec), state: read ? "read" : sealed ? "sealed" : "unread", pips: n, filled: read ? (wipe == null ? n : Math.ceil(wipe * n)) : 0, glint: S.glint(st, cur, c.id), emblem: req({ kind: "emblem", id: `emblem:${c.id}:${read ? "read" : sealed ? "sealed" : "unread"}:24`, chapter: c.id, state: read ? "read" : sealed ? "sealed" : "unread" }) };
  }) };
}

// The pod under the beam, in the room of this state: its layers as placed masters at the spec's sizes (an empty slot where none is cut to size), the pod, its name, and, on the overview, the origin, the figure and the marks that say who it is.
function specimenOf(m, spec, ctx, cur, R, req, mode) {
  const { st, settings, present = {} } = m, C = spec.colours, fr = cur.idd ? podFrame(cur) : null;
  const sizeClass = shellFrame(st, cur)?.pod?.sizeClass ?? "medium", box = spec.classes.pod[sizeClass], N = R.name;
  const nameText = cur.idd ? S.cap(S.spName(cur)) : spec.strings.unknownPod;
  const platew = plateWidth(ctx, N, nameText);
  const idCut = present.idCut && present.idCut.pod === cur.id ? present.idCut.p : null;
  const sp = shellFrame(st, cur) ? S.speciesOf(cur) : null;
  const out = {
    colours: { name: C.name, origin: C.origin, cut: "white" }, R, beam: req({ kind: "beam", id: `beam:${R.beam.rect.slice(2).join("x")}`, size: R.beam.rect.slice(2) }),
    room: {
      bench: slot(req, `room-bench-stage-${mode}`, spec.regions.bench.rect, "the state's room master"), benchAny: slot(req, "room-bench-stage", spec.regions.bench.rect, "the room master"), shelf: slot(req, "room-shelf", R.shelf.rect, "the shelf master, cut to the spec's size"),
      cradle: slot(req, "room-cradle", R.cradle.rect, "the dish master"), cradleFront: slot(req, "room-cradle-front", R.cradleFront.rect, "the dish's front layer"),
      shadow: slot(req, `pod-${sizeClass}-shadow`, [0, 0, box[0] + spec.shadow.widen, spec.shadow.h], "the contact shadow"),
      plate: slot(req, `plate-name-${platew}x${N.plate.h}`, [0, 0, platew, N.plate.h], "the name plate master"), plateW: platew,
    },
    pod: {
      size: box,
      sealed: req({ kind: "pod", id: `pod:${sp ?? "-"}:s:${box.join("x")}`, species: sp, state: "sealed", size: box }),
      identified: cur.idd ? req({ kind: "pod", id: `pod:${S.speciesOf(cur)}:i:${box.join("x")}`, species: S.speciesOf(cur), state: "identified", size: box }) : null,
    },
    cut: cur.idd ? idCut : null, name: nameText, origin: [], ribbon: null, ribbonColours: { fill: C.ribbonFill, edge: C.ribbonEdge, text: C.ribbonText },
  };
  if (mode === "overview") {
    out.origin = S.podOriginLines(cur).flatMap((l) => wrap(ctx, l, R.origin.rect[2], R.origin.px)).slice(0, R.origin.lines);
    out.ribbon = present.ribbon === cur.id ? spec.strings.newSpecies : null;
    out.originPicture = PLACE_KEYS.includes(cur.g) ? req({ kind: "place", id: `place:${cur.g}:${R.originPicture.rect[2]}`, place: cur.g, size: R.originPicture.rect[2] }) : null;
    const [fw, fh] = R.figure.rect.slice(2), total = fr ? fr.chapters.length : 0, read = fr ? fr.chapters.filter((c) => cur.read.includes(c.id)).length : 0;
    if (cur.idd && sp) {
      const mist = slot(req, `mibi-halo-${sp}-${fw}x${fh}-mist`, R.figure.rect, "the species' figure master (mist)"), clear = slot(req, `mibi-halo-${sp}-${fw}x${fh}-clear`, R.figure.rect, "the species' figure master (clear)");
      out.figure = req({ kind: "figure", id: `figure:${sp}:${read}/${total}`, size: [fw, fh], mist, clear, alpha: total ? read / total : 0 });
    } else out.figure = slot(req, `mibi-halo-empty-${fw}x${fh}`, R.figure.rect, "the empty halo master");
    out.who = cur.idd && sp ? [slot(req, `mark-species-${sp}-24x24`, R.who.marks[0], "the species' mark master"), slot(req, `mark-clan-${fr?.taxonomy?.clan ?? "-"}-24x24`, R.who.marks[1], "the clan's mark master"), cur.newSp ? slot(req, "mark-first-16x16", R.who.marks[2], "the first-of-its-kind mark master") : null]
      : [slot(req, "mark-species-frost-24x24", R.who.marks[0], "the frosted mark master"), slot(req, "mark-species-frost-24x24", R.who.marks[1], "the frosted mark master")];   // before Identify the marks are frosted
  }
  return out;
}

// The collection: the rack's places in order (an empty place is the empty ring), each pod with its ring, name, find, mark and glint; the waiting mark under them.
function collectionView(view, m, spec, ctx, req) {
  const { st, settings, ui } = m, R = spec.regions.collection, L = R.places, N = R.name, C = spec.colours;
  view.mode = "collection";
  const rack = Math.min(settings.rack || S.RACK, L.slots), panel = req({ kind: "placepanel", id: `placepanel:${L.first[2]}x${L.first[3]}`, size: L.first.slice(2), radius: L.radius });
  const places = [];
  const RM = R.ring.masters, RS = R.ring.slice, rs = (id) => slot(req, id, [0, 0, RS[2], RS[3]], "the collection ring master"), from = RM.segmentFrom ?? 0;
  for (let i = 0; i < rack; i++) {
    const q = st.tray[i], idle = rs(RM.idle);
    if (!q) { places.push({ empty: true, panel, ringLayers: [idle] }); continue; }
    const f = q.idd ? podFrame(q) : null, flags = f ? f.chapters.map((c) => q.read.includes(c.id)) : null, n = flags ? flags.length : 0, closed = n > 0 && flags.every(Boolean);
    const name = q.idd ? S.cap(S.spName(q)) : spec.strings.unknownPod, platew = plateWidth(ctx, N, name);
    const sp = shellFrame(st, q) ? S.speciesOf(q) : null, size = R.pod.size;
    const layer = (tpl, k) => rs(tpl.replace("{N}", n).replace("{i}", k));
    places.push({
      panel, ringLayers: [idle, ...(!n || n < RM.chapters[0] || n > RM.chapters[1] ? [] : closed ? [rs(RM.closed)] : [layer(RM.track), ...flags.flatMap((r, k) => (r ? [layer(RM.segment, k + from)] : []))])],   // the idle base, then the track and the read segments, or the closed band when every chapter is read
      pod: req({ kind: "pod", id: `pod:${sp ?? "-"}:${q.idd ? "i" : "s"}:${size.join("x")}`, species: sp, state: q.idd ? "identified" : "sealed", size }),
      name, plate: slot(req, `plate-name-${platew}x${N.plate.h}`, [0, 0, platew, N.plate.h], "the name plate master"), plateW: platew,
      find: PLACE_KEYS.includes(q.g) ? req({ kind: "place", id: `place:${q.g}:${R.place.at[2]}`, place: q.g, size: R.place.at[2] }) : null,
      grow: q.idd && q.read.length && !closed ? req({ kind: "grow", id: "grow:16" }) : null,
      glint: q.idd && S.podGlints(st, q) ? req({ kind: "star", id: "star:12" }) : null,
    });
  }
  view.bench = [slot(req, "room-bench-stage-collection", spec.regions.bench.rect, "the collection's room master"), slot(req, "room-bench-stage", spec.regions.bench.rect, "the room master")];
  view.list = { colours: { name: C.name }, places, waiting: st.waiting.length ? req({ kind: "waiting", id: "waiting:24" }) : null };
  view.rail = null; view.page = null; view.stamp = null; view.box = null; view.specimen = null;
  view.line = lineOf(m, spec, S.podById(st, ui.cur), [], 0, view);
  view.targets = targetsOf(view, st, spec, ctx, S.podById(st, ui.cur));
  return view;
}

// One chapter's page: the cells on the grid by the trait count, each a picture rendered at its size, the marks inside it.
function pageView(m, spec, p, fr, ch, word, region, req, present, diffIds, key = "page") {
  const { st, settings } = m, C = spec.colours, read = p.read.includes(ch.id), sealed = !!ch.sealed && !settings.sealedOpen, traits = ch.traits.slice(0, maxTraits(region)), grid = pageGrid(region, traits.length);
  const [pw, ph] = grid.picture ?? [0, 0], wipeOf = present.read && present.read.pod === p.id && present.read.chapter === ch.id ? present.read.p : null;
  const cells = traits.map((t) => {
    const cell = { name: t.name, lines: [], marks: [], diff: !!(diffIds && diffIds.includes(t.id)), isNew: !!(p.first && p.first.includes(t.id)) };
    if (!read) { cell.frost = true; return cell; }
    const state = traitState(fr, t, p.genome);
    cell.picture = slot(req, `trait-picture-standin-${pw}x${ph}`, [0, 0, pw, ph], "the stand-in picture card master"); cell.frame = slot(req, `trait-picture-frame-${pw}x${ph}`, [0, 0, pw, ph], "the trait frame master");   // no trait picture is drawn by the build: the signed frame and the stand-in card until the painted pictures exist
    cell.lines = [state.line];
    const small = ph < spec.page.marks.smallUnder, [sw, sh] = small ? spec.page.marks.seedSmall : spec.page.marks.seed, M = spec.page.marks;
    const seed = () => { slot(req, `mark-seed-${sw}x${sh}-mask`, [0, 0, sw, sh], "the seed's mask master"); return slot(req, `mark-seed-${sw}x${sh}`, [0, 0, sw, sh], "the seed mark master"); };   // the marks are the studio's: slots by id, nothing drawn by the build
    if (state.kind === "hides") cell.marks.push({ kind: "seed", asset: seed() });
    if (state.kind === "blend") cell.marks.push({ kind: "seed2", asset: seed() }, { kind: "seed", asset: seed() });
    if (state.kind === "only") cell.marks.push({ kind: "only", asset: slot(req, `mark-only-${M.only[0]}x${M.only[1]}`, [0, 0, ...M.only], "the only mark master") });
    if (state.kind === "asleep") cell.marks.push({ kind: "asleep", asset: slot(req, `mark-asleep-${M.asleep[0]}x${M.asleep[1]}`, [0, 0, ...M.asleep], "the asleep mark master") });
    if (state.doing) cell.marks.push({ kind: "doing", asset: slot(req, `mark-breed-${M.doing[0]}x${M.doing[1]}`, [0, 0, ...M.doing], "the breed-to-change mark master") });
    if (wipeOf != null && wipeOf < 1) cell.wipe = wipeOf;
    return cell;
  });
  const frost = (w, h) => req({ kind: "frost", id: `frost:${w}x${h}`, w, h });
  for (const c of cells) if (c.wipe != null) frost(pw, ph);
  const unreadFrame = pw ? slot(req, `trait-picture-frame-${pw}x${ph}-unread`, [0, 0, pw, ph], "the unread frame master") : null;
  const sealedFind = sealed && region.sealedFind ? req({ kind: "seal", id: `seal:${region.sealedFind[2]}`, size: region.sealedFind[2] }) : null;
  return { region: key, heading: word ? { emblem: req({ kind: "emblem", id: `emblem:${ch.id}:${read ? "read" : sealed ? "sealed" : "unread"}:24`, chapter: ch.id, state: read ? "read" : sealed ? "sealed" : "unread" }), word } : null, cells: sealed ? [] : cells, unreadFrame, standIn: spec.strings.standIn, count: traits.length, sealedFind, newMark: region.newMark ? region.newMark.slice : null, overflow: grid.overflow || ch.traits.length > maxTraits(region), frost: "frost:", colours: { ...C.page, diff: C.diff }, marks: spec.page.marks };
}

function compareView(view, m, spec, ctx, req) {
  const { st, settings, ui, present = {} } = m, R = spec.regions, C = spec.colours, c = ui.cmp, A = S.podById(st, c.a), B = S.podById(st, c.b);
  const fr = A && podFrame(A); if (!A || !B || !fr) return { ...view, mode: "collection", cur: null, broken: true };
  const chs = fr.chapters, ci = clamp(c.ci, 0, chs.length - 1), ch = chs[ci], diff = S.compareDiff(st, A, B) || [];
  const both = A.read.includes(ch.id) && B.read.includes(ch.id), ids = both ? diff : [];
  const side = (p, region, key) => {
    const page = { ...pageView(m, spec, p, fr, ch, null, region, req, present, ids, key), pane: spec.regions.chapter.page.pane };
    page.heading = { pod: req({ kind: "pod", id: `pod:${S.speciesOf(p)}:i:${R.compareA.pod.join("x")}`, species: S.speciesOf(p), state: "identified", size: R.compareA.pod }), place: PLACE_KEYS.includes(p.g) ? req({ kind: "place", id: `place:${p.g}`, place: p.g }) : null };
    return page;
  };
  const compareRegion = (key) => ({ ...R[key === "compareB" ? "compareA" : key], rect: R[key].rect });
  view.pages = [side(A, compareRegion("compareA"), "compareA"), side(B, compareRegion("compareB"), "compareB")];
  view.rail = { colours: C.rail, ground: C.ground, focused: null, open: ci, tabs: chs.map((x, i) => ({ id: x.id, word: railWord(x, spec), state: A.read.includes(x.id) && B.read.includes(x.id) ? "read" : "unread", pips: Math.min(x.traits.length, maxTraits(spec.regions.chapter.page)), filled: A.read.includes(x.id) && B.read.includes(x.id) ? Math.min(x.traits.length, 6) : 0, glint: false, emblem: req({ kind: "emblem", id: `emblem:${x.id}:${A.read.includes(x.id) && B.read.includes(x.id) ? "read" : "unread"}:24`, chapter: x.id, state: A.read.includes(x.id) && B.read.includes(x.id) ? "read" : "unread" }) })), star: req({ kind: "star", id: "star:12" }), current: ci };
  view.line = { back: "Pods", subject: "two " + S.spName(A) + " pods", need: !diff.length ? spec.strings.compareSame : ch.traits.some((t) => diff.includes(t.id)) ? spec.strings.compareHere : spec.strings.compareElsewhere };
  view.bench = [slot(req, "room-bench-stage-chapter", spec.regions.bench.rect, "the chapter's room master"), slot(req, "room-bench-stage", spec.regions.bench.rect, "the room master")];   // the strip outside the two pages is the bench, not a flat ground
  view.targets = [];
  return view;
}

// The bottom line (station-layouts.md, "Words on Pods"): the left slot's action, its price as a number and an icon (nothing for free, and a half price is the lower number),
// and where ← goes; the centre slot's short sentence on the focused thing, "<name> is <state>"; the right slot's one amber sentence, empty when nothing is new.
const fill = (t, o) => t.replace(/\{(\w+)\}/g, (_, k) => o[k]);
const iconsOf = (b) => [...new Set((b.match(/[⚡◆❀]/g) || []))].join(" ");
// What a blocked action says on the right: a shortage as "needs more <icons>", any other reason as its own short words (no "·").
const blockNeed = (b, strings) => (!b ? null : /^needs/.test(b) ? fill(strings.needMore, { icons: iconsOf(b) }) : b.replace(/ · /g, ", "));
const priceOf = (cost, icon) => (cost ? cost + " " + icon : "");
function lineOf(m, spec, p, chapters, ci, view) {
  const { st, settings, ui, docked } = m, f = m.focus ?? (view.mode === "collection" ? null : "pod"), Sg = spec.strings, glintOf = (q) => (q && S.podGlints(st, q) ? Sg.glintPod : null);
  const state = (q) => {
    if (!q.idd) return Sg.unknownSubject;
    const fr = podFrame(q), open = fr ? fr.chapters.filter((c) => !c.sealed || settings.sealedOpen) : [], n = open.filter((c) => q.read.includes(c.id)).length;
    return fill(Sg.subjectIs, { name: S.spName(q), state: Sg.states[!n ? "unread" : n < open.length ? "partly" : "fully"] });
  };
  const empty = { back: "Home", subject: Sg.empty, need: !docked ? Sg.dockToBring : m.crates > 0 ? Sg.openBay : Sg.explore };
  if (!st.tray.length) return empty;
  if (view.mode === "collection") {
    const q = f && f.startsWith("place.") ? st.tray[+f.slice(6)] : null; if (!q) return { back: "Home" };
    return { ok: "Open", back: "Home", subject: state(q), need: glintOf(q) };
  }
  if (!p) return { back: "Home" };
  const back = view.mode === "chapter" ? S.cap(S.spName(p)) : "Pods", glintPod = glintOf(p);
  if (f === "pod") {
    if (!p.idd) { const cost = S.identifyCost(st, settings); return { ok: "Identify", price: priceOf(cost, "⚡"), dim: st.e < cost, back, subject: state(p), need: st.e < cost ? fill(Sg.needMore, { icons: "⚡" }) : null }; }
    if (!p.read.length) return { ok: chapters.length ? "Read its chapters" : "", back, subject: state(p), need: glintPod };
    const b = S.growBlock(st, p, {}, settings, []); return { ok: "Shape a founder", price: "", dim: !!b, back, subject: state(p), need: blockNeed(b, Sg) ?? glintPod };
  }
  if (f && f.startsWith("rail.")) {
    const ch = chapters[+f.slice(5)]; if (!ch) return { back };
    const b = S.readBlock(st, p, ch.id, settings), word = railWord(ch, spec), here = S.glint(st, p, ch.id) ? Sg.glintHere : glintPod;
    const states = b === null ? Sg.states.read : b.startsWith("sealed") ? Sg.states.sealed : Sg.states.unread, subject = fill(Sg.subjectIs, { name: word, state: states });
    if (view.mode === "overview") return { ok: "Open " + word, back, subject, need: here };   // ✓ on a tab opens its page, free (the read and its price are on the page)
    if (b === null) return { back, subject, need: here };
    if (b.startsWith("sealed")) return { back, subject };
    const cost = S.readCost(st, p, ch.id, settings);
    return { ok: "Read " + word, price: priceOf(cost, "◆"), dim: !!b, back, subject, need: blockNeed(b, Sg) ?? here };
  }
  if (f && f.startsWith("kin.")) { const q = S.podById(st, view.kin[+f.slice(4)]?.id); return q ? { ok: "Compare", back, subject: state(q), need: glintOf(q) } : { back }; }
  if (f === "hatch") return { ok: ui.wildArm ? "Again: return it" : "Return to the wild", price: "+1 ❀", back, subject: fill(Sg.backTo, { place: S.PLACE_WORD[p.g] || "wild" }) };
  return { back };
}

// The focus targets of the state: the places (the collection), or the rail's tabs, the pod, the kin and the hatch (the overview), or the rail's tabs (the chapter page); the graph is the spec's.
function targetsOf(view, st, spec, ctx, cur) {
  const t = [];
  if (view.mode === "collection") { st.tray.slice(0, spec.regions.collection.places.slots).forEach((q, i) => t.push({ id: "place." + i, group: "place", index: i, rect: placeRect(spec.regions.collection, i) })); return t; }
  if (view.mode === "compare" || !cur) return t;
  const R = spec.regions[view.mode];
  if (view.rail && view.rail.tabs.length) slantTabs(ctx.spec.regions.rail, view.rail.tabs.length, view.rail.open).tabs.forEach(({ rect }, i) => t.push({ id: "rail." + i, group: "rail", index: i, rect }));
  if (view.mode === "overview") {
    t.push({ id: "pod", group: "pod", rect: view.box });
    (view.kin || []).forEach((k, i) => t.push({ id: "kin." + i, group: "kin", index: i, rect: kinRect(R.kin, i) }));
    t.push({ id: "hatch", group: "hatch", rect: R.hatch.rect.slice() });
  }
  return t;
}
export { targetsOf };

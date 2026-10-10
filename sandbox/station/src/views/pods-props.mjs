// The Pods props (lvgl-switch.md §2.1): pure selectors from the state, the focus and the presentation progress to the props of the face's words. Props name *what*, never *where*: strings, states,
// counts, asset ids, flags, and the focus targets by id; no rectangle, no measure, no layout rule (the words place everything from the spec, the face wraps and fits the type), no canvas, no keys.
// The output is plain JSON: { props (the part sent to the face: state, regions, focus), line (the bottom line, for the frame), requests (the pictures the host makes ready before the props: plain requests the
// asset manifest registers), mode, cur, empty }. Runs in Node, tested there. It is the only view of Pods: the JavaScript drawing it replaced is deleted.
import * as S from "../state.mjs";
import { frameOf, traitState, genomeDigest, stampSizing } from "../genome.mjs";
import { pageGrid } from "../../../ui/specs/derive.mjs";

const PLACE_KEYS = ["meadow", "pond", "rock", "wood", "cave"];
const podFrame = (p) => frameOf(S.speciesOf(p));
// A picture the room needs at a size: the placed master of that id when it is exactly that size, an empty slot (nothing drawn, never scaled) when it is not.
const slot = (req, master, rect, until) => { const size = rect.slice(2); return req({ kind: "slot", id: `${master}:${size.join("x")}`, master, size, until }); };
// An unidentified pod is the unknown pod: its own pictures, never a species' shell, even when the species is known.
const shellFrame = (st, p) => (p.idd && st.knownIds.includes(S.speciesOf(p)) ? podFrame(p) : null);
// The species a pod's shell shows (an unidentified pod, and a species not yet known, show the unknown shell): Pods' collection and Cargo's rack draw the same pod.
export const shellSpecies = (st, p) => (shellFrame(st, p) ? S.speciesOf(p) : null);
const railWord = (c, spec) => (c.id === "legs-tail" ? spec.strings.legsTail.rail : c.name);
const headingWord = (c, spec) => (c.id === "legs-tail" ? spec.strings.legsTail.heading : c.name);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
// No digits where a picture or a word does: a count in a sentence is said in words (the frame's shared need line on Pods); an amount beside a material icon is a price or a shortfall and stays in figures.
const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
export const inWords = (text) => (text || "").replace(/\d+(?! [⚡◆❀])/g, (n) => WORDS[+n] ?? "many");

// m: { st, settings, docked, crates, ui: { view, cur, ci, cmp, wildArm }, focus: id | null }   (what is playing is the timeline's: it sends events, the view sends end states)
// Pods is three states (station-layouts.md, Pods): the collection, a pod's overview, a chapter's page; Compare is the overview's. The view reads `ui.view`.
export function podsBuild(m, spec) {
  const { st, settings, ui } = m, requests = [], focus = m.focus ?? null;
  const req = (r) => { requests.push(r); return r.id; };
  const cur = S.podById(st, ui.cur), view = { mode: ui.cmp ? "compare" : ui.view, cur: cur ? cur.id : null, requests, empty: !st.tray.length };
  const fr = cur && cur.idd ? podFrame(cur) : null, chapters = fr ? fr.chapters : [];
  const focusRail = focus && focus.startsWith("rail.") ? +focus.slice(5) : null;
  const ci = chapters.length ? clamp(focusRail ?? ui.ci ?? 0, 0, chapters.length - 1) : 0;
  view.chapters = chapters.length;
  if (view.mode === "compare") return compareView(view, m, spec, req);
  if (view.mode === "collection" || !cur) return collectionView(view, m, spec, req);
  const R = spec.regions[view.mode];
  const rail = railOf(m, spec, cur, chapters, req, view.mode === "chapter" ? ci : -1, focusRail);
  view.rail = rail;
  view.specimen = specimenOf(m, spec, cur, R, req, view.mode);
  view.page = null; view.stamp = null; view.kin = []; view.hatch = null; view.stampCase = null;
  if (view.mode === "chapter") {
    const ch = chapters[ci];
    view.page = { ...pageView(m, spec, cur, fr, ch, headingWord(ch, spec), R.page, req, null), pane: null };
  } else {
    if (cur.idd && fr) {
      const sz = stampSizing(fr, cur.genome), read = fr.chapters.filter((c) => cur.read.includes(c.id)).map((c) => c.id);
      view.stamp = { size: sz.size, asset: req({ kind: "stamp", id: `stamp:${genomeDigest(cur.genome)}:${[...read].sort().join(",")}:${sz.size}`, pod: cur.id, species: S.speciesOf(cur), read, size: sz.size }) };
      view.stampCase = { back: slot(req, "room-stamp-case-152x152", R.stampCase.rect, "the stamp case master"), front: slot(req, "room-stamp-case-152x152-front", R.stampCaseFront.rect, "the case's front glass") };
    }
    // the kin: same-species pods that can be compared, small, at most six; none for a pod not yet identified (its species is not known)
    const kin = cur.idd ? st.tray.filter((q) => q !== cur && q.idd && S.canCompare(st, cur, q)).slice(0, R.kin.max) : [];
    view.kin = kin.map((q) => ({ id: q.id, ring: req({ kind: "kinring", id: `kinring:${R.kin.first[2]}`, size: R.kin.first[2], band: R.kin.band }), pod: req({ kind: "pod", id: `pod:${S.speciesOf(q)}:i:${R.kin.pod.join("x")}`, species: S.speciesOf(q), state: "identified", size: R.kin.pod }) }));
    view.hatch = req({ kind: "hatch", id: `hatch:${R.hatch.rect.slice(2).join("x")}`, size: R.hatch.rect.slice(2) });
  }
  view.line = lineOf(m, spec, cur, chapters, ci, view);
  view.targets = targetsOf(view, st, spec, cur);
  return view;
}
// The most traits a page holds: the upper end of its grid table.
const maxTraits = (page) => Math.max(...Object.keys(page.grid).map((k) => Number(k.split("-").at(-1))));

// the rail of the pod: one tab a chapter; `open` is the chapter page's open tab (-1 on the overview, where none is open)
function railOf(m, spec, cur, chapters, req, open, focused) {
  if (!cur.idd || !chapters.length) return null;
  const { st, settings } = m;
  return { focused, open, star: req({ kind: "star", id: "star:12" }), tabs: chapters.map((c) => {
    const read = cur.read.includes(c.id), sealed = !!c.sealed && !settings.sealedOpen, n = Math.min(c.traits.length, maxTraits(spec.regions.chapter.page));
    return { id: c.id, word: railWord(c, spec), state: read ? "read" : sealed ? "sealed" : "unread", pips: n, filled: read ? n : 0, glint: S.glint(st, cur, c.id), emblem: req({ kind: "emblem", id: `emblem:${c.id}:${read ? "read" : sealed ? "sealed" : "unread"}:24`, chapter: c.id, state: read ? "read" : sealed ? "sealed" : "unread" }) };
  }) };
}

// The pod under the beam, in the room of this state: its layers as placed masters at the spec's sizes (an empty slot where none is cut to size), the pod, its name, and, on the overview, the origin, the figure and the marks that say who it is.
function specimenOf(m, spec, cur, R, req, mode) {
  const { st, settings } = m, C = spec.colours, fr = cur.idd ? podFrame(cur) : null;
  const sizeClass = shellFrame(st, cur)?.pod?.sizeClass ?? "medium", box = spec.classes.pod[sizeClass], N = R.name;
  const nameText = cur.idd ? S.cap(S.spName(cur)) : spec.strings.unknownPod;
  const sp = shellFrame(st, cur) ? S.speciesOf(cur) : null;
  const out = {
    beam: req({ kind: "beam", id: `beam:${R.beam.rect.slice(2).join("x")}`, size: R.beam.rect.slice(2) }),
    room: {
      bench: slot(req, `room-bench-stage-${mode}`, spec.regions.bench.rect, "the state's room master"), benchAny: slot(req, "room-bench-stage", spec.regions.bench.rect, "the room master"), shelf: slot(req, "room-shelf", R.shelf.rect, "the shelf master, cut to the spec's size"),
      cradle: slot(req, "room-cradle", R.cradle.rect, "the dish master"), cradleFront: slot(req, "room-cradle-front", R.cradleFront.rect, "the dish's front layer"),
      shadow: slot(req, `pod-${sizeClass}-shadow`, [0, 0, box[0] + spec.shadow.widen, spec.shadow.h], "the contact shadow"),
    },
    pod: {
      id: cur.id, sizeClass,
      sealed: req({ kind: "pod", id: `pod:${sp ?? "-"}:s:${box.join("x")}`, species: sp, state: "sealed", size: box }),
      identified: cur.idd ? req({ kind: "pod", id: `pod:${S.speciesOf(cur)}:i:${box.join("x")}`, species: S.speciesOf(cur), state: "identified", size: box }) : null,
    },
    name: nameText, origin: [], ribbon: null,
  };
  if (mode === "overview") {
    out.origin = S.podOriginLines(cur);   // the whole lines: the face wraps them to the origin region and keeps the first R.origin.lines
    out.ribbon = spec.strings.newSpecies;   // what the ribbon says; the face shows it while a `ribbon` event for this pod plays
    out.captions = { pod: spec.strings.thisPod, figure: cur.idd ? spec.strings.theSpecies : null };   // the two labels the overview adds (no JavaScript twin): the pod's under the marks, the species' under the figure once identified
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

// The marks that say who a pod is, the species' and its clan's, at the rectangles a region gives (Compare's headings as the overview's row).
const whoOf = (p, fr, W, req) => [slot(req, `mark-species-${S.speciesOf(p)}-24x24`, W.marks[0], "the species' mark master"), slot(req, `mark-clan-${fr?.taxonomy?.clan ?? "-"}-24x24`, W.marks[1], "the clan's mark master")];

// The collection: the rack's places in order (an empty place is the empty ring), each pod with its ring, name, find, mark and glint; the waiting mark under them.
function collectionView(view, m, spec, req) {
  const { st, settings, ui } = m, R = spec.regions.collection, L = R.places, N = R.name;
  view.mode = "collection";
  const rack = Math.min(S.rackSize(settings), L.slots), panel = req({ kind: "placepanel", id: `placepanel:${L.first[2]}x${L.first[3]}`, size: L.first.slice(2), radius: L.radius });
  const places = [];
  const RM = R.ring.masters, RS = R.ring.slice, rs = (id) => slot(req, id, [0, 0, RS[2], RS[3]], "the collection ring master"), from = RM.segmentFrom ?? 0;
  for (let i = 0; i < rack; i++) {
    const q = st.tray[i], idle = rs(RM.idle);
    if (!q) { places.push({ empty: true, panel, ringLayers: [idle] }); continue; }
    const f = q.idd ? podFrame(q) : null, flags = f ? f.chapters.map((c) => q.read.includes(c.id)) : null, n = flags ? flags.length : 0, closed = n > 0 && flags.every(Boolean);
    const name = q.idd ? S.cap(S.spName(q)) : spec.strings.unknownPod;
    const sp = shellFrame(st, q) ? S.speciesOf(q) : null, size = R.pod.size;
    const layer = (tpl, k) => rs(tpl.replace("{N}", n).replace("{i}", k));
    places.push({
      panel, ringLayers: [idle, ...(!n || n < RM.chapters[0] || n > RM.chapters[1] ? [] : closed ? [rs(RM.closed)] : [layer(RM.track), ...flags.flatMap((r, k) => (r ? [layer(RM.segment, k + from)] : []))])],   // the idle base, then the track and the read segments, or the closed band when every chapter is read
      pod: req({ kind: "pod", id: `pod:${sp ?? "-"}:${q.idd ? "i" : "s"}:${size.join("x")}`, species: sp, state: q.idd ? "identified" : "sealed", size }),
      name,
      find: PLACE_KEYS.includes(q.g) ? req({ kind: "place", id: `place:${q.g}:${R.place.at[2]}`, place: q.g, size: R.place.at[2] }) : null,
      grow: q.idd && q.read.length && !closed ? req({ kind: "grow", id: "grow:16" }) : null,
      glint: q.idd && S.podGlints(st, q) ? req({ kind: "star", id: "star:12" }) : null,
    });
  }
  view.bench = [slot(req, "room-bench-stage-collection", spec.regions.bench.rect, "the collection's room master"), slot(req, "room-bench-stage", spec.regions.bench.rect, "the room master")];
  view.list = { places, waiting: st.waiting.length ? req({ kind: "waiting", id: "waiting:24" }) : null };
  view.rail = null; view.page = null; view.stamp = null; view.specimen = null;
  view.line = lineOf(m, spec, S.podById(st, ui.cur), [], 0, view);
  view.targets = targetsOf(view, st, spec, S.podById(st, ui.cur));
  return view;
}

// One chapter's page: the cells on the grid by the trait count, each a picture rendered at its size, the marks inside it.
function pageView(m, spec, p, fr, ch, word, region, req, diffIds, key = "page") {
  const { st, settings } = m, C = spec.colours, read = p.read.includes(ch.id), sealed = !!ch.sealed && !settings.sealedOpen, traits = ch.traits.slice(0, maxTraits(region)), grid = pageGrid(region, traits.length);
  const [pw, ph] = grid.picture ?? [0, 0];
  const cells = traits.map((t) => {
    const cell = { name: t.name, lines: [], glyphs: [], diff: !!(diffIds && diffIds.includes(t.id)), isNew: !!(p.first && p.first.includes(t.id)) };
    if (!read) { cell.frost = true; const O = region.unread?.outline; if (O && O.slice) cell.outline = slot(req, O.slice, [0, 0, ...O.size], "the unread cell's outline master"); return cell; }   // the dotted outline is the studio's nine-slice, placed over the cell's rectangle once signed
    const state = traitState(fr, t, p.genome);
    const slug = (x) => String(x ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), sid = p.species;
    if (state.shows) cell.crop = slot(req, `trait-${sid}-${slug(t.name)}-${slug(state.shows)}-${pw}x${ph}`, [0, 0, pw, ph], "the trait's crop master");   // the studio's crop of the painting, cut at the cell's size, placed 1:1 on the cell's flat tone; no card, no frame, no word is the build's
    cell.lines = [state.line];
    const LM = region.lineMarks, glyph = (key) => slot(req, LM.glyphs[key].slice, [0, 0, ...LM.glyphs[key].size], "the line glyph master");   // the glyphs after the name are the studio's: slots by id (an empty slot draws nothing)
    if (LM) {
      if (state.kind === "hides") cell.glyphs.push({ key: "hides", asset: glyph("hides") });
      if (state.kind === "blend") cell.glyphs.push({ key: "blend", asset: glyph("blend") });
      if (state.kind === "only") cell.glyphs.push({ key: "only", asset: glyph("only") });
      if (state.kind === "asleep") cell.glyphs.push({ key: "asleep", asset: glyph("asleep") });
      if (state.doing) cell.glyphs.push({ key: "doing", asset: glyph("doing") });
    }
    return cell;
  });
  const sealedFind = sealed && region.sealedFind ? true : null;   // the find that opens a shut chapter: a flat tone, and the studio's picture of the find by the chapter's findKind over it once signed
  const sealedPicture = sealedFind && ch.findKind && region.sealedFindSlot ? slot(req, region.sealedFindSlot.replace("{kind}", ch.findKind), [0, 0, region.sealedFind[2], region.sealedFind[3]], "the find picture master") : null;
  return { region: key, chapter: ch.id, heading: word ? { emblem: req({ kind: "emblem", id: `emblem:${ch.id}:${read ? "read" : sealed ? "sealed" : "unread"}:24`, chapter: ch.id, state: read ? "read" : sealed ? "sealed" : "unread" }), word } : null, cells: sealed ? [] : cells, differs: diffIds && region.differs ? slot(req, region.differs.slice, [0, 0, ...region.differs.size], "the Differs mark master") : null, count: sealed ? 1 : traits.length, sealedFind, sealedPicture, newMark: region.newMark ? region.newMark.slice : null, overflow: grid.overflow || ch.traits.length > maxTraits(region) };
}

function compareView(view, m, spec, req) {
  const { st, settings, ui } = m, R = spec.regions, C = spec.colours, c = ui.cmp, A = S.podById(st, c.a), B = S.podById(st, c.b);
  const fr = A && podFrame(A); if (!A || !B || !fr) return { ...view, mode: "collection", cur: null, broken: true };
  const chs = fr.chapters, ci = clamp(c.ci, 0, chs.length - 1), ch = chs[ci], diff = S.compareDiff(st, A, B) || [];
  const both = A.read.includes(ch.id) && B.read.includes(ch.id), ids = both ? diff : [];
  const side = (p, region, key) => {
    const page = { ...pageView(m, spec, p, fr, ch, null, region, req, ids, key), pane: region.pane };
    page.heading = { pod: req({ kind: "pod", id: `pod:${S.speciesOf(p)}:i:${R.compareA.pod.join("x")}`, species: S.speciesOf(p), state: "identified", size: R.compareA.pod }), who: whoOf(p, fr, R.compareA.who, req) };
    return page;
  };
  const compareRegion = (key) => ({ ...R[key === "compareB" ? "compareA" : key], rect: R[key].rect });
  view.pages = [side(A, compareRegion("compareA"), "compareA"), side(B, compareRegion("compareB"), "compareB")];
  view.rail = { focused: null, open: ci, tabs: chs.map((x, i) => ({ id: x.id, word: railWord(x, spec), state: A.read.includes(x.id) && B.read.includes(x.id) ? "read" : "unread", pips: Math.min(x.traits.length, maxTraits(spec.regions.chapter.page)), filled: A.read.includes(x.id) && B.read.includes(x.id) ? Math.min(x.traits.length, 6) : 0, glint: false, emblem: req({ kind: "emblem", id: `emblem:${x.id}:${A.read.includes(x.id) && B.read.includes(x.id) ? "read" : "unread"}:24`, chapter: x.id, state: A.read.includes(x.id) && B.read.includes(x.id) ? "read" : "unread" }) })), star: req({ kind: "star", id: "star:12" }), current: ci };
  view.line = { back: S.cap(S.spName(A)), subject: "two " + S.spName(A) + " pods", need: !diff.length ? spec.strings.compareSame : ch.traits.some((t) => diff.includes(t.id)) ? spec.strings.compareHere : spec.strings.compareElsewhere };
  view.bench = [slot(req, "room-bench-stage-compare", spec.regions.bench.rect, "Compare's room master"), slot(req, "room-bench-stage-collection", spec.regions.bench.rect, "the room master without a cone"), slot(req, "room-bench-stage", spec.regions.bench.rect, "the room master")];   // Compare's own bench when it is placed, else the bench without a cone: no lit, empty stage beside the pages
  view.targets = targetsOf(view, st, spec, A);   // Compare's targets are its rail's tabs
  return view;
}

// The bottom line (station-layouts.md, "Words on Pods"): the left slot's action, its price as a number and an icon (nothing for free, and a half price is the lower number),
// and where ← goes; the centre slot's short sentence on the focused thing, "<name> is <state>"; the right slot's one amber sentence, empty when nothing is new.
const fill = (t, o) => t.replace(/\{(\w+)\}/g, (_, k) => o[k]);
const iconsOf = (b) => [...new Set((b.match(/[⚡◆❀]/g) || []))].join(" ");
// What a blocked action says on the right: a shortage as "needs more <icons>", any other reason as its own short words (no "·").
const blockNeed = (b, strings) => (!b ? null : /^needs/.test(b) ? fill(strings.needMore, { icons: iconsOf(b) }) : b.replace(/ · /g, ", "));
const priceOf = (cost, icon) => (cost ? icon + " " + cost : "");   // the icon before its figure
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
  if (f === "hatch") return { ok: ui.wildArm ? "Again: return it" : "Return to the wild", price: S.gainText(1), back, subject: fill(Sg.backTo, { place: S.PLACE_WORD[p.g] || "wild" }) };
  return { back };
}

// The focus targets of the state: the places (the collection), or the rail's tabs, the pod, the kin and the hatch (the overview), or the rail's tabs (the chapter page); the graph is the spec's.
function targetsOf(view, st, spec, cur) {
  const t = [];
  if (view.mode === "collection") { st.tray.slice(0, spec.regions.collection.places.slots).forEach((q, i) => t.push({ id: "place." + i, group: "place", index: i })); return t; }
  if (!cur) return t;
  if (view.rail && view.rail.tabs.length) view.rail.tabs.forEach((_, i) => t.push({ id: "rail." + i, group: "rail", index: i }));   // Compare's targets are its rail's tabs alone
  if (view.mode === "overview") {
    t.push({ id: "pod", group: "pod" });
    (view.kin || []).forEach((k, i) => t.push({ id: "kin." + i, group: "kin", index: i }));
    t.push({ id: "hatch", group: "hatch" });
  }
  return t;
}
export { targetsOf };

// ---- the props message body ----
// The view as the face takes it: { mode, cur, empty, props: { state, regions, focus }, frame: { line }, requests }. `props` is what goes in the `props` message beside screen, seq and the frame's top bar and plate
// (the page adds those from the frame's view): the state, one props object a region, the focus. The shape is documented in pods.props.json.
export function podsProps(m, spec, frame) {
  const v = podsBuild({ ...m, frameSpec: frame }, spec), regions = {};
  if (v.mode === "collection") { regions.bench = { room: v.bench }; regions.list = v.list; }
  else if (v.mode === "compare") { regions.bench = { room: v.bench }; regions.rail = v.rail; regions.pageA = v.pages[0]; regions.pageB = v.pages[1]; }
  else {
    const sp = v.specimen; regions.bench = { room: [sp.room.bench, sp.room.benchAny] };
    const { bench, benchAny, ...room } = sp.room; regions.specimen = { ...sp, room };
    regions.rail = v.rail; regions.page = v.page; regions.stamp = v.stamp ? { ...v.stamp, case: v.stampCase } : null; regions.kin = v.kin; regions.hatch = v.hatch;
  }
  // the view's answers to the spec's selectors (the graph's `rail.last`, `rail.open`, `kin.first`); null when there is nothing, and the spec's list carries the way on
  const nTabs = v.rail?.tabs?.length ?? 0, ci = v.mode === "compare" ? m.ui?.cmp?.ci : m.ui?.ci, ciSel = nTabs ? "rail." + Math.max(0, Math.min(ci || 0, nTabs - 1)) : null;   // in Compare rail.open is rail.<ui.cmp.ci>
  const focus = { cur: m.focus ?? (v.mode === "compare" ? ciSel : null), armed: !!m.ui?.wildArm, targets: v.targets, resolve: { "rail.last": ciSel, "rail.open": ciSel, "kin.first": v.kin?.length ? "kin.0" : null } };
  return { mode: v.mode, cur: v.cur, empty: v.empty, broken: !!v.broken, props: { state: v.mode, regions, focus }, line: v.line, requests: v.requests };
}

// Closing Compare (the Back key, spec keys.compare.back): the overview with the ring on the kin that opened it (the kin whose pod is ui.cmp.b), else on the pod.
export function compareBackFocus(m, spec, frame) {
  const c = m.ui?.cmp; if (!c) return null;
  const v = podsBuild({ ...m, frameSpec: frame, ui: { ...m.ui, cmp: null, view: "overview", cur: c.a } }, spec), i = (v.kin || []).findIndex((k) => k.id === c.b);
  return i >= 0 ? "kin." + i : "pod";
}

// The Library's Level 1 as props (library.json l1; Level 2 and Level 3 below): pure selectors from the state and the Library's UI to the props of the face's Level 1, beside the frame's. Props name *what*, never *where*: ids, statuses, names, flags, picture ids
// and the focus targets by id; no rectangle, no colour, no layout rule (the face places and colours everything from library.json). The output is plain JSON:
// { props (state, regions, focus), line (the bottom line, for the frame), top (the top bar's readout), requests (the pictures the host makes ready before the props) }. Runs in Node, tested there (tests/library-props.test.mjs);
// the shape is library.props.json.
//   m: { st, settings, ui (UI.lib: { l1 }) }
import * as S from "../state.mjs";
import * as Lib from "../library.mjs";
import { frameIds, frameOf, stampSizing, stampBlocks } from "../genome.mjs";
import { drawnLooks, keyToken } from "../looks.mjs";
import { specimenInput, newLooksOf, sheetInput } from "./specimen-props.mjs";
import { fill, spell, capLine } from "./words.mjs";
import { ageTurns, stageNote, turnsFor, turnsUntil, yoursLine } from "../age-words.mjs";
import { req as collector, slot as slotOf, sheet as sheetReqs, disc as discReq, quiet as quietReq, canLight, lineageFar as lineageFarReq, lineageMini as lineageMiniReq, rackPod as rackPodReq, stamp as stampReq } from "./requests.mjs";
import { faceId } from "../face-pictures.mjs";
import { speciesFacts, sheetFacts, printed } from "../library-sheet.mjs";
import { createMeasure, measureRole, clipTo, wrapCount } from "../../../ui/specs/measure.mjs";
import { sittingsOf } from "../sitting.mjs";
import { lineageOf, targetsOf, resolveOf, fitsClose, farGeometry, camAt, camFromOffset, panSteps, slotsOf, overviewBox, nameBelow, compareLooks, pathBetween } from "../lineage.mjs";
import { bodyColour } from "../lineage-pictures.mjs";

// The subject of Level 1 (strings.subjects): n looks new this visit, across every species. One is "a new look"; two to six spell n; seven or more drop the count; none is empty; no species met is its own line.
export function subjectOf(strings, n, anyMet) {
  if (!anyMet) return strings.subjects.none;
  if (n <= 0) return "";
  if (n === 1) return strings.subjects.one;
  return n <= 6 ? fill(strings.subjects.few, { n: spell(n) }) : strings.subjects.many;
}
// The cell picture's id: library-cell-{SNN}-{digest}, the digest of what it draws (the status, the found looks in the order found and the sealed chapters still shut).
const cellPicture = (id, status, found, shut) => `library-cell-${id}-${keyToken(JSON.stringify([status, status === "found" ? Object.keys(found).sort().map((t) => [t, found[t]]) : [], status === "found" ? shut : []]))}`;

export function libraryBuild(m, spec, frame) {
  const { st, settings, ui } = m, L = spec.l1, C = L.cell, requests = [], later = [], req = collector(requests, true), slot = slotOf(req, "its master (library.json l1)"), made = m.ready ?? (() => true);
  const ids = frameIds();
  if (!L.grid.forms[String(ids.length)]) throw new Error(`Level 1 is built for the catalogue sizes library.json l1.grid.forms holds (${Object.keys(L.grid.forms).join(", ")}), not ${ids.length}: another size comes back to UI/UX`);
  const ground = slot(L.stage.master, L.stage.rect.slice(2));
  slot(C.seed.slice, C.seed.rect.slice(2)); slot(C.wish.slice, C.wish.rect.slice(2)); req({ kind: "star", id: C.glint.slice });   // the pictures every cell may name; the seed is also the hidden parts' slot
  let fresh = 0;
  const cells = ids.map((id) => {
    const status = Lib.speciesStatus(st, id), known = status !== "unmet", fr = frameOf(id);
    if (!known) return { id, status, name: "", picture: "", mark: "", face: "", wish: false, glint: false };
    const inp = specimenInput(st, id, settings), found = status === "found" ? inp.found : {}, shut = status === "found" ? inp.shut : [];
    const pic = cellPicture(id, status, found, shut), [pw, ph] = C.picture.rect.slice(2), cr = { kind: "librarycell", id: pic, species: id, status, found, shut, size: [pw, ph], ground: C.picture.ground[status] };
    if (made(pic)) req(cr); else later.push(cr);   // a cell picture not yet made: the cell draws its quiet ground until it is (the Library 2 gate's F5)
    const mark = slot(C.mark.slice.replace("{SNN}", id), C.mark.rect.slice(2));
    const n = status === "found" ? newLooksOf(st, id, settings).size : 0; fresh += n;
    const fo = status === "found" ? Lib.faceOf(st, id) : null, fm = fo != null ? S.mibiById(st, fo) : null;
    const face = fm ? req(faceReq(st, settings, fm, id, C.face.size)) : "";
    return { id, status, name: fr.species.name, picture: made(pic) ? pic : "", mark, face, wish: Object.keys(Lib.wishOf(st, id)).length > 0, glint: n > 0 };
  });
  const targets = cells.filter((c) => c.status !== "unmet").map((c) => ({ id: "cell." + c.id, group: "cell", enabled: true }));
  const want = ui?.l1 ? "cell." + ui.l1 : null, cur = targets.some((t) => t.id === want) ? want : targets[0]?.id ?? "";
  const on = cur ? cells.find((c) => "cell." + c.id === cur) : null, Sg = L.strings;
  const line = { ok: on ? fill(Sg.open, { species: on.name }) : null, subject: subjectOf(Sg, fresh, targets.length > 0), back: Sg.back, need: null };
  return { props: { state: L.initial, regions: { stage: { picture: [ground] }, cells }, focus: { cur, targets } }, line, top: { readout: { text: Sg.readout, mark: null } }, requests, later };
}
// A Library face request (library.json faces): the mibi's face at a size, faded when released; the stage is the one its portrait was made at, else its stage now (the art director, F4: the id names the mibi and the size).
function faceReq(st, settings, fm, species, size) {
  return { kind: "face", id: faceId(fm.id, size, !!fm.released), mibi: fm.id, species, stage: fm.portrait?.stage ?? S.mibiStage(st, fm, settings), looks: drawnLooks(frameOf(species), fm), size: [size, size], faded: !!fm.released };
}

// ---- Level 2 (library.json l2: the screen library.species) ----
// The first step of a ladder (library.json l2.strings) that fits the bottom line's subject (frame.json regions.subject: its width and words, in its role), measured with the face's Inter (ui/specs/measure.mjs over
// face/dist/metrics.json) as the line is drawn, with its capital (the host cases the line, capLine); the last step when none does.
const measures = new WeakMap();
function measureOf(metrics) { if (!metrics) throw new Error("Level 2's lines are measured: the model carries face/dist/metrics.json (m.metrics)"); let f = measures.get(metrics); if (!f) { f = createMeasure(metrics); measures.set(metrics, f); } return f; }
const ladder = (fit, steps, values) => { const all = steps.map((s) => fill(s, values)); return all.find(fit) ?? all[all.length - 1]; };
const fitter = (metrics, frame) => { const R = frame.regions.subject, measure = measureRole(metrics, frame, R.role); return (s) => measure(capLine(s)) <= R.rect[2] && s.split(" ").length <= R.words; };
// The carried-by line of a found look (lookCarriers: the read chapters of living mibis).
export function carriedLine(fit, strings, carriers) {
  const C = strings.carried, [a, b] = carriers.map((c) => c.name);
  if (!carriers.length) return C.none;
  return ladder(fit, carriers.length === 1 ? C.one : carriers.length === 2 ? C.two : C.many, { A: a, B: b ?? "" });
}
// The family faces: the mibis of this species the player has had, the most recent (by id) first kept, then home first, then out with the Companion, then released; at most max.
function familyOf(st, sv, sid, max) {
  const where = (mb) => (mb.released ? 2 : S.isAway(st, sv, mb) ? 1 : 0);
  return st.mibis.filter((mb) => S.speciesOf(mb) === sid).sort((a, b) => +b.id - +a.id).slice(0, max).sort((a, b) => where(a) - where(b) || +a.id - +b.id).map((mb) => ({ mb, where: ["home", "trip", "wild"][where(mb)] }));
}

// Level 2 of one species as props: m: { st, sv, settings, ui (UI.lib: { species, state, lit, cur, l2 }), metrics (face/dist/metrics.json), ready (id -> the picture is made; absent: every picture is), lastSheet (species -> the id of its last made sheet, or null) }.
// Returns { props (state, regions, focus), line, top, requests (the pictures the props name), later (the pictures not yet made, for the host to make off the open path) }. Props name what, never where: the positions are the generator's facts in sheet or page coordinates.
export function speciesBuild(m, spec, frame) {
  const { st, sv, settings, ui } = m, L2 = spec.l2, Sg = L2.strings, SH = L2.shelf, FA = L2.families, sid = ui.species, fr = frameOf(sid), status = fr ? Lib.speciesStatus(st, sid) : "unmet";
  if (!fr || status === "unmet") throw new Error(`Level 2 shows a met or found species, not ${sid} (${status})`);
  const requests = [], later = [], req = collector(requests, true), slot = slotOf(req, "its master (library.json)"), made = m.ready ?? (() => true), fit = measureOf(m.metrics) && fitter(m.metrics, frame), met = status === "met";
  const ground = slot(spec.l1.stage.master, spec.l1.stage.rect.slice(2));
  const input = sheetInput(st, sid, settings), sp = speciesFacts(fr), lit = !met && ui.state === "lit" && ui.lit && canLight(input, ui.lit) ? ui.lit : null, state = lit ? "lit" : "sheet";
  const facts = sheetFacts(fr, input, lit), guide = met ? null : Lib.fieldGuide(st, sid, settings);
  // the pictures: the sheet (or its lit variant) when made; else the species' last made sheet, else the quiet stand-in; the page when made
  const ask = (r) => { if (made(r.id)) return req(r); if (!later.some((x) => x.id === r.id)) later.push(r); return r.id; };
  const ids = sheetReqs(ask)(spec, input, sp, lit), last = m.lastSheet?.(sid);
  const unlit = made(ids.sheet) ? ids.sheet : last && made(last) ? last : quietReq(req)(spec, input, sp);
  const picture = lit && made(ids.lit) ? ids.lit : unlit, page = lit && made(ids.page) ? ids.page : "";
  if (!made(ids.sheet) && last && made(last)) req({ kind: "librarysheet", id: last, species: sid, input: null, size: L2.sheet.rect.slice(2) });   // the last sheet stands in: it is kept, so its entry is the kept picture
  // the chapter plates (the open ones are the targets) and the glints, in sheet coordinates
  const open = met ? [] : fr.chapters.filter((ch) => canLight(input, ch.id)).map((ch) => ({ id: "chapter." + ch.id, chapter: ch.id, rect: facts.plates[ch.id] }));
  const glints = met ? [] : facts.glints.slice(0, L2.glint.max);
  slot(L2.glint.slice, L2.glint.size);
  // the shelf (found, sheet): the wish, the face, the sittings, the families
  const shelf = { shown: !met && state === "sheet", wish: [], face: null, sittings: 0, families: [] };
  if (!met) {
    const w = Lib.wishOf(st, sid), carriers = Lib.wishCarriers(st, sid), carried = new Set([...carriers.pods, ...carriers.mibis].flatMap((x) => x.traits));
    const pieces = fr.chapters.flatMap((ch) => ch.traits).filter((t) => t.id in w).slice(0, SH.wish.max);
    if (pieces.length) slot(SH.wish.star.slice, SH.wish.star.size);
    shelf.wish = pieces.map((t) => { const look = w[t.id], on = carried.has(t.id); return { trait: t.id, disc: on ? discReq(req)(sid, t.id, look) : slot(SH.wish.disc.open, SH.wish.disc.size), word: printed(t, look), carried: on }; });
    const fo = Lib.faceOf(st, sid), fm = fo != null ? S.mibiById(st, fo) : null;
    if (fm) shelf.face = { id: fm.id, picture: req(faceReq(st, settings, fm, sid, SH.face.picture.size)), name: fm.name ?? "", released: !!fm.released };
    shelf.sittings = Math.min(SH.sittings.max, sittingsOf(st, sid)); if (shelf.sittings) slot(SH.sittings.slice, SH.sittings.size);
    shelf.families = familyOf(st, sv, sid, FA.max).map(({ mb, where }) => ({ id: mb.id, picture: req(faceReq(st, settings, mb, sid, FA.picture.size)), name: mb.name ?? "", where }));
  }
  // the page's look discs (lit, once the page is drawn: no target on a disc the face has not drawn), in page coordinates
  const discs = lit && page ? Object.entries(facts.page.discs).map(([id, rect]) => ({ id, rect })) : [];
  // the focus: the open plates, then the shelf (sheet) or the lit chapter's found looks (lit); none on met-only
  const targets = open.map((p) => ({ id: p.id, group: "chapter", enabled: true }));
  if (shelf.shown) { if (shelf.wish.length) targets.push({ id: "wish", group: "shelf", enabled: true }); if (shelf.face) targets.push({ id: "face", group: "shelf", enabled: true }); for (const f of shelf.families) targets.push({ id: "family." + f.id, group: "shelf", enabled: true }); }
  for (const d of discs) targets.push({ id: d.id, group: "look", enabled: true });
  const has = (id) => targets.some((t) => t.id === id), want = ui.cur ?? ui.l2?.[sid] ?? null;
  const cur = want && has(want) ? want : lit && has("chapter." + lit) ? "chapter." + lit : targets.find((t) => t.group === "chapter")?.id ?? "";
  // the line: the verb and the subject of the focused target
  const line = { ok: null, subject: "", back: lit ? Sg.clear : Sg.back, need: null };
  if (met) line.subject = Sg.metOnly;
  else if (cur.startsWith("chapter.")) { const ch = fr.chapters.find((c) => "chapter." + c.id === cur), g = guide.chapters.find((c) => c.id === ch.id);
    line.ok = fill(lit === ch.id ? Sg.clearChapter : Sg.show, { Chapter: ch.name }); line.subject = fill(g.more ? Sg.chapter.more : Sg.chapter.all, { Chapter: ch.name }); }
  else if (cur.startsWith("look.")) { const d = cur.slice(5), t = fr.chapters.flatMap((ch) => ch.traits).find((x) => d.startsWith(x.id + ".")); line.subject = carriedLine(fit, Sg, Lib.lookCarriers(st, sid, t.id, d.slice(t.id.length + 1))); }
  else if (cur === "wish") line.ok = null;   // no ✓ until pinning has a screen: shut in place, as a shut door is (nav.mjs); strings.wish is kept for then
  else if (cur === "face") { const f = shelf.face; if (f.released) line.subject = ladder(fit, [Sg.faceReleased.named, Sg.faceReleased.nameless], { Name: S.cap(f.name) }); else line.ok = fill(Sg.face, { name: f.name }); }
  else if (cur.startsWith("family.")) { const f = shelf.families.find((x) => "family." + x.id === cur); line.ok = Sg.family; line.subject = ladder(fit, [Sg.familyAt[f.where], Sg.familyNameless[f.where]], { Name: S.cap(f.name) }); }
  const mark = slot(spec.l1.cell.mark.slice.replace("{SNN}", sid), spec.l1.cell.mark.rect.slice(2));
  return {
    props: { state, regions: { stage: { picture: [ground] }, sheet: { picture, met, glints, plates: open.map(({ id, rect }) => ({ id, rect })) }, shelf, page: { picture: page, chapter: lit ?? "", discs } }, focus: { cur, targets } },
    line, top: { readout: { text: fr.species.name, mark } }, requests, later,
  };
}
// The sheet request of a found species (Level 2's unlit sheet), for the host to make ahead of the open (the Library 3 gate's P2: when its digest changes, and when Level 1's ring rests on its cell); null for a species not found.
export function sheetAhead(st, settings, spec, sid) {
  const fr = frameOf(sid); if (!fr || Lib.speciesStatus(st, sid) !== "found") return null;
  const out = []; sheetReqs(collector(out))(spec, sheetInput(st, sid, settings), speciesFacts(fr)); return out[0];
}

// ---- Level 3 (library.json l3: the screen library.family) ----
// The lineage as the pictures draw it: { species, nodes: [{ id, kind, row, u, released, colour (the mibi's read, shown body colour, or null: neutral) }], links, span, rows }.
export function lineageInput(st, lin) {
  const fr = frameOf(lin.species);
  return { species: lin.species, nodes: lin.nodes.map(({ id, kind, row, u, released, mibi }) => ({ id, kind, row, u, released, colour: kind === "mibi" ? bodyColour(fr, S.mibiById(st, mibi)) : null })), links: lin.links, span: lin.span, rows: lin.rows };
}
// Every selector of the graph answered: one with no answer is the ring's own node, so the ring stays (an unanswered selector would fall to its group's first target: focus.c, ui/focus.mjs).
const answered = (r, sels, cur) => Object.fromEntries(sels.map((s) => [s, r[s] ?? cur]));
// Level 3 of one species as props: m: { st, settings, ui (UI.lib: { species, l3: { [species]: { node, zoom, cam, pan } }, l3last }), metrics }, spec (library.json), frame (frame.json), home (home.json: the stage words).
// Returns { props (state, regions, focus), line, top, requests }: far, close and compare are drawn with words.
// Props name what, never where: the nodes and links in grid units (lineage.mjs), the FAR dot boxes as the generator's facts in the picture's coordinates, CLOSE's camera (the host's: px to take off the grid's),
// its slots (the nodes the host assigns) and the overview's view box as the mini's facts in the mini's coordinates.
export function familyBuild(m, spec, frame, home) {
  const { st, settings, ui } = m, L3 = spec.l3, Sg = L3.strings, sid = ui.species, fr = frameOf(sid);
  if (!fr || Lib.speciesStatus(st, sid) !== "found") throw new Error(`Level 3 shows a found species, not ${sid}`);
  const requests = [], req = collector(requests, true), slot = slotOf(req, "its master (library.json)"), lin = lineageOf(st, sid, { gap: L3.block.gap }), mem = ui.l3?.[sid] ?? {};
  const held = mem.zoom === "compare" && lin.nodes.some((n) => n.id === mem.held && n.kind === "mibi") ? mem.held : null, zoom = mem.zoom === "far" ? "far" : held ? "compare" : "close";
  const mark = slot(spec.l1.cell.mark.slice.replace("{SNN}", sid), spec.l1.cell.mark.rect.slice(2)), top = { readout: { text: fill(Sg.readout, { Species: fr.species.name }), mark } };
  const targets = targetsOf(lin).map((id) => ({ id, group: "node", enabled: true })), cur = targets.some((t) => t.id === mem.node) ? mem.node : targets[0]?.id ?? "";
  if (zoom !== "far") return closeBuild(m, spec, lin, { targets, cur, mem, top, requests, req, slot, frame, home, held });
  const ground = slot(spec.l1.stage.master, spec.l1.stage.rect.slice(2)), input = lineageInput(st, lin), g = farGeometry(input, spec), picture = lineageFarReq(req)(spec, input);
  // the line: Zoom in; the focused mibi's name and stage (the nameless step past the name's room), the bud none; ← the species (Level 2)
  const measureOfLine = measureOf(m.metrics) && measureRole(m.metrics, frame, frame.regions.subject.role), n = lin.nodes.find((q) => q.id === cur), mb = n?.kind === "mibi" ? S.mibiById(st, n.mibi) : null;
  let subject = "";
  if (mb) { const stage = S.mibiStage(st, mb, settings), name = S.cap(mb.name ?? ""); subject = name && measureOfLine(name) <= Sg.nameRoom ? fill(Sg.farSubject, { Name: name, stage: home.strings.stages[stage] ?? stage }) : Sg.nameless[stage]; }
  return {
    props: { state: "far", regions: { stage: { picture: [ground] }, lineage: { nodes: lin.nodes.map(({ id, kind, row, u, released }) => ({ id, kind, row, u, released })), links: lin.links }, far: { picture, boxes: targets.map((t) => ({ id: t.id, rect: g.boxes[t.id] })) } },
      focus: { cur, targets, resolve: answered(resolveOf(lin, cur, "far", ui.l3last), Object.values(L3.focus.graph.node).map((e) => e[0]), cur) } },
    line: { ok: cur ? Sg.zoomIn : null, subject, back: fr.species.name, need: null }, top, requests,
  };
}
// CLOSE (library.json l3.close) and compare (l3.compare): the tree walked face by face. The camera is the host's (ui.lib.l3[species].cam, an offset from its node; the entry centred in the comfort zone when none), and a pan the host plays
// (mem.pan: { from, to }) gives the step cameras the slots are assigned for. The props carry the lineage (as FAR's), the links in grid units with the row in half rows (the face reads integers), the camera,
// the slots (each node wholly inside the view under one of the cameras: its picture, its name, its grid point), the panel (the focused node's rows; in compare the held mibi and the fact; the overview, the mini and the
// view box, only in close and only when the tree exceeds the view) and the focus. In compare the one comparison (lineage.mjs compareLooks, pathBetween) gives the fact, the block light (in each stamp's own
// coordinates) and the path (regions.tree.path, as the links), none with the ring on the held mibi or the bud; the hold mark's node is regions.tree.hold.
// The line: close ✓ Compare from {name}; compare ✓ Compare from {name} (the ring elsewhere) or Look at {name} (on the held mibi, none when it is released); the subjects past their rooms in their nameless steps; the bud none in far and close, Holding {the held name} in compare, and no ✓
// words and no ✓; ← Family when the tree exceeds the view (to FAR), else the species (Level 2); ← Done in compare.
export { nameBelow };
function closeBuild(m, spec, lin, { targets, cur, mem, top, requests, req, slot, frame, home, held }) {
  const { st, settings } = m, L3 = spec.l3, C = L3.close, Sg = L3.strings, sid = lin.species, fr = frameOf(sid), fits = fitsClose(lin, C, nameBelow(C, frame)), compare = !!held;
  const ground = slot(spec.l1.stage.master, spec.l1.stage.rect.slice(2)), cam = cur && Array.isArray(mem.cam) ? camFromOffset(lin, cur, C, mem.cam) : camAt(lin, cur, C, null, nameBelow(C, frame));
  const cams = mem.pan && Array.isArray(mem.pan.from) ? panSteps(mem.pan.from, cam, C.pan.frac) : [cam], pod = rackPodReq(req);
  const slots = slotsOf(lin, C, cams, nameBelow(C, frame)).map((n) => {
    const at = { id: n.id, kind: n.kind, u: n.u, row: n.row, released: n.released };
    if (n.kind !== "mibi") return { ...at, picture: pod(sid, C.boxes[n.kind]), name: n.kind === "bud" ? Sg.growing : "" };
    const mb = S.mibiById(st, n.mibi); return { ...at, picture: req(faceReq(st, settings, mb, sid, C.boxes.mibi[0])), name: S.cap(mb.name ?? "") };
  });
  const input = lineageInput(st, lin), mini = fits || compare ? "" : lineageMiniReq(req)(spec, input), node = (id) => lin.nodes.find((q) => q.id === id), n = node(cur);
  const mibiOf = (q) => (q?.kind === "mibi" ? S.mibiById(st, q.mibi) : null), mb = mibiOf(n), hm = held ? mibiOf(node(held)) : null;
  // the one comparison: never with the ring on the held mibi, never on the bud
  const cmp = compare && mb && cur !== held ? compareLooks(fr, hm, mb) : null, rows = rowsOf(m, spec, lin, n, { req, slot, pod, home, frame, compare }), measureLine = measureOf(m.metrics) && measureRole(m.metrics, frame, frame.regions.subject.role);
  if (cmp) rows.stamp.lights = lightsOf(fr, mb, cmp.lit);
  const panel = { ov: { picture: mini, box: fits || compare ? [0, 0, 0, 0] : overviewBox(input, spec, cam) }, rows, held: null, fact: "" };
  if (compare) {
    const H = L3.compare.held, hs = stampOf(fr, hm, req, spec.colours.stampLabel.k);
    panel.held = { name: S.cap(hm.name ?? ""), mark: slot(H.mark.slice.replace("{SNN}", sid), [H.mark.size, H.mark.size]), portrait: req(faceReq(st, settings, hm, sid, H.portrait.size)), stamp: { ...hs, lights: cmp ? lightsOf(fr, hm, cmp.lit) : [] } };
    if (cmp) panel.fact = factOf(Sg.fact, cmp, L3.compare.fact, measureOf(m.metrics) && measureRole(m.metrics, frame, L3.compare.fact.role));
  }
  // the line
  const name = S.cap(mb?.name ?? ""), fitsRoom = (s, room) => !!s && measureLine(s) <= room, line = { ok: null, subject: "", back: compare ? Sg.done : fits ? fr.species.name : Sg.backFar, need: null };
  if (mb && !compare) line.ok = fill(Sg.compareFrom, { name });
  else if (mb && cur === held) { line.ok = mb.released ? null : fill(Sg.lookAt, { name }); line.subject = fitsRoom(name, Sg.holdingRoom) ? fill(Sg.holding, { Name: name }) : Sg.holdingNameless; }
  else if (n?.kind === "bud" && compare) { const hn = S.cap(hm.name ?? ""); line.subject = fitsRoom(hn, Sg.holdingRoom) ? fill(Sg.holding, { Name: hn }) : Sg.holdingNameless; }   // the bud has no name: the subject is the held mibi's, as on the held mibi itself
  else if (mb) { const hn = S.cap(hm.name ?? ""); line.ok = fill(Sg.compareFrom, { name }); line.subject = fitsRoom(hn, Sg.comparedRoom) ? fill(Sg.comparedWith, { Held: hn }) : Sg.comparedNameless; }
  return {
    props: { state: compare ? "compare" : "close", regions: { stage: { picture: [ground] }, lineage: { nodes: lin.nodes.map(({ id, kind, row, u, released }) => ({ id, kind, row, u, released })), links: lin.links },
      tree: { cam, slots, links: lin.links.map((l) => ({ a: [l.a[0], l.a[1] * 2], b: [l.b[0], l.b[1] * 2], faded: l.faded })), path: cmp ? pathBetween(lin, held, cur) : [], hold: held ?? "" },
      panel },
      focus: { cur, targets, resolve: answered(resolveOf(lin, cur, "close", m.ui.l3last), Object.values(L3.focus.graph.node).map((e) => e[0]), cur) } },
    line, top, requests,
  };
}
// A stamp of a mibi or the bud as the panel shows it (l3.close.panel.rows.stamp): its read chapters, at its stampSizing size, dimmed as a label (colours.stampLabel.k: the request's id gains :k16; the block light is drawn after it, undimmed); { picture, size, lights: [] }.
function stampOf(fr, mb, req, k, bud = null) {
  const g = bud ? bud.genome : mb.genome, read = fr.chapters.filter((c) => ((bud ?? mb).read ?? []).includes(c.id)).map((c) => c.id), sz = stampSizing(fr, g);
  return { picture: stampReq(req)({ genome: g, read, size: sz.size, k, species: fr.species.id, ...(bud ? { bud: true } : { mibi: mb.id }) }), size: sz.size, lights: [] };
}
// The block light in one stamp: each lit chapter's block, { c (its index in the frame), rect (in the stamp's own pixels) }.
const lightsOf = (fr, mb, lit) => { const B = stampBlocks(fr, mb.genome); return lit.filter((id) => B[id]).map((id) => ({ c: fr.chapters.findIndex((ch) => ch.id === id), rect: B[id] })); };
// The rows of the focused node (l3.close.panel.rows): a mibi's or the bud's portrait, name, mark, age, place, parents and stamp; the words as the strings give them, each drawn line cased (capLine).
function rowsOf(m, spec, lin, n, { req, slot, pod, home, frame, compare }) {
  const { st, sv, settings } = m, R = spec.l3.close.panel.rows, P = spec.l3.strings.panel, sid = lin.species, fr = frameOf(sid), node = new Map(lin.nodes.map((q) => [q.id, q]));
  const out = { portrait: "", portraitSlot: false, name: "", mark: slot(R.mark.slice.replace("{SNN}", sid), R.mark.rect.slice(2)), age: ["", ""], stage: { label: "", value: "" }, yours: { label: "", value: "", since: "" }, now: "", parents: [], stamp: { picture: "", size: 0, lights: [] } };
  if (!n || n.kind === "pod") return out;
  const bud = n.kind === "bud" ? st.bud : null, mb = bud ? null : S.mibiById(st, n.mibi), self = bud ?? mb;
  if (bud) { out.portrait = pod(sid, R.portraitSlot.pod); out.portraitSlot = true; out.name = fill(P.budName, { Species: fr.species.name }); out.age = [P.growing, ""]; out.now = P.places.bud; }
  else {
    const stage = S.mibiStage(st, mb, settings);
    out.portrait = req(faceReq(st, settings, mb, sid, R.portrait.size)); out.name = S.cap(mb.name ?? "");
    out.age = [mb.released ? capLine(home.strings.stages[stage] ?? stage) : ageTurns(mb, st.turn), ""];   // a released mibi keeps its stage word; the turns count is for the living, at every stage
    if (!mb.released && !compare) {   // the stage row and the Yours row: a living mibi's in close, never a bud's, a released mibi's or compare's (compare is about looks: age is one ring move away in close; the stamp keeps its place, so the panel never reflows as the ring moves)
      const note = stageNote(mb, st.turn, settings.adultTurns ?? S.JUVENILE_TURNS, settings.elderTurns ?? S.ELDER_TURNS), y = yoursLine(mb, m.now ?? Date.now());
      out.stage = { label: capLine(home.strings.stages[stage] ?? stage), value: stage === "juvenile" ? (note.n == null ? P.stageCare : fill(P.stageYoung, { until: turnsUntil(note.n) })) : turnsFor(note.n) };
      if (y) out.yours = { label: P.yours, value: y.span ?? P.sinceToday, since: y.floor ? (y.span ? P.orLonger : P.orBefore) : fill(P.since, { date: y.date }) };
    }
    out.now = P.places[mb.released ? "wild" : S.isAway(st, sv, mb) ? "trip" : "home"];
  }
  const ps = n.parents.map((id) => node.get(id)).filter(Boolean);
  if (ps.length && ps[0].kind === "pod") { const g = self.from?.g, w = P.podPlaces[g]; out.parents = [{ face: pod(sid, spec.l3.close.boxes.pod), name: w ? capLine(fill(P.pod, { place: w })) : P.podUnknown, pod: true }]; }
  else {
    const shed = !bud && mb.genome?.origin?.kind === "shed", face = (q) => req(faceReq(st, settings, S.mibiById(st, q.mibi), sid, R.parents.size));
    const nameOf = (q) => S.cap(S.mibiById(st, q.mibi)?.name ?? "");
    out.parents = ps.filter((q) => q.kind === "mibi").slice(0, 2).map((q) => ({ face: face(q), pod: false, name: shed ? fill(P.shedLine, { Parent: clipTo(measureOf(m.metrics) && measureRole(m.metrics, frame, R.parents.name.role), nameOf(q), R.parents.lineRoom) }) : nameOf(q) }));
    if (shed) out.parents = out.parents.slice(0, 1);
  }
  out.stamp = stampOf(fr, mb, req, spec.colours.stampLabel.k, bud);
  return out;
}
// The fact (l3.strings.fact): the traits that show the same, their catalogue names as the frames spell them (capitalised) in frame order, joined with commas and "and"; four or more the first three and "and more"; the first step that fits
// F.lines lines of F.width in its role (wrapped as the face's v_wrap wraps), else fewer traits before "and more". "No read look in common" when the traits read on both all differ, "Nothing read on both yet" when none is read on both.
function factOf(W, cmp, F, measure) {
  if (!cmp.read.length) return W.unread;
  if (!cmp.same.length) return W.none;
  const names = cmp.same.map((t) => t.name), list = (xs) => (xs.length < 2 ? xs[0] : fill(W.and, { a: xs.slice(0, -1).join(", "), b: xs[xs.length - 1] }));
  const steps = names.length <= 3 ? [fill(W.same, { traits: list(names) })] : [];
  for (let k = Math.min(3, names.length - 1); k >= 1; k--) steps.push(fill(W.same, { traits: fill(W.more, { a: names.slice(0, k).join(", ") }) }));
  const lines = (s) => wrapCount(measure, capLine(s), F.width, "and");   // no line ends on "and" (fact.wrap): it goes with the word after it
  return capLine(steps.find((s) => lines(s) <= F.lines) ?? steps[steps.length - 1]);
}

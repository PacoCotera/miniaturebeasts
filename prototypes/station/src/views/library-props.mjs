// The Library's Level 1 as props (library.json l1): pure selectors from the state and the Library's UI to the props of the face's Level 1, beside the frame's. Props name *what*, never *where*: ids, statuses, names, flags, picture ids
// and the focus targets by id; no rectangle, no colour, no layout rule (the face places and colours everything from library.json). The output is plain JSON:
// { props (state, regions, focus), line (the bottom line, for the frame), top (the top bar's readout), requests (the pictures the host makes ready before the props) }. Runs in Node, tested there (tests/library-props.test.mjs);
// the shape is library.props.json.
//   m: { st, settings, ui (UI.lib: { l1 }) }
import * as S from "../state.mjs";
import * as Lib from "../library.mjs";
import { frameIds, frameOf } from "../genome.mjs";
import { drawnLooks, keyToken } from "../looks.mjs";
import { specimenInput, newLooksOf, sheetInput } from "./specimen-props.mjs";
import { fill, spell } from "./words.mjs";
import { req as collector, slot as slotOf, sheet as sheetReqs, disc as discReq, quiet as quietReq, canLight } from "./requests.mjs";
import { faceId } from "../face-pictures.mjs";
import { speciesFacts, sheetFacts, printed } from "../library-sheet.mjs";
import { createMeasure } from "../../../ui/specs/measure.mjs";
import { sittingsOf } from "../sitting.mjs";

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
// The first step of a ladder (library.json l2.strings) that fits the bottom line's subject (frame.json regions.subject: its width and words, at its px), measured with the face's Inter (ui/specs/measure.mjs over
// face/dist/metrics.json); the last step when none does.
const measures = new WeakMap();
function measureOf(metrics) { if (!metrics) throw new Error("Level 2's lines are measured: the model carries face/dist/metrics.json (m.metrics)"); let f = measures.get(metrics); if (!f) { f = createMeasure(metrics); measures.set(metrics, f); } return f; }
const ladder = (fit, steps, values) => { const all = steps.map((s) => fill(s, values)); return all.find(fit) ?? all[all.length - 1]; };
const fitter = (measure, frame) => { const R = frame.regions.subject; return (s) => measure(s, R.px) <= R.rect[2] && s.split(" ").length <= R.words; };
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
  const requests = [], later = [], req = collector(requests, true), slot = slotOf(req, "its master (library.json)"), made = m.ready ?? (() => true), fit = fitter(measureOf(m.metrics), frame), met = status === "met";
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

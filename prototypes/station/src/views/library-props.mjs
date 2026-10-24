// The Library's Level 1 as props (library.json l1): pure selectors from the state and the Library's UI to the props of the face's Level 1, beside the frame's. Props name *what*, never *where*: ids, statuses, names, flags, picture ids
// and the focus targets by id; no rectangle, no colour, no layout rule (the face places and colours everything from library.json). The output is plain JSON:
// { props (state, regions, focus), line (the bottom line, for the frame), top (the top bar's readout), requests (the pictures the host makes ready before the props) }. Runs in Node, tested there (tests/library-props.test.mjs);
// the shape is library.props.json.
//   m: { st, settings, ui (UI.lib: { l1 }) }
import * as S from "../state.mjs";
import * as Lib from "../library.mjs";
import { frameIds, frameOf } from "../genome.mjs";
import { drawnLooks, keyToken } from "../looks.mjs";
import { specimenInput, newLooksOf } from "./specimen-props.mjs";
import { fill, spell } from "./words.mjs";
import { req as collector, slot as slotOf } from "./requests.mjs";
import { faceId } from "../face-pictures.mjs";

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
  const { st, settings, ui } = m, L = spec.l1, C = L.cell, requests = [], req = collector(requests, true), slot = slotOf(req, "its master (library.json l1)");
  const ids = frameIds();
  if (!L.grid.forms[String(ids.length)]) throw new Error(`Level 1 is built for the catalogue sizes library.json l1.grid.forms holds (${Object.keys(L.grid.forms).join(", ")}), not ${ids.length}: another size comes back to UI/UX`);
  const ground = slot(L.stage.master, L.stage.rect.slice(2));
  slot(C.seed.slice, C.seed.rect.slice(2)); slot(C.wish.slice, C.wish.rect.slice(2)); req({ kind: "star", id: C.glint.slice });   // the pictures every cell may name; the seed is also the hidden parts' slot
  let fresh = 0;
  const cells = ids.map((id) => {
    const status = Lib.speciesStatus(st, id), known = status !== "unmet", fr = frameOf(id);
    if (!known) return { id, status, name: "", picture: "", mark: "", face: "", wish: false, glint: false };
    const inp = specimenInput(st, id, settings), found = status === "found" ? inp.found : {}, shut = status === "found" ? inp.shut : [];
    const pic = cellPicture(id, status, found, shut), [pw, ph] = C.picture.rect.slice(2);
    req({ kind: "librarycell", id: pic, species: id, status, found, shut, size: [pw, ph], ground: C.picture.ground[status] });
    const mark = slot(C.mark.slice.replace("{SNN}", id), C.mark.rect.slice(2));
    const n = status === "found" ? newLooksOf(st, id, settings).size : 0; fresh += n;
    const fo = status === "found" ? Lib.faceOf(st, id) : null, fm = fo != null ? S.mibiById(st, fo) : null;
    const face = fm ? req({ kind: "face", id: faceId(fm.id, C.face.size, !!fm.released), mibi: fm.id, species: id, stage: fm.stage ?? S.mibiStage(st, fm, settings), looks: drawnLooks(fr, fm), size: [C.face.size, C.face.size], faded: !!fm.released }) : "";
    return { id, status, name: fr.species.name, picture: pic, mark, face, wish: Object.keys(Lib.wishOf(st, id)).length > 0, glint: n > 0 };
  });
  const targets = cells.filter((c) => c.status !== "unmet").map((c) => ({ id: "cell." + c.id, group: "cell", enabled: true }));
  const want = ui?.l1 ? "cell." + ui.l1 : null, cur = targets.some((t) => t.id === want) ? want : targets[0]?.id ?? "";
  const on = cur ? cells.find((c) => "cell." + c.id === cur) : null, Sg = L.strings;
  const line = { ok: on ? fill(Sg.open, { species: on.name }) : null, subject: subjectOf(Sg, fresh, targets.length > 0), back: Sg.back, need: null };
  return { props: { state: L.initial, regions: { stage: { picture: [ground] }, cells }, focus: { cur, targets } }, line, top: { readout: { text: Sg.readout, mark: null } }, requests };
}

// The Library spread as props (lvgl-switch.md §2.1, §4 L; library.json spread): pure selectors from the state and the Library's UI to the props of the face's spread, beside the frame's. Props name *what*, never *where*: ids, statuses,
// names, clan ids, flags, picture ids and the focus targets by id; no rectangle, no colour, no layout rule (the words place and colour everything from library.json). The output is plain JSON:
// { props (state, regions, focus), line (the bottom line, for the frame), requests (the pictures the host makes ready before the props) }.
// Runs in Node, tested there (tests/library-props.test.mjs); the shape is library.props.json.
//   m: { st, settings, ui (UI.lib: { page, i }) }
import * as S from "../state.mjs";
import * as Lib from "../library.mjs";
import { doorOpen } from "../nav.mjs";
import { frameIds, frameOf } from "../genome.mjs";

const fill = (t, o) => t.replace(/\{(\w+)\}/g, (_, k) => (k in o ? o[k] : "{" + k + "}"));
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export function libraryBuild(m, spec, frame) {
  const { st, settings, ui } = m, SP = spec.spread, requests = [], req = (r) => { requests.push(r); return r.id; };
  const page = ui?.page ?? 0, ids = frameIds().slice(16 * page, 16 * page + 16);
  const slot = (id, size, until) => req({ kind: "slot", id, master: id, size, until: until || "its master (library.json masters)" });
  const guideOf = (id) => Lib.fieldGuide(st, id, settings);
  const items = Lib.spread(st, ids).map(({ id, status }) => {
    const known = status !== "unmet", fr = known ? frameOf(id) : null, found = status === "found", g = found ? guideOf(id) : null;
    const clan = fr?.taxonomy?.clan ?? null, cur = g ? g.foundCurrent : 0, denom = g ? cur + g.unseen : 0;   // current looks only: a seen legacy look moves nothing
    return {
      id, status, name: known ? fr.species.name : null, clan,
      portrayed: found && st.mibis.some((x) => S.speciesOf(x) === id && x.portrait?.state === "delivered"),   // any delivered portrait of the species, a released mibi's included
      complete: found && !!g.complete,
      progress: found ? Math.min(4, Math.floor((4 * cur) / (denom || 1)) + 1) : null,   // integers only: a quarter, a half, three quarters, and four from there
      picture: found ? req({ kind: "species", id: SP.item.plate.slice.replace("{SNN}", id), species: id, look: "plate", size: SP.item.plate.at.slice(2) }) : status === "met" ? req({ kind: "species", id: SP.item.study.slice.replace("{SNN}", id), species: id, look: "study", size: SP.item.study.at.slice(2) }) : null,
      roundel: known && clan ? slot(SP.item.roundel.slice.replace("{Cnn}", clan), SP.item.roundel.at.slice(2)) : null,
    };
  });
  // the fixed pictures: the stage, the gilt corner, the seal and the progress seeds (the face reads their ids from library.json)
  const stage = req({ kind: "spread", id: SP.regions.stage.slice, part: "stage", size: SP.regions.stage.rect.slice(2) });
  req({ kind: "spread", id: SP.item.gilt.slice, part: "gilt", size: SP.item.gilt.at.slice(2) }); req({ kind: "spread", id: SP.item.seal.slice, part: "seal", size: SP.item.seal.at.slice(2) });
  slot(SP.item.progress.slices.full, SP.item.progress.seed); slot(SP.item.progress.slices.empty, SP.item.progress.seed);
  const regions = { stage: { picture: stage }, leftPage: { items: items.slice(0, 8) }, rightPage: { items: items.slice(8, 16) } };
  const targets = items.map((it) => ({ id: "frame." + it.id, group: "frame", enabled: true }));   // an unmet frame is a place too: all sixteen
  const at = clamp(ui?.i ?? 0, 0, Math.max(0, items.length - 1)), cur = "frame." + items[at].id, it = items[at];
  const Sg = SP.strings;
  const line = it.status === "found" ? { ok: doorOpen("book") ? Sg.open : null, subject: fill(Sg.subjects.found, { species: it.name }), back: Sg.back, need: null }
    : it.status === "met" ? { ok: null, subject: fill(Sg.subjects.met, { species: it.name }), back: Sg.back, need: null }
    : { ok: null, subject: Sg.subjects.unmet, back: Sg.back, need: null };
  return { props: { state: "spread", regions, focus: { cur, targets } }, line, requests };
}

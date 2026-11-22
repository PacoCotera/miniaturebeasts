// Her page as props (station-match-3 slice 1a, station-match-4 slice 1b; the accepted walk-3-page): a hatched mibi on a screen of her own. Pure selectors from the state and the Pods UI to the props of the face's `page`
// state (pods.json regions.page): her name and where she is from, the "All of her" tag, the stage as ONE picture (the room, her, the chips on her body, the ring on the chapter in hand, and the rail band of every chapter
// with its rings and the frame on the chapter in hand), the two hints, and the rail's cells (name, line, where each stands). Props name what is drawn; the cells' x is the spec's space-between rule (regions.page.rail.cell).
//   ui.pods: page (the mibi's id), lane (the chapter in hand)
import * as S from "../state.mjs";
import { frameOf } from "../genome.mjs";
import { pageSpotsOf, PAGE_BODY_BOX } from "../page.mjs";
import { fill } from "./words.mjs";

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h.toString(16).padStart(8, "0"); };
const isDoings = (ch) => ch.traits.every((t) => t.nature === "doing");

// The origin line under her name: her kind, and where she came from when her record has it (`from.g`: the place she was found or her pod's, as the Vivarium and Let go say it).
export function originOf(m) { const where = S.PLACE_WORD[m.from?.g]; return S.cap(S.spName(m)) + (where ? ` · from the ${where}` : ""); }

// One petal a trait: 1 seen, 0 not yet. A chapter about her body is seen once it is looked at (all its petals); a chapter about what she does fills a petal a trait by watching her.
const petalsOf = (m, ch) => { const looked = S.pageRead(m).includes(ch.id); return ch.traits.map((t) => ((t.nature === "doing" ? S.pageKnown(m, t) >= 1 : looked) ? "1" : "0")).join(","); };

// A cell's left edge: n cells of w, space-between, `inset` from both edges (regions.page.rail.cell.rule)
export const cellX = (i, n, W, c) => c.inset + (n > 1 ? Math.floor((i * (W - 2 * c.inset - n * c.w)) / (n - 1)) : 0) + i * c.w;

// The page's view: { mode: "page", page: {...}, line, targets, cur, requests }
export function pageView(view, m, spec, req) {
  const { st, ui } = m, Sg = spec.strings.read, mibi = S.mibiById(st, ui.page);
  if (!mibi || mibi.released) return { ...view, mode: "inventory", broken: true };
  const R = spec.regions.page, C = R.rail.cell, sid = S.speciesOf(mibi), fr = frameOf(sid), chs = fr ? fr.chapters : [], hand = clamp(ui.lane ?? 0, 0, Math.max(0, chs.length - 1)), ch = chs[hand] ?? null;
  const spots = pageSpotsOf(sid).filter((s) => chs.some((c) => c.id === s.chapter)).map((s) => ({ chapter: s.chapter, at: s.at, line: s.line, ring: ch && s.chapter === ch.id ? petalsOf(mibi, ch) : "" }));
  const cells = chs.map((c, i) => {
    const p = petalsOf(mibi, c), left = p.split(",").filter((x) => x === "0").length, x = cellX(i, chs.length, R.rect[2], C);
    const sub = isDoings(c) ? (left ? Sg.railWatch : Sg.railDone) : fill(left ? Sg.railToSee : Sg.railSeen, { n: left || c.traits.length });
    return { id: c.id, name: c.name, sub, x, petals: p, hand: i === hand };
  });
  const key = hash(spots.map((s) => `${s.chapter}:${s.ring}`).join("|") + "|" + cells.map((c) => `${c.id}:${c.petals}`).join("|") + "|" + (ch ? ch.id : "-"));
  const stage = req({ kind: "pagestage", id: `pagestage:${sid}:${key}`, species: sid, size: R.rect.slice(2), body: { x: PAGE_BODY_BOX.x, y: PAGE_BODY_BOX.y, w: PAGE_BODY_BOX.w }, spots, hand: ch ? ch.id : "", tag: R.tag.rect, radius: R.tag.radius, keys: [R.hints.chapters.key, R.hints.look.key],
    rail: { y: R.rail.rect[1], h: R.rail.rect[3], ring: C.ring, cy: R.rail.rect[1] + C.ringCy, grad: C.gradient, frame: C.frame, w: C.w, cells: cells.map((c) => ({ chapter: c.id, x: c.x, petals: c.petals, hand: c.hand })) } });
  const name = S.cap(mibi.name);
  view.page = { name, origin: originOf(mibi), tag: Sg.board, stage, hints: { chapters: Sg.pageHintChapters, look: Sg.pageHintLook }, rail: { cells: cells.map((c) => ({ id: c.id, name: c.name, sub: c.sub, hand: c.hand })) } };
  view.line = { ok: ch ? fill(isDoings(ch) ? Sg.open : Sg.pageLook, { chapter: ch.name }) : null, back: name, subject: ch ? fill(Sg[S.pageRead(mibi).includes(ch.id) ? "pageKnown" : isDoings(ch) ? "pageWatch" : "pageSurprise"], { chapter: ch.name }) : "", need: "" };   // not drawn on her page (no foot line); the intents and tests still read it
  view.targets = cells.map((c, i) => ({ id: "rail." + i, group: "rail", index: i }));   // the cells; the frame on the chapter in hand is the ring
  view.cur = hand < cells.length ? "rail." + hand : null; view.resolve = {};
  return view;
}

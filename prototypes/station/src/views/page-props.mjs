// Her page as props (station-match-3, slice 1a; the accepted walk-3-page): a hatched mibi on a screen of her own. Pure selectors from the state and the Pods UI to the props of the face's `page` state (pods.json
// regions.page): her name and where she is from, the "All of her" tag, the stage as ONE picture (the room, her, the chips on her body and the ring on the chapter in hand), the two hints. The rail of every
// chapter under the stage is slice 1b: `rail.cells` is an empty list here. Props name what is drawn, never where (the word places it from the spec).
//   ui.pods: page (the mibi's id), lane (the chapter in hand)
import * as S from "../state.mjs";
import { frameOf } from "../genome.mjs";
import { pageSpotsOf, PAGE_BODY_BOX } from "../page.mjs";
import { fill } from "./words.mjs";

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h.toString(16).padStart(8, "0"); };
const isDoings = (ch) => ch.traits.every((t) => t.nature === "doing");

// The origin line under her name: her kind, and the place she came from when the save knows it.
export function originOf(m) { const where = S.PLACE_WORD[m.g]; return S.cap(S.spName(m)) + (where ? ` · from the ${where}` : ""); }

// One petal a trait: 1 seen, 0 not yet (the chapter ring's own states; "c" the trait in view is not used on the page yet)
const petals = (m, ch) => ch.traits.map((t) => (S.pageKnown(m, t) >= 1 ? "1" : "0")).join(",");

// The page's view: { mode: "page", page: {...}, line, targets, cur, requests }
export function pageView(view, m, spec, req) {
  const { st, ui } = m, Sg = spec.strings.read, mibi = S.mibiById(st, ui.page);
  if (!mibi || mibi.released) return { ...view, mode: "inventory", broken: true };
  const sid = S.speciesOf(mibi), fr = frameOf(sid), chs = fr ? fr.chapters : [], hand = clamp(ui.lane ?? 0, 0, Math.max(0, chs.length - 1)), ch = chs[hand] ?? null;
  const { k, dx } = spec.regions.page.scale, px = (x) => Math.round(x * k + dx), py = (y) => Math.round(y * k);   // the accepted window's lp to this region's (pods.json regions.page.scale)
  const spots = pageSpotsOf(sid).filter((s) => chs.some((c) => c.id === s.chapter)).map((s) => ({ chapter: s.chapter, at: [px(s.at[0]), py(s.at[1])], line: [px(s.line[0]), py(s.line[1]), px(s.line[2]), py(s.line[3])], ring: ch && s.chapter === ch.id ? petals(mibi, ch) : "" }));
  const key = hash(spots.map((s) => `${s.chapter}:${s.ring}`).join("|") + "|" + (ch ? ch.id : "-"));
  const R = spec.regions.page, win = (r) => [r[0] - R.rect[0], r[1] - R.rect[1], r[2], r[3]];   // the spec's stage coordinates as the picture's own (the window's)
  const stage = req({ kind: "pagestage", id: `pagestage:${sid}:${key}`, species: sid, size: R.rect.slice(2), body: { x: px(PAGE_BODY_BOX.x), y: py(PAGE_BODY_BOX.y), w: Math.round(PAGE_BODY_BOX.w * k) }, spots, hand: ch ? ch.id : "", tag: win(R.tag.rect), radius: R.tag.radius, keys: [win(R.hints.chapters.key), win(R.hints.look.key)] });
  const name = S.cap(mibi.name);
  view.page = { name, origin: originOf(mibi), tag: Sg.board, stage, hints: { chapters: Sg.pageHintChapters, look: Sg.pageHintLook }, rail: { cells: [] } };
  view.line = { ok: ch ? fill(isDoings(ch) ? Sg.open : Sg.pageLook, { chapter: ch.name }) : null, back: name, subject: ch ? fill(Sg[S.pageRead(mibi).includes(ch.id) ? "pageKnown" : isDoings(ch) ? "pageWatch" : "pageSurprise"], { chapter: ch.name }) : "", need: "" };   // the middle of the foot says the chapter in hand (as the old page did)
  view.targets = []; view.cur = null; view.resolve = {};
  return view;
}

// Her page (station-walk-4 pictures 3 and 4; build step 2a): a hatched mibi on the reading screen. One screen draws a pod and a mibi alike (views/reading-props.mjs, reading-pictures.mjs): the mibi stands in the
// chamber, the rail below holds every chapter of her kind, the chapter in hand is drawn in step 1's shapes. The subject is a view of the mibi that looks like a read pod (`pagePod`); nothing of hers is copied.
//   ui.pods.page  the mibi's id while her page is open, else null
import * as S from "./state.mjs";

export const PAGE_PREFIX = "mibi:";
export const isPageId = (id) => typeof id === "string" && id.startsWith(PAGE_PREFIX);
// The mibi as the reading screen takes a pod: identified, every field the screen reads kept by reference. Its id is the page's picture key ("mibi:<id>"), never a pod's.
export function pagePod(st, mibiId) {
  const m = S.mibiById(st, mibiId); if (!m || m.released) return null;
  return { ...m, id: PAGE_PREFIX + m.id, mibi: m.id, idd: true, first: [], page: true, read: S.pageRead(m) };   // what her page shows as read is her page's own state (state.mjs pageOf), not the game's read-at-birth
}
// The page's subject for a Pods UI: her page when open, else the pod on the bench.
export const subjectOf = (st, ui) => (ui && ui.page != null ? pagePod(st, ui.page) : S.benchPod(st));

// Places on her body, per kind (data, Loika first; a kind with no entry has no place, and the page marks nothing): the chapter that has a place, and where on her body it is as a fraction of the body's box
// (x from the left, y from the top). A mark is interface drawn by code (a ring), never art; a place's own picture would be an [art] slot.
export const PLACES = {
  S01: { face: { at: [0.7, 0.38], name: "head" }, coat: { at: [0.46, 0.6], name: "flank" }, "legs-tail": { at: [0.5, 0.86], name: "legs" } },
};
// Her page's marks on the stage picture, in lp of the phone window (530 x 600; the accepted walk-3-page, station-walk-2 pages/walk-3-page.html): per kind, per chapter, where its chip stands (`at`) and the leader
// line from the chip to the part of her body it reads (`line`: x1, y1 at the chip, x2, y2 on the body). The body stands at left 52, top 78, 384 px wide. A chapter with no entry has no chip.
export const PAGE_BODY_BOX = { x: 52, y: 78, w: 384 };
export const PAGE_SPOTS = {
  S01: { shape: { at: [394, 72], line: [382, 82, 326, 128] }, face: { at: [476, 224], line: [462, 232, 412, 258] }, coat: { at: [72, 222], line: [98, 250, 140, 282] }, "legs-tail": { at: [48, 388], line: [62, 392, 104, 408] } },
};
export const pageSpotsOf = (species) => Object.entries(PAGE_SPOTS[species] ?? {}).map(([chapter, s]) => ({ chapter, ...s }));
// Her chapter's close up (station-match-5; the accepted walk-4-scale): where the ring stands on her body, as a fraction of her body's picture (x from the left, y from the top). The Coat's is the accepted picture's own (where her
// dark coat meets her cream); the others are the end of each chapter's leader on her page (PAGE_SPOTS), a kind with none puts it in the middle.
const CLOSE_OWN = { S01: { coat: [0.30, 0.52] } };   // loika-page-coat-1: on her back, where the saddle lies (was [0.533, 0.612], the neck and chest, where the dark meets the cream, off the saddle)
export function closeOf(species, chapterId) {
  const own = CLOSE_OWN[species]?.[chapterId]; if (own) return own;
  const s = PAGE_SPOTS[species]?.[chapterId]; return s ? [(s.line[2] - PAGE_BODY_BOX.x) / PAGE_BODY_BOX.w, (s.line[3] - PAGE_BODY_BOX.y) / ((PAGE_BODY_BOX.w * 312) / 304)] : [0.5, 0.5];
}
export const bodyPlaceOf =(species, chapterId) => PLACES[species]?.[chapterId] ?? null;
export const placesOf = (species) => Object.entries(PLACES[species] ?? {}).map(([chapter, p]) => ({ chapter, ...p }));

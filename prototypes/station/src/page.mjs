// Her page (station-walk-4 pictures 3 and 4; build step 2a): a hatched mibi on the reading screen. One screen draws a pod and a mibi alike (views/reading-props.mjs, reading-pictures.mjs): the mibi stands in the
// chamber, the rail below holds every chapter of her kind, the chapter in hand is drawn in step 1's shapes. The subject is a view of the mibi that looks like a read pod (`pagePod`); nothing of hers is copied.
//   ui.pods.page  the mibi's id while her page is open, else null
import * as S from "./state.mjs";

export const PAGE_PREFIX = "mibi:";
export const isPageId = (id) => typeof id === "string" && id.startsWith(PAGE_PREFIX);
// The mibi as the reading screen takes a pod: identified, every field the screen reads kept by reference. Its id is the page's picture key ("mibi:<id>"), never a pod's.
export function pagePod(st, mibiId) {
  const m = S.mibiById(st, mibiId); if (!m || m.released) return null;
  return { ...m, id: PAGE_PREFIX + m.id, mibi: m.id, idd: true, first: [], page: true };
}
// The page's subject for a Pods UI: her page when open, else the pod on the bench.
export const subjectOf = (st, ui) => (ui && ui.page != null ? pagePod(st, ui.page) : S.benchPod(st));

// Places on her body, per kind (data, Loika first; a kind with no entry has no place, and the page marks nothing): the chapter that has a place, and where on her body it is as a fraction of the body's box
// (x from the left, y from the top). A mark is interface drawn by code (a ring), never art; a place's own picture would be an [art] slot.
export const PLACES = {
  S01: { face: { at: [0.5, 0.2], name: "head" }, coat: { at: [0.5, 0.5], name: "flank" }, "legs-tail": { at: [0.5, 0.86], name: "legs" } },
};
export const bodyPlaceOf = (species, chapterId) => PLACES[species]?.[chapterId] ?? null;
export const placesOf = (species) => Object.entries(PLACES[species] ?? {}).map(([chapter, p]) => ({ chapter, ...p }));

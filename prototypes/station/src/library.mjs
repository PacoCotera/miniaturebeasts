// The Library's data (M5; station-build.md §3 Library and Book, research-loop.md §4 and §5): what the field guide of a species
// holds, what it still lacks ("more?"), whether a species is unmet, met or found, the face a portrayed mibi gives it, and the wish a player
// pins. Everything is derived from the save (st.guide, st.knownIds, st.metIds, st.mibis, st.wish, st.face); no drawing, no screen.
// A wish is knowledge, never material: nothing here writes a genome (research-loop.md §5: "knowing a variant never injects it").
import { LOCI, resolveCopies } from "../../workbench/framework/catalogue.mjs";
import { frameOf, chapterLooks } from "./genome.mjs";
import { frameFor, speciesOf, guideLooks, mibiById, DEFAULT_SETTINGS, logEv } from "./state.mjs";

// Every look a trait can show, in the words a read gives (describe.lookOf's own enumeration: one label per distinct pair of the
// species' pool, the frame's looks where they align with the labels or with the resolved values).
export function possibleLooks(frame, trait) {
  const id = trait.loci[0], locus = LOCI.get(id);
  if (!locus) return [...(trait.looks || [])];
  const pool = frame.pools?.[id] ?? locus.alleles.map((a) => a.id), labels = [], values = [];
  const labelOf = ([a, b]) => {
    const v = resolveCopies(locus, [a, b]);
    if (locus.operator === "copy-mean") return a === b ? a : `between ${a} and ${b}`;
    if (locus.operator === "partition-map") return a === b ? a : `${a}, ${b}`;
    if (locus.operator === "pair-map") return typeof v === "boolean" ? (v ? "on" : "off") : String(v);
    return a === b ? a : [a, b].sort().join("/");
  };
  for (let i = 0; i < pool.length; i++) for (let j = i; j < pool.length; j++) {
    const l = labelOf([pool[i], pool[j]]); if (!labels.includes(l)) labels.push(l);
    const v = JSON.stringify(resolveCopies(locus, [pool[i], pool[j]])); if (!values.includes(v)) values.push(v);
  }
  if (trait.looks?.length === labels.length) return [...trait.looks];
  if (trait.looks?.length === values.length) return [...trait.looks];
  return labels;
}

// The species' page of the Library: a plate that is found (a pod of it identified, or a mibi of it), a pencil study that is met (seen
// out on a walk), or an empty frame, unmet, with no cue.
export function speciesStatus(st, id) {
  if (st.knownIds.includes(id) || st.mibis.some((m) => speciesOf(m) === id)) return "found";
  if (st.metIds.includes(id)) return "met";
  return "unmet";
}

// The looks found per chapter and trait, and what is still unseen. A sealed chapter that is still shut shows its notch, its looks neither counted
// nor listed ("sealed": true).
export function fieldGuide(st, id, settings = DEFAULT_SETTINGS) {
  const fr = frameOf(id); if (!fr) return null;
  const chapters = fr.chapters.map((ch) => {
    const shut = !!ch.sealed && !settings.sealedOpen && !(st.readOnce[id] || []).includes(ch.id);
    const traits = ch.traits.map((t) => {
      const possible = possibleLooks(fr, t), seen = guideLooks(st, id, t.id), unseen = shut ? [] : possible.filter((l) => !seen.includes(l));
      return { id: t.id, name: t.name, possible: shut ? [] : possible, found: shut ? [] : seen.slice(), unseen: unseen.length, more: !shut && unseen.length > 0, nature: t.nature };
    });
    return { id: ch.id, name: ch.name, sealed: shut, traits, found: traits.reduce((n, t) => n + t.found.length, 0), unseen: traits.reduce((n, t) => n + t.unseen, 0), more: traits.some((t) => t.more) };
  });
  const found = chapters.reduce((n, c) => n + c.found, 0), unseen = chapters.reduce((n, c) => n + c.unseen, 0);
  return { species: id, name: fr.species.name, chapters, found, unseen, complete: unseen === 0 && chapters.some((c) => !c.sealed && c.traits.length > 0), oneFromFull: unseen === 1 };
}
export const guideUnseen = (st, id, settings) => fieldGuide(st, id, settings)?.unseen ?? null;

// The book of one species: its status, the field guide, the face (a portrayed mibi the player chose, else none), the mibis of it that could be made the face.
export function book(st, id, settings = DEFAULT_SETTINGS) {
  const fr = frameOf(id); if (!fr) return null;
  const status = speciesStatus(st, id), portrayed = st.mibis.filter((m) => speciesOf(m) === id && m.portrait && m.portrait.state === "delivered");
  return { species: id, name: fr.species.name, status, guide: status === "found" ? fieldGuide(st, id, settings) : null, face: faceOf(st, id), faceChoices: portrayed.map((m) => m.id), wish: wishOf(st, id), notes: (st.guideNotes && st.guideNotes[id]) || [] };
}
// The library's spread: sixteen frames, each with its status.
export const spread = (st, ids) => ids.map((id) => ({ id, status: speciesStatus(st, id) }));

// The face of a species in the book: the mibi the player chose among its portrayed ones. A released mibi keeps its portrait in the book.
export const faceOf = (st, id) => { const f = st.face && st.face[id]; const m = f != null ? mibiById(st, f) : null; return m && m.portrait && m.portrait.state === "delivered" ? m.id : null; };
export function makeFace(st, m) {
  if (!m) return { ok: false, msg: "Make the face · pick a mibi" };
  if (!m.portrait || m.portrait.state !== "delivered") return { ok: false, msg: "Make " + m.name + " the face · only a portrayed mibi" };
  if (!st.face) st.face = {}; const id = speciesOf(m);
  if (st.face[id] === m.id) return { ok: false, again: true };
  st.face[id] = m.id; logEv(st, m.name + " is the face of " + (frameFor(m)?.species.name || id));
  return { ok: true, msg: m.name + " is the face of the " + (frameFor(m)?.species.name || id) };
}

// --- the wish (research-loop.md §5, §8): a dream mibi made from looks the field guide holds -----------------------------------
export const wishOf = (st, id) => ((st.wish && st.wish[id]) || {});
export function wishPinBlock(st, id, traitId, look, settings = DEFAULT_SETTINGS) {
  const fr = frameOf(id); if (!fr) return "no such species";
  if (speciesStatus(st, id) !== "found") return "the species is not in the field guide yet";
  const t = fr.chapters.flatMap((c) => c.traits).find((x) => x.id === traitId); if (!t) return "no such trait";
  if (!guideLooks(st, id, traitId).includes(look)) return "only a look the field guide holds";
  return "";
}
export function wishPin(st, id, traitId, look, settings = DEFAULT_SETTINGS) {
  const b = wishPinBlock(st, id, traitId, look, settings); if (b) return { ok: false, msg: "Pin · " + b };
  const w = st.wish[id] || (st.wish[id] = {}); if (w[traitId] === look) return { ok: false, again: true };
  w[traitId] = look; logEv(st, "Wish · " + traitId + " " + look); return { ok: true };
}
export function wishUnpin(st, id, traitId) { const w = st.wish[id]; if (!w || !(traitId in w)) return { ok: false }; delete w[traitId]; if (!Object.keys(w).length) delete st.wish[id]; return { ok: true }; }
// What carries pieces of the wish: a read pod that carries a pinned look in a chapter it has read, or a mibi that does (a mibi known in a chapter).
// Never material: nothing here touches a genome.
export function wishCarriers(st, id) {
  const fr = frameOf(id), w = wishOf(st, id), keys = Object.keys(w); if (!fr || !keys.length) return { pods: [], mibis: [] };
  const carries = (x) => { if (!x.genome) return []; const out = []; for (const ch of fr.chapters) if ((x.read || []).includes(ch.id)) for (const [t, ls] of chapterLooks(fr, ch, x.genome)) if (w[t] && ls.includes(w[t])) out.push(t); return out; };
  const pods = st.tray.concat(st.waiting).filter((p) => speciesOf(p) === id && p.idd).map((p) => ({ id: p.id, traits: carries(p) })).filter((r) => r.traits.length);
  const mibis = st.mibis.filter((m) => speciesOf(m) === id && !m.released).map((m) => ({ id: m.id, traits: carries(m) })).filter((r) => r.traits.length);
  return { pods, mibis };
}
// How much of the wish is held by one mibi (its traits that show the pinned look or carry it), 0 to 1 of the pinned traits.
export function wishHeld(st, id, m) {
  const w = wishOf(st, id), keys = Object.keys(w); if (!keys.length) return 0;
  const r = wishCarriers(st, id).mibis.find((x) => x.id === m.id); return r ? r.traits.length / keys.length : 0;
}

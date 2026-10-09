// The Library's data (M5; station-build.md §3 Library and Book, research-loop.md §4 and §5): what the field guide of a species
// holds, what it still lacks ("more?"), whether a species is unmet, met or found, the face a portrayed mibi gives it, and the wish a player
// pins. Everything is derived from the save (st.guide, st.knownIds, st.metIds, st.mibis, st.wish, st.face); no drawing, no screen.
// A wish is knowledge, never material: nothing here writes a genome (research-loop.md §5: "knowing a variant never injects it").
import { traitLooks } from "../../workbench/framework/describe.mjs";
import { frameOf, chapterLooks, traitState } from "./genome.mjs";
import { frameFor, speciesOf, guideLooks, mibiById, forecastOf, DEFAULT_SETTINGS, logEv } from "./state.mjs";

// Every look a trait can show, in the words a read gives (describe.traitLooks: the frame's own looks, never the catalogue's pair labels where the frame names its bins).
export const possibleLooks = (frame, trait) => traitLooks(frame, trait);

// The species' page of the Library: a plate that is found (a pod of it identified, or a mibi of it), a pencil study that is met (seen
// out on a walk), or an empty frame, unmet, with no cue.
export function speciesStatus(st, id) {
  if (st.knownIds.includes(id) || st.mibis.some((m) => speciesOf(m) === id)) return "found";
  if (st.metIds.includes(id)) return "met";
  return "unmet";
}

// The looks found per chapter and trait, and what is still unseen. A sealed chapter that is still shut shows only its notch ("sealed": true, nothing found), but its looks
// count as unseen, so a species with a sealed chapter fills only after its find.
export function fieldGuide(st, id, settings = DEFAULT_SETTINGS) {
  const fr = frameOf(id); if (!fr) return null;
  const chapters = fr.chapters.map((ch) => {
    const shut = !!ch.sealed && !settings.sealedOpen && !(st.readOnce[id] || []).includes(ch.id);
    const traits = ch.traits.map((t) => {
      const possible = possibleLooks(fr, t), seen = guideLooks(st, id, t.id), unseen = possible.filter((l) => !seen.includes(l));   // a shut chapter's looks count as unseen (research-loop.md §4, the-portrait.md §8)
      return { id: t.id, name: t.name, possible, found: shut ? [] : seen.slice(), unseen: unseen.length, more: unseen.length > 0, nature: t.nature };
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
// The Book's Visit (a jump to Habitat): the species' face if one is chosen, else the first mibi of it that is housed; none when there is none.
export function visitTarget(st, id) {
  const f = faceOf(st, id), m = f != null ? mibiById(st, f) : null;
  return m && !m.released ? m : st.mibis.find((q) => speciesOf(q) === id && !q.released) || null;
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

// The chapters of a pod or mibi that carry a piece of the wish: a pinned trait whose pinned look either copy gives, shown or hidden, in a chapter that is read (or known). The wish glint is
// its own mark beside the new-look star, on the chapter arc that holds the piece; it says where, never what. (Marking a chapter not yet read waits for the owner.)
export function wishChapters(st, x) {
  const id = speciesOf(x), fr = frameOf(id), w = wishOf(st, id); if (!fr || !x.genome || !Object.keys(w).length) return [];
  return fr.chapters.filter((ch) => (x.read || []).includes(ch.id) && chapterLooks(fr, ch, x.genome).some(([t, ls]) => w[t] && ls.includes(w[t]))).map((ch) => ch.id);
}
export const wishGlint = (st, x, chapterId) => wishChapters(st, x).includes(chapterId);

// The wish in the cross forecast (research-loop.md §5, §8; the-portrait.md §8): for each pinned trait, a switch lights the seeds among the four that show the pinned look; a blend marks
// the pinned bin on the range picture when the range reaches it. How close a pairing gets is the pinned traits lit (`lit`), never a number or a percentage. Data only: no art.
// Seeds are read against the first parent's other loci (the forecast gives the trait's own locus).
export function wishForecast(st, a, b, settings = DEFAULT_SETTINGS) {
  if (!a || !b) return null;
  const id = speciesOf(a), w = wishOf(st, id), keys = Object.keys(w); if (!keys.length) return null;
  const fc = forecastOf(st, a, b, settings), fr = frameFor(a); if (!fc || !fr) return null;
  const traitsById = Object.fromEntries(fr.chapters.flatMap((c) => c.traits).map((t) => [t.id, t]));
  const withLoci = (loci) => ({ ...a.genome, loci: { ...a.genome.loci, ...loci } });
  const pinned = keys.map((traitId) => {
    const ft = fc.traits.find((x) => x.trait === traitId), t = traitsById[traitId], look = w[traitId];
    if (!ft || !t) return { trait: traitId, look, kind: null, lit: false };
    if (ft.kind === "switch") {
      const seeds = ft.seeds.map((sd, i) => (traitState(fr, t, withLoci({ [ft.locus]: sd.copies })).shows === look ? i : -1)).filter((i) => i >= 0);
      return { trait: traitId, name: ft.name, look, kind: "switch", seeds, lit: seeds.length > 0 };
    }
    const bins = (ft.bins || []).filter((bin) => traitState(fr, t, withLoci({ [ft.locus]: [bin, bin] })).shows === look);
    return { trait: traitId, name: ft.name, look, kind: "blend", bins, lit: bins.length > 0 };
  });
  return { species: id, pinned, lit: pinned.filter((p) => p.lit).map((p) => p.trait), of: pinned.length };
}

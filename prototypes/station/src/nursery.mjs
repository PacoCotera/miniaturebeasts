// The nursery's model (station step 5; the accepted walk-4 pictures 9a, 9b and 10): the shelf in rows by origin, the capsules and their three states. Pure functions of the save; no drawing, no words
// (the view puts the words from pods.json strings.nursery). Rules that change the save (Grow it, the hatch) are state.mjs's growPod and openBud.
//   A row is an ORIGIN, not a pod: pods of the same parents, or left by the same wild one, cannot be told apart before they hatch, so they stand together with one line of what is known and a count.
//   Found pods: one wild one = a kind at a place, brought by one crate (kind, place, crate). A pod of your own pair (p.parents, the two mibis' ids; made at step 8) is the pair. A shed pod is the returned one's line.
import * as S from "./state.mjs";
import { frameOf, traitState } from "./genome.mjs";
import { shapeOf, scalePlace, scaleEnds } from "./trait-shapes.mjs";

export const ORDERS = ["newest", "parents"];   // the pad changes the order; the rows that bring something new always come first

const living = (st) => st.mibis.filter((m) => !m.released);
// The origin of a pod, the one key its row is made by.
export function originKey(p) {
  if (Array.isArray(p.parents) && p.parents.length === 2) return "pair:" + p.parents.map((q) => q?.id ?? q).sort().join("+");
  if (p.shed != null) return "line:" + (p.of ?? p.shed);
  return "wild:" + S.speciesOf(p) + ":" + (p.g ?? "") + ":" + (p.n ?? 0);
}
// What is known of the parent, as the two kinds of look the pod can say: { word, trait, kind } for a set's look the parent shows, or a scale's end it stands near. Roughly (the Companion saw it from afar);
// greybox: read from the pod's own record until the Companion records what it saw (a [named gap] for the field, listed in the report). At most two, body traits first, in the kind's order.
export function knownWords(p, max = 2) {
  const fr = frameOf(S.speciesOf(p)), g = p.genome; if (!fr || !g) return [];
  const out = [];
  for (const ch of fr.chapters) for (const t of ch.traits) {
    if (t.nature === "doing" || out.length >= max * 4) continue;
    if (shapeOf(fr, t) === "scale") { const pl = scalePlace(fr, t, g), e = scaleEnds(t).ends; if (pl && (pl.shows <= 0.3 || pl.shows >= 0.7) && e[0]) out.push({ word: pl.shows <= 0.3 ? e[0] : e[1], trait: t.id, kind: "scale", at: pl.shows <= 0.3 ? 0 : 1 }); }
    else { const s = traitState(fr, t, g); if (s && s.shows) out.push({ word: s.shows, trait: t.id, kind: "set" }); }
  }
  // two words: one of each kind first (a scale and a set read better than two scales), then the rest in order
  const sc = out.filter((w) => w.kind === "scale"), se = out.filter((w) => w.kind === "set");
  return [sc[0], se[0], sc[1], se[1]].filter(Boolean).slice(0, max);
}
// Whether none of your living mibis of the kind shows a word (a gold "new to you").
export function newToYou(st, p, w) {
  const fr = frameOf(S.speciesOf(p)), t = fr?.chapters.flatMap((c) => c.traits).find((x) => x.id === w.trait); if (!t) return false;
  return !living(st).filter((m) => S.speciesOf(m) === S.speciesOf(p) && m.genome).some((m) => {
    if (w.kind === "set") return traitState(fr, t, m.genome)?.shows === w.word;
    const pl = scalePlace(fr, t, m.genome); return !!pl && Math.abs(pl.shows - w.at) <= 0.3;
  });
}
// The shelf: rows, the new ones first, then the order the pad chose. A row: { key, kind: wild | pair | line, species, place, count, ids, words: [{ word, trait, kind, isNew }], parents: [{ id, name }], isNew, newest, title }
export function shelfRows(st, order = "newest", only = null) {   // only: the row keys "Show the pods" on the board keeps (station step 9-1); null shows every row
  const by = new Map();
  st.tray.forEach((p, i) => {
    const key = originKey(p); let r = by.get(key);
    if (!r) by.set(key, r = { key, kind: key.split(":")[0], species: S.speciesOf(p), place: p.g ?? "", count: 0, ids: [], newest: -1, of: p.of ?? null, parents: [], pod: p });
    r.count++; r.ids.push(p.id); r.newest = i;
  });
  const rows = [...by.values()].map((r) => {
    const words = knownWords(r.pod).map((w) => ({ ...w, isNew: newToYou(st, r.pod, w) }));
    const parents = r.kind === "pair" ? r.pod.parents.map((q) => { const m = S.mibiById(st, q?.id ?? q); return { id: q?.id ?? q, name: m?.name ?? q?.name ?? "" }; }) : [];
    const kind = S.cap(S.spName(r.pod));
    const title = r.kind === "pair" ? parents.map((q) => S.cap(q.name)).join(" + ") : r.kind === "line" ? "Of " + S.cap(r.of ?? "a returned mibi") + "'s line" : kind + " · " + (S.PLACE_WORD[r.place] ?? "the wild");
    return { key: r.key, kind: r.kind, species: r.species, place: r.place, count: r.count, ids: r.ids, newest: r.newest, words, parents, isNew: words.some((w) => w.isNew), title, sample: r.pod.id };
  });
  const by2 = order === "parents" ? (a, b) => a.title.localeCompare(b.title) || b.newest - a.newest : (a, b) => b.newest - a.newest;
  return rows.filter((r) => !only || only.includes(r.key)).sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0) || by2(a, b));
}
// One capsule: { i, state: free | growing | ready | young, species, progress (0..1), left (minutes), mibi (id of a young waiting) }. Growing shows the same whether the Companion is here or away: it runs on the real clock.
export function capsuleOf(st, i, settings = S.DEFAULT_SETTINGS, now = Date.now()) {
  const c = st.caps[i];
  if (!c) return { i, state: "free", species: null, progress: 0, left: 0 };
  if (c.young) return { i, state: "young", species: null, progress: 1, left: 0, mibi: c.young };
  return S.withCapsule(st, i, () => { const ready = S.budReady(st, settings, now); return { i, state: ready ? "ready" : "growing", species: c.species, progress: ready ? 1 : S.budProgress(st, settings, now), left: ready ? 0 : S.budMinutesLeft(st, settings, now) }; });
}
export const capsulesOf = (st, settings, now) => st.caps.map((_, i) => capsuleOf(st, i, settings, now));
// How many pods wait on the shelf, how many capsules grow, how many are ready; and whether every capsule holds a waiting young (the nursery says so in one line).
export function summary(st, settings, now) {
  const cs = capsulesOf(st, settings, now);
  return { pods: st.tray.length, growing: cs.filter((c) => c.state === "growing").length, ready: cs.filter((c) => c.state === "ready").length, free: cs.filter((c) => c.state === "free").length, young: cs.filter((c) => c.state === "young").length, allYoung: cs.every((c) => c.state === "young") };
}
// The soonest a growing capsule is ready, in minutes (the idle line and the nursery's words), or null.
export const soonest = (st, settings, now) => { const g = capsulesOf(st, settings, now).filter((c) => c.state === "growing"); return g.length ? Math.min(...g.map((c) => c.left)) : null; };
export const readyCount = (st, settings, now) => capsulesOf(st, settings, now).filter((c) => c.state === "ready").length;

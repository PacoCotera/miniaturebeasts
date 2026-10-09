// The splice's data (station-layouts.md "Cross: the splice"; prototypes/ui/specs/station/cross.json): for each locus of a trait that is open to both parents, the two copies each
// parent carries (which one it hides), the four pairings or the range the child can land in, and the words the player reads on a copy. Pure: derived from two genomes by the
// framework's own forecast, one pseudo-trait per locus. It is called by forecastOf only for a trait whose chapter both parents have read, so nothing here can name an unread copy.
import { forecast as crossForecast, hiddenCopy } from "../../workbench/framework/cross.mjs";
import { LOCI, isContinuous, binFor, valueRange } from "../../workbench/framework/catalogue.mjs";
import { lookOf } from "../../workbench/framework/describe.mjs";

// One pseudo-trait per locus, so the framework's forecast (which gives a trait's lead locus) gives every locus its own outcome.
const perLocus = (fr) => ({ ...fr, chapters: fr.chapters.map((ch) => ({ ...ch, traits: ch.traits.flatMap((t) => t.loci.filter((id) => LOCI.has(id)).map((id) => ({ id, name: id, loci: [id] }))) })) });

// What every locus of the frame would do for this pair: { id, kind, a, b, hides, play, seeds | parents, range, range0, bins, firm }. `opts`: { kinship, lookup }.
export function lociOf(fr, ga, gb, opts = {}) {
  const full = crossForecast(perLocus(fr), ga, gb, opts), plain = crossForecast(perLocus(fr), ga, gb, { ...opts, kinship: 0 }), none = new Map(plain.traits.map((t) => [t.trait, t])), out = new Map();
  for (const t of full.traits) {
    if (t.kind === "sealed") continue;
    const id = t.trait, locus = LOCI.get(id), a = ga.loci[id], b = gb.loci[id]; if (!a || !b) continue;
    const hide = (pair) => { const h = hiddenCopy(locus, pair); return h === null ? [false, false] : [pair[0] === h, pair[0] !== h]; };
    if (t.kind === "switch") {
      const looks = new Set(t.seeds.map((s) => JSON.stringify(s.look)));
      out.set(id, { id, kind: "switch", a: [...a], b: [...b], hides: { a: hide(a), b: hide(b) }, play: looks.size > 1, seeds: t.seeds, looks: t.looks, firm: t.firm });
    } else {
      const bins = t.bins, r0 = none.get(id)?.range ?? t.range;
      out.set(id, { id, kind: "blend", a: [...a], b: [...b], hides: { a: [false, false], b: [false, false] }, play: bins.length > 1, parents: t.parents, range: t.range, range0: r0, bins, catalogue: valueRange(locus), narrowed: Math.abs((r0[1] - r0[0]) - (t.range[1] - t.range[0])) });
    }
  }
  return out;
}

// The words a parent's copy of a trait is read in: describe.lookOf on that copy alone (the trait's lead locus homozygous for it, the rest as the parent has them), as Create's rolls are.
export function copyWords(fr, trait, genome) {
  const lead = trait.loci[0], raw = genome.loci[lead]; if (!raw) return [null, null];
  return raw.map((c) => { const g = structuredClone(genome); g.loci[lead] = [c, c]; return lookOf(fr, trait, g); });
}
// Which of a parent's two copies of the trait's lead locus it hides (the copy the pair does not show).
export function copyHides(trait, genome) {
  const lead = trait.loci[0], locus = LOCI.get(lead), raw = genome.loci[lead]; if (!locus || !raw || isContinuous(locus)) return [false, false];
  const h = hiddenCopy(locus, raw); if (h === null) return [false, false];
  const i = raw.findIndex((c) => c === h); return [i === 0, i === 1];
}
export { binFor };

// Four slots from the seeds' weights (largest remainder), so a narrowed pairing shows as more seeds wearing the hidden look: quarters, never odds.
export function fourSlots(seeds) {
  const n = 4, raw = seeds.map((s) => s.weight * n), base = raw.map(Math.floor); let left = n - base.reduce((x, y) => x + y, 0);
  const order = raw.map((v, i) => [v - base[i], i]).sort((p, q) => q[0] - p[0]); for (let k = 0; k < order.length && left > 0; k++, left--) base[order[k][1]]++;
  const out = []; seeds.forEach((s, i) => { for (let k = 0; k < base[i]; k++) out.push(s); }); return out.slice(0, 4);
}

// How many loci a trait (or a whole chapter) has in this frame: a row each on the splice.
export const traitLocusCount = (fr, traitId) => (fr.chapters.flatMap((c) => c.traits).find((t) => t.id === traitId)?.loci ?? []).filter((id) => LOCI.has(id)).length;
export const chapterLocusCount = (fr, chapterId) => (fr.chapters.find((c) => c.id === chapterId)?.traits ?? []).reduce((n, t) => n + t.loci.filter((id) => LOCI.has(id)).length, 0);

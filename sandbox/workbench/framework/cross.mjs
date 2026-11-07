// The cross: how two mibis make a child (design/proposals/the-cross.md, decided 2026-10-08).
//
// Every heritable locus is crossed on its own, with no linkage between traits, and nothing else is:
//   - a switch locus (a part switch, a pair map, a pigment pair, any look that is not a blend) takes
//     one copy from each parent at random; which look shows follows the catalogue's operator, the
//     other copy hides and can be passed on; the sleeping parts (the marking loci behind their
//     switch) are crossed the same way whether or not their switch is on, and ride with it;
//   - a continuous locus (every ratio and rate: copy-mean) blends: the child's shown value is drawn
//     between the parents' shown values and nudged by a spread of up to 10 percent of the locus
//     range either way, clamped to the catalogue range and the species pool, and stored on the blend
//     step (catalogue.mjs BLEND_STEPS: the nearest step inside the pool), so the stamp holds it
//     exactly; both copies equal the drawn value (a blend hides nothing), so a copy is a number and
//     the named alleles are its bins;
//   - a locked locus is identical in both parents and never crossed; a parent whose locked pair
//     differs is not this species and is refused.
// An individual is compared by its id, never by its genome: two mibis whose genomes are equal are two
// mibis. The cross, the forecast and kinship take either an individual record { id, genome, parents }
// (parents: the parents' records or snapshots with their ids, or their ids) or a bare genome; a bare
// genome is its own individual (the object), and in kinship it is named by its pedigree name (the
// digest it was born with: pedigreeName) because a bare genome's recorded parents are digests.
// Relatedness is pedigree kinship from recorded parents (by id for records, walked three
// generations deep through a lookup by id; by origin.parents digests for bare genomes), a wild
// founder unrelated to every other founder; where a parent is unknown that side counts as a founder,
// and genome identity (the share of open loci where the pairs match, blends by bin) is the fallback
// picture, never a penalty.
// The inbreeding penalty is B with A: at each switch locus where the child would carry one hidden
// copy, with chance 2 × kinship it takes that hidden copy twice (what hides, surfaces); and the
// blend's spread and draw narrow by (1 − 4 × kinship), so a line folded back on itself averages
// itself. The dials (spread, penalty form none | A | B | C | AB, strength) are there so the forms can
// be looked at side by side; the decided one is AB at strength 1.
// Direct kin never cross (owner, 2026-11-03): a parent, grandparent or great-grandparent with its line, and two
// children of the same pair; see directKin. Half kin, cousins and anything further cross with the penalty.
// The forecast shows quarters for switches (the four pairings of the parents' copies, resolved) and
// a range for blends (the parents' shown values widened by the spread, clamped, as bins), never a
// promise; a trait where both parents hold the same copies is known for sure before any read.
import { LOCI, resolveCopies, isContinuous, copyValue, binFor, valueRange, quantize, offStepEnds, samePair } from "./catalogue.mjs";
import { genomeDigest, frameVersionOf, buildIndividual, FRAME_VERSION } from "./species.mjs";
import { isDoing } from "./guards.mjs";
import { resolveIndividual } from "./resolve.mjs";

export const SPREAD = 0.10;                     // the nudge: up to this share of the locus range either way (decided)
export const PENALTY = "AB";                    // the decided form: B (what hides surfaces) with A (the narrowing spread)
export const KINSHIP_DEPTH = 3;                 // generations walked for pedigree kinship

const round6 = (v) => Math.round(v * 1e6) / 1e6;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const same = (p, q) => JSON.stringify([...p].sort()) === JSON.stringify([...q].sort());

// An individual record or a bare genome: its genome, and its id (a bare genome has none).
export const genomeOf = (x) => (x && x.loci ? x : x?.genome ?? null);
export const idOf = (x) => (x && !x.loci && x.id != null ? x.id : null);
// The digest a genome was born with: its own, or for a genome whose blends were moved onto the step
// after its birth (quantizeGenome, station/src/genome.mjs), the one recorded then; its children's
// origin.parents name it by this, so a pedigree walked by digest stays whole across that move.
export const pedigreeName = (g) => g.origin?.was?.digest ?? genomeDigest(g);

// The shown value of a continuous locus for a genome: the mean of its two copies (names or numbers).
export const shownValue = (locus, copies) => resolveCopies(locus, copies);

// The pool's value range for an open continuous locus of a frame, within the catalogue's.
export function blendRange(frame, l) {
  const locus = LOCI.get(l.id);
  const [plo, phi] = valueRange(locus, l.alleles), [clo, chi] = valueRange(locus);
  return [Math.max(plo, clo), Math.min(phi, chi)];
}

// Which copy of a pair hides, by the operator's own rule: the copy whose homozygous look is not the
// pair's look. Null when the pair shows both (a pigment pair, a blend) or the copies are equal.
export function hiddenCopy(locus, pair) {
  const [x, y] = pair;
  if (x === y || isContinuous(locus)) return null;
  const look = JSON.stringify(resolveCopies(locus, pair));
  if (look === JSON.stringify(resolveCopies(locus, [x, x]))) return y;
  if (look === JSON.stringify(resolveCopies(locus, [y, y]))) return x;
  return null;
}

// --- relatedness ------------------------------------------------------------------------------------
// Pedigree kinship from recorded parents. `lookup(digest)` returns the parent's genome or null (an
// unknown parent counts as a wild founder). The coefficient of kinship: φ(x, y) = ½(φ(p, y) + φ(q, y))
// for the parents p, q of x; φ(x, x) = ½(1 + φ(p, q)); founders unrelated. Walked `depth` generations.
// For records, `lookup(id)` returns the parent's record (else the snapshot the child holds is used);
// for bare genomes, `lookup(digest)` returns the parent's genome. An individual is one with itself by
// id (a record) or by pedigree name (a bare genome), never because two genomes are equal.
// The parents of an individual, in order, as links { key, node }: key names the parent as kinship and
// directKin do (id:<id> for a record, g:<pedigree name> for a bare genome; null when unknown), node is
// the parent's record or genome (a snapshot the child holds when the record is gone, else null).
// Sources: x.parents (records or snapshots with ids, or ids), else origin.parentIds (a shed pod's
// [A, A]), else for a bare genome origin.parents (digests).
function parentLinks(x, lookup) {
  if (idOf(x) != null) {
    const ps = x.parents ?? genomeOf(x)?.origin?.parentIds ?? [];
    return ps.map((p) => {
      if (p == null) return { key: null, node: null };
      const id = typeof p === "object" ? p.id : p;
      if (id == null) return { key: null, node: null };
      const found = lookup(id);
      return { key: `id:${id}`, node: found ?? (typeof p === "object" ? p : null) };
    });
  }
  return (genomeOf(x).origin?.parents ?? []).map((d) => (d == null ? { key: null, node: null } : { key: `g:${d}`, node: lookup(d) }));
}
const keyOf = (x) => (idOf(x) != null ? `id:${idOf(x)}` : `g:${pedigreeName(genomeOf(x))}`);

// Direct kin: either is in the other's line within `depth` generations, or both record the same two
// parents. Returns null, or { rel, by }: rel is what y is to x ("parent" | "grandparent" |
// "great-grandparent" | "child" | "grandchild" | "great-grandchild" | "same-parents"), by names the
// link. A parent counts by its recorded id even when its record is gone (its own parents unknown, so
// the walk stops there); a missing parent matches nothing; a genome is never compared.
const LINE = ["parent", "grandparent", "great-grandparent"];
export function directKin(x, y, lookup = () => null, depth = KINSHIP_DEPTH) {
  const ancestors = (z) => {
    const out = new Map();
    const walk = (n, g) => {
      for (const { key, node } of parentLinks(n, lookup)) {
        if (key != null && !out.has(key)) out.set(key, g);
        if (node && g < depth) walk(node, g + 1);
      }
    };
    walk(z, 1);
    return out;
  };
  const kx = keyOf(x), ky = keyOf(y);
  const ax = ancestors(x), ay = ancestors(y);
  if (ax.has(ky)) return { rel: LINE[ax.get(ky) - 1], by: ky };
  if (ay.has(kx)) return { rel: LINE[ay.get(kx) - 1].replace("parent", "child"), by: kx };
  const px = parentLinks(x, lookup).map((l) => l.key), py = parentLinks(y, lookup).map((l) => l.key);
  if (px.length === 2 && py.length === 2 && px.every((k) => k != null) && py.every((k) => k != null) && same(px, py)) return { rel: "same-parents", by: [...px].sort().join("|") };
  return null;
}

export function kinship(a, b, lookup = () => null, depth = KINSHIP_DEPTH) {
  const memo = new Map();
  const id = keyOf;
  const parentsOf = (x, d) => (d <= 0 ? [] : parentLinks(x, lookup).map((l) => l.node).filter(Boolean));
  const phi = (x, y, dx, dy) => {
    const kx = id(x), ky = id(y), key = kx < ky ? `${kx}|${ky}|${dx}|${dy}` : `${ky}|${kx}|${dy}|${dx}`;
    if (memo.has(key)) return memo.get(key);
    let v;
    if (kx === ky) { const [p, q] = parentsOf(x, dx); v = 0.5 * (1 + (p && q ? phi(p, q, dx - 1, dx - 1) : 0)); }
    else {
      // recurse on the one with known parents (the younger side first when both have)
      const px = parentsOf(x, dx), py = parentsOf(y, dy);
      if (px.length === 2) v = 0.5 * (phi(px[0], y, dx - 1, dy) + phi(px[1], y, dx - 1, dy));
      else if (py.length === 2) v = 0.5 * (phi(py[0], x, dy - 1, dx) + phi(py[1], x, dy - 1, dx));
      else v = 0;
    }
    memo.set(key, v);
    return v;
  };
  return phi(a, b, depth, depth);
}
// Genome identity: the share of open loci where the two carry the same copy pair, blends by bin.
export function identity(frame, x, y) {
  const a = genomeOf(x), b = genomeOf(y);
  const open = frame.loci.filter((l) => l.kind !== "locked");
  if (!open.length) return 1;
  let n = 0;
  for (const l of open) { const locus = LOCI.get(l.id); if (same(a.loci[l.id].map((c) => binFor(locus, c)), b.loci[l.id].map((c) => binFor(locus, c)))) n++; }
  return n / open.length;
}
// Both measures, and whether the pedigree is known on both sides (else identity is the caution).
export function relatedness(frame, a, b, lookup = () => null) {
  // A cross child's or a shed pod's pedigree is known only when every recorded parent resolves.
  const known = (x) => { const g = genomeOf(x); if (g.origin?.kind !== "cross" && g.origin?.kind !== "shed") return true; if (idOf(x) != null && x.parents) return x.parents.length === 2 && x.parents.every((p) => (p != null && typeof p === "object" ? p.id != null : lookup(p))); return (g.origin.parents ?? []).every((p) => lookup(p)); };
  return { kinship: kinship(a, b, lookup), identity: identity(frame, a, b), pedigreeKnown: known(a) && known(b) };
}

// --- the cross ----------------------------------------------------------------------------------------
// The same individual (by id; a bare genome is its own individual) is not a pair; two individuals
// whose genomes are equal are. A locked pair is compared in either order (samePair, as checkGenome).
// Two mibi born on different frame versions of a species are not crossed (their genomes carry different loci, and a frame change is not an upgrade of the older one): a plain refusal that
// names the versions. So is a genome that lacks a locus the frame carries (a copy is never invented), whatever its version; it never reaches the draw.
const versionOf = (g) => g.frameVersion ?? FRAME_VERSION;
function missingLoci(frame, g) { return frame.loci.filter((l) => !Array.isArray(g.loci?.[l.id]) || g.loci[l.id].length !== 2).map((l) => l.id); }
function refuseMissing(frame, g, who) {
  const missing = missingLoci(frame, g);
  if (missing.length) throw new Error(`${frame.species.name} ${who} was born on frame version ${versionOf(g)}, which lacks ${missing.length === 1 ? missing[0] : `${missing.length} loci (${missing.slice(0, 3).join(", ")}${missing.length > 3 ? ", ..." : ""})`} of version ${frameVersionOf(frame)}: it cannot be bred with this frame`);
}
export const versionRefusal = (frame, a, b) => (versionOf(a) !== versionOf(b) ? `${frame.species.name} born on frame version ${versionOf(a)} cannot be crossed with one born on version ${versionOf(b)}: a cross needs two of the same version` : null);
function refuse(frame, x, y, lookup = () => null) {
  const a = genomeOf(x), b = genomeOf(y);
  if (a.species !== frame.species.id || b.species !== frame.species.id) throw new Error("a cross needs two of the same species");
  const split = versionRefusal(frame, a, b); if (split) throw new Error(split);
  refuseMissing(frame, a, "the first parent"); refuseMissing(frame, b, "the second parent");
  if (x === y || (idOf(x) != null && idOf(x) === idOf(y)) || (idOf(x) == null && idOf(y) == null && a === b)) throw new Error("one mibi is not a pair");
  for (const l of frame.loci) if (l.kind === "locked" && (!samePair(a.loci[l.id], l.copies) || !samePair(b.loci[l.id], l.copies))) throw new Error(`${l.id}: a parent's locked copy differs from the frame (not this species)`);
  const kin = directKin(x, y, lookup);
  if (kin) throw new Error(`direct kin (${kin.rel}): family does not cross`);
}

// One child. opts: rng (a function in [0, 1)), spread (share of the range), penalty (none | A | B | C
// | AB), strength (scales the penalty, 1 = as decided), kinship (a number, else computed from
// `lookup`), lookup (digest → genome, for the pedigree).
export function cross(frame, x, y, opts = {}) {
  const { spread = SPREAD, penalty = PENALTY, strength = 1, lookup = () => null } = opts;
  refuse(frame, x, y, lookup);
  const a = genomeOf(x), b = genomeOf(y);
  const k = clamp(opts.kinship ?? kinship(x, y, lookup), 0, 0.5);
  const loci = drawLoci(frame, a, b, k, opts);
  return { schema: "mb-genome/2", species: frame.species.id, frameVersion: frameVersionOf(frame), loci, origin: { kind: "cross", parents: [genomeDigest(a), genomeDigest(b)], ...(idOf(x) != null && idOf(y) != null ? { parentIds: [idOf(x), idOf(y)] } : {}), kinship: round6(k), spread, penalty, strength } };
}

// The child's copies from two parents' genomes at kinship k (the cross's draw, and the shed pod's).
function drawLoci(frame, a, b, k, opts) {
  const { rng = Math.random, spread = SPREAD, penalty = PENALTY, strength = 1 } = opts;
  const narrow = penalty.includes("A") ? Math.max(0, 1 - 4 * k * strength) : 1;
  const surface = penalty.includes("B") ? clamp(2 * k * strength, 0, 1) : 0;
  const weaken = penalty.includes("C") ? clamp(k * strength, 0, 1) : 0;
  const loci = {};
  for (const l of frame.loci) {
    if (l.kind === "locked") { loci[l.id] = [...l.copies]; continue; }
    const locus = LOCI.get(l.id);
    if (isContinuous(locus)) {
      const va = shownValue(locus, a.loci[l.id]), vb = shownValue(locus, b.loci[l.id]);
      const [lo, hi] = blendRange(frame, l), [clo, chi] = valueRange(locus);
      const mid = (va + vb) / 2;
      let v = mid + (rng() - 0.5) * (vb - va) * narrow + (rng() * 2 - 1) * spread * (chi - clo) * narrow;
      if (weaken && isDoing(l.id)) v -= weaken * (v - lo); // C: a doing moves toward its weak end, the low end of the pool
      v = quantize(locus, clamp(v, lo, hi), [lo, hi]); // on the blend step, inside the pool
      const end = offStepEnds(locus, [lo, hi]).includes(v) ? l.alleles.find((id) => copyValue(locus, id) === v) : undefined;
      loci[l.id] = end ? [end, end] : [v, v]; // a copy landed on a pool's off-step end is that allele, by name
      continue;
    }
    const pair = [a.loci[l.id][rng() < 0.5 ? 0 : 1], b.loci[l.id][rng() < 0.5 ? 0 : 1]];
    const hidden = hiddenCopy(locus, pair);
    loci[l.id] = hidden !== null && surface > 0 && rng() < surface ? [hidden, hidden] : pair;
  }
  return loci;
}

// --- the shed pod -----------------------------------------------------------------------------------
// A returned mibi's place sheds one pod of its line (design/game.md, the vivarium; agreed by game design
// and the genome engineer, 2026-10-17, option b′): a cross of the mibi with itself, drawn by the pod's
// seeded stream. cross(m, m) stays refused; this is the one way a single parent makes a pod.
// SELF_KINSHIP is a game rule, not a genetics claim: a mibi with itself has kinship 1/2, and at that
// kinship the decided penalty copies every blend exactly and surfaces every hidden copy, so the pod is
// often its parent again (measured: 2–100% of draws by species). The draw uses 1/8 (half kin),
// under which hidden looks still surface; the record keeps the true pedigree (parents [m, m]), so any
// later cross with its relatives is penalised from the recorded line.
// The child is redrawn from the same stream while it equals its parent (a clone never comes out) or its
// body does not build (a pod always holds a mibi that can grow); after SHED_TRIES there is no pod (null).
// No mutation: every copy is one of the parent's. A self-changing mark is never carried (it is not in
// the genome). Born on the frame's current version (frameVersionOf), as a cross child is; a parent on an
// older version sheds as it crosses: its copies are legal under the current frame (a legacy copy included).
export const SELF_KINSHIP = 1 / 8;
export const SHED_TRIES = 24;
export function shedPod(frame, x, opts = {}) {
  const { rng = Math.random, spread = SPREAD, penalty = PENALTY, strength = 1, kinship = SELF_KINSHIP } = opts;
  const a = genomeOf(x);
  if (a.species !== frame.species.id) throw new Error("a shed pod is of its parent's species");
  refuseMissing(frame, a, "the parent");
  for (const l of frame.loci) if (l.kind === "locked" && !samePair(a.loci[l.id], l.copies)) throw new Error(`${l.id}: the parent's locked copy differs from the frame (not this species)`);
  const parentKey = valuesKey(frame, a), d = genomeDigest(a), id = idOf(x);
  for (let i = 0; i < SHED_TRIES; i++) {
    const loci = drawLoci(frame, a, a, kinship, { rng, spread, penalty, strength });
    const g = { schema: "mb-genome/2", species: frame.species.id, frameVersion: frameVersionOf(frame), loci, origin: { kind: "shed", parents: [d, d], ...(id != null ? { parentIds: [id, id] } : {}), kinship: round6(kinship), spread, penalty, strength } };
    if (valuesKey(frame, g) === parentKey) continue;
    try { if (buildIndividual(frame, g).validation.status === "valid") return g; } catch { /* a body that cannot be built: the next draw */ }
  }
  return null;
}
// A genome's copies as values, each pair sorted: two genomes with the same key are the same mibi
// whether a copy is written as an allele name or as its number on the step.
function valuesKey(frame, g) {
  return JSON.stringify(frame.loci.map((l) => { const locus = LOCI.get(l.id); return g.loci[l.id].map((c) => (isContinuous(locus) ? round6(copyValue(locus, c)) : c)).map(String).sort(); }));
}

// N children, each built and validated whole against its frame; a child that cannot be built never
// exists (the cross is not re-rolled), and the rejections are counted.
export function children(frame, a, b, n, opts = {}) {
  const out = [], rejected = [];
  for (let i = 0; i < n; i++) {
    const g = cross(frame, a, b, opts);
    const built = buildIndividual(frame, g);
    if (built.validation.status === "valid") out.push({ genome: g, built });
    else rejected.push({ genome: g, problems: built.validation.problems });
  }
  return { children: out, rejected, rejectionRate: n ? rejected.length / n : 0 };
}

// --- the forecast -------------------------------------------------------------------------------------
// Per trait of the frame: for a switch trait the four seeds (the pairings of the mother's copies
// against the father's at the trait's switch locus, resolved, with the sleeping copies that would
// wake in each) and the exact chance of each look under the penalty; for a blend the range the
// child can land in, as values and as bins; `firm` when every locus of the trait is certain (the
// chapters a child is known in at birth); `sure` when the look the child shows is certain whatever it
// hides or sleeps: one look at weight 1 for a switch, one bin for a blend (never for a sealed trait).
// A sleeping record (one the frame marks `sleeping`: it sleeps by its owner switch or by a look, `wakesWhen`) is still in its trait, crossed like any other, and the forecast says so:
// `asleep` maps each such record of the trait to whether it sleeps in [the mother, the father] as they stand, so the breeder sees a sleeping record as carried, not as missing.
export function forecast(frame, x, y, opts = {}) {
  const { spread = SPREAD, penalty = PENALTY, strength = 1, lookup = () => null } = opts;
  const a = genomeOf(x), b = genomeOf(y);
  const split = versionRefusal(frame, a, b); if (split) throw new Error(split);
  refuseMissing(frame, a, "the first parent"); refuseMissing(frame, b, "the second parent");
  const kin = directKin(x, y, lookup);
  if (kin) throw new Error(`direct kin (${kin.rel}): family does not cross`);
  const k = clamp(opts.kinship ?? kinship(x, y, lookup), 0, 0.5);
  const narrow = penalty.includes("A") ? Math.max(0, 1 - 4 * k * strength) : 1;
  const surface = penalty.includes("B") ? clamp(2 * k * strength, 0, 1) : 0;
  const traits = [];
  const asleepIn = (g) => Object.fromEntries(resolveIndividual(frame, g).facts.map((f) => [f.id, f.state === "asleep"]));
  let sleepA = null, sleepB = null;
  const asleepOf = (t) => {
    const ids = t.loci.filter((id) => frame.loci.find((l) => l.id === id)?.kind === "sleeping");
    if (!ids.length) return {};
    sleepA ??= asleepIn(a); sleepB ??= asleepIn(b);
    return { asleep: Object.fromEntries(ids.map((id) => [id, [sleepA[id], sleepB[id]]])) };
  };
  for (const ch of frame.chapters) for (const t of ch.traits) {
    const lead = t.loci.find((id) => !isContinuous(LOCI.get(id))) ?? t.loci[0];
    const locus = LOCI.get(lead), row = frame.loci.find((l) => l.id === lead);
    const base = { chapter: ch.id, trait: t.id, name: t.name, sealed: !!ch.sealed, locus: lead };
    if (ch.sealed) { traits.push({ ...base, kind: "sealed", sure: false }); continue; }
    if (isContinuous(locus)) {
      const va = shownValue(locus, a.loci[lead]), vb = shownValue(locus, b.loci[lead]);
      const [lo, hi] = blendRange(frame, row), [clo, chi] = valueRange(locus);
      const w = spread * (chi - clo) * narrow, mid = (va + vb) / 2, half = Math.abs(vb - va) / 2 * narrow;
      const range = [quantize(locus, clamp(mid - half - w, lo, hi), [lo, hi]), quantize(locus, clamp(mid + half + w, lo, hi), [lo, hi])]; // on the step, as the child is
      const bins = [...new Set([binFor(locus, range[0]), binFor(locus, (range[0] + range[1]) / 2), binFor(locus, range[1])])];
      traits.push({ ...base, kind: "blend", parents: [round6(va), round6(vb)], range, bins, firm: false, sure: bins.length === 1, ...asleepOf(t) });
      continue;
    }
    // the four pairings, each a quarter; under B a carrier pairing turns homozygous hidden with chance 2k
    const seeds = [];
    for (const x of a.loci[lead]) for (const y of b.loci[lead]) {
      const pair = [x, y], hidden = hiddenCopy(locus, pair);
      const pairs = hidden !== null && surface > 0 ? [[pair, 0.25 * (1 - surface)], [[hidden, hidden], 0.25 * surface]] : [[pair, 0.25]];
      for (const [p, w] of pairs) seeds.push({ copies: p, look: resolveCopies(locus, p), label: lookLabel(locus, p), weight: w, hides: hiddenCopy(locus, p) });
    }
    const looks = {};
    for (const s of seeds) looks[s.label] = round6((looks[s.label] ?? 0) + s.weight);
    // firm (known before any read) only when every locus of the trait is certain: the lead and every
    // sleeping locus held as the same two equal copies by both parents (a blend is never certain)
    const firm = t.loci.every((id) => {
      const r = frame.loci.find((l) => l.id === id);
      if (r?.kind === "locked") return true;
      const p = a.loci[id], q = b.loci[id];
      return !!p && !!q && !isContinuous(LOCI.get(id)) && same(p, q) && p[0] === p[1];
    });
    // the sleeping parts ride with the switch: what each seed would wear comes from the other loci of the trait
    const sleeping = t.loci.filter((id) => id !== lead);
    traits.push({ ...base, kind: "switch", seeds, looks, firm, sure: Object.keys(looks).length === 1, sleeping, ...asleepOf(t) });
  }
  return { kinship: round6(k), spread, penalty, strength, traits };
}

export function lookLabel(locus, pair) {
  const [x, y] = pair, v = resolveCopies(locus, pair);
  if (locus.operator === "partition-map") return x === y ? x : [x, y].sort().join(" and ");
  if (locus.operator === "pair-map") return typeof v === "boolean" ? (v ? "on" : "off") : String(v);
  if (typeof v === "boolean") return v ? "on" : "off";
  return x === y ? x : [x, y].sort().join("/");
}

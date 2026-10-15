// The Station's genome bridge: nothing here is a genome model of the Station's own. The frames come
// from the workbench registry (../workbench/frames/*.json), individuals from the workbench framework
// (species.mjs), looks in words from describe.mjs, the stamp from the genome stamp's codec. The
// Station page fetches the frames beside it (the sandbox publishes prototypes/* side by side); the
// tests read them from disk and call setFrames.
import { LOCI, resolveCopies, isContinuous, quantize, valueRange } from "../../workbench/framework/catalogue.mjs";
import { rng, sampleIndividual, shapeTrait, checkGenome, buildIndividual, genomeDigest, FRAME_VERSION } from "../../workbench/framework/species.mjs";
import { lookOf } from "../../workbench/framework/describe.mjs";
import { cross, forecast, kinship, relatedness, identity, SPREAD, blendRange } from "../../workbench/framework/cross.mjs";
import { frameFor as stampFrameFor } from "../../genome-stamp/src/frames.mjs";
import { sizeFor as stampSizeFor } from "../../genome-stamp/src/codec.mjs";
import { stampCode as stampCodeOf, decodeStampCode } from "../../genome-stamp/src/codec.mjs";

export { genomeDigest, checkGenome, buildIndividual, shapeTrait, cross, forecast, kinship, relatedness, identity, SPREAD, decodeStampCode };

// The Companion page's species indexes: 0 is S01 Loika, 1 is S03 Tuikis, 2 is S02 Untuva (station-build.md §2.2).
export const SP_INDEX = ["S01", "S03", "S02"];
export const speciesIndex = (id) => SP_INDEX.indexOf(id);           // -1 for a species the Companion does not carry
export const speciesId = (index) => SP_INDEX[index] ?? null;

const FRAMES = new Map();
export function setFrames(list) { FRAMES.clear(); for (const f of list) FRAMES.set(f.species.id, f); }
export const frameOf = (id) => FRAMES.get(id) ?? null;
export const frameIds = () => [...FRAMES.keys()].sort();
export const framesLoaded = () => FRAMES.size > 0;

// A pod's genome from its genome seed: sampled from the species' pools with the workbench's own stream,
// and resampled from the same stream until the body builds, so a pod keeps its identity across loads.
export function podGenome(frame, gs) {
  const r = rng(`pod:${frame.species.id}:${gs >>> 0}`);
  let g = null;
  for (let i = 0; i < 24; i++) {
    g = sampleIndividual(frame, r, { kind: "pod", seed: gs >>> 0 });
    if (checkGenome(frame, g).length) continue;
    try { if (buildIndividual(frame, g).validation.status === "valid") return g; } catch { /* the next draw */ }
  }
  return g;
}
export const chapters = (frame) => frame.chapters;
export const chapterOf = (frame, id) => frame.chapters.find((c) => c.id === id) ?? null;
export const traitOf = (frame, id) => frame.chapters.flatMap((c) => c.traits).find((t) => t.id === id) ?? null;
export const traitCount = (chapter) => chapter.traits.length;
// What a chapter needs to be read: nothing, or the find that opens it (a sealed chapter).
export const chapterSeal = (frame, chapter) => (chapter.sealed ? chapter.opensWith ?? frame.sealed?.[chapter.id] ?? "a find" : null);

// A trait as the player reads it (research-loop.md §4): X, X · hides Y, only X, asleep, A to B for a blend,
// breed to change (a doing), and for a blended trait the two halves it carries.
// Read states are memoised per genome object (a pod's genome is never edited in place; a changed genome is a new object): the screen asks every frame.
const MEMO = new WeakMap();
const memo = (genome, key, fn) => { let m = MEMO.get(genome); if (!m) MEMO.set(genome, (m = new Map())); if (!m.has(key)) m.set(key, fn()); return m.get(key); };
export const traitState = (frame, trait, genome) => memo(genome, "t:" + frame.species.id + ":" + trait.id, () => traitStateOf(frame, trait, genome));
// The Pods line stays within six words (trait-names.md §2): a pair of colours is written with a comma, no leading "shows" on a hides line, a blend is "A to B", no apology on an asleep line.
const LINE_LOOKS = { pairSep: ", " };
function traitStateOf(frame, trait, genome) {
  const shows = lookOf(frame, trait, genome, LINE_LOOKS);
  const a = lookOf(frame, trait, shapeTrait(frame, genome, trait.id, 1), LINE_LOOKS);
  const b = lookOf(frame, trait, shapeTrait(frame, genome, trait.id, 2), LINE_LOOKS);
  const doing = trait.nature === "doing";
  const first = trait.loci[0], row = frame.loci.find((l) => l.id === first), locus = LOCI.get(first);
  let asleep = null;
  if (row?.switch && trait.loci.length > 1 && locus && resolveCopies(locus, genome.loci[first]) === false) {
    const layout = trait.loci.slice(1).map((id) => genome.loci[id]).find((c) => c && typeof c[0] === "string");
    asleep = layout ? [...new Set(layout)].join(" or ") : "what they carry";
  }
  const carried = [...new Set([shows, a, b].filter(Boolean))];
  let kind, hides = null, line;
  if (a === b) { kind = "only"; line = `only ${shows}`; }
  else if (shows === a || shows === b) { kind = "hides"; hides = shows === a ? b : a; line = `${shows} · hides ${hides}`; }
  else { kind = "blend"; line = `${a} to ${b}`; }
  if (asleep) { kind = "asleep"; line = `${shows} · asleep: ${asleep}`; }
  // hiddenChoice: the shapeTrait choice (1: only the first copy, 2: only the second) that shows the hidden look
  return { id: trait.id, name: trait.name, shows, hides, halves: kind === "blend" ? [a, b] : null, hiddenChoice: hides == null ? null : shows === a ? 2 : 1, kind, doing, shapeable: !!trait.shapeable && !doing, asleep, carried, line,
    sub: doing ? "breed to change" : kind === "blend" ? line : null };
}
// Every look a pod carries in a chapter (shows and hides of each trait), for the field guide and the glint.
export const chapterLooks = (frame, chapter, genome) => memo(genome, "c:" + frame.species.id + ":" + chapter.id, () => chapterLooksOf(frame, chapter, genome));
function chapterLooksOf(frame, chapter, genome) {
  return chapter.traits.map((t) => [t.id, traitState(frame, t, genome).carried]);
}

// --- the stamp (genome-stamp/src): the registry's frame for this species, the genome as copies, the read chapters by name ---
// The stamp's modules a side (N): the cell of its label is floor(104 / (N + 2)), at least 2 (station-layouts.md, the stamp label).
export const stampModules = (frame, genome = null) => { const sf = stampFrameOf(frame, genome); return sf ? stampSizeFor(sf).N : 0; };
export const stampSizing = (frame, genome = null) => { const N = stampModules(frame, genome), cell = Math.max(2, Math.floor(104 / (N + 2))); return { N, cell, size: (N + 2) * cell }; };
// A mibi or pod keeps the frame version it was born with (the same individual everywhere, on paper too): the genome's own, then the frame's, then the current one.
export const stampFrameOf = (frame, genome = null) => stampFrameFor(frame.species.order, genome?.frameVersion ?? frame.frameVersion ?? FRAME_VERSION);
// The stamp's genome: every heritable copy as the genome holds it (blends on the step: quantizeGenome),
// and the chapters read (a sealed chapter only once it is opened and read: a shut one is never read). A genome
// missing a heritable locus is refused, naming the missing loci: a copy is never invented.
export function stampGenome(frame, genome, readIds) {
  const sf = stampFrameOf(frame, genome);
  if (!sf) return null;
  const missing = sf.heritable.filter((l) => !Array.isArray(genome.loci?.[l.id]) || genome.loci[l.id].length !== 2).map((l) => l.id);
  if (missing.length) return { refused: true, missing, reason: `no stamp: the genome lacks ${missing.join(", ")}` };
  const g = quantizeGenome(frame, genome), copies = {};
  for (const l of sf.heritable) copies[l.id] = [...g.loci[l.id]];
  const read = frame.chapters.filter((c) => readIds.includes(c.id)).map((c) => c.name);
  return { species: sf.species, version: sf.version, read, copies };
}
// The stamp code: the stamp's own bytes as text (genome-stamp/src/codec.mjs), decodable back to the
// stamp's genome with decodeStampCode; null when there is no stamp (no frame, or a refused genome).
export function stampCode(frame, genome, readIds) {
  const sg = stampGenome(frame, genome, readIds);
  return sg && !sg.refused ? stampCodeOf(stampFrameOf(frame, genome), sg) : null;
}
// Blends on the step (decided 2026-10-09): a genome whose blended copies are numbers off the blend step
// (a child crossed before the step) moved to the nearest step inside its species' pool. Pure and
// idempotent: a genome already on the step (every genome crossed since, and every named copy) comes
// back as the same object. A moved genome records what it was born as in origin.was: its digest (its
// children's origin.parents name it by that, so the pedigree stays whole: cross.mjs pedigreeName) and
// its painting key (the SHA-256 its painting is stored under: paintKey), so nothing is repainted.
export function quantizeGenome(frame, genome) {
  if (!genome?.loci) return genome;
  let loci = null;
  for (const l of frame.loci) {
    const c = genome.loci[l.id], locus = LOCI.get(l.id);
    if (l.kind === "locked" || !Array.isArray(c) || !locus || !isContinuous(locus) || !c.some((x) => typeof x === "number")) continue;
    const pool = blendRange(frame, l), [clo, chi] = valueRange(locus);
    const q = c.map((x) => (typeof x !== "number" ? x : quantize(locus, x, x >= pool[0] - 1e-9 && x <= pool[1] + 1e-9 ? pool : [clo, chi])));
    if (q[0] !== c[0] || q[1] !== c[1]) (loci ??= { ...genome.loci })[l.id] = q;
  }
  if (!loci) return genome;
  const was = genome.origin?.was ?? { digest: genomeDigest(genome), sha: genomeSha(genome) };
  return { ...genome, loci, origin: { ...(genome.origin ?? {}), was } };
}
// The key a genome's painting is stored under: the SHA-256 it was painted as (before any move onto the step).
export const paintKey = (genome) => genome.origin?.was?.sha ?? genomeSha(genome);
// The mibi's name-code: eight base-32 characters of the genome's SHA-256, shown in threes (the short
// code stays as a lookup, never the genome: research-loop.md §7). It is a name, not the genome: the
// shareable code that carries the genome is the stamp code (stampCode).
const B32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export function nameCode(sha) {
  let out = "", sum = 0;
  for (let i = 0; i < 8; i++) { const v = parseInt(sha.slice(i * 2, i * 2 + 2), 16) & 31; out += B32[v]; sum += (i + 1) * v; }
  return out + B32[sum % 32];
}
// without dots: "3MB W21 1BB"
export const codeText = (c) => (c ? `${c.slice(0, 3)} ${c.slice(3, 6)} ${c.slice(6, 9)}` : "");

// A canonical text of a genome (sorted loci, each pair sorted: the Grow service's canonical form, so the
// Station's sha names the same set the painter stores) and its SHA-256, synchronous so the migration can run on load.
export const genomeText = (g) => JSON.stringify({ schema: g.schema, species: g.species, frameVersion: g.frameVersion, loci: Object.fromEntries(Object.keys(g.loci).sort().map((k) => [k, [...g.loci[k]].sort()])) });
export const genomeSha = (g) => sha256(genomeText(g));

// SHA-256 in plain JS (FIPS 180-4), for a string of code points below 0x80 or UTF-8 encoded here.
export function sha256(str) {
  const K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
  const bytes = new TextEncoder().encode(str), n = bytes.length, padded = new Uint8Array(((n + 9 + 63) >> 6) << 6);
  padded.set(bytes); padded[n] = 0x80;
  const bits = n * 8; padded[padded.length - 4] = (bits >>> 24) & 255; padded[padded.length - 3] = (bits >>> 16) & 255; padded[padded.length - 2] = (bits >>> 8) & 255; padded[padded.length - 1] = bits & 255;
  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a, h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
  const w = new Uint32Array(64), rotr = (x, k) => (x >>> k) | (x << (32 - k));
  for (let off = 0; off < padded.length; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = (padded[off + i * 4] << 24) | (padded[off + i * 4 + 1] << 16) | (padded[off + i * 4 + 2] << 8) | padded[off + i * 4 + 3];
    for (let i = 16; i < 64; i++) { const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3), s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10); w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0; }
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25), ch = (e & f) ^ (~e & g), t1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22), maj = (a & b) ^ (a & c) ^ (b & c), t2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0; h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
  }
  return [h0, h1, h2, h3, h4, h5, h6, h7].map((v) => v.toString(16).padStart(8, "0")).join("");
}

// A genome checked whole against its frame and built: the problems, or none when the body builds.
export function genomeProblems(frame, genome) {
  const p = checkGenome(frame, genome); if (p.length) return p;
  try { const b = buildIndividual(frame, genome); return b.validation.status === "valid" ? [] : b.validation.problems.slice(); } catch (e) { return [e.message]; }
}

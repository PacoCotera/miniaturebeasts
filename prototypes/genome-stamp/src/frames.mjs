// The frame registry: species frames pinned to the catalogue, append-only,
// shipped with every reader (the stamp never carries the catalogue, only the
// species number and frame version that pin it). Real frames come from
// design/proposals/species-frames (snapshot in frames-data.mjs); two synthetic
// future species test growth.
import { FRAME_DATA } from "./frames-data.mjs";

const bitsFor = (n) => (n <= 1 ? 0 : Math.ceil(Math.log2(n)));

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function finish(f) {
  f.chapters.forEach((ch, ci) => ch.loci.forEach((l) => { l.chapter = ci; l.bits = Math.max(1, bitsFor(l.alleles.length)); l.copies ??= 2; }));
  f.heritable = f.chapters.flatMap((c) => c.loci);
  f.payloadBits = f.heritable.reduce((s, l) => s + l.bits * l.copies, 0);
  // species border signature: from the locked frame (and the species number),
  // so every member shows the same border
  let h = (0x811c9dc5 ^ f.species) >>> 0;
  for (const [id, v] of f.locked) for (const ch of `${id}=${v};`) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193) >>> 0;
  f.borderSeed = h;
  return f;
}

const REAL = FRAME_DATA.frames.map((d) => finish(structuredClone(d)));

// Synthetic future species: the Tuikis's (frame id glowtail) allele mix, scaled, plus an 8th chapter.
const GLOW = REAL.find((f) => f.id === "glowtail");
const CH = [["Coat", 10], ["Face", 5], ["Shape", 4], ["Legs & tail", 8], ["Movement", 6], ["Stamina", 3], ["Nature", 2], ["Glow", 3]];
export function synthetic(nOpen, species, name, glyph) {
  const mix = GLOW.heritable.map((l) => l.alleles.length);
  const total = CH.reduce((s, c) => s + c[1], 0);
  const counts = CH.map(([, w]) => Math.round((w * nOpen) / total));
  counts[0] += nOpen - counts.reduce((s, c) => s + c, 0);
  let k = 0;
  const chapters = CH.map(([chName], ci) => ({
    name: chName, sealed: false,
    loci: Array.from({ length: counts[ci] }, (_, i) => {
      const n = mix[k++ % mix.length];
      return { id: `future.${chName.toLowerCase().replace(/\W+/g, "-")}-${i + 1}`, trait: `t${i >> 1}`, alleles: Array.from({ length: n }, (_, a) => `a${a}`), copies: 2 };
    }),
  }));
  const r = rng(species);
  const locked = Array.from({ length: 240 - nOpen }, (_, i) => [`future.locked-${i}`, r() < 0.5 ? 1 : 0]);
  return finish({ species, version: 1, id: `future${nOpen}`, name, glyph, chapters, locked, synthetic: true });
}

export const FRAMES_LIST = [
  ...REAL,
  synthetic(100, 21, "Future, 100 open loci", [".#.#.", "#####", ".###.", "#.#.#", ".#.#."]),
  synthetic(150, 22, "Future, 150 open loci", ["#.#.#", ".###.", "##.##", ".###.", "#.#.#"]),
];
export const FRAMES = new Map(FRAMES_LIST.map((f) => [`${f.species}.${f.version}`, f]));
export const frameFor = (species, version) => FRAMES.get(`${species}.${version}`) ?? null;
export const byName = (id) => FRAMES_LIST.find((f) => f.id === id);
export { rng };

// Codec frames for the genome-code memo: the three real species frames
// (design/proposals/species-frames/*.json, on the pinned catalogue) and two
// synthetic future species with 100 and 150 open loci. Frames are registered in
// the genome-ring prototype's frame table so its encoder and decoder run on them
// unchanged. Also: deterministic individuals, and a parent/child trio.
import { readFileSync } from "node:fs";
import { CATALOGUE } from "../../../prototypes/genome-ring/src/catalogue-data.mjs";
import { FRAMES } from "../../../prototypes/genome-ring/src/frames.mjs";
import { rng } from "../../../prototypes/genome-ring/src/codec.mjs";

const here = (p) => new URL(p, import.meta.url);
const byId = new Map(CATALOGUE.loci.map((l) => [l.id, l]));
const bitsFor = (n) => (n <= 1 ? 0 : Math.ceil(Math.log2(n)));

function lockedMarksOf(locked) {
  const marks = [];
  for (const l of locked) {
    const n = Math.max(1, l.bits);
    for (let b = n - 1; b >= 0; b--) marks.push(l.bits ? (l.value >> b) & 1 : 1);
  }
  return marks;
}

function finish(f) {
  f.heritable = f.chapters.flatMap((c) => c.loci);
  f.lockedMarks = lockedMarksOf(f.locked);
  f.spokesPerTrack = f.heritable.reduce((s, l) => s + l.bits, 0);
  f.looks = f.heritable.reduce((s, l) => s + l.alleles.length, 0);
  FRAMES.set(`${f.species}.${f.version}`, f);
  return f;
}

// A real species frame from its JSON. Heritable loci in ring order (chapter,
// trait, locus), alleles = the species pool. Locked loci carry their one value.
function fromJSON(file, species) {
  const d = JSON.parse(readFileSync(here(`../species-frames/${file}`), "utf8"));
  const loci = new Map(d.loci.map((l) => [l.id, l]));
  const chapters = d.chapters.map((ch, ci) => ({
    name: ch.name, sealed: ch.sealed, traits: ch.traits.map((t) => t.name),
    loci: ch.traits.flatMap((t) => t.loci.map((id) => {
      // Packed against the catalogue's alleles (codec contract), drawn from the species pool.
      const a = byId.get(id).alleles, pool = loci.get(id).alleles;
      return { id, trait: t.name, chapter: ci, alleles: a, pool, bits: Math.max(1, bitsFor(a.length)) };
    })),
  }));
  const locked = d.loci.filter((l) => l.kind === "locked").map((l) => {
    const alleles = byId.get(l.id).alleles;
    return { id: l.id, alleles, bits: bitsFor(alleles.length), value: Math.max(0, alleles.indexOf(l.copies[0])) };
  });
  return finish({ species, version: 1, name: d.species.name, glyph: d.glyph, colours: d.pod.colourPair.map((c) => c.hex), chapters, locked });
}

export const HOPPER = fromJSON("species-hopper.json", 11);
export const PUFFCAP = fromJSON("species-puffcap.json", 12);
export const GLOWTAIL = fromJSON("species-glowtail.json", 13);

// Synthetic future species on a grown catalogue: the glowtail's chapter shares
// and allele mix, scaled up, plus an eighth chapter (Glow). Locked loci fill
// the rest of a hypothetical 240-pair catalogue.
const CH = [["Coat", 10], ["Face", 5], ["Shape", 4], ["Legs & tail", 8], ["Movement", 6], ["Stamina", 3], ["Nature", 2], ["Glow", 3]];
function synthetic(nOpen, species, name, glyph) {
  const mix = GLOWTAIL.heritable.map((l) => l.alleles.length);
  const total = CH.reduce((s, c) => s + c[1], 0);
  let k = 0;
  const counts = CH.map(([, w]) => Math.round((w * nOpen) / total));
  counts[0] += nOpen - counts.reduce((s, c) => s + c, 0);
  const chapters = CH.map(([chName], ci) => ({
    name: chName, traits: [], loci: Array.from({ length: counts[ci] }, (_, i) => {
      const n = mix[k++ % mix.length];
      return { id: `future.${chName.toLowerCase().replace(/\W+/g, "-")}-${i + 1}`, trait: `t${i >> 1}`, chapter: ci, alleles: Array.from({ length: n }, (_, a) => `a${a}`), bits: Math.max(1, bitsFor(n)) };
    }),
  }));
  const r = rng(species);
  const locked = Array.from({ length: 240 - nOpen }, (_, i) => ({ id: `future.locked-${i}`, alleles: ["x", "y"], bits: 1, value: r() < 0.5 ? 1 : 0 }));
  return finish({ species, version: 1, name, glyph, colours: ["#6a5acd", "#e8b83f"], chapters, locked, synthetic: true });
}
export const FUTURE100 = synthetic(100, 21, "future species, 100 open loci", [".#.#.", "#####", ".###.", "#.#.#", ".#.#."]);
export const FUTURE150 = synthetic(150, 22, "future species, 150 open loci", ["#.#.#", ".###.", "##.##", ".###.", "#.#.#"]);

// Two in between, to find where a 20 mm print stops working.
export const FUTURE60 = synthetic(60, 23, "future species, 60 open loci", FUTURE100.glyph);
export const FUTURE80 = synthetic(80, 24, "future species, 80 open loci", FUTURE100.glyph);
export const ALL = [HOPPER, PUFFCAP, GLOWTAIL, FUTURE60, FUTURE80, FUTURE100, FUTURE150];

// A random individual of a frame (both copies from the species pools).
export function individual(frame, seed, { read } = {}) {
  const r = rng(seed);
  const copies = {};
  for (const l of frame.heritable) { const p = l.pool ?? l.alleles; copies[l.id] = [0, 1].map(() => p[Math.floor(r() * p.length)]); }
  const open = frame.chapters.filter((c) => !c.sealed).map((c) => c.name);
  return { species: frame.species, version: frame.version, read: read ?? open, copies };
}

// Mother, father and their child: at every locus the child's first copy is one
// of the mother's two, and its second copy one of the father's two.
export function trio(frame, seed) {
  const mother = individual(frame, seed), father = individual(frame, seed + 1);
  const r = rng(seed + 2);
  const copies = {};
  for (const l of frame.heritable) copies[l.id] = [mother.copies[l.id][r() < 0.5 ? 0 : 1], father.copies[l.id][r() < 0.5 ? 0 : 1]];
  return { mother, father, child: { ...mother, copies } };
}

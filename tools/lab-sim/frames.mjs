// gdd-bot-round-1: the two frames every measure runs on. Both are plain wrappers around the real engine
// (prototypes/species/framework: cross.mjs, catalogue.mjs, species.mjs): a draw of a wild one, a cross of two
// records, the shown value of a locus, the engine's forecast for a switch. No rule of the cross is copied here.
//   LOIKA: the Loika frame (species-S01.json), as lab-sim-1 uses it.
//   TEST:  a frame of ten traits built only here, never in the catalogue or the species files. It borrows ten
//          real catalogue loci (their operators and ranges are the catalogue's) and gives each its own row.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { sampleIndividual } from "../../prototypes/species/framework/species.mjs";
import { cross, forecast, blendRange } from "../../prototypes/species/framework/cross.mjs";
import { LOCI, valueRange, resolveCopies, quantize } from "../../prototypes/species/framework/catalogue.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
export const LOIKA_FR = JSON.parse(readFileSync(path.resolve(here, "../../prototypes/species/frames/species-S01.json"), "utf8"));

export const P_ON = { M: 0.35, C: 0.5, C2: 0.5 };   // wild frequency of the "on" copy: the pale copy, the crown, the muzzle
const pairOf = (n) => (n === 0 ? ["off", "off"] : n === 1 ? ["off", "on"] : ["on", "on"]);

// Switch traits the lab game reads (the lab-sim's own letters): the locus and the trait name in the frame's chapters.
const SW = {
  M: { locus: "appearance.marking-switch", trait: "markings", on: "pale" },
  C: { locus: "anatomy.crown-presence", trait: "crown", on: "crest" },
  C2: { locus: "anatomy.muzzle-presence", trait: "muzzle", on: "muzzle" },
};

// The generic wrapper. spec: { name, fr, blends: [{ id, role }], rec: [loci], dom: [loci], pair: [loci], sw: [letters], draw(r, origin) }
function wrap(spec) {
  const F = { ...spec };
  F.blends = spec.blends.map((b) => {
    const locus = LOCI.get(b.id), row = spec.fr.loci.find((l) => l.id === b.id);
    const [lo, hi] = blendRange(spec.fr, row), [clo, chi] = valueRange(locus);
    return { ...b, lo, hi, clo, chi, locus };
  });
  F.shown = (g, id) => resolveCopies(LOCI.get(id), g.loci[id]);
  F.on = (g, id) => g.loci[id].filter((c) => c === "on").length;
  // One child of two records (or bare genomes) by the engine's own cross. opts: { kinship, fr } override.
  F.cross = (a, b, r, lookup, opts = {}) => cross(opts.fr ?? spec.fr, a, b, { rng: r, lookup, ...(opts.kinship != null ? { kinship: opts.kinship } : {}) });
  // A genome with every locus at a plain copy, used only as the frame for forecasts.
  F.base = () => {
    const g = { schema: "mb-genome/2", species: spec.fr.species.id, frameVersion: spec.fr.frameVersion ?? undefined, loci: {}, origin: { kind: "random" } };
    for (const l of spec.fr.loci) g.loci[l.id] = l.kind === "locked" ? [...l.copies] : [l.alleles[0], l.alleles[0]];
    return g;
  };
  // What a cross of parents holding na and nb "on" copies can give, by the engine's forecast at kinship k:
  // the chance of a child with 0, 1, 2 "on" copies. T is one of the switch letters.
  const memo = new Map();
  F.outcomes = (T, na, nb, k) => {
    const key = `${T}|${na}|${nb}|${Math.round(k * 1e6)}`;
    let out = memo.get(key);
    if (out) return out;
    const mk = (n) => { const g = F.base(); g.loci[SW[T].locus] = pairOf(n); return g; };
    const fc = forecast(spec.fr, mk(na), mk(nb), { kinship: k });
    const t = fc.traits.find((x) => x.trait === SW[T].trait);
    out = [0, 0, 0];
    for (const s of t.seeds) out[s.copies.filter((c) => c === "on").length] += s.weight;
    memo.set(key, out);
    return out;
  };
  // The engine's forecast window for one blend of a pair, at the pair's kinship: [low, high] of the young.
  F.window = (a, b, id, k, lookup) => {
    const fc = forecast(F.oneFrame(id), a, b, { kinship: k, lookup });
    const t = fc.traits[0];
    return t.range;
  };
  const one = new Map();
  F.oneFrame = (id) => {
    let f = one.get(id);
    if (!f) {
      const row = spec.fr.loci.find((l) => l.id === id);
      f = { ...spec.fr, loci: [row], chapters: [{ id: "x", traits: [{ id, name: id, loci: [id] }] }] };
      one.set(id, f);
    }
    return f;
  };
  // A frame copy whose pool for blend `id` is widened to take in the parents' shown values (design 7.9: the young's bounds
  // widen to the farthest parent value already out of range, never past it).
  F.widened = (id, va, vb) => {
    const row = spec.fr.loci.find((l) => l.id === id), [lo, hi] = blendRange(spec.fr, row);
    const nlo = Math.min(lo, va, vb), nhi = Math.max(hi, va, vb);
    if (nlo === lo && nhi === hi) return spec.fr;
    const nrow = { ...row, alleles: [nlo, nhi] };
    return { ...spec.fr, loci: spec.fr.loci.map((l) => (l.id === id ? nrow : l)) };
  };
  return F;
}

// ---------------------------------------------------------------- the Loika frame
function drawLoika(r, origin) {
  const g = sampleIndividual(LOIKA_FR, r, origin);
  for (const T of ["M", "C"]) g.loci[SW[T].locus] = [r() < P_ON[T] ? "on" : "off", r() < P_ON[T] ? "on" : "off"];
  return g;
}
export const LOIKA = wrap({
  name: "Loika",
  fr: LOIKA_FR,
  blends: [
    { id: "growth.exterior-eye-size-ratio", role: "look", letter: "E" },
    { id: "movement.cycle-rate", role: "doing", letter: "D" },
    { id: "energy.action-efficiency", role: "doing", letter: "F" },
  ],
  rec: ["appearance.marking-switch"], dom: ["anatomy.crown-presence"], pair: [],
  sw: ["M", "C"],
  draw: drawLoika,
  traits: SW,
});

// ---------------------------------------------------------------- the test frame of ten traits
// 3 two-copy looks: markings (needs two copies to show: recessive), the marking layout and the crown form (both copies
//   are in the genome; the pair map shows one look, never more than the pair says);
// 2 one-copy looks: crown, muzzle (one copy shows: dominant);
// 3 looks blends: eye size, ear length, crest height (each pool is the middle 70% of the locus's catalogue range, so a
//   reach has room on both sides);
// 2 doings blends: cycle rate, action efficiency (the pool is the catalogue range).
const TEN = [
  { id: "appearance.marking-switch", role: "rec", name: "markings", alleles: ["off", "on"] },
  { id: "appearance.marking-layout", role: "pair", name: "layout", alleles: ["bands", "patches"] },
  { id: "anatomy.crown-form", role: "pair", name: "crownform", alleles: ["leaf", "pointed"] },
  { id: "anatomy.crown-presence", role: "dom", name: "crown", alleles: ["off", "on"] },
  { id: "anatomy.muzzle-presence", role: "dom", name: "muzzle", alleles: ["off", "on"] },
  { id: "growth.exterior-eye-size-ratio", role: "look", name: "eyes" },
  { id: "growth.auricular-length-ratio", role: "look", name: "ears" },
  { id: "growth.crown-height-ratio", role: "look", name: "crest" },
  { id: "movement.cycle-rate", role: "doing", name: "drive" },
  { id: "energy.action-efficiency", role: "doing", name: "efficiency" },
];
const testRows = TEN.map((t) => {
  if (t.alleles) return { id: t.id, kind: "heritable-look", alleles: t.alleles };
  const [lo, hi] = valueRange(LOCI.get(t.id)), w = hi - lo;
  const pool = t.role === "look" ? [Math.round((lo + 0.15 * w) * 1e6) / 1e6, Math.round((hi - 0.15 * w) * 1e6) / 1e6] : [lo, hi];
  return { id: t.id, kind: t.role === "look" ? "heritable-look" : "heritable-doing", alleles: pool };
});
export const TEST_FR = {
  ...LOIKA_FR,
  loci: testRows,
  chapters: [{ id: "test", traits: TEN.map((t) => ({ id: t.name, name: t.name, loci: [t.id] })) }],
  locked: [],
};
function drawTest(r, origin) {
  const loci = {};
  for (const t of TEN) {
    const row = testRows.find((x) => x.id === t.id);
    if (t.role === "rec") loci[t.id] = [r() < P_ON.M ? "on" : "off", r() < P_ON.M ? "on" : "off"];
    else if (t.role === "dom") loci[t.id] = [r() < 0.5 ? "on" : "off", r() < 0.5 ? "on" : "off"];
    else if (t.role === "pair") loci[t.id] = [row.alleles[r() < 0.5 ? 0 : 1], row.alleles[r() < 0.5 ? 0 : 1]];
    else {
      const [lo, hi] = row.alleles, v = quantize(LOCI.get(t.id), lo + r() * (hi - lo), [lo, hi]);
      loci[t.id] = [v, v];
    }
  }
  return { schema: "mb-genome/2", species: TEST_FR.species.id, frameVersion: TEST_FR.frameVersion, loci, origin };
}
export const TEST = wrap({
  name: "Test ten",
  fr: TEST_FR,
  blends: TEN.filter((t) => t.role === "look" || t.role === "doing").map((t) => ({ id: t.id, role: t.role, letter: t.name })),
  rec: ["appearance.marking-switch"], dom: ["anatomy.crown-presence", "anatomy.muzzle-presence"], pair: ["appearance.marking-layout", "anatomy.crown-form"],
  sw: ["M", "C", "C2"],
  draw: drawTest,
  traits: SW,
});
export const FRAMES = { LOIKA, TEST };

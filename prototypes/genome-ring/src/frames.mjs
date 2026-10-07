// Species frames: which loci a species locks, and how its heritable loci are
// grouped into chapters and traits (research-loop.md §3–4). A frame is the
// species' pinned definition: encoder and decoder both need it, exactly as the
// codec contract's shared-catalogue (S) mode needs the exact catalogue.
import { CATALOGUE } from "./catalogue-data.mjs";

const byId = new Map(CATALOGUE.loci.map((l) => [l.id, l]));

// The worked hopper-like frame: head, crown, eyes, ears, tail, fur, jointed
// legs, no wings or fins. 57 heritable loci in 7 chapters and 24 traits, laid
// out to the §4 counts (Coat 11 in 5, Face 13 in 5, Shape 11 in 4, Legs & tail
// 9 in 3, Movement 8 in 3, Stamina 3 in 2, Temperament 2 in 2).
const HOPPER_CHAPTERS = [
  ["Coat", {
    colour: ["appearance.body-palette"],
    "belly colour": ["appearance.underside-palette"],
    markings: ["appearance.marking-switch", "appearance.marking-layout", "appearance.marking-extent",
      "appearance.marking-scale", "appearance.marking-orientation", "appearance.marking-contrast"],
    texture: ["appearance.surface-texture"],
    fur: ["appearance.fur-length", "appearance.fur-flow"],
  }],
  ["Face", {
    head: ["growth.head-length-ratio", "growth.head-width-ratio", "growth.head-depth-ratio", "growth.head-lift-ratio"],
    snout: ["growth.muzzle-projection-ratio", "growth.muzzle-width-ratio"],
    eyes: ["growth.exterior-eye-size-ratio", "growth.exterior-eye-spacing-ratio"],
    crown: ["anatomy.crown-presence", "anatomy.crown-form", "growth.crown-height-ratio"],
    ears: ["anatomy.auricular-form", "growth.auricular-length-ratio"],
  }],
  ["Shape", {
    size: ["growth.core-half-length", "growth.core-width-ratio", "growth.core-depth-ratio"],
    outline: ["anatomy.region-longitudinal-form", "anatomy.region-cross-exponent", "growth.region-taper"],
    posture: ["growth.region-bend", "growth.join-throat-ratio", "growth.branch-angle"],
    rump: ["growth.posterior-length-ratio", "growth.posterior-width-ratio"],
  }],
  ["Legs & tail", {
    legs: ["growth.support-drop-ratio", "growth.support-splay-ratio", "growth.support-radius-ratio", "growth.free-proximal-ratio"],
    feet: ["anatomy.contact-terminal-form", "growth.terminal-length-ratio"],
    tail: ["growth.axial-tail-length-ratio", "growth.axial-tail-width-ratio", "growth.axial-tail-bend"],
  }],
  ["Movement", {
    gait: ["movement.contact-phase", "movement.stride-preference", "structure.joint-range"],
    drive: ["movement.cycle-rate", "movement.axial-amplitude", "movement.axial-phase"],
    agility: ["movement.turn-control", "structure.contact-width"],
  }],
  ["Stamina", {
    power: ["energy.actuator-capacity", "energy.reserve-capacity"],
    efficiency: ["energy.action-efficiency"],
  }],
  ["Temperament", {
    exploring: ["cognition.exploration-tendency"],
    startle: ["cognition.arousal-threshold"],
  }],
];

// Locked values the hopper body plan fixes (both copies equal). Everything
// locked and not listed here is fixed at its first allele.
const HOPPER_LOCKED = {
  "development.symmetry": 0, "development.attachment-repeat": 1, "development.articulated-chain": 1,
  "anatomy.posterior-presence": 1, "anatomy.muzzle-presence": 1,
  "anatomy.wing-presence": 0, "anatomy.exterior-eye-presence": 1, "anatomy.support-pair-count": 0,
  "organization.region-depth": 2, "organization.head-module": 1, "organization.appendage-role": 2,
  "organization.appendage-groups": 2, "organization.free-link-count": 1, "appearance.fur-presence": 1,
  "anatomy.auricular-presence": 1, "anatomy.axial-tail-presence": 1, "cognition.innate-profile-presence": 1,
};

const bitsFor = (n) => (n <= 1 ? 0 : Math.ceil(Math.log2(n)));

function buildFrame({ species, version, name, chapters, lockedLoci, lockedValues = {}, glyphSeed }) {
  const outChapters = chapters.map(([chapterName, traits], ci) => {
    const loci = [];
    for (const [trait, ids] of Object.entries(traits)) {
      for (const id of ids) {
        const def = typeof id === "string" ? byId.get(id) : id;
        if (!def) throw new Error(`unknown locus ${id}`);
        loci.push({ id: def.id, trait, chapter: ci, alleles: def.alleles, bits: Math.max(1, bitsFor(def.alleles.length)) });
      }
    }
    return { name: chapterName, traits: Object.keys(traits), loci };
  });
  const heritable = outChapters.flatMap((c) => c.loci);
  const heritableIds = new Set(heritable.map((l) => l.id));
  const locked = (lockedLoci ?? CATALOGUE.loci.filter((l) => !heritableIds.has(l.id))).map((def) => ({
    id: def.id, alleles: def.alleles, bits: bitsFor(def.alleles.length), value: lockedValues[def.id] ?? 0,
  }));
  // Locked marks: one per bit, at least one per locus (a single-look locus still shows a mark).
  const lockedMarks = [];
  for (const l of locked) {
    const n = Math.max(1, l.bits);
    for (let b = n - 1; b >= 0; b--) lockedMarks.push(l.bits ? (l.value >> b) & 1 : 1);
  }
  return {
    species, version, name, glyphSeed: glyphSeed ?? species,
    catalogue: { id: CATALOGUE.id, version: CATALOGUE.version, digest: CATALOGUE.digest },
    chapters: outChapters, heritable, locked, lockedMarks,
    spokesPerTrack: heritable.reduce((s, l) => s + l.bits, 0),
    looks: heritable.reduce((s, l) => s + l.alleles.length, 0),
  };
}

export const HOPPER = buildFrame({
  species: 7, version: 1, name: "hopper (worked frame)", chapters: HOPPER_CHAPTERS, lockedValues: HOPPER_LOCKED,
});

// The Pip proof (v1/prototype/genetics, content pip-proof-v1): five two-copy
// variable loci, 12 locked facts (9 modules, 3 single-look fixed loci).
const pip = (id, alleles) => ({ id, alleles });
export const PIP = buildFrame({
  species: 1, version: 1, name: "Pip (proof)",
  chapters: [
    ["Coat", { pale: [pip("appearance.markings", ["P", "p"])] }],
    ["Face", { crown: [pip("form.crown", ["C", "c"])], "eye rings": [pip("appearance.rings", ["R", "r"])] }],
    ["Movement", { drive: [pip("movement.drive", ["M", "m"])] }],
    ["Stamina", { efficiency: [pip("movement.efficiency", ["E", "e"])] }],
  ],
  lockedLoci: [
    ...["body-plan", "sensing-signaling", "innate-tendencies", "energy-nutrition", "maintenance", "affinity",
      "development", "reproduction", "fantastic-exclusion"].map((m) => pip(`pip.${m}`, ["module"])),
    pip("base.coat", ["charcoal"]), pip("base.ventrum", ["cream"]), pip("base.eyes", ["amber"]),
  ],
});

export const FRAMES = new Map([HOPPER, PIP].map((f) => [`${f.species}.${f.version}`, f]));
export const frameFor = (species, version) => FRAMES.get(`${species}.${version}`) ?? null;

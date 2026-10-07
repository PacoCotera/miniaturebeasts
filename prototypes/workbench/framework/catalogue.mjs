// The genome framework's catalogue, version 7: the v1 authoring catalogue6 (114 validated pairs
// and six drafts, snapshotted with provenance in catalogue6-data.mjs) plus the records the
// taxonomy proposal lists as missing (design/proposals/taxonomy.md §3, "What the catalogue
// lacks for the new kinds": 6 switches · 15 loci) and the three gaps the species frames list
// first (species-frames.md §7: emission, a dorsal cap sheet, a belly field).
//
// Scope follows the trunk-and-branch pan-genome (taxonomy §2): a trunk locus can be carried by
// any body that has its owner; a branch locus exists only in one clan. Absent parts have no
// locus at all in a species' genome; "switched off" is kept only for part switches a species
// leaves open (sleeping copies). Plan switches are frame facts: they pick the rig and are
// never carried per individual (species-frames.md §1, "plan switches are always locked").
import { CATALOGUE6 } from "./catalogue6-data.mjs";

export const PLAN_SWITCHES = new Set([
  "development.axial-repeat", "development.symmetry", "development.attachment-repeat",
  "development.articulated-chain", "development.membrane-rooting", "development.fin-rooting",
  "development.axial-deformation", "organization.region-depth", "organization.region-layout",
  "organization.body-symmetry", "organization.region-join", "organization.head-module",
  "organization.appendage-role", "organization.appendage-groups", "organization.free-link-count",
  "anatomy.posterior-presence", "anatomy.wing-presence", "anatomy.support-pair-count",
  "appearance.fur-presence", "appearance.anatomical-covering", "appearance.covering-kind",
  "structure.ocular-pair", "cognition.innate-profile-presence",
]);
// Part switches turn one small part on or off; a species may open one (frames.py PART_SWITCHES,
// plus the new presence switches below).
export const PART_SWITCHES = new Set([
  "anatomy.muzzle-presence", "anatomy.crown-presence", "anatomy.exterior-eye-presence",
  "anatomy.auricular-presence", "anatomy.axial-tail-presence", "appearance.marking-switch",
  "anatomy.antenna-presence", "anatomy.leaf-presence", "anatomy.root-foot-presence",
  "anatomy.foot-skirt-presence", "anatomy.wing-case-presence", "anatomy.petal-presence",
  "anatomy.tail-tip-bulb", "anatomy.top-cap-sheet", "appearance.belly-field",
]);
export const DOING_FAMILIES = new Set(["mechanics-movement", "energy-nutrition", "cognition-tendencies"]);
const FAMILY_ALIAS = { Structure: "structure", Appearance: "appearance", "Sensing and signaling": "sensing-signaling" };
export const canonicalFamily = (id) => FAMILY_ALIAS[id] ?? id;

const mean = (lo, hi) => ({ operator: "copy-mean", alleles: Object.entries({ ...lo, ...hi }).map(([id, value]) => ({ id, label: id, value })) });
const pairMap = (alleles, map) => ({ operator: "pair-map", alleles: Object.entries(alleles).map(([id, value]) => ({ id, label: id, value })), pairMap: map });
const enable = () => ({ operator: "dominant-enable", alleles: [{ id: "off", label: "off", value: false }, { id: "on", label: "on", value: true }] });

// New records. `scope` is trunk or branch (with its clan); `owner` is the switch that must be on
// (a part switch, a plan fact, or null); `consumer` names what draws or weighs it.
const NEW_LOCI = [
  // Insect-like (Petalú, Cavito, Puntilú): antennae. Trunk: three clans need them.
  { id: "anatomy.antenna-presence", family: "structure", label: "Antennae", scope: "trunk", owner: "head", consumer: "rig: antenna pair on the head", ...enable() },
  { id: "growth.antenna-length-ratio", family: "structure", label: "Antenna length", scope: "trunk", owner: "anatomy.antenna-presence", consumer: "rig: antenna length over head depth", ...mean({ short: 0.7 }, { long: 1.5 }) },
  { id: "anatomy.antenna-form", family: "structure", label: "Antenna form", scope: "trunk", owner: "anatomy.antenna-presence", consumer: "rig: thread, club or feather tip", ...pairMap({ thread: "thread", club: "club", feather: "feather" }, { "thread|thread": "thread", "club|thread": "club", "club|club": "club", "feather|thread": "feather", "club|feather": "feather", "feather|feather": "feather" }) },
  // Slug (Musguín): sheen. Trunk: a surface finish any body can carry; gives surface-texture's draft idea a consumer.
  { id: "appearance.sheen", family: "appearance", label: "Sheen", scope: "trunk", owner: null, consumer: "sketch: specular highlight strength", ...mean({ matte: 0 }, { glossy: 1 }) },
  // Fliers (Petalú, Brisú; also the drifters): flap markings and translucent flaps. Trunk.
  { id: "appearance.flap-marking", family: "appearance", label: "Flap markings", scope: "trunk", owner: "flaps", consumer: "sketch: marking field on thin surfaces", ...pairMap({ plain: "plain", spots: "spots", bars: "bars" }, { "plain|plain": "plain", "plain|spots": "spots", "spots|spots": "spots", "bars|plain": "bars", "bars|spots": "bars-and-spots", "bars|bars": "bars" }) },
  { id: "appearance.flap-translucency", family: "appearance", label: "Flap translucency", scope: "trunk", owner: "flaps", consumer: "sketch: thin-surface opacity (closes the transparency draft for flaps)", ...mean({ opaque: 0 }, { clear: 0.6 }) },
  // Sentient plants (Hojarín, Nenufí): leaves, a leaf covering, feeding on light. Trunk: both plant clans.
  { id: "anatomy.leaf-presence", family: "structure", label: "Leaves", scope: "trunk", owner: null, consumer: "rig: leaf sheets on every primary region", ...enable() },
  { id: "growth.leaf-count", family: "structure", label: "Leaf count", scope: "trunk", owner: "anatomy.leaf-presence", consumer: "rig: leaves per region", ...pairMap({ few: 2, many: 4 }, { "few|few": 2, "few|many": 3, "many|many": 4 }) },
  { id: "growth.leaf-length-ratio", family: "structure", label: "Leaf length", scope: "trunk", owner: "anatomy.leaf-presence", consumer: "rig: leaf length over the owner's cross radius", ...mean({ short: 0.8 }, { long: 1.6 }) },
  { id: "appearance.leaf-covering", family: "appearance", label: "Leaf covering", scope: "trunk", owner: null, consumer: "sketch: a leafy mantle material on the primary regions", ...pairMap({ bare: "bare", leafy: "leafy" }, { "bare|bare": "bare", "bare|leafy": "leafy", "leafy|leafy": "leafy" }) },
  { id: "energy.light-feeding", family: "energy-nutrition", label: "Light feeding", scope: "trunk", owner: null, consumer: "behaviour: uptake from light (the uptake draft's first consumer)", ...mean({ low: 0.4 }, { high: 1 }) },
  // Brotela (Hojarín) branch: a root foot.
  { id: "anatomy.root-foot-presence", family: "structure", label: "Root foot", scope: "branch", clan: "brotela", owner: "contact", consumer: "rig: contact terminals become root tufts", ...enable() },
  { id: "growth.root-spread-ratio", family: "structure", label: "Root spread", scope: "branch", clan: "brotela", owner: "anatomy.root-foot-presence", consumer: "rig: tuft spread over terminal length", ...mean({ tight: 0.8 }, { wide: 1.6 }) },
  // Limacela (Musguín) branch: a foot skirt.
  { id: "anatomy.foot-skirt-presence", family: "structure", label: "Foot skirt", scope: "branch", clan: "limacela", owner: null, consumer: "rig: a flat skirt under the body", ...enable() },
  { id: "growth.foot-skirt-width-ratio", family: "structure", label: "Skirt width", scope: "branch", clan: "limacela", owner: "anatomy.foot-skirt-presence", consumer: "rig: skirt overhang over body width", ...mean({ narrow: 0.15 }, { wide: 0.4 }) },
  // Caparela (Cavito) branch: wing cases.
  { id: "anatomy.wing-case-presence", family: "structure", label: "Wing cases", scope: "branch", clan: "caparela", owner: null, consumer: "rig: two hard half-shells over the back", ...enable() },
  { id: "growth.wing-case-extent", family: "structure", label: "Wing-case extent", scope: "branch", clan: "caparela", owner: "anatomy.wing-case-presence", consumer: "rig: how far back the cases reach", ...mean({ short: 0.5 }, { long: 0.9 }) },
  { id: "anatomy.wing-case-seam", family: "structure", label: "Wing-case seam", scope: "branch", clan: "caparela", owner: "anatomy.wing-case-presence", consumer: "rig: cases closed or parted", ...pairMap({ closed: "closed", parted: "parted" }, { "closed|closed": "closed", "closed|parted": "closed", "parted|parted": "parted" }) },
  // Lirela (Nenufí) branch: petals as a part.
  { id: "anatomy.petal-presence", family: "structure", label: "Petals", scope: "branch", clan: "lirela", owner: null, consumer: "rig: a ring of petal sheets round the hub", ...enable() },
  { id: "growth.petal-count", family: "structure", label: "Petal count", scope: "branch", clan: "lirela", owner: "anatomy.petal-presence", consumer: "rig: petals round the hub", ...pairMap({ five: 5, eight: 8 }, { "five|five": 5, "eight|five": 6, "eight|eight": 8 }) },
  { id: "growth.petal-length-ratio", family: "structure", label: "Petal length", scope: "branch", clan: "lirela", owner: "anatomy.petal-presence", consumer: "rig: petal length over hub radius", ...mean({ short: 0.7 }, { long: 1.3 }) },
  // The three gaps the frames list first. Fanalia (Ocotín): the glow is a doing (species-frames §6, decision 1).
  { id: "appearance.emission-brightness", family: "mechanics-movement", label: "Glow brightness", scope: "branch", clan: "fanalia", owner: "anatomy.axial-tail-presence", consumer: "behaviour: dusk glow strength; sketch: the emission slot's intensity", ...mean({ dim: 0.4 }, { bright: 1 }) },
  { id: "appearance.emission-length", family: "mechanics-movement", label: "Glow length", scope: "branch", clan: "fanalia", owner: "anatomy.axial-tail-presence", consumer: "behaviour: how long the glow lasts", ...mean({ short: 0.3 }, { long: 1 }) },
  { id: "anatomy.tail-tip-bulb", family: "structure", label: "Tail-tip bulb", scope: "branch", clan: "fanalia", owner: "anatomy.axial-tail-presence", consumer: "rig: a bulb at the tail tip that carries the emission slot", ...enable() },
  // Bonetia (Copolí): a single cap sheet on top, with its own colour and spots.
  { id: "anatomy.top-cap-sheet", family: "structure", label: "Top cap sheet", scope: "branch", clan: "bonetia", owner: "flaps", consumer: "rig: one dorsal sheet replaces the radial flap triple", ...enable() },
  { id: "appearance.cap-palette", family: "appearance", label: "Cap colour", scope: "branch", clan: "bonetia", owner: "anatomy.top-cap-sheet", consumer: "sketch: the cap's own pigment slot", operator: "partition-map", alleles: [{ id: "coral", label: "coral", value: "#e98268" }, { id: "raspberry", label: "raspberry", value: "#d95688" }, { id: "marigold", label: "marigold", value: "#e8b83f" }, { id: "plum", label: "plum", value: "#a967b8" }], pairMap: null },
  { id: "appearance.cap-spots", family: "appearance", label: "Cap spots", scope: "branch", clan: "bonetia", owner: "anatomy.top-cap-sheet", consumer: "sketch: a spot field on the cap", ...pairMap({ none: "none", spots: "spots" }, { "none|none": "none", "none|spots": "spots", "spots|spots": "spots" }) },
  // Trebola (Zacatín): Pip's cream belly and third crest leaf.
  { id: "appearance.belly-field", family: "appearance", label: "Belly field", scope: "branch", clan: "trebola", owner: null, consumer: "sketch: an underside field in the second pigment", ...enable() },
  { id: "growth.crest-leaf-count", family: "structure", label: "Crest leaves", scope: "branch", clan: "trebola", owner: "anatomy.crown-presence", consumer: "rig: two or three crest leaves", ...pairMap({ two: 2, three: 3 }, { "two|two": 2, "three|two": 3, "three|three": 3 }) },
];

// v1 records whose consumer lived outside the construction target table (the shared pigments and
// the marking field, bound through v1's MARKING_TARGETS), plus the older records this framework
// gives a consumer to (taxonomy §3: "consumers for 4 carried records and 2 drafts"); the rest stay
// carried by v1, not drawn, and are absent here (`consumer: null`).
const V1_TARGETS = {
  "appearance.body-palette": "appearance.bodyPalette", "appearance.underside-palette": "appearance.modulePalette",
  "appearance.marking-switch": "markings.enabled", "appearance.marking-layout": "markings.layout", "appearance.marking-extent": "markings.extent",
  "appearance.marking-scale": "markings.scale", "appearance.marking-orientation": "markings.orientation", "appearance.marking-contrast": "markings.contrast",
};
const NEW_CONSUMERS = {
  "appearance.body-palette": "sketch: the body pigment slot", "appearance.underside-palette": "sketch: the second pigment slot (chains, flaps, ears, tail, belly)",
  "appearance.marking-switch": "sketch: the marking field", "appearance.marking-layout": "sketch: the marking field", "appearance.marking-extent": "sketch: the marking field",
  "appearance.marking-scale": "sketch: the marking field", "appearance.marking-orientation": "sketch: the marking field", "appearance.marking-contrast": "sketch: the marking field",
  "development.regional-growth": "rig: the mass hierarchy (even, central, anterior) scales the regions",
  "structure.attachment-position": "rig: where along its region a limb pair roots",
  "structure.join-neck-ratio": "rig: neck length between head and body on a narrow join",
  "structure.fin-span": "rig: fin reach on a swimmer (fin-rooting on)",
  "movement.fin-steering": "behaviour: swim turning weight",
  "appearance.surface-texture": "sketch: fine ridges as a surface grain",
};

function v1Locus(l) {
  const family = canonicalFamily(l.family);
  const status = l.status === "validated" ? "validated" : "draft";
  const sw = PLAN_SWITCHES.has(l.id) ? "plan" : PART_SWITCHES.has(l.id) ? "part" : null;
  return {
    ...l, family, status, scope: "trunk", switch: sw, target: l.target ?? V1_TARGETS[l.id] ?? null,
    nature: DOING_FAMILIES.has(family) ? "doing" : "look",
    consumer: NEW_CONSUMERS[l.id] ?? (l.target ? `rig: ${l.target}` : DOING_FAMILIES.has(family) ? "behaviour: carried, weighed by the state machine" : null),
    provenance: { catalogue: `${CATALOGUE6.id}@${CATALOGUE6.version}`, digest: CATALOGUE6.foundationDigest, recordVersion: l.version },
  };
}
function newLocus(l) {
  return {
    status: "validated", version: 1, units: null, requires: l.owner && l.owner.includes(".") ? [l.owner] : [], applicability: null, bounds: null, target: null,
    ...l, switch: PART_SWITCHES.has(l.id) ? "part" : null,
    nature: DOING_FAMILIES.has(l.family) ? "doing" : "look",
    provenance: { catalogue: "mb-genome-framework@7", proposal: "design/proposals/taxonomy.md §3 and species-frames.md §7" },
  };
}

export const CATALOGUE = {
  id: "mb-genome-framework", version: 7, schema: "mb-catalogue/7",
  parent: { id: CATALOGUE6.id, version: CATALOGUE6.version, foundationDigest: CATALOGUE6.foundationDigest, source: CATALOGUE6.source },
  families: CATALOGUE6.families,
  loci: [...CATALOGUE6.loci.map(v1Locus), ...NEW_LOCI.map(newLocus)],
  context: CATALOGUE6.context,
};
for (const l of CATALOGUE.loci) if (CATALOGUE.loci.filter((m) => m.id === l.id).length !== 1) throw new Error(`duplicate locus ${l.id}`);
export const LOCI = new Map(CATALOGUE.loci.map((l) => [l.id, l]));
export const VALIDATED = CATALOGUE.loci.filter((l) => l.status === "validated");
export const DRAFTS = CATALOGUE.loci.filter((l) => l.status !== "validated").map((l) => l.id);
export const V1_DEFAULTS = CATALOGUE6.defaults;
export const PIGMENTS = Object.fromEntries(
  CATALOGUE.loci.filter((l) => l.operator === "partition-map").flatMap((l) => l.alleles.map((a) => [`${l.id}:${a.id}`, a.value])));
export const BODY_PIGMENTS = Object.fromEntries(LOCI.get("appearance.body-palette").alleles.map((a) => [a.id, a.value]));
export const SECOND_PIGMENTS = Object.fromEntries(LOCI.get("appearance.underside-palette").alleles.map((a) => [a.id, a.value]));
export const locusById = (id) => { const l = LOCI.get(id); if (!l) throw new Error(`unknown locus ${id}`); return l; };
export const alleleIds = (id) => locusById(id).alleles.map((a) => a.id);

// Operator semantics, as v1's resolver applies them (compositional-vocabulary-adapter.mjs:
// copy-mean, dominant-enable, recessive-enable, pair-map keyed by the sorted copy pair;
// partition-map returns the ordered pigment array of the sorted pair).
export function resolveCopies(locus, copies) {
  if (!Array.isArray(copies) || copies.length !== 2) throw new Error(`${locus.id}: two copies required`);
  const values = copies.map((id) => {
    const a = locus.alleles.find((x) => x.id === id);
    if (!a) throw new Error(`${locus.id}: unknown allele ${id}`);
    return a.value;
  });
  switch (locus.operator) {
    case "copy-mean": return Math.round(((values[0] + values[1]) / 2) * 1e6) / 1e6;
    case "dominant-enable": return values.some(Boolean);
    case "recessive-enable": return values.every(Boolean);
    case "pair-map": {
      const key = [...copies].sort().join("|");
      if (!Object.hasOwn(locus.pairMap, key)) throw new Error(`${locus.id}: no pair map for ${key}`);
      return locus.pairMap[key];
    }
    case "partition-map": {
      const sorted = [...copies].sort();
      return [...new Set(sorted.map((id) => locus.alleles.find((a) => a.id === id).value))];
    }
    default: throw new Error(`${locus.id}: operator ${locus.operator} is not implemented`);
  }
}

// The player's words for what a locus can show from a pool (frames.py looks_for).
export function looksFor(locus, pool) {
  const pairs = [];
  for (let i = 0; i < pool.length; i++) for (let j = i; j < pool.length; j++) pairs.push([pool[i], pool[j]]);
  const out = [];
  const push = (s) => { if (!out.includes(s)) out.push(s); };
  for (const [a, b] of pairs) {
    const v = resolveCopies(locus, [a, b]);
    if (locus.operator === "partition-map") push(a === b ? a : `${a} and ${b}`);
    else if (locus.operator === "copy-mean") push(a === b ? a : `between ${a} and ${b}`);
    else if (locus.operator === "pair-map") push(typeof v === "boolean" ? (v ? "on" : "off") : String(v));
    else push(a === b ? a : [a, b].sort().join("/"));
  }
  if (locus.operator === "copy-mean") { // one word per distinct mean
    const seen = new Map();
    for (const [a, b] of pairs) { const m = resolveCopies(locus, [a, b]); if (!seen.has(m)) seen.set(m, a === b ? a : `between ${a} and ${b}`); }
    return [...seen.values()];
  }
  return out;
}

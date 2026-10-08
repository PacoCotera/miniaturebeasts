// The genome framework's catalogue, version 9: the v1 authoring catalogue6 (114 validated pairs
// and six drafts, snapshotted with provenance in catalogue6-data.mjs) plus the records the
// taxonomy proposal lists as missing for the V1 roster (design/proposals/taxonomy.md §3, "What the
// catalogue needs": 11 switches · 25 loci + 6 alleles) and the three gaps the species frames list
// first (species-frames.md §7: emission, a dorsal cap sheet, a belly field).
//
// Scope follows the trunk-and-branch pan-genome (taxonomy §2, decided): a trunk locus can be
// carried by any body that has its owner; a branch locus exists only in one clan. Absent parts have
// no locus at all in a species' genome; "switched off" is kept only for part switches a species
// leaves open (sleeping copies). Plan switches are frame facts: they pick the rig and are never
// carried per individual (species-frames.md §1, "plan switches are always locked").
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
  "appearance.face-mask", "appearance.tail-rings", "anatomy.horn-presence", "anatomy.beak-presence", "appearance.feather-presence",
  "anatomy.shell-presence", "anatomy.antenna-presence", "anatomy.wing-case-presence", "anatomy.foot-skirt-presence",
  "anatomy.leaf-presence", "physiology.charged-body",
  "anatomy.tail-tip-bulb", "anatomy.top-cap-sheet", "appearance.belly-field",
]);
export const DOING_FAMILIES = new Set(["mechanics-movement", "energy-nutrition", "cognition-tendencies", "fantastic-physiology"]);
const FAMILY_ALIAS = { Structure: "structure", Appearance: "appearance", "Sensing and signaling": "sensing-signaling" };
export const canonicalFamily = (id) => FAMILY_ALIAS[id] ?? id;

const mean = (lo, hi) => ({ operator: "copy-mean", alleles: Object.entries({ ...lo, ...hi }).map(([id, value]) => ({ id, label: id, value })) });
const pairMap = (alleles, map) => ({ operator: "pair-map", alleles: Object.entries(alleles).map(([id, value]) => ({ id, label: id, value })), pairMap: map });
const enable = () => ({ operator: "dominant-enable", alleles: [{ id: "off", label: "off", value: false }, { id: "on", label: "on", value: true }] });
// A complete unordered pair map from a dominance order (first wins over later).
const dominance = (order) => { const map = {}; for (const a of order) for (const b of order) map[[a, b].sort().join("|")] = order.indexOf(a) <= order.indexOf(b) ? a : b; return map; };

// New records. `scope` is trunk or branch (with its clan); `owner` is what must be on: a part
// switch, "head", "flaps", "contact" (contact chains), "tail", "ears", "fur", or null (any body);
// `consumer` names what draws or weighs it.
const NEW_LOCI = [
  // Mammal look (S04–S08, S10; trunk): fur on tail and ears, a face mask, tail rings, ear tilt. 2 · 4.
  { id: "appearance.fur-reach", family: "appearance", label: "Fur reach", scope: "trunk", owner: "fur", consumer: "sketch: the fur material on the tail and the ears too", ...pairMap({ body: "body", tail: "body-and-tail", ears: "body-ears-and-tail" }, dominance(["ears", "tail", "body"])) },
  { id: "appearance.face-mask", family: "appearance", label: "Face mask", scope: "trunk", owner: "head", consumer: "sketch: a second-pigment field over the eyes", ...enable() },
  { id: "appearance.face-mask-shape", family: "appearance", label: "Mask shape", scope: "trunk", owner: "appearance.face-mask", consumer: "sketch: a band across the eyes, or stripes down the face", ...pairMap({ band: "band", stripes: "stripes" }, { "band|band": "band", "band|stripes": "band", "stripes|stripes": "stripes" }) },
  { id: "appearance.tail-rings", family: "appearance", label: "Tail rings", scope: "trunk", owner: "tail", consumer: "sketch: second-pigment rings along the tail", ...enable() },
  { id: "growth.tail-ring-count", family: "appearance", label: "Ring count", scope: "trunk", owner: "appearance.tail-rings", consumer: "sketch: rings along the tail (one is a pale tip)", ...pairMap({ one: 1, four: 4 }, { "one|one": 1, "four|one": 2, "four|four": 4 }) },
  { id: "anatomy.ear-tilt", family: "structure", label: "Ear tilt", scope: "trunk", owner: "ears", consumer: "rig: ears upright or drooping", ...pairMap({ upright: "upright", drooping: "drooping" }, { "upright|upright": "upright", "drooping|upright": "upright", "drooping|drooping": "drooping" }) },
  // Proportions by kind (the proportions milestone): the two ear measures an artist takes that no
  // locus carried, ear set (on the side of the head or on its crown) and ear width over ear length.
  { id: "growth.auricular-set-ratio", family: "structure", label: "Ear set", scope: "trunk", owner: "ears", consumer: "rig: the ear root's lateral offset over the head's half width (side or crown)", ...mean({ side: 0.78 }, { crown: 0.42 }) },
  { id: "growth.auricular-width-ratio", family: "structure", label: "Ear width", scope: "trunk", owner: "ears", consumer: "rig: ear width over ear length", ...mean({ narrow: 0.42 }, { broad: 0.8 }) },
  // Horns (C08 branch): 1 · 2, plus the hoof allele on the terminal form.
  { id: "anatomy.horn-presence", family: "structure", label: "Horns", scope: "branch", clan: "C08", owner: "head", consumer: "rig: a pair of horns on the head", ...enable() },
  { id: "growth.horn-curl", family: "structure", label: "Horn curl", scope: "branch", clan: "C08", owner: "anatomy.horn-presence", consumer: "rig: horn bend", ...mean({ straight: 0.2 }, { curled: 1.4 }) },
  { id: "anatomy.horn-branching", family: "structure", label: "Horn branching", scope: "branch", clan: "C08", owner: "anatomy.horn-presence", consumer: "rig: plain horns or antlers with a tine", ...pairMap({ plain: "plain", antler: "antler" }, { "plain|plain": "plain", "antler|plain": "antler", "antler|antler": "antler" }) },
  // Big bird (C09 branch): a beak, feathers. 2 · 3, plus the one-pair allele on support-pair-count.
  { id: "anatomy.beak-presence", family: "structure", label: "Beak", scope: "branch", clan: "C09", owner: "head", consumer: "rig: a wedge beak in place of the muzzle", ...enable() },
  { id: "growth.beak-length-ratio", family: "structure", label: "Beak length", scope: "branch", clan: "C09", owner: "anatomy.beak-presence", consumer: "rig: beak length over head length", ...mean({ short: 0.5 }, { long: 1.1 }) },
  { id: "appearance.feather-presence", family: "appearance", label: "Feathers", scope: "branch", clan: "C09", owner: "fur", consumer: "sketch: the fur material drawn as feathers", ...enable() },
  { id: "appearance.feather-length", family: "appearance", label: "Feather length", scope: "branch", clan: "C09", owner: "appearance.feather-presence", consumer: "sketch: feather length on body and flaps", ...mean({ short: 0.2 }, { long: 0.45 }) },
  { id: "growth.feather-crest", family: "structure", label: "Feather crest", scope: "branch", clan: "C09", owner: "anatomy.crown-presence", consumer: "rig: the crown drawn as a feather crest, by height", ...mean({ low: 0.6 }, { tall: 1.4 }) },
  // Shell (C11 branch): 1 · 2.
  { id: "anatomy.shell-presence", family: "structure", label: "Shell", scope: "branch", clan: "C11", owner: null, consumer: "rig: a domed shell over the body", ...enable() },
  { id: "growth.shell-dome-ratio", family: "structure", label: "Shell dome", scope: "branch", clan: "C11", owner: "anatomy.shell-presence", consumer: "rig: dome height over body depth", ...mean({ low: 0.6 }, { high: 1.1 }) },
  { id: "appearance.shell-plates", family: "appearance", label: "Shell plates", scope: "branch", clan: "C11", owner: "anatomy.shell-presence", consumer: "sketch: a plate field on the shell", ...pairMap({ smooth: "smooth", plated: "plated" }, { "smooth|smooth": "smooth", "plated|smooth": "plated", "plated|plated": "plated" }) },
  // Insect-like (S12, S13; trunk unless one clan): antennae, wing cases, flap markings, translucent flaps. 2 · 6.
  { id: "anatomy.antenna-presence", family: "structure", label: "Antennae", scope: "trunk", owner: "head", consumer: "rig: antenna pair on the head", ...enable() },
  { id: "growth.antenna-length-ratio", family: "structure", label: "Antenna length", scope: "trunk", owner: "anatomy.antenna-presence", consumer: "rig: antenna length over head depth", ...mean({ short: 0.7 }, { long: 1.5 }) },
  { id: "anatomy.antenna-form", family: "structure", label: "Antenna form", scope: "trunk", owner: "anatomy.antenna-presence", consumer: "rig: thread, club or feather tip", ...pairMap({ thread: "thread", club: "club", feather: "feather" }, dominance(["feather", "club", "thread"])) },
  { id: "anatomy.wing-case-presence", family: "structure", label: "Wing cases", scope: "branch", clan: "C13", owner: null, consumer: "rig: two hard half-shells over the back", ...enable() },
  { id: "growth.wing-case-extent", family: "structure", label: "Wing-case extent", scope: "branch", clan: "C13", owner: "anatomy.wing-case-presence", consumer: "rig: how far back the cases reach", ...mean({ short: 0.5 }, { long: 0.9 }) },
  { id: "anatomy.wing-case-seam", family: "structure", label: "Wing-case seam", scope: "branch", clan: "C13", owner: "anatomy.wing-case-presence", consumer: "rig: cases closed or parted", ...pairMap({ closed: "closed", parted: "parted" }, { "closed|closed": "closed", "closed|parted": "closed", "parted|parted": "parted" }) },
  { id: "appearance.flap-marking", family: "appearance", label: "Flap markings", scope: "trunk", owner: "flaps", consumer: "sketch: marking field on thin surfaces", ...pairMap({ plain: "plain", spots: "spots", bars: "bars" }, { "plain|plain": "plain", "plain|spots": "spots", "spots|spots": "spots", "bars|plain": "bars", "bars|spots": "bars-and-spots", "bars|bars": "bars" }) },
  { id: "appearance.flap-translucency", family: "appearance", label: "Flap translucency", scope: "trunk", owner: "flaps", consumer: "sketch: thin-surface opacity (the transparency draft, validated for flaps)", ...mean({ opaque: 0 }, { clear: 0.6 }) },
  // Slug (C14 branch): a foot skirt; sheen is trunk, a surface finish any body can carry. 1 · 2.
  { id: "anatomy.foot-skirt-presence", family: "structure", label: "Foot skirt", scope: "branch", clan: "C14", owner: null, consumer: "rig: a flat skirt under the body", ...enable() },
  { id: "growth.foot-skirt-width-ratio", family: "structure", label: "Skirt width", scope: "branch", clan: "C14", owner: "anatomy.foot-skirt-presence", consumer: "rig: skirt overhang over body width", ...mean({ narrow: 0.15 }, { wide: 0.4 }) },
  { id: "appearance.sheen", family: "appearance", label: "Sheen", scope: "trunk", owner: null, consumer: "sketch: specular highlight strength (surface texture's first consumer)", ...mean({ matte: 0 }, { glossy: 1 }) },
  // Plant (C15 branch): leaves on branches, a leaf covering, feeding on light; the root foot is a terminal allele. 1 · 3 (+ light feeding, the uptake draft's consumer).
  { id: "anatomy.leaf-presence", family: "structure", label: "Leaves", scope: "branch", clan: "C15", owner: null, consumer: "rig: leaf sheets on every body region", ...enable() },
  { id: "growth.leaf-count", family: "structure", label: "Leaf count", scope: "branch", clan: "C15", owner: "anatomy.leaf-presence", consumer: "rig: leaves per region", ...pairMap({ few: 2, many: 4 }, { "few|few": 2, "few|many": 3, "many|many": 4 }) },
  { id: "growth.leaf-length-ratio", family: "structure", label: "Leaf length", scope: "branch", clan: "C15", owner: "anatomy.leaf-presence", consumer: "rig: leaf length over the owner's cross radius", ...mean({ short: 0.8 }, { long: 1.6 }) },
  { id: "appearance.leaf-covering", family: "appearance", label: "Leaf covering", scope: "branch", clan: "C15", owner: null, consumer: "sketch: a leafy mantle material on the body regions", ...pairMap({ bare: "bare", leafy: "leafy" }, { "bare|bare": "bare", "bare|leafy": "leafy", "leafy|leafy": "leafy" }) },
  { id: "energy.light-feeding", family: "energy-nutrition", label: "Light feeding", scope: "branch", clan: "C15", owner: null, consumer: "behaviour: uptake from light (the uptake draft's first consumer)", ...mean({ low: 0.4 }, { high: 1 }) },
  // Lightning (C16 branch): the first fantastic-physiology loci. 1 · 3. Emission is trunk (C03 needs it too).
  { id: "physiology.charged-body", family: "fantastic-physiology", label: "Charged body", scope: "branch", clan: "C16", owner: null, consumer: "sketch: a translucent body of charge, lit from within", ...enable() },
  { id: "physiology.charge", family: "fantastic-physiology", label: "Charge", scope: "branch", clan: "C16", owner: "physiology.charged-body", consumer: "behaviour: storm Energy held", ...mean({ low: 0.3 }, { high: 1 }) },
  { id: "physiology.phase", family: "fantastic-physiology", label: "Phase", scope: "branch", clan: "C16", owner: "physiology.charged-body", consumer: "behaviour and sketch: how see-through, fading by day", ...mean({ solid: 0.2 }, { faint: 0.7 }) },
  { id: "physiology.pull", family: "fantastic-physiology", label: "Pull", scope: "branch", clan: "C16", owner: "physiology.charged-body", consumer: "behaviour: how strongly it draws a strike", ...mean({ weak: 0.3 }, { strong: 1 }) },
  { id: "appearance.emission-brightness", family: "mechanics-movement", label: "Glow brightness", scope: "trunk", owner: null, consumer: "behaviour: dusk glow strength; sketch: the emission slot's intensity", ...mean({ dim: 0.4 }, { bright: 1 }) },
  { id: "appearance.emission-length", family: "mechanics-movement", label: "Glow length", scope: "trunk", owner: null, consumer: "behaviour: how long the glow lasts", ...mean({ short: 0.3 }, { long: 1 }) },
  // The three gaps the frames list first. C03: a bulb at the tail tip that carries the glow.
  { id: "anatomy.tail-tip-bulb", family: "structure", label: "Tail-tip bulb", scope: "branch", clan: "C03", owner: "tail", consumer: "rig: a bulb at the tail tip that carries the emission slot", ...enable() },
  // C02: a single cap sheet on top, with its own colour and spots.
  { id: "anatomy.top-cap-sheet", family: "structure", label: "Top cap sheet", scope: "branch", clan: "C02", owner: "flaps", consumer: "rig: one dorsal sheet replaces the radial flap triple", ...enable() },
  { id: "appearance.cap-palette", family: "appearance", label: "Cap colour", scope: "branch", clan: "C02", owner: "anatomy.top-cap-sheet", consumer: "sketch: the cap's own pigment slot", operator: "partition-map", alleles: [{ id: "coral", label: "coral", value: "#e98268" }, { id: "raspberry", label: "raspberry", value: "#d95688" }, { id: "marigold", label: "marigold", value: "#e8b83f" }, { id: "plum", label: "plum", value: "#a967b8" }], pairMap: null },
  { id: "appearance.cap-spots", family: "appearance", label: "Cap spots", scope: "branch", clan: "C02", owner: "anatomy.top-cap-sheet", consumer: "sketch: a spot field on the cap", ...pairMap({ none: "none", spots: "spots" }, { "none|none": "none", "none|spots": "spots", "spots|spots": "spots" }) },
  // C01: Pip's cream belly and third crest leaf.
  { id: "appearance.belly-field", family: "appearance", label: "Belly field", scope: "branch", clan: "C01", owner: null, consumer: "sketch: an underside field in the second pigment", ...enable() },
  { id: "growth.crest-leaf-count", family: "structure", label: "Crest leaves", scope: "branch", clan: "C01", owner: "anatomy.crown-presence", consumer: "rig: two or three crest leaves", ...pairMap({ two: 2, three: 3 }, { "two|two": 2, "three|two": 3, "three|three": 3 }) },
  // Catalogue 9, the Loika calibrated to Pip: how far up the body the belly field reaches, and how high the eyes sit on the head.
  { id: "growth.belly-field-extent", family: "appearance", label: "Belly reach", scope: "branch", clan: "C01", owner: "appearance.belly-field", consumer: "sketch: the share of the body's depth the underside field covers, from below", ...mean({ low: 0.33 }, { high: 0.5 }) },
  { id: "growth.exterior-eye-height-ratio", family: "structure", label: "Eye height", scope: "branch", clan: "C01", owner: "anatomy.exterior-eye-presence", consumer: "rig: the eye centre's height over the head's half depth (0.2 above the middle elsewhere)", ...mean({ middle: 0.0 }, { high: 0.2 }) },
];

// Alleles added to v1 records (taxonomy §3: "+ 6 alleles"). A changed record is a new record
// version under this catalogue's pin; v1's pin is the parent and its own records stay exact.
const ADDED_ALLELES = {
  "anatomy.contact-terminal-form": { alleles: [{ id: "hoof", label: "hoof", value: "hoof" }, { id: "webbed", label: "webbed", value: "webbed" }, { id: "root", label: "root", value: "root" }], pairMap: dominance(["root", "hoof", "webbed", "wedge", "pad", "rounded"]), why: "a hoof foot (C08), a webbed foot (C10), a root foot (C15)" },
  "anatomy.support-pair-count": { alleles: [{ id: "one", label: "one", value: 1 }], pairMap: { "one|one": 1, "one|two": 2, "one|three": 2, "two|two": 2, "three|two": 3, "three|three": 3 }, why: "one pair of legs for the big bird (C09)" },
  "growth.core-half-length": { alleles: [{ id: "huge", label: "huge", value: 0.92 }], why: "a fourth size class above large, so bear- and deer-size read bigger than the puffball" },
  "growth.auricular-length-ratio": { alleles: [{ id: "tall", label: "tall", value: 1.4 }], why: "tall ears for the fox (C05): the clan's signature ear clears the head by two thirds of its height, which long (1.0) cannot" },
  // Catalogue 8: the head-ratio floor lowered to 0.25 of a region so a turtle's head fits (S11, the lead's decision 2026-10-08).
  "growth.head-length-ratio": { alleles: [{ id: "tiny", label: "tiny", value: 0.22 }], since: 8, why: "a head a quarter of its region long, for the turtle (C11); small (0.3) was the floor" },
  "growth.head-width-ratio": { alleles: [{ id: "tiny", label: "tiny", value: 0.25 }], since: 8, why: "a head a quarter of its region wide, for the turtle (C11); low (0.31) was the floor" },
  "growth.head-depth-ratio": { alleles: [{ id: "tiny", label: "tiny", value: 0.25 }], since: 8, why: "a head a quarter of its region deep, for the turtle (C11); low (0.36) was the floor" },
  // Catalogue 9: the Loika calibrated to the accepted Pip (the owner's decision 2026-10-08): the rig is structure
  // and proportion, so its ranges reach the measures taken from art/miniature-lives.
  "growth.exterior-eye-size-ratio": { alleles: [{ id: "huge", label: "huge", value: 0.44 }], since: 9, why: "Pip's eye ring is 0.43 of the head's height; large (0.32) gave 0.31" },
  "growth.muzzle-projection-ratio": { alleles: [{ id: "stub", label: "stub", value: 0.32 }], since: 9, why: "Pip's snout clears the head by a tenth of its length; short (0.58) gave three tenths" },
  "growth.muzzle-width-ratio": { alleles: [{ id: "full", label: "full", value: 0.85 }], since: 9, why: "Pip's snout is the whole lower face" },
  "growth.core-width-ratio": { alleles: [{ id: "wide", label: "wide", value: 0.65 }], since: 9, why: "Pip's body is as round from the front as from the side" },
  "growth.core-depth-ratio": { alleles: [{ id: "deep", label: "deep", value: 0.7 }], since: 9, why: "Pip's body is 0.92 as tall as it is long; high (0.61) gave 0.82" },
  "anatomy.crown-form": { alleles: [{ id: "leaf", label: "leaf", value: "leaf" }], pairMap: (map) => ({ ...map, "leaf|leaf": "leaf", "leaf|pointed": "leaf", "leaf|rounded": "leaf" }), since: 9, why: "Pip's crest is three leaf sheets, not spikes" },
};

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
  "appearance.body-palette": "sketch: the body pigment slot", "appearance.underside-palette": "sketch: the second pigment slot (chains, flaps, ears, tail, belly, masks)",
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
  const added = ADDED_ALLELES[l.id];
  return {
    ...l, family, status, scope: "trunk", switch: sw, target: l.target ?? V1_TARGETS[l.id] ?? null,
    ...(added ? { alleles: [...l.alleles, ...added.alleles], pairMap: typeof added.pairMap === "function" ? added.pairMap(l.pairMap) : added.pairMap ?? l.pairMap, version: l.version + 1, addedAlleles: { ids: added.alleles.map((a) => a.id), why: added.why, since: added.since ?? 7 } } : {}),
    nature: DOING_FAMILIES.has(family) ? "doing" : "look",
    consumer: NEW_CONSUMERS[l.id] ?? (l.target ? `rig: ${l.target}` : DOING_FAMILIES.has(family) ? "behaviour: carried, weighed by the state machine" : null),
    provenance: { catalogue: `${CATALOGUE6.id}@${CATALOGUE6.version}`, digest: CATALOGUE6.foundationDigest, recordVersion: l.version, ...(added ? { amended: `mb-genome-framework@${added.since ?? 7} adds alleles; the v1 record stays exact under its own pin` } : {}) },
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
  // Pin 8: 7 plus the tiny head alleles (a changed range is a new pin; frames and genomes carry the pin
  // they were built against, and a saved mibi keeps its own).
  id: "mb-genome-framework", version: 9, schema: "mb-catalogue/9",
  parent: { id: CATALOGUE6.id, version: CATALOGUE6.version, foundationDigest: CATALOGUE6.foundationDigest, source: CATALOGUE6.source },
  families: CATALOGUE6.families,
  loci: [...CATALOGUE6.loci.map(v1Locus), ...NEW_LOCI.map(newLocus)],
  context: CATALOGUE6.context,
};
for (const l of CATALOGUE.loci) if (CATALOGUE.loci.filter((m) => m.id === l.id).length !== 1) throw new Error(`duplicate locus ${l.id}`);
for (const l of CATALOGUE.loci) if (l.operator === "pair-map") for (const a of l.alleles) for (const b of l.alleles) if (!Object.hasOwn(l.pairMap, [a.id, b.id].sort().join("|"))) throw new Error(`${l.id}: incomplete pair map at ${a.id}|${b.id}`);
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
// A continuous locus (copy-mean) takes a copy as a named allele or as a number in its range (the
// cross blends, the-cross.md §1): the named alleles are then the bins the player sees as looks.
export const isContinuous = (locus) => locus.operator === "copy-mean" && locus.alleles.every((a) => typeof a.value === "number");
export function copyValue(locus, copy) {
  if (typeof copy === "number") { if (!isContinuous(locus)) throw new Error(`${locus.id}: a numeric copy on a locus that is not continuous`); return copy; }
  const a = locus.alleles.find((x) => x.id === copy);
  if (!a) throw new Error(`${locus.id}: unknown allele ${copy}`);
  return a.value;
}
// The bin of a copy: a named copy is its own; a numeric one is the nearest named allele by value.
export function binFor(locus, copy) {
  if (typeof copy !== "number") return copy;
  let best = null, d = Infinity;
  for (const a of locus.alleles) { const e = Math.abs(a.value - copy); if (e < d) { d = e; best = a.id; } }
  return best;
}
// The value range of a set of named alleles (the catalogue's, or a species pool): [min, max].
export const valueRange = (locus, ids = locus.alleles.map((a) => a.id)) => { const vs = ids.map((id) => copyValue(locus, id)); return [Math.min(...vs), Math.max(...vs)]; };

export function resolveCopies(locus, copies) {
  if (!Array.isArray(copies) || copies.length !== 2) throw new Error(`${locus.id}: two copies required`);
  const values = copies.map((c) => copyValue(locus, c));
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
  if (locus.operator === "copy-mean") { // one word per distinct mean
    const seen = new Map();
    for (const [a, b] of pairs) { const m = resolveCopies(locus, [a, b]); if (!seen.has(m)) seen.set(m, a === b ? a : `between ${a} and ${b}`); }
    return [...seen.values()];
  }
  const out = [];
  const push = (s) => { if (!out.includes(s)) out.push(s); };
  for (const [a, b] of pairs) {
    const v = resolveCopies(locus, [a, b]);
    if (locus.operator === "partition-map") push(a === b ? a : `${a} and ${b}`);
    else if (locus.operator === "pair-map") push(typeof v === "boolean" ? (v ? "on" : "off") : String(v));
    else push(a === b ? a : [a, b].sort().join("/"));
  }
  return out;
}

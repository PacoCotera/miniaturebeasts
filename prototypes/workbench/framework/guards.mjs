// Owner guards: which loci a body carries, and which of a carried locus's values are drawn.
//
// The plan-and-part guards are ported from v1's resolver (v1/prototype/generator-workbench/
// compositional-vocabulary-adapter.mjs `consumerGuard` and `roleGuard`, catalogue6), reading the
// same target vocabulary; the older broader records use the catalogue's own `applicability`, as
// design/proposals/species-frames/frames.py APPLICABILITY does. New parts add their owners below.
//
// A guard decides presence for a species (a part the plan never has is absent: no locus) and
// activity for an individual (an open part switch that is off in this individual leaves its
// parts carried but asleep). It never rejects a draw.
import { LOCI, PLAN_SWITCHES, PART_SWITCHES, DOING_FAMILIES } from "./catalogue.mjs";

const V1_APPLICABILITY = {
  axial: (v) => v["development.axialRepeat"] === "chain",
  rooted: (v) => v["development.attachments"] === true,
  articulated: (v) => v["development.articulated"] === true,
  "two-link": (v) => v["development.articulated"] === true && (v["appendage.role"] === "contact-chain" || v["appendage.freeLinks"] === 2),
  membrane: (v) => v["development.membrane"] === true,
  fin: (v) => v["development.fin"] === true,
  "axial-actuator": (v) => v["development.wave"] === true,
  marked: (v) => v["markings.enabled"] === true,
  ocular: (v) => v["modules.exteriorEyePair"] === true,
  scales: (v) => v["covering.kind"] === "scales",
  bilateral: (v) => v["organization.symmetry"] === "bilateral",
  all: () => true,
};

// v1 consumerGuard, verbatim in meaning (compositional-vocabulary-adapter.mjs lines 47-94), with
// the one deliberate change the pipeline asks for: bilateral contact and flap facts no longer
// depend on `region-root` alone, so `appearance.underside-palette` (the second pigment) is owned
// by any bilateral plan with chains, flaps, ears or a tail.
function v1Guard(id, v) {
  const radial = v["organization.symmetry"] === "radial", head = v["modules.typedHead"], role = v["appendage.role"], groups = v["appendage.groups"];
  const contact = role === "contact-chain", free = role === "free-chain", depth = v["organization.depth"], fan = v["organization.layout"] === "fan";
  const activeChains = (contact && !radial) || ((contact || free) && groups > 0);
  const guards = {
    "anatomy.region-cross-exponent": [!radial, "bilateral primary cross-section"],
    "anatomy.contact-terminal-form": [contact && activeChains, "contact terminal owner"],
    "appearance.fur-length": [v["covering.furEnabled"], "fur field"],
    "appearance.fur-flow": [v["covering.furEnabled"], "fur field"],
    "growth.core-width-ratio": [!radial, "bilateral primary axes"],
    "growth.core-depth-ratio": [!radial, "bilateral primary axes"],
    "growth.radial-cross-radius": [radial, "radial primary section"],
    "growth.region-taper": [depth > 1, "child region owner"],
    "growth.region-bend": [depth > 1 && !fan && !radial, "bilateral serial child regions"],
    "growth.branch-angle": [depth > 1 && fan && !radial, "bilateral fan child regions"],
    "growth.join-throat-ratio": [(depth > 1 || head) && v["organization.join"] === "narrow", "narrow connection owner"],
    "growth.free-proximal-ratio": [(free || (contact && radial)) && groups > 0, "free/radial chain owner"],
    "growth.free-distal-ratio": [((contact && radial) || (free && v["appendage.freeLinks"] === 2)) && groups > 0, "two-link free/radial chain owner"],
    "growth.free-radius-ratio": [free && groups > 0, "free-chain owner"],
    "growth.support-drop-ratio": [contact && !radial, "bilateral contact drop"],
    "growth.support-splay-ratio": [contact && !radial, "bilateral contact splay"],
    "growth.support-radius-ratio": [contact && activeChains, "contact chains"],
    "growth.terminal-length-ratio": [contact && activeChains, "contact terminal owner"],
    "growth.terminal-depth-ratio": [contact && activeChains, "contact terminal owner"],
    "growth.posterior-length-ratio": [false, "no old posterior owner"],
    "growth.posterior-width-ratio": [false, "no old posterior owner"],
    "appearance.underside-palette": [!radial && (activeChains || v["modules.wingPair"] || v["ears.enabled"] || v["tail.enabled"] || v["belly.enabled"]), "bilateral second-pigment owner"],
    "appearance.anatomical-covering": [!v["covering.furEnabled"], "skin/scales selection without fur"],
    "appearance.anatomical-covering-extent": [!v["covering.furEnabled"] && v["covering.kind"] === "scales", "scale field"],
    "appearance.anatomical-scale-size": [!v["covering.furEnabled"] && v["covering.kind"] === "scales", "scale field"],
    "anatomy.auricular-form": [head && v["ears.enabled"], "head-owned ears"],
    "growth.auricular-length-ratio": [head && v["ears.enabled"], "head-owned ears"],
    "anatomy.auricular-presence": [head, "typed head owner"],
    "cognition.exploration-tendency": [v["innate.enabled"], "innate profile"],
    "cognition.arousal-threshold": [v["innate.enabled"], "innate profile"],
  };
  if (id.startsWith("growth.head-")) return [head, "typed head owner"];
  if (["anatomy.muzzle-presence", "anatomy.crown-presence", "anatomy.exterior-eye-presence"].includes(id)) return [head, "typed head owner"];
  if (id.startsWith("growth.muzzle-")) return [head && v["modules.muzzleAndJaw"], "head muzzle owner"];
  if (id.startsWith("growth.exterior-eye-")) return [head && v["modules.exteriorEyePair"], "head ocular owner"];
  if (id === "anatomy.crown-form" || id === "growth.crown-height-ratio") return [head && v["modules.crownPair"], "head crown owner"];
  if (id.startsWith("growth.wing-")) return [v["modules.wingPair"], "thin-surface owner"];
  if (id.startsWith("growth.axial-tail-")) return [v["tail.enabled"], "axial tail"];
  if (id.startsWith("appearance.marking-") && id !== "appearance.marking-switch") return [v["markings.enabled"], "marking field"];
  return guards[id] ?? [true, "compatible construction consumer"];
}

// Owners of the new records (catalogue.mjs NEW_LOCI `owner`).
function newGuard(locus, v) {
  const owner = locus.owner;
  if (owner === null || owner === undefined) return [true, "any body"];
  if (owner === "head") return [v["modules.typedHead"], "typed head owner"];
  if (owner === "flaps") return [v["modules.wingPair"], "thin-surface owner"];
  if (owner === "contact") return [v["appendage.role"] === "contact-chain", "contact terminal owner"];
  if (owner === "tail") return [!!v["tail.enabled"], "axial tail"];
  if (owner === "ears") return [!!v["ears.enabled"], "head-owned ears"];
  if (owner === "fur") return [!!v["covering.furEnabled"], "fur field"];
  const sw = SWITCH_TARGETS[owner];
  if (!sw) throw new Error(`${locus.id}: unknown owner ${owner}`);
  return [!!v[sw], `${owner} on`];
}

// Part switch → the target it sets (v1 targets for v1 switches; new targets for new ones).
export const SWITCH_TARGETS = {
  "anatomy.muzzle-presence": "modules.muzzleAndJaw", "anatomy.crown-presence": "modules.crownPair",
  "anatomy.exterior-eye-presence": "modules.exteriorEyePair", "anatomy.auricular-presence": "ears.enabled",
  "anatomy.axial-tail-presence": "tail.enabled", "appearance.marking-switch": "markings.enabled",
  "anatomy.antenna-presence": "antennae.enabled", "anatomy.leaf-presence": "leaves.enabled",
  "anatomy.foot-skirt-presence": "skirt.enabled", "anatomy.wing-case-presence": "wingCases.enabled",
  "appearance.face-mask": "mask.enabled", "appearance.tail-rings": "tailRings.enabled", "anatomy.horn-presence": "horns.enabled",
  "anatomy.beak-presence": "beak.enabled", "appearance.feather-presence": "feathers.enabled", "anatomy.shell-presence": "shell.enabled",
  "physiology.charged-body": "charged.enabled",
  "anatomy.tail-tip-bulb": "tailBulb.enabled", "anatomy.top-cap-sheet": "cap.enabled", "appearance.belly-field": "belly.enabled",
};

// Is this locus's owner on, given plan facts `v` (with the part-switch targets already set)?
export function ownerOn(id, v) {
  const locus = LOCI.get(id);
  if (!locus) throw new Error(`unknown locus ${id}`);
  if (PLAN_SWITCHES.has(id)) return [false, "plan switch: a frame fact, never carried"];
  if (locus.provenance.catalogue.startsWith("mb-genome-framework")) return newGuard(locus, v);
  if (locus.target || id.startsWith("anatomy.") || id.startsWith("growth.") || id.startsWith("appearance.marking-") || id === "appearance.fur-length" || id === "appearance.fur-flow" || id.startsWith("cognition.")) {
    const [on, why] = v1Guard(id, v);
    return [on, why];
  }
  // Older broader records: the catalogue's own applicability says who owns them.
  const app = locus.applicability ?? "all";
  if (!V1_APPLICABILITY[app]) throw new Error(`${id}: applicability ${app}`);
  return [V1_APPLICABILITY[app](v), `catalogue applicability '${app}'`];
}

// Does a species on this plan carry this locus at all (taxonomy §2: absent, not switched off)?
// A locus is carried when its owner is on and something consumes it (a drawing consumer, or the
// behaviour layer for a doing). Old records with no consumer are absent until one exists.
export function carried(id, v) {
  const locus = LOCI.get(id);
  if (locus.status !== "validated") return [false, "draft: no implemented copy contract"];
  if (PLAN_SWITCHES.has(id)) return [false, "plan switch: a frame fact"];
  const [on, why] = ownerOn(id, v);
  if (!on) return [false, `absent: no ${why}`];
  if (!locus.consumer) return [false, "absent: carried by v1 but nothing draws or weighs it yet"];
  return [true, locus.consumer];
}

export const isDoing = (id) => DOING_FAMILIES.has(LOCI.get(id).family);
export const isPartSwitch = (id) => PART_SWITCHES.has(id);

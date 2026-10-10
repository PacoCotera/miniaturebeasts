// Body plans: the plan key of design/proposals/taxonomy/plans.json
// (segments|layout|symmetry|limbs|feeler groups|feeler links|leg pairs|flaps|covering) read into
// plan facts, the body rig it selects and the limb sets with their stations per region.
//
// This is the framework change art-pipeline.md §2 asks for: a plan says which region carries
// which pair (fore legs on the front region, wings on the thorax, rays round a hub), how many
// links a limb has, its posture and ground contact, and whether the head is fused or necked.
// v1 rooted every chain, flap and the head on `region-root` (compositional-source-construction.mjs,
// the `anchor` node); that is what made a two- or three-region body a legged bulb towing legless
// bulbs.
export const PLAN_FIELDS = ["segments", "layout", "symmetry", "limbs", "groups", "links", "pairs", "flaps", "covering"];
const DEPTH = { one: 1, two: 2, three: 3 };
const GROUPS = { zero: 0, one: 1, two: 2, three: 3 };
const PAIRS = { one: 1, two: 2, three: 3 };
const LINKS = { one: 1, two: 2 };

export function parsePlanKey(key) {
  const parts = key.split("|");
  if (parts.length !== 9) throw new Error(`plan key needs 9 fields: ${key}`);
  const p = Object.fromEntries(PLAN_FIELDS.map((f, i) => [f, parts[i]]));
  for (const [f, allowed] of [["segments", DEPTH], ["groups", GROUPS], ["links", LINKS], ["pairs", PAIRS]]) if (!(p[f] in allowed)) throw new Error(`${f}: ${p[f]}`);
  if (!["serial", "fan"].includes(p.layout) || !["bilateral", "radial"].includes(p.symmetry) || !["none", "free", "contact"].includes(p.limbs) ||
      !["off", "on"].includes(p.flaps) || !["skin", "scales", "fur"].includes(p.covering)) throw new Error(`bad plan key ${key}`);
  return p;
}
export const planKeyOf = (p) => PLAN_FIELDS.map((f) => p[f]).join("|");

// The seven body rigs (taxonomy §3, "7 body rigs": one, two and three regions in a row; radial; a
// bilateral fan; two radial fans).
export function rigOf(p) {
  const d = DEPTH[p.segments];
  if (p.symmetry === "bilateral" && p.layout === "serial") return `B${d}`;
  if (p.symmetry === "radial" && p.layout === "serial") return d === 1 ? "R1" : `R${d}`;
  if (p.symmetry === "bilateral") return "Bfan";
  return `Rfan${d}`;
}

// Plan code as the taxonomy writes it: B1·L4, R1·flaps, B3·L6·flaps, Bfan2·flaps, Rfan2·rays.
export function planCode(p, extras = {}) {
  const d = DEPTH[p.segments];
  const body = p.layout === "fan" ? `${p.symmetry === "radial" ? "R" : "B"}fan${d}` : `${p.symmetry === "radial" ? "R" : "B"}${d}`;
  const limbs = p.limbs === "contact" ? (p.symmetry === "radial" ? "rays" : `L${2 * PAIRS[p.pairs]}`) : p.limbs === "free" ? "feelers" : null;
  const flaps = p.flaps === "on" ? (extras.fins ? "fins" : "flaps") : null;
  return [body, limbs, flaps].filter(Boolean).join("·");
}

// Plan facts in the v1 resolver's target vocabulary, so the guards ported from v1 read them
// unchanged, plus the rig facts. `extras` are the per-species plan switches the key does not
// carry: join (broad or narrow), wave (axial deformation), fins (fin rooting for a swimmer),
// float (afloat, no ground contact), stand (a fan plan stands on its up axis: the plant's bulb with
// leaves on top, the wisp's vertical ribbon; plans.json standingPlans), flapPairs (1 or 2 pairs on the
// flap region) and flapRest ("raised", a V that reads in every view, or "flat", broadside over the
// back like a moth at rest; plans.json twoPairFlapPlans).
export function planFacts(key, extras = {}) {
  const p = parsePlanKey(key);
  const depth = DEPTH[p.segments], radial = p.symmetry === "radial", fan = p.layout === "fan";
  const join = extras.join ?? (depth > 1 ? "narrow" : "broad");
  const limbs = p.limbs, pairs = PAIRS[p.pairs], groups = GROUPS[p.groups], links = LINKS[p.links];
  const fins = !!extras.fins && p.flaps === "on";
  const values = {
    "organization.depth": depth, "organization.layout": p.layout, "organization.symmetry": p.symmetry,
    "organization.join": join, "modules.typedHead": true, "modules.exteriorEyePairPlan": true,
    "appendage.role": limbs === "none" ? "none" : limbs === "free" ? "free-chain" : "contact-chain",
    "appendage.groups": limbs === "free" ? Math.max(1, groups) : limbs === "contact" && radial ? 1 : 0,
    "appendage.freeLinks": links, "support.pairCount": pairs, "modules.wingPair": p.flaps === "on",
    "covering.furEnabled": p.covering === "fur", "covering.kind": p.covering === "scales" ? "scales" : "smooth-skin",
    "development.axialRepeat": depth > 1 ? "chain" : "single", "development.attachments": limbs !== "none",
    "development.articulated": limbs !== "none", "development.membrane": p.flaps === "on",
    "development.fin": fins, "development.wave": !!extras.wave, "innate.enabled": true,
  };
  const rig = rigOf(p);
  const stations = limbStations(p, depth);
  const limbSet = limbs === "contact" ? (radial ? "rays" : "legs") : limbs === "free" ? "feelers" : null;
  const posture = limbSet === "legs" ? (pairs === 3 ? "splayed" : pairs === 1 ? "upright" : "plantigrade") : limbSet === "rays" ? "rooted" : limbSet === "feelers" ? (radial ? "trailing" : "stilts") : null;
  const ground = limbSet === "legs" || limbSet === "rays" ? "feet" : limbSet === "feelers" && !radial ? "feeler tips" : fins ? "afloat" : "belly";
  const flapSet = p.flaps !== "on" ? null : fins ? "fins" : radial ? "cap" : "wings";
  const flapRegion = p.flaps === "on" ? (depth === 3 ? 1 : 0) : null;
  const states = stateMachine(limbSet, flapSet, posture, extras, p);
  return {
    key, plan: p, code: planCode(p, extras), rig, depth, radial, fan, join, values, extras: { join, wave: !!extras.wave, fins, float: !!extras.float, stand: !!extras.stand, flapPairs: extras.flapPairs === 2 ? 2 : 1, flapRest: extras.flapRest === "flat" ? "flat" : "raised" },
    limbSet, posture, ground, stations, links: limbSet === "legs" || limbSet === "rays" ? 2 : links, flapSet, flapRegion,
    tailRegion: fan ? 0 : depth - 1, head: join === "narrow" ? "neck" : "fused", states,
  };
}

// Where each limb pair roots: [{region, u}] with u along the region's length (-1 front, +1 back)
// before structure.attachment-position shifts it. Legs: one pair per region when there are as
// many regions as pairs, otherwise front and back regions first, the middle last; rays sit round the
// hub; feeler groups go on the front regions.
export function limbStations(p, depth) {
  const limbs = p.limbs;
  if (limbs === "none") return [];
  if (limbs === "contact") {
    const pairs = PAIRS[p.pairs];
    if (p.symmetry === "radial") return [{ region: 0, u: 0, rays: 3 * pairs }];
    if (pairs === 1) return [{ region: Math.min(1, depth - 1), u: depth === 1 ? 0.15 : -0.1 }]; // one pair under the body's middle (a bird)
    if (p.layout === "fan") return pairs === 2 ? [{ region: 0, u: -0.3 }, { region: 0, u: 0.5 }] : [{ region: 0, u: -0.5 }, { region: 0, u: 0 }, { region: 0, u: 0.5 }];
    if (depth === 1) return pairs === 2 ? [{ region: 0, u: -0.55 }, { region: 0, u: 0.55 }] : [{ region: 0, u: -0.62 }, { region: 0, u: 0 }, { region: 0, u: 0.62 }];
    if (depth === 2) return pairs === 2 ? [{ region: 0, u: 0.1 }, { region: 1, u: 0.1 }] : [{ region: 0, u: -0.45 }, { region: 0, u: 0.5 }, { region: 1, u: 0.2 }];
    return pairs === 2 ? [{ region: 0, u: 0.2 }, { region: 2, u: 0 }] : [{ region: 0, u: 0.2 }, { region: 1, u: 0 }, { region: 2, u: -0.1 }];
  }
  const groups = Math.max(1, GROUPS[p.groups]);
  if (p.symmetry === "radial") return Array.from({ length: groups }, (_, i) => ({ region: 0, u: 0, rays: 3, ring: i }));
  const regions = p.layout === "fan" ? 1 : depth;
  return Array.from({ length: groups }, (_, i) => ({ region: Math.min(regions - 1, Math.floor((i * regions) / groups)), u: groups === 1 ? -0.3 : -0.6 + (1.2 * i) / (groups - 1) }));
}

// The state machine's states come from the plan (taxonomy §1); the species sets transitions.
function stateMachine(limbSet, flapSet, posture, extras, p) {
  const states = ["idle", "settle", "sleep", "eat", "flee"];
  if (limbSet === "legs") states.push(posture === "splayed" ? "crawl" : p.segments === "one" ? "hop" : "scurry");
  if (limbSet === "legs" && posture !== "splayed") states.push("walk");
  if (limbSet === "rays") states.push("wobble");
  if (limbSet === "feelers") states.push(p.symmetry === "radial" ? "drift" : "tiptoe");
  if (!limbSet && flapSet !== "fins" && !extras.float) states.push(extras.wave ? "slide" : "waddle");
  if (flapSet === "wings") states.push("flutter", "glide");
  if (flapSet === "fins") states.push("swim", "glide");
  if (flapSet === "cap") states.push("bob");
  if (extras.float) states.push("float", "open");
  return states;
}

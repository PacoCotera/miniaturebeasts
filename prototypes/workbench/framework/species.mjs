// Species first: the frame method (design/proposals/species-frames.md §1, frames.py) and the
// generative taxonomy (taxonomy.md §3, taxonomy.py) on the pan-genome catalogue.
//
// A body is built from a frame, never from independent draws: the plan's switches pick the rig
// and the limb sets, the clan's signature fixes its feature parts, the species fixes everything
// else by seed and opens its traits by tier. Individuals vary only at the open loci, from the
// species' pools. The three authored frames (the files hopper, puffcap and glowtail in frames.py, here S01, S02
// and S03: Loika, Untuva and Tuikis) keep their open traits and fixed values.
import { CATALOGUE, LOCI, VALIDATED, DRAFTS, V1_DEFAULTS, PART_SWITCHES, PLAN_SWITCHES, BODY_PIGMENTS, SECOND_PIGMENTS, resolveCopies, looksFor, alleleIds, isContinuous, valueRange } from "./catalogue.mjs";
import { poolBound } from "./envelope.mjs";
import { cross } from "./cross.mjs";
import { planFacts } from "./plans.mjs";
import { carried, ownerOn, isDoing, isPartSwitch, SWITCH_TARGETS } from "./guards.mjs";
import { resolveIndividual } from "./resolve.mjs";
import { buildBody } from "./rig.mjs";
import { validateBody } from "./validate.mjs";

export const SCHEMA = "mb-species-frame/2";
// The frame version a genome is built against: 2 since catalogue 8 (the tiny head alleles); 3 since the
// sixteen species glyphs were redrawn as abstract marks (2026-10-08, the owner's decision; the stamp
// carries a glyph, so a changed glyph is a new frame). A saved mibi keeps the version it was born with.
export const FRAME_VERSION = 3;
export const RING = ["coat", "face", "shape", "legs-tail", "movement", "stamina", "character", "glow", "charge"];
export const CHAPTER_NAMES = { coat: "Coat", face: "Face", shape: "Shape", "legs-tail": "Legs & tail", movement: "Movement", stamina: "Stamina", character: "Character", glow: "Glow", charge: "Charge" };
export const WHEEL = ["marigold", "coral", "raspberry", "plum", "periwinkle", "cobalt", "lagoon", "jade", "russet", "charcoal"];
const SECONDS = ["cream", "slate", "milk-mint", "ice", "butter", "peach"];
export const TIERS = { starter: [5, 6], early: [7, 10], mid: [12, 18], late: [24, 34] };
export const FINDS = { character: "a vybronic crystal", stamina: "a storm-glass shard", movement: "a tide pearl", glow: "an ember seed", charge: "a storm-glass shard" };

// A deterministic stream (mulberry32, as v1 generation and the genome stamp use).
export function rng(seed) {
  let a = 0;
  for (const ch of String(seed)) a = (Math.imul(a ^ ch.charCodeAt(0), 0x01000193) + 0x9e3779b9) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (r, list) => list[Math.floor(r() * list.length)];

// The shared trait vocabulary (taxonomy §6): chapter, trait id, name, loci, looks.
export const VOCAB = [
  ["coat", "colour", "Colour", ["appearance.body-palette"], null],
  ["coat", "second-colour", "Trim", ["appearance.underside-palette"], null],
  ["coat", "markings", "Markings", ["appearance.marking-switch", "appearance.marking-layout", "appearance.marking-extent", "appearance.marking-scale", "appearance.marking-orientation", "appearance.marking-contrast"], ["plain", "bands", "spots", "bands and spots"]],
  ["coat", "fluff", "Fluff", ["appearance.fur-length", "appearance.fur-flow"], ["short, straight", "between", "long, swept"]],
  ["coat", "scales", "Scales", ["appearance.anatomical-covering-extent", "appearance.anatomical-scale-size"], ["few, fine", "between", "many, coarse"]],
  ["coat", "sheen", "Sheen", ["appearance.sheen"], ["matte", "between", "glossy"]],
  ["coat", "flap-markings", "Pattern", ["appearance.flap-marking"], ["plain", "spots", "bars", "bars and spots"]],
  ["coat", "translucency", "Translucency", ["appearance.flap-translucency"], ["opaque", "between", "see-through"]],
  ["coat", "cap-colour", "Tint", ["appearance.cap-palette"], null],
  ["coat", "cap-spots", "Flecks", ["appearance.cap-spots"], ["bare", "spots"]],
  ["coat", "leaf-covering", "Leaf covering", ["appearance.leaf-covering"], ["bare", "leafy"]],
  ["coat", "fur-reach", "Tufts", ["appearance.fur-reach"], ["body only", "tail", "tail and ears"]],
  ["coat", "mask", "Mask", ["appearance.face-mask-shape"], ["a band", "stripes"]],
  ["coat", "rings", "Tail rings", ["growth.tail-ring-count"], ["a pale tip", "two rings", "four rings"]],
  ["coat", "feathers", "Feathers", ["appearance.feather-length"], ["short", "between", "long"]],
  ["coat", "shell-plates", "Scutes", ["appearance.shell-plates"], ["smooth", "plated"]],
  ["face", "eyes", "Eyes", ["growth.exterior-eye-size-ratio", "growth.exterior-eye-spacing-ratio"], ["small, close", "between", "big, wide"]],
  ["face", "snout", "Snout", ["growth.muzzle-projection-ratio", "growth.muzzle-width-ratio"], ["short, narrow", "between", "long, broad"]],
  ["face", "crown", "Crown", ["growth.crown-height-ratio"], ["low", "between", "tall"]],
  ["face", "ears", "Ears", ["anatomy.auricular-form", "growth.auricular-length-ratio"], ["short, round", "between", "long, pointed"]],
  ["face", "head", "Head", ["growth.head-length-ratio", "growth.head-width-ratio", "growth.head-depth-ratio", "growth.head-lift-ratio"], ["small, low", "between", "big, raised"]],
  ["face", "antennae", "Antennae", ["growth.antenna-length-ratio", "anatomy.antenna-form"], ["short threads", "between", "long feathers"]],
  ["face", "ear-tilt", "Ears", ["anatomy.ear-tilt"], ["upright", "drooping"]],
  ["face", "horns", "Horns", ["growth.horn-curl", "anatomy.horn-branching"], ["straight", "between", "curled antlers"]],
  ["face", "beak", "Beak", ["growth.beak-length-ratio"], ["short", "between", "long"]],
  ["face", "feather-crest", "Crest", ["growth.feather-crest"], ["low", "between", "tall"]],
  ["shape", "size", "Size", ["growth.core-half-length"], ["small", "between", "large"]],
  ["shape", "build", "Build", ["growth.core-width-ratio", "growth.core-depth-ratio"], ["slim", "between", "stout"]],
  ["shape", "roundness", "Roundness", ["growth.radial-cross-radius"], ["flat", "between", "plump"]],
  ["shape", "body", "Body", ["anatomy.region-longitudinal-form"], ["egg", "barrel", "pear"]],
  ["shape", "hind-body", "Haunch", ["growth.region-taper"], ["small", "between", "full"]],
  ["shape", "back-line", "Topline", ["growth.region-bend"], ["dipping", "level", "arched"]],
  ["shape", "waist", "Waist", ["growth.join-throat-ratio"], ["thin", "between", "thick"]],
  ["shape", "flaps", "Flaps", ["growth.wing-span-ratio", "growth.wing-chord-ratio", "growth.wing-sweep-ratio"], ["small, straight", "between", "wide, swept"]],
  ["shape", "wing-cases", "Sheaths", ["growth.wing-case-extent", "anatomy.wing-case-seam"], ["short, closed", "between", "long, parted"]],
  ["shape", "skirt", "Skirt", ["growth.foot-skirt-width-ratio"], ["narrow", "between", "wide"]],
  ["shape", "leaves", "Leaves", ["growth.leaf-count", "growth.leaf-length-ratio"], ["few short", "between", "many long"]],
  ["shape", "shell", "Shell", ["growth.shell-dome-ratio"], ["low", "between", "high dome"]],
  ["legs-tail", "legs", "Legs", ["growth.support-drop-ratio", "growth.support-radius-ratio", "growth.support-splay-ratio"], ["short, fine", "between", "long, stout"]],
  ["legs-tail", "feet", "Feet", ["anatomy.contact-terminal-form", "growth.terminal-length-ratio", "growth.terminal-depth-ratio"], ["round feet", "pads", "digging wedges"]],
  ["legs-tail", "feelers", "Feelers", ["growth.free-proximal-ratio", "growth.free-distal-ratio", "growth.free-radius-ratio"], ["short, fine", "between", "long, thick"]],
  ["legs-tail", "rays", "Rays", ["growth.free-proximal-ratio", "growth.free-distal-ratio", "growth.support-radius-ratio"], ["short, fine", "between", "long, stout"]],
  ["legs-tail", "tail", "Tail", ["growth.axial-tail-length-ratio", "growth.axial-tail-width-ratio"], ["short, thin", "between", "long, thick"]],
  ["legs-tail", "tail-curl", "Carriage", ["growth.axial-tail-bend"], ["hangs", "straight", "curls up"]],
  ["movement", "pace", "Pace", ["movement.cycle-rate"], ["steady", "between", "quick"]],
  ["movement", "turning", "Turning", ["movement.turn-control"], ["wide turns", "between", "tight turns"]],
  ["movement", "stride", "Stride", ["movement.stride-preference", "movement.contact-phase"], ["short steps", "between", "long steps"]],
  ["movement", "weave", "Weave", ["movement.axial-amplitude", "movement.axial-phase"], ["straight", "between", "big weave"]],
  ["movement", "flap", "Flap", ["movement.membrane-stroke", "movement.membrane-coordination"], ["slow beat", "between", "quick beat"]],
  ["movement", "steering", "Steering", ["movement.fin-steering"], ["drifts", "between", "darts"]],
  ["stamina", "strength", "Strength", ["energy.actuator-capacity"], ["light", "between", "strong"]],
  ["stamina", "reserve", "Reserve", ["energy.reserve-capacity"], ["tires soon", "between", "goes long"]],
  ["stamina", "thrift", "Thrift", ["energy.action-efficiency"], ["thrifty", "between", "ordinary"]],
  ["stamina", "light-feeding", "Basking", ["energy.light-feeding"], ["shade-happy", "between", "sun-hungry"]],
  ["character", "curiosity", "Curiosity", ["cognition.exploration-tendency"], ["reserved", "between", "seeking"]],
  ["character", "nerve", "Nerve", ["cognition.arousal-threshold"], ["jumpy", "between", "unflappable"]],
  ["glow", "glow", "Glow", ["appearance.emission-brightness"], ["dim", "between", "bright"]],
  ["glow", "glow-length", "Duration", ["appearance.emission-length"], ["flicker", "between", "all evening"]],
  ["charge", "charge", "Charge", ["physiology.charge"], ["a spark", "between", "a bolt"]],
  ["charge", "phase", "Phase", ["physiology.phase"], ["solid", "between", "faint"]],
  ["charge", "pull", "Pull", ["physiology.pull"], ["weak", "between", "strong"]],
];
const vocabTrait = (id) => { const t = VOCAB.find((v) => v[1] === id); if (!t) throw new Error(`vocabulary has no trait ${id}`); return { chapter: t[0], id: t[1], name: t[2], loci: t[3], looks: t[4] }; };

// --- the frame -------------------------------------------------------------------------------------

// `spec`: { id, name, plural, order, summary, taxonomy:{...}, plan:{key, extras}, clan, features:{switch: "on"},
//   fixed:{locus: allele}, open:[{trait, pool?, looks?, shapeable?, override?}] | null (generate by tier),
//   tier, seed, sealed:{chapter: find}, pod, glyph, pending:[] }
export function buildFrame(spec, options = {}) {
  const samples = options.samples ?? 200;
  const plan = planFacts(spec.plan.key, spec.plan.extras ?? {});
  // Which part switches the species has: the clan's features (on) plus any the species opens.
  const authoredOpenLoci = spec.open ? spec.open.flatMap((o) => o.trait ? vocabTrait(o.trait).loci : o.loci) : [];
  const switchesOn = { ...spec.features };
  const vAll = { ...plan.values };
  for (const [id, state] of Object.entries(switchesOn)) if (state === "on") vAll[SWITCH_TARGETS[id]] = true;
  for (const id of [...authoredOpenLoci, ...(spec.openSwitches ?? [])]) if (isPartSwitch(id)) vAll[SWITCH_TARGETS[id]] = true;
  // Loci the all-on probe carries, from trunk and the clan's branch.
  const inScope = VALIDATED.filter((l) => l.scope === "trunk" || l.clan === spec.clan);
  const carriedIds = [], absent = [];
  const probeOn = (id) => carried(id, vAll);
  for (const l of inScope) {
    if (PLAN_SWITCHES.has(l.id)) continue;
    if (isPartSwitch(l.id) && !(l.id in switchesOn) && !authoredOpenLoci.includes(l.id) && !(spec.openSwitches ?? []).includes(l.id)) { absent.push({ id: l.id, why: "absent: the plan and clan never have this part" }); continue; }
    const [on, why] = probeOn(l.id);
    if (on) carriedIds.push(l.id); else absent.push({ id: l.id, why });
  }
  for (const l of VALIDATED) if (l.scope === "branch" && l.clan !== spec.clan) absent.push({ id: l.id, why: `absent: a ${l.clan} branch locus` });
  const r = rng(`${spec.clan}:${spec.id}:${spec.seed ?? 1}`);
  // Fixed values: clan finish and species facts; the rest by seed.
  const fixed = { ...spec.fixed };
  fixed["appearance.body-palette"] ??= spec.anchor;
  if (carriedIds.includes("appearance.underside-palette")) fixed["appearance.underside-palette"] ??= spec.second ?? "cream";
  // Open traits: authored, or by tier from what the plan can show.
  let open = spec.open;
  if (!open) {
    // Only traits the plan can show, never the size class, never a locus the clan's signature fixes.
    const signature = new Set(Object.keys(spec.finish ?? {}));
    const applicable = VOCAB.map((t) => vocabTrait(t[1])).filter((t) => t.loci.every((id) => carriedIds.includes(id) && !signature.has(id)) && t.id !== "size" && !(spec.lockTraits ?? []).includes(t.id) && !(spec.neverOpen ?? []).includes(t.id));
    const [lo, hi] = TIERS[spec.tier];
    const n = Math.min(applicable.length, lo + Math.floor(r() * (hi - lo + 1)));
    const looks = applicable.filter((t) => !["movement", "stamina", "character", "glow", "charge"].includes(t.chapter));
    const doings = applicable.filter((t) => ["movement", "stamina", "character", "glow", "charge"].includes(t.chapter));
    const must = spec.tier === "starter" ? [] : looks.filter((t) => t.id === "colour");
    const rest = shuffle(r, looks.filter((t) => !must.includes(t)));
    let chosen = [...must, ...rest.slice(0, Math.max(0, Math.round(n * 0.65) - must.length))];
    chosen = [...chosen, ...shuffle(r, doings).slice(0, Math.max(0, n - chosen.length))];
    for (const [chapter] of Object.entries(spec.sealed ?? {})) { // a sealed chapter needs two traits behind the seal
      const have = chosen.filter((t) => t.chapter === chapter).length;
      chosen.push(...doings.filter((t) => t.chapter === chapter && !chosen.includes(t)).slice(0, Math.max(0, 2 - have)));
    }
    for (const t of spec.alwaysOpen ?? []) if (!chosen.some((c) => c.id === t) && applicable.some((a) => a.id === t)) chosen.push(vocabTrait(t));
    open = chosen.map((t) => ({ trait: t.id }));
  }
  const traits = open.map((o) => {
    const t = o.trait ? vocabTrait(o.trait) : { chapter: o.chapter, id: o.id, name: o.name, loci: o.loci, looks: o.looks };
    return { ...t, ...(o.name ? { name: o.name } : {}), ...(o.looks ? { looks: o.looks } : {}), pool: o.pool ?? null, shapeable: o.shapeable, override: o.override ?? null, verdict: o.verdict ?? null };
  });
  for (const t of traits) for (const id of t.loci) {
    if (!carriedIds.includes(id)) throw new Error(`${spec.id}: open trait ${t.id} uses ${id}, which this species does not carry`);
    if (traits.filter((u) => u.loci.includes(id)).length > 1) throw new Error(`${spec.id}: ${id} in two traits`);
  }
  // Pools.
  const k = WHEEL.indexOf(spec.anchor);
  const colourPool = [spec.anchor, ...[1, -1, 2].map((d) => WHEEL[(k + d + WHEEL.length) % WHEEL.length])].slice(0, 1 + Math.floor(r() * 3) + 1);
  const pools = {};
  for (const t of traits) for (const id of t.loci) {
    const all = alleleIds(id);
    pools[id] = t.pool?.[id] ?? (id === "appearance.body-palette" ? colourPool : id === "appearance.underside-palette" ? [fixed["appearance.underside-palette"], ...shuffle(r, SECONDS.filter((p) => p !== fixed["appearance.underside-palette"])).slice(0, 2)] : poolBound(id, all, { clan: spec.clan, limbSet: plan.limbSet })); // E8
    if (!pools[id].every((a) => all.includes(a))) throw new Error(`${spec.id}: pool of ${id} is not in the catalogue`);
  }
  const openIds = Object.keys(pools);
  // Locked copies: fixed (one allele, homozygous, or a pair when the species' proportion sits between
  // two alleles), else the clan finish, else by seed (never a plan-free default).
  const locked = {};
  for (const id of carriedIds) {
    if (openIds.includes(id)) continue;
    let a = fixed[id];
    if (a === undefined) {
      if (isPartSwitch(id)) a = switchesOn[id] ?? "off";
      else if (id === "appearance.cap-palette") a = spec.anchor in BODY_PIGMENTS ? ["coral", "raspberry", "marigold", "plum"][Math.floor(r() * 4)] : "coral";
      else a = pick(r, alleleIds(id));
    }
    const pair = Array.isArray(a) ? [...a].sort() : [a, a];
    if (pair.length !== 2 || !pair.every((x) => alleleIds(id).includes(x))) throw new Error(`${spec.id}: ${id} cannot be ${JSON.stringify(a)}`);
    locked[id] = pair;
  }
  // Typical copies of the type specimen at open loci (the species' proportions where the trait is open).
  const typical = {};
  for (const [id, pair] of Object.entries(spec.typical ?? {})) {
    if (!openIds.includes(id)) continue;
    const p = Array.isArray(pair) ? [...pair].sort() : [pair, pair];
    if (p.every((x) => pools[id].includes(x))) typical[id] = p;
  }
  const frame = {
    schema: SCHEMA,
    species: { id: spec.id, name: spec.name, plural: spec.plural, order: spec.order ?? 0, summary: spec.summary ?? "" },
    taxonomy: { ...spec.taxonomy, clan: spec.clan, planKey: spec.plan.key, planCode: plan.code, rig: plan.rig, tier: spec.tier ?? "authored", seed: spec.seed ?? null, states: plan.states },
    catalogue: { id: CATALOGUE.id, version: CATALOGUE.version, parent: CATALOGUE.parent },
    plan: { key: spec.plan.key, extras: { join: plan.join, wave: plan.extras.wave, fins: plan.extras.fins, float: !!spec.plan.extras?.float, stand: !!spec.plan.extras?.stand, flapPairs: plan.extras.flapPairs, flapRest: plan.extras.flapRest }, code: plan.code, rig: plan.rig, limbSet: plan.limbSet, posture: plan.posture, ground: plan.ground, head: plan.head, flapSet: plan.flapSet, stations: plan.stations },
    signature: { anchor: spec.anchor, second: spec.second ?? null, feature: spec.feature, features: switchesOn, finish: spec.finish ?? {} },
    glyph: spec.glyph, pod: null, chapters: [], loci: [], absent, counts: null, notYet: null, typeSpecimen: null, viability: null,
    _pools: pools, _locked: locked, _traits: traits, _sealed: spec.sealed ?? {}, _typical: typical,
  };
  finishFrame(frame, spec);
  // Checks (frames.py: every open look is drawn; 200 random individuals build).
  const specimen = typeSpecimen(frame);
  const built = buildIndividual(frame, specimen);
  if (built.validation.status !== "valid") throw new Error(`${spec.id}: type specimen rejected: ${built.validation.problems.join("; ")}`);
  const sampleRng = rng(`${spec.id}:viability`);
  let constructed = 0;
  const failures = [];
  for (let i = 0; i < samples; i++) {
    const g = sampleIndividual(frame, sampleRng);
    try {
      const b = buildIndividual(frame, g);
      if (b.validation.status === "valid") constructed++; else failures.push(b.validation.problems[0]);
    } catch (e) { failures.push(e.message); }
  }
  frame.viability = { sampled: samples, constructed, failures: [...new Set(failures)].slice(0, 5), rule: "random copies from the species pools at every open locus; built by the rig and validated against the compositional contract" };
  frame.typeSpecimen = { genome: specimen, rule: "every open part switch on; an open locus at the species' typical copies where the frame names them (its proportions by kind), else numeric loci at the middle of their pool and categorical loci at the first allele", brief: brief(built.scene, frame), bounds: built.scene.bounds, counts: built.validation.counts };
  if (constructed !== samples) {
    const err = new Error(`${spec.id}: ${samples - constructed} of ${samples} individuals do not build: ${frame.viability.failures.join("; ")}`);
    err.frame = frame;
    throw err;
  }
  return frame;
}

function shuffle(r, list) { const a = [...list]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

function finishFrame(frame, spec) {
  const { _pools: pools, _locked: locked, _traits: traits, _sealed: sealed, _typical: typical = {} } = frame;
  const plan = planFacts(frame.plan.key, frame.plan.extras);
  const switchesOn = frame.signature.features;
  // The two probes: every open part switch on, and every one off (sleeping parts).
  const probe = (state) => {
    const v = { ...plan.values };
    for (const id of Object.keys(locked)) if (isPartSwitch(id)) v[SWITCH_TARGETS[id]] = locked[id][0] === "on";
    for (const id of Object.keys(pools)) if (isPartSwitch(id)) v[SWITCH_TARGETS[id]] = state === "on";
    return v;
  };
  const vOn = probe("on"), vOff = probe("off");
  const traitOf = {};
  for (const t of traits) for (const id of t.loci) traitOf[id] = t;
  const rows = [];
  const order = VALIDATED.map((l) => l.id).filter((id) => id in pools || id in locked);
  for (const id of order) {
    const locus = LOCI.get(id);
    const row = { id, family: locus.family, scope: locus.scope, ...(locus.clan ? { clan: locus.clan } : {}), switch: isPartSwitch(id), consumer: locus.consumer };
    const nature = isDoing(id) ? "doing" : "look";
    if (id in pools) {
      const t = traitOf[id];
      const [onNow] = ownerOn(id, vOn), [offNow] = ownerOn(id, vOff);
      if (!onNow) throw new Error(`${frame.species.id}: open locus ${id} is switched off by the frame (an invisible trait)`);
      const shapeable = t.shapeable ?? nature === "look";
      const kind = t.chapter in sealed ? "sealed" : !offNow && !isPartSwitch(id) ? "sleeping" : `heritable-${nature}`;
      row.kind = kind; row.nature = nature; row.chapter = t.chapter; row.trait = t.id; row.shapeable = shapeable; row.alleles = pools[id]; row.looks = looksFor(locus, pools[id]);
      row.guard = kind === "sleeping" ? `asleep in any individual whose ${t.loci.find((x) => isPartSwitch(x)) ?? "owner switch"} is off; drawn when it is on` : locus.consumer;
      if (typical[id]) row.typical = typical[id];
    } else {
      row.kind = "locked"; row.lockReason = isPartSwitch(id) ? "switch" : "fixed"; row.chapter = null; row.trait = null; row.shapeable = false;
      row.copies = locked[id]; row.looks = looksFor(locus, [locked[id][0]]); row.guard = locus.consumer;
      row.nature = nature;
    }
    rows.push(row);
  }
  frame.loci = rows;
  const chapters = [];
  for (const ch of RING) {
    const ts = traits.filter((t) => t.chapter === ch);
    if (!ts.length) continue;
    chapters.push({ id: ch, name: CHAPTER_NAMES[ch], sealed: ch in sealed, ...(ch in sealed ? { opensWith: sealed[ch] } : {}),
      traits: ts.map((t) => ({ id: t.id, name: t.name, loci: t.loci, looks: t.looks ?? looksFor(LOCI.get(t.loci[0]), pools[t.loci[0]]), nature: isDoing(t.loci[0]) ? "doing" : "look", shapeable: t.shapeable ?? !isDoing(t.loci[0]), ...(t.override ? { override: t.override } : {}), verdict: t.verdict ?? null })) });
  }
  frame.chapters = chapters;
  const count = (p) => rows.filter(p).length;
  frame.counts = {
    carried: rows.length, trunk: count((x) => x.scope === "trunk"), branch: count((x) => x.scope === "branch"), absent: frame.absent.length,
    locked: count((x) => x.kind === "locked"), lockedBy: { switch: count((x) => x.lockReason === "switch"), fixed: count((x) => x.lockReason === "fixed") },
    heritableLook: count((x) => x.kind === "heritable-look"), heritableDoing: count((x) => x.kind === "heritable-doing"), sleeping: count((x) => x.kind === "sleeping"), sealed: count((x) => x.kind === "sealed"),
    open: count((x) => x.kind !== "locked"), traits: traits.length,
    byChapter: Object.fromEntries(chapters.map((c) => [c.name, { loci: c.traits.reduce((s, t) => s + t.loci.length, 0), traits: c.traits.length }])),
    fieldGuideLooks: rows.filter((x) => x.kind !== "locked").reduce((s, x) => s + x.looks.length, 0),
    stampBitsPerCopy: rows.filter((x) => x.kind !== "locked").reduce((s, x) => s + Math.max(1, Math.ceil(Math.log2(alleleIds(x.id).length))), 0),
  };
  const fams = new Set(rows.map((x) => x.family));
  frame.notYet = { domains: CATALOGUE.families.map((f) => f.id).filter((f) => !fams.has(f)), drafts: DRAFTS.filter((d) => !["appearance.transparency", "energy.uptake-profile"].includes(d)), closedDrafts: { "appearance.transparency": "flap translucency (appearance.flap-translucency)", "energy.uptake-profile": "light feeding (energy.light-feeding)" }, pending: spec.pending ?? [] };
  // Pod parameters (species-frames §1).
  const size = { small: "small", medium: "medium", large: "large" }[(locked["growth.core-half-length"] ?? [pools["growth.core-half-length"]?.[0] ?? "medium"])[0]];
  const shell = plan.radial ? "segments" : plan.plan.covering === "fur" ? "soft ribs" : plan.plan.covering === "scales" ? "plates" : "smooth dots";
  const second = spec.pod?.second ?? (pools["appearance.body-palette"] ?? [spec.anchor])[1] ?? spec.second ?? spec.anchor;
  const hexOf = (p) => BODY_PIGMENTS[p] ?? SECOND_PIGMENTS[p] ?? "#888888";
  frame.pod = { sizeClass: size, proportion: null, shellPattern: shell, colourPair: [{ pigment: spec.anchor, hex: hexOf(spec.anchor) }, { pigment: second, hex: hexOf(second) }] };
  delete frame._pools; delete frame._locked; delete frame._traits; delete frame._sealed; delete frame._typical;
  frame.pools = pools; frame.locked = locked;
  frame.sealed = sealed;
}

// --- individuals ---------------------------------------------------------------------------------
export const openLoci = (frame) => frame.loci.filter((l) => l.kind !== "locked");

// The type specimen is the plan's default body: every open part switch on, every open locus at the
// species' typical copies where the frame names them (its proportions by kind), else every open
// numeric locus at the middle of its pool (the mixed pair of its two extremes) and every categorical
// or pigment locus at the first allele of its pool. (frames.py took the first allele everywhere; a
// species whose numeric pools are all at one end is not its own archetype.)
export function typeSpecimen(frame) {
  const loci = {};
  for (const l of frame.loci) {
    if (l.kind === "locked") { loci[l.id] = [...l.copies]; continue; }
    if (l.switch) { loci[l.id] = ["on", "on"]; continue; }
    if (l.typical) { loci[l.id] = [...l.typical]; continue; }
    const op = LOCI.get(l.id).operator;
    loci[l.id] = op === "copy-mean" && l.alleles.length > 1 ? [l.alleles[0], l.alleles.at(-1)] : [l.alleles[0], l.alleles[0]];
  }
  return { schema: "mb-genome/2", species: frame.species.id, frameVersion: FRAME_VERSION, loci, origin: { kind: "type-specimen" } };
}
export function sampleIndividual(frame, r, origin = { kind: "random" }) {
  const loci = {};
  for (const l of frame.loci) loci[l.id] = l.kind === "locked" ? [...l.copies] : [pick(r, l.alleles), pick(r, l.alleles)];
  return { schema: "mb-genome/2", species: frame.species.id, frameVersion: FRAME_VERSION, loci, origin };
}
// The cross (the-cross.md, decided 2026-10-08) lives in cross.mjs: blends for continuous loci,
// Mendelian switches with sleeping parts riding along, independent per locus, pedigree kinship and
// the penalty. This is the old entry, kept for the page and the tests: a cross with the decided
// rules, no kinship known.
export function crossIndividuals(frame, a, b, r) {
  return cross(frame, a, b, { rng: r });
}
// Shape a trait: pick one of three pictures (as it is, only the first copy, only the second).
export function shapeTrait(frame, genome, traitId, choice) {
  const trait = frame.chapters.flatMap((c) => c.traits).find((t) => t.id === traitId);
  if (!trait) throw new Error(`no trait ${traitId}`);
  const out = structuredClone(genome);
  for (const id of trait.loci) { const [p, q] = genome.loci[id]; out.loci[id] = choice === 0 ? [p, q] : choice === 1 ? [p, p] : [q, q]; }
  return out;
}
// A whole-genome check against its frame: locked copies equal the frame's, open copies in the pools.
export function checkGenome(frame, genome) {
  const problems = [];
  for (const l of frame.loci) {
    const c = genome.loci[l.id];
    if (!c) { problems.push(`${l.id} missing`); continue; }
    if (l.kind === "locked" && (c[0] !== l.copies[0] || c[1] !== l.copies[1])) problems.push(`${l.id}: locked copies differ from the frame (not this species)`);
    if (l.kind !== "locked") {
      const locus = LOCI.get(l.id);
      const inPool = (a) => typeof a === "number" ? isContinuous(locus) && (([lo, hi]) => a >= lo - 1e-9 && a <= hi + 1e-9)(valueRange(locus, l.alleles)) : l.alleles.includes(a);
      if (!c.every(inPool)) problems.push(`${l.id}: a copy outside the species pool`);
    }
  }
  for (const id of Object.keys(genome.loci)) if (!frame.loci.some((l) => l.id === id)) problems.push(`${id}: not a locus of this species`);
  return problems;
}

export function buildIndividual(frame, genome) {
  const resolved = resolveIndividual(frame, genome);
  resolved.species = frame.species.id; // the kind, for the envelope's caps by kind
  const scene = buildBody(resolved);
  const validation = validateBody(scene);
  return { resolved, scene, validation };
}

// A factual brief of what a body shows (v1 art-prompt-summary's role, kept as the sketch's caption).
export function brief(scene, frame) {
  const regions = scene.nodes.filter((n) => n.role === "primary-region").length;
  const parts = (role) => scene.nodes.filter((n) => n.role === role).length;
  const legs = scene.nodes.filter((n) => n.role === "contact-terminal").length + scene.nodes.filter((n) => n.role === "root-tuft").length / 4;
  const feelers = scene.nodes.filter((n) => n.role === "free-chain" && n.id.endsWith("-1")).length;
  const flaps = parts("thin-surface");
  const words = [`${regions} body region${regions > 1 ? "s" : ""} (${scene.plan.rig})`, "a head"];
  if (parts("muzzle")) words.push("a snout");
  if (parts("ocular-rim")) words.push(`${parts("ocular-rim")} eyes`);
  if (parts("crown")) words.push(`a ${parts("crown")}-leaf crest`);
  if (parts("auricular-sheet")) words.push("two ears");
  if (parts("antenna") / 2 >= 1) words.push("two antennae");
  if (legs) words.push(`${Math.round(legs)} ${scene.plan.limbSet === "rays" ? "rays" : "legs"}`);
  if (feelers) words.push(`${feelers} feelers`);
  if (flaps) words.push(`${flaps} ${scene.plan.flapSet === "fins" ? "fins" : scene.plan.flapSet === "cap" ? "cap flaps" : scene.nodes.some((n) => n.part === "petal") ? "petals and leaves" : "flaps"}`);
  if (parts("cap-sheet")) words.push("a cap on top");
  if (parts("axial-tail")) words.push(parts("tail-bulb") ? "a tail with a glowing bulb" : "a tail");
  if (parts("shell")) words.push("wing cases");
  if (parts("foot-skirt")) words.push("a foot skirt");
  return `${frame.species.name}: ${words.join(", ")}; ${scene.covering.kind}${scene.markings ? ", " + scene.markings.layout : ""}; ${scene.plan.posture ?? scene.plan.ground}, ${scene.plan.head} head.`;
}

export function genomeDigest(genome) {
  let h = 0x811c9dc5;
  const s = JSON.stringify(Object.keys(genome.loci).sort().map((k) => [k, genome.loci[k]]));
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return `${genome.species}-${h.toString(16).padStart(8, "0")}`;
}

// --- editing ---------------------------------------------------------------------------------------
// A frame back into an explicit spec the editor can change and rebuild (every locked locus fixed,
// every open trait with its pools), so edits stay at the level of plan, clan, chapters and traits.
export function specFromFrame(frame) {
  const locked = Object.fromEntries(frame.loci.filter((l) => l.kind === "locked").map((l) => [l.id, l.copies[0] === l.copies[1] ? l.copies[0] : [...l.copies]]));
  const openSwitches = frame.loci.filter((l) => l.kind !== "locked" && l.switch).map((l) => l.id);
  const typical = Object.fromEntries(frame.loci.filter((l) => l.typical).map((l) => [l.id, [...l.typical]]));
  return {
    typical,
    id: frame.species.id, name: frame.species.name, plural: frame.species.plural, order: frame.species.order, summary: frame.species.summary,
    clan: frame.taxonomy.clan, tier: frame.taxonomy.tier, seed: frame.taxonomy.seed ?? 1,
    taxonomy: { ...frame.taxonomy }, plan: { key: frame.plan.key, extras: { ...frame.plan.extras } },
    anchor: frame.signature.anchor, second: frame.signature.second, feature: frame.signature.feature,
    features: { ...frame.signature.features }, finish: { ...frame.signature.finish }, fixed: locked, openSwitches,
    open: frame.chapters.flatMap((ch) => ch.traits.map((t) => ({ chapter: ch.id, id: t.id, name: t.name, loci: [...t.loci], looks: [...t.looks], pool: Object.fromEntries(t.loci.map((id) => [id, [...frame.pools[id]]])), shapeable: t.shapeable, override: t.override ?? null, verdict: t.verdict ?? null }))),
    sealed: { ...frame.sealed }, glyph: frame.glyph, pod: frame.pod ? { second: frame.pod.colourPair[1].pigment } : null, pending: frame.notYet?.pending ?? [],
  };
}
// The chapter a locus belongs to when a designer opens it from the locked list.
export function chapterFor(id) {
  const locus = LOCI.get(id);
  if (id.startsWith("appearance.emission")) return "glow";
  if (locus.family === "fantastic-physiology") return "charge";
  if (locus.family === "appearance") return "coat";
  if (locus.family === "mechanics-movement") return "movement";
  if (locus.family === "energy-nutrition") return "stamina";
  if (locus.family === "cognition-tendencies") return "character";
  if (/head-|eye-|muzzle-|crown|antenna|auricular|ear-|horn|beak|feather-crest|crest-leaf/.test(id)) return "face";
  if (/support-|terminal|tail|free-|root-/.test(id)) return "legs-tail";
  return "shape";
}

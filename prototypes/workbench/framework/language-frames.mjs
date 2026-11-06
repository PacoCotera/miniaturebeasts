// The language frame generator: writes a kind's frame of version 8 from the registry (language.mjs), so the
// frame and the registry never say two things. A language frame is schema /4 on catalogue 13 (species.mjs,
// SCHEMA_LANGUAGE). What the generator fixes and what it opens:
//
//   header   family and land from the registry; the eye count is the registry's (a plan switch, never a row)
//   closed   the named body palette (colour comes from the land), every retired record that no signed
//            exception record of the kind covers, and the records the language says no to (emblem, blush,
//            cream reach, countershade, pattern kind, the mouth at rest), each locked at its neutral value
//   open     body hue and body value (the land's band), the coat layouts, eye spacing and, where no eye
//            exception holds, eye size, the iris colour and the attitude (the registry's pools), the
//            signature's size, count and curl (the kind's bands), the shape records within 15 percent
//   kept     what the language is silent on: the movement, stamina and character traits the kind already had
//
// A kind's per-check exception records (EXCEPTIONS) decide what an anchor keeps: never a blanket flag.
// Frames are append-only: this file writes version 8 and nothing older (build-frames keeps every other
// frame as it was; the stamp registry keeps the older versions of these four).
import { readFileSync } from "node:fs";
import { CATALOGUE, LOCI, BODY_PIGMENTS, SECOND_PIGMENTS, alleleIds, resolveCopies, LANGUAGE_FRAME, valueRange } from "./catalogue.mjs";
import { LANGUAGE, kindOf, landOf, exceptionsFor, isExcepted, hexToOklch, BODY_RANGE } from "./language.mjs";
import { SPECIES, specOf } from "./roster.mjs";
import { buildFrame, sampleIndividual, rng } from "./species.mjs";
import { planFacts } from "./plans.mjs";
import { carried, isPartSwitch, SWITCH_TARGETS } from "./guards.mjs";

// The kinds this generator writes: the four anchors (chunk 5) and the other fifteen (chunk 7), nineteen in all. S20 is a
// fixture and S22 a template, so neither has a language frame.
export const LANGUAGE_ANCHORS = ["S01", "S17", "S18", "S19"];
export const LANGUAGE_KINDS = [...LANGUAGE_ANCHORS];

// ---- the house numbers (the language design sections 3, 4 and 6) ----
export const EYE_SIZE_BAND = [0.122, 0.165];          // head width times this: a seventh, 15 percent either way
export const EYE_SIZE_TYPE = 1 / 7;
export const SHAPE_BAND = [0.85, 1.15];               // proportions about 15 percent
export const IRIS_PUPIL_CONTRAST = 0.30;              // face.iris (a): the iris differs from the pupil by at least this much lightness
export const PUPIL_ZONE_CONTRAST = 0.30;              // face.iris (b): the pupil differs from the face zone it sits in by at least this much
export const SIGNATURE_SIZE_RANGE = [0.2, 0.33];      // a fifth to a third of standing height
export const SIGNATURE_SIZE_TYPE = 0.265;             // the middle of that range: the design gives no per-kind size yet (the signature chunk counts each stand)

// The nine iris colours, one value each for every kind, signed by the art desk (chunk 5 rulings, 09:27), and the house eye's
// pupil and highlight. An iris that fails (a) is dropped from a pool, and a drop is reported, never silent.
export const IRIS_VALUES_SIGNED = true;
export const IRIS_SWATCH = { amber: "#C27A1E", honey: "#D2A040", copper: "#B0602E", olive: "#848C3A", moss: "#5F8C4E", hazel: "#9C7442", teal: "#2E8E8A", slate: "#62799A", violet: "#7E62B0" };
export const PUPIL_HEX = "#1E1A24", HIGHLIGHT_HEX = "#FFFFFF";

// How often each look shows in wild draws (art desk, chunk 5 rulings): the stand's own look on 60 percent, every other
// option on the rest evenly and never under 5. The coat layouts have their own shares. The catalogue's layouts are bands,
// patches, saddle, brindle, gradient, back-spots; "plain" is the marking switch off, and the shares' "spots" is back-spots.
// Brindle has no share, so it is not in a kind's pool: the six options are plain, back-spots, saddle, gradient, bands, patches.
export const DEFAULT_SHARE = 0.6, MIN_SHARE = 0.05;
export const LAYOUT_SHARES = { plain: 0.35, "back-spots": 0.20, saddle: 0.15, gradient: 0.12, bands: 0.10, patches: 0.08 };
export const LAYOUT_POOL = ["bands", "patches", "saddle", "gradient", "back-spots"];

// Records locked at a neutral value in every language frame (the value is the one the language allows).
const NEUTRAL = {
  "appearance.emblem": "none", "appearance.blush": "off", "appearance.mouth-rest": "content", "appearance.cream-extent": "low",
  "appearance.countershade": "low", "appearance.pattern-kind": "none", "appearance.glow-pattern": "none", "appearance.sheen": "matte",
  "form.ear-kind": "nub", "signature.count": "1", "signature.curl": "straight",
};
const POSITION_NEUTRAL = "between";

// What each anchor keeps beyond the language: the traits the language is silent on (movement, stamina, character),
// and the old records the kind's own exceptions hold (Loika's ears and ringed eyes).
const KEEP = {
  S01: [
    { chapter: "movement", id: "drive", name: "Drive", loci: ["movement.cycle-rate"], looks: ["steady", "between", "bursts"] },
    { chapter: "stamina", id: "efficiency", name: "Efficiency", loci: ["energy.action-efficiency"], looks: ["thrifty", "between", "ordinary"] },
  ],
  S17: [{ trait: "stride" }, { trait: "turning" }, { trait: "curiosity" }],
  S18: [{ trait: "pace" }, { trait: "weave" }, { trait: "stride" }, { trait: "curiosity" }, { trait: "nerve" }],
  S19: [{ trait: "stride" }, { trait: "pace" }, { trait: "thrift" }, { trait: "nerve" }, { trait: "curiosity" }],
};
// The records an anchor's frame fixes by hand (its type), beyond the roster's proportions.
const FIXED = {
  S01: { "anatomy.crown-presence": "on", "anatomy.crown-form": "leaf", "growth.crest-leaf-count": "three", "growth.crown-height-ratio": "high" },
  S17: { "growth.tail-curl-turn": "curled", "appearance.fur-reach": "body" },
  S18: { "growth.fur-skirt-flare": "close", "appearance.fur-reach": "body", "appearance.fur-length": "long", "appearance.fur-flow": "axial" },
  S19: { "growth.tail-curl-turn": "tight", "appearance.fur-reach": "body" },
};

// What the other fifteen kinds keep: the language is silent on movement, stamina and character, so every trait of those chapters
// (and Blikur's charge chapter) that the kind's own frame opens stays open, with that frame's own pool and looks. The kind's older
// frame file is the source; a trait whose record is retired and uncovered (Lehten's light feeding) is left out, never opened.
const KEPT_CHAPTERS = ["movement", "stamina", "character", "charge"];
function keepOf(kindId) {
  if (KEEP[kindId]) return KEEP[kindId];
  const old = JSON.parse(readFileSync(new URL(`../frames/species-${kindId}.json`, import.meta.url), "utf8"));
  const rows = new Map(old.loci.map((l) => [l.id, l]));
  const kept = [];
  for (const ch of old.chapters) {
    if (!KEPT_CHAPTERS.includes(ch.id)) continue;
    for (const t of ch.traits) {
      if (t.loci.some((id) => refuse(kindId, id))) continue;
      const pool = Object.fromEntries(t.loci.filter((id) => rows.get(id)?.alleles).map((id) => [id, [...rows.get(id).alleles]]));
      kept.push({ chapter: ch.id, id: t.id, name: t.name, loci: [...t.loci], looks: [...t.looks], pool });
    }
  }
  return kept;
}

const r2 = (x) => Math.round(x * 100) / 100, r3 = (x) => Math.round(x * 1000) / 1000;
const speciesOf = (id) => SPECIES.find((s) => s.id === id);

// ---- the body colour a kind's bands are centred on: the land's, or the anchor's own where coat.land is excepted ----
export function bodyColourOf(kindId) {
  const k = kindOf(LANGUAGE, kindId), land = landOf(LANGUAGE, k.land);
  if (isExcepted(LANGUAGE, kindId, "coat.land")) {
    const own = BODY_PIGMENTS[speciesOf(kindId) ? specOf(speciesOf(kindId)).anchor : null];
    if (own) return { hex: own, name: `own colour (${specOf(speciesOf(kindId)).anchor})`, oklch: hexToOklch(own), own: true };
  }
  return { hex: land.body.hex, name: land.body.name, oklch: land.body.oklch, own: false };
}

// ---- face.iris (a): the iris lightness against the pupil's, the same for every kind ----
export function irisContrast(kindId, colour) {
  const pupil = hexToOklch(PUPIL_HEX).L, iris = hexToOklch(IRIS_SWATCH[colour]).L;
  return { colour, irisL: r3(iris), pupilL: r3(pupil), dL: r3(Math.abs(iris - pupil)), pass: Math.abs(iris - pupil) >= IRIS_PUPIL_CONTRAST };
}
// ---- face.iris (b): the pupil against the face zone it sits in. The zone is the kind's body colour (the land's, or the anchor's
// own); Loika's eyes sit in pale rings, so its zone is the cream of its face. Judged at the type and at the darkest end of the
// kind's body band (the frame's lightness limit), the worse of the two deciding. A kind that fails is reported, no frame changes.
export function pupilZoneContrast(kindId) {
  const body = bodyColourOf(kindId), pupil = hexToOklch(PUPIL_HEX).L;
  const zone = kindId === "S01" ? { name: "cream ring", L: hexToOklch(SECOND_PIGMENTS.cream).L } : { name: body.name, L: body.oklch.L };
  const atType = Math.abs(zone.L - pupil), darkest = Math.abs(zone.L - (kindId === "S01" ? 0 : BODY_RANGE.lightness) - pupil);
  return { kind: kindId, zone: zone.name, zoneL: r3(zone.L), pupilL: r3(pupil), dLType: r3(atType), dLDarkest: r3(darkest), pass: atType >= PUPIL_ZONE_CONTRAST, passBand: darkest >= PUPIL_ZONE_CONTRAST };
}
// The pool the frame opens: the registry's pool less any colour that fails the contrast check. The default (the first)
// must pass, or the frame is not written. `dropped` is reported, never silent.
export function irisPoolOf(kindId) {
  const k = kindOf(LANGUAGE, kindId), tests = k.eyes.irisPool.map((c) => irisContrast(kindId, c));
  const failing = tests.filter((t) => !t.pass);
  const dropped = IRIS_VALUES_SIGNED ? failing : [];
  const kept = k.eyes.irisPool.filter((c) => !dropped.some((d) => d.colour === c));
  return { registry: [...k.eyes.irisPool], kept, dropped, wouldDrop: failing, tests };
}

// ---- wild shares: the weights of a pool's alleles that make the SHOWN looks come out as asked ----
// Two copies are drawn alike from the weights and the record's own rule says which look shows (first-ranked wins, a mean, both on),
// so the weights are not the shares: this finds the weights whose shown looks match `target` (allele id to share). The shown look of
// an allele is the look of its homozygote. `shown` is what the weights give, over every look including mixed ones a pair can make.
export function fitWeights(locusId, pool, target, iterations = 4000) {
  const locus = LOCI.get(locusId);
  const key = (a, b) => String(resolveCopies(locus, [a, b]));
  const home = Object.fromEntries(pool.map((a) => [a, key(a, a)]));
  const goal = {};
  for (const a of pool) goal[home[a]] = (goal[home[a]] ?? 0) + (target[a] ?? 0);
  let w = Object.fromEntries(pool.map((a) => [a, 1 / pool.length]));
  const shownOf = (w) => { const s = {}; for (const a of pool) for (const b of pool) { const k = key(a, b); s[k] = (s[k] ?? 0) + w[a] * w[b]; } return s; };
  for (let i = 0; i < iterations; i++) {
    const s = shownOf(w);
    let sum = 0;
    for (const a of pool) { w[a] *= Math.pow((goal[home[a]] + 1e-6) / (s[home[a]] + 1e-6), 0.5); sum += w[a]; }
    for (const a of pool) w[a] /= sum;
  }
  const shown = shownOf(w);
  const rounded = Object.fromEntries(pool.map((a) => [a, Math.round(w[a] * 1e4) / 1e4]));
  const drift = 1 - Object.values(rounded).reduce((x, y) => x + y, 0);
  rounded[pool[0]] = Math.round((rounded[pool[0]] + drift) * 1e4) / 1e4;
  return { weights: rounded, shown: Object.fromEntries(Object.entries(shown).map(([k, v]) => [k, r3(v)])), goal };
}
// The stand's look at 60 percent and the others evenly (a pool of one has all of it).
export function defaultShares(pool, own) {
  if (pool.length === 1) return { [pool[0]]: 1 };
  const rest = (1 - DEFAULT_SHARE) / (pool.length - 1);
  if (rest < MIN_SHARE - 1e-9) throw new Error(`a pool of ${pool.length} leaves under ${MIN_SHARE} for each option beside the stand's own`);
  return Object.fromEntries(pool.map((a) => [a, a === own ? DEFAULT_SHARE : rest]));
}

// ---- the bands of one kind, as the registry gives them ----
export function bandsOf(kindId) {
  const k = kindOf(LANGUAGE, kindId), c = bodyColourOf(kindId).oklch;
  const wrap = (h) => ((h % 360) + 360) % 360;
  const bands = {
    "appearance.body-hue": { form: "lin", lo: r2(wrap(c.h - BODY_RANGE.hue)), hi: r2(wrap(c.h + BODY_RANGE.hue)), unit: "°", type: r2(c.h) },
    "appearance.body-value": { form: "lin", lo: r3(c.L - BODY_RANGE.lightness), hi: r3(c.L + BODY_RANGE.lightness), unit: "L", type: r3(c.L) },
    "form.eye-spacing": { form: "mult", lo: SHAPE_BAND[0], hi: SHAPE_BAND[1], unit: "×", type: 1 },
  };
  if (!isExcepted(LANGUAGE, kindId, "face.size")) bands["form.eye-size"] = { form: "lin", lo: EYE_SIZE_BAND[0], hi: EYE_SIZE_BAND[1], unit: "head width", type: r3(EYE_SIZE_TYPE) };
  for (const id of ["form.head", "form.torso-girth", "form.leg-length", "form.leg-girth", "form.tail-length", "form.tail-girth"]) bands[id] = { form: "mult", lo: SHAPE_BAND[0], hi: SHAPE_BAND[1], unit: "×", type: 1 };
  const clamps = {};
  const sig = k.signature;
  if (sig.type && sig.socket) {
    const lo = Math.max(SIGNATURE_SIZE_RANGE[0], r3(SIGNATURE_SIZE_TYPE * 0.85)), hi = Math.min(SIGNATURE_SIZE_RANGE[1], r3(SIGNATURE_SIZE_TYPE * 1.15));
    clamps["signature.size"] = { lo, hi, unit: "H", type: SIGNATURE_SIZE_TYPE, of: "standing height" };
  }
  if (Array.isArray(sig.curl)) clamps["signature.curl"] = { lo: sig.curl[0], hi: sig.curl[1], unit: "turns" };
  // Drapet's tassels: the length bound of the anchor record (0 to 0.15 of body height)
  const tassel = exceptionsFor(LANGUAGE, kindId, "face.clear").find((e) => e.tassels)?.tassels;
  if (tassel) clamps["growth.brow-tuft-length"] = { lo: tassel.length[0], hi: tassel.length[1], unit: "body height", count: tassel.count };
  return { bands, clamps };
}

// Which of a list of records the plan and the switches carry (the same probe buildFrame runs).
function carriedSet(spec, ids) {
  const plan = planFacts(spec.plan.key, spec.plan.extras ?? {});
  const v = { ...plan.values };
  for (const [id, state] of Object.entries(spec.features)) if (state === "on" && SWITCH_TARGETS[id]) v[SWITCH_TARGETS[id]] = true;
  for (const id of spec.openSwitches ?? []) if (isPartSwitch(id)) v[SWITCH_TARGETS[id]] = true;
  return new Set(ids.filter((id) => carried(id, v)[0]));
}

// ---- the spec of one kind's language frame ----
export function languageSpec(kindId) {
  const species = speciesOf(kindId), k = kindOf(LANGUAGE, kindId);
  if (!species || !k) throw new Error(`${kindId}: not a kind of the roster and the registry`);
  const base = specOf(species);
  const frameVersion = LANGUAGE_FRAME;
  // Closed: a retired switch no exception covers is dropped from the features, never opened (Loika's cream muzzle and
  // Drapet's brow tassels are covered by their records and stay).
  const features = {};
  const dropped = [];
  for (const [id, state] of Object.entries(base.features)) {
    if (state === "on" && id !== "anatomy.exterior-eye-presence" && refuse(kindId, id)) { dropped.push(id); continue; }
    features[id] = state;
  }
  // Loika's crest switch is locked on: a frame fact, never a trait.
  const hand = FIXED[kindId] ?? {};
  const openSwitches = ["appearance.marking-switch", ...(kindId === "S18" ? ["anatomy.brow-tuft-presence"] : [])];
  const probeSpec = { ...base, features, openSwitches, plan: base.plan };
  const { bands, clamps } = bandsOf(kindId);
  // the records the plan carries decide which shape bands exist
  const wanted = Object.keys(bands).filter((id) => LOCI.has(id));
  const here = carriedSet(probeSpec, wanted);
  for (const id of wanted) if (!here.has(id)) delete bands[id];
  const iris = irisPoolOf(kindId);
  if (!iris.kept.includes(k.eyes.irisDefault)) throw new Error(`${kindId}: the default iris ${k.eyes.irisDefault} fails the contrast check; no frame is written`);
  // the signature records
  const sig = k.signature;
  const countBand = Array.isArray(sig.count) ? sig.count : null;
  const open = [];
  const trait = (chapter, id, name, loci, pool = {}, extra = {}) => open.push({ chapter, id, name, loci, ...(Object.keys(pool).length ? { pool } : {}), ...extra });
  trait("coat", "body-hue", "Body hue", ["appearance.body-hue"]);
  trait("coat", "body-value", "Coat value", ["appearance.body-value"]);
  trait("coat", "markings", "Markings", ["appearance.marking-switch", "appearance.marking-layout"], { "appearance.marking-switch": ["on", "off"], "appearance.marking-layout": [...LAYOUT_POOL] });
  trait("face", "iris", "Iris", ["appearance.iris-colour"], { "appearance.iris-colour": [...iris.kept] });
  trait("face", "attitude", "Attitude", ["appearance.attitude"], { "appearance.attitude": [...k.eyes.attitudePool] });
  if (bands["form.eye-size"]) trait("face", "eye-size", "Eye size", ["form.eye-size"]);
  if (bands["form.eye-spacing"]) trait("face", "eye-spacing", "Eye spacing", ["form.eye-spacing"]);
  if (isExcepted(LANGUAGE, kindId, "face.size") && kindId === "S01") trait("face", "eye-rings", "Eyes", ["growth.exterior-eye-size-ratio"], { "growth.exterior-eye-size-ratio": ["large", "huge"] }, { looks: ["thin rings", "between", "wide pale rings"] });
  if (kindId === "S01") trait("face", "ears", "Ears", ["growth.auricular-length-ratio"], { "growth.auricular-length-ratio": ["small", "short", "medium"] }, { looks: ["small ears", "between", "larger ears"] });
  if (kindId === "S18") trait("face", "brow-tassels", "Brow tassels", ["anatomy.brow-tuft-presence", "growth.brow-tuft-length"]);
  if (clamps["signature.size"]) trait("shape", "signature-size", "Signature size", ["signature.size"]);
  if (countBand) trait("shape", "signature-count", "Signature count", ["signature.count"], { "signature.count": alleleIds("signature.count").filter((a) => Number(a) >= countBand[0] && Number(a) <= countBand[1]) });
  if (clamps["signature.curl"]) trait("legs-tail", "signature-curl", "Signature curl", ["signature.curl"]);
  for (const [name, id] of [["Head", "form.head"], ["Torso girth", "form.torso-girth"], ["Leg length", "form.leg-length"], ["Leg girth", "form.leg-girth"], ["Tail length", "form.tail-length"], ["Tail girth", "form.tail-girth"]]) if (bands[id]) trait(id.startsWith("form.leg") || id.startsWith("form.tail") ? "legs-tail" : "shape", id.slice(5), name, [id]);
  for (const t of keepOf(kindId)) open.push(t);
  // the drawn-by-the-engine records hold their own bands: whatever the plan does not carry has no row
  // Locked: neutral values for every record the language closes, then the kind's own type
  const fixed = { ...base.fixed, ...FIXED_NEUTRAL(), ...hand };
  if (!countBand && sig.count !== null && !Array.isArray(sig.count)) fixed["signature.count"] = String(sig.count);
  if (sig.count === null) fixed["signature.count"] = "1";
  // the markings' own shape records stay at the middle for kinds that never fixed them
  for (const id of ["appearance.marking-extent", "appearance.marking-scale", "appearance.marking-contrast", "appearance.marking-orientation"]) fixed[id] ??= "low";
  const typical = { ...base.typical };
  for (const id of Object.keys(bands)) if (LOCI.get(id).operator === "copy-mean" && alleleIds(id).includes(POSITION_NEUTRAL)) typical[id] = [POSITION_NEUTRAL, POSITION_NEUTRAL];
  typical["appearance.iris-colour"] = [k.eyes.irisDefault, k.eyes.irisDefault];
  typical["appearance.attitude"] = ["content", "content"];
  typical["appearance.marking-layout"] = [LAYOUT_POOL[0], LAYOUT_POOL[0]];
  if (countBand) { const t = String(sig.count[2]); typical["signature.count"] = [t, t]; }
  // Wild shares (art desk rulings): the stand's own look on 60 percent, the others evenly; the layouts by LAYOUT_SHARES.
  const weights = {}, shares = {};
  const draws = {};
  const share = (id, pool, target) => { const f = fitWeights(id, pool, target); weights[id] = f.weights; shares[id] = f; };
  // Where the record's two-copy rule cannot give the shares from two independent copies (a mean rounded up gives the ends of a count under 5 percent; bands with patches shows a mixed look), a wild individual carries two alike copies drawn by the shares: the shown share is the weight itself, and mixed looks come only from breeding.
  const alike = (id, pool, target) => { const w = Object.fromEntries(pool.map((a) => [a, Math.round(target[a] * 1e4) / 1e4])); w[pool[0]] = Math.round((w[pool[0]] + 1 - Object.values(w).reduce((x, y) => x + y, 0)) * 1e4) / 1e4; weights[id] = w; draws[id] = "alike"; shares[id] = { weights: w, shown: Object.fromEntries(Object.entries(target).map(([a, v]) => [a, r3(v)])), goal: { ...target }, draw: "alike" }; };
  share("appearance.iris-colour", iris.kept, defaultShares(iris.kept, k.eyes.irisDefault));
  share("appearance.attitude", [...k.eyes.attitudePool], defaultShares(k.eyes.attitudePool, "content"));
  const marked = 1 - LAYOUT_SHARES.plain;
  share("appearance.marking-switch", ["on", "off"], { on: marked, off: LAYOUT_SHARES.plain });
  alike("appearance.marking-layout", [...LAYOUT_POOL], Object.fromEntries(LAYOUT_POOL.map((a) => [a, LAYOUT_SHARES[a] / marked])));
  if (countBand) {
    const pool = alleleIds("signature.count").filter((a) => Number(a) >= countBand[0] && Number(a) <= countBand[1]);
    alike("signature.count", pool, defaultShares(pool, String(sig.count[2])));
  }
  if (kindId === "S18") share("anatomy.brow-tuft-presence", ["off", "on"], { on: DEFAULT_SHARE, off: 1 - DEFAULT_SHARE });
  const spec = {
    ...base, frameVersion, features, openSwitches, fixed, typical, open, sealed: {}, bands, clamps, weights, draws, shares,
    reset: base.reset, family: k.family, land: k.land,
    signature: { type: sig.type, socket: sig.socket, accent: sig.accent },
    languageNotes: { droppedSwitches: dropped, irisDropped: iris.dropped.map((d) => d.colour), irisWouldDrop: iris.wouldDrop.map((d) => d.colour) },
  };
  delete spec.legacy; delete spec.alwaysOpen;
  if (kindId === "S01") { spec.features = { ...spec.features, "anatomy.crown-presence": "on" }; spec.openSwitches = spec.openSwitches.filter((id) => id !== "anatomy.crown-presence"); }
  return spec;
}

function refuse(kindId, id) {
  // the same rule buildFrame applies (species.mjs refuseOpen), read through a trial so this file needs no second copy of it
  const l = LOCI.get(id);
  if (!l?.retired) return false;
  if (LANGUAGE.exceptions.some((e) => e.kind === kindId && e.covers?.includes(id))) return false;
  const c = l.retiredCoveredBy;
  return !(c && LANGUAGE.exceptions.some((e) => e.kind === kindId && e.check === c.check && (!c.scope || e.scope === c.scope)));
}

// every language closure as a fixed value: a record the language closes is locked here whether or not the plan carries it
function FIXED_NEUTRAL() {
  const out = { ...NEUTRAL };
  for (const l of CATALOGUE.loci) {
    if ((l.sinceFrame ?? 0) < 7 || out[l.id] !== undefined) continue;
    if (alleleIds(l.id).includes(POSITION_NEUTRAL) && l.operator === "copy-mean") out[l.id] = POSITION_NEUTRAL;
  }
  return out;
}

export function buildLanguageFrame(kindId, options = {}) {
  const spec = languageSpec(kindId);
  const frame = buildFrame(spec, { samples: options.samples ?? 200 });
  frame.taxonomy.seed = spec.seed; frame.taxonomy.lockedByCheck = []; frame.taxonomy.attemptsRejected = [];
  return frame;
}

// ---- wild draws: the look of each open locus over n individuals drawn from the frame's pools ----
export function lookOf(locus, copies, pool) {
  const v = resolveCopies(locus, copies);
  if (typeof v !== "number" || locus.operator === "pair-map") return String(v);
  const [lo, hi] = valueRange(locus, pool);
  if (hi === lo) return String(v);
  const t = (v - lo) / (hi - lo);
  return t < 1 / 3 - 1e-9 ? "low third" : t > 2 / 3 + 1e-9 ? "high third" : "middle third";
}
export function wildLookCounts(frame, n = 1000, seed = "wild") {
  const r = rng(`${frame.species.id}:${seed}`);
  const out = {};
  for (const row of frame.loci.filter((l) => l.kind !== "locked")) out[row.id] = {};
  for (let i = 0; i < n; i++) {
    const g = sampleIndividual(frame, r, { kind: "wild" });
    const plain = g.loci["appearance.marking-switch"] && resolveCopies(LOCI.get("appearance.marking-switch"), g.loci["appearance.marking-switch"]) === false;
    for (const row of frame.loci.filter((l) => l.kind !== "locked")) {
      // a coat with the marking switch off is plain, whatever layout it carries
      const look = row.id === "appearance.marking-layout" && plain ? "plain" : lookOf(LOCI.get(row.id), g.loci[row.id], row.alleles);
      out[row.id][look] = (out[row.id][look] ?? 0) + 1;
    }
  }
  return out;
}

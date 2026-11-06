// The mibi visual language as data: the registry the studio, the frames and the game read, so
// nobody types the numbers twice. Owner-approved 2026-11-05 21:18; codified in iwq
// the language codification (the language design sections 1-5 and 9). `language.json` is generated from this
// file by tools/language-json.mjs; edit here, never there. A change to a value is a registry version.
//
// Data first (LANDS, FAMILIES, KINDS, EXCEPTIONS, FIXTURES), then the validators: the roster rules
// as functions of a registry, so a test can hand them a broken copy.

export const REGISTRY_VERSION = 1;

// ---- colour maths: hex -> OKLCH (Ottosson), so the registry carries both forms from one source ----
const r4 = (x) => Math.round(x * 10000) / 10000;
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
export function hexToOklch(hex) {
  const v = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => lin(parseInt(v.slice(i, i + 2), 16) / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const C = Math.hypot(A, B);
  let h = (Math.atan2(B, A) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { L: r4(L), C: r4(C), h: Math.round(h * 100) / 100 };
}
const hueStep = (from, to) => { let d = ((to - from + 540) % 360) - 180; return Math.round(d * 100) / 100; };

// ---- lands (the language design section 2). Ids are the game's biome ids (regions.mjs BIOMES). ----
// [id, art name, player word, [body hex, name], [marking hex, name], [accent hex, name]]
const LAND_ROWS = [
  ["mixed", "Meadows", "Meadows", ["#D4B060", "straw gold"], ["#A87E36", "honey ochre"], ["#C0663A", "burnt orange"]],
  ["woods", "Woods", "Woods", ["#A0603E", "russet"], ["#5E3C2A", "bark brown"], ["#E2D3B4", "mushroom cream"]],
  ["tallwood", "Tallwood", "Tallwood", ["#A8B39C", "lichen"], ["#6E7E63", "sage"], ["#D6CC72", "pale citron"]],
  ["thickets", "Thickets", "Thickets", ["#7C4C66", "bramble plum"], ["#4E2E42", "mulberry"], ["#C9A27A", "thorn tan"]],
  ["fells", "Fells", "Cliffs", ["#A79B8B", "warm stone"], ["#AE6A4C", "terracotta"], ["#C9B160", "lichen ochre"]],
  ["downs", "Downs", "Hills", ["#8F7598", "heather"], ["#5F4A6C", "deep heather"], ["#C98E98", "dusty rose"]],
  ["marsh", "Marsh", "Marsh", ["#8A8B58", "reed olive"], ["#5A4B34", "peat"], ["#C8923E", "marigold amber"]],
  ["tarns", "Tarns", "Highpools", ["#6F87A1", "slate blue"], ["#4F6F86", "deep slate"], ["#9CC3C2", "glacier teal"]],
  ["meres", "Meres", "Lakes", ["#2F6E74", "deep teal"], ["#24505E", "dark mere"], ["#C17C4E", "kingfisher copper"]],
];
// Body varies inside the land's range: hue +-12 degrees, OKLCH lightness +-0.07 (codify section 2).
export const BODY_RANGE = Object.freeze({ hue: 12, lightness: 0.07 });
export const CHROMA_MARGIN = 0.02; // coat.chroma: every coat colour's chroma <= the land's top chroma + this

const colour = ([hex, name]) => ({ hex, name, oklch: hexToOklch(hex) });
export const LANDS = LAND_ROWS.map(([id, art, word, body, marking, accent]) => {
  const b = colour(body), m = colour(marking), a = colour(accent);
  const top = Math.max(b.oklch.C, m.oklch.C, a.oklch.C);
  return {
    id, art, word,
    body: b, marking: m, accent: a,
    bodyRange: { hue: BODY_RANGE.hue, lightness: BODY_RANGE.lightness },
    // marking = body + this step (coat.pair); it moves with the body
    markingOffset: { dL: r4(m.oklch.L - b.oklch.L), dC: r4(m.oklch.C - b.oklch.C), dh: hueStep(b.oklch.h, m.oklch.h) },
    chromaTop: r4(top),
    chromaCap: r4(top + CHROMA_MARGIN),
  };
});

// ---- families (the language design section 1): a skeleton and what each part is for ----
// [n, id, plan, legs, contact, parts-with-a-job, gait clip, simple mass, the language's fix]
const FAMILY_ROWS = [
  [1, "trotter", "quadruped", 4, "four feet", [["tail", "balance"]], "four-beat walk", false, "plain four-legged build; the studio's template"],
  [2, "shoulder-heavy", "quadruped", 4, "four feet, forelegs thicker, deep chest", [["tail", "short, balance"]], "heavy walk", false, "forelegs thicker; the fluffy chest is a coat zone, not a part"],
  [3, "hopper", "quadruped", 4, "short folded hind legs; front feet rest on the ground", [["tail", "balance"]], "hop", false, "short folded hind legs under a round egg-shaped mass; front soles on the ground"],
  [4, "digger", "quadruped", 4, "four feet, spade forepaws", [["tail", "short"]], "walk; dig idle", false, "spade forepaws"],
  [5, "loaf", "quadruped", 4, "four very short legs under a long barrel", [["tail", "stub"]], "short-step walk", false, "very short legs under a long barrel"],
  [6, "bridge", "quadruped", 4, "four feet at the corners of a long low body", [["tail", "tapering"]], "low walk", false, "long low body, legs at the corners"],
  [7, "sitter", "biped", 2, "two legs plus the tail as third support", [["tail", "coiled, third support"], ["hands", "small, at the chest"]], "sit-shuffle", false, "the tail is a support; hands at the chest"],
  [8, "waddler", "biped", 2, "two short legs", [["arms", "small"]], "waddle", false, "two short legs, small arms"],
  [9, "roundling", "mass", 0, "tiny feet", [], "bounce-walk", true, "one round mass on tiny feet"],
  [10, "mound", "mass", 0, "none seen; the coat makes the body", [["coat", "makes the body"]], "shuffle, curtain sway", true, "the coat is the body"],
  [11, "swimmer", "legless", 0, "belly; no legs", [["fins", "paddle"], ["fluke", "propulsion"]], "swim undulation", true, "no legs; fins only here"],
  [12, "climber", "biped", 2, "two legs", [["hands", "grip"], ["tail", "prehensile"]], "walk; grip idle", false, "grip hands, prehensile tail"],
  [13, "flutterer", "biped", 2, "two legs", [["wings", "one pair, big enough to lift"]], "flutter", false, "one wing pair big enough to lift"],
  [14, "four-wing", "quadruped", 4, "four short legs", [["wings", "two pairs on the back, lift"]], "flutter (two pairs)", false, "two wing pairs on the back"],
  [15, "glider", "quadruped", 4, "four legs", [["membrane", "skin leg to leg, glide"], ["tail", "flat, steering"]], "walk; glide pose", false, "skin membranes leg to leg, flat steering tail"],
  [16, "two-part crawler", "hexapod", 6, "six legs on two rounded body parts", [["antennae", "allowed"]], "six-leg walk", false, "two body parts, never three"],
  [17, "floater", "mass", 0, "none: floats, shadow below", [["puff edge", "soft edge"], ["nub arms", "small"]], "bob", true, "floats; shadow below"],
  [18, "shell-carrier", "quadruped", 4, "four legs", [["shell", "dome, never a spiral"]], "slow walk", false, "a dome shell, never a spiral"],
  [19, "slider", "legless", 0, "one foot rim", [], "slide wave", true, "one body with the foot as its underside, no limbs; the coil is its signature"],
  [20, "six-arm", "radial", 0, "six soft arms, no suckers", [["arms", "six, soft"]], "six-arm walk", false, "six soft arms, no suckers"],
];
export const PLANS = ["quadruped", "biped", "mass", "legless", "hexapod", "radial"];
export const FAMILIES = FAMILY_ROWS.map(([n, id, plan, legs, contact, parts, gait, simpleMass, fix]) => ({
  n, id, name: id, plan, legs, contact,
  parts: parts.map(([part, job]) => ({ part, job })),
  gait, simpleMass, fourLegged: plan === "quadruped", fix,
}));

// ---- vocabularies ----
export const SIGNATURE_SOCKETS = ["head-top", "back-line", "tail", "neck", "coat"];
export const COAT_MATERIALS = ["felt", "velvet", "suede", "skin", "chitin", "stone", "scale", "fur", "glass"];
export const FUR_PILES = ["teddy", "fluffy", "fleece", "long", "long hair", "down", "cloud", "plush"];
export const IRIS_COLOURS = ["amber", "honey", "olive", "moss", "hazel", "teal", "slate", "violet", "copper"];
export const ATTITUDES = ["content", "curious", "deadpan", "knowing"]; // order: content > curious > deadpan > knowing
export const EYE_COUNTS = [2, 3];

// ---- kinds (the language design sections 1, 2, 4, 5) ----
// [id, name, family, land, material, pile, signature type, socket, count, curl, accent, anchor]
// count and curl: null (none), a number (fixed) or [lo, hi, type]; proposals the art desk signs at chunk 13.
// accent: "land" or "own" (anchors keep their own colours until repainted).
const K = (id, name, family, land, material, pile, sig, socket, count, curl, accent = "land", extra = {}) =>
  ({ id, name, family, land, coat: { material, pile }, signature: { type: sig, socket, count, curl, accent }, eyes: { count: 2 }, ...extra });
export const KINDS = [
  K("S01", "Loika", "trotter", "woods", "felt", null, "leaf crest", "head-top", [1, 5, 3], null, "own", { anchor: true }),   // one to five leaves, three the stand's own (art desk, chunk 5 rulings: the trial grew one to five)
  K("S02", "Untuva", "loaf", "downs", "fur", "fleece", "felt lobe fan", "head-top", [4, 7, 5], null),
  K("S03", "Tuikis", "hopper", "fells", "suede", null, "tail swelling into a glowing tip", "tail", null, [0, 0.15], "land", { coatNote: "speckled suede, short and close with a slight nap", coatPattern: { scale: "fine", spotMax: 1 / 12 } }),
  K("S04", "Hiljan", "climber", "tallwood", "velvet", null, "two blunt horn-knobs", "head-top", 2, null),
  K("S05", "Tepor", "waddler", "woods", "suede", null, "two ribbed crown flaps swept back", "head-top", 2, [0, 0.15], "land", { coatNote: "leathery" }),
  K("S06", "Pesko", "bridge", "thickets", "velvet", null, "ridge of tall beads", "back-line", [6, 10, 8], null, "land", { coatNote: "smooth matte velvet-suede; the beads are the signature only" }),
  K("S07", "Azkon", "shoulder-heavy", "fells", "fur", "plush", "hooked tail ending in a knob", "tail", null, [0.3, 0.5], "land", { chestFur: "fluffy", coatNote: "short plush fur; the fluffy chest in the body colour; no plates", coatPattern: { scale: "big", patchMin: 1 / 6 } }),
  K("S08", "Rupar", "digger", "mixed", "fur", "fluffy", "fan of tall slats", "back-line", [5, 9, 7], null),
  K("S09", "Belatz", "flutterer", "tallwood", "fur", "down", "quill crown", "head-top", [7, 13, 9], null),
  K("S10", "Igara", "swimmer", "meres", "glass", null, "tip curling over like a wave", "back-line", null, [0.25, 0.5], "land", { waterKind: true }),
  K("S11", "Kilpo", "two-part crawler", "thickets", "chitin", null, "antennae with weighted tips", "head-top", 2, [0, 0.2]),
  K("S12", "Peplos", "four-wing", "mixed", "fur", "down", "curled plume", "head-top", 1, [0.2, 0.5], "land", { coatNote: "the head is merged into the body" }),
  K("S13", "Oskol", "six-arm", "tarns", "stone", null, "tall soft cone crest", "head-top", 1, [0, 0.15], "land", { coatNote: "matte floor; not a satin glaze" }),
  K("S14", "Usvel", "slider", "marsh", "skin", null, "one coil on the crown", "head-top", 1, [0.75, 1.25]),
  K("S15", "Lehten", "shell-carrier", "downs", "skin", null, "three stacked knobs on the shell top", "back-line", 3, null, "land", { coatNote: "body and the dome shell in skin, shell in deep heather" }),
  K("S16", "Blikur", "floater", "tarns", "fur", "cloud", "spark crown", "head-top", [3, 5, 4], null),
  K("S17", "Wickle", "roundling", "mixed", "fur", "long", "flame curl", "head-top", 1, [0.25, 0.6], "own", { anchor: true }),
  K("S18", "Drapet", "mound", "downs", "fur", "long hair", "the curtain", "coat", null, null, "own", { anchor: true }),
  K("S19", "Curlop", "sitter", "meres", "fur", "long", "coiled tail", "tail", 1, [1.0, 1.75], "own", { anchor: true }),
  K("S20", "Tuliko", "glider", "tallwood", "scale", null, "scalloped coin crest", "back-line", [5, 8, 6], null),
  K("S22", "Studio quad", "trotter", null, "fur", "teddy", null, null, null, null, "land", { template: true }),
];
// Lehten is the only three-eyed kind; nothing varies eye count (owner 2026-11-05 22:33).
KINDS.find((k) => k.id === "S15").eyes.count = 3;
// Iris and attitude pools, per kind (the art desk, 2026-11-05). The first iris listed is the stand's own
// default; every attitude pool holds content, which is the default. The anchors' pools are narrow on
// purpose: their faces are exceptions, so they vary little. The face.iris contrast check may drop a
// colour from a pool (see irisContrast and droppedIris below); a drop is reported, never silent.
const POOLS = {
  S01: [["amber", "honey", "copper"], ["content", "curious"]],
  S02: [["teal", "moss", "slate"], ["content", "deadpan"]],
  S03: [["copper", "hazel", "amber"], ["content", "curious"]],
  S04: [["slate", "violet", "hazel"], ["content", "curious", "knowing"]],
  S05: [["slate", "olive", "honey"], ["content", "curious", "deadpan"]],
  S06: [["copper", "honey", "amber"], ["content", "deadpan"]],
  S07: [["olive", "hazel", "honey"], ["content", "deadpan", "knowing"]],
  S08: [["teal", "slate", "violet"], ["content", "curious", "knowing"]],
  S09: [["hazel", "copper", "amber"], ["content", "curious", "knowing"]],
  S10: [["violet", "copper", "honey"], ["content", "curious"]],
  S11: [["violet", "honey", "moss"], ["content", "curious", "deadpan"]],
  S12: [["copper", "violet", "slate"], ["content", "curious"]],
  S13: [["hazel", "copper", "honey"], ["content", "curious"]],
  S14: [["hazel", "copper", "violet"], ["content", "deadpan"]],
  S15: [["olive", "moss", "honey"], ["content", "knowing"]],
  S16: [["slate", "teal", "honey"], ["content", "curious"]],
  S17: [["amber", "honey"], ["content", "curious"]],
  S18: [["violet", "slate"], ["content", "deadpan"]],
  S19: [["hazel", "teal"], ["content", "knowing"]],
  S20: [["slate", "hazel", "violet"], ["content", "curious"]],
};
for (const k of KINDS) {
  const [iris, att] = POOLS[k.id] ?? [null, null];
  k.eyes.irisPool = iris; k.eyes.irisDefault = iris ? iris[0] : null;
  k.eyes.attitudePool = att; k.eyes.attitudeDefault = att ? "content" : null;
}
Object.freeze(KINDS);

// ---- per-check signed exception records (the language design section 9, owner 2026-11-05 22:33) ----
// One record names one kind and one check. Never a blanket flag. `by` is the art desk; a maker or
// agent token cannot write one. Read as spec 8.2 `waivers` entries (check, reason, by, date, until).
const ex = (kind, check, reason, extra = {}) => ({ kind, check, reason, by: "art desk", date: "2026-11-06", until: "repaint", ...extra });
export const EXCEPTIONS = [
  ex("S01", "face.size", "Loika's big ringed eyes, kept at the owner's 21:15 approval"),
  ex("S01", "face.flush", "Loika's ringed eyes: the rims stay"),
  // The cream muzzle (the stub snout that is the whole lower face, cream like the chest) is part of this
  // excepted coat.pale (art desk, 2026-11-05): `covers` lists the retired records the exception lets Loika's frame keep.
  ex("S01", "coat.pale", "Loika's cream chest and cream muzzle, kept at the owner's 21:15 approval", {
    muzzle: { colour: "cream", part: "the stub snout, the whole lower face", inside: "coat.pale" },
    covers: ["anatomy.muzzle-presence", "growth.muzzle-projection-ratio", "growth.muzzle-width-ratio"],
  }),
  ex("S01", "coat.land", "Loika's black coat, not Woods russet"),
  ex("S01", "sig.accent", "Loika's leaf-green leaves, not the Woods accent"),
  // The owner's ruling: Loika keeps its ears, a bounded record, never a pointed ear.
  ex("S01", "face.clear", "Loika's ears, kept at the owner's ruling 2026-11-05 22:33", {
    scope: "ears",
    ears: { size: "small", shape: "round", position: "sides of the head, below the crest", colour: "coat", pointed: false, onlyKind: "S01" },
  }),
  ex("S17", "coat.land", "Wickle's own colours and long-fur face"),
  ex("S17", "sig.accent", "Wickle's own flame colour"),
  ex("S17", "coat.pale", "Wickle's own pale areas"),
  ex("S17", "face.size", "Wickle's long-fur face"),
  // Wickle's tail-tip ball (art desk, chunk 5 rulings 2026-11-06): the glowing ball at the tip of the plume stays in the v8 frame.
  ex("S17", "sig.one", "Wickle's tail-tip ball beside its flame curl, kept at the art desk's ruling 2026-11-06", {
    scope: "tail-tip-ball", ball: { part: "a glowing ball at the tip of the tail", onlyKind: "S17" },
    covers: ["anatomy.tail-tip-bulb"],
  }),
  ex("S18", "coat.land", "Drapet's own colours and long-hair face"),
  ex("S18", "sig.accent", "Drapet's own curtain colour"),
  ex("S18", "coat.pale", "Drapet's own pale areas"),
  ex("S18", "face.size", "Drapet's long-hair face"),
  // Drapet's brow tassels (art desk, 2026-11-05): locks of the curtain itself, never brows or horns.
  ex("S18", "face.clear", "Drapet's brow tassels, kept at the owner's ruling 2026-11-05 22:33", {
    scope: "brow-tufts",
    tassels: {
      made: "locks of the curtain itself, the same hair and the same colour",
      count: [0, 5], length: [0, 0.15], lengthUnit: "body height",
      hang: "down", standUp: false, curl: false, brows: false, horns: false,
      stopsAt: "the top of the eyes", eyesClear: true, presenceMayBeOff: true, onlyKind: "S18",
    },
  }),
  ex("S19", "coat.land", "Curlop's own colours and long-fur face"),
  ex("S19", "sig.accent", "Curlop's own tail colour"),
  ex("S19", "coat.pale", "Curlop's own pale areas"),
  ex("S19", "face.size", "Curlop's long-fur face"),
  // Curlop's muzzle (art desk, chunk 5 rulings 2026-11-06): its stub snout stays in the v8 frame, as Loika's does.
  ex("S19", "face.clear", "Curlop's muzzle, kept at the art desk's ruling 2026-11-06", {
    scope: "muzzle", muzzle: { part: "the stub snout", onlyKind: "S19" },
    covers: ["anatomy.muzzle-presence", "growth.muzzle-projection-ratio", "growth.muzzle-width-ratio"],
  }),
];

// ---- fixtures: frozen regression files; every language check skips them ----
export const FIXTURES = [
  { id: "S20", name: "old Tuliko", file: "species_v1/S20.json", note: "upright biped regression fixture; schema mb-species/1; its id is reassigned to the glider Tuliko when that kind is built", frozen: true },
];

export const LANGUAGE = {
  version: REGISTRY_VERSION,
  approved: "2026-11-05T21:18-06:00",
  bodyRange: BODY_RANGE,
  chromaMargin: CHROMA_MARGIN,
  plans: PLANS,
  lands: LANDS,
  families: FAMILIES,
  vocab: { signatureSockets: SIGNATURE_SOCKETS, coatMaterials: COAT_MATERIALS, furPiles: FUR_PILES, irisColours: IRIS_COLOURS, attitudes: ATTITUDES, eyeCounts: EYE_COUNTS },
  kinds: KINDS,
  exceptions: EXCEPTIONS,
  fixtures: FIXTURES,
};

// ---- lookups ----
export const landOf = (reg, id) => reg.lands.find((l) => l.id === id);
export const familyOf = (reg, id) => reg.families.find((f) => f.id === id);
export const kindOf = (reg, id) => reg.kinds.find((k) => k.id === id);
export const exceptionsFor = (reg, kindId, check = null) => reg.exceptions.filter((e) => e.kind === kindId && (check === null || e.check === check));
// A check is excepted for a kind only by a record naming both; never by an anchor flag.
export const isExcepted = (reg, kindId, check) => exceptionsFor(reg, kindId, check).length > 0;
// Language checks run on kinds, never on a fixture or a template without a land.
export const roster = (reg) => reg.kinds.filter((k) => !k.template);

// ---- validators: each returns { id, level: "red" | "amber", pass, messages } ----
const res = (id, level, messages) => ({ id, level, pass: messages.length === 0, messages });
const by = (items, f) => { const m = new Map(); for (const x of items) { const k = f(x); (m.get(k) ?? m.set(k, []).get(k)).push(x); } return m; };
const keyOfCoat = (k) => `${k.coat.material}${k.coat.pile ? ` (${k.coat.pile})` : ""}`;

export function checkFamilyOnce(reg) {
  const msgs = [];
  for (const [fam, ks] of by(roster(reg), (k) => k.family)) if (ks.length > 1) msgs.push(`${ks.map((k) => k.id).join(" and ")} share the family ${fam}`);
  return res("roster.family-once", "red", msgs);
}
export function checkMasses(reg) {
  const ks = roster(reg), masses = ks.filter((k) => familyOf(reg, k.family)?.simpleMass);
  return res("roster.masses", "red", masses.length * 3 > ks.length ? [`${masses.length} of ${ks.length} kinds are simple masses (${masses.map((k) => k.id).join(", ")}); at most a third`] : []);
}
export function checkQuads(reg) {
  const fams = new Set(roster(reg).map((k) => familyOf(reg, k.family)).filter((f) => f?.fourLegged).map((f) => f.id));
  return res("roster.quads", "red", fams.size < 5 ? [`${fams.size} four-legged families; five or more needed`] : []);
}
export function checkEyes(reg) {
  const msgs = [];
  const three = roster(reg).filter((k) => k.eyes.count === 3);
  for (const k of roster(reg)) if (!EYE_COUNTS.includes(k.eyes.count)) msgs.push(`${k.id} has ${k.eyes.count} eyes; two or three only`);
  if (three.length > 1) msgs.push(`${three.map((k) => k.id).join(" and ")} are three-eyed; one kind at most`);
  for (const k of three) if (k.id !== "S15") msgs.push(`${k.id} is three-eyed; only S15 Lehten may be`);
  if (!three.some((k) => k.id === "S15")) msgs.push("S15 Lehten must be the three-eyed kind");
  return res("roster.eyes", "red", msgs);
}
export function checkLands(reg) {
  const msgs = [];
  const ks = roster(reg);
  for (const land of reg.lands) {
    const on = ks.filter((k) => k.land === land.id);
    if (on.length < 1 || on.length > 3) msgs.push(`${land.art} has ${on.length} kinds; one to three`);
    for (const [fam, same] of by(on, (k) => k.family)) if (same.length > 1) msgs.push(`${land.art}: ${same.map((k) => k.id).join(" and ")} share the family ${fam}`);
  }
  return res("roster.lands", "red", msgs);
}
// Every kind names exactly one land, one coat material, one signature type and socket, and known parts.
export function checkComplete(reg) {
  const msgs = [];
  const landIds = new Set(reg.lands.map((l) => l.id)), famIds = new Set(reg.families.map((f) => f.id));
  for (const k of roster(reg)) {
    if (!landIds.has(k.land)) msgs.push(`${k.id}: land ${JSON.stringify(k.land)} is not one of the nine`);
    if (!famIds.has(k.family)) msgs.push(`${k.id}: unknown family ${JSON.stringify(k.family)}`);
    if (!COAT_MATERIALS.includes(k.coat?.material)) msgs.push(`${k.id}: coat material ${JSON.stringify(k.coat?.material)} is not in the list`);
    if (k.coat?.material === "fur" && !FUR_PILES.includes(k.coat.pile)) msgs.push(`${k.id}: fur needs a pile kind`);
    if (k.coat?.material !== "fur" && k.coat?.pile) msgs.push(`${k.id}: only fur has a pile`);
    if (!k.signature?.type) msgs.push(`${k.id}: no signature type`);
    if (!SIGNATURE_SOCKETS.includes(k.signature?.socket)) msgs.push(`${k.id}: signature socket ${JSON.stringify(k.signature?.socket)} is not in the list`);
    if (k.signature?.socket === "face") msgs.push(`${k.id}: a signature is never on the face`);
    // The anchors' pools are narrow on purpose (two colours); every other kind has three or four. The first is the default.
    const pool = k.eyes?.irisPool, lo = k.anchor ? 2 : 3;
    if (pool != null && (pool.length < lo || pool.length > 4 || pool.some((c) => !IRIS_COLOURS.includes(c)) || new Set(pool).size !== pool.length)) msgs.push(`${k.id}: iris pool must be ${lo}-4 of the nine colours`);
    if (pool != null && k.eyes.irisDefault !== pool[0]) msgs.push(`${k.id}: the iris default is the first of the pool`);
    const att = k.eyes?.attitudePool;
    if (att != null && (att.length < 1 || att.some((a) => !ATTITUDES.includes(a)) || new Set(att).size !== att.length)) msgs.push(`${k.id}: attitude pool must hold content, curious, deadpan or knowing`);
    if (att != null && (!att.includes("content") || k.eyes.attitudeDefault !== "content")) msgs.push(`${k.id}: content is in every attitude pool and is the default`);
    if (pool == null || att == null) msgs.push(`${k.id}: iris and attitude pools are set for every kind`);
  }
  if (new Set(reg.kinds.map((k) => k.id)).size !== reg.kinds.length) msgs.push("duplicate kind id");
  return res("roster.complete", "red", msgs);
}
// Amber: no two kinds share material kind (with pile) and land.
export function checkCoats(reg) {
  const msgs = [];
  for (const [key, ks] of by(roster(reg), (k) => `${keyOfCoat(k)} in ${k.land}`)) if (ks.length > 1) msgs.push(`${ks.map((k) => k.id).join(" and ")} share ${key}`);
  return res("roster.coats", "amber", msgs);
}
// The retired records an exception may let its kind keep: one record each, Loika's cream muzzle, Wickle's tail-tip ball and Curlop's muzzle.
const MUZZLE_RECORDS = ["anatomy.muzzle-presence", "growth.muzzle-projection-ratio", "growth.muzzle-width-ratio"];
const COVERS_ALLOWED = { "S01/coat.pale": MUZZLE_RECORDS, "S17/sig.one": ["anatomy.tail-tip-bulb"], "S19/face.clear": MUZZLE_RECORDS };
// Exceptions: one kind, one check each; only anchors; never a blanket; signed by the art desk.
export function checkExceptions(reg) {
  const msgs = [];
  const seen = new Set();
  for (const e of reg.exceptions) {
    const k = kindOf(reg, e.kind);
    if (!k) { msgs.push(`exception names unknown kind ${e.kind}`); continue; }
    if (!k.anchor) msgs.push(`${e.kind} ${e.check}: only an anchor may carry an exception`);
    if (typeof e.check !== "string" || !/^[a-z]+\.[a-z0-9-]+$/.test(e.check)) msgs.push(`${e.kind}: ${JSON.stringify(e.check)} names no single check (no blanket exception)`);
    if (e.by !== "art desk") msgs.push(`${e.kind} ${e.check}: signed by ${JSON.stringify(e.by)}; only the art desk signs`);
    if (!e.reason || !e.date || !e.until) msgs.push(`${e.kind} ${e.check}: reason, date and until are required`);
    const key = `${e.kind}/${e.check}/${e.scope ?? ""}`;
    if (seen.has(key)) msgs.push(`${key}: duplicate record`);
    seen.add(key);
    if (e.tassels) {
      const t = e.tassels;
      if (e.kind !== "S18" || t.onlyKind !== "S18") msgs.push(`${e.kind}: the tassels record is Drapet only`);
      if (t.count?.[0] !== 0 || t.count?.[1] > 5 || t.length?.[0] !== 0 || t.length?.[1] > 0.15 || t.hang !== "down" || t.standUp || t.curl || t.brows || t.horns || !t.eyesClear) msgs.push(`${e.kind}: tassels are 0-5 locks, 0-0.15 body height, hanging, never brows or horns, eyes always clear`);
    }
    if (e.covers) {
      const allowed = COVERS_ALLOWED[`${e.kind}/${e.check}`];
      if (!allowed || e.covers.length !== allowed.length || !allowed.every((id) => e.covers.includes(id))) msgs.push(`${e.kind} ${e.check}: covers ${JSON.stringify(e.covers)}; only Loika's coat.pale (its muzzle), Wickle's sig.one (its tail-tip ball) and Curlop's face.clear (its muzzle) cover retired records, and only those`);
    }
    if (e.ears && (e.kind !== "S01" || e.ears.pointed !== false || e.ears.shape !== "round" || e.ears.onlyKind !== "S01")) msgs.push(`${e.kind}: the ears record is Loika only, round, never pointed`);
  }
  for (const k of reg.kinds) if (k.anchor && !reg.exceptions.some((e) => e.kind === k.id)) msgs.push(`${k.id}: anchor with no exception record`);
  return res("roster.exceptions", "red", msgs);
}

export const ROSTER_RULES = [checkComplete, checkFamilyOnce, checkMasses, checkQuads, checkEyes, checkLands, checkCoats, checkExceptions];
export const validateRegistry = (reg = LANGUAGE) => ROSTER_RULES.map((r) => r(reg));

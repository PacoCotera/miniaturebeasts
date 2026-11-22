// G2, the grey pairing screen (plan v6 section 3a): the logic of the test page, no DOM. Everything that decides anything is the real engine (cross, forecast, kinship, vigour, the traits' read states);
// this module only picks the group, the aim, the four young and the hatch, and turns the engine's answers into the rows the page draws. The clocks are off: a hatch is one press, no growing time and no rest.
import { LOCI, valueRange, scaleSteps, resolveCopies } from "../../species/framework/catalogue.mjs";
import { sampleIndividual, buildIndividual } from "../../species/framework/species.mjs";
import { blendRange } from "../../species/framework/cross.mjs";
import { rng } from "../../species/framework/draws.mjs";
import { cross, forecast, kinship, directKin, vigourOf, vigourOfF, traitState } from "./genome.mjs";
import { shapeOf } from "./trait-shapes.mjs";

export const SPECIES = "S01";   // the Loika
export const GROUP_SIZE = 6;
export const YOUNG_SHOWN = 4;
export const SAMPLES = 120;     // crosses the engine draws to learn which looks of a set a pair's young can show

const traitsOf = (frame) => frame.chapters.filter((c) => !c.sealed).flatMap((c) => c.traits.filter((t) => t.loci.every((id) => { const l = frame.loci.find((q) => q.id === id); return l && l.kind !== "locked" && l.changedBy !== "self"; })));
const sortedLabel = (s) => String(s).split(/ and | to |\//).sort().join("|");
const wordsKey = (s) => String(s).split(" and ").sort().join(" and ");

// The step a scale's value sits on: its index among the kind's seven steps, the nearest.
export function stepsOf(frame, trait) {
  const id = trait.loci[0], locus = LOCI.get(id), row = frame.loci.find((l) => l.id === id);
  return { locus, steps: scaleSteps(locus, blendRange(frame, row)) };
}
export function stepIndex(steps, v) { let best = 0; steps.forEach((s, i) => { if (Math.abs(s - v) < Math.abs(steps[best] - v)) best = i; }); return best; }
const shownStep = (frame, trait, genome) => { const { locus, steps } = stepsOf(frame, trait); return stepIndex(steps, resolveCopies(locus, genome.loci[trait.loci[0]])); };
const copySteps = (frame, trait, genome) => { const { locus, steps } = stepsOf(frame, trait); return genome.loci[trait.loci[0]].map((c) => stepIndex(steps, resolveCopies(locus, [c, c]))); };

// The aim: one set look and two scale ends (as B1's). The look is one some founder carries but few show; the scales are the first two, one to each end.
export function makeAim(frame, group, r) {
  const ts = traitsOf(frame), sets = ts.filter((t) => shapeOf(frame, t) === "set" && (t.looks ?? []).length >= 3), scales = ts.filter((t) => shapeOf(frame, t) === "scale");
  const set = sets[0] ?? ts.find((t) => shapeOf(frame, t) === "set");
  const carriedBy = (look) => group.filter((m) => traitState(frame, set, m.genome).carried.includes(look)).length, shownBy = (look) => group.filter((m) => traitState(frame, set, m.genome).shows === look).length;
  const pool = set.looks.filter((l) => carriedBy(l) > 0 && shownBy(l) < Math.ceil(group.length / 2));
  const look = (pool.length ? pool : set.looks)[Math.floor(r() * (pool.length ? pool : set.looks).length)];
  const picked = scales.slice(0, 2).map((t, i) => ({ trait: t.id, end: i === 0 ? 0 : stepsOf(frame, t).steps.length - 1 }));
  return { set: { trait: set.id, look }, scales: picked };
}
export function aimWords(frame, aim) {
  const t = (id) => traitsOf(frame).find((x) => x.id === id);
  return [`${t(aim.set.trait).name}: ${aim.set.look}`, ...aim.scales.map((s) => { const tr = t(s.trait); return `${tr.name}: ${s.end === 0 ? tr.looks[0] : tr.looks.at(-1)}`; })];
}
export function aimMet(frame, aim, m) {
  const t = (id) => traitsOf(frame).find((x) => x.id === id);
  if (traitState(frame, t(aim.set.trait), m.genome).shows !== aim.set.look) return false;
  return aim.scales.every((s) => { const tr = t(s.trait); return shownStep(frame, tr, m.genome) === (s.end === 0 ? 0 : stepsOf(frame, tr).steps.length - 1); });
}

// The game: the group, the aim, the counters. State is plain data; every function below returns the next state or a view.
export function newGame(frame, seed = "g2") {
  const r = rng(seed + ":founders"), group = [];
  for (let i = 0; group.length < GROUP_SIZE && i < 60; i++) {
    const genome = sampleIndividual(frame, r, { kind: "wild" });
    if (buildIndividual(frame, genome).validation.status !== "valid") continue;
    group.push({ id: "L" + (group.length + 1), name: "Wild " + (group.length + 1), genome, parents: [], gen: 0 });
  }
  return { seed, frame, group, aim: makeAim(frame, group, rng(seed + ":aim")), hatches: 0, generation: 0, nextId: group.length + 1, picked: [], last: null, draws: 0 };
}
export const lookupIn = (g) => (id) => g.group.find((m) => m.id === id) ?? null;

// Why two cannot pair: the engine's own refusal, or null.
export function refusal(g, a, b) {
  if (!a || !b) return null;
  const k = directKin(a, b, lookupIn(g));
  return k ? `direct kin (${k.rel}): family does not cross` : null;
}

// The view of a pair: per trait the looks (a set) or the steps (a scale) with where their young can land, plus the kinship and the young's vigour. Fractions only where the forecast keeps them.
export function pairView(g, a, b) {
  const frame = g.frame, lookup = lookupIn(g), why = refusal(g, a, b);
  if (why) return { refusal: why };
  const fc = forecast(frame, a, b, { lookup }), F = kinship(a, b, lookup);
  const stream = rng(`${g.seed}:view:${a.id}:${b.id}`), seen = new Map();
  for (let i = 0; i < SAMPLES; i++) { const c = cross(frame, a, b, { rng: stream, lookup }); for (const t of traitsOf(frame)) if (shapeOf(frame, t) === "set") { const k = traitState(frame, t, c).shows; (seen.get(t.id) ?? seen.set(t.id, new Set()).get(t.id)).add(k); } }
  const traits = traitsOf(frame).map((t) => {
    const f = fc.traits.find((x) => x.trait === t.id);
    if (shapeOf(frame, t) === "set") {
      const reachable = seen.get(t.id) ?? new Set(), exact = f.kind === "switch" && t.loci.length === 1;
      const frac = exact ? Object.fromEntries(Object.entries(f.looks).map(([k, v]) => [sortedLabel(k), v])) : null;
      return { id: t.id, name: t.name, shape: "set", looks: t.looks.map((look) => ({ look, green: reachable.has(look), fresh: reachable.has(look) && !shownInGroup(g, t, look), aim: g.aim.set.trait === t.id && g.aim.set.look === look, fraction: frac ? frac[sortedLabel(look)] ?? 0 : null, a: traitState(frame, t, a.genome).shows === look, b: traitState(frame, t, b.genome).shows === look })) };
    }
    const { steps } = stepsOf(frame, t), lo = stepIndex(steps, f.range[0]), hi = stepIndex(steps, f.range[1]);
    const am = g.aim.scales.find((s) => s.trait === t.id);
    return { id: t.id, name: t.name, shape: "scale", ends: [t.looks[0], t.looks.at(-1)], steps: steps.length, green: [Math.min(lo, hi), Math.max(lo, hi)], a: shownStep(frame, t, a.genome), b: shownStep(frame, t, b.genome), aimStep: am ? (am.end === 0 ? 0 : steps.length - 1) : null };
  });
  return { kinship: F, vigour: vigourOfF(Math.min(0.5, F)), traits };
}

// Is this set look shown by anyone in the group? (a look no one shows is "new to you")
const shownInGroup = (g, t, look) => g.group.some((m) => traitState(g.frame, t, m.genome).shows === look);
// A young is new to you when it shows a set look no one in the group shows.
export function isNew(g, y) { return y.traits.some((r) => r.shape === "set" && !shownInGroup(g, traitsOf(g.frame).find((t) => t.id === r.id), r.shows)); }

// A parent said in plain words: each set's look, each scale's end it leans to.
export function looksOf(g, m) {
  const frame = g.frame;
  return traitsOf(frame).map((t) => {
    if (shapeOf(frame, t) === "set") return `${t.name} ${traitState(frame, t, m.genome).shows}`;
    const { steps } = stepsOf(frame, t), s = shownStep(frame, t, m.genome), e = [t.looks[0], t.looks.at(-1)];
    return `${t.name} ${s <= 1 ? e[0] : s >= steps.length - 2 ? e[1] : "in the middle"}`;
  });
}

// The four young they could have: four real crosses, each read trait by trait.
export function fourYoung(g, a, b, n = YOUNG_SHOWN) {
  if (refusal(g, a, b)) return [];
  const stream = rng(`${g.seed}:four:${g.hatches}:${a.id}:${b.id}`), lookup = lookupIn(g), out = [];
  for (let i = 0; i < n * 4 && out.length < n; i++) {
    const genome = cross(g.frame, a, b, { rng: stream, lookup });
    if (buildIndividual(g.frame, genome).validation.status === "valid") out.push({ ...readOf(g, genome), genome });
  }
  return out.map((y) => ({ ...y, fresh: isNew(g, y) }));
}
export function readOf(g, genome) {
  const frame = g.frame;
  return { aim: aimMet(frame, g.aim, { genome }), traits: traitsOf(frame).map((t) => shapeOf(frame, t) === "set" ? { id: t.id, name: t.name, shape: "set", shows: traitState(frame, t, genome).shows } : { id: t.id, name: t.name, shape: "scale", step: shownStep(frame, t, genome), steps: stepsOf(frame, t).steps.length }) };
}

// The words for a vigour value (the engine's number, said in one word).
export const vigourBand = (v) => (v >= 0.995 ? "full" : v >= 0.8 ? "lower" : v > 0.5 ? "low" : "lowest");

// Pick: toggles a member in the pair (at most two; a third press replaces the older).
export function pick(g, id) {
  const has = g.picked.includes(id), picked = has ? g.picked.filter((x) => x !== id) : [...g.picked, id].slice(-2);
  return { ...g, picked };
}
// The partner is chosen as in the picture: one is held, the other is changed with left/right through the rest of the group (the first one who is not direct kin comes first).
export function hold(g, id) {
  const others = g.group.filter((m) => m.id !== id), held = g.group.find((m) => m.id === id);
  const first = others.find((m) => !refusal(g, held, m)) ?? others[0];
  return { ...g, picked: first ? [id, first.id] : [id], last: null };
}
export function nextPartner(g, dir) {
  if (g.picked.length !== 2) return g;
  const others = g.group.filter((m) => m.id !== g.picked[0]), i = others.findIndex((m) => m.id === g.picked[1]);
  return { ...g, picked: [g.picked[0], others[(i + dir + others.length) % others.length].id] };
}
export const pickedMembers = (g) => g.picked.map((id) => g.group.find((m) => m.id === id));

// Hatch: one real cross of the pair, one young at once; it joins the group. Returns the next state, or the same state with `last` saying why not.
export function hatch(g) {
  const [a, b] = pickedMembers(g);
  if (!a || !b) return g;
  const why = refusal(g, a, b);
  if (why) return { ...g, last: { refused: why } };
  const stream = rng(`${g.seed}:hatch:${g.draws}`), lookup = lookupIn(g);
  let genome = null;
  const four = fourYoung(g, a, b);   // the hatch is one of the four shown
  if (four.length) genome = four[Math.floor(rng(`${g.seed}:pick:${g.draws}`)() * four.length)].genome;
  for (let i = 0; i < 24 && !genome; i++) { const c = cross(g.frame, a, b, { rng: stream, lookup }); if (buildIndividual(g.frame, c).validation.status === "valid") genome = c; }
  if (!genome) return { ...g, draws: g.draws + 1, last: { refused: "no young could be built" } };
  const id = "L" + (g.nextId + 1), young = { id, name: "Young " + (g.hatches + 1), genome, parents: [a.id, b.id], gen: Math.max(a.gen, b.gen) + 1 };
  const next = { ...g, group: [...g.group, young], nextId: g.nextId + 1, hatches: g.hatches + 1, generation: Math.max(g.generation, young.gen), picked: [], draws: g.draws + 1 };
  return { ...next, last: { young: id, vigour: vigourOf(genome), aim: aimMet(g.frame, g.aim, young), read: readOf(g, genome) } };
}

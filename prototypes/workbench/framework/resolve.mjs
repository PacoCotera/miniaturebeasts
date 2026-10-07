// Resolving one individual: a frame (the species: plan facts, carried loci, pools) and a genome
// (two copies at every carried locus) become values for the rig and a fact per locus.
//
// Operators are the v1 resolver's (catalogue.mjs resolveCopies). What differs from v1
// (compositional-vocabulary-adapter.mjs) is the pan-genome: a genome carries only the loci its
// frame lists; a part the plan never has is absent, not a carried-and-inactive pair. A carried
// locus whose owner is an open part switch that is off in this individual is "asleep".
import { LOCI, resolveCopies } from "./catalogue.mjs";
import { planFacts } from "./plans.mjs";
import { ownerOn, isPartSwitch, isDoing, SWITCH_TARGETS } from "./guards.mjs";

export function resolveIndividual(frame, genome) {
  const plan = planFacts(frame.plan.key, frame.plan.extras);
  const values = { ...plan.values };
  const facts = [];
  const carriedIds = frame.loci.map((l) => l.id);
  for (const id of carriedIds) {
    if (!genome.loci[id]) throw new Error(`genome lacks carried locus ${id}`);
  }
  for (const id of Object.keys(genome.loci)) if (!carriedIds.includes(id)) throw new Error(`genome carries ${id}, which ${frame.species.id} does not have`);
  // Part switches first: they set the owners the other loci are guarded by.
  const order = [...carriedIds.filter(isPartSwitch), ...carriedIds.filter((id) => !isPartSwitch(id))];
  for (const id of order) {
    const locus = LOCI.get(id);
    const copies = genome.loci[id];
    const value = resolveCopies(locus, copies);
    const target = locus.target ?? id;
    const [on, why] = ownerOn(id, values);
    const fact = { id, target, copies: [...copies], value, nature: isDoing(id) ? "doing" : "look", state: on ? "expressed" : "asleep", reason: on ? why : `asleep: no ${why} in this individual`, switch: isPartSwitch(id) };
    facts.push(fact);
    if (on) {
      values[target] = value;
      if (isPartSwitch(id)) values[SWITCH_TARGETS[id]] = value;
    } else if (isPartSwitch(id)) values[SWITCH_TARGETS[id]] = false;
  }
  // Doings never enter the rig; they weigh the state machine. Keep them separate.
  const behaviour = Object.fromEntries(facts.filter((f) => f.nature === "doing" && f.state === "expressed").map((f) => [f.id, f.value]));
  return { plan, values, facts, behaviour };
}

export const factMap = (facts) => Object.fromEntries(facts.map((f) => [f.id, f]));

/** Reversible fictional rules for the first playable; not approved product genetics. */
export const RULESET_VERSION = 'draft-genetics-1';
export const RANDOM_VERSION = 'fnv1a-mulberry32-1';
export const BODY_PLAN_ID = 'draft:frilled-quadruped:1';
export const TRAITS = ['crown', 'eyes', 'pale'];
export const STARTER_PARENTS = [
  { id: 'starter:a', name: 'Parent A', bodyPlanId: BODY_PLAN_ID, genome: { crown: 'Cc', eyes: 'Rr', pale: 'Pp' }, expression: { crown: true, eyes: true, pale: false, sampleInfluenced: false } },
  { id: 'starter:b', name: 'Parent B', bodyPlanId: BODY_PLAN_ID, genome: { crown: 'Cc', eyes: 'rr', pale: 'Pp' }, expression: { crown: true, eyes: false, pale: false, sampleInfluenced: false } },
];

export function validateParent(parent) {
  if (!parent || typeof parent.id !== 'string' || parent.bodyPlanId !== BODY_PLAN_ID) throw new Error('Unsupported parent/body plan');
  for (const [trait, pattern] of [['crown', /^[Cc]{2}$/], ['eyes', /^[Rr]{2}$/], ['pale', /^[Pp]{2}$/]]) {
    if (!pattern.test(parent.genome?.[trait])) throw new Error(`Invalid ${trait} genome`);
  }
}

/** Shared expression rule used by both exact forecast and actual birth. */
export function resolveExpression(genome, withSample = false, activation = false) {
  const sampleInfluenced = Boolean(withSample && activation && genome.pale.includes('P') && genome.pale.includes('p'));
  return { crown: genome.crown.includes('C'), eyes: genome.eyes.includes('R'), pale: genome.pale === 'pp' || sampleInfluenced, sampleInfluenced };
}

/** Returns marginal trait probabilities, each 0..1; these need not sum to one. */
export function forecast(parentA, parentB, withSample = false) {
  validateParent(parentA); validateParent(parentB);
  const result = { crown: 0, eyes: 0, pale: 0 };
  for (const trait of TRAITS) {
    for (const a of parentA.genome[trait]) for (const b of parentB.genome[trait]) {
      for (const activation of [false, true]) {
        const genome = { crown: 'cc', eyes: 'rr', pale: 'PP', [trait]: [a, b].sort().join('') };
        if (resolveExpression(genome, withSample, activation)[trait]) result[trait] += 1 / 8;
      }
    }
  }
  return result;
}

function seededRandom(seed) {
  let value = 2166136261;
  for (let i = 0; i < seed.length; i++) value = Math.imul(value ^ seed.charCodeAt(i), 16777619) >>> 0;
  return () => {
    value = (value + 0x6D2B79F5) >>> 0;
    let t = Math.imul(value ^ value >>> 15, 1 | value);
    t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/** Exactly seven draws: two alleles per trait, then one activation coin. */
export function inherit(parentA, parentB, { seed, withSample = false, rulesetVersion = RULESET_VERSION, randomVersion = RANDOM_VERSION }) {
  validateParent(parentA); validateParent(parentB);
  if (typeof seed !== 'string' || !seed.length) throw new Error('A nonempty string seed is required');
  if (rulesetVersion !== RULESET_VERSION || randomVersion !== RANDOM_VERSION) throw new Error('Unsupported generation version');
  const random = seededRandom(seed);
  const genome = {};
  for (const trait of TRAITS) genome[trait] = [parentA.genome[trait][Math.floor(random() * 2)], parentB.genome[trait][Math.floor(random() * 2)]].sort().join('');
  const activation = random() < 0.5;
  return { genome, expression: resolveExpression(genome, withSample, activation), activation };
}

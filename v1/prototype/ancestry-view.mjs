import { inherit, validateParent, RULESET_VERSION, RANDOM_VERSION } from './genetics.mjs';

const traits = [
  ['crown', 'Frill'],
  ['eyes', 'Eyes'],
  ['pale', 'Markings'],
];
const validId = value => typeof value === 'string' && /^[A-Za-z0-9:_-]{1,160}$/.test(value);
const sameFields = (actual, expected, fields) => fields.every(field => actual?.[field] === expected[field]);

// Public snapshots contain parental genotypes, not parental appearance/history.
// Reuse the pinned domain generator to check context; do not infer donor order
// from a child's sorted allele pair or replace missing ancestry with live parents.
export function getAncestryView(record) {
  const unavailable = reason => ({ available: false, reason });
  const child = record?.specimen;
  const birth = record?.birth;
  if (!child || !birth || !Array.isArray(birth.parentSnapshots) || birth.parentSnapshots.length !== 2) {
    return unavailable('The shared record does not include a complete saved parent pair.');
  }
  if (record.schemaVersion !== 1 || child.rulesetVersion !== RULESET_VERSION || birth.rulesetVersion !== RULESET_VERSION || birth.randomVersion !== RANDOM_VERSION || ![null, 'draft:mist-expression:1'].includes(birth.sampleEffectVersion)) {
    return unavailable('The saved ancestry uses an unsupported version or sample effect.');
  }
  const parents = birth.parentSnapshots;
  if (!validId(child.id) || !validId(birth.id) || child.birthEventId !== birth.id || child.id !== `specimen:${birth.id}` || !Array.isArray(child.parentIds) || child.parentIds.length !== 2 || !parents.every((parent, index) => validId(parent?.id) && parent.id === child.parentIds[index])) {
    return unavailable('The saved birth and parent identities do not agree with this individual.');
  }
  if (typeof birth.seed !== 'string' || !birth.seed.length || birth.seed.length > 160) {
    return unavailable('The saved birth is missing a supported generation seed.');
  }

  let resolved;
  try {
    validateParent(child);
    resolved = inherit(parents[0], parents[1], {
      seed: birth.seed,
      withSample: birth.sampleEffectVersion !== null,
      rulesetVersion: birth.rulesetVersion,
      randomVersion: birth.randomVersion,
    });
  } catch {
    return unavailable('The saved family or inherited variants are unsupported.');
  }
  const genomeFields = traits.map(([trait]) => trait);
  const expressionFields = [...genomeFields, 'sampleInfluenced'];
  if (!sameFields(child.genome, resolved.genome, genomeFields) || !sameFields(birth.resolved?.genome, resolved.genome, genomeFields) || !sameFields(child.expression, resolved.expression, expressionFields) || !sameFields(birth.resolved?.expression, resolved.expression, expressionFields) || birth.resolved?.activation !== resolved.activation) {
    return unavailable('The saved ancestry cannot reproduce this individual under its pinned rules.');
  }

  return {
    available: true,
    parents: parents.map(parent => ({ id: parent.id, bodyPlanId: parent.bodyPlanId })),
    rows: traits.map(([traitId, label]) => ({
      traitId,
      label,
      parentAAlleles: parents[0].genome[traitId],
      parentBAlleles: parents[1].genome[traitId],
      childAlleles: child.genome[traitId],
    })),
    rulesetVersion: birth.rulesetVersion,
    sampleApplied: birth.sampleEffectVersion !== null,
    paleSource: resolved.expression.sampleInfluenced ? 'sample-activation' : resolved.expression.pale ? 'inherited' : 'not-expressed',
  };
}

export const envelopeVersion = 'saved-specimen-fixture-1';

function validateObjectFields(value, expectedNames) {
  if (
    !value || typeof value !== 'object' || Array.isArray(value) ||
    Object.keys(value).sort().join(',') !== [...expectedNames].sort().join(',')
  ) {
    throw new Error('Malformed record');
  }
}

function validateText(value) {
  if (
    typeof value !== 'string' || value.length < 1 || value.length > 160 ||
    /[\u0000-\u001f]/.test(value)
  ) {
    throw new Error('Malformed text');
  }
}

function validateTextList(values) {
  if (!Array.isArray(values) || values.length > 32) {
    throw new Error('Malformed list');
  }
  values.forEach(validateText);
}

function validateGenome(value) {
  validateObjectFields(value, ['revision', 'loci']);
  validateText(value.revision);
  if (
    !value.loci || typeof value.loci !== 'object' || Array.isArray(value.loci) ||
    Object.keys(value.loci).length === 0 || Object.keys(value.loci).length > 32
  ) {
    throw new Error('Malformed loci');
  }
  for (const [name, pair] of Object.entries(value.loci)) {
    validateText(name);
    validateTextList(pair);
    if (pair.length !== 2) {
      throw new Error('Malformed allele pair');
    }
  }
}

function validateFixtureRecord(record) {
  validateObjectFields(record, ['format', 'specimen']);
  const saved = record.specimen;
  validateObjectFields(saved, [
    'id', 'shortId', 'classification', 'ancestry', 'origin', 'birthEvent',
    'history', 'genome', 'expression', 'versions', 'art',
  ]);
  for (const name of ['id', 'shortId', 'birthEvent']) {
    validateText(saved[name]);
  }
  validateTextList(saved.history);
  validateObjectFields(saved.classification, ['familyId', 'familyLabel', 'bodyPlanId']);
  Object.values(saved.classification).forEach(validateText);

  validateObjectFields(saved.ancestry, ['kind', 'parents']);
  if (
    !['none', 'known', 'unknown'].includes(saved.ancestry.kind) ||
    !Array.isArray(saved.ancestry.parents)
  ) {
    throw new Error('Malformed ancestry');
  }
  const expectedParentCount = saved.ancestry.kind === 'known' ? 2 : 0;
  if (saved.ancestry.parents.length !== expectedParentCount) {
    throw new Error('Contradictory ancestry');
  }
  for (const parent of saved.ancestry.parents) {
    validateObjectFields(parent, ['id', 'genome']);
    validateText(parent.id);
    validateGenome(parent.genome);
  }
  const parentIds = saved.ancestry.parents.map(parent => parent.id);
  if (new Set(parentIds).size !== parentIds.length || parentIds.includes(saved.id)) {
    throw new Error('Contradictory parent identities');
  }

  validateObjectFields(saved.origin, ['kind', 'sourceRef', 'studyRef', 'creationRef']);
  if (!['lab-created', 'authored-offspring', 'imported'].includes(saved.origin.kind)) {
    throw new Error('Malformed origin');
  }
  for (const name of ['sourceRef', 'studyRef', 'creationRef']) {
    if (saved.origin[name] !== null) {
      validateText(saved.origin[name]);
    }
  }
  if (saved.origin.kind === 'lab-created' && saved.ancestry.kind !== 'none') {
    throw new Error('Founder ancestry must be explicit');
  }
  if (saved.origin.kind === 'authored-offspring' && saved.ancestry.kind !== 'known') {
    throw new Error('Offspring requires supplied parents');
  }
  validateGenome(saved.genome);

  validateObjectFields(saved.expression, [
    'context', 'expressed', 'carried', 'samplePaleActivation', 'unmodeled',
  ]);
  validateText(saved.expression.context);
  for (const field of ['expressed', 'carried', 'unmodeled']) {
    validateTextList(saved.expression[field]);
  }
  if (typeof saved.expression.samplePaleActivation !== 'boolean') {
    throw new Error('Malformed saved context');
  }
  validateObjectFields(saved.versions, ['rules', 'content', 'outcome']);
  Object.values(saved.versions).forEach(validateText);

  validateObjectFields(saved.art, ['sourceAsset', 'version', 'expressionRef', 'color', 'mono']);
  for (const field of ['sourceAsset', 'version', 'expressionRef']) {
    validateText(saved.art[field]);
  }
  if (saved.art.expressionRef !== saved.expression.context) {
    throw new Error('Art expression reference mismatch');
  }
  for (const treatment of ['color', 'mono']) {
    validateObjectFields(saved.art[treatment], ['id', 'sha256']);
    validateText(saved.art[treatment].id);
    if (!/^[a-f0-9]{64}$/.test(saved.art[treatment].sha256)) {
      throw new Error('Malformed art hash');
    }
  }
}

export function assessRecord(record, capabilities) {
  const unavailable = reason => ({
    availability: 'unavailable', reason, saved: null, actions: [],
  });
  if (
    record?.format !== envelopeVersion ||
    !capabilities.envelopes.includes(envelopeVersion)
  ) {
    return unavailable('Unsupported envelope');
  }
  try {
    validateFixtureRecord(record);
  } catch {
    return unavailable('Malformed record');
  }
  const saved = structuredClone(record.specimen);
  const supported = ['rules', 'content', 'outcome'].every(field =>
    capabilities[field].includes(saved.versions[field])
  );
  return {
    availability: supported ? 'supported' : 'historical',
    reason: supported
      ? 'Saved facts; no authority granted'
      : 'Saved historical facts; content interpretation unavailable',
    saved,
    actions: [],
  };
}

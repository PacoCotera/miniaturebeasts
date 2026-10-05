import { CONTENT_VERSION, OUTCOME_VERSION, CONSUMPTION, sources, cargo, outcome, questionById } from './content.mjs';

export function emptyEnvelope() {
  return { schema: 1, scenario: CONTENT_VERSION, revision: 0, receipts: {}, samples: {}, resources: [], research: null, operations: {}, collection: {} };
}

export function validateEnvelope(envelope) {
  if (!envelope || envelope.schema !== 1 || envelope.scenario !== CONTENT_VERSION) {
    throw new Error('UNSUPPORTED SAVED VERSION');
  }
  const require = (condition, reason) => {
    if (!condition) throw new Error('INVALID SAVED DATA - ' + reason);
  };
  const dictionary = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  require(Number.isSafeInteger(envelope.revision) && envelope.revision >= 0, 'REVISION');
  for (const name of ['receipts', 'samples', 'operations', 'collection']) {
    require(dictionary(envelope[name]), name.toUpperCase());
  }
  require(Array.isArray(envelope.resources) && envelope.resources.length === 0, 'RESOURCES');
  require(Object.keys(envelope.receipts).length <= 1, 'RECEIPT COUNT');
  for (const [id, receipt] of Object.entries(envelope.receipts)) {
    require(dictionary(receipt) && id === cargo.transferId && receipt.id === id && same(receipt.cargo, cargo), 'RECEIPT');
    require(Boolean(envelope.samples[sources.probe.id]), 'RECEIPT SAMPLE');
  }
  for (const [id, sample] of Object.entries(envelope.samples)) {
    const source = Object.values(sources).find(candidate => candidate.id === id);
    require(Boolean(source) && dictionary(sample), 'SAMPLE ID');
    const { status, ...sourceSnapshot } = sample;
    require(same(sourceSnapshot, source) && ['available', 'consumed'].includes(status), 'SAMPLE SOURCE');
    if (source.kind === 'fixture-probe') require(Boolean(envelope.receipts[cargo.transferId]), 'PROBE RECEIPT');
  }
  const study = envelope.research;
  if (study !== null) {
    require(dictionary(study), 'RESEARCH');
    const sample = envelope.samples[study.sampleId];
    require(Boolean(sample) && study.id === 'study:' + sample.id && study.version === CONTENT_VERSION, 'RESEARCH SOURCE');
    let question;
    try { question = questionById(study.question); } catch { require(false, 'QUESTION'); }
    require(sample.capabilities.includes(question.requires), 'QUESTION EVIDENCE');
    require(study.finding === null || same(study.finding, question.finding), 'FINDING');
    require(study.direction === null || (study.finding !== null && question.directions.some(entry => entry.id === study.direction)), 'DIRECTION');
  }
  require(Object.keys(envelope.operations).length <= 1, 'OPERATION COUNT');
  require(Object.keys(envelope.collection).length <= 1, 'COLLECTION COUNT');
  const committedIds = new Set();
  const consumedIds = new Set();
  for (const [id, operation] of Object.entries(envelope.operations)) {
    require(dictionary(operation) && /^[A-Z0-9-]{1,64}$/.test(id) && operation.id === id, 'OPERATION ID');
    require(study?.finding && study.direction && same(operation.request, requestFromStudy(study)), 'OPERATION REQUEST');
    require(['pending', 'committed'].includes(operation.status), 'OPERATION STATUS');
    const sample = envelope.samples[operation.request.sampleId];
    if (operation.status === 'pending') {
      require(operation.specimenId === null && sample.status === 'available', 'PENDING OPERATION');
    } else {
      require(operation.specimenId === 'DEMO-' + id && sample.status === 'consumed', 'COMMITTED OPERATION');
      const specimen = envelope.collection[operation.specimenId];
      require(dictionary(specimen), 'MISSING INDIVIDUAL');
      require(specimen.id === operation.specimenId && specimen.operationId === id && specimen.shortId === '#001', 'INDIVIDUAL ID');
      for (const [field, expected] of Object.entries(outcome)) {
        require(same(specimen[field], expected), 'INDIVIDUAL ' + field.toUpperCase());
      }
      require(same(specimen.ancestry, { kind: 'parentless', parents: [] }), 'ANCESTRY');
      require(same(specimen.origin, {
        kind: 'lab-created', fixture: true, sampleId: sample.id, studyId: study.id,
        source: { ...sample, status: 'available' },
      }), 'ORIGIN');
      committedIds.add(specimen.id);
      consumedIds.add(sample.id);
    }
  }
  for (const id of Object.keys(envelope.collection)) require(committedIds.has(id), 'ORPHAN INDIVIDUAL');
  for (const sample of Object.values(envelope.samples)) {
    require((sample.status === 'consumed') === consumedIds.has(sample.id), 'CONSUMPTION');
  }
  return envelope;
}

function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
  }
  return JSON.stringify(value);
}

function same(left, right) { return canonical(left) === canonical(right); }

function activeResearch(envelope) {
  if (!envelope.research) throw new Error('NO STUDY');
  return envelope.research;
}

export function creationRequest(envelope) {
  validateEnvelope(envelope);
  const study = activeResearch(envelope);
  if (!study.finding || !study.direction) throw new Error('NEEDS FINDING AND DIRECTION');
  return requestFromStudy(study);
}

function requestFromStudy(study) {
  return {
    scenario: CONTENT_VERSION, outcome: OUTCOME_VERSION, studyId: study.id,
    sampleId: study.sampleId, question: study.question, finding: study.finding.id,
    direction: study.direction, consumption: CONSUMPTION,
  };
}

// Synchronous reducer: storage owns transaction/commit, navigation owns no domain state.
export function applyCommand(saved, command) {
  validateEnvelope(saved);
  const next = structuredClone(saved);
  let result;
  switch (command.type) {
    case 'receive': {
      const supplied = command.cargo ?? cargo;
      const existing = next.receipts[supplied.transferId];
      if (existing) {
        if (!same(existing.cargo, supplied)) throw new Error('TRANSFER CONFLICT');
        return { envelope: next, result: existing };
      }
      if (!same(supplied, cargo)) throw new Error('UNSUPPORTED CARGO');
      const receipt = { id: supplied.transferId, cargo: structuredClone(supplied) };
      next.receipts[receipt.id] = receipt;
      for (const sample of supplied.samples) next.samples[sample.id] = { ...structuredClone(sample), status: 'available' };
      next.resources.push(...structuredClone(supplied.resources));
      result = receipt;
      break;
    }
    case 'console': {
      const sample = sources.console;
      if (!next.samples[sample.id]) next.samples[sample.id] = { ...structuredClone(sample), status: 'available' };
      result = next.samples[sample.id];
      break;
    }
    case 'start': {
      const sample = next.samples[command.sampleId];
      if (!sample || sample.status !== 'available') throw new Error('NO USABLE SAMPLE');
      const question = questionById(command.question);
      if (!sample.capabilities.includes(question.requires)) throw new Error('NEEDS EVIDENCE');
      if (next.research) {
        if (next.research.sampleId !== sample.id || next.research.question !== question.id) throw new Error('STUDY ALREADY STARTED');
        return { envelope: next, result: next.research };
      }
      next.research = { id: 'study:' + sample.id, sampleId: sample.id, version: CONTENT_VERSION, question: question.id, finding: null, direction: null };
      result = next.research;
      break;
    }
    case 'advance': {
      const study = activeResearch(next);
      const sample = next.samples[study.sampleId];
      const question = questionById(study.question);
      if (!sample.capabilities.includes(question.requires)) throw new Error('NEEDS EVIDENCE');
      if (!study.finding) study.finding = structuredClone(question.finding);
      result = study;
      break;
    }
    case 'direction': {
      const study = activeResearch(next);
      if (!study.finding) throw new Error('NO FINDING');
      if (Object.keys(next.operations).length) throw new Error('CREATION ALREADY REQUESTED');
      if (!questionById(study.question).directions.some(entry => entry.id === command.direction)) throw new Error('UNSUPPORTED DIRECTION');
      study.direction = command.direction;
      result = study;
      break;
    }
    case 'intent': {
      if (!command.id || typeof command.id !== 'string') throw new Error('MISSING OPERATION ID');
      const existing = next.operations[command.id];
      if (existing) {
        if (!same(existing.request, command.request)) throw new Error('OPERATION CONFLICT');
        return { envelope: next, result: existing };
      }
      if (!same(creationRequest(next), command.request)) throw new Error('CREATION SUMMARY CHANGED');
      if (next.samples[command.request.sampleId].status !== 'available') throw new Error('SAMPLE ALREADY USED');
      if (Object.values(next.operations).some(operation => operation.request.sampleId === command.request.sampleId)) {
        throw new Error('SAMPLE HAS AN OPERATION');
      }
      result = { id: command.id, request: structuredClone(command.request), status: 'pending', specimenId: null };
      next.operations[result.id] = result;
      break;
    }
    case 'resolve': {
      const operation = next.operations[command.id];
      if (!operation) throw new Error('OPERATION NOT FOUND');
      if (operation.status === 'committed') return { envelope: next, result: operation };
      if (!same(creationRequest(next), operation.request)) throw new Error('CREATION SUMMARY CHANGED');
      const sample = next.samples[operation.request.sampleId];
      if (sample.status !== 'available') throw new Error('SAMPLE ALREADY USED');
      const id = 'DEMO-' + operation.id;
      next.collection[id] = {
        id, shortId: '#001', ...structuredClone(outcome), operationId: operation.id,
        origin: { kind: 'lab-created', fixture: true, sampleId: sample.id, studyId: next.research.id, source: structuredClone(sample) },
        ancestry: { kind: 'parentless', parents: [] },
      };
      sample.status = 'consumed';
      operation.status = 'committed';
      operation.specimenId = id;
      result = operation;
      break;
    }
    default: throw new Error('UNSUPPORTED COMMAND');
  }
  next.revision++;
  validateEnvelope(next);
  return { envelope: next, result: structuredClone(result) };
}

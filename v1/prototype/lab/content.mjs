function freeze(value) {
  for (const child of Object.values(value)) {
    if (child && typeof child === 'object') freeze(child);
  }
  return Object.freeze(value);
}

export const CONTENT_VERSION = 'founder-demo-1';
export const OUTCOME_VERSION = 'authored-founder-1';
export const CONSUMPTION = 'ONE FIXTURE SAMPLE / NO SUPPLIES';

export const sources = freeze({
  probe: {
    id: 'sample-probe-01', kind: 'fixture-probe', label: 'PROBE SAMPLE', fixture: true,
    evidence: [{ feature: 'relative-humidity', value: 78, unit: 'percent', quality: 'simulated' }],
    observations: ['SIMULATED HUMIDITY 78 PERCENT'],
    capabilities: ['authored-structure', 'authored-carried-variation'],
  },
  console: {
    id: 'investigation-console-01', kind: 'lab-investigation', label: 'LAB INVESTIGATION', fixture: true,
    evidence: [], observations: ['AUTHORED LAB OBSERVATION', 'NO FIELD MEASUREMENTS'],
    capabilities: ['authored-structure', 'authored-carried-variation'],
  },
});

export const cargo = freeze({
  version: CONTENT_VERSION, transferId: 'fixture-transfer-01', device: 'SIMULATED PROBE',
  samples: [sources.probe], resources: [],
});

export const questions = freeze([
  {
    id: 'structure', label: 'VISIBLE STRUCTURES', requires: 'authored-structure',
    finding: { id: 'crown', label: 'CROWN STRUCTURE', known: ['AUTHORED OUTCOME HAS A CROWN'], unresolved: ['WHY IT FORMS IS UNMODELED'] },
    directions: [{ id: 'shape', label: 'PURSUE SHAPE' }, { id: 'outline', label: 'PURSUE OUTLINE' }],
  },
  {
    id: 'variation', label: 'CARRIED VARIATION', requires: 'authored-carried-variation',
    finding: { id: 'pale', label: 'CARRIED PALE VARIANT', known: ['PALE VARIANT IS CARRIED', 'PALE MARKINGS NOT EXPRESSED'], unresolved: ['OTHER DIMENSIONS UNMODELED'] },
    directions: [{ id: 'carriage', label: 'FOLLOW PALE VARIANT' }, { id: 'expression', label: 'CHECK EXPRESSION' }],
  },
]);

export const outcome = freeze({
  version: OUTCOME_VERSION,
  classId: 'fixture-family-a', bodyPlanId: 'draft:frilled-quadruped:1', family: 'FAMILY A',
  genome: { crown: ['C', 'c'], eyes: ['R', 'r'], pale: ['P', 'p'] },
  expression: {
    rules: 'draft-genetics-1', context: 'authored-founder-no-sample-activation',
    expressed: ['CROWN FRILL', 'RINGED EYES'], carried: ['PALE MARKINGS'],
    samplePaleActivation: false, unsupported: ['OTHER DIMENSIONS'],
  },
  portrait: { asset: 'critter', version: 'pixel-01' },
});

export function questionById(id) {
  const question = questions.find(entry => entry.id === id);
  if (!question) throw new Error('UNSUPPORTED QUESTION');
  return question;
}

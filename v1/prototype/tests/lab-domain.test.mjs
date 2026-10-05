import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyEnvelope, applyCommand, creationRequest, validateEnvelope } from '../lab/domain.mjs';
import { cargo, outcome, sources } from '../lab/content.mjs';
import { resolveExpression, RULESET_VERSION } from '../genetics.mjs';

// Serialized transaction fake models atomic rollback. Browser IDB needs separate validation.
class TransactionalFake {
  constructor(envelope = emptyEnvelope()) {
    this.envelope = structuredClone(envelope);
    this.queue = Promise.resolve();
    this.abortNext = false;
    this.loseNextResponse = false;
  }
  execute(command) {
    const transaction = this.queue.then(() => {
      const changed = applyCommand(this.envelope, command);
      if (this.abortNext) {
        this.abortNext = false;
        throw new Error('ABORTED');
      }
      this.envelope = structuredClone(changed.envelope);
      if (this.loseNextResponse) {
        this.loseNextResponse = false;
        throw new Error('RESPONSE LOST');
      }
      return structuredClone(changed);
    });
    this.queue = transaction.catch(() => {});
    return transaction;
  }
}

async function readyStudy(repository, source = 'console', question = 'structure') {
  await repository.execute({ type: source === 'probe' ? 'receive' : 'console' });
  await repository.execute({ type: 'start', sampleId: sources[source].id, question });
  await repository.execute({ type: 'advance' });
  await repository.execute({ type: 'direction', direction: question === 'structure' ? 'shape' : 'carriage' });
}

test('probe cargo is idempotent and conflicting transfer cannot change supplies', async () => {
  const repository = new TransactionalFake();
  await repository.execute({ type: 'receive' });
  const saved = structuredClone(repository.envelope);
  await repository.execute({ type: 'receive' });
  assert.deepEqual(repository.envelope, saved);
  await assert.rejects(repository.execute({ type: 'receive', cargo: { ...cargo, resources: [{ id: 'FAKE', quantity: 99 }] } }), /TRANSFER CONFLICT/);
  assert.deepEqual(repository.envelope, saved);
});

test('both source scenarios preserve truthful origin, authored phenotype and parentless ancestry', async () => {
  for (const source of ['probe', 'console']) {
    const repository = new TransactionalFake();
    await readyStudy(repository, source);
    const request = creationRequest(repository.envelope);
    await repository.execute({ type: 'intent', id: 'OP-' + source.toUpperCase(), request });
    await repository.execute({ type: 'resolve', id: 'OP-' + source.toUpperCase() });
    const specimen = Object.values(repository.envelope.collection)[0];
    assert.deepEqual(specimen.genome, outcome.genome);
    assert.equal(specimen.expression.rules, RULESET_VERSION);
    const genome = Object.fromEntries(Object.entries(specimen.genome).map(([trait, alleles]) => [trait, alleles.join('')]));
    assert.deepEqual(resolveExpression(genome, false, false), { crown: true, eyes: true, pale: false, sampleInfluenced: false });
    assert.deepEqual(specimen.ancestry, { kind: 'parentless', parents: [] });
    assert.equal(specimen.origin.kind, 'lab-created');
    assert.equal(specimen.origin.source.kind, sources[source].kind);
    if (source === 'console') assert.deepEqual(specimen.origin.source.evidence, []);
    assert.equal(repository.envelope.samples[sources[source].id].status, 'consumed');
    assert.deepEqual(repository.envelope.resources, []);
  }
});

test('durable intent, lost result, reload and retries keep exactly one result', async () => {
  let repository = new TransactionalFake();
  await readyStudy(repository);
  const request = creationRequest(repository.envelope);
  repository = new TransactionalFake(repository.envelope); // Reload before intent.
  await repository.execute({ type: 'intent', id: 'OP-1', request });
  repository = new TransactionalFake(repository.envelope); // Reload after intent.
  repository.loseNextResponse = true;
  await assert.rejects(repository.execute({ type: 'resolve', id: 'OP-1' }), /RESPONSE LOST/);
  repository = new TransactionalFake(repository.envelope); // Reload after commit.
  const saved = structuredClone(repository.envelope);
  await repository.execute({ type: 'intent', id: 'OP-1', request });
  await repository.execute({ type: 'resolve', id: 'OP-1' });
  assert.deepEqual(repository.envelope, saved);
  assert.equal(Object.keys(repository.envelope.collection).length, 1);
  await assert.rejects(repository.execute({ type: 'intent', id: 'OP-1', request: { ...request, direction: 'other' } }), /OPERATION CONFLICT/);
});

test('concurrent attempts and abort do not double-consume or partially save', async () => {
  const repository = new TransactionalFake();
  await readyStudy(repository);
  const request = creationRequest(repository.envelope);
  const intents = await Promise.allSettled(['OP-A', 'OP-B'].map(id => repository.execute({ type: 'intent', id, request })));
  assert.equal(intents.filter(result => result.status === 'fulfilled').length, 1);
  const pending = structuredClone(repository.envelope);
  repository.abortNext = true;
  await assert.rejects(repository.execute({ type: 'resolve', id: 'OP-A' }), /ABORTED/);
  assert.deepEqual(repository.envelope, pending);
  await Promise.all([repository.execute({ type: 'resolve', id: 'OP-A' }), repository.execute({ type: 'resolve', id: 'OP-A' })]);
  assert.equal(Object.keys(repository.envelope.collection).length, 1);
});

test('unsupported versions/evidence are preserved, not silently replaced', async () => {
  const incompatible = { ...emptyEnvelope(), schema: 500 };
  const repository = new TransactionalFake(incompatible);
  await assert.rejects(repository.execute({ type: 'console' }), /UNSUPPORTED SAVED VERSION/);
  assert.deepEqual(repository.envelope, incompatible);
  const supported = new TransactionalFake();
  await supported.execute({ type: 'console' });
  supported.envelope.samples[sources.console.id].capabilities = [];
  await assert.rejects(supported.execute({ type: 'start', sampleId: sources.console.id, question: 'structure' }), /INVALID SAVED DATA - SAMPLE SOURCE/);
  assert.equal(supported.envelope.research, null);
});

test('corrupt envelopes abort without replacement or invented ancestry', async () => {
  const valid = new TransactionalFake();
  await readyStudy(valid);
  await valid.execute({ type: 'intent', id: 'OP-1', request: creationRequest(valid.envelope) });
  await valid.execute({ type: 'resolve', id: 'OP-1' });
  const corruptions = [
    value => { value.revision = -1; },
    value => { value.receipts = []; },
    value => { delete value.collection['DEMO-OP-1']; },
    value => { value.operations['OP-1'].specimenId = 'MISSING'; },
    value => { value.operations['OP-1'].status = 'pending'; },
    value => { value.collection['DEMO-OP-1'].ancestry = { kind: 'unknown', parents: [] }; },
    value => { value.collection['DEMO-OP-1'].genome.pale = ['p', 'p']; },
    value => { value.collection['DEMO-OP-1'].expression.samplePaleActivation = true; },
    value => { value.collection['DEMO-OP-1'].portrait.version = 'UNREVIEWED'; },
    value => { value.collection['DEMO-OP-1'].origin.source.evidence = [{ value: 99 }]; },
    value => { value.samples[sources.console.id].status = 'available'; },
    value => { value.research.finding.id = 'INVENTED'; },
    value => { value.research.direction = 'INVENTED'; },
  ];
  for (const corrupt of corruptions) {
    const record = structuredClone(valid.envelope);
    corrupt(record);
    const original = structuredClone(record);
    assert.throws(() => validateEnvelope(record), /INVALID SAVED DATA/);
    const repository = new TransactionalFake(record);
    await assert.rejects(repository.execute({ type: 'console' }), /INVALID SAVED DATA/);
    assert.deepEqual(repository.envelope, original);
  }
  const orphan = emptyEnvelope();
  orphan.operations.OP = { id: 'OP', status: 'committed', specimenId: 'MISSING' };
  assert.throws(() => validateEnvelope(orphan), /INVALID SAVED DATA/);
});

test('direction only changes focus; repeated observation cannot reroll', async () => {
  const results = [];
  for (const question of ['structure', 'variation']) {
    const repository = new TransactionalFake();
    await readyStudy(repository, 'console', question);
    const finding = structuredClone(repository.envelope.research.finding);
    await repository.execute({ type: 'advance' });
    assert.deepEqual(repository.envelope.research.finding, finding);
    await repository.execute({ type: 'intent', id: 'OP-1', request: creationRequest(repository.envelope) });
    await repository.execute({ type: 'resolve', id: 'OP-1' });
    results.push(Object.values(repository.envelope.collection)[0]);
  }
  assert.deepEqual(results[0].genome, results[1].genome);
  assert.deepEqual(results[0].expression, results[1].expression);
  assert.deepEqual(results[0].portrait, results[1].portrait);
});

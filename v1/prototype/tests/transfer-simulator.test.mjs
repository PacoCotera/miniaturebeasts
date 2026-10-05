import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initialProbe, transitionProbe, validateProbe } from '../transfer/probe.mjs';
import { initialLab, transitionLab, validateLab } from '../transfer/lab.mjs';
import { makeManifest, message, canonicalCargo, equalCargo } from '../transfer/manifest.mjs';
import { simulator } from '../transfer/simulator.mjs';
import { firstCargo, secondCargo } from '../transfer/fixtures.mjs';

async function setup(t, options = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'critter-transfer-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const paths = [join(directory, 'probe.json'), join(directory, 'lab.json')];
  const session = simulator(...paths, options);
  await session.probeStore.create(initialProbe('PROBE', firstCargo, ['TRIP_A']));
  await session.labStore.create(initialLab('LAB'));
  return { session, paths, restart: nextOptions => simulator(...paths, nextOptions) };
}

const seal = { type: 'seal', transferId: 'HAUL_A', destination: 'LAB' };

async function converge(session) {
  const probe = await session.probeStore.read();
  if (!probe.transfers.length) await session.act(seal);
  await session.resume();
  await session.drain();
}

async function assertComplete(session) {
  const probe = await session.probeStore.read();
  const lab = await session.labStore.read();
  assert.deepEqual(probe.cargo, { samples: [], resources: [] });
  assert.equal(probe.transfers[0].phase, 'complete');
  assert.equal(lab.receipts.length, 1);
  assert.equal(lab.receipts[0].confirmed, true);
  assert.ok(equalCargo(lab.inventory, firstCargo));
  assert.deepEqual(probe.settings, { label: 'PROBE' });
  assert.deepEqual(probe.history, ['TRIP_A']);
}

test('canonical manifest uses stable ASCII order and rejects malformed cargo', () => {
  const samples = ['a', '_', 'A', '1', 'Z'].map(id => ({ id, historyRef: 'TRIP' }));
  const one = makeManifest('T', 'P', 'L', { samples, resources: [] });
  const two = makeManifest('T', 'P', 'L', { samples: [...samples].reverse(), resources: [] });
  assert.equal(one.digest, two.digest);
  assert.deepEqual(one.cargo.samples.map(item => item.id), ['1', 'A', 'Z', '_', 'a']);
  for (const quantity of [0, -1, 0.5, Number.MAX_SAFE_INTEGER + 1, Infinity, '2']) {
    assert.throws(() => canonicalCargo({ samples: [], resources: [{ id: 'R', historyRef: 'H', quantity }] }));
  }
  assert.throws(() => canonicalCargo({ samples: [samples[0], samples[0]], resources: [] }), /Duplicate/);
  assert.throws(() => makeManifest('T', 'P', 'L', { samples: [{ id: '../bad', historyRef: 'H' }], resources: [] }));
});

test('whole haul uses five independent commits and unlocks only after saved completion', async t => {
  const { session } = await setup(t);
  await session.act(seal);
  for (let step = 0; step < 3; step++) {
    await assert.rejects(session.act({ type: 'gather', cargo: secondCargo, history: ['TRIP_B'] }), /locked/);
    await assert.rejects(session.act({ ...seal, transferId: 'OTHER', destination: 'OTHER_LAB' }), /locked/);
    for (const type of ['cancel', 'spend', 'retarget']) await assert.rejects(session.act({ type }));
    await session.deliver();
  }
  assert.equal((await session.probeStore.read()).transfers[0].phase, 'cleared');
  await assert.rejects(session.act({ type: 'gather', cargo: secondCargo, history: ['TRIP_B'] }), /locked/);
  await session.deliver();
  await assertComplete(session);
  assert.equal((await session.probeStore.read()).revision, 3);
  assert.equal((await session.labStore.read()).revision, 2);
});

test('before/after every write boundary recovers from separately reopened committed snapshots', async t => {
  for (const stage of ['before-write', 'after-write', 'before-commit', 'after-commit']) {
    for (let commit = 1; commit <= 5; commit++) {
      await t.test(`${stage} commit ${commit}`, async t => {
        let attempt = 0;
        const fault = async point => {
          if (point === stage && ++attempt === commit) throw new Error('Injected ENOSPC/write interruption');
        };
        const { session, restart } = await setup(t, { probe: { fault }, lab: { fault } });
        await assert.rejects(async () => { await session.act(seal); await session.drain(); }, /Injected/);
        assert.equal(session.queued().length, 0, 'failed transaction emits no new message');
        const recovered = restart();
        await converge(recovered);
        await assertComplete(recovered);
      });
    }
  }
});

test('every message boundary can be interrupted; losing the queue never loses durable progress', async t => {
  for (const type of ['offer', 'receipt', 'cleared', 'completion']) {
    for (const boundary of ['before-send', 'after-send', 'before-delivery', 'after-delivery']) {
      await t.test(`${type} ${boundary}`, async t => {
        let interrupted = false;
        const transportFault = async (point, incoming) => {
          if (!interrupted && point === boundary && incoming.type === type) {
            interrupted = true;
            throw new Error('Transport interrupted');
          }
        };
        const { session, restart } = await setup(t, { transportFault });
        await assert.rejects(async () => { await session.act(seal); await session.drain(); }, /Transport/);
        const recovered = restart();
        assert.deepEqual(recovered.queued(), []);
        await converge(recovered);
        await assertComplete(recovered);
      });
    }
  }
});

test('drop and duplicate each message kind, then reorder delayed deliveries and converge', async t => {
  for (let index = 0; index < 4; index++) {
    await t.test(`duplicate kind ${index}`, async t => {
      const { session } = await setup(t);
      await session.act(seal);
      for (let step = 0; step < index; step++) await session.deliver();
      session.duplicate();
      await session.deliver(1);
      await session.drain();
      await assertComplete(session);
    });
    await t.test(`drop kind ${index}`, async t => {
      const { session } = await setup(t);
      await session.act(seal);
      for (let step = 0; step < index; step++) await session.deliver();
      session.drop();
      await session.resume();
      session.duplicate();
      await session.deliver(session.queued().length - 1);
      await session.drain();
      await assertComplete(session);
    });
  }
});

test('concurrent duplicate/conflicting offers serialize across handles to one lab file', async t => {
  const { session, restart } = await setup(t);
  await session.act(seal);
  const offer = session.queued()[0];
  const another = restart();
  const deliveries = Array.from({ length: 12 }, (_, index) => (index % 2 ? session : another).labStore.transact(state => transitionLab(state, { type: 'receive', message: offer })));
  await Promise.all(deliveries);
  assert.equal((await session.labStore.read()).revision, 1);
  const conflicting = message('offer', makeManifest('OTHER', 'PROBE', 'LAB', firstCargo));
  const unique = message('offer', makeManifest('HAUL_B', 'PROBE', 'LAB', secondCargo));
  const results = await Promise.allSettled([conflicting, unique].map(incoming => another.labStore.transact(state => transitionLab(state, { type: 'receive', message: incoming }))));
  assert.equal(results[0].status, 'rejected');
  assert.equal(results[1].status, 'fulfilled');
  assert.equal((await session.labStore.read()).inventory.samples.length, 3);
});

test('old messages cannot clear or relock a later haul; settings and unrelated inventory survive', async t => {
  const { session, restart } = await setup(t);
  await session.act(seal);
  const offer = session.queued()[0];
  const old = [offer, ...['receipt', 'cleared', 'completion'].map(type => message(type, offer.manifest))];
  await session.drain();
  await session.act({ type: 'gather', cargo: secondCargo, history: ['TRIP_B'] });
  await session.act({ type: 'seal', transferId: 'HAUL_B', destination: 'LAB' });
  const before = await session.probeStore.read();
  for (const incoming of old.reverse()) session.enqueue(incoming);
  // Deliver only old messages and their replies, leaving the new offer delayed.
  while (session.queued().length > 1) await session.deliver(1);
  assert.deepEqual(await session.probeStore.read(), before);
  const recovered = restart();
  await recovered.resume();
  await recovered.drain();
  const probe = await recovered.probeStore.read();
  const lab = await recovered.labStore.read();
  assert.deepEqual(probe.history, ['TRIP_A', 'TRIP_B']);
  assert.deepEqual(probe.settings, { label: 'PROBE' });
  assert.equal(lab.receipts.length, 2);
  assert.equal(lab.inventory.samples.length, 3);
  assert.equal(lab.inventory.resources.reduce((sum, item) => sum + item.quantity, 0), 5);
  assert.ok(probe.transfers.every(item => item.phase === 'complete'));
});

test('contradictory peer, payload and phase messages reject without mutating saved state', async t => {
  const { session, paths } = await setup(t);
  await session.act(seal);
  const offer = session.queued()[0];
  const cases = [
    { ...message('receipt', offer.manifest), source: 'OTHER' },
    { ...message('receipt', offer.manifest), destination: 'OTHER' },
    { ...message('receipt', offer.manifest), transferId: 'OTHER' },
    { ...message('receipt', offer.manifest), digest: 'f'.repeat(64) },
    { ...message('receipt', offer.manifest), version: 2 },
    message('completion', offer.manifest),
  ];
  const before = await readFile(paths[0], 'utf8');
  for (const incoming of cases) {
    await assert.rejects(session.probeStore.transact(state => transitionProbe(state, { type: 'receive', message: incoming })));
    assert.equal(await readFile(paths[0], 'utf8'), before);
  }
  await assert.rejects(session.labStore.transact(state => transitionLab(state, { type: 'receive', message: message('cleared', offer.manifest) })));
  await session.deliver();
  const changed = message('offer', makeManifest('HAUL_A', 'PROBE', 'LAB', secondCargo));
  await assert.rejects(session.labStore.transact(state => transitionLab(state, { type: 'receive', message: changed })), /conflict/);
  await session.drain();
  await assertComplete(session);
});

test('full storage and corrupt saved envelopes preserve bytes, then recover after storage returns', async t => {
  const { session, restart, paths } = await setup(t);
  await session.act(seal);
  const before = await readFile(paths[1]);
  const full = restart({ lab: { maxBytes: before.length + 10 } });
  await full.resume();
  await assert.rejects(full.deliver(), /capacity/);
  assert.deepEqual(await readFile(paths[1]), before);
  assert.equal(full.queued().length, 0);
  const recovered = restart();
  await converge(recovered);
  await assertComplete(recovered);
  for (const invalid of ['{broken', JSON.stringify({ version: 999 }), JSON.stringify({ ...(await recovered.probeStore.read()), cargo: firstCargo })]) {
    await writeFile(paths[0], invalid);
    await assert.rejects(restart().probeStore.read());
    assert.equal(await readFile(paths[0], 'utf8'), invalid);
  }
});

test('invalid persisted cross-record relationships are rejected, not repaired silently', () => {
  const probe = initialProbe('PROBE', firstCargo, ['TRIP_A']);
  const sealed = transitionProbe(probe, seal).state;
  const broken = structuredClone(sealed);
  broken.cargo.samples.pop();
  assert.throws(() => validateProbe(broken), /mismatch/);
  const forged = structuredClone(sealed);
  forged.history = [];
  assert.throws(() => validateProbe(forged), /history/);
  const offer = message('offer', sealed.transfers[0].manifest);
  const lab = transitionLab(initialLab('LAB'), { type: 'receive', message: offer }).state;
  const missingInventory = structuredClone(lab);
  missingInventory.inventory.resources = [];
  assert.throws(() => validateLab(missingInventory), /mismatch/);
  const missingReceipt = structuredClone(lab);
  missingReceipt.receipts = [];
  assert.throws(() => validateLab(missingReceipt), /mismatch/);
  const wrongPeer = structuredClone(lab);
  wrongPeer.id = 'OTHER_LAB';
  assert.throws(() => validateLab(wrongPeer), /receipt/);
});

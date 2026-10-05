import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, mkdir, unlink, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { assessRecord } from '../compatibility/record.mjs';
import { readSavedRecord, copySavedRecord, readPortraits, sha256 } from '../compatibility/files.mjs';

const capabilities = { envelopes: ['saved-specimen-fixture-1'], rules: ['draft-genetics-1'], content: ['founder-demo-1'], outcome: ['authored-founder-1'] };
const fixture = name => new URL(`../compatibility/fixtures/${name}.json`, import.meta.url);
const hashes = {
  color: 'd1e5307e8c0271ab83d50e1f74279b41b37d8183d58de86c5cc6d3901e85df42',
  mono: 'c261d2bb09cc5cd514200de9956fc0a07ce18d11b66809aeb3bc7075efc73a81',
};
async function temporary(t) {
  const directory = await mkdtemp(join(tmpdir(), 'critter-compatibility-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

test('save/reopen preserves exact founder bytes, pinned saved facts and retained portrait hashes', async t => {
  const directory = await temporary(t);
  const original = await readSavedRecord(fixture('founder'), capabilities);
  const destination = join(directory, 'founder.json');
  await copySavedRecord(original, destination);
  await assert.rejects(copySavedRecord(original, destination), /EEXIST/);
  const reopened = await readSavedRecord(destination, capabilities);
  assert.deepEqual(reopened.rawBytes, original.rawBytes);
  assert.deepEqual(reopened.assessment, original.assessment);
  const saved = reopened.assessment.saved;
  assert.equal(saved.id, 'paper:individual:001');
  assert.deepEqual(saved.classification, { familyId: 'fixture-family-a', familyLabel: 'Family A', bodyPlanId: 'draft:frilled-quadruped:1' });
  assert.deepEqual(saved.ancestry, { kind: 'none', parents: [] });
  assert.equal(saved.origin.sourceRef, 'investigation-console-01');
  assert.equal(saved.origin.studyRef, 'paper:study:001');
  assert.equal(saved.origin.creationRef, 'paper:create:001');
  assert.equal(saved.genome.revision, 'paper:genome:original:1');
  assert.deepEqual(saved.genome.loci, { crown: ['C', 'c'], eyes: ['R', 'r'], pale: ['P', 'p'] });
  assert.deepEqual(saved.expression.expressed, ['Crown frill', 'Ringed eyes']);
  assert.deepEqual(saved.expression.carried, ['Pale markings']);
  assert.equal(saved.expression.samplePaleActivation, false);
  assert.equal(saved.expression.context, 'authored-founder-no-sample-activation');
  assert.deepEqual(saved.versions, { rules: 'draft-genetics-1', content: 'founder-demo-1', outcome: 'authored-founder-1' });
  const portraits = await readPortraits(reopened.assessment);
  for (const treatment of ['color', 'mono']) {
    assert.equal(portraits[treatment].available, true);
    assert.equal(sha256(portraits[treatment].bytes), hashes[treatment]);
    assert.equal(portraits[treatment].bytes.readUInt32BE(16), 64);
    assert.equal(portraits[treatment].bytes.readUInt32BE(20), 64);
  }
});

test('shared genome and art never merge siblings; unknown ancestry remains distinct from parentless', async t => {
  const directory = await temporary(t);
  const records = new Map();
  for (const name of ['founder', 'sibling-101', 'sibling-102', 'unknown-ancestry']) {
    const original = await readSavedRecord(fixture(name), capabilities);
    await copySavedRecord(original, join(directory, name + '.json'));
    const reopened = await readSavedRecord(join(directory, name + '.json'), capabilities);
    records.set(reopened.assessment.saved.id, reopened.assessment.saved);
  }
  assert.equal(records.size, 4);
  const first = records.get('paper:sibling:101');
  const second = records.get('paper:sibling:102');
  assert.deepEqual(first.genome, second.genome);
  assert.deepEqual(first.art, second.art);
  assert.notEqual(first.birthEvent, second.birthEvent);
  assert.notDeepEqual(first.history, second.history);
  assert.deepEqual(first.ancestry, second.ancestry);
  assert.equal(first.ancestry.kind, 'known');
  assert.deepEqual(first.ancestry.parents[1].genome.loci.eyes, ['r', 'r']);
  assert.equal(records.get('paper:imported:201').ancestry.kind, 'unknown');
  assert.equal(records.get('paper:individual:001').ancestry.kind, 'none');
});

test('consumer updates, unsupported content and unknown/malformed envelopes preserve original bytes', async t => {
  const directory = await temporary(t);
  const founder = JSON.parse(await readFile(fixture('founder'), 'utf8'));
  const updatedConsumer = { ...capabilities, consumerRelease: 'future-99', defaults: { crown: ['c', 'c'], newTrait: ['X', 'X'] } };
  assert.deepEqual(assessRecord(founder, updatedConsumer).saved, founder.specimen);
  const futureContent = structuredClone(founder);
  futureContent.specimen.versions.content = 'founder-demo-2';
  futureContent.specimen.genome.loci.futureTrait = ['X', 'x'];
  const futureEnvelope = { ...futureContent, format: 'saved-specimen-fixture-2', futureEnvelopeFacts: { retain: true } };
  const malformed = structuredClone(founder);
  delete malformed.specimen.ancestry;
  const cases = [
    ['unsupported-content', Buffer.from(' \n' + JSON.stringify(futureContent, null, 4) + '\n\n'), 'historical'],
    ['unknown-envelope', Buffer.from(JSON.stringify(futureEnvelope)), 'unavailable'],
    ['malformed-known', Buffer.from(JSON.stringify(malformed)), 'unavailable'],
    ['invalid-json', Buffer.from([0xff, 0x7b, 0x00]), 'unavailable'],
  ];
  for (const [name, raw, expected] of cases) {
    const source = join(directory, name + '.json');
    await writeFile(source, raw);
    const result = await readSavedRecord(source, capabilities);
    assert.equal(result.assessment.availability, expected);
    assert.deepEqual(result.assessment.actions, []);
    if (expected === 'historical') {
      assert.equal(result.assessment.saved.id, founder.specimen.id);
      assert.deepEqual(result.assessment.saved.genome.loci.futureTrait, ['X', 'x']);
      assert.deepEqual(result.assessment.saved.expression, founder.specimen.expression);
    } else assert.equal(result.assessment.saved, null);
    const copy = join(directory, name + '-copy.json');
    await copySavedRecord(result, copy);
    assert.deepEqual((await readSavedRecord(copy, capabilities)).rawBytes, raw);
    assert.deepEqual(await readFile(source), raw);
  }
  assert.equal(assessRecord(founder, { ...capabilities, envelopes: [] }).availability, 'unavailable');
});

test('missing/corrupt portrait retains identity and only original retained bytes restore the reference', async t => {
  const directory = await temporary(t);
  const assets = join(directory, 'assets');
  await mkdir(assets);
  const result = await readSavedRecord(fixture('founder'), capabilities);
  const original = await readPortraits(result.assessment);
  for (const treatment of ['color', 'mono']) await writeFile(join(assets, `critter-${treatment}.png`), original[treatment].bytes);
  await unlink(join(assets, 'critter-color.png'));
  let loaded = await readPortraits(result.assessment, assets);
  assert.equal(loaded.color.reason, 'Portrait unavailable');
  assert.equal(loaded.mono.available, true);
  await writeFile(join(assets, 'critter-color.png'), original.mono.bytes);
  loaded = await readPortraits(result.assessment, assets);
  assert.equal(loaded.color.available, false, 'a verified alternate treatment is not silently substituted');
  assert.equal(result.assessment.saved.id, 'paper:individual:001');
  await writeFile(join(assets, 'critter-color.png'), original.color.bytes);
  loaded = await readPortraits(result.assessment, assets);
  assert.deepEqual(loaded.color.bytes, original.color.bytes);
  const hostile = structuredClone(result.assessment);
  hostile.saved.art.color.id = '../../outside.png';
  assert.equal((await readPortraits(hostile, assets)).color.available, false);
  assert.deepEqual(await readFile(fixture('founder')), result.rawBytes);
});

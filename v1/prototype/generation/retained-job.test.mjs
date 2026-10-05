import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { resolveRetainedJob, replayRetainedJob } from './retained-job.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const CLI = fileURLToPath(new URL('./retained-job.mjs', import.meta.url));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

// Synthetic identities using the actual native revealed projection schema.
// The connected native journey separately supplies a real accepted identity.
function request(requestId = 'portrait-proof-1', marked = false) {
  return {
    request_id: requestId,
    resident_snapshot: {
      count: 1, current: true, visit_available: true, world_revision: 42, updated_at: 123456,
      selected: {
        id: 'individual-proof-1', source_sample_id: 'sample-proof-1',
        art_id: `design/v1-pip/pip-${marked ? 'marked' : 'carried'}.png`,
        art_version: 'pip-playtest-art-v1',
        original_art_sha256: marked
          ? '39336d1bf4f9cf540d1d5a1ed47a42ccc72fff02376eb98e7b88cf51d3859190'
          : '38b0fa7fc24ffea47cb128fdcaf46f701a2396bd3bfcbb81e3d86f962f262534',
        appearance_descriptor: `pip-reference-${marked ? 'marked' : 'carried'}`,
        reference_context: 'pip:adult-rested-firm-ground-mild-v1',
        mapping_version: 'pip-discovery-map-v1', original_art_version: 'pip-playtest-art-v1', visits: 2,
      },
    },
    claim_ids: [
      `appearance:pip-reference-${marked ? 'marked' : 'carried'}`,
      'reference:pip-adult-rested-firm-ground-mild-v1',
    ],
  };
}
async function workspace(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'critter-retained-job-'));
  t.after(async () => {
    const absolute = path.resolve(directory);
    assert.equal(path.dirname(absolute), path.resolve(os.tmpdir()));
    assert.ok(path.basename(absolute).startsWith('critter-retained-job-'));
    await fs.rm(absolute, { recursive: true, force: true });
  });
  return directory;
}
async function savedBytes(directory) {
  return Promise.all(['portrait.png', 'description.txt', 'result.json']
    .map(filename => fs.readFile(path.join(directory, filename))));
}
const rejectsCode = (operation, code) => assert.rejects(operation, error => error.code === code);

test('both permitted portraits retain exact original bytes, controlled text and provenance', async t => {
  const output = await workspace(t);
  for (const marked of [false, true]) {
    const input = request(marked ? 'marked-proof' : '../../carried-proof', marked);
    const accepted = await resolveRetainedJob(input, output);
    assert.equal(accepted.reused, false);
    assert.equal(path.dirname(accepted.job_dir), output);
    assert.equal(path.basename(accepted.job_dir), sha256(input.request_id));
    const [portrait, description] = await savedBytes(accepted.job_dir);
    assert.deepEqual(portrait, await fs.readFile(path.join(ROOT, input.resident_snapshot.selected.art_id)));
    assert.equal(sha256(portrait), input.resident_snapshot.selected.original_art_sha256);
    assert.equal(description.toString(), `${accepted.result.description}\n`);
    assert.match(accepted.result.description, marked ? /Pale body markings are visible/ : /Plain coat/);
    assert.match(accepted.result.description, /healthy\/rested adult on firm ground in mild conditions/);
    assert.doesNotMatch(accepted.result.description, /walking|movement|energy|visit/i);
    assert.equal(accepted.result.input.resident_snapshot.selected.id, 'individual-proof-1');
    assert.equal(accepted.result.provenance.provider, 'Gemini');
    assert.equal(accepted.result.provenance.model_call, false);
    assert.deepEqual(accepted.result.provenance.crop, marked ? [695, 144, 956, 433] : [318, 144, 579, 433]);
    assert.deepEqual(await replayRetainedJob(accepted.job_dir), accepted.result);
  }
});

test('distinct native identities keep distinct fingerprints when their original portrait agrees', async t => {
  const output = await workspace(t);
  const first = await resolveRetainedJob(request('resident-1'), output);
  const secondInput = request('resident-2');
  secondInput.resident_snapshot.selected.id = 'individual-proof-2';
  secondInput.resident_snapshot.selected.source_sample_id = 'sample-proof-2';
  secondInput.resident_snapshot.selected.mapping_version = 'pip-proof-map-v1';
  const second = await resolveRetainedJob(secondInput, output);
  assert.notEqual(first.result.input_sha256, second.result.input_sha256);
  assert.deepEqual((await savedBytes(first.job_dir))[0], (await savedBytes(second.job_dir))[0]);
  assert.equal(second.result.input.resident_snapshot.selected.id, 'individual-proof-2');
});

test('duplicate and mutable freshness/visit changes return the exact accepted result without writes', async t => {
  const output = await workspace(t);
  const accepted = await resolveRetainedJob(request(), output);
  const before = await savedBytes(accepted.job_dir);
  const metadata = await fs.stat(path.join(accepted.job_dir, 'result.json'));
  const changed = request();
  Object.assign(changed.resident_snapshot, {
    current: false, visit_available: false, world_revision: 99, updated_at: 999999, count: 2,
  });
  changed.resident_snapshot.selected.visits = 6;
  changed.claim_ids.reverse();
  const reused = await resolveRetainedJob(changed, output);
  assert.equal(reused.reused, true);
  assert.deepEqual(reused.result, accepted.result);
  assert.deepEqual(await savedBytes(accepted.job_dir), before);
  assert.equal((await fs.stat(path.join(accepted.job_dir, 'result.json'))).mtimeMs, metadata.mtimeMs);
  assert.deepEqual(Object.keys(reused.result.input.resident_snapshot), ['selected']);
  assert.equal('visits' in reused.result.input.resident_snapshot.selected, false);
});

test('same request ID rejects changed immutable identity or another valid portrait', async t => {
  const output = await workspace(t);
  const accepted = await resolveRetainedJob(request(), output);
  const before = await savedBytes(accepted.job_dir);
  for (const field of ['id', 'source_sample_id', 'mapping_version']) {
    const changed = request();
    changed.resident_snapshot.selected[field] = field === 'mapping_version' ? 'pip-proof-map-v1' : `${field}-changed`;
    await rejectsCode(resolveRetainedJob(changed, output), 'INPUT_CONFLICT');
  }
  await rejectsCode(resolveRetainedJob(request('portrait-proof-1', true), output), 'INPUT_CONFLICT');
  assert.deepEqual(await savedBytes(accepted.job_dir), before);
});

test('unsupported claims, hidden fields, prose, hashes, contexts and paths are rejected before output', async t => {
  const directory = await workspace(t);
  const output = path.join(directory, 'uncreated-output');
  const changes = [
    ['UNSUPPORTED_CLAIM', input => input.claim_ids.push('movement:efficient')],
    ['UNSUPPORTED_CLAIM', input => input.claim_ids[0] = 'appearance:pip-reference-marked'],
    ['UNSUPPORTED_CLAIM', input => input.claim_ids[1] = input.claim_ids[0]],
    ['INVALID_REQUEST', input => input.description = 'Invent a fast happy Pip.'],
    ['INVALID_REQUEST', input => input.resident_snapshot.selected.genome = 'hidden'],
    ['INVALID_REQUEST', input => input.resident_snapshot.full_support = []],
    ['INVALID_REQUEST', input => input.resident_snapshot.count = { hidden: true }],
    ['INVALID_REQUEST', input => input.resident_snapshot.selected = null],
    ['UNSUPPORTED_PORTRAIT', input => input.resident_snapshot.selected.art_id = '../../private.png'],
    ['UNSUPPORTED_PORTRAIT', input => input.resident_snapshot.selected.original_art_sha256 = '0'.repeat(64)],
    ['UNSUPPORTED_PORTRAIT', input => input.resident_snapshot.selected.reference_context = 'pip:running-on-water'],
    ['UNSUPPORTED_PORTRAIT', input => input.resident_snapshot.selected.mapping_version = 'unknown-map'],
    ['UNSUPPORTED_PORTRAIT', input => input.resident_snapshot.selected.original_art_version = 'future-art'],
    ['UNSUPPORTED_PORTRAIT', input => input.resident_snapshot.selected.appearance_descriptor = '__proto__'],
  ];
  for (const [code, change] of changes) {
    const input = request();
    change(input);
    await rejectsCode(resolveRetainedJob(input, output), code);
  }
  await assert.rejects(fs.lstat(output), { code: 'ENOENT' });
});

test('offline replay and duplicate resolution need no original source or manifest', async t => {
  const output = await workspace(t);
  const accepted = await resolveRetainedJob(request(), output);
  const before = await savedBytes(accepted.job_dir);
  const readFile = fs.readFile.bind(fs);
  let sourceReads = 0;
  t.mock.method(fs, 'readFile', async (filename, ...options) => {
    if (path.resolve(filename).startsWith(path.join(ROOT, 'design', 'v1-pip') + path.sep)) {
      sourceReads++;
      throw Object.assign(new Error('Original source unavailable offline'), { code: 'ENOENT' });
    }
    return readFile(filename, ...options);
  });
  assert.deepEqual(await replayRetainedJob(accepted.job_dir), accepted.result);
  assert.equal((await resolveRetainedJob(request(), output)).reused, true);
  assert.deepEqual(await savedBytes(accepted.job_dir), before);
  assert.equal(sourceReads, 0);
  await rejectsCode(resolveRetainedJob(request('new-offline-request'), output), 'SOURCE_UNAVAILABLE');
  assert.equal(sourceReads, 1);
});

test('missing or corrupt saved outputs fail honestly and are never silently regenerated', async t => {
  const output = await workspace(t);
  for (const filename of ['portrait.png', 'description.txt', 'result.json']) {
    const input = request(`missing-${filename}`);
    const accepted = await resolveRetainedJob(input, output);
    await fs.unlink(path.join(accepted.job_dir, filename));
    await rejectsCode(replayRetainedJob(accepted.job_dir), 'MISSING_ARTIFACT');
    await rejectsCode(resolveRetainedJob(input, output), 'MISSING_ARTIFACT');
    await assert.rejects(fs.lstat(path.join(accepted.job_dir, filename)), { code: 'ENOENT' });
  }
  for (const filename of ['portrait.png', 'description.txt', 'result.json']) {
    const input = request(`corrupt-${filename}`);
    const accepted = await resolveRetainedJob(input, output);
    const artifact = path.join(accepted.job_dir, filename);
    const corrupted = Buffer.from(await fs.readFile(artifact));
    corrupted[0] ^= 1;
    await fs.writeFile(artifact, corrupted);
    await rejectsCode(replayRetainedJob(accepted.job_dir), 'CORRUPT_JOB');
    await rejectsCode(resolveRetainedJob(input, output), 'CORRUPT_JOB');
    assert.deepEqual(await fs.readFile(artifact), corrupted);
  }
});

test('CLI resolve/replay returns retained results and reports a conflicting request with failure status', async t => {
  const directory = await workspace(t);
  const inputPath = path.join(directory, 'request.json');
  await fs.writeFile(inputPath, JSON.stringify(request('cli-proof')));
  const run = (...args) => spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });
  const resolved = run('resolve', inputPath, path.join(directory, 'jobs'));
  assert.equal(resolved.status, 0, resolved.stderr);
  const accepted = JSON.parse(resolved.stdout);
  const replayed = run('replay', accepted.job_dir);
  assert.equal(replayed.status, 0, replayed.stderr);
  assert.deepEqual(JSON.parse(replayed.stdout).result, accepted.result);
  const changed = request('cli-proof');
  changed.resident_snapshot.selected.id = 'different-native-identity';
  await fs.writeFile(inputPath, JSON.stringify(changed));
  const refused = run('resolve', inputPath, path.join(directory, 'jobs'));
  assert.equal(refused.status, 1);
  assert.equal(JSON.parse(refused.stderr).code, 'INPUT_CONFLICT');
});

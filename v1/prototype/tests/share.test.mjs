import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { get } from 'node:http';
import jsQR from 'jsqr';
import { createInitialState, developSample, createBreeding, hatch } from '../store.mjs';
import { publicSnapshot, publishRecord, readPublicRecord } from '../share.mjs';
import { createPrototypeServer } from '../server.mjs';

function fixture() {
  const initial = developSample(createInitialState());
  const state = hatch(createBreeding(initial, { eventId: 'birth-1', seed: 'sharing', sampleId: initial.samples[0].id }), 'birth-1');
  return { specimen: state.specimens[0], birthEvent: state.events[0] };
}
test('public fields only; inconsistent birth, injected text and IDs rejected', () => {
  const input = fixture();
  input.specimen.owner = 'secret'; input.specimen.points = 999; input.specimen.art = '<svg onload="evil"/>';
  input.birthEvent.request.parentSnapshots[0].private = 'secret';
  const record = publicSnapshot(input);
  assert.equal(record.specimen.owner, undefined); assert.equal(record.specimen.points, undefined); assert.equal(record.specimen.art, undefined);
  assert.equal(JSON.stringify(record).includes('secret'), false);
  for (const mutate of [
    x => { x.specimen.expression.pale = !x.specimen.expression.pale; },
    x => { x.specimen.name = '<script>alert(1)</script>'; },
    x => { x.specimen.id = '../file'; },
    x => { x.specimen.parentIds = ['fake']; },
    x => { x.birthEvent.request.randomVersion = 'future'; },
    x => { x.birthEvent.sampleSnapshot.effectVersion = 'reward-me'; },
  ]) { const copy = structuredClone(input); mutate(copy); assert.throws(() => publicSnapshot(copy)); }
  assert.throws(() => publicSnapshot(null));
});

test('concurrent copied records publish once, remain stable and reject conflicting identity', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'critter-share-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const input = fixture();
  const results = await Promise.all(Array.from({ length: 5 }, () => publishRecord(directory, input)));
  assert.equal(results.filter(r => r.created).length, 1);
  assert.equal((await readdir(directory)).length, 1);
  assert.deepEqual(await readPublicRecord(directory, input.specimen.id), results[0].record);
  input.specimen.name = 'Conflicting name';
  await assert.rejects(publishRecord(directory, input), error => error.status === 409);
  await assert.rejects(readPublicRecord(directory, '../../package.json'), /Invalid/);
});

// Rasterize the actual encoder's SVG horizontal strokes, then use an independent decoder.
function decodeSvg(svg) {
  const modules = Number(svg.match(/viewBox="0 0 (\d+) /)[1]), scale = 6, width = modules * scale;
  const pixels = new Uint8ClampedArray(width * width * 4).fill(255);
  const path = svg.match(/stroke="#000000" d="([^"]+)"/)[1];
  let x = 0, y = 0;
  for (const [, command, values] of path.matchAll(/([Mmh])([\d. ]+)/g)) {
    const nums = values.trim().split(/\s+/).map(Number);
    if (command === 'M') [x, y] = nums;
    else if (command === 'm') { x += nums[0]; y += nums[1]; }
    else {
      for (let row = Math.floor(y) * scale; row < (Math.floor(y) + 1) * scale; row++) for (let col = x * scale; col < (x + nums[0]) * scale; col++) {
        const index = (row * width + col) * 4; pixels[index] = pixels[index + 1] = pixels[index + 2] = 0;
      }
      x += nums[0];
    }
  }
  return jsQR(pixels, width, width)?.data;
}

test('HTTP publish/lookup and actual SVG QR decode; cross-site/malformed writes and private files blocked', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'critter-http-'));
  const server = createPrototypeServer({ dataDirectory: directory });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); await rm(directory, { recursive: true, force: true }); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const post = (body, headers = {}) => fetch(`${origin}/api/specimens`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });
  const input = fixture();
  const published = await post(input); assert.equal(published.status, 201);
  const result = await published.json();
  assert.equal((await post(input)).status, 200);
  assert.deepEqual(await (await fetch(`${origin}/api/specimens/${encodeURIComponent(input.specimen.id)}`)).json(), result);
  const svg = await (await fetch(origin + result.qrUrl)).text();
  assert.equal(decodeSvg(svg), result.url);
  assert.equal(new URL(result.url).searchParams.get('specimen'), input.specimen.id);
  assert.equal((await post(input, { Origin: 'https://evil.test' })).status, 403);
  assert.equal((await post(input, { Origin: '' })).status, 403);
  assert.equal((await post(input, { 'Content-Type': 'text/plain' })).status, 415);
  assert.equal((await post('{')).status, 400);
  assert.equal((await post(' '.repeat(25000))).status, 413);
  assert.equal((await fetch(origin + '/.data/anything.json')).status, 404);
  assert.equal((await fetch(origin + '/api/rewards', { method: 'POST' })).status, 405);
  const badHostStatus = await new Promise((resolve, reject) => get(origin + '/', { headers: { Host: 'evil.test' } }, response => { response.resume(); resolve(response.statusCode); }).on('error', reject));
  assert.equal(badHostStatus, 403);
});

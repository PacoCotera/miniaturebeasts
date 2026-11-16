// The scheduler (src/gen7/slices.mjs, realm-time-spec-1 T3) and the realm store (src/gen7/realm-blob.mjs, T4): slices are pure, so places made in two orders, or with a pause and a resume, are the same tiles;
// a front request is served before the next background slice; a stored realm has the digest of a built one.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { realm7, REALM_REV } from '../src/gen7/region.mjs';
import { forgetPlaces } from '../src/gen7/place.mjs';
import { createScheduler } from '../src/gen7/slices.mjs';
import { realmDigest, packRealm, unpackRealm, blobInfo } from '../src/gen7/realm-blob.mjs';

const SEED = 7, R = realm7(SEED), G = R.regions[12], MW = 16, MH = 20;
const start = [2 * MW + (G.spawns[0] % MW), 2 * MH + ((G.spawns[0] / MW) | 0)];
const N = 13;   // slices of the plan made in each run: the start place and its 8 neighbours, then sectors of the start region

function fresh() { forgetPlaces(SEED); return createScheduler(SEED, start, { now: () => performance.now() }); }
function runPlan(s, n) { s.front('place', start[0], start[1]); for (let i = 0; i < n; i++) if (!s.step()) break; return s; }
const order = s => s.log.map(r => r.kind[0] + ':' + r.X + ',' + r.Y);
const asObject = m => Object.fromEntries([...m.entries()].sort());

test('places and sectors made in two different orders, and with a pause and a resume, have equal digests', () => {
  const a = runPlan(fresh(), N), keys = order(a), want = asObject(a.digests);
  assert.equal(keys.length, N);
  const b = fresh();   // the same slices, asked in the reverse order, each at the front
  for (const k of keys.slice().reverse()) { const [c, xy] = k.split(':'), [X, Y] = xy.split(',').map(Number); b.front(c === 'p' ? 'place' : 'sector', X, Y); }
  for (let i = 0; i < keys.length; i++) b.step();
  assert.deepEqual(order(b), keys.slice().reverse());
  assert.deepEqual(asObject(b.digests), want);
  const c = fresh(); c.front('place', start[0], start[1]);   // paused after three slices, then resumed
  for (let i = 0; i < 3; i++) c.step();
  c.pause(); assert.equal(c.step(), null, 'a paused scheduler makes no slice'); assert.equal(c.run(1e9).length, 0);
  assert.equal(c.made, 3); c.resume();
  for (let i = 0; i < N - 3; i++) c.step();
  assert.deepEqual(asObject(c.digests), want);
  assert.deepEqual(order(c), keys);
});

test('a front request is served before the next background slice, and a slice made is not made again', () => {
  const s = fresh(); runPlan(s, 4);
  const far = [start[0] + 5, start[1] + 3];
  assert.equal(s.has('place', far[0], far[1]), false);
  s.front('place', far[0], far[1]);
  const r = s.step(); assert.deepEqual([r.kind, r.X, r.Y, r.front], ['place', far[0], far[1], true]);
  const n = s.made; s.front('place', far[0], far[1]); const r2 = s.step();   // made already: the plan goes on
  assert.equal(r2.front, false); assert.equal(s.made, n + 1);
});

test('the plan starts with the start place and its 8 neighbours, then the start region\'s sectors', () => {
  const s = fresh(); runPlan(s, 12);   // the slice times on the small engine are tools/slices-time.mjs's
  assert.deepEqual(s.log.slice(0, 9).map(r => r.kind), Array(9).fill('place'));
  assert.deepEqual(s.log.slice(9).map(r => r.kind), ['sector', 'sector', 'sector']);
  for (const r of s.log.slice(0, 9)) assert.ok(Math.max(Math.abs(r.X - start[0]), Math.abs(r.Y - start[1])) <= 1);
  for (const r of s.log.filter(r => r.kind === 'sector')) assert.ok(r.ms < 300, 'a sector slice took ' + r.ms);
});

test('a stored realm loads with the digest of the built one', () => {
  const built = realmDigest(R), blob = packRealm(R), info = blobInfo(blob), back = unpackRealm(blob, { digest: built });
  assert.equal(info.digest, built); assert.equal(info.seed, SEED); assert.equal(info.rev, REALM_REV);
  assert.equal(realmDigest(back), built);
  assert.equal(back.realm.stairs.length, R.realm.stairs.length);
  assert.deepEqual(Array.from(back.realm.e0.slice(0, 50)), Array.from(R.realm.e0.slice(0, 50)));
  assert.throws(() => unpackRealm(blob, { digest: (built + 1) >>> 0 }), /digest/);
  const damaged = blob.slice(); damaged[damaged.length - 9] ^= 1;
  assert.throws(() => unpackRealm(damaged), /digest/);
});

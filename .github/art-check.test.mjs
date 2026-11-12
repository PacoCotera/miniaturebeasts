// Tests for .github/art-check.mjs: the ratchet passes and fails on fixture commits in a throwaway repository. Run: node --test .github/art-check.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, writeFileSync, renameSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { check } from './art-check.mjs';

const sha = (b) => createHash('sha256').update(b).digest('hex');
const ENV = { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' };

function repo() {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'artcheck-'));
  const g = (...a) => execFileSync('git', a, { cwd: dir, env: ENV, encoding: 'utf8' });
  g('init', '-q', '-b', 'main');
  const put = (rel, data) => { mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); writeFileSync(path.join(dir, rel), data); };
  const commit = (msg) => { g('add', '-A'); g('commit', '-q', '-m', msg); return g('rev-parse', 'HEAD').trim(); };
  return { dir, g, put, commit };
}

const OLD = Buffer.from('old image bytes'), SIGNED = Buffer.from('a signed painting'), UNSIGNED = Buffer.from('somebody typed these pixels');
const signedJson = (...bufs) => JSON.stringify({ formatVersion: 1, signed: bufs.map((b, i) => ({ path: `p${i}.png`, sha256: sha(b), id: `id${i}`, class: 'paint', date: '2026-11-12' })) });

function base(r) {
  r.put('prototypes/exploration/art/props/old.png', OLD);   // unsigned but already in the base: a ratchet leaves it alone
  r.put('art/signed.json', signedJson(SIGNED));
  r.put('art/draws.json', JSON.stringify({ formatVersion: 1, sites: [] }));
  r.put('prototypes/exploration/src/view.mjs', 'ctx.fillRect(0, 0, 1, 1);\n');
  return r.commit('base');
}

test('a signed image added passes; an unsigned one fails; an old one, a byte-identical move and a test fixture are left alone', () => {
  const r = repo(), b = base(r);
  r.put('prototypes/exploration/art/props/new-signed.png', SIGNED); const ok = r.commit('signed');
  assert.deepEqual(check({ base: b, head: ok, cwd: r.dir }), []);
  r.put('prototypes/exploration/art/props/new-unsigned.png', UNSIGNED); const bad = r.commit('unsigned');
  const problems = check({ base: ok, head: bad, cwd: r.dir });
  assert.equal(problems.length, 1); assert.match(problems[0], /unsigned image added: prototypes\/exploration\/art\/props\/new-unsigned\.png/);
  renameSync(path.join(r.dir, 'prototypes/exploration/art/props/old.png'), path.join(r.dir, 'prototypes/exploration/art/props/moved.png')); const moved = r.commit('move');
  assert.deepEqual(check({ base: bad, head: moved, cwd: r.dir }).filter((p) => /moved\.png/.test(p)), []);
  r.put('prototypes/exploration/tests/fixtures/shot.png', UNSIGNED); const fx = r.commit('fixture');
  assert.deepEqual(check({ base: moved, head: fx, cwd: r.dir }), []);
});

test('a changed image must be signed too', () => {
  const r = repo(), b = base(r);
  r.put('prototypes/exploration/art/props/old.png', UNSIGNED); const bad = r.commit('retouch');
  assert.match(check({ base: b, head: bad, cwd: r.dir })[0], /unsigned image changed: .*old\.png/);
  r.put('prototypes/exploration/art/props/old.png', SIGNED); const ok = r.commit('swap');
  assert.deepEqual(check({ base: bad, head: ok, cwd: r.dir }), []);
});

test('a new drawing call in a render module fails unless art/draws.json allows it', () => {
  const r = repo(), b = base(r);
  r.put('prototypes/exploration/src/view.mjs', 'ctx.fillRect(0, 0, 1, 1);\nctx.fillRect(2, 2, 3, 3);\nctx.arc(1, 1, 1, 0, 6);\n'); const bad = r.commit('draw more');
  const problems = check({ base: b, head: bad, cwd: r.dir });
  assert.equal(problems.length, 2); assert.match(problems.join('\n'), /2 fillRect\(\) \(base 1\)/); assert.match(problems.join('\n'), /1 arc\(\) \(base 0\)/);
  r.put('art/draws.json', JSON.stringify({ formatVersion: 1, sites: [{ file: 'prototypes/exploration/src/view.mjs', primitive: 'fillRect', count: 2, class: 'ui' }, { file: 'prototypes/exploration/src/view.mjs', primitive: 'arc', count: 1, class: 'ui' }] })); const ok = r.commit('listed');
  assert.deepEqual(check({ base: b, head: ok, cwd: r.dir }), []);
  r.put('prototypes/exploration/src/other.mjs', 'x.fillRect(1,1,1,1)'); const same = r.commit('another module');
  assert.match(check({ base: ok, head: same, cwd: r.dir })[0], /other\.mjs has 1 fillRect/);
  r.put('prototypes/exploration/tests/helper.mjs', 'x.fillRect(1,1,1,1)'); const t = r.commit('test helper');
  assert.deepEqual(check({ base: same, head: t, cwd: r.dir }).filter((p) => /helper/.test(p)), []);
});

test('the built-site pass finds an image that is neither signed nor already in the base', () => {
  const r = repo(), b = base(r);
  const site = path.join(r.dir, '..', path.basename(r.dir) + '-site');
  mkdirSync(path.join(site, 'sandbox'), { recursive: true });
  writeFileSync(path.join(site, 'sandbox/a.png'), SIGNED); writeFileSync(path.join(site, 'sandbox/b.png'), OLD);
  assert.deepEqual(check({ base: b, head: b, site, cwd: r.dir }), []);
  writeFileSync(path.join(site, 'sandbox/c.png'), UNSIGNED);
  assert.match(check({ base: b, head: b, site, cwd: r.dir })[0], /unsigned image in the built site: sandbox\/c\.png/);
});

test('a missing signed list is a failure', () => {
  const r = repo(); r.put('README.md', 'x'); const b = r.commit('no list');
  assert.match(check({ base: b, head: b, cwd: r.dir })[0], /art\/signed\.json is missing/);
});

// C1: the pins hold. The vendored LDtk schema matches VERSIONS.md, package.json pins are exact, terrain.json is well formed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const places = path.join(here, '..');
const repo = path.join(places, '..', '..');
const versions = readFileSync(path.join(places, 'VERSIONS.md'), 'utf8');
const pin = (key) => { const m = versions.match(new RegExp('^' + key + ': (.+)$', 'm')); assert.ok(m, key + ' missing from VERSIONS.md'); return m[1].trim(); };

test('the vendored LDtk schema matches the sha256 in VERSIONS.md', () => {
  const v = pin('ldtk-version');
  const bytes = readFileSync(path.join(places, 'vendor', `ldtk-${v}.schema.json`));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), pin('ldtk-schema-sha256'));
  assert.equal(JSON.parse(bytes).version, v);
});

test('package.json pins exact versions of the four tools', () => {
  const pkg = JSON.parse(readFileSync(path.join(places, 'package.json'), 'utf8'));
  const all = { ...pkg.dependencies, ...pkg.devDependencies };
  for (const name of ['flatbuffers', 'pngjs', 'ajv', 'esbuild']) {
    assert.match(all[name] || '', /^\d+\.\d+\.\d+$/, name + ' must be an exact version');
  }
  assert.equal(all.flatbuffers, pin('flatc-version'), 'the flatbuffers runtime matches flatc');
});

test('terrain.json has unique ids, values and z', () => {
  const t = JSON.parse(readFileSync(path.join(repo, 'art', 'places', 'terrain.json'), 'utf8'));
  assert.equal(t.formatVersion, 1);
  assert.ok(t.terrains.length >= 1);
  for (const key of ['id', 'value', 'z']) {
    const seen = new Set(t.terrains.map((r) => r[key]));
    assert.equal(seen.size, t.terrains.length, 'duplicate ' + key);
  }
  for (const r of t.terrains) {
    assert.ok(Number.isInteger(r.value) && r.value >= 1 && r.value <= 15, r.id + ' value 1..15');
    assert.ok(['walk', 'block', 'wade', 'scree', 'bank', 'deep'].includes(r.play), r.id + ' play');
    assert.match(r.editorColour, /^#[0-9a-f]{6}$/);
  }
});

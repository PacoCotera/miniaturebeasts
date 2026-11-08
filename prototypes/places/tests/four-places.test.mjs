// C13: the four authored places and their mirrors pass the bake's rules (hearts reachable from every opening, names, counts).
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bakeAll, paths } from '../src/bake/bake.mjs';

const placesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const IDS = ['Reedpool', 'SplitStone', 'HollowTree', 'Windstep'];

test('the four places and their mirrors bake with no rule failures', () => {
  const { files, errors } = bakeAll(paths(placesDir), {});
  assert.deepEqual(errors.map(String), []);
  const names = [...files.keys()].map((k) => String(k));
  for (const id of IDS) {
    for (const v of [id, `${id}~x`]) {
      assert.ok(names.some((n) => n.includes(`${v}.mbplace`)), `${v}.mbplace baked`);
      assert.ok(names.some((n) => n.endsWith(`${v}-48.png`)), `${v}-48.png golden`);
      assert.ok(names.some((n) => n.endsWith(`${v}-24.png`)), `${v}-24.png golden`);
    }
  }
});

test('no player-facing string says heart, nest, old, lost, forgotten or first', async () => {
  const fs = await import('node:fs');
  for (const id of IDS) {
    const level = JSON.parse(fs.readFileSync(path.join(placesDir, '..', '..', 'art/places/ldtk/places', `${id}.ldtkl`), 'utf8'));
    const text = [];
    for (const f of level.fieldInstances) text.push(JSON.stringify(f.__value));
    for (const l of level.layerInstances) for (const e of l.entityInstances) for (const f of e.fieldInstances) {
      if (['revealLine', 'label'].includes(f.__identifier)) text.push(String(f.__value));
    }
    assert.doesNotMatch(text.join(' ').replace(/"mirror"|Hollow Tree/g, ''), /\b(heart|nest|old|lost|forgotten|first)\b/i, id);
  }
});

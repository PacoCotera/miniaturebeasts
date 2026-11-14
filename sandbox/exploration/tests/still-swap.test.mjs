// The still tools' --swap flag and sidecar: the swapped file is read in the slot (not copied), the sidecar lists sha256 and the swap, an unknown file or a bad flag is refused.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { takeFlags, fileList, writeSidecar, sha256 } from '../tools/still-art.mjs';
import { loadSet, artHooks } from '../../places/src/setload.mjs';

const SET = new URL('../../../art/places/sets/ninja-test', import.meta.url).pathname;

test('takeFlags: --swap is repeatable, --both and the positional arguments stay apart', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'swap-'));
  const a = path.join(dir, 'a.png'), b = path.join(dir, 'b.png'); writeFileSync(a, 'a'); writeFileSync(b, 'b');
  const f = takeFlags(['out', 'woods', '--swap', `x/one.png=${a}`, '--both', '--swap', `two.png=${b}`]);
  assert.deepEqual(f.rest, ['out', 'woods']);
  assert.equal(f.both, true);
  assert.deepEqual([...f.swaps], [['x/one.png', a], ['two.png', b]]);
  assert.throws(() => takeFlags(['--swap', 'noequals']), /slot=file/);
  assert.throws(() => takeFlags(['--swap', `s=${path.join(dir, 'missing.png')}`]), /not found/);
});

test('the set loader reads the swapped file in the slot and records every sheet it read; the shipped file is untouched', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'swap-')), other = path.join(SET, 'fill-earth.png');
  const before = sha256(readFileSync(path.join(SET, 'fill-litter.png')));
  artHooks.swap = new Map([['ninja-test/fill-litter.png', other]]); artHooks.seen = new Map();
  try {
    const loaded = loadSet(SET);
    const got = loaded.png('fill-litter.png'), want = loaded.png('fill-earth.png');
    assert.deepEqual(got.data, want.data);   // the litter slot holds the earth sheet
    const seen = artHooks.seen.get('ninja-test/fill-litter.png');
    assert.equal(seen.swapped, true);
    assert.equal(seen.file, other);
    assert.equal(artHooks.seen.get('ninja-test/fill-earth.png').swapped, false);

    // the sidecar: sha256 of every file drawn, the slot each filled, the zoom, the light and the time
    const still = path.join(dir, 'still.png'); writeFileSync(still, 'png bytes');
    const side = writeSidecar(still, { tool: 'test', zoom: 48, light: 'night', files: fileList([...artHooks.seen].map(([slot, v]) => ({ slot, ...v }))) });
    assert.equal(side, path.join(dir, 'still.json'));
    const j = JSON.parse(readFileSync(side, 'utf8'));
    assert.equal(j.zoom, 48); assert.equal(j.light, 'night'); assert.ok(Date.parse(j.madeAt) > 0);
    const lit = j.files.find((x) => x.slot === 'ninja-test/fill-litter.png');
    assert.equal(lit.swapped, true);
    assert.equal(lit.sha256, sha256(readFileSync(other)));   // the hash of what was drawn, not of the shipped sheet
    assert.equal(lit.shippedSha256, before);
    assert.equal(j.files.find((x) => x.slot === 'ninja-test/fill-earth.png').swapped, false);
  } finally { artHooks.swap = null; artHooks.seen = null; }
  assert.equal(existsSync(path.join(dir, 'fill-litter.png')), false);   // nothing was copied anywhere
  assert.equal(sha256(readFileSync(path.join(SET, 'fill-litter.png'))), before);
});

test('with no hooks the loader reads the shipped sheet', () => {
  const loaded = loadSet(SET);
  assert.equal(artHooks.swap, null);
  assert.ok(loaded.png('fill-litter.png').w > 0);
});

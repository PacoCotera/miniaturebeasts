// The art desk's signed pieces in the test set (open edges, mibi-art abb33a65b; meadow decor, mibi-art 5734abc5): every placed file is the desk's file byte for byte at its signed commit
// (never the desk's live folder), as DESK.json records; the cliff, thicket, scrub and deep-water pairs, the reed look and the small decals are in the set.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url)), dir = path.join(here, '..', '..', '..', 'art', 'places', 'sets', 'ninja-test');
const desk = JSON.parse(readFileSync(path.join(dir, 'DESK.json'), 'utf8')), set = JSON.parse(readFileSync(path.join(dir, 'set.json'), 'utf8'));
const REPO = process.env.MIBI_ART_REPO || '/home/mb/mb/mibi-art';
const haveDesk = existsSync(REPO + '/.git') && (() => { try { execFileSync('git', ['-C', REPO, 'cat-file', '-t', 'abb33a65b']); return true; } catch { return false; } })();

test('every placed desk file equals the recorded hash, and the desk\'s file at its signed commit', () => {
  const names = Object.keys(desk);
  assert.ok(names.length > 60, 'files recorded: ' + names.length);
  assert.deepEqual([...new Set(Object.values(desk).map((d) => d.commit))].sort(), ['4315b9d25', '5734abc5', 'abb33a65b']);
  for (const [n, d] of Object.entries(desk)) {
    const have = readFileSync(path.join(dir, n));
    assert.equal(createHash('sha256').update(have).digest('hex'), d.sha256, n);
    if (haveDesk) assert.ok(have.equals(execFileSync('git', ['-C', REPO, 'show', `${d.commit}:${d.from}`], { maxBuffer: 1 << 26 })), n + ' differs from the desk\'s file at ' + d.commit);
  }
});

test('the set holds the open edges and the decor', () => {
  const ids = set.pairs.map((p) => p.id);
  for (const id of ['cliff-grass', 'cliff-sand', 'thicket-grass', 'thicket-sand', 'scrub-grass', 'scrub-sand', 'deep-water']) assert.ok(ids.includes(id), id);
  for (const g of ['cliff-grass', 'cliff-sand']) { const p = set.pairs.find((q) => q.id === g); assert.deepEqual(Object.keys(p.tall), ['1', '2', '3']); assert.ok(p.wayup); }
  assert.equal(set.pairs.find((p) => p.id === 'scrub-grass').variants.length, 3);
  assert.deepEqual(set.looks[0].of['grass-water'].map((v) => v.length), [4, 4, 4]);
  for (const n of ['flower-daisy', 'flower-buttercup', 'flower-daisy-pair', 'flower-blue-pair', 'flower-pink-three', 'tuft-fan', 'tuft-lean', 'tuft-small', 'clump-tall']) assert.deepEqual(set.decals[n].anchor, [8, 15], n);
  assert.ok(!set.decals['flower-sun'] && !set.decals['flower-sun-small'], 'the kit\'s sunflowers are retired');
});

// C4: the baked format (place design A1.5): FlatBuffers schema, generated reader, writers, the 24 px derivation.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSet, dualPairs, extraEntries } from '../src/setload.mjs';
import { bakeTileSet, halve } from '../src/bakeset.mjs';
import { writeTileSet, writePlace, FORMAT_VERSION } from '../src/format/write.mjs';
import { readTileSet, readPlace } from '../src/format/read.mjs';
import { paletteOf } from '../src/indexed.mjs';
import { decodeRle } from '../src/blit.mjs';
import { newImage } from '../src/png.mjs';
import { edgeSignatureFailures } from '../src/seams.mjs';
import { fixturePlace } from './fixture-place.mjs';
import { generate, GEN, flatcVersion } from '../tools/gen-format.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const places = path.join(here, '..');
const repo = path.join(places, '..', '..');
const loaded = loadSet(path.join(repo, 'art', 'places', 'sets', 'ninja-test'));
const terrains = JSON.parse(readFileSync(path.join(repo, 'art', 'places', 'terrain.json'), 'utf8')).terrains;
const tileset = bakeTileSet(loaded, terrains);
const place = fixturePlace(loaded, tileset, terrains);

const plain = (o) => JSON.parse(JSON.stringify(o, (k, v) => (ArrayBuffer.isView(v) ? Array.from(v) : v)));
// field by field, naming the first field that differs (a deepEqual on a 200 KB atlas prints the lot)
function sameFields(a, b, what) {
  const pa = plain(a), pb = plain(b);
  assert.deepEqual(Object.keys(pa), Object.keys(pb), what + ': same fields');
  for (const k of Object.keys(pa)) assert.ok(JSON.stringify(pa[k]) === JSON.stringify(pb[k]), `${what}: field "${k}" differs`);
}

test('a tile set written and read back is the same, field by field', () => {
  const bytes = writeTileSet(tileset);
  const back = readTileSet(bytes);
  sameFields(back, tileset, 'tile set');
  assert.equal(back.tile, 48);
  assert.equal(back.half, 24);
  assert.equal(back.formatVersion, FORMAT_VERSION);
  assert.equal(back.atlas48.length, back.atlas24.length * 4, 'one 24 px tile for every 48 px tile');
  assert.equal(back.lightTables.length, 7);
  assert.equal(back.licence.spdx, 'CC0-1.0');
  assert.ok(back.pairs.length === loaded.set.pairs.length + extraEntries(loaded.set).length && back.pairs.every((p, k) => p.tiles.length === (k >= loaded.set.pairs.length && extraEntries(loaded.set)[k - loaded.set.pairs.length].kind === 'wayup' ? 6 : 16)));   // the main pairs, then the cliff's tall sheets, the scrub's variants, the way-up pieces and the reed looks
});

test('a place written and read back is the same, field by field', () => {
  const bytes = writePlace(place);
  const back = readPlace(bytes);
  sameFields(back, place, 'place');
  assert.equal(back.ground[0].tiles.length, (place.w + 1) * (place.h + 1));
  assert.equal(back.heart.reachBy, 'none');
  assert.deepEqual(back.clues[0].points[2], { x: 7, y: 13 });
});

test('two runs write identical bytes, and a tile set baked twice is the same', () => {
  assert.deepEqual(writePlace(place), writePlace(place));
  assert.deepEqual(writeTileSet(tileset), writeTileSet(bakeTileSet(loadSet(path.join(repo, 'art', 'places', 'sets', 'ninja-test')), terrains)));
});

test('sizes of the fixture blobs are logged and in the expected range', (t) => {
  const p = writePlace(place).length, s = writeTileSet(tileset).length;
  t.diagnostic(`fixture .mbplace ${p} bytes; ninja-test .mbtiles ${s} bytes (${(s / 1048576).toFixed(2)} MB; ${tileset.tiles.length} tile ids, ${tileset.atlas48.length / 2304} unique 48 px tiles, ${tileset.sprites.length} sprites)`);
  console.log(`# fixture .mbplace ${p} bytes; ninja-test .mbtiles ${s} bytes`);
  assert.ok(p > 1500 && p < 8192, 'a place is a few KB: ' + p);
  assert.ok(s < 1.5 * 1048576, 'a set under 1.5 MB: ' + s);
});

test('a blob with the wrong identifier or version is refused', () => {
  const t = writeTileSet(tileset), p = writePlace(place);
  assert.throws(() => readPlace(t), /not a place/);
  assert.throws(() => readTileSet(p), /not a tile set/);
  const bad = writePlace({ ...place, formatVersion: 2 });
  assert.throws(() => readPlace(bad), /format version 2/);
});

test('the committed reader is what flatc and esbuild generate from place.fbs', async (t) => {
  const v = flatcVersion();
  if (!v) {
    if (process.env.CI) assert.fail('flatc is not installed in CI');
    t.skip('flatc not found (set MB_FLATC); CI runs this');
    return;
  }
  assert.match(v, /25\.9\.23/, 'flatc is the pinned version: ' + v);
  const tmp = path.join(mkdtempSync(path.join(os.tmpdir(), 'mb-gen-')), 'place.mjs');
  const text = await generate(tmp);
  assert.equal(text, readFileSync(GEN, 'utf8'), 'src/format/gen/place.mjs differs from a fresh generation: run tools/gen-format.mjs');
});

test('the 24 px derivation: 2 x 2 blocks keep the most frequent index, ties go to the darker colour, outlines survive', () => {
  const pal = paletteOf({ colours: ['#000000', '#808080', '#ffffff', '#ff0000'] }); // indices 48 black, 49 grey, 50 white, 51 red
  const T = 8, px = new Uint8Array(T * T).fill(50);
  const set = (x, y, v) => { px[y * T + x] = v; };
  // block (0,0): three white, one red -> white (most frequent)
  set(0, 0, 51);
  // block (1,0): two white, two black -> tie, black is darker
  set(2, 0, 48); set(3, 1, 48);
  // block (2,0): a one-pixel black outline column inside a white block: 2 white 2 white -> white; with 2 black 2 grey -> black
  set(4, 0, 48); set(4, 1, 48); set(5, 0, 49); set(5, 1, 49);
  // block (3,0): two grey, two red: tie, grey is darker than red? (lum grey 128 vs red 76): red is darker
  set(6, 0, 49); set(7, 0, 49); set(6, 1, 51); set(7, 1, 51);
  const h = halve(px, T, T, pal);
  assert.equal(h.w, 4); assert.equal(h.h, 4);
  assert.equal(h.data[0], 50, 'majority');
  assert.equal(h.data[1], 48, 'tie to the darker');
  assert.equal(h.data[2], 48, 'black 2, grey 2: black is darker');
  assert.equal(h.data[3], 51, 'grey 2, red 2: the red has the lower luminance');
  assert.equal(h.data[4 * 3], 50);
  // transparency: a block of 4 with one opaque pixel is transparent, with two it is opaque
  const q = new Uint8Array(16); q[0] = 49;
  assert.equal(halve(q, 4, 4, pal).data[0], 0);
  q[1] = 49;
  assert.equal(halve(q, 4, 4, pal).data[0], 49);
});

test('sprites: the RLE stream of every frame decodes to its pixels, 48 px and 24 px', () => {
  const back = readTileSet(writeTileSet(tileset));
  for (const s of back.sprites) {
    for (const [w, h, atlas, offsets] of [[s.w48, s.h48, back.spriteAtlas48, s.frames48], [s.w24, s.h24, back.spriteAtlas24, s.frames24]]) {
      assert.ok(offsets.length >= 1);
      for (const off of offsets) {
        const px = decodeRle(atlas.subarray(off), w, h);
        assert.ok(px.some((v) => v !== 0), s.kind + ' draws something');
      }
    }
  }
  const tall = back.sprites.find((s) => s.kind === 'tall-grass');
  assert.equal(tall.frames48.length, 3);
  assert.equal(tall.footprint.length, 0);
  const tree = back.sprites.find((s) => s.kind === 'tree-broad');
  assert.ok(tree.canopy >= 0 && back.sprites[tree.canopy].group === 'canopy');
  assert.deepEqual(tree.footprint, [0, 0]);
  assert.deepEqual(tree.anchor48, [72, 39]);
});

test('seam test 1 at 24 px: edge signatures hold on the derived tiles of every pair', () => {
  const back = readTileSet(writeTileSet(tileset));
  const pal = paletteOf(loaded.palette);
  const size = 24;
  const slotImg = (slot) => {
    const img = newImage(size, size);
    for (let i = 0; i < size * size; i++) {
      const v = back.atlas24[slot * size * size + i];
      if (v === 0) continue;
      const c = pal.rgb[v];
      img.data[i * 4] = c[0]; img.data[i * 4 + 1] = c[1]; img.data[i * 4 + 2] = c[2]; img.data[i * 4 + 3] = 255;
    }
    return img;
  };
  for (const [k, p] of back.pairs.slice(0, loaded.set.pairs.length).entries()) {
    if (loaded.set.pairs[k].tall) continue;   // a tall face is held to the block rule (seams.test.mjs), not the one-line-per-edge-state proof
    const nFrames = Math.max(...p.tiles.map((id) => back.tiles[id].frames.length));
    const frames = Array.from({ length: nFrames }, (_, f) => p.tiles.map((id) => { const fr = back.tiles[id].frames; return slotImg(fr[f % fr.length]); }));
    const variants = p.fullVariants.map((id) => slotImg(back.tiles[id].frames[0]));
    const failures = edgeSignatureFailures(frames, variants);
    assert.deepEqual(failures, [], `pair ${p.lower}|${p.upper}:\n${failures.join('\n')}`);
  }
  assert.equal(dualPairs(loaded).length, loaded.set.pairs.length);
});

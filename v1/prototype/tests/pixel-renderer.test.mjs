import test from 'node:test';
import assert from 'node:assert/strict';
import { inflateSync } from 'node:zlib';
import { fixtures } from '../pixel/fixtures.mjs';
import { assets } from '../pixel/assets.mjs';
import { glyphs, glyphFor, missingGlyph } from '../pixel/font.mjs';
import { renderScene, createSurface } from '../pixel/renderer.mjs';
import { encodePng } from '../pixel/png.mjs';

test('fixture facts and assets remain immutable across every deterministic scene', () => {
  const original = JSON.stringify(fixtures);
  assert.throws(() => { fixtures.specimen.shortId = '#015'; }, TypeError);
  assert.throws(() => { fixtures.specimen.traits.push('OTHER'); }, TypeError);
  assert.throws(() => { assets.critter.pixels[0] = 0; }, TypeError);
  for (const scene of Object.keys(fixtures)) {
    for (const profile of ['color', 'mono']) {
      const frame = renderScene(scene, fixtures[scene], profile);
      assert.equal(frame.pixels.length, 320 * 240);
      assert.deepEqual(frame, renderScene(scene, fixtures[scene], profile));
      assert.ok([...frame.pixels].every(value => value >= 0 && value < frame.palette.length));
      assert.ok(frame.palette.length <= (profile === 'mono' ? 2 : 8));
      for (let y = 0; y < 240; y++) {
        for (let x = 0; x < 320; x++) {
          if (x < 8 || x >= 312 || y < 8 || y >= 232) {
            assert.equal(frame.pixels[y * 320 + x], 0);
          }
        }
      }
    }
  }
  assert.equal(JSON.stringify(fixtures), original);
});

test('bounded drawing rejects overflow and invalid palette values', () => {
  const surface = createSurface();
  assert.throws(() => surface.pixel(320, 0, 1), RangeError);
  assert.throws(() => surface.pixel(-1, 0, 1), RangeError);
  assert.throws(() => surface.pixel(0, 0, 8), RangeError);
  assert.throws(() => surface.text('TOO LONG', 0, 0, 3), RangeError);
  assert.throws(() => renderScene('research', { ...fixtures.research, progress: 2 }), RangeError);
  assert.throws(() => renderScene('specimen', { ...fixtures.specimen, traits: ['A', 'B', 'C'] }), /two trait rows/);
  assert.throws(() => renderScene('family', { ...fixtures.family, characteristics: ['A', 'B', 'C'] }), /two trait rows/);
});

test('unknown progress leaves the progress region empty', () => {
  const frame = renderScene('research', { ...fixtures.research, progress: null });
  for (let y = 184; y < 192; y++) {
    for (let x = 24; x < 152; x++) assert.equal(frame.pixels[y * 320 + x], 0);
  }
});

test('fixture typography is covered; missing glyphs are explicit', () => {
  const labels = ['COLLECTION', 'RESEARCH', 'FAMILY GUIDE', 'INDIVIDUAL', 'FAMILY', 'FAMILY ENTRY', 'EXPRESSED', 'BACK', 'INSPECT', 'NEXT', 'EVIDENCE', 'FORECAST', 'READ'];
  labels.push(fixtures.specimen.shortId, fixtures.specimen.family, ...fixtures.specimen.traits,
    fixtures.specimen.position, fixtures.research.title, fixtures.research.state,
    fixtures.research.finding, ...fixtures.family.characteristics);
  for (const character of labels.join('')) assert.ok(glyphs[character], `Missing ${character}`);
  assert.equal(glyphFor('é'), missingGlyph);
});

test('color and monochrome show identical individual and family text facts', () => {
  const color = renderScene('specimen', fixtures.specimen, 'color');
  const mono = renderScene('specimen', fixtures.specimen, 'mono');
  for (const y of [40, 64, 76, 92, 112, 136]) {
    const startX = y >= 112 ? 184 : 176; // Exclude trait bullet color, include complete text.
    for (let row = y; row < y + 7; row++) {
      for (let x = startX; x < 312; x++) {
        assert.equal(color.pixels[row * 320 + x], mono.pixels[row * 320 + x]);
      }
    }
  }
  const other = renderScene('specimen', { ...fixtures.specimen, shortId: '#015' });
  assert.notDeepEqual(color.pixels, other.pixels);
  assert.notDeepEqual(assets.family.pixels, assets.critter.pixels);
});

test('PNG contains correct native and integer enlarged pixels', () => {
  const frame = renderScene('specimen', fixtures.specimen, 'mono');
  for (const scale of [1, 3]) {
    const png = encodePng(frame, scale);
    assert.equal(png.readUInt32BE(16), 320 * scale);
    assert.equal(png.readUInt32BE(20), 240 * scale);
    const chunks = [];
    for (let offset = 8; offset < png.length;) {
      const length = png.readUInt32BE(offset);
      if (png.toString('ascii', offset + 4, offset + 8) === 'IDAT') {
        chunks.push(png.subarray(offset + 8, offset + 8 + length));
      }
      offset += length + 12;
    }
    const pixels = inflateSync(Buffer.concat(chunks));
    const width = 320 * scale;
    for (let y = 0; y < 240 * scale; y++) {
      for (let x = 0; x < width; x++) {
        assert.equal(pixels[y * (width + 1) + 1 + x], frame.pixels[Math.floor(y / scale) * 320 + Math.floor(x / scale)]);
      }
    }
  }
  assert.throws(() => encodePng(frame, 1.5), RangeError);
});

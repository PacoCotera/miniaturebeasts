// bank-wire-1 (bug #57 "i don't see any earth bank"): the page asks the worker for the Rupar's earth banks of the regions its reach touches (readyBanks, once each, after the places), and a place's banks
// are in its layout whether the region's list was made on the spot or came made (presetBanks).
//   node --test prototypes/exploration/tests/bank-wire.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { bankRegions } from '../src/logic/bank-regions.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), html = readFileSync(path.join(here, '../index.html'), 'utf8');

function wiring(readyBanks) {
  const src = html.match(/function wantBanks\([\s\S]*?\n\}\n/);
  assert.ok(src, 'wantBanks is in the page');
  const PLACES = {}, PL = { ctx: { kit: 1 } };
  return { PLACES, run: vm.runInNewContext(`${src[0]}; wantBanks`, { PLACES, PL, bankRegions, readyBanks }) };
}

test('wantBanks asks the regions the reach touches, nearest first, each once; a refused ask is made again', () => {
  const calls = []; let ok = true;
  const { run } = wiring((seed, slots, kit) => { calls.push({ seed, slots: Array.from(slots, s => s.join(',')), kit }); return ok; });
  const cell = (x, y) => y * 16 + x;
  run(93, [2, 2], [cell(8, 16)]);   // mid-region: its windows reach 2 cells either way, all inside region 2,2
  assert.equal(calls.length, 1); assert.deepEqual(calls[0].slots, ['2,2']); assert.equal(calls[0].seed, 93); assert.deepEqual({ ...calls[0].kit }, { ctx: { kit: 1 } });
  run(93, [2, 2], [cell(8, 16)]); assert.equal(calls.length, 1, 'asked once');
  run(93, [2, 2], [cell(15, 19), cell(8, 16)]);   // the south-east corner of the region: the windows reach the three regions beside it
  assert.equal(calls.length, 2); assert.deepEqual(calls[1].slots.slice().sort(), ['2,3', '3,2', '3,3']);
  run(93, [0, 0], [cell(0, 0)]);   // a region on the atlas's corner: nothing outside the atlas is asked
  assert.deepEqual(calls[2].slots, ['0,0']);
  ok = false; run(93, [4, 4], [cell(15, 19)]);   // the worker is not there: nothing is marked asked
  ok = true; run(93, [4, 4], [cell(15, 19)]); assert.equal(calls.length, 5, 'asked again after a refusal');
  run(94, [4, 4], [cell(15, 19)]); assert.equal(calls.length, 6, 'a new seed asks again');
});

test('the page calls wantBanks after readyPlaces, so the worker bakes the nearest cells before it makes any list', () => {
  const at = html.indexOf('readyPlaces(seed, R.slot, v, list, { ctx: PL.ctx });'), w = html.indexOf('wantBanks(seed, R.slot, list);');
  assert.ok(at > 0 && w > at, 'wantBanks follows readyPlaces in wantPlaces');
  assert.match(html, /import \{[^}]*\breadyBanks\b[^}]*\} from "\.\/src\/place-store\.mjs"/);
});

test('a place with a bank holds it in its IR whether the region list was made on the spot or came made', async () => {
  const place = await import('../src/gen7/place.mjs');
  const seed = 93, X = 40, Y = 56, want = [{ x: 10, y: 5, w: 2, h: 1 }];   // seed 93, cell 40,56 (region 2,2, page cell 264): the bank at tile 967,1572 of the realm
  place.presetBanks(seed, [{ ra: 2, rb: 2, banks: [{ x0: 967, lip: 1572, part: 1, n: 1327, loose: false }] }]);   // the list arrives from the worker before the place is made
  assert.deepEqual(place.cellIR(seed, X, Y, 0).banks, want, 'the arrived list: the bank is in the place');
  const made = place.madeBanks(seed).find(r => r.ra === 2 && r.rb === 2);
  assert.deepEqual(made.banks.map(b => [b.x0, b.lip]), [[967, 1572]], 'the page keeps the list as it came');
});

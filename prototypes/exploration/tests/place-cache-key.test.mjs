// The cached places' key carries a hash of the tile set files: a cache written before a tile-set change is never read after it (owner bugs #127-#129).
import test from 'node:test';
import assert from 'node:assert/strict';
import { placesTag, placesTagSet, storeKey } from '../src/place-store.mjs';

const ts = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]), ter = new Uint8Array([9, 9, 9]), lay = new Uint8Array([7, 7]);
const args = [12345, [2, 3], 4, 17];

test('a changed tile set changes the key: the old cache is not found, the place is baked again', () => {
  const cache = new Map();                                   // stands in for IndexedDB
  placesTagSet('');                                          // a cache from before the hash existed (as before PR 514)
  cache.set(storeKey(...args), { ir: 1, place: 1 });
  placesTagSet(placesTag(ts, ter, lay));
  assert.equal(cache.get(storeKey(...args)), undefined, 'old-key cache is not reused');
  const tweaked = ts.slice(); tweaked[3] ^= 1;               // one changed byte in one tile
  cache.set(storeKey(...args), { ir: 2, place: 2 });
  placesTagSet(placesTag(tweaked, ter, lay));
  assert.equal(cache.get(storeKey(...args)), undefined, 'a modified tile set does not meet the older cache');
});

test('the same tile set gives the same key: a normal load reuses its cache', () => {
  placesTagSet(placesTag(ts, ter, lay)); const a = storeKey(...args);
  placesTagSet(placesTag(ts.slice(), ter.slice(), lay.slice())); assert.equal(storeKey(...args), a);
});

test('each file counts, and where one ends and the next begins', () => {
  const t = (...p) => placesTag(...p);
  assert.notEqual(t(ts, ter, lay), t(ts, ter, new Uint8Array([7, 8])));
  assert.notEqual(t(ts, ter, lay), t(ts, new Uint8Array([9, 9, 8]), lay));
  assert.notEqual(t(new Uint8Array([1, 2]), new Uint8Array([3])), t(new Uint8Array([1]), new Uint8Array([2, 3])));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createShareLifecycle } from '../share-lifecycle.mjs';

test('reset/close invalidation rejects a delayed publication or image result', () => {
  const lifecycle = createShareLifecycle();
  const request = lifecycle.invalidate();
  lifecycle.invalidate();
  assert.equal(lifecycle.isCurrent(request), false);
  assert.equal(lifecycle.activate(request, { specimen: 'old' }), false);
  assert.equal(lifecycle.getActive(), null);
});

test('replacing a card rejects old callbacks without clearing the replacement', () => {
  const lifecycle = createShareLifecycle();
  const first = lifecycle.invalidate();
  lifecycle.activate(first, { specimen: 'first' });
  const oldHandle = lifecycle.getActive();
  const second = lifecycle.invalidate();
  lifecycle.activate(second, { specimen: 'second' });
  const current = lifecycle.getActive();

  assert.equal(lifecycle.isActive(oldHandle), false);
  assert.equal(lifecycle.activate(first, { specimen: 'late first result' }), false);
  assert.equal(lifecycle.isActive(current), true);
  assert.equal(current.value.specimen, 'second');
});

test('pending print and clipboard continuations lose authority after invalidation', async () => {
  const lifecycle = createShareLifecycle();
  const request = lifecycle.invalidate();
  lifecycle.activate(request, { specimen: 'first' });
  const handle = lifecycle.getActive();
  let finishImages;
  const images = new Promise(resolve => { finishImages = resolve; });
  const completion = images.then(() => lifecycle.isActive(handle));

  lifecycle.invalidate();
  finishImages();
  assert.equal(await completion, false);
  assert.equal(lifecycle.isActive(null), false);
});

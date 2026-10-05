import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyEnvelope, applyCommand, creationRequest } from '../lab/domain.mjs';
import { sources } from '../lab/content.mjs';
import { initialController, transition } from '../lab/controller.mjs';
import { mapView } from '../lab/view.mjs';
import { renderLab } from '../lab/render.mjs';

function visible(state) { return transition(state, { type: 'visible', revision: state.revision }).state; }
function gesture(state, key) {
  const pressed = transition(visible(state), { type: 'down', key });
  return { state: transition(pressed.state, { type: 'up', key }).state, commands: pressed.commands };
}
function completedEnvelope() {
  let envelope = emptyEnvelope();
  for (const command of [
    { type: 'console' }, { type: 'start', sampleId: sources.console.id, question: 'structure' },
    { type: 'advance' }, { type: 'direction', direction: 'shape' },
  ]) envelope = applyCommand(envelope, command).envelope;
  envelope = applyCommand(envelope, { type: 'intent', id: 'OP-1', request: creationRequest(envelope) }).envelope;
  return applyCommand(envelope, { type: 'resolve', id: 'OP-1' }).envelope;
}

test('held accept during refresh stays disarmed after readiness until released', () => {
  let state = initialController(emptyEnvelope());
  state = gesture(state, 'action1').state;
  assert.equal(state.page, 'receive');
  let result = transition(state, { type: 'down', key: 'action1' });
  assert.deepEqual(result.commands, []);
  state = visible(result.state);
  result = transition(state, { type: 'down', key: 'action1' });
  assert.deepEqual(result.commands, []);
  state = transition(result.state, { type: 'up', key: 'action1' }).state;
  result = transition(state, { type: 'down', key: 'action1' });
  assert.equal(result.commands[0].type, 'receive');
});

test('stale frame cannot authorize action; wake consumes complete gesture', () => {
  let state = initialController(emptyEnvelope());
  state = gesture(state, 'action1').state;
  state = transition(state, { type: 'visible', revision: state.revision - 1 }).state;
  assert.equal(transition(state, { type: 'down', key: 'action1' }).commands.length, 0);
  state = transition(visible(state), { type: 'idle' }).state;
  let result = transition(state, { type: 'down', key: 'action1' });
  assert.equal(result.state.idle, false);
  assert.equal(result.commands.length, 0);
  result = transition(visible(result.state), { type: 'down', key: 'action1' });
  assert.equal(result.commands.length, 0);
});

test('idle waits for visible readiness and focus interruption requires release', () => {
  let state = initialController(emptyEnvelope());
  assert.equal(transition(state, { type: 'idle' }).state.idle, false);
  state = visible(state);
  state = transition(state, { type: 'down', key: 'action1' }).state;
  state = transition(state, { type: 'suspend' }).state;
  state = visible(state);
  assert.equal(transition(state, { type: 'idle' }).state.idle, false);
  state = transition(state, { type: 'resume' }).state;
  let result = transition(state, { type: 'down', key: 'action1', repeat: true });
  assert.equal(result.commands.length, 0);
  result = transition(result.state, { type: 'down', key: 'action1', repeat: false });
  assert.equal(result.commands.length, 0);
  state = transition(result.state, { type: 'up', key: 'action1' }).state;
  result = transition(state, { type: 'down', key: 'action1' });
  assert.equal(result.commands[0].type, 'receive');
});

test('boot restore preserves held gesture for empty and ready saves', () => {
  for (const saved of [emptyEnvelope(), completedEnvelope()]) {
    let state = initialController(emptyEnvelope());
    state = transition(state, { type: 'down', key: 'select' }).state;
    state = transition(state, { type: 'restore', envelope: saved }).state;
    state = visible(state);
    const page = state.page;
    let result = transition(state, { type: 'down', key: 'select', repeat: true });
    assert.equal(result.commands.length, 0);
    assert.equal(result.state.page, page);
    state = transition(result.state, { type: 'up', key: 'select' }).state;
    result = transition(state, { type: 'down', key: 'select' });
    if (page === 'ready') assert.equal(result.state.page, 'meet');
    else assert.equal(result.commands[0].type, 'console');
  }
});

test('fresh keyboard press after missed external keyup works, returning repeat cannot activate', () => {
  let state = visible(initialController(emptyEnvelope()));
  state = transition(state, { type: 'down', key: 'action1', source: 'keyboard', repeat: false }).state;
  assert.equal(state.page, 'receive');
  state = transition(state, { type: 'suspend' }).state;
  state = visible(state);
  state = transition(state, { type: 'resume' }).state;
  for (let repeat = 0; repeat < 3; repeat++) {
    const blocked = transition(state, { type: 'down', key: 'action1', source: 'keyboard', repeat: true });
    assert.equal(blocked.commands.length, 0);
    state = blocked.state;
  }
  // No keyup was observed: nonrepeat keyboard down means the user released away.
  const fresh = transition(state, { type: 'down', key: 'action1', source: 'keyboard', repeat: false });
  assert.equal(fresh.commands.length, 1);
  assert.equal(fresh.commands[0].type, 'receive');
  const heldAgain = transition(fresh.state, { type: 'down', key: 'action1', source: 'keyboard', repeat: true });
  assert.equal(heldAgain.commands.length, 0);
});

test('pointer interruption cancels only pointer gesture and release never activates', () => {
  let state = visible(initialController(emptyEnvelope()));
  state = transition(state, { type: 'down', key: 'action1', source: 'pointer' }).state;
  state = transition(state, { type: 'suspend' }).state;
  state = visible(state);
  state = transition(state, { type: 'resume' }).state;
  const release = transition(state, { type: 'up', key: 'action1', source: 'pointer' });
  assert.equal(release.commands.length, 0);
  const fresh = transition(release.state, { type: 'down', key: 'action1', source: 'pointer' });
  assert.equal(fresh.commands[0].type, 'receive');
});

test('Collection and Clues have distinct destinations with reliable Back', () => {
  let state = initialController(completedEnvelope());
  state = gesture(state, 'action1').state;
  state = gesture(state, 'action2').state;
  assert.equal(state.page, 'collection');
  assert.equal(mapView(state).title, 'COLLECTION 1 / 1');
  state = gesture(state, 'action1').state;
  assert.equal(state.page, 'inspect');
  assert.equal(mapView(state).inspection, true);
  state = gesture(state, 'back').state;
  assert.equal(state.page, 'collection');
  state.page = 'research';
  state = gesture(state, 'action1').state;
  state = gesture(state, 'action2').state;
  assert.equal(mapView(state).title, 'CLUES');
  state = gesture(state, 'back').state;
  assert.equal(state.page, 'finding');
});

test('return/reveal/inspection/art retry never creates or changes the result', () => {
  const envelope = completedEnvelope();
  let state = initialController(envelope);
  assert.equal(state.page, 'ready');
  state = gesture(state, 'action1').state;
  assert.equal(state.page, 'meet');
  state = gesture(state, 'action1').state;
  state = gesture(state, 'next').state;
  assert.equal(state.focus, 1);
  state = gesture(state, 'action1').state;
  assert.equal(state.detail, 'expressed');
  state = gesture(state, 'back').state;
  assert.equal(state.page, 'inspect');
  assert.equal(state.focus, 1);
  state = gesture(state, 'back').state;
  state = transition(state, { type: 'art', missing: true }).state;
  assert.ok(mapView(state).detailLines.includes('PORTRAIT PENDING'));
  const retry = gesture(state, 'action1');
  assert.equal(retry.commands.length, 0);
  assert.deepEqual(retry.state.envelope, envelope);
});

test('completion while hidden preserves navigation and safe reload uses saved result', () => {
  const envelope = completedEnvelope();
  let state = initialController(emptyEnvelope());
  state.page = 'creating';
  state.busy = true;
  state = gesture(state, 'back').state;
  state = transition(state, { type: 'data', command: 'resolve', envelope }).state;
  assert.equal(state.page, 'lab');
  assert.equal(initialController(state.envelope).page, 'ready');
});

test('all keyframes and fault states render bounded binary/color pixels', () => {
  const envelope = completedEnvelope();
  const pages = ['lab', 'receive', 'received', 'study', 'research', 'finding', 'direction', 'create', 'creating', 'checking', 'ready', 'meet', 'collection', 'inspect', 'detail', 'error'];
  for (const page of pages) {
    const state = { ...initialController(envelope), page, sampleId: sources.console.id, error: 'STORAGE UNAVAILABLE' };
    for (const profile of ['color', 'mono']) {
      const frame = renderLab(mapView(state), profile);
      assert.equal(frame.pixels.length, 76800);
      assert.ok([...frame.pixels].every(value => value >= 0 && value < (profile === 'mono' ? 2 : 8)));
    }
  }
});

test('detail screens keep engineering disclosure outside player copy', () => {
  const envelope = completedEnvelope();
  for (const detail of ['identity', 'expressed', 'carried', 'origin', 'evidence', 'observation', 'cargo', 'creation']) {
    const view = mapView({ ...initialController(envelope), page: 'detail', detail });
    const copy = [view.title, ...view.detailLines].join(' ');
    assert.doesNotMatch(copy, /FIXTURE|AUTHORED|HOST CONTROL|OPERATION|UNMODELED/);
  }
});

import { emptyEnvelope } from './domain.mjs';
import { openRepository } from './repository.mjs';
import { initialController, transition } from './controller.mjs';
import { mapView } from './view.mjs';
import { renderLab } from './render.mjs';

const canvas = document.querySelector('canvas');
const context = canvas.getContext('2d');
const transcript = document.querySelector('#transcript');
const status = document.querySelector('#status');
let repository;
let state = initialController(emptyEnvelope());
let inFlight = false;
let pendingFrame = null;
let rememberedIntent = null;

function showFrame(frame) {
  const image = context.createImageData(320, 240);
  frame.pixels.forEach((value, index) => {
    const color = frame.palette[value];
    for (let channel = 0; channel < 3; channel++) {
      image.data[index * 4 + channel] = parseInt(color.slice(1 + channel * 2, 3 + channel * 2), 16);
    }
    image.data[index * 4 + 3] = 255;
  });
  context.putImageData(image, 0, 0);
}

function present() {
  const view = mapView(state);
  const frame = renderLab(view, document.querySelector('#profile').value);
  pendingFrame = { frame, revision: state.revision };
  transcript.textContent = JSON.stringify({ view, saved: state.envelope, diagnostic: state.error }, null, 2);
  status.textContent = state.idle ? 'Fixture idle: first whole gesture only wakes.' : 'Displaying revision ' + state.revision;
  if (!inFlight) flush();
}

function flush() {
  if (!pendingFrame) return;
  inFlight = true;
  const target = pendingFrame;
  pendingFrame = null;
  const delay = Number(document.querySelector('#delay').value);
  // Host fault simulation only: this does not model a physical panel refresh.
  setTimeout(() => {
    showFrame(target.frame);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      dispatch({ type: 'visible', revision: target.revision });
      inFlight = false;
      if (pendingFrame) flush();
    }));
  }, delay);
}

function dispatch(event) {
  const previousRevision = state.revision;
  const changed = transition(state, event);
  state = changed.state;
  if (state.revision !== previousRevision) present();
  for (const command of changed.commands) execute(command);
}

function injectedFailure(point) {
  const fault = document.querySelector('#fault');
  if (fault.value === point) {
    fault.value = 'none';
    throw new Error(point === 'before' ? 'NOT SAVED - INJECTED STORAGE FAILURE' : 'RESPONSE LOST - CHECK RESULT');
  }
}

async function resolveOperation(operation) {
  if (operation.status === 'committed') return repository.read();
  const saved = await repository.execute({ type: 'resolve', id: operation.id });
  injectedFailure('after');
  return saved;
}

async function execute(command) {
  try {
    if (!repository) throw new Error('STORAGE UNAVAILABLE');
    injectedFailure('before');
    let saved;
    let completed = command.type;
    if (command.type === 'preview') {
      rememberedIntent ??= { type: 'intent', id: crypto.randomUUID().toUpperCase(), request: command.request };
      const intent = await repository.execute(rememberedIntent);
      if (document.querySelector('#fault').value === 'intent') {
        document.querySelector('#fault').value = 'none';
        throw new Error('INTENT SAVED - CHECK RESULT');
      }
      saved = await resolveOperation(intent.result);
      completed = 'resolve';
    } else if (command.type === 'check') {
      saved = await repository.read();
      let operation = Object.values(saved.envelope.operations)[0];
      if (!operation && rememberedIntent) {
        const intent = await repository.execute(rememberedIntent);
        operation = intent.result;
      }
      if (operation) saved = await resolveOperation(operation);
    } else {
      saved = await repository.execute(command);
      if (command.type === 'receive') injectedFailure('after');
    }
    dispatch({ type: 'data', envelope: saved.envelope, command: completed });
  } catch (error) {
    dispatch({ type: 'error', message: error.message });
  }
}

const keyMap = { ArrowLeft: 'previous', ArrowRight: 'next', Enter: 'select', Escape: 'back', '1': 'action0', '2': 'action1', '3': 'action2' };
window.addEventListener('keydown', event => {
  if (event.target.matches('select,input')) return;
  const key = keyMap[event.key];
  if (key) { event.preventDefault(); dispatch({ type: 'down', key, source: 'keyboard', repeat: event.repeat }); }
});
window.addEventListener('keyup', event => {
  const key = keyMap[event.key];
  if (key) { event.preventDefault(); dispatch({ type: 'up', key, source: 'keyboard' }); }
});
// Returning auto-repeat stays disarmed. A nonrepeat keyboard press proves a new
// gesture after a lost external keyup; pointer interruption is cancelled separately.
window.addEventListener('blur', () => dispatch({ type: 'suspend' }));
window.addEventListener('focus', () => dispatch({ type: 'resume' }));
document.addEventListener('visibilitychange', () => {
  dispatch({ type: document.hidden ? 'suspend' : 'resume' });
});
for (const button of document.querySelectorAll('[data-key]')) {
  button.addEventListener('pointerdown', event => {
    button.setPointerCapture(event.pointerId);
    dispatch({ type: 'down', key: button.dataset.key, source: 'pointer' });
  });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    button.addEventListener(name, () => dispatch({ type: 'up', key: button.dataset.key, source: 'pointer' }));
  }
}
document.querySelector('#advance').onclick = () => execute({ type: 'advance' });
document.querySelector('#idle').onclick = () => dispatch({ type: 'idle' });
document.querySelector('#art').onclick = () => dispatch({ type: 'art', missing: !state.portraitMissing });
document.querySelector('#profile').onchange = () => { state.revision++; present(); };
document.querySelector('#reload').onclick = () => location.reload();

// A new name isolates a deliberate fixture run; it never resets the old breeding DB.
const requestedRun = new URL(location.href).searchParams.get('run');
const run = requestedRun && /^[a-zA-Z0-9-]{1,40}$/.test(requestedRun) ? requestedRun : 'default';
document.querySelector('#fresh').onclick = () => {
  const url = new URL(location.href);
  url.searchParams.set('run', crypto.randomUUID());
  location.href = url;
};
try {
  repository = await openRepository(indexedDB, 'critter-lab-founder-demo-v1-' + run);
  const saved = await repository.read();
  state = transition(state, { type: 'restore', envelope: saved.envelope }).state;
} catch (error) {
  state = transition(state, { type: 'error', message: error.message }).state;
}
present();

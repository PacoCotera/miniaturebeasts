import { createPresentation, updatePresentation } from '../presentation-controller.mjs';
import { mapPresentation } from '../presentation-view.mjs';
import { validateObservation } from '../presentation-data.mjs';
import { renderTransfer, slots } from './render.mjs';
import { createInputGate } from './input.mjs';

const fixtures = await (await fetch('/transfer/browser/observations.json')).json();
Object.values(fixtures.observations).forEach(validateObservation);
const device = document.querySelector('#device');
const canvas = document.querySelector('#screen');
const context2d = canvas.getContext('2d', { alpha: false });
const controls = Object.fromEntries(['scenario', 'palette', 'render-delay', 'read-delay', 'response'].map(id => [id, document.getElementById(id)]));
const gate = createInputGate();
let state;
let instance = 0;
let frameId = 0;
let drawnFrame = null;
let caller = false;
let lastFrame = null;
let pointer = null;
let drawTimer = null;
let readyCallback = null;
const counts = { reads: 0, reconciles: 0, rejectedDraws: 0, cancelledDraws: 0, rejectedReady: 0 };

function delayValue(name) {
  return Math.max(0, Math.min(2000, Number(controls[name].value) || 0));
}
function view() {
  return mapPresentation(state);
}
function diagnostics() {
  document.querySelector('#diagnostics').textContent = JSON.stringify({
    fixture: true, instance, frameId, drawnFrame, input: gate.snapshot(), caller,
    status: view().status, page: view().page, focus: state.focus, revision: state.revision,
    loading: state.loading, requestToken: state.requestToken, pendingDraws: drawTimer === null ? 0 : 1, counts,
  }, null, 2);
}
function present() {
  const requestedFrame = ++frameId;
  gate.request(requestedFrame); // Revoke readiness before scheduling any drawing.
  if (drawTimer !== null) {
    clearTimeout(drawTimer);
    drawTimer = null;
    counts.cancelledDraws++;
  }
  if (readyCallback !== null) cancelAnimationFrame(readyCallback);
  const composition = renderTransfer(view(), controls.palette.value, caller);
  diagnostics();
  drawTimer = setTimeout(() => {
    drawTimer = null;
    if (requestedFrame !== frameId) {
      counts.rejectedDraws++;
      diagnostics();
      return;
    }
    const rgba = new Uint8ClampedArray(640 * 480 * 4);
    const palette = composition.palette.map(hex => [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16)));
    for (let index = 0; index < composition.pixels.length; index++) {
      const color = palette[composition.pixels[index]];
      rgba.set([...color, 255], index * 4);
    }
    context2d.putImageData(new ImageData(rgba, 640, 480), 0, 0);
    drawnFrame = requestedFrame;
    lastFrame = composition;
    readyCallback = requestAnimationFrame(() => {
      readyCallback = requestAnimationFrame(() => {
        readyCallback = null;
        if (requestedFrame !== frameId) {
          counts.rejectedReady++;
          diagnostics();
          return;
        }
        gate.ready(requestedFrame);
        diagnostics();
      });
    });
    diagnostics();
  }, delayValue('render-delay'));
}

function supply(effect, responseName = controls.response.value) {
  counts.reads++;
  if (effect.type === 'reconcile') counts.reconciles++;
  if (responseName === 'drop') {
    diagnostics();
    return;
  }
  const observation = structuredClone(fixtures.observations[responseName]);
  const requestInstance = instance;
  setTimeout(() => {
    if (requestInstance !== instance) return;
    apply({ type: 'observe', key: effect.key, requestToken: effect.requestToken, observation });
  }, delayValue('read-delay'));
}

function apply(event) {
  const result = updatePresentation(state, event);
  if (result.state === state) return;
  state = result.state;
  for (const effect of result.effects) {
    if (effect.type === 'navigate-back') caller = true;
    else supply(effect);
  }
  present();
}

function activate(action) {
  if (caller) {
    if (action !== 'reenter') return;
    caller = false;
    apply({ type: 'select', key: fixtures.key, context: state.context, caller: 'collection' });
    return;
  }
  apply({ type: 'action', action, revision: state.revision, key: state.key });
}

function focusedAction() { return caller ? 'reenter' : state.focus; }
function move(direction) {
  if (caller) return;
  const actions = view().actions.filter(action => action.enabled);
  const index = actions.findIndex(action => action.id === state.focus);
  const next = actions[(index + direction + actions.length) % actions.length];
  apply({ type: 'focus', action: next.id, revision: state.revision, key: state.key });
}
function keyCommand(event) {
  if (['ArrowLeft', 'ArrowUp'].includes(event.code)) return { move: -1 };
  if (['ArrowRight', 'ArrowDown'].includes(event.code)) return { move: 1 };
  if (event.code === 'Enter') return { action: focusedAction() };
  if (event.code === 'Escape') return { action: caller ? null : 'back' };
  const index = ['Digit1', 'Digit2', 'Digit3'].indexOf(event.code);
  return index < 0 ? null : { action: slots(view(), caller)[index]?.id ?? null };
}
device.addEventListener('keydown', event => {
  const command = keyCommand(event);
  if (!command) return;
  event.preventDefault();
  if (gate.down('key:' + event.code, { keyboard: true, repeat: event.repeat, back: command.action === 'back' })) {
    if (command.move) move(command.move);
    else if (command.action) activate(command.action);
  }
  diagnostics();
});
device.addEventListener('keyup', event => {
  gate.up('key:' + event.code);
  diagnostics();
});

for (const button of device.querySelectorAll('[data-slot]')) {
  button.addEventListener('pointerdown', event => {
    event.preventDefault();
    device.focus();
    const action = slots(view(), caller)[Number(button.dataset.slot)];
    const token = 'pointer:' + event.pointerId;
    const accepted = gate.down(token, { back: action?.id === 'back' });
    pointer = accepted && action?.enabled ? { id: event.pointerId, token, action: action.id, frame: frameId, button } : null;
    button.setPointerCapture(event.pointerId);
    diagnostics();
  });
  button.addEventListener('pointerup', event => {
    const pending = pointer;
    pointer = null;
    gate.up('pointer:' + event.pointerId);
    const bounds = button.getBoundingClientRect();
    const inside = event.clientX >= bounds.left && event.clientX < bounds.right && event.clientY >= bounds.top && event.clientY < bounds.bottom;
    if (pending?.id === event.pointerId && pending.frame === frameId && inside && (pending.action === 'back' || gate.isReady())) activate(pending.action);
    diagnostics();
  });
  function cancel(event) {
    pointer = null;
    gate.up('pointer:' + event.pointerId);
    diagnostics();
  }
  button.addEventListener('pointercancel', cancel);
  button.addEventListener('lostpointercapture', cancel);
  button.addEventListener('click', event => event.preventDefault()); // Only physical down/up can activate.
}

function suspend() {
  gate.suspend();
  pointer = null;
  diagnostics();
}
device.addEventListener('focusin', () => {
  if (!document.hidden) gate.resume();
  diagnostics();
});
device.addEventListener('focusout', event => {
  if (!device.contains(event.relatedTarget)) suspend();
});
window.addEventListener('blur', suspend);
window.addEventListener('focus', () => {
  if (device.contains(document.activeElement) && !document.hidden) gate.resume();
  diagnostics();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) suspend();
  else if (device.contains(document.activeElement)) gate.resume();
  diagnostics();
});

function reset() {
  const name = controls.scenario.value;
  instance++;
  caller = false;
  pointer = null;
  const context = name.startsWith('preview') ? 'preview' : name === 'requested' ? 'requested' : 'neutral';
  state = createPresentation({ instanceId: 'browser_' + instance, key: fixtures.key, context, caller: 'collection' });
  // Seed last-known facts for unavailable/read-error review without reading a probe.
  const sequence = ['unavailable', 'unreadable'].includes(name) ? ['confirmed', name] : [name];
  for (const fixture of sequence) {
    const request = updatePresentation(state, { type: 'refresh' });
    state = updatePresentation(request.state, { type: 'observe', key: fixtures.key, requestToken: request.state.requestToken, observation: fixtures.observations[fixture] }).state;
  }
  controls.response.value = name;
  present();
}
controls.scenario.addEventListener('change', reset);
controls.palette.addEventListener('change', present);
document.querySelector('#refresh').addEventListener('click', () => apply({ type: 'refresh' }));

// Read-only instrumentation for the browser validation harness; no mutation hooks.
window.transferStudy = {
  snapshot: () => structuredClone({ state, caller, frameId, drawnFrame, pendingDraws: drawTimer === null ? 0 : 1, input: gate.snapshot(), counts }),
  pixels: () => lastFrame ? Array.from(lastFrame.pixels) : [],
};
reset();

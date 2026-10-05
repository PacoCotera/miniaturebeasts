import { portrait } from './art.mjs';
import { forecast, STARTER_PARENTS } from './genetics.mjs';
import { createIdleController } from './idle-controller.mjs';

// Only authored SVG from art.mjs enters this page; no file or stored markup is read.
const variants = Array.from({ length: 8 }, (_, i) => ({ crown: Boolean(i & 4), eyes: Boolean(i & 2), pale: Boolean(i & 1) }));
const treatments = {
  color: {
    note: 'Color study uses the original placeholder SVG palette. An optional hatch motion study is available below; hardware motion is untested. Core content is shared across treatments.',
    facts: 'Candidate reference: Waveshare 5.5-inch HDMI AMOLED · 1080 × 1920 native portrait, rotatable · documented 60 Hz · HDMI video. This smaller screen is not physically equivalent to the e-paper candidates.',
    link: 'https://www.waveshare.com/wiki/5.5inch_HDMI_AMOLED',
  },
  mono: {
    note: 'Monochrome study uses the authored grayscale portrait with black outlines. Gray fills are retained: this is not a one-bit thermal print or a verified e-paper rendering.',
    facts: 'Candidate reference: Waveshare current 7.5-inch e-Paper HAT V2 · 800 × 480 · SPI · 4 s full / 0.4 s partial refresh per vendor; revision and refresh policy need verification.',
    link: 'https://www.waveshare.com/wiki/7.5inch_e-Paper_HAT_Manual',
  },
  six: {
    note: 'Six-color palette simulation only. SVG fills map to black, white, red, green, blue, and yellow; browser antialiasing adds intermediate edge colors. No dithering or calibrated panel appearance. Pale bodies become white and frills red, deliberately exposing palette tradeoffs.',
    facts: 'Candidate reference: Waveshare 7.3-inch Spectra 6 (E) · 800 × 480 · SPI · documented 25 s full refresh. This instant browser switch does not model that refresh or prove physical panel quality.',
    link: 'https://www.waveshare.com/wiki/7.3inch_e-Paper_HAT_%28E%29_Manual',
  },
};
let mode = 'color';
let selected = 6;
const screens = ['research', 'forecast', 'hatch', 'dossier'];
let screen = 'research';
let motionEnabled = false;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let greetingTimer;
const idleScenes = ['Collection', 'Research machine', 'Encyclopaedia'];
const $ = id => document.getElementById(id);
let idleWasRunning = false;
let previousIdleIndex = 0;
let activeViewContext = null;
const idle = createIdleController({
  hidden: document.hidden,
  focused: document.hasFocus(),
  onChange({ running, index, automaticEnabled }) {
    const entering = running && !idleWasRunning;
    const exiting = !running && idleWasRunning;
    if (entering) activeViewContext = captureActiveView();
    $('idle-toggle').textContent = running ? 'Stop idle preview' : 'Start idle preview';
    $('idle-toggle').setAttribute('aria-pressed', String(running));
    $('automatic-idle').checked = automaticEnabled;
    if (entering || exiting || (running && index !== previousIdleIndex)) renderScreen();
    if (exiting) restoreActiveView();
    idleWasRunning = running;
    previousIdleIndex = index;
  },
});
const labels = x => [x.crown ? 'Crown frill' : 'Small frill', x.eyes ? 'Ringed eyes' : 'Plain eyes', x.pale ? 'Pale markings' : 'Dark markings'];

function captureActiveView() {
  const focusedElement = document.activeElement;
  const focusId = focusedElement?.id || null;
  const focusScene = focusedElement?.dataset?.scene || null;
  return {
    focusedElement,
    focusId,
    focusScene,
    contentTop: $('screen-content').scrollTop,
    contentLeft: $('screen-content').scrollLeft,
    viewportLeft: $('viewport').scrollLeft,
    pageX: window.scrollX,
    pageY: window.scrollY,
  };
}

function restoreActiveView() {
  if (!activeViewContext || document.hidden || !document.hasFocus()) return;
  const context = activeViewContext;
  let focusTarget = context.focusedElement;
  if (!focusTarget?.isConnected) {
    focusTarget = context.focusId ? document.getElementById(context.focusId) : null;
    if (!focusTarget && context.focusScene) {
      focusTarget = $('screen-content').querySelector(`[data-scene="${context.focusScene}"]`);
    }
  }
  if (!focusTarget || focusTarget === document.body || !focusTarget.getClientRects().length) {
    focusTarget = $('screen-content');
  }
  focusTarget.focus({ preventScroll: true });
  $('screen-content').scrollTop = context.contentTop;
  $('screen-content').scrollLeft = context.contentLeft;
  $('viewport').scrollLeft = context.viewportLeft;
  window.scrollTo(context.pageX, context.pageY);
  activeViewContext = null;
}

function art(expression) {
  let svg = portrait(expression, mode === 'mono');
  if (mode === 'mono') return svg.replaceAll('#303a36', '#000');
  if (mode !== 'six') return svg;
  const palette = { '#303a36': '#000000', '#d9e9d8': '#ffffff', '#79a69a': '#008000', '#d8895d': '#ff0000', '#d9d4bd': '#ffff00', '#fff': '#ffffff' };
  return svg.replace(/#[0-9a-f]{6}|#[0-9a-f]{3}\b/gi, value => palette[value.toLowerCase()] ?? value);
}

function renderScreen() {
  clearTimeout(greetingTimer);
  if (idle.snapshot().running) { renderIdle(); return; }
  document.querySelectorAll('[data-screen]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.screen === screen)));
  $('screen-title').textContent = `${screen.toUpperCase()} / FIXTURE`;
  $('screen-status').textContent = `Screen ${screens.indexOf(screen) + 1} of 4 · Fixed fixtures only; navigation does not progress a game or simulate actual display refresh.`;
  $('scene-caveat').textContent = screen === 'hatch'
    ? 'Compact reveal alternative, not an approved design. This selected appearance is not an offspring generated from the forecast. No birth, ownership, or collection record is created; carried traits are unassigned. View dossier opens the detail study.'
    : 'All scenes are unsaved review fixtures. Individual identity and working family labels are illustrative; selecting an appearance does not create a pet.';
  const appearance = variants[selected];
  const identity = `<h2>Study individual ${String(selected + 1).padStart(2, '0')}</h2><p class="small"><strong>Individual ID:</strong> review-fixture:${selected + 1}<br>Illustrative identity; not a saved pet.</p><p class="small"><strong>Family:</strong> Frilled quadruped<br>Working body-family label, not an approved species.</p>`;
  let content;
  if (screen === 'research') {
    content = `<div class="research-layout"><div><div class="vessel" aria-hidden="true"></div><p class="small" style="text-align:center">Concept research vessel</p></div><div><span class="pill">FIXED RESEARCH EXAMPLE</span><h2>Could pale markings emerge?</h2><p>Study a Mist Thread sample before predicting an offspring.</p><p><strong>Finding:</strong> In the draft rules, a sample can activate carried pale markings.</p><p class="small">This scene does not collect sensor evidence, award a sample, or run a timer. The next forecast deliberately shows inheritance without a sample.</p></div></div>`;
  } else if (screen === 'forecast') {
    const chances = forecast(...STARTER_PARENTS);
    content = `<div class="parents">${STARTER_PARENTS.map((parent, i) => `<figure>${art(parent.expression)}<figcaption>Individual: Starter ${i + 1}<br>ID: ${parent.id}</figcaption></figure>`).join('<strong aria-hidden="true">+</strong>')}</div><p class="small">Family: Frilled quadruped (working label) · Both starters</p>${[['crown', 'Crown frill'], ['eyes', 'Ringed eyes'], ['pale', 'Pale markings']].map(([trait, label]) => {
      const percent = Math.round(chances[trait] * 100);
      return `<div class="forecast-row"><span>${label}</span><div class="bar" aria-hidden="true"><span style="width:${percent}%"></span></div><strong>${percent}%</strong></div>`;
    }).join('')}<p class="small">Expressed-trait probabilities from imported draft genetics. No sample applied. Traits can occur together; percentages do not sum to 100%.</p>`;
  } else if (screen === 'hatch') {
    content = `<div class="hatch-layout compact-reveal"><div class="portrait hatch-portrait">${art(appearance)}</div><div><p class="eyebrow">A new face</p><h2 class="hatch-name">Study individual ${String(selected + 1).padStart(2, '0')}</h2><p class="small"><strong>Individual ID:</strong> review-fixture:${selected + 1}</p><p><strong>Family</strong><br>Frilled quadruped</p><p><strong>Expressed traits</strong><br>${labels(appearance).join('<br>')}</p><button type="button" class="scene-action" data-scene="dossier">View dossier →</button> <button type="button" class="scene-action" id="greet" hidden>Greet</button><p id="greeting-status" class="small" role="status" aria-live="polite"></p></div></div>`;
  } else {
    content = `<div class="dossier"><div class="portrait">${art(appearance)}<button type="button" class="scene-action" data-scene="hatch">← Back to hatch reveal</button></div><div class="details"><span class="pill">APPEARANCE FIXTURE</span>${identity}<strong class="small">Expressed traits</strong><ul>${labels(appearance).map(label => `<li>${label}</li>`).join('')}</ul><p class="small"><strong>Carried but unexpressed:</strong><br>Not assigned. Appearance alone cannot tell us.</p></div></div>`;
  }
  $('screen-content').innerHTML = content;
  $('screen-content').scrollTop = 0;
  $('screen-footer').textContent = screen === 'hatch' ? 'REVEAL STUDY · Details available in the dossier' : 'REVIEW SCENE ONLY · Use the screen controls above';
  updateMotion();
}

function renderIdle() {
  const idleIndex = idle.snapshot().index;
  $('screen-title').textContent = `IDLE / ${idleScenes[idleIndex].toUpperCase()}`;
  $('screen-status').textContent = `Idle preview ${idleIndex + 1} of 3 · Provisional 12-second cycle, paused while this page is hidden.`;
  $('scene-caveat').textContent = 'Proposed idle compositions, not approved art or content. Illustrative collection records, research status, and encyclopaedia entry; no actual research advances or specimens change. Exit restores the active review screen.';
  $('viewport').classList.remove('motion-on');
  let content;
  if (idleIndex === 0) {
    content = `<h2>Collection / specimen views</h2><div class="parents">${[2, 5, 6].map(index => `<figure>${art(variants[index])}<figcaption>Individual: Study ${index + 1}<br>ID: review-fixture:${index + 1}</figcaption></figure>`).join('')}</div><p>Family: Frilled quadruped (working label)</p><p class="small">Three illustrative individuals from one family. Fixed appearances, not a real collection.</p>`;
  } else if (idleIndex === 1) {
    content = `<div class="research-layout"><div><div class="vessel" aria-hidden="true"></div></div><div><p class="eyebrow">Research machine</p><h2>A question is taking shape</h2><p>Could carried pale markings emerge?</p><p class="small">Illustrative study: Mist Thread<br>Status: fixed research scene</p><p>No live readings, elapsed timer, new finding, or reward.</p></div></div>`;
  } else {
    content = `<div class="dossier"><div class="portrait">${art(variants[6])}</div><div><p class="eyebrow">Encyclopaedia / FAMILY ARTICLE</p><h2>Frilled quadruped</h2><p>Working family label.</p><p><strong>Trait variation:</strong> frill shape, eye rings, pale markings.</p><p class="small">Family-level illustration; this is not an individual pet. Content and entry structure remain provisional.</p></div></div>`;
  }
  $('screen-content').innerHTML = content;
  $('screen-content').scrollTop = 0;
  $('screen-footer').textContent = 'IDLE PREVIEW · Interact to return';
}

function updateMotion() {
  const colorStudy = mode === 'color';
  $('motion-study').disabled = !colorStudy;
  $('motion-study').checked = motionEnabled && colorStudy;
  const active = colorStudy && motionEnabled && screen === 'hatch' && !idle.snapshot().running;
  $('viewport').classList.toggle('motion-on', active && !reducedMotion.matches);
  $('viewport').classList.toggle('page-hidden', document.hidden);
  if ($('greet')) $('greet').hidden = !active;
  $('motion-note').textContent = !colorStudy
    ? 'Static palette preview. Motion is unavailable in monochrome and six-color studies; no e-paper motion capability is implied.'
    : !motionEnabled ? 'Motion is off. The specimen dossier stays still for inspection.'
    : reducedMotion.matches ? 'Reduced-motion preference respected: no animation. Greet still provides a text response on the hatch view; no rewards or pet state change.'
    : 'Color hatch view only: gentle breathing and a Greet response. Proposed motion treatment, not approved animation or measured hardware performance. The dossier remains still.';
}

function render() {
  document.body.className = mode;
  document.querySelectorAll('[data-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === mode)));
  $('mode-note').textContent = treatments[mode].note;
  $('candidate').replaceChildren(document.createTextNode(`${treatments[mode].facts} `));
  const source = document.createElement('a');
  source.href = treatments[mode].link;
  source.textContent = 'Vendor documentation';
  $('candidate').append(source);
  renderScreen();
  $('variants').innerHTML = variants.map((expression, i) => `<button class="variant" type="button" data-variant="${i}" aria-pressed="${i === selected}" aria-label="Inspect variant ${i + 1}: ${labels(expression).join(', ')}"><span class="eyebrow">Variant ${String(i + 1).padStart(2, '0')}</span>${art(expression)}<span class="caption">${labels(expression).join('<br>')}</span></button>`).join('');
}

document.querySelector('.toolbar').addEventListener('click', event => {
  const button = event.target.closest('[data-mode]');
  if (!button || !treatments[button.dataset.mode]) return;
  mode = button.dataset.mode;
  render();
});
$('variants').addEventListener('click', event => {
  const button = event.target.closest('[data-variant]');
  if (!button) return;
  selected = Number(button.dataset.variant);
  screen = 'dossier';
  render();
  $('variants').querySelector(`[data-variant="${selected}"]`).focus();
});
document.querySelector('.flow-controls').addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (screens.includes(button.dataset.screen)) screen = button.dataset.screen;
  else if (button.id === 'previous-screen') screen = screens[(screens.indexOf(screen) + screens.length - 1) % screens.length];
  else if (button.id === 'next-screen') screen = screens[(screens.indexOf(screen) + 1) % screens.length];
  renderScreen();
});
$('native-layout').addEventListener('change', event => {
  $('viewport').classList.toggle('native', event.target.checked);
});
$('screen-content').addEventListener('click', event => {
  if (event.target.closest('#greet')) {
    $('greeting-status').textContent = 'Study critter notices your greeting. Preview only; no care, rewards, or saved state changed.';
    const target = document.querySelector('.hatch-portrait');
    if (target && !reducedMotion.matches && !document.hidden) {
      target.classList.remove('greeting');
      void target.offsetWidth;
      target.classList.add('greeting');
      clearTimeout(greetingTimer);
      greetingTimer = setTimeout(() => target.classList.remove('greeting'), 650);
    }
    return;
  }
  const button = event.target.closest('[data-scene]');
  if (!button || !screens.includes(button.dataset.scene)) return;
  screen = button.dataset.scene;
  renderScreen();
  $('screen-content').focus();
});
$('motion-study').addEventListener('change', event => {
  motionEnabled = event.target.checked;
  updateMotion();
});
reducedMotion.addEventListener('change', updateMotion);
document.addEventListener('visibilitychange', updateMotion);
document.addEventListener('visibilitychange', () => idle.setHidden(document.hidden));
window.addEventListener('blur', () => idle.setFocused(false));
window.addEventListener('focus', () => {
  idle.setFocused(true);
  if (!idle.snapshot().running) restoreActiveView();
});
$('automatic-idle').checked = false;
$('automatic-idle').addEventListener('change', event => {
  idle.setAutomatic(event.target.checked);
});
$('idle-toggle').addEventListener('click', () => idle.toggle());

// Consume the wake gesture before it reaches a control underneath the idle view.
// A pointer cancellation ends only that pointer gesture, never a keyboard action.
function consumeInput(event, consume) {
  if (!consume) return;
  event.preventDefault();
  event.stopImmediatePropagation();
}

document.addEventListener('keydown', event => {
  if (!event.isTrusted) return;
  consumeInput(event, idle.keyDown({
    key: event.key,
    code: event.code || event.key,
    onToggle: Boolean(event.target.closest('#idle-toggle')),
  }));
}, true);

document.addEventListener('keyup', event => {
  if (!event.isTrusted) return;
  consumeInput(event, idle.keyUp({ key: event.key, code: event.code || event.key }));
}, true);

document.addEventListener('pointerdown', event => {
  if (!event.isTrusted) return;
  consumeInput(event, idle.pointerDown({
    pointerId: event.pointerId,
    onToggle: Boolean(event.target.closest('#idle-toggle')),
  }));
}, true);

document.addEventListener('pointercancel', event => {
  if (!event.isTrusted) return;
  idle.pointerCancel({ pointerId: event.pointerId });
}, true);

document.addEventListener('click', event => {
  if (!event.isTrusted) return;
  consumeInput(event, idle.click({
    pointerId: event.pointerId,
    pointerOrigin: event.detail > 0 || Boolean(event.pointerType),
  }));
}, true);
document.addEventListener('pointerup', event => {
  if (event.isTrusted) idle.pointerUp({ pointerId: event.pointerId });
}, true);
for (const eventName of ['pointermove', 'wheel']) {
  document.addEventListener(eventName, event => {
    if (event.isTrusted) idle.activity();
  }, { passive: true, capture: true });
}
render();

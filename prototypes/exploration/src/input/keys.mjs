// The keyboard's keys as the Companion's seven controls (up, down, left, right, confirm, back, call), and how a held direction repeats. No page state.

// By where the key sits (event.code), so WASD stays under the left hand on every layout; then by what it types (event.key), for a keyboard that reports no position.
const BY_CODE = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right',
  Enter: 'confirm', NumpadEnter: 'confirm', Space: 'confirm', Escape: 'back', Backspace: 'back', KeyC: 'call' };
const BY_KEY = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right',
  ' ': 'confirm', Enter: 'confirm', Escape: 'back', Backspace: 'back', c: 'call', C: 'call' };
// The control a keyboard event presses, or null when the key is not one of the Companion's.
export const keyOf = (e) => BY_CODE[e.code] || BY_KEY[e.key] || null;

// Tap = one creeping step. Holding repeats as walking at a steady rate that matches the slide.
export const REPEAT_DELAY = 230, REPEAT_EVERY = 150;

// The Companion's sounds: short square-wave blips, written as [Hz, ms] notes; no files. One table, one player.

export const SOUNDS = {
  // an act that takes or gives something (the page's JUICE table has the same keys)
  stone:  [[330, 60], [660, 90]],              // a stone's charge
  cup:    [[520, 60], [660, 70]],              // a cup of dew
  tuft:   [[440, 60], [550, 70]],              // a tuft on the ground
  press:  [[392, 60], [588, 90]],              // fruit pressed at a stone
  fruit:  [[500, 70]],                         // fruit picked up
  pod:    [[262, 80], [392, 80], [523, 110]],
  slab:   [[130, 110], [98, 90]],
  prints: [[600, 50], [450, 70]],
  note:   [[600, 60], [800, 90]],
  feed:   [[500, 70], [700, 70]],
  strike: [[700, 50], [900, 80]],
  // the end tally
  tallyPod:    [[110, 70], [82, 90]],          // a pod counted: a knock
  tallySettle: [[392, 90], [523, 90], [659, 150]],
};
// a find (row 1) or a page (row 2) counted in the end tally: one tick, higher with each
export const tallyTick = (row, n) => [[520 + row * 120 + n * 40, 40]];

let ac = null, off = false, warned = false;
// The Options panel's mute, set once at boot.
export function soundOff(on) { off = !!on; }
// Plays the notes one after the other. Where there is no audio the game goes on in silence; the reason is logged once.
export function playNotes(notes) {
  if (off || typeof AudioContext === 'undefined') return;
  try {
    ac = ac || new AudioContext(); if (ac.state === 'suspended') ac.resume();
    let t = ac.currentTime;
    for (const [hz, ms] of notes) { const o = ac.createOscillator(), g = ac.createGain(); o.type = 'square'; o.frequency.value = hz; g.gain.setValueAtTime(0.04, t); g.gain.linearRampToValueAtTime(0, t + ms / 1000); o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + ms / 1000); t += ms / 1000 * 0.8; }
  } catch (e) { if (!warned) { warned = true; console.warn('no sound', e); } }
}

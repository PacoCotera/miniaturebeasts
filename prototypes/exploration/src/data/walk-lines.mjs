// Words of the walk in a place: the names of what is carried, the partner's field habits, the pod tags, what a Wait reports, and why calm did or did not play.

export const MAT = { e: 'Energy', d: 'Data', s: 'Essence' };

// The line a field habit shows the first time it fires in a walk (the Loika's calm has its own line already).
export const HABIT_LINE = {
  tiptoe: n => n + ' tiptoes softly', 'stone-sense': n => n + ' feels the stone for warmth', 'beacon-sit': n => n + ' sits by the beacon a while',
  'dew-find': n => n + ' found the dew first', 'hop-down': n => n + ' hops down the slope', dig: n => n + ' dug the burrow out wide enough', 'bank-dig': n => n + ' dug a way up the bank' };

// The hold's column is narrow: the six newest hows have a short form there (the Ground row keeps the full tag).
export const HOW_SHORT = { grab: 'grabbing fruit', warm: 'warm stone', dig: 'in a fresh hole', fog: 'in a fog bank', still: 'keeping still', air: 'airing scales' };

// What a Wait says a creature in view did, [one, several]. ROUTINE is by kind (back to its routine); ROUTINE_ANY is a kind not yet identified.
export const ROUTINE = [['grazes again', 'graze again'], ['pokes about again', 'poke about again'], ['potters about again', 'potter about again'],
  ['climbs about again', 'climb about again'], ['waddles about again', 'waddle about again'], ['noses about again', 'nose about again'], ['lumbers about again', 'lumber about again'],
  ['pushes on again', 'push on again'], ['strides about again', 'stride about again'], ['is at play again', 'are at play again'], ['plods on again', 'plod on again'],
  ['flutters about again', 'flutter about again'], ['picks its way about again', 'pick their way about again'], ['slides along again', 'slide along again'], ['walks on again', 'walk on again'],
  ['floats about again', 'float about again'], ['sways along again', 'sway along again'], ['glides about again', 'glide about again'], ['hops about again', 'hop about again'],
  ['rambles about again', 'ramble about again']];
export const ROUTINE_ANY = ['is at ease again', 'are at ease again'];
export const VERB = { view: ['comes into view', 'come into view'], ate: ['finished its meal', 'finished their meals'], eat: ['is eating', 'are eating'], seek: ['heads for the fruit', 'head for the fruit'],
  run: ['runs off', 'run off'], cover: ['heads for cover', 'head for cover'], settle: ['settles a little more', 'settle a little more'], wander: ['wanders', 'wander'],
  hole: ['ducks into a hole', 'duck into holes'], gone: ['moves out of sight', 'move out of sight'] };

// Why calm did or did not play in its window (the day's log; the bot counts them by cause).
export const calmWhy = { played: 'played', lost: 'she heard you and the calm was lost', none: 'the place has no wary one', drawn: 'the wary one did not come within its window', busy: 'the wary one was hidden or heard when the window came', away: 'she was hidden or gone when the window came', off: 'the wary one came and was kept off by the explorer\'s stand', came: 'the wary one came and she was not at her haunt', win: 'she has no free part of day for it' };

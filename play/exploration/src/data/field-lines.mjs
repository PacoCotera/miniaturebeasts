// The lines the field says, one table per speaker, so the words change without code: the first walk's goal and teaching lines, the bag choice at a find,
// the signs' lines, what an act that takes or gives answers, and the dock's lines. A [copy] mark is a line still waiting for the copywriter's final word.
import { WORDS } from "./words.mjs";

// The first walk (before the first pod is home): every player string of it.
export const FIRST_TEXT = {
  goal: { find: 'Find a Loika · feed her', feed: name => name + ' · feed her', pod: name => name + ' left a pod · at her bed', home: 'Bring it home · back to the start',
    dock: 'Dock the Companion · the pod goes home', dockFinds: 'Dock the Companion · your finds go home' },   // [copy] find, feed, pod, dockFinds
  teach: { setOut: 'Press ✓ to set out', place: 'Start at a glint · ✓ starts there', go: 'Press ✓ to go into this place', pod: 'Go to the glint · ✓ takes the pod',
    stone: 'A charged stone · ✓ takes its Energy', end: '← then End · your finds go in a crate', dock: 'Dock: the key below',
    endHere: '← End · your finds go in a crate' },
  face: { still: 'Keep still', beat: 'Face the beat', pod: 'Face the pod', stone: 'Face the stone', turn: dir => 'Turn ' + dir },   // the ✓ words on the walk, facing nothing (the way back is SEND_TXT.way)
  empty: { later: 'A pod waits', look: 'Still looking', rock: 'Pods sleep in woods and rock', where: (land, dir) => 'In the ' + land + ', ' + (dir ? dir + ' of where you set out' : 'where you set out') + '.',   // [copy]
    start: 'Start there and press ))) Call.', back: 'Back to the pod' },
};
export const GOAL_MARK = { slot: 'goal-mark-12', w: 12 };   // [art] the goal line's mark, an empty named slot: the art director's piece fills it (nothing is drawn in it)

// The bag choice at a find: every player string of the chooser.
export const SWAP_TEXT = { title: 'Your bag is full', sub: 'Keep one of these. The other stays here.', bag: 'In your bag', found: 'Found here', stays: 'stays here',
  foot: 'The one you leave waits here. The map remembers it.', take: 'Take it', leave: 'Leave it here', leaveCtx: p => 'leave the ' + p + ' pod', kept: 'Left it here', swapTitle: 'Swap the pod' };

// A sign's one line (the picture and the once-flag are the page's SIGN table).
export const SIGN_LINE = {
  call: 'Call lifts the veil: finds show', shield: 'Plate lost · lose them all and the Probe breaks',   // [copy] placeholder: the copywriter has the final word ("no plates, Probe breaks" read as "the Probe is broken")
  storm: dir => 'More bolts, more strikes · moving ' + (dir > 0 ? 'east ▶' : 'west ◀'), warn: 'Lightning strikes here next', shelter: 'Overhangs and caves, not trees',
  full: 'Hold full · a new pod is a choice', bank: 'If the Probe breaks, you lose your finds', fog: 'Fog · creatures calm, sight short',
  muffled: 'The fog muffles your Call', fruit: WORDS.fruitSign, putdown: 'Back off · eaters come', warm: 'A warm stone · a little Energy',
  tuft: 'Shed fur · a little Essence', press: 'Pressed fruit · a little Essence', dew: 'Dew refills the cups in fog', strike: WORDS.strike.sign,
  bubbleNotice: 'Noticed you · stop or it runs', bubbleCurious: 'Curious · it comes to you', bubbleFruit: 'Wants your fruit · put it down', bubbleSettle: 'Settling · keep still', bubbleSeek: 'Going for the fruit · let it eat',
  untuva: known => known ? 'Well fed, Untuvas may drop pods' : 'Well fed, these may drop pods', calmkeep: 'Your partner keeps them calm' };

// What an act that takes or gives something answers at once: its line, and what it moved the player toward (null: the act's own line stays).
// The act's sound is the row of the same name in src/sound/blips.mjs; the burst at the thing and the counter's +N are the page's (fxJuice, addMat).
export const JUICE = {
  stone:   { line: n => '+' + n + ' Energy · it goes home in the crate' },   // a stone's charge
  cup:     { line: n => '+' + n + ' Essence · it feeds the Station' },       // a cup of dew
  tuft:    { line: n => '+' + n + ' Essence · it feeds the Station' },       // a tuft on the ground
  press:   { line: n => '+' + n + ' Essence · it feeds the Station' },       // fruit pressed at a stone
  fruit:   { line: () => '+1 fruit · in your hand for her' },               // fruit picked up
  pod:     { line: () => 'A pod · it goes home in the crate' },
  slab:    { line: null },    // the push's own lines say what lay under it
  prints:  { line: null },    // her prints line stays
  note:    { line: null },    // the note's own line stays
  feed:    { line: null },    // the feeding's own line stays
  strike:  { line: null }     // a strike mark's own line stays
};

// Docked: the chip, the refusals and the bay's lines.
export const DOCK_TEXT = { chip: 'Docked', first: 'Field paused while docked · lift to go on · End expedition still works at the start or a lit outpost', again: 'Docked · lift to go on',
  tierMid: 'Tier 2 · from the next expedition', probe: 'Docked · the Station mends it', bay: n => n + ' crate' + (n === 1 ? '' : 's') + ' aboard · the Bay is full',
  sealed: 'Docked · the Bay is full', sealedEmpty: 'Docked' };

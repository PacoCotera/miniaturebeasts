// The player's words for finds, taking, readings and where you are (copywriter rounds cw-g4b and cw-finds-peek, 10 Nov 2026). One table, so the copywriter and editorial can change a word without
// touching the page. Pure data and small pure functions. "Heart" is never player text; dew is never water and never refills; a storm is never a gift or a danger.
export const WORDS = {
  // where you are (bottom line, Call report, band, map line, Probe tile)
  callNextDoor: n => n === 0 ? 'The Call lifted the land next door · no finds' : 'The Call lifted the land next door · ' + n + (n === 1 ? ' find' : ' finds'),   // design b699da, editorial 365ae9 (owner #136): never 'nothing there' when land was lifted
  explored: 'explored', left: 'nothing left to take', leftN: n => n + ' to take', moreN: n => n + ' more to take',
  nothingSeen: 'nothing in sight to take',
  band: { unexplored: 'not explored yet', podWaits: n => n === 1 ? '1 pod waits there' : n + ' pods wait there' },
  reachLine: (n, total, tail) => 'Explored ' + n + ' of ' + total + (tail || ' in reach'), worldLine: (n, all) => 'Explored ' + n + ' of ' + all + ' places',
  // taking things (✓ labels, at most 24 characters)
  takeDew: 'Take the dew',
  slabTake: { mat: 'Pick up the Essence', find: 'Pick up the find' },   // [copy] editorial (bus b3562f, row slab.take): ✓ on the old tile of a pushed slab, what lay under it; 19 characters max
  // refusals and counts against the cap (the thing stays where it is, nothing is spent)
  refuse: {
    dew: cap => 'Your Essence is full (' + cap + ' of ' + cap + ') · the cup keeps its dew', charge: cap => 'Your Energy is full (' + cap + ' of ' + cap + ') · the stone keeps its charge',   // [copy] owner notes #75 #76: the 20 is his hold, not the stone's
    tuft: cap => 'Your Essence is full (' + cap + ' of ' + cap + ') · the tuft stays where it is',
  },
  pressNoRoom: (n, cap) => 'Essence ' + n + ' of ' + cap + ' · no room to press the fruit',
  pressLost: cap => 'Essence full (' + cap + ' of ' + cap + ') · the rest is lost',   // [copy] owner note #15: a press with room for 1 fills to the cap
  stoneKeeps: 'the stone keeps the rest', holdsNoMore: 'the Probe holds no more',
  full: (supply, cap, keeps) => 'Your ' + supply + ' is full (' + cap + ' of ' + cap + ') · ' + (keeps || 'the Probe holds no more'),   // [copy] owner note #75: said the same way as the refusal
  // pressing fruit (✓ labels and the bump line)
  press: { stone: 'Press fruit on the stone', tree: 'Press fruit on the tree', dim: 'Press on a stone or tree', bump: 'Press fruit on a stone or tree · or put it down' },
  // [copy] the HUD line when a step in a place is refused and nothing else says why (placeholders say the meaning only; bug #14)
  block: { stone: 'Stone · in the way', tree: 'Tree · in the way', water: 'Water · no way across', rock: 'Steep rock · no way over', slab: 'A slab · in the way', thing: 'In the way', mibi: 'A mibi is there', partner: 'Your partner is there', pod: 'A pod is there' },
  // [copy] the Data hold is the only limit on a trip; the copywriter writes the words behind these slots (placeholders say the meaning only)
  // [copy] the notice line (lock-playtest-world, owner 2026-11-10 20:18), three slots left empty for the copywriter: saveFailed is shown while a save cannot be written (storage full, a private window, blocked)
  // until a save works again; landChanged while the save names a land (REALM_REV) other than the one this build makes; pageBroke when the page breaks, given the build number from build.json (an empty slot still shows it).
  notice: { saveFailed: "Can't save · leaving loses your game", landChanged: '', pageBroke: build => '' },
  hold: { data: (n, cap) => 'of ' + cap },   // [copy] the cap beside a count held (Data, Energy, Essence): "12 of 20"
  startMorning: 'A Loika comes here in the morning',   // [copy] the first glint of the first set-out: a named Loika's own place (w5-day1-start-1)
  // [copy] the first walk's teaching line on coming near a named Loika (first-walk-teach-approach-1)
  teachWalk: { where: (land, dir) => 'A Loika keeps to the ' + land + ', ' + dir, herePlace: 'She comes here in the morning · wait where you can see',
    near: 'Step slowly near her · ✓ keeps still', tell: 'Keep still · a sign comes first, then ✓ notes it', heard: 'She heard you · keep still and she settles' },
  creature: { holdFull: 'Data full (20 of 20)' },   // [copy] a creature act with the hold full: the creature eats, no Data comes in
  // strike marks: the press, what it adds (the tier of the place sets it), and the hold-full line
  strike: {
    read: 'Read the strike mark', ctx: g => 'strike mark · +' + g + ' Data', ctxShort: g => '+' + g + ' Data',
    press: n => '+' + n + ' Data',   // [copy] said once a strike mark is read
    holdFull: 'Data full · mark stays',   // [copy] facing an unread mark with the hold full: no Read is offered
    sign: 'Lightning struck here · noted as Data', tile: 'Strike mark · Data', tileShort: 'Strike mark', left: ['a strike mark', 'strike marks'], take: 'strike mark',
  },
  // storm glass lies in a few marks on sand; no supply holds it yet, so these wait for the Station to use it
  glass: { take: 'Take the storm glass', sign: 'Storm glass · from lightning on sand', tile: 'Storm glass · from lightning', tileShort: 'Storm glass', left: ['a shard of storm glass', 'shards of storm glass'], takeWord: 'storm glass' },
  // the fruit sign and tile (finds-peek)
  fruitSign: 'Feed · press on stone or tree',
  // the help page
  help: {
    veil: 'On high ground you see further: it lifts 6 tiles around you.',
    dots: 'The dots top left are your reach, one per cell: a dot fills once you have walked most of that place; your cell is framed.',
    call: 'Go down into a place and walk it. Call lifts the veil around you and shows what is there; once you have walked most of a place, its dot fills.',
    data: 'Data comes from strike marks, dark streaks where lightning went into the ground: face one and ✓ Read the strike mark. A mark in the meadow or at the pond edge brings 2 Data, in the wood or the rock field 4, in the cave 5. A mibi brings 1 Data when it eats your fruit and 1 when it settles near you, once each trip. Your hold carries 20 Data. When it is full, you cannot read a mark: it stays where it is, and nothing is spent. A mibi still eats your fruit; it just brings no Data. A few marks on sand hold storm glass.',
  },
  // the world turn's rule, said at End expedition when no place was entered
  waits: 'Nothing explored · the world waits',
};

// [copy] The wild Loika's haunts, in the bottom line beside its name (walk W2; the book's page on the Loika's routines: a friend on the walk, never a claim past the sight)
WORDS.haunt = { reed: 'at the reeds', shore: 'at the water', sweep: 'in the tall grass', grove: 'in the shade', outcrop: 'on the lookout' };

// [copy] W3, ease and the carry (walk-design-1 W3): every line is a working word for the copywriter (placeholders say the meaning only).
WORDS.ease = {
  fed: 'fed',   // her stage word once he has fed her today (habits-out-build-1)
  stage: ['grazing', 'ears up', 'watching', 'gone'],   // her four stages, said under her name
  stirred: 'She stirred · ears up, still curled',   // [copy] night step 5: a sleeper's first heard step only stirs her
  heard: n => n ? n + ' heard that · she is watching' : 'It heard that · it is watching', heardTwice: n => n ? n + ' heard that again · she is going' : 'It heard that again · it is going', gone: n => n ? n + ' has gone from here for the day' : 'It has gone from here for the day', settled: n => n ? n + ' settles again' : 'It settles again',
  // the line under a wild one in sight: whether this step would be heard, by the gait (creep, walk)
  hear: (creep, walk) => 'creep ' + (creep ? 'heard' : 'unheard') + ' · walk ' + (walk ? 'heard' : 'unheard'),
  hearCreep: creep => 'creep ' + (creep ? 'heard' : 'unheard'),   // the short form, for a narrow line
  hearOne: (name, heard) => heard ? name + ' would hear you here' : name + ' would not hear you here',
  stay: n => n > 0 ? 'lets you stay ' + n + ' light' : 'does not let you stay',
  stayShort: n => 'stay ' + n,   // within 2 tiles: the light it lets you stay
  stayHeard: n => n ? n + ' looked up · you stayed too long' : 'It looked up · you stayed too long',
  keep: 'Keep still',   // the ✓ label that holds
  hold: { habit: 'Kept still · one beat', ten: 'Kept still · ten light gone', ease: 'Kept still · its ease changed', tell: 'Kept still · something is starting', weather: 'Kept still · the weather turned', part: 'Kept still · the day turned', over: 'Kept still · the day ends', warn: 'Kept still · lightning is warned', plate: 'Kept still · a plate was lost' },
  keepTo: part => 'Keep still · until ' + part,   // [copy] at camp by day a hold runs to the next part of day
  waitTo: part => 'Wait · until ' + part,   // [copy] the menu's Wait at camp by day
  ctx: 'keep still, and see what it does',
  wildKind: kind => 'a wild ' + kind,   // owner note #111: a named wild one, her kind not yet identified: the bar says what the name is
};
// [copy] W4, habits that play and the notes they give (walk-design-1 W4; the range rule 3A and 3B): working words for the copywriter; the voice is a friend on the walk, never a claim past the sight.
WORDS.habit = {
  name: { shake: 'shaking dry', calm: 'calming a wary one', sleep: 'curling up to sleep', still: 'keeping still' },   // still [copy]: a note of her with no habit in play (habits-out-build-1); editorial's wording to confirm
  // the tell, then the four beats (editorial's page the editorial page on her habits section 1)
  tell: { shake: 'her nose lifts · the rain is thinning', calm: 'she stops · ears up, her head turns', sleep: 'she walks a small circle' },
  beat: {
    shake: ['a shiver runs from her head back', 'the fur flies', 'she turns to the water and trots on', 'the drops settle where she stood'],   // [copy] last beat: no tuft is left (habits-out-build-1); editorial's wording to confirm
    calm: ['she stops and looks', 'she sits a little lower', 'the wary one\'s startle drops', 'it comes closer'],
    sleep: ['she goes round once', 'she folds her legs', 'her nose goes under her tail', 'her breathing slows'],
  },
  // what a note says, by range: the shape only when the sight gives no more (a far note never claims more)
  shape: { shake: 'a small grey shape shivering', calm: 'she has stopped', sleep: 'a round shape low in the grass', still: 'a small shape in the grass' },
  noted: (name, habit, range, said) => name + ' · ' + habit + ' · ' + range + ' · ' + said,
  first: ' · +1 Data', sighting: ' · a sighting · +1 Data', sample: sample => ' · a ' + sample + ' for the Station', noRoom: 'The satchel is full · the sample stays',
  dup: 'You have noted that from here', lost: 'It heard you · the habit is lost', missed: 'The moment passed',
  fed: n => n + ' takes the fruit from your hand. Tonight she sleeps in her pod, if she is left in peace.',   // editorial's line, said when he feeds a named Loika
  rooms: { place: 'where she goes', coat: 'her coat', face: 'her face' },
  asleep: 'asleep, curled up', asleepStirred: ' · she is stirring · no keepsake until she settles',   // [copy] night step 5: a sleeper's note (name, and the tail while she is stirred)
  curledSlot: 'Loika asleep: picture to come',   // [art] night step 5: the named empty slot of her curled token (night-camp piece 11), not signed yet
  sleepPlace: 'where she goes at first light',   // night step 4 [copy]: sleep-curled's last card line, which the dew's prints at her bed give
  // the card line, one per habit, on the forecast line: what the Station still lacks
  card: (habit, want, filled) => habit + ' · ' + (filled ? 'learned: ' : 'still to learn: ') + want,
  cardTail: (want, filled) => (filled ? 'learned: ' : 'still to learn: ') + want,   // the card line's tail, after a note says the habit already
  cardKnown: habit => habit + ' · learned',
  range: { far: 'from far', mid: 'from mid range', near: 'from near' },
  sampleName: { tuft: 'tuft', whisker: 'whisker', claw: 'shed claw' },
};
// [copy] signed 11-24 (the editor, bus 20c7828214): the watch view and the field card (picture 04 and 05, the rule gives by range).
WORDS.watch = {
  head: name => 'Watching ' + name,
  tiles: n => n + (n === 1 ? ' tile' : ' tiles'),
  gives: { shape: 'only her shape from here', place: 'where she goes', coat: 'her coat', face: 'her face, and a sample' },
  strip: (habit, n) => habit + '|' + n + ' of 4', tell: 'the sign',
  note: 'Note', leave: 'leave', nearer: 'closer',   // the bottom line: ✓ Note, ← leave, ▲▼ closer
  card: 'Field note', keep: 'Keep', back: 'back to her', data: '+1 Data',
  sampleTaken: item => 'You took a ' + item + ' · it goes home in the Case', sampleNone: 'No sample', sampleCome: 'get within 2 tiles for a sample',
  onPage: name => 'on ' + name + '’s page',   // the field card's line, back now her page exists (her-page-ui-1; withheld by owner bug #118 until then)
  cardLine: 'Kept in the Log',
};
// [copy] her page (her-page-ui-1): the editor's final strings, her-page-canon-1 section 2. Every row shows only what he has been shown.
WORDS.her = {
  row: name => name + ' · her page', logOk: 'Her page', open: 'Her page',
  watchLine: ['▲▼ closer · ▶ her page', '▶ her page'], others: '◀▶ others met', backTo: 'back',
  count: (i, n) => i + ' of ' + n, kind: 'a wild Loika', turn: t => 'T' + t,
  met: (d, part, t) => 'Met day ' + d + ' · ' + (t ? WORDS.her.turn(t) + ' · ' : '') + part,
  seen: (today, t, place) => ['Last seen ' + (today ? 'today' : 'on an earlier day') + (t ? ' · ' + WORDS.her.turn(t) : ''), place ? 'the ' + place : ''],   // two lines: when, then where
  inCase: 'in the Case', home: 'gone home', pod: where => 'Her young · a pod ' + where, podBed: 'at her bed',
  keeps: 'Where she keeps', bed: 'her bed',
};
// [copy] W4 round 2: her prints at a haunt she has left (walk-design-1 3A): working words for the copywriter. The message says when she was there; the label is the ✓ at the prints.
WORDS.prints = {
  read: 'Read her prints', readCtx: 'read the prints she left',
  when: { dawn: 'at first light', morning: 'this morning', midday: 'at midday', afternoon: 'this afternoon', dusk: 'at dusk', night: 'in the night' },
  whenYday: { dawn: 'at first light yesterday', morning: 'yesterday morning', midday: 'at midday yesterday', afternoon: 'yesterday afternoon', dusk: 'at dusk yesterday', night: 'in the night' },
  line: (name, when) => name + ' was here ' + when,
  bolted: name => name + ' was here · she bolted',
  // night step 4 [copy]: the dew's prints point, and the words name where she went and when she left
  went: (place, at) => ' and left for ' + place + ' ' + at, bed: 'her bed', placeAny: 'another haunt',
  place: { reed: 'the reed bank', shore: 'the shore', sweep: 'the tall grass', grove: 'the grove', outcrop: 'the rocks' },
  leftAt: { dawn: 'at first light', morning: 'in the morning', midday: 'at midday', afternoon: 'in the afternoon', dusk: 'at dusk', night: 'at nightfall' },
  page: ' · her page has it',   // editorial's key (approved still p-5b): the read is on her page
};
// [copy] W5 (walk-design-1): an empty haunt's drop, a wild one's own pod, the end of anonymous pods: working words for the copywriter.
WORDS.w5 = {
  ownTag: name => name + "'s young",
  shedTuft: verb => ' · it left a tuft',
  shedAway: 'Something left a tuft',
};
// [copy] the wind of the land, said in the bottom line's conditions slot until the art director signs a mark (rule 18): it blows toward the named way
WORDS.wind = { N: 'wind to the north', E: 'wind to the east', S: 'wind to the south', W: 'wind to the west' };
WORDS.windShort = { N: 'wind N', E: 'wind E', S: 'wind S', W: 'wind W' };
// [copy] WORKING WORDS (W6a): the target line in the walk's top row: her name, the place she was last seen in, and the way to it (NE; "here" when it is where the explorer stands). The copywriter's job replaces them.
WORDS.target = { line: (name, where, dir) => [name, where, dir ? (dir === 'here' ? 'here' : dir.toUpperCase()) : ''].filter(Boolean).join(' · ') };

// The realm's day (walk-design-1 W1, owner 2026-11-19 16:2x): light counted in actions, six parts of day (*greybox* numbers, the owner's to tune). The world turns only at the night's end.
// Pure: the page and the bots read the same table.
export const DAY = {
  light: 600,   // day-pace-build-1 (owner 2026-11-23: "yes on the 600 action day"; night shorter than the rest): a whole place is walked in one long part
  mapStep: 10,   // *greybox*: a step across the map moves the clock this far (a step in a place, a Wait and keeping still move it 1)
  parts: [['dawn', 50], ['morning', 150], ['midday', 150], ['afternoon', 150], ['dusk', 50], ['night', 50]],   // lengths in light; they add up to `light`
};
// the part of day after `spent` light is gone (0 at dawn); the day's last light is night
export function partOfDay(spent) {
  let left = Math.max(0, spent | 0);
  for (const [name, len] of DAY.parts) { if (left < len) return name; left -= len; }
  return DAY.parts[DAY.parts.length - 1][0];
}
// rest at camp (rest-at-camp-1): from dawn through the afternoon, the next part of day and the light left until its first light; null from dusk on (a hold is ten there)
export function restTarget(spent) {
  const s = Math.max(0, spent | 0); let at = 0;
  for (let i = 0; i < DAY.parts.length - 2; i++) { at += DAY.parts[i][1]; if (s < at) return { name: DAY.parts[i + 1][0], left: at - s }; }
  return null;
}
// how far the clock is from the night (before it starts) or from dawn (at night)
export function clockToNext(spent) {
  const s = Math.max(0, spent | 0), nightAt = DAY.light - DAY.parts[DAY.parts.length - 1][1];
  return s < nightAt ? nightAt - s : Math.max(0, DAY.light - s);
}
// The Log (companion-device-build-1): the Companion's notebook. [copy] WORKING WORDS: the copywriter's job replaces every string here.
// [copy] her-fruit-build-1 (editorial's canon-her-page strings): the fruit from the hand of a named wild Loika
WORDS.fruit = { offer: 'Offer fruit', refuse: 'Not while her ears are up', log: name => name + ' took fruit from your hand.' };
WORDS.book = {
  title: 'Log', day: n => 'Day ' + n, earlier: 'earlier pages', field: 'field', moves: '▲▼', empty: 'Nothing written yet.',
  atFlag: 'at the flag', fromFlag: dir => dir + ' of the flag', place: p => 'the ' + p,
  head: (part, turn, place) => (turn ? 'T' + turn + ' · ' : '') + part + ' · ' + WORDS.book.place(place),   // the editor's heading (bus 74d0ebc9f4): 'T9 · morning · the Meadow'; no turn (an old save): 'morning · the Meadow'
  prints: (name, when) => 'Prints in the grass. ' + name + ' was here ' + when + '.',
  met: name => 'Met her. She is ' + name + ' now.',
  habit: (name, hab, range, said) => name + ', ' + hab + ', ' + range + ': ' + said + '.',
  near: name => 'Crept to two steps from ' + name + '.',
  find: (name, item) => name + ' left a ' + item + '. In the case.',
};
// The Case (companion-case-build-1): the Companion's second face. [copy] WORKING WORDS: the copywriter's job replaces every string here.
// A label tells only what the player was shown: a pod's species when known, never a trait value; "at the Station" names only the chapter the sample is for.
WORDS.case = {
  title: 'Case', sealed: 'Sealed for home', goesHome: ['It all goes home', 'when you dock'], page: 'Its page in the Log', field: 'field', pages: ['◀ Log, her pages · ▶ Riding', '◀ Log · ▶ Riding'], end: 'End expedition',
  pod: 'A pod', podOf: n => n + ' pod', supply: { e: 'Energy', d: 'Data', s: 'Essence' }, supplyLine: n => n + ' in the hold', crate: n => 'Crate · expedition ' + n, crateNone: 'A crate with nothing in it', empty: 'nothing here yet', noPic: 'no picture yet',
  place: p => 'the ' + p, took: (how, place, d) => how + ' · ' + place + ' · day ' + d, noWhere: 'taken on an earlier walk',
  podHow: { ground: 'picked up', dug: 'dug up' }, sampleHow: { shake: 'shaken dry', calm: 'left while calm', sleep: 'left asleep' },
  forStation: { coat: 'her coat', face: 'her face', 'legs-tail': 'her legs and tail' }, atStation: w => 'reads ' + w + ' at the Station',
  podFor: 'the nursery', crateFree: 'A free place', crateFreeHow: 'End expedition seals a crate here', crateName: n => 'Crate ' + n, crateWhen: n => 'sealed · day ' + n,
  crateHas: b => { const p = (b.pods || []).length, bits = [p ? p + ' pod' + (p === 1 ? '' : 's') : '', b.e ? b.e + ' Energy' : '', b.d ? b.d + ' Data' : '', b.s ? b.s + ' Essence' : ''].filter(Boolean); return bits.join(' · '); },
  cradleFree: 'Empty cradle', cradleFreeHow: 'room for a pod', placeFree: 'Empty place', placeFreeHow: 'nothing here yet',
};
// Riding (companion-riding-build-2): the Companion's third face, who is with you. [copy] WORKING WORDS: the copywriter's job replaces every string here.
// Her kind, stage and what she does are the game's own words (CARE_TEXT, SPECIES); no trait value, range or hidden trait is said here. No word for tiredness (owner 2026-11-22).
WORDS.riding = {
  title: 'Riding', also: 'also riding', leads: 'leads the Probe', who: 'who rides', pages: '◀ ▶ pages', field: 'field', more: n => '+' + n,
  rested: 'rested · she slept at camp',   // a fact, shown only when it happened (night-step-6-1); absent until then
  empty: 'No one rides', emptyHow: 'A mibi rides with you once it is home.',
};
// [copy] words for the copywriter's round (they say the meaning only)
// night step 4 [copy]: the three cards' words (the art director's paintings carry them when signed; until then the message-box lines stay)
export const CARD_TEXT = { dusk: ['Dusk', 'Dusk. The wild ones are going to their beds.'], night: ['Night', 'Night falls.'], dawn: ['Dawn', ''] };
export const DAY_TEXT = {
  nightEnds: 'Night ends the day · the Companion wakes at camp',   // the camp path only (a set-out in the night's light); a walk no longer ends at night
  line: (part, n) => part + ' · ' + (part === 'night' ? 'dawn in ' : 'night in ') + n,   // [copy] the bottom line: the part of day and how far the night (or dawn) is
  nightPassed: part => 'Night passed. A new day: ' + part + '.',   // [copy] the walk goes on where you stand
  duskNews: n => 'Dusk. Night in ' + n + '.',   // [copy] once a day, in the message box
  duskFed: names => names.length === 1 ? 'Dusk. ' + names[0] + ' ate from your hand today. She will sleep in her pod if you do not wake her.' : 'Dusk. ' + names[0] + ' and ' + (names.length - 1) + ' other Loika' + (names.length > 2 ? 's' : '') + ' ate from your hand today. They will sleep in their pods if you do not wake them.',   // editorial's line
  nightFed: name => 'Night. ' + name + ' sleeps in her pod',   // no clock: the day bar alone counts to dawn
  nightFedMore: (name, n) => 'Night. ' + name + ' and ' + n + ' other Loika' + (n > 1 ? 's' : '') + ' sleep in their pods',   // bus 9bdb54 (GD note): two or more fed
  nightWoken: name => 'Night. ' + name + ' was woken · no pod tonight',
  nightNews: n => 'Night. Dawn in ' + n + '.',   // [copy]
  newDay: 'A new day · you set out at dawn',   // a set-out in the night's light: the night's end runs first, at the Station
  campHint: ['seals a crate · makes camp', 'seals a crate'],   // End expedition at the flag: the day waits
};
// the night pod's words (editorial's lines; none is the builder's)
WORDS.pod = {
  slot: 'Loika asleep in her pod: picture to come',   // [art] NIGHT_POD_LOIKA: a named empty slot until the signed picture is in the art set
  take: 'Take her up', second: 'One sleeper only', line: n => n + ' · asleep in her pod', lineShort: n => n + ' · asleep',
  secondMsg: n => 'The Case holds one sleeper · ' + n + ' is in it',   // editorial's line: the walk's end brings her home
  head: n => 'Take ' + n + ' up?', leave: 'Leave her asleep',
  c1: 'She sleeps till first light. End the expedition and she wakes in the nursery.',   // editorial's line
  cradle: n => n + ' · asleep', cradleMsg: 'She wakes at first light',
  seal: (n, rest) => 'Seals ' + n + ', asleep' + (rest ? ' + ' + rest : ''), sealTail: 'She wakes at the Station',
  bayFull: n => 'Bay full · ' + n + ' wakes here at first light · dock to empty the bay',
  wokeSet: n => n + ' woke where her pod lay',   // the dawn message where she lay; none at her bed
  wokeNursery: n => n + ' woke in the nursery',
  eatsTeach: n => n + ' eats fruit · creep beside her while she grazes', podTeach: n => n + ' · asleep in her pod · ✓ takes her up',   // [copy] put together from canon's strings
  fed: 'Fed today', asleepPage: 'asleep in her pod', inCase: 'in the Case', goneHome: d => 'Gone home · day ' + d, goneBack: d => 'Gone back · day ' + d,
};

// The player's words for finds, taking, readings and where you are (copywriter rounds cw-g4b and cw-finds-peek, 10 Nov 2026). One table, so the copywriter and editorial can change a word without
// touching the page. Pure data and small pure functions. "Heart" is never player text; dew is never water and never refills; a storm is never a gift or a danger.
export const WORDS = {
  // where you are (bottom line, Call report, band, map line, Probe tile)
  explored: 'explored', left: 'nothing left to take', leftN: n => n + ' to take', moreN: n => n + ' more to take',
  nothingSeen: 'nothing in sight to take',
  band: { unexplored: 'not explored yet', podWaits: n => n === 1 ? '1 pod waits there' : n + ' pods wait there' },
  reachLine: (n, total, tail) => 'Explored ' + n + ' of ' + total + (tail || ' in reach'), worldLine: (n, all) => 'Explored ' + n + ' of ' + all + ' places',
  // taking things (✓ labels, at most 24 characters)
  takeDew: 'Take the dew',
  // refusals and counts against the cap (the thing stays where it is, nothing is spent)
  refuse: {
    dew: cap => 'Essence ' + cap + ' of ' + cap + ' · the cup keeps its dew', charge: cap => 'Energy ' + cap + ' of ' + cap + ' · the stone keeps its charge',
    tuft: cap => 'Essence ' + cap + ' of ' + cap + ' · the tuft stays where it is',
  },
  pressNoRoom: (n, cap) => 'Essence ' + n + ' of ' + cap + ' · no room to press the fruit',
  stoneKeeps: 'the stone keeps the rest', holdsNoMore: 'the Probe holds no more',
  full: (supply, cap, keeps) => supply + ' ' + cap + ' of ' + cap + ' · ' + (keeps || 'the Probe holds no more'),
  // pressing fruit (✓ labels and the bump line)
  press: { stone: 'Press fruit on the stone', tree: 'Press fruit on the tree', dim: 'Press on a stone or tree', bump: 'Press fruit on a stone or tree · or put it down' },
  // [copy] the Data hold is the only limit on a trip; the copywriter writes the words behind these slots (placeholders say the meaning only)
  hold: { data: (n, cap) => '/' + cap },   // [copy] the Data count's cap, shown beside the count of Data held
  creature: { holdFull: 'hold full' },   // [copy] a creature act with the hold full: the creature eats, no Data comes in
  // strike marks: the press, what it adds (the tier of the place sets it), and the hold-full line
  strike: {
    read: 'Read the strike mark', ctx: g => 'strike mark · +' + g + ' Data', ctxShort: g => '+' + g + ' Data',
    press: n => '+' + n + ' Data',   // [copy] said once a strike mark is read
    holdFull: 'hold full · Data keeps',   // [copy] facing an unread mark with the hold full: no Read is offered
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
    data: 'Data also comes from strike marks, dark glassy streaks where lightning went into the ground: face one and ✓ Read the strike mark. A mark brings 2 / 3 / 4 / 5 Data by the tier of the place it lies in (meadow and pond edge 2, wood and rock field 4, the cave 5); only your hold of 20 limits a trip. A few marks on sand hold storm glass.',
  },
  // the world turn's rule, said at End expedition when no place was entered
  waits: 'Nothing explored · the world waits',
};

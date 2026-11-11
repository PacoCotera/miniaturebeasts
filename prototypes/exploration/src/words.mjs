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
  // strike marks: the press, what it adds, and the trip's count against its cap (m: the yield of the highest tier entered this trip)
  strike: {
    read: 'Read the strike mark', ctx: g => 'strike mark · +' + g + ' Data', ctxShort: g => '+' + g + ' Data',
    capCtx: m => 'Data from strikes ' + m + ' of ' + m, capShort: m => m + ' of ' + m + ' this trip',
    full: m => 'Data from strikes ' + m + ' of ' + m + ' this trip · the mark stays unread', after: (n, m) => 'Data from strikes ' + n + ' of ' + m,
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
    data: 'Data also comes from strike marks, dark glassy streaks where lightning went into the ground: face one and ✓ Read the strike mark. Strikes bring up to 2 / 4 / 6 / 8 Data a trip, by the highest tier you entered (meadow and pond edge 2, wood and rock field 6, the cave 8); one reading in a place of that tier is enough. A few marks on sand hold storm glass.',
  },
  // the world turn's rule, said at End expedition when no place was entered
  waits: 'Nothing explored · the world waits',
};

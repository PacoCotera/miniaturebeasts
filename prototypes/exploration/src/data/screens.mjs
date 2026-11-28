// The screens' tables (content): the opening's words, the names of the art files the screens load, and the shelter sign's pixel rows. Lookups only.

// [copy] The opening screen's words: placeholders for the copywriter, all in this one table (a change of wording never touches code).
export const OPEN_TEXT = {
  stormFromEast: 'Storm in the east · moving west ◀', stormFromWest: 'Storm in the west · moving east ▶', stormFromEastShort: 'From the east ◀', stormFromWestShort: 'From the west ▶', chargeStones: 'storms charge stones',   // the Weather tab's line: where the storm is, then which way it moves (the short forms beside Deep ground)
  digs: n => n + ' digs', needsTuikis: 'needs a Tuikis',   // the Deep ground tab's line
  flat: 'Flat world · New world has stairs', docked: 'Docked · ready to go out',   // a generator 1 world's line; the docked band
  setOut: 'Set out', needsLabel: 'Needs a Tuikis', deepLeads: n => 'Deep ground · ' + n + ' leads',   // the ✓ labels and the bottom line's middle on the opening
};

// The signed HUD frames (art/hud/): ring-<tiles>-<26|48>-<f0|f1|f2|heard> (the carry ring), target-dir-<n|ne|e|se|s|sw|w|nw|here>-<seen|last> (the target line's arrow).
const HUD_DIRS = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw', 'here'];
export const HUD_NAMES = [
  ...[1, 2, 3, 4, 5, 6, 7, 8].flatMap(t => [26, 48].flatMap(z => ['f0', 'f1', 'f2', 'heard'].map(f => 'ring-' + t + '-' + z + '-' + f))),
  ...['seen', 'last'].flatMap(k => HUD_DIRS.map(d => 'target-dir-' + d + '-' + k))];
// A direction word as the arrow files spell it (target-dir-w-seen).
export const DIR_ABBR = { 'north': 'n', 'north-east': 'ne', 'east': 'e', 'south-east': 'se', 'south': 's', 'south-west': 'sw', 'west': 'w', 'north-west': 'nw' };

// The opening's pieces (art/open/): the night mist is one painted 192 px tile ('a'), the pod is 96 px; two frames and a still each. The mist's four colours are not on the core palette.
export const OPEN_COLOURS = [[0x0d, 0x13, 0x22], [0x13, 0x20, 0x36], [0x1a, 0x2d, 0x46], [0x24, 0x46, 0x5a]];
export const OPEN_FRAMES = ['1', '2', 'still'], OPEN_VARIANTS = ['a'], OPEN_TILE = 192;
export const OPEN_FILES = [...OPEN_VARIANTS.flatMap(v => OPEN_FRAMES.map(f => `c-open-night-${v}-${f}`)), ...OPEN_FRAMES.map(f => `c-open-pod-96-${f}`)];

// The care moments' stands (art/moment/stand-<kind>-280x300.png; a `j` is the kind's young stand).
export const MOMENT_KINDS = ['S01', 'S02', 'S03', 'S01j', 'S02j', 'S03j'];

// The shelter sign's picture: art/companion-48/signs/sign-shelter-32.png (32×32 on the core colours, sha256 bf8c1827f8d042aae7778c4a2212f958bb8ab8f1de8b8dcd8c6c7add710b4edf), copied one character per pixel: '.' clear, else the palette index + 48.
// Regenerate these rows from the file if it is ever re-signed; never edit them by hand (a test compares them with the file).
export const SHELTER_ROWS = [
  'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
  'BBBBBBBBBBBBBBAAAAAAAAAAAAAAAAAA',
  'AA@@@@@@@AAABAAAAAAAAAAAAAAAAAAA',
  'AAAABAAAAAAAABBBAAABBABBB@BB@@B@',
  '@@ABAAABA@ABBBBAAABBB@@@B>@@>>@>',
  '@@ABBABB@@@BBBAAAAB@B>>>B>>>=@>=',
  '@@ABBBBBB@@@@AAAAAB>@=>>@>4@=@@=',
  '@@B@BBB@BA@@>AAAAA@^>>>>>==@4444',
  'B@@>@A@>BB@>=AAAAA>^@44>>==>=444',
  '@>>=>@>@@A@4^AABBA@>4>44444>=444',
  '>====>>@>BA44ABBBB@=>444444==4=>',
  '@=3===4>@@A44BBBBB>>>444444=444=',
  '==3===>>4>A44BB@@B>4=>44444=4444',
  '========44B44B@>>@44==4444434444',
  '=====44444B4^@><=>^44===44==4444',
  '====44444^B44><=44444^======4444',
  '===4444444@4<=4<=4444^=====24444',
  '===4444444>4<=44<=4^44=====34444',
  '===44444444<=4444<==44=====44444',
  '===44444444<=4==<==444=====44444',
  '===33333333<=3==<===33=33==33334',
  '================================',
  '.==============================.',
  '...==========================...',
  '.......=.......==.......=.......',
  '.......<.......<<.......<.......',
  '.......<.......<........<.......',
  '...............<................',
  '................................',
  '................................',
  '................................',
  '................................'
];

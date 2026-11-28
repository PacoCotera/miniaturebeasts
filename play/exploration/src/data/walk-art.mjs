// The walk's painted art by file name: the stones, the props, the place marks and the map's tiles. Names, sizes and offsets only; the page loads the files and keeps the pictures.

// The quartz stone family (art/stone/, SOURCE.md there): three shapes, each state at 16 and 48 px.
// NAMED EMPTY SLOT stone-small-b-charged-1 and -2 (@16, @48; the art desk to paint): a charged small b stone shows the signed charged small a frames (stoneArt)
export const STONE_FILES = ['tall', 'small', 'small-b'].flatMap(k => ['plain', 'charged-1', 'charged-2', 'warm-1', 'warm-2', 'warm-still', 'spent'].filter(s => !(k === 'small-b' && s.startsWith('charged'))).flatMap(s => ['16', '48'].map(r => `stone-${k}-${s}@${r}`)));
// The warm top of a warm stone goes to a dark warm in the storm and at night; the amber veins of a charged stone keep one lit step (the stone itself takes the places' grey-blue stone tones, lighttables STONE_TONES).
export const STONE_DIM = new Map([[0xfad58d, 0x9a7453], [0xdfb877, 0x82603f], [0xfff2d0, 0xb08a63], [0xfdf0dc, 0xb08a63], [0xf1ae41, 0xb36f3c], [0xffe166, 0xe9a73c], [0xfff4c2, 0xe9a73c]]);

// The walk props (art/props/, manifest.json beside the files): the bush (full, bare), the fruit, the nest, the crack, the hole (plain, with a glint), the Rupar's fresh hole (two frames, bare), the slab and the exit.
// PROP_DY is the rows a file is moved down so its foot stands on its cell's foot row; a file not named here is not loaded.
export const PROP_DY = { 'find-glint-1': 0, 'find-tuft-1': 0, 'way-through-mark-stone': 0, 'way-through-mark-stake': 0, 'strike-mark-read': 0, 'strike-mark-unread-1': 0, 'strike-mark-unread-2': 0, 'storm-glass-shard': 0, 'pearl-in-shallows': 0, 'landmark-windstep-tree': 0, 'landmark-reedpool-island-stone': 0, 'bush-full': 0, 'bush-full-m': 0, 'bush-bare': 0, 'bush-bare-m': 0, 'prop-fruit': 0, 'crate-sealed-lid': 0, 'crate-sealed-icon': 0, 'prop-nest': 0, 'prop-crack': -2, 'prop-hole0': -3, 'prop-hole1': -3, 'prop-hole-fresh': 5, 'prop-hole-fresh-f2': 5, 'prop-hole-fresh-bare': 5, 'prop-slab': -2, 'prop-exit': -2,
  // her night pod: the 24 x 14 piece, the 32 x 32 land tile (foot on row 31; the pawn's foot is row 30, so -1) and the 32 x 18 Case cut
  'night-pod-loika-24x14': 0, 'NIGHT_POD_LOIKA-tile-32x32': -1, 'night-pod-loika-case-32x18': 0,
  // the walk cups (surface and cave, empty and full), the cave crystals (dim, lit), the mushroom ring and the burrow (open, closed), 32 x 32
  'cup-surface-empty': 0, 'cup-surface-full': 0, 'cup-cave-empty': 0, 'cup-cave-full': 0, 'crystals-dim': 1, 'crystals-lit': 1, 'mushroom-ring': -1, 'burrow-open-dark': 0, 'burrow-closed-dark': 0,
  // the depot and beacon (32 x 32), their 20 x 22 and 12 x 22 map icons and the six walk pods (12 x 14)
  ...Object.fromEntries(['walk-depot-dark', 'walk-depot-ember', 'walk-depot-half', 'walk-depot-full', 'walk-beacon-unlit', 'walk-beacon-lit', 'icon-depot-dark', 'icon-depot-ember', 'icon-depot-half', 'icon-depot-full', 'icon-beacon-unlit', 'icon-beacon-lit',
    'pod-walk-bone', 'pod-walk-lime', 'pod-walk-ice', 'pod-walk-sand', 'pod-walk-sprout', 'pod-walk-lavender',
    // the explorer: nine 32 x 32 frames, feet on row 30, blitted at the cell's top-left
    ...['down-0', 'down-1', 'up-0', 'up-1', 'left-0', 'left-1', 'creep-down', 'creep-up', 'creep-left'].map(n => 'pawn-' + n)].map(n => [n, 0])) };
export const PROP_FILES = Object.keys(PROP_DY);
// The landmarks that have a picture (the Hollow Tree is a baked prop; the Split Stone's picture is not placed yet).
export const LM_PIECE = { windstep: 'landmark-windstep-tree', reedpool: 'landmark-reedpool-island-stone' };
// Prop sizes by name (32 x 32 when not named here): the size of the named empty slot that stands until the file is in.
export const PROP_SIZE = { 'night-pod-loika-24x14': [24, 14], 'NIGHT_POD_LOIKA-tile-32x32': [32, 32], 'night-pod-loika-case-32x18': [32, 18], 'heart-slab': [32, 20], 'strike-mark-read': [16, 16], 'strike-mark-unread-1': [16, 16], 'strike-mark-unread-2': [16, 16], 'prop-fruit': [12, 12], 'crate-sealed-lid': [48, 36], 'crate-sealed-icon': [16, 14], 'prop-fruitx2': [24, 24], 'prop-hole-fresh': [40, 32], 'prop-hole-fresh-f2': [40, 32], 'prop-hole-fresh-bare': [40, 32],
  ...Object.fromEntries(['dark', 'ember', 'half', 'full'].map(s => ['icon-depot-' + s, [20, 22]])), ...Object.fromEntries(['unlit', 'lit'].map(s => ['icon-beacon-' + s, [12, 22]])),
  ...Object.fromEntries(['bone', 'lime', 'ice', 'sand', 'sprout', 'lavender'].map(s => ['pod-walk-' + s, [12, 14]])), 'pod-walk-bone': [15, 16],
  ...Object.fromEntries(['dark', 'ember', 'half', 'full'].map(s => ['walk-depot-' + s, [43, 47]])), ...Object.fromEntries(['unlit', 'lit'].map(s => ['walk-beacon-' + s, [20, 44]])) };

// The walk art (art/walk/, SOURCE.md there): place marks, map terrain tiles at the map's three cell sizes, cliff and ramp marks, the place wade's two frames and the Curious bubble.
const WALK_KINDS = ['windstep', 'reedpool', 'splitstone', 'hollowtree'];
export const WALK_TEX = ['meadow', 'wood', 'rock', 'pondrim', 'beach', 'foam', 'water'], WALK_CS = [72, 48, 26];
export const WALK_FILES = [
  ...WALK_KINDS.flatMap(k => ['found', 'been'].flatMap(s => [26, 18, 12].map(n => `mark-${k}-${s}-${n}`))),
  ...WALK_TEX.flatMap(t => WALK_CS.map(c => `map-tex-${t}-${c}`)),
  ...['cliff-face', 'cliff-lip-h', 'cliff-lip-v', 'cliff-side', 'ramp', 'ramp-side'].flatMap(e => WALK_CS.map(c => `edge-${e}-${c}`)),
  'wade-mud-f0', 'wade-mud-f1',   // the place wade: josehzz Mud&Water CC0, re-cut, 48 px, two frames (L2.wade48)
  'bubble-curious-11x13'];

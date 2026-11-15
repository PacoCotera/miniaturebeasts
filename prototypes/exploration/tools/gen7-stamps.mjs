// The set-piece stamps (what a place holds, greybox): plain-block layouts as LDtk levels, one IntGrid layer of cell kinds, one anchor entity, level fields kind / lands / flip.
// The LDtk project (art/places/ldtk/stamps.ldtk and stamps/*.ldtkl) is the source; this tool writes it from the layouts below and bakes src/gen7/stamps.json (what the generator reads).
// usage: node tools/gen7-stamps.mjs          write the LDtk files and the baked json
//        node tools/gen7-stamps.mjs --check   fail if the baked json does not match the LDtk files
// Cell kinds (IntGrid values; the key of the proposal's stamps.png):
//   .  kept clear (no tall dressing)      r  wall piece, half the time        R  wall piece, always (the land's own: boulder, stump, reed clump)
//   S  the slab (anchor of a bed): two S side by side, a 2 x 1 footprint, the anchor the left one       L  the landmark (anchor of a landmark ground)      O  the overhang's roof, on the cliff face above
//   h  shelter tile under the overhang    p  find slot: a pod (filled first)  m  find slot: the land's kind (dew, fruit, stone)
//   k  find slot: a stone                 c  find slot: a stone (filled last)  x  bare tile, no mark
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

const DIR = new URL('../../../art/places/ldtk/', import.meta.url).pathname;
const OUT = new URL('../src/gen7/stamps.json', import.meta.url).pathname;
export const KINDS = { '.': 1, r: 2, R: 3, S: 4, L: 5, O: 6, h: 7, p: 8, m: 9, k: 10, c: 11, x: 12 };
const LANDS = ['meadow', 'wood', 'rock', 'pond'];

// A bed: a pod half-buried at a slab's edge, moss or dew cups beside, stones and roots lying loose about; no ring. 7 x 5, open to the south. Three layouts a land.
const BED = {
  meadow: [
    ['r....R.', '.m.....', '..RSS.m', '...p...', '..c..k.'],
    ['..R...r', '....m..', 'r..SSR.', '.m..p..', '.......'],
    ['.r.....', 'R..m..r', '....SS.', '.k.p.m.', '.......'],
  ],
  wood: [
    ['Rr...rR', '.m.....', '.R.SS.m', '...pR..', '..c....'],
    ['.R..r..', 'r..m..R', '..SSR..', '.m..p.r', '.......'],
    ['R....R.', '..m...r', '.r.SS..', '..p.mR.', '.......'],
  ],
  rock: [
    ['R.r...R', '....m..', 'R..SSR.', '..p...r', '.k...m.'],
    ['.R...R.', '...m..R', 'r.SS...', '..Rp...', '.m...k.'],
    ['RR.....', '...SSmr', '.m..p..', '....R..', '.......'],
  ],
  pond: [
    ['...r...', '.m...R.', 'r..SS.m', '..p....', '.......'],
    ['.r....R', '....m..', '..SSR..', '.m.p.r.', '.......'],
    ['r......', '..m.R..', '.R.SS.m', '....p..', '.......'],
  ],
};
const STAMPS = [];
for (const land of LANDS) BED[land].forEach((rows, i) => STAMPS.push({ id: `bed-${land}-${i + 1}`, kind: 'sleepers-bed', lands: [land], flip: 'ew', rows }));
STAMPS.push({ id: 'bed-cramped', kind: 'sleepers-bed-cramped', lands: LANDS, flip: 'ew', rows: ['RSS.m', '..p..', '.....'] });   // the heart of a place too cramped for the full bed
STAMPS.push({ id: 'bed-nook', kind: 'sleepers-bed-nook', lands: LANDS, flip: 'ew', rows: ['RSS.m', '..p..', '..c..'] });         // a smaller spot: slab, a pod, moss and a stone
STAMPS.push({ id: 'overhang', kind: 'overhang', lands: LANDS, flip: 'ew', rows: ['OOOO', 'hhhh', 'Rk.c', '....'] });          // top row on the cliff's south face
STAMPS.push({ id: 'split-stone-ground', kind: 'split-stone-ground', lands: ['rock'], flip: 'ew', rows: ['r.....r', '.k...c.', '.......', '.c.L.k.', '...x...'] });   // the stone's 3 x 2 foot is the two rows above and on L; no strike mark

const uid = (n) => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');

function ldtkDefs() {
  return {
    layers: [{ __type: 'IntGrid', identifier: 'Kinds', type: 'IntGrid', uid: 1, gridSize: 16, displayOpacity: 1, intGridValues: Object.entries(KINDS).map(([k, v]) => ({ value: v, identifier: k, color: '#888888', tile: null, groupUid: 0 })) },
      { __type: 'Entities', identifier: 'Anchor', type: 'Entities', uid: 2, gridSize: 16, displayOpacity: 1, intGridValues: [] }],
    entities: [{ identifier: 'Anchor', uid: 3, width: 16, height: 16, color: '#CC3377', fieldDefs: [] }],
    levelFields: [
      { identifier: 'kind', __type: 'String', type: 'F_String', uid: 4, isArray: false, canBeNull: false, defaultOverride: null },
      { identifier: 'lands', __type: 'Array<String>', type: 'F_String', uid: 5, isArray: true, canBeNull: false, defaultOverride: null },
      { identifier: 'flip', __type: 'String', type: 'F_String', uid: 6, isArray: false, canBeNull: false, defaultOverride: null },
    ],
  };
}
const anchorOf = (s) => {
  const want = s.kind === 'overhang' ? 'h' : s.kind.startsWith('split') ? 'L' : 'S';
  for (let y = 0; y < s.rows.length; y++) { const x = s.rows[y].indexOf(want); if (x >= 0) return [x, y]; }
  throw new Error('no anchor in ' + s.id);
};
function level(s, n) {
  const w = s.rows[0].length, h = s.rows.length, [ax, ay] = anchorOf(s);
  const csv = []; for (const row of s.rows) for (const ch of row) csv.push(KINDS[ch] ?? 0);
  const fi = (id, type, uidn, value) => ({ __identifier: id, __type: type, __value: value, __tile: null, defUid: uidn, realEditorValues: [] });
  return {
    __header__: { fileType: 'LDtk Level JSON', app: 'LDtk', doc: 'https://ldtk.io/json', schema: 'https://ldtk.io/files/JSON_SCHEMA.json', appAuthor: "Sebastien 'deepnight' Benard", appVersion: '1.5.3', url: 'https://ldtk.io' },
    identifier: s.id, iid: uid(n), uid: 100 + n, worldX: n * 160, worldY: 0, worldDepth: 0, pxWid: w * 16, pxHei: h * 16, __bgColor: '#696A79', bgColor: null, useAutoIdentifier: false, bgRelPath: null, bgPos: null, __smartColor: '#ADADB5', __bgPos: null,
    externalRelPath: 'stamps/' + s.id + '.ldtkl',
    fieldInstances: [fi('kind', 'String', 4, s.kind), fi('lands', 'Array<String>', 5, s.lands), fi('flip', 'String', 6, s.flip)],
    layerInstances: [
      { __identifier: 'Anchor', __type: 'Entities', __cWid: w, __cHei: h, __gridSize: 16, __opacity: 1, __pxTotalOffsetX: 0, __pxTotalOffsetY: 0, __tilesetDefUid: null, __tilesetRelPath: null, iid: uid(1000 + n), levelId: 100 + n, layerDefUid: 2, pxOffsetX: 0, pxOffsetY: 0, visible: true, optionalRules: [], intGridCsv: [], autoLayerTiles: [], seed: 1, overrideTilesetUid: null, gridTiles: [],
        entityInstances: [{ __identifier: 'Anchor', __grid: [ax, ay], __pivot: [0, 0], __tags: [], __tile: null, __smartColor: '#CC3377', iid: uid(2000 + n), width: 16, height: 16, defUid: 3, px: [ax * 16, ay * 16], fieldInstances: [], __worldX: n * 160 + ax * 16, __worldY: ay * 16 }] },
      { __identifier: 'Kinds', __type: 'IntGrid', __cWid: w, __cHei: h, __gridSize: 16, __opacity: 1, __pxTotalOffsetX: 0, __pxTotalOffsetY: 0, __tilesetDefUid: null, __tilesetRelPath: null, iid: uid(3000 + n), levelId: 100 + n, layerDefUid: 1, pxOffsetX: 0, pxOffsetY: 0, visible: true, optionalRules: [], intGridCsv: csv, autoLayerTiles: [], seed: 1, overrideTilesetUid: null, gridTiles: [], entityInstances: [] },
    ],
    __neighbours: [],
  };
}
function project() {
  const d = ldtkDefs();
  return {
    __header__: { fileType: 'LDtk Project JSON', app: 'LDtk', doc: 'https://ldtk.io/json', schema: 'https://ldtk.io/files/JSON_SCHEMA.json', appAuthor: "Sebastien 'deepnight' Benard", appVersion: '1.5.3', url: 'https://ldtk.io' },
    iid: uid(9999), jsonVersion: '1.5.3', appBuildId: 0, nextUid: 200, identifierStyle: 'Capitalize', toc: [], worldLayout: 'Free', worldGridWidth: 256, worldGridHeight: 256, defaultLevelWidth: 256, defaultLevelHeight: 256,
    defaultPivotX: 0, defaultPivotY: 0, defaultGridSize: 16, defaultEntityWidth: 16, defaultEntityHeight: 16, bgColor: '#40465B', defaultLevelBgColor: '#696A79', minifyJson: false, externalLevels: true, exportTiled: false, simplifiedExport: false,
    imageExportMode: 'None', exportLevelBg: true, pngFilePattern: null, backupOnSave: false, backupLimit: 10, levelNamePattern: '%world_%idx', tutorialDesc: 'Set-piece stamps: plain blocks, read by src/gen7/places.mjs through src/gen7/stamps.json (tools/gen7-stamps.mjs).',
    customCommands: [], flags: [], defs: { layers: d.layers, entities: d.entities, tilesets: [], enums: [], externalEnums: [], levelFields: d.levelFields },
    levels: STAMPS.map((s, i) => { const l = level(s, i + 1); return { ...l, layerInstances: null }; }), worlds: [], dummyWorldIid: uid(9998),
  };
}
// the baked json: what the generator reads
function bake() {
  return { version: 1, note: 'Baked from art/places/ldtk by tools/gen7-stamps.mjs; edit the LDtk levels (or the layouts there), never this file.', keys: KINDS,
    stamps: STAMPS.map((s) => ({ id: s.id, kind: s.kind, lands: s.lands, flip: s.flip, w: s.rows[0].length, h: s.rows.length, anchor: anchorOf(s), rows: s.rows })) };
}
// the baked json read back from the LDtk level files (the check)
function fromLdtk() {
  const inv = Object.fromEntries(Object.entries(KINDS).map(([k, v]) => [v, k]));
  return STAMPS.map((s) => {
    const l = JSON.parse(readFileSync(DIR + 'stamps/' + s.id + '.ldtkl', 'utf8')), g = l.layerInstances.find((x) => x.__identifier === 'Kinds'), w = g.__cWid, h = g.__cHei, rows = [];
    for (let y = 0; y < h; y++) rows.push(Array.from({ length: w }, (_, x) => inv[g.intGridCsv[y * w + x]] ?? '?').join(''));
    const f = (id) => l.fieldInstances.find((q) => q.__identifier === id).__value, a = l.layerInstances.find((x) => x.__identifier === 'Anchor').entityInstances[0].__grid;
    return { id: l.identifier, kind: f('kind'), lands: f('lands'), flip: f('flip'), w, h, anchor: a, rows };
  });
}
if (process.argv.includes('--check')) {
  const baked = JSON.parse(readFileSync(OUT, 'utf8')).stamps, ld = fromLdtk();
  if (JSON.stringify(baked) !== JSON.stringify(ld)) { console.error('src/gen7/stamps.json does not match art/places/ldtk/stamps: run node tools/gen7-stamps.mjs'); process.exit(1); }
  console.log('stamps in step:', ld.length);
} else {
  if (!existsSync(DIR + 'stamps')) mkdirSync(DIR + 'stamps', { recursive: true });
  STAMPS.forEach((s, i) => writeFileSync(DIR + 'stamps/' + s.id + '.ldtkl', JSON.stringify(level(s, i + 1), null, '\t') + '\n'));
  writeFileSync(DIR + 'stamps.ldtk', JSON.stringify(project(), null, '\t') + '\n');
  writeFileSync(OUT, JSON.stringify(bake(), null, 1) + '\n');
  console.log('wrote', STAMPS.length, 'stamps');
}

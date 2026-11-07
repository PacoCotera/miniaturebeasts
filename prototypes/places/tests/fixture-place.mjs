// A fixture place for the format tests: 18 x 22 cells, a sand-ringed pond, a path, a few props, a heart, a clue, finds and openings, on the ninja-test set.
import { dualGrid, EMPTY, FULL_BASE, EMPTY_BASE } from '../src/dualgrid.mjs';
import { dualPairs } from '../src/setload.mjs';

export const W = 18, H = 22;

export function fixtureTerrain(terrains) {
  const v = Object.fromEntries(terrains.map((t) => [t.id, t.value]));
  const t = new Uint8Array(W * H).fill(v.grass);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = Math.hypot((x - 6) / 1.25, y - 9);
    if (d < 2.9) t[y * W + x] = v.water;
    else if (d < 4.1) t[y * W + x] = v.sand;
    if (x === 13 || x === 14) t[y * W + x] = v.path;
  }
  return t;
}

// layers (dual grid, local codes) -> tile ids of the set's pair tables
export function layersToTileIds(dg, tileset) {
  return dg.layers.map((l) => ({
    pair: l.pair,
    tiles: Uint16Array.from(l.tiles, (c) => {
      if (c === EMPTY) return 0xFFFF;
      const p = tileset.pairs[l.pair];
      if (c < FULL_BASE) return p.tiles[c];
      if (c < EMPTY_BASE) return p.fullVariants[c - FULL_BASE];
      return p.emptyVariants[c - EMPTY_BASE];
    }),
  }));
}

export function fixturePlace(loaded, tileset, terrains) {
  const terrain = fixtureTerrain(terrains);
  const dg = dualGrid({ id: 'fixture', w: W, h: H, terrain }, terrains, dualPairs(loaded));
  const spriteIndex = (kind) => { const i = tileset.sprites.findIndex((s) => s.kind === kind); if (i < 0) throw new Error('no sprite ' + kind); return i; };
  const at = (cx, cy) => ({ x: cx * 48 + 24, y: cy * 48 + 47, sortY: cy * 48 + 47 });
  const prop = (kind, cx, cy) => ({ kind: spriteIndex(kind), ...at(cx, cy) });
  const block = new Uint8Array((W * H + 7) >> 3);
  const play = Object.fromEntries(terrains.map((t) => [t.value, t.play]));
  for (let i = 0; i < W * H; i++) if (play[terrain[i]] === 'block') block[i >> 3] |= 1 << (i & 7);
  return {
    id: 'fixture', formatVersion: 1, set: tileset.id, w: W, h: H, type: 'pond', names: ['Reedpool', 'Pondside'], mirrorOf: '',
    terrain, ground: layersToTileIds(dg, tileset),
    decals: [prop('pebbles-a', 3, 16), prop('flower-sun', 9, 4)],
    props: [prop('tree-broad', 3, 3), prop('boulder-brown', 10, 15), prop('bush-big', 15, 6)],
    canopy: [],
    heart: { x: 6, y: 12, kinds: ['moment', 'nest'], species: ['heron'], revealLine: 'Something lives here.', reachBy: 'none' },
    clues: [{ tell: 'prints', points: [{ x: 9, y: 18 }, { x: 8, y: 15 }, { x: 7, y: 13 }] }],
    finds: [{ x: 4, y: 19, kinds: [0, 1], chance: 0.5 }, { x: 11, y: 2, kinds: [2], chance: 1 }],
    landmarks: [{ prop: spriteIndex('stump'), x: 2, y: 20, label: 'the old stump' }],
    openings: [{ side: 'N', from: 7, to: 10 }, { side: 'S', from: 7, to: 10 }],
    spawns: [{ x: 2, y: 2, w: 4, h: 3, species: ['frog'], count: 2 }],
    blockMask: block,
  };
}

// Generator 6's seeded fills of a template instance (walk slice W§1). Pure: the template's data (a baked place's IR, or any object of its shape) and the seed in, plain data out.
//   name       one of the template's names; no repeat inside a world while a name is free (cells of a land type take the list in turn from a seeded start)
//   heart      { kind } the heart's kind, picked by seed from the slot's list among the kinds the page plays (HEART_KINDS6)
//   feats      the page's features for the place's finds (b bush, u dew cup, k stone, n hole), in the place's own tiles; a slot that does not fill gives nothing
//   podSlots   the find slots a pod may lie in: { x, y, on } (on: the slot's roll came up pod or the slot is certain), the certain ones first
// A find slot's kinds index the FindKind enum (pod, fruit, dew, stone, material); its chance is the odds the slot holds anything this world.
import { hash } from './world.mjs';

export const HEART_KINDS6 = ['nest', 'stone', 'spring'];   // the kinds the page plays today; "moment" waits for its own chunk (hearts.mjs)
const FIND = ['pod', 'fruit', 'dew', 'stone', 'material'];

// The name's index in the template's list for a cell: the cells of its land type, in order, take the names in turn from a seeded start.
export function nameIndex6(G, seed, cell, count) {
  const land = G.land[cell]; let k = 0;
  for (let c = 0; c < cell; c++) if (G.land[c] === land) k++;
  return (hash(seed, 'name6', land) + k) % count;
}

export function heartKind6(seed, cell, place) {
  const ok = place.heart.kinds.filter((k) => HEART_KINDS6.includes(k));
  const list = ok.length ? ok : ['spring'];
  return list[hash(seed, 'heart6', cell) % list.length];
}

// Each find slot's fill: null (empty this world) or the find's kind word.
export function findsOf6(seed, cell, place) {
  return place.finds.map((f, i) => {
    const q = hash(seed, 'slot6', cell, i);
    if (f.chance < 1 && (q % 1000) / 1000 >= f.chance) return null;
    return FIND[f.kinds[((q / 1000) | 0) % f.kinds.length]];
  });
}

export function fillPlace6(G, seed, cell, place) {
  const kind = heartKind6(seed, cell, place), finds = findsOf6(seed, cell, place), feats = [], count = {};
  const next = (k) => (count[k] = (count[k] ?? -1) + 1);
  place.finds.forEach((f, i) => {
    const what = finds[i]; if (!what || what === 'pod') return;
    const q = hash(seed, 'slotx6', cell, i), k = what === 'fruit' ? 'b' : what === 'dew' ? 'u' : what === 'stone' ? 'k' : 'n';
    const e = { id: k + next(k), kind: k, x: f.x, y: f.y };
    if (k === 'u') e.full = q % 100 < 75;
    if (k === 'k') e.ch = q % 100 < 10 ? 2 : 0;
    feats.push(e);
  });
  if (kind === 'stone') feats.push({ id: 'kh', kind: 'k', x: place.heart.x, y: place.heart.y, ch: 0 });
  const podSlots = place.finds.map((f, i) => ({ x: f.x, y: f.y, on: finds[i] === 'pod', can: f.kinds.includes(0), sure: f.chance >= 1 })).filter((s) => s.can)
    .sort((a, b) => (b.on - a.on) || (b.sure - a.sure)).map(({ x, y, on }) => ({ x, y, on }));
  const specials = [];
  if (cell === G.gate) specials.push({ id: 'g', kind: 'g' });
  if (cell === G.deep) specials.push({ id: 'd', kind: 'd' });
  const second = hash(seed, 'pods6', cell) % 100 < 20;   // a nest heart holds a second pod one time in five [tune]
  return { name: place.names[nameIndex6(G, seed, cell, place.names.length)], heart: { kind, second: kind === 'nest' && second }, feats, podSlots, specials };
}

// realm-landmarks-r3-2: the landmark checks on one seed, one JSON line: counts by kind, landmarks a region, the share with a same-kind twin within 5 places, regions by own kind, and the spacing across regions.
//   node tools/landmarks-check.mjs seed ...
import { decorOf } from '../src/gen7/place.mjs';
import { landmarksOf } from '../src/gen7/landmarks.mjs';

const MW = 16, MH = 20;
for (const seed of process.argv.slice(2).filter(a => /^\d+$/.test(a)).map(Number)) {
  const { list } = landmarksOf(seed, decorOf(seed));
  const kinds = {}; for (const p of list) kinds[p.kind] = (kinds[p.kind] || 0) + 1;
  let twin = 0, closeOther = 0;
  for (const p of list) {
    if (list.some(o => o !== p && o.kind === p.kind && Math.max(Math.abs(o.X - p.X), Math.abs(o.Y - p.Y)) <= 5)) twin++;
  }
  for (let i = 0; i < list.length; i++) for (let j = 0; j < i; j++) if (Math.max(Math.abs(list[i].X - list[j].X), Math.abs(list[i].Y - list[j].Y)) < 3) closeOther++;
  const byRegion = new Map();   // region -> kind -> n (the Hollow Tree not counted)
  for (const p of list) { if (p.kind === 'hollow-tree') continue; const k = Math.floor(p.X / MW) + ',' + Math.floor(p.Y / MH); const m = byRegion.get(k) || {}; m[p.kind] = (m[p.kind] || 0) + 1; byRegion.set(k, m); }
  let regionsWithOwn = 0, regionsMulti = 0;
  for (const m of byRegion.values()) { const n = Object.values(m).filter(v => v > 1).length; if (n === 1) regionsWithOwn++; if (n > 1) regionsMulti++; }
  console.log(JSON.stringify({ seed, n: list.length, perRegion: +(list.length / 25).toFixed(1), kinds, twinPct: +(100 * twin / Math.max(1, list.length)).toFixed(1), tooClose: closeOther, regionsWithRepeatedKind: regionsWithOwn, regionsWithTwoRepeatedKinds: regionsMulti }));
}

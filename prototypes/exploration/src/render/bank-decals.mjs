// An earth bank's art in a place view. The bake draws an undug bank with no decal of its own; a bank the Rupar has dug gets the dug piece (wayup-dug, places/src/bake/southruns.mjs BANK_DUG_KIND)
// as one decal added to the view's place, at the draw order the bake would give it: after every cliff piece whose foot line (its top row + its height in rows - 1) is at or above the bank's lip row + 3,
// before any other decal. The view's ground renders are dropped once so the next frame draws it.

// v: the place view; lay: its layout (lay.banks); dugIds: the ids of the banks dug on this walk. Run when a view is made and when a bank is dug; a no-op while the dug flags are as the view last saw them.
export function bankDecalsOn(v, lay, dugIds) {
  const sig = lay.banks.map(b => (dugIds.includes(b.ei) ? 1 : 0)).join('');
  if (v.bankSig === sig) return;
  const first = v.bankSig === undefined; v.bankSig = sig;
  const dug = v.ts.sprites.findIndex(s => s.group === 'decal' && s.kind === 'wayup-dug');
  if (dug < 0) return;
  const isCliff = d => { const s = v.ts.sprites[d.kind]; return !!s && /^cliff-/.test(s.kind); }, lineOf = d => d.y / 48 + v.ts.sprites[d.kind].h48 / 48 - 1;
  let changed = false;
  for (const b of lay.banks) {
    if (!dugIds.includes(b.ei)) continue;
    const x = (b.x + 1) * 48, y = (b.y + 1) * 48, ds = v.place.decals;
    if (ds.some(d => d.kind === dug && d.x === x && d.y === y)) continue;
    let at = 0; while (at < ds.length && isCliff(ds[at]) && lineOf(ds[at]) <= b.y + 1 + 3) at++;
    ds.splice(at, 0, { kind: dug, x, y, sortY: y }); changed = true;
  }
  if (changed && !first) { v.cache.key = null; v.cache.full = null; v.cache.frames.clear(); v.half.key = null; v.half.buf = null; v.last = null; }
}

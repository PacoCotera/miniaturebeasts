// The haunt walk, in one module (haunt-walk-module-1; moved out of index.html, not copied; no behaviour change):
// hauntView (the view of a mounted place), placeReach (the ground walked from the place's ways in), hauntStandable, hauntSitesOf (the sites a place offers, kept on the layout),
// staticShut and pathField (the walking distance field to a target, with PATH_FIELDS its cache).
// The page's runtime state is not owned here: the page hands it in once as `env`, getters and functions read each time, never copied:
//   env.PL (the page's picture state: PL.ctx.ts.sprites), env.featAt (skips faded strike marks), env.openingKind (depends on the expedition and the world turn),
//   env.rimRefuses, env.bankTile, env.NOSTAND, env.SMALL_FEAT (plain data that also lives in index.html for its other users).
// T, T_BLOCK and DIRS are plain data of world.mjs and are imported.
import { T, T_BLOCK, DIRS } from '../logic/world.mjs';
import { sitesOf as hauntSites, spotsFor as hauntSpots } from './haunts.mjs';

export function makeHauntWalk(env) {
  // An overlay read from a mounted place, never part of the land: the view of the place's own props and ground.
  function hauntView(lay) {
    const PL = env.PL, pl = lay.baked && lay.baked.place, sprites = PL.ctx && PL.ctx.ts && PL.ctx.ts.sprites; if (!pl || !sprites) return null;
    const famOf = k => /^tall-grass/.test(k) ? 'sweeps' : /^tree-/.test(k) ? 'trees' : /^boulder/.test(k) ? 'rocks' : /^reed/.test(k) ? 'reeds' : null;
    const props = [];
    for (const q of pl.props) { const s = sprites[q.kind], fam = s && famOf(s.kind); if (fam) props.push({ fam, kind: s.kind, x: Math.floor(q.x / 48) - 1, y: Math.floor(q.y / 48) - 1 }); }
    for (const f of lay.feats) if (f.tree === 'hollow') props.push({ fam: 'trees', kind: 'tree-hollow', x: f.x, y: f.y });
    const t = (x, y) => x < 0 || y < 0 || x >= lay.w || y >= lay.h ? -1 : lay.tiles[y * lay.w + x];
    return { w: lay.w, h: lay.h, props, reeds: [], water: (x, y) => t(x, y) === T.WATER || t(x, y) === T.DEEP, land: (x, y) => { const v = t(x, y); return v >= 0 && !T_BLOCK[v] && !env.NOSTAND(v); } };
  }
  // The ground walked from the place's ways in (every tile along each opening that is not closed, and the place's own start where a walk with no side starts), four-way over every tile that is not blocked ground or a
  // standing feature that is not small (SMALL_FEAT, the leaf cup and the strike mark, are stepped over). Pure of the walk: nothing here depends on where the pawn came from. at(x, y): the tile is reached; solid(x, y): it stops the pawn.
  function placeReach(lay, key) {
    const solid = (x, y) => T_BLOCK[lay.tiles[y * lay.w + x]] || (() => { const f = env.featAt(lay, key, x, y); return !!f && !env.SMALL_FEAT.includes(f.kind); })();
    const reached = new Uint8Array(lay.w * lay.h), ways = (lay.openings || []).filter(o => env.openingKind(lay, o).kind !== 'closed'), starts = [lay.spawnPt];
    for (const o of ways) for (let k = o.from - 1; k <= o.to - 1; k++) starts.push(o.side === 'N' ? { x: k, y: 0 } : o.side === 'S' ? { x: k, y: lay.h - 1 } : o.side === 'W' ? { x: 0, y: k } : { x: lay.w - 1, y: k });   // adapt7.mjs runPts
    const q = [];
    for (const e of starts) if (e && e.x >= 0 && e.y >= 0 && e.x < lay.w && e.y < lay.h && !reached[e.y * lay.w + e.x] && !solid(e.x, e.y)) { reached[e.y * lay.w + e.x] = 1; q.push([e.x, e.y]); }
    for (let k = 0; k < q.length; k++) { const [cx, cy] = q[k];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = cx + dx, Y = cy + dy, i = Y * lay.w + X; if (X < 0 || Y < 0 || X >= lay.w || Y >= lay.h || reached[i] || solid(X, Y)) continue; reached[i] = 1; q.push([X, Y]); } }
    return { solid, at: (x, y) => x >= 0 && y >= 0 && x < lay.w && y < lay.h && !!reached[y * lay.w + x] };
  }
  // a site stands only where the pawn can come to it: its tile or the one beside it is reached from the place's ways in, with a front and a side spot 3 to 5 tiles off (E8)
  const hauntStandable = (lay, key) => { const r = placeReach(lay, key); return (x, y) => r.at(x, y) && !r.solid(x, y); };

  // Routine walks (bug #121): a short path search inside the place. The walking distance to the target is found once per place and target (BFS over the walkable tiles, rims respected, one step costs one) and each turn takes the neighbour that is nearer by it, so a wall or a bay in the way no longer holds her. A creature on the way: the search is run again with the tiles creatures stand on closed (a way round); with none she waits, and after 3 waits stepToward's sidestep and back-step take over (as in PR 532).
  const PATH_FIELDS = new WeakMap();
  // A tile nothing walks onto whatever stands there (a trunk, a rock, a stone or other feature): the same ones canStand refuses by occupant(), so the field and the step agree (bug #121: the field ran through a trunk, step one followed it and step two, on the creature-shut field, turned back).
  const staticShut = (lay, key, x, y) => T_BLOCK[env.bankTile(lay, x, y) ? T.BANK : lay.tiles[y * lay.w + x]] || !!env.featAt(lay, key, x, y);
  function pathField(lay, t, shut, key) {   // shut(x, y): a tile closed for this run only (never cached); key: the place, for its features
    let m = PATH_FIELDS.get(lay); if (!m) { m = new Map(); PATH_FIELDS.set(lay, m); }
    const k = t.x + ',' + t.y; let d = shut ? null : m.get(k); if (d) return d;
    const w = lay.w, h = lay.h; d = new Int16Array(w * h).fill(-1);
    if (t.x < 0 || t.y < 0 || t.x >= w || t.y >= h) return d;
    const q = [t.x + t.y * w]; d[q[0]] = 0;
    for (let i = 0; i < q.length; i++) { const cx = q[i] % w, cy = (q[i] / w) | 0;
      for (const [dx, dy] of Object.values(DIRS)) { const ax = cx + dx, ay = cy + dy;
        if (ax < 0 || ay < 0 || ax >= w || ay >= h || d[ay * w + ax] >= 0 || env.NOSTAND(lay.tiles[ay * w + ax]) || env.rimRefuses(lay, ax, ay, cx, cy) || staticShut(lay, key, ax, ay) || (shut && shut(ax, ay))) continue;
        d[ay * w + ax] = d[q[i]] + 1; q.push(ay * w + ax); } }
    if (!shut) { if (m.size > 40) m.clear(); m.set(k, d); }
    return d;
  }
  const hauntSitesOf = lay => lay.haunts || (lay.haunts = (() => { const v = lay.cave ? null : hauntView(lay); if (!v) return []; const ok = hauntStandable(lay, lay.key);
    // a spare land site (#145) must lie on the walkable ground she walks (a path from it reaches most of the place), never in a pocket she could not leave
    let reachN = 0; for (let i = 0; i < lay.reach.length; i++) if (lay.reach[i]) reachN++;
    const roomy = s => { if (s.k !== 'land') return true; const d = pathField(lay, s, null, lay.key); let n = 0; for (let i = 0; i < d.length; i++) if (d[i] >= 0 && lay.reach[i]) n++; return n >= .6 * reachN; };
    return hauntSites(v).filter(s => roomy(s) && (ok(s.x, s.y) || ok(s.x + 1, s.y) || ok(s.x - 1, s.y) || ok(s.x, s.y + 1) || ok(s.x, s.y - 1)) &&(sp => sp.front && sp.side)(hauntSpots(s, ok))); })());

  // The sites a Loika may choose her haunts from: the largest set that are all walkable from each other (wild-beats-fix-4; a path from each to every other, rims respected), so the haunts of her four parts of day are always a walk apart, never across a shut rim.
  // A site is reached when its own tile or one beside it has a walking distance in the other site's field.
  const hauntSitesWalkable = lay => lay.hauntsW || (lay.hauntsW = (() => { const all = hauntSitesOf(lay); if (all.length < 2) return all;
    const near = (d, s) => [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const x = s.x + dx, y = s.y + dy; return x >= 0 && y >= 0 && x < lay.w && y < lay.h && d[y * lay.w + x] >= 0; });
    const f = all.map(s => pathField(lay, s, null, lay.key));
    let best = [];
    all.forEach((a, i) => { const set = all.filter((b, j) => j === i || (near(f[i], b) && near(f[j], a))); if (set.length > best.length) best = set; });
    return best; })());

  return { hauntView, placeReach, hauntStandable, hauntSitesOf, hauntSitesWalkable, staticShut, pathField };
}

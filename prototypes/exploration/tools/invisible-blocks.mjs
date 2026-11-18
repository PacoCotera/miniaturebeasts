// Nothing that blocks a step in a place is invisible (owner bugs #14 #35 #40 #78 "the blocking slab is not shown", #45 "what stone?", #67 "there's no cliff down").
//   node prototypes/exploration/tools/invisible-blocks.mjs SEED [SEED ...]     (all playtest seeds: pass them; run several of these at once, one per worker)
// For every land cell of each world: (1) every blocking tile has a picture under it (water, thicket or cliff terrain, a prop's footprint, a cliff piece, an earth bank, a drawn set piece); (2) every walkable edge tile
// whose step across is refused by the tile beyond has its cause drawn on our side of the border (cliff terrain, a cliff piece, or the neighbour's prop in the apron). Prints one JSON line of counts, then the failures; exit 1 on any.
import { makePage, PLACES } from "../tests/page-harness.mjs";
import { T_BLOCK } from "../src/world.mjs";

const sprites = PLACES.ts.sprites, CLIFFISH = /^cliff-|^way-up|^lip|^stair/;
const cliffV = PLACES.terrains.find(t => t.id === "cliff").value;

export function sweepSeed(seed) {
  const p = makePage({ gen: 7, console: "silent" }), total = {}, bad = [];
  p.run(`newWorld(${seed}); TEST.calm = true; S.tier = 2; startExpedition('weather', G.spawns[0]);`);
  const keys = p.run("(() => { const out = []; for (let c = 0; c < MW * MH; c++) if (G.comp[c] && G.land[c] !== L.WATER) out.push(c); return out; })()");
  const count = k => { total[k] = (total[k] || 0) + 1; };
  // 1: every blocking tile has a picture
  for (const c of keys) {
    const lay = p.run(`layout('${c}')`), pl = lay.baked.place, W = pl.w, w = lay.w, h = lay.h, covered = new Uint8Array(w * h);
    const mark = (cls, x, y) => { if (x >= 0 && y >= 0 && x < w && y < h) covered[y * w + x] = cls; };
    for (const q of pl.props) { const s = sprites[q.kind], cx = Math.floor(q.x / 48) - 1, cy = Math.floor(q.y / 48) - 1; for (let i = 0; i + 1 < s.footprint.length; i += 2) mark(1, cx + s.footprint[i], cy + s.footprint[i + 1]); }
    for (const d of pl.decals) { const s = sprites[d.kind]; if (!CLIFFISH.test(s.kind)) continue; const l = d.x - s.anchor48[0], t = d.y - s.anchor48[1];
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const px = (x + 1) * 48 + 24, py = (y + 1) * 48 + 24; if (px >= l && px < l + s.w48 && py >= t && py < t + s.h48 && !covered[y * w + x]) mark(2, x, y); } }
    for (const b of lay.banks || []) for (let j = 0; j < b.h; j++) for (let i = 0; i < b.w; i++) mark(3, b.x + i, b.y + j);
    for (const q of lay.pieces || []) for (let i = 0; i < (q.w || 1); i++) mark(4, q.x + i, q.y);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; if (!T_BLOCK[lay.tiles[i]]) continue;
      const terr = pl.terrain[(y + 1) * W + x + 1], row = PLACES.terrains.find(t => t.value === terr);
      let cls = covered[i] ? ["", "prop", "cliff-piece", "bank", "piece"][covered[i]] : terr === cliffV ? "cliff" : row && /water|deep|thicket|wade/.test(row.id) ? row.id : "UNDRAWN";
      count(cls);
      if (cls === "UNDRAWN") bad.push(`seed ${seed} cell ${c % 16},${(c / 16) | 0} tile ${x},${y}: blocks (tile type ${lay.tiles[i]}) with no picture (ground ${row && row.id})`);
    }
  }
  // 2: every refused step across a border has its cause drawn on our side
  const pairs = p.run(`(() => { const out = []; for (let c = 0; c < MW * MH; c++) for (const dir of ['right', 'down']) { const n = stepCell(c, dir); if (n >= 0 && tileSideApplies(c, dir)) out.push([c, n, dir]); } return out; })()`);
  for (const [c, n, dir] of pairs) {
    const la = p.run(`layout('${c}')`), lb = p.run(`layout('${n}')`);
    if (!la.tiles || !lb.tiles || !la.raisedFn || !lb.raisedFn) continue;
    const east = dir === "right", len = east ? la.h : la.w;
    for (const [A, B, a, b, name] of [[la, lb, c, n, east ? "east" : "south"], [lb, la, n, c, east ? "west" : "north"]]) {
      const pl = A.baked.place, W = pl.w;
      for (let k = 0; k < len; k++) {
        const ax = name === "east" ? A.w - 1 : name === "west" ? 0 : k, ay = name === "south" ? A.h - 1 : name === "north" ? 0 : k;
        const bx = name === "east" ? 0 : name === "west" ? B.w - 1 : k, by = name === "south" ? 0 : name === "north" ? B.h - 1 : k;
        if (T_BLOCK[A.tiles[ay * A.w + ax]] || !(T_BLOCK[B.tiles[by * B.w + bx]] || (!!A.raisedFn(ax, ay) !== !!B.raisedFn(bx, by) && (A.cliffShown(ax, ay) && B.cliffShown(bx, by))))) continue;
        count("border-refused");
        const ox = ax + 1 + (name === "east" ? 1 : name === "west" ? -1 : 0), oy = ay + 1 + (name === "south" ? 1 : name === "north" ? -1 : 0);
        const t = pl.terrain[oy * W + ox], row = PLACES.terrains.find(q => q.value === t);
        let hit = t === cliffV || !!(row && /water|deep|thicket/.test(row.id));
        for (const d of pl.decals) { const s = sprites[d.kind]; if (hit || !CLIFFISH.test(s.kind)) continue; const l = d.x - s.anchor48[0], tp = d.y - s.anchor48[1];
          for (const [qx, qy] of [[ox, oy], [ax + 1, ay + 1]]) { const px = qx * 48 + 24, py = qy * 48 + 24; if (px >= l && px < l + s.w48 && py >= tp && py < tp + s.h48) hit = true; } }
        for (const q of pl.props) { if (hit) break; const s = sprites[q.kind], cx = Math.floor(q.x / 48), cy = Math.floor(q.y / 48); for (let i = 0; i + 1 < s.footprint.length; i += 2) if (cx + s.footprint[i] === ox && cy + s.footprint[i + 1] === oy) hit = true; }
        if (!hit) bad.push(`seed ${seed} cell ${a % 16},${(a / 16) | 0} ${name} edge tile ${ax},${ay}: the step is refused by cell ${b % 16},${(b / 16) | 0} but nothing is drawn at the border`);
        else count("border-drawn");
      }
    }
  }
  return { cells: keys.length, total, bad };
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop())) {
  const seeds = process.argv.slice(2).map(Number), all = { seeds: seeds.length, cells: 0, total: {}, undrawn: 0 }, bad = [];
  for (const s of seeds) { const r = sweepSeed(s); all.cells += r.cells; for (const [k, v] of Object.entries(r.total)) all.total[k] = (all.total[k] || 0) + v; bad.push(...r.bad); }
  all.undrawn = bad.length; console.log(JSON.stringify(all)); for (const b of bad.slice(0, 40)) console.log(b);
  process.exit(bad.length ? 1 : 0);
}

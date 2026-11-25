// probe: the three approach lines beside a named Loika on a first walk (near, heard, her place) -- node tools/teach-approach-probe.mjs [seed]
import { newPage } from "./walker.mjs";
const seed = +(process.argv[2] || 7), p = newPage(seed, { calm: true });
console.log(JSON.stringify(p.run(`(() => { const m = __mb, S = m.S; m.startExpedition('weather', G.spawns[0]);
  for (const c of [...new Set(S.cr.filter(q => q.sp === 0).map(q => q.c))]) { if (!G.comp[c] || G.land[c] === L.WATER) continue; const key = String(c), live = ensureLive(key); const q = live.cr.find(x => x.sp === 0 && x.ind);
    if (!q) continue; S.exp.pos = key; enterPatch(key); S.known = [0, ...S.known.filter(k => k !== 0)]; const c2 = curLive().cr.find(x => x.id === q.id), P = S.exp.patch; P.x = c2.x + 4; P.y = c2.y; P.dir = 'left'; unveil(key, c2.x, c2.y, 3);
    const out = { name: c2.ind.name, sight: !!indInSight(), ease: c2.ease | 0, far: teachStep() };
    c2.ease = 1; out.heard = teachStep(); c2.ease = 0;
    for (const x of curLive().cr) if (x.ind) { x.hide = 1; } out.hidden = teachStep();
    return out; } return null; })()`)));

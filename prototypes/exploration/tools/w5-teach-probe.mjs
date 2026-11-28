// probe: the teaching line beside a named Loika (prints the line, the message box, and the card's want)
import { newPage } from "./walker.mjs";
const seed = +(process.argv[2] || 7), p = newPage(seed, { calm: true });
console.log(JSON.stringify(p.run(`(() => { const m = __mb, S = m.S; m.startExpedition('weather', G.spawns[0]);
  for (const c of [...new Set(S.cr.filter(q => q.sp === 0).map(q => q.c))]) { if (!G.comp[c] || G.land[c] === L.WATER) continue; const key = String(c), live = ensureLive(key); const q = live.cr.find(x => x.sp === 0 && x.ind && x.ind.hs); if (!q) continue;
    S.exp.pos = key; enterPatch(key); S.known = [0, ...S.known.filter(k => k !== 0)]; const c2 = curLive().cr.find(x => x.id === q.id), P = S.exp.patch; P.x = c2.x + 3; P.y = c2.y; P.dir = 'left'; lightningLift(key, c2.x, c2.y, 7); FX.msg = ''; advance('patch', { noise: 'creep', moved: true });
    return { name: c2.ind.name, sight: !!indInSight(), teach: teachStep(), msg: FX.msg, want: habCardNext(c2) }; } return null; })()`)));

// her-fruit-build-1: the "read, no line" reading. Per seed, three days: a named Loika grazes beside the explorer; once a day he offers fruit (if the page lets him), then keeps still to the end of the light.
// Reports gone days (she left) and Data a day. Run on main and on the branch and compare.
//   node prototypes/exploration/tools/her-fruit-bot.mjs [--from 1] [--to 200]
import { makePage } from "../tests/page-harness.mjs";
const arg = (n, d) => { const i = process.argv.indexOf("--" + n); return i < 0 ? d : +process.argv[i + 1]; };
const FROM = arg("from", 1), TO = arg("to", 200);
let gone = 0, days = 0, data = 0, offers = 0, fed = 0, errs = 0;
for (let seed = FROM; seed <= TO; seed++) {
  const p = makePage({ gen: 7, store: {}, console: "collect", els: true, canvas: true, raf: "count" });
  try {
    p.run(`newWorld(${seed}); TEST.calm = true; startExpedition('weather', G.spawns[0]); HUD.ok = true; enterPatch(String(S.exp.pos)); S.phase = 'patch'; S.known = [0];`);
    const who = p.run("(() => { const c = curLive().cr.find(q => q.ind && !q.hide); return c ? c.id : null; })()");
    if (who == null) continue;
    for (let d = 0; d < 3; d++) {
      const r = p.run(`(() => {
        const P = S.exp.patch, c = curLive().cr.find(q => q.id === ${who}); let off = 0, fedNow = 0;
        P.dir = 'up'; c.x = P.x; c.y = P.y - 1; c.st = 'idle'; c.ease = 0; c.quiet = 0; c.crowd = 0; c.hb = 0; c.go = 0; c.hide = 0;
        S.exp.carry = 'fruit'; const d0 = S.exp.cargo.d;
        const a = patchAction(); if (a && a.label === 'Offer fruit' && !a.dim) { off = 1; a.run(); fedNow = habDay()['fed:' + c.id] ? 1 : 0; }
        S.exp.carry = null;
        let n = 0; while (S.exp && !S.exp.ending && S.day.spent < DAY.light - 1 && n++ < 400) waitTick('patch');
        return { off, fedNow, gone: (c.ease | 0) >= 3 ? 1 : 0, dd: S.exp ? S.exp.cargo.d - d0 : 0 };
      })()`);
      days++; gone += r.gone; data += r.dd; offers += r.off; fed += r.fedNow;
      p.run("S.day.spent = 0");
    }
  } catch (e) { errs++; }
}
console.log(JSON.stringify({ seeds: [FROM, TO], days, goneDays: gone, dataPerDay: +(data / Math.max(1, days)).toFixed(3), offers, fed, errs }));

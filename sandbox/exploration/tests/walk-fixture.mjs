// L2b test fixture: the Companion page in a sandbox, standing in the first place of a world, with creatures put exactly where a test wants them.
//   import { fixture, plain } from "./walk-fixture.mjs";
//   const f = fixture({ partner: 19 }); f.add(3, 4, 0); f.tick(); f.msgs()
import { makePage } from "./page-harness.mjs";

export const plain = v => JSON.parse(JSON.stringify(v));
export const ALL_KNOWN = [0, 1, 2, 3, 4, 7, 11, 16, 19];
const mibi = (id, name, sp) => ({ id, name, sp, born: 0, outings: 0, notches: 0, bonded: false, care: 0, tends: 0, tendDay: null, grownTurn: 0, mem: null, habitsDone: [] });

// One-time page code: helpers every test shares (messages, creatures at a spot, free tiles).
const HELPERS = `
var __msgs = []; (() => { const real = fxMsg; fxMsg = (t, p) => { __msgs.push(t); return real(t, p); }; })();
var __nid = 9000;
function __free(minD, maxD, from, skip) {
  const lay = curLay(), key = S.exp.patch.key, out = [];
  for (let y = 1; y < PH - 1; y++) for (let x = 1; x < PW - 1; x++) { const i = y * PW + x, d = cheb({ x, y }, from);
    if (d < minD || d > maxD || !lay.reach[i] || NOSTAND(lay.tiles[i]) || occupant(key, x, y) || podAt(key, x, y, true)) continue;
    if (skip && skip.some(s => s.x === x && s.y === y)) continue; out.push({ x, y }); }
  out.sort((a, b) => cheb(a, from) - cheb(b, from) || a.y - b.y || a.x - b.x); return out; }
function __add(sp, x, y, o) {
  const lay = curLay(), live = curLive(), id = ++__nid;
  S.cr.push({ id, sp, c: lay.cell, cv: lay.cave ? 1 : 0, b: .2, s: 0 }); indexCreatures();
  const c = Object.assign({ id, sp, x, y, st: 'idle', t: 0, wet: 0, calm: 0, curl: 0, hide: 0, b: .2, face: 1, ready: true }, o || {}); live.cr.push(c); return c; }
`;

export function fixture({ partner = null, rider = null, seed = 3, canvas = false, paint = false, known = ALL_KNOWN, gate = false } = {}) {
  const p = makePage({ console: "silent", els: true, raf: 1, canvas, paint });
  const run = p.run;
  run(`newWorld(${seed}); TEST.calm = true; S.known = ${JSON.stringify(known)};`);
  if (partner != null) run(`S.mibis = [${JSON.stringify(mibi(1, "Pip", partner))}]; S.carried = [1]; S.lead = 1;`);
  if (rider != null) run(`S.mibis = [${JSON.stringify({ ...mibi(1, "Pip", rider), grownTurn: null })}]; S.carried = [1]; S.lead = 1;`);   // a juvenile: it rides, it is no partner
  run(`startExpedition('weather', ${gate ? "G.gate" : "G.spawns[0]"}); enterPatch(); S.exp.n = 5; S.exp.fog = null; S.exp.storm = null; S.exp.stats.sheds = 0;`);
  run("curLive().cr.length = 0; S.cr.length = 0; indexCreatures();");
  run(HELPERS);
  const f = {
    p, run,
    P: () => plain(run("({ x: S.exp.patch.x, y: S.exp.patch.y })")),
    // a free tile from min to max tiles (cheb) of `from` (default: where you stand); the nth of them
    spot: (minD, maxD, from, n = 0, skip = null) => JSON.parse(run(`JSON.stringify(__free(${minD}, ${maxD}, ${JSON.stringify(from || null)} || S.exp.patch, ${JSON.stringify(skip)})[${n}] || null)`)),
    // a wild creature of kind sp at x, y (idle, ready to shed); returns its id
    add: (sp, x, y, o = {}) => run(`__add(${sp}, ${x}, ${y}, ${JSON.stringify(o)}).id`),
    cr: id => JSON.parse(run(`JSON.stringify(curLive().cr.find(q => q.id === ${id}) || null)`)),
    set: (id, o) => run(`Object.assign(curLive().cr.find(q => q.id === ${id}), ${JSON.stringify(o)})`),
    moveYou: (x, y) => run(`S.exp.patch.x = ${x}; S.exp.patch.y = ${y}`),
    // one action of the field clock in the place: a wait, a creep, a walk, an act or a Call
    tick: (info = { noise: "wait" }) => run(`advance('patch', ${JSON.stringify(info)})`),
    ticks: (n, info) => { for (let i = 0; i < n; i++) f.tick(info); },
    msgs: () => plain(run("__msgs")),
    clearMsgs: () => run("__msgs.length = 0"),
    pods: () => plain(run("S.pods.filter(q => /^p\\d/.test(q.id))")),
    // the whole place in a fog bank, or not
    fog: on => run(on ? "(() => { const p = cxy(curLay().cell); S.exp.fog = { x: p.x + .5, y: p.y + .5, r: 30, dx: 0, dy: 0, at: 0 }; })()" : "S.exp.fog = null"),
  };
  return f;
}

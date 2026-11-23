// A scripted first walk from set-out to dock with her pod: node tools/w5-scripted-walk.mjs <seed>
import { packingScreen } from "./first-trip-bot.mjs";
// set out at the first glint, go into the place with a named Loika (a kind with a routine), note her three habits (staged on S.habits as the stills do), take the pod she leaves, walk home, End, seal.
import { newPage, makeWalker } from "./walker.mjs";
const seed = +(process.argv[2] || 7), p = newPage(seed, { calm: true }), w = makeWalker(p), goals = []; let last = "";
const mark = (why) => { const g = p.run("goalLine()"); if (g !== last) { last = g; goals.push(why + ": " + g); } };
mark("fresh");
p.run("startExpedition('weather', G.spawns[0])"); mark("set out");
const at = p.run(`(() => { const S = __mb.S; for (const c of [...new Set(S.cr.filter(q => q.sp === 0).map(q => q.c))]) { if (!G.comp[c] || G.land[c] === L.WATER) continue; const key = String(c), live = ensureLive(key); const q = live.cr.find(x => x.sp === 0 && x.ind && x.ind.hs && x.ind.hs.bed); if (!q) { delete S.exp.live[key]; continue; }
  S.exp.pos = key; enterPatch(key); S.known = [0, ...S.known.filter(k => k !== 0)]; return { key, id: q.id }; } return null; })()`);
mark("in her place");
const named = p.run(`(() => { const S = __mb.S, c = curLive().cr.find(x => x.id === ${at.id}); S.exp.storm = null; curLive().strike = null; S.named = { [c.id]: c.ind.name }; S.metIds = [String(c.id)]; return c.ind.name; })()`); mark("met " + named);
const rec = (r) => `{ ranges: { ${r}: 1 }, got: {}, best: '${r}', plays: 1, sample: null, sights: 0 }`;
p.run(`S.habits = { [${at.id}]: { shake: ${rec("far")} } }`); mark("1 habit");
p.run(`S.habits[${at.id}].calm = ${rec("mid")}`); mark("2 habits");
p.run(`S.habits[${at.id}].sleep = ${rec("near")}; advance('patch', { noise: 'act' })`); mark("3 habits");
const pod = p.run("S.pods.find(q => q.how === 'own') || null");
if (!pod) { console.log(JSON.stringify({ seed, why: "no own pod", goals })); process.exit(0); }
w.walk(pod.x, pod.y, false, 80);
const before = w.cargo().pods; p.key(w.facing(pod.x, pod.y)); p.key("confirm"); const took = w.cargo().pods > before; mark("took her pod");
w.leave(); p.run("S.exp.pos = S.exp.start"); mark("map");
const err = packingScreen({ page: p, walker: w }); mark("sealed (" + (err || "packing screen ok") + ")"); p.run("S.phase === \"sealed\" || 0"); const dockG = p.run("goalLine()");

console.log(JSON.stringify({ seed, took, err, phase: p.S.phase, expAlive: !!p.S.exp, bay: p.S.bay.length, dockG, goals }));

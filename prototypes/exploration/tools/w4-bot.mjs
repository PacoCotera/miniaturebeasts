// W4's realm bot (walk-design-1 W4 check): one target Loika on the live realm page, days in a row without the expedition ending. It plays like a player who reads the forecast:
// it goes to the routine's haunt for the day's condition (the rain's end, the wary one's window, dusk), approaches by creeping tiles that she would not hear, reads the card line (what is still to
// learn for that habit) to choose its range (where she goes: far in clear air; her coat: mid; her face: near), notes on the tell and takes the sample at near.
//   node prototypes/exploration/tools/w4-bot.mjs [--from 1] [--to 200] [--days 3] [--verbose] [--json out.json]
// The page is played in the test sandbox (page-harness); each day starts where the last ended (the pawn stays; her haunts for the new night, a new storm, the day's light back to 200), as the walk without an
// auto end would. A seed without a named Loika in a place of its reach is counted and skipped.
import { makePage } from "../tests/page-harness.mjs";
import { writeFileSync } from "node:fs";

const arg = (n, d) => { const i = process.argv.indexOf("--" + n); return i < 0 ? d : process.argv[i + 1]; };
const FROM = +arg("from", 1), TO = +arg("to", 200), DAYS = +arg("days", 3), VERBOSE = process.argv.includes("--verbose"), JSON_OUT = arg("json", null), READ_ALL = process.argv.includes("--read-all"), READ_ON = !process.argv.includes("--no-read"), NO_GLINT = process.argv.includes("--no-glint");   // --no-glint: the old start (the bot lifts into the Loika's place at once; default: it starts at the first glint offered and walks the map to her, as a player does). W5: the bot reads her prints (an empty haunt: a drop, the trail, the routine note) when the day has nothing yet; --no-read plays without

// ---- runs inside the page (its globals: S, advance, patchAction, curLay, ...) ----
function botPage(A) {
  const ex = S.exp, key = ex.patch.key, lay = curLay(), P = ex.patch, col = lay.cell % MW, id = A.id;
  const live = () => curLive(), her = () => live().cr.find(q => q.id === id), spent = () => S.day.spent, dayAt = n => partOfDay(n);
  const DIRN = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const okTile = (x, y) => x >= 1 && y >= 1 && x < lay.w - 1 && y < lay.h - 1 && !!lay.reach[y * lay.w + x] && !T_BLOCK[lay.tiles[y * lay.w + x]] && !NOSTAND(lay.tiles[y * lay.w + x]) && !occupant(key, x, y, 'player') && !lay.feats.some(f => f.x === x && f.y === y);
  const out = { notes: [], gone: false, steps: 0, waits: 0, heard: 0, samples0: ex.cargo.samples.length, d0: ex.cargo.d, events: [], lost: [] };
  const over = () => !S.exp || S.exp.ending || spent() >= DAY.light - 1;
  const wait = () => { if (over()) return false; out.waits++; waitTick('patch'); return true; };
  // the storm, read ahead: [first light of rain over her column, light her rain is over]
  const rainPlan = () => { const st = S.exp.storm; if (!st) return null; let x = st.x, t = spent(), a = null; const off = () => Math.abs(col + .5 - (x + st.w / 2));
    for (let i = 0; i < 190; i++) { if (off() < 1.5 && a == null) a = t; if (a != null && off() >= 1.5) return { from: a, to: t }; const ov = col + 1 > x && col < x + st.w; x += (ov ? .2 : st.v) * st.dir; t++; } return null; };
  const envAt = T => { const e = easeEnvNow(), r = rainPlan(); return { ...e, wind: windAt(S.seed, lay.cell, T), rain: !!(r && T >= r.from && T < r.to) }; };
  const heardAtTile = (c, x, y, T) => easeHeardAt(envAt(T), c, x, y, 'creep', wariness1(c.ind.doings.wary));
  const stayAtTile = (c, x, y, T) => { const e = envAt(T), w = wariness1(c.ind.doings.wary); return stayLeft(e, { ...c, wary: w, crowd: 0 }, { x, y }); };
  // her stand at a part of day: the tile of the haunt she keeps then
  const herSpot = (c, T) => { const h = hauntAt(c.ind.hs, c.ind.doings, dayAt(T)); return h ? hauntStand(h, (x, y) => okTile(x, y) || (x === c.x && y === c.y)) : null; };
  const bfs = (from, goal, avoid) => { const seen = new Map([[from.x + ',' + from.y, null]]), q = [from]; let g = null;
    while (q.length) { const c = q.shift(); if (goal(c.x, c.y)) { g = c; break; }
      for (const [dx, dy] of Object.values(DIRN)) { const x = c.x + dx, y = c.y + dy, k = x + ',' + y; if (seen.has(k) || !okTile(x, y) || avoid(x, y)) continue; seen.set(k, c); q.push({ x, y }); } }
    if (!g) return null; const path = []; for (let c = g; c && !(c.x === from.x && c.y === from.y); c = seen.get(c.x + ',' + c.y)) path.unshift({ x: c.x, y: c.y }); return path; };
  const stepTo = (t) => { if (over()) return false; const prevP = { x: P.x, y: P.y }; P.x = t.x; P.y = t.y; P.dir = t.x > prevP.x ? 'right' : t.x < prevP.x ? 'left' : t.y > prevP.y ? 'down' : 'up'; out.steps++; advance('patch', { noise: 'creep', moved: true, prevP }); return true; };
  const faceHer = c => { const dx = c.x - P.x, dy = c.y - P.y; P.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); };
  const cheb = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
  const clearAt = T => { const r = rainPlan(); return !(r && T >= r.from && T < r.to) && dayAt(T) !== 'dusk' && dayAt(T) !== 'night' && !(!lay.cave && inFog(lay.cell)); };
  // the stand for a range ring around where she will be: reachable, unheard when creeping, the shortest way
  const standFor = (c, spot, lo, hi, T) => {
    const avoid = (x, y) => { const d = cheb({ x, y }, spot); return heardAtTile(c, x, y, T) && d > 0; };
    const path = bfs({ x: P.x, y: P.y }, (x, y) => { const d = cheb({ x, y }, spot); return d >= lo && d <= hi && !heardAtTile(c, x, y, T); }, avoid);
    return path;
  };
  const walk = (path, untilLight) => { for (const t of path) { if (over() || spent() >= untilLight) return; const c = her(); if (c && heardAtTile(c, t.x, t.y, spent())) { // would be heard: let her settle first, then try the step once
        for (let i = 0; i < 3 && c.ease > 0 && wait(); i++); if (heardAtTile(c, t.x, t.y, spent())) return; } stepTo(t); } };
  const rec = k => (S.habits[id] || {})[k];
  const notedBy = k => out.notes.some(n => n.k === k);
  // ---- W4 round 2: reading her prints (the page's own rule: printsToRead / readPrints), only when the day has nothing yet (--read) ----
  const READ = !!A.read; out.reads = []; out.readTries = [];
  const nothingYet = () => A.readAll ? !out.reads.length : !out.notes.length && !out.reads.length;   // --read-all: read her prints on every day (a drop a day), not only when the day has nothing
  const unread = () => printsHere().filter(p => !S.day.hab[readKey(p.c.id, p.h)]);
  const tryRead = (why, by, backTo) => {   // go to the nearest unread prints and read them (one light); by: the light the bot must be free again (null: none)
    if (!READ || over()) return false;
    const c = her(), quiet = c && (c.gone || c.ease >= 3), cand = unread(); let best = null;
    for (const p of cand) { const path = bfs({ x: P.x, y: P.y }, (x, y) => cheb({ x, y }, p.stand) <= 1, (x, y) => !!c && !quiet && heardAtTile(c, x, y, spent())); if (path && (!best || path.length < best.path.length)) best = { p, path }; }
    if (!best) { out.readTries.push(why + ': ' + (cand.length ? 'no way' : 'none left')); return false; }
    const back = backTo ? cheb(best.p.stand, backTo) + 4 : 0;
    if (by != null && spent() + best.path.length + 1 + back > by) { out.readTries.push(why + ': no time'); return false; }
    for (const t of best.path) { if (over()) break; const cc = her(); if (cc && !quiet && heardAtTile(cc, t.x, t.y, spent())) { for (let i = 0; i < 3 && cc.ease > 0 && wait(); i++); if (heardAtTile(cc, t.x, t.y, spent())) break; } stepTo(t); }
    if (over() || cheb(P, best.p.stand) > 1) { out.readTries.push(why + ': not reached'); return false; }
    for (const dir of ['up', 'down', 'left', 'right']) { P.dir = dir; const a = patchAction(); if (a.label === WORDS.prints.read) { const n0 = (S.exp.stats.prints || []).length; a.run(); if ((S.exp.stats.prints || []).length > n0) { const r = S.exp.stats.prints[n0]; out.reads.push({ why, part: r.part, yday: r.yday, gone: r.gone, light: spent(), walked: best.path.length }); return true; } } }
    out.readTries.push(why + ': could not read'); return false;
  };
  // ---- plan the day's three moments ----
  const c0 = her(); if (!c0) return JSON.stringify({ missing: 1 });
  const win = calmWindow(S.seed, id, S.turn, DAY.parts, routineOf(c0.ind.doings)), rp = rainPlan();
  const events = [];
  if (rp && rp.to < DAY.light - 20) events.push({ k: 'shake', at: rp.to - tellOf(c0.ind.doings) });
  if (win) events.push({ k: 'calm', at: win.from + 4 });
  { let sl = null; for (let T = 150; T < DAY.light - 6 && sl == null; T++) { const h = hauntAt(c0.ind.hs, c0.ind.doings, dayAt(T)); if (h && h === c0.ind.hs.bed) sl = T; } if (sl != null) events.push({ k: 'sleep', at: sl + 2 }); }
  events.sort((a, b) => a.at - b.at);
  // a careful player's first act: leave her dawn spot at once (six tiles off), before waiting anywhere (seed 90: idling at the spawn within 2 tiles of her haunt was a heard step, then gone)
  { const rp0 = bfs({ x: P.x, y: P.y }, (x, y) => { const cc = her(); return cc && cheb({ x, y }, cc) >= 6; }, () => false); if (rp0) { out.events.push('retreat ' + rp0.length); for (const t of rp0) { if (over()) break; stepTo(t); } } }
  out.plan = events.map(e => e.k + '@' + e.at);
  const freeBy = e => e.at - tellOf(c0.ind.doings) - 12, spotOf = e => { const c = her(); return c ? herSpot(c, e.at) || { x: c.x, y: c.y } : null; };
  const afterMoment =(nextE) => { if (READ && nothingYet()) tryRead('after a moment', nextE ? freeBy(nextE) : null, nextE ? spotOf(nextE) : null); };   // a moment has gone by with nothing: read what she left, if there is time before the next
  for (let ei = 0; ei < events.length; ei++) {
    const e = events[ei], nextE = events[ei + 1];
    if (over()) break;
    const c = her(); if (!c) break; if (c.gone || c.ease >= 3) { out.gone = true; break; }
    const k = e.k, want = habWant(id, k), T = e.at;
    const spot = herSpot(c, T) || { x: c.x, y: c.y };
    if (READ && ei > 0 && nothingYet()) tryRead('before ' + k, freeBy(e), spot);
    // the range for what the card lacks
    const rng = want === 'face' ? [3, 4] : want === 'coat' ? [3, 5] : (clearAt(T) ? [6, 8] : [3, 5]);
    let path = standFor(c, spot, rng[0], rng[1], T);
    if (!path && want === 'place') path = standFor(c, spot, 3, 5, T);
    if (!path) path = standFor(c, spot, 3, 8, T);
    if (!path) path = bfs({ x: P.x, y: P.y }, (x, y) => { const d = cheb({ x, y }, spot); return d >= 4 && d <= 8; }, () => false);   // no unheard stand: the nearest plain one, and settle on the way
    if (!path) { out.events.push(k + ': no stand'); afterMoment(nextE); continue; }
    // set out so as to be there a few light before the tell
    const lead = path.length + 3, startAt = Math.max(spent(), e.at - tellOf(c.ind.doings) - lead - 6);
    while (spent() < startAt && !over()) wait();
    walk(path, e.at + 8);
    // wait for the tell
    let guard = 0;
    // W5: wait to the real tell (the plan's light is a forecast, not the tell), up to the next moment's own set-out; never give up at plan+16
    const waitUntil = nextE ? Math.max(e.at + 16, freeBy(nextE)) : DAY.light - 2;
    while (!over() && guard++ < 200) { const cc = her(); if (!cc || cc.gone || cc.ease >= 3) break; if (cc.hb && cc.hb.k === k) break; if (spent() > waitUntil) break; wait(); }
    const cc = her(); if (!cc || !cc.hb || cc.hb.k !== k) { out.events.push(k + ': none to see' + (cc && cc.gone ? ' (gone)' : '')); if (cc && cc.gone) out.gone = true; afterMoment(nextE); continue; }
    // the face wants near: step in on the tell while the steps stay unheard
    if (want === 'face' && cheb(P, cc) > 2) {
      const p2 = bfs({ x: P.x, y: P.y }, (x, y) => cheb({ x, y }, cc) <= 2 && !heardAtTile(cc, x, y, spent()) && stayAtTile(cc, x, y, spent()) >= 5, (x, y) => heardAtTile(cc, x, y, spent()));
      if (p2 && p2.length <= 4) for (const t of p2) { if (!cc.hb) break; stepTo(t); }
    }
    // note it, in front of her (she is not always where the haunt was read to be: when the note is not offered, step one unheard tile nearer, as a player would; seed 159 day 2)
    const closeIn = hc => { const want2 = Math.max(3, cheb(P, hc) - 1), p3 = bfs({ x: P.x, y: P.y }, (x, y) => cheb({ x, y }, hc) <= want2 && !heardAtTile(hc, x, y, spent()), (x, y) => heardAtTile(hc, x, y, spent())); if (!p3 || !p3.length || cheb(P, hc) <= 3) return false; return stepTo(p3[0]); };
    for (let n = 0; n < 10 && !over(); n++) { const hc = her(); if (!hc || !hc.hb) break; faceHer(hc);
      const a = patchAction(); if (a.label === WORDS.habit.note) { const before = (S.exp.stats.noted || []).length; a.run(); const nn = (S.exp.stats.noted || []); if (nn.length > before) { out.notes.push({ ...nn[nn.length - 1], want, T: spent() });
        // W5: a sample needs a note at near; after a mid/far note step in unheard to near inside the same play and note again (the page allows one note per range)
        if (nn[nn.length - 1].range !== 'near') { const h1 = her(); if (h1 && h1.hb && cheb(P, h1) > 2) {
          const p4 = bfs({ x: P.x, y: P.y }, (x, y) => cheb({ x, y }, h1) <= 2 && !heardAtTile(h1, x, y, spent()), (x, y) => heardAtTile(h1, x, y, spent()));
          if (p4 && p4.length <= 6) { for (const t of p4) { if (!her() || !her().hb) break; stepTo(t); }
            const h2 = her(); if (h2 && h2.hb) { faceHer(h2); const a2 = patchAction(); if (a2.label === WORDS.habit.note) { const b2 = (S.exp.stats.noted || []).length; a2.run(); const n2 = (S.exp.stats.noted || []); if (n2.length > b2) out.notes.push({ ...n2[n2.length - 1], want, T: spent(), step: 1 }); } } } } }
        break; } } else if (!closeIn(hc)) wait(); }
    // let the play end
    for (let n = 0; n < 12 && !over(); n++) { const hc = her(); if (!hc || !hc.hb) break; if (nextE && spent() >= freeBy(nextE) + 4) break; wait(); }   // W5: no sitting out the next moment while this one plays out
    afterMoment(nextE);   // also when the moment played and no note came of it
  }
  // the rest of the day: wait it out (the next day starts where this ended); with nothing yet, look for her prints at the end, and wait for the next part of day to look again
  const cf = her(); if (cf && (cf.gone || cf.ease >= 3)) out.gone = true;
  if (READ && nothingYet()) {
    let ok = tryRead('end', null, null);
    while (!ok && !over()) { const p0 = dayAt(spent()); let g = 0; while (!over() && dayAt(spent()) === p0 && g++ < 60) wait(); for (let i = 0; i < 6 && !over(); i++) wait(); if (!over()) ok = tryRead('end', null, null); }
  }
  out.spent = spent(); out.samples = ex.cargo.samples.length - out.samples0; out.data = ex.cargo.d - out.d0; out.ended = !!(S.exp && S.exp.ending);
  out.drops = (S.exp.stats.drops || []).length; out.ownPod = !!(S.own || {})[id]; out.ownPods = S.pods.filter(q => q.how === "own" && q.own === id).length;   // W5: tufts left at empty haunts, her own pod (S.own: once, at her bed)
  out.day = JSON.parse(JSON.stringify(S.day.hab));
  out.calmLog = (S.exp.stats.calmLog || []).filter(w => w.id === id && w.day === S.turn);   // W4 round 2: why calm did or did not play today
  out.learned = Object.fromEntries(Object.entries(S.habits[id] || {}).map(([k, r]) => [k, { got: Object.keys(r.got), best: r.best, sample: !!r.sample }]));
  return JSON.stringify(out);
}

const FIND = glint => `(() => { const GL = ${glint ? 1 : 0}; let best = null, tried = 0; for (const c of [...new Set(S.cr.filter(q => q.sp === 0).map(q => q.c))].filter(c => !GL || S.exp.reach.includes(c)).sort((a, b) => !GL ? 0 : cdist(a, S.exp.start) - cdist(b, S.exp.start) || a - b)) { if (!G.comp[c] || G.land[c] === L.WATER) continue; const key = String(c), lay = layout(key), live = ensureLive(key);
  const ls = live.cr.filter(q => q.sp === 0 && q.ind); if (!ls.length) { delete S.exp.live[key]; continue; } tried++;
  const company = live.cr.filter(q => q.id !== ls[0].id && !q.hide && (q.ind ? q.ind.doings.wary >= .5 : (q.b || 0) <= .55)).length;   // a wary one to calm
  if (!best || (company > 0 && !best.company)) best = { key, id: ls[0].id, company }; if (best.company || tried >= 4) break; }
  return best ? JSON.stringify(best) : 'null'; })()`;
const NEWDAY = (key, day) => `(() => { const ex = S.exp; S.day = freshDay(); S.turn = ${day - 1}; ex.ending = 0; ex.live = {}; ex.storm = stormFor(+${JSON.stringify(key)}); if (${day} === 1) ex.storm.x -= 2 * ex.storm.dir; ex.stray = null; ex.shield = ex.smax; S.exp.pos = ${JSON.stringify(key)}; enterPatch(${JSON.stringify(key)}); unveil(${JSON.stringify(key)}, 15, 15, 40); return 1; })()`;

// day 1 as a player plays it: out of the start place onto the map, along the page's own steps (canStep, range) to the Loika's place, and in
const TRAVEL = key => `(() => { const ex = S.exp, goal = +${JSON.stringify(key)}, from = ex.pos, seen = new Map([[from, null]]), q = [from]; let way = [];
  if (String(from) !== String(goal)) { for (let i = 0; i < q.length; i++) { const c = q[i]; if (c === goal) break; for (const d of ['up', 'right', 'down', 'left']) { if (!canStep(c, d) || !inRange(stepCell(c, d))) continue; const t = stepCell(c, d); if (t < 0 || seen.has(t)) continue; seen.set(t, [c, d]); q.push(t); } }
    if (!seen.has(goal)) return JSON.stringify({ noRoad: 1, from, goal }); for (let k = goal; seen.get(k); k = seen.get(k)[0]) way.unshift(seen.get(k)[1]);
    leavePatch(); for (const d of way) { if (!S.exp || S.exp.ending) break; mapStep(d); } if (S.exp && !S.exp.ending && S.exp.pos === goal) enterPatch(); }
  return JSON.stringify({ from, goal, steps: way.length, light: S.day.spent, at: S.exp ? S.exp.pos : null, phase: S.phase }); })()`;
const results = [];
for (let seed = FROM; seed <= TO; seed++) {
  const p = makePage({ gen: 7, console: "collect", els: true, canvas: true, raf: "count" });
  const row = { seed, days: [] };
  try {
    // speed only (as the design job did, checked day for day against the unchanged bot): a cell the lightning lights on the MAP records its signs, which builds that whole place; they play no part in her place
    if (!process.argv.includes("--signs")) p.run(`recordSigns = function () {};`);
    p.run(NO_GLINT ? `newWorld(${seed}); startExpedition('weather', G.spawns[0]);` : `newWorld(${seed}); startExpedition('weather', startPlaces()[0]);`);   // as a player: the first glint offered
    const pick = JSON.parse(p.run(FIND(!NO_GLINT))); if (!pick) { row.skip = "no Loika"; results.push(row); if (VERBOSE) console.log(seed, "skip"); continue; }
    row.company = pick.company; p.run(`S.known = [0, ...S.known.filter(k => k !== 0)];`);
    for (let day = 1; day <= DAYS; day++) {
      if (!NO_GLINT && day === 1) { p.run(NEWDAY(String(p.run(`S.exp.start`)), 1)); row.travel = JSON.parse(p.run(TRAVEL(pick.key))); if (row.travel.noRoad) { row.skip = "no road to her"; break; } }   // day 1 starts in the glint's place; the walk to her spends the light a player spends
      else p.run(NEWDAY(pick.key, day));
      p.run(`(() => { const l = curLive(); l.strike = null; })()`);
      const r = JSON.parse(p.run(`(${botPage.toString()})(${JSON.stringify({ id: pick.id, read: READ_ON, readAll: READ_ALL })})`));
      row.days.push(r);
      if (VERBOSE) console.log(seed, "day", day, JSON.stringify({ plan: r.plan, notes: r.notes.map(n => n.k + ":" + n.range + (n.first ? "!" : "") + (n.filled ? "=" : "")), samples: r.samples, data: r.data, gone: r.gone, ev: r.events, hab: r.day, spent: r.spent }));
    }
    row.errors = p.errors.slice(0, 3);
  } catch (e) { row.crash = String(e && e.stack || e).slice(0, 400); if (VERBOSE) console.log(seed, "CRASH", row.crash); }
  results.push(row);
}
// ---- the numbers ----
const ok = results.filter(r => r.days.length), nd = d => ok.filter(r => r.days.length >= d);
const habitsOn = (r, d) => new Set(r.days[d - 1].notes.map(n => n.k)).size;
const cum = (r, d) => new Set(r.days.slice(0, d).flatMap(x => x.notes.map(n => n.k))).size;
const sum = {
  seeds: results.length, played: ok.length, skipped: results.filter(r => r.skip).length, crashed: results.filter(r => r.crash).length, noCompany: ok.filter(r => !r.company).length,
  habitsPerDay: [1, 2, 3].filter(d => nd(d).length).map(d => ({ day: d, mean: +(nd(d).reduce((a, r) => a + habitsOn(r, d), 0) / nd(d).length).toFixed(2), atLeast1: nd(d).filter(r => habitsOn(r, d) >= 1).length, of: nd(d).length })),
  allThreeByDay3: nd(3).filter(r => cum(r, 3) === 3).length, atLeastOneDay1: nd(1).filter(r => habitsOn(r, 1) >= 1).length,
  samplesPerDay: [1, 2, 3].filter(d => nd(d).length).map(d => ({ day: d, mean: +(nd(d).reduce((a, r) => a + r.days[d - 1].samples, 0) / nd(d).length).toFixed(2), withSample: nd(d).filter(r => r.days[d - 1].samples >= 1).length })),
  day1OneNoteOneSample: nd(1).filter(r => habitsOn(r, 1) >= 1 && r.days[0].samples >= 1).length,
  goneDays: ok.flatMap(r => r.days).filter(d => d.gone).length, totalDays: ok.flatMap(r => r.days).length,
  e3FailDays: ok.flatMap(r => r.days).filter(d => !d.notes.length).length,   // W4's reading: no habit note
  e3EmptyDays: ok.flatMap(r => r.days).filter(d => !d.notes.length && !(d.reads || []).length && !d.drops).length,
  ownPodByDay: [1, 2, 3].filter(d => nd(d).length).map(d => ({ day: d, withOwnPod: nd(d).filter(r => r.days[d - 1].ownPod).length, of: nd(d).length })), dropDays: ok.flatMap(r => r.days).filter(d => d.drops).length,   // the walk design's E3 (a note, sample, drop, trail or routine note): her prints read count
  readDays: ok.flatMap(r => r.days).filter(d => (d.reads || []).length).length,
  calmWhy: ok.flatMap(r => r.days).reduce((m, d) => { for (const w of d.calmLog || []) m[w.why] = (m[w.why] || 0) + 1; return m; }, {}),
};
const notes = ok.flatMap(r => r.days.flatMap(d => d.notes)), first = notes.filter(n => n.first);
const share = (l, f) => Object.fromEntries(["far", "mid", "near"].map(g => [g, l.length ? +(l.filter(n => n.range === g).length / l.length * 100).toFixed(1) : 0]));
sum.rangeShareAllNotes = share(notes); sum.rangeShareFirstNotes = share(first);
sum.cardFilled = { wanted: notes.filter(n => n.want).length, filled: notes.filter(n => n.filled).length };
sum.byHabit = Object.fromEntries(["shake", "calm", "sleep"].map(k => [k, { notes: notes.filter(n => n.k === k).length, days: ok.flatMap(r => r.days).length }]));
console.log(JSON.stringify(sum, null, 1));
if (JSON_OUT) writeFileSync(JSON_OUT, JSON.stringify({ sum, results }, null, 0));

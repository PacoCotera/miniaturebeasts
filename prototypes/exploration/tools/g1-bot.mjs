// G1's bot (headless): plays the watch in one place for 200 seeds, one day each, and prints the plan's measures. The designer judges; nothing here tunes the rules to the lines.
//   node prototypes/exploration/tools/g1-bot.mjs [--json out.json] [--seeds 200]
// Policies (all read only what a player reads: the forecast, the day's wind, the line under her, her ease):
//   HONEST  goes to her haunt for each forecast condition, picks the route whose unheard stand-off is nearest, keeps still there, notes on the tell, moves closer between beats when it can.
//   COVER / OPEN  the same, but always one route (always through the reeds / always over the sand).
//   FAR / MID / NEAR  the same, but stands at a fixed range (6, 4, 2 tiles) whatever it costs: the probes for "which range is best on this seed".
import { fileURLToPath } from "node:url";
import { DAY } from "../src/words.mjs";
import * as G from "../src/g1-watch.mjs";
import { partOfDay } from "../src/words.mjs";

const cheb = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
const partStart = name => { let t = 0; for (const [n, len] of DAY.parts) { if (n === name) return t; t += len; } return t; };

// the stand-off (tiles) a route allows without a step being heard, at a time of day, for a creeping step: the smallest d, at least 2, whose tile's carry is below d
function standOff(S, route, t) {
  const tiles = G.ROUTES[route], at = { ...S, light: t };
  for (let d = 2; d <= 6; d++) { const i = tiles.findIndex(q => cheb(q, S.L) <= d); if (i >= 0 && G.carryAt(at, tiles[i].x, tiles[i].y, 'creep').v < d) return d; }
  return 6;
}
const standIdx = (S, route, d) => Math.max(0, G.ROUTES[route].findIndex(q => cheb(q, S.L) <= d));

export function playDay(seed, policy = 'HONEST') {
  const S = G.makeDay(seed), fc = G.forecast(S), rec = { seed, policy, appts: {}, still: 0 };
  const fixed = { FAR: 6, MID: 4, NEAR: 2 }[policy], only = policy === 'COVER' ? 'cover' : policy === 'OPEN' ? 'open' : null;
  const appts = [];
  if (fc.rain) appts.push({ k: 'shake', by: fc.rain[1], t: fc.rain[1] - 1, end: fc.rain[1] + 3 });
  appts.push({ k: 'calm', by: fc.mibiFrom, t: fc.mibiFrom, end: S.ma + 15 });
  appts.push({ k: 'sleep', by: 150, t: 150, end: S.sleepAt + 8 });
  let route = null, idx = 0;   // where the bot stands on its route (index into the route's tiles); null: at the start
  const stillMark = {};
  const tooLate = a => S.light > a.end;
  for (const a of appts) {
    if (S.over || S.L.gone) break;
    const r = rec.appts[a.k] = { cost: null, still: 0, route: null, d: null, noted: false };
    // the route and the stand-off
    const dBy = rt => fixed || standOff(S, rt, a.t);
    const cand = only ? [only] : ['cover', 'open'];
    const dMin = Math.min(...['cover', 'open'].map(rt => standOff(S, rt, a.t)));
    let best = null; for (const rt of cand) { const d = fixed || (only ? dMin : standOff(S, rt, a.t)); if (!best || d < best.d) best = { rt, d }; }
    const rt = best.rt, d = best.d; r.route = rt; r.d = d;
    if (route && route !== rt) { while (idx > 0 && !S.over && !S.L.gone) { const t = G.ROUTES[route][idx - 1], c = G.ROUTES[route][idx]; if (!move(S, t, c, 'creep')) break; idx--; } route = null; idx = 0; }
    if (!route) { route = rt; idx = 0; }
    const tiles = G.ROUTES[route], goal = standIdx(S, route, d);
    // leave as late as keeps the arrival at the condition: tiles to go, one light each
    const startAt = a.by - Math.max(0, goal - idx) - 1, begin = S.light, fromStart = idx === 0;
    while (S.light < startAt && !S.over) G.wait(S);
    let t0 = null;
    const guard = { n: 0 };
    while (idx !== goal && !S.over && !S.L.gone && guard.n++ < 200) {
      if (t0 === null) t0 = S.light;
      if (S.L.ease >= 1) { rec.still++; r.still++; G.hold(S); continue; }   // settle before the next step
      const dir = idx < goal ? 1 : -1, c = tiles[idx], n1 = tiles[idx + dir], n2 = tiles[idx + 2 * dir];
      const far = cheb(n1, S.L) > 9 && n2 && Math.abs(goal - idx) >= 2 && n2.x - n1.x === n1.x - c.x && n2.y - n1.y === n1.y - c.y && cheb(n2, S.L) > 9;
      if (!move(S, c, n1, far ? 'walk' : 'creep')) break;
      idx += dir * (far ? 2 : 1);
    }
    if (fromStart && t0 !== null && idx === goal) r.cost = S.light - t0;
    // at the stand: keep still until the habit starts, then note
    let ahead = 0;
    while (!S.over && !S.L.gone && !tooLate(a) && !S.done[a.k] && !(S.L.habit && S.L.habit.k === a.k) && ahead++ < 200) { rec.still++; r.still++; G.hold(S); }
    if (S.L.habit && S.L.habit.k === a.k) {
      let n = 0;
      while (S.L.habit && S.L.habit.k === a.k && !S.over && !S.L.gone && n++ < 12) {
        G.face(S);
        const st = G.noteState(S);
        if (st.ok) { G.note(S); if (!(policy === 'HONEST' || only)) break; continue; }
        if (policy !== 'HONEST' && !only) break;
        if (S.notes[a.k] && S.notes[a.k].best === 'near') break;
        // closer between beats, when it can: the next tile on the route, if it would not be heard
        const nx = tiles[idx + 1];
        if (nx && idx < tiles.length - 1 && cheb(nx, S.L) >= 2 && !G.heardAt(S, nx.x, nx.y, 'creep')) { if (move(S, tiles[idx], nx, 'creep')) { idx++; continue; } }
        if (st.why === 'dup' || st.why === 'face' || st.why === 'sight') { rec.still++; r.still++; G.wait(S); continue; }
        break;
      }
    }
    r.noted = !!S.notes[a.k]; if (r.noted) r.first = S.notes[a.k].first, r.best = S.notes[a.k].best, r.sample = !!S.notes[a.k].sample;
    r.begin = begin;
  }
  // the rest of the day passes (the bot has nothing more to wait for)
  rec.lastNoteAt = S.lastAt; rec.light = S.light; rec.gone = S.L.gone; rec.goneAt = S.log.goneAt;
  rec.noted = Object.keys(S.notes); rec.data = S.data; rec.samples = S.samples.length; rec.empty = S.log.notes === 0;
  rec.ind = S.ind; rec.rain = !!S.rain; rec.lost = S.log.lostHabits;
  return rec;
}
// one step along a route, by its two tiles' direction
function move(S, a, b, gait) {
  const dx = b.x - a.x, dy = b.y - a.y, dir = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up';
  const res = gait === 'walk' ? G.step(S, dir, 'walk') : G.step(S, dir, 'creep'); return res.ok;
}

// ---- the measures ----
const sorted = a => a.slice().sort((x, y) => x - y);
const pct = (a, p) => { if (!a.length) return null; const s = sorted(a); return s[Math.min(s.length - 1, Math.ceil(p * s.length) - 1)]; };
const share = (n, m) => (m ? Math.round(1000 * n / m) / 10 : null);

export function measure(N = 200) {
  const P = {}; for (const pol of ['HONEST', 'COVER', 'OPEN', 'FAR', 'MID', 'NEAR']) { P[pol] = []; for (let s = 1; s <= N; s++) P[pol].push(playDay(s, pol)); }
  const out = { seeds: N };
  // line 1: keep-still acts per habit noted
  const stills = []; for (const r of P.HONEST) for (const k of Object.keys(r.appts)) if (r.appts[k].noted) stills.push(r.appts[k].still);
  out.keepStill = { habitsNoted: stills.length, median: pct(stills, .5), p80: pct(stills, .8), mean: Math.round(10 * stills.reduce((a, b) => a + b, 0) / Math.max(1, stills.length)) / 10, line: 'under three (read at p80)', pass: pct(stills, .8) < 3, medianPass: pct(stills, .5) < 3 };
  out.keepStill.perHabit = {}; for (const k of ['shake', 'calm', 'sleep']) { const v = []; for (const r of P.HONEST) if (r.appts[k] && r.appts[k].noted) v.push(r.appts[k].still); out.keepStill.perHabit[k] = { n: v.length, median: pct(v, .5), p80: pct(v, .8) }; }
  // line 2: the range at the first note, and which range is best per seed
  const first = { far: 0, mid: 0, near: 0 }, rank = { far: 1, mid: 2, near: 3 };
  for (const r of P.HONEST) for (const k of Object.keys(r.appts)) if (r.appts[k].noted) first[r.appts[k].first]++;
  const firstN = first.far + first.mid + first.near;
  const bestOf = { far: 0, mid: 0, near: 0, tie: 0, none: 0 };
  const worth = r => r.noted.length ? Object.values(r.appts).reduce((a, x) => a + (x.noted ? rank[x.best] : 0), 0) : 0;
  const perSeed = [];
  for (let i = 0; i < N; i++) {
    const w = { far: worth(P.FAR[i]), mid: worth(P.MID[i]), near: worth(P.NEAR[i]) }, m = Math.max(w.far, w.mid, w.near);
    const wins = Object.keys(w).filter(k => w[k] === m);
    perSeed.push(m === 0 ? 'none' : wins.length === 1 ? wins[0] : 'tie'); bestOf[perSeed[i]]++;
  }
  const uniq = bestOf.far + bestOf.mid + bestOf.near;
  const pDiff = uniq ? 1 - (Math.pow(bestOf.far / uniq, 2) + Math.pow(bestOf.mid / uniq, 2) + Math.pow(bestOf.near / uniq, 2)) : 0;
  const bestShare = Math.max(bestOf.far, bestOf.mid, bestOf.near) / Math.max(1, uniq);
  out.range = { firstNote: { ...first, shares: { far: share(first.far, firstN), mid: share(first.mid, firstN), near: share(first.near, firstN) } }, bestPerSeed: bestOf, pairsDifferPct: share(Math.round(pDiff * 1000), 1000), largestBestShare: share(Math.round(bestShare * 1000), 1000), line: 'it varies by day (no single range best on every seed)', pass: uniq > 0 && bestShare < 1 && pDiff > 0 };
  // line 3: of approaches that reach a note, the share where the cover route is the cheapest in light (and downwind)
  let reach = 0, coverCheapest = 0, coverDownCheapest = 0, openCheapest = 0, equal = 0;
  const details = [];
  for (let i = 0; i < N; i++) {
    for (const k of ['shake', 'calm', 'sleep']) {
      const c = P.COVER[i].appts[k], o = P.OPEN[i].appts[k]; if (!c || !o) continue;
      const cc = c.noted && c.cost !== null ? c.cost : Infinity, oc = o.noted && o.cost !== null ? o.cost : Infinity;
      if (cc === Infinity && oc === Infinity) continue;
      reach++;
      if (cc <= oc) { coverCheapest++; if (cc === oc) equal++; const wind = (() => { const S = G.makeDay(i + 1); const tt = k === 'shake' ? (S.rain ? S.rain.e - 1 : 0) : k === 'calm' ? 110 : 150; return G.windNow(S, tt); })(); if (wind === 'W') coverDownCheapest++; } else openCheapest++;
    }
  }
  out.cover = { approachesReachingANote: reach, coverCheapest: share(coverCheapest, reach), ofWhichTied: equal, coverCheapestAndDownwind: share(coverDownCheapest, reach), openCheapest: share(openCheapest, reach), line: 'no more than 70%', pass: share(coverCheapest, reach) <= 70 };
  // the others
  const per = { 0: 0, 1: 0, 2: 0, 3: 0 }; for (const r of P.HONEST) per[r.noted.length]++;
  out.habitsPerDay = { ...per };
  out.lightLeftAfterLastNote = { median: pct(P.HONEST.filter(r => r.lastNoteAt >= 0).map(r => DAY.light - r.lastNoteAt), .5), p20: pct(P.HONEST.filter(r => r.lastNoteAt >= 0).map(r => DAY.light - r.lastNoteAt), .2) };
  out.goneDays = { HONEST: P.HONEST.filter(r => r.gone).length, COVER: P.COVER.filter(r => r.gone).length, OPEN: P.OPEN.filter(r => r.gone).length, NEAR: P.NEAR.filter(r => r.gone).length };
  out.e3Empty = { HONEST: P.HONEST.filter(r => r.empty).length, COVER: P.COVER.filter(r => r.empty).length, OPEN: P.OPEN.filter(r => r.empty).length };
  out.samples = { honestDaysWithASample: P.HONEST.filter(r => r.samples > 0).length, data: Math.round(10 * P.HONEST.reduce((a, r) => a + r.data, 0) / N) / 10 };
  out.byPolicy = {}; for (const pol of Object.keys(P)) out.byPolicy[pol] = { habitsPerDayMean: Math.round(100 * P[pol].reduce((a, r) => a + r.noted.length, 0) / N) / 100, gone: P[pol].filter(r => r.gone).length };
  out.wariness = [-1, 0, 1].map(w => P.HONEST.filter(r => r.ind.wary === w).length);
  out.dayWithoutRain = P.HONEST.filter(r => !r.rain).length;
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2), N = a.includes('--seeds') ? +a[a.indexOf('--seeds') + 1] : 200, res = measure(N);
  if (a.includes('--json')) { const fs = await import('node:fs'); fs.writeFileSync(a[a.indexOf('--json') + 1], JSON.stringify(res, null, 1)); }
  console.log(JSON.stringify(res, null, 1));
}

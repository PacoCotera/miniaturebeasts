// night-camp-design-1 (scratch, never in a PR): G1's bot under the new clock. An expedition lasts several days; the day's last light no longer ends anything;
// the next day starts where the explorer stands. The day policies are G1's own (HONEST, COVER, OPEN, FAR, MID, NEAR); what is new is what the bot does from dusk:
//   CAMP  walks back to the flag (the start tile) and sleeps there: the next day starts at the flag.
//   HERE  backs off four tiles and sleeps where it stands: the next day starts there.
//   UP    stays up: at night it creeps to her bed for the night note (her bed, and from two tiles the claw), then backs off and keeps still until the day turns.
// All three take the second chance at sleep-curled the design gives: asleep at her bed she can still be noted (src/g1-night.mjs).
//   node prototypes/exploration/tools/night-bot.mjs [--json out.json] [--seeds 200] [--days 3]
import { fileURLToPath } from "node:url";
import { DAY } from "../src/words.mjs";
import * as GN from "../src/g1-night.mjs";
import * as G0 from "../src/g1-watch.mjs";
import { measure as baseMeasure } from "./g1-bot.mjs";
let G = GN;   // the rules in play: GN the night rules; G0 round 4's own (dusk 'NONE': each day alone from the flag, nothing after the last appointment), to tell the new clock from the bot's corrected step

const cheb = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
const NIND = 200;   // the individuals' list: seed + NIND is the same Loika on another day
const WATCHERS = new Set(['HONEST', 'COVER', 'OPEN']);
const OLD_SWITCH = process.env.NIGHT_OLD_SWITCH === '1';
const KLF = () => globalThis.KL || { midDimPlace: true };
const FIRST = process.argv.includes('--first') ? +process.argv[process.argv.indexOf('--first') + 1] : 1;   // the first seed: 0 gives W4's blocks (seeds 0-199, 200-399, 400-599), 1 night-camp's (1-200, ...)

function standOff(S, route, t) {
  const tiles = G.ROUTES[route], at = { ...S, light: t };
  for (let d = 2; d <= 6; d++) { const i = tiles.findIndex(q => cheb(q, S.L) <= d); if (i >= 0 && G.carryAt(at, tiles[i].x, tiles[i].y, 'creep').v < d) return d; }
  return 6;
}
const standIdx = (S, route, d) => Math.max(0, G.ROUTES[route].findIndex(q => cheb(q, S.L) <= d));
function move(S, a, b, gait) {
  const dx = b.x - a.x, dy = b.y - a.y, dir = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up';
  return G.step(S, dir, gait === 'walk' ? 'walk' : 'creep').ok;
}

// one day on a state already made, from where the bot stands (pos: { route, idx }); the day part is g1-bot.mjs's playDay, unchanged; then the dusk policy
export function playDayOn(S, policy, dusk, pos) {
  const fc = G.forecast(S), rec = { seed: S.seed, policy, dusk, appts: {}, still: 0, nightStill: 0 };
  const fixed = { FAR: 6, MID: 4, NEAR: 2 }[policy], only = policy === 'COVER' ? 'cover' : policy === 'OPEN' ? 'open' : null;
  const appts = [];
  if (fc.rain) appts.push({ k: 'shake', by: fc.rain[1], t: fc.rain[1] - 1, end: fc.rain[1] + 3 });
  appts.push({ k: 'calm', by: fc.mibiFrom, t: fc.mibiFrom, end: S.ma + 15 });
  appts.push({ k: 'sleep', by: 150, t: 150, end: S.sleepAt + 8 });
  let route = pos.route, idx = pos.idx;
  const tooLate = a => S.light > a.end;
  for (const a of appts) {
    if (S.over || S.L.gone) break;
    const r = rec.appts[a.k] = { cost: null, costAny: null, still: 0, route: null, d: null, noted: false };
    const V = a.k === 'sleep' ? { ...S, L: { ...S.L, x: G.BED.x, y: G.BED.y } } : S;
    const unnoticed = (rt, d) => { const q = G.ROUTES[rt][standIdx(V, rt, d)]; return !G.noticeAt({ ...S, light: S.ma }, q.x, q.y).noticed; };
    const standFor = rt => { const d0 = standOff(V, rt, a.t); if (a.k !== 'calm') return d0; for (let d = d0; d <= 6; d++) if (unnoticed(rt, d)) return d; return 6; };
    const cand = only ? [only] : ['cover', 'open'];
    const wantK = S.want[a.k], tH = a.k === 'shake' ? fc.rain[1] : a.k === 'calm' ? S.ma : S.sleepAt;
    // KILL LINES (scratch): with the mid note giving the coat only, a card line that asks where she goes in dim air is not met by any stand (her prints give it after): one note, then the bot stops watching, as for a filled line
    const filled = () => !!(S.got[a.k] && S.got[a.k][wantK]) || (!KLF().midDimPlace && wantK === 'place' && !G.clearAir(S, tH) && !!S.notes[a.k]);
    const dWant = rt => { const d0 = standFor(rt), mid = Math.min(6, Math.max(3, d0)); if (wantK === 'place') return G.clearAir(S, tH) ? 6 : mid; if (wantK === 'coat') return mid; return d0 === 2 ? 2 : mid; };
    let best = null; for (const rt of cand) { const d = fixed || dWant(rt); if (!best || d < best.d) best = { rt, d }; }
    const rt = best.rt, d = best.d; r.route = rt; r.d = d;
    if (route && route !== rt) { while (idx > 0 && !S.over && !S.L.gone) { const t = G.ROUTES[route][idx - 1], c = G.ROUTES[route][idx]; if (!(OLD_SWITCH ? move(S, t, c, 'creep') : move(S, c, t, 'creep'))) break; idx--; } route = null; idx = 0; }   // g1-bot.mjs steps from t to c here (toward her, while it counts back): a bot slip; NIGHT_OLD_SWITCH=1 keeps it, to compare
    if (!route) { route = rt; idx = 0; }
    const tiles = G.ROUTES[route], goal = standIdx(V, route, d === 2 ? 3 : d);
    const startAt = a.by - Math.max(0, goal - idx) - 1 - (wantK === 'face' ? 8 : 0), fromStart = idx === 0;
    while (S.light < startAt && !S.over) G.wait(S);
    let t0 = null;
    const guard = { n: 0 };
    while (idx !== goal && !S.over && !S.L.gone && guard.n++ < 200) {
      if (t0 === null) t0 = S.light;
      if (S.L.ease >= 1) { rec.still++; r.still++; G.hold(S); continue; }
      const dir = idx < goal ? 1 : -1, c = tiles[idx], n1 = tiles[idx + dir], n2 = tiles[idx + 2 * dir];
      const far = cheb(n1, S.L) > 9 && n2 && Math.abs(goal - idx) >= 2 && n2.x - n1.x === n1.x - c.x && n2.y - n1.y === n1.y - c.y && cheb(n2, S.L) > 9;
      if (!move(S, c, n1, far ? 'walk' : 'creep')) break;
      idx += dir * (far ? 2 : 1);
    }
    if (t0 !== null && idx === goal) { r.costAny = S.light - t0; if (fromStart) r.cost = r.costAny; }
    let ahead = 0;
    while (!S.over && !S.L.gone && !tooLate(a) && !S.done[a.k] && !(S.L.habit && S.L.habit.k === a.k) && ahead++ < 200) { rec.still++; r.still++; G.hold(S); }
    if (d === 2 && S.L.habit && S.L.habit.k === a.k && !S.L.gone) { const g2 = standIdx(V, route, 2); while (idx < g2) { const nx = tiles[idx + 1]; if (policy === 'HONEST' && G.heardAt(S, nx.x, nx.y, 'creep')) break; if (!move(S, tiles[idx], nx, 'creep')) break; idx++; } }
    if (S.L.habit && S.L.habit.k === a.k) {
      let n = 0;
      while (S.L.habit && S.L.habit.k === a.k && !S.over && !S.L.gone && n++ < 12) {
        if (filled()) break;
        G.face(S);
        const st = G.noteState(S);
        if (st.ok) { G.note(S); if (!(policy === 'HONEST' || only)) break; continue; }
        if (policy !== 'HONEST' && !only) break;
        if (S.notes[a.k] && S.notes[a.k].best === 'near') break;
        const nx = tiles[idx + 1];
        if (nx && idx < tiles.length - 1 && cheb(nx, S.L) >= 2 && !G.heardAt(S, nx.x, nx.y, 'creep') && !(a.k === 'calm' && G.noticeAt(S, nx.x, nx.y).noticed)) { if (move(S, tiles[idx], nx, 'creep')) { idx++; continue; } }
        if (st.why === 'dup' || st.why === 'face' || st.why === 'sight') { rec.still++; r.still++; G.wait(S); continue; }
        break;
      }
    }
    r.noted = !!S.notes[a.k];
  }

  // ---- from dusk: the new part ----
  const watcher = WATCHERS.has(policy), rs = rec.appts.sleep, tiles = route ? G.ROUTES[route] : null;
  const dBoth = q => Math.min(cheb(q, G.BED), cheb(q, G.HAUNT));   // she is at her bed tonight and at her haunt at dawn
  // one careful step along the route (settle first, creep near her); false when it cannot go on
  const careful = dir => {
    if (!tiles || idx + dir < 0 || idx + dir >= tiles.length || S.over) return false;
    let g = 0; while (!S.L.gone && S.L.ease >= 1 && !S.over && g++ < 8) { rec.nightStill++; G.hold(S); }
    if (S.over) return false;
    const c = tiles[idx], n1 = tiles[idx + dir], n2 = tiles[idx + 2 * dir];
    const far = (S.L.gone || cheb(n1, S.L) > 9) && n2 && n2.x - n1.x === n1.x - c.x && n2.y - n1.y === n1.y - c.y && (S.L.gone || cheb(n2, S.L) > 9);
    if (!move(S, c, n1, far ? 'walk' : 'creep')) return false;
    idx += dir * (far ? 2 : 1); return true;
  };
  const noteAsleep = () => { G.face(S); const st = G.noteState(S); if (st.ok && st.asleep) { G.note(S); return true; } return false; };
  // the second chance: sleep-curled not noted while she bedded down; she sleeps on, so keep still until she does, then note her from mid (a watcher steps to three tiles if it stands farther)
  if (dusk !== 'NONE' && rs && !S.notes.sleep && !S.over && !S.L.gone && tiles) {
    let g = 0; while (!S.over && !S.L.gone && !S.L.asleep && g++ < 12) { rec.still++; rs.still++; G.hold(S); }
    if (S.L.asleep && !S.L.gone && !S.over) {
      if (watcher) { const g3 = standIdx(S, route, 3); let n = 0; while (idx < g3 && n++ < 30 && !S.L.gone) { const nx = tiles[idx + 1]; if (G.heardAt(S, nx.x, nx.y, 'creep')) break; if (!careful(1)) break; } }
      if (noteAsleep()) rec.secondChance = true;
    }
    rs.noted = !!S.notes.sleep;
  }
  if (dusk === 'UP' && tiles) {
    let g = 0; while (!S.over && !G.isNight(S) && g++ < 12) { rec.nightStill++; G.hold(S); }
    if (watcher && !S.over && !S.L.gone && S.L.asleep && !(S.notes.sleep && S.notes.sleep.sample)) {
      // the night note: to three tiles, then the one step to two; a sleeper forgives one heard step
      const g3 = standIdx(S, route, 3), g2 = standIdx(S, route, 2); let n = 0;
      while (idx < g3 && n++ < 30 && !S.L.gone && !S.over) { if (!careful(1)) break; }
      if (idx >= g3 && !S.L.gone && !S.over && !S.notes.sleep) noteAsleep();
      n = 0; while (idx < g2 && n++ < 6 && !S.L.gone && !S.over) { const nx = tiles[idx + 1]; if (G.heardAt(S, nx.x, nx.y, 'creep') && !(S.L.asleep && S.L.ease === 0)) break; if (!careful(1)) break; }
      if (idx >= g2 && !S.L.gone && !S.over && noteAsleep()) rec.nightNear = true;
      if (rs) rs.noted = !!S.notes.sleep;
    }
    let n = 0; while (idx > 0 && dBoth(tiles[idx]) < 4 && !S.over && n++ < 30) { if (!careful(-1)) break; }
    g = 0; while (!S.over && g++ < 40) { rec.nightStill++; G.hold(S); }
  } else if (dusk === 'HERE' && tiles) {
    let n = 0; while (idx > 0 && dBoth(tiles[idx]) < 4 && !S.over && n++ < 30) { if (!careful(-1)) break; }
    rec.sleptAt = S.light; G.sleepNow(S);
  } else if (dusk === 'CAMP') {
    const t0 = S.light; let n = 0; while (tiles && idx > 0 && !S.over && n++ < 80) { if (!careful(-1)) break; }
    rec.camp = { reached: !tiles || idx === 0, back: S.light - t0, at: S.light };
    if (rec.camp.reached && !S.over) { rec.sleptAt = S.light; G.sleepNow(S); }
    let g = 0; while (!S.over && g++ < 40) G.hold(S);
  }
  let g = 0; while (dusk !== 'NONE' && !S.over && g++ < 60) G.hold(S);   // whatever is left of the day passes

  rec.gone = S.L.gone; rec.goneAsleep = !!S.log.goneAsleep; rec.stirred = S.log.stirred || 0;
  rec.noted = Object.keys(S.notes); rec.samples = S.samples.length; rec.empty = S.log.notes === 0;
  rec.got = S.got; rec.want = S.want; rec.ind = S.ind; rec.rain = !!S.rain;
  rec.asleepNotes = S.log.asleepNotes || 0; rec.nightNotes = S.log.nightNotes || 0;
  rec.filled = rec.noted.filter(k => S.got[k] && S.got[k][S.want[k]]).length;
  const atFlag = dusk === 'CAMP' && rec.camp && rec.camp.reached;
  return { rec, pos: atFlag || !route ? { route: null, idx: 0 } : { route, idx }, at: atFlag || !route ? null : { ...G.ROUTES[route][idx] } };
}

// an expedition of `days` days for one Loika
export function expedition(seed, policy, dusk, days = 3) {
  const out = []; let pos = { route: null, idx: 0 }, at = null;
  G = dusk === 'NONE' ? G0 : GN;
  for (let d = 0; d < days; d++) {
    const S = dusk === 'NONE' ? G.makeDay(seed + NIND * d) : G.makeDay(seed + NIND * d, at), r = playDayOn(S, policy, dusk, dusk === 'NONE' ? { route: null, idx: 0 } : pos);
    r.rec.day = d + 1; out.push(r.rec); pos = r.pos; at = r.at; }
  return out;
}

const sorted = a => a.slice().sort((x, y) => x - y);
const pct = (a, p) => { if (!a.length) return null; const s = sorted(a); return s[Math.min(s.length - 1, Math.ceil(p * s.length) - 1)]; };
const share = (n, m) => (m ? Math.round(1000 * n / m) / 10 : null);
const mean = (a, dp = 2) => (a.length ? Math.round(Math.pow(10, dp) * a.reduce((x, y) => x + y, 0) / a.length) / Math.pow(10, dp) : null);

// G1's three lines and the others, over a list of day records per policy (same order in every policy)
function lines(P, opt = {}) {
  const out = { days: P.HONEST.length };
  const same = opt.same || (() => false);   // KILL LINES (scratch): a card line every stand gets alike (read from her prints after) tells no range from another: it is left out of the worth
  const stills = []; for (const r of P.HONEST) for (const k of Object.keys(r.appts)) if (r.appts[k].noted) stills.push(r.appts[k].still);
  out.line1_keepStill = { habitsNoted: stills.length, median: pct(stills, .5), p80: pct(stills, .8), mean: mean(stills, 1), pass: pct(stills, .8) < 3 };
  out.line1_keepStill.perHabit = {}; for (const k of ['shake', 'calm', 'sleep']) { const v = []; for (const r of P.HONEST) if (r.appts[k] && r.appts[k].noted) v.push(r.appts[k].still); out.line1_keepStill.perHabit[k] = { n: v.length, median: pct(v, .5), p80: pct(v, .8) }; }
  const worth = r => r.noted.reduce((a, k) => a + 1 + (r.got[k] && r.got[k][r.want[k]] && !same(k, r.want[k], r) ? 2 : 0), 0);
  out.probes = {}; for (const p of ['FAR', 'MID', 'NEAR']) out.probes[p] = { notedPerDay: mean(P[p].map(r => r.noted.length)), worthPerDay: mean(P[p].map(worth)) };
  const bestOf = { far: 0, mid: 0, near: 0, tie: 0, none: 0 };
  for (let i = 0; i < P.FAR.length; i++) { const w = { far: worth(P.FAR[i]), mid: worth(P.MID[i]), near: worth(P.NEAR[i]) }, m = Math.max(w.far, w.mid, w.near), wins = Object.keys(w).filter(k => w[k] === m); bestOf[m === 0 ? 'none' : wins.length === 1 ? wins[0] : 'tie']++; }
  const uniq = bestOf.far + bestOf.mid + bestOf.near;
  out.line2_range = { bestPerDay: bestOf, largestBestShare: share(Math.max(bestOf.far, bestOf.mid, bestOf.near), uniq), pass: share(Math.max(bestOf.far, bestOf.mid, bestOf.near), uniq) <= 60 };
  let reach = 0, coverCheapest = 0, tied = 0;
  for (let i = 0; i < P.COVER.length; i++) for (const k of ['shake', 'calm', 'sleep']) {
    const c = P.COVER[i].appts[k], o = P.OPEN[i].appts[k]; if (!c || !o) continue;
    const cc = c.noted && c.costAny !== null ? c.costAny : Infinity, oc = o.noted && o.costAny !== null ? o.costAny : Infinity;
    if (cc === Infinity && oc === Infinity) continue;
    reach++; if (cc <= oc) { coverCheapest++; if (cc === oc) tied++; }
  }
  out.line3_cover = { approaches: reach, coverCheapest: share(coverCheapest, reach), tied, pass: share(coverCheapest, reach) <= 70 };
  const H = P.HONEST, per = { 0: 0, 1: 0, 2: 0, 3: 0 }; for (const r of H) per[r.noted.length]++;
  out.habitsPerDay = { ...per, mean: mean(H.map(r => r.noted.length)) };
  out.goneDays = H.filter(r => r.gone).length; out.goneAsleep = H.filter(r => r.goneAsleep).length;
  out.e3Empty = { HONEST: H.filter(r => r.empty).length, COVER: P.COVER.filter(r => r.empty).length, OPEN: P.OPEN.filter(r => r.empty).length };
  out.daysWithASample = H.filter(r => r.samples > 0).length; out.samplesPerDay = mean(H.map(r => r.samples));
  out.cardLinesFilledPerDay = mean(H.map(r => r.filled));
  out.sleepNoted = H.filter(r => r.noted.includes('sleep')).length;
  out.secondChanceNotes = H.filter(r => r.secondChance).length; out.nightNearNotes = H.filter(r => r.nightNear).length; out.stirredDays = H.filter(r => r.stirred > 0).length;
  const camps = H.filter(r => r.camp); if (camps.length) out.camp = { reachedBeforeTheTurn: camps.filter(r => r.camp.reached && r.sleptAt != null).length, of: camps.length, backMedian: pct(camps.map(r => r.camp.back), .5), asleepByMedian: pct(camps.filter(r => r.sleptAt != null).map(r => r.sleptAt), .5), asleepByP80: pct(camps.filter(r => r.sleptAt != null).map(r => r.sleptAt), .8) };
  out.nightStillMean = mean(H.map(r => r.nightStill), 1);
  return out;
}

export function measure(N = 200, days = 3) {
  // KILL LINES (scratch): the rule variants, each on the same days. Blocks: day d of the 200 Loikas is seed + 200 (d - 1), so day1/day2/day3 are seeds 1-200, 201-400, 401-600 (W4's and night-camp's three blocks).
  //   built   W4 as built: the mid note also gives where she goes in dim air
  //   prints  the mid note gives her coat only; where she goes in dim air is read from her prints after (every stand alike: not in the worth)
  //   prints+rain  the same, and the ground also keeps her prints for a while after rain: the shake's leave is read by every stand alike
  //   prints, no dew yet  the mid note gives her coat only and the dew's prints are not in yet: sleep-curled's card asks her coat or her face only (W4 round 2 before the dusk and dawn pictures)
  const VAR = { built: { midDimPlace: true }, prints: { midDimPlace: false }, 'prints+rain': { midDimPlace: false, afterRain: true }, 'prints, no dew yet': { midDimPlace: false, sleepTwo: true } };
  const POL = ['HONEST', 'COVER', 'OPEN', 'FAR', 'MID', 'NEAR'], res = { seeds: N, days, note: 'scratch run for w4-kill-lines-design-1; rules in src/g1-watch.mjs and src/g1-night.mjs (globalThis.KL)' };
  for (const [vn, v] of Object.entries(VAR)) {
    globalThis.KL = v; res[vn] = {};
    const opt = { same: v.afterRain ? (k, want) => k === 'shake' && want === 'place' : null };
    for (const dusk of ['NONE', 'CAMP', 'HERE', 'UP']) {
      const all = {}, byDay = {}; for (const p of POL) all[p] = [];
      for (let d = 1; d <= days; d++) { byDay[d] = {}; for (const p of POL) byDay[d][p] = []; }
      for (const p of POL) for (let s = FIRST; s < FIRST + N; s++) for (const r of expedition(s, p, dusk, days)) { all[p].push(r); byDay[r.day][p].push(r); }
      res[vn][dusk] = { all: lines(all, opt) }; for (let d = 1; d <= days; d++) res[vn][dusk]['day' + d] = lines(byDay[d], opt);
    }
  }
  globalThis.KL = undefined;
  return res;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2), N = a.includes('--seeds') ? +a[a.indexOf('--seeds') + 1] : 200, days = a.includes('--days') ? +a[a.indexOf('--days') + 1] : 3, res = measure(N, days);
  if (a.includes('--json')) { const fs = await import('node:fs'); fs.writeFileSync(a[a.indexOf('--json') + 1], JSON.stringify(res, null, 1)); }
  const row = (name, L) => [name, 'L1 p80 ' + L.line1_keepStill.p80 + ' (mean ' + L.line1_keepStill.mean + ')', 'L2 ' + ['far', 'mid', 'near', 'tie'].map(k => k + ' ' + L.line2_range.bestPerDay[k]).join(' ') + ' max ' + L.line2_range.largestBestShare + '%', 'L3 ' + L.line3_cover.coverCheapest + '%', 'habits ' + L.habitsPerDay.mean, 'gone ' + L.goneDays, 'E3 ' + L.e3Empty.HONEST, 'sample days ' + L.daysWithASample, 'filled ' + L.cardLinesFilledPerDay, 'sleep ' + L.sleepNoted + ' (2nd ' + L.secondChanceNotes + ')', 'probes n/w ' + ['FAR', 'MID', 'NEAR'].map(p => L.probes[p].notedPerDay + '/' + L.probes[p].worthPerDay).join(' ')].join(' | ');
  for (const vn of Object.keys(res)) { if (typeof res[vn] !== 'object') continue; for (const dusk of ['NONE', 'CAMP', 'HERE', 'UP']) for (const k of Object.keys(res[vn][dusk])) console.log(row(vn + ' ' + dusk + ' ' + k, res[vn][dusk][k])); }
}

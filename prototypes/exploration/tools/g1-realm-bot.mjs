// G1's three lines measured on MAIN's realm watch (W1-W5), not on the one-place prototype's rules. It drives the same entry as w4-bot.mjs (the realm page in the test sandbox, a named Loika in a place of
// its reach, days in a row) and reads main's own acts: keepStill (a hold), patchAction's note, habRange (far >5, mid 3-5, near <3), the ease ground ('cover' | 'open' | 'plain'). Line definitions are g1-bot's (PR 476).
//   node prototypes/exploration/tools/g1-realm-bot.mjs [--from 1] [--to 200] [--days 3] [--json out.json] [--verbose]
// Policies (one fresh page each, same seed and Loika): HONEST (plays as w4-bot does, --days days); COVER / OPEN (the same, but the approach never steps on open / never on cover ground); FAR / MID / NEAR (the same
// but the stand is a fixed 6 / 4 / 2 tiles off, one note). Probes and COVER/OPEN play day 1 only. Rows go to --json (per seed, per policy) so ranges can be merged by g1-realm-merge (see mergeRows below).
import { makePage } from "../tests/page-harness.mjs";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const arg = (n, d) => { const i = process.argv.indexOf("--" + n); return i < 0 ? d : process.argv[i + 1]; };
const FROM = +arg("from", 1), TO = +arg("to", 200), DAYS = +arg("days", 3), VERBOSE = process.argv.includes("--verbose"), JSON_OUT = arg("json", null);
const POLICIES = ["HONEST", "COVER", "OPEN", "FAR", "MID", "NEAR"], FIXED = { FAR: 6, MID: 4, NEAR: 2 };

// ---- runs inside the page (its globals: S, advance, patchAction, curLay, keepStill, waitTick, ...) ----
function botPage(A) {
  const ex = S.exp, key = ex.patch.key, lay = curLay(), P = ex.patch, col = lay.cell % MW, id = A.id, pol = A.policy, fixed = A.fixed || 0;
  const live = () => curLive(), her = () => live().cr.find(q => q.id === id), spent = () => S.day.spent, dayAt = n => partOfDay(n);
  const DIRN = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const okTile = (x, y) => x >= 1 && y >= 1 && x < lay.w - 1 && y < lay.h - 1 && !!lay.reach[y * lay.w + x] && !T_BLOCK[lay.tiles[y * lay.w + x]] && !NOSTAND(lay.tiles[y * lay.w + x]) && !occupant(key, x, y, 'player') && !lay.feats.some(f => f.x === x && f.y === y);
  const out = { notes: [], gone: false, steps: 0, events: [], ev: [] };
  const runNote = a => { a.run(); if (S.phase === 'watch') { watchKey('confirm'); if (S.phase === 'card') cardKey('confirm'); if (S.phase === 'watch' || S.phase === 'card') watchClose(); } };   // the note action opens the watch view (PR 575): take the note there, back to the field
  const over = () => !S.exp || S.exp.ending || spent() >= DAY.light - 1;
  const quiet = () => { if (over()) return false; waitTick('patch'); return true; };   // time passing before the approach: not a keep-still act
  let cur = null;   // the event being played: its keep-still acts are counted here
  const hold = () => { if (over()) return false; const c = her(); if (cur) cur.still++; if (c && !c.gone) keepStill(c); else waitTick('patch'); return true; };   // a keep-still act (the player's Keep still)
  const rainPlan = () => { const st = S.exp.storm; if (!st) return null; let x = st.x, t = spent(), a = null; const off = () => Math.abs(col + .5 - (x + st.w / 2));
    for (let i = 0; i < 190; i++) { if (off() < 1.5 && a == null) a = t; if (a != null && off() >= 1.5) return { from: a, to: t }; const ov = col + 1 > x && col < x + st.w; x += (ov ? .2 : st.v) * st.dir; t++; } return null; };
  const envAt = T => { const e = easeEnvNow(), r = rainPlan(); return { ...e, wind: windAt(S.seed, lay.cell, T), rain: !!(r && T >= r.from && T < r.to) }; };
  const ground = easeEnvNow().ground;
  const rAvoid = (x, y) => pol === 'COVER' ? ground(x, y) === 'open' : pol === 'OPEN' ? ground(x, y) === 'cover' : false;   // the route: never over open / never through cover
  const heardAtTile = (c, x, y, T) => easeHeardAt(envAt(T), c, x, y, 'creep', wariness1(c.ind.doings.wary));
  const stayAtTile = (c, x, y, T) => { const e = envAt(T), w = wariness1(c.ind.doings.wary); return stayLeft(e, { ...c, wary: w, crowd: 0 }, { x, y }); };
  const herSpot = (c, T) => { const h = hauntAt(c.ind.hs, c.ind.doings, dayAt(T)); return h ? hauntStand(h, (x, y) => okTile(x, y) || (x === c.x && y === c.y)) : null; };
  const bfs = (from, goal, avoid) => { const seen = new Map([[from.x + ',' + from.y, null]]), q = [from]; let g = null;
    while (q.length) { const c = q.shift(); if (goal(c.x, c.y)) { g = c; break; }
      for (const [dx, dy] of Object.values(DIRN)) { const x = c.x + dx, y = c.y + dy, k = x + ',' + y; if (seen.has(k) || !okTile(x, y) || avoid(x, y)) continue; seen.set(k, c); q.push({ x, y }); } }
    if (!g) return null; const path = []; for (let c = g; c && !(c.x === from.x && c.y === from.y); c = seen.get(c.x + ',' + c.y)) path.unshift({ x: c.x, y: c.y }); return path; };
  const stepTo = (t) => { if (over()) return false; const prevP = { x: P.x, y: P.y }; P.x = t.x; P.y = t.y; P.dir = t.x > prevP.x ? 'right' : t.x < prevP.x ? 'left' : t.y > prevP.y ? 'down' : 'up'; out.steps++; advance('patch', { noise: 'creep', moved: true, prevP }); return true; };
  const faceHer = c => { const dx = c.x - P.x, dy = c.y - P.y; P.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); };
  const cheb = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
  const clearAt = T => { const r = rainPlan(); return !(r && T >= r.from && T < r.to) && dayAt(T) !== 'dusk' && dayAt(T) !== 'night' && !(!lay.cave && inFog(lay.cell)); };
  const standFor = (c, spot, lo, hi, T) => bfs({ x: P.x, y: P.y }, (x, y) => { const d = cheb({ x, y }, spot); return d >= lo && d <= hi && !heardAtTile(c, x, y, T); }, (x, y) => rAvoid(x, y) || (heardAtTile(c, x, y, T) && cheb({ x, y }, spot) > 0));
  const walk = (path, untilLight) => { for (const t of path) { if (over() || spent() >= untilLight) return false; const c = her(); if (c && heardAtTile(c, t.x, t.y, spent())) { for (let i = 0; i < 3 && c.ease > 0 && hold(); i++); if (heardAtTile(c, t.x, t.y, spent())) return false; } stepTo(t); } return true; };
  const tellL = () => tellOf(her().ind.doings);
  // ---- plan the day's three moments ----
  const c0 = her(); if (!c0) return JSON.stringify({ missing: 1 });
  const win = calmWindow(S.seed, id, S.turn, DAY.parts, routineOf(c0.ind.doings)), rp = rainPlan();
  const events = [];
  if (rp && rp.to < DAY.light - 20) events.push({ k: 'shake', at: rp.to - tellOf(c0.ind.doings) });
  if (win) events.push({ k: 'calm', at: win.from + 4 });
  { let sl = null; for (let T = DAY.parts.slice(0, 4).reduce((s, q) => s + q[1], 0); T < DAY.light - 6 && sl == null; T++) { const h = hauntAt(c0.ind.hs, c0.ind.doings, dayAt(T)); if (h && h === c0.ind.hs.bed) sl = T; } if (sl != null) events.push({ k: 'sleep', at: sl + 2 }); }
  events.sort((a, b) => a.at - b.at);
  { const rp0 = bfs({ x: P.x, y: P.y }, (x, y) => { const cc = her(); return cc && cheb({ x, y }, cc) >= 6; }, () => false); if (rp0) { out.events.push('retreat ' + rp0.length); for (const t of rp0) { if (over()) break; stepTo(t); } } }
  out.plan = events.map(e => e.k + '@' + e.at);
  for (let ei = 0; ei < events.length; ei++) {
    const e = events[ei];
    if (over()) break;
    const c = her(); if (!c) break; if (c.gone || c.ease >= 3) { out.gone = true; break; }
    const k = e.k, want = habWant(id, k), T = e.at;
    const rec = cur = { k, still: 0, noted: null, first: null, cost: null, reached: false, ei }; out.ev.push(rec);
    const spot = herSpot(c, T) || { x: c.x, y: c.y };
    let path;
    if (fixed) {   // the probe: the fixed range, unheard if there is a way, else the plain way
      path = standFor(c, spot, fixed, fixed, T) || bfs({ x: P.x, y: P.y }, (x, y) => cheb({ x, y }, spot) === fixed, () => false);
    } else {
      const rng = want === 'face' ? [3, 4] : want === 'coat' ? [3, 5] : (clearAt(T) ? [6, 8] : [3, 5]);
      path = standFor(c, spot, rng[0], rng[1], T);
      if (!path && want === 'place') path = standFor(c, spot, 3, 5, T);
      if (!path) path = standFor(c, spot, 3, 8, T);
      if (!path) path = bfs({ x: P.x, y: P.y }, (x, y) => { const d = cheb({ x, y }, spot); return d >= 4 && d <= 8; }, rAvoid);
    }
    if (!path) { out.events.push(k + ': no stand'); continue; }
    const startAt = Math.max(spent(), e.at - tellOf(c.ind.doings) - (path.length + 3) - 6);
    while (spent() < startAt && !over()) quiet();
    const t0 = spent(), done = walk(path, e.at + 8); rec.reached = done; if (done) rec.arrive = spent() - t0;
    let guard = 0;
    while (!over() && guard++ < 40) { const cc = her(); if (!cc || cc.gone || cc.ease >= 3) break; if (cc.hb && cc.hb.k === k) break; if (spent() > e.at + 16) break; hold(); }
    const cc = her(); if (!cc || !cc.hb || cc.hb.k !== k) { out.events.push(k + ': none to see' + (cc && cc.gone ? ' (gone)' : '')); if (cc && cc.gone) out.gone = true; continue; }
    if (!fixed && want === 'face' && cheb(P, cc) > 2) {
      const p2 = bfs({ x: P.x, y: P.y }, (x, y) => cheb({ x, y }, cc) <= 2 && !heardAtTile(cc, x, y, spent()) && stayAtTile(cc, x, y, spent()) >= 5, (x, y) => heardAtTile(cc, x, y, spent()));
      if (p2 && p2.length <= 4) for (const t of p2) { if (!cc.hb) break; stepTo(t); }
    }
    const closeIn = hc => { if (fixed) return false; const want2 = Math.max(3, cheb(P, hc) - 1), p3 = bfs({ x: P.x, y: P.y }, (x, y) => cheb({ x, y }, hc) <= want2 && !heardAtTile(hc, x, y, spent()), (x, y) => heardAtTile(hc, x, y, spent())); if (!p3 || !p3.length || cheb(P, hc) <= 3) return false; return stepTo(p3[0]); };
    for (let n = 0; n < 10 && !over(); n++) { const hc = her(); if (!hc || !hc.hb) break; faceHer(hc);
      const a = patchAction(); if (a.label === WORDS.habit.note) { const before = (S.exp.stats.noted || []).length; runNote(a); const nn = (S.exp.stats.noted || []); if (nn.length > before) { const nt = nn[nn.length - 1]; out.notes.push({ ...nt, want, T: spent() }); rec.noted = nt.range; rec.first = !!nt.first; rec.cost = rec.reached ? rec.arrive : null; break; } } else if (!closeIn(hc)) hold(); }
    cur = null;
    for (let n = 0; n < 12 && !over(); n++) { const hc = her(); if (!hc || !hc.hb) break; quiet(); }
  }
  cur = null;
  const cf = her(); if (cf && (cf.gone || cf.ease >= 3)) out.gone = true;
  out.spent = spent(); out.ended = !!(S.exp && S.exp.ending);
  out.lastNote = out.notes.length ? out.notes[out.notes.length - 1].T : -1;
  return JSON.stringify(out);
}

const FIND = `(() => { let best = null, tried = 0; for (const c of [...new Set(S.cr.filter(q => q.sp === 0).map(q => q.c))]) { if (!G.comp[c] || G.land[c] === L.WATER) continue; const key = String(c), lay = layout(key), live = ensureLive(key);
  const ls = live.cr.filter(q => q.sp === 0 && q.ind); if (!ls.length) { delete S.exp.live[key]; continue; } tried++;
  const company = live.cr.filter(q => q.id !== ls[0].id && !q.hide && (q.ind ? q.ind.doings.wary >= .5 : (q.b || 0) <= .55)).length;
  if (!best || (company > 0 && !best.company)) best = { key, id: ls[0].id, company }; if (best.company || tried >= 4) break; }
  return best ? JSON.stringify(best) : 'null'; })()`;
const NEWDAY = (key, day) => `(() => { const ex = S.exp; S.day = freshDay(); S.turn = ${day - 1}; ex.ending = 0; ex.live = {}; ex.storm = stormFor(+${JSON.stringify(key)}); if (${day} === 1) ex.storm.x -= 2 * ex.storm.dir; ex.stray = null; ex.shield = ex.smax; S.exp.pos = ${JSON.stringify(key)}; enterPatch(${JSON.stringify(key)}); lightningLift(${JSON.stringify(key)}, 15, 15, 40); return 1; })()`;

function playSeed(seed, pol) {
  const p = makePage({ gen: 7, console: "collect", els: true, canvas: true, raf: "count" });
  const row = { seed, policy: pol, days: [] };
  try {
    p.run(`recordSigns = function () {};`);   // speed only, as w4-bot does
    p.run(`newWorld(${seed}); startExpedition('weather', G.spawns[0]);`);
    const pick = JSON.parse(p.run(FIND)); if (!pick) { row.skip = "no Loika"; return row; }
    p.run(`S.known = [0, ...S.known.filter(k => k !== 0)];`);
    // The realm's card asks her coat first, then her face, then where she goes (habits.mjs wantOf), so a fresh Loika's day-1 card is always the coat and only the mid stand fills it.
    // The probes (FIXED) play the card a Loika is on at day 1 + seed mod 3, so the three cards are all met across the seeds (the model draws each card's want at random).
    if (FIXED[pol] && !process.argv.includes("--day1-card")) { const st = seed % 3; p.run(`(() => { const id = ${JSON.stringify(pick.id)}, H = S.habits || (S.habits = {}); for (const k of ['shake', 'calm', 'sleep']) { const r = (H[id] || (H[id] = {}))[k] = { ranges: {}, got: {}, best: null, plays: 0, sample: null, sights: 0 }; if (${st} >= 1) r.got.coat = 1; if (${st} >= 2) r.got.face = 1; } })()`); }
    const nDays = pol === 'HONEST' ? DAYS : 1;
    for (let day = 1; day <= nDays; day++) {
      p.run(NEWDAY(pick.key, day));
      p.run(`(() => { const l = curLive(); l.strike = null; })()`);
      row.days.push(JSON.parse(p.run(`(${botPage.toString()})(${JSON.stringify({ id: pick.id, policy: pol, fixed: FIXED[pol] || 0 })})`)));
    }
  } catch (e) { row.crash = String(e && e.stack || e).slice(0, 400); }
  return row;
}

// ---- the numbers (rows: [{seed, policy, days}]) ----
const sorted = a => a.slice().sort((x, y) => x - y);
const pct = (a, p) => { if (!a.length) return null; const s = sorted(a); return s[Math.min(s.length - 1, Math.ceil(p * s.length) - 1)]; };
const share = (n, m) => (m ? Math.round(1000 * n / m) / 10 : null);
export function measure(rows0) {
  const rows = rows0.map(r => ({ ...r, days: (r.days || []).filter(d => d && d.ev) }));   // a day with no Loika ({missing:1}) is not a played day
  const by = {}; for (const pol of POLICIES) by[pol] = new Map(rows.filter(r => r.policy === pol && r.days.length && !r.crash).map(r => [r.seed, r]));
  const H = [...by.HONEST.values()], out = { seeds: [...new Set(rows.map(r => r.seed))].length, played: H.length, crashed: rows.filter(r => r.crash).length, skipped: rows.filter(r => r.skip && r.policy === 'HONEST').length };
  // line 1: keep-still acts per habit noted
  const stillOf = days => { const st = [], miss = new Set(); for (const r of H) for (const d of r.days.slice(0, days)) for (const e of d.ev) if (e.noted) { st.push(e.still); if (e.still >= 3) miss.add(r.seed); } return { st, miss: [...miss].sort((a, b) => a - b) }; };
  for (const [nm, days] of [['keepStillDay1', 1], ['keepStillAllDays', 99]]) { const { st, miss } = stillOf(days);
    out[nm] = { habitsNoted: st.length, median: pct(st, .5), p80: pct(st, .8), mean: Math.round(10 * st.reduce((a, b) => a + b, 0) / Math.max(1, st.length)) / 10, line: 'median under three and p80 under three', pass: pct(st, .5) < 3 && pct(st, .8) < 3, seedsWithAHabitOfThreeOrMoreHolds: miss.length, seeds: miss.slice(0, 60) }; }
  // line 2: range at the first note, and the best range per seed (probes; a note is worth 1, and 2 more when it fills the card's line, as g1-bot's worth)
  const first = { far: 0, mid: 0, near: 0 }; for (const r of H) for (const d of r.days) for (const n of d.notes) if (n.first) first[n.range]++;
  const firstN = first.far + first.mid + first.near, bestOf = { far: 0, mid: 0, near: 0, tie: 0, none: 0 }, notNear = [];
  const worth = (pol, seed) => { const r = by[pol].get(seed); return r ? r.days[0].notes.reduce((a, n) => a + 1 + (n.filled ? 2 : 0), 0) : null; };
  const common = [...by.FAR.keys()].filter(s => by.MID.has(s) && by.NEAR.has(s)).sort((a, b) => a - b);
  for (const s of common) { const w = { far: worth('FAR', s), mid: worth('MID', s), near: worth('NEAR', s) }, m = Math.max(w.far, w.mid, w.near), wins = Object.keys(w).filter(k => w[k] === m), res = m === 0 ? 'none' : wins.length === 1 ? wins[0] : 'tie'; bestOf[res]++; if (res !== 'near') notNear.push(s + ':' + res); }
  const uniq = bestOf.far + bestOf.mid + bestOf.near, bestShare = Math.max(bestOf.far, bestOf.mid, bestOf.near) / Math.max(1, uniq);
  out.range = { firstNote: { ...first, shares: { far: share(first.far, firstN), mid: share(first.mid, firstN), near: share(first.near, firstN) } }, seedsCompared: common.length, bestPerSeed: bestOf, largestBestShare: share(Math.round(bestShare * 1000), 1000), line: 'it varies by day (no single range best on every seed)', pass: uniq > 0 && bestShare < 1, seedsNotNearBest: notNear.slice(0, 80) };
  // line 3: of approaches that reach a note, the cover route cheapest in light (first moment of day 1, the same start for both)
  let reach = 0, cc = 0, oc = 0, tie = 0; const coverSeeds = [];
  for (const s of by.COVER.keys()) { const o = by.OPEN.get(s); if (!o) continue;
    const ce = by.COVER.get(s).days[0].ev[0], oe = o.days[0].ev[0]; if (!ce || !oe) continue;
    const c = ce.noted && ce.cost !== null ? ce.cost : Infinity, q = oe.noted && oe.cost !== null ? oe.cost : Infinity; if (c === Infinity && q === Infinity) continue;
    reach++; if (c <= q) { cc++; if (c === q) tie++; } else oc++; }
  out.cover = { approachesReachingANote: reach, coverCheapest: share(cc, reach), ofWhichTied: tie, openCheapest: share(oc, reach), line: 'no more than 70%', pass: share(cc, reach) <= 70 };
  out.goneDays = H.flatMap(r => r.days).filter(d => d.gone).length; out.totalDays = H.flatMap(r => r.days).length;
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url) && process.argv.includes("--merge")) {   // --merge a.json b.json ... --out merged.json: the ranges' rows measured as one
  const { readFileSync } = await import("node:fs"), files = process.argv.slice(process.argv.indexOf("--merge") + 1).filter(f => f.endsWith(".json")), rows = files.flatMap(f => JSON.parse(readFileSync(f, "utf8")));
  const res = measure(rows); if (arg("out", null)) writeFileSync(arg("out", null), JSON.stringify(res, null, 1)); console.log(JSON.stringify(res, null, 1));
} else if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const rows = [];
  for (let seed = FROM; seed <= TO; seed++) { for (const pol of POLICIES) { rows.push(playSeed(seed, pol)); } if (VERBOSE) console.log(seed, rows.slice(-6).map(r => r.policy + ':' + (r.skip || r.crash || r.days.map(d => d.notes.length).join('/'))).join(' ')); }
  if (JSON_OUT) writeFileSync(JSON_OUT, JSON.stringify(rows));
  console.log(JSON.stringify(measure(rows), null, 1));
}

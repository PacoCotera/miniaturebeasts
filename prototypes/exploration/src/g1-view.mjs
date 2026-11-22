// G1's screen: the watch in one place, drawn on the Companion's 450 x 600 frame (opened only by the test entry ?g1=<seed> on /play, never reached in normal play; it reads and writes no save).
// The ground is a flat schematic of the place's tiles (a diagram, not art): the picture of the place waits as a named empty slot, [art] g1-place-ground. The Loika, the wary mibi and the explorer
// are the game's own signed pictures (creatureArt, playerArt). The rules are g1-watch.mjs; this file only draws them and turns the keys into acts.
import * as G from "./g1-watch.mjs";
import { DAY, partOfDay, G1 } from "./words.mjs";

const TS = 32, X0 = 1, Y0 = 36;   // 14 x 16 tiles of 32 px fit the 450-wide frame
const GROUND = { '.': 'grass', ',': 'sand', 't': 'sprout', 'r': 'teal', '#': 'stone', '^': 'slate' };
const NIGHT = { dawn: 3, morning: 0, midday: 0, afternoon: 1, dusk: 5, night: 9 };   // dither levels of 16 over the place: the part of day, in the game's own way of showing it
const WIND_WORD = { N: 'north', E: 'east', S: 'south', W: 'west' };

export function makeG1(d, seed = 1) {
  const { R, text, textW, blit, C, ditherFill, creatureArt, playerArt, SCR_W } = d;
  let S = G.makeDay(seed), msg = '', held = null, timer = null, frame = 0;
  const fc = G.forecast(S); msg = G1.forecast(fc.rain, fc.mibiFrom + ' to ' + (fc.mibiFrom + 10));
  const say = from => {
    const ev = S.events.slice(from); let m = '';
    for (const e of ev) {
      if (e === 'heard') m = G1.heardStep; else if (e === 'settled') m = G1.settled; else if (e === 'gone') m = G1.gone; else if (e === 'lost') m = G1.lost;
      else if (e === 'tell' && S.L.habit) m = G1.habit[S.L.habit.k].tell;
    }
    if (m) msg = m;
  };
  const act = fn => { const from = S.events.length; const r = fn(); say(from); return r; };
  const doNote = () => {
    const r = G.note(S);
    if (r.ok) msg = G1.note(r.range, r.text) + (r.filled ? ' · ' + G1.want[S.want[r.k]] + ' learned' : '') + (r.first ? ' · ' + G1.data(1) : '') + (r.sample ? ' · ' + r.sample : '');
    else msg = r.why === 'dup' ? G1.noteDup : (G1.noteNo[r.why] || G1.noteNo.habit);
  };
  function press(k) {
    if (k in { up: 1, down: 1, left: 1, right: 1 }) {
      held = k; act(() => G.step(S, k, 'creep'));
      clearTimeout(timer); timer = setTimeout(function loop() { if (held !== k) return; act(() => G.step(S, k, 'walk')); timer = setTimeout(loop, 260); }, 380);   // held down: a stride (walk)
    } else if (k === 'confirm') {
      const st = G.noteState(S);
      if (st.ok) doNote(); else { const from = S.events.length, r = G.hold(S); say(from); msg = r.why === 'habit' ? (G.habitNow(S) || '') : (G1.hold[r.why] || ''); }
    } else if (k === 'call') { act(() => G.wait(S)); msg = G.habitNow(S) || ''; }
    else if (k === 'back') { G.face(S); }
    return true;
  }
  function release(k) { if (held === k) { held = null; clearTimeout(timer); } return true; }

  const poseOf = () => {
    const L = S.L, h = L.habit;
    if (L.asleep) return 'curl';
    if (h && h.k === 'shake' && h.n >= S.ind.tell && h.n < S.ind.tell + 3) return 'shake';
    if (h && h.k === 'sleep' && h.n >= S.ind.tell + 1) return 'curl';
    if (L.ease >= 1 || (h && h.k === 'calm')) return 'alert';
    return 'idle';
  };
  const px = (x, y) => [X0 + x * TS, Y0 + y * TS];
  function draw(t) {
    frame++;
    R(0, 0, SCR_W, 600, C.void);
    // the ground (a diagram of the tiles)
    for (let y = 0; y < G.H; y++) for (let x = 0; x < G.W; x++) { const [sx, sy] = px(x, y); R(sx, sy, TS, TS, C[GROUND[G.tileAt(x, y)]]); }
    const ring = (x, y, col) => { const [sx, sy] = px(x, y); R(sx + 2, sy + 2, TS - 4, 2, C[col]); R(sx + 2, sy + TS - 4, TS - 4, 2, C[col]); R(sx + 2, sy + 2, 2, TS - 4, C[col]); R(sx + TS - 4, sy + 2, 2, TS - 4, C[col]); };
    ring(G.HAUNT.x, G.HAUNT.y, 'gold'); ring(G.BED.x, G.BED.y, 'bark');   // her haunt and her bed, marked on the ground as a diagram
    const sprite = (pb, x, y, flip, dy = 0) => { if (pb) { const [sx, sy] = px(x, y); blit(pb, sx, sy + dy, undefined, flip); } };
    // the wary mibi
    if (S.M.here) sprite(creatureArt(2, 'alert', 0, 1, false), S.M.x, S.M.y, false);
    // her
    const L = S.L;
    if (!L.gone) {
      const pose = poseOf(), fr = pose === 'shake' ? frame % 2 : 0;
      sprite(creatureArt(0, pose, fr, 1, false), L.x, L.y, L.x < S.P.x);
    }
    // the explorer
    sprite(playerArt(S.P.dir, 'stand', 0), S.P.x, S.P.y, false);
    // the weather and the light of the part of day
    const part = partOfDay(S.light);
    if (G.raining(S)) ditherFill(X0, Y0, G.W * TS, G.H * TS, 'sky', 3);
    if (NIGHT[part]) ditherFill(X0, Y0, G.W * TS, G.H * TS, 'void', NIGHT[part]);
    // (range rule B, C) the card: one line per habit, filled when a note gave it; and the stay at the explorer's tile, at the edge of her ring
    R(X0, Y0, 250, 38, C.ink);
    ['shake', 'calm', 'sleep'].forEach((k, i) => text(G.cardLine(S, k), X0 + 4, Y0 + 3 + i * 12, S.got[k] && S.got[k][S.want[k]] ? C.gold : C.bone, 1, 'left', true));
    if (!L.gone) { const [bx, by] = px(L.x, L.y); text(G1.stay(G.stayAt(S, S.P.x, S.P.y)), bx + TS - 2, by - 8, G.cheb(S.P, L) <= 2 ? C.gold : C.fog, 1, 'left', true); }
    // the top strip: the part of day and the light, the wind, Data
    R(0, 0, SCR_W, 32, C.ink);
    text(part + ' · light ' + S.light + ' of ' + DAY.light, 8, 9, C.bone, 2, 'left', true);
    text(G.raining(S) ? 'rain' : 'wind ' + WIND_WORD[G.windNow(S)], SCR_W - 8, 9, G.raining(S) ? C.sky : C.fog, 2, 'right', true);
    // the two lines under the place: her ease and whether the next step would be heard; then what just happened
    R(0, 548, SCR_W, 52, C.ink);
    text(S.over ? 'the day is over · Data ' + S.data : (L.gone ? G1.gone : G.easeWord(S) + ' · ' + G.hearLine(S)), 8, 552, C.bone, 2, 'left', true);
    const m = S.over ? '' : msg || G.habitNow(S) || '', rows = [''];
    for (const w of m.split(' ')) { if ((rows[rows.length - 1] + ' ' + w).trim().length > 38) rows.push(w); else rows[rows.length - 1] = (rows[rows.length - 1] + ' ' + w).trim(); }
    rows.slice(0, 2).forEach((r, i) => text(r, 8, 568 + i * 16, C.fog, 2, 'left', true));
  }
  return { press, release, draw, state: () => S, restart: n => { S = G.makeDay(n || seed); msg = ''; } };
}

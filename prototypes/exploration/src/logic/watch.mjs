// W6b: the watch view's pure rules (plan v6 S3 Release B). The page keeps the state (c.hb on the live creature); nothing is stored here.
// The pose of her picture follows the beat of the play; the chip says the range, the tiles and what this range gives now (the range rule: it gives by range only).
import { BEATS } from './habits.mjs';
import { WORDS } from '../words.mjs';

// the current beat of a play: -1 while the tell goes on, else 0..3 (habitTick: beat = n - tell, a play ends at BEATS)
export const beatOf = h => Math.max(-1, Math.min(BEATS - 1, (h.n | 0) - (h.tell | 0)));
// her picture's pose at a beat (one of the four signed Loika poses: stand, shake, calm, curl); the tell is her standing, ears up
export function poseOf(k, b) {
  if (b < 0) return 'stand';
  if (k === 'shake') return b <= 2 ? 'shake' : 'stand';
  if (k === 'calm') return b < 2 ? 'stand' : 'calm';
  if (k === 'sleep') return b < 1 ? 'stand' : 'curl';
  return 'stand';
}
export const stripPoses = k => Array.from({ length: BEATS }, (_, b) => poseOf(k, b));
// what the range gives now, in words: gives is what givesAt returns (clear air and the hour are the page's)
export function giveWords(gives) {
  const W = WORDS.watch.gives;
  return !gives.length ? W.shape : gives.includes('face') ? W.face : gives.includes('coat') ? W.coat : W.place;
}
// the chip: its tag (the range), the tiles, what the range gives now, and within 2 tiles the stay left (the words stayShort); `text` is the whole chip on one line
export function chipOf({ range, tiles, gives, left }) {
  const W = WORDS.watch, t = W.tiles(tiles), gw = giveWords(gives), st = left == null ? '' : WORDS.ease.stayShort(left);
  return { tag: range, tiles: t, gives: gw, stay: st, text: [range, t, gw, st].filter(Boolean).join(' · ') };
}
// design 2026-11-24 12:03: the eye never hands over what the range withholds. At far, and whenever the air is not clear (rain, fog), the view draws her shape
// (the strip's silhouette from the cut's mask, 1x); mid and near, in clear air, draw the signed cut.
export const drawsCut = (range, clear) => range !== 'far' && !!clear;

// The workbench's way to the one random module (core/base/random.mjs).
// rng(seed): the species draws' stream. It is callable and gives the draw as a share of one (what the blends and the shares of a pool still read),
// and carries the whole-number stream as `.s`, the one the picks, the cross's coin and its hidden-copy chance ask.
// streamOf(r): the whole-number stream of a draw function; a plain function (Math.random, a test's own) is wrapped so it answers the same questions.
import { mulberry32, seedFromText } from "../../core/base/random.mjs";

const WHOLE = 4294967296;

export function fromStream(s) {
  const f = () => s.next() / 2 ** s.bits;
  f.s = s;
  return f;
}

export const rng = (seed) => fromStream(mulberry32(seedFromText(seed)));

export function streamOf(r) {
  if (r.s) return r.s;
  return {
    below: (n) => Math.floor(r() * n),
    chance: (a, b) => r() < a / b,
    under: (t) => r() < t / WHOLE,
    pick: (list) => list[Math.floor(r() * list.length)],
    shuffle: (list) => { for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; } return list; },
  };
}

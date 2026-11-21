// The one random module of the game (version 1). Whole numbers only: a draw is a whole number, a question is "below n", "a in b" or "under t".
// Version 1 holds today's two generators unchanged, so every pod, mibi and land already made comes out the same:
//   mulberry32(seed)  32-bit draws (the species draws, the genome stamp, the cross, the shed pod, the Station's art, the land's dice)
//   seeded24(seed)    24-bit draws (the Station's developer siblings and shed pods)
//   seedFromText(s)   a 32-bit seed from a text (the species draws' seed)
// A stream is { bits, next, below, range, chance, under, pick, shuffle }:
//   next()        the next draw, a whole number 0 .. 2^bits - 1
//   below(n)      a whole number 0 .. n-1 (n up to 2^21), the same number floor(draw * n / 2^bits) always was
//   range(a, b)   a whole number a .. b
//   chance(a, b)  true with odds "a in b"
//   under(t)      true when the draw is below t, t counted in 2^bits-ths (a share kept as a whole threshold)
//   pick(list)    one entry; shuffle(list) shuffles in place and returns it
import { scale } from "./whole.mjs";

export const VERSION = 1;

function stream(next, bits) {
  const s = {
    bits,
    next,
    below: (n) => scale(next(), n, bits),
    range: (a, b) => a + scale(next(), b - a + 1, bits),
    chance: (a, b) => next() * b < a * 2 ** bits,
    under: (t) => next() < t,
    pick: (list) => list[scale(next(), list.length, bits)],
    shuffle: (list) => {
      for (let i = list.length - 1; i > 0; i--) {
        const j = scale(next(), i + 1, bits);
        const t = list[i]; list[i] = list[j]; list[j] = t;
      }
      return list;
    },
  };
  return s;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return stream(() => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  }, 32);
}

export function seeded24(seed) {
  let x = seed >>> 0;
  return stream(() => {
    x = (Math.imul(x ^ (x >>> 15), 0x2c1b3c6d) + 0x9e3779b9) >>> 0;
    return x >>> 8;
  }, 24);
}

export function seedFromText(text) {
  let a = 0;
  for (const ch of String(text)) a = (Math.imul(a ^ ch.charCodeAt(0), 0x01000193) + 0x9e3779b9) >>> 0;
  return a;
}

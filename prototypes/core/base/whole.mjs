// Whole-number helpers of the core. The only file in core/ allowed to use the division operator;
// every other file asks for these. Every argument and result is a whole number.

// The largest whole number a double holds exactly.
export const SAFE = 9007199254740991;

// floor(a / b) for whole a >= 0 and whole b > 0.
export function div(a, b) {
  return Math.floor(a / b);
}

// floor(a * n / 2^bits) for whole a, n >= 0, whole bits 1..32, when a * n stays exact (below 2^53).
export function scale(a, n, bits) {
  const p = a * n;
  if (p > SAFE) throw new RangeError("scale: the product leaves the exact range");
  return div(p, 2 ** bits);
}

// The whole square root: the largest r with r * r <= n, for whole n in 0..2^53.
export function isqrt(n) {
  let r = Math.floor(Math.sqrt(n));
  while (r * r > n) r--;
  while ((r + 1) * (r + 1) <= n) r++;
  return r;
}

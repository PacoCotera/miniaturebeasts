// Reed–Solomon over GF(256), primitive polynomial 0x11d, generator roots
// α^0..α^(p-1) (the same code family QR uses). Systematic: parity follows the
// message. Decoder: syndromes, Berlekamp–Massey, Chien search, Forney.
const EXP = new Uint8Array(512), LOG = new Uint8Array(256);
{
  let x = 1;
  for (let i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x = (x << 1) ^ (x & 0x80 ? 0x11d : 0); }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
}
const mul = (a, b) => (a && b ? EXP[LOG[a] + LOG[b]] : 0);
const div = (a, b) => { if (!b) throw new Error("division by zero"); return a ? EXP[(LOG[a] + 255 - LOG[b]) % 255] : 0; };
const pow = (i) => EXP[((i % 255) + 255) % 255];

export function rsEncode(msg, p) {
  let gen = [1];
  for (let i = 0; i < p; i++) {
    const g = new Array(gen.length + 1).fill(0);
    gen.forEach((c, j) => { g[j] ^= c; g[j + 1] ^= mul(c, EXP[i]); });
    gen = g;
  }
  const rem = new Array(p).fill(0);
  for (const byte of msg) {
    const f = byte ^ rem.shift();
    rem.push(0);
    for (let j = 0; j < p; j++) rem[j] ^= mul(gen[j + 1], f);
  }
  return rem;
}

// Corrects up to p/2 byte errors in place. Returns {ok, corrected} or {ok:false}.
export function rsDecode(code, p) {
  const n = code.length;
  const S = new Array(p).fill(0);
  let clean = true;
  for (let i = 0; i < p; i++) {
    let s = 0;
    for (let k = 0; k < n; k++) s ^= mul(code[k], pow(i * (n - 1 - k)));
    S[i] = s;
    if (s) clean = false;
  }
  if (clean) return { ok: true, corrected: 0, data: code };
  // Berlekamp–Massey (ascending coefficients)
  let C = [1], B = [1], L = 0, m = 1, b = 1;
  for (let r = 0; r < p; r++) {
    let d = S[r];
    for (let i = 1; i <= L; i++) d ^= mul(C[i] ?? 0, S[r - i]);
    if (d === 0) { m++; continue; }
    const coef = div(d, b), T = C.slice();
    const need = B.length + m;
    while (C.length < need) C.push(0);
    for (let i = 0; i < B.length; i++) C[i + m] ^= mul(coef, B[i]);
    if (2 * L <= r) { L = r + 1 - L; B = T; b = d; m = 1; } else m++;
  }
  while (C.length > 1 && C[C.length - 1] === 0) C.pop();
  if (C.length - 1 !== L || 2 * L > p) return { ok: false };
  // Ω = S·Λ mod x^p
  const O = new Array(p).fill(0);
  for (let i = 0; i < p; i++) for (let j = 0; j <= i && j < C.length; j++) O[i] ^= mul(C[j], S[i - j]);
  const evalAsc = (P, x) => { let y = 0, xp = 1; for (const c of P) { y ^= mul(c, xp); xp = mul(xp, x); } return y; };
  const out = code.slice();
  let found = 0;
  for (let k = 0; k < n; k++) {
    const e = n - 1 - k, Xinv = pow(-e);
    if (evalAsc(C, Xinv) !== 0) continue;
    let dl = 0, xp = 1; // Λ'(Xinv): odd terms
    for (let i = 1; i < C.length; i += 2) { dl ^= mul(C[i], xp); xp = mul(xp, mul(Xinv, Xinv)); }
    if (!dl) return { ok: false };
    out[k] ^= mul(pow(e), div(evalAsc(O, Xinv), dl));
    found++;
  }
  if (found !== L) return { ok: false };
  // verify
  for (let i = 0; i < p; i++) {
    let s = 0;
    for (let k = 0; k < n; k++) s ^= mul(out[k], pow(i * (n - 1 - k)));
    if (s) return { ok: false };
  }
  return { ok: true, corrected: found, data: out };
}

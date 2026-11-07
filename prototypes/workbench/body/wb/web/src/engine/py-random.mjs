// Python's random.Random(<str>): the Mersenne Twister seeded the way CPython seeds from text (the text's bytes, then their SHA-512, as one big number, read in 32-bit words). A mesh body's Variety draws (wb/variety.mesh_draw) use it.

const K = [
  0x428a2f98d728ae22n, 0x7137449123ef65cdn, 0xb5c0fbcfec4d3b2fn, 0xe9b5dba58189dbbcn, 0x3956c25bf348b538n, 0x59f111f1b605d019n, 0x923f82a4af194f9bn, 0xab1c5ed5da6d8118n,
  0xd807aa98a3030242n, 0x12835b0145706fben, 0x243185be4ee4b28cn, 0x550c7dc3d5ffb4e2n, 0x72be5d74f27b896fn, 0x80deb1fe3b1696b1n, 0x9bdc06a725c71235n, 0xc19bf174cf692694n,
  0xe49b69c19ef14ad2n, 0xefbe4786384f25e3n, 0x0fc19dc68b8cd5b5n, 0x240ca1cc77ac9c65n, 0x2de92c6f592b0275n, 0x4a7484aa6ea6e483n, 0x5cb0a9dcbd41fbd4n, 0x76f988da831153b5n,
  0x983e5152ee66dfabn, 0xa831c66d2db43210n, 0xb00327c898fb213fn, 0xbf597fc7beef0ee4n, 0xc6e00bf33da88fc2n, 0xd5a79147930aa725n, 0x06ca6351e003826fn, 0x142929670a0e6e70n,
  0x27b70a8546d22ffcn, 0x2e1b21385c26c926n, 0x4d2c6dfc5ac42aedn, 0x53380d139d95b3dfn, 0x650a73548baf63den, 0x766a0abb3c77b2a8n, 0x81c2c92e47edaee6n, 0x92722c851482353bn,
  0xa2bfe8a14cf10364n, 0xa81a664bbc423001n, 0xc24b8b70d0f89791n, 0xc76c51a30654be30n, 0xd192e819d6ef5218n, 0xd69906245565a910n, 0xf40e35855771202an, 0x106aa07032bbd1b8n,
  0x19a4c116b8d2d0c8n, 0x1e376c085141ab53n, 0x2748774cdf8eeb99n, 0x34b0bcb5e19b48a8n, 0x391c0cb3c5c95a63n, 0x4ed8aa4ae3418acbn, 0x5b9cca4f7763e373n, 0x682e6ff3d6b2b8a3n,
  0x748f82ee5defb2fcn, 0x78a5636f43172f60n, 0x84c87814a1f0ab72n, 0x8cc702081a6439ecn, 0x90befffa23631e28n, 0xa4506cebde82bde9n, 0xbef9a3f7b2c67915n, 0xc67178f2e372532bn,
  0xca273eceea26619cn, 0xd186b8c721c0c207n, 0xeada7dd6cde0eb1en, 0xf57d4f7fee6ed178n, 0x06f067aa72176fban, 0x0a637dc5a2c898a6n, 0x113f9804bef90daen, 0x1b710b35131c471bn,
  0x28db77f523047d84n, 0x32caab7b40c72493n, 0x3c9ebe0a15c9bebcn, 0x431d67c49c100d4cn, 0x4cc5d4becb3e42b6n, 0x597f299cfc657e2an, 0x5fcb6fab3ad6faecn, 0x6c44198c4a475817n,
]
const M = (1n << 64n) - 1n
const rotr = (x, n) => ((x >> n) | (x << (64n - n))) & M

export function sha512(bytes) {
  const H = [0x6a09e667f3bcc908n, 0xbb67ae8584caa73bn, 0x3c6ef372fe94f82bn, 0xa54ff53a5f1d36f1n, 0x510e527fade682d1n, 0x9b05688c2b3e6c1fn, 0x1f83d9abfb41bd6bn, 0x5be0cd19137e2179n]
  const len = bytes.length, padLen = (len + 17 + 127) & ~127
  const buf = new Uint8Array(padLen)
  buf.set(bytes); buf[len] = 0x80
  const dv = new DataView(buf.buffer)
  dv.setBigUint64(padLen - 8, BigInt(len) * 8n)
  const w = new Array(80)
  for (let o = 0; o < padLen; o += 128) {
    for (let i = 0; i < 16; i++) w[i] = dv.getBigUint64(o + i * 8)
    for (let i = 16; i < 80; i++) {
      const s0 = rotr(w[i - 15], 1n) ^ rotr(w[i - 15], 8n) ^ (w[i - 15] >> 7n)
      const s1 = rotr(w[i - 2], 19n) ^ rotr(w[i - 2], 61n) ^ (w[i - 2] >> 6n)
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) & M
    }
    let [a, b, c, d, e, f, g, h] = H
    for (let i = 0; i < 80; i++) {
      const S1 = rotr(e, 14n) ^ rotr(e, 18n) ^ rotr(e, 41n)
      const ch = (e & f) ^ (~e & M & g)
      const t1 = (h + S1 + ch + K[i] + w[i]) & M
      const S0 = rotr(a, 28n) ^ rotr(a, 34n) ^ rotr(a, 39n)
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const t2 = (S0 + maj) & M
      h = g; g = f; f = e; e = (d + t1) & M; d = c; c = b; b = a; a = (t1 + t2) & M
    }
    const add = [a, b, c, d, e, f, g, h]
    for (let i = 0; i < 8; i++) H[i] = (H[i] + add[i]) & M
  }
  const out = new Uint8Array(64), odv = new DataView(out.buffer)
  for (let i = 0; i < 8; i++) odv.setBigUint64(i * 8, H[i])
  return out
}

class MT {
  constructor() { this.mt = new Uint32Array(624); this.i = 625 }
  initGenrand(s) {
    const mt = this.mt
    mt[0] = s >>> 0
    for (let k = 1; k < 624; k++) mt[k] = (Math.imul(1812433253, mt[k - 1] ^ (mt[k - 1] >>> 30)) + k) >>> 0
    this.i = 624
  }
  initByArray(key) {
    const mt = this.mt
    this.initGenrand(19650218)
    let i = 1, j = 0
    for (let k = Math.max(624, key.length); k > 0; k--) {
      mt[i] = ((mt[i] ^ Math.imul(mt[i - 1] ^ (mt[i - 1] >>> 30), 1664525)) + key[j] + j) >>> 0
      i++; j++
      if (i >= 624) { mt[0] = mt[623]; i = 1 }
      if (j >= key.length) j = 0
    }
    for (let k = 623; k > 0; k--) {
      mt[i] = ((mt[i] ^ Math.imul(mt[i - 1] ^ (mt[i - 1] >>> 30), 1566083941)) - i) >>> 0
      i++
      if (i >= 624) { mt[0] = mt[623]; i = 1 }
    }
    mt[0] = 0x80000000
    this.i = 624
  }
  next32() {
    const mt = this.mt
    if (this.i >= 624) {
      let k = 0, y
      for (; k < 624 - 397; k++) { y = (mt[k] & 0x80000000) | (mt[k + 1] & 0x7fffffff); mt[k] = mt[k + 397] ^ (y >>> 1) ^ (y & 1 ? 0x9908b0df : 0) }
      for (; k < 623; k++) { y = (mt[k] & 0x80000000) | (mt[k + 1] & 0x7fffffff); mt[k] = mt[k - 227] ^ (y >>> 1) ^ (y & 1 ? 0x9908b0df : 0) }
      y = (mt[623] & 0x80000000) | (mt[0] & 0x7fffffff); mt[623] = mt[396] ^ (y >>> 1) ^ (y & 1 ? 0x9908b0df : 0)
      this.i = 0
    }
    let y = mt[this.i++]
    y ^= y >>> 11; y ^= (y << 7) & 0x9d2c5680; y ^= (y << 15) & 0xefc60000; y ^= y >>> 18
    return y >>> 0
  }
  random() { const a = this.next32() >>> 5, b = this.next32() >>> 6; return (a * 67108864 + b) / 9007199254740992 }
}

// random.Random(str): a = bytes(str) + sha512(bytes(str)), as an integer (big-endian); its 32-bit words, least significant first, are the key.
export function pyRandom(text) {
  const raw = new TextEncoder().encode(text)
  const digest = sha512(raw)
  const all = new Uint8Array(raw.length + 64)
  all.set(raw); all.set(digest, raw.length)
  let n = 0n
  for (const b of all) n = (n << 8n) | BigInt(b)
  const key = []
  while (n > 0n) { key.push(Number(n & 0xffffffffn)); n >>= 32n }
  const mt = new MT()
  mt.initByArray(key.length ? key : [0])
  return mt
}

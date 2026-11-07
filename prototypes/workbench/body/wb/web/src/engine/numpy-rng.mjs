// numpy's Generator(PCG64(seed list)): the stream the Python sampler draws from, bit for bit (SeedSequence, PCG64 XSL-RR 128/64, random(), integers(2), choice(a, p=p)).
// The studio draws `seed:N` mibis and the wild pods with it, so the browser and the server tell the same story (the parity gate checks it).
import { npSum } from './pymath.mjs'

const M32 = 0xffffffffn
const u32 = (x) => Number(BigInt.asUintN(32, BigInt(x)))
const mul32 = (a, b) => Number((BigInt(a) * BigInt(b)) & M32)

const INIT_A = 0x43b0d7e5, MULT_A = 0x931e8875, INIT_B = 0x8b51f9dd, MULT_B = 0x58f38ded, MIX_MULT_L = 0xca01f9dd, MIX_MULT_R = 0x4973f715, XSHIFT = 16

// numpy's _coerce_to_uint32_array for a list of non-negative ints: each int as little-endian 32-bit words (0 is one word).
function words(entropy) {
  const out = []
  for (const v of entropy) {
    let x = BigInt(v)
    if (x === 0n) { out.push(0); continue }
    while (x > 0n) { out.push(Number(x & M32)); x >>= 32n }
  }
  return out
}

function seedPool(entropy) {
  const ent = words(entropy), pool = [0, 0, 0, 0]
  let hc = INIT_A
  const hashmix = (value) => {
    value = u32(value ^ hc)
    hc = mul32(hc, MULT_A)
    value = mul32(value, hc)
    return (value ^ (value >>> XSHIFT)) >>> 0
  }
  const mix = (x, y) => {
    let r = u32(BigInt(mul32(MIX_MULT_L, x)) - BigInt(mul32(MIX_MULT_R, y)))
    return (r ^ (r >>> XSHIFT)) >>> 0
  }
  for (let i = 0; i < 4; i++) pool[i] = hashmix(i < ent.length ? ent[i] : 0)
  for (let s = 0; s < 4; s++) for (let d = 0; d < 4; d++) if (s !== d) pool[d] = mix(pool[d], hashmix(pool[s]))
  for (let s = 4; s < ent.length; s++) for (let d = 0; d < 4; d++) pool[d] = mix(pool[d], hashmix(ent[s]))
  return pool
}

// generate_state(4, uint64): eight uint32 words cycled from the pool, read as four little-endian uint64.
function state64(pool) {
  const w = []
  let hc = INIT_B
  for (let i = 0; i < 8; i++) {
    let v = pool[i % 4]
    v = (v ^ hc) >>> 0
    hc = mul32(hc, MULT_B)
    v = mul32(v, hc)
    w.push((v ^ (v >>> XSHIFT)) >>> 0)
  }
  return [0, 1, 2, 3].map((k) => (BigInt(w[2 * k + 1]) << 32n) | BigInt(w[2 * k]))
}

const MASK64 = (1n << 64n) - 1n, MASK128 = (1n << 128n) - 1n
const MULT128 = (2549297995355413924n << 64n) | 4865540595714422341n

export class PCG64 {
  constructor(seed) {
    const [s0, s1, i0, i1] = state64(seedPool(seed))
    const initstate = (s0 << 64n) | s1, initseq = (i0 << 64n) | i1
    this.inc = ((initseq << 1n) | 1n) & MASK128
    this.state = 0n
    this.step()
    this.state = (this.state + initstate) & MASK128
    this.step()
    this.has32 = false
    this.buf32 = 0
  }
  step() { this.state = (this.state * MULT128 + this.inc) & MASK128 }
  next64() {
    this.step()
    const s = this.state
    const x = ((s >> 64n) ^ s) & MASK64, rot = s >> 122n
    return ((x >> rot) | (x << ((64n - rot) & 63n))) & MASK64
  }
  next32() {
    if (this.has32) { this.has32 = false; return this.buf32 }
    const n = this.next64()
    this.has32 = true
    this.buf32 = Number(n >> 32n)
    return Number(n & M32)
  }
  // Generator.random(): a double in [0, 1) from 53 bits.
  random() { return Number(this.next64() >> 11n) / 9007199254740992 }
  // numpy's buffered_bounded_lemire_uint32: a draw in 0..rng (inclusive) from 32-bit words.
  lemire(rng) {
    const excl = rng + 1
    let m = BigInt(this.next32()) * BigInt(excl)
    let leftover = Number(m & M32)
    if (leftover < excl) {
      const threshold = (0xffffffff - rng) % excl
      while (leftover < threshold) { m = BigInt(this.next32()) * BigInt(excl); leftover = Number(m & M32) }
    }
    return Number(m >> 32n)
  }
  // Generator.integers(2) and integers(n): 0 .. n-1.
  integers2() { return this.lemire(1) }
  integers(n) { return this.lemire(n - 1) }
  // Generator.integers(low, high) with high - low - 1 = rng: the draw 0..rng, to which the caller adds low.
  integersRange(rng) { return this.lemire(rng) }
  // Generator.choice(a, p=p) for one draw: the cumulative sum, normalised by its last value, searched from the right with one random().
  // `normalize`: the caller passed p / p.sum() (the wild pods do); the variety sheet passes its weights as they are.
  choiceP(alleles, p, normalize = true) {
    const w = p.map(Number), tot = npSum(w)
    const q = normalize ? w.map((x) => x / tot) : w
    const cdf = []
    let acc = 0
    for (const x of q) { acc += x; cdf.push(acc) }
    const last = cdf[cdf.length - 1]
    for (let i = 0; i < cdf.length; i++) cdf[i] = cdf[i] / last
    const u = this.random()
    let idx = 0
    while (idx < cdf.length && cdf[idx] <= u) idx++      // searchsorted(side='right')
    return alleles[Math.min(idx, alleles.length - 1)]
  }
}

// np.random.Generator(np.random.PCG64([a, b, ...]))
export const generator = (seed) => new PCG64(seed)

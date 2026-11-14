// Python's and numpy's number habits, so a draw made here is the draw Python makes: round half to even, the float modulo with the divisor's sign, numpy's pairwise sum.

// numpy's rint: round half to even.
export const rint = (x) => {
  const r = Math.round(x)
  return Math.abs(x % 1) === 0.5 && r % 2 !== 0 ? r - 1 : r
}

// Python's round(x) with no digits: an int, half to even.
export const pyRoundInt = (x) => rint(x)

// Python's round(x, nd): the double nearest to the correctly rounded decimal; an exact tie goes to the even digit (JS toFixed sends ties up).
export function pyRound(x, nd) {
  if (!Number.isFinite(x)) return x
  const up = Number(x.toFixed(nd))
  const full = Math.abs(x).toFixed(Math.min(100, nd + 60))
  const dot = full.indexOf('.')
  if (/^50*$/.test(full.slice(dot + 1 + nd))) {
    const kept = full.slice(0, dot + 1 + nd).replace(/\.$/, '')
    if (Number(kept[kept.length - 1]) % 2 === 0) return Number(x < 0 ? '-' + kept : kept)
  }
  return up
}

// numpy's np.round(x, nd) on a float: rint(x * 10^nd) / 10^nd.
export const npRound = (x, nd) => rint(x * 10 ** nd) / 10 ** nd

// Python's float %: the sign of the divisor.
export const pyMod = (a, b) => ((a % b) + b) % b

// numpy's float64 sum of a short array: sequential below 8 elements, else eight running sums (pairwise_sum, blocks up to 128, then halves).
export function npSum(a) {
  return pairwise(a, 0, a.length)
}
function pairwise(a, o, n) {
  if (n < 8) { let r = 0; for (let i = 0; i < n; i++) r += a[o + i]; return r }
  if (n <= 128) {
    const r = [a[o], a[o + 1], a[o + 2], a[o + 3], a[o + 4], a[o + 5], a[o + 6], a[o + 7]]
    let i
    for (i = 8; i < n - (n % 8); i += 8) for (let k = 0; k < 8; k++) r[k] += a[o + i + k]
    let res = ((r[0] + r[1]) + (r[2] + r[3])) + ((r[4] + r[5]) + (r[6] + r[7]))
    for (; i < n; i++) res += a[o + i]
    return res
  }
  let n2 = Math.floor(n / 2); n2 -= n2 % 8
  return pairwise(a, o, n2) + pairwise(a, o + n2, n - n2)
}

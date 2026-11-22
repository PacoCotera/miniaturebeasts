// Vigour and the rest between pairings (gdd 7.5 and 7.6; engine job E1, owner 2026-11-21: "let's drop the rule").
// Close kin has no rule on the copies; its cost is vigour. F is the kinship of a mibi's two parents, counted four
// generations back (cross.mjs KINSHIP_DEPTH), recorded on the young at the cross (origin.kinship). Greybox numbers, set on the one price sheet later.
//   vigour = 1 - 1.6 x F, never below 0.5. A wild founder, or a young of two with no shared kin: 1.0; half siblings' young 0.8; first cousins' 0.9.
//   Her pod grows slower: its time in the capsule is multiplied by (2 - vigour).
//   Her partner skill is weaker: its strength is multiplied by her vigour.
// It never touches how she looks, her health, her life or who may pair.
export const VIGOUR_SLOPE = 1.6;
export const VIGOUR_FLOOR = 0.5;
export const REST_MAX_LENGTHS = 5;     // greybox: the rest is at most this many lengths of her last pod's growing
export const REST_FREE_PAIRINGS = 4;   // greybox: through this many recent pairings the rest is one length

const round6 = (v) => Math.round(v * 1e6) / 1e6;

// F of a genome or an individual record: the kinship its cross recorded; a founder, a wild one or a shed pod has none (0).
export function parentsKinship(x) {
  const g = x?.loci ? x : x?.genome;
  return g?.origin?.kind === "cross" ? Math.max(0, Number(g.origin.kinship) || 0) : 0;
}
export const vigourOfF = (F) => round6(Math.max(VIGOUR_FLOOR, 1 - VIGOUR_SLOPE * Math.max(0, F || 0)));
export const vigourOf = (x) => vigourOfF(parentsKinship(x));
// The minutes a pod grows, from the base minutes and her vigour (rounded up to a whole minute).
export const podMinutes = (baseMinutes, vigour) => Math.ceil(round6(baseMinutes * (2 - vigour)));
// The strength of her partner skill, from the skill's own strength.
export const partnerStrength = (strength, vigour) => round6(strength * vigour);

// The rest on the real clock. `pairedAt`: the times (ms) of her pairings; `podMinutes`: the growing length of her last pod; `kin`: the two are kin
// this time. Her recent pairings are those inside the last REST_MAX_LENGTHS lengths. Returns { recent, lengths, minutes, until }:
// one length while recent is 1 to 4, then the count less three; one more when kin; at most five; none when she has not paired.
export function rest({ pairedAt = [], podMinutes: len = 20, kin = false, now = Date.now() }) {
  const window = REST_MAX_LENGTHS * len * 60000;
  const mine = pairedAt.filter((t) => now - t < window);
  const recent = mine.length;
  if (!recent) return { recent, lengths: 0, minutes: 0, until: now };
  const base = recent <= REST_FREE_PAIRINGS ? 1 : recent - (REST_FREE_PAIRINGS - 1);
  const lengths = Math.min(REST_MAX_LENGTHS, base + (kin ? 1 : 0));
  const last = Math.max(...mine);
  return { recent, lengths, minutes: lengths * len, until: last + lengths * len * 60000 };
}
export const restLeft = (r, now = Date.now()) => Math.max(0, Math.ceil((r.until - now) / 60000));

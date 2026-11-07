// Age in words, pure: the turns a mibi has lived, what its stage means now, and the real time it has been the player's.
import { stageAt } from "./state.mjs";
// One text on both pages: the Companion's index.html carries the same functions (each `function` below, character for character),
// and a parity test proves they agree. Nothing here reads the clock or a spec: the caller passes the turn, the thresholds and `now`.

// "{n} turns old", counted from `born`: "1 turn old" at 1, "new this turn" at 0.
function ageTurns(m, turn) { const n = Math.max(0, turn - (m.born || 0)); return n === 0 ? 'new this turn' : n === 1 ? '1 turn old' : n + ' turns old'; }
// What the stage means now, as { stage, n }: n is the whole turns spent in an adult's or an elder's stage (an elder's count never warns, it only rises),
// or the turns still to grow for a young mibi on the clock; null for a young mibi that is bonded (it grows through care, never on the clock).
function stageNote(m, turn, j, e) {
  const stage = stageAt(m, turn, j, e);
  if (stage === 'juvenile') return { stage, n: m.bonded ? null : (m.born || 0) + j - turn };
  const grown = m.grownTurn != null ? m.grownTurn : (m.born || 0) + j;
  return { stage, n: Math.max(0, turn - (stage === 'elder' ? grown + e : grown)) };
}
// "for 7 turns", "for 1 turn", "from this turn" (n is whole turns, 0 or more).
function turnsFor(n) { return n <= 0 ? 'from this turn' : n === 1 ? 'for 1 turn' : 'for ' + n + ' turns'; }
// "in 2 turns", "next turn" (n is turns still to come, 1 or more).
function turnsUntil(n) { return n <= 1 ? 'next turn' : 'in ' + n + ' turns'; }
// The real time a mibi has been the player's, from `m.since` (ms, UTC) to `now`, on the device's own local calendar:
// { span, date, floor, today }. span is "a day", "13 days" (2 to 99), then whole months up to 23 ("23 months"), then "2 years"; null on the first day.
// date is "14 Oct" in the current year and "Oct 2025" in an earlier one. floor: the save held no clock for this mibi, so `since` is when it was first
// seen and the real time is at least this long. Null when the mibi has no `since`. A `now` behind `since` reads as the first day, never a negative count.
function yoursLine(m, now) {
  if (!(m && m.since > 0)) return null;
  const a = new Date(m.since), b = new Date(now), MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const days = Math.max(0, Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 86400000));
  const months = Math.max(0, (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth() - (b.getDate() < a.getDate() ? 1 : 0));
  const span = days === 0 ? null : days === 1 ? 'a day' : days < 100 ? days + ' days' : months < 24 ? months + ' months' : Math.floor(months / 12) + ' years';
  return { span, date: a.getFullYear() === b.getFullYear() ? a.getDate() + ' ' + MON[a.getMonth()] : MON[a.getMonth()] + ' ' + a.getFullYear(), floor: !!m.sinceFloor, today: days === 0 };
}
export { ageTurns, stageNote, turnsFor, turnsUntil, yoursLine };

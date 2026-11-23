// merge the realm bot's chunks (w4r2-run-chunks.sh) into the three blocks of seeds 1-200, 201-400, 401-600
//   node w4r2-merge.mjs DIR
import { readFileSync, readdirSync } from "node:fs";
const dir = process.argv[2], rows = [];
for (const f of readdirSync(dir).filter(f => f.endsWith(".json"))) rows.push(...JSON.parse(readFileSync(dir + "/" + f, "utf8")).results);
const blocks = [[1, 200], [201, 400], [401, 600]], out = { chunks: rows.length };
const pct = (n, m) => (m ? +(100 * n / m).toFixed(1) : null);
out.blocks = blocks.map(([a, b]) => {
  const rs = rows.filter(r => r.seed >= a && r.seed <= b), ok = rs.filter(r => r.days.length), days = ok.flatMap(r => r.days);
  const habits = days.reduce((s, d) => s + new Set(d.notes.map(n => n.k)).size, 0);
  const calm = {}; for (const d of days) for (const w of d.calmLog || []) calm[w.why] = (calm[w.why] || 0) + 1;
  const cum3 = ok.filter(r => r.days.length >= 3 && new Set(r.days.slice(0, 3).flatMap(x => x.notes.map(n => n.k))).size === 3).length;
  return { seeds: `${a}-${b}`, played: ok.length, skipped: rs.filter(r => r.skip).length, crashed: rs.filter(r => r.crash).length, days: days.length,
    emptyNoteOnly: days.filter(d => !d.notes.length).length, emptyE3: days.filter(d => !d.notes.length && !(d.reads || []).length).length, readDays: days.filter(d => (d.reads || []).length).length,
    habitsADay: +(habits / days.length).toFixed(2), allThreeByDay3: cum3, goneDays: days.filter(d => d.gone).length, calmWhy: calm, calmDaysLogged: Object.values(calm).reduce((x, y) => x + y, 0),
    samples: days.reduce((s, d) => s + d.samples, 0), reads: days.reduce((s, d) => s + (d.reads || []).length, 0), errors: ok.filter(r => r.errors && r.errors.length).length };
});
console.log(JSON.stringify(out, null, 1));

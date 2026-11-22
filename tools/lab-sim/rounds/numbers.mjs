// node tools/lab-sim/rounds/numbers.mjs <out.md> : numbers.md from the four results files in tools/lab-sim/
import { readFileSync, writeFileSync } from "node:fs";
const dir = new URL("../", import.meta.url).pathname;
const J = (f) => JSON.parse(readFileSync(dir + f, "utf8"));
const b0 = J("results-b-rounds-harness-1-b0.json"), b2 = J("results-b-rounds-harness-1-b2.json"), b3 = J("results-b-rounds-harness-1-b3.json");
const b1 = { frames: { L: J("results-b-rounds-harness-1-b1-L.json").frames.L, T: J("results-b-rounds-harness-1-b1-T.json").frames.T } };
const f = (v, d = 2) => (v === "inf" || v === null || v === undefined ? (v === null || v === undefined ? "n/a" : "never") : typeof v === "number" ? (Number.isInteger(v) ? String(v) : v.toFixed(d)) : String(v));
const pc = (v) => (v === null || v === undefined ? "n/a" : (100 * v).toFixed(1) + "%");
const PF = (p) => (p ? "PASS" : "MISS");
const out = [];
const row = (...c) => out.push("| " + c.join(" | ") + " |");
const head = (...c) => { row(...c); row(...c.map(() => "---")); };
const both = (g) => [g("L"), g("T")];

out.push("# b-rounds-harness-1: numbers for B0 to B3 (greybox; PASS or MISS only, nothing retuned)", "");
out.push(`Engine: ${b0.engine}. Seeds 1 to ${b0.seeds} per frame (L = Loika, T = the ten-trait test frame of gdd-bot-round-1, tools/lab-sim only). Medians and 80th percentiles; "never" = not reached inside the cap (500 hatches).`, "");

out.push("## B0 the printed odds", "");
head("measure", "L", "T", "line", "result");
{
  const s = (F) => b0.frames[F].summary, l = (F) => b0.frames[F].lines;
  row("pairs per frame (strangers, half kin, first cousins), 400 young each", ...both((F) => `${b0.seeds} x 3`), "", "");
  row("printed fractions within the 95% interval of the seen (every printed outcome of every pair)", ...both((F) => pc(s(F).within95) + " of " + s(F).checks), "agree within sampling error (95% would be expected by chance alone; line taken as at least 93%, none seen that was not printed)", both((F) => PF(l(F).agree.pass)).join(" / "));
  row("outcomes seen that the screen did not print", ...both((F) => s(F).unlisted), "0", "");
  row("largest gap, seen against printed, pooled over seeds (points)", ...both((F) => (100 * s(F).worstPooledGap).toFixed(2)), "", "");
  for (const pk of ["strangers", "half kin", "first cousins"]) row(`within 95%: ${pk} (kinship ${f(b0.frames.L.pairKinship[pk].kinship, 4)})`, ...both((F) => pc(s(F).byPairKind[pk])), "", "");
  row("copies of a look on one of its seven steps", ...both((F) => pc(l(F).stepsCopies.share)), "100%", both((F) => PF(l(F).stepsCopies.pass)).join(" / "));
  row("young of a look whose shown value is on a step (the mean of its two copies)", ...both((F) => pc(l(F).stepsShown.share) + ` (${l(F).stepsShown.halfStep} halfway between two steps)`), "100%: none between", both((F) => PF(l(F).stepsShown.pass)).join(" / "));
  row("young of a doing on one of seven steps (a doing is still on the fine step; the line says every scale)", ...both((F) => pc(l(F).stepsDoings.share)), "100%", both((F) => PF(l(F).stepsDoings.pass)).join(" / "));
}
out.push("", "Per trait and pair kind: results-b-rounds-harness-1-b0.json (cells).", "");

const rowsOf = (res, bots, key) => {
  head("measure", "bot", "L", "T");
  for (const b of bots) {
    const g = (F) => res.frames[F][key][b];
    row("generations to the aim, median (p80)", b, ...both((F) => `${f(g(F).gens.median)} (${f(g(F).gens.p80)})`));
    row("hatches, median (p80)", b, ...both((F) => `${f(g(F).hatches.median)} (${f(g(F).hatches.p80)})`));
    row("real days, median (p80)", b, ...both((F) => `${f(g(F).days.median)} (${f(g(F).days.p80)})`));
    row("hours of the clock, median (p80)", b, ...both((F) => `${f(g(F).hours.median, 1)} (${f(g(F).hours.p80, 1)})`));
    row("reached of 200", b, ...both((F) => g(F).reached));
  }
};
out.push("## B1 the line game, headless", "");
out.push("Aim: markings (a set: two copies), eyes and ears (two scales, each at the highest step of the seven that at least two founder copies hold, never below the fourth). Capsules 3.", "");
rowsOf(b1, ["BYLOOK", "TELLS", "ONEROW"], "main");
out.push("");
head("line", "L", "T", "result");
{
  const l1 = (F) => b1.frames[F].l1, l2 = (F) => b1.frames[F].l2;
  row("L1 TELLS needs at least 30% fewer generations than BY-LOOK (median)", ...both((F) => `${f(l1(F).tellsGensMedian)} against ${f(l1(F).byLookGensMedian)}: ${l1(F).fewer === null ? "n/a" : pc(l1(F).fewer) + " fewer"}`), both((F) => PF(l1(F).pass)).join(" / "));
  row("L2 best share of any one fixed rule (no rule above 70% of seeded days)", ...both((F) => `${pc(l2(F).maxShare)} of ${l2(F).seededDays} days`), both((F) => PF(l2(F).pass)).join(" / "));
}
out.push("", "Share of seeded days on which each fixed rule's pick is among the oracle's best moves:", "");
head("rule", "L", "T");
for (const k of b1.frames.L.l2.rulesTested) row(k, ...both((F) => pc(b1.frames[F].l2.bestMoveShareByRule[k])));
out.push("", "Second run, aim at a doing (markings, eyes, and the cycle rate three nudges under the pool's top); no line:", "");
rowsOf(b1, ["BYLOOK", "TELLS", "ONEROW"], "doing");
out.push("");

out.push("## B2 kin against wild blood", "");
head("measure", "bot", "L", "T");
for (const b of ["KIN-ONLY", "WILD"]) {
  const g = (F) => b2.frames[F][b];
  row("generations, median (p80)", b, ...both((F) => `${f(g(F).gens.median)} (${f(g(F).gens.p80)})`));
  row("real days, median (p80)", b, ...both((F) => `${f(g(F).days.median)} (${f(g(F).days.p80)})`));
  row("hours of the clock, median (p80)", b, ...both((F) => `${f(g(F).hours.median, 1)} (${f(g(F).hours.p80, 1)})`));
  row("vigour of the two at the aim, mean", b, ...both((F) => f(g(F).vigourAtAim.mean, 3)));
  row("share of pairings that were kin", b, ...both((F) => pc(g(F).kinShareOfPairings)));
  row("reached of 200", b, ...both((F) => g(F).reached));
  if (b === "WILD") row("wild ones met / used, mean per run", b, ...both((F) => `${f(g(F).wildMetMean, 1)} / ${f(g(F).wildUsedMean, 1)}`));
}
out.push("");
head("line", "L", "T", "result");
row("kin-only does not reach the aim sooner (median days; tie counts as not sooner)", ...both((F) => `${f(b2.frames[F].line.kinOnlyDaysMedian)} against ${f(b2.frames[F].line.wildDaysMedian)} days; kin-only first on ${pc(b2.frames[F].line.kinOnlyFirstOnSeedsShare)} of seeds, median hours ${f(b2.frames[F].line.kinOnlyHoursMedian, 1)} against ${f(b2.frames[F].line.wildHoursMedian, 1)}`), both((F) => PF(b2.frames[F].line.pass)).join(" / "));
out.push("", "## B3 one row against re-planning", "");
head("measure", "bot", "L", "T");
for (const b of ["ONE-ROW", "RE-PLAN"]) {
  const g = (F) => b3.frames[F][b];
  row("hatches per aim, median (p80)", b, ...both((F) => `${f(g(F).hatches.median)} (${f(g(F).hatches.p80)})`));
  row("generations, median (p80)", b, ...both((F) => `${f(g(F).gens.median)} (${f(g(F).gens.p80)})`));
  row("hours of the clock, median (p80)", b, ...both((F) => `${f(g(F).hours.median, 1)} (${f(g(F).hours.p80, 1)})`));
  row("reached of 200", b, ...both((F) => g(F).reached));
}
out.push("");
head("line", "L", "T", "result");
row("RE-PLAN needs no more hatches per aim than ONE-ROW", ...both((F) => `${f(b3.frames[F].lines.replanNoMoreHatches.replan)} against ${f(b3.frames[F].lines.replanNoMoreHatches.oneRow)}`), both((F) => PF(b3.frames[F].lines.replanNoMoreHatches.pass)).join(" / "));
row("a hatch changes RE-PLAN's next pairing in at least a third of cases", ...both((F) => `${pc(b3.frames[F].lines.hatchChangesPick.share)} of ${b3.frames[F].hatchChangesPick.picksAfterAHatch} picks (per-seed median ${pc(b3.frames[F].hatchChangesPick.perSeedMedian)})`), both((F) => PF(b3.frames[F].lines.hatchChangesPick.pass)).join(" / "));
out.push("");
writeFileSync(process.argv[2], out.join("\n") + "\n");
console.log("written", process.argv[2]);

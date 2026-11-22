// node tools/lab-sim/rounds/smoke2.mjs [seeds=30] : reach counts and medians of the three B1 bots, to check the harness
import { FRAMES, playLine, stat } from "./lib.mjs";
import { useFrame } from "../engine.mjs";
const N = Number(process.argv[2] ?? 30);
const kinds = ["set", "scale:growth.exterior-eye-size-ratio", "scale:growth.auricular-length-ratio"];
for (const [name, F] of Object.entries(FRAMES)) {
  useFrame(F);
  for (const [bot, o] of [["BYLOOK", { score: "BYLOOK", mode: "replan" }], ["TELLS", { score: "TELLS", mode: "replan" }], ["ONEROW", { score: "TELLS", mode: "row" }]]) {
    const rs = [];
    for (let s = 1; s <= N; s++) rs.push(playLine(F, s, "smoke", { ...o, kinds }));
    console.log(name, bot, "gens", JSON.stringify(stat(rs.map((x) => x.gens))), "hatches", JSON.stringify(stat(rs.map((x) => x.hatches))), "days", JSON.stringify(stat(rs.map((x) => x.days))));
  }
}

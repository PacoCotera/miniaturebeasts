// node tools/lab-sim/rounds/smoke.mjs [seed] : one seed of each bot on both frames, with timing
import { FRAMES, playLine, jsonInf } from "./lib.mjs";
import { useFrame } from "../engine.mjs";
const seed = Number(process.argv[2] ?? 1);
for (const [name, F] of Object.entries(FRAMES)) {
  useFrame(F === FRAMES.T ? F : F);
  for (const [bot, o] of [["BYLOOK", { score: "BYLOOK", mode: "replan" }], ["TELLS", { score: "TELLS", mode: "replan" }], ["ONEROW", { score: "TELLS", mode: "row" }]]) {
    const t0 = Date.now();
    const r = playLine(F, seed, "smoke", { ...o, kinds: ["set", `scale:${"growth.exterior-eye-size-ratio"}`, `scale:${"growth.auricular-length-ratio"}`] });
    const { aim, ...rest } = r;
    console.log(name, bot, JSON.stringify(rest, jsonInf), Date.now() - t0, "ms", aim.map((a) => a.idx ?? "").join(","));
  }
}

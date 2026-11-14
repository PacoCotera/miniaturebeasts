// Prints the steps file for tools/light-mix-oracle.py from the curve: node light-mix-steps.mjs > steps.json
import { readFileSync } from "node:fs";
import { lightOf } from "../src/light-curve.mjs";
const C = JSON.parse(readFileSync(new URL("../../ui/specs/station/frame.json", import.meta.url), "utf8")).light.curve;
const STEPS = [["05:45", "05:45", "dawn"], ["@L50", "09:50", "dusk"], ["@L65", "10:05", null], ["19:30", "19:30", "night"]];
console.log(JSON.stringify(STEPS.map(([step, t, second]) => { const [h, m] = t.split(":").map(Number), L = lightOf((h * 60 + m) * 60, C); return { step, w: second ? L.mix[second] : 0, gain: L.gain }; })));

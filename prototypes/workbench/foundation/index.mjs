// The results page of chunk 1: the sheets and their notes in one HTML file beside the pictures. node foundation/index.mjs
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { RESULTS } from "./paths.mjs";
const md = existsSync(path.join(RESULTS, "calibration.md")) ? readFileSync(path.join(RESULTS, "calibration.md"), "utf8") : "";
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const sheets = [["1-head-size-choice.png", "The head-size choice: Loika whole at H/S 0.45, 0.52 and 0.60, eye size at t 0.3 (top) and 0.9 (bottom), beside the master, at 304, 96 and 48."], ["2-snail.png", "The snail whole beside its master at 304, 96 and 48."], ["3-grid-eye-spacing.png", "3 x 3 face-gene extremes from t alone: eye size across, eye spacing down."], ["3-grid-muzzle-lid.png", "3 x 3 face-gene extremes from t alone: muzzle across, lid down."], ["4-nose-rule.png", "The nose: the master, the house's R4 rule (nose at most 0.6 E) and the rule off."]];
const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Genome foundation chunk 1</title>
<style>body{font:15px/1.5 system-ui,sans-serif;max-width:1320px;margin:0 auto;padding:16px;background:#f6f3ec;color:#2a2630}img{max-width:100%;image-rendering:pixelated;display:block;margin:8px 0 4px}pre{white-space:pre-wrap;font-size:13px;background:#ece7dc;padding:12px;overflow:auto}h2{margin-top:28px}</style>
<h1>Genome foundation, chunk 1: the face, the head carriage and the head size</h1>
${sheets.map(([f, t]) => `<h2>${esc(t)}</h2><img src="${f}" alt="${esc(t)}">`).join("\n")}
<h2>Calibration of the masters against the house bands</h2><pre>${esc(md)}</pre>`;
writeFileSync(path.join(RESULTS, "index.html"), html);
console.log("wrote", path.join(RESULTS, "index.html"));

// The results page of chunk 1: the sheets and their notes in one HTML file beside the pictures. node foundation/index.mjs
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { RESULTS } from "./paths.mjs";
const md = existsSync(path.join(RESULTS, "calibration.md")) ? readFileSync(path.join(RESULTS, "calibration.md"), "utf8") : "";
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const sheets = [["1-head-size-choice.png", "Loika's head at three sizes on the same body, each with her own eye. With the master's crown read at the leaf bases (fix round 7) its head is about 0.47 of its height, between the first two; Loika is built at 0.47. 0.60 is the top of the band. At 0.45 her eye has to grow a little to stay readable at 96. Row 2 shows a bigger eye (t 0.9, every clamp off), outside the house. Beside the master, at 304, 96 and 48."], ["2-snail.png", "The snail whole beside its master at 304, 96 and 48."], ["3-grid-eye-spacing.png", "3 x 3 face-gene extremes from t alone: eye size across, eye spacing down, the mouth gap at the top of its band."], ["3-grid-muzzle-lid.png", "3 x 3 face-gene extremes from t alone: muzzle across, lid down, the mouth gap at the top of its band."], ["4-nose-rule.png", "The nose: the master, the house build (a skin mound, 0.7 to 1.1 E) and the clamp off."], ["5-feet.png", "The feet: the master beside the build, enlarged with their pixels kept."], ["7-back-line.png", "The back line: the master's profile laid over Loika at the three head sizes, with the AD's marks, and the silhouettes."], ["6-snail-litter-96.png", "The snail litter: twelve snails at 96, enlarged 2x, from t drawn round the specimen."]];
const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Genome foundation chunk 1, fix round 7</title>
<style>body{font:15px/1.5 system-ui,sans-serif;max-width:1320px;margin:0 auto;padding:16px;background:#f6f3ec;color:#2a2630}img{max-width:100%;image-rendering:pixelated;display:block;margin:8px 0 4px}pre{white-space:pre-wrap;font-size:13px;background:#ece7dc;padding:12px;overflow:auto}h2{margin-top:28px}</style>
<h1>Genome foundation, chunk 1, fix round 7: a dome head with the eyes out on its turn, a content face, short spread leaves, warm ivory cream</h1>
${sheets.map(([f, t]) => `<h2>${esc(t)}</h2><img src="${f}" alt="${esc(t)}">`).join("\n")}
<h2>Calibration of the masters against the house bands</h2><pre>${esc(md)}</pre>`;
writeFileSync(path.join(RESULTS, "index.html"), html);
console.log("wrote", path.join(RESULTS, "index.html"));

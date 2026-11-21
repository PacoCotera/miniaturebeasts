// The size series: cells, codeword, parity, room for mask + genome, cell size,
// and which species land on each size.   node tools/size-table.mjs
import { SIZES, layout, sizeFor } from "../src/codec.mjs";
import { FRAMES_LIST } from "../src/frames.mjs";

const lands = {};
for (const f of FRAMES_LIST) for (const postmark of [false, true]) {
  const N = sizeFor(f, { postmark })?.N;
  if (N) (lands[N] ??= []).push(`${`${f.id} ${f.name}`.replace(/^Future, /, "")}${postmark ? " + postmark" : ""}`);
}
const rows = ["| Cells | Codeword bytes (parity; corrects) | Bits for read mask + genome: plain / postmarked | Cell at 20 mm | Dots per cell, 20 mm at 203 dpi | Px per cell at 300 px | Lands here |", "| --- | --- | --- | --- | --- | --- | --- |"];
for (const N of SIZES) {
  const L = layout(N, null), P = layout(N, null, { postmark: true });
  rows.push(`| ${N}×${N} | ${L.B} (${L.p}; ${L.p / 2}) | ${L.msgCells.length - L.H} / ${P ? P.msgCells.length - P.H : "–"} | ${(20 / N).toFixed(2)} mm | ${((20 / 25.4) * 203 / N).toFixed(1)} | ${(300 / N).toFixed(1)} | ${(lands[N] ?? []).join("; ") || "–"} |`);
}
console.log(rows.join("\n"));

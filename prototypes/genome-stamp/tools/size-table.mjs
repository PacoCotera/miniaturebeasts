// The size series: cells, codeword, parity, capacity, and cell size at 20 mm.
//   node tools/size-table.mjs
import { SIZES, layout, sizeFor } from "../src/codec.mjs";
import { synthetic } from "../src/frames.mjs";

const rows = ["| Cells | Codeword bytes (parity, corrects) | Open loci it holds (glowtail allele mix, all read) | Cell at 20 mm | Dots per cell at 203 dpi, 20 mm | Px per cell at 300 px |", "| --- | --- | --- | --- | --- | --- |"];
const fitsAt = (n) => sizeFor(synthetic(n, 900 + n, "probe", ["#####", "#####", "#####", "#####", "#####"]))?.N;
let n = 1;
for (const N of SIZES) {
  const L = layout(N, null);
  if (!L) { rows.push(`| ${N}×${N} | too small for the 110-bit header with the 64-bit postmark | – | ${(20 / N).toFixed(2)} mm | ${((20 / 25.4) * 203 / N).toFixed(1)} | ${(300 / N).toFixed(1)} |`); continue; }
  while (fitsAt(n + 1) && fitsAt(n + 1) <= N) n++;
  rows.push(`| ${N}×${N} | ${L.B} (${L.p}, ${L.p / 2} bytes) | up to ${fitsAt(n) === N || fitsAt(n) < N ? n : "–"} | ${(20 / N).toFixed(2)} mm | ${((20 / 25.4) * 203 / N).toFixed(1)} | ${(300 / N).toFixed(1)} |`);
}
console.log(rows.join("\n"));

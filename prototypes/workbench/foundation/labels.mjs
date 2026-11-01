// Sheet labels: measured, wrapped to a column, and checked. The font is imgtools' 3 x 5 pixel font drawn at an integer scale on whole pixels, after any
// zoom of the tiles (text is never resampled). A label that cannot fit its column is an error, never a smudge: wrapLine throws, and checkLabels reads
// back every box a sheet drew (no two overlap, none leaves its column or the sheet).
import { textWidth } from "./imgtools.mjs";

export const GLYPH_H = 5; // rows of the font
// greedy word wrap to maxW px at scale k; a single word wider than the column throws
export function wrapLine(text, maxW, k = 2) {
  const words = String(text).trim().split(/\s+/).filter(Boolean), out = []; let cur = "";
  for (const w of words) {
    if (textWidth(w, k) > maxW) throw new Error(`label word "${w}" is ${textWidth(w, k)} px wide at scale ${k}, the column is ${maxW} px`);
    const next = cur ? `${cur} ${w}` : w;
    if (textWidth(next, k) <= maxW) cur = next; else { out.push(cur); cur = w; }
  }
  if (cur) out.push(cur);
  return out;
}
// lines [[text, colour]] -> wrapped lines [[text, colour]], at most maxLines (more is an error: shorten the label)
export function wrapLines(lines, maxW, k = 2, maxLines = 4) {
  const out = []; for (const [t, c] of lines) for (const l of wrapLine(t, maxW, k)) out.push([l, c]);
  if (out.length > maxLines) throw new Error(`label of ${out.length} lines (max ${maxLines}): ${out.map((l) => l[0]).join(" / ")}`);
  return out;
}
// a box is { x, y, w, h, x0, x1, what } where [x0, x1] is the column the label belongs to
export function checkLabels(boxes, W, H) {
  const bad = [];
  for (const b of boxes) {
    if (b.x < 0 || b.y < 0 || b.x + b.w > W || b.y + b.h > H) bad.push(`"${b.what}" leaves the sheet`);
    if (b.x < b.x0 || b.x + b.w > b.x1) bad.push(`"${b.what}" crosses its column [${b.x0}, ${b.x1}]: ${b.x}..${b.x + b.w}`);
  }
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], c = boxes[j];
    if (a.x < c.x + c.w && c.x < a.x + a.w && a.y < c.y + c.h && c.y < a.y + a.h) bad.push(`"${a.what}" overlaps "${c.what}"`);
  }
  if (bad.length) throw new Error("sheet labels: " + bad.join("; "));
  return true;
}

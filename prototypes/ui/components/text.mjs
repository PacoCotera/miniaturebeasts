// Text as scene nodes: one string of Inter at a Station size, or a run with the material icons inline
// (⚡ ◆ ❀ are drawn as the 16 px icons, never as glyphs). The component measures through the renderer's
// context (ctx.measure) so a centred or right-aligned run lands where the spec says.
export const ICON_GLYPH = { "⚡": "energy", "◆": "data", "❀": "essence" };
export const iconAsset = (name, px) => `icon:${name}:${px}`;

// Split a string into text pieces and icons.
export function runs(str) { const out = []; let cur = ""; for (const ch of str) { if (ICON_GLYPH[ch]) { if (cur) out.push(cur); out.push({ icon: ICON_GLYPH[ch] }); cur = ""; } else cur += ch; } if (cur) out.push(cur); return out; }
// The width of a run at a size (icons at the size, with 2 px either side).
export function runWidth(ctx, str, px, weight = 400) { let w = 0; for (const r of runs(str)) w += typeof r === "string" ? ctx.measure(r, px, weight) : px + 4; return Math.round(w); }
// A text run as nodes: text pieces and icon sprites, laid left to right from x (the cap top on y); align centre or right moves the whole run.
export function textRun(ctx, id, str, x, y, { px = 16, weight = 400, colour, align = "left", iconPx = px } = {}) {
  const nodes = [], parts = runs(str), total = runWidth(ctx, str, px, weight);
  let cx = align === "center" ? x - Math.round(total / 2) : align === "right" ? x - total : x, i = 0;
  for (const r of parts) {
    if (typeof r === "string") { const w = Math.round(ctx.measure(r, px, weight)); nodes.push({ id: `${id}.${i++}`, kind: "text", rect: [cx, y, w, Math.round(px * 1.25)], text: r, px, weight, colour, align: "left" }); cx += w; }
    else { nodes.push({ id: `${id}.${i++}`, kind: "sprite", rect: [cx + 2, y + Math.round(px * 0.78) - iconPx + Math.round(iconPx * 0.12), iconPx, iconPx], asset: iconAsset(r.icon, iconPx) }); cx += iconPx + 4; }
  }
  return { nodes, width: total, end: cx };
}
// Words wrapped to a width at a size.
export function wrap(ctx, str, maxW, px, weight = 400) {
  const words = String(str).split(" "), lines = []; let cur = "";
  for (const w of words) { const t = cur ? cur + " " + w : w; if (runWidth(ctx, t, px, weight) <= maxW || !cur) cur = t; else { lines.push(cur); cur = w; } }
  if (cur) lines.push(cur); return lines;
}
// A string cut to a width with "…" (only the bottom line's subject may end this way).
export function clip(ctx, str, maxW, px, weight = 400) { if (runWidth(ctx, str, px, weight) <= maxW) return str; let s = String(str); while (s.length > 1 && runWidth(ctx, s + "…", px, weight) > maxW) s = s.slice(0, -1); return s + "…"; }

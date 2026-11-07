// The Caddy's e-paper on the play page (specs/station-dock-arrival-spec.md §5; T-20261016-92): its 792 × 272 four-gray view, the two lines of each dock state and the slots for the Companion and
// crate icons. The shell imports nothing from station/: the Station posts the Caddy's state (`mb-caddy`: docked, crates, opened, partner) and this module turns it into lines and draws them.
//
// The Caddy's text style (ruled here, at four grays; the Caddy had none): Inter, the kit's bundled face, line 1 at 28 px and line 2 at 20 px, gray 0 on paper gray 3. A drawn frame is quantized to
// the four levels 0, 85, 170 and 255 by v1's transport rule, level = floor((luma + 42) / 85), so nothing between them reaches the paper.
//
// The layout, in the view's own pixels (24 px margins, every line ≤ 744 px with its icons):
//   line 1   the Companion icon slot 32 × 32 at (24, 76), the text from x 64, cap top 80 (28 px)
//   line 2   the text from x 24, cap top 148 (20 px), then the crate icon slots 32 × 32 at y 140, 12 after the text and 8 apart, at most three
// An icon slot shows the register's placeholder look in four grays (a gray 2 plate, a gray 1 edge) until its art lands: `caddy-companion-32` and `caddy-crate-32`, gray4 policy.
//
// E-paper: no animation. A change of what is drawn is one partial refresh, at once; the same state again refreshes nothing.

export const SIZE = [792, 272], MARGIN = 24, LINE_MAX = 744, GRAYS = [0, 85, 170, 255];
export const STYLE = { line1: { px: 28, capTop: 80, x: 64 }, line2: { px: 20, capTop: 148, x: 24 } };
export const ICON = { size: 32, companion: [24, 76], crateY: 140, gapText: 12, gap: 8, max: 3, ids: { companion: "caddy-companion-32", crate: "caddy-crate-32" } };

const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const spelled = (n) => WORDS[n] ?? String(n);
const plural = (n, one, many) => spelled(n) + " " + (n === 1 ? one : many);

// The two lines of a state (§5), with the icons each line carries. state: { docked, crates, opened: { crates, newPods } | null, partner: name | null }.
//   docked, crates waiting   "Companion home"            "{n} crates" with the crate icon × n (at most three)
//   docked, nothing          "Companion home"            "charging"
//   after the opening        "{n} crates home"           "{n} new pod" / "new pods" (none: no line 2)
//   lifted                   "Companion out"             "with {name}" (a partner), else "exploring"
export function caddyLines(s) {
  if (!s || !s.docked) return { line1: "Companion out", line2: s && s.partner ? "with " + s.partner : "exploring", crates: 0 };
  if (s.opened && s.opened.crates > 0) return { line1: plural(s.opened.crates, "crate", "crates") + " home", line2: s.opened.newPods > 0 ? plural(s.opened.newPods, "new pod", "new pods") : null, crates: 0 };
  if (s.crates > 0) return { line1: "Companion home", line2: plural(s.crates, "crate", "crates"), crates: Math.min(ICON.max, s.crates) };
  return { line1: "Companion home", line2: "charging", crates: 0 };
}

// Where everything goes, given a measurer (text, px) → width. Throws when a line passes 744 px, so a string that does not fit fails its test with the string.
export function caddyLayout(lines, measure) {
  const w1 = measure(lines.line1, STYLE.line1.px), end1 = STYLE.line1.x + w1;
  if (end1 - MARGIN > LINE_MAX) throw new Error(`the Caddy's line 1 "${lines.line1}" is ${end1 - MARGIN} px with its icon, over ${LINE_MAX}`);
  const out = { companion: [...ICON.companion, ICON.size, ICON.size], line1: { text: lines.line1, x: STYLE.line1.x, capTop: STYLE.line1.capTop, px: STYLE.line1.px, w: w1 }, line2: null, crates: [] };
  if (lines.line2 != null) {
    const w2 = measure(lines.line2, STYLE.line2.px); let x = STYLE.line2.x + w2 + ICON.gapText;
    out.line2 = { text: lines.line2, x: STYLE.line2.x, capTop: STYLE.line2.capTop, px: STYLE.line2.px, w: w2 };
    for (let i = 0; i < lines.crates; i++) { out.crates.push([x, ICON.crateY, ICON.size, ICON.size]); x += ICON.size + ICON.gap; }
    const end2 = lines.crates ? x - ICON.gap : STYLE.line2.x + w2;
    if (end2 - MARGIN > LINE_MAX) throw new Error(`the Caddy's line 2 "${lines.line2}" is ${end2 - MARGIN} px with its icons, over ${LINE_MAX}`);
  }
  return out;
}

// The paper: `draw(layout)` paints a frame; show(state) draws only when what is drawn changed, and counts each draw as one partial refresh.
export function createPaper(draw, measure) {
  let key = null, refreshes = 0, lines = null;
  return {
    show(state) { const l = caddyLines(state), k = JSON.stringify(l); if (k === key) return false; key = k; lines = l; draw(caddyLayout(l, measure)); refreshes++; return true; },
    get refreshes() { return refreshes; }, get lines() { return lines; },
  };
}

export const quantize = (v) => GRAYS[Math.min(3, Math.floor((v + 42) / 85))];

// The canvas painter: the paper gray 3, the icon slots, the text in gray 0, then every pixel quantized to the four levels by its luma (Rec. 709 on the sRGB values, as v1's counters do).
export function canvasPainter(canvas, icons = {}) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true }); canvas.width = SIZE[0]; canvas.height = SIZE[1];
  const font = (px) => `500 ${px}px Inter, sans-serif`;
  const measure = (text, px) => { ctx.font = font(px); return Math.ceil(ctx.measureText(text).width); };
  const slot = (r, id) => {
    const img = icons[id]; if (img) { ctx.drawImage(img, r[0], r[1]); return; }
    ctx.fillStyle = `rgb(${GRAYS[2]},${GRAYS[2]},${GRAYS[2]})`; ctx.fillRect(r[0], r[1], r[2], r[3]);
    ctx.strokeStyle = `rgb(${GRAYS[1]},${GRAYS[1]},${GRAYS[1]})`; ctx.lineWidth = 1; ctx.strokeRect(r[0] + 0.5, r[1] + 0.5, r[2] - 1, r[3] - 1);
  };
  const text = (t) => { ctx.font = font(t.px); ctx.textBaseline = "alphabetic"; ctx.fillStyle = "rgb(0,0,0)"; ctx.fillText(t.text, t.x, t.capTop + Math.round(ctx.measureText("H").actualBoundingBoxAscent)); };   // the cap top at capTop
  const draw = (L) => {
    ctx.fillStyle = "rgb(255,255,255)"; ctx.fillRect(0, 0, SIZE[0], SIZE[1]);
    slot(L.companion, ICON.ids.companion); text(L.line1); if (L.line2) text(L.line2); for (const r of L.crates) slot(r, ICON.ids.crate);
    const im = ctx.getImageData(0, 0, SIZE[0], SIZE[1]), d = im.data;
    for (let i = 0; i < d.length; i += 4) { const g = quantize(0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]); d[i] = d[i + 1] = d[i + 2] = g; d[i + 3] = 255; }
    ctx.putImageData(im, 0, 0);
  };
  return { draw, measure, ctx };
}

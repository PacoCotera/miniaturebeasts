// The Wall's key walk (the inventory page's design §4), pure: where each of ◀ ▶ ▲ ▼ takes the ring from a target, given the order the wall shows and the card's plates. Every press changes the picture or is a nudge (`to: null`).
// Stops: the rail (R), the toolbar (T), the wall (W), the card (C). Targets: rail.<row id>, sort.<id>, pill, cell.<mibi id>, plate.<k>, band.
// ctx: { order: [mibi ids shown, in wall order], cols, rail: [row ids], lit: the lit rail row's id, sort, last: the mibi the card shows, plates: [{ id, held }], canWall, picking }
const TOOLS = ["sort.room", "sort.kind", "sort.age", "pill"];
const cellOf = (ctx, id) => (id != null && ctx.order.includes(id) ? "cell." + id : null);
// the wall's entry from the rail or the toolbar: the last ringed mibi if it is in the filter, else the first
export const wallEntry = (ctx) => cellOf(ctx, ctx.last) ?? (ctx.order.length ? "cell." + ctx.order[0] : null);
// the card's first live plate (the first plate when every one is held)
export const firstLive = (ctx) => (ctx.plates.find((p) => !p.held) ?? ctx.plates[0])?.id ?? null;
export function walk(ctx, cur, key) {
  const ret = (to, extra = {}) => ({ to: to ?? null, ...extra });
  const r = /^rail\.(.+)$/.exec(cur);
  if (r) {
    const i = ctx.rail.indexOf(r[1]);
    if (key === "left") return ret(null);
    if (key === "right") return ret(wallEntry(ctx));
    const j = i + (key === "down" ? 1 : key === "up" ? -1 : 0);
    return key === "up" || key === "down" ? (j >= 0 && j < ctx.rail.length ? ret("rail." + ctx.rail[j], { refilter: ctx.rail[j] !== "add" ? ctx.rail[j] : null }) : ret(null)) : ret(null);
  }
  const t = TOOLS.indexOf(cur);
  if (t >= 0) {
    if (key === "up") return ret(null);
    if (key === "down") return ret(wallEntry(ctx));
    if (key === "left") return ret(t === 0 ? "rail." + ctx.lit : TOOLS[t - 1]);
    return ret(t === TOOLS.length - 1 ? firstLive(ctx) : TOOLS[t + 1]);
  }
  const c = /^cell\.(\d+)$/.exec(cur);
  if (c) {
    const id = +c[1], k = ctx.order.indexOf(id), n = ctx.order.length, col = k % ctx.cols, row = Math.floor(k / ctx.cols), rows = Math.ceil(n / ctx.cols);
    if (k < 0) return ret(wallEntry(ctx));
    if (key === "left") return ret(col > 0 ? "cell." + ctx.order[k - 1] : "rail." + ctx.lit);
    if (key === "right") return ret(col < ctx.cols - 1 && k + 1 < n ? "cell." + ctx.order[k + 1] : firstLive(ctx));
    if (key === "up") return ret(row > 0 ? "cell." + ctx.order[k - ctx.cols] : "sort." + ctx.sort);
    return ret(row + 1 < rows ? "cell." + ctx.order[Math.min(k + ctx.cols, n - 1)] : null);   // ▼: the row below in the same column (the last one when it is shorter); the last row nudges
  }
  const p = /^plate\.(\d+)$/.exec(cur);
  if (p) {
    const k = +p[1], ids = ctx.plates.map((x) => x.id), at = ids.indexOf(cur);
    void k;
    if (key === "left") return ret(cellOf(ctx, ctx.last));
    if (key === "right") return ret(null);
    if (key === "up") return ret(at > 0 ? ids[at - 1] : "band");
    return ret(at >= 0 && at < ids.length - 1 ? ids[at + 1] : null);
  }
  if (cur === "band") {
    if (key === "left") return ret(cellOf(ctx, ctx.last));
    if (key === "down") return ret(ctx.plates[0]?.id ?? null);
    return ret(null);
  }
  return ret(null);
}

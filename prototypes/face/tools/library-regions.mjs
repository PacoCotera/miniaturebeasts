// Check 1 for the Library spread (lvgl-switch.md §4): every part the face's log says it drew, against the rectangles library.json gives it. The log holds one union rectangle a region and layer (the page's tag, leftPage or rightPage), so each page's
// union is held to the union of the parts its frames give by status, exactly (the plate or study at place + (8, 8, 80, 96), the clan rule, the roundel, the gilt corner, the seeds, the seal at their offsets from `spread.item`), and to the page's rectangle.
// `departures` returns the list of departures, empty when none.
// log: the face's `log` message { regions: [{ id, layer, rect }], type: [{ text, px, region }] }; spec: library.json; props: the spread's props (state, regions, focus); cur: the ring.
import { listPitch } from "../../ui/specs/derive.mjs";
const within = (b, r) => b[0] >= r[0] && b[1] >= r[1] && b[0] + b[2] <= r[0] + r[2] && b[1] + b[3] <= r[1] + r[3];
const eq = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
const union = (rs) => { if (!rs.length) return null; const x0 = Math.min(...rs.map((r) => r[0])), y0 = Math.min(...rs.map((r) => r[1])), x1 = Math.max(...rs.map((r) => r[0] + r[2])), y1 = Math.max(...rs.map((r) => r[1] + r[3])); return [x0, y0, x1 - x0, y1 - y0]; };

export function departures(log, spec, props, cur) {
  const out = [], SP = spec.spread, R = SP.regions, I = SP.item, regions = log.regions ?? [], got = (id, layer) => regions.filter((r) => r.id === id && (!layer || r.layer === layer)), must = (ok, m) => { if (!ok) out.push(m); };
  for (const r of regions) must(within(r.rect, [0, 0, 1024, 600]), `${r.id} (${r.layer}) ${r.rect} leaves the screen`);
  for (const id of ["notBuilt.stage", "notBuilt.line"]) must(got(id).length === 0, `the spread draws no ${id}`);
  for (const r of got("stage")) must(r.layer === "chrome" || eq(r.rect, R.stage.rect), `stage (${r.layer}) ${r.rect} is not ${R.stage.rect}`);
  must(got("stage", "art").length + got("stage", "painted").length >= 1, "the stage's picture (the master or its placeholder) is drawn");
  const at = (f, a) => [f[0] + a[0], f[1] + a[1], a[2], a[3]];
  for (const [pg, key] of [[0, "leftPage"], [1, "rightPage"]]) {
    const page = R[key], items = props.regions[key].items, pics = [], rules = [], names = [];
    items.forEach((it, k) => {
      const f = listPitch(page.places, 8, k), found = it.status === "found", known = it.status !== "unmet";
      if (known) { pics.push(at(f, I.plate.at)); rules.push(at(f, I.clanRule.at)); pics.push(at(f, I.roundel.at)); names.push([f[0] + I.name.at[0], f[1] + I.name.at[1], I.name.at[2], I.name.at[3]]); }
      if (found && it.portrayed) pics.push(at(f, I.gilt.at)); if (found && it.complete) pics.push(at(f, I.seal.at));
      if (found) for (const p of I.progress.places) pics.push([f[0] + p[0], f[1] + p[1], I.progress.seed[0], I.progress.seed[1]]);
    });
    for (const p of pics) must(within(p, page.rect), `${key}: a part ${p} leaves the page ${page.rect}`);
    const art = [...got(key, "art"), ...got(key, "painted")].map((r) => r.rect), gotArt = union(art), wantArt = union(pics);
    must((gotArt === null) === (wantArt === null) && (!wantArt || eq(gotArt, wantArt)), `${key}: its pictures ${gotArt} are not the union of the frames' parts ${wantArt}`);
    const gr = got(key, "chrome"), wantRules = union(rules); must((gr.length === 0) === (wantRules === null) && (!wantRules || eq(gr[0].rect, wantRules)), `${key}: its clan rules ${gr[0]?.rect} are not ${wantRules}`);
    const tr = got(key, "type"); must(tr.length === 0 || (names.length > 0 && within(tr[0].rect, union(names))), `${key}: its names ${tr[0]?.rect} leave their boxes ${union(names)}`);
    for (const r of got(key)) must(within(r.rect, page.rect), `${key} (${r.layer}) ${r.rect} leaves the page ${page.rect}`);
  }
  { const target = props.focus.targets.findIndex((t) => t.id === cur), rings = got("focus"); must(rings.length === 1 && target >= 0, `one ring on the focused frame (${rings.length} drawn, ${cur})`);
    if (rings.length === 1 && target >= 0) { const f = listPitch(R[target < 8 ? "leftPage" : "rightPage"].places, 8, target % 8), want = [f[0] - 4, f[1] - 4, f[2] + 8, f[3] + 8]; must(eq(rings[0].rect, want), `the ring ${rings[0].rect} is not ${want} (the frame outset 4)`); } }
  return out;
}

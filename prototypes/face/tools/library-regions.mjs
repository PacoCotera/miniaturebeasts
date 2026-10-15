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
    if (rings.length === 1 && target >= 0) { const f = listPitch(R[target < 8 ? "leftPage" : "rightPage"].places, 8, target % 8), want = [f[0] - 5, f[1] - 5, f[2] + 10, f[3] + 10]; must(eq(rings[0].rect, want), `the ring ${rings[0].rect} is not ${want} (the frame outset 5)`); } }
  return out;
}

// Check 1 per part (the node check beside the per-page union): the box of every frame's every node as the face holds it, against spread.item at the frame's place.
// boxOf(id): the node's [x, y, w, h] by its id string, or null when no node has the id (face_test_node_box, the test build); spec: library.json; props: the spread's props.
// A part the status gives is at its place + at exactly (a picture, a rule, a roundel, a gilt corner, a seal, a seed 8 × 8); a part the status does not give is a node of no size (hidden, never destroyed);
// every part lies inside its page's rectangle. Returns the list of departures, empty when none.
export function partDepartures(boxOf, spec, props) {
  const out = [], R = spec.spread.regions, I = spec.spread.item, must = (ok, m) => { if (!ok) out.push(m); };
  for (const [key] of [["leftPage"], ["rightPage"]]) {
    const page = R[key];
    props.regions[key].items.forEach((it, k) => {
      const f = listPitch(page.places, 8, k), found = it.status === "found", known = it.status !== "unmet", at = (a) => [f[0] + a[0], f[1] + a[1], a[2], a[3]];
      const parts = [["picture", known, at(I.plate.at)], ["rule", known, at(I.clanRule.at)], ["roundel", known, at(I.roundel.at)], ["gilt", found && !!it.portrayed, at(I.gilt.at)], ["seal", found && !!it.complete, at(I.seal.at)]];
      for (let n = 0; n < I.progress.places.length; n++) parts.push([`seed.${n}`, found && it.progress > 0, [f[0] + I.progress.places[n][0], f[1] + I.progress.places[n][1], I.progress.seed[0], I.progress.seed[1]]]);
      for (const [part, given, want] of parts) {
        const id = `frame.${it.id}.${part}`, b = boxOf(id);
        if (!b) { out.push(`${id}: no node (an absent part is hidden, never destroyed)`); continue; }
        if (given) { must(eq(b, want), `${id} is at ${b}, not ${want} (the frame's place plus its offset)`); must(within(b, page.rect), `${id} ${b} leaves the page ${page.rect}`); }
        else must(b[2] === 0 && b[3] === 0, `${id} is not given by status ${it.status} and has a size ${b[2]} × ${b[3]}`);
      }
    });
  }
  return out;
}

// Check 1 for one mibi up close (lvgl-switch.md §4): every region the face's log says it drew, against the rectangles habitat.json gives it (and namer.json's while the namer is open). `departures` returns the list of departures, empty when none.
// log: the face's `log` message { regions: [{ id, layer, rect }], type: [{ text, px, region, rect? }] }; spec: habitat.json; namer: namer.json; state: "rest" | "meet" | "out"; cur: the ring; n: the bays (the tiles drawn); open: the namer is open.
import { listPitch } from "../../ui/specs/derive.mjs";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
// the moving sets' highest up-close hop (Station M1 §2.4, the animator's closeHop): a resident with a set lifts by it, and its crouch drops 2 px
const MV = new URL("../../ui/specs/station/moving/", import.meta.url), MOVING_LIFT = Math.max(0, ...JSON.parse(readFileSync(fileURLToPath(new URL("index.json", MV)), "utf8")).sets.flatMap((id) => { const s = JSON.parse(readFileSync(fileURLToPath(new URL(id + ".json", MV)), "utf8")); return [s.juvenile, s.adult, s.elder].flatMap((st) => st?.closeHop?.lift ?? []); }));
const within = (b, r) => b[0] >= r[0] && b[1] >= r[1] && b[0] + b[2] <= r[0] + r[2] && b[1] + b[3] <= r[1] + r[3];
const eq = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
const grow = (r, k) => [r[0] - k, r[1] - k, r[2] + 2 * k, r[3] + 2 * k];

export function departures(log, spec, namer, state = "rest", cur = "resident", n = 0, open = false) {
  const out = [], R = spec.regions, regions = log.regions ?? [], type = log.type ?? [], got = (id, layer) => regions.filter((r) => r.id === id && (!layer || r.layer === layer)), glass = R.glass.rect, must = (ok, m) => { if (!ok) out.push(m); };
  for (const r of regions) must(within(r.rect, [0, 0, 1024, 600]), `${r.id} (${r.layer}) ${r.rect} leaves the screen`);
  for (const id of ["notBuilt.stage", "notBuilt.line"]) must(got(id).length === 0, `one mibi up close draws no ${id}`);
  for (const r of got("stage")) must(eq(r.rect, R.stage.rect), `stage ${r.rect} is not ${R.stage.rect}`);
  for (const r of got("bezel", "chrome")) if (r.rect[2] > 2 || r.rect[3] > 2) must(eq(r.rect, R.bezel.rect), `the bezel ${r.rect} is not ${R.bezel.rect}`);
  for (const r of [...got("glass", "chrome"), ...got("glass", "painted")]) if (r.rect[2] > 0) must(within(r.rect, R.glass.rect), `the glass ${r.rect} leaves ${glass}`);
  for (const r of got("glass", "painted")) must(eq(r.rect, glass), `the near Vivarium ${r.rect} is not the glass ${glass}`);
  // the resident: the mibi at the box (lifted by its focus lift and at most the hop's), the out mark in its rect; neither while the other
  const box = R.resident.rect, lift = R.resident.lift + Math.max(4, MOVING_LIFT);   // the placeholder's hop (4) or a moving set's (its closeHop)
  for (const r of [...got("resident", "art"), ...got("resident", "painted")]) { if (state === "out") must(eq(r.rect, R.resident.out.rect), `the out mark ${r.rect} is not ${R.resident.out.rect}`); else if (r.rect[2] > 0) must(r.rect[0] === box[0] && r.rect[2] === box[2] && r.rect[1] <= box[1] + 2 && r.rect[1] >= box[1] - lift && r.rect[3] <= box[3] && r.rect[1] + r.rect[3] <= box[1] + box[3] + 2, `the mibi ${r.rect} is not its box ${box} (lifted up to ${lift})`); }
  // the name tag (rest, out) or the meet ribbon (meet), in the tag's slot; the tag's top is the feet + 24 and its bottom inside the glass by 16
  const tag = got("nameTag", "chrome").filter((r) => r.rect[2] > 2)[0], rib = got("meetRibbon", "chrome").filter((r) => r.rect[2] > 2)[0];
  must(state === "meet" ? !!rib && !tag : !!tag && !rib, `the ${state} state draws ${state === "meet" ? "the meet ribbon and no tag" : "the name tag and no ribbon"}`);
  if (tag) { must(tag.rect[3] === R.nameTag.h && tag.rect[1] === box[1] + box[3] + 24, `the name tag ${tag.rect} is not ${R.nameTag.h} tall with its top at the feet + 24`); must(tag.rect[2] % R.nameTag.round === 0 && tag.rect[2] >= R.nameTag.min && tag.rect[2] <= R.nameTag.max, `the tag is ${tag.rect[2]} wide`); must(within(tag.rect, grow(glass, -8)) , `the tag ${tag.rect} is not 8 px inside the glass`); }
  if (rib) must(eq(rib.rect, R.meetRibbon.rect), `the meet ribbon ${rib.rect} is not ${R.meetRibbon.rect}`);
  // the card and what stands on it
  for (const r of got("card", "painted")) must(eq(r.rect, R.card.rect), `the card's plate ${r.rect} is not ${R.card.rect}`);   // fix 2 F1: the card is its plate, a painted node at the rect; no chrome fill
  must(!got("card", "chrome").length, "the card draws no fill, edge or bevel row (fix 2 F1)");
  for (const r of got("stamp", "chrome")) must(eq(r.rect, R.stamp.rect), `the stamp label ${r.rect} is not ${R.stamp.rect}`);
  for (const r of got("stamp", "painted")) must(within(r.rect, R.stamp.rect), `the stamp ${r.rect} leaves its label ${R.stamp.rect}`);
  for (const id of ["speciesLine", "story", "code"]) for (const r of got(id, "type")) if (r.rect[2] > 0) must(within(r.rect, R[id].rect), `${id} ${r.rect} leaves ${R[id].rect}`);
  for (const r of regions.filter((x) => x.id === "card" && x.layer !== "chrome" && x.rect[2] > 0)) must(within(r.rect, R.card.rect), `the card's ${r.layer} ${r.rect} leaves the card ${R.card.rect}`);
  // the plates (a region, one ground and one emblem each, on the list's pitch; the focused one lifted)
  const np = log.plates ?? regions.filter((x) => x.id === "plates" && x.rect[2] === 40).length;
  for (const r of got("plates")) if (r.rect[2] > 0) must(within(r.rect, grow(R.plates.rect, 2)) || within(r.rect, [R.plates.rect[0], R.plates.rect[1] - 2, 8 * 48, 44]), `a plate ${r.rect} leaves its row ${R.plates.rect}`);
  void np;
  // the four modules: the panel at the spec's rectangle (lifted by the lift while the ring is on it); their words and objects inside
  for (const m of ["door", "portrait", "cross", "wild"]) {
    const rect = R[m].rect, lifted = cur === m ? R[m].lift ?? 2 : 0, ps = got(m + ".plate", "painted").filter((r) => r.rect[2] === rect[2] && r.rect[3] === rect[3]);
    must(ps.length >= 1 && ps.every((r) => eq(r.rect, [rect[0], rect[1] - lifted, rect[2], rect[3]]) || (lifted && eq(r.rect, rect))), `the ${m} module is not at ${rect} (lifted ${lifted})`);
    if (cur === m && !open) { const rings = got("focus"), want = [rect[0] - 5, rect[1] - lifted - 5, rect[2] + 10, rect[3] + 10]; must(rings.length === 0 || (rings.length === 1 && eq(rings[0].rect, want)), `the ${m} ring ${rings[0]?.rect} is not ${want} (fix 14: the module as drawn grown by 5)`); }
    for (const r of regions.filter((x) => x.id === m && x.rect[2] > 0 && x.layer !== "chrome")) must(within(r.rect, [rect[0], rect[1] - 2, rect[2], rect[3] + 2]), `the ${m} module's ${r.layer} ${r.rect} leaves it`);
    if (m === "portrait") {   // the frame (art) at rect + frame.at and its size; the picture (painted) at rect + frame.at + frame.picture.at and its size (ruling (c)), both lifted with the ring
      const F = R.portrait.frame, P = F.picture;
      for (const r of regions.filter((x) => x.id === "portrait" && x.rect[2] > 0)) {
        if (r.layer === "art") must(eq(r.rect, [rect[0] + F.at[0], rect[1] - lifted + F.at[1], F.size[0], F.size[1]]), `the portrait frame ${r.rect} is not at ${F.at} in the module, ${F.size}`);
        if (r.layer === "painted") must(eq(r.rect, [rect[0] + F.at[0] + P.at[0], rect[1] - lifted + F.at[1] + P.at[1], P.size[0], P.size[1]]), `the portrait picture ${r.rect} is not at ${P.at} in its frame, ${P.size}`);
      }
    }
  }
  for (const r of got("strip", "painted")) must(r.rect[2] === 0 || eq(r.rect, R.strip.rect), `the strip's plate ${r.rect} is not ${R.strip.rect}`);
  must(!got("strip", "chrome").length, "the strip draws no fill or edge (fix 2 F1)");
  if (n > 0) {   // a region a tile (tile.<i>): its box is the list's pitch at its place, lifted by the spec's lift while the ring is on it (one tile at most)
    const items = Array.from({ length: n }, (_, i) => listPitch(R.tiles, n, i)), lift = spec.focus.targets.tile.lift; let lifted = 0;
    for (let i = 0; i < n; i++) {
      const plateOrChrome = (x) => x.layer === "chrome" || x.layer === "painted", parts = regions.filter((r) => r.id === `tile.${i}`); if (!parts.length) { out.push(`tile ${i} is not drawn`); continue; }
      for (const r of parts) {
        const base = items[i], up = plateOrChrome(r) ? r.rect[1] === base[1] - lift : parts.some((x) => plateOrChrome(x) && x.rect[1] === base[1] - lift), box2 = up ? [base[0], base[1] - lift, base[2], base[3]] : base;
        if (plateOrChrome(r)) { if (up && r.layer === "chrome") lifted++; must(eq(r.rect, box2) || r.rect[2] === 0, `tile ${i} ${r.rect} is not its place on the pitch ${base}`); } else must(within(r.rect, box2) || r.rect[2] === 0, `tile ${i}'s ${r.layer} ${r.rect} leaves the tile`);
      }
    }
    must(lifted <= 1, "more than one tile is lifted"); must(!regions.some((r) => r.id.startsWith("tile.") && Number(r.id.slice(5)) >= n), "a tile past the bays is drawn");
  }
  // the namer: its panel and shadow at the spec's rectangle (the shadow a 2 × 3 offset), the field, the say line, the keys on their rectangles, no habitat ring while it is open
  if (open) {
    const N = namer.regions, P = N.panel.rect;
    for (const r of got("panel", "painted")) must(eq(r.rect, P), `the namer's plate ${r.rect} is not ${P} (no shadow, fix 2 F8)`);
    must(!got("panel", "chrome").length, "the namer's panel draws no fill, edge, bevel row or shadow (fix 2 F1, F8)");
    for (const id of ["field", "say"]) for (const r of regions.filter((x) => x.id === id && x.rect[2] > 0)) must(within(r.rect, N[id].rect), `the namer's ${id} (${r.layer}) ${r.rect} leaves ${N[id].rect}`);
    for (const [id, m] of [["shift", N.shift], ["space", N.space], ["page", N.page], ["suggest", N.suggest], ["done", N.done]]) for (const r of got(id, "chrome")) must(within(r.rect, [m.rect[0], m.rect[1] - 2, m.rect[2], m.rect[3] + 2]), `the namer's ${id} ${r.rect} leaves ${m.rect}`);
    for (const r of got("keys", "chrome")) { const i = N.keys.columns * Math.round((r.rect[1] + (r.rect[1] % 2) - N.keys.at[1]) / N.keys.pitch) + Math.round((r.rect[0] - N.keys.at[0]) / N.keys.pitch); void i; must(within(r.rect, [N.keys.rect[0], N.keys.rect[1] - 2, N.keys.rect[2], N.keys.rect[3] + 2]), `a key ${r.rect} leaves the grid ${N.keys.rect} (lifted 2 px while the ring is on it)`); }
    for (const r of got("focus")) must(within(r.rect, grow(P, 4)), `the ring ${r.rect} is not over the namer (habitat draws none while it is open)`);
  }
  for (const r of got("focus")) must(within(r.rect, [0, 0, 1024, 600]), `the ring ${r.rect} leaves the screen`);
  for (const t of type) must([16, 20, 28].includes(t.px), `"${t.text}" is set at ${t.px} px`);
  return out;
}

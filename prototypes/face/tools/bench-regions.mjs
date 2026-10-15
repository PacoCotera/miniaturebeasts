// Check 1 for the Probe bench (lvgl-switch.md §4): every part the face's log says it drew, against the rectangles bench.json gives it, and every node's box as the face holds it. The log holds one union rectangle a region and layer, so each
// region's union is held to the union of the parts the state gives, exactly: the stage over the whole stage; the cradle's picture at the cradle's rectangle; the plates (docked only) at the tier's places, lifted while the ring is on them; each
// module's panel (lifted 2 px while the ring is on it), its lamp, and its pictures at their offsets from the module; the ring 5 px outside the focused object as drawn (the plates: the union of the drawn plates). `departures` returns the list, empty when none.
// log: the face's `log` message { regions: [{ id, layer, rect }], type: [...] }; spec: bench.json; props: the bench's props (state, regions, focus); cur: the ring.
// `partDepartures(boxOf, spec, props, cur)`: the per-node check (boxOf(id) is the node's [x, y, w, h] by its id string, or null): the plates' four nodes and every picture of both modules, each exactly at its place; a place the tier lacks a node of no size.
const eq = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
const within = (b, r) => b[0] >= r[0] && b[1] >= r[1] && b[0] + b[2] <= r[0] + r[2] && b[1] + b[3] <= r[1] + r[3];
const union = (rs) => { rs = rs.filter(Boolean); if (!rs.length) return null; const x0 = Math.min(...rs.map((r) => r[0])), y0 = Math.min(...rs.map((r) => r[1])), x1 = Math.max(...rs.map((r) => r[0] + r[2])), y1 = Math.max(...rs.map((r) => r[1] + r[3])); return [x0, y0, x1 - x0, y1 - y0]; };

// what the state gives: the rectangles of every part, from the spec and the props (no event playing: the end state)
export function expected(spec, props, cur) {
  const R = spec.regions, T = spec.focus.targets, lift = (id) => (cur === id ? T[id].lift : 0), docked = props.state === "docked", out = { parts: {} };
  const at = (o, a) => [o[0] + a[0], o[1] + a[1], a[2], a[3]];
  // the plates
  const P = R.plates, most = Math.max(...Object.values(P.places).map((t) => t.length));   // the stable plate nodes: as many as the longest table; away every one stays, with no size
  if (docked) { const tier = props.regions.plates.tier, whole = props.regions.plates.whole, places = P.places[tier]; if (!places) throw new Error("no table for tier " + tier); if (whole > places.length) throw new Error("whole above the table");
    for (let i = 0; i < most; i++) out.parts[`plates.${i}`] = i < places.length ? [places[i][0], places[i][1] - lift("plates"), P.plate[0], P.plate[1]] : [0, 0, 0, 0]; }
  else for (let i = 0; i < most; i++) out.parts[`plates.${i}`] = [0, 0, 0, 0];
  // the Mend module
  const sw = R.switch, m = [sw.rect[0], sw.rect[1] - lift("switch")], SW = props.regions.switch, on = SW.state === "on", T0 = sw.toggle;
  out.switchPanel = [sw.rect[0], sw.rect[1] - lift("switch"), sw.rect[2], sw.rect[3]]; out.switchLamp = [m[0] + sw.lamp[0], m[1] + sw.lamp[1], 12, 12];
  out.parts["switch.track"] = [m[0] + T0.at[0], m[1] + T0.at[1], T0.size[0], T0.size[1]]; out.parts["switch.knob"] = [m[0] + T0.knob.x[on ? "on" : "off"], m[1] + T0.knob.y, T0.knob.size[0], T0.knob.size[1]];
  out.parts["switch.dock"] = [m[0] + sw.meaning.dock.at[0], m[1] + sw.meaning.dock.at[1], sw.meaning.dock.size[0], sw.meaning.dock.size[1]];
  for (let i = 0; i < 4; i++) out.parts[`switch.plate.${i}`] = i < SW.count ? [m[0] + sw.meaning.plates.at[0] + sw.meaning.plates.pitch * i, m[1] + sw.meaning.plates.at[1], sw.meaning.plates.icon[0], sw.meaning.plates.icon[1]] : [0, 0, 0, 0];
  // the Upgrade module
  const sl = R.slot, n = [sl.rect[0], sl.rect[1] - lift("slot")], st = props.regions.slot.state, AD = sl.adds;
  out.slotPanel = [sl.rect[0], sl.rect[1] - lift("slot"), sl.rect[2], sl.rect[3]]; out.slotLamp = [n[0] + sl.lamp[0], n[1] + sl.lamp[1], 12, 12];
  out.parts["slot.socket"] = [n[0] + sl.socket.at[0], n[1] + sl.socket.at[1], sl.socket.size[0], sl.socket.size[1]];
  out.parts["slot.part"] = [n[0] + sl.part.at[0], n[1] + (st === "armed" ? sl.part.armedAt[1] : sl.part.at[1]), sl.part.size[0], sl.part.size[1]];
  for (let i = 0; i < AD.pods.count; i++) out.parts[`slot.pod.${i}`] = [n[0] + AD.pods.at[0] + AD.pods.pitch * i, n[1] + AD.pods.at[1], AD.pods.icon[0], AD.pods.icon[1]];
  for (let i = 0; i < AD.plates.count; i++) out.parts[`slot.plate.${i}`] = [n[0] + AD.plates.at[0] + AD.plates.pitch * i, n[1] + AD.plates.at[1], AD.plates.icon[0], AD.plates.icon[1]];
  for (const k of ["reach", "deep"]) out.parts[`slot.${k}`] = [n[0] + AD[k].at[0], n[1] + AD[k].at[1], AD[k].size[0], AD[k].size[1]];
  // the ring (fix 14): the object as drawn, its rectangle lifted by its lift (the plates: the union of the drawn plates, lifted), grown by 5
  if (cur) { const o = cur === "plates" ? union(Object.entries(out.parts).filter(([k, v]) => k.startsWith("plates.") && v[2]).map(([, v]) => v)) : [R[cur].rect[0], R[cur].rect[1] - lift(cur), R[cur].rect[2], R[cur].rect[3]]; out.ring = o && [o[0] - 5, o[1] - 5, o[2] + 10, o[3] + 10]; }
  return out;
}

export function departures(log, spec, props, cur) {
  const out = [], R = spec.regions, regions = log.regions ?? [], got = (id, layer) => regions.filter((r) => r.id === id && (!layer || r.layer === layer)), must = (ok, m) => { if (!ok) out.push(m); };
  for (const r of regions) must(within(r.rect, [0, 0, 1024, 600]), `${r.id} (${r.layer}) ${r.rect} leaves the screen`);
  const E = expected(spec, props, cur), pic = (id) => { const rs = [...got(id, "art"), ...got(id, "painted")].map((r) => r.rect); return union(rs); };
  must(got("bench", "chrome").length === 1 && eq(got("bench", "chrome")[0].rect, R.bench.rect), `the stage ground ${got("bench", "chrome")[0]?.rect} is not ${R.bench.rect}`);
  for (const r of [...got("bench", "art"), ...got("bench", "painted")]) must(eq(r.rect, R.bench.rect), `the stage picture ${r.rect} is not ${R.bench.rect}`);
  must(got("cradle", "art").length + got("cradle", "painted").length >= 1 && eq(pic("cradle"), R.cradle.rect), `the cradle ${pic("cradle")} is not ${R.cradle.rect}`);
  if (props.state === "docked") must(eq(pic("plates") ?? [], union(Object.entries(E.parts).filter(([k]) => k.startsWith("plates.")).map(([, v]) => (v[2] ? v : null))) ?? []), `the plates ${pic("plates")} are not the tier's places`);
  else must(!got("plates", "art").length && !got("plates", "painted").length, "no plates drawn away");
  for (const [mod, panel, lampBox, keys] of [["switch", E.switchPanel, E.switchLamp, (k) => k.startsWith("switch.")], ["slot", E.slotPanel, E.slotLamp, (k) => k.startsWith("slot.")]]) {
    const pan = got(mod, "chrome"); must(pan.length === 1 && eq(pan[0].rect, panel), `${mod}'s panel ${pan[0]?.rect} is not ${panel}`);
    const lamp = got(mod + ".lamp"); must(lamp.length >= 1 && lamp.every((r) => eq(r.rect, lampBox)), `${mod}'s lamp ${lamp.map((r) => r.rect)} is not ${lampBox}`);
    const want = union(Object.entries(E.parts).filter(([k, v]) => keys(k) && v[2]).map(([, v]) => v)); must(eq(pic(mod) ?? [], want ?? []), `${mod}'s pictures ${pic(mod)} are not the union of their places ${want}`);
    must(within(panel, [0, 0, 1024, 600]), `${mod}'s panel leaves the screen`);
  }
  const rings = got("focus"); must(rings.length === 1 && !!E.ring, `one ring on the focused target (${rings.length} drawn, ${cur})`); if (rings.length === 1 && E.ring) must(eq(rings[0].rect, E.ring), `the ring ${rings[0].rect} is not ${E.ring}`);
  return out;
}

export function partDepartures(boxOf, spec, props, cur) {
  const out = [], E = expected(spec, props, cur);
  for (const [id, want] of Object.entries(E.parts)) {
    const b = boxOf(id);
    if (!b) { out.push(`${id}: no node (an absent part is a node of no size, never dropped)`); continue; }
    if (want[2] === 0) { if (b[2] !== 0 || b[3] !== 0) out.push(`${id} is not given by the state and has a size ${b[2]} × ${b[3]}`); }
    else if (!eq(b, want)) out.push(`${id} is at ${b}, not ${want}`);
  }
  return out;
}

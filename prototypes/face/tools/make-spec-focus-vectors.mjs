#!/usr/bin/env node
// The focus vectors a spec file carries (create.json and incubator.json `focus.vectors`; library.json `l1.focus.vectors`, none yet; a spec with one graph has vectors with no `state`), written into tests/vectors/focus.json as cases beside the others (lvgl-switch.md §2.6.1), so that ui/focus.mjs (focus.test.mjs) and the face's
// C port (face_test) both play them. A case is the graph of the vector's state, the targets the view lists there (their boxes are the spec's, the chosen picture's for Create's roll), the ring's place and the key, and the id it must land on
// (and `verb` when the key is a stepper's: the face says step:<key> and the ring stays). A vector with an `intent` and no move (✓, ←) is not a move and is not written. Cases named `<screen>: …` are replaced on each run.
//   node prototypes/face/tools/make-spec-focus-vectors.mjs [--check] [create]
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listPitch } from "../../ui/specs/derive.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), file = path.resolve(here, "../tests/vectors/focus.json"), specs = path.resolve(here, "../../ui/specs/station");
const check = process.argv.includes("--check"), want = process.argv.slice(2).filter((a) => !a.startsWith("--")), screens = want.length ? want : ["home", "create", "incubator", "vivarium", "habitat", "namer", "library", "bench", "pods-overview"];
const V = JSON.parse(readFileSync(file, "utf8")), J = (n) => JSON.parse(readFileSync(path.join(specs, n.replace(/-overview$/, "") + ".json"), "utf8"));   // pods-overview: pods.json's vectors (its hand-written cases are named "pods: ...")
const TARGETS = {
  // Home: the six targets in the order the view lists them (the two bezels, then the four stations), each on its region's rectangle; the room (no ring at rest) is a vector's from, never a listed target
  home: (state, spec) => spec.focus.targets ? Object.entries(spec.focus.targets).map(([id, t]) => ({ id, rect: spec.regions[id].rect, group: t.group })) : [],
  incubator: (state, spec) => [{ id: "room", rect: spec.focus.roomAt, group: "room" }],   // one subject: the room, no ring drawn
  // the wireframe 18's targets (focus.layout), in the order the view lists them: the residents, then the tiles; a mibi `away` (out with the Companion) is a tile and no resident
  // the collection v2 room view's targets (focus.layout), in the order the view lists them: the residents, the chips (with their index), the card's plates (with theirs)
  vivarium: (state, spec) => Object.entries(spec.focus.layout).filter(([id]) => id !== "note").map(([id, rect], k, all) => { const group = id.slice(0, id.indexOf(".")), index = all.filter(([q]) => q.startsWith(group + ".")).findIndex(([q]) => q === id); return { id, rect, group, ...(group === "resident" ? {} : { index }) }; }),
  // one mibi up close: the view's targets in its order (the resident but out, the name but in the meet, the species word, one plate a chapter, the four modules, six tiles t0 to t5 of the eight places, then the room chips), the boxes the spec gives
  habitat: (state, spec, v) => { const R = spec.regions, np = v.chapters ?? 4, out = [];
    if (state !== "out") out.push({ id: "resident", rect: R.resident.rect, group: "resident" }); if (state !== "meet") out.push({ id: "name", rect: R.nameTag.rect, group: "name" }); out.push({ id: "species", rect: R.speciesLine.rect, group: "species" }); out.push({ id: "family", rect: [R.story.rect[0], R.story.rect[1], R.story.rect[2], 2 * R.story.pitch], group: "family" });
    for (let i = 0; i < np; i++) out.push({ id: "plate." + i, rect: listPitch(R.plates.places, np, i), group: "plate" });
    for (const [id, g] of [["door", "top"], ["portrait", "top"], ["cross", "low"], ["wild", "low"]]) out.push({ id, rect: R[id].rect, group: g });
    for (let i = 0; i < 6; i++) out.push({ id: "tile.t" + i, rect: listPitch(R.tiles, 8, i), group: "tile", index: i });   // six housed of the eight places (R6: the whole's compact form)
    for (let i = 0; i < 3; i++) out.push({ id: i === 2 ? "room.new" : "room." + i, rect: listPitch(R.chips, 3, i), group: "room", index: i });   // two rooms and the new-room chip
    return out; },
  // the namer's targets on a page: the keys the page draws (key.<i> on the grid's rectangle), then shift, space, page, done, suggest
  namer: (state, spec, v) => { const R = spec.regions, K = R.keys, out = [];
    spec.keys.pages[v.page ?? "letters"].forEach((c, i) => { if (c != null) out.push({ id: "key." + i, rect: listPitch(K, K.columns * K.rows, i), group: "key" }); });
    for (const [id, r, g] of [["mod.shift", R.shift.rect, "mod"], ["mod.space", R.space.rect, "mod"], ["mod.page", R.page.rect, "mod"], ["act.done", R.done.rect, "act"], ["act.suggest", R.suggest.rect, "act"]]) out.push({ id, rect: r, group: g });
    return out; },
  // the Library's Level 1: sixteen cells, cell.S01 to S16 in species order, each its place on l1.grid's form for sixteen (a vector's `unmet` cells are not targets)
  library: (state, spec, v) => { const F = spec.l1.grid.forms["16"], out = []; for (let k = 0; k < 16; k++) { const id = "cell.S" + String(k + 1).padStart(2, "0"); if (!(v.unmet ?? []).includes(id)) out.push({ id, rect: listPitch(F, 16, k), group: "cell" }); } return out; },
  // the Probe bench: the plates (docked only), then the switch and the slot, each its region's rectangle; one graph for both states
  bench: (state, spec) => { const R = spec.regions; return [...(state === "away" ? [] : [{ id: "plates", rect: R.plates.rect, group: "plates" }]), { id: "switch", rect: R.switch.rect, group: "module" }, { id: "slot", rect: R.slot.rect, group: "module" }]; },
  // Pods' overview: the rail's open tab, the pod, the figure (an identified pod's), the kin (`kin` of them, 2 when absent) and the hatch, in the order the view lists them, each its region's rectangle
  "pods-overview": (state, spec, v) => { const R = spec.regions.overview, k = R.kin, out = [{ id: "rail.0", rect: [R.rail.rect[0], R.rail.rect[1], 120, R.rail.rect[3]], group: "rail", index: 0 }, { id: "pod", rect: R.pod.rect, group: "pod" }];
    if (v.figure !== false) out.push({ id: "figure", rect: R.figure.rect, group: "figure" });
    for (let i = 0; i < (v.kin ?? 2); i++) out.push({ id: "kin." + i, rect: [k.first[0] + k.pitch[0] * i, k.first[1] + k.pitch[1] * i, k.first[2], k.first[3]], group: "kin", index: i });
    out.push({ id: "hatch", rect: R.hatch.rect, group: "hatch" }); return out; },
  create: (state, spec) => (state === "shape" ? [{ id: "roll", rect: spec.regions.roll.forms.roll.pictures[1], group: "roll" }] : []),   // the chosen picture's rectangle: the middle one stands for it
};
const cases = [];
for (const screen of screens) {
  const spec = J(screen), F = screen === "library" ? spec.l1.focus : spec.focus;   // Level 1 keeps its focus under `l1`
  for (const v of F.vectors ?? []) {
    if (v.intent && !/^step:/.test(v.intent)) continue;   // ✓ and ← are intents on the target, not moves
    const st = screen === "pods-overview" ? { graph: F[v.state] } : v.state && F[v.state]?.graph ? F[v.state] : F, c = { name: `${screen}: ${v.state ? v.state + ", " : ""}${v.from} ${v.key}${v.away ? " (away: " + v.away.join(", ") + ")" : ""}${v.intent ? " says " + v.intent : ""}`, graph: st.graph, targets: TARGETS[screen](v.state, spec, v), from: v.from, key: v.key, to: v.to };
    if (screen === "vivarium") { c.resolve = { ...(F.resolveFor ?? {}), ...(v.resolve ?? {}) }; if (v.from === "room") c.roomAt = F.roomAt; }   // the view's selectors for the ring the vectors start from (views/vivarium-props.mjs and the face's row): the card's first live plate, the lit chip, the card's mibi, the row (a vector may give its own)
    if (screen === "home") { c.roomAt = F.roomAt; c.name = `home: ${v.from} ${v.key} is ${v.to}`; }   // the ring at rest is on the room: its point is roomAt
    if (screen === "habitat") {   // the symbolic tiles: the first tile, a tile, the shown one (t2); the selector the view gives
      const sym = (id) => (id === "tile.first" ? "tile.t0" : id === "a tile" || id === "tile.shown" ? "tile.t2" : id === "room.shown" ? "room.0" : id); c.from = sym(v.from); c.to = sym(v.to); c.resolve = { "tile.shown": "tile.t2", "room.shown": "room.0" };
      c.name = `habitat: ${v.state ? v.state + ", " : ""}${v.from} ${v.key}${v.chapters ? " (" + v.chapters + " chapters)" : ""}${v.intent ? " says " + v.intent : ""}`;
    }
    if (screen === "namer") c.name = `namer: ${v.page ? v.page + ", " : ""}${v.from} ${v.key}`;
    if (screen === "pods-overview") { c.resolve = { "rail.last": "rail.0", "kin.first": (v.kin ?? 2) > 0 ? "kin.0" : "" }; c.name = `pods-overview: ${v.from} ${v.key}${v.kin === 0 ? " (no kin)" : ""}${v.figure === false ? " (no figure)" : ""}`; }
    if (v.intent) c.verb = v.intent; cases.push(c);
  }
}
// the file is one case a line, escaped to ASCII as it was written
const esc = (t) => t.replace(/[\u0080-\uffff]/g, (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0")), j = (x) => esc(JSON.stringify(x));
const text = (all) => `{"_note":${j(V._note)},"cases":[${all.map(j).join(",\n")}],"refusals":[${V.refusals.map(j).join(",\n")}],"sound":[${V.sound.map(j).join(",\n")}]}\n`;
const keep = V.cases.filter((c) => !screens.some((s) => c.name.startsWith(s + ": "))), next = [...keep, ...cases];
if (text(V.cases) !== readFileSync(file, "utf8")) { console.error("the formatter does not reproduce focus.json: the file was edited by hand in another form"); process.exit(1); }
if (check) { const have = V.cases.filter((c) => screens.some((s) => c.name.startsWith(s + ": "))); if (JSON.stringify(have) !== JSON.stringify(cases)) { console.error("focus.json is not current for " + screens.join(", ")); process.exit(1); } console.log(`focus vectors current: ${cases.length} cases for ${screens.join(", ")}`); }
else { writeFileSync(file, text(next)); console.log(`wrote ${cases.length} cases for ${screens.join(", ")} (${next.length} in all)`); }

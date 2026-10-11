#!/usr/bin/env node
// The focus vectors a spec file carries (create.json and incubator.json `focus.vectors`; a spec with one graph has vectors with no `state`), written into tests/vectors/focus.json as cases beside the others (lvgl-switch.md §2.6.1), so that ui/focus.mjs (focus.test.mjs) and the face's
// C port (face_test) both play them. A case is the graph of the vector's state, the targets the view lists there (their boxes are the spec's, the chosen picture's for Create's roll), the ring's place and the key, and the id it must land on
// (and `verb` when the key is a stepper's: the face says step:<key> and the ring stays). A vector with an `intent` and no move (✓, ←) is not a move and is not written. Cases named `<screen>: …` are replaced on each run.
//   node prototypes/face/tools/make-spec-focus-vectors.mjs [--check] [create]
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url)), file = path.resolve(here, "../tests/vectors/focus.json"), specs = path.resolve(here, "../../ui/specs/station");
const check = process.argv.includes("--check"), want = process.argv.slice(2).filter((a) => !a.startsWith("--")), screens = want.length ? want : ["create", "incubator", "vivarium"];
const V = JSON.parse(readFileSync(file, "utf8")), J = (n) => JSON.parse(readFileSync(path.join(specs, n + ".json"), "utf8"));
const TARGETS = {
  incubator: (state, spec) => [{ id: "room", rect: spec.focus.roomAt, group: "room" }],   // one subject: the room, no ring drawn
  // the wireframe 18's targets (focus.layout), in the order the view lists them: the residents, then the tiles; a mibi `away` (out with the Companion) is a tile and no resident
  vivarium: (state, spec, v) => (state === "empty" ? [] : Object.entries(spec.focus.layout).filter(([id]) => !(id.startsWith("resident.") && (v.away ?? []).includes(id.slice(9)))).filter(([id]) => id !== "note").map(([id, rect]) => ({ id, rect, group: id.slice(0, id.indexOf(".")), ...(id.startsWith("tile.") ? { index: Object.keys(spec.focus.layout).filter((k) => k.startsWith("tile.")).indexOf(id) } : {}) }))),
  create: (state, spec) => (state === "shape" ? [{ id: "roll", rect: spec.regions.roll.forms.roll.pictures[1], group: "roll" }] : []),   // the chosen picture's rectangle: the middle one stands for it
};
const cases = [];
for (const screen of screens) {
  const spec = J(screen);
  for (const v of spec.focus.vectors) {
    if (v.intent && !/^step:/.test(v.intent)) continue;   // ✓ and ← are intents on the target, not moves
    const st = v.state && spec.focus[v.state]?.graph ? spec.focus[v.state] : spec.focus, c = { name: `${screen}: ${v.state ? v.state + ", " : ""}${v.from} ${v.key}${v.away ? " (away: " + v.away.join(", ") + ")" : ""}${v.intent ? " says " + v.intent : ""}`, graph: st.graph, targets: TARGETS[screen](v.state, spec, v), from: v.from, key: v.key, to: v.to };
    if (screen === "vivarium") {   // the view's selectors for the ring where it stands (views/vivarium-props.mjs): the focused resident's own tile; the focused tile's resident, null when it is out; the empty state's ring is on the room
      const resolve = {}, here = (id) => c.targets.some((t) => t.id === id);
      if (v.from.startsWith("resident.")) resolve["tile.of"] = "tile." + v.from.slice(9); if (v.from.startsWith("tile.")) resolve["resident.of"] = here("resident." + v.from.slice(5)) ? "resident." + v.from.slice(5) : "";
      if (Object.keys(resolve).length) c.resolve = resolve; if (v.from === "room") c.roomAt = spec.focus.roomAt;
    }
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

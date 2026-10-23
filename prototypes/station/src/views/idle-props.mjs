// The Idle props (lvgl-switch.md §2.1, §4 L2.2; frame.json `idle`): pure selectors from the state to the props of Idle's composition, the whole 1024×600 with no frame. Props name *what*, never *where*: the people of the living window (the
// residents at home, each a seed; the bed and the carried set asleep), the painting's slot and the one line; no rectangle, no measure, no layout rule, no colour (the face reads those from frame.json `idle`). Plain JSON:
// { props (idle: true, regions, frame.idle.line), requests }. Runs in Node, tested there (tests/idle-props.test.mjs); the shape is idle.props.json.
//   m: { st, sv, settings, docked }; spec: frame.json
import * as S from "../state.mjs";
import { livingOf } from "./home-props.mjs";
import { fill } from "./words.mjs";
import { req as reqOf, ph as phOf } from "./requests.mjs";


// The line (frame.json idle.strings): the words of the one fact the rule gives (S.idleKey); none, empty. More than three crates read without a count; one mibi out is named, two or three are counted.
export function idleLine(m, I) {
  const T = I.strings, k = S.idleKey(m.st, m.sv, m.settings); if (!k) return T.none;
  if (k.key === "crates") return k.n > 3 ? T.crates.many : T.crates[k.n];
  if (k.key === "out") return k.n === 1 ? fill(T.out["1"], { name: k.name }) : T.out[String(Math.min(k.n, 3))];
  return T[k.key];
}

// The Vivarium's painting of a light (frame.json idle.regions.vivarium, one a light): the picture Idle shows whole and the Vivarium's whole shows rows 120 to 560 of; one request for both, so a light's painting is on the face once.
export function paintingOf(req, frame, light) {
  const I = frame.idle, size = I.regions.vivarium.rect.slice(2);
  return req({ kind: "slot", id: `idle-vivarium-${light}:${size.join("x")}`, master: `${I.light.pictures[light]}-${size.join("x")}`, size, until: "Idle's Vivarium master (the light)" });
}

export function idleBuild(m, frame) {
  const I = frame.idle, R = I.regions, requests = [], req = reqOf(requests);
  const ph = phOf(req, "its master (station-layouts.md, Placeholders on Idle)");
  const lw = livingOf({ ...m, view: "idle" }, R, req, ph, frame.light);
  const vivarium = { picture: paintingOf(req, frame, m.light) };
  return { props: { idle: true, regions: { vivarium, residents: lw.residents, bed: lw.bed }, frame: { idle: { line: idleLine(m, I) } } }, requests };
}

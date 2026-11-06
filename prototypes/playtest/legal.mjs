// The legal inputs for bots and the assisted control (the playtest plan: "the text-from-regions observation stays available only for bots and the assisted control"). The harness itself has
// the device's keys only; legal(session) names, from what the face drew and the props it drew from, what each key would do on the focused item: the pad moves between the targets the screen
// lists, ✓ does the action the screen words (the `action` region: its label, then its prices), ← goes where the way back says, the four room keys and the Dock key are always the device's.
// It never reads the rules' state. A raw player does not get this list.
//   const L = legal(session);  L.actions  // [{ id: "confirm:Identify", key: "confirm", label: "Identify" }, ...]
import { KEYS } from "./driver.mjs";

const PAD = ["up", "down", "left", "right"], ROOM_KEYS = ["home", "research", "library", "habitat"];
// Create's pad rolls and walks the traits whatever the ring is on (it lists no targets); Cargo's ✓ and ← are the opening's
const PAD_WITHOUT_TARGETS = new Set(["create"]);

export function legal(session) {
  const props = session.props(), o = session.observeAssisted();
  const f = props?.focus ?? {}, targets = (f.targets ?? []).map((t) => t.id), cur = f.cur || null;
  const of = (region) => o.words.filter((w) => w.region === region).map((w) => w.text);
  const action = of("action"), label = action.find((t) => !/^\d+$/.test(t)) ?? null, prices = action.filter((t) => /^\d+$/.test(t)).map(Number);
  const back = of("back")[0] ?? null;
  const actions = [];
  const add = (key, what, extra = {}) => actions.push({ id: key + ":" + what, key, label: what, ...extra });
  if (label) add("confirm", label, { prices });
  else if (cur) add("confirm", cur);   // a ring with no words: ✓ is still pressable, the screen just does not say what it does
  if (back) add("back", back);
  if (targets.length > 1 || PAD_WITHOUT_TARGETS.has(o.screen)) for (const k of PAD) add(k, "move" + (cur ? " from " + cur : ""));
  for (const k of ROOM_KEYS) add(k, "room key");
  add("dock", "Dock key");
  return { screen: o.screen, state: o.state, overlay: o.overlay, focus: cur, targets, label, prices, back, actions, keys: actions.map((a) => a.key).filter((k, i, a) => a.indexOf(k) === i).filter((k) => KEYS.includes(k)) };
}
// the three materials as the bar writes them (Energy, Data, Essence), or null where the screen shows none (Home)
export function materials(o) {
  const m = o.words.filter((w) => w.region === "materials").map((w) => parseInt(w.text, 10));
  return m.length === 3 && m.every(Number.isFinite) ? { e: m[0], d: m[1], s: m[2] } : null;
}

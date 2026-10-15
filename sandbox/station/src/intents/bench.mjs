// The Probe bench's intents (bench.json): ✓ on the plates mends one, ✓ on the switch sets whether the dock mends every plate, ✓ on the slot fits the upgrade (the first ✓ arms, the second fits; short, it says so and spends nothing),
// ← goes Home with the ring on the Probe module. The events are the spec's (events.mend, switch, install): no constant of time lives here; reduced motion sends hold 0. Any key but ✓ clears the arm.
import * as S from "../state.mjs";

const fill = (t, o) => t.replace(/\{(\w+)\}/g, (_, k) => (k in o ? o[k] : "{" + k + "}"));
const play = (h, name, over = {}) => { const e = h.specs.bench.events[name]; h.play({ kind: e.kind, target: e.target, ms: e.ms, hold: h.motion() ? e.hold : 0, ...over }); };

// The ring moved to a target of the bench (the face says `plates`, `switch` or `slot`): the bench keeps it.
export function focus(h, target) { h.ui.bench.f = target; }

// `target`: plates | switch | slot.
export function intent(h, target, verb) {
  const b = h.ui.bench, Sg = h.specs.bench.strings;
  if (verb !== "confirm") b.arm = 0;
  if (verb === "back") { h.ui.home.f = "probe"; h.goto("home"); return; }
  if (verb !== "confirm") return;
  b.f = target;
  const docked = S.docked(h.st);
  if (target === "plates") {
    const pr = S.probeNow(h.st, h.sv), before = pr.shield;
    if (!docked || !h.st.probe || pr.shield >= pr.smax) return;   // every plate whole (or away): nothing to mend
    const r = S.mendPlate(h.st, h.settings);
    if (r.ok) { play(h, "mend", { from: before, to: before + 1 }); h.save(); }
    else h.say(fill(Sg.short, { icons: S.shortIcons(h.st, S.price(S.PRICE.mend, h.settings), 0, 0) }));   // short: the message plate, nothing spent
  } else if (target === "switch") {
    const was = !!h.st.mendFull; S.setMendFull(h.st, !was);
    play(h, "switch", { from: was ? 1 : 0, to: was ? 0 : 1 }); h.save();
  } else if (target === "slot") {
    if (!docked || S.tierNow(h.st, h.sv) >= 2) return;   // away: the Probe is out; fitted: nothing more to fit
    const e = S.price(S.PRICE.tier2E, h.settings), d = S.price(S.PRICE.tier2D, h.settings);
    if (!S.tier2Ready(h.st, h.settings)) { h.say(fill(Sg.short, { icons: S.shortIcons(h.st, e, d, 0) })); return; }
    if (!b.arm) { b.arm = 1; return; }   // the first ✓ arms: the part lifts, "Again: fit the upgrade"
    b.arm = 0; const before = S.probeNow(h.st, h.sv).shield, r = S.installTier2(h.st, h.settings);
    if (!r.ok) return;
    play(h, "install", { from: before, to: S.TIER[2].shield });
    if (h.motion()) { b.install = true; h.at(h.specs.bench.events.install.ms, () => { b.install = false; }); }   // the tier-1 cradle picture stays on the face until the install cuts at 300 (views/bench-props.mjs)
    h.save();
  }
}

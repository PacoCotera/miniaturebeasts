// The Probe bench as props (lvgl-switch.md §2.1, §4 P; bench.json): pure selectors from the state and the bench's UI to the props of the face's bench, beside the frame's. Props name *what*, never *where*: the state, the plates' tier and
// whole count, the switch's and the slot's states and lamps, picture ids and the focus targets by id; no rectangle, no colour, no layout rule (the words place everything from bench.json: the plates by the tier's places, the part by the slot's
// state). The output is plain JSON: { props (state, regions, focus), line (the bottom line, for the frame), requests (the pictures the host makes ready before the props) }. Runs in Node, tested there (tests/bench-props.test.mjs);
// the shape is bench.props.json.
//   m: { st, sv, settings, docked, ui (UI.bench: { f, arm, install }) }
import * as S from "../state.mjs";
import { slot } from "./pods-props.mjs";
import { warnWords } from "./goal-words.mjs";

const fill = (t, o) => t.replace(/\{([^{}|]+)\|([^{}|]+)\}/g, (_, a, b) => (o.n === 1 ? a : b)).replace(/\{([^{}]+)\}/g, (_, k) => (k in o ? o[k] : "{" + k + "}"));
const SPELL = ["no", "one", "two", "three", "four"];

export function benchBuild(m, spec, frame) {
  const { st, sv, settings, docked, ui } = m, R = spec.regions, Sg = spec.strings, requests = [], req = (r) => { requests.push(r); return r.id; };
  const ph = (id, size, hollow = false) => req({ kind: "ph", id, size, hollow, until: "its master (bench.json masters)" });
  const pr = S.probeNow(st, sv), tier = S.tierNow(st, sv), places = R.plates.places[tier] ?? [], count = S.TIER[tier].shield;
  const whole = Math.min(pr.shield, places.length), gone = !!st.probe && pr.shield < pr.smax;   // a plate is gone: the Probe was docked (it holds a Shield) and one is worn

  // the stage: the Probe section's master (signed), one candidate
  const room = [slot(req, R.bench.slice, R.bench.rect, "the Probe section's stage master (signed)")];
  // the cradle: one picture a tier, the empty cradle while the Probe is away; the tier-1 picture stays on the face while the install plays (it cuts at 300)
  const C = R.cradle.pictures, cradle = ph(!docked ? C.away : tier === 2 ? C.tier2 : C.tier1, R.cradle.rect.slice(2), !docked);
  if (ui?.install) ph(C.tier1, R.cradle.rect.slice(2));
  // the fixed pictures: the plates, the switch, the slot (the face reads their ids from bench.json)
  ph(R.plates.slices.whole, R.plates.plate); ph(R.plates.slices.gone, R.plates.plate, true);
  const T = R.switch.toggle, MN = R.switch.meaning, AD = R.slot.adds;
  ph(T.track.off, T.size, true); ph(T.track.on, T.size); ph(T.knob.slice, T.knob.size); ph(MN.dock.slice, MN.dock.size); ph(MN.plates.whole, MN.plates.icon); ph(MN.plates.gone, MN.plates.icon, true);
  ph(R.slot.socket.slice, R.slot.socket.size, true); ph(R.slot.part.slices.dim, R.slot.part.size, true); ph(R.slot.part.slices.ready, R.slot.part.size); ph(R.slot.part.slices.fitted, R.slot.part.size);
  ph(AD.pods.slice, AD.pods.icon); ph(AD.pods.newSlice, AD.pods.icon); ph(AD.plates.slice, AD.plates.icon); ph(AD.plates.newSlice, AD.plates.icon);
  ph(AD.reach.slice, AD.reach.size); ph(AD.reach.newSlice, AD.reach.size); ph(AD.deep.slice, AD.deep.size); ph(AD.deep.newSlice, AD.deep.size);

  // the switch: set at any time, docked or away
  const plate = (r) => req({ kind: "slot", id: `plate-device-${r.rect[2]}x${r.rect[3]}`, master: `plate-device-${r.rect[2]}x${r.rect[3]}`, size: r.rect.slice(2), until: "the device plate (fix 2: placed 1:1 at the module's rect)" });
  const on = !!st.mendFull, sw = { plate: plate(R.switch), state: on ? "on" : "off", lamp: on ? "well" : "off", count, whole: on ? count : Math.min(S.DOCK_MEND_FLOOR, count) };
  // the slot, in order: tier 2 fitted; away dim; affordable ready (armed after the first ✓); else dim, short
  const ready = tier < 2 && docked && S.tier2Ready(st, settings), armed = ready && !!ui?.arm;
  const slotState = tier === 2 ? "fitted" : !docked ? "dim" : ready ? (armed ? "armed" : "ready") : "dim", sl = { plate: plate(R.slot), state: slotState, lamp: slotState === "dim" ? "off" : "well" };

  const regions = { bench: { room }, cradle: { picture: cradle }, ...(docked ? { plates: { tier, whole } } : {}), switch: sw, slot: sl };
  const targets = [...(docked ? [{ id: "plates", group: "plates", enabled: gone }] : []), { id: "switch", group: "module", enabled: true }, { id: "slot", group: "module", enabled: docked && tier === 1 }];
  let cur = ui?.f ?? null; if (cur !== "plates" && cur !== "switch" && cur !== "slot") cur = null;
  if (cur === "plates" && !docked) cur = "switch";
  if (!cur) cur = docked && gone ? "plates" : "switch";

  // the bottom line, by the focused target (bench.json bottomLine); the price from the rules, the dimmed cap with the short figure `amber` when the price is more than the player has
  const line = { ok: null, subject: "", back: Sg.back, need: null };
  if (cur === "plates") {
    const cost = S.price(S.PRICE.mend, settings);
    if (docked && gone) {
      const n = pr.smax - pr.shield; Object.assign(line, { ok: Sg.mend, price: cost ? S.priceText(cost, 0, 0) : "", subject: fill(Sg.toMend, { "n in words": SPELL[n] ?? String(n), n }) });
      if (st.e < cost) { line.dim = true; line.short = S.shortIcons(st, cost, 0, 0); } else if (cost) line.need = warnWords(st, m.sv, settings, frame, { e: cost }, { key: "mend" }) ?? line.need;
    } else line.subject = Sg.whole;
  } else if (cur === "switch") {
    const free = S.price(S.PRICE.mend, settings) === 0;
    Object.assign(line, on ? { ok: Sg.switchOff, subject: free ? Sg.onContextFree : Sg.onContext.replace("⚡ 1", "⚡ " + S.price(S.PRICE.mend, settings)) } : { ok: Sg.switchOn, subject: Sg.offContext });
  } else if (tier === 2) line.subject = Sg.fitted;
  else if (!docked) line.subject = Sg.dockFirst;
  else {
    const e = S.price(S.PRICE.tier2E, settings), d = S.price(S.PRICE.tier2D, settings);
    Object.assign(line, { ok: armed ? Sg.fitAgain : Sg.fit, price: S.priceText(e, d, 0), subject: Sg.adds });
    if (!ready) { line.dim = true; line.short = S.shortIcons(st, e, d, 0); }
  }
  return { props: { state: docked ? "docked" : "away", regions, focus: { cur, targets, armed: armed ? "slot" : null } }, line, requests };
}

// The four scripted policies (the plan, layer 1). A policy plays one world turn at a time on a context (tasks.mjs): the harness docks the Companion before it and lifts after. Each one plays the
// whole loop of the playtest (plan row 3.15): a pod in the Bay, read, grown, hatched, cared for (greeted, read), crossed with a partner, taken out with the Companion again, and the Sitting tried;
// they differ in what they spend and when.
//   random      a legal key at random: the pad, ✓, ←, the room keys (the screens it reaches are the screens a button-masher reaches)
//   greedy      spends on whatever raises progress: identify every pod, read every chapter, grow, pay Hatch now, read its mibis, cross, take a mibi out, fit the Probe's second tier
//   hoarder     keeps what it has: identifies the pods it must to grow, reads no chapter, never pays Hatch now (it waits the bud out), never lets a pod go; then the same walk of the loop
//   speedrunner the shortest road: identify two pods, grow, pay Hatch now, greet, cross as soon as two adults stand, take one out; no reading
import { addRoom, wallCells, openBay, readAllPods, incubatorState, growOne, hatch, toHabitat, careHere, crossHere, takeOut, sit, tier2, toHome, residents, materialsNow } from "./tasks.mjs";

const pick = (rng, list) => list[Math.floor(rng() * list.length)];

export const random = {
  name: "random",
  playTurn(ctx) {
    const weights = { confirm: 35, back: 10, pad: 40, room: 10, dock: 1 };
    for (;;) {
      const L = ctx.view().L, by = { confirm: L.actions.filter((a) => a.key === "confirm"), back: L.actions.filter((a) => a.key === "back"), pad: L.actions.filter((a) => ["up", "down", "left", "right"].includes(a.key)), room: L.actions.filter((a) => ["home", "research", "library", "habitat"].includes(a.key)), dock: L.actions.filter((a) => a.key === "dock") };
      const kinds = Object.keys(weights).filter((k) => by[k].length), total = kinds.reduce((s, k) => s + weights[k], 0);
      let r = ctx.rng() * total, kind = kinds[0]; for (const k of kinds) { if ((r -= weights[k]) < 0) { kind = k; break; } }
      const a = pick(ctx.rng, by[kind]); ctx.press(a.key, "random: " + a.label);
    }
  },
};

// Hatch now costs Essence, and the Cross costs 4 of it (the Cross screen's price): the first bud is paid for, the later ones only from what stays above the Cross's price (the bots found
// this the hard way: paying every Hatch now left the Essence short of the Cross for the whole game)
const CROSS_ESSENCE = 4, HATCH_NOW_ESSENCE = 3;
const payKeep = (ctx) => { const m = materialsNow(ctx); return (ctx.state.hatchedN ?? 0) === 0 || (!!m && m.s >= CROSS_ESSENCE + HATCH_NOW_ESSENCE); };

// one world turn of the loop. o: read (chapters of pods), max (pods looked at), pay (Hatch now), readMibis, sitting, tier2
// The order matters (the bots found it): a bud already in the Incubator hatches first, then the mibis at home are greeted and the Cross is tried, and only then a new pod is grown. A new
// grow costs 4 Essence, the Cross costs 4, and a trip brings 1 to 3: a bot that grows first never has the Essence for the Cross. A Cross that opened and could not be paid keeps the grow back.
function loop(ctx, o) {
  const pay = o.pay ? payKeep : false;
  openBay(ctx);
  readAllPods(ctx, { identify: true, read: false, max: o.max ?? 8 });   // identify first: a pod must be identified to grow, and a read can spend the Data an identify needs
  let state = incubatorState(ctx);
  if (state === "growing" || state === "ready") hatch(ctx, { pay });
  ctx.state.saving = false;
  let crossed = false;
  const n = Math.min(6, wallCells(ctx).length);
  for (let i = 1; i <= n; i++) {   // the newest first: a child crossed again is how a line gets deep (the Sitting is earned by a line four crosses deep)
    if (!toHabitat(ctx, -i)) continue;   // a cell the ring cannot reach (a mibi out with the Companion): the next one
    careHere(ctx, { read: !!o.readMibis });
    if (!crossed && crossHere(ctx)) { crossed = true; hatch(ctx, { pay }); break; }
  }
  if (!ctx.state.saving) { state = incubatorState(ctx); if (state === "empty" && growOne(ctx)) hatch(ctx, { pay }); }
  if (ctx.state.full) { ctx.state.full = false; if (addRoom(ctx)) { ctx.mark("roomAdded"); if (growOne(ctx)) hatch(ctx, { pay }); } }   // the Vivarium is full: Add a room (Essence), then the grow goes on
  if (o.read) readAllPods(ctx, { identify: false, read: true, max: o.max ?? 5 });   // then the chapters with what Data is left
  if (toHabitat(ctx, 0)) {
    takeOut(ctx);
    if (o.sitting) sit(ctx);
  }
  if (o.tier2) { const m = materialsNow(ctx); if (m && m.e >= 12 && m.d >= 4) tier2(ctx); }
  toHome(ctx);
}

export const hoarder = { name: "hoarder", playTurn: (ctx) => loop(ctx, { read: false, pay: false, readMibis: false, sitting: true, max: 3 }) };
export const greedy = { name: "greedy", playTurn: (ctx) => loop(ctx, { read: true, pay: true, readMibis: true, sitting: true, tier2: true }) };
export const speedrunner = { name: "speedrunner", playTurn: (ctx) => loop(ctx, { read: false, pay: true, readMibis: false, sitting: false, max: 2 }) };

export const POLICIES = { random, greedy, hoarder, speedrunner };

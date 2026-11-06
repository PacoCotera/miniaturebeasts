// The four scripted policies (the plan, layer 1). A policy plays one world turn at a time on a context (tasks.mjs): the harness docks the Companion before it and lifts after.
//   random      a legal key at random: the pad, ✓, ←, the room keys (the screens it reaches are the screens a button-masher reaches)
//   greedy      spends on whatever raises progress: identify every pod, read every chapter, create, pay Hatch now, fit the Probe's second tier
//   hoarder     collects and never spends: opens the Bay, looks at the rooms, presses no priced action
//   speedrunner the shortest road to the first hatch: open, identify one pod, create from it, pay Hatch now; after the first hatch it only docks and lifts
import { openBay, podsList, identifyPod, readChapters, focusOn, createFromOverview, incubatorEmpty, hatch, tier2, materialsNow } from "./tasks.mjs";

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

export const hoarder = {
  name: "hoarder",
  playTurn(ctx) {
    openBay(ctx);
    for (const room of ["research", "library", "habitat", "home"]) ctx.press(room, "look, spend nothing");
  },
};

// the road to a hatch: identify the pods in turn, create from the first that can be, hatch; with `read`, then read every chapter of every identified pod while Data lasts
function road(ctx, { read, pay }) {
  const empty = incubatorEmpty(ctx), pods = podsList(ctx); let created = false;
  const back = () => { if (ctx.view().L.screen === "pods" && ctx.view().L.state !== "collection") ctx.press("back", "to the pods"); };
  for (const p of pods) {
    const r = identifyPod(ctx, p.id);
    if (r.opened && empty && !created && ctx.view().L.label?.startsWith("Create")) created = createFromOverview(ctx);
    if (created) break;
    back(); if (ctx.view().L.screen !== "pods") break;
  }
  const h = hatch(ctx, { pay });
  if (read) {
    const again = podsList(ctx);
    for (const p of again) { if (!p.known || !focusOn(ctx, p.id)) continue; ctx.press("confirm", "look at the pod"); if (ctx.view().L.state === "overview") readChapters(ctx); back(); }
  }
  return h;
}

export const greedy = {
  name: "greedy",
  playTurn(ctx) {
    openBay(ctx);
    const h = road(ctx, { read: true, pay: true });
    if (h.hatched) { const m = materialsNow(ctx); if (m && m.e >= 12 && m.d >= 4) tier2(ctx); }
    ctx.press("home", "Home");
  },
};

export const speedrunner = {
  name: "speedrunner",
  playTurn(ctx) {
    openBay(ctx);
    if (!ctx.state.hatched) { const h = road(ctx, { read: false, pay: true }); if (h.hatched) ctx.state.hatched = true; }
    ctx.press("home", "Home");
  },
};

export const POLICIES = { random, greedy, hoarder, speedrunner };

// The bots' moves: small tasks over a context `ctx` (bot-game.mjs): ctx.press(key, why), ctx.view() (legal() and the bar's materials), ctx.wait(minutes), ctx.rng(). A task presses keys,
// reads the screen after each, and stops when the screen says it is done or it cannot go on (it returns false); it never reads the rules' state. A refusal is found the way a player finds it:
// the screen did not change.
const OPP = { up: "down", down: "up", left: "right", right: "left" };
const wordsOf = (ctx, region) => ctx.view().o.words.filter((w) => w.region === region).map((w) => w.text);
const has = (ctx, region, re) => wordsOf(ctx, region).some((t) => re.test(t));

// walk the ring to a target id by the pad (never the rules' graph: press, look, and step back from a ring already visited)
export function focusOn(ctx, id, max = 14) {
  const seen = new Set(); let cur = ctx.view().L.focus; seen.add(cur);
  for (let n = 0; n < max && cur !== id; n++) {
    let moved = false;
    const T = ctx.view().L.targets, forward = T.indexOf(id) >= T.indexOf(cur);   // the screen lists its targets in reading order: aim that way first
    for (const k of forward ? ["right", "down", "left", "up"] : ["left", "up", "right", "down"]) {
      ctx.press(k, "toward " + id);
      const now = ctx.view().L.focus;
      if (now === cur) continue;
      if (seen.has(now)) { ctx.press(OPP[k], "back off"); continue; }
      seen.add(now); cur = now; moved = true; break;
    }
    if (!moved) return false;
  }
  return cur === id;
}

// the Bay: ✓ Open now, then ✓ Skip the opening, until the crate is in (it leaves for Pods)
export function openBay(ctx) {
  for (let i = 0; i < 6 && ctx.view().L.screen === "cargo"; i++) ctx.press("confirm", "open the crate");
  return ctx.view().L.screen !== "cargo";
}

export const materialsNow = (ctx) => ctx.view().mat;
// Pods' collection: the places and the names drawn on them ("Unknown" until identified)
export function podsList(ctx) {
  ctx.press("research", "Pods");
  const L = ctx.view().L; if (L.screen !== "pods") return [];
  const names = wordsOf(ctx, "place.name");
  return L.targets.filter((t) => t.startsWith("place.")).map((id, i) => ({ id, name: names[i] ?? null, known: names[i] != null && names[i] !== "Unknown" }));
}
// a pod's overview: ✓ Identify (◆1) when the label says so; reads each chapter when `read`
export function identifyPod(ctx, place, { read = false } = {}) {
  if (!focusOn(ctx, place)) return { opened: false };
  ctx.press("confirm", "look at the pod");
  if (ctx.view().L.state !== "overview") return { opened: false };
  const out = { opened: true, identified: false, read: 0 };
  if (ctx.view().L.label === "Identify") {
    const m = materialsNow(ctx); const cost = ctx.view().L.prices[0] ?? 1;
    if (m && m.d >= cost) { ctx.press("confirm", "identify"); out.identified = ctx.view().L.label !== "Identify"; }
  }
  if (read && ctx.view().L.label !== "Identify") out.read = readChapters(ctx);
  return out;
}
// the chapters of the pod on the overview, each ✓ read while Data lasts
export function readChapters(ctx) {
  let n = 0;
  for (const rail of ctx.view().L.targets.filter((t) => t.startsWith("rail."))) {
    if (!focusOn(ctx, rail)) continue;
    ctx.press("confirm", "open the chapter");
    if (ctx.view().L.state === "chapter" && /^Read /.test(ctx.view().L.label ?? "")) { const m = materialsNow(ctx); if (m && m.d >= (ctx.view().L.prices[0] ?? 1)) { ctx.press("confirm", "read"); n++; } }
    ctx.press("back", "to the overview");
  }
  return n;
}
// Create from the pod open on the overview: ✓ the pod, ✓ Incubate, ✓ the panel's Incubate; true when the Incubator opened
export function createFromOverview(ctx) {
  if (!focusOn(ctx, "pod")) return false;
  if (!/^Create/.test(ctx.view().L.label ?? "")) return false;
  ctx.press("confirm", "create from this pod");
  if (ctx.view().L.screen !== "create") return false;
  ctx.press("confirm", "incubate");
  if (has(ctx, "panelHeader", /Incubate/)) ctx.press("confirm", "incubate (the panel)");
  if (ctx.view().L.screen === "incubator") return true;
  while (ctx.view().L.screen === "create" || has(ctx, "panelHeader", /./)) { ctx.press("back", "refused: back"); if (ctx.view().L.screen !== "create") break; }
  return false;
}
export const incubatorEmpty = (ctx) => { ctx.press("home", "Home"); return has(ctx, "incubator", /^empty$/); };

// the Incubator: wait out the bud (free) or pay Hatch now; ✓ Open when ready; the meet and the name. Returns { hatched, paid }.
export function hatch(ctx, { pay = false } = {}) {
  ctx.press("home", "Home");
  if (!focusOn(ctx, "incubator")) return { hatched: false };
  ctx.press("confirm", "the Incubator");
  const out = { hatched: false, paid: false };
  for (let i = 0; i < 6 && ctx.view().L.screen === "incubator"; i++) {
    const L = ctx.view().L;
    if (L.state === "empty") return out;
    if (L.state === "growing") {
      const m = materialsNow(ctx), afford = m && L.label === "Hatch now" && (L.prices[0] ?? 0) <= m.s;
      if (pay && afford && !out.paid) { ctx.press("confirm", "Hatch now"); if (has(ctx, "panelHeader", /./)) ctx.press("confirm", "Hatch now (the panel)"); out.paid = true; continue; }
      const mins = wordsOf(ctx, "readyIn").map((t) => +(t.match(/(\d+)/)?.[1])).find(Number.isFinite) ?? 20;
      ctx.wait(mins); continue;
    }
    ctx.press("confirm", "Open the bud");
  }
  for (let i = 0; i < 4 && ctx.view().L.state === "meet"; i++) ctx.press("confirm", "meet and name");
  if (has(ctx, "keys", /^[A-Z]$/)) ctx.press("confirm", "keep the name");
  out.hatched = ctx.view().L.screen === "habitat" || ctx.view().L.screen === "vivarium";
  return out;
}

// the Probe's second tier (the Bench): Home → the Companion (docked) → ✓ the slot twice
export function tier2(ctx) {
  ctx.press("home", "Home");
  if (!focusOn(ctx, "companion")) return false;
  ctx.press("confirm", "the Bench");
  if (ctx.view().L.screen !== "bench") return false;
  if (!focusOn(ctx, "slot")) { ctx.press("back", "leave"); return false; }
  ctx.press("confirm", "fit the upgrade"); ctx.press("confirm", "fit it");
  return true;
}

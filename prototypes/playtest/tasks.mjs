// The bots' moves: small tasks over a context `ctx` (bot-game.mjs): ctx.press(key, why), ctx.view() (legal() and the bar's materials), ctx.wait(minutes), ctx.rng(), ctx.mark(milestone).
// A task presses keys, reads the screen after each, and stops when the screen says it is done or it cannot go on (it returns false); it never reads the rules' state. A refusal is found the
// way a player finds it: the screen did not change. The screens are the ones on station-gate: Pods' inventory and reading room, Create, the Incubator, Habitat (greet, read, Cross, the door),
// the Cross screen, the Sitting.
const OPP = { up: "down", down: "up", left: "right", right: "left" };
const wordsOf = (ctx, region) => ctx.view().o.words.filter((w) => w.region === region).map((w) => w.text);
const has = (ctx, region, re) => wordsOf(ctx, region).some((t) => re.test(t));
const screenOf = (ctx) => ctx.view().L.screen;

// walk the ring to a target id by the pad. The ring is a graph the bot learns as it goes (never the rules' graph): each press shows where the ring went; the next untried key of the nearest
// place is tried, walking known steps to get there. A 2D ring (the Vivarium's wall, Habitat's modules) is not a line, so reading order is no guide.
export function focusOn(ctx, id, max = 40) {
  const KEYS = ["right", "down", "left", "up"], edges = new Map();   // place -> { key: place }
  let cur = ctx.view().L.focus, used = 0;
  if (cur === id) return true;
  const step = (k) => { const from = cur; ctx.press(k, "toward " + id); used++; cur = ctx.view().L.focus; const e = edges.get(from) ?? {}; e[k] = cur; edges.set(from, e); return cur; };
  const nearestUntried = () => {   // BFS over the known steps from cur: the path to the first place with an untried key
    const seen = new Map([[cur, []]]), q = [cur];
    while (q.length) {
      const n = q.shift(), e = edges.get(n) ?? {};
      const k = KEYS.find((x) => e[x] === undefined); if (k) return { path: seen.get(n), key: k };
      for (const x of KEYS) { const d = e[x]; if (d && !seen.has(d)) { seen.set(d, [...seen.get(n), x]); q.push(d); } }
    }
    return null;
  };
  while (used < max) {
    const t = nearestUntried(); if (!t) return false;
    for (const k of t.path) { if (used >= max) return false; step(k); }
    step(t.key);
    if (cur === id) return true;
  }
  return false;
}

// Along a screen's reading order (the targets are listed in it): the pad's first key toward the target, never the whole ring. `only` keeps the walk on places it matches: on Pods' inventory a move
// onto the verb line only PREVIEWS the verb (dead ends B6: ✓ or ▼ chooses it), but ▼ off a previewed verb would turn it on and grow, freshen or let go the pods the bot then presses ✓ on, so the bot steps back from any place that is not a card.
// Habitat's modules sit in reading order too, and walking the whole ring there takes ten times the keys.
export function focusLine(ctx, id, { only = null, max = 14 } = {}) {
  const seen = new Set(); let cur = ctx.view().L.focus; seen.add(cur);
  for (let n = 0; n < max && cur !== id; n++) {
    const T = ctx.view().L.targets, forward = T.indexOf(id) >= T.indexOf(cur);
    let moved = false;
    for (const k of forward ? ["right", "down", "left", "up"] : ["left", "up", "right", "down"]) {
      ctx.press(k, "toward " + id);
      const now = ctx.view().L.focus;
      if (now === cur) continue;
      if (seen.has(now) || (only && !only.test(now))) { ctx.press(OPP[k], "back off"); continue; }
      seen.add(now); cur = now; moved = true; break;
    }
    if (!moved) return false;
  }
  return cur === id;
}
export const focusCard = (ctx, id) => focusLine(ctx, id, { only: /^card\./ });

// Home: a room key wakes an idle Station (the first press only wakes) and goes there
export function toHome(ctx) {
  if (screenOf(ctx) === "home") return true;   // a room key on Home rests the Station
  ctx.press("home", "Home");
  if (screenOf(ctx) === "idle") ctx.press("home", "wake, Home");
  if (screenOf(ctx) !== "home") ctx.press("home", "Home");
  return screenOf(ctx) === "home";
}

// the Bay: ✓ Open now, then ✓ Skip the opening, until the crate is in (it leaves for Pods)
export function openBay(ctx) {
  for (let i = 0; i < 6 && screenOf(ctx) === "cargo"; i++) ctx.press("confirm", "open the crate");
  return screenOf(ctx) !== "cargo";
}

export const materialsNow = (ctx) => ctx.view().mat;
const dataFor = (ctx, price) => { const m = materialsNow(ctx); return !!m && m.d >= price; };

// ---- Pods ----
// The inventory: the Research key opens it (or the reading room on the pod on the bench: ← goes to the inventory); the cards are the pods in the case
export function podsInventory(ctx) {
  toHome(ctx);
  ctx.press("research", "Pods");
  if (screenOf(ctx) === "pods" && ctx.view().L.state === "read") ctx.press("back", "to the inventory");
  const L = ctx.view().L; return L.screen === "pods" && L.state === "inventory";
}
export const cardsOf = (ctx) => ctx.view().L.targets.filter((t) => t.startsWith("card."));

// The reading room on the pod on the bench: ✓ Identify (Data) if sealed, then each chapter's lane: ✓ Open, ✓ Read (Data), ◀ to the rail, ▶ to the next lane. Returns the chapters read.
export function readRoom(ctx, { identify = true, read = true } = {}) {
  let n = 0, L = ctx.view().L;
  if (L.screen !== "pods" || L.state !== "read") return 0;
  if (/^Identify/.test(L.label ?? "")) {
    if (!identify || !dataFor(ctx, L.prices[0] ?? 1)) return 0;
    ctx.press("confirm", "identify"); ctx.mark("identified");
    if (/^Identify/.test(ctx.view().L.label ?? "")) return 0;
  }
  if (!read) return 0;
  const head = () => wordsOf(ctx, "read.head")[0] ?? "";
  for (let lane = 0; lane < 9; lane++) {
    L = ctx.view().L;
    if (L.focus !== "rail") { ctx.press("left", "to the rail"); L = ctx.view().L; if (L.focus !== "rail") break; }
    const was = head();
    if (/^Open /.test(L.label ?? "")) {
      ctx.press("confirm", "open the chapter"); L = ctx.view().L;
      if (/^Read /.test(L.label ?? "") && dataFor(ctx, L.prices[0] ?? 1)) {
        ctx.press("confirm", "read"); n++; ctx.mark("read");
        if (ctx.view().L.focus === "hold") ctx.press("confirm", "end the read");
        if (ctx.view().L.focus === "hold") ctx.press("confirm", "end the read");
        if (ctx.view().L.focus === "hold") ctx.press("confirm", "end the moment");   // the stamp's one-time moment
      }
      if (ctx.view().L.focus !== "rail") ctx.press("left", "to the rail");
    }
    ctx.press("right", "next chapter");
    if (head() === was) break;
  }
  return n;
}

// Every pod in the case in turn: ✓ the card (Read), the room, ← to the inventory
const NUM = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
// the card's own words: "four of six chapters read" (all read when the two are equal), "not read yet"
const fullyRead = (ctx) => { const t = wordsOf(ctx, "detail.right")[0] ?? "", m = t.match(/(\w+) of (\w+) chapters read/); return !!m && (NUM[m[1]] ?? +m[1]) >= (NUM[m[2]] ?? +m[2]); };
export function readAllPods(ctx, { identify = true, read = true, max = 8 } = {}) {
  if (read && !identify && !dataFor(ctx, 1)) return 0;   // nothing to read with
  if (!podsInventory(ctx)) return 0;
  let n = 0;
  const total = cardsOf(ctx).length;
  for (let i = 0; i < Math.min(total, max); i++) {
    if (ctx.view().L.state !== "inventory") break;
    if (!focusCard(ctx, "card." + i)) continue;
    if (ctx.view().L.targets.includes("verb.read") && /^(Grow|Freshen|Compare|Let go|Water)/.test(ctx.view().L.label ?? "")) {   // the verb moved off Read on the way (▼ off a previewed verb turns it on): choose Read again with ✓
      if (!focusOn(ctx, "verb.read")) continue;
      ctx.press("confirm", "the Read verb");
      if (!focusCard(ctx, "card." + i)) continue;
    }
    if (!identify && fullyRead(ctx)) continue;
    if (identify && !read && !/^sealed/.test(wordsOf(ctx, "detail.left")[0] ?? "")) continue;   // an identify pass enters only the sealed pods ("sealed · identify" on the card)
    ctx.press("confirm", "read this pod");
    if (ctx.view().L.state !== "read") continue;
    n += readRoom(ctx, { identify, read });
    ctx.press("back", "to the inventory");
  }
  return n;
}

// ---- Create, the Incubator ----
// Grow a pod: the Incubator, ✓ Choose a pod (the inventory under Grow), ✓ the first card that can, Create ✓ Incubate, the panel's ✓ Incubate. True when the bud is growing.
export function growOne(ctx) {
  toHome(ctx);
  if (!focusOn(ctx, "incubator")) return false;
  ctx.press("confirm", "the Incubator");
  if (screenOf(ctx) !== "incubator" || ctx.view().L.state !== "empty") return false;
  ctx.press("confirm", "Choose a pod");
  if (ctx.view().L.overlay === "panel") { ctx.state.full = true; ctx.press("back", "the full panel: not now"); return false; }   // the Vivarium is full: Choose a pod opens the full panel (B2); the policy adds the room
  if (screenOf(ctx) !== "pods") return false;   // a settling room or no pods at home: Choose a pod plays its plate (B1), nothing to grow yet
  if (ctx.view().L.label !== "Grow it") { ctx.press("back", "no pod to grow"); return false; }
  ctx.press("confirm", "grow this pod");
  if (screenOf(ctx) !== "create") { if (screenOf(ctx) === "pods") ctx.press("back", "refused"); return false; }
  ctx.press("confirm", "incubate");
  if (has(ctx, "panelHeader", /Incubate/)) ctx.press("confirm", "incubate (the panel)");
  if (screenOf(ctx) === "incubator") { ctx.mark("grown"); return true; }
  for (let i = 0; i < 3 && screenOf(ctx) === "create"; i++) ctx.press("back", "refused: back");
  return false;
}
export const incubatorState = (ctx) => { toHome(ctx); if (!focusOn(ctx, "incubator")) return null; ctx.press("confirm", "the Incubator"); return screenOf(ctx) === "incubator" ? ctx.view().L.state : null; };

// The Incubator open: wait out a growing bud (free) or pay Hatch now, ✓ Open when ready; the meet and the name. Returns { hatched, paid }.
export function hatch(ctx, { pay = false } = {}) {
  const out = { hatched: false, paid: false };
  if (screenOf(ctx) !== "incubator" && incubatorState(ctx) == null) return out;
  for (let i = 0; i < 8 && screenOf(ctx) === "incubator"; i++) {
    const L = ctx.view().L;
    if (L.state === "empty") return out;
    if (L.state === "growing") {
      const m = materialsNow(ctx), afford = m && L.label === "Open now" && (L.prices[0] ?? 0) <= m.s;
      if ((typeof pay === "function" ? pay(ctx) : pay) && afford && !out.paid) { ctx.press("confirm", "Open now"); if (has(ctx, "panelHeader", /./)) ctx.press("confirm", "Open now (the panel)"); out.paid = true; continue; }
      const mins = wordsOf(ctx, "readyIn").map((t) => +(t.match(/(\d+)/)?.[1])).find(Number.isFinite) ?? 20;
      ctx.wait(mins); if (screenOf(ctx) === "idle") ctx.press("home", "wake"); if (screenOf(ctx) === "home") { focusOn(ctx, "incubator"); ctx.press("confirm", "the Incubator"); }
      continue;
    }
    ctx.press("confirm", "Open the bud");
    if (ctx.view().L.overlay === "panel") { ctx.state.full = true; ctx.press("back", "the full panel: not now"); break; }   // no place: the full panel opens (B2); the bot closes it and the policy adds the room
  }
  if (screenOf(ctx) === "habitat") { meetAndName(ctx); out.hatched = true; ctx.mark("hatched"); ctx.state.hatchedN = (ctx.state.hatchedN ?? 0) + 1; }
  return out;
}
// The meet: ✓ the resident opens the namer (Done is lit), ✓ keeps the name
export function meetAndName(ctx) {
  for (let i = 0; i < 4 && screenOf(ctx) === "habitat" && (ctx.view().L.state === "meet" || has(ctx, "keys", /^[A-Z]$/) || i === 0); i++) {
    if (has(ctx, "keys", /^[A-Z]$/)) { ctx.press("confirm", "keep the name"); break; }
    ctx.press("confirm", "meet");
  }
}

// ---- Habitat: care, Cross, out with the Companion ----
// the Vivarium's mibis: the resident ids
export function residents(ctx) { return ctx.view().L.targets.filter((t) => t.startsWith("resident.") || t.startsWith("tile.")); }
// Habitat on the mibi up close; from Home the Vivarium's whole, ✓ a resident
export function toWall(ctx) {
  if (screenOf(ctx) === "vivarium") return true;
  if (screenOf(ctx) === "habitat") ctx.press("back", "the Vivarium");
  else { toHome(ctx); ctx.press("habitat", "the Vivarium"); }   // the Habitat room key: the whole
  return screenOf(ctx) === "vivarium" && ctx.view().L.state !== "none";   // an empty Vivarium (state none) has no mibi to open
}
// the mibis on the Vivarium's wall: its cells
export const wallCells = (ctx) => (toWall(ctx) ? ctx.view().L.targets.filter((t) => t.startsWith("cell.")) : []);
// the mibi at cell number idx (negative: from the newest) up close
export function toHabitat(ctx, idx = 0) {
  const cells = wallCells(ctx); if (!cells.length) return false;
  const k = idx < 0 ? cells.length + idx : idx; if (k < 0 || k >= cells.length) return false;
  if (!focusLine(ctx, cells[k], { only: /^cell\./ })) return false;
  for (let i = 0; i < 2 && screenOf(ctx) === "vivarium"; i++) ctx.press("confirm", "a mibi up close");
  return screenOf(ctx) === "habitat";
}
// The Vivarium is full: ✓ Add a room on the wall (a room costs Energy: ⚡4, 8, 12), the panel's ✓. The room settles for a world turn before it takes a mibi. True when the wall's room count went up (the screen's chip row grew).
export function addRoom(ctx) {
  if (!toWall(ctx) || !ctx.view().L.targets.includes("rail.add")) return false;
  
  // the wall's rail is on its left: ◀ from a mibi lands on the rail, ▼ walks down it (All, the rooms, Tucked away, Add a room)
  for (let i = 0; i < 10 && !/^rail\./.test(ctx.view().L.focus ?? ""); i++) ctx.press("left", "to the rail");
  for (let i = 0; i < 8 && ctx.view().L.focus !== "rail.add"; i++) ctx.press("down", "down the rail");
  if (ctx.view().L.focus !== "rail.add") return false;
  ctx.press("confirm", "Add a room");
  if (ctx.view().L.overlay === "panel") ctx.press("confirm", "Add a room (the panel)");
  if (ctx.view().L.overlay === "panel") { ctx.press("back", "no room"); return false; }
  return true;
}
// Care at Habitat (the Station's part: the Companion does the Tends): greet the resident, read its chapters while Data lasts
export function careHere(ctx, { read = true } = {}) {
  if (screenOf(ctx) !== "habitat") return false;
  if (focusLine(ctx, "resident")) { ctx.press("confirm", "greet"); ctx.mark("care"); }
  const [a, b] = (wordsOf(ctx, "chapters")[0]?.match(/(\d+) of (\d+)/) ?? []).slice(1).map(Number);   // "Chapters · 7 of 7 read": nothing to read when all are
  if (read && !(a != null && a === b)) for (const t of ctx.view().L.targets.filter((x) => x.startsWith("plate."))) { if (!dataFor(ctx, 1)) break; if (focusLine(ctx, t)) ctx.press("confirm", "read its chapter"); }
  return true;
}
// The Cross: on a mibi up close, ✓ Cross (when it is on the ring), the Cross screen: ✓ Cross them. True when the bud is growing from it.
export function crossHere(ctx) {
  if (screenOf(ctx) !== "habitat" || !ctx.view().L.targets.includes("cross")) return false;
  if (!focusLine(ctx, "cross")) return false;
  ctx.press("confirm", "Cross");
  if (screenOf(ctx) !== "cross") return false;
  ctx.mark("crossOpened");
  const m = materialsNow(ctx), pr = ctx.view().L.prices;
  if (m && pr.length >= 2 && (m.e < pr[0] || m.s < pr[1])) { ctx.state.saving = true; ctx.press("back", "cannot pay yet: keep the Essence"); return false; }
  ctx.press("confirm", "Cross them");
  if (screenOf(ctx) === "incubator") { ctx.mark("crossed"); return true; }
  if (ctx.view().L.overlay === "panel") { ctx.state.full = true; ctx.press("back", "the full panel: not now"); }   // refused: no free place for the child; the full panel opens (B2)
  ctx.press("back", "no cross"); return false;
}
// Out with the Companion: on a mibi up close, ✓ the door (Take it with the Companion). True when the screen answered it.
export function takeOut(ctx) {
  if (screenOf(ctx) !== "habitat" || !ctx.view().L.targets.includes("door")) return false;
  if (!focusLine(ctx, "door")) return false;
  const was = ctx.view().o.words.map((w) => w.text).join("|");
  ctx.press("confirm", "the door");
  return ctx.view().o.words.map((w) => w.text).join("|") !== was;
}

// ---- the Sitting ----
// From Habitat: ✓ Portrait, then the steps (pose, place, confirm: ✓, ✓, ✓, and a second ✓ to begin)
export function sit(ctx) {
  if (screenOf(ctx) !== "habitat" || !ctx.view().L.targets.includes("portrait")) return false;
  if (!focusLine(ctx, "portrait")) return false;
  ctx.press("confirm", "Portrait");
  if (screenOf(ctx) !== "sitting") return false;
  ctx.mark("sittingOpened");
  for (let i = 0; i < 6 && screenOf(ctx) === "sitting"; i++) ctx.press("confirm", "the sitting's next step");
  if (screenOf(ctx) !== "sitting") ctx.mark("sat");
  else ctx.press("back", "leave the sitting");
  return true;
}

// The Probe's second tier (the Bench): Home → the Companion (docked) → ✓ the slot twice
export function tier2(ctx) {
  toHome(ctx);
  if (!focusOn(ctx, "companion")) return false;
  ctx.press("confirm", "the Bench");
  if (screenOf(ctx) !== "bench") return false;
  if (!focusOn(ctx, "slot")) { ctx.press("back", "leave"); return false; }
  ctx.press("confirm", "fit the upgrade"); ctx.press("confirm", "fit it");
  return true;
}

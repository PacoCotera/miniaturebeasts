// The nursery's intents (station step 5): the pad moves the ring over the capsules and the shelf's rows (and changes the order on a row), ✓ looks closer at a row, hatches a ready capsule; a pod's page has one act, Grow it, and
// letting the pod go. ← goes back the way the player came. The rules are state.mjs's (growPod, openBud, returnPod) and nursery.mjs's; the keys arrive as `step:<dir>`, `confirm` and `back` (pods.json focus.page).
import * as S from "../state.mjs";
import * as N from "../nursery.mjs";
import { ringOf, firstFor } from "../views/nursery-props.mjs";
import { fill } from "../views/words.mjs";
import { intent as incubatorIntent } from "./incubator.mjs";
import { backToHolds } from "./holds.mjs";

const pods = (h) => h.ui.pods;
const strings = (h) => h.specs.pods.strings;
const rowsOf = (h) => N.shelfRows(h.st, pods(h).order ?? "newest", pods(h).only?.keys);
const visible = (h) => h.specs.pods.regions.page.nursery.shelf.visible;
const MINUTES = (Sg, n) => (n >= 60 ? Sg.hour : n <= 1 ? Sg.minOne : fill(Sg.min, { n }));

// The ways in: the blue key, Home's pod modules, the walk's arrival, Create's and the Incubator's old doors. `from` is the screen ← returns to (Home is the Vivarium room); `pod` opens that pod's row, `last` puts the ring on the last row.
export function openNursery(h, opts = {}) {
  const p = pods(h), from = opts.from ?? (h.ui.screen !== "pods" ? h.ui.screen : p.from ?? "home");
  p.page = null; p.cmp = null; p.view = "nursery"; p.only = null; p.from = from === "pods" ? "home" : from; p.podKey = null; p.act = "grow"; p.askGo = false; p.order = p.order ?? "newest";
  const rows = rowsOf(h), k = opts.pod ? rows.findIndex((r) => r.ids.includes(opts.pod)) : -1;
  p.ring = k >= 0 ? { z: "shelf", i: k } : opts.last && rows.length ? { z: "shelf", i: rows.length - 1 } : undefined; p.first = 0;
  h.goto("pods");
  if (opts.pod && k >= 0 && opts.open) openPod(h, rows[k]);
}
function openPod(h, row) { const p = pods(h); p.view = "pod"; p.podKey = row.key; p.act = "grow"; p.askGo = false; }
// A pod's page on a pod (the Incubator's old Choose a pod, Create's door): the nursery, the ring on its row, its page open.
export const openPodPage = (h, podId, from) => openNursery(h, { from, pod: podId, open: true });

export function nurseryIntent(h, target, verb) {
  const p = pods(h), rows = rowsOf(h), caps = N.capsulesOf(h.st, h.settings, h.now()), ring = ringOf(h.st, p, rows), set = (r) => { p.ring = r; p.first = firstFor(r, p.first, visible(h), rows.length); };
  if (verb === "back" && p.only) return backToHolds(h);   // "Show the pods": ← returns to the board, on the same row
  if (verb === "back") { const to = p.from && p.from !== "pods" ? p.from : "home"; p.view = "nursery"; h.goto(to === "habitat" || to === "create" || to === "incubator" || to === "store" ? "home" : to); return; }   // ← the way the player came
  if (verb && verb.startsWith("step:")) {
    const d = verb.slice(5);
    if (ring.z === "caps") {
      if (d === "left") set({ z: "caps", i: Math.max(0, ring.i - 1) }); else if (d === "right") set({ z: "caps", i: Math.min(S.CAPSULES - 1, ring.i + 1) });
      else if (d === "down" && rows.length) { p.lastCap = ring.i; set({ z: "shelf", i: Math.max(0, Math.min(rows.length - 1, p.firstShown ?? p.first ?? 0)) }); }
    } else {
      if (d === "down") set({ z: "shelf", i: Math.min(rows.length - 1, ring.i + 1) });
      else if (d === "up") { if (ring.i > 0) set({ z: "shelf", i: ring.i - 1 }); else set({ z: "caps", i: p.lastCap ?? 0 }); }
      else if ((d === "left" || d === "right") && rows.length > 1) { const o = N.ORDERS, k = o.indexOf(p.order ?? "newest"); p.order = o[(k + (d === "right" ? 1 : o.length - 1)) % o.length]; p.first = 0; p.ring = { z: "shelf", i: 0 }; }   // the pad changes the order: newest first, by parents
    }
    return;
  }
  if (verb !== "confirm") return;
  const Sg = strings(h).nursery;
  if (ring.z === "shelf") { const row = rows[ring.i]; if (row) openPod(h, row); return; }
  const c = caps[ring.i];
  if (c.state === "ready") { S.setWorking(h.st, ring.i); h.goto("incubator"); return incubatorIntent(h, "room", "confirm"); }   // the hatch plays as it does today, on this capsule (until step 7)
  h.say(c.state === "growing" ? fill(Sg.plateGrowing, { n: Math.max(1, c.left) }) : c.state === "young" ? Sg.plateYoung : Sg.plateFree);
}

export function podIntent(h, target, verb) {
  const p = pods(h), st = h.st, Sg = strings(h).podpage, rows = rowsOf(h), row = rows.find((r) => r.key === p.podKey);
  const back = () => { const k = rows.findIndex((r) => r.key === p.podKey); p.view = "nursery"; p.askGo = false; p.ring = k >= 0 ? { z: "shelf", i: k } : undefined; };
  if (!row) { back(); return; }
  if (verb === "back") return back();
  if (verb === "step:up") { p.act = "grow"; p.askGo = false; return; }
  if (verb === "step:down") { p.act = "letgo"; return; }
  if (verb !== "confirm") return;
  const pod = S.podById(st, row.ids[row.ids.length - 1]); if (!pod) return back();
  if ((p.act ?? "grow") === "grow") {
    const r = S.growPod(st, pod, h.settings, h.now()); if (!r.ok) { h.say(Sg.noCapsule); return; }
    h.save(); const left = rowsOf(h); p.view = "nursery"; p.askGo = false; p.ring = { z: "caps", i: r.capsule }; p.first = 0; void left;
    h.say(fill(Sg.grew, { when: MINUTES(Sg, N.capsuleOf(h.st, r.capsule, h.settings, h.now()).left) }));   // the capsule's own wall-clock minutes left (one number, as its label and plate show), not the bud's full-pace minutes return;
  }
  if (!p.askGo) { p.askGo = true; h.say(Sg.letGoAsk); return; }   // letting go is two presses of ✓ (the page's act; the old held ✓ lived on the rack)
  S.returnPod(st, pod); h.save(); h.say(Sg.letGone);
  if (!rowsOf(h).some((r) => r.key === p.podKey)) { p.view = "nursery"; p.askGo = false; p.ring = undefined; p.first = 0; } else p.askGo = false;
}

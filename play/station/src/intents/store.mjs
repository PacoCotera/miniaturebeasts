// The store screen's intents (store.json keys; the pods-reading scheme §2 and §3): the bench of the pod that reads while the Companion is out. On the bench ◀ ▶ on the Put-in panel change the amount by one and ✓ puts it in (S.deposit, never past what is
// left to read); on the bar ◀ ▶ walk the chapters and ✓ opens a read one's page. The teaser's ✓ starts the show of the chapters read while the Companion was out, one page each; ← skips it to the bench. The pad is the face's (focus.graph); the host keeps the ring (`focus`).
import * as S from "../state.mjs";
import { putMax, storeParts } from "../views/store-props.mjs";

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const store = (h) => h.ui.store;

// The ways in: from the reading room on an unread chapter (from "room"), or from Home's notice (from "home", reveal: the chapters read while the Companion was out). The first chapter ever is free and reads now, in front of the player: its page opens.
export function openStore(h, from = "room", opts = {}) {
  const q = S.benchPod(h.st);
  if (!q || !q.idd) { if (opts.reveal) { S.takeReadHome(h.st); h.save(); } return false; }
  const u = h.ui.store = { view: "bench", from, f: null, amount: undefined, i: undefined, chapter: null, show: [], teaser: null };
  if (!h.st.readEver) { const r = S.tickReading(h.st, 0, h.settings); if (r.read.length) { h.save(); u.view = "chapter"; u.chapter = r.read[0].id; } }
  else if (opts.reveal) {
    const chapters = S.takeReadHome(h.st).filter((f) => f.pod === q.id).flatMap((f) => f.chapters); h.save();
    if (chapters.length) { u.view = "teaser"; u.teaser = { chapters }; u.show = chapters.map((c) => c.id); }
  }
  h.goto("store"); return true;
}
// The ring moved (the face says `put`, `bar` or `go`): the store keeps it.
export function focus(h, target) { if (store(h)) store(h).f = target; }

function toBench(h) { const u = store(h); u.view = "bench"; u.show = []; u.teaser = null; u.chapter = null; u.f = null; u.amount = undefined; }
function leave(h) { const u = store(h); h.goto(u && u.from === "home" ? "home" : "pods"); }

// `target`: put | bar | go; the chapter pages have no target.
export function intent(h, target, verb) {
  const u = store(h), q = S.benchPod(h.st); if (!u || !q) { if (verb === "back") h.goto("home"); return; }
  if (u.view === "chapter") {
    if (verb === "back") return toBench(h);
    if (verb === "confirm") { if (u.show.length) u.chapter = u.show.shift(); else toBench(h); }
    return;
  }
  if (u.view === "teaser") {
    if (verb === "back") return toBench(h);
    if (verb === "confirm") { u.view = "chapter"; u.chapter = u.show.shift(); }
    return;
  }
  if (verb === "back") return leave(h);
  if (target === "put") {
    const max = putMax(h.st, q, h.settings); if (!max) return;
    const now = clamp(u.amount ?? max, 1, max);
    if (verb === "step:left") u.amount = clamp(now - 1, 1, max);
    else if (verb === "step:right") u.amount = clamp(now + 1, 1, max);
    else if (verb === "confirm") { const r = S.deposit(h.st, q, now, h.settings); if (r.ok) { h.play({ kind: "tick", target: "d", ms: 300 }); h.save(); u.amount = undefined; if (!S.storeLeft(h.st, q, h.settings)) u.f = "bar"; } }
    return;
  }
  if (target === "bar") {
    const parts = storeParts(h.st, q, h.settings), now = clamp(u.i ?? Math.max(0, parts.findIndex((c) => !c.read)), 0, parts.length - 1);
    if (verb === "step:left") u.i = clamp(now - 1, 0, parts.length - 1);
    else if (verb === "step:right") u.i = clamp(now + 1, 0, parts.length - 1);
    else if (verb === "confirm" && parts[now] && parts[now].read) { u.i = now; u.view = "chapter"; u.chapter = parts[now].id; u.show = []; }
  }
}

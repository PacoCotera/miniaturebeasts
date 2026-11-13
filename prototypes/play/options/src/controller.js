// The play note's one state and its actions (design: play-notes-design-4 §2). The panel, the page's bar and the shell all read it: subscribe / getState.
// host (the shell): getCanvas() the played device's #screen, context() -> details to send, source() -> noteFrom, say(key, vars), flash() the brief outline round the screen.
import * as idb from "idb-keyval";
import { LIMITS, canAdd, isClip, isEmpty, createQueue } from "../../src/notes.mjs";
import { shot, createTap, canClip, canRecordAny } from "../../src/clip.mjs";

let uid = 0;
const urlOf = (b) => URL.createObjectURL(b);

export function createController(host) {
  const queue = createQueue({ get: idb.get, set: idb.set, del: idb.del, keys: idb.keys });
  const tap = createTap(() => host.getCanvas());
  let st = { open: false, items: [], text: "", ctx: null, from: "owner", at: 0, recording: false, recMs: 0, cut: null, busy: "", full: "", last: !canClip() ? "off" : "on" };
  const subs = new Set();
  const emit = (p) => { st = { ...st, ...p }; for (const f of subs) f(); };
  let recTimer = 0, held = null;   // held: the whole-screen shot taken when Options opened
  const shotOf = async (kind) => { const c = host.getCanvas(); if (!c) return null; const blob = await shot(c); return { id: ++uid, kind, blob, url: urlOf(blob), w: c.width, h: c.height }; };
  const drop = (it) => { if (it && it.url) URL.revokeObjectURL(it.url); };
  const has = () => st.items.length > 0 || st.text.trim() !== "";
  const api = {
    subscribe: (f) => { subs.add(f); return () => subs.delete(f); },
    getState: () => st,
    get hasNote() { return has() || st.open; },
    tapStart: () => tap.start(), tapStop: () => tap.stop(),
    canClip, canRecordAny,
    // Options opened: take the played device's screen now and hold it (it is what the note starts with)
    async hold() { try { held = await shotOf("whole"); } catch { held = null; } },
    async newNote() {   // New note: the held screen goes in first; an open note carries on
      if (!has()) { for (const it of st.items) drop(it); emit({ items: held ? [held] : [], text: "", at: Date.now(), from: host.source() }); held = null; }
      else if (held) { drop(held); held = null; }
      emit({ open: true, full: "" }); api.refreshContext();
    },
    async refreshContext() { try { emit({ ctx: await host.context() }); } catch { /* the details wait */ } },
    open() { emit({ open: true, full: "" }); api.refreshContext(); },
    keepPlaying() { emit({ open: false }); },
    setText(text) { emit({ text }); },
    async addWhole({ quiet = false } = {}) {   // + Whole screen; with the shortcut or the bar it never opens the note
      const why = canAdd(st.items, "whole"); if (why) { emit({ full: why }); host.say(why); return false; }
      const it = await shotOf("whole"); if (!it) return false;
      if (!st.at) emit({ at: Date.now(), from: host.source() });
      emit({ items: [...st.items, it], full: "" });
      if (quiet) { host.flash(); host.say("bar.whole.added", { n: st.items.length }); }
      return true;
    },
    // + Section: the shot first, then the section dialog (cut = { it, add: true })
    async addSection() {
      const why = canAdd(st.items, "section"); if (why) { emit({ full: why }); return; }
      const it = await shotOf("section"); if (it) emit({ cut: { it, add: true } });
    },
    cutItem(id) { const it = st.items.find((i) => i.id === id); if (it && !isClip(it)) emit({ cut: { it, add: false } }); },
    cancelCut() { const c = st.cut; if (c && c.add) emit({ items: [...st.items, { ...c.it, kind: "whole" }], cut: null }); else emit({ cut: null }); },   // nothing dragged: the whole screen stays
    async useSection(rect) {   // rect in the picture's own pixels, or null: keep it whole
      const c = st.cut; if (!c) return;
      if (!rect || rect.width < 2 || rect.height < 2) { api.cancelCut(); return; }
      const img = await createImageBitmap(c.it.blob);
      const cv = document.createElement("canvas"); cv.width = Math.round(rect.width); cv.height = Math.round(rect.height);
      cv.getContext("2d").drawImage(img, Math.round(rect.x), Math.round(rect.y), cv.width, cv.height, 0, 0, cv.width, cv.height);   // a whole-pixel crop, nothing else
      const blob = await new Promise((r) => cv.toBlob(r, "image/png")), n = { id: c.it.id, kind: "section", blob, url: urlOf(blob), w: cv.width, h: cv.height };
      if (c.add) emit({ items: [...st.items, n], cut: null });
      else { drop(c.it); emit({ items: st.items.map((i) => (i.id === n.id ? n : i)), cut: null }); }
    },
    async addLast() {
      const why = canAdd(st.items, "last"); if (why) { emit({ full: why }); return; }
      emit({ busy: "last" });
      try {
        const r = await tap.last();
        if (!r) { emit({ full: "note.add.lastMissing" }); return; }
        const w = canAdd(st.items, "last", r.blob.size); if (w) { emit({ full: w }); return; }
        emit({ items: [...st.items, { id: ++uid, kind: "last", blob: r.blob, url: urlOf(r.blob), ms: r.ms }], full: "" });
      } finally { emit({ busy: "" }); }
    },
    record() {   // Record a clip: the note closes so the game can be played; the strip shows the time and Stop
      const why = canAdd(st.items, "clip"); if (why) { emit({ full: why }); return false; }
      const ok = tap.record((r) => {
        clearInterval(recTimer); emit({ recording: false, recMs: 0 });
        if (r && !canAdd(st.items, "clip", r.blob.size)) emit({ items: [...st.items, { id: ++uid, kind: "clip", blob: r.blob, url: urlOf(r.blob), ms: r.ms }] });
      });
      if (!ok) { emit({ full: "note.add.lastMissing" }); return false; }
      if (!st.at) emit({ at: Date.now(), from: host.source() });
      emit({ open: false, recording: true, recMs: 0 }); recTimer = setInterval(() => emit({ recMs: tap.elapsed() }), 250);
      return true;
    },
    stopRecord() { tap.stopRecord(); },
    remove(id) { drop(st.items.find((i) => i.id === id)); emit({ items: st.items.filter((i) => i.id !== id), full: "" }); },
    discard() { for (const it of st.items) drop(it); emit({ open: false, items: [], text: "", at: 0, full: "", cut: null }); },
    async send() {
      const note = { items: st.items, text: st.text }; if (isEmpty(note)) return "empty";
      let ctx = st.ctx; try { ctx = await host.context(); } catch { /* the details from the open */ }
      emit({ busy: "send" });
      const source = host.source();
      await queue.add(note, source, { ...(ctx || {}), note: { at: st.at, pictures: st.items.filter((i) => !isClip(i)).length, clips: st.items.filter(isClip).length } });
      api.discard(); emit({ busy: "" });
      return api.flush();
    },
    // try the queue; say the outcome: sent, kept (offline) or kept (the route is not there yet)
    async flush(quiet = false) {   // quiet: a background retry says something only when a note went
      const left0 = (await queue.pending()).length; if (!left0) return "none";
      if (typeof navigator !== "undefined" && navigator.onLine === false) { if (!quiet) host.say("send.offline"); return "offline"; }
      if (!quiet) host.say("send.sending");
      const r = await queue.flush();
      if (r.sent > 0 || !quiet) host.say(r.left === 0 ? "send.sent" : "send.failed");
      return r.left === 0 ? "sent" : "kept";
    },
    pending: () => queue.pending(),
    LIMITS,
  };
  return api;
}

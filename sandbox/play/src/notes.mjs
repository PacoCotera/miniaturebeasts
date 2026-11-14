// Play notes, the logic: one note is some pictures and clips, an optional line, and the details sent with it.
// Pure and testable: no DOM, no React. The panel (play/options) draws it; the shell fills it with the played device's canvas.
//   noteFrom   the stored setting that names the sender ("owner" unless the agent testers set their persona); never a name, address or user-agent string
//   queue      unsent notes live in IndexedDB (idb-keyval) until the route has them; they go when the page is next online
//   ClipRing   the last 10 seconds of encoded video chunks, always starting at a key frame
export const NOTE_ROUTE = "/caddy-api/v1/notes";
export const LIMITS = Object.freeze({ shots: 8, clips: 2, bytes: 20 * 1024 * 1024, textChars: 4000, clipMs: 15000, ringMs: 10000 });
export const SOURCE_RE = /^[A-Za-z0-9][A-Za-z0-9 _-]{0,31}$/;
export const sourceOf = (o) => (o && typeof o.noteFrom === "string" && SOURCE_RE.test(o.noteFrom) ? o.noteFrom : "owner");

// the copywriter's words (note-strings.json, used as is): {name} fills in; {m:ss} takes milliseconds
export const fmt = (s, v = {}) => String(s).replace(/\{(\w+)(?::ss)?\}/g, (m, k) => (m.endsWith(":ss}") ? mss(v[k]) : v[k] ?? ""));
export function mss(ms) { const s = Math.max(0, Math.floor((ms || 0) / 1000)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }
export const clock = (t) => new Date(t).toLocaleTimeString("en-GB", { timeZone: "America/Mexico_City", hour: "2-digit", minute: "2-digit", hour12: false });   // the note's time, Mexico City

// "Sent with it" in plain words, from the details the page gathered (values only; nothing here names a person)
export function sentWithLine(ctx) {
  const c = ctx || {}, w = c.companion || {}, bits = [];
  if (c.build) bits.push("build " + c.build);
  if (c.slot) bits.push("Companion " + c.slot);
  if (w.seed != null) bits.push("world " + w.seed);
  if (w.place) bits.push(w.place);
  if (w.turn != null) bits.push("world turn " + w.turn);
  if (w.expedition) bits.push("expedition " + w.expedition);
  if (c.layout) bits.push((c.layout.phone ? "phone " : "laptop ") + c.layout.w + " × " + c.layout.h);
  if (c.device) bits.push("played: " + c.device);
  return bits.join(" · ");
}

// a note: { items: [{ id, kind: "whole"|"section"|"last"|"clip", blob, w?, h?, ms? }], text }
export const isClip = (it) => it.kind === "last" || it.kind === "clip";
export const counts = (items) => ({ shots: items.filter((i) => !isClip(i)).length, clips: items.filter(isClip).length, bytes: items.reduce((n, i) => n + (i.blob ? i.blob.size : 0), 0) });
// can one more item of this kind join? -> null, or the copy key that says why not
export function canAdd(items, kind, size = 0) {
  const c = counts(items), clip = kind === "last" || kind === "clip";
  if (clip ? c.clips >= LIMITS.clips : c.shots >= LIMITS.shots) return clip ? "note.full.clips" : "note.full.pictures";
  if (c.bytes + size > LIMITS.bytes) return "note.full.size";
  return null;
}
export const overSize = (items) => counts(items).bytes > LIMITS.bytes;
export const isEmpty = (note) => !note.items.length && !String(note.text || "").trim();

// the multipart body the route takes: text, source, context (JSON), shot parts and clip parts; the route accepts only these
export function toFormData(note, source, context, FD = FormData) {
  const fd = new FD();
  fd.append("text", String(note.text || "").slice(0, LIMITS.textChars));
  fd.append("source", source);
  fd.append("context", JSON.stringify(context || {}));
  let s = 0, c = 0;
  for (const it of note.items) {
    if (isClip(it)) { if (++c > LIMITS.clips) continue; fd.append("clip", it.blob, "clip-" + c + (it.blob.type === "video/webm" ? ".webm" : ".mp4")); }
    else { if (++s > LIMITS.shots) continue; fd.append("shot", it.blob, "shot-" + s + ".png"); }
  }
  return fd;
}

// ---- the offline queue: a store with get/set/del/keys (idb-keyval's own, or a Map in the tests) ----
// a queued note keeps its parts as Blobs (IndexedDB holds them) and its context; nothing in it names a person
export function createQueue(store, { fetchFn = (...a) => fetch(...a), route = NOTE_ROUTE, now = Date.now } = {}) {
  const KEY = "note:";
  const id = () => KEY + now().toString(36) + Math.random().toString(36).slice(2, 8);
  let flushing = null;
  const api = {
    async add(note, source, context) { const k = id(); await store.set(k, { at: now(), source, context, text: String(note.text || ""), items: note.items.map(({ kind, blob, w, h, ms }) => ({ kind, blob, w, h, ms })) }); return k; },
    async pending() { return (await store.keys()).filter((k) => String(k).startsWith(KEY)).sort(); },
    // send one queued note: true when the route has it (or refuses it for good: 4xx other than a full day, so a bad note cannot block the rest)
    async sendOne(k) {
      const n = await store.get(k); if (!n) return "gone";
      let r; try { r = await fetchFn(route, { method: "POST", body: toFormData(n, n.source, n.context) }); } catch { return "offline"; }
      if (r.status === 201 || r.ok) { await store.del(k); return "sent"; }
      if (r.status === 429 || r.status >= 500) return "later";
      if (r.status === 404) return "later";   // the route is not installed yet: the note waits
      await store.del(k); return "refused";
    },
    // go through the queue in order; stop at the first "offline" or "later". Returns { sent, left }
    flush() {
      if (flushing) return flushing;
      flushing = (async () => { let sent = 0; for (const k of await api.pending()) { const r = await api.sendOne(k); if (r === "sent") sent++; else if (r === "offline" || r === "later") break; } return { sent, left: (await api.pending()).length }; })().finally(() => { flushing = null; });
      return flushing;
    },
  };
  return api;
}

// ---- the last 10 seconds: encoded chunks in a ring; what is kept always starts at a key frame ----
// push({ key, ts (ms), data }); snapshot() gives the chunks from the oldest key frame that is still inside the window
export class ClipRing {
  constructor(ms = LIMITS.ringMs) { this.ms = ms; this.chunks = []; }
  push(chunk) {
    this.chunks.push(chunk);
    const edge = chunk.ts - this.ms;
    // drop from the front while the SECOND key frame is still at or before the edge: the first key frame stays until a newer one covers the window
    for (;;) { const nk = this.chunks.findIndex((c, i) => i > 0 && c.key); if (nk < 0 || this.chunks[nk].ts > edge) break; this.chunks.splice(0, nk); }
  }
  snapshot() { return this.chunks.slice(); }
  clear() { this.chunks = []; }
  spanMs() { const c = this.chunks; return c.length ? c[c.length - 1].ts - c[0].ts : 0; }
}

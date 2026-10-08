// The timeline: presentation events (a wipe, a seal clearing, a ribbon) played against the timeline's own clock,
// each with its length and whether input is held while it plays (technical-architecture.md §5.2: an event is
// { kind, target, ms, hold }). No global timestamps: a screen asks the timeline how far an event has run.
export function createTimeline() {
  const T = { now: 0, events: [] };
  // Advance to `now` (the frame clock); finished events are dropped once they have been seen complete.
  T.tick = (now) => { T.now = now; T.events = T.events.filter((e) => !e.done); for (const e of T.events) if (now - e.start >= e.ms) e.done = true; return T; };
  // Play an event from now; a second event with the same kind and target replaces the first.
  T.play = (ev) => { T.events = T.events.filter((e) => !(e.kind === ev.kind && e.target === ev.target)); const e = { hold: false, target: null, ...ev, start: T.now, done: false }; T.events.push(e); return e; };
  // Progress of the event with this kind (and target, when given): 0 to 1 while it plays, 1 on the frame it ends, null when none.
  T.progress = (kind, target) => { const e = T.events.find((x) => x.kind === kind && (target === undefined || x.target === target)); if (!e) return null; return Math.min(1, (T.now - e.start) / Math.max(1, e.ms)); };
  // Milliseconds an event has run (null when none): for what shows only from a moment into it.
  T.elapsed = (kind, target) => { const e = T.events.find((x) => x.kind === kind && (target === undefined || x.target === target)); return e ? Math.min(e.ms, T.now - e.start) : null; };
  T.active = (kind) => T.events.filter((e) => (kind == null || e.kind === kind) && !e.done);
  // Input is held while any holding event plays.
  T.holding = () => T.events.some((e) => e.hold && !e.done && T.now - e.start < e.ms);
  // End every holding event now (the developer's unlock, the journey's).
  T.release = () => { for (const e of T.events) if (e.hold) { e.done = true; e.ms = 0; } return T; };
  T.clear = () => { T.events = []; return T; };
  return T;
}

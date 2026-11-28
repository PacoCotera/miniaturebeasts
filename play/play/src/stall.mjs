// The Station's silence is counted only while the page itself was awake (station-heartbeat-1).
// The Station frame, the Companion frame and the shell share one thread: while the Companion makes a world, or a browser holds a page back, no timer runs, so the Station's 5 s beat
// cannot be sent or heard, and the first tick after the stall would read the missed beats as a Station gone quiet. The shell's own tick (every TICK_MS) tells it when it was stalled:
// a gap longer than SLACK_MS is time the page was not listening, so that time is added to the moment the Station was last heard. A Station that truly stops still reads quiet
// after the same 15 s of listening time (caddy/face.mjs QUIET_MS); only the time the page was away is not held against it.
export const TICK_MS = 200, SLACK_MS = 1500;
export function createStall(tickMs = TICK_MS, slackMs = SLACK_MS) {
  let last = null;
  // heardAt: when the Station was last heard (ms); t: now. Returns heardAt moved on by the time the page was stalled, never past t.
  return { credit(heardAt, t) {
    const gap = last === null ? 0 : t - last; last = t;
    return heardAt !== null && heardAt !== undefined && gap > slackMs ? Math.min(t, heardAt + (gap - tickMs)) : heardAt;
  } };
}

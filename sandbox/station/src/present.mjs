// Presentation state of the frame that the rules do not own: the material counters counting up toward their value with
// a 240 ms tick behind a changed figure, and the turn's flash. It runs on the clock it is given (the timeline's), never a
// global timestamp, and it is the same object whether the frame is drawn by the screen layer or read in a test.
export function createFramePresenter() {
  const cnt = { e: null, d: null, s: null }; let turnShown = null, turnFlashAt = -1e9;
  const seen = { e: null, d: null, s: null }; let turnSeen = null;   // what the events were last sent for
  return {
    // The face's counterpart of step(): the events a change of the values sends (lvgl-switch.md §2.7), and nothing else; the props carry the end values. values: { e, d, s, turn } (turn as the rules hold it).
    //   a counter that rose counts up one unit every 70 ms with a 240 ms tick behind the figure: { kind: "tick", target: "e" | "d" | "s", from, to, ms: (to - from - 1) * 70 + 240 }
    //   a counter that fell, or the first values seen, send none; a turn that changed flashes for a second: { kind: "flash", target: "turn", ms: 1000 }
    events(values) {
      const out = [];
      for (const k of ["e", "d", "s"]) { const was = seen[k]; if (was != null && values[k] > was) out.push({ kind: "tick", target: k, from: was, to: values[k], ms: (values[k] - was - 1) * 70 + 240 }); seen[k] = values[k]; }
      if (turnSeen != null && values.turn !== turnSeen) out.push({ kind: "flash", target: "turn", ms: 1000 });
      turnSeen = values.turn; return out;
    },
    // values: { e, d, s, turn }; returns the props the top bar takes
    step(now, values, motion = true) {
      const flash = {}, shown = {};
      for (const k of ["e", "d", "s"]) {
        const c = cnt[k] || (cnt[k] = { v: values[k], last: 0, fl: -1e9 });
        if (values[k] < c.v || !motion) { if (values[k] > c.v) c.fl = now; c.v = values[k]; }
        else if (values[k] > c.v && now - c.last >= 70) { c.v++; c.last = now; c.fl = now; }
        shown[k] = c.v; flash[k] = now - c.fl < 240;
      }
      if (turnShown !== values.turn) { if (turnShown != null) turnFlashAt = now; turnShown = values.turn; }
      const turnFlash = now - turnFlashAt < 1000 && Math.floor((now - turnFlashAt) / 160) % 2 === 0;
      return { materials: shown, flash, turn: values.turn + 1, turnFlash };
    },
  };
}

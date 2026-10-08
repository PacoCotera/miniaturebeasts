// Presentation state of the frame that the rules do not own: the material counters counting up toward their value with
// a 240 ms tick behind a changed figure, and the turn's flash. It runs on the clock it is given (the timeline's), never a
// global timestamp, and it is the same object whether the frame is drawn by the screen layer or read in a test.
export function createFramePresenter() {
  const cnt = { e: null, d: null, s: null }; let turnShown = null, turnFlashAt = -1e9;
  return {
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

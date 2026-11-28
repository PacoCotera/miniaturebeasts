// How a session is stepped, the same in Node (engine.mjs) and in the page (the parity test imports this file beside the Station): a frame is the page's own tick() at the next 40 ms of
// the session clock (clock.mjs), the Library's warm runs 30 ms after it is asked on that clock (the page's setTimeout), and a key is the page's act(key) followed by the frames until the
// screen settles. No Node and no DOM here.
export const FRAME_MS = 40;
// The device's keys (station/index.html): the pad, ✓ (A) and ← (B), the four room keys, and the Caddy's Dock beside it. The Station has no menu key.
export const KEYS = ["up", "down", "left", "right", "confirm", "back", "home", "habitat", "research", "library", "dock"];
export const ALIAS = { a: "confirm", A: "confirm", b: "back", B: "back", vivarium: "habitat", ok: "confirm" };

// core: station/src/core.mjs; pixelClock: pixels.mjs clock; libraryWaiting: pictures.mjs libraryWaiting; time: the session clock (installClock's { advance, now })
export function createDriver({ core, pixelClock, libraryWaiting, time }) {
  const { CORE, hooks } = core, deferred = [];
  hooks.defer = (fn) => { const d = { at: time.now() + 30, fn }; deferred.push(d); return d; };
  let lastT = null, frames = 0;
  function frame() {
    const t = time.advance(FRAME_MS); pixelClock.now = t; const dt = lastT == null ? 0 : t - lastT; lastT = t;
    for (let i = 0; i < deferred.length;) if (deferred[i].at <= t) deferred.splice(i, 1)[0].fn(); else i++;
    core.tick(t, dt); frames++;
  }
  const hash = () => CORE.face.hash();
  const errors = () => [...CORE.faceErrors, ...CORE.renderErrors];
  // frames until the screen settles: no hold, no Library picture waiting to be made, and the same hash `still` frames running (at least `min` frames, at most `max`)
  function settle({ min = 3, still = 3, max = 250 } = {}) {
    let prev = null, same = 0, n = 0;
    for (; n < max; n++) {
      frame();
      const h = hash(); same = h === prev ? same + 1 : 0; prev = h;
      if (n + 1 >= min && same >= still - 1 && !CORE.host.holding() && !libraryWaiting().length) return { frames: n + 1, settled: true };
    }
    return { frames: n, settled: false };
  }
  // one key of the device: the page's act(key), then the frames until the screen settles
  function press(key) {
    const k = ALIAS[key] ?? key; if (!KEYS.includes(k)) throw new Error(`${key} is not a key of the device (${KEYS.join(", ")})`);
    const before = errors().length;
    core.act(k); const s = settle();
    return { key: k, hash: hash(), frames: s.frames, settled: s.settled, errors: errors().slice(before) };
  }
  // waiting: the clock and the rules' time move on by `minutes` with no key (fast-forward: no frame is drawn in between; the page left a minute idles, as a player would find it), then the screen settles
  function wait(minutes) { time.advance(Math.round(minutes * 60000)); return settle(); }
  return { frame, settle, press, wait, hash, errors, frames: () => frames };
}

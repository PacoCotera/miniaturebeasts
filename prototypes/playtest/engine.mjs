// The headless Station (the playtest plan's harness, step 2): the real Station modules and the real face, with no browser. boot() starts one session in this process: the shims
// (shims.mjs), the spec files and the masters as the page loads them, the face (native behind a pipe, as default, or the page's WebAssembly build in process), and the page's own loop
// (station/src/core.mjs: pump, syncProps, render, act), stepped on a virtual clock at 40 ms a frame. Nothing is re-implemented: a key is the page's act(key), a frame is its tick().
// What a player gets is the device's keys only; what the harness reads back is the screen: its hash, its PNG, its words (observe.mjs).
//   const s = await boot({ seed: 1, save });  s.keys(["right", "confirm"]);  s.hash();  s.render("a.png");  s.observeAssisted();  s.changed();
import { writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { install } from "./shims.mjs";
import { createDriver, KEYS } from "./driver.mjs";
import { encodePNG } from "../ui/png.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
export const FIXTURE = path.resolve(here, "../station/tests/fixtures/save-v8-schema1.json");
export { KEYS, FRAME_MS } from "./driver.mjs";

export async function boot({ seed = 1, save = null, settings = {}, names = null, face = "native", epoch, test = true, quiet = true } = {}) {
  const raw = save === "fixture" ? readFileSync(FIXTURE, "utf8") : save == null ? null : typeof save === "string" ? save : JSON.stringify(save);
  const dev = { light: "day", stationTime: "12:00", stationDate: "2026-10-17", ...settings };
  const shims = install({ seed, epoch, storage: { ...(raw ? { "mb-save-v8": raw } : {}), "mb-station-dev": JSON.stringify(dev) } });
  if (quiet) { const log = console.log; console.log = (...a) => { if (typeof a[0] === "string" && a[0].startsWith("# ")) return; log(...a); }; }   // the pictures' timing lines
  const real0 = globalThis.process.hrtime.bigint();
  const core = await import("../station/src/core.mjs"), game = await import("../station/src/game.mjs"), S = await import("../station/src/state.mjs"), { clock } = await import("../station/src/pixels.mjs"), { libraryWaiting } = await import("../station/src/pictures.mjs");
  const { CORE, hooks } = core, { G, UI, FX } = game;
  // the page's hooks: the Caddy is not here (no network) and nothing is presented; the driver keeps the Library's warm on the session clock
  const logs = [];
  Object.assign(hooks, { wake: () => {}, afterSave: () => {}, present: () => {}, log: (s) => logs.push(s) });
  if (names) { if (!S.NAME_LISTS[names]) throw new Error("no name list " + names); S.useNameList(names); }
  await Promise.all([core.loadFrames(), core.bootAssets({ test })]);
  let f;
  if (face === "native") { const { bootNative } = await import("./face-native.mjs"); f = bootNative({ test }); }
  else if (face === "wasm") { const { bootFace } = await import("../station/src/face-lvgl.mjs"); f = await bootFace(pathToFileURL(path.resolve(here, "../face/dist/") + "/"), { test }); }
  else throw new Error("face is native or wasm, not " + face);
  await core.startFace({ test, face: f });
  game.loadSettings(); game.load();
  UI.lastInput = performance.now(); G.ready = true;
  const bootMs = Number(globalThis.process.hrtime.bigint() - real0) / 1e6;
  const D = createDriver({ core, pixelClock: clock, libraryWaiting, time: shims });
  D.settle({ min: 12 });   // the page's first half second (station-page.mjs waits 500 ms after ready)
  const { hash, errors } = D;

  const session = {
    shims, core, game, S, CORE, face: f, bootMs, logs, kind: face,
    KEYS,
    // one key of the device: the page's act(key), then the frames until the screen settles (driver.mjs)
    press: (key) => D.press(key),
    // keys(): the device's keys; keys(list): each pressed in turn, the results in order
    keys(list) { if (list == null) return KEYS.slice(); return list.map((k) => session.press(k)); },
    step(key) { return session.press(key); },
    // waiting: fast-forward by `minutes` (driver.mjs)
    wait: (minutes) => D.wait(minutes),
    frame: D.frame, settle: D.settle, hash, errors, frames: D.frames,
    // the framebuffer as RGBA bytes, and as a PNG (written to `file` when given)
    rgba: () => f.rgba(),
    render(file) { const png = encodePNG(1024, 600, f.rgba(), 6); if (file) writeFileSync(file, png); return png; },
    // the save as stored (to resume a standing player) and the developer settings
    save: () => globalThis.localStorage.getItem(game.saveKey()),
    props: () => (CORE.lastProps ? JSON.parse(CORE.lastProps) : null),
    log: () => CORE.lastLog,
    // the rules' state, for the parity test only (never shown to a player)
    digest: () => JSON.stringify({ st: G.st, ui: { screen: UI.screen, idle: UI.idle }, msg: FX.msg }),
    close: () => f.close?.(),
  };
  const { attachObserve } = await import("./observe.mjs");
  attachObserve(session);
  return session;
}

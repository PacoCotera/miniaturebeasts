// webkit-play-crash-1: /play crashed the page in WebKit because the "last 10 seconds" tap called VideoEncoder.isConfigSupported. On WebKit the WebCodecs path must stay off.
import test from "node:test";
import assert from "node:assert/strict";
import { isWebKit, webCodecsOk } from "../src/engine.mjs";

const UA = {
  playwrightWebKit: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15",
  iphoneSafari: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
  iphoneChrome: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/139.0.0.0 Mobile/15E148 Safari/604.1",
  chrome: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
  edge: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0",
  androidChrome: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36",
  firefox: "Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0",
};

test("the engine is told from the user agent: Safari and every iPhone browser are WebKit, Chromium and Firefox are not", () => {
  for (const k of ["playwrightWebKit", "iphoneSafari", "iphoneChrome"]) assert.equal(isWebKit(UA[k]), true, k);
  for (const k of ["chrome", "edge", "androidChrome", "firefox"]) assert.equal(isWebKit(UA[k]), false, k);
});

test("WebCodecs is off on WebKit even where it exists, and the gate never touches VideoEncoder there", () => {
  let touched = false;
  const g = { VideoEncoder: new Proxy(function () {}, { get() { touched = true; return () => {}; } }), VideoFrame: function () {} };
  assert.equal(webCodecsOk(UA.playwrightWebKit, g), false);
  assert.equal(webCodecsOk(UA.iphoneSafari, g), false);
  assert.equal(webCodecsOk(UA.iphoneChrome, g), false);
  assert.equal(webCodecsOk(UA.chrome, g), true, "Chromium keeps the clip tap");
  assert.equal(webCodecsOk(UA.chrome, {}), false, "no WebCodecs, no tap");
  assert.equal(touched, false);
});

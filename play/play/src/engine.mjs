// Which browser engine the page runs in, by the user-agent string alone (no feature probing: a probe is what crashes).
// Every iPhone browser is WebKit (Safari, and Chrome/Firefox on iOS: CriOS, FxiOS), as is Safari on a Mac; Chromium builds (Chrome, Edge, Opera) say Chrome/, Edg/ or OPR/ and are not.
export const isWebKit = (ua = (typeof navigator !== "undefined" && navigator.userAgent) || "") => /AppleWebKit\//.test(ua) && !/(Chrome|Chromium|Edg|OPR)\//.test(ua);

// WebKit never takes the WebCodecs path: VideoEncoder.isConfigSupported crashes the whole page in Playwright WebKit 26 (webkit-play-crash-1: "Page crashed" on /play), and nothing in a page can catch a crash.
// So the "last 10 seconds" is not offered there; a manual clip uses MediaRecorder. `g` is the global object (a test passes a stand-in).
export const webCodecsOk = (ua, g = globalThis) => !isWebKit(ua) && typeof g.VideoEncoder !== "undefined" && typeof g.VideoFrame !== "undefined";

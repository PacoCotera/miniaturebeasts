// Play notes, the pictures and clips taken from a device's own canvas. Built into the Options bundle (play/options), because it needs Mediabunny.
//   shot(canvas)           the canvas's exact pixels as a PNG (toBlob): the bar and the dialogs are page DOM and never in it
//   createTap(getCanvas)   WebCodecs VideoEncoder fed each frame of the played device's canvas, a key frame every second; chunks kept in a 10 s ring (ClipRing);
//                          last() packs the ring into an MP4, record()/stop() make a manual clip (up to 15 s). With no WebCodecs (Firefox on Android) only
//                          record works, through canvas.captureStream() + MediaRecorder (a WebM clip).
import { Output, Mp4OutputFormat, BufferTarget, EncodedVideoPacketSource, EncodedPacket } from "mediabunny";
import { ClipRing, LIMITS } from "./notes.mjs";

export const canClip = () => typeof VideoEncoder !== "undefined" && typeof VideoFrame !== "undefined";
export const canRecordAny = () => canClip() || (typeof MediaRecorder !== "undefined" && typeof HTMLCanvasElement !== "undefined" && "captureStream" in HTMLCanvasElement.prototype);

export function shot(canvas) {
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("no picture"))), "image/png"));
}

const FPS = 30, KEY_EVERY = FPS;   // a key frame every second
// the first codec this browser can encode, MP4-able: H.264 where it is (Chrome, Edge, Safari), else VP9 or AV1 (an open build of Chromium has no H.264 encoder)
const CODECS = [["avc1.42001f", "avc"], ["vp09.00.10.08", "vp9"], ["av01.0.04M.08", "av1"]];
async function pickCodec(w, h) {
  for (const [codec, kind] of CODECS) { try { if ((await VideoEncoder.isConfigSupported({ codec, width: w, height: h, bitrate: 2_000_000, framerate: FPS })).supported) return { codec, kind }; } catch { /* next */ } }
  return null;
}

// chunks [{ key, ts (ms), data (Uint8Array) }] and the decoder config -> an MP4 blob (timestamps from the first chunk)
export async function muxMp4(chunks, config, kind = "avc") {
  const output = new Output({ format: new Mp4OutputFormat({ fastStart: "in-memory" }), target: new BufferTarget() });
  const src = new EncodedVideoPacketSource(kind);
  output.addVideoTrack(src, { frameRate: FPS });
  await output.start();
  const t0 = chunks[0].ts;
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i], next = chunks[i + 1], dur = next ? (next.ts - c.ts) / 1000 : 1 / FPS;
    await src.add(new EncodedPacket(c.data, c.key ? "key" : "delta", (c.ts - t0) / 1000, dur), i === 0 ? { decoderConfig: config } : undefined);
  }
  await output.finalize();
  return new Blob([output.target.buffer], { type: "video/mp4" });
}

export function createTap(getCanvas, win = window) {
  const ring = new ClipRing(LIMITS.ringMs);
  let enc = null, cfg = null, pick = null, picking = false, kind = "avc", canvas = null, size = "", n = 0, raf = 0, last = 0, rec = null, mr = null, recStart = 0, active = false;
  const clone = (chunk) => { const data = new Uint8Array(chunk.byteLength); chunk.copyTo(data); return data; };
  function open(c) {
    close();
    if (!canClip()) return;
    if (!pick) { if (!picking) { picking = true; pickCodec(c.width & ~1, c.height & ~1).then((p) => { pick = p || false; picking = false; }); } return; }   // the codec is asked once; frames wait for the answer
    if (!pick) return;
    canvas = c; size = c.width + "x" + c.height; n = 0; cfg = null; ring.clear();
    const e = new VideoEncoder({
      output: (chunk, meta) => { if (meta && meta.decoderConfig && !cfg) cfg = meta.decoderConfig; const item = { key: chunk.type === "key", ts: chunk.timestamp / 1000, data: clone(chunk) }; ring.push(item); if (rec) rec.push(item); },
      error: () => { enc = null; },
    });
    try { e.configure({ codec: pick.codec, width: c.width & ~1, height: c.height & ~1, bitrate: 2_000_000, framerate: FPS, latencyMode: "realtime" }); } catch { return; }
    enc = e; kind = pick.kind;
  }
  function close() { if (enc) { try { enc.close(); } catch { /* closed */ } } enc = null; }
  function tick(t) {
    raf = win.requestAnimationFrame(tick);
    if (!active || t - last < 1000 / FPS - 2) return; last = t;
    const c = getCanvas(); if (!c) return;
    if (c !== canvas || c.width + "x" + c.height !== size) open(c);
    if (!enc || enc.state !== "configured" || enc.encodeQueueSize > 4) return;
    try {
      const f = new VideoFrame(c, { timestamp: Math.round(t * 1000) });
      enc.encode(f, { keyFrame: n++ % KEY_EVERY === 0 || (rec && rec.length === 0) });
      f.close();
    } catch { /* a canvas with no size yet */ }
  }
  return {
    get ready() { return !!enc && !!cfg && ring.chunks.length > 0; },
    get recording() { return !!rec || !!mr; },
    get ringMs() { return ring.spanMs(); },
    start() { if (active) return; active = true; if (!raf) raf = win.requestAnimationFrame(tick); },
    stop() { active = false; if (raf) win.cancelAnimationFrame(raf); raf = 0; close(); ring.clear(); canvas = null; },
    // the last 10 seconds as an MP4 (null when the browser cannot, or there is nothing yet)
    async last() { if (!enc) return null; try { await enc.flush(); } catch { return null; } const ch = ring.snapshot(); if (!ch.length || !cfg) return null; return { blob: await muxMp4(ch, cfg, kind), ms: Math.min(LIMITS.ringMs, ring.spanMs()) }; },
    // a manual clip: begins at a key frame, ends on stop() or at 15 s; resolves { blob, ms } (or null)
    record(onEnd) {
      const c = getCanvas(); if (!c) return false;
      recStart = performance.now();
      const finish = (r) => { if (timer) { clearTimeout(timer); timer = 0; } if (onEnd) onEnd(r); };
      let timer = 0;
      if (enc) { rec = []; this._stopRec = async () => { const ch = rec; rec = null; try { await enc.flush(); } catch { /* closed */ } if (!ch || !ch.length || !cfg) return finish(null); finish({ blob: await muxMp4(ch, cfg, kind), ms: Math.round(ch[ch.length - 1].ts - ch[0].ts) }); }; }
      else if (typeof MediaRecorder !== "undefined" && c.captureStream) {
        const parts = []; mr = new MediaRecorder(c.captureStream(FPS)); mr.ondataavailable = (e) => { if (e.data.size) parts.push(e.data); };
        mr.onstop = () => { const ms = Math.round(performance.now() - recStart); mr = null; finish(parts.length ? { blob: new Blob(parts, { type: "video/webm" }), ms } : null); };
        mr.start(); this._stopRec = async () => { if (mr && mr.state !== "inactive") mr.stop(); };
      } else return false;
      timer = setTimeout(() => this._stopRec && this._stopRec(), LIMITS.clipMs);
      return true;
    },
    stopRecord() { return this._stopRec ? this._stopRec() : undefined; },
    elapsed: () => (rec || mr ? performance.now() - recStart : 0),
  };
}

// The page's side of the LVGL face (lvgl-switch.md §2.1): a transport. It loads face.mjs and face.wasm (built by prototypes/face/build.sh and published beside the page), runs LVGL's frames
// from the page's animation frame, copies the rectangles LVGL redrew onto the screen canvas, and speaks the bridge's wire format with the face: JSON messages in through a shared buffer
// (send), JSON messages out by polling (poll). The same messages cross a Unix socket on the Pi. The rules, the views and the specs stay in JavaScript; the face holds no game state.
//   messages in:  hello, palette, spec, asset, props, event, key        messages out: ready, focus, intent, done, log, error
// The face is driven by words only: there is no node path. Tests that need to place primitives by hand use face/tests/node-scene.mjs.
export const LV_KEYS = { up: 17, down: 18, right: 19, left: 20, confirm: 10, back: 27, home: 2, research: 114, library: 108, habitat: 98, dock: 100 };
export const CONTRACT = 1;

export async function bootFace(base = new URL("../../face/dist/", import.meta.url), { test = false } = {}) {
  const t0 = performance.now();
  const create = (await import(new URL("face.mjs", base).href)).default;
  const M = await create({ locateFile: (p) => new URL(p, base).href });
  M._face_init();
  const W = M._face_width(), H = M._face_height(), version = M.UTF8ToString(M._face_version()), loadMs = performance.now() - t0;
  const enc = new TextEncoder();
  // ---- the wire ----
  const inCap = M._face_in_cap();
  const inbox = [];   // messages the face sent, parsed, in order
  function send(msg) {
    const b = enc.encode(typeof msg === "string" ? msg : JSON.stringify(msg));
    if (b.length > inCap) throw new Error(`the bridge's in-buffer holds ${inCap} bytes; a ${msg.t ?? "message"} of ${b.length} is refused`);
    M.HEAPU8.set(b, M._face_in_buf()); const rc = M._face_send(b.length); drain(); return rc;
  }
  function drain() { for (let p; (p = M._face_poll());) inbox.push(JSON.parse(M.UTF8ToString(p))); }
  // The next message out (or the first of a type), parsed, or null.
  function poll(t) { drain(); const i = t ? inbox.findIndex((m) => m.t === t) : 0; return i >= 0 && inbox.length ? inbox.splice(i, 1)[0] : null; }
  // The errors the face has sent since the last call (consumed), as their words.
  const errors = () => { drain(); const out = []; for (let i = inbox.length - 1; i >= 0; i--) if (inbox[i].t === "error") out.unshift(inbox.splice(i, 1)[0].what); return out; };
  send({ t: "hello", contract: CONTRACT, test });
  const ready = poll("ready"), refused = poll("error");
  if (!ready) throw new Error("the LVGL face refused the handshake: " + (refused ? refused.what : "no answer"));

  let frames = 0, copied = 0, first = true;
  // Copy the redrawn rectangles from LVGL's framebuffer (B, G, R, A in memory) to a 2D canvas context as RGBA.
  function present(ctx) {
    const n = first ? 1 : M._face_dirty_count(), rects = first ? [0, 0, W, H] : Array.from(M.HEAP32.subarray(M._face_dirty_rects() >> 2, (M._face_dirty_rects() >> 2) + n * 4));
    first = false;
    const u32 = new Uint32Array(M.HEAPU8.buffer, M._face_fb(), W * H);
    for (let i = 0; i < n; i++) {
      const [x, y, w, h] = rects.slice(i * 4, i * 4 + 4), img = ctx.createImageData(w, h), out = new Uint32Array(img.data.buffer);
      for (let r = 0; r < h; r++) { let s = (y + r) * W + x, d = r * w; for (let c = 0; c < w; c++, s++, d++) { const v = u32[s]; out[d] = 0xff000000 | ((v & 0xff) << 16) | (v & 0xff00) | ((v >> 16) & 0xff); } }
      ctx.putImageData(img, x, y); copied += w * h;
    }
  }
  const fnv = (str) => { let h = 2166136261; for (const b of enc.encode(str)) { h ^= b; h = Math.imul(h, 16777619); } return h >>> 0; };
  const setText = (str) => { const b = enc.encode(str), cap = M._face_text_size() - 1, p = M._face_text(); if (b.length > cap) throw new Error(`the face's text buffer holds ${cap} bytes; "${String(str).slice(0, 24)}…" is ${b.length}`); M.HEAPU8.set(b, p); M.HEAPU8[p + b.length] = 0; };
  const setOps = (str) => { const b = enc.encode(str), cap = M._face_ops_size() - 1, p = M._face_ops(); if (b.length > cap) throw new Error(`the face's ops buffer holds ${cap} bytes; a composed picture of ${b.length} is refused`); M.HEAPU8.set(b, p); M.HEAPU8[p + b.length] = 0; };
  const setRegion = (name) => { const b = enc.encode(String(name)).subarray(0, 47), p = M._face_region(); M.HEAPU8.set(b, p); M.HEAPU8[p + b.length] = 0; };
  const measure = (str, px) => { setText(String(str)); return M._face_measure(px); };

  // A picture's pixels into the face (RGBA bytes, straight alpha: a picture's rgba(), stored as B, G, R, A), once per asset id, by the `asset` message: the face allocates the buffer for the id and the page fills it.
  // The table holds 256 pictures: a picture's slot is kept while its scene draws it and recycled, least recently used first, when a scene needs a slot and none is free;
  // a single scene that needs more than the table holds is refused loudly.
  const handles = new Map(); let sceneNo = 0; const limit = ready.limits.pictures;
  function handleOf(id, picture) {
    const have = handles.get(id); if (have) { have.used = sceneNo; return have.h; }
    const pic = picture(id); if (!pic) return -1;
    if (handles.size >= limit) {
      let victim = null; for (const [k, v] of handles) if (!v.pinned && v.used < sceneNo && (!victim || v.used < victim[1].used)) victim = [k, v];
      if (!victim) throw new Error(`the face's picture table is full (${limit} pictures all in this scene); ${id} cannot be added`);
      send({ t: "asset", id: victim[0], drop: true }); handles.delete(victim[0]);
    }
    if (pic.policy !== "art" && pic.policy !== "painted") throw new Error(`the picture ${id} has no layer policy: the host sends "art" or "painted" with every picture (host.mjs picture())`);   // the layer a picture shows on is the host's (ui/asset-policy.mjs); the transport never guesses it
    const status = pic.status === "master" ? "master" : "placeholder", policy = pic.policy;
    if (send({ t: "asset", id, w: pic.w, h: pic.h, policy, status, src: "heap", ...(pic.slice ? { slice: pic.slice } : {}), ...(pic.tile ? { tile: pic.tile } : {}) }) < 0) throw new Error(`the face refused the picture ${id} (${pic.w}×${pic.h}): ${errors().pop()}`);
    const h = M._face_last_asset(), p = M._face_asset_pixels(h), d = pic.data, out = M.HEAPU8.subarray(p, p + pic.w * pic.h * 4);
    for (let i = 0; i < d.length; i += 4) { out[i] = d[i + 2]; out[i + 1] = d[i + 1]; out[i + 2] = d[i]; out[i + 3] = d[i + 3]; }
    handles.set(id, { h, used: sceneNo }); return h;
  }
  // The pictures the host sends at boot, after the specs and before the first props, and never drops: the name plates and the rail tab grounds (lvgl-switch.md §2.4). `pictures`: [{ id, w, h }]; `picture(id)` gives its pixels.
  function pin(pictures, picture) { for (const p of pictures) { handleOf(p.id, picture); handles.get(p.id).pinned = true; } }
  // The props of a screen (lvgl-switch.md §2.1): hashed without their seq, so an unchanged screen is not sent again; seq is the transport's, one more than the last sent, never the caller's.
  let seq = 0, lastProps = null;
  function props(p) {
    const { seq: _ignored, ...body } = p, key = JSON.stringify(body); if (key === lastProps) return 0;
    const rc = send({ t: "props", seq: seq + 1, ...body }); if (rc === 0) { seq++; lastProps = key; } return rc;
  }
  return {
    M, version, ready, measure, objects: () => M._face_object_count(), refused: () => M._face_node_refused(), beginScene: () => ++sceneNo,
    size: [W, H], loadMs, send, props, poll, drain, errors, handleOf, pin,
    frame: (ms) => { frames++; M._face_frame(Math.floor(ms)); drain(); },
    present, forceFull: () => { first = true; },
    key: (name) => { const code = LV_KEYS[name]; if (code == null) return; M._face_key(code, 1); M._face_key(code, 0); },
    hash: () => (M._face_hash() >>> 0).toString(16).padStart(8, "0"),
    stats: () => ({ frames, copiedPixels: copied, keys: M._face_key_count(), lastKey: M._face_last_key(), dirty: M._face_dirty_count(), pictures: handles.size, props: M._face_props_count(), events: M._face_event_count() }),
    pixel: (x, y) => { const p = M._face_fb() + (y * W + x) * 4; return [M.HEAPU8[p + 2], M.HEAPU8[p + 1], M.HEAPU8[p]]; },
    // test mode: the layers a pass shows (1 chrome; 2 chrome and art; 3 all), the pixels outside the palette on the last frame
    pass: (n) => M._face_test_pass(n), offPalette: () => M._face_test_offpalette(),
  };
}

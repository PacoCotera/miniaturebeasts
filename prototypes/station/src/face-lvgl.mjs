// The page's side of the LVGL face (lvgl-switch.md §2.1): a transport. It loads face.mjs and face.wasm (built by prototypes/face/build.sh and published beside the page), runs LVGL's frames
// from the page's animation frame, copies the rectangles LVGL redrew onto the screen canvas, and speaks the bridge's wire format with the face: JSON messages in through a shared buffer
// (send), JSON messages out by polling (poll). The same messages cross a Unix socket on the Pi. The rules, the views and the specs stay in JavaScript; the face holds no game state.
//   messages in:  hello, palette, spec, asset, props, event, key        messages out: ready, focus, intent, done, log, error
// Until the words replace it (L2.0 B3 and B4), the page's scene nodes still reach the face by `scene()`, the adapter of the node path (the closed set: rect, text, sprite, nineSlice, clip,
// composed), tagged with a layer and a region; it is deleted with the last JavaScript drawing of Pods.
export const LV_KEYS = { up: 17, down: 18, right: 19, left: 20, confirm: 10, back: 27, home: 2, research: 114, library: 108, habitat: 98, dock: 100 };
export const CONTRACT = 1;
const LAYERS = { chrome: 0, art: 1, painted: 2, type: 3 };

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
  const setRegion = (name) => { const b = enc.encode(String(name)).subarray(0, 47), p = M._face_region(); M.HEAPU8.set(b, p); M.HEAPU8[p + b.length] = 0; };
  const measure = (str, px) => { setText(String(str)); return M._face_measure(px); };

  // A picture's pixels into the face (RGBA from a canvas, stored as B, G, R, A), once per asset id, by the `asset` message: the face allocates the buffer for the id and the page fills it.
  // The table holds 256 pictures: a picture's slot is kept while its scene draws it and recycled, least recently used first, when a scene needs a slot and none is free;
  // a single scene that needs more than the table holds is refused loudly.
  const handles = new Map(); let sceneNo = 0; const limit = ready.limits.pictures;
  function handleOf(id, picture) {
    const have = handles.get(id); if (have) { have.used = sceneNo; return have.h; }
    const pic = picture(id); if (!pic) return -1;
    if (handles.size >= limit) {
      let victim = null; for (const [k, v] of handles) if (v.used < sceneNo && (!victim || v.used < victim[1].used)) victim = [k, v];
      if (!victim) throw new Error(`the face's picture table is full (${limit} pictures all in this scene); ${id} cannot be added`);
      send({ t: "asset", id: victim[0], drop: true }); handles.delete(victim[0]);
    }
    if (send({ t: "asset", id, w: pic.w, h: pic.h, src: "heap", ...(pic.slice ? { slice: pic.slice } : {}), ...(pic.tile ? { tile: pic.tile } : {}) }) < 0) throw new Error(`the face refused the picture ${id} (${pic.w}×${pic.h}): ${errors().pop()}`);
    const h = M._face_last_asset(), p = M._face_asset_pixels(h), d = pic.data, out = M.HEAPU8.subarray(p, p + pic.w * pic.h * 4);
    for (let i = 0; i < d.length; i += 4) { out[i] = d[i + 2]; out[i + 1] = d[i + 1]; out[i + 2] = d[i]; out[i + 3] = d[i + 3]; }
    handles.set(id, { h, used: sceneNo }); return h;
  }
  // ---- the adapter of the node path ----
  const KIND = { rect: 1, text: 2, sprite: 3, nine: 4, clip: 5, composed: 6 };
  // The layer a node is checked on: its own, else by kind (text on the type layer, pictures on the art layer, the rest chrome); env.layer(node) may say better (the painted layer).
  const layerOf = (n, env) => LAYERS[n.layer] ?? LAYERS[env.layer?.(n)] ?? (n.kind === "text" ? 3 : n.kind === "sprite" ? 1 : 0);
  // One frame's nodes in draw order. env: { rgb(name) -> [r, g, b], cap(px), picture(assetId) -> { w, h, data (RGBA) }, slice(assetId) -> [l, t, r, b] | null, tile(assetId) -> px (0: the whole strip), layer?(node) }.
  // A frame identical to the last one is not sent again. Returns the nodes the face cannot draw (a kind outside the closed set, a picture it lacks).
  let lastKey = null;
  const keyOf = (nodes) => { let h = 2166136261; const mix = (v) => { for (const b of enc.encode(String(v))) { h ^= b; h = Math.imul(h, 16777619); } h ^= 0xff; h = Math.imul(h, 16777619); }; for (const n of nodes) { mix(n.id); mix(n.kind); mix(n.rect); mix(n.colour); mix(n.text); mix(n.px); mix(n.asset); mix(n.ops); mix(n.layer); mix(n.region); if (n.children) for (const c of n.children) { mix(c.id); mix(c.rect); mix(c.asset); } } return h; };
  function scene(nodes, env) {
    const key = keyOf(nodes); if (key === lastKey) return []; sceneNo++;   // lastKey is set only once the scene is whole: a throw leaves it unset, so the next identical scene is sent again
    const left = [], hex = (n) => { const [r, g, b] = env.rgb(n); return (r << 16) | (g << 8) | b; };
    M._face_scene_begin();
    const node = (id, kind, x, y, w, h, rgb, a, b, n) => { setRegion(n.region ?? n.id); M._face_node_tag(layerOf(n, env)); M._face_node(fnv(id), kind, x, y, w, h, rgb, a, b); };
    try {
    for (const n of nodes) {
      const [x, y, w, h] = n.rect;
      if (n.kind === "rect") node(n.id, KIND.rect, x, y, w, h, hex(n.colour), 0, 0, n);
      else if (n.kind === "text") { setText(n.text); node(n.id, KIND.text, x, y, w, h, hex(n.colour), n.px, env.cap(n.px), n); }
      else if (n.kind === "sprite") { const hd = handleOf(n.asset, env.picture); if (hd < 0) left.push(n); else node(n.id, KIND.sprite, x, y, w, h, 0, hd, 0, { ...n, layer: n.layer ?? env.layer?.(n) ?? "art" }); }
      else if (n.kind === "clip") {   // children shown only inside the clip: the face cuts them (a clip is a real primitive); a child the face cannot draw is left to the caller
        const kids = []; for (const c of n.children || []) { if (c.kind === "sprite") { const hd = handleOf(c.asset, env.picture); if (hd < 0) left.push(c); else kids.push([c, hd]); } else left.push(c); }
        node(n.id, KIND.clip, x, y, w, h, 0, kids.length, 0, n);
        for (const [c, hd] of kids) { const [cx, cy, cw, ch] = c.rect; node(c.id, KIND.sprite, cx, cy, cw, ch, 0, hd, 0, { ...c, region: n.region ?? n.id }); }
      }
      else if (n.kind === "composed") { setText(JSON.stringify(n.ops)); node(n.id, KIND.composed, x, y, w, h, 0, 0, 0, n); }
      else if (n.kind === "nineSlice") {   // the insets [l, t, r, b] packed a byte each, the edge tile in b
        const hd = handleOf(n.asset, env.picture), sl = env.slice(n.asset);
        if (hd < 0 || !sl || sl.some((v) => v < 0 || v > 255)) left.push(n); else node(n.id, KIND.nine, x, y, w, h, ((sl[0] << 24) | (sl[1] << 16) | (sl[2] << 8) | sl[3]) >>> 0, hd, env.tile(n.asset), n);
      }
      else left.push(n);
    }
    } catch (e) { M._face_scene_end(); throw e; }
    lastKey = key;
    M._face_scene_end(); return left;
  }
  // The props of a screen (lvgl-switch.md §2.1): hashed without their seq, so an unchanged screen is not sent again; seq is the transport's, one more than the last sent, never the caller's.
  let seq = 0, lastProps = null;
  function props(p) {
    const { seq: _ignored, ...body } = p, key = JSON.stringify(body); if (key === lastProps) return 0;
    const rc = send({ t: "props", seq: seq + 1, ...body }); if (rc === 0) { seq++; lastProps = key; } return rc;
  }
  const setBackground = (rgb) => M._face_background(rgb);
  return {
    M, version, ready, measure, scene, setBackground, objects: () => M._face_object_count(), refused: () => M._face_node_refused(),
    size: [W, H], loadMs, send, props, poll, drain, errors, handleOf,
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

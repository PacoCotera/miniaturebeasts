// The Station's LVGL face in the page (technical-architecture.md §8): `?face=lvgl` loads face.mjs and face.wasm (built by
// prototypes/face/build.sh and published beside the page), runs LVGL's frames from the page's animation frame, copies the
// rectangles LVGL redrew onto the screen canvas and passes the keys in. From L1 the JavaScript views feed it their scene nodes
// (the contract the canvas renderer takes) and the face builds them as LVGL objects, placing and styling only; it measures text
// itself, so the views' centring and clipping use the widths LVGL's font engine gives. Intents come back as keys.
export const LV_KEYS = { up: 17, down: 18, right: 19, left: 20, confirm: 10, back: 27, home: 2, research: 114, library: 108, habitat: 98, dock: 100 };

export async function bootFace(base = new URL("../../face/dist/", import.meta.url)) {
  const t0 = performance.now();
  const create = (await import(new URL("face.mjs", base).href)).default;
  const M = await create({ locateFile: (p) => new URL(p, base).href });
  M._face_init();
  const W = M._face_width(), H = M._face_height(), version = M.UTF8ToString(M._face_version()), loadMs = performance.now() - t0;
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
  const enc = new TextEncoder(), KIND = { rect: 1, text: 2, sprite: 3, nine: 4 };
  const fnv = (str) => { let h = 2166136261; for (const b of enc.encode(str)) { h ^= b; h = Math.imul(h, 16777619); } return h >>> 0; };
  const setText = (str) => { const b = enc.encode(str), cap = M._face_text_size() - 1, p = M._face_text(); if (b.length > cap) throw new Error(`the face's text buffer holds ${cap} bytes; "${String(str).slice(0, 24)}…" is ${b.length}`); M.HEAPU8.set(b, p); M.HEAPU8[p + b.length] = 0; };
  const measure = (str, px) => { setText(String(str)); return M._face_measure(px); };
  // A picture's pixels into the face (RGBA from a canvas, stored as B, G, R, A); once per asset id.
  // The table holds 256 pictures: a picture's slot is kept while its scene draws it and recycled, least recently used first, when a scene needs a slot and none is free;
  // a single scene that needs more than the table holds is refused loudly.
  const handles = new Map(); let sceneNo = 0;
  function handleOf(id, picture) {
    const have = handles.get(id); if (have) { have.used = sceneNo; return have.h; }
    const pic = picture(id); if (!pic) return -1;
    const limit = M._face_asset_limit();
    let h = handles.size;
    if (h >= limit) {
      let victim = null; for (const [k, v] of handles) if (v.used < sceneNo && (!victim || v.used < victim[1].used)) victim = [k, v];
      if (!victim) throw new Error(`the face's picture table is full (${limit} pictures all in this scene); ${id} cannot be added`);
      handles.delete(victim[0]); h = victim[1].h;
    }
    const p = M._face_asset(h, pic.w, pic.h); if (!p) throw new Error(`the face refused the picture ${id} (${pic.w}×${pic.h})`);
    const d = pic.data, out = M.HEAPU8.subarray(p, p + pic.w * pic.h * 4);
    for (let i = 0; i < d.length; i += 4) { out[i] = d[i + 2]; out[i + 1] = d[i + 1]; out[i + 2] = d[i]; out[i + 3] = d[i + 3]; }
    handles.set(id, { h, used: sceneNo }); return h;
  }
  // One frame's nodes in draw order. env: { rgb(name) -> [r, g, b], cap(px), picture(assetId) -> { w, h, data (RGBA) }, slice(assetId) -> [l, t, r, b] | null, tile(assetId) -> px (0: the whole strip) }.
  // A frame identical to the last one is not sent again. Returns the nodes the face cannot draw (a kind outside the closed set, a picture it lacks).
  let lastKey = null;
  const keyOf = (nodes) => { let h = 2166136261; const mix = (v) => { for (const b of enc.encode(String(v))) { h ^= b; h = Math.imul(h, 16777619); } h ^= 0xff; h = Math.imul(h, 16777619); }; for (const n of nodes) { mix(n.id); mix(n.kind); mix(n.rect); mix(n.colour ?? ""); mix(n.text ?? ""); mix(n.px ?? ""); mix(n.asset ?? ""); for (const c of n.children || []) { mix(c.id); mix(c.rect); mix(c.asset ?? ""); } } return h >>> 0; };
  function scene(nodes, env) {
    const key = keyOf(nodes); if (key === lastKey) return []; sceneNo++;   // lastKey is set only once the scene is whole: a throw leaves it unset, so the next identical scene is sent again
    const left = [], hex = (n) => { const [r, g, b] = env.rgb(n); return (r << 16) | (g << 8) | b; };
    M._face_scene_begin();
    try {
    for (const n of nodes) {
      const [x, y, w, h] = n.rect, id = fnv(n.id);
      if (n.kind === "rect") M._face_node(id, KIND.rect, x, y, w, h, hex(n.colour), 0, 0);
      else if (n.kind === "text") { setText(n.text); M._face_node(id, KIND.text, x, y, w, h, hex(n.colour), n.px, env.cap(n.px)); }
      else if (n.kind === "sprite") { const hd = handleOf(n.asset, env.picture); if (hd < 0) left.push(n); else M._face_node(id, KIND.sprite, x, y, w, h, 0, hd, 0); }
      else if (n.kind === "clip") {   // children shown only inside the clip: a sprite is the window of its picture that lies inside (a view, never a scaled copy)
        for (const c of n.children || []) {
          if (c.kind !== "sprite") { left.push(c); continue; }
          const ix = Math.max(x, c.rect[0]), iy = Math.max(y, c.rect[1]), ex = Math.min(x + w, c.rect[0] + c.rect[2]), ey = Math.min(y + h, c.rect[1] + c.rect[3]);
          if (ex <= ix || ey <= iy) continue;
          const hd = handleOf(c.asset, env.picture); if (hd < 0) { left.push(c); continue; }
          const sx = ix - c.rect[0], sy = iy - c.rect[1], full = sx === 0 && sy === 0 && ex - ix === c.rect[2] && ey - iy === c.rect[3];
          M._face_node(fnv(c.id), KIND.sprite, ix, iy, ex - ix, ey - iy, full ? 0 : ((sx << 16) | sy) >>> 0, hd, 0);
        }
      }
      else if (n.kind === "nineSlice") {   // the insets [l, t, r, b] packed a byte each, the edge tile in b
        const hd = handleOf(n.asset, env.picture), sl = env.slice(n.asset);
        if (hd < 0 || !sl || sl.some((v) => v < 0 || v > 255)) left.push(n); else M._face_node(id, KIND.nine, x, y, w, h, ((sl[0] << 24) | (sl[1] << 16) | (sl[2] << 8) | sl[3]) >>> 0, hd, env.tile(n.asset));
      }
      else left.push(n);
    }
    } catch (e) { M._face_scene_end(); throw e; }
    lastKey = key;
    M._face_scene_end(); return left;
  }
  const setBackground = (rgb) => M._face_background(rgb);
  return {
    M, version, measure, scene, setBackground, objects: () => M._face_object_count(), refused: () => M._face_node_refused(),
    size: [W, H], loadMs,
    frame: (ms) => { frames++; M._face_frame(Math.floor(ms)); },
    present, forceFull: () => { first = true; },
    key: (name) => { const code = LV_KEYS[name]; if (code == null) return; M._face_key(code, 1); M._face_key(code, 0); },
    hash: () => (M._face_hash() >>> 0).toString(16).padStart(8, "0"),
    stats: () => ({ frames, copiedPixels: copied, keys: M._face_key_count(), lastKey: M._face_last_key(), dirty: M._face_dirty_count() }),
    pixel: (x, y) => { const p = M._face_fb() + (y * W + x) * 4; return [M.HEAPU8[p + 2], M.HEAPU8[p + 1], M.HEAPU8[p]]; },
  };
}

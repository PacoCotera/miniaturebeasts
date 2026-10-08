// The Station's LVGL face in the page (technical-architecture.md §8): `?face=lvgl` loads face.mjs and face.wasm (built by
// prototypes/face/build.sh and published beside the page), runs LVGL's frames from the page's animation frame, copies the
// rectangles LVGL redrew onto the screen canvas and passes the keys in. At L0 the display is empty; from L1 the JavaScript
// views feed it props over the same contract and it sends intents back.
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
  return {
    M, version, size: [W, H], loadMs,
    frame: (ms) => { frames++; M._face_frame(Math.floor(ms)); },
    present, forceFull: () => { first = true; },
    key: (name) => { const code = LV_KEYS[name]; if (code == null) return; M._face_key(code, 1); M._face_key(code, 0); },
    hash: () => (M._face_hash() >>> 0).toString(16).padStart(8, "0"),
    stats: () => ({ frames, copiedPixels: copied, keys: M._face_key_count(), lastKey: M._face_last_key(), dirty: M._face_dirty_count() }),
    pixel: (x, y) => { const p = M._face_fb() + (y * W + x) * 4; return [M.HEAPU8[p + 2], M.HEAPU8[p + 1], M.HEAPU8[p]]; },
  };
}

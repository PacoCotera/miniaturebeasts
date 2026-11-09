// The range haze (art desk, mibi-art 9fa531bba, art-jobs/2026-11-09-range-haze/out/): the land past the Probe's range washes out into a pale warm mist.
// No alpha at run time: each wash layer (L1, L2, L3) is one table lookup per pixel, into the kit palette plus the 6 ramp colours. Pure over indexed buffers,
// so the node tests, the sandbox and the firmware run the same logic. Wisps are off.
//
// kit = hazeKit(files, remap, ramp): the wash sheets as per-pixel steps (0 none, 1..7), the 3 x 7 remap tables as Uint8Array(256), the ramp colours.
// A level grid (0..3 per place cell, 3 = the edge row) is laid into three kind maps at the kit's own pixel (16 px a cell); the screen draws that pixel
// at size / 16 screen pixels (3 at 48).
export const HAZE_T = 16, HAZE_VARIANTS = 3, HAZE_KIT = 43;   // the kit's released colours (indices 48..90) the tables are keyed to
export const hazeFileNames = () => [1, 2, 3].flatMap((L) => ['', '~v1', '~v2'].map((v) => `haze-L${L}${v}`));

// files: { name: { width, height, data (RGBA) } } for the nine sheets; remap: haze-remap.json; ramp: haze-ramp.json
// setLen: how many colours the tile set's palette holds (indices 48..). The desk keyed its tables to the kit's 43 then the open edges' 7 (50 colours, the ramp at 98..103); the set now also carries the
// meadow decor's colours after those 50, so the ramp the tables answer with moves up by the difference and follows the set's palette.
export function hazeKit(files, remap, ramp, setLen = HAZE_KIT + 7) {
  // a pixel's kind is its layer and its alpha step (the colour is the layer's own; a browser's canvas premultiplies low alphas, so the colour is not read back)
  const kindOf = new Map(remap.kinds.map((k) => [k.key[1] + ':' + k.rgba[3], k.key]));
  const tiles = [1, 2, 3].map((L) => ['', '~v1', '~v2'].map((v) => {
    const f = files[`haze-L${L}${v}`];
    if (!f || f.width !== 64 || f.height !== 64) throw new Error(`haze sheet haze-L${L}${v} missing or not 64 x 64`);
    return Array.from({ length: 16 }, (_, k) => {
      const t = new Uint8Array(HAZE_T * HAZE_T), x0 = (k % 4) * HAZE_T, y0 = (k >> 2) * HAZE_T;
      for (let y = 0; y < HAZE_T; y++) for (let x = 0; x < HAZE_T; x++) {
        const o = ((y0 + y) * 64 + x0 + x) * 4, a = f.data[o + 3];
        if (!a) continue;
        const key = kindOf.get(L + ':' + a);
        if (!key) throw new Error(`haze-L${L}${v}: a pixel of no table (alpha ${a})`);
        t[y * HAZE_T + x] = +key.split('.')[1];
      }
      return t;
    });
  }));
  const first = remap.firstIndex, shift = setLen - (HAZE_KIT + 7);
  const tables = [1, 2, 3].map((L) => [null, ...Array.from({ length: 7 }, (_, s) => {
    const row = remap.tables[`L${L}.${s + 1}`], t = Uint8Array.from({ length: 256 }, (_, i) => i);
    row.forEach((to, p) => { t[first + p] = to >= first + HAZE_KIT + 7 ? to + shift : to; });
    return t;
  })]);
  const toRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  // extra: the colours the tables can answer with beyond the tile set's palette: the 6 ramp colours (the set holds the open edges' 7 itself, in the desk's order, at 91..97)
  const extra = { first: first + setLen, rgb: remap.order.slice(HAZE_KIT + 7).map(toRgb) };
  return { tiles, tables, ramp: { first: ramp.firstIndex + shift, rgb: ramp.colours.map(toRgb) }, extra, kit43: remap.order.slice(0, HAZE_KIT).map(toRgb), edges7: remap.order.slice(HAZE_KIT, HAZE_KIT + 7).map(toRgb) };
}

// FNV-1a over the place's id, the layer and the dual tile (the desk's h32): which of the three lumps a dual tile wears.
export function h32(pid, x, y) {
  let h = 0x811C9DC5;
  const bytes = [...pid].map((c) => c.charCodeAt(0));
  for (const v of [x, y]) for (const s of [0, 8, 16, 24]) bytes.push((v >> s) & 255);
  for (const b of bytes) { h ^= b & 255; h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}

// The dual grid over the level grid, per layer L: bit = (level >= L), clamped at the place's edge; tile (i, j) at (i * 16 - 8, j * 16 - 8).
// levels: Uint8Array(w * h). Returns { W, H, maps: [Uint8Array x 3] } at the kit's pixel.
export function layHaze(kit, levels, w, h, pid) {
  const W = w * HAZE_T, H = h * HAZE_T, cell = (x, y) => levels[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))];
  const maps = [1, 2, 3].map((L) => {
    const map = new Uint8Array(W * H);
    for (let j = 0; j <= h; j++) for (let i = 0; i <= w; i++) {
      const k = (cell(i - 1, j - 1) >= L ? 8 : 0) | (cell(i, j - 1) >= L ? 4 : 0) | (cell(i - 1, j) >= L ? 2 : 0) | (cell(i, j) >= L ? 1 : 0);
      if (!k) continue;
      const t = kit.tiles[L - 1][h32(pid + 'h' + L, i, j) % HAZE_VARIANTS][k], x0 = i * HAZE_T - HAZE_T / 2, y0 = j * HAZE_T - HAZE_T / 2;
      for (let y = 0; y < HAZE_T; y++) { const Y = y0 + y; if (Y < 0 || Y >= H) continue;
        for (let x = 0; x < HAZE_T; x++) { const X = x0 + x; if (X >= 0 && X < W) map[Y * W + X] = t[y * HAZE_T + x]; } }
    }
    return map;
  });
  return { W, H, maps };
}

// Washes the indexed buffer `buf` (covering win = { x, y, w, h }, place pixels at the drawn `size`) in place: L1, then L2, then L3, one table lookup each.
export function applyHaze(buf, win, size, kit, hz) {
  const { W, H, maps } = hz, [t1, t2, t3] = kit.tables;
  for (let y = 0; y < win.h; y++) {
    const Y = win.y + y; if (Y < 0) continue;
    const hy = Math.floor(Y * HAZE_T / size); if (hy >= H) break;
    const row = hy * W;
    for (let x = 0; x < win.w; x++) {
      const X = win.x + x; if (X < 0) continue;
      const hx = Math.floor(X * HAZE_T / size); if (hx >= W) break;
      const o = y * win.w + x; let c = buf[o];
      if (!c) continue;
      let s = maps[0][row + hx]; if (s) c = t1[s][c];
      s = maps[1][row + hx]; if (s) c = t2[s][c];
      s = maps[2][row + hx]; if (s) c = t3[s][c];
      buf[o] = c;
    }
  }
  return buf;
}

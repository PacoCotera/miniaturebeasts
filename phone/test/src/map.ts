// Deterministic layout of the test map: which signed fill tile sits where, and where props stand.
// Layout only (no art is made here): tiles and props are the signed files from src/art.ts.
export const MAP_W = 256; // tiles
export const MAP_H = 72;
export const CHUNK = 8; // tiles per chunk side

export function hash(x: number, y: number, s: number): number {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

function noise(x: number, y: number, cell: number, s: number): number {
  const gx = Math.floor(x / cell), gy = Math.floor(y / cell);
  const fx = smooth((x - gx * cell) / cell), fy = smooth((y - gy * cell) / cell);
  const a = hash(gx, gy, s), b = hash(gx + 1, gy, s), c = hash(gx, gy + 1, s), d = hash(gx + 1, gy + 1, s);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

// index into FILLS
export function fillAt(x: number, y: number): number {
  const w = noise(x, y, 24, 1);
  if (w < 0.30) return 2; // water
  if (w < 0.36) return 1; // sand shore
  const road = Math.abs(y - (MAP_H / 2 + Math.sin(x / 13) * 7)) < 1.2;
  if (road) return 3; // path
  const d = noise(x, y, 14, 2);
  if (d > 0.68) return 4; // dry grass
  if (d < 0.2) return 5; // earth
  return 0; // grass
}

export type Prop = { kind: number; x: number; y: number }; // x,y in art pixels (feet position)

// kind index into PROPS; tree is 6
export function propAt(x: number, y: number): Prop | null {
  const f = fillAt(x, y);
  if (f === 2 || f === 3) return null;
  const r = hash(x, y, 9);
  if (r > 0.07) return null;
  const k = r < 0.0006 ? 6 : Math.floor(hash(x, y, 10) * 6);
  return { kind: k, x: x * 16 + 8 + Math.floor(hash(x, y, 11) * 8) - 4, y: y * 16 + 14 };
}

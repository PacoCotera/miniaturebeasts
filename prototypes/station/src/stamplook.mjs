// The stamp's look (stampCase, fix 4; the art director's values, masters-pods 001bcd51 stamp-case/README): the label is how the real stamp sits on the device, unlit, in its shade. The real stamp
// is never regenerated; its pixels (plate and ink) are multiplied in LINEAR light by K × WARM when the label is rasterised, so the label is a picture placed 1:1 and never a runtime overlay. The
// label's plate carries a 1 px hairline edge all round. No fill, light, glow, frame or pane of its own. Pure functions, tested in tests/pictures-rgba.test.mjs.
export const WARM = [1.0, 0.93, 0.80];
const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const srgb = (l) => Math.max(0, Math.min(255, (l <= 0.0031308 ? l * 12.92 : 1.055 * l ** (1 / 2.4) - 0.055) * 255));
// RGBA bytes (straight alpha) with each colour channel multiplied by k × WARM in linear light; alpha is kept.
export function dimRGBA(rgba, k) {
  const out = new Uint8ClampedArray(rgba.length);
  for (let i = 0; i < rgba.length; i += 4) { for (let c = 0; c < 3; c++) out[i + c] = Math.round(srgb(lin(rgba[i + c]) * k * WARM[c])); out[i + 3] = rgba[i + 3]; }
  return out;
}
// A picture ({ w, h, rgba() }) dimmed by k × WARM.
export const dimPicture = (pic, k) => ({ w: pic.w, h: pic.h, rgba: () => dimRGBA(pic.rgba(), k) });
// The label's plate: the size × size plate colour dimmed by k × WARM, then a 1 px edge of the hairline colour all round.
export function labelPlate(size, plate, edge, k) {
  const fill = dimRGBA(Uint8ClampedArray.from([plate[0], plate[1], plate[2], 255]), k), out = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { const i = (y * size + x) * 4, rim = x === 0 || y === 0 || x === size - 1 || y === size - 1, c = rim ? edge : fill; out[i] = c[0]; out[i + 1] = c[1]; out[i + 2] = c[2]; out[i + 3] = 255; }
  return { w: size, h: size, rgba: () => out };
}
// The label's two requests for the host (kind "stampplate" and the dimmed "stamp"): the ids carry k, so a stamp at another k is another picture.
export const kPct = (k) => Math.round(k * 100);
export const plateReq = (req, k) => req({ kind: "stampplate", id: `stamp-plate-120-k${kPct(k)}`, size: 120, k });

// The recovery print: what the Caddy's printer sets down for the recovery key. 384 dots wide (58 mm), 1 bit, drawn in the panel's own type (Mibi 7×9, mibi.mjs) at whole scales:
// the title at 4×, the seven lines of the key at 3×, the key id at 2×, one line of what the paper does at 2×. A PNG with a two-colour palette at one bit a pixel, so the printer
// and the play page's strip read the same dots. QR waits for the reader (stubbed: no code is drawn). Every word is a placeholder for the copywriter.
// The seed is the one thing that must not be kept: this module only draws what it is given and holds nothing.
import { deflateSync, crc32 } from "node:zlib";
import { GLYPHS, ROWS } from "./mibi.mjs";
import { measure } from "./face.mjs";
import { recoveryLines, recoveryPub, kid as kidOf } from "../play/src/realm/recovery.mjs";

export const WIDTH = 384, MARGIN = 24;
export const WORDS = {
  title: "Recovery key",
  keyId: (kid) => "Key " + kid,
  what: "If your Companion is lost, this wakes your sleeping realms.",
};
const SCALE = { title: 4, key: 3, kid: 2, what: 2 }, PITCH = { key: 30, what: 20 }, GAP = 10, RULE = 2, TOP = 20;

function wrap(text, scale, max) {
  const lines = []; let cur = "";
  for (const word of text.split(" ")) {
    const next = cur ? cur + " " + word : word;
    if (measure(next, scale) <= max) cur = next; else { if (cur) lines.push(cur); cur = word; }
  }
  if (cur) lines.push(cur);
  return lines;
}

// The picture as rows of 0 (paper) and 1 (ink): { width, height, bits: Uint8Array(width * height) }. Throws when a line passes the margins.
export function drawPrint({ lines, kid }) {
  if (!Array.isArray(lines) || lines.length !== 7) throw new Error("the print takes the key's seven lines");
  const inner = WIDTH - 2 * MARGIN;
  const what = wrap(WORDS.what, SCALE.what, inner);
  const items = [];   // [text, scale, y]
  let y = TOP;
  items.push([WORDS.title, SCALE.title, y]); y += ROWS * SCALE.title + GAP;
  const rule1 = y; y += RULE + GAP;
  const hang = MARGIN + measure("MBRK ", SCALE.key);   // lines 2 to 7 start where line 1's key starts, so the groups stand in one column with the prefix hanging left
  lines.forEach((l, i) => { items.push([l, SCALE.key, y, i ? hang : MARGIN]); y += PITCH.key; });
  y += GAP - (PITCH.key - ROWS * SCALE.key);
  const rule2 = y; y += RULE + GAP;
  items.push([WORDS.keyId(kid), SCALE.kid, y]); y += ROWS * SCALE.kid + GAP;
  for (const l of what) { items.push([l, SCALE.what, y]); y += PITCH.what; }
  const height = y - PITCH.what + ROWS * SCALE.what + TOP;
  const bits = new Uint8Array(WIDTH * height);
  const fill = (x, yy, w, h) => { for (let j = yy; j < yy + h; j++) bits.fill(1, j * WIDTH + x, j * WIDTH + x + w); };
  fill(MARGIN, rule1, inner, RULE); fill(MARGIN, rule2, inner, RULE);
  for (const [text, scale, ty, x0 = MARGIN] of items) {
    const w = measure(text, scale);
    if (x0 - MARGIN + w > inner) throw new Error(`the print's "${text}" is ${w} dots wide, past its ${inner}`);
    let pen = x0;
    for (const ch of text) {
      const [adv, rows] = GLYPHS[ch], rr = rows.split("|");
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < 5; c++) if (rr[r][c] === "#") fill(pen + c * scale, ty + r * scale, scale, scale);
      pen += adv * scale;
    }
  }
  return { width: WIDTH, height, bits };
}

const chunk = (type, data) => {
  const head = Buffer.from(type, "ascii"), body = Buffer.concat([head, data]), out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0); body.copy(out, 4); out.writeUInt32BE(crc32(body), 8 + data.length);
  return out;
};

// 1-bit indexed PNG: palette 0 paper (white), 1 ink (black); no filter, so the file is the same bytes everywhere.
export function encodeBits({ width, height, bits }) {
  const stride = Math.ceil(width / 8), raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (bits[y * width + x]) raw[y * (stride + 1) + 1 + (x >> 3)] |= 0x80 >> (x & 7);
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 1; ihdr[9] = 3;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("PLTE", Buffer.from([255, 255, 255, 0, 0, 0])), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

// The print for a 32-byte seed: { png, kid, pub, lines }. The key id and the public key are what the Caddy keeps; the seed is not.
export async function recoveryPrint(seed) {
  const [lines, pub] = await Promise.all([recoveryLines(seed), recoveryPub(seed)]), id = await kidOf(pub);
  return { png: encodeBits(drawPrint({ lines, kid: id })), kid: id, pub, lines };
}

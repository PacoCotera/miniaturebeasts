// ui-call-reach-1: stills of a Call 2 tiles from the east edge, before and after, from the page harness (the game's own 450 x 600 screen, 1x).
//   node call-reach-stills.mjs <outDir>
import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { makePage } from "../tests/page-harness.mjs";

const out = process.argv[2]; mkdirSync(out, { recursive: true });
const crcT = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc = b => { let c = -1; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (t, d) => { const b = Buffer.alloc(8 + d.length + 4); b.writeUInt32BE(d.length, 0); b.write(t, 4); d.copy(b, 8); b.writeUInt32BE(crc(b.subarray(4, 8 + d.length)), 8 + d.length); return b; };
function png(w, h, rgb) {
  const raw = Buffer.alloc((w * 3 + 1) * h); for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3); }
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ih), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
const p = makePage({ console: "silent", canvas: true });
p.run("TEST.calm = true; newWorld(7, 2); startExpedition('weather', 176); S.exp.fog = null; S.exp.storm = null; S.exp.pos = 176; enterPatch(); RT.caddy = { podHome: true };");
p.run("{ const P = S.exp.patch, lay = layout(P.key); P.x = lay.w - 2; P.y = lay.h >> 1; RT.pl = null; }");
const nk = p.run("String(S.exp.patch.key * 1 + 1)");
p.run(`S.exp.reach = S.exp.reach.filter(c => c !== ${nk}); S.exp.reach.push(${nk}); S.pods = [{ id: 'in', k: '${nk}', x: 1, y: S.exp.patch.y - 1, sp: 0, h: 1, g: 'grass', how: 'ground' }];`);
const hex = p.run("HEX");
const shot = name => {
  p.run("scr.px().fill(-1); NOW += 2000; drawPatch(NOW / 1000); drawEdgeCues();");
  const px = p.run("scr").px(), w = p.run("scr.width"), h = p.run("scr.height"), rgb = Buffer.alloc(w * h * 3);
  for (let i = 0; i < w * h; i++) { const c = hex[px[i]] || "#000000"; rgb[i * 3] = parseInt(c.slice(1, 3), 16); rgb[i * 3 + 1] = parseInt(c.slice(3, 5), 16); rgb[i * 3 + 2] = parseInt(c.slice(5, 7), 16); }
  writeFileSync(`${out}/${name}.png`, png(w, h, rgb));
};
shot("before");
p.run("callPlace();");
shot("after");
console.log("cue", JSON.stringify(p.run("FX.cue.finds")), "tabs", JSON.stringify(p.run("edgeTabs().map(t => ({ side: t.side, kind: t.kind }))")));

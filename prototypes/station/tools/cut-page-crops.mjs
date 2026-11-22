// Writes the crops her chapter places (reading-pictures.mjs pageScalePicture; station-match-5 and -6) as PNG files with a manifest (file, master, master sha, window, size), for the art director to sign as cut-of-signed.
//   node prototypes/station/tools/cut-page-crops.mjs <out dir>
// Files: page-round-<trait>-<low|mid|high>-72x72.png (the round portraits), page-card-<trait>-<look>-66x66.png (a set's square cards), page-lens-<chapter>-close-<d>x<d>.png (the close up's lens fill),
// page-lens-<trait>-copy<k>-<w>x<d>.png (each half of the two copies' lens), page-lens-<trait>-<look>-<d>x<d>.png (a set's carried look). The 64 px faces are the game's own files (mibi-face-*): listed in the manifest with their sha, not cut.
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decodePNG, encodePNG } from "../../ui/png.mjs";
import { resample } from "../src/layered-stand.mjs";
import { CROPS, cropPixels } from "../src/trait-crops.mjs";
import { closeOf } from "../src/page.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), masters = path.resolve(here, "../../ui/assets/masters/pods"), out = process.argv[2];
if (!out) { console.error("usage: cut-page-crops.mjs <out dir>"); process.exit(2); }
mkdirSync(out, { recursive: true });
const Z = JSON.parse(readFileSync(path.resolve(here, "../../ui/specs/station/pods.json"), "utf8")).regions.page.scale, manifest = [];
const sha = (b) => createHash("sha256").update(b).digest("hex"), load = (id) => { const buf = readFileSync(path.join(masters, id + ".png")), d = decodePNG(buf); return { src: { w: d.width, h: d.height, rgba: d.data }, sha: sha(buf) }; };
function cut(file, masterId, window, dw, dh, note) {
  const { src, sha: ms } = load(masterId), win = window.map(Math.round), px = cropPixels(src, win, dw, dh, resample), png = encodePNG(dw, dh, px.rgba);
  writeFileSync(path.join(out, file), png);
  manifest.push({ file, sha256: sha(png), master: masterId + ".png", masterSha256: ms, window: win, size: [dw, dh], note });
}
const END = ["low", "mid", "high"], k78 = 304 / 78, A = Z.sc.anchor, rr = (A.d / 2 - 2) * k78;
for (const [sid, k] of Object.entries(CROPS)) {
  for (const [trait, ms] of Object.entries(k.round ?? {})) ms.forEach((m, i) => cut(`page-round-${trait}-${END[i]}-72x72.png`, m, [152 - rr, 152 - rr, 2 * rr, 2 * rr], 72, 72, "the portrait disc: the whole master at 78 lp, the disc radius d/2 - 2 round its middle"));
  for (const [trait, c] of Object.entries(k.cards)) if (c.square) for (const [look, m] of Object.entries(c.masters)) cut(`page-card-${trait}-${look}-66x66.png`, m, c.squares?.[look] ?? c.square, 66, 66, "a set's card, inside its 2 lp rim");
  // the close up's lens: the master (painted stand) enlarged to zoomW, the disc d round the chapter's place
  const C = Z.close, half = ((C.d / 2) / C.zoomW) * 304;
  for (const chapter of ["coat"]) { const [fx, fy] = closeOf(sid, chapter); cut(`page-lens-${chapter}-close-${C.d}x${C.d}.png`, `mibi-adult-${sid}-304x312`, [fx * 304 - half, fy * 312 - half, 2 * half, 2 * half], C.d, C.d, "her close up's lens (brightness 1.3, contrast 1.06 in the picture)"); }
  // the two copies' lens: each half of the disc is one copy's master, enlarged to zoomW with its top left at (-63, -190) from the lens box
  const P = Z.copies, s = 304 / P.zoomW;
  for (const [trait, ms] of Object.entries(k.round ?? {})) for (const [i, m] of [[0, ms[0]], [1, ms[2]]]) cut(`page-lens-${trait}-copy${i}-${P.d / 2}x${P.d}.png`, m, [(i * (P.d / 2) + 63) * s, 190 * s, (P.d / 2) * s, P.d * s], P.d / 2, P.d, "one copy's half lens, the low (0) or high (1) end's master (brightness 1.35)");
  // a set's carried look in one lens: the look's master, its top left at (ox, oy) from the lens box
  const L = Z.set.lens, t = k.cards.markings; if (t) for (const [look, m] of Object.entries(t.masters)) if (look !== "plain") cut(`page-lens-markings-${look}-${L.d}x${L.d}.png`, m, [-L.ox * (304 / L.zoomW), -L.oy * (304 / L.zoomW), L.d * (304 / L.zoomW), L.d * (304 / L.zoomW)], L.d, L.d, "the carried look in the set's blue lens (brightness 1.35)");
}
const faces = readdirSync(masters).filter((f) => /^mibi-face-S01-.*-64x64\.png$/.test(f));
for (const f of faces) manifest.push({ file: f, sha256: sha(readFileSync(path.join(masters, f))), master: f, masterSha256: null, window: null, size: [64, 64], note: "the game's own 64 px face, placed at 34 and 28 lp (a pin, a card's kin): not cut here" });
writeFileSync(path.join(out, "manifest.json"), JSON.stringify(manifest, null, 1));
console.log(manifest.length + " entries in " + out);

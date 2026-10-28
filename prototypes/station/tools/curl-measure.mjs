// The sleepers' curl as the build measures it (T-20261018-235; the owner's full-size ruling): every placed curl master (mibi-<adult|juvenile>-SXX-curl-304x312) at the stand's scale, its drawn height, and from the tallest
// the keep-out of the whole's walk: a walker's tag (feetY + 16 to + 40) must stay above the sleepers' tag, whose top is footY − curlH − 32. A species with a layered stand is reduced by its stand's factor (home-props.mjs curlOfMibi composes it in
// the mibi's own looks; the master is its Pip look), every other by the factor its standing picture gets. Nothing here is a typed number but the spec's own: the bed's footY, the tag's offsets, the window's foot (its foot band, y 472)
// and the keep-out's left edge and width.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decodePNG } from "../../ui/png.mjs";
import { curlPicture, layeredStand, scaleOf, viewFigureHeight } from "../src/layered-stand.mjs";
import { loadStandLayersFs } from "./stand-layers-fs.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), ui = path.resolve(here, "../../ui");
export const VIVARIUM_JSON = path.join(ui, "specs/station/vivarium.json");
export function measureCurls() {
  loadStandLayersFs();
  const spec = JSON.parse(readFileSync(VIVARIUM_JSON, "utf8")), R = spec.regions, masters = JSON.parse(readFileSync(path.join(ui, "assets/masters/index.json"), "utf8")).masters, out = {};
  for (const [id, e] of Object.entries(masters)) { const m = /^mibi-(adult|juvenile)-(S\d{2})-curl-304x312$/.exec(id); if (!m) continue;
    const p = decodePNG(readFileSync(path.join(ui, "assets/masters", e.file))), slot = R.resident[m[1]], lay = layeredStand(m[2], m[1], [304, 312], "vivarium", "curl"), vh = viewFigureHeight(m[1], "vivarium");
    const f = lay ? scaleOf(lay) : vh && masters[`mibi-${m[1]}-${m[2]}-${slot[0]}x${slot[1]}`] ? slot[0] / 304 * vh / slot[1] : null, c = f && curlPicture({ w: p.width, h: p.height, rgba: () => new Uint8ClampedArray(p.data) }, m[2], m[1], f, "vivarium");
    if (c?.figure) out[id] = c.figure[3]; }
  return out;
}
// the keep-out rect [x, y, w, h] from the tallest curl: its left and width are the spec's, its top is the sleepers' tag top less the walker's tag, its foot the window's
export function keepOutOf(spec, curls = measureCurls()) {
  const R = spec.regions, H = Math.max(...Object.values(curls)), footY = R.bed.sleepers.footY, over = R.nameTag.over, walkerTag = R.nameTag.below + R.nameTag.h, foot = R.window.foot[1], [x, , w] = R.resident.walk.keepOut;
  const y = footY - H - over - walkerTag; return [x, y, w, foot - y];
}

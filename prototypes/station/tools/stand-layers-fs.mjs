// Loads the layered stands and the stand looks from disk for the Node logic process and the tests (the page loads them with masters.mjs loadStandLayers): the same index, the same checks.
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decodePNG } from "../../ui/png.mjs";
import { setStandLayers } from "../src/layered-stand.mjs";
import { setStandLooks } from "../src/looks.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
export const STANDS_DIR = path.resolve(here, "../../ui/assets/stands"), LOOKS_FILE = path.resolve(here, "../../ui/specs/station/stand-looks.json");
export function loadStandLayersFs(dir = STANDS_DIR) {
  const index = JSON.parse(readFileSync(path.join(dir, "index.json"), "utf8"));
  setStandLayers(index, (name) => {
    const e = index.files[name], buf = readFileSync(path.join(dir, e.file));
    if (createHash("sha256").update(buf).digest("hex") !== e.sha256) throw new Error(`stand layer ${name}: ${e.file} does not match the index`);
    const p = decodePNG(buf); if (p.width !== e.w || p.height !== e.h) throw new Error(`stand layer ${name}: ${e.file} is ${p.width}×${p.height}, the index says ${e.w}×${e.h}`);
    return { w: p.width, h: p.height, rgba: () => new Uint8ClampedArray(p.data) };
  });
  return index;
}
export const loadStandLooksFs = (file = LOOKS_FILE) => { const j = JSON.parse(readFileSync(file, "utf8")); setStandLooks(j); return j; };
export const unloadStands = () => { setStandLayers(null); setStandLooks(null); };

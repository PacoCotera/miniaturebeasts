// Loads the stand sizes table (ui/specs/station/stand-sizes.json: the views' figure boxes) from disk for the Node logic process and the tests, as the page does. No kind has a layered stand or a stand-looks table any more (release 21a):
// every kind is drawn from its painted stand by the runtime scan.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setStandLayers, setStandSizes } from "../src/layered-stand.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
export const SIZES_FILE = path.resolve(here, "../../ui/specs/station/stand-sizes.json");
export function loadStandSizesFs(file = SIZES_FILE) { const j = JSON.parse(readFileSync(file, "utf8")); setStandSizes(j); return j; }
export const unloadStands = () => { setStandLayers(null); setStandSizes(null); };

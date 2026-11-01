// Every outside path, in one block, relative to MB_HOME: the folder that holds this checkout (found from this module's own location) unless the environment names another.
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
export const MB_HOME = process.env.MB_HOME ?? path.resolve(here, "..", "..", "..", "..");
export const WORKBENCH = path.resolve(here, "..");
export const OUT = path.join(WORKBENCH, "out", "foundation");
export const RESULTS = path.join(MB_HOME, "iwq/results/T-20261030-shape/foundation/chunk1/fix4");
export const ART = path.join(MB_HOME, "mp/art/station-masters/pods/adult");
export const FLUFFY = path.join(MB_HOME, "iwq/results/T-20261030-fluffy");
export const MASTER = (id, size = 304) => path.join(ART, `mibi-adult-${id}-${{ 304: "304x312", 96: "96x88", 48: "48x48" }[size]}.png`);
export const HERE = here;

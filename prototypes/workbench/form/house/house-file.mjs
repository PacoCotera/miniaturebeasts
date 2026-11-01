// The node side of the house: read a house-N.json from disk and load it.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadHouse } from "./house.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
export const HOUSE_DIR = here;
export const loadHouseFile = (name = "house-1.json") => loadHouse(JSON.parse(readFileSync(path.isAbsolute(name) ? name : path.join(here, name), "utf8")));

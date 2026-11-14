// The SDF's own render of one specimen at the pinned commit, at 304, 96 and 48, for the mesh sheets to sit beside the master. Read only.
import { writeFileSync, mkdirSync } from "node:fs";
import { loadHouseFile } from "../../form/house/house-file.mjs";
import { loadSpecimens } from "../../foundation/specimens.mjs";
import { makeTile } from "../../foundation/sheets.mjs";
import { encodeRGBA } from "../../form/pngrgba.mjs";
const [id = "S01", outDir] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const house = loadHouseFile(), sp = loadSpecimens(house)[id];
const t = makeTile(house, sp, {});
for (const s of [304, 96, 48]) { const im = t.r[s]; writeFileSync(`${outDir}/sdf-${id}-${s}.png`, encodeRGBA({ width: im.width, height: im.height, data: im.data })); }
console.log("rendered", Object.keys(t.r), JSON.stringify(t.ms));

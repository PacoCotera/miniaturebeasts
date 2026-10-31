import { existsSync, readFileSync } from "node:fs";
import { decodePNG } from "../../framework/png.mjs";
import { maskOfAlpha, boxOf } from "../checks.mjs";
import { STANDS } from "../trial.mjs";
// the stand's height at 304, or a stand-in when the art is not on this machine
export const standHeightOf = (k) => { const f = `${STANDS[k]}-304x312.png`; if (!existsSync(f)) return 290; const b = boxOf(maskOfAlpha(decodePNG(readFileSync(f)))); return b.y1 - b.y0; };

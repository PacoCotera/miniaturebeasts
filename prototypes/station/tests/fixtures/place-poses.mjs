// Places every signed 304x312 mibi pose master of the repo (as the host does at start), so poseFor shows a habit's own pose in a unit test. Import for the side effect.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { placeMaster, assetEntry } from "../../../ui/assets.mjs";
import { decodePNG } from "../../../ui/png.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../ui/assets/masters"), M = JSON.parse(readFileSync(path.join(root, "index.json"), "utf8")).masters;
for (const [id, m] of Object.entries(M)) if (/^mibi-(adult|juvenile)-S\d\d-.*304x312$/.test(id) && !assetEntry(id)) {
  const im = decodePNG(readFileSync(path.join(root, m.file)));
  placeMaster({ id, w: m.w, h: m.h, file: m.file, hash: m.sha256, signed: "test", status: "master" }, { w: m.w, h: m.h, rgba: () => im.data });
}

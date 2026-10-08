// Loads the type atlases in Node (the tests, the checks): the metrics and the coverage PNGs from fonts/atlas.
import { readFileSync } from "node:fs";
import { decodePNG } from "./png.mjs";
import { TypeSet } from "./type.mjs";

export function loadTypeNode(dir = new URL("./fonts/atlas/", import.meta.url)) {
  const rd = (f) => readFileSync(new URL(f, dir));
  const index = JSON.parse(rd("index.json")), metrics = {}, images = {};
  for (const f of index.faces) { metrics[f.id] = JSON.parse(rd(f.metrics)); images[f.id] = decodePNG(rd(f.atlas)); }
  return new TypeSet(index, metrics, images);
}

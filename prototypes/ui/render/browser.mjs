// The page's boot for the layered renderer: the palette, the type metrics and the atlas PNGs fetched from the files
// beside it (nothing from the network but the page's own origin), the atlases decoded into canvases, one StationCanvas.
import { TypeSet } from "../type.mjs";
import { StationCanvas } from "./station-canvas.mjs";

export async function bootStationCanvas({ base = new URL("../", import.meta.url), w = 1024, h = 600 } = {}) {
  const json = async (p) => (await fetch(new URL(p, base), { cache: "no-store" })).json();
  const palette = await json("palettes/station.json"), index = await json("fonts/atlas/index.json"), metrics = {}, atlases = {};
  await Promise.all(index.faces.map(async (f) => {
    metrics[f.id] = await json("fonts/atlas/" + f.metrics);
    const bmp = await createImageBitmap(await (await fetch(new URL("fonts/atlas/" + f.atlas, base), { cache: "no-store" })).blob(), { premultiplyAlpha: "none", colorSpaceConversion: "none" });
    const cv = document.createElement("canvas"); cv.width = bmp.width; cv.height = bmp.height; cv.getContext("2d", { willReadFrequently: true }).drawImage(bmp, 0, 0); atlases[f.id] = cv;
  }));
  const type = new TypeSet(index, metrics);
  return { canvas: new StationCanvas({ w, h, palette, type, atlases }), type, palette };
}

import { digest } from "./evaluate.mjs";
import {
  commonGraphSourceCamera,
  drawGraphSource,
} from "./graph-source-presentation.mjs";

export function drawOcularScene(
  body,
  module,
  { camera = body?.bounds, size = 256 } = {},
) {
  const { moduleDigest, ...retained } = module ?? {};
  if (
    module?.status !== "constructed" ||
    module.profile?.id !== "ocular-module/1" ||
    digest(retained) !== moduleDigest ||
    module.bodyConstructionDigest !== body?.constructionDigest ||
    module.sourceResultDigest !== body?.sourceResultDigest
  )
    throw new Error("A verified matching body and ocular module are required.");
  const bodySvg = drawGraphSource(body, { camera, size });
  const scale = Math.min(
    (size - 40) / (camera.maximumX - camera.minimumX),
    (size - 40) / (camera.maximumY - camera.minimumY),
  );
  const offsetX =
    (size - (camera.maximumX - camera.minimumX) * scale) / 2 -
    camera.minimumX * scale;
  const offsetY =
    (size - (camera.maximumY - camera.minimumY) * scale) / 2 -
    camera.minimumY * scale;
  const oculars = module.features
    .map(
      (feature) =>
        `<g><circle cx="${feature.center[0]}" cy="${feature.center[1]}" r="${feature.radius}" fill="${feature.outerPalette}"/><circle cx="${feature.center[0]}" cy="${feature.center[1]}" r="${feature.pupilRadius}" fill="${feature.pupilPalette}"/></g>`,
    )
    .join("");
  return bodySvg.replace(
    "</svg>",
    `<g data-module="${moduleDigest}" transform="translate(${offsetX} ${offsetY}) scale(${scale})">${oculars}</g></svg>`,
  );
}

export function drawOcularComparison(cases, { size = 256 } = {}) {
  const camera = commonGraphSourceCamera(
    cases.map((item) => item.construction),
  );
  const scenes = cases
    .map(
      (item, index) =>
        `<g transform="translate(${index * size} 0)">${drawOcularScene(item.construction, item.module, { camera, size })}</g>`,
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${cases.length * size}" height="${size}" viewBox="0 0 ${cases.length * size} ${size}">${scenes}</svg>`;
}

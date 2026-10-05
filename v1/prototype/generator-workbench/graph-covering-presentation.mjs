import { digest } from "./evaluate.mjs";
import {
  commonGraphSourceCamera,
  drawGraphSource,
} from "./graph-source-presentation.mjs";

const pathFor = (polygon) =>
  `M ${polygon.map((point) => point.join(" ")).join(" L ")} Z`;

export const COVERING_INSPECTION_PRESENTATION = Object.freeze({
  id: "covering-inspection/1",
  edgeInk: "#b7c1c0",
  edgeScreenPixels: 0.85,
  meaning:
    "Neutral non-genetic inspection ink; not inherited pigment or finished game-art shading.",
});

export function drawBodyCoveringScene(
  body,
  ocular,
  covering,
  { camera = body?.bounds, size = 256 } = {},
) {
  const { coveringDigest, ...retained } = covering ?? {};
  const { moduleDigest, ...ocularRetained } = ocular ?? {};
  if (
    covering?.status !== "constructed" ||
    !["body-covering/1", "body-covering/2"].includes(covering.profile?.id) ||
    digest(retained) !== coveringDigest ||
    ocular?.status !== "constructed" ||
    ocular.profile?.id !==
      (covering.profile.id === "body-covering/2"
        ? "ocular-module/3"
        : "ocular-module/2") ||
    digest(ocularRetained) !== moduleDigest ||
    covering.ocularModuleDigest !== moduleDigest ||
    covering.bodyConstructionDigest !== body?.constructionDigest ||
    ocular.bodyConstructionDigest !== body?.constructionDigest ||
    covering.sourceResultDigest !== body?.sourceResultDigest ||
    ocular.sourceResultDigest !== body?.sourceResultDigest
  )
    throw new Error(
      "A verified matching body, ocular and covering scene is required.",
    );
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
  const plates = covering.plates
    .map(
      (plate) =>
        `<g>${plate.pigmentFragments.map((fragment) => `<path d="${pathFor(fragment.polygon)}" fill="${fragment.palette}"/>`).join("")}<path d="${pathFor(plate.outline)}" fill="none" stroke="${COVERING_INSPECTION_PRESENTATION.edgeInk}" stroke-width="${COVERING_INSPECTION_PRESENTATION.edgeScreenPixels}" vector-effect="non-scaling-stroke"/></g>`,
    )
    .join("");
  const features = ocular.features
    .map(
      (feature) =>
        `<g><circle cx="${feature.center[0]}" cy="${feature.center[1]}" r="${feature.radius}" fill="${feature.outerPalette}"/><circle cx="${feature.center[0]}" cy="${feature.center[1]}" r="${feature.pupilRadius}" fill="${feature.pupilPalette}"/></g>`,
    )
    .join("");
  return bodySvg.replace(
    "</svg>",
    `<g data-covering="${coveringDigest}" data-ocular="${moduleDigest}" data-inspection-presentation="${COVERING_INSPECTION_PRESENTATION.id}" transform="translate(${offsetX} ${offsetY}) scale(${scale})">${plates}${features}</g></svg>`,
  );
}

export function drawBodyCoveringComparison(cases, { size = 256 } = {}) {
  const camera = commonGraphSourceCamera(
    cases.map((item) => item.construction),
  );
  const cells = cases
    .map(
      (item, index) =>
        `<g transform="translate(${index * size} 0)">${drawBodyCoveringScene(item.construction, item.ocular, item.covering, { camera, size })}</g>`,
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${cases.length * size}" height="${size}" viewBox="0 0 ${cases.length * size} ${size}">${cells}</svg>`;
}

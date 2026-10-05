import { digest } from "./evaluate.mjs";

function verifyConstruction(construction) {
  if (
    construction?.status !== "constructed" ||
    construction.profile?.id !== "graph-radial/1"
  ) {
    throw new Error("A constructed graph-radial/1 source is required.");
  }
  const { constructionDigest, ...retained } = construction;
  if (digest(retained) !== constructionDigest)
    throw new Error("Construction digest mismatch.");
}
function validateCamera(camera) {
  const keys = ["minimumX", "maximumX", "minimumY", "maximumY"];
  if (!camera || !keys.every((key) => Number.isFinite(camera[key])))
    throw new Error("Finite camera bounds are required.");
  const width = camera.maximumX - camera.minimumX;
  const height = camera.maximumY - camera.minimumY;
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  )
    throw new Error("Finite positive camera extents are required.");
}
export function commonRadialSourceCamera(constructions) {
  if (!Array.isArray(constructions) || !constructions.length)
    throw new Error("At least one radial construction is required.");
  constructions.forEach(verifyConstruction);
  const camera = {
    minimumX: Math.min(...constructions.map((item) => item.bounds.minimumX)),
    maximumX: Math.max(...constructions.map((item) => item.bounds.maximumX)),
    minimumY: Math.min(...constructions.map((item) => item.bounds.minimumY)),
    maximumY: Math.max(...constructions.map((item) => item.bounds.maximumY)),
  };
  validateCamera(camera);
  return camera;
}
const number = (value) => Number(value.toFixed(9));
const pathFor = (points) =>
  `M ${points.map((point) => point.map(number).join(" ")).join(" L ")} Z`;

export function drawRadialGraphSource(construction, options = {}) {
  verifyConstruction(construction);
  if (
    !options ||
    typeof options !== "object" ||
    Array.isArray(options) ||
    Object.keys(options).some(
      (key) => !["camera", "size", "silhouette"].includes(key),
    )
  )
    throw new Error("Explicit supported presentation options are required.");
  const {
    camera = construction.bounds,
    size = 256,
    silhouette = false,
  } = options;
  validateCamera(camera);
  if (
    !Number.isInteger(size) ||
    size < 128 ||
    size > 2048 ||
    typeof silhouette !== "boolean"
  )
    throw new Error(
      "A bounded integer display size and boolean silhouette option are required.",
    );
  const margin = 20;
  const scale = Math.min(
    (size - 2 * margin) / (camera.maximumX - camera.minimumX),
    (size - 2 * margin) / (camera.maximumY - camera.minimumY),
  );
  const offsetX =
    (size - (camera.maximumX - camera.minimumX) * scale) / 2 -
    camera.minimumX * scale;
  const offsetY =
    (size - (camera.maximumY - camera.minimumY) * scale) / 2 -
    camera.minimumY * scale;
  if (![scale, offsetX, offsetY].every(Number.isFinite) || scale <= 0)
    throw new Error("Camera mapping exceeds finite display bounds.");
  const namespace = `graph-radial-${construction.constructionDigest.slice(0, 20)}-${silhouette ? "silhouette" : "colour"}`;
  const shapes = [construction.body, ...construction.appendages];
  const byId = new Map(shapes.map((shape) => [shape.id, shape]));
  const definitions = shapes
    .map(
      (shape) =>
        `<clipPath id="${namespace}-${shape.id}"><path d="${pathFor(shape.projectedOutline)}"/></clipPath>`,
    )
    .join("");
  let material = "";
  for (const surface of construction.surfaces) {
    const geometry = byId.get(surface.shapeId);
    const clip = `clip-path="url(#${namespace}-${geometry.id})"`;
    material += `<g ${clip}>`;
    for (const mask of surface.masks)
      material += `<path d="${pathFor(mask.outline)}" fill="${silhouette ? "#20282b" : surface.palette[mask.paletteIndex]}"/>`;
    if (!silhouette)
      for (const line of surface.textureLines)
        material += `<path d="M ${line[0].map(number).join(" ")} L ${line[1].map(number).join(" ")}" fill="none" stroke="#68777c" stroke-width="${0.5 / scale}"/>`;
    material += "</g>";
    if (!silhouette)
      material += `<path d="${pathFor(geometry.projectedOutline)}" fill="none" stroke="#48565a" stroke-width="${0.7 / scale}"/>`;
  }
  const roots = silhouette
    ? ""
    : construction.chainRoots
        .map(
          (root) =>
            `<circle cx="${number(root.projectedRoot[0])}" cy="${number(root.projectedRoot[1])}" r="${1.3 / scale}" fill="none" stroke="#e8dfbe" stroke-width="${0.7 / scale}"/>`,
        )
        .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><title>Radial XYZ source projected along X into YZ; inspection overlay, not physical depth sorting</title><desc>Body first; contacts and root rings exposed for inspection. Neutral outline, texture and root ink are not inherited pigment. Silhouette mode is a diagnostic pigment override only.</desc><rect width="${size}" height="${size}" fill="#f7f5ee"/><defs>${definitions}</defs><g transform="translate(${offsetX} ${offsetY}) scale(${scale})" data-world-scale="${scale}">${material}${roots}</g></svg>`;
}
export function drawRadialComparison(constructions, { size = 256 } = {}) {
  const camera = commonRadialSourceCamera(constructions);
  const rows = [false, true]
    .map((silhouette, row) =>
      constructions
        .map((construction, column) => {
          const svg = drawRadialGraphSource(construction, {
            camera,
            size,
            silhouette,
          }).replace("<svg ", `<svg x="${column * size}" y="${row * size}" `);
          return svg;
        })
        .join(""),
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size * constructions.length}" height="${size * 2}" viewBox="0 0 ${size * constructions.length} ${size * 2}"><title>Shared YZ camera: inherited colours above, diagnostic silhouettes below</title>${rows}</svg>`;
}

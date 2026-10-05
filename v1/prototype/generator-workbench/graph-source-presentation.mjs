import { digest } from "./evaluate.mjs";

const number = (value) => Number(value.toFixed(6));
const pathFor = (points) =>
  `M ${points.map((p) => p.map(number).join(" ")).join(" L ")} Z`;

export function commonGraphSourceCamera(constructions) {
  if (
    !Array.isArray(constructions) ||
    !constructions.length ||
    constructions.some((item) => item.status !== "constructed")
  )
    throw new Error(
      "A nonempty set of constructed sources is required for the shared camera.",
    );
  const camera = {
    minimumX: Math.min(...constructions.map((item) => item.bounds.minimumX)),
    maximumX: Math.max(...constructions.map((item) => item.bounds.maximumX)),
    minimumY: Math.min(...constructions.map((item) => item.bounds.minimumY)),
    maximumY: Math.max(...constructions.map((item) => item.bounds.maximumY)),
  };
  validateCamera(camera);
  return camera;
}

function validateCamera(camera) {
  const width = camera?.maximumX - camera?.minimumX;
  const height = camera?.maximumY - camera?.minimumY;
  if (
    !camera ||
    !Object.values(camera).every(Number.isFinite) ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  )
    throw new Error(
      "The source camera requires finite positive world extents.",
    );
}

export function drawGraphSource(
  construction,
  { camera = construction?.bounds, size = 256 } = {},
) {
  if (
    construction?.status !== "constructed" ||
    !["graph-source/1", "graph-source/2"].includes(construction.profile?.id)
  )
    throw new Error("An explicit graph-source/1 construction is required.");
  const { constructionDigest, ...retained } = construction;
  if (digest(retained) !== constructionDigest)
    throw new Error("Construction digest mismatch.");
  validateCamera(camera);
  if (!Number.isInteger(size) || size < 128 || size > 2048)
    throw new Error("A bounded integer reference size is required.");
  const margin = 20;
  const scale = Math.min(
    (size - margin * 2) / (camera.maximumX - camera.minimumX),
    (size - margin * 2) / (camera.maximumY - camera.minimumY),
  );
  const offsetX =
    (size - (camera.maximumX - camera.minimumX) * scale) / 2 -
    camera.minimumX * scale;
  const offsetY =
    (size - (camera.maximumY - camera.minimumY) * scale) / 2 -
    camera.minimumY * scale;
  if (![scale, offsetX, offsetY].every(Number.isFinite) || scale <= 0)
    throw new Error("Camera mapping is outside finite display bounds.");
  const namespace = `graph-source-${constructionDigest.slice(0, 20)}`;
  const body = construction.bodyExteriors[0];
  const geometries = new Map([
    [body.id, body],
    ...construction.appendages.map((item) => [item.id, item]),
  ]);
  const definitions = [];
  for (const geometry of geometries.values())
    definitions.push(
      `<clipPath id="${namespace}-${geometry.id}"><path d="${pathFor(geometry.outline)}"/></clipPath>`,
    );
  let fills = "";
  // Material fields are rendered once; no inter-station pigment blending occurs.
  const orderedSurfaces = construction.surfaces.toSorted(
    (a, b) =>
      Number(a.atlas.kind === "longitudinal-body-ownership") -
      Number(b.atlas.kind === "longitudinal-body-ownership"),
  );
  for (const surface of orderedSurfaces) {
    const geometry = geometries.get(surface.shapeId);
    const clip = `clip-path="url(#${namespace}-${geometry.id})"`;
    if (surface.atlas.kind === "longitudinal-body-ownership") {
      const { minimumX, maximumX, minimumY, maximumY } = surface.atlas;
      const width = maximumX - minimumX,
        height = maximumY - minimumY;
      fills += `<g ${clip}><rect x="${minimumX}" y="${minimumY}" width="${width}" height="${height}" fill="${surface.palette[0]}"/>`;
      if (surface.palette.length === 2)
        fills += `<rect x="${minimumX + width / 2}" y="${minimumY}" width="${width / 2}" height="${height}" fill="${surface.palette[1]}"/>`;
      fills += "</g>";
    } else {
      fills += `<path d="${pathFor(geometry.outline)}" fill="${surface.palette[0]}"/>`;
      if (surface.palette.length === 2) {
        const { origin, longitudinal, lateral } = surface.atlas.frame;
        const local = geometry.outline.map((p) => {
          const delta = p.map((value, index) => value - origin[index]);
          return [
            delta[0] * longitudinal[0] + delta[1] * longitudinal[1],
            delta[0] * lateral[0] + delta[1] * lateral[1],
          ];
        });
        const minimumU = Math.min(...local.map((p) => p[0])),
          maximumU = Math.max(...local.map((p) => p[0]));
        const minimumV = Math.min(...local.map((p) => p[1])),
          maximumV = Math.max(...local.map((p) => p[1]));
        const midU = (minimumU + maximumU) / 2;
        const angle =
          (Math.atan2(longitudinal[1], longitudinal[0]) * 180) / Math.PI;
        fills += `<g ${clip}><rect x="${midU}" y="${minimumV}" width="${maximumU - midU}" height="${maximumV - minimumV}" fill="${surface.palette[1]}" transform="translate(${origin.join(" ")}) rotate(${angle})"/></g>`;
      }
    }
  }
  const outlines = [...construction.appendages, body]
    .map(
      (geometry) =>
        `<path d="${pathFor(geometry.outline)}" fill="none" stroke="#273036" stroke-width="${number(1.2 / scale)}" stroke-linejoin="round"/>`,
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img"><title>Static XY graph-source construction proof; shared world scale</title><rect width="${size}" height="${size}" fill="#f7f5ee"/><defs>${definitions.join("")}</defs><g transform="translate(${number(offsetX)} ${number(offsetY)}) scale(${number(scale)})">${fills}${outlines}</g></svg>`;
}

export function drawGraphSourceComparison(constructions, { size = 256 } = {}) {
  const camera = commonGraphSourceCamera(constructions);
  const cells = constructions
    .map(
      (construction, index) =>
        `<g transform="translate(${index * size} 0)">${drawGraphSource(construction, { camera, size })}</g>`,
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size * constructions.length}" height="${size}" viewBox="0 0 ${size * constructions.length} ${size}"><title>Common-scale graph-source construction comparison</title>${cells}</svg>`;
}

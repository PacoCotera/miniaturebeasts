import { digest } from "./evaluate.mjs";
import { RADIAL_SCENE_VERSION } from "./radial-scene.mjs";

function verify(scene) {
  if (
    scene?.status !== "constructed" ||
    scene.profileVersion !== RADIAL_SCENE_VERSION
  )
    throw new Error("A constructed module-scene/3 is required.");
  const { sceneDigest, ...retained } = scene;
  if (digest(retained) !== sceneDigest)
    throw new Error("Radial scene digest mismatch.");
  for (const [object, key] of [
    [scene.body, "constructionDigest"],
    [scene.ocular, "moduleDigest"],
    [scene.covering, "coveringDigest"],
  ]) {
    const { [key]: identity, ...content } = object;
    if (digest(content) !== identity)
      throw new Error("Radial component digest mismatch.");
  }
  if (
    scene.ocular.bodyDigest !== scene.body.constructionDigest ||
    scene.covering.bodyDigest !== scene.body.constructionDigest ||
    scene.covering.ocularDigest !== scene.ocular.moduleDigest
  )
    throw new Error("Radial component binding mismatch.");
}
const number = (value) => Number(value.toFixed(9));
const pathFor = (points) =>
  `M ${points.map((point) => point.map(number).join(" ")).join(" L ")} Z`;
function cameraMapping(camera, size) {
  if (
    !camera ||
    !["minimumX", "maximumX", "minimumY", "maximumY"].every((key) =>
      Number.isFinite(camera[key]),
    )
  )
    throw new Error("Finite radial camera required.");
  const width = camera.maximumX - camera.minimumX,
    height = camera.maximumY - camera.minimumY;
  if (
    ![width, height].every(Number.isFinite) ||
    width <= 0 ||
    height <= 0 ||
    !Number.isInteger(size) ||
    size < 128 ||
    size > 2048
  )
    throw new Error("Positive finite radial display extents required.");
  const scale = Math.min((size - 40) / width, (size - 40) / height);
  const offsetX = (size - width * scale) / 2 - camera.minimumX * scale,
    offsetY = (size - height * scale) / 2 - camera.minimumY * scale;
  if (![scale, offsetX, offsetY].every(Number.isFinite) || scale <= 0)
    throw new Error("Radial camera mapping out of bounds.");
  return { scale, offsetX, offsetY };
}
export function drawRadialScene(
  scene,
  { camera = scene?.body?.bounds, size = 512 } = {},
) {
  verify(scene);
  const { scale, offsetX, offsetY } = cameraMapping(camera, size);
  const namespace = `radial-scene-${scene.sceneDigest.slice(0, 20)}`;
  const shapes = [scene.body.body, ...scene.body.appendages],
    byId = new Map(shapes.map((shape) => [shape.id, shape]));
  const clips = shapes
    .map(
      (shape) =>
        `<clipPath id="${namespace}-${shape.id}"><path d="${pathFor(shape.projectedOutline)}"/></clipPath>`,
    )
    .join("");
  let content = "";
  for (const surface of scene.body.surfaces) {
    const shape = byId.get(surface.shapeId);
    content += `<g clip-path="url(#${namespace}-${shape.id})">`;
    for (const mask of surface.masks)
      content += `<path d="${pathFor(mask.outline)}" fill="${surface.palette[mask.paletteIndex]}"/>`;
    for (const line of surface.textureLines)
      content += `<path d="M ${line[0].map(number).join(" ")} L ${line[1].map(number).join(" ")}" stroke="#68777c" fill="none" stroke-width="${0.5 / scale}"/>`;
    content += "</g>";
    content += `<path d="${pathFor(shape.projectedOutline)}" stroke="#48565a" fill="none" stroke-width="${0.7 / scale}"/>`;
  }
  const palette = scene.covering.field?.palette;
  for (const plate of scene.covering.plates.toSorted(
    (a, b) => b.rootXYZ[0] - a.rootXYZ[0],
  )) {
    for (const fragment of plate.visibleFragments)
      content += `<path d="${pathFor(fragment.projectedOutline)}" fill="${palette[fragment.paletteIndex]}"/>`;
    if (plate.visibleOutline.length >= 3)
      content += `<path d="${pathFor(plate.visibleOutline)}" fill="none" stroke="#a8b1ad" stroke-width="${0.85 / scale}"/>`;
  }
  for (const feature of scene.ocular.features) {
    const [y, z] = feature.projectedCenter;
    content += `<circle cx="${number(y)}" cy="${number(z)}" r="${feature.radius}" fill="${feature.outerPigment}"/><circle cx="${number(y)}" cy="${number(z)}" r="${feature.pupilRadius}" fill="${feature.pupilPigment}"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><title>Radial source reference, negative-X YZ view</title><desc>Contacts over body and ocular slice over material are explicit diagnostic compositing conventions. Only front scale fragments are shown; no physical exterior-eye or finished-art claim.</desc><rect width="${size}" height="${size}" fill="#f7f5ee"/><defs>${clips}</defs><g transform="translate(${offsetX} ${offsetY}) scale(${scale})" data-world-scale="${scale}">${content}</g></svg>`;
}
export function radialDepthInspector(scene) {
  verify(scene);
  const { center, halfAxes } = scene.body.body;
  const left = 20,
    right = 280,
    scale = (right - left) / (2 * halfAxes[0]);
  const x = (value) => left + (value - (center[0] - halfAxes[0])) * scale;
  const field = scene.covering.field,
    plane = scene.ocular.plane;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="120" viewBox="0 0 300 120"><rect width="300" height="120" fill="#f7f5ee"/><title>Separate longitudinal depth inspection, not the creature attachment</title><desc>X positions use inherited world coordinates; vertical diagram layout is schematic and not anatomical scale.</desc><ellipse cx="150" cy="45" rx="130" ry="27" fill="#e5e8e4" stroke="#6d7979"/>${field ? `<rect x="${x(field.xRange[0])}" y="78" width="${(field.xRange[1] - field.xRange[0]) * scale}" height="7" fill="#809e9c"/>` : ""}${plane ? `<line x1="${x(plane.x)}" y1="13" x2="${x(plane.x)}" y2="76" stroke="#425967"/>` : ""}<line x1="150" y1="13" x2="150" y2="90" stroke="#9ca5a0" stroke-dasharray="3 3"/><text x="20" y="108" font-size="10" fill="#425052">X depth: negative front; ${scene.covering.visibleCount} visible / ${scene.covering.plates.length} total plates</text></svg>`;
}
export function radialSceneReference(scene) {
  verify(scene);
  const camera = scene.body.bounds,
    size = 512;
  const mapping = cameraMapping(camera, size);
  const svg = drawRadialScene(scene, { camera, size });
  return {
    status: "constructed",
    profileVersion: scene.profileVersion,
    sceneDigest: scene.sceneDigest,
    svg,
    svgDigest: digest(svg),
    camera,
    size,
    mapping,
    view: "Orthographic YZ from negative X; inherited X retained as depth. Diagnostic ocular slice is not exterior tissue.",
    depthInspector: radialDepthInspector(scene),
  };
}
export function describeRadialScene(scene) {
  verify(scene);
  const dimensions = scene.body.body.sourceDimensions;
  const eye = scene.ocular.enabled
    ? `Two cream circular eye modules of diameter ${Number((((2 * scene.ocular.plane.radius) / dimensions[1]) * 100).toFixed(1))}% of body width occupy a YZ slice at retained X ${Number(scene.ocular.plane.x.toFixed(3))}; this is not an exterior attachment.`
    : "Ocular presence is OFF; carried placement/size produce no eye geometry.";
  const covering =
    scene.covering.kind === "skin"
      ? "Bare skin; extent/scale are carried and inactive."
      : `An inherited longitudinal field from ${scene.covering.field.interval.map((value) => Math.round(value * 100)).join(" to ")}% of X carries ${scene.covering.plates.length} rounded plates (${scene.covering.visibleCount} with visible front fragments, ${scene.covering.hiddenCount} hidden behind the body). Plate half-width is ${Number(((scene.covering.field.halfWidth / dimensions[1]) * 100).toFixed(1))}% of body width. Ordered body-Y pigments continue across each plate.`;
  const palette = scene.body.surfaces[0].palette;
  const pigment =
    palette.length === 1
      ? `Every owning body/contact surface is uniformly ${palette[0]}.`
      : `Body low-Y/high-Y fields retain ${palette[0]} / ${palette[1]}; each contact keeps its own ordered root/tip fields in those colours.`;
  return `One radial ellipsoid has width ${dimensions[1]}, height ${dimensions[2]} and longitudinal depth ${dimensions[0]}. Three actual contact chains retain source XYZ directions and exact segment lengths; the reference looks along negative X into YZ. ${eye} ${pigment} ${covering}`;
}

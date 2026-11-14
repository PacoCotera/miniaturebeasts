// The structural sketch (art-pipeline.md stage 1): one body, rendered deterministically to the
// views and passes the generation stage consumes. Same genome, same bytes.
//
// One camera rig per species: the camera is fitted once to the species' type specimen (per view
// and size) and reused for every individual, so individuals keep their relative size and sit in
// the same place in the frame. A body that overflows that frame is clipped and flagged in the
// manifest, never rescaled.
import { buildIndividual, typeSpecimen, genomeDigest, brief , FRAME_VERSION} from "../framework/species.mjs";
import { render, fitCamera, resolveCamera, SCALES, VIEWS, markingFields, slotLegend } from "../framework/raster.mjs";

export const SKETCHER_VERSION = "mb-sketch/1";
export const TURNAROUND = ["front", "side", "three-quarter", "top", "portrait"]; // portrait: the front quarter, the plain renderer's main view
// Companion: the 48 px tile and the 280×300 subject. Station: 300×310 and a larger 600×620.
export const SIZES = { tile: SCALES.tile, companion: SCALES.companion, station: SCALES.station, large: SCALES.large };
const MARGIN = 0.14;

// Fixed cameras for a species, from its type specimen.
export function speciesCameras(frame) {
  const specimen = buildIndividual(frame, typeSpecimen(frame)).scene;
  const cameras = {};
  for (const view of Object.keys(VIEWS)) {
    cameras[view] = {};
    for (const [name, size] of Object.entries(SIZES)) cameras[view][name] = { ...fitCamera(specimen, view, size, MARGIN), fixed: true };
  }
  return cameras;
}

// One camera rig for the whole registry: fitted to the union of every species' type specimen, so
// size classes show (a small S03 is small beside a large S07) and every species sits on the same
// ground line. The page and the CLI use this by default; speciesCameras is the per-species fit.
export function registryCameras(frames) {
  const specimens = frames.map((f) => buildIndividual(f, typeSpecimen(f)).scene);
  const cameras = {};
  for (const view of Object.keys(VIEWS)) {
    cameras[view] = {};
    for (const [name, size] of Object.entries(SIZES)) {
      // The 48 px token fills its tile for every species (the field keeps one tile size); the
      // Companion and Station subjects share the scale that fits the longest body, each body
      // centred in its own frame, so size classes show.
      if (name === "tile") { cameras[view][name] = { view, scale: null, center: null, size, margin: 0.04, fixed: true, shared: true }; continue; }
      const scale = Math.min(...specimens.map((s) => fitCamera(s, view, size, MARGIN).scale));
      cameras[view][name] = { view, scale, center: null, size, fixed: true, shared: true };
    }
  }
  return cameras;
}

// Does this body fit the fixed camera? (Checked on the mesh bounds; a clipped sketch is flagged.)
function clipped(scene, camera) {
  const view = VIEWS[camera.view];
  const [W, H] = camera.size;
  camera = resolveCamera(scene, camera);
  for (const node of scene.nodes) for (const p of node.mesh.vertices) {
    const x = W / 2 + (p[0] * view.right[0] + p[1] * view.right[1] + p[2] * view.right[2] - camera.center[0]) * camera.scale;
    const y = H / 2 - (p[0] * view.up[0] + p[1] * view.up[1] + p[2] * view.up[2] - camera.center[1]) * camera.scale;
    if (x < 0 || x >= W || y < 0 || y >= H) return true;
  }
  return false;
}

// Every image of one individual: {key, pass, view, size:[w,h], image, field?}. `which` narrows the
// set (the page renders fewer, the cache stage all).
export function sketchIndividual(frame, genome, { cameras = speciesCameras(frame), which = null } = {}) {
  const built = buildIndividual(frame, genome);
  if (built.validation.status !== "valid") return { status: "rejected", problems: built.validation.problems, built };
  const scene = built.scene;
  const images = [];
  const want = (pass, view, size) => !which || which({ pass, view, size });
  const add = (pass, view, sizeName, options = {}) => {
    if (!want(pass, view, sizeName)) return;
    const camera = cameras[view][sizeName];
    const image = render(scene, camera, pass, options);
    images.push({ key: `${pass}${options.field ? "-" + options.field : ""}.${view}.${sizeName}`, pass, field: options.field ?? null, view, size: camera.size, image, clipped: clipped(scene, camera) });
  };
  for (const view of TURNAROUND) for (const sizeName of ["companion", "station", "large"]) {
    add("shaded", view, sizeName);
    add("slots", view, sizeName);
    add("index", view, sizeName);
    for (const field of markingFields(scene)) add("markings", view, sizeName, { field });
  }
  for (const view of TURNAROUND) for (const sizeName of ["tile", "companion", "station"]) add("silhouette", view, sizeName);
  add("shaded", "three-quarter", "tile");
  return { status: "sketched", built, images, legend: slotLegend(scene), fields: markingFields(scene), caption: brief(scene, frame), genomeDigest: genomeDigest(genome) };
}

// The cache manifest, in the shape art-pipeline.md §3 describes (one manifest per artefact:
// level, id, version, genome and frameVersion, sketch hash and sketcher version, outputs with
// hashes and sizes, licence). Hashes are supplied by the caller (Node has sha256; a browser may
// leave them null and the Node export fills them).
export function manifest(frame, genome, sketch, hashes = {}, extra = {}) {
  return {
    schemaVersion: 1, level: genome.origin?.kind === "type-specimen" ? "species" : "individual",
    id: genome.origin?.kind === "type-specimen" ? frame.species.id : sketch.genomeDigest,
    version: 1, species: frame.species.id, clan: frame.taxonomy.clan, plan: frame.plan.code, rig: frame.plan.rig,
    genome: genome.loci, genomeDigest: sketch.genomeDigest, frameVersion: FRAME_VERSION, catalogue: frame.catalogue,
    sketch: { sketcherVersion: SKETCHER_VERSION, hash: hashes.sketch ?? null, caption: sketch.caption, views: TURNAROUND, sizes: SIZES, slots: sketch.legend, markingFields: sketch.fields, bounds: sketch.built.scene.bounds, states: frame.plan.states ?? frame.taxonomy.states },
    outputs: sketch.images.map((im) => ({ file: `${im.key}.png`, pass: im.pass, field: im.field, view: im.view, size: im.size, sha256: hashes[im.key] ?? null, clipped: im.clipped })),
    prompt: null, references: [], model: null, critique: null, signoff: null, supersedes: null,
    licence: "CC-BY-SA-4.0 (project-held rights); deterministic render, not a generated image",
    generated: false, ...extra,
  };
}

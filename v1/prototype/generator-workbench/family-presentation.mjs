const escape = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll('"', "&quot;");
const rounded = (value) => Number(value.toFixed(6));
export const SURFACE_DETAIL_PROJECTION_VERSION = "surface-detail/1";
export function validateDisplayProjection(version) {
  if (version !== undefined && version !== SURFACE_DETAIL_PROJECTION_VERSION)
    throw new Error("Unsupported diagnostic display projection version.");
  return version === SURFACE_DETAIL_PROJECTION_VERSION;
}
export function diagnosticGraphNamespace(graph) {
  let hash = 2166136261;
  for (const character of JSON.stringify(graph))
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return `continuous-${(hash >>> 0).toString(16)}`;
}

export function drawContinuousFamily(
  result,
  selected = null,
  viewOptions = {},
) {
  const surfaceDetails = validateDisplayProjection(
    viewOptions.projectionVersion,
  );
  const graph = result.graph;
  if (
    result.status !== "resolved" ||
    !graph.exterior?.points ||
    !["continuous-static/1", "continuous-pet/1"].includes(graph.profile?.id)
  )
    throw new Error("Resolved continuous-static geometry required.");
  // One versioned world camera preserves proportion differences across relatives.
  const camera = viewOptions.camera ?? graph.profile.referenceCamera;
  if (
    !Array.isArray(camera) ||
    camera.length !== 4 ||
    !camera.every(Number.isFinite) ||
    camera[1] <= camera[0] ||
    camera[3] <= camera[2]
  )
    throw new Error("Display camera requires finite positive bounds.");
  const [minX, maxX, minY, maxY] = camera;
  const horizontalSpan = maxX - minX;
  const verticalSpan = maxY - minY;
  if (![horizontalSpan, verticalSpan].every(Number.isFinite))
    throw new Error("Display camera requires finite positive bounds.");
  const portrait =
    viewOptions.portrait ?? graph.profile.id === "continuous-pet/1";
  const scale = portrait
    ? Math.min(456 / horizontalSpan, 880 / verticalSpan)
    : Math.min(880 / horizontalSpan, 456 / verticalSpan);
  const offsetX = (1024 - scale * (minX + maxX)) / 2;
  const offsetY = (600 - scale * (minY + maxY)) / 2;
  if (
    !Number.isFinite(scale) ||
    scale <= 0 ||
    ![offsetX, offsetY].every(Number.isFinite)
  )
    throw new Error("Display camera requires finite positive bounds.");
  const point = ([x, y]) => [
    rounded(offsetX + x * scale),
    rounded(offsetY + y * scale),
  ];
  const polygon = (points) =>
    `<path d="${points.map((position, index) => `${index ? "L" : "M"}${point(position).join(",")}`).join(" ")}Z"/>`;
  const prefix = `${diagnosticGraphNamespace(graph)}${surfaceDetails ? "-surface-detail-1" : ""}`;
  let definitions = "";
  let shapes = "";
  const bodySurface = graph.surfaces.find(
    (surface) => surface.nodeId === "volume-0",
  );
  function paint(id, outline, surface, sources) {
    const clip = `${prefix}-${id}`;
    definitions += `<clipPath id="${clip}">${outline}</clipPath>`;
    const { bounds } = surface.atlas;
    const [x, y] = point([bounds.minimumX, bounds.minimumY]);
    const width = (bounds.maximumX - bounds.minimumX) * scale;
    const height = (bounds.maximumY - bounds.minimumY) * scale;
    const highlighted = selected && sources.includes(selected);
    const primary = sources[0];
    shapes += `<g data-region="${id}" data-locus="${escape(primary)}"><g clip-path="url(#${clip})"><rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${surface.palette[0]}"/>`;
    if (surface.palette.length === 2)
      shapes += `<rect x="${x + width / 2}" y="${y}" width="${width / 2}" height="${height}" fill="${surface.palette[1]}"/>`;
    if (id === "continuous-body" && graph.covering.kind === "scales") {
      const selectedCovering =
        selected && graph.covering.sources.includes(selected);
      for (const plate of graph.covering.plates) {
        const plateClip = `${prefix}-${plate.id}`;
        const plateOutline = polygon(plate.points);
        definitions += `<clipPath id="${plateClip}">${plateOutline}</clipPath>`;
        shapes += `<g data-plate="${plate.id}" data-locus="${escape(graph.covering.sources[0])}"><g clip-path="url(#${plateClip})"><rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${surface.palette[0]}"/>`;
        if (surface.palette.length === 2)
          shapes += `<rect data-mask="body-high-u" x="${x + width / 2}" y="${y}" width="${width / 2}" height="${height}" fill="${surface.palette[1]}"/>`;
        shapes += `</g><g fill="none" stroke="${selectedCovering ? "#d78932" : "#52625c"}" stroke-width="${selectedCovering ? 2.5 : 1}">${plateOutline}</g></g>`;
      }
    }
    for (const [index, mark] of surface.markings.entries()) {
      const mx = x + mark.u * width;
      const my = y + mark.v * height;
      const size = mark.scale * width;
      const pigment = graph.profile.markingPigment;
      if (
        mark.layout === "bands" ||
        (mark.layout === "bands-and-patches" && index % 2 === 0)
      )
        shapes += `<rect x="${mx - size / 2}" y="${my - height / 2}" width="${size}" height="${height}" fill="${pigment}" opacity="${mark.contrast}" transform="rotate(${(mark.orientation * 180) / Math.PI},${mx},${my})"/>`;
      else
        shapes += `<ellipse cx="${mx}" cy="${my}" rx="${size}" ry="${size * 0.6}" fill="${pigment}" opacity="${mark.contrast}"${surfaceDetails ? ` transform="rotate(${(mark.orientation * 180) / Math.PI},${mx},${my})"` : ""}/>`;
    }
    if (surfaceDetails && surface.texture === "fine-ridged") {
      // Atlas-local diagnostic ridge strokes stay inside this surface's clip;
      // their neutral contrast depicts texture rather than adding pigment loci.
      for (let index = 1; index < 5; index++) {
        const ridgeX = x + (index * width) / 5;
        shapes += `<line data-texture="fine-ridged" x1="${ridgeX}" y1="${y}" x2="${ridgeX}" y2="${y + height}" stroke="#52625c" opacity=".25"/>`;
      }
    }
    shapes += `</g><g fill="none" stroke="${highlighted ? "#d78932" : "#384d4c"}" stroke-width="${highlighted ? 4 : 1.5}">${outline}</g></g>`;
  }
  // Rooted polygons share the solved body boundary; ordinary view has no graph lines.
  paint("continuous-body", polygon(graph.exterior.points), bodySurface, [
    ...graph.exterior.sources,
    ...bodySurface.sources,
  ]);
  for (const element of graph.covering.elements ?? []) {
    const highlight = selected && graph.covering.sources.includes(selected);
    const stroke = highlight ? "#d78932" : "#52625c";
    const geometry = element.geometry;
    const paths = geometry.filaments ?? geometry.vanes;
    shapes += `<g data-element="${element.id}" data-locus="${escape(graph.covering.sources[0])}" fill="${element.pigment}" stroke="${stroke}" stroke-width="${highlight ? 2.5 : 1}">${paths.map(polygon).join("")}`;
    if (geometry.shaft) {
      const [a, b] = geometry.shaft.map(point);
      shapes += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke-width="1.5"/>`;
    }
    for (const barb of geometry.barbs ?? []) {
      const [a, b] = barb.map(point);
      shapes += `<line data-barb="true" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke-width="1"/>`;
    }
    shapes += "</g>";
  }
  for (const node of graph.nodes.filter((node) => node.shape)) {
    const surface = graph.surfaces.find((item) => item.nodeId === node.id);
    let outline;
    if (node.shape.kind === "polygon") outline = polygon(node.shape.points);
    else {
      const [x, y] = point(node.shape.center);
      outline = `<ellipse cx="${x}" cy="${y}" rx="${node.shape.radii[0] * scale}" ry="${node.shape.radii[1] * scale}"/>`;
    }
    paint(node.id, outline, surface, [...node.sources, ...surface.sources]);
    if (node.role === "ocular") {
      const [x, y] = point(node.shape.center);
      const pupil = node.shape.components.find(
        (component) => component.kind === "pupil-circle",
      );
      shapes += `<circle data-component="${node.id}-pupil" cx="${x}" cy="${y}" r="${pupil.radius * scale}" fill="${pupil.pigment}"/>`;
      const reflection = node.shape.components.find(
        (component) => component.kind === "reflection-circle",
      );
      if (reflection)
        shapes += `<circle data-component="${node.id}-reflection" cx="${x + reflection.offset[0] * scale}" cy="${y + reflection.offset[1] * scale}" r="${reflection.radius * scale}" fill="${reflection.pigment}"/>`;
    }
  }
  if (selected) {
    for (const anchor of graph.rootAnchors.filter((anchor) =>
      anchor.sources.includes(selected),
    )) {
      const [x, y] = point(anchor.position);
      shapes += `<circle cx="${x}" cy="${y}" r="5" fill="none" stroke="#d78932" stroke-width="2"/>`;
    }
    for (const node of graph.nodes.filter(
      (node) => node.role === "tissue-join" && node.sources.includes(selected),
    )) {
      const [x, y] = point(node.position);
      shapes += `<line x1="${x}" x2="${x}" y1="${y - (node.dimensions[1] * scale) / 2}" y2="${y + (node.dimensions[1] * scale) / 2}" stroke="#d78932" stroke-width="2"/>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="600" viewBox="0 0 1024 600" role="img" aria-label="Genome-derived continuous static creature"${surfaceDetails ? ` data-projection="${SURFACE_DETAIL_PROJECTION_VERSION}"` : ""}><defs>${definitions}</defs><rect width="1024" height="600" fill="#ffffff"/>${portrait ? `<g data-view="pageX=-Y,pageY=X" transform="translate(512,300) rotate(90) translate(-512,-300)">${shapes}</g>` : shapes}</svg>`;
}

export function continuousReference(result, identity) {
  return {
    status: "available",
    svg: drawContinuousFamily(result, null, { portrait: false }),
    manifest: {
      schemaVersion: "critter-continuous-reference/1",
      identity: structuredClone(identity),
      counts: {
        volumes: result.graph.nodes.filter((node) => node.role === "volume")
          .length,
        fins: result.graph.rootAnchors.length,
        edges: result.graph.edges.length,
      },
      projection: {
        type: "orthographic XY",
        width: 1024,
        height: 600,
        referenceCamera: result.graph.profile.referenceCamera,
        sharedAcrossProfile: true,
      },
      profile: structuredClone(result.graph.profile),
      exterior: structuredClone(result.graph.exterior),
      nodes: structuredClone(result.graph.nodes),
      edges: structuredClone(result.graph.edges),
      rootAnchors: structuredClone(result.graph.rootAnchors),
      surfaces: structuredClone(result.graph.surfaces),
      covering: structuredClone(result.graph.covering),
      masks:
        result.graph.profile.id === "continuous-pet/1"
          ? "Body/scales use continuous local-u masks. Each fur/feather element retains the pigment of its root local-u; contour extent is not body-clipped."
          : "palette0 local-u<0.5; palette1 local-u>=0.5 clipped to solved outlines; coordinate halves need not have equal physical area",
      limitations: [
        ...result.limitations,
        "Unshaded flat pigment reference; highlight overlays are inspection only.",
      ],
    },
  };
}

export function describeContinuousFamily(result) {
  const graph = result.graph;
  const count = (role) =>
    graph.nodes.filter((node) => node.role === role).length;
  const bodyPalette = graph.surfaces.find(
    (surface) => surface.nodeId === "volume-0",
  ).palette;
  const finPalette = graph.surfaces.find(
    (surface) => surface.region === "fin",
  ).palette;
  if (graph.profile.id === "continuous-pet/1") {
    const elements = graph.covering.elements ?? [];
    const fact = (id) => result.facts.find((item) => item.id === id)?.value;
    const material =
      graph.covering.kind === "skin"
        ? "bare skin"
        : graph.covering.kind === "scales"
          ? `${graph.covering.plates.length} overlapping scale plates`
          : graph.covering.kind === "fur"
            ? `${elements.length} rooted tufts with ${elements.flatMap((element) => element.geometry.filaments).length} tapered filaments`
            : `${elements.length} feathers with ${elements.length} shafts, ${elements.flatMap((element) => element.geometry.vanes).length} paired vanes and ${elements.flatMap((element) => element.geometry.barbs).length} oblique barb divisions`;
    const ocular = graph.nodes.find((node) => node.role === "ocular");
    return `A continuous bilateral body joins ${count("volume")} stations through ${count("tissue-join")} necks, with leading-width ratio ${fact("leadingWidthRatio")} relative to its neighbor. ${count("fin")} retained leaf-shaped fins root on that solved exterior; ${count("ocular")} ocular features and ${count("oral-aperture")} posterior oral aperture(s) are present. ${ocular ? `Each ocular radius is ${ocular.shape.radii[0]}, resolved from size ratio ${fact("ocularSize")}; lateral separation ratio is ${fact("ocularSeparation")} and pupil-to-ocular radius ratio is ${fact("pupilRatio")}.` : "Ocular geometry is absent; inherited ocular parameters remain inactive."} Body pigments ${bodyPalette.join("/")} and fin pigments ${finPalette.join("/")} accompany ${material}; rooted fur/feather elements inherit their root-local pigment while skin/scales use continuous masks. Supported fictional analytic media: ${
      result.motion
        .filter((item) => item.status === "supported")
        .map((item) => item.medium)
        .join(", ") || "none"
    }; sensing, nutrition, physical motion and pet behavior are not established.`;
  }
  return `A continuous bilateral body joins ${count("volume")} cross-section stations through ${count("tissue-join")} inherited necks. ${count("fin")} tapered fins root on its solved exterior; ${count("ocular")} ocular features and ${count("oral-aperture")} oral aperture(s) are present. Body pigments are ${bodyPalette.join("/")}; fin pigments are ${finPalette.join("/")}, with ${result.realization.markings.length} retained marking(s) and ${graph.covering.kind === "scales" ? `${graph.covering.plates.length} actual overlapping scale plates` : graph.covering.elements ? `${graph.covering.elements.length} rooted ${graph.covering.kind} elements` : "skin covering"}. Supported fictional analytic media: ${
    result.motion
      .filter((motion) => motion.status === "supported")
      .map((motion) => motion.medium)
      .join(", ") || "none"
  }. Static geometry does not establish sensing, nutrition, physical motion or pet behavior.`;
}

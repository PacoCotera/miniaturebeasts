const escape = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
import {
  drawContinuousFamily,
  validateDisplayProjection,
  SURFACE_DETAIL_PROJECTION_VERSION,
  diagnosticGraphNamespace,
} from "./family-presentation.mjs";

// Presentation consumes resolved graph/surface records; it never reads allele copies.
export function describeAuthoringCreature(result) {
  if (result?.status !== "resolved" || !result.graph?.nodes.length)
    throw new Error("Resolved constructed graph required for description.");
  const { nodes, edges, surfaces } = result.graph;
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const count = (role) => nodes.filter((node) => node.role === role).length;
  const roots = edges.filter(
    (edge) =>
      byId.get(edge.from)?.role === "volume" &&
      byId.get(edge.to)?.role !== "volume",
  );
  const chains = roots.filter((edge) => edge.role === "hinge").length;
  const palettes = [...new Set(surfaces.flatMap((surface) => surface.palette))];
  const textures = [...new Set(surfaces.map((surface) => surface.texture))];
  const markings = surfaces.reduce(
    (total, surface) => total + surface.markings.length,
    0,
  );
  const symmetry = result.facts.find((fact) => fact.id === "symmetry")?.value;
  const supported = result.motion.filter(
    (motion) => motion.status === "supported",
  );
  const active =
    supported.find((motion) => motion.activeInContext)?.medium ?? "none";
  return [
    `The construction has ${count("volume")} connected body volume(s) with ${symmetry} organization.`,
    `It contains ${chains} articulated limb chain(s), ${count("link") + count("contact-link")} limb segment(s), ${count("contact-link")} terminal contact(s), ${count("membrane")} membrane(s) and ${count("fin")} fin(s), rooted across ${new Set(roots.map((edge) => edge.from)).size} body volume(s).`,
    `Its ${surfaces.length} surface region(s) use palette values ${palettes.join(", ")} and ${textures.join(", ")} texture, with ${markings ? `${markings} resolved marking(s)` : "no expressed markings"}.`,
    `Supported fictional analytic movement channels: ${supported.map((motion) => motion.medium).join(", ") || "none"}; active medium in this context: ${active}; physical motion is unvalidated.`,
    "Facial structures are not modeled; sensing, lifetime state, learning and nutrition remain unmodeled.",
  ].join(" ");
}

export function drawAuthoringCreature(
  result,
  selected = null,
  viewOptions = {},
) {
  const surfaceDetails = validateDisplayProjection(
    viewOptions.projectionVersion,
  );
  if (
    ["continuous-static/1", "continuous-pet/1"].includes(
      result?.graph?.profile?.id,
    )
  )
    return drawContinuousFamily(result, selected, viewOptions);
  if (result?.status !== "resolved" || !result.graph?.nodes.length)
    throw new Error("Resolved constructed graph required.");
  const nodes = result.graph.nodes;
  const clipPrefix = surfaceDetails
    ? `${diagnosticGraphNamespace(result.graph)}-surface-detail-1-`
    : "";
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const projected = (node) => [
    node.position[0],
    node.position[1] + node.position[2] * 0.3,
  ];
  const extents = nodes.map((node) => ({
    point: projected(node),
    width: node.dimensions[0],
    height: Math.max(node.dimensions[1], node.dimensions[2]),
  }));
  const minimumX = Math.min(
    ...extents.map(({ point, width }) => point[0] - width / 2),
  );
  const maximumX = Math.max(
    ...extents.map(({ point, width }) => point[0] + width / 2),
  );
  const minimumY = Math.min(
    ...extents.map(({ point, height }) => point[1] - height / 2),
  );
  const maximumY = Math.max(
    ...extents.map(({ point, height }) => point[1] + height / 2),
  );
  const scale = Math.min(
    500 / (maximumX - minimumX),
    245 / (maximumY - minimumY),
  );
  const position = (node) => {
    const [x, y] = projected(node);
    return [60 + (x - minimumX) * scale, 45 + (y - minimumY) * scale];
  };
  let body = '<rect width="620" height="350" rx="12" fill="#17262c"/>';
  for (const edge of result.graph.edges) {
    const [x1, y1] = position(byId.get(edge.from));
    const [x2, y2] = position(byId.get(edge.to));
    body += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#9cacac" stroke-width="3"/>`;
  }
  // Draw surfaces on the same graph coordinates, with clips attached to each node.
  for (const node of [...nodes].sort(
    (a, b) => (a.role === "volume") - (b.role === "volume"),
  )) {
    const [x, y] = position(node);
    const width = Math.max(5, node.dimensions[0] * scale);
    const height = Math.max(5, node.dimensions[1] * scale);
    const surface = result.graph.surfaces.find(
      (surface) => surface.nodeId === node.id,
    );
    const fill = surface?.palette[0] ?? "#819898";
    const stroke =
      selected &&
      (node.sources.includes(selected) || surface?.sources.includes(selected))
        ? "#edb366"
        : "#c2d3c5";
    const shape =
      node.role === "membrane"
        ? `<path d="M${x - width / 2},${y} Q${x},${y - height / 2} ${x + width / 2},${y} Q${x},${y + height / 2} ${x - width / 2},${y}Z"/>`
        : `<ellipse cx="${x}" cy="${y}" rx="${width / 2}" ry="${height / 2}"/>`;
    const clipId = `${clipPrefix}clip-${node.id}`;
    body += `<defs><clipPath id="${clipId}">${shape}</clipPath></defs><g fill="${fill}" stroke="${stroke}" stroke-width="${stroke === "#edb366" ? 4 : 2}">${shape}</g>`;
    body += `<g clip-path="url(#${clipId})">`;
    if (surface?.palette.length === 2)
      body += `<rect x="${x}" y="${y - height / 2}" width="${width / 2}" height="${height}" fill="${surface.palette[1]}"/>`;
    for (const [index, mark] of (surface?.markings ?? []).entries()) {
      const mx = x - width / 2 + mark.u * width;
      const my = y - height / 2 + mark.v * height;
      const size = Math.max(2, mark.scale * width);
      if (
        mark.layout === "bands" ||
        (mark.layout === "bands-and-patches" && index % 2 === 0)
      )
        body += `<rect x="${mx - size / 2}" y="${my - height / 2}" width="${size}" height="${height}" fill="#e8dfc8" opacity="${mark.contrast}" transform="rotate(${(mark.orientation * 180) / Math.PI},${mx},${my})"/>`;
      else
        body += `<ellipse cx="${mx}" cy="${my}" rx="${size}" ry="${size * 0.6}" fill="#e8dfc8" opacity="${mark.contrast}"${surfaceDetails ? ` transform="rotate(${(mark.orientation * 180) / Math.PI},${mx},${my})"` : ""}/>`;
    }
    if (surface?.texture === "fine-ridged")
      for (let index = 1; index < 5; index++)
        body += `<line x1="${x - width / 2 + (index * width) / 5}" y1="${y - height / 2}" x2="${x - width / 2 + (index * width) / 5}" y2="${y + height / 2}" stroke="#b6c7bf" opacity=".25"/>`;
    body += "</g>";
  }
  body +=
    '<text x="24" y="326" fill="#b4c7c3" font-family="sans-serif" font-size="13">Constructed diagnostic • static projection • no face or animation invented</text>';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 620 350" role="img" aria-label="Resolved construction diagnostic"${surfaceDetails ? ` data-projection="${SURFACE_DETAIL_PROJECTION_VERSION}"` : ""}>${body}</svg>`;
}

export function representations(catalogue, genome, result) {
  return {
    baseline: `baseline/1 ${catalogue.id}@${catalogue.version}\nrules=${catalogue.ruleVersion}\n${catalogue.loci.map((locus) => `${locus.id}: ${locus.status}; ${locus.operator}; applicable=${locus.applicability}; ${JSON.stringify(locus.bounds)}`).join("\n")}\nconstruction=${JSON.stringify(catalogue.constructionRules)}`,
    inherited: `inherited/1 ${genome.contentId}@${genome.contentVersion}\n${Object.entries(
      genome.loci,
    )
      .map(([id, copies]) => `${id}=${copies.join("/")}`)
      .join("\n")}`,
    expression: `phenotype/1 ${catalogue.ruleVersion}\n${result.facts.map((fact) => `${fact.id}=${JSON.stringify(fact.value)} [${fact.state}] <- ${[...fact.sources, ...fact.prerequisites].join(",")}`).join("\n")}`,
  };
}

export function drawGenomeField(
  catalogue,
  genome,
  result,
  kind = "inherited",
  selected = null,
) {
  const definitions = catalogue.loci.filter(
    (locus) => locus.status === "validated",
  );
  const rows = Math.ceil(definitions.length / 6);
  const height = rows * 88 + 48;
  let svg = `<rect width="900" height="${height}" rx="10" fill="#182930"/>`;
  for (const [index, locus] of definitions.entries()) {
    const x = 20 + (index % 6) * 147;
    const y = 22 + Math.floor(index / 6) * 88;
    const fact = result.facts.find((fact) => fact.locusId === locus.id);
    const active = fact?.state === "expressed";
    const color =
      locus.id === selected ? "#edb366" : active ? "#a9d4b9" : "#81929d";
    const copies = genome.loci[locus.id];
    svg += `<g data-locus="${escape(locus.id)}"><title>${escape(`${locus.id}: ${copies.join("/")} → ${JSON.stringify(fact?.value)} (${fact?.state})`)}</title>`;
    if (kind === "baseline")
      svg += `<rect x="${x + 45}" y="${y}" width="34" height="24" fill="none" stroke="${color}"/><text x="${x + 62}" y="${y + 16}" text-anchor="middle" fill="${color}" font-family="sans-serif" font-size="10">rule</text>`;
    else if (kind === "inherited") {
      for (let copy = 0; copy < copies.length; copy++) {
        const center = x + 38 + copy * 42;
        svg += `<path d="M${center},${y}l13,13 -13,13 -13,-13Z" fill="none" stroke="${color}" stroke-width="2"/><text x="${center}" y="${y + 42}" text-anchor="middle" fill="${color}" font-family="sans-serif" font-size="9">${escape(copies[copy])}</text>`;
      }
      svg += `<line x1="${x + 51}" y1="${y + 13}" x2="${x + 67}" y2="${y + 13}" stroke="${color}"/>`;
    } else
      svg += `<circle cx="${x + 62}" cy="${y + 13}" r="14" fill="${active ? color : "none"}" stroke="${color}"/><text x="${x + 62}" y="${y + 42}" text-anchor="middle" fill="${color}" font-family="sans-serif" font-size="9">${escape(fact?.state ?? "unmodeled")}</text>`;
    svg += `<text x="${x + 62}" y="${y + 61}" text-anchor="middle" fill="#d5e0da" font-family="sans-serif" font-size="9">${escape(locus.id.split(".").at(-1))}</text></g>`;
  }
  svg += `<text x="20" y="${height - 12}" fill="#b3c4c0" font-family="sans-serif" font-size="12">${escape(kind)} projection • copies / rule records / output states • grouping is not chromosome order • digest is separate</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 ${height}" role="img" aria-label="${escape(kind)} genome field">${svg}</svg>`;
}

export function compareResults(first, second) {
  if (!first || !second) return [];
  return second.facts.map((fact) => {
    const before = first.facts.find((item) => item.id === fact.id);
    return {
      id: fact.id,
      before: before?.value,
      after: fact.value,
      beforeState: before?.state,
      afterState: fact.state,
      valueChanged:
        JSON.stringify(before?.value) !== JSON.stringify(fact.value),
      changed:
        JSON.stringify(before?.value) !== JSON.stringify(fact.value) ||
        before?.state !== fact.state,
      sources: fact.sources,
    };
  });
}

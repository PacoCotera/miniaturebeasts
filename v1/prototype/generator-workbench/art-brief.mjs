// Renderer prose is a presentation of verified expression, never an allele resolver.
const rounded = (value) => Number(value.toFixed(1));
const list = (values) => values.join(", ");
export const SEMANTIC_RENDERING_VERSION = "semantic-renderer/1";

// A covering is a material field; construction samples remain in the audit packet.
export function describeCoveringField({
  kind,
  count,
  startU,
  endU,
  elementWidth,
  widthUnit,
  widthName,
  flow,
  clearAreas,
  widthLabel = "front-region width",
  contour = false,
  rootPigment = false,
}) {
  if (kind === "skin") return "The body has bare skin.";
  if (count === 0)
    return `The ${kind} field has no realized texture; the body remains bare skin.`;
  const domain =
    Number.isFinite(startU) && Number.isFinite(endU)
      ? `within the ${rounded(startU * 100)}–${rounded(endU * 100)}% longitudinal body field`
      : "within its body-local field";
  const size =
    Number.isFinite(elementWidth) && Number.isFinite(widthUnit)
      ? `, with ${widthName} about ${rounded((100 * elementWidth) / widthUnit)}% of ${widthLabel}`
      : "";
  if (kind === "scales")
    return `Local overlapping scale texture belongs to the skin ${domain}${size}. ${flow}; body pigment boundaries continue through the texture. Skin outside the field and around ${clearAreas} stays smooth.`;
  return `Sparse rooted ${kind} texture follows the skin ${domain}${size}. ${flow}${contour ? "; fine contour fans extend beyond the skin outline" : "; the body outline remains uncovered"}. Skin stays visible between the rooted patches and around clear ${clearAreas}.${rootPigment ? " Each patch follows the pigment at its body-local root." : ""}`;
}

function coveringFlow(elements, fallback) {
  const directions = [
    ...new Set(
      elements
        .filter((element) => !element.contour)
        .map((element) => {
          const [x, y] = element.orientation;
          if (x > 0 && Math.abs(y) < 1e-8)
            return "rearward longitudinal alignment";
          if (x < 0 && Math.abs(y) < 1e-8)
            return "forward longitudinal alignment";
          return `alignment ${rounded((Math.atan2(y, x) * 180) / Math.PI)} degrees from the body axis`;
        }),
    ),
  ];
  return directions.length
    ? `The material follows ${list(directions)}`
    : fallback;
}
const pigmentLabel = (pigment) => {
  const names = {
    "#465459": "dark slate",
    "#ae674d": "russet",
    "#dfd2ae": "cream",
    "#718489": "blue-gray",
    "#f1eddc": "pale cream",
    "#273036": "charcoal",
  };
  return names[pigment] ? `${names[pigment]} ${pigment}` : pigment;
};

function regionName(volumes, id) {
  if (volumes.length === 1) return "body";
  const index = volumes.findIndex((node) => node.id === id);
  if (index === 0) return "leading region";
  if (index === volumes.length - 1) return "posterior region";
  return `body region ${index + 1}`;
}

function attachmentDescription(graph, volumes, facts) {
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
  const roots = graph.edges.filter((edge) =>
    volumes.some((volume) => volume.id === edge.from),
  );
  const chains = [];
  for (const edge of roots) {
    let node = nodes.get(edge.to);
    if (!["link", "contact-link"].includes(node?.role)) continue;
    const segments = [];
    while (node && ["link", "contact-link"].includes(node.role)) {
      segments.push(node);
      const next = graph.edges.find((candidate) => candidate.from === node.id);
      node = next ? nodes.get(next.to) : null;
    }
    const reach = segments.reduce(
      (sum, segment) => sum + segment.dimensions[0],
      0,
    );
    const proportions =
      segments.length === 2
        ? `, the first ${rounded((100 * segments[0].dimensions[0]) / reach)}% of that reach`
        : `, with segment shares ${segments.map((segment) => `${rounded((100 * segment.dimensions[0]) / reach)}%`).join(" and ")}`;
    chains.push(
      `${segments.length} segments with total reach ${rounded((100 * reach) / volumes[0].dimensions[1])}% of ${volumes.length === 1 ? "body" : "front-region"} width${proportions}, ${segments.at(-1).role === "contact-link" ? "ending in one contact tip" : "with no terminal contact"}, rooted on the ${regionName(volumes, edge.from)}`,
    );
  }
  const sentences = [];
  if (chains.length) {
    const groups = new Map();
    for (const chain of chains) groups.set(chain, (groups.get(chain) ?? 0) + 1);
    sentences.push(
      `There are ${chains.length} jointed appendages: ${list([...groups].map(([description, count]) => `${count} with ${description}`))}.`,
    );
  }
  for (const role of ["membrane", "fin"]) {
    const members = graph.nodes.filter((node) => node.role === role);
    if (!members.length) continue;
    const groups = new Map();
    for (const node of members) {
      const root = roots.find((edge) => edge.to === node.id);
      const anchor = graph.rootAnchors?.find((item) => item.nodeId === node.id);
      const span = anchor
        ? facts.find((fact) => fact.id === "finSpan").value
        : node.dimensions[1];
      const width = volumes[0].dimensions[1];
      const chord = anchor
        ? Math.max(...anchor.chord.map((point) => point[0])) -
          Math.min(...anchor.chord.map((point) => point[0]))
        : null;
      const form = anchor
        ? `, root chord ${rounded((100 * chord) / width)}% of that width and tapered free tips`
        : `, longitudinal envelope extent ${rounded((100 * node.dimensions[0]) / width)}% of that width`;
      const description = `each spanning ${rounded((100 * span) / width)}% of ${volumes.length === 1 ? "body" : "front-region"} width${form}, with retained thickness ${rounded((100 * node.dimensions[2]) / span)}% of span`;
      if (!groups.has(description)) groups.set(description, new Map());
      const region = root
        ? regionName(volumes, root.from)
        : "retained attachment";
      const regions = groups.get(description);
      regions.set(region, (regions.get(region) ?? 0) + 1);
    }
    const shape =
      role === "fin" && graph.profile?.id === "continuous-pet/1"
        ? " rounded leaf-shaped"
        : "";
    sentences.push(
      `${members.length}${shape} ${role}${members.length === 1 ? "" : "s"}: ${list(
        [...groups].map(([description, regions]) => {
          const roots = [...regions]
            .map(
              ([region, count]) =>
                `${
                  facts.find((fact) => fact.id === "symmetry")?.value ===
                    "bilateral" && count === 2
                    ? "an opposed pair"
                    : count
                } on the ${region}`,
            )
            .join(", ");
          return `${roots}; ${description}`;
        }),
      )}.`,
    );
  }
  return sentences;
}

function faceDescription(graph, volumes) {
  const oculars = graph.nodes.filter((node) => node.role === "ocular");
  const mouths = graph.nodes.filter((node) => node.role === "oral-aperture");
  if (!oculars.length && !mouths.length)
    return "The modeled subject is faceless.";
  const parts = [];
  if (oculars.length) {
    const eye = oculars[0];
    const pupil = eye.shape?.components?.find(
      (part) => part.kind === "pupil-circle",
    );
    const outer = eye.shape?.components?.find(
      (part) => part.kind === "outer-circle",
    );
    const radius = eye.shape?.radii?.[0];
    parts.push(
      `${oculars.length} ${outer ? `${pigmentLabel(outer.pigment)} ` : ""}circular eyes, diameter ${rounded((eye.dimensions[0] / volumes[0].dimensions[1]) * 100)}% of front width${pupil ? ` with ${pigmentLabel(pupil.pigment)} pupils at ${rounded((pupil.radius / radius) * 100)}% radius` : ""}`,
    );
    parts[0] += `, centered ${rounded(((eye.position[0] - volumes[0].position[0]) / volumes[0].dimensions[0]) * 100)}% of region length behind its center${oculars.length === 2 ? ` and separated by ${rounded((Math.abs(oculars[0].position[1] - oculars[1].position[1]) / volumes[0].dimensions[1]) * 100)}% of its width` : ""}`;
  }
  if (mouths.length) {
    const placement = oculars.length
      ? mouths[0].position[0] > oculars[0].position[0]
        ? "behind"
        : "ahead of"
      : "on";
    const pigment = graph.surfaces.find(
      (surface) => surface.nodeId === mouths[0].id,
    )?.palette[0];
    parts.push(
      `${mouths.length} ${pigment ? `${pigmentLabel(pigment)} ` : ""}small oval mouth opening${mouths.length === 1 ? "" : "s"} ${placement} ${oculars.length ? "the eyes" : "the front"}`,
    );
  }
  return `The ${volumes.length === 1 ? "body" : "leading region"} carries ${parts.join(" and ")}.`;
}

function surfaceDescription(graph) {
  const groups = new Map();
  for (const surface of graph.surfaces) {
    if (["ocular", "oral-aperture"].includes(surface.region)) continue;
    const key = JSON.stringify([
      surface.palette,
      surface.partition,
      surface.texture,
    ]);
    if (!groups.has(key)) groups.set(key, { surface, regions: new Set() });
    groups.get(key).regions.add(surface.region);
  }
  const names = {
    volume: "body regions",
    "tissue-join": "joins",
    link: "chain segments",
    "contact-link": "terminal contacts",
    membrane: "membranes",
    fin: "fins",
  };
  const sentences = [...groups.values()].map(({ surface, regions }) => {
    const areas = list([...regions].map((region) => names[region] ?? region));
    const pigment =
      surface.palette.length === 1
        ? `uniform ${pigmentLabel(surface.palette[0])}`
        : `${surface.partition === "two declared equal local masks" ? "two equal local pigment fields" : surface.partition} in palette order ${list(surface.palette.map(pigmentLabel))}`;
    return `The ${areas} have ${pigment}, with ${surface.texture.replaceAll("-", " ")} surfaces.`;
  });
  const marks = graph.surfaces.flatMap((surface) =>
    surface.markings.map((mark) => ({ ...mark, region: surface.region })),
  );
  if (!marks.length) sentences.push("There are no expressed markings.");
  else {
    const fields = new Set();
    for (const surface of graph.surfaces.filter(
      (item) => item.markings.length,
    )) {
      const area =
        surface.atlas?.sharedWith === "continuous-body"
          ? "the continuous body"
          : surface.region === "volume"
            ? `the ${regionName(
                graph.nodes.filter((node) => node.role === "volume"),
                surface.nodeId,
              )}`
            : (names[surface.region] ?? surface.region);
      const count = surface.markings.length;
      const layouts = new Set(
        surface.markings.map(
          (mark) =>
            `${mark.layout}, orientation ${rounded(mark.orientation)} radians, scale ${rounded(mark.scale)}, contrast ${rounded(mark.contrast)}`,
        ),
      );
      const countLabel =
        surface.region === "volume" ||
        surface.atlas?.sharedWith === "continuous-body"
          ? `${count} marks on ${area}`
          : `${count} marks per ${surface.region} surface field`;
      fields.add(`${countLabel} in ${list([...layouts])}`);
    }
    sentences.push(`Expressed marking fields contain ${list([...fields])}.`);
  }
  const covering = graph.covering;
  if (covering) {
    const count =
      covering.kind === "skin"
        ? 0
        : covering.kind === "scales"
          ? covering.plates.length
          : covering.elements.length;
    const leadingWidth = graph.nodes.find((node) => node.role === "volume")
      .dimensions[1];
    const elements = covering.elements ?? [];
    const elementWidth =
      covering.kind === "skin"
        ? undefined
        : covering.kind === "scales"
          ? 2 * covering.elementProfile.halfWidth
          : covering.elementProfile?.size *
            (covering.kind === "fur"
              ? covering.elementProfile.furLengthFraction
              : covering.elementProfile.lengthFraction);
    const clearAreas =
      [
        graph.nodes.some((node) =>
          ["ocular", "oral-aperture"].includes(node.role),
        )
          ? "facial areas"
          : null,
        graph.rootAnchors?.length ? "fin-root areas" : null,
      ]
        .filter(Boolean)
        .join(" and ") || "skin outside its rooted patches";
    sentences.push(
      describeCoveringField({
        kind: covering.kind,
        count,
        startU: covering.atlas?.startU,
        endU: covering.atlas?.endU,
        elementWidth,
        widthUnit: leadingWidth,
        widthLabel:
          graph.nodes.filter((node) => node.role === "volume").length === 1
            ? "body width"
            : "front-region width",
        widthName:
          covering.kind === "scales"
            ? "full scale width"
            : "rooted patch reach",
        flow: coveringFlow(
          elements,
          "The scale overlap follows rearward longitudinal alignment",
        ),
        clearAreas,
        contour: elements.some((element) => element.contour),
        rootPigment: ["fur", "feathers"].includes(covering.kind),
      }),
    );
  }
  return sentences;
}

export function describeRendererSubject(result, context) {
  if (result?.status !== "resolved")
    throw new Error("Resolved expression required for renderer prose.");
  const graph = result.graph;
  const volumes = graph.nodes
    .filter((node) => node.role === "volume")
    .sort((a, b) => a.position[0] - b.position[0]);
  const symmetry = result.facts.find((fact) => fact.id === "symmetry")?.value;
  const sentences = [
    `${symmetry ?? "The retained"} organization: ${graph.exterior ? `one continuous body with ${volumes.length} proportion regions flowing through ${volumes.length - 1} waist transitions` : volumes.length === 1 ? "one distinct body mass" : `${volumes.length} distinct body masses linked along an axis`}.`,
  ];
  const minimumX = Math.min(
    ...volumes.map((node) => node.position[0] - node.dimensions[0] / 2),
  );
  const maximumX = Math.max(
    ...volumes.map((node) => node.position[0] + node.dimensions[0] / 2),
  );
  const maximumWidth = Math.max(...volumes.map((node) => node.dimensions[1]));
  sentences.push(
    `The whole body is about ${rounded((maximumX - minimumX) / maximumWidth)} times as long as its widest region.`,
  );
  if (volumes.length > 1) {
    const equalLengths = volumes.every(
      (node) => node.dimensions[0] === volumes[0].dimensions[0],
    );
    if (equalLengths) sentences.push("The body regions have equal lengths.");
    else
      sentences.push(
        volumes
          .slice(1)
          .map(
            (node) =>
              `The ${regionName(volumes, node.id)} is ${rounded(Math.abs(node.dimensions[0] / volumes[0].dimensions[0] - 1) * 100)}% ${node.dimensions[0] >= volumes[0].dimensions[0] ? "longer" : "shorter"} than the leading region.`,
          )
          .join(" "),
      );
    if (
      volumes.every((node) => node.dimensions[1] === volumes[0].dimensions[1])
    )
      sentences.push("Their widths are equal.");
    else
      sentences.push(
        volumes
          .slice(1)
          .map((node) =>
            node.dimensions[1] === volumes[0].dimensions[1]
              ? `The ${regionName(volumes, node.id)} has the same width as the leading region.`
              : `The ${regionName(volumes, node.id)} is ${rounded(Math.abs(node.dimensions[1] / volumes[0].dimensions[1] - 1) * 100)}% ${node.dimensions[1] >= volumes[0].dimensions[1] ? "wider" : "narrower"} than the leading region.`,
          )
          .join(" "),
      );
  }
  sentences.push(
    ...attachmentDescription(graph, volumes, result.facts),
    faceDescription(graph, volumes),
    ...surfaceDescription(graph),
  );
  sentences.push(
    `${context.stage}, ${context.condition}; quiet orthographic still${graph.profile?.id === "continuous-pet/1" ? ", front at the top" : ""}.`,
  );
  return sentences.join(" ");
}

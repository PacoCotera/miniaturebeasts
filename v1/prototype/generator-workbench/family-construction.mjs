// Static construction profile: all paths are solved here, never inferred by art.
const round = (value) => Number(value.toFixed(6));
const reject = (code, message, contributors) => ({
  status: "rejected",
  errors: [{ code, path: "family-construction", message, contributors }],
});
const boundsOf = (points) => {
  const xs = points.map((point) => point[0]);
  const ys = points.map((point) => point[1]);
  return {
    minimumX: Math.min(...xs),
    maximumX: Math.max(...xs),
    minimumY: Math.min(...ys),
    maximumY: Math.max(...ys),
  };
};

export function constructContinuousFamily({
  catalogue,
  context,
  values: v,
  facts,
  from,
  expressionSeed,
  random,
  pet = null,
}) {
  if (
    v.symmetry !== "bilateral" ||
    v.axialCount < 3 ||
    !v.fins ||
    v.links !== 0 ||
    v.membranes
  )
    return reject(
      "family-applicability",
      "This construction operator requires bilateral >=3 axial stations, fins enabled, no articulated limbs and no membranes; incompatible contributors are not rewritten.",
      from("symmetry", "axialCount", "fins", "links", "membranes"),
    );
  const profile = catalogue.constructionRules.profile;
  const stationLength = v.bodyLength / v.axialCount;
  const stations = Array.from({ length: v.axialCount }, (_, index) => ({
    x: round(index * (stationLength + v.spacing)),
    halfWidth: round(
      (v.bodyWidth *
        (1 - v.taper * Math.abs((index + 0.5) / v.axialCount - 0.5))) /
        2,
    ),
  }));
  if (pet)
    stations[0].halfWidth = round(stations[1].halfWidth * v.leadingWidthRatio);
  const upper = [];
  for (let step = 0; step <= profile.capSegments / 2; step++) {
    const angle = Math.PI - (step * Math.PI) / profile.capSegments;
    upper.push([
      round((stationLength / 2) * Math.cos(angle)),
      round(stations[0].halfWidth * Math.sin(angle)),
    ]);
  }
  const extrema = [];
  stations.forEach((station, index) => {
    extrema.push([station.x, station.halfWidth]);
    if (index < stations.length - 1)
      extrema.push([
        round((station.x + stations[index + 1].x) / 2),
        round(
          v.joinNeckRatio *
            Math.min(station.halfWidth, stations[index + 1].halfWidth),
        ),
      ]);
  });
  for (let index = 1; index < extrema.length; index++) {
    const [a, b] = [extrema[index - 1], extrema[index]];
    for (let step = 1; step <= profile.shoulderSegments; step++) {
      const t = step / profile.shoulderSegments;
      const h = 3 * t * t - 2 * t * t * t;
      upper.push([
        round(a[0] + (b[0] - a[0]) * t),
        round(a[1] + (b[1] - a[1]) * h),
      ]);
    }
  }
  for (let step = 1; step <= profile.capSegments / 2; step++) {
    const angle = Math.PI / 2 - (step * Math.PI) / profile.capSegments;
    upper.push([
      round(stations.at(-1).x + (stationLength / 2) * Math.cos(angle)),
      round(stations.at(-1).halfWidth * Math.sin(angle)),
    ]);
  }
  // The leading cap's final point is already the first station extremum.
  for (let index = upper.length - 1; index > 0; index--)
    if (upper[index][0] === upper[index - 1][0]) upper.splice(index, 1);
  const halfWidthAt = (x) => {
    if (x < upper[0][0] || x > upper.at(-1)[0]) return null;
    const index = upper.findIndex((point) => point[0] >= x);
    if (index === 0) return upper[0][1];
    const [a, b] = [upper[index - 1], upper[index]];
    return a[1] + ((x - a[0]) / (b[0] - a[0])) * (b[1] - a[1]);
  };
  const exteriorSources = from(
    "axialCount",
    "bodyLength",
    "bodyWidth",
    "bodyHeight",
    "taper",
    "spacing",
    "joinNeckRatio",
    ...(pet ? ["leadingWidthRatio"] : []),
  );
  const perimeter = [
    ...upper,
    ...upper
      .slice(1, -1)
      .reverse()
      .map(([x, y]) => [x, -y]),
  ].map((point) => point.map(round));
  const graph = {
    nodes: [],
    edges: [],
    surfaces: [],
    exterior: {
      id: "continuous-body",
      profileId: profile.id,
      points: perimeter,
      upper: upper.map((point) => point.map(round)),
      stations: structuredClone(stations),
      extrema: structuredClone(extrema),
      sources: exteriorSources,
    },
    rootAnchors: [],
    profile: structuredClone(profile),
  };
  function addNode(id, role, position, dimensions, sources, shape = null) {
    const node = {
      id,
      role,
      position: position.map(round),
      dimensions: dimensions.map(round),
      sources,
      ...(shape ? { shape } : {}),
    };
    graph.nodes.push(node);
    return node;
  }
  stations.forEach((station, index) => {
    addNode(
      `volume-${index}`,
      "volume",
      [station.x, 0, 0],
      [stationLength, station.halfWidth * 2, v.bodyHeight],
      exteriorSources,
    );
    if (index) {
      const previous = stations[index - 1];
      const id = `join-${index - 1}`;
      addNode(
        id,
        "tissue-join",
        [(previous.x + station.x) / 2, 0, 0],
        [
          station.x - previous.x,
          v.joinNeckRatio * Math.min(previous.halfWidth, station.halfWidth) * 2,
          v.bodyHeight,
        ],
        exteriorSources,
      );
      graph.edges.push(
        {
          id: `body-in-${index}`,
          from: `volume-${index - 1}`,
          to: id,
          role: "joining-tissue",
          sources: exteriorSources,
        },
        {
          id: `body-out-${index}`,
          from: id,
          to: `volume-${index}`,
          role: "joining-tissue",
          sources: exteriorSources,
        },
      );
    }
  });
  const finSources = from(
    "attachmentGroups",
    "rootPosition",
    "finSpan",
    "fins",
    "finTipPosition",
    "axialCount",
    "bodyLength",
    "bodyWidth",
    "spacing",
    "taper",
    "joinNeckRatio",
    ...(pet ? ["leadingWidthRatio"] : []),
  );
  if (v.attachmentGroups === 0)
    return reject(
      "family-fin-roots",
      "Enabled fins require actual attachment groups.",
      finSources,
    );
  for (let group = 0; group < v.attachmentGroups; group++) {
    const stationIndex = Math.floor(
      (group * (stations.length - 1)) / Math.max(1, v.attachmentGroups - 1),
    );
    const station = stations[stationIndex];
    const u =
      0.4 * v.rootPosition + (0.6 * (group + 1)) / (v.attachmentGroups + 1);
    const x = station.x + (u - 0.5) * stationLength;
    const chord = v.finSpan * profile.finChordFraction;
    const left = x - chord / 2;
    const right = x + chord / 2;
    if (halfWidthAt(left) === null || halfWidthAt(right) === null)
      return reject(
        "family-fin-domain",
        "Inherited root/chord lies outside the solved body exterior; no clipping or root relocation performed.",
        finSources,
      );
    for (const side of [1, -1]) {
      const base = [
        [left, halfWidthAt(left)],
        ...upper.filter((point) => point[0] > left && point[0] < right),
        [right, halfWidthAt(right)],
      ];
      const tipX = left + v.finTipPosition * chord;
      const tip = [tipX, halfWidthAt(tipX) + v.finSpan];
      let boundary = [tip];
      if (pet) {
        const curve = (a, b, control) =>
          Array.from({ length: profile.finCurveSamples }, (_, i) => {
            const t = (i + 1) / profile.finCurveSamples;
            return [
              (1 - t) ** 2 * a[0] + 2 * (1 - t) * t * control[0] + t * t * b[0],
              (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * control[1] + t * t * b[1],
            ];
          });
        boundary = [
          ...curve(base.at(-1), tip, [
            right + chord * 0.32,
            tip[1] - v.finSpan * 0.35,
          ]),
          ...curve(tip, base[0], [
            left - chord * 0.32,
            tip[1] - v.finSpan * 0.35,
          ]),
        ];
      }
      const points = [...base, ...boundary].map(([px, py]) => [
        round(px),
        round(py * side),
      ]);
      const bounds = boundsOf(points);
      const id = `fin-${group}-${side === 1 ? 0 : 1}`;
      const root = [round(x), round(halfWidthAt(x) * side), 0];
      addNode(
        id,
        "fin",
        [
          (bounds.minimumX + bounds.maximumX) / 2,
          (bounds.minimumY + bounds.maximumY) / 2,
          0,
        ],
        [
          bounds.maximumX - bounds.minimumX,
          bounds.maximumY - bounds.minimumY,
          0.08,
        ],
        finSources,
        { kind: "polygon", points },
      );
      graph.rootAnchors.push({
        id: `anchor-${id}`,
        nodeId: id,
        volumeId: `volume-${stationIndex}`,
        position: root,
        chord: base.map(([px, py]) => [round(px), round(py * side)]),
        sources: finSources,
      });
      graph.edges.push({
        id: `root-${id}`,
        from: `volume-${stationIndex}`,
        to: id,
        role: "exterior-rooted-fin",
        sources: finSources,
      });
    }
  }
  const features = [];
  const leading = stations[0];
  function addFeature(id, role, x, y, rx, ry, sources) {
    // Check the bounding rectangle, a conservative envelope containment rule.
    const clearance = profile.featureRimClearance;
    for (const px of [x - rx, x, x + rx]) {
      const width = halfWidthAt(px);
      if (width === null || Math.abs(y) + ry + clearance > width) return false;
    }
    if (
      features.some(
        (feature) =>
          Math.abs(feature.position[0] - x) <
            feature.dimensions[0] / 2 + rx + clearance &&
          Math.abs(feature.position[1] - y) <
            feature.dimensions[1] / 2 + ry + clearance,
      )
    )
      return false;
    const feature = addNode(
      id,
      role,
      [x, y, 0],
      [rx * 2, ry * 2, 0.02],
      sources,
      {
        kind: "ellipse",
        center: [round(x), round(y)],
        radii: [round(rx), round(ry)],
      },
    );
    if (role === "ocular")
      feature.shape.components = [
        {
          kind: "outer-circle",
          radius: round(rx),
          pigment: profile.ocularOuterPigment,
        },
        {
          kind: "pupil-circle",
          radius: round(rx * (pet ? v.pupilRatio : profile.ocularPupilRatio)),
          pigment: profile.featurePigment,
        },
      ];
    if (pet && role === "ocular")
      feature.shape.components.push({
        kind: "reflection-circle",
        radius: round(rx * profile.ocularReflection.radiusFraction),
        offset: [
          round(rx * profile.ocularReflection.offsetFraction),
          round(rx * profile.ocularReflection.offsetFraction),
        ],
        pigment: profile.ocularReflection.pigment,
        authority: profile.ocularReflection.authority,
      });
    features.push(feature);
    graph.edges.push({
      id: `root-${id}`,
      from: "volume-0",
      to: id,
      role: "surface-feature",
      sources,
    });
    return true;
  }
  if (v.ocularPair) {
    const x = -stationLength / 2 + v.ocularPlacement * stationLength;
    const radius =
      Math.min(stationLength, leading.halfWidth * 2) *
      (pet ? v.ocularSize : profile.ocularRadiusFraction);
    const y =
      leading.halfWidth *
      (pet ? v.ocularSeparation : profile.ocularLateralFraction);
    const sources = from(
      "ocularPair",
      "ocularPlacement",
      "axialCount",
      "bodyLength",
      "bodyWidth",
      "taper",
      "spacing",
      "joinNeckRatio",
      ...(pet
        ? ["leadingWidthRatio", "ocularSize", "ocularSeparation", "pupilRatio"]
        : []),
    );
    if (
      ![1, -1].every((side, index) =>
        addFeature(
          `ocular-${index}`,
          "ocular",
          x,
          y * side,
          radius,
          radius,
          sources,
        ),
      )
    )
      return reject(
        "family-feature-containment",
        "Ocular geometry fails leading-envelope containment/separation; no feature nudge performed.",
        sources,
      );
  }
  if (v.oralOpening) {
    const x = pet
      ? -stationLength / 2 +
        ((v.ocularPair
          ? v.ocularPlacement
          : profile.oralWithoutOcularBaseline) +
          profile.oralPosteriorFraction) *
          stationLength
      : -stationLength / 2 + profile.oralLongitudinalFraction * stationLength;
    const sources = from(
      "oralOpening",
      "axialCount",
      "bodyLength",
      "bodyWidth",
      "taper",
      "spacing",
      "joinNeckRatio",
      ...(pet
        ? [
            "leadingWidthRatio",
            "ocularPair",
            ...(v.ocularPair ? ["ocularPlacement"] : []),
          ]
        : []),
    );
    if (
      !addFeature(
        "oral-0",
        "oral-aperture",
        x,
        0,
        stationLength * profile.oralRadiusFractions[0],
        leading.halfWidth * profile.oralRadiusFractions[1],
        sources,
      )
    )
      return reject(
        "family-feature-containment",
        "Oral geometry fails leading-envelope containment/separation; no feature nudge performed.",
        sources,
      );
  }
  const bounds = boundsOf(perimeter);
  for (const node of graph.nodes) {
    const feature = ["ocular", "oral-aperture"].includes(node.role);
    const surface = {
      id: `surface-${node.id}`,
      nodeId: node.id,
      region: node.role,
      axes: ["local-longitudinal", "local-lateral"],
      coordinates:
        "normalized local u/v on solved outline; not chromosome mapping",
      palette: feature
        ? node.role === "ocular"
          ? [profile.ocularOuterPigment]
          : [profile.featurePigment]
        : node.role === "fin"
          ? [...v.undersidePalette]
          : [...v.bodyPalette],
      partition: "",
      texture: feature ? "structural module" : v.texture,
      markings: [],
      sources: feature
        ? [...node.sources]
        : [
            ...new Set([
              ...node.sources,
              ...from(
                node.role === "fin" ? "undersidePalette" : "bodyPalette",
                "texture",
                "markings",
                ...(v.markings
                  ? ["layout", "extent", "markScale", "orientation", "contrast"]
                  : []),
              ),
            ]),
          ],
    };
    surface.partition =
      surface.palette.length === 2
        ? "two declared equal local masks"
        : "uniform";
    // The exterior has one continuous atlas; station surfaces are references into it.
    surface.atlas =
      node.role === "fin" || feature
        ? {
            kind: "node-local",
            bounds: boundsOf(
              node.shape?.points ?? [
                [
                  node.position[0] - node.dimensions[0] / 2,
                  node.position[1] - node.dimensions[1] / 2,
                ],
                [
                  node.position[0] + node.dimensions[0] / 2,
                  node.position[1] + node.dimensions[1] / 2,
                ],
              ],
            ),
          }
        : { kind: "continuous-body", bounds, sharedWith: "continuous-body" };
    if (
      v.markings &&
      ((node.role === "volume" && node.id === "volume-0") ||
        node.role === "fin")
    ) {
      const count = Math.max(1, Math.round(v.extent * 8));
      for (let index = 0; index < count; index++)
        surface.markings.push({
          id: `${surface.id}-mark-${index}`,
          u: round(
            expressionSeed === null
              ? (index + 1) / (count + 1)
              : 0.15 + random() * 0.7,
          ),
          v: round(expressionSeed === null ? 0.5 : 0.2 + random() * 0.6),
          scale: v.markScale,
          orientation: v.orientation,
          contrast: v.contrast,
          layout: v.layout,
        });
    }
    graph.surfaces.push(surface);
  }
  let coveringSources = from(
    "coveringKind",
    ...(v.coveringKind === "scales"
      ? [
          "coveringExtent",
          "coveringScale",
          "bodyWidth",
          "bodyLength",
          "taper",
          "spacing",
          "joinNeckRatio",
          "axialCount",
          "ocularPair",
          ...(pet && !v.ocularPair ? [] : ["ocularPlacement"]),
          "oralOpening",
          "attachmentGroups",
          "rootPosition",
          "finSpan",
          ...(pet
            ? [
                "leadingWidthRatio",
                ...(v.ocularPair ? ["ocularSize", "ocularSeparation"] : []),
              ]
            : []),
        ]
      : []),
  );
  graph.covering = {
    kind: v.coveringKind,
    sources: coveringSources,
    plates: [],
    exclusions: [],
    atlas:
      v.coveringKind === "scales"
        ? {
            bounds,
            startU: profile.covering.atlasStartU,
            endU: profile.covering.atlasStartU + v.coveringExtent,
          }
        : { bounds },
    elementProfile:
      v.coveringKind === "scales"
        ? {
            halfWidth: v.coveringScale * v.bodyWidth,
            halfHeightRatio: profile.covering.halfHeight,
            pitchX: profile.covering.pitchX,
            pitchY: profile.covering.pitchY,
            overlap:
              "successive columns overlap along positiveX; alternating rows are offset",
            pigment:
              "same continuous body-local palette; no new pigment allele",
          }
        : null,
  };
  if (v.coveringKind === "scales") {
    const size = v.coveringScale * v.bodyWidth;
    const start =
      bounds.minimumX +
      graph.covering.atlas.startU * (bounds.maximumX - bounds.minimumX);
    const end =
      bounds.minimumX +
      graph.covering.atlas.endU * (bounds.maximumX - bounds.minimumX);
    const clearance = profile.covering.exclusionClearance;
    graph.covering.exclusions = [
      ...features.map((node) => ({
        id: node.id,
        center: node.position.slice(0, 2),
        halfSize: [
          node.dimensions[0] / 2 + clearance,
          node.dimensions[1] / 2 + clearance,
        ],
      })),
      ...graph.rootAnchors.map((anchor) => ({
        id: anchor.id,
        center: anchor.position.slice(0, 2),
        halfSize: [size + clearance, size + clearance],
      })),
    ];
    for (
      let row = 0, y = bounds.minimumY + size;
      y <= bounds.maximumY - size;
      row++, y += size * profile.covering.pitchY
    ) {
      for (
        let x = start + size + (row % 2) * size * 0.5;
        x <= end - size;
        x += size * profile.covering.pitchX
      ) {
        const points = [
          [x - size, y],
          [x - size * 0.5, y - size * profile.covering.halfHeight],
          [x + size * 0.5, y - size * profile.covering.halfHeight],
          [x + size, y],
          [x + size * 0.5, y + size * profile.covering.halfHeight],
          [x - size * 0.5, y + size * profile.covering.halfHeight],
        ].map((point) => point.map(round));
        if (
          !points.every(
            ([px, py]) =>
              halfWidthAt(px) !== null && Math.abs(py) <= halfWidthAt(px),
          )
        )
          continue;
        if (
          graph.covering.exclusions.some(
            (zone) =>
              Math.abs(x - zone.center[0]) < size + zone.halfSize[0] &&
              Math.abs(y - zone.center[1]) <
                size * profile.covering.halfHeight + zone.halfSize[1],
          )
        )
          continue;
        graph.covering.plates.push({
          id: `plate-${graph.covering.plates.length}`,
          center: [round(x), round(y)],
          points,
          atlasU: round(
            (x - bounds.minimumX) / (bounds.maximumX - bounds.minimumX),
          ),
        });
        if (graph.covering.plates.length > profile.covering.maximumPlates)
          return reject(
            "covering-budget",
            "Scale geometry exceeds the declared plate budget; no truncation performed.",
            coveringSources,
          );
      }
    }
    if (!graph.covering.plates.length)
      return reject(
        "covering-empty",
        "This scale configuration produces no legal plate region; no generic texture substituted.",
        coveringSources,
      );
  }
  if (pet && ["fur", "feathers"].includes(v.coveringKind)) {
    const material = pet.constructCovering({
      graph,
      values: v,
      profile,
      bounds,
      features,
      halfWidthAt,
      from,
    });
    if (material.status === "rejected") return material;
    graph.covering = material.covering;
    coveringSources = material.covering.sources;
  }
  const load = round(v.bodyLength * v.bodyWidth * v.bodyHeight * v.density);
  const waterSupported =
    v.axialActuator &&
    v.axialAmplitude <= v.bodyWidth / 2 &&
    v.actuatorCapacity >= load;
  const motion = ["ground", "air", "water"].map((medium) => ({
    id:
      medium === "water"
        ? "continuous-axial-fin"
        : `continuous-${medium}-unavailable`,
    medium,
    status: medium === "water" && waterSupported ? "supported" : "unavailable",
    activeInContext:
      medium === "water" && waterSupported && context.medium === "water",
    mechanism:
      medium === "water"
        ? "Declared axial bend channel and exterior fins; fictional static support only"
        : "No constructed contact/membrane channel",
    parameters:
      medium === "water"
        ? {
            amplitude: v.axialAmplitude,
            phase: v.axialPhase,
            steering: v.finSteering,
            cycleRate: v.cycleRate,
          }
        : {},
    sources:
      medium === "water"
        ? from(
            "axialActuator",
            "axialAmplitude",
            "axialPhase",
            "finSteering",
            "fins",
            "finSpan",
            "actuatorCapacity",
            "bodyLength",
            "bodyWidth",
            "bodyHeight",
            "density",
            "cycleRate",
            "efficiency",
          )
        : from("links", "membranes"),
    reasons: [
      medium === "water"
        ? "Axial actuator enabled, amplitude <= bodyWidth/2 and capacity >= normalized load required; no fluid simulation."
        : "Required geometry is not present.",
    ],
    support: {
      domain: "fictional analytic rule; not physics",
      loadIndex: load,
      capacity: v.actuatorCapacity,
    },
    costIndex:
      medium === "water" && waterSupported
        ? round(load * v.cycleRate * v.efficiency)
        : null,
  }));
  facts.push({
    id: "constructed-graph",
    value: {
      volumes: stations.length,
      tissueJoins: stations.length - 1,
      fins: graph.rootAnchors.length,
      oculars: features.filter((node) => node.role === "ocular").length,
      oralApertures: features.filter((node) => node.role === "oral-aperture")
        .length,
    },
    unit: "actual counts",
    state: "expressed",
    context: context.medium,
    sources: [
      ...new Set([
        ...exteriorSources,
        ...finSources,
        ...features.flatMap((node) => node.sources),
      ]),
    ],
    prerequisites: [],
  });
  const realization = {
    seed: expressionSeed,
    parameters: [],
    markings: graph.surfaces.flatMap((surface) =>
      surface.markings.map((mark) => ({ surfaceId: surface.id, ...mark })),
    ),
  };
  realization.parameters = realization.markings.map(
    ({ surfaceId, u, v: localV }) => ({ surfaceId, u, v: localV }),
  );
  return {
    status: "resolved",
    graph,
    facts,
    motion,
    realization,
    coverage: catalogue.families.map((family) => ({
      ...family,
      activeContributors: facts
        .filter(
          (fact) =>
            fact.state === "expressed" &&
            catalogue.loci.find((locus) => locus.id === fact.locusId)
              ?.family === family.id,
        )
        .map((fact) => fact.locusId),
      inactiveContributors: facts
        .filter(
          (fact) =>
            fact.state !== "expressed" &&
            catalogue.loci.find((locus) => locus.id === fact.locusId)
              ?.family === family.id,
        )
        .map((fact) => fact.locusId),
      indirectContributors: [
        ...new Set(
          (family.id === "appearance"
            ? [
                ...graph.surfaces.flatMap((surface) => surface.sources),
                ...coveringSources,
              ]
            : family.id === "structure"
              ? graph.nodes.flatMap((node) => node.sources)
              : ["mechanics-movement", "energy-nutrition"].includes(family.id)
                ? motion
                    .filter((item) => item.status === "supported")
                    .flatMap((item) => item.sources)
                : []
          ).filter(
            (id) =>
              catalogue.loci.find((locus) => locus.id === id)?.family !==
              family.id,
          ),
        ),
      ],
      draftRecords: catalogue.loci
        .filter(
          (locus) => locus.status === "draft" && locus.family === family.id,
        )
        .map((locus) => locus.id),
    })),
    classification: {
      derived: true,
      labels: [
        "continuous bilateral axial organization",
        ...(waterSupported ? ["water-capable fictional analytic output"] : []),
      ],
      reasons: [
        "Description follows solved construction; it never chooses anatomy.",
      ],
    },
    limitations: [
      "Provisional static 2D construction profile; no whole 3D body, physical motion or animation",
      "Ocular and oral features have no modeled sensing, nutrition or behavior capability",
      "Lifetime state, learning, configured incubation and epigenetics not modeled",
      "No game individual, ownership or breeding permission",
    ],
  };
}

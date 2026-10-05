import { constructContinuousFamily } from "./family-construction.mjs";

const round = (value) => Number(value.toFixed(6));
const failure = (code, message, sources) => ({
  status: "rejected",
  errors: [{ code, path: "pet-covering", message, contributors: sources }],
});

// Whole rooted elements are solved here. Renderers only consume retained geometry.
export function constructPetCovering({
  graph,
  values: v,
  profile,
  bounds,
  features,
  halfWidthAt,
  from,
}) {
  const rules = profile.fibers;
  const sources = from(
    "coveringKind",
    "coveringExtent",
    "coveringScale",
    "bodyPalette",
    "bodyLength",
    "bodyWidth",
    "taper",
    "spacing",
    "axialCount",
    "joinNeckRatio",
    "leadingWidthRatio",
    "ocularPair",
    ...(v.ocularPair
      ? ["ocularPlacement", "ocularSize", "ocularSeparation"]
      : []),
    "oralOpening",
    "fins",
    "finSpan",
    "attachmentGroups",
    "rootPosition",
  );
  const size = v.coveringScale * v.bodyWidth;
  const exclusions = [
    ...features.map((node) => ({
      id: node.id,
      center: node.position.slice(0, 2),
      halfSize: [
        node.dimensions[0] / 2 + 0.015,
        node.dimensions[1] / 2 + 0.015,
      ],
    })),
    ...graph.rootAnchors.map((anchor) => ({
      id: anchor.id,
      center: anchor.position.slice(0, 2),
      halfSize: [size + 0.015, size + 0.015],
    })),
  ];
  const covering = {
    kind: v.coveringKind,
    sources,
    plates: [],
    elements: [],
    exclusions,
    atlas: { bounds, startU: 0.2, endU: 0.2 + v.coveringExtent },
    elementProfile: { ...rules, size, pigmentMapping: rules.mapping },
  };
  const width = bounds.maximumX - bounds.minimumX;
  const start = bounds.minimumX + covering.atlas.startU * width;
  const end = bounds.minimumX + covering.atlas.endU * width;
  const budget =
    v.coveringKind === "fur" ? rules.maximumTufts : rules.maximumFeathers;
  function add(x, y, normal, contour = false) {
    const length = size * rules.lengthFraction;
    const tangent = [normal[1], -normal[0]];
    const tip = [x + normal[0] * length, y + normal[1] * length];
    const local = (along, across) => [
      x + normal[0] * along + tangent[0] * across,
      y + normal[1] * along + tangent[1] * across,
    ];
    const geometry =
      v.coveringKind === "fur"
        ? {
            filaments: rules.filamentLengths.map((ratio, index) => {
              const filamentLength = size * rules.furLengthFraction * ratio;
              const rootOffset = size * rules.filamentRootOffsets[index];
              const tipOffset = size * rules.filamentTipOffsets[index];
              const edges = [-1, 1].map((side) =>
                Array.from(
                  { length: rules.filamentCurveSamples + 1 },
                  (_, step) => {
                    const t = step / rules.filamentCurveSamples;
                    const center =
                      (1 - t) ** 2 * rootOffset +
                      2 * (1 - t) * t * (rootOffset + tipOffset) * 0.5 +
                      t * t * tipOffset;
                    return local(
                      filamentLength * t,
                      center +
                        side * size * rules.filamentHalfWidthFraction * (1 - t),
                    );
                  },
                ),
              );
              return [...edges[0], ...edges[1].reverse()];
            }),
          }
        : {
            shaft: [[x, y], tip],
            vanes: [-1, 1].map((side) =>
              rules.vaneWidthFractions.map((width, index) =>
                local(
                  (length * index) / (rules.vaneWidthFractions.length - 1),
                  side * size * width,
                ),
              ),
            ),
            barbs: [-1, 1].flatMap((side) =>
              rules.barbFractions.map((fraction) => [
                local(length * (fraction - 0.12), 0),
                local(
                  length * fraction,
                  side *
                    size *
                    rules.vaneWidthFractions[Math.round(fraction * 4)],
                ),
              ]),
            ),
          };
    const points = geometry.filaments?.flat() ?? geometry.vanes.flat();
    if (
      !contour &&
      !points.every(
        ([px, py]) =>
          halfWidthAt(px) !== null && Math.abs(py) <= halfWidthAt(px),
      )
    )
      return;
    const minimumX = Math.min(...points.map((p) => p[0])),
      maximumX = Math.max(...points.map((p) => p[0]));
    const minimumY = Math.min(...points.map((p) => p[1])),
      maximumY = Math.max(...points.map((p) => p[1]));
    if (
      exclusions.some(
        (zone) =>
          maximumX > zone.center[0] - zone.halfSize[0] &&
          minimumX < zone.center[0] + zone.halfSize[0] &&
          maximumY > zone.center[1] - zone.halfSize[1] &&
          minimumY < zone.center[1] + zone.halfSize[1],
      )
    )
      return;
    const u = (x - bounds.minimumX) / width;
    covering.elements.push({
      id: `${v.coveringKind}-${covering.elements.length}`,
      root: [round(x), round(y)],
      orientation: normal.map(round),
      contour,
      atlasU: round(u),
      pigment:
        v.bodyPalette[u < 0.5 ? 0 : Math.min(1, v.bodyPalette.length - 1)],
      geometry: Object.fromEntries(
        Object.entries(geometry).map(([key, value]) => [
          key,
          ["vanes", "filaments", "barbs"].includes(key)
            ? value.map((poly) => poly.map((p) => p.map(round)))
            : value.map((p) => p.map(round)),
        ]),
      ),
    });
  }
  for (
    let row = 0, y = bounds.minimumY + size;
    y < bounds.maximumY - size;
    row++, y += size * rules.pitchY
  )
    for (
      let x = start + size + (row % 2) * size;
      x < end - size;
      x += size * rules.pitchX
    )
      add(x, y, [1, 0]);
  if (v.coveringKind === "fur")
    for (let x = start + size; x < end - size; x += size * rules.pitchX)
      for (const side of [-1, 1])
        add(
          x,
          halfWidthAt(x) * side,
          [0.35, side * Math.sqrt(1 - 0.35 ** 2)],
          true,
        );
  if (covering.elements.length > budget)
    return failure(
      "pet-covering-budget",
      `Actual ${v.coveringKind} elements exceed ${budget}; no truncation.`,
      sources,
    );
  if (!covering.elements.length)
    return failure(
      "pet-covering-empty",
      "No legal rooted material region; no texture substitute.",
      sources,
    );
  return { status: "resolved", covering };
}

export function constructPetFamily(input) {
  return constructContinuousFamily({
    ...input,
    pet: { constructCovering: constructPetCovering },
  });
}

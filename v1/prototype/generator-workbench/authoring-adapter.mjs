import { REGIONAL_SCENE_RULE } from "./regional-scene-catalogue.mjs";
import { GRAPH_COVERING_RULE_VERSION } from "./graph-covering-catalogue.mjs";
import { BODY_ORGANIZATION_RULE } from "./body-organization-catalogue.mjs";
import { GRAPH_MODULE_RULE_VERSION } from "./graph-module-catalogue.mjs";
import { readFileSync } from "node:fs";
import { canonicalJson, digest } from "./evaluate.mjs";
import {
  authoringIdentity,
  creatureReferenceLine,
} from "./authoring-identity.mjs";
import { describeRendererSubject } from "./art-brief.mjs";
import { AUTHORING_CATALOGUE, REFERENCE_CONTEXT } from "./catalogue.mjs";
import { createGeometryReference } from "./geometry-reference.mjs";
import { FAMILY_CATALOGUE, FAMILY_RULE_VERSION } from "./family-catalogue.mjs";
import { familyCases } from "./family-fixtures.mjs";
import { PET_CATALOGUE, PET_RULE_VERSION } from "./pet-catalogue.mjs";
import { petCases } from "./pet-fixtures.mjs";
import {
  internPetSources,
  expandPetSources,
  internElementCoordinates,
  expandElementCoordinates,
} from "./pet-projection.mjs";
import {
  drawContinuousFamily,
  continuousReference,
  describeContinuousFamily,
} from "./family-presentation.mjs";
import {
  evaluateGenome,
  generateGenome,
  validateCatalogue,
  isRecord,
} from "./model.mjs";
import {
  representations,
  drawAuthoringCreature,
  drawGenomeField,
  describeAuthoringCreature,
} from "./presentation.mjs";

export const PACKET_SCHEMA = "critter-authoring-record/1";
const template = JSON.parse(
  readFileSync(new URL("art-template.json", import.meta.url), "utf8"),
);
const reject = (code, message) => ({
  status: "rejected",
  errors: [{ code, path: "input", message }],
});

export function authoringCatalogue() {
  return {
    catalogue: structuredClone(AUTHORING_CATALOGUE),
    defaultGeneration: generateGenome(AUTHORING_CATALOGUE, 1),
    referenceContext: REFERENCE_CONTEXT,
    schemaVersion: PACKET_SCHEMA,
    packages: [AUTHORING_CATALOGUE, FAMILY_CATALOGUE, PET_CATALOGUE].map(
      (catalogue) => ({
        catalogue: structuredClone(catalogue),
        defaultGeneration: generateGenome(catalogue, 1, { maxAttempts: 1024 }),
      }),
    ),
    familyExamples: familyCases().map(
      ({ name, genome, context, relationship }) => ({
        name,
        genome,
        context,
        relationship,
      }),
    ),
    petExamples: petCases().map(({ name, genome, context, relationship }) => ({
      name,
      genome,
      context,
      relationship,
    })),
  };
}

export function resolveAuthoring(input) {
  if (
    !isRecord(input) ||
    Object.keys(input).some(
      (key) =>
        !["catalogue", "genome", "context", "expressionSeed"].includes(key),
    )
  )
    return reject(
      "authoring-envelope",
      "Only catalogue, genome, context and expressionSeed are supported.",
    );
  const catalogue = Object.hasOwn(input, "catalogue")
    ? input.catalogue
    : AUTHORING_CATALOGUE;
  const context = Object.hasOwn(input, "context")
    ? input.context
    : REFERENCE_CONTEXT;
  const result = evaluateGenome(catalogue, input.genome, context, {
    expressionSeed: input.expressionSeed ?? null,
  });
  if (result.status !== "resolved") return result;
  const retainedInput = {
    catalogue: structuredClone(catalogue),
    genome: structuredClone(input.genome),
    context: structuredClone(context),
    expressionSeed: input.expressionSeed ?? null,
  };
  const inputDigest = digest(retainedInput);
  const resultDigest = digest(result);
  const packet = {
    status: "resolved",
    schemaVersion: PACKET_SCHEMA,
    contentId: catalogue.id,
    contentVersion: catalogue.version,
    ruleVersion: catalogue.ruleVersion,
    recordId: `experiment-${inputDigest.slice(0, 20)}`,
    input: retainedInput,
    inputDigest,
    resultDigest,
    result,
  };
  packet.representations = representations(
    catalogue,
    retainedInput.genome,
    result,
  );
  const continuous = [FAMILY_RULE_VERSION, PET_RULE_VERSION].includes(
    catalogue.ruleVersion,
  );
  const coveringModule = [
    GRAPH_COVERING_RULE_VERSION,
    REGIONAL_SCENE_RULE,
  ].includes(catalogue.ruleVersion);
  const ocularModule =
    catalogue.ruleVersion === GRAPH_MODULE_RULE_VERSION || coveringModule;
  const regionalProfile = catalogue.ruleVersion === BODY_ORGANIZATION_RULE;
  const unsupportedPresentation = ocularModule || regionalProfile;
  const requiredScene = regionalProfile
    ? "graph-source/2 body-only"
    : coveringModule
      ? catalogue.ruleVersion === REGIONAL_SCENE_RULE
        ? "body-covering/2"
        : "body-covering/1"
      : "ocular-module/1";
  if (ocularModule)
    packet.presentation = {
      status: "unsupported",
      reason: `Requires the ${requiredScene} scene consumer; the existing diagnostic cannot depict this module.`,
    };
  packet.diagnostic = unsupportedPresentation
    ? ""
    : continuous
      ? drawContinuousFamily(result)
      : drawAuthoringCreature(result);
  if (catalogue.ruleVersion === PET_RULE_VERSION)
    packet.presentation = {
      view: "portrait",
      mapping: "pageX=-Y,pageY=X",
      rotationDegrees: 90,
      canonicalGeometryReference: "orthographic XY, unrotated",
      sharedCamera: result.graph.profile.referenceCamera,
    };
  packet.description = unsupportedPresentation
    ? coveringModule
      ? `Broad body expression and inherited module facts are retained. Use the ${requiredScene} scene consumer; physiology is not modeled.`
      : "Broad body expression and inherited ocular facts are retained. Use the ocular-module/1 scene consumer for the constructed ocular pair; sensing is not modeled."
    : continuous
      ? describeContinuousFamily(result)
      : describeAuthoringCreature(result);
  const geometryIdentity = {
    recordId: packet.recordId,
    inputDigest,
    resultDigest,
    contentId: packet.contentId,
    contentVersion: packet.contentVersion,
    ruleVersion: packet.ruleVersion,
  };
  packet.geometryReference = unsupportedPresentation
    ? {
        status: "rejected",
        error: `Requires the ${requiredScene} scene consumer; the existing body-only reference omits the inherited module.`,
      }
    : continuous
      ? continuousReference(result, geometryIdentity)
      : createGeometryReference(result, geometryIdentity);
  packet.fingerprints = Object.fromEntries(
    ["baseline", "inherited", "expression"].map((kind) => [
      kind,
      drawGenomeField(catalogue, retainedInput.genome, result, kind),
    ]),
  );
  packet.identity = authoringIdentity(packet);
  if (catalogue.ruleVersion === BODY_ORGANIZATION_RULE) {
    packet.presentation = {
      status: "unsupported",
      reason:
        "Requires graph-source/2 body-only construction; ocular and covering modules are not depicted.",
    };
    packet.diagnostic = "";
    packet.geometryReference = {
      status: "rejected",
      error: packet.presentation.reason,
    };
    packet.description =
      "Inherited regional body growth and all carried module facts are retained. Use the graph-source/2 body-only source proof.";
  }
  try {
    packet.prompt = projectArtPrompt(packet);
  } catch (error) {
    packet.prompt = {
      status: "rejected",
      error: error.message,
      text: "",
      limitations:
        "Valid genetic result retained; art projection exceeded its contract or was unsupported. No content truncated.",
    };
  }
  return packet;
}

export function replayAuthoring(record) {
  if (
    !isRecord(record) ||
    record.schemaVersion !== PACKET_SCHEMA ||
    typeof record.inputDigest !== "string" ||
    typeof record.resultDigest !== "string"
  )
    return reject(
      "replay-envelope",
      "Retained authoring record/version/digests required.",
    );
  const regenerated = resolveAuthoring(record.input);
  if (regenerated.status !== "resolved") return regenerated;
  if (
    regenerated.inputDigest !== record.inputDigest ||
    regenerated.resultDigest !== record.resultDigest
  )
    return reject(
      "replay-mismatch",
      "Inputs/content or expression result differ from retained digests; no record replaced.",
    );
  return {
    ...regenerated,
    replay: { verified: true, clientArtifactsTrusted: false },
  };
}

export function validateDraft(catalogue) {
  return validateCatalogue(catalogue);
}

export function projectArtPrompt(packet) {
  if (
    packet?.status !== "resolved" ||
    packet.result?.status !== "resolved" ||
    !packet.recordId ||
    digest(packet.input) !== packet.inputDigest ||
    digest(packet.result) !== packet.resultDigest
  )
    throw new Error(
      "Verified resolved retained packet required for art projection.",
    );
  const recomputed = evaluateGenome(
    packet.input.catalogue,
    packet.input.genome,
    packet.input.context,
    { expressionSeed: packet.input.expressionSeed },
  );
  if (
    recomputed.status !== "resolved" ||
    digest(recomputed) !== packet.resultDigest ||
    packet.schemaVersion !== PACKET_SCHEMA ||
    packet.contentId !== packet.input.catalogue.id ||
    packet.contentVersion !== packet.input.catalogue.version ||
    packet.ruleVersion !== packet.input.catalogue.ruleVersion ||
    packet.recordId !== `experiment-${packet.inputDigest.slice(0, 20)}`
  )
    throw new Error(
      "Art facts/metadata must match the shared engine replay, not client-supplied result hashes.",
    );
  if (packet.ruleVersion === GRAPH_COVERING_RULE_VERSION)
    throw new Error(
      "Unsupported body-covering/1 art projection: a module-aware renderer brief is required.",
    );
  if (
    [BODY_ORGANIZATION_RULE, REGIONAL_SCENE_RULE].includes(packet.ruleVersion)
  )
    throw new Error(
      "Unsupported regional-growth art projection: requires graph-source/2 body-only construction; module depiction is not supplied.",
    );
  if (packet.ruleVersion === GRAPH_MODULE_RULE_VERSION)
    throw new Error(
      "Unsupported ocular-module/1 art projection: a module-aware renderer brief is required.",
    );
  const { graph, facts, motion, realization, limitations } = packet.result;
  const subjectPacket = Object.fromEntries(
    template.inputContract.required.map((key) => [key, packet[key]]),
  );
  subjectPacket.context = packet.input.context;
  const boundedSubject =
    packet.ruleVersion === PET_RULE_VERSION
      ? internPetSources(subjectPacket)
      : subjectPacket;
  if (
    packet.ruleVersion === PET_RULE_VERSION &&
    canonicalJson(expandPetSources(boundedSubject)) !==
      canonicalJson(subjectPacket)
  )
    throw new Error("Lossless source projection mismatch.");
  if (
    Buffer.byteLength(JSON.stringify(boundedSubject), "utf8") >
    template.limits.maxSubjectPacketBytes
  )
    throw new Error("Art subject packet exceeds the template byte limit.");
  const quote = (value) => JSON.stringify(value);
  const sourceGroups = {};
  const internSources = (sources) => {
    const existing = Object.entries(sourceGroups).find(
      ([, values]) => canonicalJson(values) === canonicalJson(sources),
    );
    if (existing) return existing[0];
    const id = `s${Object.keys(sourceGroups).length}`;
    sourceGroups[id] = sources;
    return id;
  };
  const trace = {
    factColumns: ["outputId", "state", "sourceGroup", "prerequisiteGroup"],
    facts: facts.map(({ id, sources, prerequisites, state }) => [
      id,
      state,
      internSources(sources),
      internSources(prerequisites),
    ]),
    bindingColumns: ["constructedId", "sourceGroup"],
    nodes: graph.nodes.map(({ id, sources }) => [id, internSources(sources)]),
    surfaces: graph.surfaces.map(({ id, sources }) => [
      id,
      internSources(sources),
    ]),
    sourceGroups,
  };
  const surfaceProfiles = {};
  const markProfiles = {};
  function internProfile(profiles, profile) {
    const existing = Object.entries(profiles).find(
      ([, value]) => canonicalJson(value) === canonicalJson(profile),
    );
    if (existing) return existing[0];
    const id = `p${Object.keys(profiles).length}`;
    profiles[id] = profile;
    return id;
  }
  const projectedSurfaces = graph.surfaces.map(
    ({ id, nodeId, region, axes, palette, partition, texture, markings }) => ({
      id,
      nodeId,
      region,
      profileRef: internProfile(surfaceProfiles, {
        axes,
        palette,
        partition,
        texture,
      }),
      markings: markings.map(
        ({ id, u, v, scale, orientation, contrast, layout }) => ({
          id,
          u,
          v,
          profileRef: internProfile(markProfiles, {
            scale,
            orientation,
            contrast,
            layout,
          }),
        }),
      ),
    }),
  );
  const elementCoordinates = graph.covering?.elements
    ? internElementCoordinates(graph.covering.elements)
    : null;
  if (
    elementCoordinates &&
    canonicalJson(expandElementCoordinates(elementCoordinates)) !==
      canonicalJson(graph.covering.elements.map((element) => element.geometry))
  )
    throw new Error("Lossless material coordinate projection mismatch.");
  const bindings = {
    resultIdentity: quote({
      recordId: packet.recordId,
      contentId: packet.contentId,
      contentVersion: packet.contentVersion,
      ruleVersion: packet.ruleVersion,
      inputDigest: packet.inputDigest,
      resultDigest: packet.resultDigest,
    }),
    contextFacts: quote(packet.input.context),
    anatomyFacts: quote({
      nodes: graph.nodes.map(({ id, role }) => ({ id, role })),
      edges: graph.edges.map(({ id, from, to, role }) => ({
        id,
        from,
        to,
        role,
      })),
      facialStructures: [FAMILY_RULE_VERSION, PET_RULE_VERSION].includes(
        graph.profile?.id,
      )
        ? graph.nodes
            .filter((node) => ["ocular", "oral-aperture"].includes(node.role))
            .map(({ id, role }) => ({
              id,
              role,
              geometryBinding:
                packet.ruleVersion === PET_RULE_VERSION
                  ? "proportionFacts.nodes: match constructed id, then shape"
                  : "proportionFacts.shape",
            }))
        : "Not included in modeled construction; sensing is not inferred.",
      ...(graph.exterior
        ? {
            exterior: {
              id: graph.exterior.id,
              profileId: graph.exterior.profileId,
              points: graph.exterior.points,
              stations: graph.exterior.stations,
              sourceGroup: internSources(graph.exterior.sources),
            },
            rootAnchors: graph.rootAnchors.map(
              ({ id, nodeId, volumeId, position, chord, sources }) => ({
                id,
                nodeId,
                volumeId,
                position,
                chord,
                sourceGroup: internSources(sources),
              }),
            ),
            constructionProfile: graph.profile,
          }
        : {}),
    }),
    proportionFacts: quote(
      graph.nodes.map(
        ({
          id,
          position,
          dimensions,
          jointRange,
          material,
          flexibility,
          deformation,
          shape,
        }) => ({
          id,
          position,
          dimensions,
          jointRange,
          material,
          flexibility,
          deformation,
          shape,
        }),
      ),
    ),
    surfaceFacts: quote({
      coordinates:
        "Each surface uses its actual node-local u/v atlas. Profile refs resolve to the dictionaries; all marking rows retain actual placement.",
      realizationSeed: realization.seed,
      surfaces: projectedSurfaces,
      surfaceProfiles,
      markProfiles,
      ...(graph.covering
        ? {
            covering: {
              kind: graph.covering.kind,
              atlas: graph.covering.atlas,
              elementProfile: graph.covering.elementProfile,
              exclusions: graph.covering.exclusions,
              sourceGroup: internSources(graph.covering.sources),
              plateColumns: ["id", "center", "points", "atlasU"],
              plates: graph.covering.plates.map(
                ({ id, center, points, atlasU }) => [
                  id,
                  center,
                  points,
                  atlasU,
                ],
              ),
              ...(graph.covering.elements
                ? {
                    elementColumns: [
                      "id",
                      "root",
                      "orientation",
                      "atlasU",
                      "contour",
                      "pigment",
                      "geometry",
                    ],
                    coordinateEncoding: elementCoordinates.encoding,
                    coordinateValuesBinding:
                      "proportionFacts.coveringCoordinateValues",
                    elements: graph.covering.elements.map(
                      (
                        {
                          id,
                          root,
                          orientation,
                          atlasU,
                          contour,
                          pigment,
                          geometry,
                        },
                        index,
                      ) => [
                        id,
                        root,
                        orientation,
                        atlasU,
                        contour,
                        pigment,
                        elementCoordinates.geometries[index],
                      ],
                    ),
                  }
                : {}),
            },
          }
        : {}),
    }),
    movementFacts: quote(motion.filter((item) => item.status === "supported")),
    hardExclusions: quote([
      ...limitations,
      ...motion
        .filter((item) => item.status !== "supported")
        .map((item) => `${item.id}: unavailable; ${item.reasons.join(" ")}`),
    ]),
    factTrace: quote(trace),
  };
  if (packet.ruleVersion === PET_RULE_VERSION) {
    bindings.proportionFacts = quote({
      nodes: JSON.parse(bindings.proportionFacts),
      ...(elementCoordinates
        ? {
            coveringCoordinateValues: elementCoordinates.coordinateValues,
            coordinateEncoding: elementCoordinates.encoding,
          }
        : {}),
    });
    const locusIds = [...new Set(Object.values(sourceGroups).flat())];
    bindings.factTrace = quote({
      ...trace,
      locusIds,
      sourceGroupEncoding:
        "Each source-group integer indexes locusIds; group IDs remain shared by all bindings.",
      sourceGroups: Object.fromEntries(
        Object.entries(sourceGroups).map(([key, ids]) => [
          key,
          ids.map((id) => locusIds.indexOf(id)),
        ]),
      ),
    });
  }
  for (const [id, value] of Object.entries(bindings))
    if (value.length > template.limits.maxBindingCharacters)
      throw new Error(
        `Art binding ${id} exceeds ${template.limits.maxBindingCharacters} characters; no facts truncated.`,
      );
  const rendererBindings = {
    phenotypeDescription: describeRendererSubject(
      packet.result,
      packet.input.context,
    ),
  };
  const text =
    template.promptSections
      .map((section) =>
        section.text.replace(/\{\{([a-zA-Z]+)\}\}/g, (_, key) => {
          if (!Object.hasOwn(rendererBindings, key))
            throw new Error(`Unknown art binding ${key}`);
          return rendererBindings[key];
        }),
      )
      .join("\n\n") +
    "\n\n" +
    creatureReferenceLine(authoringIdentity(packet));
  if (text.includes("{{") || text.length > template.limits.maxPromptCharacters)
    throw new Error(
      "Art projection is incomplete or exceeds the template prompt limit.",
    );
  return {
    templateId: template.id,
    templateVersion: template.version,
    status: "fact-derived calibration prompt; no provider called",
    bindings,
    text,
  };
}

export { digest, canonicalJson };

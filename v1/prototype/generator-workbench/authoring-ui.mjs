import { artPromptSummary, unavailableArtPromptSummary } from "./art-prompt-summary.mjs";
import { isCompositionalDraft, COMPOSITIONAL_DRAFT_PACKET } from "./compositional-draft-format.mjs";

export function supportsCompositionalAuthoring(catalogue) {
  return ["developmental-compositional-source/2", "developmental-compositional-source/3", "developmental-compositional-source/4", "developmental-compositional-source/5", "developmental-compositional-source/6"].includes(catalogue?.ruleVersion) &&
    ((catalogue.id === "genomic-compositional-source-experiment" && [2, 3, 4, 5, 6].includes(catalogue.version) &&
      catalogue.ruleVersion === `developmental-compositional-source/${catalogue.version}`) || isCompositionalDraft(catalogue));
}

export function canonicalGenomicFamily(id) {
  return ({ Structure: "structure", Appearance: "appearance", "Sensing and signaling": "sensing-signaling" })[id] ?? id;
}
export function isCompositionalRule(ruleVersion) {
  return ["developmental-compositional-source/1", "developmental-compositional-source/2", "developmental-compositional-source/3", "developmental-compositional-source/4", "developmental-compositional-source/5", "developmental-compositional-source/6"].includes(ruleVersion);
}

// Only this new immutable registry uses a pinned foundation request. Older
// catalogue payloads and replay records retain their original API semantics.
export function authoringRequest(input) {
  if (!input || typeof input !== "object") return input;
  if (isCompositionalDraft(input.catalogue)) return { ...input, catalogue: input.catalogue.authoredRecipe };
  if (!isCompositionalRule(input.catalogue?.ruleVersion)) return input;
  return { ...input, catalogue: input.catalogue.foundationPin };
}

export function scopedLoci(catalogue, dimension = "all", query = "") {
  const text = query.trim().toLowerCase();
  return (catalogue?.loci ?? []).filter((locus) => {
    const inDimension = dimension === "all" || locus.family === dimension ||
      (isCompositionalRule(catalogue?.ruleVersion) && canonicalGenomicFamily(locus.family) === dimension);
    const searchable = [locus.id, locus.label, ...(locus.aliases ?? [])]
      .join(" ")
      .toLowerCase();
    return inDimension && searchable.includes(text);
  });
}
export function initialAuthoringInputs(data) {
  return {
    catalogue: data.catalogue,
    genome: data.defaultGeneration.genome,
    context: data.referenceContext,
  };
}
export function authoringPackageLabel(catalogue) {
  if (isCompositionalDraft(catalogue)) return "Authored composition · eleven branches";
  if (catalogue.ruleVersion === "developmental-compositional-source/6")
    return "Optional innate profile · eleven branches";
  if (catalogue.ruleVersion === "developmental-compositional-source/5")
    return "Primary bands / patches · eleven branches";
  if (catalogue.ruleVersion === "developmental-compositional-source/4")
    return "Continuous coat / broad ears · eleven branches";
  if (catalogue.ruleVersion === "developmental-compositional-source/3")
    return "Ears / axial tail / primary coat · eleven branches";
  if (catalogue.ruleVersion === "developmental-compositional-source/2")
    return "Region forms / terminals / coverings · eleven branches";
  if (catalogue.ruleVersion === "developmental-compositional-source/1")
    return "Compositional genome / eleven branches";
  if (catalogue.ruleVersion === "developmental-anatomical-source/1")
    return "Head / jointed supports / wings experiment";
  if (catalogue.ruleVersion === "developmental-regional-scene/1")
    return "Regional body / eyes / skin-scales experiment";
  if (catalogue.id === "genomic-covering-pigment-candidate")
    return "Experimental pigment candidate";
  if (catalogue.ruleVersion === "developmental-covering/1")
    return "Body / eyes / skin-scales experiment";
  if (catalogue.ruleVersion === "continuous-pet/1")
    return "Narrow face/material calibration";
  if (catalogue.ruleVersion === "continuous-static/1")
    return "Narrow continuous-body calibration";
  return "Anatomy-diversity diagnostic";
}

export function authoringPackageKey(catalogue) {
  if (isCompositionalDraft(catalogue)) return `${catalogue.id}@${catalogue.version}:${catalogue.foundationPin.digest}`;
  return `${catalogue.id}@${catalogue.version}`;
}

export function mergeOptionalPackages(current, incoming) {
  const merged = [...current];
  const keys = new Set(
    current.map((item) => authoringPackageKey(item.catalogue)),
  );
  for (const item of incoming) {
    const key = authoringPackageKey(item.catalogue);
    if (!keys.has(key)) {
      keys.add(key);
      merged.push(item);
    }
  }
  return merged;
}

export function packageExamples(catalogue, examples) {
  return examples.filter(
    (example) =>
      example.genome?.contentId === catalogue.id &&
      example.genome?.contentVersion === catalogue.version,
  );
}

export function packageInputs(descriptor, examples = []) {
  const example = packageExamples(descriptor.catalogue, examples)[0];
  const source = example ?? descriptor.defaultGeneration;
  if (
    source.genome?.contentId !== descriptor.catalogue.id ||
    source.genome?.contentVersion !== descriptor.catalogue.version
  )
    throw new Error(
      "Package inputs must name the exact selected content/version.",
    );
  return structuredClone({
    catalogue: descriptor.catalogue,
    genome: source.genome,
    context: source.context ??
      descriptor.referenceContext ?? {
        stage: "adult",
        condition: "rested",
        environment: "reference",
        medium: "ground",
      },
    expressionSeed: source.expressionSeed ?? null,
  });
}

export function candidateStartupDecision(status, userIntent, active = true) {
  return {
    selectCandidate: active && status === "ready" && !userIntent,
    generateDisabled: status === "loading" && !userIntent,
  };
}

export function retainedAuthoringFailure(
  previousPacket,
  requestRevision,
  currentRevision,
  operation = "generate",
) {
  const retained =
    requestRevision === currentRevision &&
    isResolvedAuthoringPacket(previousPacket);
  const messages = {
    generate: retained
      ? "No new creature generated. Last successful result retained."
      : "No new creature generated. Try again with a fresh seed.",
    import: retained
      ? "Import failed. Last successful result retained."
      : "Import failed.",
    save: retained
      ? "Save failed. Last successful result retained."
      : "Save failed.",
  };
  if (!Object.hasOwn(messages, operation))
    throw new Error(
      "Only generation, import and save preserve a current result.",
    );
  return {
    packet: retained ? previousPacket : null,
    message: messages[operation],
  };
}

export function canPublishAuthoringResponse(
  packet,
  catalogue,
  requestRevision,
  currentRevision,
) {
  return (
    requestRevision === currentRevision &&
    isResolvedAuthoringPacket(packet) &&
    (catalogue.ruleVersion !== "developmental-regional-scene/1" ||
      ["module-scene/2", "module-scene/3"].includes(
        packet.sceneProjectionVersion,
      )) &&
    packet.input?.catalogue?.id === catalogue.id &&
    packet.input?.catalogue?.version === catalogue.version &&
    (!isCompositionalDraft(catalogue) || packet.input?.catalogue?.foundationPin?.digest === catalogue.foundationPin.digest) &&
    packet.input?.genome?.contentId === catalogue.id &&
    packet.input?.genome?.contentVersion === catalogue.version
  );
}
export function unconsumedOutputNotice(catalogue, locusId) {
  if (
    locusId === "energy.reserve-capacity" ||
    (["continuous-pet/1", "continuous-static/1"].includes(
      catalogue.ruleVersion,
    ) &&
      locusId === "movement.turn-control")
  )
    return "Retained resolved value; no implemented behavior or construction consumer in this profile.";
  return "";
}
export function freshGenerationSeed(previousSeed, randomSeed) {
  if (
    !Number.isInteger(randomSeed) ||
    randomSeed < 0 ||
    randomSeed > 4294967295
  )
    throw new Error("Generation seed must be a uint32 value.");
  return randomSeed === previousSeed ? (randomSeed + 1) >>> 0 : randomSeed;
}
export function isResolvedAuthoringPacket(packet) {
  return (
    packet?.status === "resolved" &&
    packet?.result?.status === "resolved" &&
    (packet.sceneProjectionVersion !== "compositional-source/7" || ["developmental-compositional-source/5", "developmental-compositional-source/6"].includes(packet.ruleVersion)) &&
    (packet.ruleVersion !== "developmental-compositional-source/6" ||
      (((packet.schemaVersion === "compositional-authoring-record/6" && packet.input?.catalogue?.id === "genomic-compositional-source-experiment" && packet.input?.catalogue?.version === 6) ||
        (packet.schemaVersion === "compositional-authored-record/5" && isCompositionalDraft(packet.input?.catalogue) && packet.input.catalogue.authoredRecipe.parent.version === 6)) &&
       packet.input?.catalogue?.ruleVersion === packet.ruleVersion &&
       packet.sceneProjectionVersion === "compositional-source/7" && packet.materialProfileVersion === "compositional-surface-fields/5" &&
       packet.scene?.status === "constructed" && packet.scene.profileVersion === packet.sceneProjectionVersion &&
       packet.scene.covering?.profileVersion === packet.materialProfileVersion &&
       packet.result.profileVersion === packet.sceneProjectionVersion && packet.result.graph?.profileVersion === packet.sceneProjectionVersion &&
       packet.informationStages?.phenotype?.profileVersion === packet.sceneProjectionVersion &&
       packet.result.innateProfile?.profileVersion === "innate-response-profile/1" &&
       packet.reference?.profileVersion === "compositional-reference/7" && packet.reference.status === "constructed")) &&
    (packet.ruleVersion !== "developmental-compositional-source/5" ||
      (((packet.schemaVersion === "compositional-authoring-record/5" && packet.input?.catalogue?.id === "genomic-compositional-source-experiment" && packet.input?.catalogue?.version === 5) ||
        (packet.schemaVersion === "compositional-authored-record/4" && isCompositionalDraft(packet.input?.catalogue) && packet.input.catalogue.authoredRecipe.parent.version === 5)) &&
       packet.input?.catalogue?.ruleVersion === packet.ruleVersion &&
       packet.sceneProjectionVersion === "compositional-source/7" && packet.materialProfileVersion === "compositional-surface-fields/5" &&
       packet.scene?.status === "constructed" && packet.scene.profileVersion === packet.sceneProjectionVersion &&
       packet.scene.covering?.profileVersion === packet.materialProfileVersion &&
       packet.result.profileVersion === packet.sceneProjectionVersion && packet.result.graph?.profileVersion === packet.sceneProjectionVersion &&
       packet.informationStages?.phenotype?.profileVersion === packet.sceneProjectionVersion &&
       packet.reference?.profileVersion === "compositional-reference/7" && packet.reference.status === "constructed")) &&
    (packet.sceneProjectionVersion !== "compositional-source/6" || packet.ruleVersion === "developmental-compositional-source/4") &&
    (packet.ruleVersion !== "developmental-compositional-source/4" ||
      (((packet.schemaVersion === "compositional-authoring-record/4" && packet.input?.catalogue?.id === "genomic-compositional-source-experiment" && packet.input?.catalogue?.version === 4) ||
        (packet.schemaVersion === "compositional-authored-record/3" && isCompositionalDraft(packet.input?.catalogue) && packet.input.catalogue.authoredRecipe.parent.version === 4)) &&
       packet.input?.catalogue?.ruleVersion === packet.ruleVersion &&
       packet.sceneProjectionVersion === "compositional-source/6" && packet.materialProfileVersion === "compositional-surface-fields/4" &&
       packet.scene?.status === "constructed" && packet.scene.profileVersion === packet.sceneProjectionVersion &&
       packet.scene.covering?.profileVersion === packet.materialProfileVersion &&
       packet.result.profileVersion === packet.sceneProjectionVersion && packet.result.graph?.profileVersion === packet.sceneProjectionVersion &&
       packet.informationStages?.phenotype?.profileVersion === packet.sceneProjectionVersion &&
       packet.reference?.profileVersion === "compositional-reference/6" && packet.reference.status === "constructed")) &&
    (packet.sceneProjectionVersion !== "compositional-source/5" || packet.ruleVersion === "developmental-compositional-source/3") &&
    (packet.ruleVersion !== "developmental-compositional-source/3" ||
      (((packet.schemaVersion === "compositional-authoring-record/3" && packet.input?.catalogue?.id === "genomic-compositional-source-experiment" && packet.input?.catalogue?.version === 3) ||
        (packet.schemaVersion === "compositional-authored-record/2" && isCompositionalDraft(packet.input?.catalogue) && packet.input.catalogue.authoredRecipe.parent.version === 3)) &&
       packet.input?.catalogue?.ruleVersion === packet.ruleVersion &&
       packet.sceneProjectionVersion === "compositional-source/5" && packet.materialProfileVersion === "compositional-surface-fields/3" &&
       packet.scene?.status === "constructed" && packet.scene.profileVersion === packet.sceneProjectionVersion &&
       packet.scene.covering?.profileVersion === packet.materialProfileVersion &&
       packet.result.profileVersion === packet.sceneProjectionVersion && packet.result.graph?.profileVersion === packet.sceneProjectionVersion &&
       packet.informationStages?.phenotype?.profileVersion === packet.sceneProjectionVersion &&
       packet.reference?.profileVersion === "compositional-reference/5" && packet.reference.status === "constructed")) &&
    (!["compositional-source/3", "compositional-source/4"].includes(packet.sceneProjectionVersion) || packet.ruleVersion === "developmental-compositional-source/2") &&
    (packet.ruleVersion !== "developmental-compositional-source/2" ||
      (((packet.schemaVersion === "compositional-authoring-record/2" &&
        packet.input?.catalogue?.id === "genomic-compositional-source-experiment" && packet.input?.catalogue?.version === 2) ||
        (packet.schemaVersion === COMPOSITIONAL_DRAFT_PACKET && isCompositionalDraft(packet.input?.catalogue) &&
         packet.sceneProjectionVersion === "compositional-source/4")) &&
        ["compositional-source/3", "compositional-source/4"].includes(packet.sceneProjectionVersion) &&
        packet.materialProfileVersion === "compositional-surface-fields/2" &&
        packet.scene?.status === "constructed" &&
        packet.scene.profileVersion === packet.sceneProjectionVersion &&
        packet.scene.covering?.profileVersion === packet.materialProfileVersion &&
        packet.result.profileVersion === packet.sceneProjectionVersion &&
        packet.result.graph?.profileVersion === packet.sceneProjectionVersion &&
        packet.informationStages?.phenotype?.profileVersion === packet.sceneProjectionVersion &&
        packet.reference?.profileVersion === (packet.sceneProjectionVersion === "compositional-source/4" ? "compositional-reference/4" : "compositional-reference/3") &&
        packet.reference.status === "constructed")) &&
    (packet.ruleVersion !== "developmental-compositional-source/1" ||
      (packet.schemaVersion === "compositional-authoring-record/1" &&
        ["compositional-source/1", "compositional-source/2"].includes(packet.sceneProjectionVersion) &&
        packet.materialProfileVersion === "compositional-surface-fields/1" &&
        packet.scene?.status === "constructed" &&
        packet.scene?.profileVersion === packet.sceneProjectionVersion &&
        packet.result.profileVersion === packet.sceneProjectionVersion &&
        packet.result.graph?.profileVersion === packet.sceneProjectionVersion &&
        packet.informationStages?.phenotype?.profileVersion === packet.sceneProjectionVersion &&
        packet.reference?.profileVersion === (packet.sceneProjectionVersion === "compositional-source/2" ? "compositional-reference/2" : "compositional-reference/1") &&
        packet.reference?.status === "constructed")) &&
    (packet.ruleVersion !== "developmental-anatomical-source/1" ||
      (packet.schemaVersion === "anatomical-authoring-record/1" &&
        packet.sceneProjectionVersion === "anatomical-source/1" &&
        packet.materialProfileVersion === "anatomical-surface-fields/1" &&
        packet.scene?.status === "constructed" &&
        packet.scene?.profileVersion === "anatomical-source/1" &&
        packet.reference?.status === "constructed")) &&
    (!["developmental-covering/1", "developmental-regional-scene/1"].includes(
      packet.ruleVersion,
    ) ||
      ((packet.ruleVersion === "developmental-regional-scene/1"
        ? ["module-scene/2", "module-scene/3"].includes(
            packet.sceneProjectionVersion,
          )
        : packet.sceneProjectionVersion === "module-scene/1") &&
        packet.scene?.profileVersion === packet.sceneProjectionVersion &&
        packet.scene?.status === "constructed" &&
        packet.reference?.status === "constructed"))
  );
}

export function imageLedPetHandoff(packet) {
  const version = "image-led-pet/1";
  const referenceSvg = packet?.scene
    ? packet.reference?.svg
    : packet?.diagnostic;
  if (
    !isResolvedAuthoringPacket(packet) ||
    typeof referenceSvg !== "string" ||
    !/^\s*<svg(?:\s|>)/i.test(referenceSvg) ||
    !/<\/svg>\s*$/i.test(referenceSvg)
  ) {
    return {
      version,
      status: "unavailable",
      text: "",
      referenceSvg: "",
      reason: "Generate or resolve a creature with a current source image.",
    };
  }
  let summary = null;
  if (["compositional-source/3", "compositional-source/4", "compositional-source/5", "compositional-source/6", "compositional-source/7"].includes(packet.sceneProjectionVersion)) {
    try {
      summary = artPromptSummary(packet);
    } catch (error) {
      summary = unavailableArtPromptSummary(packet, error);
      return { version, status: "unavailable", text: "", referenceSvg,
        sourceRecordId: packet.recordId, reason: summary.reason, summary };
    }
  }
  return {
    version,
    status: "ready",
    text: summary?.text ?? "Turn the attached critter into a cute digital pet, shown alone in rich high-bit pixel art.",
    referenceSvg,
    sourceRecordId: packet.recordId,
    ...(summary ? { summary } : {}),
  };
}

export function authoringRoute(catalogue, operation) {
  if (isCompositionalRule(catalogue?.ruleVersion))
    return `/api/compositional-source/${operation}`;
  if (catalogue?.ruleVersion === "developmental-anatomical-source/1")
    return `/api/anatomical-source/${operation}`;
  return `/api/${["developmental-covering/1", "developmental-regional-scene/1"].includes(catalogue?.ruleVersion) ? "module-scene" : "authoring"}/${operation}`;
}

export function sceneReplayEnvelope(packet) {
  if (["compositional-source/1", "compositional-source/2", "compositional-source/3", "compositional-source/4", "compositional-source/5", "compositional-source/6", "compositional-source/7"].includes(packet.sceneProjectionVersion)) {
    const envelope = {
      schemaVersion: packet.schemaVersion,
      sceneProjectionVersion: packet.sceneProjectionVersion,
      materialProfileVersion: packet.materialProfileVersion,
      sceneRecordId: packet.sceneRecordId,
      input: authoringRequest(packet.input),
      inputDigest: packet.inputDigest,
      resultDigest: packet.resultDigest,
      sceneDigest: packet.sceneDigest,
    };
    if (envelope.input.catalogue?.schemaVersion === "compositional-authoring-delta/1" &&
        new TextEncoder().encode(JSON.stringify(envelope)).length > 65536) {
      throw new Error("Authored replay recipe plus genome exceeds64KiB. Reduce the edited-definition payload before retaining it.");
    }
    return envelope;
  }
  if (packet.sceneProjectionVersion === "anatomical-source/1")
    return {
      schemaVersion: packet.schemaVersion,
      sceneProjectionVersion: packet.sceneProjectionVersion,
      materialProfileVersion: packet.materialProfileVersion,
      sceneRecordId: packet.sceneRecordId,
      input: packet.input,
      inputDigest: packet.inputDigest,
      resultDigest: packet.resultDigest,
      sceneDigest: packet.sceneDigest,
    };
  return {
    schemaVersion: packet.schemaVersion,
    sceneProjectionVersion: packet.sceneProjectionVersion,
    sceneRecordId: packet.sceneRecordId ?? packet.sceneProjection?.recordId,
    input: packet.input,
    inputDigest: packet.inputDigest,
    resultDigest: packet.resultDigest,
    sceneDigest: packet.sceneDigest ?? packet.scene?.sceneDigest,
    promptDigest: packet.promptDigest ?? packet.prompt?.promptDigest,
  };
}

export function copyableAuthoringExport(value) {
  return ["module-scene/1", "module-scene/2", "module-scene/3", "anatomical-source/1", "compositional-source/1", "compositional-source/2", "compositional-source/3", "compositional-source/4", "compositional-source/5", "compositional-source/6", "compositional-source/7"].includes(
    value?.sceneProjectionVersion,
  )
    ? sceneReplayEnvelope(value)
    : value;
}

export function sharedSceneCamera(packets) {
  if (
    !packets.length ||
    packets.some(
      (packet) =>
        !isResolvedAuthoringPacket(packet) ||
        !["module-scene/1", "module-scene/2", "module-scene/3"].includes(
          packet.sceneProjectionVersion,
        ),
    )
  )
    return null;
  if (
    packets.some(
      (packet) =>
        (packet.sceneProjectionVersion === "module-scene/3") !==
        (packets[0].sceneProjectionVersion === "module-scene/3"),
    )
  )
    return null;
  const bounds = packets.map((packet) => packet.scene.body.bounds);
  const minimumX = Math.min(...bounds.map((bound) => bound.minimumX));
  const maximumX = Math.max(...bounds.map((bound) => bound.maximumX));
  const minimumY = Math.min(...bounds.map((bound) => bound.minimumY));
  const maximumY = Math.max(...bounds.map((bound) => bound.maximumY));
  const side = Math.max(maximumX - minimumX, maximumY - minimumY) * 1.09;
  if (
    ![minimumX, maximumX, minimumY, maximumY, side].every(Number.isFinite) ||
    side <= 0
  )
    return null;
  return {
    minimumX: (minimumX + maximumX - side) / 2,
    minimumY: (minimumY + maximumY - side) / 2,
    side,
  };
}

export function comparisonUsesSharedCamera(pinned, current, sceneCamera) {
  if (!pinned || !current) return false;
  if (pinned.scene || current.scene)
    return Boolean(pinned.scene && current.scene && sceneCamera);
  return (
    pinned.ruleVersion === current.ruleVersion &&
    Boolean(current.result.graph.exterior)
  );
}

// Reframe only the outer viewport of the server's verified SVG. Inner geometry is unchanged.
export function scenePreviewMarkup(packet, camera = null) {
  if (!isResolvedAuthoringPacket(packet)) return "";
  if (!camera) return packet.reference.svg;
  const { scale, offsetX, offsetY } = packet.reference.mapping;
  const viewBox = [
    camera.minimumX * scale + offsetX,
    camera.minimumY * scale + offsetY,
    camera.side * scale,
    camera.side * scale,
  ];
  if (!viewBox.every(Number.isFinite) || viewBox[2] <= 0)
    throw new Error(
      "Scene comparison camera requires finite positive extents.",
    );
  return packet.reference.svg.replace(
    /viewBox="[^"]*"/,
    `viewBox="${viewBox.join(" ")}"`,
  );
}

export function sceneCausalSummary(scene, locusId) {
  if (scene?.status !== "constructed") return null;
  if (scene.profileVersion === "compositional-source/7") {
    const field = scene.covering.markings;
    const contributor = field?.contributors.find((entry) => entry.locusId === locusId);
    if (contributor) return {
      marking: true,
      anatomy: false,
      targets: [],
      enabled: field.enabled,
      contributorState: contributor.state,
      copies: contributor.copies,
      contributors: field.contributors,
      owners: field.owners.map((owner) => ({
        id: owner.owner,
        logicalCount: owner.logical.length,
        clippedPolygons: owner.emittedPolygons,
      })),
      logicalCount: field.logicalCount,
      clippedPolygons: field.emittedPolygons,
      fieldProfile: field.profile,
    };
  }
  if (["anatomical-source/1", "compositional-source/1", "compositional-source/2", "compositional-source/3", "compositional-source/4", "compositional-source/5", "compositional-source/6", "compositional-source/7"].includes(scene.profileVersion)) {
    const targets = scene.nodes.filter(node => node.sources.includes(locusId));
    return { anatomy: true, targets: targets.map(node => ({ id: node.id, role: node.role })), material: scene.covering.sources.includes(locusId), coveringKind: scene.covering.kind };
  }
  const involved = (trace) =>
    [
      ...(trace.locusIds ?? []),
      ...(trace.directLocusIds ?? []),
      ...(trace.dependencyLocusIds ?? []),
    ].includes(locusId);
  const bodyTargets =
    scene.profileVersion === "module-scene/2"
      ? scene.body.bodyExteriors.filter((body) =>
          body.sources.includes(locusId),
        ).length
      : scene.profileVersion === "module-scene/3"
        ? Number(scene.body.body.sources.includes(locusId))
        : 0;
  return {
    ...(["module-scene/2", "module-scene/3"].includes(scene.profileVersion)
      ? { body: bodyTargets > 0, bodyTargets }
      : {}),
    ocular: scene.ocular.traces.some(involved),
    ocularTargets: scene.ocular.traces.some(involved)
      ? scene.ocular.features.length
      : 0,
    covering: scene.covering.traces.some(involved),
    coveringTargets: scene.covering.plates.length,
    coveringKind: scene.covering.kind,
  };
}
export function scopedSelection(loci, current) {
  return loci.some((locus) => locus.id === current)
    ? current
    : (loci[0]?.id ?? null);
}
export function copyLabels(locus, genome) {
  return (genome?.loci?.[locus.id] ?? []).map(
    (id) => locus.alleles.find((allele) => allele.id === id)?.label ?? id,
  );
}
export function outputText(fact) {
  if (!fact) return "Not resolved";
  if (fact.state === "unimplemented" && !Object.hasOwn(fact, "value"))
    return "Unimplemented copy/phenotype contract; no value invented.";
  let value;
  if (typeof fact.value === "boolean")
    value = fact.target === "innate.enabled" ? (fact.value ? "enabled" : "disabled") : fact.value ? "present" : "absent";
  else if (Array.isArray(fact.value)) value = fact.value.join(" / ");
  else if (typeof fact.value === "object") value = JSON.stringify(fact.value);
  else value = String(fact.value);
  return `${value}${fact.unit ? ` · ${fact.unit}` : ""}`;
}
export function causalSummary(catalogue, result, id) {
  const locus = catalogue?.loci.find((item) => item.id === id);
  if (!locus) return null;
  const label = (key) =>
    catalogue.loci.find((item) => item.id === key)?.label ?? key;
  return {
    locus,
    innate: result?.innateProfile?.witnesses.some((fact) => fact.locusId === id) ? result.innateProfile : null,
    fact: result?.facts.find((item) => item.locusId === id),
    prerequisites: (locus.requires ?? []).map((key) => ({
      id: key,
      label: label(key),
    })),
    dependents: (result?.facts ?? [])
      .filter((item) => item.locusId !== id && item.prerequisites?.includes(id))
      .map((item) => label(item.locusId)),
    targets: (result?.graph.nodes ?? [])
      .filter((node) => node.sources.includes(id))
      .map((node) => ({ id: node.id, role: node.role })),
    coveringInvolvement: Boolean(result?.graph.covering?.sources.includes(id)),
    coveringContext: Boolean(
      result?.graph.covering?.sources.includes(id) &&
        !locus.outputs.some((output) => output.startsWith("covering")),
    ),
  };
}
// A display camera consumes retained geometry; it never repairs anatomy.
export function geometryBounds(result) {
  // Anatomical source solids use their retained three-dimensional camera.
  // The older diagnostic node/dimensions camera cannot interpret that graph.
  if (["anatomical-source/1", "compositional-source/1", "compositional-source/2", "compositional-source/3", "compositional-source/4", "compositional-source/5", "compositional-source/6", "compositional-source/7"].includes(result?.profileVersion)) return null;
  if (result?.status !== "resolved" || !result.graph?.nodes?.length)
    return null;
  const graph = result.graph;
  const points = [];
  let invalid = false;
  function addCoordinates(value) {
    if (!Array.isArray(value)) return;
    if (
      value.length === 2 &&
      value.every((entry) => typeof entry === "number")
    ) {
      if (value.every(Number.isFinite)) points.push(value);
      else invalid = true;
    } else value.forEach(addCoordinates);
  }
  function addEllipse(center, radii) {
    if (
      !Array.isArray(center) ||
      !Array.isArray(radii) ||
      ![...center, ...radii].every(Number.isFinite) ||
      radii.some((radius) => radius < 0)
    ) {
      invalid = true;
      return;
    }
    const [x, y] = center;
    const [radiusX, radiusY] = radii;
    addCoordinates([
      [x - radiusX, y - radiusY],
      [x + radiusX, y + radiusY],
    ]);
  }
  if (graph.exterior) {
    addCoordinates(graph.exterior.points);
    // Control-point hulls also contain declared Bezier segments.
    addCoordinates(graph.exterior.controls);
    for (const node of graph.nodes) {
      addCoordinates(node.shape?.points);
      addCoordinates(node.shape?.controls);
      if (node.shape?.center && node.shape?.radii) {
        addEllipse(node.shape.center, node.shape.radii);
        for (const component of node.shape.components ?? []) {
          const offset = component.offset ?? [0, 0];
          const center = node.shape.center.map(
            (value, index) => value + offset[index],
          );
          if (component.radius !== undefined)
            addEllipse(center, [component.radius, component.radius]);
        }
      }
      if (node.role === "tissue-join") {
        const [x, y] = node.position;
        addCoordinates([
          [x, y - node.dimensions[1] / 2],
          [x, y + node.dimensions[1] / 2],
        ]);
      }
    }
    for (const anchor of graph.rootAnchors ?? [])
      addCoordinates(anchor.position);
    for (const plate of graph.covering?.plates ?? []) {
      addCoordinates(plate.points);
      addCoordinates(plate.controls);
    }
    for (const element of graph.covering?.elements ?? []) {
      for (const coordinates of Object.values(element.geometry))
        addCoordinates(coordinates);
    }
  } else {
    for (const node of graph.nodes) {
      const [x, y, z] = node.position;
      const width = node.dimensions[0];
      const height = Math.max(node.dimensions[1], node.dimensions[2]);
      addCoordinates([
        [x - width / 2, y + z * 0.3 - height / 2],
        [x + width / 2, y + z * 0.3 + height / 2],
      ]);
    }
  }
  if (invalid || !points.length) return null;
  return [
    Math.min(...points.map((point) => point[0])),
    Math.max(...points.map((point) => point[0])),
    Math.min(...points.map((point) => point[1])),
    Math.max(...points.map((point) => point[1])),
  ];
}
export function sharedPreviewCamera(results) {
  const bounds = results.map(geometryBounds);
  if (!bounds.length || bounds.some((value) => !value)) return null;
  const union = [
    Math.min(...bounds.map((value) => value[0])),
    Math.max(...bounds.map((value) => value[1])),
    Math.min(...bounds.map((value) => value[2])),
    Math.max(...bounds.map((value) => value[3])),
  ];
  // Margin also contains fixed-pixel selection rings and ordinary strokes.
  const padding =
    Math.max(union[1] - union[0], union[3] - union[2], 0.001) * 0.09;
  return [
    union[0] - padding,
    union[1] + padding,
    union[2] - padding,
    union[3] + padding,
  ];
}

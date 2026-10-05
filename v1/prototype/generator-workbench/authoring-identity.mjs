import { digest } from "./evaluate.mjs";

// Callers establish engine/scene authority; these fingerprints describe that retained input.
export function authoringIdentity(packet) {
  if (
    packet?.status !== "resolved" ||
    packet.result?.status !== "resolved" ||
    !packet.input?.catalogue ||
    !packet.input?.genome ||
    digest(packet.result) !== packet.resultDigest
  ) {
    throw new Error(
      "Resolved retained input/result required for creature references.",
    );
  }
  const { schemaVersion, contentId, contentVersion, loci } =
    packet.input.genome;
  const inheritedDigest = digest({
    kind: "inherited-genome/1",
    catalogueDigest: digest(packet.input.catalogue),
    genome: { schemaVersion, contentId, contentVersion, loci },
  });
  const expressionDigest = digest({
    kind: "expressed-creature/1",
    inheritedDigest,
    context: packet.input.context,
    expressionSeed: packet.input.expressionSeed,
    resultDigest: packet.resultDigest,
    constructionDigest: packet.scene?.sceneDigest ?? null,
  });
  return {
    schemaVersion: "critter-reference-identity/1",
    digestAlgorithm: "sha256",
    inheritedEncodingVersion: "inherited-genome/1",
    expressionEncodingVersion: "expressed-creature/1",
    shortCodeFormat: "hex-prefix12/1",
    inheritedDigest,
    expressionDigest,
    genomeCode: `#G${inheritedDigest.slice(0, 12).toUpperCase()}`,
    expressionCode: `#E${expressionDigest.slice(0, 12).toUpperCase()}`,
    meaning:
      "Lookup reference fingerprints, not reversible genome encodings, ownership IDs or guaranteed unique codes. Full hashes disambiguate collisions.",
  };
}

export function creatureReferenceLine(identity) {
  return `Creature reference: ${identity.genomeCode} ${identity.expressionCode}`;
}

import { resolveCompositionalVocabulary, generateCompositionalVocabulary } from "./compositional-vocabulary-adapter.mjs";

export const resolveInnateProfile = (input, authoredPackage = null) =>
  resolveCompositionalVocabulary(input, "compositional-source/7", authoredPackage, "innate-profile");
export const generateInnateProfile = (input, authoredPackage = null) =>
  generateCompositionalVocabulary(input, authoredPackage, "innate-profile");

export function replayInnateProfile(record) {
  try {
    const keys = ["schemaVersion", "sceneProjectionVersion", "materialProfileVersion", "sceneRecordId", "input", "inputDigest", "resultDigest", "sceneDigest"];
    if (!record || Object.keys(record).some((key) => !keys.includes(key)) ||
        record.schemaVersion !== "compositional-authoring-record/6" ||
        record.sceneProjectionVersion !== "compositional-source/7" ||
        record.materialProfileVersion !== "compositional-surface-fields/5") throw new Error("Unsupported innate profile replay identity");
    const packet = resolveInnateProfile(record.input);
    if (packet.status !== "resolved") return packet;
    if (["inputDigest", "resultDigest", "sceneDigest", "sceneRecordId"].some((key) => packet[key] !== record[key])) {
      throw new Error("Innate recipe or source digest differs");
    }
    return { ...packet, replay: { status: "verified", profileVersion: record.sceneProjectionVersion } };
  } catch (error) {
    return { status: "rejected", errors: [{ code: "innate-profile-replay", path: "input", message: error.message }] };
  }
}

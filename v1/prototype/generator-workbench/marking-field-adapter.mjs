import { resolveCompositionalVocabulary, generateCompositionalVocabulary } from "./compositional-vocabulary-adapter.mjs";
import { MARKING_CONTENT } from "./marking-field-package.mjs";

export const resolveMarkingField = (input, authoredPackage = null) =>
  resolveCompositionalVocabulary(input, MARKING_CONTENT.constructionProfile, authoredPackage, "marking-field");
export const generateMarkingField = (input, authoredPackage = null) =>
  generateCompositionalVocabulary(input, authoredPackage, "marking-field");

export function replayMarkingField(record) {
  try {
    const keys = ["schemaVersion", "sceneProjectionVersion", "materialProfileVersion", "sceneRecordId", "input", "inputDigest", "resultDigest", "sceneDigest"];
    if (!record || Object.keys(record).some((key) => !keys.includes(key)) ||
        record.schemaVersion !== "compositional-authoring-record/5" ||
        record.sceneProjectionVersion !== MARKING_CONTENT.constructionProfile ||
        record.materialProfileVersion !== MARKING_CONTENT.materialProfile) {
      throw new Error("Unsupported marking-field replay identity");
    }
    const packet = resolveMarkingField(record.input);
    if (packet.status !== "resolved") return packet;
    if (["inputDigest", "resultDigest", "sceneDigest", "sceneRecordId"].some((key) => packet[key] !== record[key])) {
      throw new Error("Marking-field recipe or source digest differs");
    }
    return { ...packet, replay: { status: "verified", profileVersion: record.sceneProjectionVersion } };
  } catch (error) {
    return { status: "rejected", errors: [{ code: "marking-field-replay", path: "input", message: error.message }] };
  }
}

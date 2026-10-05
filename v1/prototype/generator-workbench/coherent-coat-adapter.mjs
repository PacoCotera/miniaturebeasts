import { resolveCompositionalVocabulary, generateCompositionalVocabulary } from "./compositional-vocabulary-adapter.mjs";
import { COAT_CONTENT } from "./coherent-coat-package.mjs";

export const resolveCoherentCoat = (input, authoredPackage = null) =>
  resolveCompositionalVocabulary(input, COAT_CONTENT.constructionProfile, authoredPackage, "coherent-coat");
export const generateCoherentCoat = (input, authoredPackage = null) =>
  generateCompositionalVocabulary(input, authoredPackage, "coherent-coat");

export function replayCoherentCoat(record) {
  try {
    const keys = ["schemaVersion", "sceneProjectionVersion", "materialProfileVersion", "sceneRecordId", "input", "inputDigest", "resultDigest", "sceneDigest"];
    if (!record || Object.keys(record).some((key) => !keys.includes(key)) ||
        record.schemaVersion !== "compositional-authoring-record/4" ||
        record.sceneProjectionVersion !== COAT_CONTENT.constructionProfile ||
        record.materialProfileVersion !== COAT_CONTENT.materialProfile) throw new Error("Unsupported coherent coat replay identity");
    const packet = resolveCoherentCoat(record.input);
    if (packet.status !== "resolved") return packet;
    if (["inputDigest", "resultDigest", "sceneDigest", "sceneRecordId"].some((key) => packet[key] !== record[key])) throw new Error("Coherent coat recipe or source digest differs");
    return { ...packet, replay: { status: "verified", profileVersion: record.sceneProjectionVersion } };
  } catch (error) {
    return { status: "rejected", errors: [{ code: "coherent-coat-replay", path: "input", message: error.message }] };
  }
}

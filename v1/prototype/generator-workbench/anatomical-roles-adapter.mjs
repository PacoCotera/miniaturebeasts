import { resolveCompositionalVocabulary, generateCompositionalVocabulary } from "./compositional-vocabulary-adapter.mjs";
import { ROLES_CONTENT } from "./anatomical-roles-package.mjs";

export const resolveAnatomicalRoles = (input, authoredPackage = null) =>
  resolveCompositionalVocabulary(input, ROLES_CONTENT.constructionProfile, authoredPackage, "anatomical-roles");
export const generateAnatomicalRoles = (input, authoredPackage = null) =>
  generateCompositionalVocabulary(input, authoredPackage, "anatomical-roles");

export function replayAnatomicalRoles(record) {
  try {
    const keys = ["schemaVersion", "sceneProjectionVersion", "materialProfileVersion", "sceneRecordId", "input", "inputDigest", "resultDigest", "sceneDigest"];
    if (!record || Object.keys(record).some((key) => !keys.includes(key)) ||
        record.schemaVersion !== "compositional-authoring-record/3" ||
        record.sceneProjectionVersion !== ROLES_CONTENT.constructionProfile ||
        record.materialProfileVersion !== ROLES_CONTENT.materialProfile) throw new Error("Unsupported anatomical role replay identity");
    const packet = resolveAnatomicalRoles(record.input);
    if (packet.status !== "resolved") return packet;
    if (["inputDigest", "resultDigest", "sceneDigest", "sceneRecordId"].some((key) => packet[key] !== record[key])) throw new Error("Anatomical role recipe or source digest differs");
    return { ...packet, replay: { status: "verified", profileVersion: record.sceneProjectionVersion } };
  } catch (error) {
    return { status: "rejected", errors: [{ code: "anatomical-role-replay", path: "input", message: error.message }] };
  }
}

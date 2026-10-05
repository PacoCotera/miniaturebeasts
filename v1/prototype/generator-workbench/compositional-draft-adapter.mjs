import { compileCompositionalDraft } from "./compositional-draft-package.mjs";
import { COMPOSITIONAL_DRAFT_PACKET } from "./compositional-draft-format.mjs";
import { resolveCompositionalVocabulary, generateCompositionalVocabulary } from "./compositional-vocabulary-adapter.mjs";
import { resolveAnatomicalRoles, generateAnatomicalRoles } from "./anatomical-roles-adapter.mjs";
import { resolveCoherentCoat, generateCoherentCoat } from "./coherent-coat-adapter.mjs";
import { resolveMarkingField, generateMarkingField } from "./marking-field-adapter.mjs";
import { resolveInnateProfile, generateInnateProfile } from "./innate-profile-adapter.mjs";

function rejected(error) {
  return { status: "rejected", errors: [{ code: "compositional-authoring", path: "input", message: error.message }] };
}
export function validateCompositionalDraft(recipe) {
  try {
    return { valid: true, ...compileCompositionalDraft(recipe) };
  } catch (error) {
    return { valid: false, ...rejected(error) };
  }
}
function draftOperation(input, generate) {
  try {
    if (!input?.catalogue?.definitionPin) throw new Error("A validated authored definition pin is required.");
    const descriptor = compileCompositionalDraft(input.catalogue);
    const request = { ...input, catalogue: descriptor.foundation };
    if (descriptor.catalogue.ruleVersion === "developmental-compositional-source/6") {
      return generate ? generateInnateProfile(request, descriptor) : resolveInnateProfile(request, descriptor);
    }
    if (descriptor.catalogue.ruleVersion === "developmental-compositional-source/5") {
      return generate ? generateMarkingField(request, descriptor) : resolveMarkingField(request, descriptor);
    }
    if (descriptor.catalogue.ruleVersion === "developmental-compositional-source/4") {
      return generate ? generateCoherentCoat(request, descriptor) : resolveCoherentCoat(request, descriptor);
    }
    if (descriptor.catalogue.ruleVersion === "developmental-compositional-source/3") {
      return generate ? generateAnatomicalRoles(request, descriptor) : resolveAnatomicalRoles(request, descriptor);
    }
    return generate ? generateCompositionalVocabulary(request, descriptor) :
      resolveCompositionalVocabulary(request, "compositional-source/4", descriptor);
  } catch (error) {
    return rejected(error);
  }
}
export const resolveCompositionalDraft = (input) => draftOperation(input, false);
export const generateCompositionalDraft = (input) => draftOperation(input, true);

export function replayCompositionalDraft(record) {
  try {
    const keys = ["schemaVersion", "sceneProjectionVersion", "materialProfileVersion", "sceneRecordId", "input", "inputDigest", "resultDigest", "sceneDigest"];
    const roles = record?.schemaVersion === "compositional-authored-record/2" &&
      record?.sceneProjectionVersion === "compositional-source/5" && record?.materialProfileVersion === "compositional-surface-fields/3";
    const vocabulary = record?.schemaVersion === COMPOSITIONAL_DRAFT_PACKET &&
      record?.sceneProjectionVersion === "compositional-source/4" && record?.materialProfileVersion === "compositional-surface-fields/2";
    const coat = record?.schemaVersion === "compositional-authored-record/3" &&
      record?.sceneProjectionVersion === "compositional-source/6" && record?.materialProfileVersion === "compositional-surface-fields/4";
    const marking = record?.schemaVersion === "compositional-authored-record/4" &&
      record?.sceneProjectionVersion === "compositional-source/7" && record?.materialProfileVersion === "compositional-surface-fields/5";
    const innate = record?.schemaVersion === "compositional-authored-record/5" &&
      record?.sceneProjectionVersion === "compositional-source/7" && record?.materialProfileVersion === "compositional-surface-fields/5";
    if (!record || Object.keys(record).some((key) => !keys.includes(key)) || !(innate || marking || coat || roles || vocabulary)) throw new Error("Unsupported authored replay identity.");
    const packet = resolveCompositionalDraft(record.input);
    if (packet.status !== "resolved") return packet;
    if (packet.schemaVersion !== record.schemaVersion || packet.sceneProjectionVersion !== record.sceneProjectionVersion ||
        packet.materialProfileVersion !== record.materialProfileVersion) throw new Error("Authored parent and replay profile differ.");
    if (["inputDigest", "resultDigest", "sceneDigest", "sceneRecordId"].some((key) => record[key] !== packet[key])) {
      throw new Error("Authored recipe or source digest differs.");
    }
    return { ...packet, replay: { status: "verified", profileVersion: record.sceneProjectionVersion } };
  } catch (error) {
    return rejected(error);
  }
}

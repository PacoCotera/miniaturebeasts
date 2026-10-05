// Small authoring associations beside immutable genome recipes. These IDs are
// user workspace labels, never hereditary ancestry or replacement genome IDs.
const storageKey = "critter-working-creatures-v1";
function index() {
  const saved = JSON.parse(localStorage.getItem(storageKey) || '{"schemaVersion":"working-creature-index/1","groups":[]}');
  if (saved.schemaVersion !== "working-creature-index/1" || !Array.isArray(saved.groups)) throw new Error("Working-creature association storage is unreadable; prior data was preserved");
  if (saved.groups.some((group) => typeof group?.association?.id !== "string" ||
      typeof group.association.originalGenomeId !== "string" || !Array.isArray(group.association.sourceVersions))) {
    throw new Error("Working-creature association entries are unreadable; prior data was preserved");
  }
  return saved;
}
export function activeWorkingCreature() {
  const saved = index();
  return saved.groups.find((group) => group.association.id === saved.activeId) ?? null;
}
export function retainedWorkingCreatures() {
  return index().groups;
}
export function workingCreatureFor(packet, current, mode = "refresh") {
  let previous = current;
  if (mode === "reopen") {
    const matches = index().groups.filter((group) => group.association.sourceVersions.some((source) =>
      source.sourceRecordId === packet.recordId && source.inputDigest === packet.inputDigest));
    previous = matches.find((group) => group.association.id === current?.association.id) ?? matches[0] ?? null;
  }
  if (mode === "fresh" || !previous) {
    previous = { association: { schemaVersion: "working-creature-association/1", id: crypto.randomUUID(),
      originalGenomeId: packet.inputDigest, sourceVersions: [] } };
  }
  const association = structuredClone(previous.association);
  if (!association.sourceVersions.some((source) => source.sourceRecordId === packet.recordId && source.inputDigest === packet.inputDigest)) {
    association.sourceVersions.push({ sourceRecordId: packet.recordId, inputDigest: packet.inputDigest });
  }
  return { ...previous, association, currentReplay: null,
    previousReplay: mode === "reopen" ? previous.previousReplay ?? null : previous.currentReplay ?? null };
}
export function retainWorkingCreature(group, replay) {
  const saved = index();
  const position = saved.groups.findIndex((entry) => entry.association.id === group.association.id);
  if (group.association.sourceVersions.length > 64) throw new Error("This working creature has64 source versions; new structure remains session-only. Existing associations were not removed");
  if (position < 0 && saved.groups.length >= 8) throw new Error("Eight working-creature associations are retained; this creature remains session-only. No group or genome was removed");
  const retained = { ...group, currentReplay: replay };
  if (position < 0) saved.groups.push(retained);
  else saved.groups[position] = retained;
  saved.activeId = group.association.id;
  localStorage.setItem(storageKey, JSON.stringify(saved));
  return retained;
}

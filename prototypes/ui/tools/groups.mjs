// masters/groups.json: which master ids each screen uses, recorded by the Station journey (station/tools/journey.mjs; `STATION_WRITE_GROUPS=1` merges what the run used into the file) and read by the page,
// which loads a screen's group before it draws that screen. { schema, screens: { boot: [ids], home: [ids], ... } }, ids sorted. Room pictures (rooms/...) are not in it: the rooms have their own lazy loader.
// `place-masters.mjs --check` refuses an id the index does not have; the journey fails on a picture a screen used that its group lacks (a miss the player would wait for).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

export const GROUPS_SCHEMA = "mb-masters-groups/1";
export const groupsFile = (root) => path.join(root, "groups.json");
export const readGroups = (root) => (existsSync(groupsFile(root)) ? JSON.parse(readFileSync(groupsFile(root), "utf8")) : { schema: GROUPS_SCHEMA, screens: {} });
export function checkGroups(root, index) {
  if (!existsSync(groupsFile(root))) return [];
  const g = readGroups(root), problems = [];
  if (g.schema !== GROUPS_SCHEMA) problems.push(`groups.json: schema is ${g.schema}, want ${GROUPS_SCHEMA}`);
  for (const [screen, ids] of Object.entries(g.screens ?? {})) for (const id of ids) if (!index.masters[id]) problems.push(`groups.json ${screen}: ${id} is not in the index`);
  return problems;
}
// used: { screen: [ids] } -> the ids a screen used that its committed group does not name
export function missingFrom(groups, used, index) {
  const out = [];
  for (const [screen, ids] of Object.entries(used)) { const have = new Set(groups.screens?.[screen] ?? []); for (const id of ids) if (!have.has(id) && index.masters[id]) out.push(`${screen}: ${id}`); }   // an id the index does not hold (a built picture named like a size) is not a master
  return out;
}
export function mergeGroups(groups, used, index) {
  const screens = { ...(groups.screens ?? {}) };
  for (const [screen, ids] of Object.entries(used)) screens[screen] = [...new Set([...(screens[screen] ?? []), ...ids.filter((id) => index.masters[id])])].sort();
  return { schema: GROUPS_SCHEMA, screens: Object.fromEntries(Object.entries(screens).sort(([a], [b]) => a.localeCompare(b))) };
}
export const writeGroups = (root, g) => writeFileSync(groupsFile(root), JSON.stringify(g, null, 1) + "\n");
export const groupBytes = (group, index) => group.reduce((s, id) => s + (index.masters[id]?.bytes ?? 0), 0);

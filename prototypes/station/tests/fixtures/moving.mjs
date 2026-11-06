// The moving sets of S01 and S05 as a test fixture. The game ships none (release 21a retired the hop of S01 and the set made for the earlier S05: ui/specs/station/moving/index.json lists no set, so every kind is slid as its
// plain stand), but the machinery for a species' own moving set stays in the Station (moving.mjs, the Home, Vivarium, Habitat and Idle props), and these tests exercise it on the sets as they were.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "moving");
export const movingFixture = () => Object.fromEntries(["S01", "S05"].map((id) => [id, JSON.parse(readFileSync(path.join(dir, `${id}.json`), "utf8"))]));

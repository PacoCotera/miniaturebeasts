// The Station's fixture save as the release plays it. The schema fixture (tests/fixtures/save-v8-schema1.json) is a flat v8 save of the earlier builds, and a page resets a v8 save (it keeps it whole in
// <key>.pre10 and starts over), so the tools that open the Station on the fixture (the goldens, the journeys, the playtest) put it in storage as the same realm in v10 shape (generator 5, the only generator
// a page plays now) under a Companion A of their own. Nothing in it that the Station draws or reads moves: the mibis, the pods, the bay, the Probe and the Station's part are the fixture's.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { migrate8 } from "../../exploration/src/regions.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
export const COMPANION_ID = "cfixturesavea";   // c + 12 letters or digits, as every Companion id
export const FIXTURE_V8 = path.join(here, "../tests/fixtures/save-v8-schema1.json");
export const fixtureRealm = () => migrate8({ ...JSON.parse(readFileSync(FIXTURE_V8, "utf8")), gen: 5 }, { now: Date.UTC(2026, 10, 3) });
export const fixtureRaw = () => JSON.stringify(fixtureRealm());
export const FIXTURE_KEY = "mb-save-v8@" + COMPANION_ID;
// localStorage entries: Companion A's identity and its v10 save
export const fixtureStorage = () => ({ "mb-companion-A": JSON.stringify({ id: COMPANION_ID, name: "Companion A", slot: "A", at: Date.UTC(2026, 10, 3) }), [FIXTURE_KEY]: fixtureRaw() });

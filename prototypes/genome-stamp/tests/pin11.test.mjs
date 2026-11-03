// Catalogue pin 11 (ticket G1) and the stamp registry: nothing the registry holds moves. The frames S17 to S19 (version 6) are the same bytes and stamp to the same
// message as before pin 11 (S01 to S16 are held by fluffy.test.mjs), the marking layout still has two alleles and one bit in every frame that opens it, and
// tools/extract-frames.mjs finds the snapshot current.
//   node --test tests/pin11.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { FRAME_DATA } from "../src/frames-data.mjs";
import { FRAMES_LIST } from "../src/frames.mjs";
import { encodeCells, parseMessage, sameGenome } from "../src/codec.mjs";
import { individual } from "./cases.mjs";
import { LOCI } from "../../workbench/framework/catalogue.mjs";

const sha = (s) => createHash("sha256").update(s).digest("hex").slice(0, 16);
// sha256 (first 16 hex) of each frame's JSON, and of the stamp's message bits for individual(frame, 7) with every open chapter read, as they were at pin 10 (6cecf8ed4)
const PIN10 = { "17.6": ["130f5745dd8c298a", "63badbbf40776d7b"], "18.6": ["8b51cb6f2fd3f48c", "ea3e84e0a8a1c46d"], "19.6": ["1dd3c2f3f70d84a2", "7b6d8182aaa8945c"] };

test("S17 to S19 (frame version 6) are the same bytes, stamp to the same message and decode to the same genome as at pin 10", () => {
  for (const [key, [frameSha, stampSha]] of Object.entries(PIN10)) {
    const d = FRAME_DATA.frames.find((f) => `${f.species}.${f.version}` === key), f = FRAMES_LIST.find((x) => `${x.species}.${x.version}` === key);
    assert.equal(sha(JSON.stringify(d)), frameSha, `${key}: the frame`);
    const g = individual(f, 7, { read: f.chapters.filter((c) => !c.sealed).map((c) => c.name) });
    const { L, cells } = encodeCells(f, g), bits = L.msgCells.map(([r, c]) => cells.get(r * L.N + c)?.v ?? 0);
    assert.equal(sha(bits.join("")), stampSha, `${key}: the stamp's message`);
    const back = parseMessage(bits, L.N, {}); assert.ok(back.ok, back.detail); assert.ok(sameGenome(f, g, back.genome), `${key}: the same genome comes back`);
  }
});

test("a stamp frame that opens the marking layout keeps its two alleles and its one bit, though the catalogue now holds six", () => {
  assert.equal(LOCI.get("appearance.marking-layout").alleles.length, 6);
  const opens = FRAMES_LIST.filter((f) => f.heritable.some((l) => l.id === "appearance.marking-layout"));
  assert.ok(opens.length >= 3, "the Loika and its kin open it");
  for (const f of opens) { const l = f.heritable.find((x) => x.id === "appearance.marking-layout"); assert.deepEqual(l.alleles, ["bands", "patches"], `${f.id} ${f.species}.${f.version}`); assert.equal(l.bits, 1); }
  for (const f of FRAMES_LIST) for (const [id, idx] of f.locked) if (id === "appearance.marking-layout") assert.ok(idx <= 1, `${f.id}: a locked layout is bands or patches`);
});

test("tools/extract-frames.mjs --check finds src/frames-data.mjs current against the workbench registry and the pin 11 catalogue", () => {
  const r = spawnSync(process.execPath, ["tools/extract-frames.mjs", "--check"], { cwd: new URL("..", import.meta.url), encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr || r.stdout);
});

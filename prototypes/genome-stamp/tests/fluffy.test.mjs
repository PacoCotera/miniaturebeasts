// Frame version 6 and the registry: the three fluffy species are appended at the end, and every frame that was there before (species 1-16 at every version they
// have, the three legacy frames) is exactly as it was, so every S01-S16 stamp encodes to the same bytes and decodes to the same genome.
//   node --test tests/fluffy.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { FRAME_DATA } from "../src/frames-data.mjs";
import { FRAMES_LIST, byName, frameFor } from "../src/frames.mjs";
import { encodeCells, parseMessage, sameGenome } from "../src/codec.mjs";
import { individual } from "./cases.mjs";

const sha = (s) => createHash("sha256").update(s).digest("hex").slice(0, 16);
// sha256 (first 16 hex) of each frame's JSON as the registry held it before frame version 6 ("species.version")
const FRAME_DIGESTS = {
  "11.1": "4363c641bd22957e",
  "12.1": "7a6fc114aa820604",
  "13.1": "e5f3c41df3b956a4",
  "1.2": "0f3778589fdd855c",
  "2.2": "a1f6165357015b23",
  "3.2": "dd44edbf712591ef",
  "4.2": "49944cc6b779f9fc",
  "5.2": "535fa19342087115",
  "6.2": "b860ac31798f48f2",
  "7.2": "3c92211b12a5ef03",
  "8.2": "94ac7402f3b6da01",
  "9.2": "a5d7ede759a78962",
  "10.2": "6b70d56e704af98c",
  "11.2": "5ef325594647fba4",
  "12.2": "6687b6777ddfa7f7",
  "13.2": "de526525ca4cfd5c",
  "14.2": "bb43a427b0eb863a",
  "15.2": "59bba7432a0a8c3e",
  "16.2": "8ac6d224bf347122",
  "1.3": "60a98d0f2452d4fc",
  "2.3": "290765309e1b0aee",
  "3.3": "f58121343e294b38",
  "4.3": "27b52cfaa0a0d5d0",
  "5.3": "becd1cbd0a6707e5",
  "6.3": "095441a90fc7d3b5",
  "7.3": "7597925fb96d85f8",
  "8.3": "79c1021955d5a9f8",
  "9.3": "b4c21a52fedd761d",
  "10.3": "45ee2d9f09e75a01",
  "11.3": "994c2344b65be2ca",
  "12.3": "af65f4c36a6e2f48",
  "13.3": "d25494ba6ace9416",
  "14.3": "24468bdebe06c4e3",
  "15.3": "706fe63dd0cb568b",
  "16.3": "f43540f1cf5cf9f8",
  "3.4": "7d8ff5ec9e33ce10",
  "1.4": "f4265c05236dcc95",
  "2.4": "a80661759448d8a0",
  "3.5": "913fbb02566181e7",
  "4.4": "9c4a6e6c79dbef9d",
  "5.4": "e56ad61810cb883c",
  "6.4": "1f6a512a6142ab1d",
  "7.4": "f633f2aa37ea128e",
  "8.4": "a408a212a8916085",
  "9.4": "7a234f39234ff149",
  "10.4": "f6f314d5b77c40a1",
  "11.4": "b0426cb453c53ec2",
  "12.4": "9fcbd334c1b4e0f0",
  "13.4": "1bf482c6a51a8b0d",
  "14.4": "9d8511bde9836d73",
  "15.4": "45fb89afe8687a19",
  "16.4": "000c870efaa0eb96",
};
// sha256 of the stamp's message bits for one genome of each earlier real frame (individual(frame, 7), every open chapter read), as the registry wrote them before frame version 6
const STAMP_DIGESTS = {
  "1.2": "e0f996136dbcb8bc",
  "2.2": "759c1a02a8ec261c",
  "3.2": "8f8efc535d8a6422",
  "4.2": "56c4fd0a748c0cb4",
  "5.2": "3cd411575fb9ee4b",
  "6.2": "cdb46fbfd823d87b",
  "7.2": "9375683908db60ef",
  "8.2": "1211fb9759348e62",
  "9.2": "ce4f521b222b35b4",
  "10.2": "b24b58f7273db5c4",
  "11.2": "6295ac98c4097f73",
  "12.2": "3b7d4f11c59664ba",
  "13.2": "ef9c2f8ed99df587",
  "14.2": "425369d849228772",
  "15.2": "87e3ed3ef404650b",
  "16.2": "405eed37dea7e6b1",
  "1.3": "bf725d8900832e82",
  "2.3": "c0546a9d4d3cfbf0",
  "3.3": "facc4cd2e52ed608",
  "4.3": "1dd6ad787cd297ba",
  "5.3": "3552af04e0a36c73",
  "6.3": "d50925831cf65191",
  "7.3": "9db48c3d10a8b80f",
  "8.3": "2e27a18d5e5e7fbd",
  "9.3": "c6b119c1d6f87de1",
  "10.3": "658c555830cd5098",
  "11.3": "09bfd69fb46cc6c4",
  "12.3": "44d221891bbb90a2",
  "13.3": "008dbd861a0769b2",
  "14.3": "689b7c96f9ce1c53",
  "15.3": "07353e51a87db0b7",
  "16.3": "0a332427a82af7ec",
  "3.4": "5210c9d6af52546d",
  "1.4": "7d6cebef15b31b27",
  "2.4": "60a331c358b1921d",
  "3.5": "128d32f27cc017ef",
  "4.4": "3c2441fe27252c91",
  "5.4": "fe505d9ce0f13af7",
  "6.4": "ab1b522bca84bc46",
  "7.4": "5126e81b67de0cc7",
  "8.4": "5cb1f95e9f4d979e",
  "9.4": "9e585052d9882e47",
  "10.4": "bdcce4e2344bbed3",
  "11.4": "8f97787c6fb3e680",
  "12.4": "145f928936d87b38",
  "13.4": "45cc8a492c1815db",
  "14.4": "1fd8b5c7949bb37f",
  "15.4": "bc55bd448dfcdb60",
  "16.4": "59040810f4357b0d",
};

test("the registry is append-only: every frame it held before frame version 6 is the same bytes, in the same place, and the fluffy frames follow", () => {
  const frames = FRAME_DATA.frames, before = Object.keys(FRAME_DIGESTS);
  assert.deepEqual(frames.slice(0, before.length).map((f) => `${f.species}.${f.version}`), before, "the earlier frames come first, in their order");
  frames.slice(0, before.length).forEach((f) => assert.equal(sha(JSON.stringify(f)), FRAME_DIGESTS[`${f.species}.${f.version}`], `${f.id} ${f.species}.${f.version} is unchanged`));
  assert.deepEqual(frames.slice(before.length).map((f) => `${f.id}.${f.version}`), ["S17.6", "S18.6", "S19.6"], "Wickle, Drapet and Curlop, appended at frame version 6");
  assert.deepEqual(frames.slice(before.length).map((f) => f.name), ["Wickle", "Drapet", "Curlop"]);
});

test("every S01-S16 stamp encodes to the same bytes as before and decodes to the same genome", () => {
  const real = FRAMES_LIST.filter((f) => !f.synthetic && !f.legacy && f.species <= 16);
  assert.equal(real.length, Object.keys(STAMP_DIGESTS).length);
  for (const f of real) {
    const g = individual(f, 7, { read: f.chapters.filter((c) => !c.sealed).map((c) => c.name) });
    const { L, cells } = encodeCells(f, g), bits = L.msgCells.map(([r, c]) => cells.get(r * L.N + c)?.v ?? 0);
    assert.equal(sha(bits.join("")), STAMP_DIGESTS[`${f.species}.${f.version}`], `${f.id} ${f.species}.${f.version}: the stamp's bytes`);
    const back = parseMessage(bits, L.N, {});
    assert.ok(back.ok, back.detail); assert.equal(back.genome.species, f.species); assert.equal(back.genome.version, f.version);
    assert.ok(sameGenome(f, g, back.genome), `${f.id} ${f.species}.${f.version}: the same genome comes back`);
  }
});

test("the fluffy frames stamp and decode: a genome of each round-trips, and the newest frame is the encoder's default", () => {
  for (const [id, n] of [["S17", 17], ["S18", 18], ["S19", 19]]) {
    const f = byName(id); assert.equal(f.version, 6); assert.equal(f.species, n); assert.equal(frameFor(n, 6), f);
    for (const seed of [1, 2, 3]) {
      const g = individual(f, seed, { read: f.chapters.filter((c) => !c.sealed).map((c) => c.name) });
      const { L, cells } = encodeCells(f, g), bits = L.msgCells.map(([r, c]) => cells.get(r * L.N + c)?.v ?? 0), back = parseMessage(bits, L.N, {});
      assert.ok(back.ok, back.detail); assert.ok(sameGenome(f, g, back.genome), `${id} seed ${seed}`);
    }
  }
  const fluffy = ["anatomy.tail-curl-presence", "growth.tail-curl-turn", "growth.fur-skirt-flare", "growth.brow-tuft-length"];
  const open = (f) => new Set(f.heritable.map((l) => l.id));
  assert.ok(open(byName("S17")).has("growth.tail-curl-turn") && open(byName("S18")).has("growth.fur-skirt-flare") && open(byName("S18")).has("growth.brow-tuft-length") && open(byName("S19")).has("growth.tail-curl-turn"));
  for (const f of FRAMES_LIST.filter((x) => !x.synthetic && x.species <= 16)) for (const id of fluffy) assert.ok(!open(f).has(id), `${f.id}: no fluffy locus`);
});

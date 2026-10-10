// The status a composed picture carries comes from its layers: the least final one, never a flat "master".
import { test } from "node:test";
import assert from "node:assert/strict";
import { placeMaster, dropAsset } from "../../ui/assets.mjs";
import { leastFinal, podStatus, figureStatus } from "../src/podmasters.mjs";

const put = (id, status) => placeMaster({ id, w: 2, h: 2, file: "pods/" + id + ".png", hash: "ab", status }, { w: 2, h: 2, canvas: () => null });
test("leastFinal: placeholder before held before new before master; an unplaced id counts for nothing", () => {
  for (const [id, st] of [["t1", "master"], ["t2", "new"], ["t3", "held"], ["t4", "placeholder"]]) put(id, st);
  assert.equal(leastFinal(["t1"]), "master"); assert.equal(leastFinal(["t1", "t2"]), "new"); assert.equal(leastFinal(["t1", "t2", "t3"]), "held"); assert.equal(leastFinal(["t4", "t3", "t2", "t1"]), "placeholder");
  assert.equal(leastFinal(["t1", "nowhere"]), "master"); assert.equal(leastFinal([]), "master");
  for (const id of ["t1", "t2", "t3", "t4"]) dropAsset(id);
});
test("a composed pod takes the least final status of its three layers; a figure of its two slices, a placeholder until both are placed", () => {
  for (const l of ["shade", "mask-body"]) put("pod-tc-" + l, "master"); put("pod-tc-mask-accent", "new");
  assert.equal(podStatus("tc"), "new", "one layer still new: the pod is new");
  put("mibi-halo-T-128x160-mist", "master"); assert.equal(figureStatus("mibi-halo-T-128x160-mist", "mibi-halo-T-128x160-clear"), "placeholder", "the clear slice is not placed");
  put("mibi-halo-T-128x160-clear", "held"); assert.equal(figureStatus("mibi-halo-T-128x160-mist", "mibi-halo-T-128x160-clear"), "held");
  for (const id of ["pod-tc-shade", "pod-tc-mask-body", "pod-tc-mask-accent", "mibi-halo-T-128x160-mist", "mibi-halo-T-128x160-clear"]) dropAsset(id);
});

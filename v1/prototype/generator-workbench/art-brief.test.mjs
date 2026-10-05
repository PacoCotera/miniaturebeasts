import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  describeRendererSubject,
  describeCoveringField,
} from "./art-brief.mjs";
import {
  projectArtPrompt,
  resolveAuthoring,
  digest,
} from "./authoring-adapter.mjs";

function retained(name) {
  return JSON.parse(
    readFileSync(new URL(`./evidence/${name}.json`, import.meta.url)),
  );
}

test("renderer briefs preserve contrasting rooted roles and current neutral pose", () => {
  const first = retained("diversity-diagnosis/broad-seed-1");
  const second = retained("diversity-diagnosis/broad-seed-21");
  const a = describeRendererSubject(first.result, first.input.context);
  const b = describeRendererSubject(second.result, second.input.context);
  assert.match(a, /radial organization/);
  assert.match(a, /3 jointed appendages: 3 with 2 segments.*one contact tip/);
  assert.match(a, /3 membranes.*leading region/);
  assert.match(b, /2 membranes.*leading region/);
  assert.match(b, /2 fins.*leading region/);
  assert.match(b, /longitudinal envelope extent/);
  assert.match(b, /retained thickness/);
  assert.doesNotMatch(b, /tapered|root chord|leaf-shaped/);
  assert.doesNotMatch(b, /jointed appendages|flying|continuous.*body/);
  assert.match(a, /distinct body masses/);
  assert.match(b, /quiet orthographic still/);
  assert.notEqual(a, b);
});

test("continuous subject prose follows actual proportions, face and suppressed expression", () => {
  const skin = retained("pet-materials/pet-skin");
  const text = describeRendererSubject(skin.result, skin.input.context);
  assert.match(text, /continuous body with 3 proportion regions/);
  assert.match(text, /6 rounded leaf-shaped fins/);
  assert.match(text, /2 pale cream #f1eddc circular eyes.*40%/);
  assert.match(text, /separated by 65%/);
  assert.match(text, /#ae674d/);
  assert.match(text, /cream #dfd2ae, blue-gray #718489/);
  const input = structuredClone(skin.input);
  input.genome.loci["structure.ocular-pair"] = ["absent", "absent"];
  input.genome.loci["structure.oral-opening"] = ["off", "off"];
  const absent = resolveAuthoring(input);
  assert.equal(absent.status, "resolved");
  const absentText = describeRendererSubject(
    absent.result,
    absent.input.context,
  );
  assert.match(absentText, /modeled subject is faceless/);
  assert.match(absentText, /no expressed markings/);
  assert.doesNotMatch(absentText, /circular eyes|oral aperture|pupils/);
  const changed = structuredClone(skin.result);
  changed.graph.nodes.find((node) => node.role === "volume").dimensions[1] *=
    1.5;
  assert.notEqual(describeRendererSubject(changed, skin.input.context), text);
});

test("surface prose preserves actual material extent and realized marking gates", () => {
  const fur = retained("pet-materials/pet-fur");
  const text = describeRendererSubject(fur.result, fur.input.context);
  assert.match(text, /Sparse rooted fur texture.*20–95%/);
  assert.match(text, /Skin stays visible between the rooted patches/);
  assert.match(text, /rearward longitudinal alignment.*contour fans/);
  assert.match(text, /pigment at its body-local root/);
  const changed = structuredClone(fur.result);
  changed.graph.surfaces[0].markings = [
    { layout: "patches", orientation: 0.7, scale: 0.2, contrast: 0.4 },
  ];
  assert.match(
    describeRendererSubject(changed, fur.input.context),
    /1 marks on the continuous body in patches, orientation 0.7 radians/,
  );
  const broad = retained("diversity-diagnosis/broad-seed-21");
  assert.match(
    describeRendererSubject(broad.result, broad.input.context),
    /spanning 348.3% of front-region width/,
  );
  assert.match(
    describeRendererSubject(broad.result, broad.input.context),
    /spanning 69.7% of front-region width/,
  );
  const scales = retained("pet-materials/pet-scales");
  const plateSize = Number(
    (
      (100 * 2 * scales.result.graph.covering.elementProfile.halfWidth) /
      scales.result.graph.nodes[0].dimensions[1]
    ).toFixed(1),
  );
  assert.ok(
    describeRendererSubject(scales.result, scales.input.context).includes(
      `full scale width about ${plateSize}% of front-region width`,
    ),
  );
});

test("active marking extent changes the rendered per-region density", () => {
  const broad = retained("diversity-diagnosis/broad-seed-1");
  const lowInput = structuredClone(broad.input);
  lowInput.genome.loci["appearance.marking-switch"] = ["on", "on"];
  lowInput.genome.loci["appearance.marking-extent"] = ["low", "low"];
  const highInput = structuredClone(lowInput);
  highInput.genome.loci["appearance.marking-extent"] = ["high", "high"];
  const low = resolveAuthoring(lowInput);
  const high = resolveAuthoring(highInput);
  assert.equal(low.status, "resolved");
  assert.equal(high.status, "resolved");
  const lowCount = low.result.graph.surfaces[0].markings.length;
  const highCount = high.result.graph.surfaces[0].markings.length;
  assert.notEqual(lowCount, highCount);
  const lowText = describeRendererSubject(low.result, low.input.context);
  const highText = describeRendererSubject(high.result, high.input.context);
  assert.ok(lowText.includes(`${lowCount} marks on the leading region`));
  assert.ok(highText.includes(`${highCount} marks on the leading region`));
  assert.notEqual(lowText, highText);
});

test("v4 semantic prompt retains full audit bindings and unchanged source identity", () => {
  for (const name of [
    "diversity-diagnosis/broad-seed-1",
    "diversity-diagnosis/broad-seed-21",
    "pet-materials/pet-skin",
  ]) {
    const packet = retained(name);
    const before = JSON.stringify(packet);
    const prompt = projectArtPrompt(packet);
    assert.equal(prompt.templateVersion, 4);
    assert.deepEqual(prompt.bindings, packet.prompt.bindings);
    assert.equal(JSON.stringify(packet), before);
    assert.match(prompt.text, /pixel art|pixel-art/);
    assert.match(prompt.text, /pixel clusters/);
    assert.match(prompt.text, /controlled stair-step contours/);
    assert.doesNotMatch(
      prompt.text,
      /HiBit|calm midtone|warm upper-left|cool shadow/,
    );
    assert.doesNotMatch(
      prompt.text,
      /\{\{|sourceGroups|inputDigest|CONSTRUCTED|Do not paint|report the conflict|additional inherited materials/,
    );
    assert.ok(prompt.text.length < 32768);
    assert.equal(digest(packet.result), packet.resultDigest);
  }
});

test("material field prose preserves real extent/scale, skin gates and empty realization", () => {
  const scales = retained("pet-materials/pet-scales");
  const lowInput = structuredClone(scales.input);
  lowInput.genome.loci["appearance.covering-extent"] = ["low", "low"];
  lowInput.genome.loci["appearance.covering-scale"] = ["low", "low"];
  const extentInput = structuredClone(lowInput);
  extentInput.genome.loci["appearance.covering-extent"] = ["high", "high"];
  const sizeInput = structuredClone(lowInput);
  sizeInput.genome.loci["appearance.covering-scale"] = ["high", "high"];
  const packets = [lowInput, extentInput, sizeInput].map(resolveAuthoring);
  for (const packet of packets) assert.equal(packet.status, "resolved");
  const descriptions = packets.map((packet) =>
    describeRendererSubject(packet.result, packet.input.context),
  );
  assert.notEqual(descriptions[0], descriptions[1]);
  assert.notEqual(descriptions[0], descriptions[2]);
  assert.match(
    descriptions[0],
    /Local overlapping scale texture belongs to the skin/,
  );
  assert.doesNotMatch(
    descriptions[0],
    /carries \d+.*scale plates|plate half-width|plate objects/,
  );
  assert.match(descriptions[0], /body pigment boundaries continue/);
  const skin = retained("pet-materials/pet-skin");
  const changedSkin = structuredClone(skin.input);
  changedSkin.genome.loci["appearance.covering-scale"] = ["high", "high"];
  const latent = resolveAuthoring(changedSkin);
  assert.equal(
    describeRendererSubject(latent.result, latent.input.context),
    describeRendererSubject(skin.result, skin.input.context),
  );
  assert.match(
    describeCoveringField({ kind: "scales", count: 0 }),
    /no realized texture.*bare skin/,
  );
});

test("renderer projection retains independent engine authority and rejects unresolved subjects", () => {
  const packet = retained("diversity-diagnosis/broad-seed-1");
  packet.result.graph.nodes.push({ id: "invented-eye", role: "ocular" });
  packet.resultDigest = digest(packet.result);
  assert.throws(() => projectArtPrompt(packet), /shared engine replay/);
  assert.throws(
    () => describeRendererSubject({ status: "rejected" }, {}),
    /Resolved expression/,
  );
});

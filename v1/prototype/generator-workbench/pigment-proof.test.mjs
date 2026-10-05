import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { GRAPH_COVERING_CATALOGUE } from "./graph-covering-catalogue.mjs";
import {
  BODY_PIGMENTS,
  SECONDARY_PIGMENTS,
  PIGMENT_LOCUS_IDS,
  PIGMENT_CANDIDATE_CATALOGUE,
} from "./pigment-candidate-catalogue.mjs";
import { validateCatalogue, generateGenome } from "./model.mjs";
import {
  digest,
  resolveAuthoring,
  replayAuthoring,
} from "./authoring-adapter.mjs";
import {
  generateModuleSceneAuthoring,
  resolveModuleSceneAuthoring,
} from "./module-scene-authoring.mjs";
import {
  createControlledPigmentProof,
  radialPigmentInput,
  pigmentGeometrySnapshot,
} from "./pigment-proof.mjs";
import { encodeGenomeTree, decodeGenomeTree } from "./genome-codec.mjs";
import { commonGraphSourceCamera } from "./graph-source-presentation.mjs";
import { drawBodyCoveringScene } from "./graph-covering-presentation.mjs";

const locus = (catalogue, id) => catalogue.loci.find((item) => item.id === id);
const cases = () => createControlledPigmentProof();

test("candidate expands only two exact pigment records and preserves six old maps", () => {
  const originalDigest = digest(GRAPH_COVERING_CATALOGUE);
  assert.equal(validateCatalogue(PIGMENT_CANDIDATE_CATALOGUE).valid, true);
  assert.equal(PIGMENT_CANDIDATE_CATALOGUE.version, 2);
  assert.notEqual(PIGMENT_CANDIDATE_CATALOGUE.id, GRAPH_COVERING_CATALOGUE.id);
  assert.equal(PIGMENT_CANDIDATE_CATALOGUE.loci.length, 54);
  assert.equal(
    PIGMENT_CANDIDATE_CATALOGUE.ruleVersion,
    GRAPH_COVERING_CATALOGUE.ruleVersion,
  );
  assert.deepEqual(
    PIGMENT_CANDIDATE_CATALOGUE.constructionRules,
    GRAPH_COVERING_CATALOGUE.constructionRules,
  );
  for (const [id, pigments, mapCount] of [
    [PIGMENT_LOCUS_IDS.body, BODY_PIGMENTS, 55],
    [PIGMENT_LOCUS_IDS.secondary, SECONDARY_PIGMENTS, 21],
  ]) {
    const oldRecord = locus(GRAPH_COVERING_CATALOGUE, id);
    const record = locus(PIGMENT_CANDIDATE_CATALOGUE, id);
    assert.equal(record.version, 2);
    assert.deepEqual(
      record.alleles.slice(0, oldRecord.alleles.length),
      oldRecord.alleles,
    );
    assert.deepEqual(
      record.alleles.map(({ id, value }) => [id, value]),
      pigments,
    );
    assert.equal(Object.keys(record.pairMap).length, mapCount);
    for (const [key, value] of Object.entries(oldRecord.pairMap)) {
      assert.deepEqual(record.pairMap[key], value);
    }
    const withoutExpansion = structuredClone(record);
    withoutExpansion.version = oldRecord.version;
    withoutExpansion.alleles = oldRecord.alleles;
    withoutExpansion.pairMap = oldRecord.pairMap;
    assert.deepEqual(withoutExpansion, oldRecord);
  }
  for (const record of GRAPH_COVERING_CATALOGUE.loci) {
    if (!Object.values(PIGMENT_LOCUS_IDS).includes(record.id)) {
      assert.deepEqual(locus(PIGMENT_CANDIDATE_CATALOGUE, record.id), record);
    }
  }
  assert.equal(digest(GRAPH_COVERING_CATALOGUE), originalDigest);
});

test("ordinary validator rejects missing/unknown pairs, malformed pigments and unknown copies", () => {
  for (const change of [
    (record) => {
      delete record.pairMap["jade|lagoon"];
    },
    (record) => {
      record.pairMap["jade|unknown"] = ["#38a878"];
    },
    (record) => {
      record.pairMap["jade|jade"] = ["green"];
    },
  ]) {
    const catalogue = structuredClone(PIGMENT_CANDIDATE_CATALOGUE);
    change(locus(catalogue, PIGMENT_LOCUS_IDS.body));
    assert.equal(validateCatalogue(catalogue).valid, false);
  }
  const input = structuredClone(cases()[0].input);
  input.genome.loci[PIGMENT_LOCUS_IDS.body][0] = "unknown";
  assert.equal(resolveAuthoring(input).status, "rejected");
  const tooManyPigments = structuredClone(PIGMENT_CANDIDATE_CATALOGUE);
  locus(tooManyPigments, PIGMENT_LOCUS_IDS.body).alleles.push({
    id: "eleventh",
    label: "eleventh",
    value: "#123456",
  });
  assert.ok(
    validateCatalogue(tooManyPigments).errors.some(
      (error) => error.code === "allele-definitions",
    ),
  );
  const nonPalette = structuredClone(PIGMENT_CANDIDATE_CATALOGUE);
  const numericRecord = locus(nonPalette, "structure.body-width");
  for (const id of ["third", "fourth", "fifth"]) {
    numericRecord.alleles.push({ id, label: id, value: 0.5 });
  }
  assert.ok(
    validateCatalogue(nonPalette).errors.some(
      (error) => error.code === "allele-definitions",
    ),
  );
  for (const change of [
    (record) => {
      record.outputs = ["bodyWidth"];
    },
    (record) => {
      record.status = "draft";
    },
  ]) {
    const catalogue = structuredClone(PIGMENT_CANDIDATE_CATALOGUE);
    change(locus(catalogue, PIGMENT_LOCUS_IDS.body));
    assert.ok(
      validateCatalogue(catalogue).errors.some(
        (error) => error.code === "allele-definitions",
      ),
    );
  }
});

test("controlled copies own their actual domains, fixed eyes and material fragments without geometry drift", () => {
  const controlled = cases();
  const geometry = pigmentGeometrySnapshot(controlled[0].packet);
  const camera = commonGraphSourceCamera(
    controlled.map((item) => item.packet.scene.body),
  );
  for (const item of controlled) {
    const packet = item.packet;
    const body = locus(PIGMENT_CANDIDATE_CATALOGUE, PIGMENT_LOCUS_IDS.body);
    const secondary = locus(
      PIGMENT_CANDIDATE_CATALOGUE,
      PIGMENT_LOCUS_IDS.secondary,
    );
    const bodyColors =
      body.pairMap[[...packet.input.genome.loci[body.id]].sort().join("|")];
    const secondaryColors =
      secondary.pairMap[
        [...packet.input.genome.loci[secondary.id]].sort().join("|")
      ];
    assert.deepEqual(pigmentGeometrySnapshot(packet), geometry);
    assert.equal(packet.prompt.error, undefined);
    for (const surface of packet.result.graph.surfaces) {
      assert.deepEqual(
        surface.palette,
        surface.region === "volume" ? bodyColors : secondaryColors,
      );
      assert.equal(surface.markings.length, 0);
    }
    assert.ok(packet.scene.covering.plates.length > 0);
    for (const plate of packet.scene.covering.plates) {
      for (const fragment of plate.pigmentFragments) {
        assert.ok(bodyColors.includes(fragment.palette));
        const sourceSurface = packet.result.graph.surfaces.find(
          (surface) => surface.id === fragment.surfaceId,
        );
        assert.equal(
          fragment.palette,
          sourceSurface.palette[fragment.maskIndex],
        );
      }
    }
    for (const eye of packet.scene.ocular.features) {
      assert.equal(eye.outerPalette, "#f1eddc");
      assert.equal(eye.pupilPalette, "#273036");
    }
    const svg = drawBodyCoveringScene(
      packet.scene.body,
      packet.scene.ocular,
      packet.scene.covering,
      { camera, size: 256 },
    );
    assert.ok(svg.includes(bodyColors[0]));
    assert.ok(svg.includes(secondaryColors[0]));
  }
  const mixed = controlled.find((item) => item.name === "mixed-fields").packet;
  const reversed = controlled.find(
    (item) => item.name === "reversed-copies",
  ).packet;
  assert.deepEqual(mixed.input.genome.loci[PIGMENT_LOCUS_IDS.body], [
    "jade",
    "lagoon",
  ]);
  assert.deepEqual(reversed.input.genome.loci[PIGMENT_LOCUS_IDS.body], [
    "lagoon",
    "jade",
  ]);
  assert.deepEqual(
    mixed.result.graph.surfaces.map((surface) => surface.palette),
    reversed.result.graph.surfaces.map((surface) => surface.palette),
  );
  assert.notEqual(
    mixed.identity.inheritedDigest,
    reversed.identity.inheritedDigest,
  );
  assert.deepEqual(mixed.result.graph.surfaces[0].palette, [
    "#38a878",
    "#269fa5",
  ]);
  assert.deepEqual(
    mixed.result.graph.surfaces.find((surface) => surface.region !== "volume")
      .palette,
    ["#dfd2ae", "#718489"],
  );
});

test("radial result carries secondary copies without painted secondary fields or scene repair", () => {
  const input = radialPigmentInput();
  const before = digest(input);
  const packet = resolveAuthoring(input);
  assert.equal(packet.status, "resolved");
  assert.deepEqual(packet.input.genome.loci[PIGMENT_LOCUS_IDS.secondary], [
    "cream",
    "slate",
  ]);
  assert.equal(
    packet.result.facts.find((fact) => fact.id === "undersidePalette").state,
    "inactive",
  );
  for (const surface of packet.result.graph.surfaces) {
    assert.deepEqual(surface.palette, ["#38a878", "#269fa5"]);
  }
  assert.equal(resolveModuleSceneAuthoring(input).status, "rejected");
  assert.equal(digest(input), before);
});

test("bounded random search preserves the actual accepted draw and complete accounting", () => {
  const catalogueDigest = digest(PIGMENT_CANDIDATE_CATALOGUE);
  const packet = generateModuleSceneAuthoring(PIGMENT_CANDIDATE_CATALOGUE, 1, {
    maxAttempts: 1024,
  });
  const accounting = packet.generation;
  assert.ok(accounting.attempts <= 1024);
  assert.equal(accounting.seedSequence.length, accounting.attempts);
  assert.deepEqual(
    accounting.seedSequence,
    Array.from({ length: accounting.attempts }, (_, index) => 1 + index),
  );
  const accepted = packet.status === "resolved" ? 1 : 0;
  assert.equal(
    Object.values(accounting.rejected).reduce((sum, count) => sum + count, 0) +
      accepted,
    accounting.attempts,
  );
  if (accepted) {
    const originalDraw = generateGenome(
      PIGMENT_CANDIDATE_CATALOGUE,
      accounting.winningSeed,
      { maxAttempts: 1 },
    );
    assert.equal(originalDraw.status, "generated");
    assert.deepEqual(packet.input.genome, originalDraw.genome);
    assert.equal(packet.scene.status, "constructed");
  } else {
    assert.equal(packet.errors[0].code, "generation-exhausted");
    assert.equal(accounting.attempts, 1024);
  }
  assert.equal(digest(PIGMENT_CANDIDATE_CATALOGUE), catalogueDigest);
});

test("candidate G/T exact codec roundtrips retain copies and old foundations/golden bytes remain pinned", () => {
  const mixed = cases().find((item) => item.name === "mixed-fields").packet;
  const candidateStore = new Map([
    [digest(PIGMENT_CANDIDATE_CATALOGUE), PIGMENT_CANDIDATE_CATALOGUE],
  ]);
  const oldPacket = JSON.parse(
    readFileSync(
      new URL(
        "evidence/module-scene-workbench/single-scales.packet.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const oldStore = new Map([
    [digest(oldPacket.input.catalogue), oldPacket.input.catalogue],
  ]);
  const oldGolden = readFileSync(
    new URL(
      "evidence/genome-tree-codec/single-scales.S.G.clt",
      import.meta.url,
    ),
    "utf8",
  );
  assert.equal(
    encodeGenomeTree(oldPacket, { purpose: "G", foundationMode: "S" }).text,
    oldGolden,
  );
  assert.equal(replayAuthoring(oldPacket).resultDigest, oldPacket.resultDigest);
  assert.equal(
    decodeGenomeTree(oldGolden, { foundations: candidateStore }).status,
    "dependency-unresolved",
  );
  for (const purpose of ["G", "T"]) {
    for (const foundationMode of ["S", "E"]) {
      const encoded = encodeGenomeTree(mixed, { purpose, foundationMode });
      assert.equal(encoded.status, "encoded", JSON.stringify(encoded.errors));
      assert.equal(encoded.metrics.alleleBits, 106);
      const decoded = decodeGenomeTree(encoded.text, {
        foundations: candidateStore,
      });
      assert.equal(decoded.status, "decoded", JSON.stringify(decoded.errors));
      assert.deepEqual(decoded.packet.input.genome, mixed.input.genome);
      if (purpose === "T") assert.deepEqual(decoded.packet, mixed);
      assert.equal(
        encodeGenomeTree(decoded.packet, { purpose, foundationMode }).text,
        encoded.text,
      );
      if (foundationMode === "S") {
        assert.equal(
          decodeGenomeTree(encoded.text, { foundations: oldStore }).status,
          "dependency-unresolved",
        );
        assert.equal(
          decodeGenomeTree(encoded.text, {
            foundations: new Map([
              [digest(PIGMENT_CANDIDATE_CATALOGUE), oldPacket.input.catalogue],
            ]),
          }).status,
          "rejected",
        );
      }
    }
  }
});

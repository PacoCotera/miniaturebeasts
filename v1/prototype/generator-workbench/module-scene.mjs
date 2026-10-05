import { REGIONAL_SCENE_RULE } from "./regional-scene-catalogue.mjs";
import { digest } from "./evaluate.mjs";
import { constructGraphSource } from "./graph-source-construction.mjs";
import { constructOcularModule } from "./graph-module-construction.mjs";
import { constructBodyCovering } from "./graph-covering-construction.mjs";
import { constructRadialScene, RADIAL_SCENE_VERSION } from "./radial-scene.mjs";

export const MODULE_SCENE_VERSION = "module-scene/1";
export const REGIONAL_SCENE_VERSION = "module-scene/2";
export function sceneVersionForRule(rule) {
  return rule === REGIONAL_SCENE_RULE
    ? REGIONAL_SCENE_VERSION
    : MODULE_SCENE_VERSION;
}
export function sceneVersionForResult(result) {
  return result?.sourceRuleVersion === REGIONAL_SCENE_RULE &&
    result.facts?.some(
      (fact) => fact.id === "symmetry" && fact.value === "radial",
    )
    ? RADIAL_SCENE_VERSION
    : sceneVersionForRule(result?.sourceRuleVersion);
}

// The scene is a post-resolution consumer. It never installs modules into the genome.
export function constructModuleScene(result, options = {}) {
  function rejected(stage, errors) {
    return { status: "rejected", stage, errors };
  }
  if (
    !options ||
    typeof options !== "object" ||
    Array.isArray(options) ||
    Object.keys(options).some((key) => key !== "profileVersion")
  ) {
    return rejected("source", [
      {
        code: "scene-options",
        path: "options",
        message: "Only the explicit scene profileVersion is supported.",
      },
    ]);
  }
  const { profileVersion } = options;
  if (profileVersion === RADIAL_SCENE_VERSION)
    return constructRadialScene(result, options);
  const regional = profileVersion === REGIONAL_SCENE_VERSION;
  const sourceRule = regional
    ? REGIONAL_SCENE_RULE
    : "developmental-covering/1";
  if (
    ![MODULE_SCENE_VERSION, REGIONAL_SCENE_VERSION].includes(profileVersion) ||
    result?.status !== "resolved" ||
    result.sourceRuleVersion !== sourceRule ||
    result.baseGraphRuleVersion !==
      (regional
        ? "developmental-regional-growth/1"
        : "developmental-analytic/1") ||
    result.ocularModuleRuleVersion !==
      (regional ? "ocular-module/3" : "ocular-module/2") ||
    result.coveringModuleRuleVersion !==
      (regional ? "body-covering/2" : "body-covering/1")
  ) {
    return rejected("source", [
      {
        code: "scene-profile",
        path: "result",
        message:
          "The declared module-scene/1 covering source and consumer versions are required.",
      },
    ]);
  }
  const body = constructGraphSource(result, {
    profileVersion: regional ? "graph-source/2" : "graph-source/1",
    sourceRuleVersion: result.baseGraphRuleVersion,
  });
  if (body.status !== "constructed") return rejected("body", body.errors);
  const ocular = constructOcularModule(result, body, {
    profileVersion: result.ocularModuleRuleVersion,
  });
  if (ocular.status !== "constructed") return rejected("ocular", ocular.errors);
  const covering = constructBodyCovering(result, body, ocular, {
    profileVersion: result.coveringModuleRuleVersion,
  });
  if (covering.status !== "constructed")
    return rejected("covering", covering.errors);
  const scene = {
    status: "constructed",
    schemaVersion: "critter-module-scene/1",
    profileVersion,
    sourceResultDigest: digest(result),
    body,
    ocular,
    covering,
    limitations: [
      "Static orthographic XY source construction; not a 3D mesh, physiology, animation or finished game art.",
    ],
  };
  return { ...scene, sceneDigest: digest(scene) };
}

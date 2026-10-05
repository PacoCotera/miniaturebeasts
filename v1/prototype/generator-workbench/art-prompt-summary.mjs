// A wording consumer of a resolved, pinned source. It never evaluates copies,
// changes source anatomy or trusts a prompt embedded in an imported record.
const SUMMARY_VERSION = "art-prompt-summary/1";
const PET_INSTRUCTION = "Turn the attached critter into a cute pet, shown alone in rich high-bit pixel art.";
const CURRENT_PROFILES = ["compositional-source/3", "compositional-source/4", "compositional-source/5", "compositional-source/6", "compositional-source/7"];
import { isCompositionalDraft } from "./compositional-draft-format.mjs";

function counted(count, singular, plural = `${singular}s`) {
  const words = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
  return `${words[count] ?? count} ${count === 1 ? singular : plural}`;
}

function joined(items) {
  return items.length <= 2 ? items.join(" and ") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

export function unavailableArtPromptSummary(packet, error) {
  const version = packet?.sceneProjectionVersion === "compositional-source/7" ? "art-prompt-summary/2" : SUMMARY_VERSION;
  const reason = error instanceof Error ? error.message : "The source description could not be derived.";
  return {
    version,
    status: "unavailable",
    text: "",
    reason,
    error: reason,
    audit: {
      version,
      sourceRecordId: packet.recordId,
      sceneDigest: packet.sceneDigest,
      sourceProfile: packet.sceneProjectionVersion,
      reason,
      clauseWitnesses: []
    }
  };
}

export function artPromptSummary(packet) {
  const scene = packet?.scene;
  const catalogue = packet?.input?.catalogue;
  const marking = packet?.sceneProjectionVersion === "compositional-source/7";
  const version = marking ? "art-prompt-summary/2" : SUMMARY_VERSION;
  const coat = marking || packet?.sceneProjectionVersion === "compositional-source/6";
  const roles = coat || packet?.sceneProjectionVersion === "compositional-source/5";
  const innate = marking && packet?.ruleVersion === "developmental-compositional-source/6";
  const catalogueVersion = innate ? 6 : marking ? 5 : coat ? 4 : roles ? 3 : 2;
  if (packet?.status !== "resolved" || packet.result?.status !== "resolved" ||
      packet.ruleVersion !== `developmental-compositional-source/${catalogueVersion}` ||
      !CURRENT_PROFILES.includes(packet.sceneProjectionVersion) ||
      scene?.status !== "constructed" || scene.profileVersion !== packet.sceneProjectionVersion ||
      scene.covering?.profileVersion !== `compositional-surface-fields/${innate ? 5 : catalogueVersion}` ||
      !((catalogue?.id === "genomic-compositional-source-experiment" && catalogue.version === catalogueVersion) ||
        (isCompositionalDraft(catalogue) && catalogue.authoredRecipe.parent.version === catalogueVersion)) ||
      !catalogue.foundationPin || !packet.recordId || !packet.sceneDigest) {
    throw new Error("A resolved source3/4/5/6/7 with its matching pinned foundation is required for the pet summary.");
  }

  const nodes = scene.nodes;
  const facts = packet.result.facts.filter((fact) => fact.state === "expressed");
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const primary = nodes.filter((node) => node.role === "primary-region");
  if (!primary.length || scene.conventions.primaryCount !== primary.length) {
    throw new Error("Pet summary primary-region witnesses are incomplete.");
  }
  const witnesses = [];
  function clause(text, owners, targets = [], details = {}) {
    const sourceIds = new Set(owners.flatMap((owner) => owner.sources));
    const contributors = facts.filter((fact) => sourceIds.has(fact.locusId) || targets.includes(fact.target));
    witnesses.push({ text, nodeIds: owners.map((owner) => owner.id), locusIds: contributors.map((fact) => fact.locusId),
      factIds: contributors.map((fact) => fact.id), ...details });
    return text;
  }
  function paletteNames(owner) {
    // The exact retained pigment records supply names for unlit owner fields.
    const definitions = catalogue.loci.filter((locus) =>
      ["appearance.body-palette", "appearance.underside-palette"].includes(locus.id) &&
      (locus.version === 2 || (isCompositionalDraft(catalogue) && Number.isInteger(locus.version) && locus.version > 2)));
    return owner.palette.map((pigment) => {
      const matches = definitions.flatMap((locus) => locus.alleles.filter((allele) => allele.value === pigment)
        .map((allele) => ({ locusId: locus.id, alleleId: allele.id, label: allele.label, value: allele.value })));
      if (matches.length !== 1 || !matches[0].label) throw new Error("Owner pigment lacks an exact pinned name.");
      return matches[0];
    });
  }
  function paletteClause(owners) {
    const groups = [...new Map(owners.map((owner) => [JSON.stringify(owner.palette), owner])).values()];
    if (groups.length !== 1) throw new Error("Mixed owner palettes need an explicit summary convention.");
    const fields = paletteNames(groups[0]);
    return { words: fields.map((field) => field.label.toLowerCase()).join("-and-"), fields,
      localFields: fields.length === 2 ? "two ordered local fields per owner" : "one local field per owner" };
  }
  function descendantsOf(root) {
    return nodes.filter((node) => {
      let parent = node.parent;
      while (parent) {
        if (parent === root.id) return true;
        parent = byId.get(parent)?.parent;
      }
      return false;
    });
  }

  const heads = nodes.filter((node) => node.role === "typed-head");
  const shapeWords = [...new Set(primary.map((owner) => {
    if (!owner.shape) throw new Error("Primary shape witness is missing.");
    const squared = owner.shape.crossExponent >= 3 ? "softly squared, " : "";
    const form = { ovoid: "ovoid", barrel: "barrel-shaped", tapered: "tapered" }[owner.shape.longitudinalForm];
    if (!form) throw new Error("Unsupported primary shape label.");
    return `${squared}${form}`;
  }))];
  const organization = primary.length === 1 ? "" : scene.conventions.layout === "fan" ? "branched " : "linked ";
  const symmetry = scene.conventions.primarySymmetry === "radial" ? "radial " : "";
  const body = clause(`${heads.length ? "A creature" : "A headless creature"} with ${counted(primary.length,
    `${organization}${symmetry}${joined(shapeWords)} body region`)}`, primary,
    ["organization.layout", "organization.symmetry", "modules.typedHead"]);

  const features = [];
  if (heads.length) features.push(clause(counted(heads.length, "smooth head"), heads, ["modules.typedHead"]));
  const muzzles = nodes.filter((node) => node.role === "muzzle");
  if (muzzles.length) features.push(clause(counted(muzzles.length, "projecting muzzle"), muzzles));
  const eyes = nodes.filter((node) => node.role === "ocular-rim" &&
    nodes.some((child) => child.parent === node.id && child.role === "ocular-pupil"));
  if (eyes.length) features.push(clause(counted(eyes.length, "eye"), eyes, ["modules.exteriorEyePair"]));
  const crowns = nodes.filter((node) => node.role === "crown" && byId.get(node.parent)?.role === "typed-head");
  if (crowns.length) {
    const form = facts.find((fact) => fact.target === "crown.form")?.value;
    if (!["rounded", "pointed"].includes(form)) throw new Error("Head-projection form witness is missing.");
    features.push(clause(counted(crowns.length, `${form} head projection`), crowns, ["crown.form"]));
  }
  if (roles) {
    const ears = nodes.filter((node) => node.role === "auricular-sheet" && byId.get(node.parent)?.role === "typed-head");
    if (ears.length) {
      if (ears.length !== 2 || ears.some((ear) => !["rounded", "pointed"].includes(ear.form) || !ear.auricular || !ear.attachment?.witness)) throw new Error("Auricular role witnesses are incomplete.");
      features.push(clause(counted(ears.length, `${ears[0].form} smooth ear`), ears, ["ears.enabled", "ears.form", "ears.lengthOverHeadRz"]));
    }
    const tails = nodes.filter((node) => node.role === "axial-tail");
    if (tails.length) {
      if (tails.length !== 1 || !tails[0].sweep || !tails[0].attachment?.witness) throw new Error("Axial tail witnesses are incomplete.");
      features.push(clause("one smooth tapered tail", tails, ["tail.enabled", "tail.lengthOverOwnerRx", "tail.baseRadiusOverOwnerCross", "tail.bendRadians"], { ownerRule: tails[0].sweep.ownerRule, selectedOwner: tails[0].parent }));
    }
  }

  const chainRoots = nodes.filter((node) => ["contact-chain", "free-chain"].includes(node.role) &&
    node.attachment?.owner === node.parent && byId.get(node.parent)?.role === "primary-region");
  const chainOwners = [];
  const chainColourNouns = [];
  for (const role of ["contact-chain", "free-chain"]) {
    const roots = chainRoots.filter((node) => node.role === role);
    if (!roots.length) continue;
    const terminals = roots.map((root) => descendantsOf(root).find((node) => node.role === "contact-terminal"));
    const downward = roots.every((root, index) => {
      const endpoint = terminals[index]?.attachment?.position;
      const up = byId.get(root.parent)?.frame?.[2];
      return endpoint && up && endpoint.reduce((sum, coordinate, axis) =>
        sum + (coordinate - root.root[axis]) * up[axis], 0) < 0;
    });
    const legs = role === "contact-chain" && scene.conventions.primarySymmetry === "bilateral" &&
      terminals.every(Boolean) && downward;
    const noun = role === "free-chain" ? "tapered jointed appendage" : legs ? "jointed leg" : "jointed limb";
    const owners = roots.flatMap((root) => [root, ...descendantsOf(root)]);
    chainOwners.push(...owners);
    chainColourNouns.push(legs ? "jointed legs" : "jointed limbs");
    let text = counted(roots.length, noun);
    if (role === "contact-chain") {
      if (terminals.some((terminal) => !terminal?.terminalForm)) throw new Error("Contact-terminal witness is missing.");
      const forms = [...new Set(terminals.map((terminal) => terminal.terminalForm.kind))];
      const names = forms.map((form) => ({ rounded: "rounded", pad: "pad-shaped", wedge: "wedge-shaped" })[form]);
      if (names.some((name) => !name)) throw new Error("Unsupported contact-terminal label.");
      text += ` with ${joined(names)} ends`;
    }
    features.push(clause(text, owners, ["appendage.role"], { chainRootIds: roots.map((root) => root.id),
      terminalIds: terminals.filter(Boolean).map((terminal) => terminal.id), downwardInOwnerFrame: downward,
      legAlias: legs }));
  }
  const flaps = nodes.filter((node) => node.role === "thin-surface");
  if (flaps.length) features.push(clause(counted(flaps.length, "flat flap"), flaps, ["modules.wingPair"]));
  const anatomy = `${body}${features.length ? ` and ${joined(features)}` : ""}.`;

  const bodyPalette = paletteClause(primary);
  const materialKinds = [...new Set(primary.map((owner) => owner.material?.kind))];
  if (materialKinds.length !== 1) throw new Error("Body material witnesses need an explicit summary convention.");
  const covering = { fur: "fur", scales: "partially scaled skin", "smooth-skin": "smooth skin" }[materialKinds[0]];
  if (!covering) throw new Error("Unsupported body material label.");
  const material = clause(`${primary.length > 1 ? "Each body region has" : "Its body has"} ${bodyPalette.words} ${covering}`, primary,
    ["appearance.bodyPalette", "covering.furEnabled", "covering.kind", "covering.localExtent"], {
      ...bodyPalette,
      ownerMaterials: primary.map((owner) => ({ nodeId: owner.id, kind: owner.material.kind,
        localInterval: owner.material.localInterval ?? null, profileVersion: owner.material.profileVersion }))
    });
  const modularOwners = [...chainOwners, ...flaps];
  let modular = "";
  if (modularOwners.length) {
    const palette = paletteClause(modularOwners);
    const noun = roles
      ? joined([...new Set(chainColourNouns), ...(flaps.length ? ["flat flaps"] : [])])
      : chainOwners.length && flaps.length ? "limbs and flaps" : chainOwners.length ? "appendages" : "flaps";
    modular = clause(`its smooth ${noun} have ${palette.words} local colour fields`, modularOwners,
      ["appearance.modulePalette", "appearance.bodyPalette"], palette);
  }
  let markings = "";
  if (marking && scene.covering.markings?.enabled) {
    const field = scene.covering.markings;
    if (field.profile !== "primary-local-marking-field/1" || field.owners.length !== primary.length) {
      throw new Error("Primary marking field witnesses are incomplete.");
    }
    const descriptions = field.owners.map((owner) => {
      const bands = owner.logical.filter((mask) => mask.kind === "band" && mask.emittedPolygons > 0).length;
      const patches = owner.logical.filter((mask) => mask.kind === "patch" && mask.emittedPolygons > 0).length;
      return joined([...(bands ? [counted(bands, "band")] : []), ...(patches ? [counted(patches, "patch", "patches")] : [])]);
    });
    if (!descriptions[0] || descriptions.some((description) => description !== descriptions[0])) {
      throw new Error("Painted marking counts need an explicit owner summary convention.");
    }
    markings = clause(`${primary.length > 1 ? "Each body region carries" : "Its body carries"} ${descriptions[0]}`, primary,
      ["markings.enabled", "markings.layout", "markings.extent", "markings.scale", "markings.orientation", "markings.contrast"],
      { fieldProfile: field.profile, ownerMasks: field.owners.map((owner) => ({ owner: owner.owner,
        logical: owner.logical.map(({ id, kind, emittedPolygons }) => ({ id, kind, emittedPolygons })) })) });
  }
  const description = `${anatomy} ${material}${modular ? `; ${modular}` : ""}.${markings ? ` ${markings}.` : ""}`;
  return {
    version,
    status: "ready",
    text: `${PET_INSTRUCTION} ${description}`,
    description,
    audit: {
      version,
      sourceRecordId: packet.recordId,
      sceneDigest: packet.sceneDigest,
      sourceProfile: packet.sceneProjectionVersion,
      clauseWitnesses: witnesses,
      unsupportedLabels: [
        ...(roles ? [{ label: "hearing", reason: "Static auricular surfaces do not establish hearing." }] : [
          { label: "ears / hearing", reason: "Head projections have no ear-organ or hearing consumer." },
          { label: "tail", reason: "Generic primary child regions do not establish a tail." }
        ]),
        ...(marking ? [{ label: "rings / coloured pigment halves", reason: "Only the traced primary band/patch fields are markings; ordered pigment halves are not marks or new solids." }] :
          [{ label: "rings / stripes", reason: "Ordered pigment fields are not implemented marking geometry." }]),
        { label: "species / walking / flight", reason: "Static roles do not establish classification or physical capabilities." }
      ]
    }
  };
}

import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Accordion,
  Alert,
  AppShell,
  Badge,
  Button,
  Code,
  CopyButton,
  Divider,
  Group,
  JsonInput,
  MantineProvider,
  Modal,
  NavLink,
  NumberInput,
  Paper,
  ScrollArea,
  Select,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  Textarea,
  Title,
} from "@mantine/core";
import "@mantine/core/styles.css";
import "./workbench.css";
import ReturnedPetPanel from "./ReturnedPetPanel.jsx";
import GuidedCreatureWorkspace from "./GuidedCreatureWorkspace.jsx";
import { activeWorkingCreature, retainedWorkingCreatures, workingCreatureFor, retainWorkingCreature } from "../working-creature.mjs";
import { sourcePng } from "../source-png.mjs";
import {
  drawAuthoringCreature,
  drawGenomeField,
  compareResults,
} from "../presentation.mjs";
import { SURFACE_DETAIL_PROJECTION_VERSION } from "../family-presentation.mjs";
import {
  scopedLoci,
  scopedSelection,
  copyLabels,
  outputText,
  causalSummary,
  sharedPreviewCamera,
  freshGenerationSeed,
  isResolvedAuthoringPacket,
  imageLedPetHandoff,
  initialAuthoringInputs,
  authoringPackageLabel,
  unconsumedOutputNotice,
  authoringRoute,
  sceneReplayEnvelope,
  copyableAuthoringExport,
  sharedSceneCamera,
  comparisonUsesSharedCamera,
  scenePreviewMarkup,
  sceneCausalSummary,
  authoringPackageKey,
  mergeOptionalPackages,
  packageExamples,
  packageInputs,
  candidateStartupDecision,
  retainedAuthoringFailure,
  canPublishAuthoringResponse,
  authoringRequest,
  canonicalGenomicFamily,
  isCompositionalRule,
  supportsCompositionalAuthoring,
} from "../authoring-ui.mjs";
import { COMPOSITIONAL_DRAFT_SCHEMA, isCompositionalDraft, compositionalDraftRecipe } from "../compositional-draft-format.mjs";

const clone = (value) => structuredClone(value);
const pretty = (value) => JSON.stringify(value, null, 2);
const familyLabel = (id) => id.replaceAll("-", " ");
const storageKey = "critter-authoring-records-v1";
const draftKey = "critter-authoring-draft-v1";
const compositionalDraftKey = "critter-compositional-authoring-draft-v1";
const anatomicalRolesDraftKey = "critter-compositional-authoring-draft-v2";
const coherentCoatDraftKey = "critter-compositional-authoring-draft-v3";
const markingFieldDraftKey = "critter-compositional-authoring-draft-v4";
const innateProfileDraftKey = "critter-compositional-authoring-draft-v5";
const draftStorageKey = (catalogue) => catalogue?.ruleVersion === "developmental-compositional-source/6"
  ? innateProfileDraftKey : catalogue?.ruleVersion === "developmental-compositional-source/5"
  ? markingFieldDraftKey : catalogue?.ruleVersion === "developmental-compositional-source/4"
  ? coherentCoatDraftKey : catalogue?.ruleVersion === "developmental-compositional-source/3" ? anatomicalRolesDraftKey : compositionalDraftKey;

async function request(path, input) {
  const payload = input === undefined ? undefined : authoringRequest(input);
  const body = payload === undefined ? undefined : JSON.stringify(payload);
  if (body && (payload?.schemaVersion === COMPOSITIONAL_DRAFT_SCHEMA || payload?.catalogue?.schemaVersion === COMPOSITIONAL_DRAFT_SCHEMA || payload?.input?.catalogue?.schemaVersion === COMPOSITIONAL_DRAFT_SCHEMA) &&
      new TextEncoder().encode(body).length > 65536) {
    throw new Error("The authored request, including recipe and genome, exceeds64KiB. Reduce the edited-definition payload; the API limit remains unchanged.");
  }
  const response = await fetch(
    `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`,
    input === undefined
      ? {}
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        },
  );
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(
      data.errors
        ?.map((error) => `${error.path}: ${error.message}`)
        .join("\n") ??
        data.error ??
        "Request rejected.",
    );
    error.code = data.errors?.[0]?.code;
    error.generation = data.generation;
    error.stage = data.stage;
    throw error;
  }
  return data;
}

function SvgView({ markup, onSelect, compact = false }) {
  return (
    <div
      className={compact ? "svg-view creature-view" : "svg-view"}
      onClick={
        onSelect
          ? (event) => {
              const item = event.target.closest("[data-locus]");
              if (item) onSelect(item.getAttribute("data-locus"));
            }
          : undefined
      }
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}

function retainedReplayRoute(replay) {
  if (replay.sceneProjectionVersion?.startsWith("compositional-source/")) return "/api/compositional-source/replay";
  if (replay.sceneProjectionVersion === "anatomical-source/1") return "/api/anatomical-source/replay";
  return replay.sceneProjectionVersion ? "/api/module-scene/replay" : "/api/authoring/replay";
}

function Workbench() {
  const [catalogue, setCatalogue] = useState(null);
  const [packages, setPackages] = useState([]);
  const [familyExamples, setFamilyExamples] = useState([]);
  const [petExamples, setPetExamples] = useState([]);
  const [sceneExamples, setSceneExamples] = useState([]);
  const [draft, setDraft] = useState(null);
  const [genome, setGenome] = useState(null);
  const [context, setContext] = useState(null);
  const [packet, setPacket] = useState(null);
  const [lastResolved, setLastResolved] = useState(null);
  const [beforeRefresh, setBeforeRefresh] = useState(null);
  const [dirty, setDirty] = useState(true);
  const [renderPrompt, setRenderPrompt] = useState("");
  const [workingGroup, setWorkingGroup] = useState(null);
  const [savedCreatures, setSavedCreatures] = useState([]);
  const [persistenceNotice, setPersistenceNotice] = useState("");
  const resolvedRef = useRef(null);
  const workingGroupRef = useRef(null);
  const [pinned, setPinned] = useState(null);
  const [records, setRecords] = useState([]);
  const [view, setView] = useState("guided");
  const [advanced, setAdvanced] = useState(false);
  const [family, setFamily] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState("development.axial-repeat");
  const [edited, setEdited] = useState("");
  const [startingCopiesText, setStartingCopiesText] = useState("{}");
  const [baselineMetadataText, setBaselineMetadataText] = useState("{}");
  const [seed, setSeed] = useState(1);
  const [expressionSeed, setExpressionSeed] = useState(7);
  const [message, setMessage] = useState("Loading pinned content…");
  const [errorDetails, setErrorDetails] = useState("");
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [candidateStatus, setCandidateStatus] = useState("loading");
  const [json, setJson] = useState(null);
  const [jsonText, setJsonText] = useState("");
  const [batch, setBatch] = useState([]);
  const inputRevision = useRef(0);
  const processing = useRef(false);
  const userIntent = useRef(false);

  useEffect(() => {
    let active = true;
    request("/api/authoring/catalogue")
      .then((data) => {
        if (!active) return;
        setPackages(data.packages ?? []);
        setFamilyExamples(data.familyExamples ?? []);
        setPetExamples(data.petExamples ?? []);
        const initial = initialAuthoringInputs(data);
        setCatalogue(initial.catalogue);
        setDraft(clone(initial.catalogue));
        setStartingCopiesText(pretty(initial.genome.loci));
        setBaselineMetadataText("{}");
        setGenome(initial.genome);
        setContext(initial.context);
        setEdited(pretty(initial.catalogue.loci[0]));
        setMessage(
          "Loading variable body composition… Choose an older package to use it now.",
        );
        try {
          setRecords(JSON.parse(localStorage.getItem(storageKey) ?? "[]"));
        } catch {
          setMessage(
            "Local records could not be read; current catalogue remains available.",
          );
        }
        Promise.all([request("/api/module-scene/catalogue").catch(() => ({})), request("/api/anatomical-source/catalogue").catch(() => null), request("/api/compositional-source/catalogue").catch(() => null)])
          .then(([scenePackage, anatomy, composition]) => {
            if (!active) return;
            const candidate = scenePackage.candidatePackage;
            const regional = scenePackage.regionalPackage;
            const preferred = composition ?? anatomy ?? regional ?? candidate;
            setPackages((current) =>
              mergeOptionalPackages(current, [
                ...(scenePackage.catalogue ? [scenePackage] : []),
                ...(candidate ? [candidate] : []),
                ...(regional ? [regional] : []),
                ...(anatomy ? [anatomy] : []),
                ...(composition ? [composition, ...(composition.retainedPackages ?? [])] : []),
              ]),
            );
            setSceneExamples([
              ...(scenePackage.sceneExamples ?? []),
              ...(candidate?.sceneExamples ?? []),
              ...(regional?.sceneExamples ?? []),
              ...(anatomy?.sceneExamples ?? []),
              ...(composition?.sceneExamples ?? []),
              ...(composition?.retainedPackages ?? []).flatMap(item => item.sceneExamples ?? []),
            ]);
            const status = preferred ? "ready" : "unavailable";
            setCandidateStatus(status);
            if (
              candidateStartupDecision(status, userIntent.current, active)
                .selectCandidate
            ) {
              applyPackage(preferred, preferred.sceneExamples);
              setMessage(
                composition
                  ? "Ready to generate inherited regions, optional ears and tail, and owned coverings. All eleven genomic branches retain their actual consumer status."
                  : anatomy
                  ? "Ready to generate a new anatomical source. Optional parts, supports, colours and materials are inherited independently."
                  : regional
                  ? "Ready to generate a complete regional body scene."
                  : "Regional body experiment unavailable. Experimental pigment package is ready.",
              );
              try {
                setSavedCreatures(retainedWorkingCreatures());
                const saved = activeWorkingCreature();
                if (saved?.currentReplay) {
                  request(retainedReplayRoute(saved.currentReplay), saved.currentReplay).then((data) => {
                    if (!active || userIntent.current) return;
                    installResolvedInputs(data, "reopen", saved);
                    setMessage("Working mibi reopened from its exact saved recipe. Rendering still requires an explicit action.");
                    if (saved.previousReplay) {
                      const previous = saved.previousReplay;
                      request(retainedReplayRoute(previous), previous).then((before) => {
                        if (active && !userIntent.current && resolvedRef.current?.recordId === data.recordId && isResolvedAuthoringPacket(before)) setBeforeRefresh(before);
                      }).catch((error) => {
                        if (active && !userIntent.current) setPersistenceNotice(`Current mibi reopened; earlier comparison could not replay: ${error.message}. Retained recipes were preserved.`);
                      });
                    }
                  }).catch((error) => { if (active) setPersistenceNotice(`Working mibi could not reopen: ${error.message}. Retained records were preserved.`); });
                }
              } catch (error) { setPersistenceNotice(error.message); }
            } else if (!preferred && !userIntent.current) {
              setMessage(
                "Regional body experiment unavailable. Anatomy-diversity diagnostic is ready.",
              );
            }
          })
          .catch(() => {
            if (!active) return;
            setCandidateStatus("unavailable");
            setErrorDetails(
              "Regional body experiment unavailable. Existing packages remain usable.",
            );
            if (!userIntent.current)
              setMessage(
                "Experimental pigment candidate unavailable. Anatomy-diversity diagnostic is ready.",
              );
          });
      })
      .catch((error) => {
        if (!active) return;
        setMessage(error.message);
        setFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);

  function selectLocus(id) {
    const current = (view === "compendium" ? draft : catalogue)?.loci.find(
      (item) => item.id === id,
    );
    if (!current) return;
    const selectedFamily = view === "guided" ? canonicalGenomicFamily(current.family) : current.family;
    if (family !== "all" && family !== selectedFamily)
      setFamily(selectedFamily);
    if (!scopedLoci({ loci: [current] }, "all", search).length) setSearch("");
    setSelected(id);
    const locus = draft?.loci.find((item) => item.id === id);
    if (locus) setEdited(pretty(locus));
  }
  function changeScope(dimension, query = search) {
    setFamily(dimension);
    setSearch(query);
    const next = scopedSelection(
      scopedLoci(view === "compendium" ? draft : catalogue, dimension, query),
      selected,
    );
    setSelected(next);
    const record = (view === "compendium" ? draft : catalogue)?.loci.find(
      (item) => item.id === next,
    );
    if (record) setEdited(pretty(record));
  }
  function changeWorkspace(nextView) {
    if (["experiment", "compendium"].includes(nextView)) {
      const content = nextView === "compendium" ? draft : catalogue;
      let options = scopedLoci(content, family, search);
      if (!options.length) {
        setFamily("all");
        setSearch("");
        options = content.loci;
      }
      const nextSelected = scopedSelection(options, selected);
      setSelected(nextSelected);
      const record = draft.loci.find((item) => item.id === nextSelected);
      if (record) setEdited(pretty(record));
    }
    setView(nextView);
  }
  function invalidate(claimIntent = true) {
    if (claimIntent) userIntent.current = true;
    inputRevision.current += 1;
    setPacket(null);
    setDirty(true);
    setFailed(false);
    setErrorDetails("");
    setMessage(
      "Changes pending. Refresh structure to apply them; the last successful structure remains visible.",
    );
  }
  function publishResolved(data, mode = "refresh", knownGroup = workingGroupRef.current) {
    if (!isResolvedAuthoringPacket(data)) throw new Error("No verified structure returned");
    if (mode !== "refresh") {
      const preferred = data.input.catalogue.loci.find((entry) => entry.id === "organization.region-depth") ??
        data.input.catalogue.loci.find((entry) => entry.status === "validated" &&
          data.result.facts.some((fact) => fact.locusId === entry.id && fact.state !== "unimplemented"));
      if (preferred) { setSelected(preferred.id); setFamily("all"); setSearch(""); setEdited(pretty(preferred)); }
    }
    setBeforeRefresh(mode === "refresh" ? resolvedRef.current : null);
    setPacket(data);
    setLastResolved(data);
    resolvedRef.current = data;
    setDirty(false);
    setRenderPrompt(imageLedPetHandoff(data).text);
    let group;
    try { group = workingCreatureFor(data, knownGroup, mode); }
    catch (error) {
      group = workingCreatureFor(data, mode === "refresh" ? workingGroupRef.current : null, mode === "refresh" ? "refresh" : "fresh");
      setPersistenceNotice(`${error.message}. Current structure remains usable in this session.`);
    }
    try {
      group = retainWorkingCreature(group, sceneReplayEnvelope(data));
      setSavedCreatures(retainedWorkingCreatures());
      setPersistenceNotice("");
    } catch (error) {
      group.currentReplay = sceneReplayEnvelope(data);
      setPersistenceNotice(`${error.message}. Export the source recipe for durable retention.`);
    }
    workingGroupRef.current = group;
    setWorkingGroup(group);
  }
  function installResolvedInputs(data, mode = "reopen", knownGroup = workingGroupRef.current) {
    if (!isResolvedAuthoringPacket(data)) throw new Error("Retained recipe returned no verified structure");
    setPackages((current) => mergeOptionalPackages(current, [{ catalogue: data.input.catalogue,
      defaultGeneration: { genome: data.input.genome, context: data.input.context } }]));
    setCatalogue(data.input.catalogue);
    setDraft(clone(data.input.catalogue));
    setGenome(data.input.genome);
    setContext(data.input.context);
    setStartingCopiesText(pretty(data.input.catalogue.authoredRecipe?.startingCopies ?? data.input.genome.loci));
    setBaselineMetadataText(pretty(data.input.catalogue.authoredRecipe?.baselineMetadata ?? {}));
    setSelected(data.input.catalogue.loci[0].id);
    setFamily("all"); setSearch(""); setEdited(pretty(data.input.catalogue.loci[0]));
    publishResolved(data, mode, knownGroup);
  }
  function reopenWorkingCreature(id) {
    if (!id || processing.current) return;
    userIntent.current = true;
    const revision = inputRevision.current;
    return run(async () => {
      const saved = retainedWorkingCreatures().find((entry) => entry.association.id === id);
      if (!saved?.currentReplay) throw new Error("This mibi has no retained source recipe. Existing source remains available.");
      const data = await request(retainedReplayRoute(saved.currentReplay), saved.currentReplay);
      if (revision !== inputRevision.current) return;
      installResolvedInputs(data, "reopen", saved);
      if (saved.previousReplay) {
        try {
          const before = await request(retainedReplayRoute(saved.previousReplay), saved.previousReplay);
          if (revision === inputRevision.current && resolvedRef.current?.recordId === data.recordId && isResolvedAuthoringPacket(before)) setBeforeRefresh(before);
        } catch (error) {
          setPersistenceNotice(`Mibi reopened; earlier comparison could not replay: ${error.message}. Retained recipes were preserved.`);
        }
      }
      setMessage("Saved mibi reopened from its exact recipe. Rendering requires an explicit action.");
    });
  }
  function applyPackage(item, examples) {
    const input = packageInputs(item, examples);
    invalidate(false);
    setCatalogue(input.catalogue);
    setDraft(clone(input.catalogue));
    setStartingCopiesText(pretty(input.catalogue.authoredRecipe?.startingCopies ?? input.genome.loci));
    setBaselineMetadataText(pretty(input.catalogue.authoredRecipe?.baselineMetadata ?? {}));
    setGenome(input.genome);
    setContext(input.context);
    setExpressionSeed(input.expressionSeed ?? 7);
    setSelected(input.catalogue.loci[0].id);
    setFamily("all");
    setSearch("");
    setEdited(pretty(input.catalogue.loci[0]));
    setBatch([]);
  }
  function switchPackage(key) {
    const item = packages.find(
      (item) => authoringPackageKey(item.catalogue) === key,
    );
    if (!item || processing.current) return;
    userIntent.current = true;
    applyPackage(item, [...familyExamples, ...petExamples, ...sceneExamples]);
    setMessage(
      `${authoringPackageLabel(item.catalogue)} · v${item.catalogue.version} ready.`,
    );
  }
  function loadFamilyExample(name) {
    const example = packageExamples(catalogue, [
      ...familyExamples,
      ...petExamples,
      ...sceneExamples,
    ]).find((item) => item.name === name);
    if (!example || processing.current) return;
    invalidate();
    const revision = inputRevision.current;
    const exactInput = {
      catalogue: clone(catalogue),
      genome: clone(example.genome),
      context: clone(example.context),
      expressionSeed: example.expressionSeed ?? null,
    };
    setGenome(exactInput.genome);
    setContext(exactInput.context);
    return run(async () => {
      const data = await request(
        authoringRoute(catalogue, "evaluate"),
        exactInput,
      );
      if (revision !== inputRevision.current) return;
      if (!isResolvedAuthoringPacket(data))
        throw new Error("Example returned no verified mibi preview.");
      publishResolved(data, "reopen");
      setMessage("Example loaded. Preview ready.");
    });
  }
  async function run(operation, { retentionKind = null } = {}) {
    if (processing.current) return;
    processing.current = true;
    setBusy(true);
    setFailed(false);
    setErrorDetails("");
    const revision = inputRevision.current;
    const previousPacket = packet;
    try {
      await operation();
    } catch (error) {
      if (revision === inputRevision.current) {
        const recovery = retentionKind
          ? retainedAuthoringFailure(
              previousPacket,
              revision,
              inputRevision.current,
              retentionKind,
            )
          : null;
        setPacket(recovery?.packet ?? null);
        setMessage(
          recovery?.message ??
            (error.code === "generation-exhausted"
              ? "No valid mibi found in this bounded search. Generate again for a new seed."
              : error.message),
        );
        setErrorDetails(
          error.generation
            ? `${error.message}\n${pretty(error.generation)}`
            : error.message,
        );
        setFailed(true);
      }
    } finally {
      processing.current = false;
      setBusy(false);
    }
  }
  async function resolve(expression = null) {
    userIntent.current = true;
    setDirty(true);
    const revision = inputRevision.current;
    let data;
    try {
      data = await request(authoringRoute(catalogue, "evaluate"), {
        catalogue, genome, context, expressionSeed: expression,
      });
    } catch (error) {
      if (revision === inputRevision.current) setDirty(true);
      throw error;
    }
    if (revision !== inputRevision.current) return;
    publishResolved(data);
    setMessage("Structure refreshed. Render prompt reset to the new source brief; earlier renders retain their original text.");
  }
  function generateFresh() {
    if (processing.current) return;
    userIntent.current = true;
    const randomSeed = crypto.getRandomValues(new Uint32Array(1))[0];
    const generationSeed = freshGenerationSeed(Number(seed), randomSeed);
    setSeed(generationSeed);
    return run(() => generate(generationSeed), { retentionKind: "generate" });
  }
  async function generate(generationSeed = Number(seed)) {
    const revision = inputRevision.current;
    userIntent.current = true;
    setMessage("Generating a valid candidate…");
    const data = await request(authoringRoute(catalogue, "generate"), {
      catalogue,
      seed: generationSeed,
      maxAttempts: 1024,
    });
    if (revision !== inputRevision.current) return;
    if (
      !canPublishAuthoringResponse(
        data,
        catalogue,
        revision,
        inputRevision.current,
      )
    )
      throw new Error(
        "Generation returned no resolved mibi. Try a new seed.",
      );
    setGenome(data.input.genome);
    setContext(data.input.context);
    publishResolved(data, "fresh");
    setMessage(
      data.scene
        ? `New scene ready after ${data.generation.attempts} unmodified draws.`
        : "New genome generated. Preview ready.",
    );
  }
  function exportJson(kind, value) {
    let exported;
    try {
      exported = copyableAuthoringExport(value);
      if (exported.schemaVersion === COMPOSITIONAL_DRAFT_SCHEMA &&
          new TextEncoder().encode(JSON.stringify(exported)).length > 65536) {
        throw new Error("Authored draft export exceeds64KiB. Reduce the edited-definition payload.");
      }
    } catch (error) {
      setFailed(true);
      setMessage(error.message);
      return;
    }
    setJson(
      ["module-scene/1", "module-scene/2", "module-scene/3"].includes(
        value?.sceneProjectionVersion,
      )
        ? `${kind} — compact scene replay`
        : kind,
    );
    setJsonText(pretty(exported));
  }
  async function downloadSourcePng() {
    const handoff = imageLedPetHandoff(packet);
    if (!handoff.referenceSvg) throw new Error("No current verified source image to download.");
    let pngUrl = null;
    try {
      const png = await sourcePng(handoff.referenceSvg);
      pngUrl = URL.createObjectURL(png);
      const link = document.createElement("a");
      link.href = pngUrl;
      link.download = `${handoff.sourceRecordId}-source.png`;
      document.body.append(link);
      link.click();
      link.remove();
      setMessage("Source PNG download requested. Its record ID is retained in the filename.");
    } finally {
      if (pngUrl) window.setTimeout(() => URL.revokeObjectURL(pngUrl), 60000);
    }
  }
  function editCopy(locusId, index, value) {
    if (processing.current || !genome?.loci?.[locusId]) return;
    const next = clone(genome);
    next.loci[locusId][index] = value;
    setGenome(next);
    invalidate();
  }
  function draftRecipe(next) {
    const parentVersion = next.authoredRecipe?.parent.version ?? Number(next.ruleVersion.split("/").at(-1));
    const parent = packages.find((item) => item.catalogue.id === "genomic-compositional-source-experiment" && item.catalogue.version === parentVersion)?.catalogue;
    if (!parent) throw new Error(`Published catalogue${parentVersion} must be available to author a compatible draft.`);
    return compositionalDraftRecipe(next, parent, JSON.parse(startingCopiesText), JSON.parse(baselineMetadataText));
  }
  function retainCompositionalDraft(descriptor) {
    localStorage.setItem(draftStorageKey(descriptor.catalogue), pretty(descriptor.catalogue.authoredRecipe));
    setDraft(clone(descriptor.catalogue));
    setStartingCopiesText(pretty(descriptor.catalogue.authoredRecipe.startingCopies));
    setBaselineMetadataText(pretty(descriptor.catalogue.authoredRecipe.baselineMetadata));
    const locus = descriptor.catalogue.loci.find((item) => item.id === selected) ?? descriptor.catalogue.loci[0];
    setSelected(locus.id);
    setEdited(pretty(locus));
  }
  async function saveCompositionalDraft(next = draft) {
    userIntent.current = true;
    const revision = inputRevision.current;
    const descriptor = await request("/api/compositional-source/validate", draftRecipe(next));
    if (revision !== inputRevision.current) return;
    retainCompositionalDraft(descriptor);
    setMessage(`Saved compatible authored revision ${descriptor.catalogue.version}; current experiment unchanged. Use draft explicitly to consume edited definitions.`);
  }
  function loadAuthoredStartingCopies() {
    if (!isCompositionalDraft(catalogue)) return;
    const next = {
      schemaVersion: "compositional-genome/1",
      contentId: catalogue.id,
      contentVersion: catalogue.version,
      loci: clone(catalogue.authoredRecipe.startingCopies),
      recordVersions: Object.fromEntries(catalogue.loci.filter((locus) => locus.status === "validated").map((locus) => [locus.id, locus.version])),
      baselineReferences: clone(catalogue.baseline.references),
      origin: { kind: "authored", baseline: catalogue.baseline.id, authoredFoundation: catalogue.foundationPin }
    };
    setGenome(next);
    invalidate();
    setMessage("Authored starting copies loaded explicitly. Resolve to construct this input.");
  }
  async function saveDraftRecord() {
    if (supportsCompositionalAuthoring(draft)) {
      const next = clone(draft);
      const item = JSON.parse(edited);
      const index = next.loci.findIndex((locus) => locus.id === selected);
      if (item.id !== selected) throw new Error("Compatible authoring retains the existing locus ID.");
      item.version = next.loci[index].version + 1;
      next.loci[index] = item;
      return saveCompositionalDraft(next);
    }
    if (["developmental-anatomical-source/1", "developmental-compositional-source/1", "developmental-compositional-source/2", "developmental-compositional-source/3", "developmental-compositional-source/4", "developmental-compositional-source/5", "developmental-compositional-source/6"].includes(catalogue.ruleVersion))
      throw new Error("This provisional catalogue is read-only. Edit inherited allele copies in the experiment.");
    userIntent.current = true;
    const revision = inputRevision.current;
    const item = JSON.parse(edited);
    const next = clone(draft);
    next.version = Math.max(catalogue.version + 1, next.version);
    const index = next.loci.findIndex((locus) => locus.id === selected);
    if (item.id !== selected && next.loci.some((locus) => locus.id === item.id))
      throw new Error(
        "Duplicate ID. Display names and aliases can change without changing IDs.",
      );
    next.loci[index] = item;
    await request("/api/authoring/validate", next);
    if (revision !== inputRevision.current) return;
    localStorage.setItem(draftKey, pretty(next));
    setDraft(next);
    setSelected(item.id);
    setFamily("all");
    setSearch("");
    setEdited(pretty(item));
    setMessage(
      `Saved validated-schema draft v${next.version}; pinned package/experiment unchanged. This is not product approval.`,
    );
  }
  async function useDraft() {
    if (supportsCompositionalAuthoring(draft)) {
      userIntent.current = true;
      const revision = inputRevision.current;
      const descriptor = await request("/api/compositional-source/validate", draft.authoredRecipe ?? draftRecipe(draft));
      if (revision !== inputRevision.current) return;
      const next = clone(genome);
      next.contentId = descriptor.catalogue.id;
      next.contentVersion = descriptor.catalogue.version;
      next.recordVersions = clone(descriptor.defaultGeneration.genome.recordVersions);
      next.baselineReferences = clone(descriptor.defaultGeneration.genome.baselineReferences);
      setCatalogue(descriptor.catalogue);
      setDraft(clone(descriptor.catalogue));
      setGenome(next);
      setContext(clone(descriptor.referenceContext));
      setPackages((current) => mergeOptionalPackages(current, [descriptor]));
      invalidate();
      setView("experiment");
      setMessage("Authored definitions selected. Current copies retained; Resolve or Generate uses this exact draft. Starting copies load only by explicit action.");
      return;
    }
    if (["developmental-anatomical-source/1", "developmental-compositional-source/1", "developmental-compositional-source/2", "developmental-compositional-source/3", "developmental-compositional-source/4", "developmental-compositional-source/5", "developmental-compositional-source/6"].includes(catalogue.ruleVersion))
      throw new Error("This provisional catalogue is read-only. Edit inherited allele copies in the experiment.");
    userIntent.current = true;
    const revision = inputRevision.current;
    await request("/api/authoring/validate", draft);
    if (revision !== inputRevision.current) return;
    const next = clone(genome);
    next.contentId = draft.id;
    next.contentVersion = draft.version;
    // Content edits are explicit. Existing copies are never repaired to make a new package pass.
    setCatalogue(clone(draft));
    setGenome(next);
    invalidate();
    setFamily("all");
    setSearch("");
    setSelected(scopedSelection(draft.loci, selected));
    setView("experiment");
    setMessage(
      "Explicit draft package selected; resolve existing copies or generate a new genome. Retained records remain unchanged.",
    );
  }
  function saveRecord() {
    const retained = ["anatomical-source/1", "compositional-source/1", "compositional-source/2", "compositional-source/3", "compositional-source/4", "compositional-source/5", "compositional-source/6", "compositional-source/7"].includes(packet.sceneProjectionVersion)
      ? { ...sceneReplayEnvelope(packet), recordId: packet.recordId, savedLabel: packet.result.classification.labels.join(" · ") }
      : clone(packet);
    const next = [
      retained,
      ...records.filter((item) => item.recordId !== packet.recordId),
    ].slice(0, 8);
    localStorage.setItem(storageKey, JSON.stringify(next));
    setRecords(next);
    setMessage(
      "Saved exact record locally. Eight most recent records retained; export important experiments.",
    );
  }
  async function importRecord() {
    userIntent.current = true;
    const revision = inputRevision.current;
    if (jsonText.length > 1000000)
      throw new Error("Import exceeds the one-megabyte local record limit.");
    const imported = JSON.parse(jsonText);
    if (imported.schemaVersion === COMPOSITIONAL_DRAFT_SCHEMA || isCompositionalDraft(imported)) {
      const descriptor = await request("/api/compositional-source/validate", imported.authoredRecipe ?? imported);
      if (revision !== inputRevision.current) return;
      retainCompositionalDraft(descriptor);
      setMessage("Imported authored definitions as a separate draft; current experiment unchanged.");
      return;
    }
    if (imported.schemaVersion === "critter-catalogue/1") {
      await request("/api/authoring/validate", imported);
      if (revision !== inputRevision.current) return;
      const nextSelected = scopedSelection(imported.loci, selected);
      const selectedRecord = imported.loci.find(
        (item) => item.id === nextSelected,
      );
      localStorage.setItem(draftKey, pretty(imported));
      setDraft(clone(imported));
      setFamily("all");
      setSearch("");
      setSelected(nextSelected);
      setEdited(pretty(selectedRecord));
      setMessage(
        "Imported catalogue as separate draft; current experiment unchanged.",
      );
    } else {
      const replayEnvelope = imported.sceneProjectionVersion
        ? sceneReplayEnvelope(imported)
        : {
            schemaVersion: imported.schemaVersion,
            input: imported.input,
            inputDigest: imported.inputDigest,
            resultDigest: imported.resultDigest,
          };
      const data = await request(
        ["compositional-source/1", "compositional-source/2", "compositional-source/3", "compositional-source/4", "compositional-source/5", "compositional-source/6", "compositional-source/7"].includes(imported.sceneProjectionVersion)
          ? "/api/compositional-source/replay"
          : imported.sceneProjectionVersion === "anatomical-source/1"
          ? "/api/anatomical-source/replay"
          : imported.sceneProjectionVersion
          ? "/api/module-scene/replay"
          : "/api/authoring/replay",
        replayEnvelope,
      );
      if (revision !== inputRevision.current) return;
      if (!isResolvedAuthoringPacket(data))
        throw new Error("Import returned no verified mibi preview.");
      setPackages((current) =>
        current.some(
          (item) =>
            authoringPackageKey(item.catalogue) ===
            authoringPackageKey(data.input.catalogue),
        )
          ? current
          : [
              ...current,
              {
                catalogue: data.input.catalogue,
                defaultGeneration: {
                  genome: data.input.genome,
                  context: data.input.context,
                },
              },
            ],
      );
      setCatalogue(data.input.catalogue);
      setDraft(clone(data.input.catalogue));
      setStartingCopiesText(pretty(data.input.catalogue.authoredRecipe?.startingCopies ?? data.input.genome.loci));
      setBaselineMetadataText(pretty(data.input.catalogue.authoredRecipe?.baselineMetadata ?? {}));
      setGenome(data.input.genome);
      setContext(data.input.context);
      publishResolved(data, "reopen");
      const retainedSelected =
        data.input.catalogue.loci.find((item) => item.id === selected) ??
        data.input.catalogue.loci[0];
      setSelected(retainedSelected.id);
      setFamily("all");
      setSearch("");
      setEdited(pretty(retainedSelected));
      setView("guided");
      setMessage(
        "Digest replay verified from inputs. Embedded output/SVG/prompt was not trusted.",
      );
    }
    setJson(null);
  }
  async function runBatch() {
    userIntent.current = true;
    const revision = inputRevision.current;
    const items = [];
    for (let index = 0; index < 6; index++)
      items.push(
        await request(authoringRoute(catalogue, "generate"), {
          catalogue,
          seed: Number(seed) + index,
        }),
      );
    if (revision !== inputRevision.current) return;
    setBatch(items);
    setMessage(
      "Six retained generated experiments; classifications describe outputs, not selected input classes.",
    );
  }

  if (!catalogue)
    return (
      <Paper p="xl">
        <Title order={2}>Genome authoring workbench</Title>
        <Alert color={failed ? "red" : "sage"}>{message}</Alert>
      </Paper>
    );
  const locus = catalogue.loci.find((item) => item.id === selected);
  const draftLocus = draft.loci.find((item) => item.id === selected);
  const selectedFact = packet?.result.facts.find(
    (fact) => fact.locusId === selected,
  );
  const filtered = scopedLoci(draft, family, search);
  const genomeLoci = scopedLoci(catalogue, family, search);
  const cause = causalSummary(catalogue, packet?.result, selected);
  const sceneCause = sceneCausalSummary(packet?.scene, selected);
  const petHandoff = imageLedPetHandoff(packet);
  const compositionalAuthoring = supportsCompositionalAuthoring(draft);
  const readOnlyCatalogue = ["developmental-anatomical-source/1", "developmental-compositional-source/1"].includes(draft?.ruleVersion);
  const currentPrompt = petHandoff.text;
  const consumerNotice = unconsumedOutputNotice(catalogue, selected);
  const previewCamera = sharedPreviewCamera([packet?.result].filter(Boolean));
  const diagnosticViewOptions = (camera) => ({
    projectionVersion: SURFACE_DETAIL_PROJECTION_VERSION,
    ...(camera ? { camera } : {}),
  });
  const sceneComparisonCamera =
    pinned?.scene && packet?.scene ? sharedSceneCamera([pinned, packet]) : null;
  const compatibleComparison = comparisonUsesSharedCamera(
    pinned,
    packet,
    sceneComparisonCamera,
  );
  const comparisonCamera = compatibleComparison
    ? sharedPreviewCamera([pinned.result, packet.result])
    : null;
  const differences = compareResults(pinned?.result, packet?.result);
  function previewMarkup(current, camera = null) {
    return current.scene
      ? scenePreviewMarkup(current, camera)
      : drawAuthoringCreature(
          current.result,
          selected,
          diagnosticViewOptions(camera),
        );
  }
  const setField = (key, value) => {
    userIntent.current = true;
    try {
      const next = JSON.parse(edited);
      next[key] = value;
      setEdited(pretty(next));
    } catch {
      setMessage("Restore valid record JSON before using structured fields.");
    }
  };
  let formRecord;
  try {
    formRecord = JSON.parse(edited);
  } catch {
    formRecord = draftLocus;
  }

  return (
    <AppShell
      header={{ height: { base: 112, lg: 74 } }}
      navbar={{ width: 190, breakpoint: "sm", collapsed: { desktop: !advanced, mobile: !advanced } }}
      padding="lg"
    >
      <AppShell.Header px="lg">
        <Group justify="space-between" h="100%" className="workbench-header">
          <div>
            <Title order={3}>Miniature Beasts · Genome authoring</Title>
            <Text size="xs" c="dimmed">
              Create, edit and render source-bound mibi proposals
            </Text>
          </div>
          <Group className="workbench-header-controls">
            {advanced && <Select
              size="xs"
              aria-label="Content package"
              disabled={busy}
              value={authoringPackageKey(catalogue)}
              data={packages.map((item) => ({
                value: authoringPackageKey(item.catalogue),
                label: `${authoringPackageLabel(item.catalogue)} · v${item.catalogue.version}`,
              }))}
              onChange={switchPackage}
            />}
            {advanced && <Badge variant="light">
              {catalogue.id} v{catalogue.version}
            </Badge>}
            {advanced && <Button
              component="a"
              href={`${import.meta.env.BASE_URL}legacy`}
              target="_blank"
              variant="subtle"
              size="xs"
            >
              Preserved Pip proof
            </Button>}
            <Button size="xs" variant="light" onClick={() => {
              setAdvanced(!advanced);
              if (advanced) setView("guided");
            }}>{advanced ? "Return to mibi" : "Advanced tools"}</Button>
          </Group>
        </Group>
      </AppShell.Header>
      <AppShell.Navbar p="md">
        <Stack gap="xs">
          <Group gap="xs" aria-label="Platform destinations">
            <Button component="a" size="compact-xs" variant="subtle"
              href={import.meta.env.BASE_URL === "/genome/" ? "/" : "https://miniaturebeasts.com/"}>Website</Button>
            <Button component="a" size="compact-xs" variant="subtle"
              href={import.meta.env.BASE_URL === "/genome/" ? "/sandbox/" : "https://miniaturebeasts.com/sandbox/"}>Simulator</Button>
          </Group>
          <Text size="xs" fw={700} c="dimmed">
            AUTHOR & INVESTIGATE
          </Text>
          {[
            ["guided", "Create a mibi"],
            ["experiment", "Genome"],
            ["compendium", "Compendium"],
            ["compare", "Pinned comparison"],
            ["records", "Saved records"],
            ["batch", "Generation batch"],
          ].map(([id, label]) => (
            <NavLink
              key={id}
              label={label}
              active={view === id}
              onClick={() => changeWorkspace(id)}
            />
          ))}
          <Divider />
          <Text size="xs" c="dimmed">
            {catalogue.loci.length} proposed records ·{" "}
            {
              catalogue.loci.filter((item) => item.status === "validated")
                .length
            }{" "}
            {isCompositionalRule(catalogue.ruleVersion) ? "defined copy contracts" : "executable"} ·{" "}
            {catalogue.loci.filter((item) => item.status === "draft").length}{" "}
            draft candidates
          </Text>
          <Button
            component="a"
            href="https://github.com/PacoCotera/miniaturebeasts/blob/main/v1/prototype/generator-workbench/evidence/art-reset/README.md"
            target="_blank"
            rel="noopener noreferrer"
            variant="subtle"
            size="xs"
          >
            Character art studies
          </Button>
        </Stack>
      </AppShell.Navbar>
      <AppShell.Main>
        <Alert
          mb="md"
          color={failed ? "red" : "sage"}
          role="status"
          className="status"
        >
          {message}
        </Alert>
        {failed && errorDetails !== message && (
          <Accordion mb="md">
            <Accordion.Item value="request-error">
              <Accordion.Control>Search details</Accordion.Control>
              <Accordion.Panel>
                <Code block className="sequence">
                  {errorDetails}
                </Code>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        )}
        {view === "guided" && <GuidedCreatureWorkspace catalogue={catalogue} genome={genome}
          resolved={lastResolved} before={beforeRefresh} dirty={dirty} busy={busy} family={family} search={search}
          selected={selected} onScope={changeScope} onSelect={selectLocus} onCopy={editCopy}
          onGenerate={generateFresh} onRefresh={() => run(() => resolve())} renderPrompt={renderPrompt}
          onPrompt={(text) => { userIntent.current = true; setRenderPrompt(text); }}
          group={workingGroup} savedCreatures={savedCreatures} onReopen={reopenWorkingCreature}
          revision={inputRevision.current} persistenceNotice={persistenceNotice} />}
        {view === "compendium" && (
          <>
            <Group justify="space-between" mb="md">
              <div>
                <Title order={2}>Locus compendium</Title>
                <Text c="dimmed">
                  Names, taxonomy, alleles, operators and dependencies · edits
                  are separate versioned drafts.
                </Text>
              </div>
              <Group>
                <Button
                  variant="light"
                  disabled={busy}
                  onClick={() => run(async () => exportJson("Catalogue draft", compositionalAuthoring ? draft.authoredRecipe ?? draftRecipe(draft) : draft), { retentionKind: "save" })}
                >
                  Export draft
                </Button>
                <Button disabled={busy || readOnlyCatalogue} onClick={() => run(useDraft)}>
                  Use draft in experiment
                </Button>
              </Group>
            </Group>
            {readOnlyCatalogue && (
              <Text size="sm" c="dimmed" mb="md">This provisional catalogue is read-only. Change inherited allele copies in Inspect or edit genome, then Resolve.</Text>
            )}
            {compositionalAuthoring && (
              <Paper withBorder p="md" mb="md">
                <Title order={4}>Compatible authored baseline</Title>
                <Text size="sm" c="dimmed">Edit labels, bounded numeric contributions and complete existing maps. IDs, families, operators, guards, pigment values and runtime budgets stay fixed. All {draft.loci.filter((locus) => locus.status === "validated").length} starting pairs are explicit; Generate samples definitions independently.</Text>
                <JsonInput mt="sm" label="Baseline metadata · label / description only" value={baselineMetadataText} onChange={setBaselineMetadataText} minRows={2} autosize validationError="Invalid JSON" />
                <JsonInput mt="sm" label={`Authored starting copies · complete${draft.loci.filter((locus) => locus.status === "validated").length}-pair dictionary`} value={startingCopiesText} onChange={setStartingCopiesText} minRows={4} maxRows={12} autosize validationError="Invalid JSON" />
                <Group mt="sm">
                  <Button disabled={busy} onClick={() => run(() => saveCompositionalDraft(), { retentionKind: "save" })}>Validate & save baseline input</Button>
                  <Button variant="light" disabled={busy || !isCompositionalDraft(catalogue)} onClick={loadAuthoredStartingCopies}>Load active draft starting copies</Button>
                </Group>
              </Paper>
            )}
            <div className="catalogue-layout">
              <Paper withBorder p="md">
                <Stack>
                  <TextInput
                    label="Search loci / names / aliases"
                    value={search}
                    onChange={(event) =>
                      changeScope(family, event.target.value)
                    }
                  />
                  <Select
                    label="Dimension family"
                    data={[
                      { value: "all", label: "All eleven families" },
                      ...catalogue.families.map((item) => ({
                        value: item.id,
                        label: familyLabel(item.id),
                      })),
                    ]}
                    value={family}
                    onChange={(dimension) => changeScope(dimension)}
                  />
                  <Text size="xs">
                    {filtered.length} records · full inventory, including drafts
                  </Text>
                  <ScrollArea h={540}>
                    {filtered.map((item) => (
                      <NavLink
                        key={item.id}
                        active={item.id === selected}
                        label={item.label}
                        description={`${item.id} · ${item.status}`}
                        onClick={() => selectLocus(item.id)}
                      />
                    ))}
                    {filtered.length === 0 && (
                      <Text size="sm">
                        No locus records in this family. Its modeling gaps
                        remain in coverage.
                      </Text>
                    )}
                  </ScrollArea>
                </Stack>
              </Paper>
              <Paper withBorder p="lg">
                {draftLocus ? (
                  <>
                    <Group justify="space-between">
                      <Title order={3}>{draftLocus?.label ?? "Record"}</Title>
                      <Badge
                        color={draftLocus?.status === "draft" ? "gray" : "sage"}
                      >
                        {draftLocus?.status}
                      </Badge>
                    </Group>
                    <Text size="sm" c="dimmed" mb="lg">
                      Stable ID and versions preserve references. A label rename
                      does not change inherited copies.
                    </Text>
                    <div className="form-grid">
                      <TextInput
                        label="Display name"
                        value={formRecord?.label ?? ""}
                        onChange={(event) =>
                          setField("label", event.target.value)
                        }
                      />
                      <TextInput
                        label="Aliases (comma separated)"
                        value={formRecord?.aliases?.join(", ") ?? ""}
                        onChange={(event) =>
                          setField(
                            "aliases",
                            event.target.value
                              .split(",")
                              .map((item) => item.trim())
                              .filter(Boolean),
                          )
                        }
                      />
                      <Select
                        label="Primary family"
                        disabled={compositionalAuthoring}
                        data={catalogue.families.map((item) => ({
                          value: item.id,
                          label: familyLabel(item.id),
                        }))}
                        value={compositionalAuthoring ? canonicalGenomicFamily(formRecord?.family) : formRecord?.family}
                        onChange={(value) => setField("family", value)}
                      />
                      <Select
                        label="Draft / engine-validated"
                        disabled={compositionalAuthoring}
                        data={["draft", "validated"]}
                        value={formRecord?.status}
                        onChange={(value) => setField("status", value)}
                      />
                    </div>
                    <Text size="sm" mt="md">
                      {draftLocus?.purpose}
                    </Text>
                    <Text size="xs" c="dimmed">
                      Where used:{" "}
                      {draft.loci
                        .filter((item) => item.requires.includes(selected))
                        .map((item) => item.id)
                        .join(", ") ||
                        "No direct prerequisites reference this locus."}
                    </Text>
                    <JsonInput
                      mt="md"
                      label="Complete record · copies, allele values/maps, applicability, bounds, examples and visual binding"
                      value={edited}
                      onChange={(value) => {
                        userIntent.current = true;
                        setEdited(value);
                      }}
                      autosize
                      minRows={12}
                      maxRows={24}
                      formatOnBlur
                      validationError="Invalid JSON"
                    />
                    <Group mt="md">
                      <Button
                        disabled={busy || readOnlyCatalogue}
                        onClick={() =>
                          run(saveDraftRecord, { retentionKind: "save" })
                        }
                      >
                        Validate & save record to draft
                      </Button>
                      <Button
                        variant="subtle"
                        onClick={() => setEdited(pretty(draftLocus))}
                      >
                        Discard unsaved record edit
                      </Button>
                    </Group>
                    <Text size="xs" c="dimmed" mt="sm">
                      Operator/range changes outside implemented semantics
                      reject. Changing status alone cannot promote a candidate.
                    </Text>
                  </>
                ) : (
                  <Text>Choose a record from All or change the search.</Text>
                )}
              </Paper>
            </div>
          </>
        )}
        {view === "experiment" && (
          <>
            <Group justify="space-between" mb="md" align="end">
              <div>
                <Title order={2}>Genome</Title>
                <Text c="dimmed">
                  Generate a mibi, then explore its inherited copies and
                  their effects.
                </Text>
              </div>
              <Group>
                <Button
                  disabled={
                    busy ||
                    candidateStartupDecision(
                      candidateStatus,
                      userIntent.current,
                    ).generateDisabled
                  }
                  onClick={generateFresh}
                >
                  Generate mibi
                </Button>
              </Group>
            </Group>
            <div className="result-pair">
              <Paper withBorder p="md" className="structural-preview">
                <Group justify="space-between">
                  <Title order={4}>Source illustration</Title>
                  <Badge color="gray">{["developmental-anatomical-source/1", "developmental-compositional-source/1", "developmental-compositional-source/2", "developmental-compositional-source/3", "developmental-compositional-source/4", "developmental-compositional-source/5", "developmental-compositional-source/6"].includes(catalogue.ruleVersion) ? "Provisional anatomical source" : "Diagnostic geometry"}</Badge>
                </Group>
                {packet && (
                  <Text size="xs" c="dimmed" mt="xs">
                    {packet.recordId} · {packet.contentId}@
                    {packet.contentVersion}
                    {packet.generation &&
                      ` · Accepted seed ${packet.generation.winningSeed ?? packet.generation.seed}`}
                    {busy && " · Last successful result"}
                  </Text>
                )}
                {petHandoff.referenceSvg ? (
                  <SvgView compact markup={petHandoff.referenceSvg} />
                ) : (
                  <div className="empty-result">
                    <Title order={3}>No current preview</Title>
                    <Text size="sm">
                      Generate a mibi or load a known example.
                    </Text>
                  </div>
                )}
                <Text size="xs" c="dimmed">
                  {packet?.scene
                    ? "Inspect or edit genome shows module involvement; exact targets and source links remain in advanced scene inspection."
                    : "Selected-locus highlights remain in Advanced inspection."}
                </Text>
                <Text size="xs" c="dimmed" mt="xs">
                  This structural diagram is not generated game art.
                </Text>
                <Text size="xs" c="dimmed" mt="xs">
                  Display:{" "}
                  {packet?.scene
                    ? packet.sceneProjectionVersion
                    : "Canonical diagnostic"}
                  .{" "}
                  {isCompositionalRule(catalogue.ruleVersion)
                    ? "Connected regions and independent optional parts follow copied composition rules. All eleven genomic branches are retained; source consumers and missing physiology are explicit."
                    : ["developmental-anatomical-source/1", "developmental-compositional-source/1", "developmental-compositional-source/2", "developmental-compositional-source/3", "developmental-compositional-source/4", "developmental-compositional-source/5", "developmental-compositional-source/6"].includes(catalogue.ruleVersion)
                    ? "Inherited head/core, jointed supports, optional modules and owned skin/scales fields; static source, not finished pet art."
                    : [
                    "developmental-covering/1",
                    "developmental-regional-scene/1",
                  ].includes(catalogue.ruleVersion)
                    ? "Verified body, optional eyes and skin/scales source experiment; unsupported construction rejects without changing copies."
                    : catalogue.ruleVersion === "developmental-analytic/1"
                      ? "Broad graph assembly; face and covering modules are not modeled in this package."
                      : "Narrow continuous-body calibration; this is not broad anatomy generation."}
                </Text>
                {packet && (
                  <Group mt="md" gap="xs">
                    <Button
                      size="xs"
                      disabled={busy || !petHandoff.referenceSvg}
                      onClick={() => run(downloadSourcePng)}
                    >
                      Download source PNG
                    </Button>
                    <Button
                      size="xs"
                      variant="light"
                      onClick={() => setPinned(clone(packet))}
                    >
                      Pin comparison
                    </Button>
                    <Button
                      size="xs"
                      variant="light"
                      onClick={() =>
                        run(async () => saveRecord(), { retentionKind: "save" })
                      }
                    >
                      Save record
                    </Button>
                    <Button
                      size="xs"
                      variant="light"
                      onClick={() => exportJson("Retained experiment", packet)}
                    >
                      Export record
                    </Button>
                  </Group>
                )}
                {pinned && (
                  <Button
                    variant="subtle"
                    size="xs"
                    mt="sm"
                    onClick={() => setView("compare")}
                  >
                    Open retained comparison
                  </Button>
                )}
              </Paper>
              <Paper withBorder p="md">
                <Group justify="space-between" mb="sm">
                  <Title order={4}>Gemini prompt</Title>
                  <CopyButton
                    key={packet?.recordId ?? "unresolved"}
                    value={currentPrompt}
                  >
                    {({ copied, copy }) => (
                      <Button
                        size="xs"
                        variant="light"
                        disabled={!currentPrompt || busy}
                        onClick={copy}
                      >
                        {copied ? "Copied" : "Copy prompt"}
                      </Button>
                    )}
                  </CopyButton>
                </Group>
                {packet && petHandoff.status === "unavailable" ? (
                  <Alert color="orange" title="Prompt unavailable">
                    {petHandoff.reason}
                  </Alert>
                ) : currentPrompt ? (
                  <Textarea
                    aria-label="Gemini prompt"
                    readOnly
                    autosize
                    minRows={3}
                    maxRows={6}
                    value={currentPrompt}
                  />
                ) : (
                  <Text size="sm" c="dimmed">
                    {petHandoff.reason}
                  </Text>
                )}
                <Text size="sm" c="dimmed" mt="sm">
                  Attach the shown source image in Gemini, then paste this
                  brief. Returned feature changes are pet proposals; the
                  genome audit stays in Advanced inspection.
                </Text>
              </Paper>
            </div>
            <ReturnedPetPanel packet={packet} handoff={petHandoff} revision={inputRevision.current} sourceBusy={busy} />
            {packet?.result.innateProfile && (
              <Paper withBorder p="md" mt="md">
                <Title order={4}>Optional innate profile · provisional static data</Title>
                <Text size="sm" mt="xs">{packet.result.innateProfile.reason}</Text>
                {packet.result.innateProfile.enabled && (
                  <>
                    <Text size="sm" mt="xs">Exploration tendency: {packet.result.innateProfile.response.explorationClass}</Text>
                    <Text size="sm">Reference cue threshold: {packet.result.innateProfile.response.arousalThreshold} · {packet.result.innateProfile.response.unit}</Text>
                    <Text size="sm" c="dimmed">Decoded cue below the threshold: below-boundary. At or above it: boundary-reached. No cue observation or live action is supplied.</Text>
                  </>
                )}
                <Text size="xs" c="dimmed" mt="xs">All three ordered pairs and source witnesses remain in expression inspection. Learning, habits and lifetime state are unmodeled.</Text>
              </Paper>
            )}
            {isCompositionalRule(catalogue.ruleVersion) && (
              <GenomicBranches catalogue={catalogue} genome={genome} packet={packet} onSelect={selectLocus} />
            )}
            <Accordion mt="md" variant="separated">
              <Accordion.Item value="genome-editor">
                <Accordion.Control>Inspect or edit genome</Accordion.Control>
                <Accordion.Panel>
                  <Button
                    mb="md"
                    disabled={busy || !genome}
                    variant="light"
                    onClick={() => run(() => resolve(null))}
                  >
                    Resolve genome
                  </Button>
                  <div className="genome-summaries">
                    <Paper withBorder p="sm">
                      <Text size="xs" c="dimmed">
                        BASELINE FOUNDATION
                      </Text>
                      <Text size="sm" fw={600}>
                        {catalogue.id} · v{catalogue.version}
                      </Text>
                      <Text size="xs">
                        {
                          catalogue.loci.filter(
                            (item) => item.status === "validated",
                          ).length
                        }{" "}
                        {isCompositionalRule(catalogue.ruleVersion) ? "defined copy contracts; construction consumers are separate" : "supported contributor definitions"}
                      </Text>
                    </Paper>
                    <Paper withBorder p="sm">
                      <Text size="xs" c="dimmed">
                        INHERITED COPIES
                      </Text>
                      <Text size="sm" fw={600}>
                        {Object.keys(genome?.loci ?? {}).length} recorded loci
                      </Text>
                      <Text size="xs">
                        {Object.values(genome?.loci ?? {}).flat().length}{" "}
                        retained copies, including inactive ones
                      </Text>
                    </Paper>
                    <Paper withBorder p="sm">
                      <Text size="xs" c="dimmed">
                        RESOLVED EXPRESSION
                      </Text>
                      <Text size="sm" fw={600}>
                        {packet
                          ? `${packet.result.facts.filter((item) => item.state === "expressed").length} expressed outputs`
                          : "Not resolved"}
                      </Text>
                      <Text size="xs">
                        {packet && isCompositionalRule(catalogue.ruleVersion)
                          ? `${packet.result.facts.filter(item => item.state === "inactive").length} inactive · ${packet.result.facts.filter(item => item.state === "unimplemented").length} unimplemented consumers/definitions`
                          : packet
                          ? `${packet.result.facts.filter((item) => item.state !== "expressed").length} inactive or suppressed outputs`
                          : "Resolve to inspect the current inputs"}
                      </Text>
                    </Paper>
                  </div>
                  <div
                    className="dimension-index"
                    aria-label="Genome dimensions"
                  >
                    {[
                      { id: "all", label: "All" },
                      ...catalogue.families.map((item) => ({
                        id: item.id,
                        label: familyLabel(item.id),
                      })),
                    ].map((item) => (
                      <Button
                        key={item.id}
                        size="xs"
                        variant={family === item.id ? "filled" : "light"}
                        onClick={() => changeScope(item.id)}
                      >
                        {item.label}
                        <span className="dimension-count">
                          {scopedLoci(catalogue, item.id).length}
                        </span>
                      </Button>
                    ))}
                  </div>
                  <div className="genome-layout">
                    <Paper withBorder p="md" className="locus-browser">
                      <TextInput
                        aria-label="Search genome loci"
                        placeholder="Search names or loci"
                        value={search}
                        onChange={(event) =>
                          changeScope(family, event.target.value)
                        }
                      />
                      <Group justify="space-between" my="sm">
                        <Text size="sm" fw={600}>
                          {family === "all"
                            ? "Whole genome"
                            : familyLabel(family)}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {genomeLoci.length} records
                        </Text>
                      </Group>
                      <ScrollArea h={470}>
                        <Stack gap="xs">
                          {genomeLoci.map((item) => {
                            const fact = packet?.result.facts.find(
                              (entry) => entry.locusId === item.id,
                            );
                            const copies = copyLabels(item, genome);
                            return (
                              <button
                                type="button"
                                key={item.id}
                                className={`locus-choice ${selected === item.id ? "selected" : ""}`}
                                onClick={() => selectLocus(item.id)}
                              >
                                <span className="locus-title">
                                  {item.label}
                                </span>
                                <span className="locus-copy-labels">
                                  {copies.length
                                    ? copies.join(" / ")
                                    : "No executable copies"}
                                </span>
                                <span className="locus-state">
                                  {item.status === "draft"
                                    ? "Candidate"
                                    : (fact?.state ?? "Not resolved")}
                                </span>
                              </button>
                            );
                          })}
                          {!genomeLoci.length && (
                            <Text size="sm" c="dimmed">
                              No records in this scope. Choose All or clear the
                              search.
                            </Text>
                          )}
                        </Stack>
                      </ScrollArea>
                    </Paper>
                    <div className="selected-preview">
                      <Paper withBorder p="md" className="selected-editor">
                        {locus ? (
                          <>
                            <Text size="xs" c="dimmed">
                              SELECTED LOCUS · {familyLabel(locus.family)}
                            </Text>
                            <Title order={3} mt="xs">
                              {locus.label}
                            </Title>
                            <Text size="sm" mt="sm">
                              {locus.purpose}
                            </Text>
                            {locus.status === "validated" ? (
                              <div className="allele-editor">
                                {Array.from(
                                  { length: locus.copyCount ?? 2 },
                                  (_, index) => (
                                    <div
                                      key={index}
                                      className="allele-choice-row"
                                    >
                                      <Text size="sm" fw={600}>
                                        Copy {index + 1}
                                      </Text>
                                      <Group gap={4}>
                                        {locus.alleles.map((allele) => (
                                          <Button
                                            key={allele.id}
                                            size="xs"
                                            px="xs"
                                            variant={
                                              genome?.loci[locus.id]?.[
                                                index
                                              ] === allele.id
                                                ? "filled"
                                                : "light"
                                            }
                                            disabled={
                                              busy || !genome?.loci[locus.id]
                                            }
                                            aria-pressed={
                                              genome?.loci[locus.id]?.[
                                                index
                                              ] === allele.id
                                            }
                                            onClick={() =>
                                              editCopy(
                                                locus.id,
                                                index,
                                                allele.id,
                                              )
                                            }
                                          >
                                            {allele.label}
                                          </Button>
                                        ))}
                                      </Group>
                                    </div>
                                  ),
                                )}
                                {!genome?.loci[locus.id] && (
                                  <Text size="sm" c="orange">
                                    Copies are missing from this input. Generate
                                    a genome for this package.
                                  </Text>
                                )}
                              </div>
                            ) : (
                              <Alert color="gray" mt="sm">
                                Candidate record · no executable copy or
                                expressed output.
                              </Alert>
                            )}
                            <Divider my="md" />
                            <Text size="xs" fw={700} c="dimmed">
                              DIRECT OUTPUT
                            </Text>
                            <Text fw={600} mt="xs">
                              {outputText(selectedFact)}
                            </Text>
                            <Badge
                              mt="xs"
                              color={
                                selectedFact?.state === "expressed"
                                  ? "sage"
                                  : "gray"
                              }
                            >
                              {selectedFact?.state ??
                                (locus.status === "draft"
                                  ? "unsupported"
                                  : "awaiting resolve")}
                            </Badge>
                            {selectedFact && consumerNotice && (
                              <Text size="sm" c="orange" mt="sm">
                                {consumerNotice}
                              </Text>
                            )}
                            {!!cause?.prerequisites.length && (
                              <>
                                <Text size="xs" fw={700} c="dimmed" mt="lg">
                                  PREREQUISITES THIS OUTPUT USES
                                </Text>
                                <Group gap="xs" mt="xs">
                                  {cause.prerequisites.map((item) => (
                                    <Button
                                      size="compact-xs"
                                      variant="subtle"
                                      key={item.id}
                                      onClick={() => selectLocus(item.id)}
                                    >
                                      {item.label}
                                    </Button>
                                  ))}
                                </Group>
                              </>
                            )}
                            {packet && (
                              <>
                                <Text size="xs" fw={700} c="dimmed" mt="lg">
                                  DOWNSTREAM INVOLVEMENT
                                </Text>
                                {cause?.innate ? (
                                  <Text size="sm" mt="xs">
                                    Static innate-response-profile/1 consumer: this contributor is {cause.fact?.state}.
                                    {cause.innate.enabled ? " The inherited profile is enabled." : " Profile OFF retains the resolved exploration and threshold copies inactive."}
                                    {" "}No anatomical nodes, material field, sensory capability or live behavior is inferred.
                                  </Text>
                                ) : sceneCause?.marking ? (
                                  <>
                                    <Text size="sm" mt="xs">
                                      {sceneCause.enabled
                                        ? `Primary marking field enabled: ${sceneCause.owners.length} painted owner(s), ${sceneCause.logicalCount} logical masks and ${sceneCause.clippedPolygons} clipped polygons.`
                                        : "Primary marking field disabled: no painted owners or masks."}
                                    </Text>
                                    {sceneCause.enabled && sceneCause.owners.map((owner) => (
                                      <Text size="xs" c="dimmed" key={owner.id}>
                                        {owner.id}: {owner.logicalCount} logical masks · {owner.clippedPolygons} clipped polygons
                                      </Text>
                                    ))}
                                    <Text size="sm" mt="xs">
                                      Copies retained; this contributor is {sceneCause.contributorState}.
                                      Surface paint adds no anatomical nodes.
                                    </Text>
                                  </>
                                ) : (
                                  <Text size="sm" mt="xs">
                                    {cause?.targets.length ?? 0} body/feature
                                    nodes include this locus in their trace.
                                  </Text>
                                )}
                                {!cause?.innate && !sceneCause?.marking && cause?.coveringInvolvement && (
                                  <Text size="sm" mt="xs">
                                    {cause.coveringContext
                                      ? "Covering uses this locus as an exclusion or geometry dependency."
                                      : `The ${packet.result.graph.covering.kind} covering includes this locus in its material trace.`}
                                  </Text>
                                )}
                                {sceneCause?.body && (
                                  <Text size="sm" mt="xs">
                                    Solved body exterior uses this locus;{" "}
                                    {sceneCause.bodyTargets} exterior target.
                                  </Text>
                                )}
                                {!cause?.innate && sceneCause?.anatomy && (
                                  <Text size="sm" mt="xs">
                                    {sceneCause.targets.length} anatomical owners consume this contributor.
                                    {sceneCause.material && ` The ${sceneCause.coveringKind} field retains its exact local coverage and exclusions.`}
                                  </Text>
                                )}
                                {sceneCause?.ocular && (
                                  <Text size="sm" mt="xs">
                                    Eye construction uses this locus;{" "}
                                    {sceneCause.ocularTargets} visible eye
                                    targets. An absent pair retains its presence
                                    gate.
                                  </Text>
                                )}
                                {sceneCause?.covering && (
                                  <Text size="sm" mt="xs">
                                    Body material construction uses this locus;{" "}
                                    {sceneCause.coveringKind},{" "}
                                    {sceneCause.coveringTargets} plate targets.
                                    Geometry dependencies and direct material
                                    causes remain in the scene trace.
                                  </Text>
                                )}
                                {!!cause?.dependents.length && (
                                  <Text size="xs" c="dimmed" mt="xs">
                                    Other dependent outputs:{" "}
                                    {cause.dependents.slice(0, 5).join(", ")}
                                    {cause.dependents.length > 5
                                      ? ` +${cause.dependents.length - 5} more in advanced inspection`
                                      : ""}
                                  </Text>
                                )}
                              </>
                            )}
                          </>
                        ) : (
                          <>
                            <Title order={3}>Choose a locus</Title>
                            <Text size="sm" mt="sm">
                              This dimension has no matching records. All keeps
                              the complete catalogue reachable.
                            </Text>
                          </>
                        )}
                      </Paper>
                    </div>
                  </div>
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>
            <Accordion mt="md" variant="separated">
              <Accordion.Item value="examples">
                <Accordion.Control>
                  Known examples · load and resolve
                </Accordion.Control>
                <Accordion.Panel>
                  <Group>
                    {packageExamples(catalogue, [
                      ...familyExamples,
                      ...petExamples,
                      ...sceneExamples,
                    ]).map((example) => (
                      <Button
                        key={example.name}
                        size="sm"
                        variant="light"
                        disabled={busy}
                        onClick={() => loadFamilyExample(example.name)}
                      >
                        {example.name.replaceAll("-", " ")}
                      </Button>
                    ))}
                  </Group>
                  <Text size="xs" c="dimmed" mt="sm">
                    Controlled authoring inputs and copy edits; no species
                    selector.
                  </Text>
                </Accordion.Panel>
              </Accordion.Item>
              <Accordion.Item value="context">
                <Accordion.Control>Context and sampling</Accordion.Control>
                <Accordion.Panel>
                  <Group align="end">
                    <Select
                      label="Reference medium"
                      disabled={busy || ["developmental-anatomical-source/1", "developmental-compositional-source/1", "developmental-compositional-source/2", "developmental-compositional-source/3", "developmental-compositional-source/4", "developmental-compositional-source/5", "developmental-compositional-source/6"].includes(catalogue.ruleVersion)}
                      data={["ground", "air", "water"]}
                      value={context.medium}
                      onChange={(medium) => {
                        setContext({ ...context, medium });
                        invalidate();
                      }}
                    />
                    <NumberInput
                      label="Replay generation seed"
                      value={seed}
                      min={0}
                      max={4294967295}
                      onChange={setSeed}
                    />
                    <Button
                      disabled={busy}
                      variant="light"
                      onClick={() =>
                        run(() => generate(Number(seed)), {
                          retentionKind: "generate",
                        })
                      }
                    >
                      Generate with this seed
                    </Button>
                    <NumberInput
                      label="Expression seed"
                      disabled={busy || ["developmental-anatomical-source/1", "developmental-compositional-source/1", "developmental-compositional-source/2", "developmental-compositional-source/3", "developmental-compositional-source/4", "developmental-compositional-source/5", "developmental-compositional-source/6"].includes(catalogue.ruleVersion)}
                      value={expressionSeed}
                      min={0}
                      max={4294967295}
                      onChange={(value) => {
                        setExpressionSeed(value);
                        invalidate();
                      }}
                    />
                    <Button
                      disabled={busy || !genome || ["developmental-anatomical-source/1", "developmental-compositional-source/1", "developmental-compositional-source/2", "developmental-compositional-source/3", "developmental-compositional-source/4", "developmental-compositional-source/5", "developmental-compositional-source/6"].includes(catalogue.ruleVersion)}
                      variant="light"
                      onClick={() => run(() => resolve(Number(expressionSeed)))}
                    >
                      Sample marking placement
                    </Button>
                  </Group>
                  <Text size="sm" c="dimmed" mt="sm">
                    {isCompositionalRule(catalogue.ruleVersion)
                      ? "This source uses one static reference context and deterministic expression. Founder categories and presence gates sample one declared homozygous state; numeric and pigment copies sample independently. Resolve applies edited copies, including mixed categories, without rerolling."
                      : catalogue.ruleVersion === "developmental-anatomical-source/1" ? "This source uses one static reference context and deterministic expression. Generate samples independent inherited copies; Resolve applies edited copies without rerolling them." : <>Genome generation samples inherited copies. Expression
                    sampling changes permitted marking placement only; inherited
                    copies and other expression stay fixed.</>}
                  </Text>
                  {packet?.generation && (
                    <Text size="xs" c="dimmed" mt="sm">
                      Accepted seed {packet.generation.seed} ·{" "}
                      {packet.generation.attempts} unmodified draws. Exact
                      copies and result are retained for replay.
                    </Text>
                  )}
                  {packet?.scene && packet.generation && (
                    <Code block className="sequence" mt="sm">
                      {pretty(packet.generation)}
                    </Code>
                  )}
                </Accordion.Panel>
              </Accordion.Item>
              <Accordion.Item value="whole">
                <Accordion.Control>
                  Whole genome · baseline, inherited copies and expression
                </Accordion.Control>
                <Accordion.Panel>
                  <Tabs defaultValue="inherited">
                    <Tabs.List>
                      <Tabs.Tab value="baseline">Baseline foundation</Tabs.Tab>
                      <Tabs.Tab value="inherited">Inherited copies</Tabs.Tab>
                      <Tabs.Tab value="expression">
                        Resolved expression
                      </Tabs.Tab>
                    </Tabs.List>
                    {["baseline", "inherited", "expression"].map((kind) => (
                      <Tabs.Panel key={kind} value={kind} pt="md">
                        {packet ? (
                          <>
                            <Accordion>
                              <Accordion.Item value="map">
                                <Accordion.Control>
                                  Inspect complete {kind} field
                                </Accordion.Control>
                                <Accordion.Panel>
                                  <SvgView
                                    markup={drawGenomeField(
                                      catalogue,
                                      genome,
                                      packet.result,
                                      kind,
                                      selected,
                                    )}
                                    onSelect={selectLocus}
                                  />
                                </Accordion.Panel>
                              </Accordion.Item>
                            </Accordion>
                            <Code block className="sequence" mt="sm">
                              {packet.representations[kind]}
                            </Code>
                          </>
                        ) : (
                          <Text size="sm">
                            Resolve to retain complete encodings. All
                            dimension/copy records remain accessible above.
                          </Text>
                        )}
                      </Tabs.Panel>
                    ))}
                  </Tabs>
                </Accordion.Panel>
              </Accordion.Item>
              <Accordion.Item value="advanced">
                <Accordion.Control>
                  Advanced inspection · traces, coverage, geometry and art
                  projection
                </Accordion.Control>
                <Accordion.Panel>
                  {packet ? (
                    <>
                      <Coverage catalogue={catalogue} packet={packet} />
                      {petHandoff.summary && (
                        <Paper withBorder p="md" mt="md">
                          <Title order={4}>Pet brief source audit</Title>
                          <Text size="sm" c="dimmed">Derived from the current verified source. Clause witnesses and unsupported labels stay outside the creative prompt.</Text>
                          <Code block className="sequence" mt="sm">{pretty(petHandoff.summary.audit)}</Code>
                        </Paper>
                      )}
                      {packet.informationStages && (
                        <Paper withBorder p="md" mt="md">
                          <Title order={4}>Information stages</Title>
                          <Text size="sm" c="dimmed">Foundation, inherited genome, expression, phenotype and lifetime are storage stages, separate from the eleven genomic branches above.</Text>
                          <Code block className="sequence" mt="sm">{pretty(packet.informationStages)}</Code>
                        </Paper>
                      )}
                      <Accordion mt="md">
                        <Accordion.Item value="fact">
                          <Accordion.Control>
                            Selected output and dependencies
                          </Accordion.Control>
                          <Accordion.Panel>
                            <SvgView
                              compact
                              onSelect={selectLocus}
                              markup={previewMarkup(
                                packet,
                                packet.scene ? null : previewCamera,
                              )}
                            />
                            <Code block className="sequence">
                              {pretty({
                                fact: selectedFact,
                                dependents: cause?.dependents,
                                targets: cause?.targets,
                                moduleTargets: sceneCause,
                              })}
                            </Code>
                          </Accordion.Panel>
                        </Accordion.Item>
                        <Accordion.Item value="geometry">
                          <Accordion.Control>
                            Complete geometry manifest
                          </Accordion.Control>
                          <Accordion.Panel>
                            {packet.reference?.depthInspector && (
                              <>
                                <Text size="sm">
                                  Separate longitudinal depth inspection; not
                                  the pet reference attachment.
                                </Text>
                                <SvgView
                                  compact
                                  markup={packet.reference.depthInspector}
                                />
                              </>
                            )}
                            <Code block className="sequence">
                              {pretty(
                                packet.scene ??
                                  packet.geometryReference?.manifest ??
                                  packet.geometryReference,
                              )}
                            </Code>
                          </Accordion.Panel>
                        </Accordion.Item>
                        <Accordion.Item value="description">
                          <Accordion.Control>
                            Fact-derived description and supported motion
                          </Accordion.Control>
                          <Accordion.Panel>
                            <Text size="sm">{packet.description}</Text>
                            <Text size="sm" fw={700} mt="md">
                              Full semantic art projection
                            </Text>
                            {packet.prompt?.error ? (
                              <Alert
                                color="orange"
                                title="Semantic projection unavailable"
                              >
                                {packet.prompt.error}
                              </Alert>
                            ) : (
                              <Textarea
                                aria-label="Full semantic art projection"
                                readOnly
                                autosize
                                minRows={6}
                                maxRows={14}
                                value={packet.prompt?.text ?? ""}
                              />
                            )}
                            {packet.result.motion.map((item) => (
                              <Text key={item.id} size="sm" mt="xs">
                                {item.medium}: {item.status} ·{" "}
                                {item.reasons.join(" ")}
                              </Text>
                            ))}
                          </Accordion.Panel>
                        </Accordion.Item>
                      </Accordion>
                    </>
                  ) : (
                    <Text size="sm">
                      No current resolved output. Inputs remain available to
                      edit and resolve.
                    </Text>
                  )}
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>
          </>
        )}

        {view === "compare" && (
          <Paper withBorder p="lg">
            <Title order={2}>Pinned comparison</Title>
            <Text c="dimmed">
              The retained pin survives edits, rejection and catalogue drafts.
            </Text>
            {pinned && (
              <div className="batch-grid">
                <div>
                  <Text size="sm">Pinned · {pinned.ruleVersion}</Text>
                  <SvgView
                    markup={
                      pinned.scene
                        ? scenePreviewMarkup(pinned, sceneComparisonCamera)
                        : drawAuthoringCreature(
                            pinned.result,
                            null,
                            diagnosticViewOptions(comparisonCamera),
                          )
                    }
                    compact
                  />
                </div>
                {packet && (
                  <div>
                    <Text size="sm">Current · {packet.ruleVersion}</Text>
                    <SvgView
                      markup={
                        packet.scene
                          ? scenePreviewMarkup(packet, sceneComparisonCamera)
                          : drawAuthoringCreature(
                              packet.result,
                              null,
                              diagnosticViewOptions(comparisonCamera),
                            )
                      }
                      compact
                    />
                  </div>
                )}
              </div>
            )}
            {!pinned && <Text>Pin a resolved experiment first.</Text>}
            {pinned && packet && (
              <Text size="sm" c="dimmed" mt="sm">
                {compatibleComparison
                  ? "Both subjects share one camera and world scale."
                  : "Separate preview framing; these images are not to a common world scale."}
              </Text>
            )}
            {pinned && packet && pinned.ruleVersion !== packet.ruleVersion && (
              <Alert color="orange" mt="sm">
                Different construction profiles; these are separate inspections,
                not compatible family or inherited-output comparison.
              </Alert>
            )}
            {pinned && packet && pinned.ruleVersion === packet.ruleVersion && (
              <>
                <Text size="sm" fw={600} mt="md">
                  {differences.filter((item) => item.changed).length} changed
                  outputs
                </Text>
                <Table striped>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Output</Table.Th>
                      <Table.Th>Pinned</Table.Th>
                      <Table.Th>Current</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {differences
                      .filter((item) => item.changed)
                      .map((item) => (
                        <Table.Tr key={item.id}>
                          <Table.Td>
                            {item.id}{" "}
                            {item.changed && (
                              <Badge size="xs">
                                {item.valueChanged
                                  ? "value changed"
                                  : "state changed"}
                              </Badge>
                            )}
                          </Table.Td>
                          <Table.Td>
                            {JSON.stringify(item.before)} · {item.beforeState}
                          </Table.Td>
                          <Table.Td>
                            {JSON.stringify(item.after)} · {item.afterState}
                          </Table.Td>
                        </Table.Tr>
                      ))}
                  </Table.Tbody>
                </Table>
                <Accordion mt="md">
                  <Accordion.Item value="all-differences">
                    <Accordion.Control>
                      Inspect all output values and states
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Code block className="sequence">
                        {pretty(differences)}
                      </Code>
                    </Accordion.Panel>
                  </Accordion.Item>
                </Accordion>
              </>
            )}
          </Paper>
        )}
        {view === "records" && (
          <Paper withBorder p="lg">
            <Group justify="space-between">
              <Title order={2}>Saved experiments</Title>
              <Button
                onClick={() => {
                  userIntent.current = true;
                  setJson("Import experiment or draft");
                  setJsonText("");
                }}
              >
                Import JSON / verified replay
              </Button>
            </Group>
            <Text c="dimmed">
              Local browser retention plus copyable exports. Imported result
              fields never establish genetic truth.
            </Text>
            {records.map((item) => (
              <Group
                key={item.recordId}
                justify="space-between"
                className="saved-record"
              >
                <div>
                  <Text fw={700}>{item.recordId}</Text>
                  <Text size="xs">
                    {item.savedLabel ?? item.result.classification.labels.join(" · ")}
                  </Text>
                </div>
                <Group>
                  <Button
                    size="xs"
                    variant="light"
                    onClick={() => exportJson("Saved experiment", item)}
                  >
                    Export
                  </Button>
                  <Button
                    size="xs"
                    onClick={() => {
                      exportJson("Replay saved experiment", item);
                    }}
                  >
                    Replay
                  </Button>
                </Group>
              </Group>
            ))}
            {!records.length && <Text>No saved experiments yet.</Text>}
            <Divider my="md" />
            <Button
              variant="light"
              onClick={() => {
                userIntent.current = true;
                const revision = inputRevision.current;
                return run(async () => {
                  const stored = JSON.parse(
                    localStorage.getItem(compositionalAuthoring ? draftStorageKey(draft) : draftKey) ?? "null",
                  );
                  if (!stored) throw new Error("No saved draft.");
                  if (stored.schemaVersion === COMPOSITIONAL_DRAFT_SCHEMA || isCompositionalDraft(stored)) {
                    const descriptor = await request("/api/compositional-source/validate", stored.authoredRecipe ?? stored);
                    if (revision !== inputRevision.current) return;
                    retainCompositionalDraft(descriptor);
                    setView("compendium");
                    setMessage("Restored separate authored draft; current experiment unchanged.");
                    return;
                  }
                  await request("/api/authoring/validate", stored);
                  if (revision !== inputRevision.current) return;
                  const nextSelected = scopedSelection(stored.loci, selected);
                  setSelected(nextSelected);
                  setFamily("all");
                  setSearch("");
                  setEdited(
                    pretty(
                      stored.loci.find((item) => item.id === nextSelected),
                    ),
                  );
                  setDraft(stored);
                  setView("compendium");
                  setMessage(
                    "Restored separate catalogue draft; experiment unchanged.",
                  );
                });
              }}
            >
              {compositionalAuthoring ? "Restore saved compositional draft" : "Restore saved catalogue draft"}
            </Button>
          </Paper>
        )}
        {view === "batch" && (
          <>
            <Group justify="space-between" mb="md">
              <Title order={2}>Contrasting generation batch</Title>
              <Group>
                <NumberInput
                  label="First seed"
                  value={seed}
                  min={0}
                  max={4294967289}
                  onChange={setSeed}
                  w={130}
                />
                <Button disabled={busy} onClick={() => run(runBatch)}>
                  Generate six experiments
                </Button>
              </Group>
            </Group>
            <Text mb="md" c="dimmed">
              Seeded valid draws, no chosen output classes. Static diagnostics;
              medium capability is an analytic rule.
            </Text>
            <div className="batch-grid">
              {batch.map((item) => (
                <Paper key={item.recordId} withBorder p="md">
                  <SvgView markup={item.reference?.svg ?? item.diagnostic} />
                  <Text size="sm" fw={700}>
                    {item.result.classification.labels.join(" · ")}
                  </Text>
                  <Text size="xs">
                    seed {item.input.genome.origin.seed} ·{" "}
                    {item.result.graph.nodes.length} nodes
                  </Text>
                  <Button
                    size="xs"
                    mt="sm"
                    variant="light"
                    onClick={() => exportJson("Batch experiment", item)}
                  >
                    Export retained packet
                  </Button>
                </Paper>
              ))}
            </div>
          </>
        )}
        <Text size="xs" c="dimmed" mt="xl">
          Provisional authoring content; no production sprite/rig/animation,
          sample permission, cloud, game-save or hardware claim.
        </Text>
        <Modal
          opened={json !== null}
          onClose={() => setJson(null)}
          title={json}
          size="xl"
        >
          {json?.endsWith("compact scene replay") && (
            <Text size="sm" mb="sm">
              Compact replay inputs and verification fingerprints. Import
              regenerates the scene and prompt; the full source artifact stays
              in the retained record.
            </Text>
          )}
          <Textarea
            aria-label="Copyable authoring JSON"
            value={jsonText}
            onChange={(event) => setJsonText(event.target.value)}
            autosize
            minRows={12}
            maxRows={24}
          />
          <Group mt="md">
            <Button
              disabled={busy}
              onClick={() => run(importRecord, { retentionKind: "import" })}
            >
              Validate inputs & replay / import draft
            </Button>
            <Text size="xs" c="dimmed">
              Copy this JSON to retain it outside this browser.
            </Text>
          </Group>
        </Modal>
      </AppShell.Main>
    </AppShell>
  );
}

function GenomicBranches({ catalogue, genome, packet, onSelect }) {
  const facts = packet?.result.facts ?? [];
  const inheritedCount = Object.keys(genome?.loci ?? {}).length;
  return (
    <Paper withBorder p="md" mt="md">
      <Title order={3}>Eleven genomic branches</Title>
      <Text size="sm" c="dimmed" mt="xs">
        {inheritedCount} carried pairs · {catalogue.loci.filter(locus => locus.status === "draft").length} draft definitions.
        Every declared record remains available. A retained contribution with no compatible consumer is unimplemented, rather than a working phenotype.
      </Text>
      <Accordion mt="sm" multiple>
        {catalogue.families.map(branch => {
          const loci = catalogue.loci.filter(locus => canonicalGenomicFamily(locus.family) === branch.id || (locus.affectedFamilies ?? []).map(canonicalGenomicFamily).includes(branch.id));
          const coverage = packet?.result.coverage.find(item => item.id === branch.id);
          return (
            <Accordion.Item key={branch.id} value={branch.id}>
              <Accordion.Control>
                {familyLabel(branch.id)} · {loci.length} indexed records
                {coverage ? ` · ${coverage.activeContributors.length} active / ${coverage.inactiveContributors.length} inactive / ${coverage.unimplementedContributors.length} unimplemented` : " · awaiting Resolve"}
              </Accordion.Control>
              <Accordion.Panel>
                <Text size="sm" c="dimmed">{branch.gaps}</Text>
                {!loci.length && <Text size="sm" mt="xs">No implemented locus contract is supplied for this branch. No copies or physiological values are invented.</Text>}
                {!!loci.length && (
                  <Table mt="sm" striped>
                    <Table.Thead><Table.Tr><Table.Th>Record</Table.Th><Table.Th>Inherited copies</Table.Th><Table.Th>Contribution / consumer</Table.Th></Table.Tr></Table.Thead>
                    <Table.Tbody>
                      {loci.map(locus => {
                        const fact = facts.find(item => item.locusId === locus.id);
                        return (
                          <Table.Tr key={locus.id}>
                            <Table.Td><Button size="compact-xs" variant="subtle" onClick={() => onSelect(locus.id)}>{locus.label}</Button><Text size="xs" c="dimmed">{locus.id} · v{locus.version}</Text></Table.Td>
                            <Table.Td>{genome?.loci[locus.id]?.join(" / ") ?? "No implemented copy contract"}</Table.Td>
                            <Table.Td><Text size="sm">{fact ? outputText(fact) : "Awaiting Resolve"}</Text><Badge size="xs" color={fact?.state === "expressed" ? "sage" : "gray"}>{fact?.state ?? (locus.status === "draft" ? "unimplemented" : "awaiting Resolve")}</Badge><Text size="xs" c="dimmed" mt="xs">{fact?.reasons?.join(" ") ?? locus.purpose}</Text></Table.Td>
                          </Table.Tr>
                        );
                      })}
                    </Table.Tbody>
                  </Table>
                )}
              </Accordion.Panel>
            </Accordion.Item>
          );
        })}
      </Accordion>
    </Paper>
  );
}

function Coverage({ catalogue, packet }) {
  return (
    <Paper withBorder p="md" mt="md">
      <Title order={3}>Eleven-family coverage and gaps</Title>
      <Table mt="md" striped>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Family</Table.Th>
            <Table.Th>{isCompositionalRule(packet.ruleVersion) ? "Active / inactive / unimplemented" : "Active / inactive / draft"}</Table.Th>
            <Table.Th>Boundary</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {packet.result.coverage.map((family) => (
            <Table.Tr key={family.id}>
              <Table.Td>{familyLabel(family.id)}</Table.Td>
              <Table.Td>
                {family.activeContributors.length} /{" "}
                {family.inactiveContributors.length} /{" "}
                {family.unimplementedContributors?.length ?? family.draftRecords.length}
              </Table.Td>
              <Table.Td>{family.gaps}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      <Text size="xs" c="dimmed" mt="sm">
        {catalogue.reproductionContract.mechanism} Authoring-only contract;
        taxonomy never authorizes reproduction.
      </Text>
    </Paper>
  );
}

const theme = {
  primaryColor: "sage",
  colors: {
    sage: [
      "#edf5ef",
      "#d9e8dd",
      "#bfd4c5",
      "#a3c0ad",
      "#89ae97",
      "#729d84",
      "#5f8970",
      "#4b745c",
      "#395e48",
      "#274735",
    ],
  },
  fontFamily: "Inter, system-ui, sans-serif",
};
createRoot(document.getElementById("root")).render(
  <MantineProvider theme={theme} defaultColorScheme="dark">
    <Workbench />
  </MantineProvider>,
);

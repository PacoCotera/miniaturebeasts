import React, { useEffect, useMemo, useRef, useState } from "react";
import { Accordion, Alert, Button, FileInput, Group, Paper, Stack, Text, TextInput } from "@mantine/core";
import { isResolvedAuthoringPacket, sceneReplayEnvelope } from "../authoring-ui.mjs";
import ApiPetRenderPanel from "./ApiPetRenderPanel.jsx";
import {
  downloadProposalBlob,
  proposalBindingKey,
  proposalSourceBinding,
  readPetProposals,
  retainPetProposal,
} from "../retained-pet-proposals.mjs";

function ProposalImage({ entry }) {
  const [image, setImage] = useState(null);
  useEffect(() => {
    const url = URL.createObjectURL(entry.imageBlob);
    setImage({ proposalId: entry.proposalId, url });
    return () => URL.revokeObjectURL(url);
  }, [entry]);
  return image?.proposalId === entry.proposalId ? (
    <img src={image.url} alt="Returned pet proposal; inherited fidelity is unaccepted"
      style={{ display: "block", maxWidth: "100%", maxHeight: 420, objectFit: "contain" }} />
  ) : null;
}

function ProposalTile({ entry, onDownload, onCopy, onPrompt }) {
  const [details, setDetails] = useState(false);
  const metadata = entry.metadata;
  const prompt = metadata.apiProvenance?.promptText ?? metadata.sourceBinding.promptText;
  return <Paper withBorder p="sm" className={`render-detail${details ? " expanded" : ""}`}>
    <ProposalImage entry={entry} />
    <Text size="sm" mt="xs">{metadata.providerLabel} · proposal</Text>
    <Text size="xs" c="dimmed">{metadata.sourceBinding.sourceVersion} · {metadata.workingCreature ? "Working creature render" : "Earlier retained exact-source render"}</Text>
    <Button size="compact-xs" mt="xs" variant="light" onClick={() => setDetails(!details)}>{details ? "Hide details" : "Inspect this render"}</Button>
    {details && <>
      <Text size="xs" mt="xs">Original genome ID: {metadata.workingCreature?.originalGenomeId ?? metadata.sourceBinding.inputDigest}</Text>
      <Text size="xs">Actual genome/input: {metadata.sourceBinding.inputDigest}</Text>
      <Text size="xs">Source: {metadata.sourceBinding.sourceRecordId}</Text>
      <Text size="xs">{entry.proposalId} · {metadata.image.width}×{metadata.image.height}</Text>
      <Text size="sm" mt="xs" style={{ whiteSpace: "pre-wrap" }}>{prompt}</Text>
      <Group mt="xs">
        <Button size="compact-xs" variant="light" onClick={() => onDownload(entry, false)}>Download image</Button>
        <Button size="compact-xs" variant="light" onClick={() => onDownload(entry, true)}>Download linked metadata</Button>
        <Button size="compact-xs" variant="light" onClick={() => onCopy(entry)}>Copy linked metadata</Button>
        {onPrompt && <Button size="compact-xs" variant="light" onClick={() => onPrompt(prompt)}>Edit this prompt</Button>}
      </Group>
    </>}
  </Paper>;
}

export default function ReturnedPetPanel({ packet, handoff, revision, sourceBusy,
  workingCreature = null, promptText, onPrompt, guided = false }) {
  const source = useMemo(() => {
    try {
      if (!isResolvedAuthoringPacket(packet) || handoff.status !== "ready") {
        return { binding: null, reason: "Resolve a source and prompt before retaining returned art." };
      }
      return { binding: proposalSourceBinding(packet, handoff.text, sceneReplayEnvelope(packet)) };
    } catch (error) {
      return { binding: null, reason: error.message };
    }
  }, [packet, handoff.text, handoff.status]);
  const selectionKey = `${revision}:${proposalBindingKey(source.binding)}`;
  const galleryKey = workingCreature ? `${workingCreature.id}:${workingCreature.originalGenomeId}` : selectionKey;
  const currentSelection = useRef(selectionKey);
  currentSelection.current = selectionKey;
  const currentGallery = useRef(galleryKey);
  currentGallery.current = galleryKey;
  const operation = useRef(null);
  const [selection, setSelection] = useState(null);
  const [providerLabel, setProviderLabel] = useState("Gemini (manual return)");
  const [retained, setRetained] = useState({ key: "", entries: [] });
  const [serverJobs, setServerJobs] = useState({ key: "", ids: [] });
  const [notice, setNotice] = useState({ key: "", text: "", error: false });
  const [savingKey, setSavingKey] = useState("");
  const saving = savingKey === selectionKey;
  const selectedFile = selection?.key === selectionKey ? selection.file : null;
  const entries = retained.key === galleryKey ? retained.entries : [];
  const listedIds = serverJobs.key === galleryKey ? serverJobs.ids : [];
  const uniqueEntries = entries.filter((entry) => !listedIds.includes(entry.metadata.apiProvenance?.jobId));

  function mergeEntry(entry, key = galleryKey) {
    if (currentGallery.current !== key) return;
    setRetained((previous) => ({ key, entries: [
      ...(previous.key === key ? previous.entries.filter((item) => item.proposalId !== entry.proposalId) : []), entry,
    ] }));
  }

  useEffect(() => {
    operation.current?.abort();
    setSelection(null);
    setSavingKey("");
    return () => operation.current?.abort();
  }, [selectionKey, sourceBusy]);

  useEffect(() => {
    const controller = new AbortController();
    const key = galleryKey;
    setNotice({ key, text: "", error: false });
    if (source.binding) readPetProposals(source.binding, controller.signal, workingCreature).then((loaded) => {
      if (controller.signal.aborted || currentGallery.current !== key) return;
      setRetained((previous) => {
        const merged = new Map(loaded.map((entry) => [entry.proposalId, entry]));
        if (previous.key === key) for (const entry of previous.entries) merged.set(entry.proposalId, entry);
        return { key, entries: Array.from(merged.values()) };
      });
    }).catch((error) => {
      if (error.name !== "AbortError" && currentGallery.current === key) setNotice({ key, text: error.message, error: true });
    });
    return () => controller.abort();
  }, [galleryKey, selectionKey]);

  async function retainSelected() {
    if (!selectedFile || !source.binding || sourceBusy || saving) return;
    const key = selectionKey;
    const controller = new AbortController();
    operation.current = controller;
    setSavingKey(key);
    setNotice({ key: galleryKey, text: "", error: false });
    try {
      const entry = await retainPetProposal(selectedFile, source.binding, providerLabel, controller.signal, null, workingCreature);
      if (controller.signal.aborted || currentSelection.current !== key) return;
      mergeEntry(entry);
      setSelection(null);
      setNotice({ key: galleryKey, text: "Pet proposal retained with its exact source and prompt. Fidelity remains unaccepted.", error: false });
    } catch (error) {
      if (error.name !== "AbortError" && currentSelection.current === key) setNotice({ key: galleryKey, text: error.message, error: true });
    } finally {
      if (operation.current === controller) operation.current = null;
      if (currentSelection.current === key) setSavingKey("");
    }
  }

  function download(entry, metadataOnly) {
    try {
      const extension = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" }[entry.metadata.image.mime];
      const blob = metadataOnly ? new Blob([JSON.stringify(entry.metadata, null, 2)], { type: "application/json" }) : entry.imageBlob;
      downloadProposalBlob(blob, `${entry.proposalId}.${metadataOnly ? "json" : extension}`);
    } catch (error) { setNotice({ key: galleryKey, text: error.message, error: true }); }
  }

  async function copyMetadata(entry) {
    const key = galleryKey;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard access is unavailable in this browser.");
      await navigator.clipboard.writeText(JSON.stringify(entry.metadata, null, 2));
      if (currentGallery.current === key) setNotice({ key, text: "Linked metadata copied, including the exact source replay recipe.", error: false });
    } catch (error) {
      if (currentGallery.current === key) setNotice({ key, text: `Could not copy linked metadata: ${error.message}`, error: true });
    }
  }

  return (
    <Paper withBorder p="md" mt="md">
      <ApiPetRenderPanel binding={source.binding} referenceSvg={handoff.referenceSvg} revision={revision}
        workingCreature={workingCreature} promptText={promptText} onPrompt={onPrompt} sourceDirty={sourceBusy}
        onRetained={(entry) => mergeEntry(entry, galleryKey)}
        onJobs={(ids) => setServerJobs((previous) => previous.key === galleryKey && JSON.stringify(previous.ids) === JSON.stringify(ids) ? previous : { key: galleryKey, ids })}
        additionalRenderCount={uniqueEntries.length}
        additionalTiles={uniqueEntries.map((entry) => <ProposalTile key={entry.proposalId} entry={entry} onDownload={download} onCopy={copyMetadata} onPrompt={onPrompt} />)} />
      <Accordion mt="md" defaultValue={guided ? null : "manual"}><Accordion.Item value="manual">
        <Accordion.Control>Advanced · attach a manually returned image</Accordion.Control><Accordion.Panel>
          {!source.binding ? <Text size="sm">{source.reason}</Text> : <Stack gap="sm">
            <Text size="xs" c="dimmed">Source: {source.binding.sourceRecordId}. Manual attachment uses the source-derived brief; API renders retain their separately submitted prompt.</Text>
            <FileInput key={selectionKey} label="Returned bitmap" accept="image/png,image/jpeg,image/webp"
              placeholder="Choose PNG, JPEG or WebP (at most4MiB)" value={selectedFile}
              disabled={saving || sourceBusy} clearable onChange={(file) => setSelection(file ? { key: selectionKey, file } : null)} />
            <TextInput label="Provider label" value={providerLabel} maxLength={80} disabled={saving || sourceBusy}
              onChange={(event) => setProviderLabel(event.currentTarget.value)} />
            <Group>
              <Button size="xs" disabled={!selectedFile || sourceBusy || saving || !providerLabel.trim()} onClick={retainSelected}>{saving ? "Retaining…" : "Retain pet proposal"}</Button>
              {saving && <Button size="xs" variant="subtle" onClick={() => {
                operation.current?.abort();
                setNotice({ key: galleryKey, text: "Cancellation requested. Any completed retention keeps its original binding.", error: false });
              }}>Cancel</Button>}
            </Group>
            <Text size="xs" c="dimmed">This separate browser store holds up to eight proposals. Capacity and quota failures never evict art or genome saves. Grouping is user authoring association, not verified ancestry.</Text>
          </Stack>}
        </Accordion.Panel></Accordion.Item></Accordion>
      {notice.key === galleryKey && notice.text && <Alert mt="sm" color={notice.error ? "red" : "sage"}>{notice.text}</Alert>}
    </Paper>
  );
}

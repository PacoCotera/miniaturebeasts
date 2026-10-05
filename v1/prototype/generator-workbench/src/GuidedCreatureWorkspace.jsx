import React, { useEffect, useState } from "react";
import { Accordion, Alert, Badge, Button, CopyButton, Group, Paper, ScrollArea, Select, Stack, Text, Textarea, TextInput, Title } from "@mantine/core";
import { canonicalGenomicFamily, scopedLoci, outputText, imageLedPetHandoff,
  sharedSceneCamera, comparisonUsesSharedCamera, scenePreviewMarkup } from "../authoring-ui.mjs";
import { compareResults } from "../presentation.mjs";
import ReturnedPetPanel from "./ReturnedPetPanel.jsx";

function comparisonCamera(before, current) {
  const existing = sharedSceneCamera([before, current]);
  if (existing) return existing;
  if (before?.sceneProjectionVersion !== current?.sceneProjectionVersion ||
      !before?.scene?.nodes || !current?.scene?.nodes) return null;
  const axes = current.reference?.camera;
  if (!axes?.right || !axes.up || JSON.stringify(before.reference?.camera) !== JSON.stringify(axes)) return null;
  let minimumX = Infinity, maximumX = -Infinity, minimumY = Infinity, maximumY = -Infinity;
  for (const packet of [before, current]) for (const owner of packet.scene.nodes) {
    // Use retained visible material extents as well as tissue; do not reconstruct geometry.
    const points = [...owner.mesh.vertices, ...(owner.surfaceFragments ?? []).flatMap((fragment) => fragment.points)];
    for (const point of points) {
      const x = point.reduce((sum, value, axis) => sum + value * axes.right[axis], 0);
      const y = -point.reduce((sum, value, axis) => sum + value * axes.up[axis], 0);
      minimumX = Math.min(minimumX, x); maximumX = Math.max(maximumX, x);
      minimumY = Math.min(minimumY, y); maximumY = Math.max(maximumY, y);
    }
  }
  const side = Math.max(maximumX - minimumX, maximumY - minimumY) * 1.12;
  if (![minimumX, maximumX, minimumY, maximumY, side].every(Number.isFinite) || side <= 0) return null;
  return { minimumX: (minimumX + maximumX - side) / 2, minimumY: (minimumY + maximumY - side) / 2, side };
}

function SourceView({ packet, camera }) {
  if (!packet) return <div className="empty-result">Create a random genome to see its structure.</div>;
  const markup = packet.scene ? scenePreviewMarkup(packet, camera) : imageLedPetHandoff(packet).referenceSvg;
  return <div className="guided-source" dangerouslySetInnerHTML={{ __html: markup }} />;
}

export default function GuidedCreatureWorkspace({ catalogue, genome, resolved, before, dirty, busy, family, search,
  selected, onScope, onSelect, onCopy, onGenerate, onRefresh, renderPrompt, onPrompt, group, savedCreatures, onReopen, revision, persistenceNotice }) {
  const handoff = imageLedPetHandoff(resolved);
  const [promptNotice, setPromptNotice] = useState("");
  const [expandedLayers, setExpandedLayers] = useState([]);
  const locus = catalogue.loci.find((entry) => entry.id === selected);
  const fact = resolved?.result.facts.find((entry) => entry.locusId === selected);
  const isUnused = (entry) => entry.status === "draft" ||
    resolved?.result.facts.find((item) => item.locusId === entry.id)?.state === "unimplemented";
  useEffect(() => {
    if (!locus) return;
    const parent = catalogue.families.find((branch) => branch.id === locus.family)?.id ??
      catalogue.families.find((branch) => branch.id === canonicalGenomicFamily(locus.family))?.id;
    if (!parent) return;
    setExpandedLayers((previous) => previous.includes(parent) ? previous : [...previous, parent]);
  }, [selected, catalogue.id, catalogue.version]);
  useEffect(() => {
    if (!search.trim()) return;
    const matches = catalogue.families.filter((branch) => scopedLoci(catalogue, branch.id, search).length).map((branch) => branch.id);
    setExpandedLayers((previous) => Array.from(new Set([...previous, ...matches])));
  }, [search, catalogue.id, catalogue.version]);
  function traitChoice(entry) {
    const state = resolved?.result.facts.find((item) => item.locusId === entry.id)?.state;
    return <button type="button" key={entry.id}
      className={`locus-choice ${entry.id === selected ? "selected" : ""}`} onClick={() => onSelect(entry.id)}>
      <span className="locus-title">{entry.label}</span>
      <Badge size="xs" variant="light" color={entry.status === "draft" || state === "unimplemented" ? "gray" : state === "inactive" ? "orange" : "sage"}>
        {entry.status === "draft" ? "Draft · not implemented" : state === "unimplemented" ? "Not implemented" : state || "Awaiting refresh"}
      </Badge>
    </button>;
  }
  const changes = resolved ? catalogue.loci.filter((entry) =>
    JSON.stringify(genome?.loci[entry.id]) !== JSON.stringify(resolved.input.genome.loci[entry.id])) : [];
  const camera = before?.scene && resolved?.scene ? comparisonCamera(before, resolved) : null;
  const compatible = before && comparisonUsesSharedCamera(before, resolved, camera);
  const differences = before && resolved ? compareResults(before.result, resolved.result) : [];
  const nextStep = !resolved ? "Create a random genome to begin." : dirty ?
    "Your changes are pending. Refresh the structure to compare them, then render." :
    "Choose a trait to refine, or adjust the prompt and render this structure.";
  const savedOptions = savedCreatures.map((entry, index) => ({ value: entry.association.id,
    label: `Mibi ${index + 1} · ${entry.association.originalGenomeId.slice(0, 12)}…` }));
  if (group && !savedOptions.some((entry) => entry.value === group.association.id)) savedOptions.push({
    value: group.association.id, label: `Current mibi · ${group.association.originalGenomeId.slice(0, 12)}… (session only)`, disabled: true,
  });
  return (
    <>
      <Group justify="space-between" mb="md">
        <div><Title order={2}>Create a mibi</Title><Text size="sm" c="dimmed">{nextStep}</Text></div>
        <Group align="flex-end">
          {!!savedOptions.length && <Select label="Saved mibis" value={group?.association.id ?? null}
            data={savedOptions} disabled={busy} onChange={onReopen} placeholder="Choose a saved mibi" />}
          <Button disabled={busy} onClick={onGenerate}>New random genome</Button>
        </Group>
      </Group>
      <div className="guided-journey" aria-label="Mibi authoring journey">
        {["Create a random genome", "Edit inherited traits", "Refresh and compare", "Render and adjust"].map((label, index) => {
          const active = !resolved ? index === 0 : dirty ? index === 2 : index === 1 || index === 3;
          return <Paper key={label} withBorder p="xs"><Group gap="xs"><Badge color={active ? "sage" : "gray"}>{index + 1}</Badge><Text size="sm" fw={active ? 600 : 400}>{label}</Text></Group></Paper>;
        })}
      </div>
      {persistenceNotice && <Alert mb="md" color="orange">{persistenceNotice}</Alert>}
      <div className="guided-workspace">
        <Paper withBorder p="md" className="guided-structure">
          <Group justify="space-between"><Title order={3}>Current structure</Title><Badge color={!resolved ? "gray" : dirty ? "orange" : "sage"}>{!resolved ? "Not generated" : dirty ? "Changes pending" : "Refreshed"}</Badge></Group>
          <Text size="xs" c="dimmed" mt="xs">3D source preview</Text>
          <SourceView packet={resolved} />
          {resolved && dirty && <Text size="sm" c="orange">The last successful structure stays visible. Refresh to apply your inherited-copy edits; rendering is unavailable until then.</Text>}
          <Button mt="sm" disabled={busy || !genome} onClick={onRefresh}>{busy ? "Refreshing…" : "Refresh structure"}</Button>
          {group && <Group mt="xs" gap="xs"><Text size="xs" c="dimmed">Genome ID: {group.association.originalGenomeId.slice(0, 12)}…</Text>
            <CopyButton value={group.association.originalGenomeId}>{({ copied, copy }) => <Button size="compact-xs" variant="subtle" onClick={copy}>{copied ? "Copied" : "Copy full ID"}</Button>}</CopyButton>
          </Group>}
          {resolved && <Accordion mt="xs"><Accordion.Item value="identity"><Accordion.Control>Identity and source</Accordion.Control><Accordion.Panel>
            <Text size="xs">Source: {resolved.recordId} · {resolved.sceneProjectionVersion}</Text>
            <Text size="xs">Actual genome/input: {resolved.inputDigest}</Text>
            {group && <Text size="xs">Original genome ID: {group.association.originalGenomeId}<br />Working mibi: {group.association.id}. This is user authoring association, not verified ancestry.</Text>}
          </Accordion.Panel></Accordion.Item></Accordion>}
          {before && resolved && before.recordId !== resolved.recordId && <div className="guided-comparison">
            <Title order={5} mt="md">Before / Current</Title>
            <div className="result-pair"><div><Text size="xs">Before refresh</Text><SourceView packet={before} camera={compatible ? camera : null} /></div><div><Text size="xs">Current</Text><SourceView packet={resolved} camera={compatible ? camera : null} /></div></div>
            {!compatible && <Text size="xs" c="dimmed">Different profiles use separate framing; apparent size is not a measured comparison.</Text>}
            <Text size="xs" c="dimmed">{differences.filter((entry) => entry.changed).length} resolved outputs changed. Exact definitions and traces remain in Advanced tools.</Text>
          </div>}
        </Paper>
        <Stack gap="md">
          <Paper withBorder p="md">
            <Title order={3}>Edit inherited traits</Title>
            <Text size="sm" c="dimmed" mt="xs">Choose a trait, change either inherited copy, then refresh the structure.</Text>
            <TextInput label="Find an attribute across all genome layers" mt="sm" value={search}
              onChange={(event) => onScope("all", event.currentTarget.value)} />
            <div className="guided-traits">
              <div className="guided-layer-tree">
                <Text size="sm" fw={600} mb="xs">Genome layers and attributes</Text>
                <Accordion multiple value={expandedLayers} onChange={setExpandedLayers}>
                  {catalogue.families.map((branch) => {
                    const attributes = scopedLoci(catalogue, branch.id);
                    const matches = scopedLoci(catalogue, branch.id, search);
                    const ordered = [...matches.filter((entry) => !isUnused(entry)), ...matches.filter(isUnused)];
                    return <Accordion.Item value={branch.id} key={branch.id}>
                      <Accordion.Control>
                        <Text size="sm" fw={600}>{branch.label || branch.id.replaceAll("-", " ")}</Text>
                        <Text size="xs" c="dimmed">{attributes.length} attributes{!attributes.length ? " · No attributes implemented" : ""}{search.trim() ? ` · ${matches.length} matching` : ""}</Text>
                      </Accordion.Control>
                      <Accordion.Panel>
                        <Text size="xs" c="dimmed" className="guided-layer-gap">{branch.gaps || (attributes.length ? "See each attribute's current consumer status." : "No implemented attribute contract yet.")}</Text>
                        {ordered.length ? <ScrollArea h={Math.min(ordered.length * 78, 280)}><Stack gap={5}>{ordered.map(traitChoice)}</Stack></ScrollArea> :
                          <Text size="sm">{attributes.length ? "No matching attributes in this layer." : "No implemented attribute contract yet."}</Text>}
                      </Accordion.Panel>
                    </Accordion.Item>;
                  })}
                </Accordion>
              </div>
              <div className="guided-trait-detail">{locus ? <>
                <Text size="xs" c="dimmed">{canonicalGenomicFamily(locus.family).replaceAll("-", " ")}</Text>
                <Title order={4}>{locus.label}</Title><Text size="sm" mt="xs">{locus.purpose}</Text>
                {locus.status === "validated" ? [0, 1].map((copy) => <div key={copy} className="allele-choice-row">
                  <Text size="sm" fw={600}>Copy {copy + 1}</Text><Group gap={5}>{locus.alleles.map((allele) => <Button size="compact-xs" key={allele.id}
                    disabled={busy || !genome?.loci[locus.id]} variant={genome?.loci[locus.id]?.[copy] === allele.id ? "filled" : "light"}
                    onClick={() => onCopy(locus.id, copy, allele.id)}>{allele.label}</Button>)}</Group>
                </div>) : <Text mt="sm">Draft · no implemented inherited trait contract.</Text>}
                <Text size="sm" fw={600} mt="md">Last refreshed value: {outputText(fact)}</Text>
                <Text size="xs" c="dimmed">{fact?.state || "Not resolved"}{fact?.state === "unimplemented" ? " · No current consumer" : ""}</Text>
                {!!locus.requires?.length && <Group gap={5} mt="sm">{locus.requires.map((id) => <Button size="compact-xs" variant="subtle" key={id} onClick={() => onSelect(id)}>Requires {catalogue.loci.find((entry) => entry.id === id)?.label || id}</Button>)}</Group>}
              </> : <Text mt="md">Choose an attribute beneath a genome layer. Expand a layer to inspect its attributes and current gaps.</Text>}</div>
            </div>
            {resolved && dirty && <Alert color="orange" mt="sm">Pending: {changes.map((entry) => entry.label).join(", ") || "Input or package changes"}. The shown resolved values belong to the previous successful structure.</Alert>}
            <Button mt="sm" disabled={busy || !genome} onClick={onRefresh}>Refresh structure</Button>
            {resolved?.result.innateProfile && <Text size="xs" c="dimmed" mt="sm">Optional innate profile: {resolved.result.innateProfile.status}. Static inherited data only; no observed behavior.</Text>}
          </Paper>
          <Paper withBorder p="md">
            <Title order={3}>Render prompt</Title>
            <Textarea label="Exact text to send" autosize minRows={4} maxRows={10} value={renderPrompt}
              onChange={(event) => onPrompt(event.currentTarget.value)} />
            <Group mt="xs"><Button size="xs" variant="light" disabled={!handoff.text} onClick={() => onPrompt(handoff.text)}>Reset to source brief</Button>
              <Button size="xs" variant="light" disabled={!renderPrompt} onClick={async () => {
                try {
                  if (!navigator.clipboard?.writeText) throw new Error("Clipboard access is unavailable.");
                  await navigator.clipboard.writeText(renderPrompt);
                  setPromptNotice("Exact render prompt copied.");
                } catch (error) { setPromptNotice(error.message); }
              }}>Copy prompt</Button></Group>
            {promptNotice && <Text size="xs" mt="xs">{promptNotice}</Text>}
            <Text size="xs" c="dimmed" mt="xs">Your render draft is separate from the genome-derived brief. Rendering sends this exact text; it does not change inherited traits.</Text>
          </Paper>
        </Stack>
      </div>
      <ReturnedPetPanel packet={resolved} handoff={handoff} revision={revision} sourceBusy={Boolean(resolved) && (busy || dirty)}
        workingCreature={group?.association} promptText={renderPrompt} onPrompt={onPrompt} guided />
    </>
  );
}

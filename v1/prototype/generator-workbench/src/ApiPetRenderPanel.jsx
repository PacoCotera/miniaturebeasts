import React, { useEffect, useRef, useState } from "react";
import { Accordion, Alert, Badge, Button, Group, Paper, PasswordInput, Select, Text, TextInput, Title } from "@mantine/core";
import { proposalBindingKey, retainPetProposal, downloadProposalBlob } from "../retained-pet-proposals.mjs";
import { sourcePng, pngRequest } from "../source-png.mjs";

export async function renderingRequest(path, token, input, signal) {
  const response = await fetch(`${import.meta.env.BASE_URL}api/rendering/${path}`, {
    method: input === undefined ? "GET" : "POST", signal,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(input === undefined ? {} : { "Content-Type": "application/json" }) },
    ...(input === undefined ? {} : { body: JSON.stringify(input) }),
  });
  if (path.endsWith("/image") && response.ok) return response.blob();
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Rendering request unavailable");
  return result;
}

function belongsToWorkspace(candidate, binding, workingCreature) {
  if (workingCreature && candidate.workingCreature) return candidate.workingCreature.id === workingCreature.id &&
      candidate.workingCreature.originalGenomeId === workingCreature.originalGenomeId;
  if (proposalBindingKey(candidate.sourceBinding) === proposalBindingKey(binding)) return true;
  return !candidate.workingCreature && workingCreature?.sourceVersions.some((source) =>
    source.sourceRecordId === candidate.sourceBinding.sourceRecordId && source.inputDigest === candidate.sourceBinding.inputDigest);
}

function ServerRenderTile({ candidate, token, onPrompt }) {
  const [image, setImage] = useState(null);
  const [failure, setFailure] = useState("");
  const [details, setDetails] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    let url;
    setImage(null);
    setFailure("");
    if (candidate.state === "completed") renderingRequest(`jobs/${candidate.jobId}/image`, token, undefined, controller.signal).then(async (blob) => {
      const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
      const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
      if (hash !== candidate.output.sha256) throw new Error("Retained image hash differs");
      if (controller.signal.aborted) return;
      url = URL.createObjectURL(blob);
      setImage({ url, blob });
    }).catch((error) => { if (!controller.signal.aborted) setFailure(error.message); });
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url); };
  }, [candidate.jobId, candidate.state, token]);
  const prompt = candidate.promptText ?? candidate.sourceBinding.promptText;
  return <Paper withBorder p="sm" className={`render-detail${details ? " expanded" : ""}`}>
    {image && <img src={image.url} alt="Unaccepted API render candidate" style={{ display: "block", width: "100%", objectFit: "contain" }} />}
    <Text size="sm" mt="xs">{candidate.provider} · {candidate.state} · candidate</Text>
    <Text size="xs" c="dimmed">{candidate.sourceBinding.sourceVersion} · {candidate.workingCreature ? "Working mibi render" : "Earlier retained exact-source render"}</Text>
    <Button size="compact-xs" mt="xs" variant="light" onClick={() => setDetails(!details)}>{details ? "Hide details" : "Inspect this render"}</Button>
    {details && <>
      <Text size="xs" mt="xs">Original genome ID: {candidate.workingCreature?.originalGenomeId ?? candidate.sourceBinding.inputDigest}</Text>
      <Text size="xs">Actual genome/input: {candidate.sourceBinding.inputDigest}</Text>
      <Text size="xs">Source: {candidate.sourceBinding.sourceRecordId} · {candidate.jobId}</Text>
      <Text size="sm" mt="xs" style={{ whiteSpace: "pre-wrap" }}>{prompt}</Text>
      <Group mt="xs">
        {image && <Button size="compact-xs" variant="light" onClick={() => downloadProposalBlob(image.blob, `${candidate.jobId}.${candidate.output.mime === "image/png" ? "png" : candidate.output.mime === "image/jpeg" ? "jpg" : "webp"}`)}>Download image</Button>}
        <Button size="compact-xs" variant="light" onClick={() => downloadProposalBlob(new Blob([JSON.stringify(candidate, null, 2)], { type: "application/json" }), `${candidate.jobId}.json`)}>Download exact metadata</Button>
        {onPrompt && <Button size="compact-xs" variant="light" onClick={() => onPrompt(prompt)}>Edit this prompt</Button>}
      </Group>
    </>}
    {candidate.error && <Text size="xs" c="orange">{candidate.error}</Text>}
    {failure && <Text size="xs" c="orange">{failure}</Text>}
  </Paper>;
}

export default function ApiPetRenderPanel({ binding, referenceSvg, revision, onRetained, workingCreature = null,
  promptText, onPrompt, sourceDirty = false, onJobs, additionalTiles, additionalRenderCount = 0 }) {
  const sourceKey = `${revision}:${proposalBindingKey(binding)}`;
  const key = workingCreature ? `${workingCreature.id}:${workingCreature.originalGenomeId}` : sourceKey;
  const currentSourceKey = useRef(sourceKey);
  currentSourceKey.current = sourceKey;
  const currentKey = useRef(key);
  currentKey.current = key;
  const [config, setConfig] = useState(null);
  const [provider, setProvider] = useState("nanobanana");
  const [token, setToken] = useState("");
  const [job, setJob] = useState(null);
  const [jobId, setJobId] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [submission, setSubmission] = useState(null);
  const [foundJobs, setFoundJobs] = useState({ key: "", jobs: [] });
  const operation = useRef(null);
  const retainedIds = useRef(new Set());
  const selected = config?.providers.find((item) => item.id === provider);
  const matching = job && proposalBindingKey(job.sourceBinding) === proposalBindingKey(binding);
  const submittedText = promptText ?? binding?.promptText ?? "";
  const promptValid = submittedText.trim() && new TextEncoder().encode(submittedText).length <= 4096;
  const matchingJobs = foundJobs.key === key ? foundJobs.jobs : [];
  const jobsCallback = useRef(onJobs);
  jobsCallback.current = onJobs;

  useEffect(() => {
    jobsCallback.current?.(foundJobs.key === key ? foundJobs.jobs.map((entry) => entry.jobId) : []);
  }, [key, foundJobs]);

  useEffect(() => {
    const controller = new AbortController();
    renderingRequest("config", "", undefined, controller.signal).then(setConfig).catch((error) => {
      if (!controller.signal.aborted) setNotice(error.message);
    });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    operation.current?.abort();
    setBusy(false);
    setJob(null);
    setJobId("");
    setNotice("");
    return () => operation.current?.abort();
  }, [key]);
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    let timer;
    async function refreshGallery() {
      try {
        const retained = await renderingRequest("jobs", token, undefined, controller.signal);
        if (controller.signal.aborted || currentKey.current !== key) return;
        const matches = retained.jobs.filter((candidate) => belongsToWorkspace(candidate, binding, workingCreature));
        setFoundJobs({ key, jobs: matches });
        if (matches.some((candidate) => ["pending", "running"].includes(candidate.state))) timer = setTimeout(refreshGallery, 3000);
      } catch (error) { if (!controller.signal.aborted) setNotice(error.message); }
    }
    void refreshGallery();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [key, sourceKey, token, job?.jobId, job?.state]);

  async function recoverCandidate(candidate, controller, startKey) {
    if (!belongsToWorkspace(candidate, binding, workingCreature)) {
      setNotice("This job belongs to another working mibi or exact source; its original binding was preserved.");
      return;
    }
    if (candidate.state !== "completed" || retainedIds.current.has(candidate.jobId)) return;
    const blob = await renderingRequest(`jobs/${candidate.jobId}/image`, token, undefined, controller.signal);
    const hash = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
    const actualHash = Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
    if (actualHash !== candidate.output.sha256) throw new Error("Recovered image digest differs");
    if (controller.signal.aborted || currentKey.current !== startKey) return;
    const entry = await retainPetProposal(blob, candidate.sourceBinding, `${candidate.provider}: ${candidate.model}`.slice(0, 80),
      controller.signal, candidate);
    if (controller.signal.aborted || currentKey.current !== startKey) return;
    retainedIds.current.add(candidate.jobId);
    onRetained(entry);
    setNotice("API candidate retained with exact source, prompt and job provenance. Art fidelity remains unaccepted.");
  }

  async function follow(initial, controller, startKey) {
    let candidate = initial;
    setJobId(candidate.jobId);
    while (!controller.signal.aborted && currentKey.current === startKey) {
      setJob(candidate);
      if (!["pending", "running"].includes(candidate.state)) {
        if (candidate.state === "completed") await recoverCandidate(candidate, controller, startKey);
        else setNotice(candidate.error || "Rendering stopped; no automatic retry.");
        return;
      }
      await new Promise((resolve) => {
        const finish = () => { clearTimeout(timer); controller.signal.removeEventListener("abort", finish); resolve(); };
        const timer = setTimeout(finish, 2000);
        controller.signal.addEventListener("abort", finish, { once: true });
      });
      if (!controller.signal.aborted) candidate = await renderingRequest(`jobs/${candidate.jobId}`, token, undefined, controller.signal);
    }
  }

  async function perform(action) {
    if (busy) return;
    const startKey = key;
    const controller = new AbortController();
    operation.current = controller;
    setBusy(true);
    setNotice("");
    try { await action(controller, startKey); }
    catch (error) {
      if (!controller.signal.aborted && currentKey.current === startKey) setNotice(error.message);
    } finally {
      if (operation.current === controller) operation.current = null;
      if (currentKey.current === startKey) setBusy(false);
    }
  }
  async function render(controller, startKey) {
    if (sourceDirty || !binding || !referenceSvg || !selected?.available || !promptValid) throw new Error("Refreshed source, valid prompt and configured provider required");
    if (workingCreature?.sourceVersions.length > 64) throw new Error("Working mibi reached its64-source association limit; source remains usable but grouped rendering is unavailable");
    const originalSourceKey = currentSourceKey.current;
    const image = await pngRequest(await sourcePng(referenceSvg, controller.signal));
    if (controller.signal.aborted || currentKey.current !== startKey || currentSourceKey.current !== originalSourceKey) return;
    setJob(null);
    setJobId("");
    const payload = { schemaVersion: workingCreature ? "render-request/2" : "render-request/1", requestId: crypto.randomUUID(), provider,
      replay: binding.sourceReplayEnvelope, expectedBinding: binding, sourcePng: image,
      ...(workingCreature ? { promptText: submittedText, workingCreature } : {}) };
    setSubmission({ key: startKey, payload });
    setNotice(`Submission ${payload.requestId}; keep the returned job ID for explicit recovery.`);
    const created = await renderingRequest("jobs", token, payload, controller.signal);
    await follow(created, controller, startKey);
  }

  return (
    <Paper withBorder p="sm" mt="sm">
      <Group justify="space-between"><Title order={4}>Render mibi</Title><Badge color="orange">Candidate only</Badge></Group>
      <Text size="sm" c="dimmed" mt="xs">Sends the refreshed512px structure and your exact render prompt. Each render is an explicit paid provider request; no automatic retry, fallback or refinement.</Text>
      <Select label="Provider" mt="sm" value={provider} disabled={busy}
        data={[{ value: "nanobanana", label: "NanoBanana (Google)" }, { value: "openai", label: "OpenAI Images" }]}
        onChange={(value) => { if (value) setProvider(value); }} />
      <Text size="xs" mt="xs">Model: {selected?.model || "Loading configuration…"} · {selected?.available ? "configured" : selected?.reason || "unavailable"}</Text>
      <PasswordInput label="Rendering operator token" mt="sm" value={token} autoComplete="off" disabled={busy}
        onChange={(event) => setToken(event.currentTarget.value)} description="Kept in this component only; this is not a provider API key." />
      <Group mt="sm">
        <Button size="xs" disabled={busy || sourceDirty || !promptValid || !binding || !referenceSvg || !token || !selected?.available ||
          (submission?.key === key && (!job || ["pending", "running"].includes(job.state)))} onClick={() => perform(render)}>{busy ? "Rendering…" : matchingJobs.some((entry) => entry.state === "completed") ? "Render another version" : "Render mibi"}</Button>
        {submission?.key === key && !job && <Button size="xs" variant="light" disabled={busy || !token}
          onClick={() => perform(async (controller, startKey) => follow(await renderingRequest("jobs", token, submission.payload, controller.signal), controller, startKey))}>Recover submission</Button>}
        {busy && <Button size="xs" variant="subtle" onClick={() => {
          operation.current?.abort(); setBusy(false);
          setNotice("Stopped waiting in this browser. The server job continues; recover it explicitly without another provider request.");
        }}>Stop waiting</Button>}
      </Group>
      {sourceDirty && <Text size="sm" c="orange" mt="xs">Changes pending: refresh the structure before rendering. Earlier renders remain visible.</Text>}
      {!promptValid && <Text size="xs" c="orange">Enter a nonempty prompt of at most4096 UTF-8 bytes.</Text>}
      {submission?.key === key && <Text size="xs" c="dimmed" mt="xs">Request ID: {submission.payload.requestId}</Text>}
      <Accordion mt="sm"><Accordion.Item value="recovery"><Accordion.Control>Advanced recovery</Accordion.Control><Accordion.Panel>
      <TextInput label="Known server job ID" value={jobId} mt="sm" disabled={busy}
        onChange={(event) => setJobId(event.currentTarget.value)} />
      <Button size="xs" variant="light" mt="xs" disabled={busy || !token || !jobId.trim()}
        onClick={() => perform(async (controller, startKey) => follow(await renderingRequest("recovery", token, { jobId: jobId.trim() }, controller.signal), controller, startKey))}>Recover known job</Button>
      <Button size="xs" variant="light" mt="xs" ml="xs" disabled={busy || !token || !binding}
        onClick={() => perform(async (controller, startKey) => {
          const retained = await renderingRequest("jobs", token, undefined, controller.signal);
          if (controller.signal.aborted || currentKey.current !== startKey) return;
          const matches = retained.jobs.filter((candidate) => belongsToWorkspace(candidate, binding, workingCreature));
          setFoundJobs({ key: startKey, jobs: matches });
          setNotice(matches.length ? `Found ${matches.length} retained job(s) for this working mibi or exact source.` : "No retained jobs match this working mibi or exact source.");
        })}>Find retained jobs for this mibi</Button>
      {foundJobs.key === key && foundJobs.jobs.map((candidate) => (
        <Group mt="xs" key={candidate.jobId}>
          <Text size="xs">{candidate.provider} · {candidate.state} · {candidate.jobId}</Text>
          <Button size="compact-xs" variant="subtle" disabled={busy || !token}
            onClick={() => perform(async (controller, startKey) => follow(await renderingRequest(`jobs/${candidate.jobId}`, token, undefined, controller.signal), controller, startKey))}>Recover this job</Button>
        </Group>
      ))}
      <Text size="xs" c="dimmed" mt="sm">Up to eight durable server jobs and eight separate browser proposals; capacity rejects without eviction. Browser retention failure leaves the completed server image recoverable.</Text>
      </Accordion.Panel></Accordion.Item></Accordion>
      {job && <Text size="sm" mt="sm">Job {job.jobId}: {job.state}. {matching ? "Bound to this source." : belongsToWorkspace(job, binding, workingCreature) ? "Earlier structure in this working mibi; original source preserved." : "Different source or working mibi; candidate cannot attach here."}</Text>}
      {notice && <Alert mt="sm">{notice}</Alert>}
      <Title order={4} mt="lg">Renders of this mibi · {matchingJobs.filter((entry) => entry.state === "completed").length + additionalRenderCount} images</Title>
      {!matchingJobs.length && !additionalRenderCount && <Text size="sm" mt="xs">No renders yet. Refresh the structure, then render a mibi. Enter the operator token to view retained renders.</Text>}
      <div className="render-gallery" style={{ marginTop: 12 }}>
        {matchingJobs.map((candidate) => <ServerRenderTile key={candidate.jobId} candidate={candidate} token={token} onPrompt={onPrompt} />)}
        {additionalTiles}
      </div>
    </Paper>
  );
}

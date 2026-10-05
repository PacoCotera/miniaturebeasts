import { access, mkdir, open, readdir, readFile, rename, rm } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve, join } from "node:path";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { digest } from "./authoring-adapter.mjs";
import { imageLedPetHandoff, isResolvedAuthoringPacket, sceneReplayEnvelope } from "./authoring-ui.mjs";
import { proposalSourceBinding } from "./retained-pet-proposals.mjs";
import { imageBytes, providerSettings, providerTransports, renderProvider, providerFailureMessages, sha256 } from "./render-provider.mjs";

const jobIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const now = () => new Date().toISOString();
const failure = (message, status = 422) => Object.assign(new Error(message), { status });
function closed(value, keys) {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).some((key) => !keys.includes(key))) {
    throw failure("Unsupported rendering request fields");
  }
}
async function durableFile(filename, bytes) {
  const temporary = `${filename}.${randomUUID()}.tmp`;
  const file = await open(temporary, "wx", 0o600);
  try { await file.writeFile(bytes); await file.sync(); } finally { await file.close(); }
  await rename(temporary, filename);
  const directory = await open(resolve(filename, ".."), "r");
  try { await directory.sync(); } finally { await directory.close(); }
}

export function createRenderJobs(replay, environment = process.env) {
  const providers = providerSettings(environment);
  const token = environment.CRITTER_RENDER_TOKEN || "";
  const store = environment.CRITTER_RENDER_STORE ? resolve(environment.CRITTER_RENDER_STORE) : null;
  const jobs = new Map();
  let active = false, writable = false;
  const ready = (async () => {
    if (!store || !token) return;
    await mkdir(store, { recursive: true, mode: 0o700 });
    await access(store, constants.R_OK | constants.W_OK);
    for (const id of await readdir(store)) {
      if (!jobIdPattern.test(id)) continue;
      const job = JSON.parse(await readFile(join(store, id, "job.json"), "utf8"));
      if (job.jobId !== id || !["render-job/1", "render-job/2"].includes(job.schemaVersion)) throw new Error("Render store identity is invalid");
      if (["pending", "running"].includes(job.state)) {
        job.state = "interrupted";
        job.updatedAt = now();
        job.error = "Server restarted; provider outcome is uncertain and may have incurred a charge. No automatic retry.";
        await durableFile(join(store, id, "job.json"), JSON.stringify(job));
      }
      jobs.set(id, job);
    }
    writable = true;
  })().catch(() => { writable = false; });

  async function config() {
    await ready;
    return { schemaVersion: "render-config/1", preferredProvider: "nanobanana", capacity: 8,
      providers: Object.entries(providers).map(([id, settings]) => ({ id, model: settings.model,
        available: Boolean(token && writable && settings.key),
        reason: !token ? "Operator token is not configured" : !writable ? "Writable render store is not configured" :
          !settings.key ? "Provider key is not configured" : null })) };
  }
  async function authorize(header) {
    await ready;
    const supplied = typeof header === "string" && header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!token || !timingSafeEqual(Buffer.from(sha256(supplied), "hex"), Buffer.from(sha256(token), "hex"))) {
      throw failure("Rendering operator authorization required", 401);
    }
    if (!writable) throw failure("Rendering store unavailable", 503);
  }
  async function persist(job) {
    await durableFile(join(store, job.jobId, "job.json"), JSON.stringify(job));
  }
  async function dispatch(job, png) {
    try {
      job.state = "running";
      job.updatedAt = now();
      await persist(job);
      const result = await renderProvider(job.provider, providers[job.provider], png,
        job.schemaVersion === "render-job/2" ? job.promptText : job.sourceBinding.promptText);
      await durableFile(join(store, job.jobId, "output.image"), result.bytes);
      const { bytes, ...provenance } = result;
      const completed = { ...job, output: { ...provenance, bytes: bytes.length }, state: "completed", updatedAt: now() };
      await persist(completed);
      Object.assign(job, completed);
    } catch (error) {
      job.state = "failed";
      job.updatedAt = now();
      const status = Number.isInteger(error.providerHttpStatus) && error.providerHttpStatus >= 100 && error.providerHttpStatus <= 599 ? error.providerHttpStatus : null;
      const reason = Object.hasOwn(providerFailureMessages, error.providerFailureReason) ? error.providerFailureReason : null;
      job.providerHttpStatus = status;
      job.providerFailureReason = reason;
      job.providerErrorStatus = error.providerErrorStatus ?? null;
      job.providerErrorCode = error.providerErrorCode ?? null;
      job.providerErrorReason = error.providerErrorReason ?? null;
      job.error = reason === "HTTP_ERROR" && status ? `Provider returned HTTP${status}; no automatic retry. A charge may have occurred.` :
        reason ? `${providerFailureMessages[reason]}${status ? ` (HTTP${status})` : ""}; no automatic retry. A charge may have occurred.` :
        "Rendering failed or timed out; provider outcome may have incurred a charge. No automatic retry.";
      job.providerRequestId = error.providerRequestId ?? null;
      try { await persist(job); } catch { /* Durable running state becomes interrupted at next restart. */ }
    } finally { active = false; }
  }
  async function createRequest(input) {
    const guided = input?.schemaVersion === "render-request/2";
    closed(input, ["schemaVersion", "requestId", "provider", "replay", "expectedBinding", "sourcePng",
      ...(guided ? ["promptText", "workingCreature"] : [])]);
    closed(input.sourcePng, ["base64", "sha256"]);
    if (!["render-request/1", "render-request/2"].includes(input.schemaVersion) || !jobIdPattern.test(input.requestId) || !Object.hasOwn(providers, input.provider)) {
      throw failure("Unsupported rendering request identity");
    }
    const requestDigest = digest(input);
    const existing = [...jobs.values()].find((job) => job.requestId === input.requestId);
    if (existing) {
      if (existing.requestDigest !== requestDigest) throw failure("Request ID already binds different rendering input", 409);
      return existing;
    }
    if (!providers[input.provider].key) throw failure("Selected provider is unavailable", 503);
    if (active) throw failure("One provider request is already active; recover its job instead", 409);
    if (jobs.size >= 8) throw failure("Eight rendering jobs retained; no job was removed", 409);
    if (Buffer.byteLength(JSON.stringify(input.replay), "utf8") > 65536) throw failure("Source replay exceeds64KiB", 413);
    const packet = replay(input.replay);
    if (!isResolvedAuthoringPacket(packet)) throw failure("Source replay or expected digests could not be verified");
    const handoff = imageLedPetHandoff(packet);
    if (handoff.status !== "ready") throw failure("Verified source prompt is unavailable");
    const binding = proposalSourceBinding(packet, handoff.text, sceneReplayEnvelope(packet));
    if (digest(binding) !== digest(input.expectedBinding)) throw failure("Current source and rendering binding differ", 409);
    if (guided) {
      if (typeof input.promptText !== "string" || !input.promptText.trim() || Buffer.byteLength(input.promptText, "utf8") > 4096) {
        throw failure("Render prompt must be nonempty and at most4096 UTF-8 bytes");
      }
      const group = input.workingCreature;
      closed(group, ["schemaVersion", "id", "originalGenomeId", "sourceVersions"]);
      if (group.schemaVersion !== "working-creature-association/1" || !jobIdPattern.test(group.id) ||
          !/^[0-9a-f]{64}$/.test(group.originalGenomeId) || !Array.isArray(group.sourceVersions) ||
          !group.sourceVersions.length || group.sourceVersions.length > 64) throw failure("Invalid user-authoring association");
      const known = new Map();
      for (const source of group.sourceVersions) {
        closed(source, ["sourceRecordId", "inputDigest"]);
        if (typeof source.sourceRecordId !== "string" || source.sourceRecordId.length > 128 ||
            !/^[0-9a-f]{64}$/.test(source.inputDigest) ||
            (known.has(source.sourceRecordId) && known.get(source.sourceRecordId) !== source.inputDigest)) throw failure("Invalid association source reference");
        known.set(source.sourceRecordId, source.inputDigest);
      }
      if (!group.sourceVersions.some((source) => source.inputDigest === group.originalGenomeId) ||
          known.get(binding.sourceRecordId) !== binding.inputDigest) throw failure("Association must name its original input and this exact source");
    }
    const png = imageBytes(input.sourcePng.base64, "image/png", 1024 * 1024);
    if (png.length < 24 || png.toString("ascii", 12, 16) !== "IHDR" ||
        png.readUInt32BE(16) !== 512 || png.readUInt32BE(20) !== 512 || sha256(png) !== input.sourcePng.sha256) {
      throw failure("Source must be a hashed512×512 PNG");
    }
    active = true;
    const job = { schemaVersion: guided ? "render-job/2" : "render-job/1", status: "proposal", jobId: randomUUID(), requestId: input.requestId,
      requestDigest, provider: input.provider, model: providers[input.provider].model, state: "pending",
      providerTransport: providerTransports[input.provider],
      createdAt: now(), updatedAt: now(), sourceBinding: binding,
      sourceSvgSha256: sha256(handoff.referenceSvg), sourcePngSha256: sha256(png), sourcePngBytes: png.length,
      sourcePngVerification: "client-rendered; hash and dimensions checked, pixel equivalence to verified SVG not established",
      promptSha256: sha256(guided ? input.promptText : handoff.text), output: null,
      ...(guided ? { derivedPromptText: handoff.text, derivedPromptSha256: sha256(handoff.text),
        promptText: input.promptText, workingCreature: structuredClone(input.workingCreature),
        associationAuthority: "user-authoring grouping; not verified ancestry or genome identity" } : {}) };
    try {
      await mkdir(join(store, job.jobId), { mode: 0o700 });
      await durableFile(join(store, job.jobId, "source.png"), png);
      await persist(job);
      jobs.set(job.jobId, job);
    } catch {
      active = false;
      await rm(join(store, job.jobId), { recursive: true, force: true }).catch(() => {});
      throw failure("Rendering input could not be durably retained; provider was not called", 503);
    }
    // Start only after the durable input exists. No retries or provider fallback.
    setImmediate(() => { void dispatch(job, png); });
    return job;
  }
  function get(id) {
    if (!jobIdPattern.test(id) || !jobs.has(id)) throw failure("Rendering job not found", 404);
    return structuredClone(jobs.get(id));
  }
  function list() {
    return [...jobs.values()].slice(0, 8).map((job) => get(job.jobId));
  }
  async function image(id) {
    const job = get(id);
    if (job.state !== "completed") throw failure("Rendering image is not completed", 409);
    const bytes = await readFile(join(store, id, "output.image"));
    if (bytes.length > 4 * 1024 * 1024 || sha256(bytes) !== job.output.sha256) throw failure("Retained image digest differs", 503);
    return { bytes, mime: job.output.mime };
  }
  // Serialize only admission/persistence so simultaneous identical submissions
  // see the same durable job. Provider execution remains a single active slot.
  let admission = Promise.resolve();
  function create(input) {
    const pending = admission.then(() => createRequest(input));
    admission = pending.catch(() => {});
    return pending;
  }
  return { config, authorize, create, get, list, image };
}

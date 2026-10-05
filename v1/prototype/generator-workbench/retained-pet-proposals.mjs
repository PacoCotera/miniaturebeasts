// Browser-only returned art. This separate store never changes genome records.
const DATABASE_NAME = "critter-returned-pet-proposals-v1";
const STORE_NAME = "proposalBlobs";
const MAX_PROPOSALS = 8;
const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function assertActive(signal) {
  if (signal?.aborted) throw new DOMException("Source changed or operation cancelled.", "AbortError");
}

async function sha256(bytes) {
  if (!globalThis.crypto?.subtle) throw new Error("Secure browser hashing is unavailable.");
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function proposalSourceBinding(packet, promptText, replayEnvelope) {
  const foundation = packet?.informationStages?.foundation?.reference;
  if (!packet?.recordId || !packet.inputDigest || !packet.resultDigest || !packet.sceneDigest ||
      !foundation || !promptText || !replayEnvelope) {
    throw new Error("A resolved source with its exact foundation and prompt is required.");
  }
  return structuredClone({
    sourceRecordId: packet.recordId,
    inputDigest: packet.inputDigest,
    resultDigest: packet.resultDigest,
    sceneDigest: packet.sceneDigest,
    schemaVersion: packet.schemaVersion,
    ruleVersion: packet.ruleVersion,
    sourceVersion: packet.sceneProjectionVersion,
    materialVersion: packet.materialProfileVersion,
    referenceVersion: packet.reference?.profileVersion,
    foundation,
    promptText,
    sourceReplayEnvelope: replayEnvelope,
  });
}

export function proposalBindingKey(binding) {
  return binding ? canonical(binding) : "";
}

function openDatabase() {
  if (!globalThis.indexedDB) return Promise.reject(new Error("Browser proposal storage is unavailable."));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME, { keyPath: "proposalId" });
    request.onerror = () => reject(new Error("Cannot open browser proposal storage."));
    request.onblocked = () => reject(new Error("Proposal storage is blocked by another open tab."));
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => database.close();
      resolve(database);
    };
  });
}

export async function readPetProposals(binding, signal, workingCreature = null) {
  assertActive(signal);
  const database = await openDatabase();
  try {
    assertActive(signal);
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).getAll();
      const cancel = () => transaction.abort();
      signal?.addEventListener("abort", cancel, { once: true });
      transaction.oncomplete = () => {
        signal?.removeEventListener("abort", cancel);
        const key = proposalBindingKey(binding);
        resolve(request.result.filter((entry) => {
          const association = entry.metadata.workingCreature;
          if (association && workingCreature) return association.id === workingCreature.id &&
            association.originalGenomeId === workingCreature.originalGenomeId;
          if (entry.bindingKey === key) return true;
          if (!workingCreature) return false;
          // Earlier literal metadata is shown only by a known exact-source reference.
          return workingCreature.sourceVersions.some((source) =>
            source.sourceRecordId === entry.metadata.sourceBinding.sourceRecordId &&
            source.inputDigest === entry.metadata.sourceBinding.inputDigest);
        }));
      };
      transaction.onabort = transaction.onerror = () => {
        signal?.removeEventListener("abort", cancel);
        reject(signal?.aborted ? new DOMException("Cancelled", "AbortError") : new Error("Cannot read retained proposals."));
      };
    });
  } finally {
    database.close();
  }
}

export async function retainPetProposal(file, binding, providerLabel, signal, apiProvenance = null, workingCreature = null) {
  assertActive(signal);
  if (!(file instanceof Blob) || !ALLOWED_MIME.has(file.type) || !file.size || file.size > MAX_BYTES) {
    throw new Error("Choose a PNG, JPEG or WebP bitmap of at most4MiB.");
  }
  const imageBytes = await file.arrayBuffer();
  const signature = new Uint8Array(imageBytes, 0, Math.min(imageBytes.byteLength, 12));
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => signature[index] === byte);
  const jpeg = signature[0] === 255 && signature[1] === 216 && signature[2] === 255;
  const webp = new TextDecoder().decode(signature.slice(0, 4)) === "RIFF" &&
    new TextDecoder().decode(signature.slice(8, 12)) === "WEBP";
  if (!({ "image/png": png, "image/jpeg": jpeg, "image/webp": webp }[file.type])) {
    throw new Error("Bitmap bytes do not match the declared PNG, JPEG or WebP format.");
  }
  assertActive(signal);
  const label = providerLabel.trim();
  if (!label || label.length > 80) throw new Error("Enter a provider label of1–80 characters.");
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("This file could not be decoded as a bitmap.");
  }
  const { width, height } = bitmap;
  bitmap.close();
  if (!width || !height || Math.max(width, height) > 4096 || width * height > 16000000) {
    throw new Error("Decoded image must fit4096px on its long side and16million pixels.");
  }
  assertActive(signal);
  const imageSha256 = await sha256(imageBytes);
  const submittedPrompt = apiProvenance?.schemaVersion === "render-job/2" ? apiProvenance.promptText : binding.promptText;
  const promptSha256 = await sha256(new TextEncoder().encode(submittedPrompt));
  const proposalId = `pet-proposal-${await sha256(new TextEncoder().encode(canonical({
    binding, promptSha256, imageSha256,
    ...(apiProvenance ? { apiProvenance } : {}),
    ...(!apiProvenance && workingCreature ? { workingCreature } : {}),
  })))}`;
  assertActive(signal);
  const metadata = {
    schemaVersion: "retained-pet-proposal/1",
    proposalId,
    status: "proposal",
    sourceBinding: structuredClone(binding),
    promptSha256,
    image: { sha256: imageSha256, width, height, mime: file.type, bytes: file.size },
    providerLabel: label,
    ...(apiProvenance ? { apiProvenance: structuredClone(apiProvenance) } : {}),
    ...((apiProvenance?.workingCreature ?? workingCreature) ? {
      workingCreature: structuredClone(apiProvenance?.workingCreature ?? workingCreature),
      associationAuthority: "user-authoring grouping; not verified ancestry",
    } : {}),
  };
  const entry = { proposalId, bindingKey: proposalBindingKey(binding), metadata, imageBlob: file.slice(0, file.size, file.type) };
  const database = await openDatabase();
  try {
    assertActive(signal);
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      let retained = entry;
      let failure = "Proposal storage failed or its quota is unavailable.";
      const cancel = () => transaction.abort();
      signal?.addEventListener("abort", cancel, { once: true });
      const existing = store.get(proposalId);
      existing.onsuccess = () => {
        if (signal?.aborted) return transaction.abort();
        if (existing.result) {
          retained = existing.result;
          return;
        }
        const count = store.count();
        count.onsuccess = () => {
          if (signal?.aborted) return transaction.abort();
          if (count.result >= MAX_PROPOSALS) {
            failure = "Eight pet proposals are already retained. No existing proposal was removed.";
            transaction.abort();
          } else store.add(entry);
        };
      };
      transaction.oncomplete = () => {
        signal?.removeEventListener("abort", cancel);
        resolve(retained);
      };
      transaction.onabort = transaction.onerror = () => {
        signal?.removeEventListener("abort", cancel);
        reject(signal?.aborted ? new DOMException("Cancelled", "AbortError") : new Error(failure));
      };
    });
  } finally {
    database.close();
  }
}

export function downloadProposalBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // Keep the URL alive while the browser starts the native download.
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

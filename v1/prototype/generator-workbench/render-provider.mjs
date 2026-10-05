import { createHash } from "node:crypto";

export const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const maximumOutputBytes = 4 * 1024 * 1024;

export const providerTransports = Object.freeze({
  nanobanana: "google-generate-content/1",
  openai: "openai-image-edits/1",
});

export const providerFailureMessages = Object.freeze({
  HTTP_ERROR: "Provider rejected the request",
  NO_IMAGE: "Provider response contained no image",
  INVALID_IMAGE: "Provider response contained an invalid or out-of-bounds bitmap",
  INVALID_RESPONSE: "Provider response was not valid JSON",
  RESPONSE_READ_FAILED: "Provider response could not be read",
  RESPONSE_LIMIT: "Provider response exceeded its byte limit",
  METADATA_LIMIT: "Provider usage metadata exceeded its byte limit",
});
const errorStatuses = new Set([
  "CANCELLED", "UNKNOWN", "INVALID_ARGUMENT", "DEADLINE_EXCEEDED", "NOT_FOUND",
  "ALREADY_EXISTS", "PERMISSION_DENIED", "RESOURCE_EXHAUSTED", "FAILED_PRECONDITION",
  "ABORTED", "OUT_OF_RANGE", "UNIMPLEMENTED", "INTERNAL", "UNAVAILABLE", "DATA_LOSS", "UNAUTHENTICATED",
  "invalid_request_error", "authentication_error", "permission_error", "rate_limit_error", "server_error", "api_error",
]);
const errorCodes = new Set([
  "invalid_api_key", "insufficient_quota", "model_not_found", "unsupported_parameter", "invalid_value",
  "rate_limit_exceeded", "billing_hard_limit_reached", "account_deactivated", "organization_deactivated",
  "content_policy_violation", "moderation_blocked", "invalid_image", "invalid_image_format", "invalid_prompt",
]);
const errorReasons = new Set([
  "API_KEY_INVALID", "API_KEY_EXPIRED", "API_KEY_NOT_FOUND", "API_KEY_SERVICE_BLOCKED",
  "API_KEY_HTTP_REFERRER_BLOCKED", "API_KEY_IP_ADDRESS_BLOCKED", "API_KEY_ANDROID_APP_BLOCKED", "API_KEY_IOS_APP_BLOCKED",
  "ACCESS_TOKEN_EXPIRED", "ACCESS_TOKEN_SCOPE_INSUFFICIENT", "CREDENTIALS_MISSING",
  "SERVICE_DISABLED", "BILLING_DISABLED", "CONSUMER_INVALID", "CONSUMER_SUSPENDED",
  "RATE_LIMIT_EXCEEDED", "USER_PROJECT_DENIED", "SECURITY_POLICY_VIOLATED", "IAM_PERMISSION_DENIED",
]);

function allowedToken(value, allowed) {
  return typeof value === "string" && value.length <= 80 && /^[A-Za-z][A-Za-z0-9_]*$/.test(value) && allowed.has(value) ? value : null;
}

function safeErrorDetails(result) {
  const error = result?.error;
  const info = Array.isArray(error?.details) ? error.details.slice(0, 16).find((detail) =>
    detail?.["@type"] === "type.googleapis.com/google.rpc.ErrorInfo") : null;
  return {
    providerErrorStatus: allowedToken(error?.status, errorStatuses) ?? allowedToken(error?.type, errorStatuses),
    providerErrorCode: Number.isSafeInteger(error?.code) && error.code >= 0 && error.code <= 999999 ?
      error.code : allowedToken(error?.code, errorCodes),
    providerErrorReason: allowedToken(info?.reason, errorReasons),
  };
}

function controlledFailure(reason, response, requestId, details = {}) {
  return Object.assign(new Error(providerFailureMessages[reason]), {
    providerFailureReason: reason, providerHttpStatus: response.status, providerRequestId: requestId, ...details,
  });
}

export function providerSettings(environment) {
  return {
    nanobanana: { model: environment.CRITTER_NANOBANANA_MODEL || "gemini-3.1-flash-image",
      key: environment.GEMINI_API_KEY || environment.GOOGLE_API_KEY || "" },
    openai: { model: environment.CRITTER_OPENAI_IMAGE_MODEL || "gpt-image-2.5-sunburst",
      key: environment.OPENAI_API_KEY || "" },
  };
}

export function imageBytes(base64, mime, maximum = maximumOutputBytes) {
  if (typeof base64 !== "string" || !base64.length || base64.length > Math.ceil(maximum / 3) * 4 ||
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64)) {
    throw new Error("Provider image is missing or exceeds the bounded image limit");
  }
  const bytes = Buffer.from(base64, "base64");
  const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp = bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  if (!bytes.length || bytes.length > maximum || !({ "image/png": png, "image/jpeg": jpeg, "image/webp": webp }[mime])) {
    throw new Error("Provider image bytes do not match a supported bounded bitmap");
  }
  return bytes;
}

async function boundedJson(response, maximum = 7 * 1024 * 1024) {
  // Base64 output plus finite provider metadata; never retain raw error bodies.
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.byteLength;
    if (size > maximum) throw Object.assign(new Error("Provider response exceeds the bounded response limit"), { providerFailureReason: "RESPONSE_LIMIT" });
    chunks.push(Buffer.from(chunk));
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw Object.assign(new Error("Provider response was not valid JSON"), { providerFailureReason: "INVALID_RESPONSE" }); }
}

export async function renderProvider(provider, settings, sourcePng, prompt) {
  let endpoint, headers, body;
  if (provider === "nanobanana") {
    if (typeof settings.model !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(settings.model)) {
      throw new Error("Google model must be a bounded model identifier");
    }
    endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(settings.model)}:generateContent`;
    headers = { "x-goog-api-key": settings.key, "Content-Type": "application/json" };
    body = JSON.stringify({
      store: false,
      contents: [{
        role: "user",
        parts: [{ text: prompt }, { inlineData: { mimeType: "image/png", data: sourcePng.toString("base64") } }],
      }],
      generationConfig: { responseModalities: ["IMAGE"] },
    });
  } else if (provider === "openai") {
    endpoint = "https://api.openai.com/v1/images/edits";
    headers = { Authorization: `Bearer ${settings.key}` };
    body = new FormData();
    body.set("model", settings.model);
    body.append("image[]", new Blob([sourcePng], { type: "image/png" }), "source.png");
    body.set("prompt", prompt);
    body.set("n", "1");
    body.set("output_format", "png");
  } else throw new Error("Unsupported provider");
  const response = await fetch(endpoint, { method: "POST", headers, body,
    signal: AbortSignal.timeout(180000), redirect: "error" });
  const requestId = response.headers.get("x-request-id") || response.headers.get("x-goog-request-id") || null;
  if (!response.ok) {
    let details = {};
    try { details = safeErrorDetails(await boundedJson(response, 65536)); }
    catch { await response.body?.cancel().catch(() => {}); }
    // Never retain provider messages, arbitrary fields, metadata or the raw body.
    throw controlledFailure("HTTP_ERROR", response, requestId, details);
  }
  let result;
  try { result = await boundedJson(response); }
  catch (error) {
    const reason = Object.hasOwn(providerFailureMessages, error.providerFailureReason) ? error.providerFailureReason : "RESPONSE_READ_FAILED";
    throw controlledFailure(reason, response, requestId);
  }
  let base64, mime, revisedPrompt = null;
  if (provider === "openai") {
    base64 = result?.data?.[0]?.b64_json;
    mime = "image/png";
    revisedPrompt = typeof result?.data?.[0]?.revised_prompt === "string" ? result.data[0].revised_prompt.slice(0, 20000) : null;
  } else {
    const images = (Array.isArray(result?.candidates) ? result.candidates : [])
      .flatMap((candidate) => Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [])
      .filter((part) => part?.thought !== true && typeof part?.inlineData?.mimeType === "string" &&
        part.inlineData.mimeType.startsWith("image/"));
    const image = images.at(-1);
    base64 = image?.inlineData?.data;
    mime = image?.inlineData?.mimeType;
  }
  if (typeof base64 !== "string" || !base64.length) throw controlledFailure("NO_IMAGE", response, requestId);
  let bytes;
  try { bytes = imageBytes(base64, mime); }
  catch { throw controlledFailure("INVALID_IMAGE", response, requestId); }
  if (provider === "nanobanana") {
    const usageMetadata = result?.usageMetadata ?? null;
    const responseId = result?.responseId ?? null;
    if (Buffer.byteLength(JSON.stringify(usageMetadata), "utf8") > 32768 ||
        (responseId !== null && (typeof responseId !== "string" || responseId.length > 256))) {
      throw controlledFailure("METADATA_LIMIT", response, requestId);
    }
    return { bytes, mime, sha256: sha256(bytes), providerRequestId: requestId, responseId, usageMetadata };
  }
  const usage = result?.usage ?? null;
  if (JSON.stringify(usage).length > 32768) throw controlledFailure("METADATA_LIMIT", response, requestId);
  return { bytes, mime, sha256: sha256(bytes), providerRequestId: requestId,
    interactionId: typeof result.id === "string" ? result.id.slice(0, 256) : null,
    usage, revisedPrompt };
}

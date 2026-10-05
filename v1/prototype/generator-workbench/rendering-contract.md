# Rendering and retained-image contract

The authoring workbench sends an explicitly submitted source image and prompt to a configured image provider, then retains the returned bitmap with its original genome/source binding. Rendering does not mutate inheritance or establish phenotype fidelity. The [workbench journey](README.md) owns editing and comparison; [the art handoff](art-template.md) owns what the source and portrayal mean.

The explicit **Render creature** panel offers NanoBanana (Google) first and
OpenAI Images separately. It displays the server-selected model and availability
before **Render creature**. Supply the rendering operator token in the password field;
it stays in component memory, never browser storage or exports. No provider API
key belongs in this UI. Rendering sends the exact current512px source PNG and
your exact editable prompt, separately from the server-recomputed source brief.
The complete record/input/result binding matters:
Cognition edits can leave the source scene unchanged.

The server uses existing Node22 built-ins, fixed provider endpoints and these
environment settings. Keep credentials outside source control and public files.

| Setting | Purpose |
| --- | --- |
| `CRITTER_RENDER_TOKEN` | Separate operator bearer secret for paid jobs/status/images/recovery |
| `CRITTER_RENDER_STORE` | Writable dedicated durable job directory; one server process owns it |
| `GEMINI_API_KEY` (or `GOOGLE_API_KEY`) | Server-only Google Gemini API key from [AI Studio](https://aistudio.google.com/apikey) |
| `CRITTER_NANOBANANA_MODEL` | Default `gemini-3.1-flash-image` |
| `OPENAI_API_KEY` | Optional server-only OpenAI key; provider unavailable without it |
| `CRITTER_OPENAI_IMAGE_MODEL` | Default `gpt-image-2.5-sunburst` |

Configuration availability reports presence/writable storage, not verified
account billing or model access. Google uses the [generateContent REST contract](https://ai.google.dev/api/generate-content)
at the fixed `v1beta/models/{model}:generateContent` route with a validated,
encoded server-selected model identifier. One user content contains the literal
prompt and inline PNG; `responseModalities` is `IMAGE` and `store=false` disables
request logging. Final image bytes come from candidate content `inlineData`,
excluding thought parts. OpenAI uses [Images edits](https://developers.openai.com/api/docs/guides/image-generation),
multipart image[] plus exact prompt, one PNG output and base64 bytes. No arbitrary
URLs/endpoints/models from the client, conversation, prompt optimization,
grounding, automatic fallback or retry is supplied.

Public `/api/rendering/config` exposes model/availability only. Other rendering
routes require the bearer token. Retained `render-request/1` binds a UUID,
provider, exact compact replay, full expected source binding and hashed source
PNG, and still sends its literal derived brief. Guided `render-request/2` adds a
nonempty exact `promptText` of at most4096 UTF-8 bytes and a
`working-creature-association/1`. Its expected binding remains unedited:
admission replays and verifies the genome-derived source/brief before checking
the separate submitted text and persisting inputs. Job2 retains both derived
and submitted text/hashes, while the provider receives the submitted text
unchanged. No optimizer or hidden prompt substitution is supplied;
identical request IDs recover their original job and conflicting payloads reject.
One provider request is active globally; eight server jobs maximum, no eviction.
Source PNGs are≤1MiB/512×512; returned images≤4MiB. The standalone workbench and
the `/genome/` gateway both allow2MiB for rendering job/recovery POST bodies;
ordinary genetic replay remains64KiB. Source SVG and supplied PNG hashes are
retained separately: the client PNG hash does **not** establish pixel equivalence
with the verified SVG.

Jobs retain pending/running/completed/failed/interrupted state, timestamps,
provider/model/request identity, exact prompt, source bindings and actual output
hash/MIME/usage/revised prompt where returned. New jobs record `providerTransport`
as `google-generate-content/1` or `openai-image-edits/1`. Google output retains
`responseId` (at most256 characters) and `usageMetadata` (at most32KiB UTF-8);
historical Interactions jobs retain their original `interactionId` and `usage`
without relabeling. Restart marks pending/running jobs
interrupted without resubmission. The provider deadline is180seconds; failure or
interruption may have incurred a charge, and exactly-once execution is not claimed.
Failed jobs retain a numeric `providerHttpStatus` independently of the optional
request ID, so missing provider IDs cannot hide a controlled HTTP failure.
Error bodies are parsed only within64KiB; diagnostic status/code/ErrorInfo reason
values use finite allowlists (tokens at most80 characters, numeric codes bounded).
Raw error messages/bodies, arbitrary metadata, credentials and headers are not
retained as diagnostics. Controlled failure codes distinguish no-image,
invalid/out-of-bounds bitmap, invalid JSON, response-read and byte-limit failures,
including successful HTTP responses that did not produce a usable image.
These diagnostics never change request payloads or initiate retries.
Polling/recovery never invokes a provider. After token entry, the gallery reads
the authenticated bounded job list and polls only retained pending/running jobs.
Known-ID and **Find retained jobs for this creature** recovery remain under
Advanced recovery. Matching declared working-creature IDs/original input IDs
show earlier structure/prompt versions without rebinding them. Ungrouped older
jobs appear only by exact binding or a known exact record/input reference.
**Stop waiting** stops the browser wait, not the server job.
After a lost submission response, **Recover submission** resends the identical
request ID/payload rather than requesting a new candidate.

A completed candidate can be retained through the bounded browser store with
its own original source/prompt provenance, even after another structure refresh
within the same working creature. Another working creature cannot acquire it.
The single visible gallery deduplicates browser/server copies by job ID and
displays server-completed images when browser storage fails. Image details show
the original genome ID, actual input/source version and exact submitted prompt;
**Edit this prompt** explicitly copies it into the current render draft.
Manual retention remains available. All images are unaccepted proposals; no
genome mutation, fidelity approval, refinement, animation or acceptance lifecycle
is added. Actual Google transport and retained gallery use are documented in [API evidence](evidence/api-rendering/README.md). OpenAI has an adapter but no configured-provider image evidence.

## Manual proposal retention

After resolving a source, open **Advanced · attach a manually returned image**,
choose PNG/JPEG/WebP, enter a provider label and explicitly select
**Retain pet proposal**. Manual attachment records the source-derived brief;
API jobs retain their separate submitted text. Editing or refreshing clears any
selected file and cancels that retention operation. Earlier images stay visible
by their original bindings in the working-creature gallery.
Errors stay inside the panel and preserve the resolved source preview.

The browser-only `retained-pet-proposal/1` record binds the exact source record,
input/result/scene digests, consumer versions/foundation, prompt text and SHA256,
unchanged bitmap bytes and SHA256, dimensions/MIME, provider label and compact
source replay recipe. Download the native bitmap and linked JSON metadata as
two files. **Copy linked metadata** copies the identical indented JSON when a
browser cannot confirm downloads; local feedback reports clipboard success or
failure. This is export portability, without a new image-import service.
The separate IndexedDB `proposalBlobs` store holds eight distinct proposals;
a ninth rejects without eviction. Files are at most4MiB,4096px on the long side
and16million decoded pixels. Existing localStorage genome slots are unchanged.
Browser storage can be unavailable, full or cleared; keep exported files for
durable retention. All returned art remains **proposal**, with no acceptance,
inherited-fidelity claim, gene change, automatic provider call or animation.

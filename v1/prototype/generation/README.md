# Retained Pip portrait and controlled-description proof

This local proof resolves a revealed native resident projection to one of the
two retained [Pip originals](../../design/v1-pip/manifest.json), copies its exact
portrait bytes, and saves a description made from controlled phrases. It checks
the [architecture recovery/offline boundary](../../specs/architecture.md#generation-backend-and-retained-results).
It does not produce a novel illustration, define generic traits, establish human
fun, or deploy a backend. It uses Node's filesystem and cryptography only, with
no dependencies, network requests or model calls.

Run with the existing Node runtime (Node 22 or later):

```text
node prototype/generation/retained-job.mjs resolve REQUEST_JSON OUTPUT_DIR
node prototype/generation/retained-job.mjs replay JOB_DIR
node --test prototype/generation/retained-job.test.mjs
```

Both commands print a JSON result with `job_dir`, `reused` and the accepted
`result`. Failure prints a JSON error and exits with status 1. `resolve` returns
the same saved result for a duplicate request; `replay` only reads and verifies
an accepted job. Neither command changes game state, spends resources, updates
visits, or confers ownership or global rights.

## Native input and permitted claims

Take `resident_snapshot` from the native Companion status response. Native
projection selects revealed residents only, including the saved offline cache;
an empty selection is unavailable for this proof. Keep that object intact and
add a stable request ID plus the two claim IDs:

```json
{
  "request_id": "my-stable-portrait-request",
  "resident_snapshot": {
    "count": 1,
    "current": true,
    "visit_available": true,
    "world_revision": 42,
    "updated_at": 123456,
    "selected": {
      "id": "individual-example",
      "source_sample_id": "sample-example",
      "art_id": "design/v1-pip/pip-carried.png",
      "art_version": "pip-playtest-art-v1",
      "original_art_sha256": "38b0fa7fc24ffea47cb128fdcaf46f701a2396bd3bfcbb81e3d86f962f262534",
      "appearance_descriptor": "pip-reference-carried",
      "reference_context": "pip:adult-rested-firm-ground-mild-v1",
      "mapping_version": "pip-discovery-map-v1",
      "original_art_version": "pip-playtest-art-v1",
      "visits": 2
    }
  },
  "claim_ids": [
    "appearance:pip-reference-carried",
    "reference:pip-adult-rested-firm-ground-mild-v1"
  ]
}
```

The identities, timestamps and visits above are synthetic examples of the actual
native schema. Use the native accepted identity for an integration run. This is
a trusted local projection consumer, not an authentication or revelation
authority: supplying an invented identity does not make it an accepted game
resident. Tests use synthetic identities and actual original bytes; the native
connected journey establishes accepted-resident integration separately.

The selected resident's nine identity/provenance fields are required. Extra
fields, including genomes, support rosters, free prose or source-path overrides,
are rejected. Optional native snapshot counts, freshness flags, revision,
timestamp and visit count must have their native scalar types. They are mutable
projections and are excluded from the retained portrait input fingerprint and
result. A duplicate request after a visit therefore reuses the portrait without
claiming an unchanged visit count or current connection.

The fixed mappings are:

| Native descriptor | Required original path | Controlled appearance phrase |
| --- | --- | --- |
| `pip-reference-carried` | `design/v1-pip/pip-carried.png` | Plain coat. Pale variation is carried without visible pale markings. |
| `pip-reference-marked` | `design/v1-pip/pip-marked.png` | Pale body markings are visible in the declared adult reference. |

The carried annotation comes from the accepted descriptor; it is not inferred
from unmarked pixels. For marked residents use
`appearance:pip-reference-marked` with the marked original path and its manifest
hash. Both mappings require art and original versions `pip-playtest-art-v1`,
native mapping `pip-proof-map-v1` or `pip-discovery-map-v1`, and reference context
`pip:adult-rested-firm-ground-mild-v1`. The other required claim is
`reference:pip-adult-rested-firm-ground-mild-v1`; its phrase is “Reference: a
healthy/rested adult on firm ground in mild conditions.” Claim order is
irrelevant. No movement, effort, behavior, needs or emotional claim is supported
by this portrait proof.

## Retention and replay

`OUTPUT_DIR` receives one folder named by the SHA-256 of the request ID. Request
text cannot choose a source path or escape that folder. New resolution validates
the fixed original manifest's source URL, capture hash, extraction method, crop
and portrait hash before reading the fixed original portrait. The manifest
retains the Gemini source and its provisional screenshot-extraction provenance;
this proof does not turn it into a full-size export or redraw it.

Each accepted job contains:

- `portrait.png`: exact original bytes, retaining their approved SHA-256.
- `description.txt`: the exact controlled appearance and reference phrases.
- `result.json`: normalized immutable input and fingerprint, format/template
  versions, accepted description, original Gemini provenance, artifact byte
  counts/hashes and a metadata integrity hash.

Files are prepared in a generated sibling folder and published together. Existing
accepted jobs are verified before reuse and are never overwritten by a changed
request. A different immutable resident ID, source ID, supported mapping or
portrait under the same request ID is refused with `INPUT_CONFLICT`.

Replay needs no original source, manifest or network. It verifies saved metadata,
identity, controlled text and retained bytes against the pinned supported
mapping, then returns the accepted result without rewriting files. Duplicate
resolution follows that same read-only path. A new unresolved request still
needs its original source. Missing or corrupt saved artifacts fail honestly;
neither replay nor duplicate resolution silently regenerates or repairs them.
Checksums detect corruption; they are not signatures or a rights mechanism.

The focused checks cover both approved outputs, distinct resident identities
sharing art, duplicate bytes/text, mutable projection changes, immutable input
conflicts, unsupported/hidden claims, offline source absence, damaged/missing
artifacts and the CLI failure contract. They establish this bounded local
retention behavior, not production service durability or broader generation
quality.

# Saved-specimen compatibility fixture

An isolated read/copy example of saved-specimen compatibility. The JSON envelope is disposable fixture serialization, not a production schema or migration. It begins after an authored outcome was saved; it does not implement research model B, creation, devices, printing, scanning or care authority.

```text
node --test prototype/tests/specimen-compatibility.test.mjs
node prototype/compatibility/demo.mjs <new-output-directory>
```

The demo exclusively creates a new directory and copies four records without parsing/reserializing their stored bytes. It closes/reopens each copy and reports identity, ancestry, exact-byte preservation and verified portrait hashes. Existing destinations are never overwritten. This is not transactional creation, concurrent storage or power-loss validation.

`record.mjs` purely assesses an envelope against explicit supported envelope/rules/content/outcome lists. A valid known envelope with unsupported content exposes saved facts as historical; unknown envelopes and malformed records expose no salvaged fields. Consumer defaults do not reinterpret genotype or expression. All assessments have an empty action list.

`files.mjs` retains original bytes independently of parsed facts. Copies use only those bytes, including malformed/unknown records. Portrait IDs resolve through a fixed two-entry asset map; record strings never select a filesystem path. Missing, unsupported or hash-mismatched art reports **Portrait unavailable** without changing identity. Readers never import a renderer or regenerate art.

The founder is `paper:individual:001`, Family A, explicitly parentless, with original `Cc / Rr / Pp` and saved crown/ring expression; pale markings remain carried, without sample activation. Authored siblings 101/102 retain distinct IDs, birth events and histories despite equal genome/art. Their parent snapshots reproduce the paper starter pair, with illustrative `paper:starter:A/B` references. Imported 201 has explicitly unknown ancestry. Study, creation and history references are authored examples, not completed operations.

## Retained placeholder portraits

Two standalone 64 × 64 indexed PNGs were prepared once from existing `assets.critter`, the existing color palette and monochrome mapping (indices 1/4 black, other sprite indices white), and the existing PNG encoder. Transparent sprite cells use the existing palette background. Shared helpers and art were not edited. These are the provisional `pixel-01` placeholder, not new or canonical creature art; ordinary light details do not prove expressed pale markings.

| File | Exact SHA-256 |
| --- | --- |
| `assets/critter-color.png` | `d1e5307e8c0271ab83d50e1f74279b41b37d8183d58de86c5cc6d3901e85df42` |
| `assets/critter-mono.png` | `c261d2bb09cc5cd514200de9956fc0a07ce18d11b66809aeb3bc7075efc73a81` |

The focused checks cover save/reopen, identity separation, unsupported-byte preservation and missing/corrupt/restored art. Neither hashes nor readable cached facts authenticate ownership, authorize breeding or award progression.

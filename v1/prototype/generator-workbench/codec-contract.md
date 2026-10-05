# Reversible genome tree codec proof

This host-only application profile encodes retained data into a reversible string. It does not evaluate imported biology, execute embedded operators, install genomes, grant permission or reproduce a living creature. The [genetics framework](../../specs/genetics.md) remains authoritative. Existing hashes and engine records are unchanged.

## Payloads and dependencies

`encodeGenomeTree(packet, {purpose: 'G'|'T', foundationMode: 'S'|'E'})` returns an encoded artifact or an atomic rejection. `decodeGenomeTree(text, {foundations: Map<fullDigest,catalogue>})` returns the literal tree and restored packet, dependency-unresolved, or rejection.

- **G** retains the exact foundation and complete inherited genome, ordered allele copies and embedded original parent/donor provenance. Expression, phenotype, lifetime and packet evidence are deliberately `not-included`. Changing a current view/context or supplied lifetime does not change G.
- **T** restores every supplied plain-data packet field, including input, literal result and scene, original prompt/SVG strings, unknown noncritical attachments and supplied lifetime data. No resolver or new prompt projection runs on decode. Missing lifetime is `not-modeled`, not empty modeled history.
- **S** requires the exact catalogue. Its existing canonical-JSON digest provides lookup; an additional SHA-256 of exact deterministic CBOR verifies numeric content before interpreting indexes, including negative zero. Missing or mismatched content rejects without substitution.
- **E** embeds that catalogue once. It is self-contained for inspection of this retained tree; imported operator names are data, not executable implementations. Actual parent genomes are included rather than reconstructed from parent names/hashes.

The semantic schema is `critter-genome-tree/1`: five named layer branches, namespaced entities, typed prerequisite/transmission references and dimension indexes. Each genome's locus/copy vector appears once. Catalogue definitions and all carried/inactive copies remain retained. The mapping preserves semantic arrays and all supported original fields. Unknown required extensions (`criticalExtensions`) reject. Opaque fields do not establish modeled biological behavior.

## Wire profile

The string is `CLT1.S.G:` (or E/T) plus canonical unpadded base64url of:

1. Seven header bytes: ASCII `CLT`, version 1, ASCII foundation mode, ASCII purpose, reserved flags 0.
2. Deterministic CBOR application envelope `clt-wire/1`.
3. SHA-256 of header plus CBOR bytes (32 raw bytes).

The envelope declares tree schema `critter-genome-tree/1` and mapping `packet-tree-compact/1`, purpose/mode, exact foundation identities and the complete original tree digest. It carries genome attributes, origin metadata, ordered parent-record indexes and one allele bitstream; T also carries every remaining literal packet/input field. Entity IDs, dimension indexes and prerequisite/transmission edges are deterministic `packetToGenomeTree` outputs, so they are rebuilt after the literal packet is restored. The rebuilt deterministic CBOR tree must match the transmitted tree digest. This mapping does not accept arbitrary edits to derived tree entities.

Genome records use root-first depth-first order, retaining each supplied parent's slot and all donor metadata. Locus and allele dictionaries sort by exact UTF-8 bytes. Copies retain their original order. Allele indexes consume `ceil(log2(alleleCount))` bits per declared copy, MSB first; single-allele records consume zero index bits. Exact copy counts come from the verified foundation, not a universal two-copy assumption. Unused indexes, nonzero final padding, noncanonical/dangling/cyclic parent indexes and unreachable records reject.

The pinned standard dependency is **cbor2@2.3.0**. Application profile `cbor2-cde-exact/1` uses that version's CDE key ordering and shortest exact numeric encoding, with Unicode normalization, flush-to-zero and negative-zero simplification disabled. This names a specific library/draft-derived application profile, not universal canonical-CBOR interoperability. Decode rejects duplicate/unordered keys, indefinite data, unsupported tags/types and nonpreferred representations; byte re-encoding must match exactly. Literal golden vectors pin sorted maps, negative zero, subnormal and noninteger float behavior. [Library source](https://github.com/hildjj/cbor2), [official option documentation](https://hildjj.github.io/cbor2/interfaces/index.EncodeOptions.html), [RFC 8949](https://www.rfc-editor.org/rfc/rfc8949.html).

Only plain records, dense arrays, well-formed strings, booleans, null and exact finite JS numbers are admitted as source data. Negative zero and finite float extremes survive; NaN/infinity, BigInt, functions/accessors, hidden/symbol fields, cycles, sparse/extended arrays and unsafe prototype keys reject rather than disappear. No float rounding, Unicode normalization, copy sorting, gene repair or generic custom serialization occurs.

## Bounds and proof

Framed bytes are limited to 2 MiB; canonical text to 2,796,213 characters; semantic depth to 32; visited values to 200,000; aggregate text/key bytes to 4 MiB; catalogue records to 4,096; fixed copies per locus to 64; parent depth to 16. All limits apply together, so deeply nested provenance may reach the overall depth bound sooner. The library's `SequenceEvents` parser checks item counts and declared container lengths against byte/item bounds before full decoding; tags and indefinite forms reject there. Library CBOR depth 64 accommodates its container counting while semantic depth remains separately enforced. Copy expansion is bounded before allocation, and the restored full tree must pass the semantic limits. There is no general compression or unbounded expansion. Whole snapshots are file/string artifacts and do not reuse or enlarge the workbench's 64 KiB POST or 1 MB local import limits.

Run `node --test genome-codec.test.mjs` and `node codec-proof.mjs [output-directory]`. The CLI emits real contact/axial G and T strings in S/E modes, exact decoded trees, a foundation file, an actual cross's provenance and measured sizes. The retained contact S/G string is also the complete literal protocol golden, so CI compares its bytes across Node runtimes. Shared-foundation costs must be considered separately from G/S size; E includes the full catalogue and T includes literal evidence. No tiny-code, QR capacity, authentication or signature claim is made. UI/transport integration and further optimization are separate consumers.

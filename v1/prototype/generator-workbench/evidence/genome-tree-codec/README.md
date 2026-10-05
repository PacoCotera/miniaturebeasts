# Reversible layered genome strings

Standalone host proof of the [codec contract](../../codec-contract.md), using the retained contact and axial packets from the [connected scene experiment](../module-scene-workbench/README.md). These are actual encoded files and decoded trees, not short lookup hashes.

`G` carries the inherited genome, ordered copies and supplied parent/origin records. `T` carries the complete supplied snapshot, including literal expression, phenotype, prompt and SVG. `S` requires the exact [foundation](foundation.json); `E` embeds it. Five-layer trees distinguish included data from deliberately excluded or unmodeled branches.

| Retained example | Binary envelope bytes | Reversible string characters |
| --- | ---: | ---: |
| [Contact G/S](single-scales.S.G.clt) | 724 | 975 |
| [Contact G/E](single-scales.E.G.clt) | 45,827 | 61,112 |
| [Contact T/S](single-scales.S.T.clt) | 276,196 | 368,271 |
| [Contact T/E](single-scales.E.T.clt) | 321,299 | 428,408 |
| [Axial G/S](axial-scales.S.G.clt) | 724 | 975 |
| [Axial T/S](axial-scales.S.T.clt) | 320,987 | 427,992 |
| [Axial T/E](axial-scales.E.T.clt) | 366,090 | 488,129 |
| [Actual cross G/E](actual-cross.E.G.clt) | 49,144 | 65,535 |

The contact inherited JSON is 2,229 bytes. Its 96 ordered allele copies occupy 96 bits/12 bytes; the complete G/S envelope adds versions, integrity, metadata and foundation references. Its smaller size depends on separately retaining the exact foundation. Embedded catalogues and full evidence snapshots are much larger. [Measurements](measurements.json) record every emitted mode, hashes and limits; [contact](single-scales.tree.json) and [axial](axial-scales.tree.json) trees show the complete T mapping. [Actual cross source](actual-cross.genome.json) retains real parent genomes and donor indices.

## Validation and boundaries

`node --test genome-codec.test.mjs` passed all seven focused gates. `node codec-proof.mjs` emitted these files and verified exact contact/axial G/T shared/embedded reconstruction and the actual cross. Complete contact G/S bytes are pinned as a protocol golden, alongside exact numeric/map/Unicode vectors. Negative zero, subnormal numbers, ordered copies and unknown supported fields survive; malformed, noncanonical, corrupted, cyclic, oversized and missing/mismatched dependency cases reject.

Decode restores literal records without rerunning the creature resolver or renderer. The versioned mapper rebuilds derived tree references and verifies the entire tree digest. This is data inspection, not acceptance of biological behavior, executable rules, ownership, incubation rights or a living pet. UI/HTTP integration, fingerprint art and QR capacity are unimplemented consumers; existing workbench input limits remain unchanged.

Independent technical review passed the held source on bundled Node 24.19.0: seven focused gates, all nine retained strings decoded/re-encoded exactly, all four T records matched original packets/trees, and the actual cross preserved parent/donor provenance. The existing Node 22 Actions job is the separate exact-source runtime golden gate. No frontend journey is changed by this host-only proof.

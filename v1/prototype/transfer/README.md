# Whole-haul transfer experiment

This headless simulator moves authored samples and resource lots between two independently saved replicas. It tests consistency, not peer authentication, exploration validity, networking or physical storage. It does not open samples, create critters, spend resources or alter the browser lab fixture.

## Status presentation adapter

`presentation-host.mjs` validates a supplied lab snapshot/read outcome, full selected key and optional same-key reconciliation capability. It never reads the probe. Receipt absence stays unknown unless the caller explicitly supplies requested or pre-offer preview context. Recorded cargo describes that haul, not current inventory or remote emptiness. A confirmed receipt does not prove the probe received the final acknowledgment.

`presentation-data.mjs`, `presentation-view.mjs` and `presentation-controller.mjs` use only plain data and have no Node/browser/device imports. The exported mapper structurally checks observation facts and selection before producing copy, bounded four-row detail pages and semantic actions. Host crypto/domain validation remains required; structural validation does not authenticate observations.

Create a controller using `createPresentation({ instanceId, key, context, caller })`. The host supplies a fresh unique `instanceId` when replacing a controller instance; preserve the returned state during selection changes. `updatePresentation(state, event)` returns `{ state, effects }`. Use `refresh` for a read intent, then return `observe` with the effect's exact `requestToken`, selected key and `projectLabObservation(...)` result. Select/reentry and Back invalidate earlier request generations. `action` and `focus` events include the displayed revision, key and action ID. `mapPresentation(state)` returns the current view.

The only effects are `read`, same-key `reconcile` and `navigate-back`. The host owns execution and must revalidate permission/domain state. Check status is disabled while a request is pending; there are no start, sample-open, cancel, reset or spending effects. Back/Details navigation cannot mutate transfer records. Automatic refresh uses the same guarded observation path.

Unavailable reads can retain separately labeled **Last confirmed status** and permit an explicitly authorized retry. Unreadable records or conflicting facts cannot authorize reconciliation. Older successful snapshots cannot replace newer facts; immutable receipt disappearance, phase regression or differing cargo for the same selected digest is rejected. A preview manifest becoming available does not require a lab revision change: that is supplied read context, not a new receipt.

Previously verified manifest cargo is retained separately as a consistency check even if a later preview is unavailable. It does not make that preview available or authorize actions, and changing the selected key clears it. If preview data disappears while Details is open, Details shows one bounded unavailable page rather than navigating elsewhere or displaying an empty page count.

Run `node --test prototype/tests/transfer-presentation.test.mjs` for observation, stale-input and navigation guards. The [pixel browser study](browser/README.md) adds host rendering and gesture checks without live transfer or persistence.

```text
node --test prototype/tests/transfer-simulator.test.mjs
node prototype/transfer/demo.mjs <new-snapshot-directory>
```

The demo creates inspectable `probe.json` and `lab.json` files and prints the five commits. It deliberately loses the final message, reopens both files and resumes. The directory must be new; it never resets an existing save. Sample IDs, lots, quantities and history references are authored test inputs, not game economy rules.

## Responsibilities

| Module | Owns |
| --- | --- |
| `manifest.mjs` | Strict versioned cargo/message validation and deterministic SHA-256 identity. ASCII IDs sort by code unit, independent of locale. |
| `probe.mjs` | Cargo, immutable sealed manifests, delivery tombstones and gathering gate. |
| `lab.mjs` | Atomic whole-haul inventory credit, receipts and haul-specific clearance confirmation. |
| `repository.mjs` | One-file atomic replacement, validation and per-path transaction serialization. |
| `simulator.mjs` | Disposable explicit message queue, drop/duplicate/out-of-order delivery and interruption hooks. |

Each domain transition returns a new snapshot and eligible messages. The harness releases those messages only after repository success. Probe and lab never inspect each other's snapshots.

## Five commits, four messages

1. Probe saves the complete sealed manifest, then sends **offer**.
2. Lab saves receipt plus all inventory together, then sends **receipt**.
3. Probe clears only the matching cargo and saves its tombstone, then sends **cleared**.
4. Lab saves confirmation of that haul, then sends **completion**.
5. Probe saves completion before new gathering is allowed.

Sealing locks gathering; spending, cancellation and retargeting are unsupported. A timeout cannot unlock cargo. Resume derives replies from saved state, never a remembered queue. Duplicate messages can replay saved replies; changed identities/payloads and unsolicited phase advancement fail. Old messages cannot clear or relock a later haul. Lab confirmation describes a historical haul, never the remote probe's current emptiness.

## Storage and failure boundaries

Use a single canonical absolute path per replica, with ordinary files/directories and no symlink, hardlink or case aliases. Multiple handles using that same path serialize within this process; cross-process writers and filesystem aliases are unsupported. There is no background lock service.

Transactions reread and validate committed bytes, write an exclusive temporary file, flush it, replace the one replica file and flush its directory. There is no cached snapshot to trust after uncertain success. Windows skips directory fsync because Node cannot reliably open directories there; actual power-loss durability is not established on any hardware by these tests. Initialization exclusively creates a new file; failed initialization may leave incomplete bytes for diagnosis and must not be automatically retried as a reset.

Corrupt or unsupported records are preserved and rejected. The default file limit is 1 MiB; each cargo category, retained transfer list and history list is bounded to 128 entries. The fixture does not prune receipts/tombstones. Capacity exhaustion requires retaining state and retrying after capacity is available; it must not evict deduplication records. Sample IDs and lot IDs each occupy their own namespace.

The [transfer tests](../tests/transfer-simulator.test.mjs) cover write/message interruption, reopening, duplicate/conflicting delivery and corrupted saves. Injected faults do not establish physical power-loss durability or flash wear. Production authentication and firmware persistence remain separate work.

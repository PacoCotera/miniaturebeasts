# Companion Discard and Finish through LVGL

The existing Cargo tree now renders item-kind selection, the complete whole-item
quantity selector, Discard/Keep review and empty Finish review. These routes use
owned copied views and retained LVGL widgets; their manual compositor branches
are removed. Physical commands, saved ownership and game rules remain outside UI.

Final source: `4f6ceef5def86a6e9dc84809c57f7edaf92f18b3`. The existing build machine
retrieved this exact clean pushed Git revision before building. At the preceding
mode-indicator revision `7a850c1`, the four affected Cargo/Probe/Dock/Kit suites
passed. The final no-active-expedition copy correction passed the affected Cargo
and Kit suites. CI is tracked by the pull request rather than inferred from local
checks. The final stored-cargo guard passed the affected Cargo suite. Its eight
regenerated existing fixture hashes match the accepted preceding output exactly.
This source has not been deployed to the shared sandbox.

## Actual player journey

An isolated fresh world collected two Data units, then went offline. The physical
READY/down/up control trace at `a77fb739` exercised kind selection and empty-kind feedback,
the quantity list including Keep, safe commitment defaults and Back restoring
the exact quantity row. Deliberate discard reduced two units to one, then one
to zero. Keep changed no inventory. An empty Finish review preserved the outing
on Keep, then ended it on deliberate confirmation. Lab stock and samples stayed
zero; the player returned to the Probe entry for a new expedition.

The selected product images below are450×600 native output, never browser-drawn
game screens. Their exact source and hashes are in [frames.json](frames.json).

| Step | Visible result |
| --- | --- |
| [Choose a kind](discard-class.png) | Current whole cargo stays visible; selected material is distinct |
| [Choose two units](quantity-two.png) / [Keep](quantity-keep.png) | Logical quantities remain separate from the reversible Keep option |
| [Review one-unit loss](review-one-default-keep.png) | Current2, loss1 and remainder1 are separate; Keep is the default |
| [Partial result](partial-discard-result.png) / [Empty result](all-discard-result.png) | Exact saved loss, freed capacity and zero current cargo |
| [Empty Finish review](finish-default-keep.png) | Ends this outing, no sample or transfer; Keep exploring is the default |
| [Ended result](finish-result.png) | No active expedition; no false promise of retained finite sources |

## Clearly labeled presentation fixtures

These images exercise synthetic states through the actual Kit projection and
LVGL renderer. They are not extra played worlds or hardware evidence.

- [Class Keep](fixture-class-keep.png) selects no false material.
- [Quantity40](fixture-quantity-40.png) and [last Keep](fixture-quantity-keep.png)
  preserve the existing two-row window over all41 logical choices.
- [All-item review with a capsule](fixture-discard-all-keep.png) keeps40current
  units distinct from loss40/remainder0; the sealed sample remains owned.
- [Storage recovery](fixture-discard-storage-error.png) and
  [already-sealed review](fixture-discard-pending.png) close actions and preserve cargo.
- [Cargo-origin Finish](fixture-finish-keep.png) and
  [Probe-origin Finish](fixture-finish-probe-keep.png) retain actual mode identity.
  The latter is a projected fixture, not a Probe-origin control playthrough.
- [Stored cargo without an active outing](fixture-stored-no-outing.png) preserves
  two actual projected units without falsely claiming empty cargo. This final
  guard is a supported legacy-state fixture, not another played expedition.

## Acceptance boundary

Independent source/technical and focused interaction review passed the final
source, actual control trace and native exports. Separate art-direction review
passed the native frame geometry, typography, material continuity, mode identity,
warnings and final changed captions. Reviews are limited to this family.
The checks cover copied lifetimes, partial-only output, stable warm updates,
logical-to-visible focus, invalid/nonwhole/excessive loss, both storage-failure
flags and explicit failure without raster fallback. Host memory with two tested
contexts was188088 bytes used out of232392 pooled bytes; this is not MCU fit.

[CI176](https://github.com/PacoCotera/critter-lab/actions/runs/36846217653) passed
all target jobs, including the full Lab host checks and shared Dock ESP compile.
The historical nRF job passed after a transient SDK-fetch retry. This is not a
current Companion firmware pass.



every Lab route, broad environmental art, human enjoyment and physical display
behavior remain open in [architecture coverage](../../../native/ui/README.md#screen-coverage-and-target-evidence).

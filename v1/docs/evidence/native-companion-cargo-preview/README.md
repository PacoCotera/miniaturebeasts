# Cargo mode preview through LVGL

Browse Cargo to inspect what the Companion carries. Enter Cargo to choose an
action. The preview renders through the same retained LVGL tree and owned plain
view as Cargo; it exposes zero Cargo actions. Physical input and saved ownership
remain in the interaction and domain layers. No manual-renderer fallback remains
for this route.

Source: `725f433476d388782c1dc013d825d359e650e5b1`. The existing native toolchain
built this exact clean pushed Git revision. The three affected Cargo, Probe and
Kit suites passed. [CI180](https://github.com/PacoCotera/critter-lab/actions/runs/36849184260)
passed all target jobs. Its Companion job still compiles the legacy Companion
scaffold and the current shared Dock UI, not the current Companion UI.
The sandbox has not been deployed or reset by this increment.

## Actual control journey

A fresh isolated world browsed empty Cargo, entered it with Down without acting,
then gathered two Data units. Cargo preview showed those units before Confirm
entered Send focus. Choosing Discard, returning to preview and entering with Down
restored the remembered Discard row without discarding anything. Offline
Probe/Cargo switching kept the same cargo. A deliberate Send sealed it; browsing
and entering the sealed view changed nothing. Reconnection and Lab acceptance
credited two Data once and cleared current Companion cargo. Accepted previews
showed the delivery record separately from empty current ownership.

The validation trace contains162 semantic commands and17 native captures.
The selected450×600 frames are exported from LVGL/native buffers; the browser
does not compose them. [frames.json](frames.json) records exact source and hashes.

| Preview or transition | Player-visible result |
| --- | --- |
| [Empty preview](preview-empty.png) | Cargo mode focus, no active expedition, no Cargo command |
| [Two earned units](preview-active.png) | Current whole units and capacity; entry is separate from an action |
| [Entered remembered Discard](enter-remembers-discard.png) | Cargo action focus replaces mode focus, with no loss on entry |
| [Offline Cargo](preview-offline.png) / [Probe preview](probe-preview-offline.png) | Local mode browsing preserves cargo and shows the offline link |
| [Sealed offline](preview-sealed-offline.png) / [Waiting at Lab](preview-awaiting-lab.png) | Browsing cannot cancel or resume the sealed expedition |
| [Accepted preview](preview-accepted.png) / [Return to preview](preview-accepted-again.png) / [Receipt complete](preview-receipt-complete.png) | Current zero remains separate from the two-unit accepted receipt |

## Presentation fixtures

These are synthetic states projected through the real Kit adapter and LVGL,
not additional played worlds or physical hardware evidence.

- [Empty](fixture-empty.png), [active](fixture-active.png), [offline](fixture-offline.png)
  and [stored without an active outing](fixture-stored.png) preserve actual counts/context.
- [Sealed](fixture-sealed.png) and [accepted](fixture-accepted.png) distinguish ownership
  from a delivery record without offering Cargo actions.
- [Kit storage failure](fixture-kit-error.png) and [Lab storage failure](fixture-lab-error.png)
  preserve cargo and hide entry hints and mode focus while recovery is required.

## Acceptance boundary

Independent source/technical and focused interaction/legibility reviews passed
the final source and actual native controls/output. A separate native craft
review passed the1x frames, rail/action hierarchy, margins, typography, recovery
and accepted-state presentation. These passes cover this preview only.
Checks cover read-only projection, both storage errors, selector validation,
explicit invalid-preview failure, copied label lifetime and bounded partial-only
updates. Repeated preview/action transitions restore the exact prior Cargo frame,
including remembered row1 focus geometry. Two host contexts used189448 bytes of
232200 pooled LVGL bytes; this is not an ESP32 fit measurement.



Lab routes remain open. Environmental HiBit craft, human enjoyment, radio, panel
refresh and physical performance are separate gates. See [architecture coverage](../../../native/ui/README.md#screen-coverage-and-target-evidence).

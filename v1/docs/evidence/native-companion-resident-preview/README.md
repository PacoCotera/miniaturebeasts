# Companions mode preview through LVGL

Browse Companions to inspect the selected saved creature, its visits and any
supported saved property. Down or Confirm enters the existing resident list;
browsing or entry does not save a visit. The preview uses retained LVGL labels,
image widgets and frames from a copied plain view. No manual-renderer fallback
remains for any known Companion mode preview.

Source: `0b5d277c5a77020eaa502e19d805d39431aa5892`, retrieved as exact clean pushed
Git source on the existing native toolchain. The resident-preview check passed.
Probe, Cargo and Kit checks passed the unchanged production parent; the final
change corrects a test assertion to check partial-buffer byte capacity rather
than assuming narrow dirty rectangles have at most eight rows.
[CI183](https://github.com/PacoCotera/critter-lab/actions/runs/36853964237) passed
all target jobs, including the full native checks. Its Companion job builds the
legacy Companion scaffold and current shared Dock UI, not current Companion UI.
No sandbox deployment or reset occurred.

## Actual controls and saved identity

Two isolated native journeys used a fresh empty game and a copy of the accepted
A0/B1 saved world. Each contains74 semantic commands and13 native captures:
Cargo → Companions preview → Down/Confirm entry → Back → offline inspection →
Cargo/Probe browsing → Companions → reconnect. The saved selected ID, provenance,
visit count, stock, current cargo and transfer phase remain unchanged. A third
31-command/3-capture walk selects the second existing resident through the list,
returns to preview and checks its saved B1 property offline and after reconnect,
without visiting. This is existing saved progress, not a new creation playtest.

| Native state | Visible result |
| --- | --- |
| [Empty preview](controls-empty-resident-preview.png) | Empty habitat and reveal-at-Lab context; no unborn portrait |
| [Saved resident](controls-saved-resident-preview.png) | Same BEE-P-00003, retained portrait and2 saved visits |
| [Entered list](controls-saved-enter-confirm.png) | Existing separate list; entry preserves identity and visits |
| [Offline snapshot](controls-saved-offline-preview.png) | Retained portrait/count with explicit last-Lab-update status |
| [Cargo](controls-saved-offline-cargo-preview.png) / [Probe](controls-saved-offline-probe-preview.png) | Their LVGL roots replace the preview and return safely |
| [Saved B1 resident](b1-controls-saved-actual-b1-preview.png) | Same BEE-P-00006,0 visits and saved Burst-capable property |
| [B1 offline](b1-controls-saved-actual-b1-offline.png) / [reconnected](b1-controls-saved-actual-b1-reconnected.png) | Property and visits preserved; freshness changes truthfully |

[frames.json](frames.json) labels the selected450×600 native frames, source and
hashes. Browser code did not compose their contents. List-entry images document
the transition; the list itself remains outside this migration.

## Presentation fixtures

These ten synthetic projections exercise actual Kit-to-LVGL rendering; they
are not additional played worlds or hardware measurements.

- [Plain](fixture-resident-plain.png) and [marked](fixture-resident-marked.png)
  use the retained261×289 source portraits at native size.
- [Saved B1 property](fixture-resident-saved-b1.png) shows only accepted mapping/
  reference metadata; unsupported mapping suppresses the property. The check
  also covers B0 and independence from live research.
- [Pending portrait](fixture-resident-pending-portrait.png) retains identity
  without inventing art when provenance is unsupported.
- [Offline](fixture-resident-offline.png) and [cache failure](fixture-resident-cache-error.png)
  preserve a stale readable snapshot. A cache-write failure does not masquerade
  as a global storage failure.
- [Kit](fixture-resident-kit-error.png) and [Lab](fixture-resident-lab-error.png)
  storage errors preserve facts and hide mode focus and entry affordances.
- [Pending transfer](fixture-resident-pending-transfer.png) preserves resident
  context while explaining unavailable visits; [empty](fixture-resident-empty.png)
  exposes no unborn resident.

## Acceptance boundary

Independent technical and focused interaction review passed this exact source
and actual native output. A separate native craft review passed portrait
preservation, rail/entry hierarchy, margins, text fit and recovery presentation.
The lower hint/footer clearance is compact but intact. These are bounded passes
for this preview, not broader product design or human-fun approval.
Projection checks reject missing selected IDs, unrevealed records, invalid counts
and unterminated strings before existing provenance helpers run. UI checks
overwrite the source view before refresh, exercise100 warm updates without pool
growth, bounded partial-only output and resident → Cargo → Probe → resident frame
restoration. Two host contexts with one lazy resident preview use200200 of230864
LVGL pool bytes. This is not ESP32 memory-fit or allocation-failure recovery proof.



every Lab route require migration. Environmental HiBit craft, human enjoyment,
radio, display refresh and physical performance remain separate gates. See
[architecture coverage](../../../native/ui/README.md#screen-coverage-and-target-evidence).

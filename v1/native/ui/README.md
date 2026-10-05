# Retained device UI

`native/ui` turns copied permitted device views into retained LVGL screens. The
selected game supplies facts and semantic focus; host or ESP-IDF adapters supply
display sinks and asset backing. This module cannot access game/save authority
or invoke gameplay commands. Player-facing labels follow [Miniature Beasts naming](../../BRANDING.md); native Station headers use the compact device name. Start with the [architecture](../../specs/architecture.md#native-ui-foundation)
for the ecosystem boundary and [native build guide](../README.md) to compile it.

The portable families are Cargo/Send/Discard/Finish, Probe and residents/visits,
plus the complete Dock summary/print family. Station-specific retained roots live
under `selected-lab`. All supported current host screens use LVGL; retired
standalone acquisition graphics fail explicitly while their domain regression
commands remain supported.

## View, asset and display interfaces

The complete host Dock page family uses `dock_ui.c`: World, Supplies,
Connections, opened pages, print review, cached/offline and storage errors.
It creates retained LVGL labels, image widgets, buttons and focus; it does not
display an earlier raster renderer as an image. `selected-lab/dock_view.c`
copies the accepted Kit snapshot, physical focus, actions and timestamp into
the plain `DockView`. UI code cannot invoke a game command or access a Kit.
Each update copies the view into owned storage before setting static labels.

`display.c` shares one process-wide LVGL lifetime across Companion and Dock.
A profile defines native dimensions, RGB888 format and partial draw rows.
The caller supplies a bounded draw buffer. The callback validates the area,
stride and buffer size before passing it to a sink. RGB888 bytes supplied by
LVGL are B,G,R in this configuration; `host_frame.c` copies them into RGB.
Companion uses 450x600 with 60 draw rows; Dock uses 792x272 with 60 rows.
Buffer planning includes the configured LVGL stride alignment.

A synchronous sink returns `UI_FLUSH_COMPLETE`. An asynchronous sink returns
`UI_FLUSH_PENDING` and later calls `ui_display_flush_complete`; it must finish
before destroying the display or releasing its draw buffer. Completion releases
the buffer for reuse. It does **not** establish a visible frame. A target may
separately call `ui_display_mark_visible` after its presentation acknowledgement.
The host Kit protocol continues using its existing revision/epoch READY guard;
rendering or exporting a BMP does not send READY.

Full RGB storage lives in the optional host frame adapter because BMP export
needs a complete image. A partial sink does not need that allocation. Dock's
four-gray conversion (0/85/170/255) happens in the host export adapter after
LVGL rendering. No UI widget or domain quantity is quantized. This is host
software evidence, not ESP32 display, radio, printer, charging or panel proof.
The current host adapter completes synchronously; no device driver is present.

`native_ui_create()` preserves Companion callers. `native_ui_create_device`
creates only the applicable Companion or Dock roots and assets. The application
keeps one context per migrated device. Controlled Cargo animation refuses to
advance while another display exists because LVGL's clock is global. These
bounded contexts and fixed label storage do not promise recovery from arbitrary
allocation failure inside upstream LVGL.

The existing `dock_four_gray_checks` CTest covers copied snapshot authority,
all Dock pages and unavailable states, repeated retained updates, shared
lifetime, partial area/stride/channel handling and asynchronous buffer release
without automatic visibility. `dock_gray_checks OUTPUT_DIRECTORY` also writes
labeled representative BMP fixtures; these are synthetic presentation evidence,
not a physical-control playthrough. Run through the project's native build gate.

The existing Cargo tree is extracted into `companion_cargo_ui.c` and shared by
Cargo and Send/Keep. Its plain copied view includes a screen tag and projected
footer, exact units, sample and focus. Borrowed fonts/images remain caller-owned;
the module owns widgets and retained label storage. The module accepts a partial
display sink without allocating host full-frame storage. Kit projection and
physical command authority remain outside it. Offline Send seals locally and
waits; Station acceptance clears current cargo and ends the outing. A defensive
already-sealed review presents no Keep cancellation or second Send action.
The [actual native confirmation/return proof](../../docs/evidence/native-companion-send/README.md)
passed affected checks and independent technical/focused UI/UX output review.
[Current shared Companion ESP-IDF compilation](../../docs/evidence/native-companion-esp/README.md)
now passes; physical output and runtime memory remain separate gates.

The same portable Cargo tree also composes Discard class/quantity/review and
empty Finish review. [Actual native output and independent verification](../../docs/evidence/native-companion-discard/README.md)
passed within this family. Two visible action rows retain the full logical option window; copied
focus mapping cannot silently select a different quantity. The domain owns loss,
Keep and caller recovery. The view exposes exact loss/remainder and closes storage
or sealed-haul actions. No game command is invoked by a widget.

Cargo mode preview reuses this retained tree with a copied `selector` flag.
It has zero Cargo actions, mode-rail focus and noninteractive entry hints.
Entering Cargo restores remembered action focus; storage failure hides entry
affordances. [Native controls/output and independent review](../../docs/evidence/native-companion-cargo-preview/README.md)
passed for this preview. No Kit command originates in the widgets.

Companions mode preview uses `companion_resident_ui.c` and a copied
`CompanionResidentView`. The Station adapter validates the retained selected
ID and projects existing saved art/form guards, visits and cache freshness.
It never selects a resident or saves a visit. Its root and native portrait
backings are created lazily on the existing display and hidden on Probe/Cargo
updates; they are destroyed before assets and display. Empty, offline, missing
portrait and storage-recovery states use the same LVGL tree. [Actual native output, controls
and independent review](../../docs/evidence/native-companion-resident-preview/README.md)
cover this preview only. Current shared Companion ESP compilation is checked
separately; physical performance remains unvalidated.

The same resident tree now handles the list and two-row visit surface. It copies
screen/focus/action labels and availability without invoking a command. List
focus belongs to the selected resident header; visit focus belongs to one of the
two exact Kit rows. Empty-list Return to Probe, unavailable visits, saved/stale
feedback and global recovery are explicit states. Native validation and
independent technical, interaction and craft passes are recorded in the
[resident action proof](../../docs/evidence/native-companion-resident-actions/README.md).

A failed supported Dock/Companion projection returns a
render error; it cannot silently reach the old manual renderer.

## Screen coverage and target evidence

| Product screen family | Composition now | Remaining requirement |
| --- | --- | --- |
| Companion Probe and field source choice, including Probe mode preview | LVGL | [Shared current ESP compile checked](../../docs/evidence/native-companion-esp/README.md); runtime/panel adapter unvalidated |
| Companion Cargo | LVGL | Same checked shared compile; runtime/panel adapter unvalidated |
| Companion Send/Keep confirmation | Retained LVGL using shared portable Cargo/Send tree | [Actual host source/control/output and independent review checked](../../docs/evidence/native-companion-send/README.md); [same shared ESP compile checked](../../docs/evidence/native-companion-esp/README.md); runtime/panel adapter unvalidated |
| Companion Discard class/quantity/Keep review and empty Finish review | Retained LVGL using the shared portable Cargo tree | [Native controls/output and independent technical/interaction/craft review checked](../../docs/evidence/native-companion-discard/README.md); [same shared ESP compile checked](../../docs/evidence/native-companion-esp/README.md); runtime/panel adapter unvalidated |
| Companion Cargo mode preview | Retained LVGL, same portable Cargo tree | [Native output, controls and independent review checked](../../docs/evidence/native-companion-cargo-preview/README.md); [same shared ESP compile checked](../../docs/evidence/native-companion-esp/README.md); runtime/panel adapter unvalidated |
| Companion Companions mode preview | Retained LVGL, lazy portable resident preview tree | [Native source/controls/output and independent review checked](../../docs/evidence/native-companion-resident-preview/README.md); [same shared ESP compile checked](../../docs/evidence/native-companion-esp/README.md); runtime/panel adapter unvalidated |
| Companion residents and visits | Retained LVGL, same portable resident tree as mode preview | [Native controls/output and independent technical/interaction/craft review checked](../../docs/evidence/native-companion-resident-actions/README.md); [same shared ESP compile checked](../../docs/evidence/native-companion-esp/README.md); runtime/panel adapter unvalidated |
| Station Home/workspace previews | Retained LVGL, copied view and lazy host display context | [Native route/control/lifetime and independent review passed](../../docs/evidence/native-lab-home/README.md) |
| Station connected incoming haul and received list/detail | Retained LVGL, copied reception/history facts; native image primitives for original field map | [Native controls/output, failure-first routes and independent technical/craft checks passed](../../docs/evidence/native-lab-reception/README.md) |
| Station sample collection, research/review/findings and Library | Copied knowledge and costs; retained LVGL with original reference art | [Native route, disclosure, physical-control, lifetime and focused craft/game review passed](../../docs/evidence/native-lab-research/README.md) |
| Station creation/review, incubation/reveal, Habitat and residents | Copied action facts; one reused retained LVGL family | [Native authority, route/pixel/lifetime and focused art/UX/game preservation checks passed](../../docs/evidence/native-lab-actions/README.md); rejected canister remains provisional art |
| Standalone legacy acquisition pages | Graphics retired; domain/input/save commands retained as regression fixtures | [Unsupported frames reject before bytes; maintained capture callers use supported LVGL pages](../../docs/evidence/lvgl-route-retirement/README.md). Connected Station EXPEDITION/CARGO remain reception/log through LVGL; unsupported discard/unknown pages reject explicitly |
| Caddy World/Supplies/Connections/print review | Retained LVGL, four-gray host output | [Complete host family checked5431f44](../../docs/evidence/native-dock-lvgl/README.md); [same shared ESP-IDF UI compile checkedc3c8a6d](../../docs/evidence/native-dock-lvgl/ESP32.md) |


## Shared integration contracts

Portable UI headers must contain owned plain-C view facts, styles/assets and
profile/display interfaces. They must not require `DeviceKit`, `SelectedLab`,
`FILE`, POSIX storage, radio or GPIO. Projection adapters extract permitted
facts; semantic physical input still reaches the interaction/domain owner.
Host full-frame export storage is optional adapter storage, not an embedded UI
requirement. The ESP32 path can consume partial regions without a host RGB frame.
One shared LVGL lifetime owns all displays; profile-specific roots/assets avoid
instantiating every screen family on each device.

`native/ui/companion_cargo_view.h` owns only copied Cargo/Send/Discard/Finish presentation facts.
The retained `companion_cargo_ui` receives fonts/images and physical focus but
cannot access Kit, files or game commands. `selected-lab/cargo_view.c` projects
ownership and review consequences; `native_ui.c` owns host display/export and
asset lifetime. Send seals cargo and stops exploration; Station acceptance ends the
expedition. Successful sealing returns to Cargo, and offline sealing waits.
Known migrated Cargo/Send/Discard/Finish routes fail explicitly rather than using manual fallback.
Discard selectors project the existing two-row window over all logical choices,
including forty quantities plus Keep. Logical focus, first visible row and local
widget focus are separate copied facts; the UI does not navigate or decide loss.
Review shows exact whole-item loss and remainder; Keep and Back retain the caller
and cargo. Finish is only available for an empty outing and sends nothing.
Storage failures close actions. This migration adds no rules or physical controls.

Cargo mode preview uses the same owned view with an explicit selector flag.
It shows current cargo or the accepted delivery record and always exposes zero
Cargo actions. Mode focus belongs to the rail, separately from remembered Cargo
action focus. Left/Right switches modes; Down or Confirm enters Cargo without
sending or discarding. Storage errors hide navigation affordances. Projection
rejects inconsistent mode/focus and the known route cannot fall back to raster
composition. Companions preview uses a separate lazy retained root with an owned
plain view of the selected revealed resident. Existing saved-art and form guards
own provenance and property disclosure; no live research is recomputed here.
Invalid selection fails the frame rather than falling back to manual drawing.
Resident list and visit workpieces reuse that tree with explicit screen tags.
List focus is the selected resident index; visit focus is the local command row.
Projection validates both against existing Kit authority. Both visit rows remain
visible; an unavailable visit is muted with visible focus and a reason. Global
storage error closes action/focus affordances. Entry never invokes a visit; a
separate fresh physical Confirm reaches the existing game command. Empty-list
Return to Probe is preserved; an impossible empty visit fails explicitly.
Immediate saved-at-Station/stale-cache feedback is retained without inventing a new
visit or reading live research. No manual Companion composition/fallback remains.

Flush-ready means the adapter has released the draw buffer. It is distinct from
the painted-frame acknowledgement used to authorize input, especially for an
asynchronous e-paper refresh. Area, stride, format and buffer lifetime must be
validated. Panel format conversion is permitted here; UI composition is not.

The complete host Dock family and display/host boundary are checked at5431f44.
The [bounded headless ESP-IDF compile](../../docs/evidence/native-dock-lvgl/ESP32.md)
contains the same shared Dock UI, pinned LVGL and partial-flush adapter atc3c8a6d;
ELF/map/static memory evidence is separate from hardware boot. [Current Companion shared UI compilation](../../docs/evidence/native-companion-esp/README.md)
passes separately at `fadee5d`; the current Station host families use LVGL as listed above.
Each slice requires
exact pushed source, actual native output, physical-control regression checks
and independent review. Final architecture acceptance audits all entry points:
no active manual compositor, silent fallback or full-screen legacy bitmap wrapper.
UI pool, assets/fonts, draw buffers and adapter storage are measured separately;
host memory success does not establish MCU fit or physical performance.

Shared margins, palette, font hierarchy, framing and focus styles belong in theme
tokens. Images use retained Gemini source pixels at native size with verified
alpha/channel conversion; no framework default skin or magnified coarse sprite
establishes HiBit quality. Current retained images are fixture/reference evidence.
Future creature detail follows the [algorithmic pipeline](../../specs/architecture.md#creature-production-pipeline),
with general style grammar and native-size generator calibration. Layout and
craft are separate gates; no per-creature manual master is required.

The proof's animation is finite and cosmetic, with a fully visible still focus
and explicit reduced-motion behavior. Sound has no selected backend or assets;
no playback is claimed. The first host uses one live UI context; two simultaneous
contexts are lifecycle-test scope. Controlled motion requires a single context
because LVGL has a global presentation clock. Owned buffers and object returns
are checked, but arbitrary upstream pool exhaustion is not a validated graceful
recovery path; fixed-pool margin must be measured, not assumed. Host memory measurements and tests do not establish
Companion DMA, frame rate, PSRAM fit, thermal or power performance. Dependencies
are pinned, vendored unchanged with upstream licenses and retrieved through Git;
no configure-time downloads or new deployment service.


## Station composition and assets

`render.c` dispatches supported standalone Station pages to retained LVGL trees and
serializes their RGB888 frames as 24-bit BMP. `kit_render.c` does the same for
connected device families; neither has a manual drawing fallback. Existing licensed
font sources, extracted Gemini UI assets and [Pip artwork](../../design/v1-pip/manifest.json)
are reused. Original references and extraction provenance remain retained in the
[asset manifest](../selected-lab/asset-manifest.json). Native rendering uses retained widgets,
copied presentation facts and source art. It is not a full-screen screenshot. Host scaling does not establish physical readability.

All known Companion screen families and the complete Dock family use the shared [LVGL UI integration](../../specs/architecture.md#native-ui-foundation).
Retained widget trees, shared layout/theme, source-exact native resource sprites
and a Vera glyph adapter belong to the host context; game/view state stays in the
Kit. The [Companions preview](../../docs/evidence/native-companion-resident-preview/README.md)
retains saved portrait/property/visits through offline inspection.
[Resident-list/visit controls](../../docs/evidence/native-companion-resident-actions/README.md)
use the same retained tree. Station Home and workspace previews also use retained
LVGL across standalone and connected frame routes; [native evidence](../../docs/evidence/native-lab-home/README.md)
records changed controls, copied-state and lifetime checks. Connected reception
and received expedition records now use a copied view and retained LVGL tree;
[native proof](../../docs/evidence/native-lab-reception/README.md) covers acceptance,
recovery, history disclosure and safe return. [Sample research and Library](../../docs/evidence/native-lab-research/README.md)
now use copied presentation facts and retained LVGL across standalone, generic
and persistent native routes. Focused `lab_research_ui_checks` preserve hidden
knowledge, explicit costs, saved findings and shared-context lifetime.
Research's copied view distinguishes aggregate Overview from an exact selected
sample and previews the focused Library record immediately. The narrow left rail
contains destinations; scientific facts, questions, costs and actions stay in
main. A separate validated heritage-plus-coat permission allows simultaneous
internal original-reference clips; complete portraits keep their existing gates.
B uses paired qualitative movement/effort labels with common conditions, never
measured performance. The retained tree reuses its original descriptors and one
root-local clipped draw object, with no new image backing. Presentation-only
`native_ui_research_reference_scale` selects1×/2× for native calibration after
the tree exists; it adds no device input, saved state or procedure. Changed fit,
disclosure and all-root memory require exact native proof before release.
[Creation, incubation, reveal, Habitat and residents](../../docs/evidence/native-lab-actions/README.md)
share a fourth retained Station tree, exact candidate/draft authority and saved original
portrait provenance.

The Habitat gallery reuses the two permitted original portrait descriptors through
standard LVGL half-scale draw tasks, one lightweight component in each existing
Home/action parent and one selected rim. Its copied view includes up to eight
revealed stable identities and their saved art permissions; there is no new asset
backing, registry or phenotype reconstruction. Native fit and the unchanged fixed
pool must be measured before release; host proof is not physical compatibility.
Standalone legacy acquisition graphics are retired; its command
and domain fixture remains available in [the target protocol](../selected-lab/README.md#three-device-mode). Focused `lab_action_ui_checks`,
`lab_reception_ui_checks`, `companion_cargo_ui_checks`,
`companion_probe_ui_checks` and `companion_resident_ui_checks` cover this boundary
alongside domain, Kit and presenter checks. Dock's exported LVGL output uses four
gray levels; no physical e-paper driver or refresh behavior is established.

The headless Cargo path uses still focus in the live presenter. A controlled
120ms LVGL focus-fade export exercises the animation API without changing game
time, readiness or inputs. It is animation evidence, not live scheduling or audio
playback. ESP32/RPi physical drivers, power and performance remain unvalidated.

The superseded standalone review presenter was removed after checking callers;
use `native/presenter/server.py` with `CRITTER_DEMO_BINARY` pointing at the selected
Station executable. The production path is the one exercised by HTTP tests and CI.

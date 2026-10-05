# Native connected game

`selected_lab` is the C17 host implementation of the connected Companion → Station
→ resident journey. It owns accepted game state, interaction, saves and native
frames. The browser presenter transports depicted physical controls and BMP
output. [V1](V1.md) explains how to play and its provisional Pip content;
[architecture](../../specs/architecture.md) explains the intended ecosystem. Visible product, Station and mibi labels follow [branding](../../BRANDING.md); existing protocol names and saved identities retain their technical spelling.

## Module responsibilities

- Domain modules validate gathering, research, creation, reveal and care effects.
- Kit owns device navigation, links, accepted projections and transfer recovery.
- View modules copy permitted facts and validated focus into plain UI records.
- `render.c`, `kit_render.c` and `native_ui.c` dispatch supported retained LVGL
  families and own host export/asset lifetime. No manual compositor fallback remains.
- The presenter serializes native commands, acknowledges painted frames and
  transports input. It does not decide gameplay, focus or screen layout.

Detailed [composition, assets and route coverage](../ui/README.md) belong to the
UI guide; this guide owns native interfaces, storage compatibility and recovery.

## Platform

The selected Station reference is **Raspberry Pi4 Model B**, with the Waveshare 7inch
HDMI LCD (H), 1024×600. The existing build is Linux **x86-64 host simulation** using
GCC, CMake and Ninja. It is not an ESP32/ESP-IDF executable, Pi emulation or a
verified ARM build. Physical HDMI/input integration, board boot and performance
remain untested. Companion and Caddy target ESP32/ESP-IDF. The shared current Dock
and Companion UI have [headless ESP-IDF compile proofs](../../docs/evidence/native-companion-esp/README.md).
These are compile results, not physical runtime, input, display or memory evidence.

Develop locally, commit and push, then fetch the exact clean revision through Git
on the established VM. Never copy loose source to bypass version control.

```sh
cmake -S native/lab -B native/build/lab -G Ninja -DCRITTER_BUILD_SELECTED_LAB=ON -DCMAKE_BUILD_TYPE=Release
cmake --build native/build/lab
ctest --test-dir native/build/lab --output-on-failure
python3 native/tests/test_selected_presenter.py native/build/lab/selected-lab/selected_lab
python3 native/tests/test_v1_journey.py native/build/lab/selected-lab/selected_lab native/build/lab/journey
```

The legacy `critter_lab` executable remains a separate earlier fixture. CI packages
the tested **selected_lab** executable and matching production presenter through
the established release path. Its packaged filename may be `critter_lab`; that
filename does not make it the legacy fixture.


## Physical-control contract

The current panel follows the [family reference](../../design/lab-controls/combined-family-materials.png):
directional cross at left, four labeled workspace keys, Back then Confirm at right.
No knob or clickable screen targets. [Experience specification](../../specs/experience.md#current-simulator-controls-and-mappings)
owns action mapping and safety. Native input requires a fresh press/release against
the visible ready revision; cancellation, overlapping presses and suspension cannot
carry an armed action into another workspace. Right is read-only navigation or
passive selection in the explicit Residents gallery and Resident activity.

Home Habitat previews the entire revealed saved population. Confirm or the
Habitat workspace key enters the four-column, two-row collection; Left/Right
selects a neighboring column and Up/Down the same-column row. Edges and absent
members clamp, and physical Back returns to Home Habitat. Selection changes only
the saved preview. Confirm enters the selected Resident safely on Population;
its navigation-only rail offers Population and Received expeditions (Explore in
the standalone fixture). Right focuses the separate Spend time together action,
Left restores Population, and fresh Confirm alone records care. Back restores
the selected gallery identity. No new game command or saved navigation format
is involved.
Named Resident navigation into Received expeditions uses a transient caller
distinct from arriving cargo. Back from record detail returns to its list; Back
from that list restores the same Resident and navigation choice. Station acceptance
and the immutable received records retain their existing authority.

The line protocol accepts `status`, `frame REVISION`, `ready REVISION`,
`cancel REVISION`, `suspend REVISION`, `resume REVISION`, and button phases such as
`up-down REVISION` / `up-up REVISION`. The ten button names are up, down, left,
right, research, critters, library, habitat, back and confirm. Legacy rotation is
not accepted. Frame responses contain byte count followed by BMP bytes; Python
and JavaScript do not decide focus, destinations or gameplay consequences.


## Three-device mode

Companion opens a retained three-destination home. Up/Down (or compatible
Left/Right) selects Probe, Cargo or Companions; Confirm enters without acting.
The entered Probe route list is vertical, matching Up/Down, while its active
map remains unchanged. Existing profile names share the current finite offers;
they do not promise different rewards. Cargo's visible sealing terms precede
one fresh Send. Station acceptance separately credits once and clears current source
cargo on both devices, even before receipt confirmation. Received records retain
historical amounts; the current Companion receipt pane does not repeat them.


`selected_lab kit-serve` is used by the deployed presenter. Device0 is Station,
1 Companion and2 Dock. `device ID status`, `device ID frame REVISION` and
`device ID INPUT REVISION` address distinct native contexts. Companion/Dock
`device ID link 0|1` is a simulation fault control, not a hardware action.
Legacy `serve` remains the single-device domain/input/save regression fixture;
its old mutation commands are unavailable in kit mode. Its EXPEDITION, CARGO and
DISCARD_REVIEW pages have no supported graphics. At a current revision, `frame`
returns `{"error":"Unsupported frame page"}` without a byte count or BMP data,
and the process continues to accept status and physical-input commands. Stale
frame requests retain their existing error precedence. Home, research/Library and
Station action pages remain supported LVGL frames. The Python journey captures the
same Samples stock header before and after legacy offload while retaining its
quantity, timer, control and restart checks. Connected Kit EXPEDITION/CARGO are
supported Station reception/received-record routes, not standalone acquisition UI.
Health/release routes remain compatible.

The presenter negotiates lossless gzip for native BMP responses and keeps raw BMP
available. HTTP/1.1 connections are reused; compression and response transfer run
outside the native command lock. Background polling is bounded and cannot queue
ahead of physical input. One frame fetch per device resolves to the latest native
revision; stale-frame rejection is retryable. Native interaction epochs retain valid time-only
repaint gestures and reject obsolete action meanings; stale input is never replayed. Down acknowledgement still precedes a separate release request,
and decoded/painted frames alone receive readiness acknowledgement. Transport,
overlap and blur checks live in `bridge.test.mjs`; HTTP encoding/reuse checks live
in `test_selected_presenter.py`. These changes do not establish radio latency.

The same game save gains `.kit` and `.kit.required` sidecars. Preserve all files
together: the first is the atomic transfer/cache journal; the marker prevents
silently replacing a missing journal after a transfer. Do not delete a sidecar
to bypass recovery. The simulator runs one host process and logical wireless
exchange, with no claim of independent endpoint stores or physical radio tests.
`three_device_kit_checks` covers ownership, interruption, duplicate acceptance,
restart at commit intent, required-journal loss and monochrome/native dimensions.


Device-input POST may include `ready: true` only on a physical down carrying
its painted revision. Python validates the whole request, executes READY/down
under one bounded native lock and returns the down result. Up is never part of
that sequence. Kit READY uses the same minimum/current interaction range as Station;
semantic refresh still invalidates earlier frames. Native kit tests cover delayed
acknowledgement after a time-only repaint and rejection after navigation.


## State and recovery

The current simulator presents Station, combined Companion and Dock together, with
separate native frame/control contexts at1024×600,450×600 and792×272 four-gray.
One C17 host aggregate remains the simulation authority: existing expedition
fields are Companion-owned carried cargo; stock, samples and residents are the
Station-accepted world. Only Companion controls start expeditions. This does not
claim separate MCU processes, endpoint storage or radio firmware.

The native kit adapter seals an immutable haul snapshot in an atomic sidecar.
New seals contain only whole awarded supplies; retained source remainders and
frozen legacy preparation stay on Companion. Simulated arrival opens Station reception once,
never acceptance. The input module captures/restores navigation only, without
restoring world state, clocks or armed gestures. A fresh Confirm accepts the haul.

Acceptance first persists its exact game sequence and haul ID. Map acceptance
uses journal version5 and command25 (FIELD_UNLOAD), storing whole supplies, an
explicitly collected capsule and the sanitized received record atomically, then
ending the source expedition. Legacy timed outings retain command16 and their
original recovery branches. An early return never earns a completion sample.
Preparation and committed chance state remain on Companion for a later outing;
neither is cargo. Matching receipt closes transport metadata, not a second award
or continuation.

Journal versions1/2/3 remain readable. Reserved COMMITTING intents replay their
original commands3/11/14 and exact fingerprints before any newer mutation. Version3
early acceptance retains its historical source identity until receipt; its empty
route can then explicitly Finish. Fresh unreserved legacy acceptance may reserve
command16, converting its raw supply encoding atomically before ending the route.
Version4 receipt validation expects the source route already ended. An empty
outing can Finish without a phantom haul, sample or extra chance draw. The next
outing gets a new identity; no Continue action follows an accepted unload.

Historical version2 game saves append separately persisted gathering preparation, chance
state, attempted/awarded classes and a legacy-encoding flag. The decoder checks
the original version1 payload/checksum and retains its raw semantics until an
existing receipt intent is resolved or new acceptance converts atomically.
Conversion preserves whole Station/carried portions and translates historical
residues into retained preparation data, without awarding an item. Legacy field
clocks are frozen in the current proof; their remaining cargo can be returned.
Progress never occupies
cargo capacity or pays a cost. New inventory is multiples of the internal100
encoding for each indivisible item; [V1](V1.md) owns fixture
current provisional source contents and costs. Saved outcomes prevent restart/retry rerolls.

Core V1 version3 appends parallel research and individual-art metadata after
the complete frozen version2 payload, including its original tail padding.
Version1/2 lengths and checksums are validated before read-only conversion;
committed old samples retain their five-study content. First-ever acceptance
through command16 after upgrade pins current A/B content, including a still
uncommitted older arrival. Its haul fingerprint and receipt retry remain unchanged.
New commands17/18 bind sample identity, content version and method/candidate;
required evidence and disclosed support authorize creation. The domain owns
stock, unused material, exact genome/expression and retained original-art hashes.
The connected research/creation view is implemented in Core V1. Old binaries
cannot read version3 or the appended current version4 layout.

Version4 appends local field state and a sixteen-record received-log ring after
the frozen 8040-byte V3 payload. Exact V1/V2/V3 lengths and checksums are checked
before zero-extension. Field state pins geometry/content, legal and hidden paths,
position, visited/inspected places, trace/capsule identity, finite source budgets
and results. Commands19–24 bind deliberate field actions; actions after Start
also bind the expected expedition ID. Current field-content version3 reuses that
saved layout with finite whole-unit source quantities. Appended command26
(FIELD_TAKE) binds outing, source and previewed quantity; validated acceptance
atomically credits cargo and decrements that retained source. Inspection, ticks,
rendering and selection do not award items. Legacy field-content1/2 remain frozen
and returnable; loading does not convert their attempts into new pickup units.

Received records contain walked paths, visited places, accomplishments, whole
accepted contents and acceptance time/identity. The Station projection excludes the
away avatar, preparation, active source and unrevealed sites. The ring is bounded
host retention, not a permanent cloud archive; receipt idempotency remains
independent of whether a history row has rotated out.

Restart reconciles the exact intent before allowing another mutation. A matching
operation ID alone is insufficient: the command fingerprint must also match.
Missing required sidecar, corruption, mismatched cargo or durability uncertainty
fails closed, preserving files. Keep backups of save and sidecars together before
conversion; old binaries cannot read the new layout. This host fixture is not a
production radio format, endpoint migration framework or rollback-save promise.

Wireless controls outside the shells independently interrupt Companion and Dock
links. Dock retains a timestamped accepted-world projection while offline and
catches up after reconnect; it never owns a second inventory or awards rewards.
The Kit sidecar stores a version2 envelope around the unchanged 160-byte
transfer journal, bounded revealed-resident cache, sealed field record and
Companion's own acknowledged capsule count. Bare journal versions1–4 and the
original version1 envelope
must pass their original exact-size/checksum/policy checks before migration;
the wrapper independently checks its version, length, checksum and cache records.
Transfer command IDs, fingerprints, intent reconciliation and required-file marker
retain their existing semantics. Keep this envelope with its matching world save.
The prototype supports eight accepted own capsules; that local receipt history
pins sample eligibility at outing start, rather than querying live Station capacity.
Later trips can gather supplies only. Acceptance independently rejects a full
sample shelf atomically, preserving sealed results. This host limit is not final
capacity, a field sensor, or an inventory disposal mechanic.

The resident cache records saved individual/source IDs, genome/expression,
original art metadata and visit count, with snapshot time/world revision. It
contains no unborn resident. Companion reads only this accepted projection and
resolves a connected visit by exact ID through existing `CARE_VISIT`; pending
transfer states block visits. Offline inspection is stale and read-only, with
no queued mutation. Station and Companion share the accepted count; Dock's accepted
visit total and freshness are also persisted in the envelope. Projection writes
publish only after successful save. Failure retains the older in-memory snapshot
as stale; a successfully accepted world visit is not repeated to repair it.
Restart reads the snapshot actually retained on disk; reconnect refreshes without
issuing another visit. This is a host cache boundary, not separate endpoint/radio
persistence or a new care/needs mechanic.
Cloud/charging are unavailable, and Print/Feed are explicitly simulated feedback.
Production distributed receipts still need independent endpoint persistence,
authentication, pairing, delivery ordering and radio failure validation.

Radio choice remains open. The current Pi4 and ESP32-S3 references support Wi-Fi
and BLE; neither supplies native802.15.4/Zigbee in the selected profile. Zigbee
would need additional suitable radio hardware. No radio stack, BOM or connector
is selected by this simulator. [Device references](../../specs/devices.md) remain hardware
authority. Native APIs expose logical device input and link availability only.

Simulator presentation keeps one ordered native authority. HTTP/1.1 reuses
connections; negotiated gzip reduces BMP transfer losslessly after the native
pipe lock has been released. Each browser device has one frame request plus its
latest desired revision, and at most one disposable background status poll.
Polling never joins the ordered input queue. Older status responses cannot regress
the current revision; stale-frame rejection permits a later retry. Fresh physical
down/up edges remain separate acknowledged requests. Lost down acknowledgement,
overlap or suspension discards unsent releases; native interaction epochs decide eligibility during refresh; stale actions
are consumed instead of replayed. Readiness follows actual decode/paint, never status alone.
The single-host presenter explicitly refreshes/paints cleared Companion cargo
before exposing a new accepted Station stock frame. Current inventory is zero at the
atomic accepted unload, including pending receipt; sent contents remain a separate
read-only delivery record. A consumed gesture during the update receives visible
feedback and never queues. This join does not establish a real disconnected-radio
protocol or synchronized future hardware displays.
Rejected POSTs with unread bodies close their connection. No kernel pool,
WebSocket dependency or production radio transport is implied by this host bridge.


Companion/Dock frame readiness accepts an actually painted revision within the
current interaction's minimum/current range, matching Station. A time-only repaint
between frame download and ready acknowledgement does not invalidate the action;
a semantic change advances the minimum and rejects the earlier frame. Physical
down requests reassert painted readiness atomically before down under the same
native pipe lock. Release remains a separate request after acknowledged down.
This prevents another ready acknowledgement from interleaving that prefix/down;
it does not establish independent clients' concurrent hold ownership.


## Resetting the simulator sandbox

The presenter has one **Reset sandbox** control above the device shells. Confirming
starts a fresh native game across Station, Companion and Dock, with the fixture's
default links and stock. This is simulator administration, not a device button or
hardware reset. Other connected browsers reconnect when the sandbox changes;
held input, queued releases and old frames cannot carry into the fresh game.

Before starting the new process, the presenter stops native under its command
lock and moves the configured save, `.kit`, `.kit.required` and any corresponding
`.tmp` files into a uniquely named `<save>.reset-<id>` sibling directory. It keeps
session and storage lock files at their original paths. The response identifies
the backup directory. Backups are retained until the operator disposes of them.
There is no browser restore or arbitrary file-management endpoint.

If fresh startup fails, the presenter restores the old files and checks all three
devices before serving them again. Failed new files are retained in the backup
with `.failed-new` suffixes. A failed rollback leaves native transport unavailable;
stop the presenter and restore the matching save and sidecars together from the
backup before restarting. An interrupted multi-file move also requires that
operator recovery. Do not combine files from different worlds or delete the
required marker to bypass recovery. After any unconfirmed reset, reload to verify
state before playing. The focused check is
`python3 native/tests/test_sandbox_reset.py [path/to/selected_lab]`; supplying the
binary exercises the actual three-device fresh state, old-input rejection,
backup sidecars and persistence after restart.

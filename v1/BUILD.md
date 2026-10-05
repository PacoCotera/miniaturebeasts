# What can be built today

The buildable game is a native Linux host simulation of the connected Companion,
Station and Caddy journey. Start with [builder getting started](docs/builders/getting-started.md),
then use the [native build/run guide](native/README.md) and [play guide](native/selected-lab/V1.md).
The repository contains specifications, source and art; it cannot yet produce a
complete physical kit.

| Component | What exists | Remaining boundary |
| --- | --- | --- |
| Connected game | C17 gathering, return, research, supported genome selection, incubation/reveal, resident visits and durable saves | Pip fixture breadth/balance; capture/training, ecology, richer discovery and independent device authority. |
| Native screens | Retained LVGL for all supported Station, Companion and Dock host families; physical-control/native-frame checks | Canonical art, human usability and physical runtime. [Route/target coverage](native/ui/README.md#screen-coverage-and-target-evidence). |
| Station | Linux x86-64 executable with GCC/CMake/Ninja; Raspberry Pi4 reference | ARM build, HDMI/input adapters and board performance. |
| Companion | [ESP32-S3 shared-UI headless compile/link target](native/companion/README.md) | Runtime allocation/profile, panel/input/game/save/radio adapters and board proof. |
| Caddy | [ESP32-S3 shared Dock UI headless target](native/caddy/README.md), four-gray host frames | Physical panel/printer/input/charging, storage and radio. |
| Genome/art authoring | Guided host workspace, versioned source/replay, explicit Google API rendering and retained original prompts/images | Partial consumers, broad anatomy, faithful masters, animation/sharing and game integration; OpenAI unconfigured. [Evidence](prototype/generator-workbench/evidence/api-rendering/README.md). |
| Other host studies | [Isolated experiments](prototype/README.md) and legacy nRF Probe scaffold | These do not form another integrated game or current portable firmware. |
| Cloud/mobile | Optional global-service roles and mobile fallback | Production services, authentication, synchronization and mobile implementation. |
| Website | Product introduction under `website/` | Separate from game clients and physical-kit proof. |
| Electronics/cases | [Development profiles and physical constraints](specs/devices.md), original concepts | Schematics, measured budgets, editable CAD, fabrication and repeatable assembly. |

The intended kit is one combined Companion, one home Station and one shared Caddy;
Probe is a mode. Current native output is1024×600 Station,450×600 Companion and792×272
four-gray Dock. Older separate-Probe and368×448 Companion builds are legacy
evidence, not current profiles. Host behavior, MCU compilation and physical
measurements establish different facts.

Use the existing installed toolchains and [release pins](native/toolchains.env).
Build commands and CI packaging are in [native](native/README.md); source,
executable and presenter must match one committed revision. Save worlds and their
sidecars outside release bundles and back them up together. The
[release guide](native/UPDATER.md) separates tested bytes from persistent state;
[deployment changelog](CHANGELOG.md) separates hosting and native activation.

Hosting `/`, `/genome/` and `/sandbox/` does not replace the native game binary or
reset saves. The [guided authoring proof](prototype/generator-workbench/evidence/guided-authoring/README.md)
records its separate host behavior. [Status](STATUS.md) identifies implementation
and delivery evidence; buildability does not settle open product designs.

Before hardware investment, the [connected software proof](specs/devices.md#software-proof-before-hardware-investment)
must demonstrate the game and human play must establish comprehension/value.
Reference parts and renders do not establish production manufacture or measured
hardware feasibility.

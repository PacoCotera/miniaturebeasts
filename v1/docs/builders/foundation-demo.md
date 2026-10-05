# The expedition foundation experiment

This experiment asks whether a small portable game domain can carry an outing home, accept its supplies once and retain a research finding. It is a technical foundation for the later connected simulator, rather than a description of current exploration or hardware.

The fixture begins with a Lab-selected Material trail. A separate Probe advances simulated time, may inspect a clue, finishes the outing and sends a haul. Lab spends one unit of supplies on Structure study; reopening preserves that finding and the remaining inventory. These authored names, timings and quantities belong to the fixture. Current play starts exploration on the combined Companion and supports a longer research-to-resident journey: see the [discovery walkthrough](../../design/sample-to-critter-walkthrough.md).

## What the experiment isolates

| Part | Responsibility |
| --- | --- |
| Portable C domain | Legal commands, expedition progress, inventory and research transitions |
| Portable renderer | Bounded native rows, fonts and device images |
| Linux adapter | Command protocol, versioned saves, retry handling and BMP output |
| Python bridge | Authenticated, serialized subprocess transport |
| Browser presenter | Native frames and available commands; no duplicate game rules |
| MCU scaffolds | Compile and invoke shared domain/renderer code without proving physical peripherals |

The Lab and Probe state share one local snapshot. Accepting the haul is a local atomic operation; it does not demonstrate distributed delivery, radio or independent offline storage. Requests carry a displayed revision and operation ID. Exact retries retain the accepted result, changed payloads reject, and unsupported or corrupt saves fail closed. Saves are explicitly encoded and atomically replaced rather than written as raw C structures.

The Linux executable runs application logic; it does not emulate an MCU. Cross-compilation demonstrates language, linkage and static fit. Host images cannot establish display refresh, power use, thermal behavior, peripheral operation or usability on a real board. Original separate-Probe and display studies remain experiment references, rather than frozen product profiles.

## Use and evidence

The [native guide](../../native/README.md) explains the available executables and source boundaries. The [build coverage](../../BUILD.md) identifies actual software evidence and open physical checks. The [current simulator guide](../../native/selected-lab/README.md) owns the integrated state, controls and recovery behavior; this foundation page does not duplicate its commands.

Fixed demo authentication is not production player isolation or device authorization. Secrets and mutable saves remain outside source and release files. The experiment ends at a retained finding: it does not create an individual, establish complete genomic knowledge or validate the full game experience.

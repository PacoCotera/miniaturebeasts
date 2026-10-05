# Devices

Miniature Beasts is meant to be played on a small family of physical devices that
give each part of the game its own place: a portable device for going out, a home
device for research and life with mibis, and a shared dock. Nothing physical has
been built or measured yet.

## The family

**Decided:** three devices. Probe is a mode of the Companion, not a fourth device.

| | Companion | Station | Caddy |
| --- | --- | --- | --- |
| Role | Portable: explore (Probe mode), carry finds (Cargo), spend time with a travelling mibi (Companions) | Home: research, creation, incubation, residents, habitats, families | Shared dock: charging, quiet collection summaries, printing |
| Software profile | 450×600 portrait, color | 1024×600 landscape, color | 792×272, four-gray e-paper |
| Reference hardware (**Proposal**) | Waveshare ESP32-S3 AMOLED 2.41" (8 MB PSRAM, 16 MB flash, Wi-Fi/BLE, motion sensor) | Raspberry Pi 4 with a 7" HDMI panel | ESP32-S3 module with a 5.79" e-paper panel and a 58 mm thermal printer |

**Working rules:**
- Docking, charging or tapping never accepts cargo, transfers a mibi or awards
  anything.
- Devices connect wirelessly, with no custom data connector.

**Open:** display technology, final controls, sensors, battery and charging, the
printer, the reader (NFC, QR or none), dimensions and enclosures.


## Look and construction

The family appearance reference is the sage Station, stone Companion and shared
Caddy in [`hardware/concepts/device-family/`](../hardware/concepts/device-family/).
The direction for the bodies is warm, rugged, two-thumb handhelds with protected
edges, simple shell splits, common fasteners and a rear service cover (**Proposal**).
Concept renders show:
- old names;
- knobs;
- a separate Probe device;
- capture and training screens.

They are appearance references, not decisions.

## What has been proven

**Built in v1:**
- Host simulation of all three screens and their controls.
- ESP32-S3 compile and link of the Caddy UI (about 470 KB).
- ESP32-S3 compile and link of the Companion UI. At about 1.4 MB it outgrew the
  default 1 MB partition, so it needs a larger partition without over-the-air
  updates.
- Toolchains are pinned: ESP-IDF 5.5.5, plus Zephyr for a legacy nRF52840 Probe
  build kept only as a fixture.

**Not proven:**
- Nothing has run on a board.
- No measurement of display refresh, input, radio, storage, printing, charging,
  power, heat or runtime memory.
- Renders and simulation do not establish feasibility.

## Order of work

**Working rule:** prove the game in software, then playtest with people, before
spending on circuit boards or enclosures. If dedicated hardware turns out not to
be worthwhile, the same game must be able to run on a phone.

Hardware gates, in order (**Proposal**):

1. Rehearse pins, buses, voltages and physical envelopes before committing a board
   or case. Keep board and case in one dimensioned model.
2. Measure display, input, printing, storage, radio and power under realistic
   combined load.
3. Exercise interruption, restart, removing and reseating in the dock, and fault
   behavior.
4. Recheck heat, radio, sensing and readability inside real enclosures.
5. Write repeatable assembly, programming and service instructions.

Throughout, learning KiCad and getting a working physical console stay central to
the hardware track.

## Targets to confirm

**Working rules** from earlier specs, not recently confirmed:
- A small batch of ten complete kits.
- A maximum retail price of US$750 for a full kit, aiming lower. This is not a
  parts budget.

## Open questions

- Is the Companion's display and battery feasible for the exploration design once
  that design exists?
- Which reader, if any, lets paper and nearby kits interact?
- Does printing need the Station docked, and is printing part of play or only
  keepsakes?
- Can the Caddy charge both handhelds safely?
- Where does creature rendering run: Station only, or on the Companion too?
- Sensors: does the Companion need any, given the world is fictional?

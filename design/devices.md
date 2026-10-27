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
| Reference hardware (proposed) | Waveshare ESP32-S3 AMOLED 2.41" (8 MB PSRAM, 16 MB flash, Wi-Fi/BLE, motion sensor) | Raspberry Pi 4 with a 7" HDMI panel | ESP32-S3 module with a Waveshare 5.79inch e-Paper panel ([the Caddy's panel](#the-caddys-panel)), a 58 mm thermal printer, and per cradle a hall sensor (seat sensing) and an RGB lamp ([the cradles](#the-cradles-seat-sensing-and-lamps)) |

**Decided:**
- **Software stack.** Station runs Linux on a Raspberry Pi; Companion and Caddy are
  ESP32. Firmware is native, with no MicroPython or Arduino. **Revised 2026-10-08**
  ([technical architecture](proposals/technical-architecture.md)): the Station's
  hardware is the Pi 4 and will not grow, its runtime is an LVGL 9 face in C with the
  logic run headless by Node beside it, no browser (a browser on the Pi was
  withdrawn), and no hardware prototyping starts until the
  loop is complete in software; the Companion
  and the Caddy draw through LVGL 9 with an indexed renderer for the world view,
  ported once the loop is stable on the sandbox.
- **Station.** A two-thumb handheld (held a bit like a Nintendo Switch) that also
  plays on the table without picking it up. It stays at home on Wi-Fi, and its
  screen is always on, showing the collection and a vivarium.
- **Charging and connection.** Handhelds are charged and ready when lifted from
  the Caddy, typically for about 30 minutes away. Everything is wireless, with no
  connectors.
- **Building.** Cases are 3D printed in small batches on a Prusa CORE One, which
  means the Caddy is printed in parts. Assembly uses common tools; larger
  hand-designed boards are fine.

**Working rule:** docking, charging or tapping never accepts cargo, transfers a
mibi or awards anything.

**Who draws, who brokers** ([art pipeline](proposals/art-pipeline.md)). The Station draws every mibi from its species' painted keys and its trait layers, and derives the Companion and Caddy versions; the Companion never renders or calls out. The Caddy brokers a mibi's portrait, painted at its sitting, and keeps every portrait forever on its card (an SD card) and syncs it, so a sitting needs the Caddy reachable from the Station over Wi-Fi. Creature rendering runs on the Station only.

**Open:** final controls, sensors, battery and charging, the
printer, the reader (NFC, QR or none), dimensions and enclosures.


## The cradles: seat sensing and lamps

Each cradle gets seat sensing and a lamp; sound and haptics come later. The Caddy has two cradles, one shaped for the Companion and one for the Station, so a cradle names the device seated in it. Docking must feel like magic across the three devices ([dock moments](../specs/dock-moments.md) §4): the Caddy knows a handheld is seated, lights its cradle, and tells the Station within about 0.5 s. The event the Caddy sends is in [technical architecture §4.4](proposals/technical-architecture.md#44-the-dock-seated-and-lifted).

**Seat sensing: a magnet in each handheld and a hall sensor under each cradle.**

| Method | For | Against | Verdict |
| --- | --- | --- | --- |
| **Magnet and hall sensor** | Independent of charging: it reads true with a flat battery, a full battery (when a charger may stop transferring power) and a charger fault. A level, not an edge, so the Caddy knows the truth again at boot. Reacts in microseconds. Omnipolar, so the magnet's orientation cannot be assembled wrong. The same magnet gives the seat a small pull, which helps the coil line up | One magnet per handheld and one sensor per cradle. The magnet must stay clear of the charging coil's ferrite and be measured in the real shells (gate 4) | **Chosen** |
| Charging-coil status | No extra parts | Depends on a charger chip not yet chosen ("Can the Caddy charge both handhelds safely?" is open). Presence is seen only while power is offered: a full or flat battery, foreign-object detection or a fault can read as "lifted". Detection takes one ping cycle or more | Kept as a second reading, never the event's source |
| A contact | Simplest electrically | Everything is wireless, with no connectors (above). Contacts wear, corrode and bounce | Rejected |

- **Sensor:** one digital omnipolar hall-effect switch per cradle, TI DRV5033 (always on, 2.5–38 V, open-drain output with a pull-up to 3.3 V, about 3 mA). The Caddy runs from the wall, so an always-on part's draw does not matter, and it avoids a low-power part's sampling delay.
- **Magnet:** one axially magnetised neodymium disc (about 6 × 2 mm, N42 or stronger) in the back of each handheld, opposite its cradle's sensor, offset from the receiver coil and outside its ferrite. Distance through the two shell walls about 3–4 mm. The field at the sensor must clear the sensor's operate point with margin; this is measured at gate 2 before the shell is fixed.
- **Wiring:** each sensor's output to one RTC-capable GPIO of the ESP32-S3, read by interrupt on both edges and by level at boot.
- **The second reading:** once the charger chip is chosen, its status line per cradle is read too. It is logged beside the hall reading and used for diagnosis (seated but not charging), never to make or cancel a seat.
- **The Companion's motion sensor** can feel a lift a moment before the Caddy does, but the Caddy's sensor is the one source of the event, so the three devices never disagree about whether a handheld is seated.

**Cradle lamp: one RGB LED per cradle, behind a diffuser.**

- **Part:** a top-view common-anode RGB LED in a 1.6 × 1.6 mm package per cradle (the exact part is fixed at gate 1 with the board's footprint), seen through a frosted, matte light window in the cradle's face so it reads as a soft glow, not a bright dot. RGB because the lamp's colours and brightness for each state are the art direction's to give, not the board's to fix.
- **Drive:** each channel sunk directly by an ESP32-S3 LEDC PWM output through its own resistor, at most 5 mA a channel, PWM at about 5 kHz so it never flickers on a camera. Three LEDC channels per cradle, six of the S3's eight. Fades (doors, rails and lamps move in 200–400 ms, [style guide](style-guide/README.md)) are LEDC's hardware fade.
- **Behaviour:** the lamp lights at a seat and goes out at a lift ([dock moments](../specs/dock-moments.md) §1–2), driven by the Caddy itself at the same instant it sends the event, so it never waits on Wi-Fi. Its colours, levels and any other states are given by the art direction; the firmware takes them as data.
- **Power budget:** a lamp at full white is at most 3 × 5 mA at 3.3 V, about 50 mW; both lamps about 0.1 W. The two hall sensors about 20 mW together. Sensing and lamps together stay under 0.15 W, small beside charging two handhelds.

**Deferred: sound and haptics.** Sound and music are musts, scheduled later, and a speaker is reserved on the Companion. No other device has a speaker or amplifier, and there is no vibration motor or driver in the Companion. Nothing else is reserved on a board for them yet; when they are wanted, they are placed at gate 1 with the rest of the pins. The seated and lifted events already carry what a sound or a buzz would be keyed on.

**Not measured:** none of this has run on a board. The magnet's field at the sensor, the sensor's behaviour beside a live charging coil, the lamp's look through the printed window and the 0.5 s from seat to Station are measured at gates 2–4.

## The Caddy's panel

The Caddy's reference panel is the [Waveshare 5.79inch e-Paper](https://www.waveshare.com/5.79inch-e-paper.htm): 792×272, 0.1755 mm pitch (144 dpi), two SSD1683 controllers in cascade, SPI. The module (SKU 26892) goes on the bench and the raw panel (SKU 26843) on the board. The second source is the Good Display GDEY0579T93, very probably the same glass.

- **Four grays only on a full refresh.** The vendor's partial refresh takes a one-bit image, so everything repainted by a partial is black and white; the four grays come from a vendor waveform loaded for a full-screen refresh.
- **Refresh.** Full about 3.5-4 s, with a flash; partial about 0.8 s. A full refresh after about 5 partials, and at least once a day. The picture stays with no power.
- **No front light.** None exists for this panel; the cradle lamps carry the dock in the dark.
- **Driver.** No ESP-IDF component exists; the vendor's [C driver](https://github.com/waveshareteam/e-Paper/blob/master/RaspberryPi_JetsonNano/c/lib/e-Paper/EPD_5in79.c) is ported behind an ESP-IDF SPI master and LVGL 9's flush.

**Not measured:** these are vendor figures ([manual](https://files.waveshare.com/wiki/5.79inch-e-Paper-Module/5.79-inch-e-Paper-user-manual.pdf), [wiki and FAQ](https://www.waveshare.com/wiki/5.79inch_e-Paper_Module_Manual)). The four-gray full refresh time, ghosting after 5 and 10 partials, and the gray values at 15, 25 and 35 °C are measured at gate 2.

## Reference bill of parts

Proposed: what the reference hardware is made of, by device, as far as it is chosen; quantities per kit. No prices here.

| Device | Part | Qty | For |
| --- | --- | --- | --- |
| Companion | Waveshare ESP32-S3 AMOLED 2.41" board (8 MB PSRAM, 16 MB flash, Wi-Fi/BLE, motion sensor) | 1 | Its screen, logic and radio |
| Companion | Neodymium disc magnet, about 6 × 2 mm, axially magnetised | 1 | Seat sensing in its Caddy cradle |
| Station | Raspberry Pi 4 | 1 | Its logic and face |
| Station | 7" HDMI panel, 1024×600 | 1 | Its screen |
| Station | Neodymium disc magnet, about 6 × 2 mm, axially magnetised | 1 | Seat sensing in its Caddy cradle |
| Caddy | ESP32-S3 module | 1 | Its service, Wi-Fi, BLE, sensing and lamps |
| Caddy | Waveshare 5.79inch e-Paper, 792×272 (module SKU 26892 for the bench, raw panel SKU 26843 for the board; second source Good Display GDEY0579T93) | 1 | Its screen |
| Caddy | 58 mm thermal printer | 1 | Printing |
| Caddy | SD card | 1 | Portraits and the service's data |
| Caddy | TI DRV5033 omnipolar hall-effect switch, with its pull-up and decoupling | 2 | Seat sensing, one per cradle |
| Caddy | Common-anode RGB LED, 1.6 × 1.6 mm, top view, with three resistors | 2 | The cradle lamps, one per cradle |
| Caddy | Frosted light window, printed or stock | 2 | The lamp's glow in each cradle's face |

Not chosen yet, so not listed: batteries and charging (the coils and the charger chips), the Caddy's power supply, controls, the reader, cases and fasteners.

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
spending on circuit boards or enclosures.

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

## Targets

**Decided:**
- A first batch of ten complete kits.
- Affordable: a maximum retail price of US$750 for a full kit, aiming lower. This
  is not a parts budget.
- If dedicated hardware doesn't work out, the game becomes a mobile app.

The first markets are Mexico, the US and Canada.

## Open questions

- Is the Companion's display and battery feasible for the exploration design once
  that design exists?
- Which reader, if any, lets paper and nearby kits interact?
- Does printing need the Station docked, and is printing part of play or only
  keepsakes?
- Can the Caddy charge both handhelds safely?
- Where does creature rendering run: Station only, or on the Companion too?
- Sensors: does the Companion need any, given the world is fictional?

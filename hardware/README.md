# Hardware

Miniature Beasts is played on a small family of devices:

- **Companion**: the portable field device for exploring, carrying discoveries and
  spending time with a travelling mibi. Probe is one of its modes, not a separate
  device.
- **Station**: the home device for research, creation, residents and families.
- **Caddy**: the shared dock that charges both, shows quiet summaries and prints
  records.

Nothing physical has been built or measured yet. The software uses display
profiles (Companion 450×600, Station 1024×600, Caddy 792×272 four-gray) and
compiles the Companion and Caddy UI for the ESP32-S3; neither choice is a
hardware commitment. Display technology, controls, sensors, power, charging and
printing are open.

## What is here

| Folder | What it is | Status |
| --- | --- | --- |
| `concepts/device-family/` | Appearance and construction studies for the three devices, with exact generation prompts, sizing sketches and ergonomics notes | Concepts and original references |
| `concepts/enclosure/` | Early console-and-sampler enclosure concept | Original reference |

The sage Station, stone Companion and shared Caddy image
(`concepts/device-family/combined-family-materials.png`) is the current family
appearance reference. It does not fix dimensions, controls or electronics.
Firmware, schematics and enclosure sources will live here as the physical kit
develops.

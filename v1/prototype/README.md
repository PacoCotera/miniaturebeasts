# Host experiments

Developer reference. These are separate local experiments with authored inputs, not the complete game or approved screen designs. Use the [setup guide](../docs/builders/getting-started.md) for installation, data locations and optional LAN access.

| Experiment | Entry point | Scope |
| --- | --- | --- |
| Breeding and sharing | `/` | Saved inheritance, sample activation and individual share cards |
| [Founder Lab](lab/README.md) | `/lab/` | Fixed founder outcome, research navigation and interrupted-save recovery |
| [Transfer](transfer/README.md) | Headless demo; `/transfer/` for screens | Whole-haul consistency and independent status presentation |
| [Saved-record compatibility](compatibility/README.md) | Headless demo | Preserve identity, stored bytes and portrait hashes |
| [Pixel renderer](pixel/README.md) | Export command | Static indexed frames |
| [Retained portrait job](generation/README.md) | CLI | Original Pip bytes, controlled facts and exact replay |
| [Genome workbench](generator-workbench/README.md) | `/genome/` on the public origin | Guided authoring, structure and retained render proposals |
| [Hosting gateway](platform-server/README.md) | Node process | Separate website/workbench/native routing and metadata |

## Try breeding and sharing

1. Inspect the two starter critters and their forecast.
2. Complete the labeled research fixture, inspect its comparison and toggle Mist Thread for the next incubation. Its evidence is supplied data, not sensor readings.
3. Start incubation, then use the developer hatch action. Incubation saves the sample spend and resolved inheritance; there is no unattended game timer.
4. Reload and inspect the same offspring and saved parentage.
5. Choose **Share / print individual card**. Its dossier distinguishes individual ID, family, expressed and carried traits. Opening it does not add a critter to a collection.
6. Preview the print layout before printing. The provisional 72 mm content width and 38 mm QR are not physically calibrated. The real QR and portrait must load before the print dialog opens.

One research pack is available per reset; breeding without a sample is possible. This older sample-activation experiment does not define the newer founder research rules.

## Appearance and idle study

At `/review.html`, inspect research, forecast, hatch and dossier scenes in color, monochrome or six-color mode. Eight appearances belong to one placeholder family. The optional 800 x 480 CSS-pixel area is a layout study, not a selected panel resolution.

Automatic idle is off by default. When enabled, it begins after 30 seconds without input and changes scenes every 12 seconds; both are provisional. Hidden/unfocused pages pause timers, held inputs defer idle, and the first wake gesture only restores the prior view. Reduced-motion preferences suppress CSS animation. Palette previews do not model physical display refresh or advance gameplay.

## Data and implementation boundaries

Resolved inheritance, sample activation, parent snapshots and rule/random versions are saved once. Exact retries preserve the result; conflicting input and spent samples fail. New hatches retain provisional color/monochrome SVG portraits; legacy records fall back to stored expression. Production migration is not implemented.

Share records expose selected fields, validate birth consistency and reject conflicting replacement. They do not authenticate provenance, grant ownership/breeding permission, reward scans or evolve critters. Public links depend on the local server remaining available. Printing and phone scanning still need physical verification.

`discovery.mjs` is an unconnected novelty classifier for individuals, families and expressed trait/value pairs. It ignores carried traits and label changes and rejects conflicting snapshots. It grants no rewards or rights; its trait scope is provisional.

The loaded application computes locally; cold offline installation is not implemented. Firmware, sensing, cloud authority and real hardware behavior are outside these experiments. Run `npm test` for host checks, or use the focused commands in each component README.

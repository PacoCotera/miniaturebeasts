# Pip genetics proof

The separate [generator workbench](../generator-workbench/README.md) now consumes
this unchanged engine through a local editor, causal projection and diagnostic
schematic. The proof itself remains independent of game/device presentation.

This is a separate host proof for the proposed Pip genetic-content contract. It is not connected to the live app or to the older `prototype/genetics.mjs` draft, which remains in use by that experiment. Nothing here creates an individual, assigns ownership, spends resources, draws screens, calls a model, or proves hardware behavior.

The proof separates authored content in `content.mjs` from pure operations in `engine.mjs` and report generation in `report.mjs`. It covers the Pip class baseline, the fixed inherited baseline modules and appearance copies, and the five variable loci `C`, `R`, `P`, `M` and `E`. The 243 unordered combinations are a valid-genotype coverage space, not a sample's support list or a population distribution. `PIP_SAMPLE` separately lists two supported candidates.

Only the exact declared healthy, rested adult / firm-ground / mild reference context resolves. Other contexts return an explicit unsupported result. The engine uses four named Pip operators, not a general expression language. Knowledge projection accepts established copy facts and does not return the hidden candidate genome. Research completeness checks the sample's explicit required-fact manifest.

Regenerate the readable evidence with:

```powershell
node prototype/genetics/report.mjs
```

The command writes `report.md` beside this file. Run the focused acceptance checks with:

```powershell
node --test prototype/tests/pip-genetics.test.mjs
```

All content and rules are provisional proof inputs. A passing host test establishes only these declared data and operations, not fun, balance, canonical Pip art, production completeness, UI acceptance, cloud acceptance, or device performance.

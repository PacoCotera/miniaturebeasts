"""Plan plug-ins (chunk 6, spec 8.3): one module per plan, each owning its bands, the families it carries and its spine view. A plan declares what the plan fixes (the spine's ranges and their length bands, the head attachment, the tail and the profile knobs); a family (families/registry.py) is a template on a plan with its own bands.
Two plans are built (biped, quadruped); the registry names six (mass, legless, hexapod and radial come with their families). The neck band is 0-0.2 H on both: 0 is allowed, the head may merge into the body.
A `mb-species/1` file (the S20 fixture and the play species) was made before the language and keeps the older neck band, 0.15-0.4 H: `bands_for` hands a file the bands of its own schema."""
import copy

from . import biped, quadruped

MODULES = {"biped": biped, "quadruped": quadruped}
NECK = (0.0, 0.2)                    # the language's neck band on every plan (the language design, section 3)
LEGACY_NECK = (0.15, 0.4)            # what a /1 file was written against


def bands_for(plan_bands, schema):
    """The plan's bands for a file of this schema: the plan's own for /2, the older neck band for /1."""
    if plan_bands is None or schema != "mb-species/1":
        return plan_bands
    out = copy.deepcopy(plan_bands)
    out["range_len"]["neck"] = LEGACY_NECK
    return out


def families_of(plan):
    """The ids of the registry's families that stand on this plan, in the registry's order."""
    import species_v1 as V1
    return [f["id"] for f in V1.registry()["families"] if f["plan"] == plan]

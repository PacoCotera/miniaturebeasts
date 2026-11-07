"""The family registry (chunk 6): the twenty families of the language as the studio reads them. The registry file (framework/language.json, from language.mjs) is the source; this module is the studio's view of it.
A family names its plan, its path (mesh, hybrid or cage: how a kind of that family gets its body), its armature layout (the bones and sockets a sculpt is fitted with), its template file (or none yet) and its bands (head share, neck, legs). New species offers a card per family: a family with a template can be started from, the others show "not yet".
The trotter's template is S22 turned into templates/trotter.json: the cage trotter. Its kind (Loika) is a sculpt, so the trotter's own path is mesh and the template's is cage; S22 stays on the cage."""
import copy
import json
import os
import re

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPECIES_DIR = os.path.join(HERE, "species_v1")
TEMPLATE_PATH = "cage"                 # a template is always a cage build; a sculpt comes in with `wb mesh import` (chunk 30)
FROM_A_SCULPT = dict(id="sculpt", name="From a sculpt", state="not yet", why="Starting from a sculpt goes live with the mesh body source (chunk 30).")


def _reg():
    import species_v1 as V1
    return V1.registry()


def families():
    """Every family of the registry, in its order."""
    return _reg()["families"]


def get(family_id):
    return next((f for f in families() if f["id"] == family_id), None)


def with_template():
    return [f for f in families() if f.get("template")]


def template_doc(family_id):
    """The family's template file as it is stored, or None when the family has none yet."""
    f = get(family_id)
    if f is None or not f.get("template"):
        return None
    with open(os.path.join(SPECIES_DIR, f["template"])) as fh:
        return json.load(fh)


def cards():
    """What New species offers: one card per family (ready when it has a template, else "not yet"), then the "from a sculpt" card, shown as not yet. Each card carries what the page says: the plan, the path, the legs, what the family is for."""
    out = []
    for f in families():
        ready = bool(f.get("template"))
        out.append(dict(id=f["id"], name=f["name"], plan=f["plan"], path=f["path"], template_path=TEMPLATE_PATH if ready else None, legs=f["legs"], contact=f["contact"], gait=f["gait"], fix=f["fix"],
                        armature=f["armature"], bands=f["bands"], state="ready" if ready else "not yet"))
    return out + [dict(FROM_A_SCULPT)]


def new_species(species_id, family_id):
    """A new species file from the family's template: the same bare base with its own id and no name yet. Raises ValueError with the words to say when it cannot."""
    if not re.fullmatch(r"S\d\d", str(species_id)):
        raise ValueError(f"'{species_id}' is not a species id. An id is S and two digits, like S23.")
    f = get(family_id)
    if f is None:
        raise ValueError(f"'{family_id}' is not a family. The families are {', '.join(x['id'] for x in families())}.")
    doc = template_doc(family_id)
    if doc is None:
        raise ValueError(f"The {family_id} family has no template yet.")
    doc = copy.deepcopy(doc)
    doc["id"], doc["name"], doc["family"] = species_id, "", family_id
    return doc

"""Cache keys, in one place so the server and the workers agree. Cage key: framework id + the cage inputs (facade.cage_key). Frame key: cage key + mode, azimuth, size, elevation and the proxy's look version. Job keys: hashes of the frame keys they need."""
from wb import hashing as H, facade as F

LOOK = "proxy-2"
EL = 10.0


FACE = dict(eye_size=1.0, eye_height=0.0, eye_spacing=0.0, mouth_width=1.0, mouth_z=0.0)


def cage_key(spec, genome, stage="base"):
    """The cache key of a cage's proxy mesh. The clay's face (the eyes and mouth drawn on the proxy) comes from coat genes that the cage hash leaves out, so a genome whose face differs from the type's gets its own key: eye size low and high must not share one cached mesh."""
    ck = F.cage_key(spec, genome, stage)
    spec_ = F.internal(spec)
    if F.is_quadruped(spec_):
        return ck                                                  # no coat genes yet: the clay has no face to move the key
    c, _ = F.cage_inputs(spec_, F.resolve_genome(genome, spec_))
    coat = c.get("coat") or {}
    face = {k: round(float(coat.get(k, d)) + 0.0, 6) for k, d in FACE.items()}
    return ck if all(abs(face[k] - d) < 1e-6 for k, d in FACE.items()) else H.hash_of("cage-face", ck, face)


def frame_key(ck, mode, az, size):
    return H.hash_of("frame", ck, mode, int(az), int(size), EL, LOOK)


def frames(ck, views):
    return [frame_key(ck, m, a, s) for m, a, s in views]


def render_key(ck, views):
    return H.hash_of("render", sorted(frames(ck, views)))


def sheet_key(rk, version="sheet-1"):
    return H.hash_of("sheet", rk, version)


MODES = ("clay", "normal", "parts", "wire")
AZ = (0, 32, 90, 180)
SIZES = (304, 96, 48, 608)
# the contact sheet's views: the four clay azimuths, and the other three modes at the house angle
SHEET_VIEWS = [("clay", a, 304) for a in AZ] + [(m, 32, 304) for m in ("normal", "parts", "wire")]

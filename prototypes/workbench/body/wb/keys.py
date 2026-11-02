"""Cache keys, in one place so the server and the workers agree. Cage key: framework id + the cage inputs (facade.cage_key). Frame key: cage key + mode, azimuth, size, elevation and the proxy's look version. Job keys: hashes of the frame keys they need."""
from wb import hashing as H, facade as F

LOOK = "proxy-1"
EL = 10.0


def cage_key(spec, genome, stage="base"):
    return F.cage_key(spec, genome, stage)


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
SIZES = (304, 96, 48)
# the contact sheet's views: the four clay azimuths, and the other three modes at the house angle
SHEET_VIEWS = [("clay", a, 304) for a in AZ] + [(m, 32, 304) for m in ("normal", "parts", "wire")]

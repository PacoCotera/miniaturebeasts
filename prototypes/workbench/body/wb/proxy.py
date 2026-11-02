"""The proxy renderer (bpy, Blender Workbench engine): one scene, one camera and one mesh object kept alive between jobs ("warm"), the house cameras, four modes.
Modes: clay (the clay matcap), normal (view-space smooth normals as colour, as the viewer's Normal mode), parts (one colour per part, from the `_PART` attribute, under the same matcap), wire (clay with the proxy mesh's edges drawn as thin geometry, hidden where the surface hides them).
The house cameras are the 304x312 / 96x88 / 48x48 stand views of gates.SIZES (95, 30, 15 px per H), and the same framing at 608x624 (190 px per H) for the studio's hero, elevation 10, centre (-0.35, 0, 1.3), azimuth 0 = the front, 90 = the creature's left.
Under the bpy venv only."""
import math
import os
import sys
import time

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BODY not in sys.path:
    sys.path.insert(0, BODY)
import numpy as np
import bpy
from mathutils import Matrix

SIZES = {608: (608, 624, 190.0), 304: (304, 312, 95.0), 96: (96, 88, 30.0), 48: (48, 48, 15.0)}          # 608 is the hero's: the 304 framing at twice the pixels
AZ = (0, 32, 90, 180)
MODES = ("clay", "normal", "parts", "wire")
EL = 10.0
CENTRE = np.array([-0.35, 0.0, 1.3])
LOOK = "proxy-2"                     # the look version in every frame key: change it when the proxy's look changes
BG = (0.93, 0.92, 0.90)
CLAY = (0.66, 0.62, 0.58)
WIRE = (0.08, 0.22, 0.66)
PART_COLORS = [(0.86, 0.45, 0.30), (0.30, 0.55, 0.80), (0.45, 0.72, 0.38), (0.88, 0.72, 0.25), (0.62, 0.40, 0.75), (0.30, 0.72, 0.70), (0.80, 0.40, 0.55), (0.55, 0.55, 0.55)]


def _lin(c):
    c = np.asarray(c, float)
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def basis(az, el):
    a, e = math.radians(az), math.radians(el)
    pos_dir = np.array([math.cos(a) * math.cos(e), math.sin(a) * math.cos(e), math.sin(e)])
    fwd = -pos_dir
    up0 = np.array([0, 0, 1.0]) if abs(el) < 80 else np.array([-math.cos(a) * np.sign(el), -math.sin(a) * np.sign(el), 0.0])
    right = np.cross(fwd, up0)
    right /= np.linalg.norm(right)
    return right, np.cross(right, fwd), fwd, pos_dir


def strip_png_text(path):
    """Blender writes the render time into a text chunk, so two identical renders differ by a byte. Drop the text chunks: the same view is then the same bytes (the cache and the goldens need that)."""
    import struct
    d = open(path, "rb").read()
    out, pos = [d[:8]], 8
    while pos < len(d):
        n, t = struct.unpack(">I4s", d[pos:pos + 8])
        if t not in (b"tEXt", b"iTXt", b"zTXt", b"tIME"):
            out.append(d[pos:pos + 12 + n])
        pos += 12 + n
    with open(path, "wb") as fh:
        fh.write(b"".join(out))


class ProxyRenderer:
    def __init__(self):
        bpy.ops.wm.read_factory_settings(use_empty=True)
        sc = self.sc = bpy.context.scene
        sc.render.engine = "BLENDER_WORKBENCH"
        sc.render.film_transparent = False
        sc.render.image_settings.file_format = "PNG"
        sc.render.image_settings.color_mode = "RGB"
        sc.render.image_settings.color_depth = "8"
        sc.view_settings.view_transform = "Standard"
        sc.display.render_aa = "8"
        w = bpy.data.worlds.new("w")
        w.color = BG
        sc.world = w
        sh = sc.display.shading
        sh.light = "MATCAP"
        sh.studio_light = "clay_studio.exr"
        sh.show_cavity = False
        sh.show_object_outline = False
        sh.show_specular_highlight = False
        cam = bpy.data.cameras.new("cam")
        cam.type = "ORTHO"
        self.cam = bpy.data.objects.new("cam", cam)
        sc.collection.objects.link(self.cam)
        sc.camera = self.cam
        self.mats = {}
        for nm, col in (("clay", CLAY), ("wire", WIRE)):
            m = bpy.data.materials.new(nm)
            m.diffuse_color = (*col, 1.0)
            self.mats[nm] = m
        fm = bpy.data.materials.new("face")
        fm.diffuse_color = (0.045, 0.04, 0.05, 1.0)
        self.mats["face"] = fm
        self.body = self.wire = self.face = None
        self.mesh = None
        self.mesh_key = None

    def warm(self, path):
        """One throwaway render of a tiny box at 48 px (path: a scratch file), so the first real view does not pay for the engine's start. Returns the ms it took."""
        key, saved = self.mesh_key, self.mesh
        V = np.array([[-.2, -.2, .9], [.2, -.2, .9], [.2, .2, .9], [-.2, .2, .9], [-.2, -.2, 1.3], [.2, -.2, 1.3], [.2, .2, 1.3], [-.2, .2, 1.3]], float)
        F = np.array([[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
        self.set_mesh(dict(V=V, F=F, part=np.zeros(8, int)), "warm")
        ms = self.render("clay", 0, 48, path)
        self.mesh_key = None
        return ms

    # ---- the mesh
    def set_mesh(self, mesh, key=None):
        """mesh: dict(V, F (quads), part, names) from facade.proxy_mesh. A no-op when `key` is the mesh already loaded."""
        if key is not None and key == self.mesh_key:
            return 0.0
        t = time.perf_counter()
        V, F = np.asarray(mesh["V"], float), np.asarray(mesh["F"], int)
        me = bpy.data.meshes.new("proxy")
        me.from_pydata(V.tolist(), [], F.tolist())
        me.update()
        me.polygons.foreach_set("use_smooth", np.ones(len(F), bool))
        part = np.asarray(mesh["part"], int)
        at = me.attributes.new("_PART", "INT", "POINT")
        at.data.foreach_set("value", part)
        pc = np.array([PART_COLORS[p % len(PART_COLORS)] for p in part])
        for nm, col in (("Parts", pc), ("Normal", np.zeros((len(V), 3)))):
            ca = me.color_attributes.new(nm, "FLOAT_COLOR", "POINT")
            ca.data.foreach_set("color", np.hstack([_lin(col), np.ones((len(V), 1))]).ravel())
        me.materials.append(self.mats["clay"])
        if self.body is None:
            self.body = bpy.data.objects.new("body", me)
            self.sc.collection.objects.link(self.body)
            self.wire = bpy.data.objects.new("wire", me)
            self.sc.collection.objects.link(self.wire)
            md = self.wire.modifiers.new("wf", "WIREFRAME")
            md.use_replace = True
            md.use_even_offset = True
            md.use_boundary = True
            md.offset = 0.0
            self.wire_mat = self.mats["wire"]
        else:
            old = self.body.data
            self.body.data = me
            self.wire.data = me
            bpy.data.meshes.remove(old)
        me.materials.clear()
        me.materials.append(self.mats["clay"])
        self.wire.data = me
        self.wire.material_slots[0].link = "OBJECT"
        self.wire.material_slots[0].material = self.mats["wire"]
        if self.face is not None:
            old_f = self.face.data
            bpy.data.objects.remove(self.face)
            bpy.data.meshes.remove(old_f)
            self.face = None
        if mesh.get("face_V") is not None and len(mesh["face_V"]):          # the clay's face: flat dark eyes and mouth (wb/clayface.py), seen in the clay view only
            fme = bpy.data.meshes.new("face")
            fme.from_pydata(np.asarray(mesh["face_V"], float).tolist(), [], [list(map(int, p)) for p in mesh["face_F"]])
            fme.update()
            fme.materials.append(self.mats["face"])
            self.face = bpy.data.objects.new("face", fme)
            self.sc.collection.objects.link(self.face)
        self.mesh = dict(V=V, F=F, part=part)
        from gltf_out import vertex_normals
        self.mesh["N"] = vertex_normals(V, F)
        self.mesh_key = key
        return time.perf_counter() - t

    # ---- the views
    def _camera(self, az, size, el=EL):
        w, h, ppH = SIZES[size]
        right, up, fwd, pos_dir = basis(az, el)
        pos = CENTRE + 12.0 * pos_dir
        M = np.stack([right, up, -fwd], 1)
        self.cam.data.ortho_scale = w / ppH
        self.cam.matrix_world = Matrix([[M[0, 0], M[0, 1], M[0, 2], pos[0]], [M[1, 0], M[1, 1], M[1, 2], pos[1]], [M[2, 0], M[2, 1], M[2, 2], pos[2]], [0, 0, 0, 1]])
        r = self.sc.render
        r.resolution_x, r.resolution_y, r.resolution_percentage = w, h, 100
        return right, up, fwd

    def render(self, mode, az, size, path, el=EL):
        """Render one view to the PNG `path`. Returns the milliseconds the view took."""
        if mode not in MODES:
            raise ValueError(f"mode '{mode}': one of {', '.join(MODES)}")
        if size not in SIZES:
            raise ValueError(f"size {size}: one of {', '.join(map(str, SIZES))}")
        t = time.perf_counter()
        right, up, fwd = self._camera(float(az), size, el)
        sh = self.sc.display.shading
        me = self.body.data
        self.wire.hide_render = mode != "wire"
        if self.face is not None:
            self.face.hide_render = mode != "clay"
        if mode == "normal":
            N = self.mesh["N"]
            col = np.clip(0.5 + 0.5 * np.stack([N @ right, N @ up, -(N @ fwd)], 1), 0, 1)
            ca = me.color_attributes["Normal"]
            ca.data.foreach_set("color", np.hstack([_lin(col), np.ones((len(col), 1))]).ravel())
            me.color_attributes.active_color = ca
            sh.light, sh.color_type = "FLAT", "VERTEX"
        elif mode == "parts":
            me.color_attributes.active_color = me.color_attributes["Parts"]
            sh.light, sh.color_type = "MATCAP", "VERTEX"
            sh.studio_light = "clay_studio.exr"
        else:
            sh.light, sh.color_type = "MATCAP", "MATERIAL"
            sh.studio_light = "clay_studio.exr"
        if mode == "wire":
            w, h, ppH = SIZES[size]
            self.wire.modifiers["wf"].thickness = 1.3 / ppH
        self.sc.render.filepath = path
        bpy.ops.render.render(write_still=True)
        strip_png_text(path)
        return (time.perf_counter() - t) * 1000

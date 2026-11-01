"""Blender side (bpy venv): the mesh from the subdivided cage, clay render from an azimuth/elevation (orthographic, 95 px per H = the 304 sprite's scale), and the cage's wire overlay drawn on the render.
Deterministic: Cycles CPU, fixed seed, no denoise. Azimuth 0 = the creature's front (+x), 90 = its left (+y), 180 back, 270 right; elevation in degrees (89 above, -89 below)."""
import math, os, zlib, struct
import numpy as np
import bpy

PX_PER_H = 95.0


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = 32
    sc.cycles.seed = 0
    sc.cycles.use_denoising = False
    sc.cycles.max_bounces = 3
    sc.cycles.filter_width = 1.2
    sc.render.film_transparent = False
    sc.view_settings.view_transform = "Standard"
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGB"
    return sc


def make_mesh(name, V, F, color=(0.55, 0.52, 0.50), roughness=0.85, attrs=None):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in V], [], [tuple(f) for f in F])
    me.update()
    for p in me.polygons:
        p.use_smooth = True
    if attrs:
        for k, a in attrs.items():
            at = me.attributes.new(k, "FLOAT", "POINT")
            at.data.foreach_set("value", np.asarray(a, float).ravel())
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    me.materials.append(m)
    return ob


def lights(sc, az):
    w = bpy.data.worlds.new("w")
    w.use_nodes = True
    bg = w.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = (0.80, 0.82, 0.86, 1)
    bg.inputs["Strength"].default_value = 0.55
    sc.world = w
    # key from the upper left and front of the camera, soft
    k = bpy.data.lights.new("key", "SUN")
    k.energy = 3.2
    k.angle = math.radians(25)
    ko = bpy.data.objects.new("key", k)
    sc.collection.objects.link(ko)
    ko.rotation_euler = (math.radians(50), 0, math.radians(az + 90 + 35))
    return ko


def camera(sc, az, el, width, height, centre, ppH=PX_PER_H):
    cam = bpy.data.cameras.new("cam")
    cam.type = "ORTHO"
    cam.ortho_scale = width / ppH
    co = bpy.data.objects.new("cam", cam)
    sc.collection.objects.link(co)
    sc.camera = co
    a, e = math.radians(az), math.radians(el)
    d = 12.0
    pos = np.array(centre) + d * np.array([math.cos(a) * math.cos(e), math.sin(a) * math.cos(e), math.sin(e)])
    co.location = tuple(pos)
    fwd = (np.array(centre) - pos)
    fwd /= np.linalg.norm(fwd)
    up0 = np.array([0, 0, 1.0]) if abs(el) < 80 else np.array([-math.cos(a) * np.sign(el), -math.sin(a) * np.sign(el), 0.0])
    right = np.cross(fwd, up0)
    right /= np.linalg.norm(right)
    up = np.cross(right, fwd)
    M = np.stack([right, up, -fwd], 1)
    from mathutils import Matrix
    co.matrix_world = Matrix([[M[0, 0], M[0, 1], M[0, 2], pos[0]], [M[1, 0], M[1, 1], M[1, 2], pos[1]], [M[2, 0], M[2, 1], M[2, 2], pos[2]], [0, 0, 0, 1]])
    sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = width, height, 100
    return dict(pos=pos, right=right, up=up, fwd=fwd, w=width, h=height, ppH=ppH, centre=np.array(centre))


def project(cam, X):
    d = np.asarray(X) - cam["centre"]
    x = (d @ cam["right"]) * cam["ppH"] + cam["w"] / 2
    y = cam["h"] / 2 - (d @ cam["up"]) * cam["ppH"]
    depth = d @ cam["fwd"]
    return np.stack([x, y], -1), depth


def render_to_array(path):
    sc = bpy.context.scene
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    im = bpy.data.images.load(path)
    a = np.array(im.pixels[:], np.float32).reshape(im.size[1], im.size[0], 4)[::-1]
    bpy.data.images.remove(im)
    return a


def to_srgb8(a):
    return (np.clip(a[..., :3], 0, 1) * 255 + 0.5).astype(np.uint8)


def write_png(path, rgb):
    h, w, _ = rgb.shape
    raw = b"".join(b"\x00" + rgb[y].tobytes() for y in range(h))
    def chunk(t, d):
        c = struct.pack(">I", len(d)) + t + d
        return c + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)
    with open(path, "wb") as fh:
        fh.write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(raw, 6)) + chunk(b"IEND", b""))


def draw_lines(img, p0, p1, colors, alpha=0.9, width=1.0):
    """Anti-aliased-ish lines into an (h,w,3) uint8 image by sampling along each segment (vectorised)."""
    h, w, _ = img.shape
    n = np.maximum(np.ceil(np.linalg.norm(p1 - p0, axis=1) * 1.5).astype(int), 2)
    out = img.astype(np.float32)
    for i in range(len(p0)):
        t = np.linspace(0, 1, n[i])[:, None]
        pts = p0[i] + (p1[i] - p0[i]) * t
        x, y = np.round(pts[:, 0]).astype(int), np.round(pts[:, 1]).astype(int)
        ok = (x >= 0) & (x < w) & (y >= 0) & (y < h)
        out[y[ok], x[ok]] = out[y[ok], x[ok]] * (1 - alpha) + np.array(colors[i], np.float32) * alpha
    return out.astype(np.uint8)


def draw_dots(img, pts, colors, r=2):
    h, w, _ = img.shape
    out = img.copy()
    for p, c in zip(pts, colors):
        x, y = int(round(p[0])), int(round(p[1]))
        for dy in range(-r, r + 1):
            for dx in range(-r, r + 1):
                if dx * dx + dy * dy <= r * r + 1 and 0 <= x + dx < w and 0 <= y + dy < h:
                    out[y + dy, x + dx] = c
    return out

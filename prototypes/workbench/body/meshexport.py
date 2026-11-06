"""The export GLB of a mesh file (Blender): the sculpt with its skin and armature, and every placed part joined into the one skinned mesh on its socket bone, so the viewer shows it as it shows every body (a `_PART` index per vertex).
The studio's GLBs are z up with the creature facing +x (the viewer turns the model, not the data). No material and no texture: the coat painter and the material library colour it later. `asset.extras` carries the species, the build stamp (with `mesh S01-m1 ab12cd34`
and each part), the part names, the bones and the review lines."""
import os

import numpy as np

import meshsource as MS


def build(body, path, extras):
    """Write the GLB of `body` (a meshbody.MeshBody) at `path`. Returns dict(bytes, clips, parts, bones)."""
    import bpy
    from mathutils import Vector
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=body.mesh.glb_path)
    arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
    ob = next(o for o in bpy.data.objects if o.type == "MESH" and o.parent == arm)           # (the importer also makes a bone-shape icosphere: not the body)
    for o in [o for o in bpy.data.objects if o.type == "MESH" and o is not ob]:
        bpy.data.objects.remove(o)
    for pb in arm.pose.bones:
        pb.custom_shape = None
    me = ob.data
    nb = len(me.vertices)
    pa = me.attributes.new("_PART", "FLOAT", "POINT")
    pa.data.foreach_set("value", np.zeros(nb, np.float32))
    objs = [ob]
    soc = {}
    for p in body.placed:
        pm = bpy.data.meshes.new(p["name"])
        pm.from_pydata(p["V"].tolist(), [], p["F"].tolist())
        pm.update()
        for poly in pm.polygons:
            poly.use_smooth = True
        a = pm.attributes.new("_PART", "FLOAT", "POINT")
        a.data.foreach_set("value", np.full(len(pm.vertices), float(p["part"]), np.float32))
        po = bpy.data.objects.new(p["name"], pm)
        bpy.context.scene.collection.objects.link(po)
        g = po.vertex_groups.new(name=f"socket.{p['socket']}")
        g.add(list(range(len(pm.vertices))), 1.0, "REPLACE")
        po.parent = arm
        objs.append(po)
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = ob
    if len(objs) > 1:
        bpy.ops.object.join()
    bpy.ops.object.select_all(action="DESELECT")
    ob = bpy.context.view_layer.objects.active
    ob.select_set(True)
    arm.select_set(True)
    bpy.ops.export_scene.gltf(filepath=path, use_selection=True, export_format="GLB", export_materials="NONE", export_image_format="NONE", export_normals=True, export_texcoords=False, export_skins=True,
                              export_animations=False, export_apply=False, export_yup=False, export_extras=False, export_attributes=True)
    bones = [b.name for b in arm.data.bones]
    names = ["body"] + [k for k in body.parts if k != "body"]
    MS.set_extras(path, **dict(extras, parts=names, bones=bones, counts=dict(triangles=int(len(body.Fw) + sum(len(p["F"]) for p in body.placed)), vertices=int(len(body.Vw) + sum(len(p["V"]) for p in body.placed)), parts=len(names)), clips=[]))
    return dict(bytes=os.path.getsize(path), clips=[], parts=names, bones=bones)

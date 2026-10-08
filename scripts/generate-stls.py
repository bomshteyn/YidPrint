"""Generate simple demo STL files for the YidPrint dev seed."""
import os
import trimesh

OUT = os.path.join(os.path.dirname(__file__), "seed-assets")
os.makedirs(OUT, exist_ok=True)


def cup():
    outer = trimesh.creation.cylinder(radius=30, height=60, sections=48)
    inner = trimesh.creation.cylinder(radius=26, height=58, sections=48)
    inner.apply_translation([0, 0, 4])
    return outer.difference(inner)


def box():
    return trimesh.creation.box(extents=[50, 50, 25])


def box_with_lid():
    b = trimesh.creation.box(extents=[45, 30, 20])
    lid = trimesh.creation.box(extents=[47, 32, 5])
    lid.apply_translation([0, 0, 12])
    return trimesh.util.concatenate([b, lid])


def cylinder_hole():
    outer = trimesh.creation.cylinder(radius=25, height=15, sections=48)
    hole = trimesh.creation.cylinder(radius=8, height=20, sections=32)
    return outer.difference(hole)


def mezuzah():
    body = trimesh.creation.cylinder(radius=8, height=80, sections=32)
    cap = trimesh.creation.cone(radius=8, height=12, sections=32)
    cap.apply_translation([0, 0, 46])
    return trimesh.util.concatenate([body, cap])


def star_box():
    return trimesh.creation.box(extents=[30, 30, 30]).subdivide()


parts = {
    "cup.stl": cup(),
    "box.stl": box(),
    "box-with-lid.stl": box_with_lid(),
    "cylinder-hole.stl": cylinder_hole(),
    "mezuzah-tube.stl": mezuzah(),
    "cube.stl": star_box(),
}
for name, mesh in parts.items():
    mesh.export(os.path.join(OUT, name))
    print(name, "ok")

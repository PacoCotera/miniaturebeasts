"""Select unchanged Companion images and fonts into the IDF build directory."""
import hashlib
import json
from pathlib import Path
import re
import sys

# Reuse the established exact-byte/font selector; it has no import-time writes.
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "caddy"))
from extract_assets import byte_array, emit_bytes, selected_font


def main(native, output):
    native = Path(native)
    output = Path(output)
    art_path = native / "selected-lab/core_art.c"
    art_source = art_path.read_text(encoding="utf-8")
    choices = ["DATA_COMPACT", "ENERGY_COMPACT", "ESSENCE_COMPACT",
               "DATA_PRIMARY", "ENERGY_PRIMARY", "ESSENCE_PRIMARY",
               "SAMPLE_NEUTRAL", "PIP_PLAIN", "PIP_MARKED"]
    names = ["data-compact", "energy-compact", "essence-compact", "data-primary",
             "energy-primary", "essence-primary", "sample-neutral", "pip-carried", "pip-marked"]
    footprints = [(37, 48), (43, 51), (47, 49), (90, 100), (90, 100),
                  (90, 90), (54, 54), (261, 289), (261, 289)]
    code = ['/* Build-only exact source subset; do not edit generated backing. */',
            '#include "companion_assets.h"']
    evidence = {"art_source_sha256": hashlib.sha256(art_path.read_bytes()).hexdigest(),
                "images": [], "fonts": []}
    descriptors = []
    for enum_name, name, footprint in zip(choices, names, footprints):
        descriptor = re.search(r'\{"' + name + r'",\s*(\d+),\s*(\d+),\s*(\w+),\s*"([^"]+)",\s*"([^"]+)",\s*(\d+),\s*(\d+)\}', art_source)
        if not descriptor:
            raise ValueError(f"Missing exact source descriptor {name}")
        width, height, backing, source_id, source_hash, center_x, center_y = descriptor.groups()
        if (int(width), int(height)) != footprint:
            raise ValueError(f"Changed {name} footprint; review current UI consumer")
        pixels = byte_array(art_source, backing)
        if len(pixels) != int(width) * int(height) * 4:
            raise ValueError(f"Incomplete RGBA image {name}")
        code.append(emit_bytes(backing, pixels))
        descriptors.append(f'  {{"{name}",{width},{height},{backing},"{source_id}","{source_hash}",{center_x},{center_y}}},')
        evidence["images"].append({"id": enum_name, "width": int(width), "height": int(height),
            "source_id": source_id, "source_sha256": source_hash,
            "rgba_bytes": len(pixels), "rgba_sha256": hashlib.sha256(pixels).hexdigest()})
    code.append("static const CoreArtSprite companion_sprites[] = {\n" + "\n".join(descriptors) + "\n};")
    code.append("const CoreArtSprite *core_art_sprite(CoreArtId id) {\n  switch (id) {")
    for index, enum_name in enumerate(choices):
        code.append(f"  case CORE_ART_{enum_name}: return &companion_sprites[{index}];")
    code.append("  default: return 0;\n  }\n}")
    overview_path = native / "selected-lab/overview_assets.c"
    overview_source = overview_path.read_text(encoding="utf-8")
    habitat = re.search(r"\{ /\* habitat \*/(.*?)\}", overview_source, re.S)
    if not habitat:
        raise ValueError("Missing native empty habitat backing")
    habitat_pixels = bytes(int(value) for value in re.findall(r"\d+", habitat.group(1)))
    if len(habitat_pixels) != 136 * 144 * 4:
        raise ValueError("Changed empty habitat footprint")
    habitat_hash = hashlib.sha256(habitat_pixels).hexdigest()
    code.append(emit_bytes("empty_habitat_rgba", habitat_pixels))
    code.append('const CoreArtSprite companion_empty_habitat = {"empty-habitat",136,144,empty_habitat_rgba,"overview-habitat","' + habitat_hash + '",68,72};')
    evidence["empty_habitat"] = {"width": 136, "height": 144, "rgba_bytes": len(habitat_pixels),
        "rgba_sha256": habitat_hash, "source_sha256": hashlib.sha256(overview_path.read_bytes()).hexdigest()}
    # All field sprites are linked directly from their unchanged source table.
    field_path = native / "selected-lab/field_art.c"
    field_source = field_path.read_text(encoding="utf-8")
    field_images = re.findall(r'\{"([^"]+)",\s*(\d+),\s*(\d+),\s*(\w+),\s*"([^"]+)",\s*"([^"]+)",\s*(\d+),\s*(\d+)\}', field_source)
    if len(field_images) != 29:
        raise ValueError("Changed field sprite catalogue; review current UI consumer")
    evidence["field_source_sha256"] = hashlib.sha256(field_path.read_bytes()).hexdigest()
    evidence["field_images"] = []
    for name, width, height, backing, source_id, source_hash, _, _ in field_images:
        if (int(width), int(height)) != (32, 32):
            raise ValueError(f"Changed field footprint {name}")
        pixels = byte_array(field_source, backing)
        if len(pixels) != int(width) * int(height) * 4:
            raise ValueError(f"Incomplete field image {name}")
        evidence["field_images"].append({"name": name, "rgba_bytes": len(pixels),
            "rgba_sha256": hashlib.sha256(pixels).hexdigest(), "source_id": source_id, "source_sha256": source_hash})
    fonts = [("lab_heading_font_data.c", "lab_heading", 26),
             ("lab_font_data.c", "lab", 18), ("lab_font_data.c", "lab", 16),
             ("lab_font_data.c", "lab", 28), ("lab_heading_font_data.c", "lab_heading", 20)]
    font_descriptors = []
    for index, (filename, prefix, size) in enumerate(fonts):
        declaration, descriptor, font_evidence = selected_font(native / "shared" / filename, prefix, size, f"companion_font_{index}")
        code.append(declaration)
        font_descriptors.append("  " + descriptor + ",")
        evidence["fonts"].append(font_evidence)
    code.append("const NativeFont companion_fonts[COMPANION_FONT_COUNT] = {\n" + "\n".join(font_descriptors) + "\n};")
    rgba_bytes = sum(image["rgba_bytes"] for image in evidence["images"]) + len(habitat_pixels)
    rgba_bytes += sum(image["rgba_bytes"] for image in evidence["field_images"])
    coverage_bytes = sum(font["coverage_bytes"] for font in evidence["fonts"])
    evidence["source_rgba_bytes"] = rgba_bytes
    evidence["font_coverage_bytes"] = coverage_bytes
    code.append(f"const unsigned companion_source_rgba_bytes = {rgba_bytes};")
    code.append(f"const unsigned companion_font_coverage_bytes = {coverage_bytes};")
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text("\n".join(code) + "\n", encoding="utf-8")
    output.with_suffix(".json").write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf-8")
    print(f"Companion exact subset: {rgba_bytes} RGBA / {coverage_bytes} glyph coverage bytes")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("Usage: extract_assets.py NATIVE_DIRECTORY OUTPUT.c")
    main(sys.argv[1], sys.argv[2])

"""Select unchanged Dock art/ASCII glyph coverage into an IDF build directory."""
import hashlib
import json
from pathlib import Path
import re
import sys


def array_text(source, ctype, name):
    match = re.search(rf"(?:static )?const {ctype} {name}\[[^]]*\] = \{{(.*?)\n\}};", source, re.S)
    if not match:
        raise ValueError(f"Missing source array {name}")
    return match.group(1)


def byte_array(source, name):
    values = [int(value) for value in re.findall(r"\d+", array_text(source, "uint8_t", name))]
    return bytes(values)


def emit_bytes(name, values):
    rows = ["  " + ",".join(str(value) for value in values[start:start + 32]) + ","
            for start in range(0, len(values), 32)]
    return f"static const uint8_t {name}[] = {{\n" + "\n".join(rows) + "\n};\n"


def selected_font(path, prefix, size, target):
    source = path.read_text()
    coverage = byte_array(source, f"{prefix}_coverage")
    glyphs = [tuple(int(value) for value in record) for record in re.findall(
        r"\{(\d+),(\d+),(\d+),(-?\d+),(-?\d+),(\d+)\}",
        array_text(source, "NativeGlyph", f"{prefix}_glyphs"))]
    font_records = re.findall(r"\{(\d+),\s*(\d+),\s*" + prefix + r"_coverage,\s*" +
                              prefix + r"_glyphs \+ (\d+)\}", source)
    matches = [(int(baseline), int(offset)) for height, baseline, offset in font_records if int(height) == size]
    if len(matches) != 1:
        raise ValueError(f"Missing unique {size}px font in {path}")
    baseline, offset = matches[0]
    selected = glyphs[offset:offset + 95]
    if len(selected) != 95:
        raise ValueError("Incomplete ASCII font")
    backing = bytearray()
    compact_glyphs = []
    for old_offset, width, height, left, top, advance in selected:
        pixels = coverage[old_offset:old_offset + width * height]
        if len(pixels) != width * height:
            raise ValueError("Glyph coverage out of bounds")
        compact_glyphs.append((len(backing), width, height, left, top, advance))
        backing.extend(pixels)
    declaration = emit_bytes(f"{target}_coverage", backing)
    declaration += f"static const NativeGlyph {target}_glyphs[] = {{\n"
    declaration += "\n".join("  {" + ",".join(map(str, glyph)) + "}," for glyph in compact_glyphs)
    declaration += "\n};\n"
    descriptor = f"{{{size},{baseline},{target}_coverage,{target}_glyphs}}"
    evidence = {"source": path.name, "source_sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                "size": size, "baseline": baseline, "glyphs": 95, "coverage_bytes": len(backing),
                "coverage_sha256": hashlib.sha256(backing).hexdigest(),
                "metrics_sha256": hashlib.sha256(json.dumps([glyph[1:] for glyph in selected]).encode()).hexdigest()}
    return declaration, descriptor, evidence


def main(native, output):
    native = Path(native)
    output = Path(output)
    art_path = native / "selected-lab/core_art.c"
    art_source = art_path.read_text()
    choices = [("RESIDENTS", "residents"), ("SAMPLES", "samples"), ("INCUBATING", "incubating"),
               ("DATA", "data"), ("ENERGY", "energy"), ("ESSENCE", "essence")]
    code = ['/* Build-only exact source subset. Regenerate with extract_assets.py. */',
            '#include "core_art.h"', '#include "dock_assets.h"']
    evidence = {"art_source_sha256": hashlib.sha256(art_path.read_bytes()).hexdigest(), "icons": [], "fonts": []}
    descriptors = []
    for enum_name, name in choices:
        backing_name = f"{name}_mono_rgba"
        pixels = byte_array(art_source, backing_name)
        descriptor = re.search(r'\{"' + name + r'-mono",\s*(\d+),\s*(\d+),\s*' + backing_name +
                               r',\s*"([^"]+)",\s*"([^"]+)",\s*(\d+),\s*(\d+)\}', art_source)
        if not descriptor:
            raise ValueError(f"Missing {name} descriptor")
        width, height, source_id, source_hash, center_x, center_y = descriptor.groups()
        if (int(width), int(height)) != (32, 40):
            raise ValueError(f"Changed {name} native footprint; review target subset selection")
        if len(pixels) != int(width) * int(height) * 4:
            raise ValueError(f"Bad {name} native footprint")
        code.append(emit_bytes(backing_name, pixels))
        descriptors.append(f'  {{"{name}-mono",{width},{height},{backing_name},"{source_id}","{source_hash}",{center_x},{center_y}}},')
        evidence["icons"].append({"id": enum_name, "width": int(width), "height": int(height),
                                  "source_id": source_id, "source_sha256": source_hash,
                                  "rgba_bytes": len(pixels), "rgba_sha256": hashlib.sha256(pixels).hexdigest()})
    code.append("static const CoreArtSprite dock_sprites[] = {\n" + "\n".join(descriptors) + "\n};")
    code.append("const CoreArtSprite *core_art_sprite(CoreArtId id) {\n  switch (id) {")
    for index, (enum_name, _) in enumerate(choices):
        code.append(f"  case CORE_ART_{enum_name}_MONO: return &dock_sprites[{index}];")
    code.append("  default: return 0;\n  }\n}")
    fonts = [("lab_heading_font_data.c", "lab_heading", 26), ("lab_font_data.c", "lab", 22),
             ("lab_font_data.c", "lab", 18), ("lab_font_data.c", "lab", 32)]
    font_descriptors = []
    for index, (filename, prefix, size) in enumerate(fonts):
        declaration, descriptor, font_evidence = selected_font(native / "shared" / filename, prefix, size, f"dock_font_{index}")
        code.append(declaration)
        font_descriptors.append("  " + descriptor + ",")
        evidence["fonts"].append(font_evidence)
    code.append("const NativeFont caddy_fonts[CADDY_FONT_COUNT] = {\n" + "\n".join(font_descriptors) + "\n};")
    rgba_bytes = sum(icon["rgba_bytes"] for icon in evidence["icons"])
    coverage_bytes = sum(font["coverage_bytes"] for font in evidence["fonts"])
    code.append(f"const unsigned caddy_source_rgba_bytes = {rgba_bytes};")
    code.append(f"const unsigned caddy_font_coverage_bytes = {coverage_bytes};")
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text("\n".join(code) + "\n")
    output.with_suffix(".json").write_text(json.dumps(evidence, indent=2) + "\n")
    print(f"Caddy exact Dock subset: {rgba_bytes} RGBA bytes / {coverage_bytes} font coverage bytes")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("Usage: extract_assets.py NATIVE_DIRECTORY OUTPUT.c")
    main(sys.argv[1], sys.argv[2])

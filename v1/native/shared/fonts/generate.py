"""Generate immutable native-size ASCII coverage; requires Pillow 12.3.0.
Run from this directory: python generate.py. Original unmodified Bitstream Vera
from ReportLab's font distribution; exact redistribution license in LICENSE.txt.
"""
from pathlib import Path
import sys
from PIL import Image, ImageDraw, ImageFont
root = Path(__file__).resolve().parent
profiles = [
    ('portable', 'Vera.ttf', [9, 11, 20, 24], 1.0),
    ('lab', 'Vera.ttf', [18, 19, 21, 22, 26, 34, 24, 28, 32, 36, 40, 44, 48,
                         14, 15, 16, 17, 20, 23, 25, 27], 1.0),
    ('lab_heading', 'VeraBd.ttf', [26, 32, 34, 40, 20, 23, 24, 25, 27,
                                  14, 16, 17, 18], 1.0),
    ('lab_heading_narrow', 'VeraBd.ttf', [26, 32, 34, 40, 20, 23, 24, 25, 27,
                                         14, 16, 17, 18], 0.8),
]
if sys.argv[1:] == ['--lab']:
    profiles = profiles[1:]
elif sys.argv[1:] == ['--heading']:
    profiles = profiles[-2:]
elif sys.argv[1:] == ['--heading-narrow']:
    profiles = profiles[-1:]
elif sys.argv[1:]:
    raise SystemExit('Usage: python generate.py [--lab|--heading|--heading-narrow]')
for name, font_file, sizes, horizontal_scale in profiles:
    data=[]; glyphs=[]; records=[]
    for size in sizes:
        font=ImageFont.truetype(str(root/font_file),size)
        first=len(glyphs)
        for code in range(32,127):
            char=chr(code); left,top,right,bottom=font.getbbox(char)
            width=right-left; height=bottom-top
            mask=Image.new('L',(max(1,width),max(1,height)))
            ImageDraw.Draw(mask).text((-left,-top),char,font=font,fill=255)
            if horizontal_scale != 1.0 and width and height:
                mask = mask.resize((max(1, round(width * horizontal_scale)), height),
                                   Image.Resampling.LANCZOS)
            glyph_width = mask.width if width else 0
            glyph_left = round(left * horizontal_scale)
            glyph_advance = round(font.getlength(char) * horizontal_scale)
            glyphs.append((len(data), glyph_width, height, glyph_left, top, glyph_advance))
            data.extend(mask.tobytes() if width and height else [])
        records.append((size,font.getmetrics()[0],first))
    text='#include "native_font.h"\n'
    text+=f'static const uint8_t {name}_coverage[] = {{\n'
    text+='\n'.join('  '+','.join(map(str,data[i:i+32]))+',' for i in range(0,len(data),32))+'\n};\n'
    text+=f'static const NativeGlyph {name}_glyphs[] = {{\n'
    text+='\n'.join('  {'+','.join(map(str,g))+'},' for g in glyphs)+'\n};\n'
    text+=f'const NativeFont {name}_fonts[] = {{\n'
    text+='\n'.join(f'  {{{size}, {baseline}, {name}_coverage, {name}_glyphs + {first}}},' for size,baseline,first in records)+'\n};\n'
    (root.parent/f'{name}_font_data.c').write_text(text)
    print(name,len(data),'coverage bytes')


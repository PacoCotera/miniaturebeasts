#!/usr/bin/env python3
"""Reference sheet: Main Sequence (Tumbling Dumpling Studio, published by Mythwright), frames from its Steam store
page (screenshots, and the Gameplay and Demo trailers sampled every 4 s with ffmpeg). Thumbnails for study and
critique only; the images belong to their owners. Each frame annotated: what it teaches, and how it meets our style.

  python3 make-sheet.py FRAMES_DIR FONTS OUT
"""
import os, sys, textwrap
from PIL import Image, ImageDraw, ImageFont

SRC, FONTS, OUT = sys.argv[1:4]
F13 = ImageFont.truetype(os.path.join(FONTS, 'Inter-Regular.ttf'), 13)
F14 = ImageFont.truetype(os.path.join(FONTS, 'Inter-Medium.ttf'), 14)
FRAMES = [
    ('dl/shot-01.jpg', 'ADOPT', '1 · Machines show their own state',
     'Each machine carries its working light (glowing cells, a green lamp). You read the hall without a panel. Ours: '
     'the lamp and the lit recess on Home say "needs you" and "working" the same way.'),
    ('frames2/t2-011.jpg', 'ADOPT', '2 · The base reads as a place you run',
     'Rows of machines joined by belts: the flow is visible, so it looks like a station. Ours: Home lacks this. '
     'Show the modules joined to the life (feed lines, the bay chute), not as separate boxes.'),
    ('dl/shot-04.jpg', 'ADOPT', '3 · Picture-first cards in the world\'s own kit',
     'Each ship is a line drawing, a name and one status line; the panel shares the hull\'s chamfers and orange tab. '
     'Ours: the pod and mibi cards. Keep our slate, not their outline drawings.'),
    ('frames2/t1-001.jpg', 'ADOPT', '4 · One painted kit, recoloured',
     'The same models in blue, green and red teams, shading kept. It is exactly our T-200 method: '
     'a painted stand with colour as a layer, never a new painting per look.'),
    ('dl/shot-06.jpg', 'ADOPT', '5 · The device\'s own display',
     'Speed and fuel sit on the cockpit dash in amber on black, not on a HUD. Ours: the Station is a device, '
     'so its readouts belong on its own face (the pane, the recess), never floating.'),
    ('dl/shot-09.jpg', 'ADOPT', '6 · Red only for real danger',
     'The red ALERT appears only when the ship is under attack. It is our T-196 rule: coral and red '
     'only where something truly harms.'),
    ('dl/shot-07.jpg', 'MIXED', '7 · The floor is the build grid',
     'The placement grid is painted into the deck, so building happens in the world. But the blue hologram '
     'preview is the sci-fi HUD our guide forbids.'),
    ('dl/shot-12.jpg', 'AVOID', '8 · A tree of text boxes',
     'Research is lanes of named boxes with locks: readable, but a wall of words. Ours: the Library and '
     'chapters stay pictures (the owner: "relies too much on text").'),
    ('dl/shot-02.jpg', 'AVOID', '9 · Blueprint grid and glowing preview',
     'A neon grid, holograms, white plastic under studio light. A sterile lab with no life in it: everything our '
     '"What it is not" lists.'),
]
TW, TH = 400, 225
COLS = 3
PAD = 16
CELL_H = TH + 118
sheet = Image.new('RGB', (PAD + COLS * (TW + PAD), 56 + 3 * CELL_H + 30), (12, 10, 18))
d = ImageDraw.Draw(sheet)
d.text((PAD, 14), 'Main Sequence (Tumbling Dumpling Studio): what the art team learns, for Miniature Lives and the Station UI',
       font=F14, fill=(241, 235, 223))
d.text((PAD, 34), 'Frames from the Steam store page: 12 screenshots, and the Gameplay (75 s) and Demo (101 s) trailers sampled every 4 s. '
       'Reference only; images belong to their owners.', font=F13, fill=(141, 138, 166))
TAG = {'ADOPT': (173, 246, 224), 'MIXED': (255, 168, 63), 'AVOID': (198, 196, 216)}
for i, (path, tag, title, body) in enumerate(FRAMES):
    x, y = PAD + (i % COLS) * (TW + PAD), 56 + (i // COLS) * CELL_H
    im = Image.open(os.path.join(SRC, path)).convert('RGB').resize((TW, TH), Image.LANCZOS)
    sheet.paste(im, (x, y))
    d.text((x, y + TH + 8), tag, font=F14, fill=TAG[tag])
    d.text((x + 64, y + TH + 8), title, font=F14, fill=(241, 235, 223))
    for j, line in enumerate(textwrap.wrap(body, 58)):
        d.text((x, y + TH + 32 + j * 17), line, font=F13, fill=(198, 196, 216))
sheet.save(os.path.join(OUT, 'main-sequence-reference-sheet.png'), optimize=True)
print('main-sequence-reference-sheet.png')

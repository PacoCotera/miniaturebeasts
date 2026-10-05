"""Rebuild the provisional 1:1 Contour paper study; no 3D fit is asserted."""
from pathlib import Path
from reportlab.graphics.shapes import Drawing, Rect, Line, Circle, String
from reportlab.graphics import renderPDF, renderSVG
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.lib.units import mm

OUTPUT = Path(__file__).resolve().parent
PAGE_W, PAGE_H = 265, 300
BODY_X, BODY_Y = 25, 43
BODY_W, BODY_H = 215, 190
DISPLAY = (25.05, 18, 164.9, 124.27)
INK, MUTED = '#24313a', '#52636b'
CREAM, BLUE, ORANGE = '#eee8dc', '#257a94', '#bd682a'


def text(drawing, x, y, value, size=3.5, color=INK):
    drawing.add(String(x*mm, (PAGE_H-y)*mm, value,
                       fontName='Helvetica', fontSize=size*mm,
                       fillColor=HexColor(color)))


def rect(drawing, x, y, width, height, fill=None, stroke=INK, dashed=False, radius=0):
    drawing.add(Rect(x*mm, (PAGE_H-y-height)*mm, width*mm, height*mm,
                        rx=radius*mm, ry=radius*mm,
                        fillColor=HexColor(fill) if fill else None,
                        strokeColor=HexColor(stroke), strokeWidth=.4*mm,
                        strokeDashArray=[2*mm, 1.5*mm] if dashed else None))


def line(drawing, x1, y1, x2, y2, color=INK):
    drawing.add(Line(x1*mm, (PAGE_H-y1)*mm, x2*mm, (PAGE_H-y2)*mm,
                     strokeColor=HexColor(color), strokeWidth=.4*mm))


def circle(drawing, x, y, radius, label):
    drawing.add(Circle(x*mm, (PAGE_H-y)*mm, radius*mm,
                       fillColor=HexColor('#faf8f2'), strokeColor=HexColor(INK),
                       strokeWidth=.4*mm))
    text(drawing, x-3, y+1, label, 3)


def common(title, subtitle):
    drawing = Drawing(PAGE_W*mm, PAGE_H*mm)
    rect(drawing, 0, 0, PAGE_W, PAGE_H, '#ffffff', '#ffffff')
    text(drawing, 15, 14, title, 6)
    text(drawing, 15, 23, subtitle, 3.6, MUTED)
    text(drawing, 15, 31, 'PAPER TRIAL 02 / All dimensions mm / Not a fabrication drawing', 3.3, ORANGE)
    rect(drawing, BODY_X, BODY_Y, BODY_W, BODY_H, CREAM, radius=12)
    line(drawing, 25, 38, 240, 38)
    line(drawing, 25, 36, 25, 40)
    line(drawing, 240, 36, 240, 40)
    text(drawing, 105, 36, '215 trial body width', 3.3)
    text(drawing, 27, 240, '190 trial body height / depth OPEN / guards, seams and fasteners not dimensioned', 3.2, MUTED)
    line(drawing, 15, 283, 115, 283)
    for x in (15, 115):
        line(drawing, x, 280, x, 286)
    text(drawing, 15, 293, '100 mm check bar - print Actual size / 100%, never Fit', 3.5)
    return drawing


front = common('CONTOUR / Front sizing study', 'True-scale display outline; trial controls and shell. No game UI or viewing aperture implied.')
x, y, w, h = DISPLAY
rect(front, BODY_X+x, BODY_Y+y, w, h, '#d8ebee', BLUE)
text(front, 65, 92, 'SELECTED DISPLAY MODULE', 4.6, BLUE)
text(front, 84, 102, '164.90 x 124.27', 4.3, BLUE)
text(front, 64, 114, 'Plan envelope only - not active pixels', 3.3, BLUE)
text(front, 64, 123, 'Rear height, connectors and mounting', 3.3, BLUE)
text(front, 64, 129, 'still need revision-specific allocation.', 3.3, BLUE)
text(front, 54, 178, 'Source: Waveshare H Rev4.1 outline; see linked notes.', 2.7, MUTED)
circle(front, BODY_X+25, BODY_Y+158, 15, 'NAV')
for center, label in ((64,'W1'), (88,'W2'), (112,'W3'), (136,'W4')):
    circle(front, BODY_X+center, BODY_Y+166, 9, label)
circle(front, BODY_X+170, BODY_Y+158, 9, 'BACK')
circle(front, BODY_X+195, BODY_Y+158, 9, 'OK')
line(front, 240, 133, 247, 133, ORANGE)
line(front, 247, 133, 247, 187, ORANGE)
text(front, 217, 191, 'Side Zoom', 2.5, ORANGE)
text(front, 15, 253, 'Filled blue = documented module outline. Other geometry = deliberate paper-test assumptions.', 3.5)
text(front, 15, 261, 'NAV 30 diameter footprint; other caps 18. Mechanisms, travel, grip and reach are unverified.', 3.3)
text(front, 15, 269, 'Four workspace keys are W1-W4 placeholders; no new destinations or control functions.', 3.3)

rear = common('CONTOUR / Rear service reservations', 'Looking from the rear: X is mirrored. These are projections, not usable same-plane packing.')
rect(rear, 40, 58, 185, 160, None, ORANGE, True, 5)
text(rear, 44, 55, '15 perimeter study allowance - provisional', 3.2, ORANGE)
rect(rear, BODY_X+BODY_W-x-w, BODY_Y+y, w, h, None, BLUE, True)
text(rear, 66, 89, 'DISPLAY REAR PROJECTION', 4, BLUE)
text(rear, 68, 98, 'Do not count this as empty volume.', 3.3, BLUE)
text(rear, 67, 116, 'Electronics support / board allocation', 3.8)
text(rear, 69, 126, 'OPEN until actual component heights,', 3.2)
text(rear, 69, 133, 'mounts and connector exits are known.', 3.2)
rect(rear, 42, 191, 181, 26, None, MUTED, True)
text(rear, 57, 202, 'CONTROL BACKS + HARNESS ROUTING', 3.5)
text(rear, 60, 210, 'Mechanism depth / wire bends / access OPEN', 3)
line(rear, 25, 133, 18, 133, ORANGE)
text(rear, 63, 156, 'Side Zoom bracket OPEN', 3, ORANGE)
text(rear, 15, 251, '185 x 160 dashed region is an allocation boundary, NOT a free PCB area or proven clearance.', 3.4)
text(rear, 15, 259, 'Open passive lid > reach/disconnect harnesses > remove support > access front retainers.', 3.4)
text(rear, 15, 267, 'Board, energy, antenna, thermal, fastener and cable envelopes remain unallocated.', 3.4)

pages = [('contour-sizing-front', front), ('contour-sizing-rear', rear)]
pdf = canvas.Canvas(str(OUTPUT/'contour-sizing.pdf'), pagesize=(PAGE_W*mm, PAGE_H*mm))
pdf.setTitle('Contour trial sizing and service reservations')
for name, drawing in pages:
    renderSVG.drawToFile(drawing, str(OUTPUT/(name+'.svg')))
    renderPDF.draw(drawing, pdf, 0, 0)
    pdf.showPage()
pdf.save()
print('Wrote two editable SVGs and two-page 265 x 300 mm paper-study PDF.')

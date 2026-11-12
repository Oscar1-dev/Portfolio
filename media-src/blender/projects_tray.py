"""PROJECTS — "Parts tray".
Fourteen different machined components (one per project on the site) sit in a
pocketed tray. They lift and turn in a slow wave while a strip light crosses.
8 s seamless loop.
"""
import bpy, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

opt = cli()
FR = 240
sc = reset('projects_tray', 1280, 720, 30, FR, samples=72)
P = palette()
led = emit('Indicator', (1.0, 0.16, 0.12), 8.0)

COLS, ROWS, DX, DY = 7, 2, 1.3, 1.45


def sphere(r, material, loc=(0, 0, 0)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=r, location=loc)
    o = bpy.context.active_object
    for p in o.data.polygons:
        p.use_smooth = True
    o.data.materials.append(material)
    return o


def ring_of(n, r, fn):
    return [fn(r * math.cos(2 * math.pi * i / n), r * math.sin(2 * math.pi * i / n), 2 * math.pi * i / n) for i in range(n)]


def p_gear():
    g = prism('g', gear_pts(0.36, 0.44, 14), 0.16, P['pearl'], bevel=0.006)
    return cut(g, [cyl('c', 0.12, 1, None, bevel=0)])


def p_bearing():
    return join('b', [tube('r', 0.44, 0.37, 0.14, P['steel'], bevel=0.006), tube('r', 0.24, 0.17, 0.14, P['steel'], bevel=0.006)]
                + ring_of(9, 0.305, lambda x, y, a: sphere(0.062, P['brass'], (x, y, 0))))


def p_nut():
    n = prism('n', ngon_pts(0.42, 6), 0.22, P['steel'], bevel=0.02)
    return cut(n, [cyl('c', 0.2, 1, None, bevel=0)])


def p_fins():
    return join('f', [tube('f', 0.44, 0.14, 0.03, P['dark'], (0, 0, i * 0.07 - 0.14), bevel=0.004) for i in range(5)]
                + [cyl('c', 0.16, 0.36, P['dark'], bevel=0.006)])


def p_lens():
    l = sphere(0.36, P['glass'])
    l.scale = (1, 1, 0.3)
    return join('l', [tube('r', 0.44, 0.35, 0.1, P['brass'], bevel=0.008), l])


def p_board():
    parts = [box('b', (0.78, 0.6, 0.03), P['blue'], bevel=0.004)]
    for i in range(7):
        parts.append(box('c', (0.1 + 0.04 * (i % 3), 0.08, 0.04), P['black'], (-0.28 + 0.095 * i, -0.16 + 0.11 * ((i * 3) % 4), 0.035), 0.003))
    b = join('b', parts)
    lamp = cyl('lamp', 0.022, 0.03, led, (0.3, 0.2, 0.035), 16, 0.003)
    lamp.parent = b
    return b


def p_knob():
    return join('k', [cyl('k', 0.4, 0.2, P['dark'], bevel=0.02), cyl('k', 0.3, 0.06, P['steel'], (0, 0, 0.13), bevel=0.01)]
                + ring_of(40, 0.4, lambda x, y, a: box('t', (0.02, 0.03, 0.16), P['dark'], (x, y, 0), 0.004, (0, 0, a))))


def p_nozzle():
    return join('n', [cyl('n', 0.42, 0.34, P['steel'], bevel=0.008, r2=0.16), tube('n', 0.44, 0.3, 0.06, P['steel'], (0, 0, -0.2), bevel=0.006)])


def p_coupling():
    t = tube('c', 0.42, 0.3, 0.32, P['blue'], bevel=0.01)
    return cut(t, [box('c', (0.4, 0.09, 0.2), None, (0.36 * math.cos(a), 0.36 * math.sin(a), 0.1), 0, (0, 0, a)) for a in (0, math.pi / 2, math.pi, 3 * math.pi / 2)])


def p_plate():
    pl = box('p', (0.8, 0.8, 0.07), P['steel'], bevel=0.02)
    return cut(pl, [cyl('c', 0.06, 1, None, (x, y, 0), 24, 0) for x in (-0.27, 0.27) for y in (-0.27, 0.27)] + [cyl('c', 0.18, 1, None, bevel=0)])


def p_bracket():
    pts = [(-0.4, -0.4), (0.4, -0.4), (0.4, -0.22), (-0.2, -0.22), (-0.2, 0.4), (-0.4, 0.4)]
    return prism('b', pts, 0.24, P['dark'], bevel=0.014)


def p_piston():
    return join('p', [cyl('p', 0.34, 0.3, P['steel'], bevel=0.014)] + [tube('r', 0.35, 0.3, 0.03, P['black'], (0, 0, z), bevel=0.003) for z in (0.06, -0.02)]
                + [cyl('p', 0.09, 0.24, P['steel'], (0, 0, -0.25), bevel=0.006)])


def p_star():
    s = prism('s', gear_pts(0.2, 0.44, 5, duty=0.62, flank=0.3), 0.1, P['brass'], bevel=0.01)
    return cut(s, [cyl('c', 0.08, 1, None, bevel=0)])


def p_stack():
    return join('s', [cyl('s', 0.42 - i * 0.07, 0.07, (P['pearl'], P['dark'])[i % 2], (0, 0, i * 0.075 - 0.15), bevel=0.008) for i in range(5)])


builders = [p_gear, p_bearing, p_nut, p_fins, p_lens, p_board, p_knob,
            p_nozzle, p_coupling, p_plate, p_bracket, p_piston, p_star, p_stack]

tray = box('Tray', (COLS * DX + 0.5, ROWS * DY + 0.5, 0.34), P['black'], (0, 0, 0.17), 0.03)
slots = [((c - (COLS - 1) / 2) * DX, ((ROWS - 1) / 2 - r) * DY) for r in range(ROWS) for c in range(COLS)]
cut(tray, [cyl('c', 0.56, 0.24, None, (x, y, 0.34), 64, 0) for x, y in slots])

items = []
for i, (fn, (x, y)) in enumerate(zip(builders, slots)):
    o = fn()
    o.name = 'Part%02d' % (i + 1)
    items.append((o, x, y))

for f in range(1, FR + 1):
    ph = 2 * math.pi * (f - 1) / FR
    for i, (o, x, y) in enumerate(items):
        col = i % COLS
        lift = 0.5 - 0.5 * math.cos(ph - col * 0.75 - (i // COLS) * 0.4)
        turn = ph * (1 if i % 2 == 0 else -1)
        key(o, f, (x, y, 0.5 + 0.32 * lift ** 2), (math.radians(14) * lift, 0, turn))

floor(P['floor'], 0.0)
target = empty('Focus', (0, -0.1, 0.5))
cam = camera(sc, lens=42, fstop=2.8, focus=target)
tt = cam.constraints.new('TRACK_TO')
tt.target = target
strip = area('Strip', (0, 0, 3.2), (0, 0, 0), 5.0, 420, (0.86, 0.93, 1.0), 0.3)
for f in range(1, FR + 1):
    ph = 2 * math.pi * (f - 1) / FR
    key(cam, f, (1.6 * math.sin(ph), -8.2 + 0.5 * math.cos(ph), 6.4 + 0.4 * math.sin(ph * 2) * 0.5))
    key(target, f, (0.5 * math.sin(ph), -0.1, 0.5))
    key(strip, f, (5.2 * math.sin(ph + 1.2), 0, 3.2), (0, 0, math.radians(90)))
area('Key', (-5, -4, 6), (0, 0, 0.4), 5.0, 520, (0.74, 0.85, 1.0))
area('Rim', (4, 5, 5.5), (0, 0, 0.5), 3.0, 900, (1.0, 0.93, 0.84))
area('Fill', (6, -5, 1.5), (0, 0, 0.5), 4.0, 110, (0.55, 0.66, 0.8))

finish(sc, 'projects_tray', opt, preview_frames=(1, 90))

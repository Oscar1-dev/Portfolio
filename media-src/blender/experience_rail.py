"""EXPERIENCE — "Rail".
A graduated rail with three stations (the three current roles), shot low and
long with a rack focus that travels between them. 8 s seamless loop.
"""
import bpy, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

opt = cli()
FR = 240
sc = reset('experience_rail', 1280, 720, 30, FR, samples=72)
P = palette()
mark = emit('StationLight', (0.62, 0.8, 1.0), 6.0)

rail = box('Rail', (40, 0.7, 0.16), P['dark'], (14, 0, 0.08), 0.015)
groove = box('Groove', (40, 0.1, 0.03), P['steel'], (14, 0, 0.165), 0.004)
ticks = join('Ticks', [box('t', (0.02, 0.22 if i % 5 else 0.34, 0.012), P['steel'], (i * 0.25 - 4, -0.2, 0.166), 0.002) for i in range(120)])

stations = []
# 1 — steel block with a slot (nearest)
a = box('s1', (0.9, 0.62, 0.7), P['steel'], (0, 0, 0.52), 0.03)
cut(a, [box('c', (1.2, 0.2, 0.26), None, (0, 0, 0.62), 0)])
stations.append((a, 1.2))
# 2 — ceramic and graphite stack
b = join('s2', [cyl('s', 0.34 - 0.04 * i, 0.16, (P['pearl'], P['dark'], P['brass'], P['pearl'], P['dark'])[i], (0, 0, 0.26 + i * 0.17), bevel=0.012) for i in range(5)])
stations.append((b, 5.2))
# 3 — anodised frame with a glass core
c = tube('s3', 0.42, 0.33, 0.5, P['blue'], (0, 0, 0.6), bevel=0.014)
c.rotation_euler = (math.radians(90), 0, 0)
core = cyl('s3core', 0.2, 0.3, P['glass'], (0, 0, 0.6), bevel=0.02)
core.rotation_euler = (math.radians(90), 0, 0)
foot = box('s3foot', (0.7, 0.5, 0.14), P['dark'], (0, 0, 0.23), 0.02)
c3 = join('s3', [c, core, foot])
stations.append((c3, 9.6))
for o, x in stations:
    o.location.x = x
    lamp = cyl('lamp', 0.035, 0.02, mark, (x, -0.27, 0.172), 16, 0)

floor(P['floor'], 0.0)
box('Backdrop', (80, 0.2, 30), P['black'], (14, 14, 10), 0)
area('Horizon', (16, 12.5, 0.4), (16, 14, 3.5), 24.0, 900, (0.42, 0.55, 0.7), 1.2)

target = empty('Focus', (1.2, 0, 0.5))
aimp = empty('Aim', (5.2, 0, 0.45))
cam = camera(sc, lens=70, fstop=1.8, focus=target)
tt = cam.constraints.new('TRACK_TO')
tt.target = aimp
strip = area('Strip', (0, 0, 2.6), (0, 0, 0), 3.0, 260, (0.86, 0.93, 1.0), 0.3)
for f in range(1, FR + 1):
    ph = 2 * math.pi * (f - 1) / FR
    travel = 0.5 - 0.5 * math.cos(ph)  # 0 → 1 → 0
    key(target, f, (1.2 + 8.4 * smooth(travel), 0, 0.5))
    key(cam, f, (-4.8 + 0.5 * math.sin(ph), -2.5 + 0.25 * math.sin(ph), 1.15 + 0.12 * math.cos(ph)))
    key(strip, f, (1.2 + 8.4 * smooth(travel), 0, 2.6))
area('Key', (-2, -5, 5), (4, 0, 0.4), 5.0, 800, (0.74, 0.85, 1.0))
area('Rim', (9, 6, 3.5), (5, 0, 0.5), 4.0, 2200, (1.0, 0.93, 0.84))
area('Fill', (2, -5, 0.8), (5, 0, 0.5), 4.0, 90, (0.55, 0.66, 0.8))

finish(sc, 'experience_rail', opt, preview_frames=(1, 120))

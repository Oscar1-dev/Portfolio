"""BRAND — the Oscar Senior / Nops mark as a machined object.
A steel disc with two slots cut in from opposite edges. The shape has
half-turn symmetry, so a 180° turn lands on itself: 4 s seamless loop.
Frame 1 is the avatar / profile picture.
"""
import bpy, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

opt = cli()
FR = 120
sc = reset('brand_disc', 1080, 1080, 30, FR, samples=128)
P = palette()

TILT = math.radians(-18)


def rot(x, y):
    return (x * math.cos(TILT) - y * math.sin(TILT), x * math.sin(TILT) + y * math.cos(TILT), 0)


disc = cyl('Mark', 1.0, 0.2, mat('MarkSteel', (0.66, 0.69, 0.72), 1.0, 0.42), verts=160, bevel=0.018)
W, L = 6.5 / 28, 1.66
cut(disc, [box('c', (W, L, 1), None, rot(-0.295, 0.357 - L / 2), 0, (0, 0, TILT)),
           box('c', (W, L, 1), None, rot(0.295, -0.357 + L / 2), 0, (0, 0, TILT))])
back = cyl('BackRing', 1.12, 0.06, P['dark'], (0, 0, -0.14), verts=160, bevel=0.012)
rig = empty('MarkRig', (0, 0, 1.5))
turn = empty('Turn')
turn.parent = rig
parent([disc, back], turn)
rig.rotation_euler = (math.radians(90), 0, 0)

for f in range(1, FR + 1):
    key(turn, f, rot=(0, 0, -math.pi * span(f, 15, 105)))

floor(P['floor'], 0.0)
box('Backdrop', (60, 0.2, 30), P['black'], (0, 6, 10), 0)
area('Horizon', (0, 5.2, 0.3), (0, 6, 2.6), 14.0, 420, (0.42, 0.55, 0.7), 1.0)
target = empty('Focus', (0, 0, 1.5))
cam = camera(sc, lens=70, fstop=4.0, focus=target)
cam.location = (1.5, -7.0, 1.9)
tt = cam.constraints.new('TRACK_TO')
tt.target = target
area('Key', (-3.5, -4.5, 5.0), (0, 0, 1.5), 4.0, 620, (0.74, 0.85, 1.0))
area('Rim', (3.0, 3.5, 4.5), (0, 0, 1.6), 2.0, 1500, (1.0, 0.93, 0.84))
area('Strip', (0.5, -3.0, 0.6), (0, 0, 1.5), 5.0, 160, (0.9, 0.95, 1.0), 0.2)
area('Fill', (5, -3, 1.2), (0, 0, 1.5), 3.0, 90, (0.55, 0.66, 0.8))

finish(sc, 'brand_disc', opt, preview_frames=(1, 60))

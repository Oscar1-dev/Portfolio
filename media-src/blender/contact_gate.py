"""CONTACT — "Gate".
Two tall slabs stand almost closed; light breathes through the gap between
them and runs out across the floor towards the viewer. The door is ajar.
6 s seamless loop.
"""
import bpy, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

opt = cli()
FR = 180
sc = reset('contact_gate', 1280, 720, 30, FR, samples=96)
P = palette()
glow = emit('GateLight', (1.0, 0.9, 0.78), 10.0)

left = box('SlabLeft', (2.4, 0.8, 5.6), P['dark'], (-1.28, 0, 2.8), 0.03)
right = box('SlabRight', (2.4, 0.8, 5.6), P['dark'], (1.28, 0, 2.8), 0.03)
for s, sx in ((left, -1), (right, 1)):
    # machined reveals so the slabs read as made objects, not boxes
    cut(s, [box('c', (0.05, 1.0, 5.0), None, (sx * 0.9, -0.42, 2.8), 0), box('c', (2.6, 1.0, 0.04), None, (sx * 1.28, -0.42, 4.6), 0)])
for i in range(5):
    box('Tick', (0.16, 0.02, 0.014), P['steel'], (-0.36, -0.41, 0.9 + i * 0.5), 0.002)
panel = box('Light', (0.5, 0.05, 5.4), glow, (0, 0.5, 2.8), 0)
sill = box('Sill', (5.6, 1.4, 0.06), P['black'], (0, 0, 0.03), 0.01)

floor(P['floor'], 0.0)
box('Backdrop', (60, 0.2, 30), P['black'], (0, 9, 10), 0)
target = empty('Focus', (0, 0, 1.9))
cam = camera(sc, lens=40, fstop=4.0, focus=target)
tt = cam.constraints.new('TRACK_TO')
tt.target = target
for f in range(1, FR + 1):
    ph = 2 * math.pi * (f - 1) / FR
    breath = 0.5 - 0.5 * math.cos(ph)
    gap = 0.07 + 0.11 * smooth(breath)
    key(left, f, (-1.2 - gap, 0, 2.8))
    key(right, f, (1.2 + gap, 0, 2.8))
    key_emission(glow, f, 14 + 26 * breath)
    key(cam, f, (0.5 * math.sin(ph), -9.6 + 0.9 * breath, 1.25 + 0.1 * math.sin(ph)))
area('Top', (0, -2.5, 8), (0, 0, 3), 6.0, 380, (0.7, 0.82, 1.0))
area('SideL', (-7, -2, 3), (-1.3, 0, 2.8), 3.0, 620, (0.5, 0.64, 0.82))
area('SideR', (7, -1, 4), (1.3, 0, 2.8), 3.0, 420, (0.5, 0.64, 0.82))

finish(sc, 'contact_gate', opt, preview_frames=(1, 90))

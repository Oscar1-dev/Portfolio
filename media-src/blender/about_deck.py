"""ABOUT — "Deck".
A machined turntable under red and magenta light: the personal page's scene,
because music is the one thing on that page described as non-negotiable.
The record makes exactly three turns in 6 s, so the loop is seamless.
"""
import bpy, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

opt = cli()
FR = 180
sc = reset('about_deck', 1280, 720, 30, FR, samples=72)
P = palette()

plinth = box('Plinth', (4.6, 3.7, 0.36), P['black'], (0.3, 0, 0.18), 0.04)
platter = cyl('Platter', 1.62, 0.14, P['steel'], (0, 0, 0.44), bevel=0.012)
dots = join('StrobeDots', [cyl('d', 0.018, 0.02, P['black'], (1.62 * math.cos(a), 1.62 * math.sin(a), 0.44), 12, 0) for a in [i * 2 * math.pi / 90 for i in range(90)]])

# record: gloss black with concentric grooves
rec_m = mat('Record', (0.006, 0.006, 0.007), 0.0, 0.24, **{'Coat Weight': 0.15, 'Anisotropic': 0.8})
nt = rec_m.node_tree
tc = nt.nodes.new('ShaderNodeTexCoord')
wv = nt.nodes.new('ShaderNodeTexWave')
wv.wave_type = 'RINGS'
wv.rings_direction = 'Z'
wv.inputs['Scale'].default_value = 34
wv.inputs['Distortion'].default_value = 0.4
wv.inputs['Detail'].default_value = 2
bp = nt.nodes.new('ShaderNodeBump')
bp.inputs['Strength'].default_value = 0.35
bp.inputs['Distance'].default_value = 0.004
nt.links.new(tc.outputs['Object'], wv.inputs['Vector'])
nt.links.new(wv.outputs[0], bp.inputs['Height'])
nt.links.new(bp.outputs['Normal'], nt.nodes['Principled BSDF'].inputs['Normal'])
record = cyl('Record', 1.5, 0.016, rec_m, (0, 0, 0.52), 128, 0.004)
label_m = mat('Label', (0.42, 0.03, 0.12), 0.0, 0.5)
label = cyl('Label', 0.5, 0.004, label_m, (0, 0, 0.531), 64, 0)
notch = box('LabelMark', (0.3, 0.035, 0.003), P['pearl'], (0.26, 0, 0.534), 0)
notch2 = cyl('LabelDot', 0.03, 0.003, P['pearl'], (-0.3, 0.12, 0.534), 16, 0)
spindle = cyl('Spindle', 0.035, 0.12, P['steel'], (0, 0, 0.58), 24, 0.01)
spin = empty('Spin')
parent([platter, dots, record, label, notch, notch2, spindle], spin)

# tonearm
pivot = empty('ArmPivot', (2.05, 1.25, 0.62))
base = cyl('ArmBase', 0.26, 0.26, P['dark'], (2.05, 1.25, 0.49), bevel=0.02)
post = cyl('ArmPost', 0.07, 0.3, P['steel'], (0, 0, 0.0), 32, 0.01)
arm = cyl('Arm', 0.028, 2.5, P['steel'], (0, -1.05, 0.12), 24, 0.004)
arm.rotation_euler = (math.radians(90), 0, 0)
weight = cyl('Counterweight', 0.13, 0.3, P['dark'], (0, 0.42, 0.12), bevel=0.02)
weight.rotation_euler = (math.radians(90), 0, 0)
shell = box('Headshell', (0.16, 0.34, 0.035), P['dark'], (0, -2.34, 0.1), 0.008)
cart = box('Cartridge', (0.12, 0.18, 0.08), P['pearl'], (0, -2.38, 0.045), 0.01)
parent([post, arm, weight, shell, cart], pivot)
box('SpeedKey', (0.3, 0.14, 0.05), P['steel'], (2.2, -1.4, 0.38), 0.012)
box('SpeedKey2', (0.3, 0.14, 0.05), P['dark'], (2.2, -1.15, 0.38), 0.012)

for f in range(1, FR + 1):
    ph = 2 * math.pi * (f - 1) / FR
    key(spin, f, rot=(0, 0, -3 * ph))
    key(pivot, f, rot=(math.radians(0.5) * math.sin(ph * 3), 0, math.radians(-29 + 0.6 * math.sin(ph))))

floor(P['floor'], 0.0)
box('Backdrop', (60, 0.2, 30), P['black'], (0, 11, 10), 0)
area('Horizon', (0, 9.5, 0.4), (0, 11, 3.0), 18.0, 520, (0.75, 0.1, 0.36), 1.2)
target = empty('Focus', (0.9, -0.5, 0.56))
cam = camera(sc, lens=62, fstop=2.2, focus=target)
tt = cam.constraints.new('TRACK_TO')
tt.target = target
for f in range(1, FR + 1):
    ph = 2 * math.pi * (f - 1) / FR
    key(cam, f, (3.9 + 0.45 * math.sin(ph), -5.4 + 0.3 * math.cos(ph), 2.1 + 0.18 * math.sin(ph)))
area('Magenta', (-5.5, 5.0, 1.6), (0, 0, 0.5), 2.0, 900, (0.95, 0.12, 0.5))
area('Red', (5.5, 2.5, 1.6), (0.5, 0, 0.5), 2.0, 600, (1.0, 0.14, 0.1))
area('Key', (1.5, -4.5, 5.5), (0.5, 0, 0.5), 4.0, 240, (0.8, 0.88, 1.0))
area('Strip', (-1.0, -1.0, 3.0), (0, 0, 0.5), 6.0, 150, (1.0, 0.95, 0.9), 0.2)

finish(sc, 'about_deck', opt, preview_frames=(1, 60))

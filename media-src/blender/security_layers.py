"""CYBERSECURITY — "Layers".
A probe beam works through a row of rotating plates. Each plate only lets it
pass once its aperture lines up; the last plate has no aperture at all, so the
beam stops there (defence in depth, failing closed). Then the plates turn away
and the beam is pushed back out. 10 s seamless loop.
"""
import bpy, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

opt = cli()
FR = 300
sc = reset('security_layers', 1280, 720, 30, FR, samples=72)
P = palette()
beam_m = emit('Beam', (0.5, 0.78, 1.0), 40.0)
stop_m = emit('StopIndicator', (1.0, 0.16, 0.12), 1.0)

rig = empty('Stack')
N, GAP, R_BEAM = 7, 1.05, 0.56
zs = [(i - (N - 1) / 2) * GAP for i in range(N)]
mats = [P['steel'], P['dark'], P['blue'], P['steel'], P['pearl'], P['dark'], P['black']]
plates = []
for i in range(N):
    thick = 0.07 if i < N - 1 else 0.16
    d = cyl('Plate%d' % (i + 1), 1.0 - 0.03 * (i % 2), thick, mats[i], bevel=0.01)
    cutters = [cyl('c', 0.16, 1, None, bevel=0)]
    if i < N - 1:
        cutters.append(cyl('c', 0.13, 1, None, (R_BEAM, 0, 0), 48, 0))  # the aperture
        for k in range(1, 3 + i % 3):  # blind detail cuts so every plate reads differently
            a = k * 2 * math.pi / (3 + i % 3) + 0.5
            cutters.append(box('c', (0.3, 0.07, 1), None, (0.62 * math.cos(a), 0.62 * math.sin(a), 0), 0, (0, 0, a)))
    else:
        ringlamp = tube('StopRing', 0.66, 0.60, 0.02, stop_m, (0, 0, -0.085), bevel=0)
        ringlamp.parent = d
    cut(d, cutters)
    d.parent = rig
    plates.append(d)

axle = cyl('Axle', 0.1, GAP * (N - 1) + 1.2, P['steel'], bevel=0.01)
axle.parent = rig
src = join('Emitter', [cyl('e', 0.2, 0.7, P['dark'], (R_BEAM, 0, zs[0] - 1.5), bevel=0.02), cyl('e', 0.1, 0.16, P['brass'], (R_BEAM, 0, zs[0] - 1.1), bevel=0.01)])
src.parent = rig
beam = cyl('Beam', 0.022, 1.0, beam_m, verts=24, bevel=0)
beam.parent = rig
tip = point('BeamTip', (0, 0, 0), 30, (0.5, 0.78, 1.0), 0.03)
tip.parent = rig
Z0 = zs[0] - 1.05
offsets = [1.0 + 0.45 * i for i in range(N - 1)]


def opened(f, i):
    return span(f, 18 + i * 30, 44 + i * 30) * (1 - span(f, 232 + i * 3, 268 + i * 3))


tipz = zs[0]
for f in range(1, FR + 1):
    stop_at = N - 1
    for i in range(N - 1):
        p = opened(f, i)
        key(plates[i], f, (0, 0, zs[i]), (0, 0, offsets[i] * (1 - p)))
        if p < 0.97 and i < stop_at:
            stop_at = i
    key(plates[N - 1], f, (0, 0, zs[N - 1] + 0.04), (0, 0, 0))
    goal = zs[stop_at] - 0.04
    tipz += max(-0.5, min(0.22, goal - tipz))  # beam advances at a finite speed, retreats faster
    key(beam, f, (R_BEAM, 0, (Z0 + tipz) / 2))
    beam.scale = (1, 1, max(0.01, tipz - Z0))
    beam.keyframe_insert('scale', frame=f)
    key(tip, f, (R_BEAM, 0, tipz - 0.05))
    blocked = 1.0 if (stop_at == N - 1 and abs(goal - tipz) < 0.05) else 0.0
    key_emission(stop_m, f, 0.8 + 16.0 * blocked)

rig.rotation_euler = (0, math.radians(90), 0)
rig.location = (0, 0, 1.35)
for x in (zs[0] - 0.4, zs[-1] + 0.5):
    box('Stand', (0.16, 0.5, 1.3), P['black'], (x, 0, 0.62), 0.02)
box('Base', (GAP * (N - 1) + 2.4, 1.0, 0.1), P['black'], (0, 0, 0.05), 0.02)

floor(P['floor'], 0.0)
box('Backdrop', (60, 0.2, 30), P['black'], (0, 11, 10), 0)
area('Horizon', (0, 9.5, 0.4), (0, 11, 3.5), 18.0, 700, (0.42, 0.55, 0.7), 1.2)
target = empty('Focus', (0.3, 0, 1.3))
cam = camera(sc, lens=50, fstop=3.2, focus=target)
tt = cam.constraints.new('TRACK_TO')
tt.target = target
for f in range(1, FR + 1):
    ph = 2 * math.pi * (f - 1) / FR
    ang = math.radians(-58 + 12 * math.sin(ph))
    dist = 9.6 - 0.8 * math.sin(ph)
    key(cam, f, (dist * math.cos(ang), dist * math.sin(ang), 2.6 + 0.3 * math.cos(ph)))
area('Key', (-3.5, -5.5, 6.5), (0, 0, 1.3), 5.0, 700, (0.74, 0.85, 1.0))
area('Rim', (2.5, 5.0, 7.0), (0, 0, 1.4), 2.5, 1900, (1.0, 0.93, 0.84))
area('Fill', (7, -3, 1.2), (0, 0, 1.3), 4.0, 120, (0.55, 0.66, 0.8))

finish(sc, 'security_layers', opt, preview_frames=(1, 120, 215))

"""HERO â€” "Teardown".
A machined instrument core drifts apart into its exploded view and closes again
while the camera sways around it. 10 s seamless loop (starts and ends exploded).
"""
import bpy, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

opt = cli()
FR = 300
sc = reset('hero_teardown', 1920, 1080, 30, FR, samples=80)
P = palette()
led = emit('Indicator', (1.0, 0.16, 0.12), 6.0)
core_glow = emit('CoreGlow', (0.62, 0.8, 1.0), 0.0)

rig = empty('Assembly')
parts = []  # (object, assembled z, spin turns)


def add(o, z, spin=0.0):
    o.location.z = 0
    o.parent = rig
    parts.append((o, z, spin))
    return o


# 1 â€” back plate with a bolt circle
plate = cyl('BackPlate', 1.02, 0.10, P['dark'])
cut(plate, [cyl('c', 0.055, 0.4, None, (0.84 * math.cos(a), 0.84 * math.sin(a), 0), 24, 0) for a in [i * math.pi / 4 for i in range(8)]]
    + [cyl('c', 0.30, 0.4, None, bevel=0)])
add(plate, -0.78, 0.15)

# 2 â€” cooling fins
fins = join('Fins', [tube('f', 0.96, 0.52, 0.022, P['steel'], (0, 0, i * 0.055), bevel=0.004) for i in range(6)])
add(fins, -0.62, -0.2)

# 2b â€” ball bearing
races = [tube('r', 0.78, 0.69, 0.16, P['steel'], bevel=0.008), tube('r', 0.50, 0.41, 0.16, P['steel'], bevel=0.008)]
balls = []
for i in range(14):
    a = i * 2 * math.pi / 14
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=0.092, location=(0.595 * math.cos(a), 0.595 * math.sin(a), 0))
    b = bpy.context.active_object
    _ = [setattr(p, 'use_smooth', True) for p in b.data.polygons]
    b.data.materials.append(P['pearl'])
    balls.append(b)
cage = tube('cage', 0.63, 0.56, 0.05, P['brass'], bevel=0.004)
add(join('Bearing', races + balls + [cage]), -0.40, 0.8)

# 3 â€” main housing with side windows
housing = tube('Housing', 0.98, 0.80, 0.56, P['dark'], bevel=0.014)
cut(housing, [box('c', (0.5, 0.26, 0.30), None, (0.9 * math.cos(a), 0.9 * math.sin(a), 0), 0, (0, 0, a)) for a in [i * math.pi / 3 for i in range(6)]])
add(housing, -0.10, 0.25)

# 4 â€” ceramic rotor (gear)
rotor = prism('Rotor', gear_pts(0.62, 0.74, 18), 0.20, P['pearl'], bevel=0.008)
cut(rotor, [cyl('c', 0.22, 0.6, None, bevel=0)] + [cyl('c', 0.085, 0.6, None, (0.42 * math.cos(a), 0.42 * math.sin(a), 0), 32, 0) for a in [i * math.pi / 3 for i in range(6)]])
add(rotor, -0.14, 1.0)

# 5 â€” carrier disc with components and the one red indicator
carrier = cyl('Carrier', 0.76, 0.03, P['blue'], bevel=0.004)
bits = [carrier]
for i in range(14):
    a = i * 2 * math.pi / 14 + 0.2
    r = 0.44 + 0.2 * ((i * 7) % 3) / 2
    s = 0.05 + 0.03 * ((i * 5) % 4)
    bits.append(box('chip', (s * 1.6, s, 0.035), P['black'], (r * math.cos(a), r * math.sin(a), 0.03), 0.004, (0, 0, a)))
carrier = join('Carrier', bits)
lamp = cyl('Indicator', 0.028, 0.03, led, (0.62, 0.0, 0.04), 24, 0.004)
lamp.parent = carrier
add(carrier, 0.10, -0.35)

# 6 â€” glowing core rod on the axis
core = cyl('Core', 0.13, 0.9, core_glow, bevel=0.02)
add(core, 0.0, 0.0)
sleeve = tube('CoreSleeve', 0.2, 0.15, 0.5, P['glass'], bevel=0.006)
add(sleeve, 0.05, 0.0)

# 7 â€” bronze retaining ring + lens
retain = tube('Retainer', 0.80, 0.60, 0.07, P['brass'], bevel=0.008)
add(retain, 0.28, 0.4)
bpy.ops.mesh.primitive_uv_sphere_add(segments=96, ring_count=48, radius=0.6)
lens = bpy.context.active_object
lens.scale = (1, 1, 0.22)
bpy.ops.object.transform_apply(scale=True)
_ = [setattr(p, 'use_smooth', True) for p in lens.data.polygons]
lens.name = 'Lens'
lens.data.materials.append(P['glass'])
add(lens, 0.34, 0.0)

# 8 â€” front bezel, knurled edge
bezel = tube('Bezel', 1.0, 0.66, 0.12, P['steel'], bevel=0.012)
knurl = join('Knurl', [box('k', (0.03, 0.05, 0.10), P['steel'], (1.0 * math.cos(a), 1.0 * math.sin(a), 0), 0.006, (0, 0, a)) for a in [i * 2 * math.pi / 72 for i in range(72)]])
bezel = join('Bezel', [bezel, knurl])
add(bezel, 0.46, -0.3)

# 9 â€” six through-bolts with hex heads
bolts = []
for i in range(6):
    a = i * math.pi / 3 + math.pi / 6
    x, y = 0.89 * math.cos(a), 0.89 * math.sin(a)
    shank = cyl('s', 0.028, 1.34, P['steel'], (x, y, 0), 24, 0.003)
    head = prism('h', ngon_pts(0.062, 6), 0.05, P['steel'], (x, y, 0.69), 0.006)
    bolts.append(join('Bolt%d' % i, [shank, head]))

floor(P['floor'], 0.0)
wall = box('Backdrop', (60, 0.2, 30), P['black'], (0, 11, 10), 0)
glow_l = area('Horizon', (0, 9.5, 0.4), (0, 11, 3.5), 18.0, 900, (0.42, 0.55, 0.7), 1.2)
inner = point('CoreLight', (0, 0, 1.5), 0, (0.62, 0.8, 1.0), 0.1)
order = [p[0] for p in parts]
N = len(parts)
GAP = 0.6


def exploded_z(i, z):
    return z + (i - (N - 1) / 2) * GAP


# timeline: hold 1-20 Â· close 20-140 Â· hold 140-185 Â· open 185-285 Â· hold 285-300
def progress(f, i):
    lag = (N - 1 - abs(i - (N - 1) / 2) * 2) * 3  # outer parts lead, inner follow
    close = span(f, 20 + lag, 110 + lag)
    lag2 = abs(i - (N - 1) / 2) * 2 * 3
    opening = span(f, 185 + lag2, 265 + lag2)
    return close * (1 - opening)


for f in range(1, FR + 1):
    for i, (o, z, spin) in enumerate(parts):
        p = progress(f, i)
        key(o, f, (0, 0, exploded_z(i, z) * (1 - p) + z * p), (0, 0, (1 - p) * spin * math.pi))
    for i, b in enumerate(bolts):
        p = span(f, 96 + i * 4, 146 + i * 2) * (1 - span(f, 185 + i * 2, 225 + i * 4))
        key(b, f, (0, 0, 4.4 * (1 - p)), (0, 0, (1 - p) * 2.5 * math.pi))
    glow = span(f, 120, 150) * (1 - span(f, 180, 215))
    key_emission(core_glow, f, 0.6 + 22.0 * glow)
    inner.data.energy = 4 + 260 * glow
    inner.data.keyframe_insert('energy', frame=f)
    key_emission(led, f, 3.0 + 9.0 * (0.5 + 0.5 * math.sin(f * 2 * math.pi / 60)))
for b in bolts:
    b.parent = rig

# lay the stack on its side, a quarter turn towards the lens
rig.rotation_euler = (0, math.radians(90), 0)
rig.location = (0, 0, 1.5)


target = empty('Focus', (0.1, 0, 1.45))
cam = camera(sc, lens=46, fstop=3.2, focus=target)
tt = cam.constraints.new('TRACK_TO')
tt.target = target
for f in range(1, FR + 1):
    ph = 2 * math.pi * (f - 1) / FR
    ang = math.radians(-62 + 16 * math.sin(ph))
    dist = 11.6 - 3.8 * (0.5 - 0.5 * math.cos(ph))  # pushes in while assembled
    height = 2.5 + 0.5 * math.sin(ph + 0.8)
    key(cam, f, (dist * math.cos(ang), dist * math.sin(ang), height))

key_l = area('Key', (-3.5, -5.5, 6.5), (0, 0, 1.5), 5.0, 850, (0.74, 0.85, 1.0))
rim = area('Rim', (2.5, 5.0, 7.0), (0, 0, 1.6), 2.5, 2000, (1.0, 0.93, 0.84))
strip = area('Strip', (0, -2.5, 5.2), (0, 0, 1.5), 9.0, 520, (0.9, 0.95, 1.0), 0.25)
fill = area('Fill', (7, -3, 1.2), (0, 0, 1.5), 4.0, 160, (0.55, 0.66, 0.8))
for f in range(1, FR + 1):
    ph = 2 * math.pi * (f - 1) / FR
    key(strip, f, (3.2 * math.sin(ph), -2.5, 5.2))

finish(sc, 'hero_teardown', opt, preview_frames=(1, 80, 160))

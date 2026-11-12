"""HERO FILM — "Orbit".
Four real project screens stand as lit panels on a ring. The camera travels
once around them in 12 s, so the film loops with no cut. Each panel carries
its project's name in space above it; nebula light turns slowly behind.
Screens are the site's own screenshots (public/images); type is Space Grotesk.
    blender -b -P media-src/blender/hero_film.py -- --preview
"""
import bpy, bmesh, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

opt = cli()
FR = 360
sc = reset('hero_film', 1920, 1080, 30, FR, samples=64)
sc.view_settings.view_transform = 'Standard'   # screens must keep their real colours
try:
    sc.view_settings.look = 'None'
except Exception:
    pass
sc.render.motion_blur_shutter = 0.25
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
IMG = os.path.join(ROOT, 'public', 'images')
FONT_B = bpy.data.fonts.load(os.path.join(HERE, '..', 'fonts', 'SpaceGrotesk-700.ttf'))
FONT_M = bpy.data.fonts.load(os.path.join(HERE, '..', 'fonts', 'SpaceGrotesk-500.ttf'))

PANELS = [  # image, aspect, title, line, glow colour
    ('projects/nops-investigations.webp', 2000 / 1023, 'NOPS / Cyber Intelligence', 'Threat-intelligence workspace', (0.25, 0.55, 1.0)),
    ('projects/kush-home.webp', 1600 / 1000, 'KUSH', 'My software business', (0.75, 0.45, 1.0)),
    ('projects/mindhouse.webp', 1280 / 720, 'MINDHOUSE', 'Five agents, one workspace', (1.0, 0.2, 0.6)),
    ('feedback-cover.webp', 1920 / 1080, 'FEEDBACK', 'Local-first music player', (1.0, 0.18, 0.15)),
]
RING, WIDTH = 6.4, 5.6


def rounded(name, w, h, r, z=0.0, seg=10):
    """Rounded rectangle in the XZ plane, facing -Y, with 0..1 UVs."""
    pts = []
    for cx, cz, a0 in ((w / 2 - r, h / 2 - r, 0), (-w / 2 + r, h / 2 - r, 90), (-w / 2 + r, -h / 2 + r, 180), (w / 2 - r, -h / 2 + r, 270)):
        for i in range(seg + 1):
            a = math.radians(a0 + 90 * i / seg)
            pts.append((cx + r * math.cos(a), cz + r * math.sin(a)))
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    vs = [bm.verts.new((x, z, y)) for x, y in pts]
    f = bm.faces.new(vs)
    uv = bm.loops.layers.uv.new()
    for loop in f.loops:
        loop[uv].uv = (loop.vert.co.x / w + 0.5, loop.vert.co.z / h + 0.5)
    bm.normal_update()
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(o)
    return o


def screen_mat(path):
    m = bpy.data.materials.new('Screen')
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    tex = nt.nodes.new('ShaderNodeTexImage')
    tex.image = bpy.data.images.load(path)
    b.inputs['Base Color'].default_value = (0, 0, 0, 1)
    b.inputs['Roughness'].default_value = 0.25
    nt.links.new(tex.outputs['Color'], b.inputs['Emission Color'])
    b.inputs['Emission Strength'].default_value = 1.7
    return m


def glow_mat(color, strength):
    """Soft halo: emission that falls off from the centre and fades to nothing."""
    m = bpy.data.materials.new('Glow')
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.remove(nt.nodes['Principled BSDF'])
    out = nt.nodes['Material Output']
    tc = nt.nodes.new('ShaderNodeTexCoord')
    mp = nt.nodes.new('ShaderNodeMapping')
    mp.inputs['Location'].default_value = (-1, -1, 0)
    mp.inputs['Scale'].default_value = (2, 2, 1)
    gr = nt.nodes.new('ShaderNodeTexGradient'); gr.gradient_type = 'SPHERICAL'
    pw = nt.nodes.new('ShaderNodeMath'); pw.operation = 'POWER'; pw.inputs[1].default_value = 2.2
    em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Color'].default_value = (*color, 1); em.inputs['Strength'].default_value = strength
    tr = nt.nodes.new('ShaderNodeBsdfTransparent')
    mx = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(tc.outputs['UV'], mp.inputs['Vector']); nt.links.new(mp.outputs['Vector'], gr.inputs['Vector'])
    nt.links.new(gr.outputs['Fac'], pw.inputs[0]); nt.links.new(pw.outputs[0], mx.inputs['Fac'])
    nt.links.new(tr.outputs[0], mx.inputs[1]); nt.links.new(em.outputs[0], mx.inputs[2])
    nt.links.new(mx.outputs[0], out.inputs['Surface'])
    return m


def text(body, font, size, color, strength, loc, parent_obj):
    cu = bpy.data.curves.new('Text', 'FONT')
    cu.body = body
    cu.font = font
    cu.size = size
    cu.align_x = 'LEFT'
    o = bpy.data.objects.new('Text', cu)
    bpy.context.collection.objects.link(o)
    # type is one-sided: seen from behind it disappears instead of reading mirrored
    m = bpy.data.materials.new('Type'); m.use_nodes = True
    nt = m.node_tree
    nt.nodes.remove(nt.nodes['Principled BSDF'])
    em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Color'].default_value = (*color, 1); em.inputs['Strength'].default_value = strength
    tr = nt.nodes.new('ShaderNodeBsdfTransparent'); geo = nt.nodes.new('ShaderNodeNewGeometry'); mx = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(geo.outputs['Backfacing'], mx.inputs['Fac']); nt.links.new(em.outputs[0], mx.inputs[1]); nt.links.new(tr.outputs[0], mx.inputs[2])
    nt.links.new(mx.outputs[0], nt.nodes['Material Output'].inputs['Surface'])
    o.data.materials.append(m)
    o.rotation_euler = (math.radians(90), 0, 0)
    o.location = loc
    o.parent = parent_obj
    return o


bezel = add_micro(mat('Bezel', (0.02, 0.02, 0.024), 0.9, 0.3), 200, 0.03)
rigs = []
for i, (img, aspect, title, line, col) in enumerate(PANELS):
    ang = i * math.pi / 2
    rig = empty('Panel%d' % i)
    h = WIDTH / aspect
    scr = rounded('Screen', WIDTH, h, 0.16)
    scr.location.y = -0.03
    scr.data.materials.append(screen_mat(os.path.join(IMG, img)))
    back = rounded('Bezel', WIDTH + 0.14, h + 0.14, 0.2)
    back.location.y = 0.1
    back.data.materials.append(bezel)
    so = back.modifiers.new('Thick', 'SOLIDIFY'); so.thickness = 0.12; so.offset = 0
    halo = rounded('Halo', WIDTH * 1.5, h * 1.9, 0.5)
    halo.location.y = 0.22
    halo.data.materials.append(glow_mat(col, 0.3))
    parent([scr, back, halo], rig)
    text(title, FONT_B, 0.5, (1, 1, 1), 1.6, (-WIDTH / 2, -0.05, h / 2 + 0.34), rig)
    text(line, FONT_M, 0.2, (0.8, 0.82, 0.9), 1.0, (-WIDTH / 2, -0.05, -h / 2 - 0.36), rig)
    # stand on the ring, facing outwards
    for f in range(1, FR + 1):
        ph = 2 * math.pi * (f - 1) / FR
        bob = 0.14 * math.sin(ph * 2 + i * 1.6)
        key(rig, f, (RING * math.sin(ang), -RING * math.cos(ang), bob), (math.radians(-4 + 2 * math.sin(ph * 2 + i)), 0, ang))
    rigs.append(rig)

# a dark core inside the ring, so the far panels never show their backs
core = cyl('Core', RING - 2.2, 14, mat('Core', (0.004, 0.004, 0.006), 0.0, 0.35), (0, 0, 2), 128, 0)

# nebula: slow coloured cloud in the world, so it slides behind the panels as the camera turns
wn = sc.world.node_tree
bg = wn.nodes['Background']
tc = wn.nodes.new('ShaderNodeTexCoord')
nz = wn.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 1.1; nz.inputs['Detail'].default_value = 3
rp = wn.nodes.new('ShaderNodeValToRGB')
rp.color_ramp.elements[0].position = 0.42; rp.color_ramp.elements[0].color = (0.004, 0.004, 0.007, 1)
rp.color_ramp.elements[1].position = 0.78; rp.color_ramp.elements[1].color = (0.07, 0.012, 0.06, 1)
mid = rp.color_ramp.elements.new(0.6); mid.color = (0.01, 0.018, 0.05, 1)
wn.links.new(tc.outputs['Generated'], nz.inputs['Vector'])
wn.links.new(nz.outputs['Color'], rp.inputs['Fac'])
wn.links.new(rp.outputs['Color'], bg.inputs['Color'])

floor_m = mat('Floor', (0.006, 0.006, 0.008), 0.0, 0.12)
bpy.ops.mesh.primitive_plane_add(size=80, location=(0, 0, -2.4))
bpy.context.active_object.data.materials.append(floor_m)

# camera: one lap around the ring, looking in. Lens shift keeps the subject right of centre for the page copy.
target = empty('Aim', (0, 0, 0.1))
cam = camera(sc, lens=34, fstop=2.8, focus=None)
cam.data.shift_x = -0.16
cam.data.dof.use_dof = True
cam.data.dof.aperture_fstop = 1.6
cam.data.dof.focus_distance = 9.8
tt = cam.constraints.new('TRACK_TO'); tt.target = target
for f in range(1, FR + 1):
    ph = 2 * math.pi * (f - 1) / FR
    a = ph - 0.25
    d = 16.2 + 0.7 * math.sin(ph * 4)       # eases in a little as each panel comes round
    key(cam, f, (d * math.sin(a), -d * math.cos(a), 0.7 + 0.35 * math.sin(ph * 2)))

finish(sc, 'hero_film', opt, preview_frames=(1, 30, 60, 100))

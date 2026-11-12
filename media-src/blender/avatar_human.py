"""AVATAR — a realistic stand-in for Oscar, built on a MakeHuman body.
Needs the MPFB extension and the "makehuman system assets" pack (CC0).
The face comes from MakeHuman's generic sliders, not from a photo: it is a
person, deliberately not a likeness. Skin, eyes, brows, lashes, teeth, hair and
the jacket are pack assets; the beanie is modelled here.
Frame 1 is the profile picture. 6 s loop: slow head turn and a blink.
"""
import bpy, bmesh, math, os, sys
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

opt = cli()
FR = 180
LOOP = bool(os.environ.get('AVATAR_LOOP'))  # smaller, lighter settings for the 180-frame loop
sc = reset('avatar_human', 720 if LOOP else 1080, 720 if LOOP else 1080, 30, FR, samples=72 if LOOP else 192)
sc.render.use_motion_blur = False
sc.world.node_tree.nodes['Background'].inputs[0].default_value = (0.006, 0.004, 0.006, 1)

bpy.ops.preferences.addon_enable(module='bl_ext.blender_org.mpfb')
from bl_ext.blender_org.mpfb.services.humanservice import HumanService
from bl_ext.blender_org.mpfb.services.targetservice import TargetService
from bl_ext.blender_org.mpfb.services.assetservice import AssetService

macro = TargetService.get_default_macro_info_dict()
macro.update({'gender': 1.0, 'age': 0.31, 'muscle': 0.36, 'weight': 0.52, 'height': 0.5})
macro['race'] = {'asian': 0.0, 'caucasian': 1.0, 'african': 0.0}
human = HumanService.create_human(scale=0.1, macro_detail_dict=macro)
# A softer, rounder, younger face than the default: fuller cheeks, lighter chin and jaw.
# These are general shape sliders, not a reconstruction of anyone's features.
TDIR = os.path.join(os.path.dirname(os.path.dirname(TargetService.__module__ and sys.modules[TargetService.__module__].__file__)), 'data', 'targets')
for rel, w in (('cheek/l-cheek-volume-incr', 0.75), ('cheek/r-cheek-volume-incr', 0.75), ('cheek/l-cheek-bones-decr', 0.4), ('cheek/r-cheek-bones-decr', 0.4),
               ('chin/chin-bones-decr', 0.5), ('chin/chin-prominent-decr', 0.35)):
    TargetService.load_target(human, os.path.join(TDIR, rel + '.target.gz'), weight=w, name=rel.split('/')[1])
HumanService.add_builtin_rig(human, 'default')
rig = human.parent if human.parent and human.parent.type == 'ARMATURE' else next(o for o in bpy.data.objects if o.type == 'ARMATURE')


def asset(fragment, subdir):
    path = AssetService.find_asset_absolute_path(fragment, subdir)
    assert path, 'missing asset: ' + fragment
    return path


HumanService.set_character_skin(asset('young_caucasian_male/young_caucasian_male.mhmat', 'skins'), human, skin_type='ENHANCED_SSS')
added = {}
for kind, sub, frag in (('Eyes', 'eyes', 'high-poly/high-poly.mhclo'), ('Eyebrows', 'eyebrows', 'eyebrow001/eyebrow001.mhclo'),
                        ('Eyelashes', 'eyelashes', 'eyelashes01/eyelashes01.mhclo'), ('Teeth', 'teeth', 'teeth_base/teeth_base.mhclo'),
                        ('Hair', 'hair', 'short02/short02.mhclo'), ('Clothes', 'clothes', 'male_casualsuit02/male_casualsuit02.mhclo')):
    added[kind] = HumanService.add_mhclo_asset(asset(frag, sub), human, asset_type=kind, material_type='MAKESKIN')

eye_img = bpy.data.images.load(asset('materials/grey_eye.png', 'eyes'))
for m in added['Eyes'].data.materials:
    for n in m.node_tree.nodes:
        if n.type == 'TEX_IMAGE':
            n.image = eye_img
for o in [human] + [a for a in added.values() if a]:
    for p in o.data.polygons:
        p.use_smooth = True
    if not any(m.type == 'SUBSURF' for m in o.modifiers):
        o.modifiers.new('Sub', 'SUBSURF')
    for m in o.modifiers:
        if m.type == 'SUBSURF':
            m.levels = 1
            m.render_levels = 2

# ---- head measurements (rest pose), for the beanie
# Measured on the evaluated mesh: the body's proportions live in shape keys.
bpy.context.view_layer.update()
dg = bpy.context.evaluated_depsgraph_get()
body = [human.matrix_world @ v.co for v in human.evaluated_get(dg).data.vertices]
top = max(v.z for v in body)
headv = [v for v in body if v.z > top - 0.13 and abs(v.x) < 0.12]
xs = [v.x for v in headv]; ys = [v.y for v in headv]
cx, cy = 0.0, (min(ys) + max(ys)) / 2
rx, ry = (max(xs) - min(xs)) / 2 * 0.86, (max(ys) - min(ys)) / 2 * 0.95
print('HEAD top %.3f rx %.3f ry %.3f cy %.3f' % (top, rx, ry, cy))

# ---- beanie: a knitted dome with a turned-up cuff and a woven patch
knit = mat('BeanieKnit', (0.012, 0.012, 0.014), 0.0, 0.95, **{'Sheen Weight': 0.08})
nt = knit.node_tree
tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping'); wv = nt.nodes.new('ShaderNodeTexWave'); bp = nt.nodes.new('ShaderNodeBump')
mp.inputs['Scale'].default_value = (1, 1, 1)
wv.wave_type = 'BANDS'; wv.bands_direction = 'X'
wv.inputs['Scale'].default_value = 260; wv.inputs['Distortion'].default_value = 1.5; wv.inputs['Detail Scale'].default_value = 3
bp.inputs['Strength'].default_value = 0.9; bp.inputs['Distance'].default_value = 0.002
nt.links.new(tc.outputs['Object'], mp.inputs['Vector']); nt.links.new(mp.outputs['Vector'], wv.inputs['Vector'])
nt.links.new(wv.outputs[0], bp.inputs['Height']); nt.links.new(bp.outputs['Normal'], nt.nodes['Principled BSDF'].inputs['Normal'])

BRIM = top - 0.088  # cuff's lower edge: just above the eyebrows
bpy.ops.mesh.primitive_uv_sphere_add(segments=64, ring_count=32, radius=1, location=(cx, cy + 0.004, BRIM + 0.01))
dome = bpy.context.active_object
dome.name = 'Beanie'
dome.scale = (rx + 0.024, ry + 0.022, top - BRIM + 0.026)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
bm = bmesh.new(); bm.from_mesh(dome.data)
bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < -0.001], context='VERTS')
bm.to_mesh(dome.data); bm.free()
for p in dome.data.polygons:
    p.use_smooth = True
dome.data.materials.append(knit)
so = dome.modifiers.new('Thick', 'SOLIDIFY'); so.thickness = 0.006; so.offset = 1
dome.modifiers.new('Sub', 'SUBSURF').render_levels = 2
cuff = tube('BeanieCuff', 1.0, 0.93, 0.05, knit, (cx, cy + 0.004, BRIM + 0.026), 64, 0.006)
cuff.scale = (rx + 0.031, ry + 0.029, 1)
patch = box('BeaniePatch', (0.042, 0.004, 0.026), add_micro(mat('Patch', (0.5, 0.06, 0.09), 0.0, 0.8), 400, 0.4), (cx, cy + 0.004 - ry - 0.029, BRIM + 0.027), 0.002)

# Hair under the hat: remove everything above the cuff so nothing pokes through.
hair_o = added['Hair']
bm = bmesh.new(); bm.from_mesh(hair_o.data)
mw = hair_o.matrix_world
bmesh.ops.delete(bm, geom=[v for v in bm.verts if (mw @ v.co).z > BRIM + 0.03], context='VERTS')
bm.to_mesh(hair_o.data); bm.free()

# beanie, hair and face follow the head bone
head_bone = next((b.name for b in rig.pose.bones if b.name.lower() in ('head', 'head.001')), None) or next(b.name for b in rig.pose.bones if 'head' in b.name.lower())
print('HEAD BONE', head_bone)
# Skinned to the head bone (weight 1), the same way the hair asset follows it.
for o in (dome, cuff, patch):
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    vg = o.vertex_groups.new(name=head_bone)
    vg.add(range(len(o.data.vertices)), 1.0, 'REPLACE')
    arm = o.modifiers.new('Armature', 'ARMATURE')
    arm.object = rig
    while o.modifiers[0] != arm:
        bpy.ops.object.modifier_move_up(modifier=arm.name)
print('DOME zmin %.3f zmax %.3f rig scale %s' % (min(v.co.z for v in dome.data.vertices), max(v.co.z for v in dome.data.vertices), tuple(rig.scale)))

# the pack's long-sleeve top becomes the black hoodie body
for m in added['Clothes'].data.materials:
    nt2 = m.node_tree
    bsdf = next((n for n in nt2.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if not bsdf or not bsdf.inputs['Base Color'].links:
        continue
    src = bsdf.inputs['Base Color'].links[0].from_socket
    mix = nt2.nodes.new('ShaderNodeMix')
    mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'
    mix.inputs['Factor'].default_value = 1.0
    mix.inputs['B'].default_value = (0.035, 0.035, 0.04, 1)
    nt2.links.new(src, mix.inputs['A'])
    nt2.links.new(mix.outputs['Result'], bsdf.inputs['Base Color'])

# ---- hood (resting on the shoulders) and drawstrings
cloth = add_micro(mat('HoodieCloth', (0.012, 0.012, 0.014), 0.0, 0.95, **{'Sheen Weight': 0.3}), 900, 0.35)
# A hood lying down reads as a thick roll of cloth around the neck, lower at the front.
bpy.ops.mesh.primitive_torus_add(major_radius=0.1, minor_radius=0.024, major_segments=64, minor_segments=24,
                                 location=(0, cy + 0.065, top - 0.3), rotation=(math.radians(32), 0, 0))
hood = bpy.context.active_object
hood.name = 'Hood'
hood.scale = (1.1, 1.05, 1.5)
for p in hood.data.polygons:
    p.use_smooth = True
hood.data.materials.append(cloth)
hood.modifiers.new('Sub', 'SUBSURF').render_levels = 2
top_obj = added['Clothes']  # the body under the clothes is masked away, so measure the garment
chest = [top_obj.matrix_world @ v.co for v in top_obj.evaluated_get(dg).data.vertices]
front = min(v.y for v in chest if top - 0.45 < v.z < top - 0.36 and abs(v.x) < 0.06)
cord = mat('Cord', (0.75, 0.74, 0.7), 0.0, 0.8)
for sx in (-1, 1):
    c = cyl('Drawstring', 0.0035, 0.15, cord, (sx * 0.035, front - 0.016, top - 0.4), 12, 0)
    c.rotation_euler = (math.radians(4), math.radians(sx * 5), 0)
    cyl('Aglet', 0.005, 0.016, mat('Aglet', (0.6, 0.6, 0.62), 1.0, 0.3), (sx * 0.041, front - 0.011, top - 0.482), 12, 0.001)

# ---- animation: slow head turn; blink via eyelid shape if the rig has lid bones
hb = rig.pose.bones[head_bone]
hb.rotation_mode = 'XYZ'
for f in range(1, FR + 1):
    ph = 2 * math.pi * (f - 1) / FR
    hb.rotation_euler = (math.radians(2.5 * math.sin(ph + 0.6)), math.radians(11 * math.sin(ph)), 0)
    hb.keyframe_insert('rotation_euler', frame=f)

# ---- room: a sprayed wall (media-src/brand/graffiti.py), red and magenta light
wall_m = bpy.data.materials.new('GraffitiWall'); wall_m.use_nodes = True
wn = wall_m.node_tree
tex = wn.nodes.new('ShaderNodeTexImage')
tex.image = bpy.data.images.load(os.path.join(RENDER_ROOT, 'graffiti-wall.png'))
wn.links.new(tex.outputs['Color'], wn.nodes['Principled BSDF'].inputs['Base Color'])
wn.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.9
bpy.ops.mesh.primitive_plane_add(size=1, location=(0.35, 1.7, top - 0.1), rotation=(math.radians(90), 0, 0))
w = bpy.context.active_object
w.scale = (3.4, 1.91, 1)
w.data.materials.append(wall_m)

target = empty('Focus', (0, cy - ry, top - 0.135))
cam = camera(sc, lens=85, fstop=2.0, focus=target)
cam.location = (0.13, -0.98, top - 0.1)
tt = cam.constraints.new('TRACK_TO'); tt.target = target
aimp = (0, cy, top - 0.13)
area('Key', (-0.45, -1.0, top + 0.12), aimp, 0.7, 17, (0.95, 0.93, 1.0))
area('Fill', (0.9, -0.8, top - 0.2), aimp, 0.9, 5, (0.6, 0.5, 0.9))
area('RimMagenta', (0.6, 0.55, top + 0.15), aimp, 0.3, 42, (1.0, 0.12, 0.55))
area('RimRed', (-0.65, 0.5, top + 0.05), aimp, 0.3, 36, (1.0, 0.1, 0.08))
area('WallWash', (0.2, 0.6, top + 0.6), (0.3, 1.7, top - 0.1), 1.5, 26, (0.95, 0.5, 0.65))

finish(sc, 'avatar_human_loop' if LOOP else 'avatar_human', opt, preview_frames=(1,))

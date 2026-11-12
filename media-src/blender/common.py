"""Shared helpers for the portfolio's Blender scenes (Blender 5.2 LTS, Cycles).

Every scene script is self-contained and procedural:
    blender -b -P media-src/blender/<scene>.py -- [--preview] [--frames 1,90] [--save]
It rebuilds the scene from nothing, bakes the animation to keyframes, optionally
saves a .blend next to the script, and renders PNG frames to media-src/render/<scene>/.
"""
import bpy, bmesh, math, os, sys
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
RENDER_ROOT = os.path.normpath(os.path.join(HERE, '..', 'render'))


def cli():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    opt = {'preview': '--preview' in argv, 'save': '--save' in argv, 'frames': None, 'norender': '--norender' in argv}
    if '--frames' in argv:
        spec = argv[argv.index('--frames') + 1]
        if '-' in spec:
            a, b = spec.split('-')
            opt['frames'] = list(range(int(a), int(b) + 1))
        else:
            opt['frames'] = [int(x) for x in spec.split(',')]
    return opt


def reset(name, w=1920, h=1080, fps=30, frames=240, samples=96):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.name = name
    sc.render.engine = 'CYCLES'
    sc.render.resolution_x, sc.render.resolution_y = w, h
    sc.render.fps = fps
    sc.frame_start, sc.frame_end = 1, frames
    sc.render.image_settings.file_format = 'PNG'
    sc.render.film_transparent = False
    cy = sc.cycles
    cy.samples = samples
    cy.use_adaptive_sampling = True
    cy.adaptive_threshold = 0.02
    cy.use_denoising = True
    cy.max_bounces = 8
    cy.transmission_bounces = 8
    cy.glossy_bounces = 6
    cy.sample_clamp_indirect = 6.0
    try:
        prefs = bpy.context.preferences.addons['cycles'].preferences
        prefs.compute_device_type = 'OPTIX'
        prefs.refresh_devices()
        for d in prefs.devices:
            d.use = d.type == 'OPTIX'
        cy.device = 'GPU'
        cy.denoiser = 'OPTIX'
    except Exception as e:  # CPU fallback keeps the script usable anywhere
        print('GPU setup failed, using CPU:', e)
    sc.render.use_motion_blur = True
    sc.render.motion_blur_shutter = 0.4
    vs = sc.view_settings
    vs.view_transform = 'AgX'
    for look in ('AgX - Medium High Contrast', 'Medium High Contrast'):
        try:
            vs.look = look
            break
        except Exception:
            pass
    world = bpy.data.worlds.new('World')
    sc.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes['Background']
    bg.inputs[0].default_value = (0.004, 0.005, 0.006, 1)
    bg.inputs[1].default_value = 1.0
    return sc


# ---------------------------------------------------------------- materials
def _set(bsdf, **kw):
    for k, v in kw.items():
        if k in bsdf.inputs:
            bsdf.inputs[k].default_value = v


def mat(name, color=(0.5, 0.5, 0.5), metallic=0.0, rough=0.4, **extra):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    _set(b, **{'Base Color': (*color, 1), 'Metallic': metallic, 'Roughness': rough})
    _set(b, **extra)
    return m


def add_micro(m, scale=180.0, strength=0.06, stretch=(1, 1, 1), rough_var=0.0):
    """Fine surface breakup: noise-driven bump (and optional roughness variation)."""
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    tc = nt.nodes.new('ShaderNodeTexCoord')
    mp = nt.nodes.new('ShaderNodeMapping')
    mp.inputs['Scale'].default_value = stretch
    nz = nt.nodes.new('ShaderNodeTexNoise')
    nz.inputs['Scale'].default_value = scale
    nz.inputs['Detail'].default_value = 6
    bp = nt.nodes.new('ShaderNodeBump')
    bp.inputs['Strength'].default_value = strength
    bp.inputs['Distance'].default_value = 0.01
    nt.links.new(tc.outputs['Object'], mp.inputs['Vector'])
    nt.links.new(mp.outputs['Vector'], nz.inputs['Vector'])
    nt.links.new(nz.outputs[0], bp.inputs['Height'])
    nt.links.new(bp.outputs['Normal'], b.inputs['Normal'])
    if rough_var:
        base = b.inputs['Roughness'].default_value
        mr = nt.nodes.new('ShaderNodeMapRange')
        mr.inputs['To Min'].default_value = max(0.02, base - rough_var)
        mr.inputs['To Max'].default_value = min(1.0, base + rough_var)
        nt.links.new(nz.outputs[0], mr.inputs['Value'])
        nt.links.new(mr.outputs[0], b.inputs['Roughness'])
    return m


def palette():
    """One material language for every scene."""
    p = {}
    p['steel'] = add_micro(mat('Steel', (0.62, 0.65, 0.68), 1.0, 0.26, Anisotropic=0.5), 60, 0.05, (1, 1, 40), 0.07)
    p['dark'] = add_micro(mat('Graphite', (0.028, 0.03, 0.034), 0.85, 0.42), 240, 0.05, rough_var=0.08)
    p['black'] = add_micro(mat('BlackOxide', (0.012, 0.012, 0.014), 0.6, 0.55), 300, 0.04)
    p['pearl'] = mat('PearlCeramic', (0.3, 0.29, 0.27), 0.0, 0.22, **{'Coat Weight': 0.6, 'Coat Roughness': 0.08})
    p['blue'] = add_micro(mat('ColdAnodised', (0.20, 0.29, 0.37), 0.9, 0.34), 220, 0.04)
    p['brass'] = add_micro(mat('Bronze', (0.55, 0.38, 0.2), 1.0, 0.3), 90, 0.04, (1, 1, 30))
    p['glass'] = mat('Glass', (0.92, 0.96, 1.0), 0.0, 0.02, **{'Transmission Weight': 1.0, 'IOR': 1.52})
    p['floor'] = add_micro(mat('Floor', (0.01, 0.011, 0.013), 0.0, 0.2), 2.5, 0.0, rough_var=0.1)
    return p


def emit(name, color, strength):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    _set(b, **{'Base Color': (0, 0, 0, 1), 'Emission Color': (*color, 1), 'Emission Strength': strength})
    return m


def key_emission(m, frame, strength):
    inp = m.node_tree.nodes['Principled BSDF'].inputs['Emission Strength']
    inp.default_value = strength
    inp.keyframe_insert('default_value', frame=frame)


# ---------------------------------------------------------------- geometry
def _finish(o, name, material, bevel=0.012, segs=3, smooth=True):
    o.name = name
    if material:
        o.data.materials.append(material)
    if smooth:
        for p in o.data.polygons:
            p.use_smooth = True
        try:
            o.data.set_sharp_from_angle(angle=math.radians(40))
        except Exception:
            pass
    if bevel:
        b = o.modifiers.new('Bevel', 'BEVEL')
        b.width = bevel
        b.segments = segs
        b.limit_method = 'ANGLE'
        b.angle_limit = math.radians(40)
        b.harden_normals = True
    return o


def cyl(name, r, depth, material, loc=(0, 0, 0), verts=96, bevel=0.012, r2=None):
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth, location=loc)
    else:
        bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r, radius2=r2, depth=depth, location=loc)
    return _finish(bpy.context.active_object, name, material, bevel)


def tube(name, r_out, r_in, depth, material, loc=(0, 0, 0), verts=96, bevel=0.012):
    """Hollow cylinder with real wall thickness."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    h = depth / 2
    rings = []
    for (r, z) in ((r_out, -h), (r_out, h), (r_in, h), (r_in, -h)):
        rings.append([bm.verts.new((r * math.cos(2 * math.pi * i / verts), r * math.sin(2 * math.pi * i / verts), z)) for i in range(verts)])
    for a in range(4):
        ra, rb = rings[a], rings[(a + 1) % 4]
        for i in range(verts):
            j = (i + 1) % verts
            bm.faces.new((ra[i], ra[j], rb[j], rb[i]))
    bm.normal_update()
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(o)
    o.location = loc
    return _finish(o, name, material, bevel)


def box(name, size, material, loc=(0, 0, 0), bevel=0.012, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.active_object
    o.scale = size
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return _finish(o, name, material, bevel)


def prism(name, pts, depth, material, loc=(0, 0, 0), bevel=0.01):
    """Extrude a 2D outline (list of (x, y)) along Z, centred on Z."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    lo = [bm.verts.new((x, y, -depth / 2)) for x, y in pts]
    hi = [bm.verts.new((x, y, depth / 2)) for x, y in pts]
    n = len(pts)
    bm.faces.new(list(reversed(lo)))
    bm.faces.new(hi)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((lo[i], lo[j], hi[j], hi[i]))
    bm.normal_update()
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(o)
    o.location = loc
    return _finish(o, name, material, bevel)


def gear_pts(r_root, r_tip, teeth, duty=0.5, flank=0.18):
    pts = []
    step = 2 * math.pi / teeth
    for i in range(teeth):
        a = i * step
        w = step * duty
        for (ang, r) in ((a, r_root), (a + w * flank, r_tip), (a + w * (1 - flank), r_tip), (a + w, r_root)):
            pts.append((r * math.cos(ang), r * math.sin(ang)))
    return pts


def ngon_pts(r, n, phase=0.0):
    return [(r * math.cos(phase + 2 * math.pi * i / n), r * math.sin(phase + 2 * math.pi * i / n)) for i in range(n)]


def cut(target, cutters):
    """Boolean-subtract cutter objects from target, then delete them."""
    bpy.context.view_layer.objects.active = target
    for c in cutters:
        m = target.modifiers.new('Cut', 'BOOLEAN')
        m.operation = 'DIFFERENCE'
        m.object = c
        m.solver = 'EXACT'
        # booleans must evaluate before the bevel
        while target.modifiers[0] != m:
            bpy.ops.object.modifier_move_up(modifier=m.name)
        bpy.ops.object.modifier_apply(modifier=m.name)
    for c in cutters:
        bpy.data.objects.remove(c, do_unlink=True)
    # Booleans leave concave n-gons on flat caps; split them and make the
    # normals consistent so bevels and smooth shading stay clean.
    bm = bmesh.new()
    bm.from_mesh(target.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 4])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(target.data)
    bm.free()
    for p in target.data.polygons:
        p.use_smooth = True
    try:
        target.data.set_sharp_from_angle(angle=math.radians(40))
    except Exception:
        pass
    return target


def join(name, objs):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    o = bpy.context.active_object
    o.name = name
    return o


def empty(name, loc=(0, 0, 0)):
    e = bpy.data.objects.new(name, None)
    e.location = loc
    bpy.context.collection.objects.link(e)
    return e


def parent(children, p):
    for c in children:
        c.parent = p


# ---------------------------------------------------------------- lights / camera
def area(name, loc, target, size, power, color=(1, 1, 1), size_y=None):
    l = bpy.data.lights.new(name, 'AREA')
    l.energy = power
    l.color = color
    l.size = size
    if size_y:
        l.shape = 'RECTANGLE'
        l.size_y = size_y
    o = bpy.data.objects.new(name, l)
    bpy.context.collection.objects.link(o)
    o.location = loc
    aim(o, target)
    return o


def point(name, loc, power, color=(1, 1, 1), radius=0.05):
    l = bpy.data.lights.new(name, 'POINT')
    l.energy = power
    l.color = color
    l.shadow_soft_size = radius
    o = bpy.data.objects.new(name, l)
    bpy.context.collection.objects.link(o)
    o.location = loc
    return o


def aim(o, target):
    d = Vector(target) - Vector(o.location)
    o.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()


def camera(sc, lens=50, fstop=2.8, focus=None):
    c = bpy.data.cameras.new('Camera')
    c.lens = lens
    c.sensor_width = 36
    o = bpy.data.objects.new('Camera', c)
    bpy.context.collection.objects.link(o)
    sc.camera = o
    if focus is not None:
        c.dof.use_dof = True
        c.dof.focus_object = focus
        c.dof.aperture_fstop = fstop
    return o


def floor(material, z=0.0, size=60):
    bpy.ops.mesh.primitive_plane_add(size=size, location=(0, 0, z))
    o = bpy.context.active_object
    o.name = 'Floor'
    o.data.materials.append(material)
    return o


# ---------------------------------------------------------------- animation
def smooth(t):
    t = max(0.0, min(1.0, t))
    return t * t * t * (t * (t * 6 - 15) + 10)


def span(f, a, b):
    """0..1 progress of frame f through [a, b], eased."""
    return smooth((f - a) / float(b - a)) if b != a else float(f >= b)


def key(o, f, loc=None, rot=None):
    if loc is not None:
        o.location = loc
        o.keyframe_insert('location', frame=f)
    if rot is not None:
        o.rotation_euler = rot
        o.keyframe_insert('rotation_euler', frame=f)


# ---------------------------------------------------------------- output
def finish(sc, name, opt, preview_frames=(1,)):
    if opt['save']:
        path = os.path.join(HERE, name + '.blend')
        bpy.ops.wm.save_as_mainfile(filepath=path)
        print('saved', path)
    if opt['norender']:
        return
    out = os.path.join(RENDER_ROOT, name + ('-preview' if opt['preview'] else ''))
    os.makedirs(out, exist_ok=True)
    frames = opt['frames']
    if opt['preview']:
        sc.render.resolution_percentage = 50
        sc.cycles.samples = 48
        frames = frames or list(preview_frames)
    if frames is None:
        frames = range(sc.frame_start, sc.frame_end + 1)
    for f in frames:
        target = os.path.join(out, '%04d.png' % f)
        if os.path.exists(target) and not opt['preview']:
            continue  # resumable
        sc.frame_set(f)
        sc.render.filepath = target
        bpy.ops.render.render(write_still=True)
    print('rendered to', out)

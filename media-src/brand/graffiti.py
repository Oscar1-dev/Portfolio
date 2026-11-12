"""Graffiti wall art (original): spray tags, drips, stars and scribbles on dark
concrete. Used as the backdrop texture behind the avatar and as a site asset.
    python media-src/brand/graffiti.py   ->  media-src/render/graffiti-wall.png
                                             public/brand/graffiti-wall.webp
"""
import math, os, random
from PIL import Image, ImageDraw, ImageFilter, ImageChops

random.seed(90)
W, H = 2400, 1350
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))

# concrete: noise at two scales over near-black
base = Image.effect_noise((W, H), 28).convert('L')
coarse = Image.effect_noise((W // 8, H // 8), 60).resize((W, H), Image.BICUBIC)
wall = ImageChops.add(base.point(lambda v: int(v * 0.10)), coarse.point(lambda v: int(v * 0.07)))
wall = Image.merge('RGB', (wall.point(lambda v: v + 10), wall.point(lambda v: v + 10), wall.point(lambda v: v + 13)))


def spray(points, color, width, drips=0, closed=False):
    """A spray-can stroke: a hard core over a soft overspray, with optional drips."""
    global wall
    layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    pts = points + points[:1] if closed else points
    d.line(pts, fill=color + (255,), width=width, joint='curve')
    for x, y in pts:
        d.ellipse((x - width / 2, y - width / 2, x + width / 2, y + width / 2), fill=color + (255,))
    for _ in range(drips):
        x, y = random.choice(pts)
        L = random.randint(40, 170)
        w = max(3, width // 4)
        d.line([(x, y), (x, y + L)], fill=color + (255,), width=w)
        d.ellipse((x - w, y + L - w, x + w, y + L + w), fill=color + (255,))
    over = layer.filter(ImageFilter.GaussianBlur(width * 0.9))
    over.putalpha(over.getchannel('A').point(lambda a: int(a * 0.45)))
    wall = Image.alpha_composite(wall.convert('RGBA'), over)
    wall = Image.alpha_composite(wall, layer.filter(ImageFilter.GaussianBlur(1.2))).convert('RGB')


def at(shape, ox, oy, s, rot=0.0):
    c, n = math.cos(rot), math.sin(rot)
    return [(ox + (x * c - y * n) * s, oy + (x * n + y * c) * s) for x, y in shape]


RED, MAG, WHITE, GREY = (200, 30, 40), (210, 40, 130), (232, 228, 220), (95, 95, 105)
# No lettering here: the marks stay abstract until a proper display font is chosen.
big = [(i * 150, math.sin(i * 0.9) * 150 + (i % 2) * 40) for i in range(12)]
spray(at(big, 260, 380, 1.0, -0.05), (40, 8, 14), 96)
spray(at(big, 246, 366, 1.0, -0.05), WHITE, 58, drips=5)
spray([(230, 690), (700, 660), (1200, 700), (1820, 650)], RED, 26, drips=3)      # underline
star = [(math.cos(a * 4 * math.pi / 5 - math.pi / 2), math.sin(a * 4 * math.pi / 5 - math.pi / 2)) for a in range(6)]
spray(at(star, 2080, 260, 120, 0.2), MAG, 20, drips=1)
spray(at(star, 180, 1050, 70, -0.3), RED, 14)
crown = [(0, 1), (0, 0.2), (0.25, 0.6), (0.5, 0), (0.75, 0.6), (1, 0.2), (1, 1), (0, 1)]
spray(at(crown, 760, 60, 150, -0.08), MAG, 16)
spray([(1500, 900), (1900, 900), (1860, 850)], WHITE, 18)                        # arrow
spray([(1900, 900), (1860, 950)], WHITE, 18)
for cx, cy in ((2150, 760), (2230, 760)):                                        # X X eyes + mouth
    spray([(cx - 28, cy - 28), (cx + 28, cy + 28)], WHITE, 12)
    spray([(cx + 28, cy - 28), (cx - 28, cy + 28)], WHITE, 12)
spray([(2120, 860), (2160, 890), (2200, 860), (2240, 890), (2270, 860)], WHITE, 10, drips=1)
squig = [(i * 60, math.sin(i * 1.3) * 34) for i in range(16)]
spray(at(squig, 330, 1180, 1.0, -0.03), GREY, 14)
spray(at(squig, 1300, 1220, 0.9, 0.04), MAG, 10)
for _ in range(240):                                                             # flecks
    px, py, r = random.randint(0, W), random.randint(0, H), random.choice((1, 1, 2, 3))
    ImageDraw.Draw(wall).ellipse((px - r, py - r, px + r, py + r), fill=random.choice((WHITE, RED, MAG, GREY)))

os.makedirs(os.path.join(ROOT, 'media-src', 'render'), exist_ok=True)
wall.save(os.path.join(ROOT, 'media-src', 'render', 'graffiti-wall.png'))
wall.resize((1600, 900), Image.LANCZOS).save(os.path.join(ROOT, 'public', 'brand', 'graffiti-wall.webp'), quality=80)
print('graffiti wall written')

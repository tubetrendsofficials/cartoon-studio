#!/usr/bin/env python3
"""Cartoon Studio — Phase 3 asset factory.

Generates ALL bundled artwork as hand-authored, ORIGINAL flat-cartoon SVG
files: 34 characters (30 people x 7 poses via the parametric person-builder
below — Stand/Walk/Talk/Sit/Wave/Point/Back — plus a bus, a mishuk
auto-rickshaw, a puppy and a parrot with variant poses; the reference's
33 roles are all covered and Mishuk is our one extra, added in Phase
10B so the Auto Rickshaw role is a vehicle entry like the reference's —
not just a prop), 21 backgrounds (1280x720 scenes;
BG-20/BG-21 are combo packs whose manifest records carry 2 variants each),
49 props (transparent). Also writes assets/manifest.json, which
js/assets.js + js/editor.js consume.

Nothing here copies any existing artwork: characters are generated from a
small parametric builder (skin tone, hair, clothing, accessories) and every
scene/prop is drawn with plain SVG shapes in this file.

Run:  python3 tools/build_assets.py
"""
import json
import os

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
ASSETS = os.path.join(ROOT, 'assets')

# ---------------------------------------------------------------- svg helpers

def rect(x, y, w, h, fill, rx=0, opacity=None, stroke=None, sw=None):
    s = f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fill}"'
    if rx:
        s += f' rx="{rx}"'
    if opacity is not None:
        s += f' opacity="{opacity}"'
    if stroke:
        s += f' stroke="{stroke}" stroke-width="{sw or 3}"'
    return s + '/>'

def circle(cx, cy, r, fill, opacity=None):
    s = f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{fill}"'
    if opacity is not None:
        s += f' opacity="{opacity}"'
    return s + '/>'

def ellipse(cx, cy, rx, ry, fill, opacity=None):
    s = f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="{fill}"'
    if opacity is not None:
        s += f' opacity="{opacity}"'
    return s + '/>'

def line(x1, y1, x2, y2, stroke, w, cap='round', opacity=None):
    s = (f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{stroke}" '
         f'stroke-width="{w}" stroke-linecap="{cap}"')
    if opacity is not None:
        s += f' opacity="{opacity}"'
    return s + '/>'

def poly(points, fill, opacity=None, stroke=None, sw=None, join='round'):
    pts = ' '.join(f'{x},{y}' for x, y in points)
    s = f'<polygon points="{pts}" fill="{fill}" stroke-linejoin="{join}"'
    if opacity is not None:
        s += f' opacity="{opacity}"'
    if stroke:
        s += f' stroke="{stroke}" stroke-width="{sw or 3}"'
    return s + '/>'

def path(d, fill=None, stroke=None, sw=None, cap='round', opacity=None, width_fill=None):
    s = f'<path d="{d}"'
    if fill:
        s += f' fill="{fill}"'
    else:
        s += ' fill="none"'
    if stroke:
        s += f' stroke="{stroke}" stroke-width="{sw or 4}" stroke-linecap="{cap}" stroke-linejoin="round"'
    if opacity is not None:
        s += f' opacity="{opacity}"'
    return s + '/>'

def limb(x1, y1, x2, y2, x3, y3, color, w=21):
    """Two-segment arm/leg drawn as a thick rounded polyline."""
    return (f'<path d="M{x1},{y1} L{x2},{y2} L{x3},{y3}" fill="none" stroke="{color}" '
            f'stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round"/>')

def svg_doc(viewbox, body, title):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{viewbox}">\n'
            f'<title>{title}</title>\n{body}\n</svg>\n')

def write(rel, text):
    p = os.path.join(ASSETS, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'w', encoding='utf-8') as f:
        f.write(text)
    return rel

# ------------------------------------------------------- parametric person ---
# Canvas 300x480, ground baseline y=460, body centre x=150.
# A character config: skin, hair style, top style+colour, bottom style+colour,
# plus optional beard / glasses / blush / gamchha / apron / accessory.

POSES = [('stand', 'Stand'), ('walk', 'Walk'), ('talk', 'Talk'),
         ('sit', 'Sit'), ('wave', 'Wave'), ('point', 'Point'),
         ('back', 'Back')]

def _shoe(x, y, color='#4a3230'):
    return ellipse(x, y, 17, 7, color)

def _legs_standing(cfg):
    skin, bc = cfg['skin'], cfg.get('bottomColor', '#44445a')
    style = cfg.get('bottom', 'trousers')
    out = []
    if style == 'trousers':
        out.append(rect(121, 296, 25, 146, bc, rx=9))
        out.append(rect(154, 296, 25, 146, bc, rx=9))
        out.append(_shoe(131, 452))
        out.append(_shoe(169, 452))
    elif style == 'lungi':
        out.append(poly([(117, 290), (183, 290), (197, 400), (103, 400)], bc))
        out.append(rect(112, 288, 76, 14, cfg.get('waistColor', '#274156'), rx=5))
        out.append(rect(126, 398, 19, 44, skin, rx=8))
        out.append(rect(155, 398, 19, 44, skin, rx=8))
        out.append(ellipse(133, 452, 16, 6, '#6d4c2f'))
        out.append(ellipse(167, 452, 16, 6, '#6d4c2f'))
    elif style == 'shorts':
        out.append(rect(117, 296, 66, 56, bc, rx=8))
        out.append(rect(124, 350, 20, 92, skin, rx=8))
        out.append(rect(156, 350, 20, 92, skin, rx=8))
        out.append(_shoe(131, 452, '#31578c'))
        out.append(_shoe(169, 452, '#31578c'))
    elif style == 'skirt':
        out.append(poly([(117, 262), (183, 262), (207, 364), (93, 364)], bc))
        out.append(rect(124, 362, 19, 80, skin, rx=8))
        out.append(rect(157, 362, 19, 80, skin, rx=8))
        out.append(_shoe(131, 452, '#93355d'))
        out.append(_shoe(169, 452, '#93355d'))
    elif style == 'sari':
        drape = cfg.get('drape', '#b03a5b')
        out.append(path('M112,250 L188,250 L202,446 Q150,458 98,446 Z', fill=drape))
        out.append(path('M104,428 L196,428 L200,446 Q150,458 100,446 Z', fill=cfg.get('border', '#e8b64c')))
        out.append(_shoe(128, 454, '#5d2f3a'))
        out.append(_shoe(174, 454, '#5d2f3a'))
    return ''.join(out)

def _legs_walk(cfg):
    skin, bc = cfg['skin'], cfg.get('bottomColor', '#44445a')
    style = cfg.get('bottom', 'trousers')
    out = []
    if style in ('lungi', 'sari'):
        # garments hide most leg motion: show the wrap swaying + stepping feet
        out.append(poly([(117, 290), (183, 290), (190, 398), (104, 398)],
                        cfg.get('drape', bc) if style == 'sari' else bc))
        out.append(limb(132, 392, 120, 424, 104, 448, skin, 17))
        out.append(limb(168, 392, 182, 420, 200, 442, skin, 17))
        out.append(ellipse(100, 452, 15, 6, '#6d4c2f'))
        out.append(ellipse(204, 448, 15, 6, '#6d4c2f'))
        return ''.join(out)
    legc = skin if style in ('shorts', 'skirt') else bc
    hip_y = 300 if style != 'skirt' else 330
    out.append(limb(134, hip_y, 112, 374, 118, 446, legc, 23))   # front leg
    out.append(limb(166, hip_y, 184, 368, 202, 438, legc, 23))   # back leg
    if style in ('shorts', 'skirt'):
        out.append(rect(117, 292, 66, 46, bc, rx=8) if style == 'shorts'
                   else poly([(117, 262), (183, 262), (203, 336), (97, 336)], bc))
    out.append(_shoe(114, 452, '#31578c' if style == 'shorts' else '#4a3230'))
    out.append(_shoe(206, 444, '#31578c' if style == 'shorts' else '#4a3230'))
    return ''.join(out)

def _legs_sitting(cfg):
    skin, bc = cfg['skin'], cfg.get('bottomColor', '#44445a')
    style = cfg.get('bottom', 'trousers')
    out = []
    # low wooden stool (macha)
    out.append(rect(94, 384, 112, 13, '#8a5a33', rx=4))
    out.append(rect(102, 397, 10, 46, '#6d4525'))
    out.append(rect(188, 397, 10, 46, '#6d4525'))
    wrap = cfg.get('drape', bc) if style == 'sari' else bc
    # seated wrap over the thighs
    out.append(path('M102,330 L198,330 L206,392 Q150,404 94,392 Z', fill=wrap))
    # thighs + shins
    out.append(limb(128, 372, 106, 400, 108, 442, skin if style in ('shorts', 'skirt') else wrap, 19))
    out.append(limb(172, 372, 194, 400, 192, 442, skin if style in ('shorts', 'skirt') else wrap, 19))
    out.append(_shoe(106, 452, '#4a3230'))
    out.append(_shoe(194, 452, '#4a3230'))
    return ''.join(out)

def _torso(cfg, sitting=False):
    tc = cfg.get('topColor', '#7fae4c')
    style = cfg.get('top', 'shirt')
    bottom_y = 372 if sitting else 306
    out = []
    if style == 'panjabi':
        out.append(path(f'M106,168 L194,168 L198,{bottom_y} L102,{bottom_y} Z', fill=tc))
        out.append(rect(140, 160, 20, 16, cfg.get('collar', '#d8cdb4'), rx=4))
        out.append(line(150, 178, 150, 250, 'rgba(0,0,0,0.15)', 4))
    elif style == 'police':
        out.append(rect(106, 166, 88, bottom_y - 166, tc, rx=14))
        out.append(rect(114, 196, 28, 22, '#2b4365', rx=4))   # pockets
        out.append(rect(158, 196, 28, 22, '#2b4365', rx=4))
        out.append(rect(106, 288, 88, 13, '#22242e'))          # belt
        out.append(rect(141, 286, 18, 16, '#e8b64c', rx=3))   # buckle
        out.append(rect(104, 164, 26, 10, '#e8b64c', rx=4))   # epaulettes
        out.append(rect(170, 164, 26, 10, '#e8b64c', rx=4))
        out.append(line(150, 176, 150, 288, 'rgba(255,255,255,0.25)', 4))
    elif style == 'sari':
        blouse = cfg.get('topColor', '#b03a5b')
        drape = cfg.get('drape', '#cf4f74')
        out.append(rect(108, 166, 84, bottom_y - 166, blouse, rx=14))
        out.append(path(f'M112,180 L196,262 L196,{bottom_y} L150,{bottom_y} L118,240 Z', fill=drape))
        out.append(path('M112,180 L196,262', stroke=cfg.get('border', '#e8b64c'), sw=7))
    elif style == 'frock':
        out.append(path(f'M110,166 L190,166 L198,268 L102,268 Z', fill=tc))
        out.append(ellipse(150, 268, 49, 10, tc))
        out.append(rect(128, 158, 44, 12, '#ffffff', rx=6, opacity=0.85))  # collar
    elif style == 'vest':
        out.append(rect(108, 166, 84, bottom_y - 166, cfg.get('shirtColor', '#e0d6bd'), rx=14))
        out.append(path(f'M108,166 L138,166 L138,{bottom_y} L108,{bottom_y} Z', fill=tc))
        out.append(path(f'M162,166 L192,166 L192,{bottom_y} L162,{bottom_y} Z', fill=tc))
        out.append(line(150, 180, 150, bottom_y - 8, 'rgba(0,0,0,0.18)', 4))
    else:  # shirt / tee
        out.append(rect(108, 166, 84, bottom_y - 166, tc, rx=14))
        out.append(poly([(136, 164), (164, 164), (150, 184)], cfg.get('collar', '#ffffff')))
        if cfg.get('checkered'):
            chk = cfg['checkered']
            for xx in (124, 140, 156, 172):
                out.append(rect(xx, 174, 5, bottom_y - 180, chk, opacity=0.28))
            yy = 198
            while yy < bottom_y - 16:
                out.append(rect(114, yy, 72, 5, chk, opacity=0.28))
                yy += 30
        if style == 'shirt':
            for yy in (210, 244, 278):
                out.append(circle(150, yy, 3.4, 'rgba(0,0,0,0.35)'))
    if cfg.get('apron'):
        out.append(rect(120, 226, 60, 92, cfg['apron'], rx=8))
        out.append(line(120, 226, 180, 226, 'rgba(0,0,0,0.2)', 4))
    if cfg.get('gamchha'):
        g = cfg['gamchha']
        out.append(path('M112,168 L132,168 L128,268 L106,262 Z', fill=g))
        out.append(line(112, 196, 130, 198, '#ffffff', 4, opacity=0.55))
        out.append(line(110, 226, 129, 228, '#ffffff', 4, opacity=0.55))
    return ''.join(out)

def _arms(cfg, pose):
    sleeve = cfg.get('topColor', '#7fae4c')
    if cfg.get('top') == 'sari':
        sleeve = cfg.get('drape', sleeve)
    if cfg.get('top') == 'vest':
        sleeve = cfg.get('shirtColor', sleeve)
    skin = cfg['skin']
    L = (110, 184)   # left shoulder
    R = (190, 184)   # right shoulder
    out = []
    def arm(sh, elbow, hand, color):
        out.append(limb(sh[0], sh[1], elbow[0], elbow[1], hand[0], hand[1], color, 20))
        out.append(circle(hand[0], hand[1], 11, skin))
    if pose == 'wave':
        arm(L, (98, 248), (102, 314), sleeve)
        arm(R, (220, 130), (230, 78), sleeve)
        out.append(path('M248,58 q14,14 6,30', stroke='#8fb8dd', sw=5))
        out.append(path('M262,74 q10,12 4,24', stroke='#8fb8dd', sw=5))
    elif pose == 'point':
        arm(L, (98, 248), (102, 314), sleeve)
        arm(R, (226, 192), (256, 186), sleeve)
        out.append(line(256, 186, 272, 184, skin, 7))
    elif pose == 'talk':
        arm(L, (98, 248), (102, 314), sleeve)
        arm(R, (216, 240), (182, 226), sleeve)  # gesturing forearm
    elif pose == 'walk':
        arm(L, (96, 244), (110, 308), sleeve)
        arm(R, (208, 240), (198, 302), sleeve)
    elif pose == 'sit':
        arm(L, (100, 250), (118, 322), sleeve)
        arm(R, (200, 250), (182, 322), sleeve)
    else:  # stand
        arm(L, (98, 248), (102, 314), sleeve)
        arm(R, (202, 248), (198, 314), sleeve)
    return ''.join(out)

def _head(cfg, pose):
    skin = cfg['skin']
    hair = cfg.get('hair', 'short')
    hairc = cfg.get('hairColor', '#2b2320')
    out = []
    talking = (pose == 'talk')
    # long hair / bun behind the face
    if hair == 'long':
        out.append(path('M102,70 Q96,180 108,214 L130,214 Q118,150 122,96 Z', fill=hairc))
        out.append(path('M198,70 Q204,180 192,214 L170,214 Q182,150 178,96 Z', fill=hairc))
    if hair == 'bun':
        out.append(circle(178, 42, 17, hairc))
    # ears + face
    out.append(circle(103, 100, 10, skin))
    out.append(circle(197, 100, 10, skin))
    out.append(circle(150, 96, 47, skin))
    # beard (behind mouth area)
    if cfg.get('beard'):
        out.append(path('M112,104 Q114,158 150,160 Q186,158 188,104 Q186,140 150,142 Q114,140 112,104 Z',
                        fill='#e9e6df'))
    # hair styles on top
    if hair in ('short', 'spiky'):
        out.append(path('M103,92 Q100,44 150,42 Q200,44 197,92 Q186,60 150,58 Q114,60 103,92 Z', fill=hairc))
        if hair == 'spiky':
            out.append(poly([(116, 56), (124, 30), (136, 52)], hairc))
            out.append(poly([(140, 50), (152, 26), (162, 50)], hairc))
            out.append(poly([(164, 52), (178, 32), (184, 58)], hairc))
    elif hair == 'grey':
        out.append(path('M103,90 Q102,46 150,44 Q198,46 197,90 Q184,64 150,62 Q116,64 103,90 Z', fill='#d9d6cf'))
    elif hair == 'bun':
        out.append(path('M103,90 Q102,46 150,44 Q198,46 197,90 Q184,64 150,62 Q116,64 103,90 Z', fill=hairc))
    elif hair == 'cap':
        capc = cfg.get('capColor', '#2e8b6e')
        out.append(path('M102,84 Q104,40 150,40 Q196,40 198,84 Q150,64 102,84 Z', fill=capc))
        out.append(ellipse(206, 82, 26, 8, capc))
    elif hair == 'policecap':
        out.append(path('M104,78 Q108,38 150,38 Q192,38 196,78 Q150,62 104,78 Z', fill='#22354f'))
        out.append(rect(100, 74, 100, 10, '#16233a', rx=4))
        out.append(ellipse(214, 80, 24, 7, '#16233a'))
        out.append(circle(150, 52, 7, '#e8b64c'))
    elif hair == 'tupi':
        out.append(path('M112,66 Q150,30 188,66 Q150,52 112,66 Z', fill='#f4f1e6'))
        out.append(path('M124,52 q6,-6 12,0 M148,44 q6,-6 12,0 M172,52 q6,-6 12,0',
                        stroke='#c9c2ab', sw=3))
    elif hair == 'wrap':
        wc = cfg.get('capColor', '#e07a2f')
        out.append(path('M100,86 Q98,38 150,36 Q202,38 200,86 Q170,56 150,58 Q128,58 100,86 Z', fill=wc))
        out.append(rect(98, 78, 104, 12, wc, rx=6))
        out.append(path('M196,84 L214,140 L196,146 L188,96 Z', fill=wc))  # hanging tail
    elif hair == 'crown':
        # generic royal crown over a short hair mass (maharaja archetype)
        out.append(path('M103,92 Q100,44 150,42 Q200,44 197,92 Q186,60 150,58 Q114,60 103,92 Z', fill=hairc))
        out.append(path('M108,64 L112,34 L130,52 L142,28 L150,46 L158,28 L170,52 L188,34 L192,64 Q150,50 108,64 Z', fill='#e8b64c'))
        out.append(rect(106, 60, 88, 9, '#c9962e', rx=4))
        out.append(circle(150, 55, 5.5, '#c0272d'))
    elif hair == 'long':
        out.append(path('M103,92 Q100,42 150,40 Q200,42 197,92 Q184,58 150,56 Q116,58 103,92 Z', fill=hairc))
        if cfg.get('ribbons'):
            for cx in (108, 192):
                out.append(circle(cx, 66, 8, cfg['ribbons']))
                out.append(circle(cx - 9, 58, 6, cfg['ribbons']))
                out.append(circle(cx + 9, 58, 6, cfg['ribbons']))
    # eyes / brows / nose
    for ex in (132, 168):
        out.append(ellipse(ex, 96, 5.5, 7.5, '#26221f'))
        out.append(circle(ex + 1.8, 93, 1.9, '#ffffff'))
    out.append(path('M122,82 q10,-6 20,0', stroke='#3a2c22', sw=3.4))
    out.append(path('M158,82 q10,-6 20,0', stroke='#3a2c22', sw=3.4))
    out.append(path('M151,102 q5,7 -1,12', stroke='rgba(0,0,0,0.35)', sw=3))
    if cfg.get('blush'):
        out.append(circle(118, 114, 9, '#f2a0a0', opacity=0.5))
        out.append(circle(182, 114, 9, '#f2a0a0', opacity=0.5))
    if cfg.get('glasses'):
        for ex in (132, 168):
            out.append(f'<circle cx="{ex}" cy="96" r="15" fill="none" stroke="#3c3a38" stroke-width="3.4"/>')
        out.append(line(147, 96, 153, 96, '#3c3a38', 3.4))
        out.append(line(117, 94, 104, 90, '#3c3a38', 3.4))
        out.append(line(183, 94, 196, 90, '#3c3a38', 3.4))
    # mouth
    if cfg.get('beard'):
        out.append(path('M136,116 q14,9 28,0', stroke='#8d8578', sw=3.6))
        if talking:
            out.append(ellipse(150, 126, 8, 10, '#7a3b2e'))
    elif talking:
        out.append(ellipse(150, 122, 10, 13, '#7a3b2e'))
        out.append(ellipse(150, 128, 6, 4.5, '#d97b6c'))
    else:
        out.append(path('M136,116 q14,10 28,0', stroke='#7a4530', sw=3.8))
    return ''.join(out)

def _head_back(cfg):
    """Back of the head (Phase 10A true back artwork): hair mass or
    headwear seen from behind, ears + neck, NO face features at all."""
    skin = cfg['skin']
    hair = cfg.get('hair', 'short')
    hairc = cfg.get('hairColor', '#2b2320')
    out = []
    if hair == 'long':
        # hair falls down the back over the shoulders (drawn first)
        out.append(path('M100,64 Q92,190 108,238 L192,238 Q208,190 200,64 Q150,40 100,64 Z', fill=hairc))
    out.append(rect(136, 128, 28, 34, skin, rx=8))          # neck
    out.append(circle(103, 100, 10, skin))                  # ears
    out.append(circle(197, 100, 10, skin))
    out.append(circle(150, 96, 47, skin))                   # head base
    if hair == 'bun':
        out.append(circle(150, 96, 47, hairc))
        out.append(circle(150, 34, 17, hairc))              # bun from behind (top centre)
    elif hair == 'cap':
        capc = cfg.get('capColor', '#2e8b6e')
        out.append(path('M106,96 Q108,128 128,140 L172,140 Q192,128 194,96 Q192,138 150,140 Q108,138 106,96 Z', fill=hairc))
        out.append(path('M102,88 Q104,40 150,40 Q196,40 198,88 Q150,66 102,88 Z', fill=capc))
        out.append(rect(124, 78, 52, 9, '#20242e', rx=4))   # back strap
    elif hair == 'policecap':
        out.append(path('M106,96 Q108,126 128,138 L172,138 Q192,126 194,96 Q192,136 150,138 Q108,136 106,96 Z', fill=hairc))
        out.append(path('M104,80 Q108,38 150,38 Q192,38 196,80 Q150,62 104,80 Z', fill='#22354f'))
        out.append(rect(100, 76, 100, 10, '#16233a', rx=4))
    elif hair == 'tupi':
        out.append(circle(150, 96, 47, hairc))
        out.append(path('M112,68 Q150,30 188,68 Q150,54 112,68 Z', fill='#f4f1e6'))
        out.append(path('M124,54 q6,-6 12,0 M148,46 q6,-6 12,0 M172,54 q6,-6 12,0',
                        stroke='#c9c2ab', sw=3))
    elif hair == 'wrap':
        wc = cfg.get('capColor', '#e07a2f')
        out.append(path('M100,88 Q98,38 150,36 Q202,38 200,88 L200,118 Q196,148 150,150 Q104,148 100,118 Z', fill=wc))
        out.append(rect(98, 80, 104, 12, wc, rx=6))
        out.append(path('M188,92 L206,168 L184,172 L176,100 Z', fill=wc))  # hanging tail
    elif hair == 'crown':
        out.append(circle(150, 96, 47, hairc))
        out.append(path('M108,64 L112,34 L130,52 L142,28 L150,46 L158,28 L170,52 L188,34 L192,64 Q150,50 108,64 Z', fill='#e8b64c'))
        out.append(rect(106, 60, 88, 9, '#c9962e', rx=4))
    elif hair == 'long':
        out.append(path('M102,94 Q98,44 150,42 Q202,44 198,94 Q190,58 150,56 Q110,58 102,94 Z', fill=hairc))
        if cfg.get('ribbons'):
            for cx in (116, 184):
                out.append(circle(cx, 84, 8, cfg['ribbons']))
                out.append(circle(cx - 9, 76, 6, cfg['ribbons']))
                out.append(circle(cx + 9, 76, 6, cfg['ribbons']))
    elif hair == 'grey':
        out.append(circle(150, 96, 47, '#d9d6cf'))
        out.append(path('M104,88 Q110,52 150,50 Q190,52 196,88 Q188,64 150,62 Q112,64 104,88 Z', fill='#e6e3da'))
    else:  # short / spiky — full hair mass over the back of the head
        out.append(circle(150, 96, 47, hairc))
        if hair == 'spiky':
            out.append(poly([(116, 56), (124, 30), (136, 52)], hairc))
            out.append(poly([(140, 50), (152, 26), (162, 50)], hairc))
            out.append(poly([(164, 52), (178, 32), (184, 58)], hairc))
    if cfg.get('glasses'):
        # only the temple arms show from behind
        out.append(line(104, 94, 118, 92, '#3c3a38', 3.4))
        out.append(line(196, 94, 182, 92, '#3c3a38', 3.4))
    return ''.join(out)

def _torso_back(cfg):
    """Back of the torso/clothing (Phase 10A): same palette/params as the
    front, simplified — back panels, seams, sari drape from behind."""
    tc = cfg.get('topColor', '#7fae4c')
    style = cfg.get('top', 'shirt')
    out = []
    if style == 'panjabi':
        out.append(path('M106,168 L194,168 L198,306 L102,306 Z', fill=tc))
        out.append(rect(138, 160, 24, 14, cfg.get('collar', '#d8cdb4'), rx=4))
        out.append(line(150, 178, 150, 296, 'rgba(0,0,0,0.13)', 4))
    elif style == 'police':
        out.append(rect(106, 166, 88, 140, tc, rx=14))
        out.append(line(110, 196, 190, 196, 'rgba(255,255,255,0.22)', 4))  # back yoke
        out.append(rect(106, 288, 88, 13, '#22242e'))                       # belt
        out.append(rect(141, 286, 18, 16, '#e8b64c', rx=3))                 # buckle
        out.append(rect(104, 164, 26, 10, '#e8b64c', rx=4))                 # epaulettes
        out.append(rect(170, 164, 26, 10, '#e8b64c', rx=4))
    elif style == 'sari':
        blouse = cfg.get('topColor', '#b03a5b')
        drape = cfg.get('drape', '#cf4f74')
        out.append(rect(108, 166, 84, 140, blouse, rx=14))
        out.append(path('M108,190 L192,164 L192,306 L148,306 L108,262 Z', fill=drape))
        out.append(path('M108,190 L192,164', stroke=cfg.get('border', '#e8b64c'), sw=7))
        out.append(line(150, 236, 150, 300, 'rgba(0,0,0,0.10)', 4))
    elif style == 'frock':
        out.append(path('M110,166 L190,166 L198,268 L102,268 Z', fill=tc))
        out.append(ellipse(150, 268, 49, 10, tc))
        out.append(line(150, 174, 150, 262, 'rgba(0,0,0,0.22)', 4))         # back zip
        out.append(rect(128, 158, 44, 12, '#ffffff', rx=6, opacity=0.85))
    elif style == 'vest':
        out.append(rect(108, 166, 84, 140, tc, rx=14))
        out.append(poly([(138, 164), (162, 164), (150, 184)], cfg.get('shirtColor', '#e0d6bd')))
        out.append(line(150, 186, 150, 298, 'rgba(0,0,0,0.15)', 4))
    else:  # shirt / tee back — plain panel, collar band, yoke seam; no buttons
        out.append(rect(108, 166, 84, 140, tc, rx=14))
        out.append(rect(132, 160, 36, 12, cfg.get('collar', '#ffffff'), rx=5))
        out.append(line(112, 202, 188, 202, 'rgba(0,0,0,0.10)', 4))
        if cfg.get('checkered'):
            chk = cfg['checkered']
            for xx in (124, 140, 156, 172):
                out.append(rect(xx, 174, 5, 126, chk, opacity=0.28))
            for yy in (228, 258, 288):
                out.append(rect(114, yy, 72, 5, chk, opacity=0.28))
    if cfg.get('apron'):
        out.append(line(112, 252, 188, 252, cfg['apron'], 9))               # apron tie
        out.append(poly([(150, 252), (138, 278), (150, 269), (162, 278)], cfg['apron']))
    if cfg.get('gamchha'):
        g = cfg['gamchha']
        out.append(path('M168,168 L188,168 L194,262 L172,268 Z', fill=g))
        out.append(line(170, 196, 190, 198, '#ffffff', 4, opacity=0.55))
    return ''.join(out)

def _arms_back(cfg):
    """Arms resting at the sides, seen from behind (Phase 10A)."""
    sleeve = cfg.get('topColor', '#7fae4c')
    if cfg.get('top') == 'sari':
        sleeve = cfg.get('drape', sleeve)
    if cfg.get('top') == 'vest':
        sleeve = cfg.get('shirtColor', sleeve)
    skin = cfg['skin']
    out = []
    out.append(limb(110, 184, 98, 248, 102, 314, sleeve, 20))
    out.append(circle(102, 314, 11, skin))
    out.append(limb(190, 184, 202, 248, 198, 314, sleeve, 20))
    out.append(circle(198, 314, 11, skin))
    return ''.join(out)

def _accessory(cfg, pose):
    acc = cfg.get('accessory')
    out = []
    if acc == 'stick' and pose in ('stand', 'talk', 'point', 'wave'):
        out.append(line(206, 300, 224, 452, '#7a4a21', 7))
        out.append(path('M196,296 q10,-12 20,-4', stroke='#7a4a21', sw=7))
    elif acc == 'book' and pose in ('stand', 'talk', 'wave', 'point'):
        out.append(rect(76, 292, 30, 40, '#b03a2e', rx=3))
        out.append(rect(80, 296, 22, 32, '#f2ead8', rx=2))
    elif acc == 'oar' and pose == 'stand':
        out.append(line(96, 150, 226, 448, '#9a6a35', 9))
        out.append(poly([(216, 420), (238, 446), (224, 458), (204, 434)], '#b57e4e'))
    return ''.join(out)

def person_svg(cfg, pose):
    if pose == 'back':
        # Phase 10A: true back view — standing legs, back of the clothing,
        # arms at the sides, back of the head (no face features).
        parts = [_legs_standing(cfg), _torso_back(cfg), _arms_back(cfg),
                 _accessory(cfg, 'stand'), _head_back(cfg)]
        shadow = ellipse(150, 458, 78, 10, 'rgba(20,26,38,0.20)')
        return svg_doc('0 0 300 480', shadow + ''.join(parts),
                       f"{cfg['name']} — back (original Cartoon Studio artwork)")
    sitting = (pose == 'sit')
    parts = []
    if cfg.get('accessory') == 'oar' and pose == 'stand':
        parts.append(_accessory(cfg, pose))  # oar goes behind the body
    if sitting:
        parts.append(_legs_sitting(cfg))
        parts.append(_torso(cfg, sitting=True))
    else:
        parts.append(_legs_walk(cfg) if pose == 'walk' else _legs_standing(cfg))
        parts.append(_torso(cfg))
    parts.append(_arms(cfg, pose))
    if not (cfg.get('accessory') == 'oar' and pose == 'stand'):
        parts.append(_accessory(cfg, pose))
    parts.append(_head(cfg, pose))
    # soft ground shadow
    shadow = ellipse(150, 458, 78, 10, 'rgba(20,26,38,0.20)')
    return svg_doc('0 0 300 480', shadow + ''.join(parts),
                   f"{cfg['name']} — {pose} (original Cartoon Studio artwork)")

# ---------------------------------------------------------------- characters

CHARACTERS = [
    dict(id='karim-dadu', name='Karim Dadu', role='Village elder & grandfather',
         tags='elder grandfather storyteller village beard man',
         skin='#9c6a3d', hair='tupi', beard=True,
         top='panjabi', topColor='#f0e7d2', collar='#d8cdb4',
         bottom='lungi', bottomColor='#2f6e63', waistColor='#274156',
         accessory='stick'),
    dict(id='rokeya-burima', name='Rokeya Burima', role='Grandmother',
         tags='grandmother elder woman sari glasses',
         skin='#b57e4e', hair='bun', hairColor='#cfccc4', glasses=True,
         top='sari', topColor='#f0ead9', drape='#e6dfca', border='#c2a15c',
         bottom='sari'),
    dict(id='arif', name='Arif', role='Young boy',
         tags='young boy kid school child',
         skin='#a06a3b', hair='spiky',
         top='tee', topColor='#d64541', collar='#f2ead8',
         bottom='shorts', bottomColor='#2e5f8a', blush=True),
    dict(id='mitu', name='Mitu', role='Young girl',
         tags='young girl kid school child dress',
         skin='#c68850', hair='long', hairColor='#33241c', ribbons='#e5639a',
         top='frock', topColor='#e5639a',
         bottom='skirt', bottomColor='#c94f83', blush=True),
    dict(id='harun-sir', name='Harun Sir', role='School teacher',
         tags='teacher school master glasses book man',
         skin='#8d5a33', hair='short', glasses=True,
         top='shirt', topColor='#e6dfca', collar='#b9ac8d',
         bottom='trousers', bottomColor='#4a4a55', accessory='book'),
    dict(id='jolil', name='Jolil Chacha', role='Farmer',
         tags='farmer village man lungi gamchha field',
         skin='#8d5a33', hair='short',
         top='shirt', topColor='#c96f2e', collar='#8a4a1d',
         bottom='lungi', bottomColor='#31572c', waistColor='#20391c',
         gamchha='#d64541'),
    dict(id='sattar', name='Sattar Mia', role='Shopkeeper',
         tags='shopkeeper trader shop bazaar man apron',
         skin='#a06a3b', hair='short',
         top='panjabi', topColor='#ded5c0', collar='#b3a888',
         bottom='trousers', bottomColor='#e8e4da', apron='#7a4a21'),
    dict(id='rofiq-police', name='Constable Rofiq', role='Police officer',
         tags='police officer uniform bangladesh man',
         skin='#9c6a3d', hair='policecap',
         top='police', topColor='#33527a',
         bottom='trousers', bottomColor='#2b3a55'),
    dict(id='kashem', name='Kashem', role='Rickshaw puller',
         tags='rickshaw puller worker village man gamchha',
         skin='#7d4e2a', hair='wrap', capColor='#e07a2f',
         top='vest', topColor='#5b3a29', shirtColor='#d9c9a3',
         bottom='lungi', bottomColor='#7a3b4f', waistColor='#4e2434'),
    dict(id='salma', name='Salma Ma', role='Mother in sari',
         tags='mother woman sari village home',
         skin='#c68850', hair='bun', hairColor='#2b2320',
         top='sari', topColor='#c0272d', drape='#d93a41', border='#e8b64c',
         bottom='sari'),
    dict(id='boltu', name='Boltu', role='Village kid with cap',
         tags='kid boy cap playful village child',
         skin='#b57e4e', hair='cap', capColor='#2e8b6e',
         top='tee', topColor='#f2a007', collar='#31578c',
         bottom='shorts', bottomColor='#3a6ea5', blush=True),
    dict(id='nader', name='Nader Majhi', role='Boatman',
         tags='boatman river boat majhi village man',
         skin='#8d5a33', hair='wrap', capColor='#2f6e63',
         top='vest', topColor='#374f63', shirtColor='#e0d6bd',
         bottom='lungi', bottomColor='#274156', waistColor='#16283a',
         accessory='oar'),
    # ---- Phase 10A: the remaining role rows (all original characters) ----
    # Phase 10C roster mirror: the two mode-default templates carry the
    # reference panel's functional labels and generic outfit archetypes
    # (ids unchanged — 'rafi-hero' / 'esha' — so existing projects keep
    # resolving; artwork is still our own parametric drawing).
    dict(id='rafi-hero', name='Advance Mode Default', role='Advanced-mode default template',
         tags='default advanced template young man shirt office lead',
         skin='#a06a3b', hair='short',
         top='shirt', topColor='#8fc1ee', collar='#4a7ab5',
         bottom='trousers', bottomColor='#33333f'),
    dict(id='esha', name='Easy Mode Default', role='Easy-mode default template',
         tags='default easy template young man panjabi lungi gamchha',
         skin='#a06a3b', hair='short',
         top='panjabi', topColor='#1f7a6d', collar='#2e9e8b',
         bottom='lungi', bottomColor='#31578c', waistColor='#22354f',
         gamchha='#d9762e'),
    dict(id='rina', name='Rina', role='Young village girl',
         tags='young village girl kid frock',
         skin='#b57e4e', hair='long', hairColor='#26201c',
         top='frock', topColor='#e8a13c',
         bottom='skirt', bottomColor='#845ec2', blush=True),
    dict(id='nasir-kaka', name='Nasir Kaka', role='Elderly village storyteller',
         tags='elder storyteller grandfather beard glasses man',
         skin='#9c6a3d', hair='grey', beard=True, glasses=True,
         top='panjabi', topColor='#8a4a3a', collar='#e8b64c',
         bottom='lungi', bottomColor='#5b729e', waistColor='#374f63',
         accessory='stick'),
    dict(id='raja-bijoy', name='Raja Bijoy', role='King / maharaja',
         tags='king maharaja royal crown palace',
         skin='#a06a3b', hair='crown',
         top='panjabi', topColor='#8e2f45', collar='#e8b64c',
         bottom='trousers', bottomColor='#f0e7d2'),
    dict(id='bablu', name='Bablu', role='Strong village kid',
         tags='strong kid boy village playful',
         skin='#8d5a33', hair='short',
         top='tee', topColor='#e07a2f', collar='#274156',
         bottom='shorts', bottomColor='#274156', blush=True),
    dict(id='golam-mota', name='Golam Mota', role='Plump comic man',
         tags='plump comic funny man village checkered shirt',
         skin='#b57e4e', hair='short',
         top='shirt', topColor='#c9a227', collar='#7a5a14', checkered='#7a5a14',
         bottom='trousers', bottomColor='#6d4525', blush=True),
    dict(id='imam-hafiz', name='Imam Hafiz', role='Cleric / molla',
         tags='cleric molla imam beard tupi religious man',
         skin='#a06a3b', hair='tupi', beard=True,
         top='panjabi', topColor='#eef2e4', collar='#c9d6bd',
         bottom='trousers', bottomColor='#e8e4da', accessory='book'),
    dict(id='hamid', name='Hamid', role='Front-facing young man',
         tags='young man front plain neighbour',
         skin='#9c6a3d', hair='short',
         top='shirt', topColor='#e6dfca', collar='#31578c',
         bottom='trousers', bottomColor='#5a5a68'),
    dict(id='tahiya', name='Tahiya', role='Young woman in sari',
         tags='young woman sari bride home',
         skin='#c68850', hair='long', hairColor='#241a14',
         top='sari', topColor='#1f7a6d', drape='#2e9e8b', border='#e8b64c',
         bottom='sari'),
    dict(id='ginni-bou', name='Ginni Bou', role='Comic housewife',
         tags='comic wife housewife woman sari funny',
         skin='#b57e4e', hair='bun', hairColor='#2b2320', blush=True,
         top='sari', topColor='#7a3b8e', drape='#e07a2f', border='#f2d38a',
         bottom='sari'),
    dict(id='mizan-mia', name='Mizan Mia', role='Middle-aged village man',
         tags='middle aged village man gamchha neighbour',
         skin='#8d5a33', hair='short', hairColor='#8d8578',
         top='shirt', topColor='#7a8ba0', collar='#4a5a70',
         bottom='lungi', bottomColor='#8a5a33', waistColor='#5d3a1a',
         gamchha='#2e8b6e'),
    dict(id='lal-chand', name='Lal Chand', role='Man in red panjabi',
         tags='man red panjabi festival eid',
         skin='#a06a3b', hair='short',
         top='panjabi', topColor='#c22f2f', collar='#f2d38a',
         bottom='trousers', bottomColor='#374f63'),
    dict(id='camili', name='Camili', role='Woman in violet sari',
         tags='woman sari violet village',
         skin='#c68850', hair='long', hairColor='#1d1512',
         top='sari', topColor='#5b3a8e', drape='#845ec2', border='#d8b4e8',
         bottom='sari'),
    dict(id='nurjahan', name='Nurjahan', role='Woman in traditional dress',
         tags='woman traditional dress sari maroon wedding',
         skin='#b57e4e', hair='bun', hairColor='#241a14',
         top='sari', topColor='#6e1f2e', drape='#8e2f45', border='#e8b64c',
         bottom='sari'),
    dict(id='priya', name='Priya', role='Schoolgirl',
         tags='schoolgirl student kid school book girl',
         skin='#c68850', hair='long', hairColor='#33241c', ribbons='#e5639a',
         top='frock', topColor='#31578c',
         bottom='skirt', bottomColor='#22354f', blush=True, accessory='book'),
    dict(id='sultan-ashraf', name='Sultan Ashraf', role='Sultan / royal ruler',
         tags='sultan royal ruler turban palace king',
         skin='#9c6a3d', hair='wrap', capColor='#f4f1e6',
         top='panjabi', topColor='#5b3a8e', collar='#e8b64c',
         bottom='trousers', bottomColor='#e8e4da'),
    dict(id='gopal', name='Gopal', role='Comic folk-tale man',
         tags='comic folk tale funny man village mustard',
         skin='#a06a3b', hair='short', hairColor='#3a2a1a',
         top='panjabi', topColor='#e8a13c', collar='#b57e4e',
         bottom='lungi', bottomColor='#b0562f', waistColor='#7a3b1d',
         gamchha='#2e8b6e'),
]

# ------------------------------------------------- special "characters" ---
# Phase 10A: the reference's character list also holds vehicles + animals.
# Ours are original side-view factory entries whose "poses" are variants.
# Canvas 640x360 (vehicles) / 400x300 (animals).

def _wheel(cx, cy, r, angle, tire='#2b2b30', hub='#c8ccd4'):
    import math
    out = [circle(cx, cy, r, tire), circle(cx, cy, r * 0.45, hub)]
    for k in range(3):
        a = math.radians(angle + k * 60)
        dx = round(r * 0.82 * math.cos(a))
        dy = round(r * 0.82 * math.sin(a))
        out.append(line(cx - dx, cy - dy, cx + dx, cy + dy, '#8a8f98', 5))
    out.append(circle(cx, cy, 6, '#57534c'))
    return ''.join(out)

def bus_svg(variant):
    angle = 35 if variant == 'wheels' else 0
    b = [ellipse(320, 328, 292, 15, 'rgba(20,26,38,0.20)')]
    b.append(rect(40, 84, 560, 196, '#2e8b6e', rx=26))                    # body
    b.append(rect(40, 152, 560, 20, '#f2ead8'))                           # cream band
    b.append(rect(40, 238, 560, 13, '#26735c'))
    for x in (64, 148, 232, 316):                                         # passenger windows
        b.append(rect(x, 100, 68, 44, '#9fd4ea', rx=8, stroke='#26735c', sw=4))
    b.append(rect(400, 100, 68, 44, '#9fd4ea', rx=8, stroke='#26735c', sw=4))
    b.append(path('M492,100 L552,100 Q582,100 588,126 L592,150 L492,150 Z', fill='#bfe6f5'))  # windshield
    if variant == 'driver':
        b.append(circle(526, 126, 15, '#5d3a1a'))                         # driver silhouette
        b.append(path('M504,150 Q526,130 548,150 Z', fill='#374f63'))
    if variant == 'open':
        b.append(rect(424, 170, 52, 110, '#14332a', rx=6))                # open doorway
        b.append(rect(480, 170, 11, 110, '#26735c', rx=5))                # swung door panel
    else:
        b.append(rect(424, 170, 52, 110, '#26735c', rx=6))
        b.append(line(450, 170, 450, 280, '#1d5240', 4))
        b.append(rect(433, 208, 34, 30, '#9fd4ea', rx=4))
    b.append(rect(120, 54, 180, 26, '#f2a007', rx=8))                      # roof sign board (blank)
    b.append(circle(594, 198, 11, '#ffd94d'))                             # headlight
    b.append(rect(590, 246, 15, 22, '#8a8f98', rx=4))                     # bumpers
    b.append(rect(35, 246, 12, 22, '#8a8f98', rx=4))
    b.append(_wheel(150, 288, 37, angle))
    b.append(_wheel(492, 288, 37, angle))
    lbl = {'still': 'Still', 'wheels': 'Wheels Turned', 'driver': 'With Driver',
           'open': 'Door Open'}[variant]
    return svg_doc('0 0 640 360', ''.join(b), f'Village Bus — {lbl} (original Cartoon Studio artwork)')

def mishuk_svg(variant):
    # Phase 10B: Mishuk (auto rickshaw) — the reference's character list
    # holds an Auto Rickshaw VEHICLE entry; Phase 3/10A mapped that role
    # to the Kashem person + Rickshaw prop, which kept the total at 33.
    # This is the one deliberate extra entry (34 total): a three-wheeler
    # in the same side-view vehicle family as the Village Bus.
    angle = 35 if variant == 'wheels' else 0
    b = [ellipse(320, 330, 262, 14, 'rgba(20,26,38,0.20)')]
    b.append(path('M96,120 Q110,52 226,44 L356,44 Q452,50 486,104 L512,150 L512,262 L470,262 L470,196 Q470,176 448,176 L206,176 Q186,176 186,196 L186,262 L110,262 Q94,196 96,120 Z',
                  fill='#3f9e4d'))                                       # green hood + body shell
    b.append(path('M120,108 Q130,64 224,58 L344,58 Q424,62 452,100 L466,124 L138,124 Q120,124 120,108 Z',
                  fill='#9fd4ea'))                                       # windshield + side glass
    b.append(line(238, 58, 238, 124, '#2c7a3a', 6))                      # glass divider
    b.append(rect(120, 252, 392, 12, '#2c7a3a'))                         # lower trim band
    b.append(rect(96, 128, 14, 60, '#2c7a3a', rx=6))                      # nose pillar
    if variant == 'driver':
        b.append(circle(300, 96, 17, '#5d3a1a'))                         # driver head
        b.append(path('M272,128 Q300,102 330,128 Z', fill='#d64541'))    # driver shirt
        b.append(line(318, 118, 348, 138, '#5d3a1a', 9))                 # arm to the handlebar
    b.append(line(330, 128, 352, 152, '#374f63', 7))                     # handlebar stem
    if variant == 'open':
        b.append(rect(392, 140, 62, 122, '#14331d', rx=8))               # open doorway (dark cabin)
        b.append(rect(458, 140, 12, 122, '#2c7a3a', rx=5))               # swung door panel
        b.append(rect(398, 216, 50, 16, '#7a4a21', rx=5))                # bench edge inside
    else:
        b.append(rect(392, 140, 62, 122, '#2c7a3a', rx=8))               # closed door
        b.append(rect(402, 152, 42, 40, '#9fd4ea', rx=5))                # door window
        b.append(line(448, 206, 402, 206, '#20602e', 5))                 # door handle
    b.append(rect(196, 176, 250, 14, '#f2a007'))                         # yellow waist stripe
    b.append(circle(508, 196, 12, '#ffd94d'))                            # headlight
    b.append(rect(498, 238, 16, 20, '#8a8f98', rx=4))                    # front bumper
    b.append(_wheel(150, 288, 36, angle))                                # front wheel
    b.append(_wheel(330, 292, 40, angle))                                # rear wheels (side view)
    b.append(_wheel(430, 292, 40, angle))
    lbl = {'still': 'Still', 'wheels': 'Wheels Turned', 'driver': 'With Driver',
           'open': 'Door Open'}[variant]
    return svg_doc('0 0 640 360', ''.join(b), f'Mishuk (Auto Rickshaw) — {lbl} (original Cartoon Studio artwork)')

def puppy_svg(pose):
    fur, dark, cream = '#c98d54', '#a06a3b', '#f2e3c8'
    b = [ellipse(200, 274, 132, 12, 'rgba(20,26,38,0.18)')]
    def head(cx, cy, ear_back=False):
        o = []
        o.append(path(f'M{cx - 30},{cy - 18} q-16,34 2,50 q14,8 20,-6 q2,-22 -8,-40 Z',
                      fill=dark))                                          # floppy ear
        o.append(circle(cx, cy, 38, fur))
        o.append(ellipse(cx + 30, cy + 12, 21, 14, cream))                 # snout
        o.append(circle(cx + 47, cy + 7, 7, '#33241c'))                    # nose
        o.append(circle(cx + 12, cy - 6, 5, '#26221f'))                    # eye
        o.append(path(f'M{cx - 8},{cy - 34} q20,-10 38,2', stroke=dark, sw=5))
        return ''.join(o)
    if pose == 'sit':
        b.append(path('M118,238 q-42,8 -38,32', stroke=fur, sw=13))        # tail on the ground
        b.append(ellipse(148, 218, 60, 54, fur))                           # haunch
        b.append(path('M148,116 Q216,106 226,172 Q232,224 196,246 L138,246 Q118,182 148,116 Z', fill=fur))
        b.append(ellipse(180, 190, 30, 42, cream))                         # chest patch
        b.append(rect(176, 200, 14, 62, fur, rx=7))                        # front legs
        b.append(rect(204, 200, 14, 62, fur, rx=7))
        b.append(ellipse(183, 270, 16, 7, dark))
        b.append(ellipse(211, 270, 16, 7, dark))
        b.append(ellipse(128, 262, 32, 11, fur))                           # folded hind paw
        b.append(line(196, 128, 226, 148, '#d64541', 9))                   # collar
        b.append(head(218, 92))
    else:
        if pose == 'stand':
            for x in (138, 172, 238, 272):
                b.append(rect(x, 196, 15, 66, fur, rx=7))
                b.append(ellipse(x + 8, 268, 14, 6, dark))
            tail = 'M112,148 q-30,-16 -24,-38'
            head_xy = (302, 122)
        elif pose == 'walk':
            b.append(limb(146, 200, 128, 232, 112, 262, fur, 15))
            b.append(limb(176, 200, 190, 230, 208, 258, fur, 15))
            b.append(limb(240, 200, 224, 232, 206, 260, fur, 15))
            b.append(limb(268, 200, 284, 228, 302, 254, fur, 15))
            for x, y in ((108, 266), (212, 262), (202, 264), (306, 258)):
                b.append(ellipse(x, y, 13, 6, dark))
            tail = 'M112,146 q-32,-8 -30,-32'
            head_xy = (304, 118)
        else:  # run — legs stretched, body low, tail up
            b.append(limb(148, 204, 116, 226, 84, 240, fur, 15))
            b.append(limb(178, 204, 158, 234, 132, 258, fur, 15))
            b.append(limb(238, 204, 268, 224, 302, 232, fur, 15))
            b.append(limb(266, 204, 282, 232, 306, 254, fur, 15))
            for x, y in ((80, 244), (128, 262), (306, 236), (310, 258)):
                b.append(ellipse(x, y, 13, 6, dark))
            tail = 'M112,140 q-26,-26 -12,-44'
            head_xy = (308, 126)
        b.append(path(tail, stroke=fur, sw=13))
        b.append(ellipse(200, 168, 96, 47, fur))                           # body
        b.append(ellipse(168, 152, 30, 20, cream, opacity=0.55))           # patch
        b.append(line(272, 138, 288, 172, '#d64541', 10))                  # collar
        b.append(head(*head_xy))
    lbl = {'stand': 'Stand', 'walk': 'Walk', 'run': 'Run', 'sit': 'Sit'}[pose]
    return svg_doc('0 0 400 300', ''.join(b), f'Bhulu Puppy — {lbl} (original Cartoon Studio artwork)')

def parrot_svg(pose):
    body, wing, tailc = '#43b04f', '#2e8b6e', '#3f7fbf'
    b = []
    def head(cx, cy):
        o = [circle(cx, cy, 26, body),
             poly([(cx + 18, cy - 6), (cx + 42, cy + 2), (cx + 18, cy + 12)], '#f2a007'),
             poly([(cx + 16, cy + 8), (cx + 32, cy + 14), (cx + 14, cy + 18)], '#e07a2f'),
             circle(cx + 8, cy - 4, 8, '#ffffff'),
             circle(cx + 9, cy - 4, 4, '#26221f')]
        return ''.join(o)
    if pose == 'perched':
        b.append(line(40, 238, 360, 226, '#7a4a21', 11))                   # branch
        b.append(path('M330,224 q22,-16 38,-10 M318,226 q10,-20 26,-24', stroke='#3e8e4e', sw=6))
        b.append(path('M196,120 L182,238 M206,124 L214,240', stroke=tailc, sw=13))  # long tail
        b.append(path('M204,118 L196,242 M214,120 L226,238', stroke='#57a8c9', sw=7, opacity=0.7))
        b.append(ellipse(200, 150, 52, 66, body))                          # body, upright
        b.append(path('M168,118 Q138,160 160,206 Q182,224 196,196 Q182,150 168,118 Z', fill=wing))  # folded wing
        b.append(line(188, 214, 186, 232, '#e07a2f', 6))                    # feet
        b.append(line(210, 214, 212, 230, '#e07a2f', 6))
        b.append(head(216, 66))
    elif pose == 'wings-up':
        b.append(line(40, 252, 360, 240, '#7a4a21', 11))
        b.append(path('M192,128 L178,246 M204,130 L216,248', stroke=tailc, sw=13))
        b.append(ellipse(200, 158, 50, 62, body))
        b.append(path('M158,140 Q104,96 92,44 Q140,52 168,104 Q176,124 158,140 Z', fill=wing))   # raised wings
        b.append(path('M242,140 Q296,96 308,44 Q260,52 232,104 Q224,124 242,140 Z', fill=wing))
        b.append(path('M120,72 q14,10 12,24 M286,66 q-12,12 -8,26', stroke='#57a639', sw=5))
        b.append(line(188, 220, 186, 240, '#e07a2f', 6))
        b.append(line(210, 220, 212, 238, '#e07a2f', 6))
        b.append(head(214, 76))
    else:  # flying — horizontal body, wings swept, tail streaming
        b.append(path('M60,84 q30,-10 58,-2 M44,120 q26,-8 48,0', stroke='#bcd9ea', sw=5, opacity=0.8))  # motion lines
        b.append(path('M150,150 L66,196 M156,158 L84,214', stroke=tailc, sw=12))
        b.append(path('M158,152 L96,204', stroke='#57a8c9', sw=6, opacity=0.7))
        b.append(ellipse(215, 148, 78, 34, body))                          # body, horizontal
        b.append(path('M196,128 Q168,58 214,26 Q244,66 232,120 Q216,138 196,128 Z', fill=wing))  # big wing up
        b.append(path('M238,166 Q262,206 300,210 Q282,172 252,160 Z', fill=wing, opacity=0.85))       # far wing
        b.append(head(292, 128))
    lbl = {'perched': 'Perched', 'wings-up': 'Wings Up', 'flying': 'Flying'}[pose]
    return svg_doc('0 0 400 300', ''.join(b), f'Tiya Parrot — {lbl} (original Cartoon Studio artwork)')

SPECIAL_CHARACTERS = [
    dict(id='village-bus', name='Village Bus', role='Local bus (vehicle)',
         tags='bus vehicle transport road village', w=640, h=360, builder=bus_svg,
         poses=[('still', 'Still'), ('wheels', 'Wheels Turned'),
                ('driver', 'With Driver'), ('open', 'Door Open')]),
    dict(id='mishuk-rickshaw', name='Mishuk (Auto Rickshaw)', role='Auto rickshaw (vehicle)',
         tags='mishuk auto rickshaw vehicle transport road three wheeler', w=640, h=360,
         builder=mishuk_svg,
         poses=[('still', 'Still'), ('wheels', 'Wheels Turned'),
                ('driver', 'With Driver'), ('open', 'Door Open')]),
    dict(id='bhulu-puppy', name='Bhulu Puppy', role='Puppy (animal)',
         tags='puppy dog animal pet cute', w=400, h=300, builder=puppy_svg,
         poses=[('stand', 'Stand'), ('walk', 'Walk'), ('run', 'Run'), ('sit', 'Sit')]),
    dict(id='tiya-parrot', name='Tiya Parrot', role='Parrot (animal)',
         tags='parrot bird animal flying pet tia', w=400, h=300, builder=parrot_svg,
         poses=[('perched', 'Perched'), ('wings-up', 'Wings Up'), ('flying', 'Flying')]),
]

# ---------------------------------------------------------------- backgrounds
# All scenes: viewBox 0 0 1280 720, flat-cartoon style, shared palette.

def _sky(top='#8ec9e8', bottom='#d8f0fb'):
    return (f'<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">'
            f'<stop offset="0" stop-color="{top}"/><stop offset="1" stop-color="{bottom}"/>'
            f'</linearGradient></defs>' + rect(0, 0, 1280, 720, 'url(#sky)'))

def _sun(x=1120, y=105):
    return circle(x, y, 52, '#ffd94d') + circle(x, y, 66, '#ffd94d', opacity=0.3)

def _cloud(x, y, s=1.0, op=0.95):
    return (f'<g opacity="{op}" transform="translate({x},{y}) scale({s})">'
            + ellipse(0, 0, 62, 26, '#ffffff') + ellipse(38, -14, 44, 24, '#ffffff')
            + ellipse(-40, -10, 40, 20, '#ffffff') + '</g>')

def _tree(x, y, s=1.0, trunk='#7a4a21', leaf='#3e8e4e'):
    return (f'<g transform="translate({x},{y}) scale({s})">'
            + rect(-9, -70, 18, 74, trunk, rx=7)
            + circle(0, -108, 52, leaf) + circle(-42, -82, 36, leaf)
            + circle(42, -82, 36, leaf) + circle(0, -70, 40, leaf, opacity=0.85)
            + '</g>')

def _house(x, y, s=1.0, wall='#e8d9b0', roof='#b0562f'):
    return (f'<g transform="translate({x},{y}) scale({s})">'
            + rect(-95, -120, 190, 120, wall)
            + poly([(-112, -118), (0, -182), (112, -118)], roof)
            + rect(-24, -72, 48, 72, '#6d4525')
            + rect(-78, -96, 36, 36, '#9fd4ea', stroke='#6d4525', sw=4)
            + rect(42, -96, 36, 36, '#9fd4ea', stroke='#6d4525', sw=4)
            + '</g>')

def bg_village_road():
    b = [_sky(), _sun(), _cloud(240, 90), _cloud(760, 60, 0.8)]
    b.append(rect(0, 470, 1280, 250, '#79b657'))                       # grass
    b.append(poly([(520, 470), (760, 470), (1010, 720), (270, 720)], '#c9a06b'))  # dirt road
    b.append(poly([(612, 470), (668, 470), (760, 720), (560, 720)], '#b98f56'))
    b.append(_house(210, 480, 1.0))
    b.append(_house(1075, 478, 0.85, wall='#dfe8d8', roof='#5b729e'))
    b.append(_tree(420, 500, 1.1))
    b.append(_tree(880, 505, 0.9, leaf='#57a639'))
    b.append(_tree(90, 540, 1.25))
    b.append(_tree(1200, 545, 1.2))
    b.append(rect(0, 690, 1280, 30, '#6aa34e'))
    return svg_doc('0 0 1280 720', ''.join(b), 'Village road (original)')

def bg_paddy_field():
    b = [_sky(), _sun(150, 100), _cloud(560, 80), _cloud(1010, 130, 0.8)]
    b.append(rect(0, 400, 1280, 60, '#8fbf6a'))                        # far treeline band
    for x in range(40, 1280, 130):
        b.append(_tree(x, 428, 0.55))
    b.append(rect(0, 452, 1280, 268, '#5ea64a'))                       # paddy green
    for i, yy in enumerate((500, 552, 610, 676)):
        b.append(path(f'M0,{yy} Q640,{yy - 22} 1280,{yy}', stroke='#4c8a3c', sw=7, opacity=0.7))
    for xx in range(30, 1280, 46):                                     # rice tufts
        yy = 520 + (xx * 7) % 170
        b.append(path(f'M{xx},{yy} q4,-20 10,-26 M{xx + 8},{yy} q0,-22 -6,-28 M{xx + 16},{yy} q-3,-18 -12,-24',
                      stroke='#79c25e', sw=4))
    b.append(poly([(0, 720), (420, 452), (500, 452), (260, 720)], '#c9a06b', opacity=0.85))  # path
    return svg_doc('0 0 1280 720', ''.join(b), 'Paddy field (original)')

def bg_riverbank():
    b = [_sky(), _sun(), _cloud(300, 84), _cloud(880, 120, 0.85)]
    b.append(rect(0, 380, 1280, 70, '#79b657'))                         # far bank
    for x in (120, 330, 1080, 1220):
        b.append(_tree(x, 402, 0.6))
    b.append(rect(0, 448, 1280, 272, '#4a90c2'))                       # river
    for yy in (500, 560, 628, 686):
        b.append(path(f'M0,{yy} q80,-12 160,0 t160,0 t160,0 t160,0 t160,0 t160,0 t160,0 t160,0',
                      stroke='#79b8dd', sw=5, opacity=0.65))
    # wooden boat resting mid-river
    b.append('<g transform="translate(880,520)">'
             + path('M-120,0 Q0,44 120,0 L96,26 Q0,58 -96,26 Z', fill='#8a5a33')
             + rect(-96, -8, 192, 12, '#6d4525')
             + rect(-30, -52, 60, 46, '#c9a06b')
             + line(58, -6, 96, -64, '#6d4525', 6)
             + '</g>')
    b.append(poly([(0, 720), (0, 560), (300, 720)], '#a8c686'))        # near bank corner
    b.append(_tree(80, 640, 1.05))
    return svg_doc('0 0 1280 720', ''.join(b), 'Riverbank with boat (original)')

def bg_courtyard():
    b = [_sky(), _sun(140, 96), _cloud(680, 70)]
    b.append(rect(0, 420, 1280, 300, '#d8bd8a'))                       # earthen courtyard
    b.append(_house(360, 438, 1.35))
    b.append(_house(950, 436, 1.1, wall='#ecd9a8', roof='#8a5a33'))
    b.append(rect(560, 300, 150, 138, '#c9d6e2'))                      # tin shed
    b.append(poly([(548, 302), (635, 262), (722, 302)], '#95a5b5'))
    # fence
    for x in range(30, 1250, 64):
        b.append(rect(x, 470, 10, 66, '#9a6a35', rx=3))
    b.append(rect(20, 486, 1240, 8, '#9a6a35'))
    b.append(rect(20, 512, 1240, 8, '#9a6a35'))
    b.append(_tree(1150, 560, 1.15, leaf='#57a639'))
    b.append(_tree(70, 580, 0.9))
    b.append(ellipse(640, 640, 300, 34, '#c9ab74'))                    # swept yard patch
    return svg_doc('0 0 1280 720', ''.join(b), 'Village home courtyard (original)')

def bg_tea_stall():
    b = [_sky(), _sun(), _cloud(340, 76)]
    b.append(rect(0, 500, 1280, 220, '#b9b3a4'))                       # street ground
    b.append(rect(0, 500, 1280, 16, '#9a9587'))
    # stall body
    b.append(rect(300, 218, 680, 282, '#e5cf9f'))
    b.append(rect(300, 218, 680, 26, '#b03a2e'))
    b.append(poly([(272, 222), (1008, 222), (940, 150), (340, 150)], '#c95f2e'))  # awning roof
    b.append(rect(330, 300, 150, 118, '#8a5a33'))                      # shelf block
    for yy in (322, 356, 390):
        b.append(rect(338, yy, 134, 9, '#6d4525'))
    for xx in (352, 392, 432):
        b.append(rect(xx, 300, 16, 22, '#d64541', rx=3))
        b.append(rect(xx, 334, 16, 22, '#2e8b6e', rx=3))
    b.append(rect(520, 330, 210, 88, '#5b729e'))                       # counter
    b.append(rect(520, 330, 210, 14, '#41587c'))
    b.append(ellipse(625, 306, 34, 20, '#c8ccd4'))                     # kettle
    b.append(path('M596,298 q-18,-10 -8,-24', stroke='#9aa0ab', sw=6))
    b.append(rect(770, 356, 190, 16, '#8a5a33'))                       # bench
    b.append(rect(786, 372, 12, 62, '#6d4525'))
    b.append(rect(932, 372, 12, 62, '#6d4525'))
    b.append(rect(560, 178, 170, 40, '#f2ead8', rx=8))                 # blank sign board
    b.append(_tree(120, 520, 1.2))
    b.append(_tree(1180, 520, 1.1, leaf='#57a639'))
    return svg_doc('0 0 1280 720', ''.join(b), 'Tea stall (original)')

def bg_school_yard():
    b = [_sky(), _sun(150, 100), _cloud(600, 76), _cloud(1050, 120, 0.8)]
    b.append(rect(0, 470, 1280, 250, '#8fbf6a'))                       # yard grass
    b.append(rect(330, 196, 620, 252, '#e9e2cc'))                      # school building
    b.append(rect(330, 176, 620, 24, '#b0562f'))
    b.append(rect(596, 330, 88, 118, '#6d4525'))                       # door
    for xx in (368, 482, 792, 900):
        b.append(rect(xx, 250, 74, 74, '#9fd4ea', stroke='#8a7a52', sw=5))
    b.append(rect(560, 210, 160, 34, '#f2ead8', rx=6))                 # blank name board
    # flag pole + Bangladesh flag (green field, red disc)
    b.append(rect(1008, 168, 8, 300, '#c8ccd4'))
    b.append(rect(1016, 176, 118, 72, '#006a4e'))
    b.append(circle(1070, 212, 26, '#f42a41'))
    b.append(poly([(240, 720), (420, 470), (500, 470), (470, 720)], '#c9a06b'))
    b.append(_tree(140, 520, 1.15))
    b.append(_tree(1180, 528, 1.05, leaf='#57a639'))
    return svg_doc('0 0 1280 720', ''.join(b), 'School yard (original)')

def bg_market():
    b = [_sky(top='#f2b879', bottom='#f7dcae'), _cloud(300, 84, 1.0, 0.8), _cloud(900, 60, 0.8, 0.8)]
    b.append(rect(0, 500, 1280, 220, '#cbb894'))                       # bazaar ground
    stall_cols = ['#d64541', '#2e8b6e', '#31578c', '#e07a2f']
    x = 60
    for i, col in enumerate(stall_cols):
        b.append(rect(x, 268, 262, 232, '#e5cf9f'))
        b.append(poly([(x - 16, 272), (x + 278, 272), (x + 240, 208), (x + 22, 208)], col))
        b.append(rect(x + 16, 400, 230, 16, '#8a5a33'))
        for k in range(4):  # crates of produce
            cx = x + 26 + k * 56
            b.append(rect(cx, 356, 46, 44, '#b57e4e', rx=4))
            b.append(circle(cx + 12, 352, 10, '#d64541'))
            b.append(circle(cx + 26, 348, 10, '#e8a13c'))
            b.append(circle(cx + 38, 353, 10, '#57a639'))
        x += 292
    b.append(rect(0, 640, 1280, 80, '#bfa87e'))
    return svg_doc('0 0 1280 720', ''.join(b), 'Market / bazaar (original)')

def bg_home_room():
    b = [rect(0, 0, 1280, 720, '#efe3cb')]                              # wall
    b.append(rect(0, 508, 1280, 212, '#b08954'))                        # floor
    b.append(path('M0,508 L1280,508', stroke='#8a683c', sw=6))
    b.append(rect(120, 110, 260, 300, '#9fd4ea', stroke='#8a5a33', sw=10))  # window
    b.append(line(250, 110, 250, 410, '#8a5a33', 7))
    b.append(line(120, 260, 380, 260, '#8a5a33', 7))
    b.append(path('M120,110 L196,110 L196,410 L120,410 Z', fill='#d64541', opacity=0.75))  # curtain
    b.append(path('M304,110 L380,110 L380,410 L304,410 Z', fill='#d64541', opacity=0.75))
    b.append(circle(250, 196, 30, '#ffd94d'))                           # sun through window
    b.append(rect(880, 96, 250, 412, '#8a5a33'))                        # door
    b.append(rect(900, 118, 210, 180, '#a06a3b'))
    b.append(circle(1096, 330, 9, '#e8b64c'))
    b.append(rect(520, 130, 180, 130, '#f7f2e2', stroke='#b03a2e', sw=8))  # picture frame
    b.append(circle(576, 182, 22, '#57a639'))
    b.append(path('M540,240 q40,-44 70,-8 q26,-34 70,8 Z', fill='#79b657'))
    # bed corner
    b.append(rect(60, 520, 520, 90, '#7a4a21'))
    b.append(rect(60, 492, 520, 40, '#cf4f74', rx=10))
    b.append(rect(76, 452, 130, 52, '#f2ead8', rx=14))
    # clay water pot on floor
    b.append(ellipse(1150, 620, 52, 58, '#b5642f'))
    b.append(rect(1118, 556, 64, 16, '#9a5326', rx=6))
    return svg_doc('0 0 1280 720', ''.join(b), 'Inside home room (original)')

def bg_pond_side():
    b = [_sky(), _sun(), _cloud(420, 80)]
    b.append(rect(0, 420, 1280, 300, '#79b657'))
    b.append(_house(160, 452, 1.05))
    b.append(ellipse(800, 586, 400, 108, '#57a8c9'))                   # pond
    b.append(ellipse(800, 578, 400, 100, '#6db6d6'))
    for xx in (560, 760, 980):
        b.append(ellipse(xx, 580 + (xx % 50), 44, 9, '#ffffff', opacity=0.35))
    b.append(circle(620, 566, 15, '#e5639a'))                          # lotus
    b.append(path('M606,572 q14,-12 28,0 q-14,8 -28,0 Z', fill='#3e8e4e'))
    b.append(circle(952, 596, 13, '#e5639a'))
    # palm + banana silhouettes
    b.append('<g transform="translate(1180,470)">'
             + path('M0,0 q6,-90 -4,-140', stroke='#7a4a21', sw=13)
             + path('M-4,-138 q-52,-26 -84,-8 M-4,-138 q-16,-46 14,-66 M-4,-138 q34,-40 66,-30 M-4,-138 q52,-14 66,16',
                    stroke='#3e8e4e', sw=11)
             + '</g>')
    b.append(poly([(330, 720), (470, 470), (540, 470), (520, 720)], '#c9a06b'))
    b.append(_tree(60, 560, 0.95, leaf='#57a639'))
    return svg_doc('0 0 1280 720', ''.join(b), 'Pond side (original)')

def bg_city_street():
    b = [_sky(top='#a8c8e0', bottom='#dfe9f2'), _cloud(240, 80), _cloud(900, 130, 0.85)]
    cols = ['#c9d6e2', '#e2cfae', '#b5c4d6', '#d8b8a6', '#c2cfc0']
    xs = [0, 250, 520, 800, 1060]
    ws = [240, 260, 270, 250, 220]
    hs = [330, 410, 360, 440, 380]
    for x, w, h, c in zip(xs, ws, hs, cols):
        b.append(rect(x, 470 - h, w, h, c))
        for wy in range(470 - h + 26, 440, 52):
            for wx in range(x + 20, x + w - 34, 48):
                b.append(rect(wx, wy, 28, 34, '#9fd4ea', opacity=0.9))
    b.append(rect(0, 470, 1280, 250, '#6d6f78'))                       # road
    b.append(rect(0, 470, 1280, 54, '#c8ccd4'))                        # pavement
    for x in range(30, 1280, 150):
        b.append(rect(x, 606, 84, 12, '#f2ead8'))                      # lane dashes
    b.append(rect(90, 300, 10, 170, '#3c3f47'))                        # streetlight
    b.append(path('M95,300 q44,-16 62,6', stroke='#3c3f47', sw=9))
    b.append(circle(164, 312, 11, '#ffd94d'))
    b.append(rect(1140, 300, 10, 170, '#3c3f47'))
    b.append(path('M1145,300 q-44,-16 -62,6', stroke='#3c3f47', sw=9))
    b.append(circle(1076, 312, 11, '#ffd94d'))
    return svg_doc('0 0 1280 720', ''.join(b), 'City street corner (original)')

def bg_village_lane():
    b = [_sky(), _sun(180, 90), _cloud(700, 70, 0.9)]
    b.append(rect(0, 460, 1280, 260, '#79b657'))
    b.append(poly([(540, 460), (740, 460), (900, 720), (380, 720)], '#c9a06b'))  # lane
    # bamboo groves both sides
    for bx in (60, 120, 190, 1010, 1090, 1170):
        for k in range(3):
            x = bx + k * 22
            b.append(rect(x, 180, 11, 300, '#57a639', rx=5))
            b.append(line(x, 190, x, 470, '#3e8e4e', 3))
            b.append(path(f'M{x + 5},210 q26,-18 44,-12 M{x + 5},270 q-26,-16 -42,-8',
                          stroke='#57a639', sw=7))
    b.append(_house(330, 470, 0.8, wall='#ecd9a8', roof='#8a5a33'))
    b.append(_tree(880, 500, 0.95, leaf='#57a639'))
    b.append(rect(0, 692, 1280, 28, '#6aa34e'))
    return svg_doc('0 0 1280 720', ''.join(b), 'Village bamboo lane (original)')

def bg_town_street():
    b = [_sky(top='#a8c8e0', bottom='#e8eef4'), _cloud(300, 80), _cloud(980, 120, 0.8)]
    shop_cols = ['#e5cf9f', '#c9d6e2', '#e2cfae', '#d8b8a6']
    x = 0
    for i, col in enumerate(shop_cols):
        b.append(rect(x, 190, 320, 250, col))
        b.append(rect(x, 190, 320, 26, '#57534c'))
        b.append(rect(x + 24, 300, 120, 140, '#8a8f98'))               # shutter shop
        b.append(rect(x + 24, 300, 120, 140, 'none', stroke='#6d7686', sw=4))
        for yy in range(318, 430, 22):
            b.append(line(x + 24, yy, x + 144, yy, '#6d7686', 4))
        b.append(rect(x + 168, 300, 128, 140, '#e5cf9f'))              # open shop
        b.append(rect(x + 182, 330, 100, 14, '#8a5a33'))
        for k in range(3):
            b.append(circle(x + 198 + k * 34, 322, 11, ['#d64541', '#e8a13c', '#57a639'][k]))
        b.append(rect(x + 160, 238, 140, 34, '#f2ead8', rx=6))         # blank sign
        x += 320
    b.append(rect(0, 440, 1280, 280, '#7a7c85'))                       # road
    b.append(rect(0, 440, 1280, 40, '#c8ccd4'))                        # pavement
    for x in range(30, 1280, 150):
        b.append(rect(x, 580, 84, 12, '#f2ead8'))
    b.append(rect(60, 300, 10, 140, '#3c3f47'))
    b.append(circle(66, 292, 12, '#ffd94d'))
    return svg_doc('0 0 1280 720', ''.join(b), 'Town street with shops (original)')

def bg_grocery_shop():
    b = [rect(0, 0, 1280, 720, '#e8dcc0')]
    b.append(rect(0, 520, 1280, 200, '#9a7a52'))
    b.append(rect(70, 60, 1140, 300, '#8a5a33'))                       # shelf unit
    for i, yy in enumerate((92, 172, 252)):
        b.append(rect(86, yy + 52, 1108, 12, '#6d4525'))
        for k in range(9):
            xx = 110 + k * 122
            col = ['#d64541', '#2e8b6e', '#e8a13c', '#31578c'][(k + i) % 4]
            b.append(rect(xx, yy + 8, 34, 44, col, rx=5))              # jars / tins
            b.append(rect(xx + 6, yy, 22, 9, '#57534c', rx=3))
            b.append(rect(xx + 52, yy + 16, 46, 36, '#c9a06b', rx=4))  # sacks / boxes
    # hanging balance scale
    b.append(line(1020, 30, 1020, 84, '#57534c', 5))
    b.append(line(952, 84, 1088, 84, '#57534c', 5))
    for sx in (952, 1088):
        b.append(line(sx, 84, sx - 16, 122, '#57534c', 3))
        b.append(line(sx, 84, sx + 16, 122, '#57534c', 3))
        b.append(ellipse(sx, 126, 24, 7, '#c8ccd4'))
    # counter with glass jar row
    b.append(rect(240, 430, 560, 96, '#a06a3b'))
    b.append(rect(240, 430, 560, 14, '#8a5a33'))
    for k in range(4):
        b.append(rect(286 + k * 120, 384, 52, 46, '#bfe6f5', rx=8, opacity=0.85))
        b.append(circle(312 + k * 120, 408, 13, ['#d64541', '#e8a13c', '#57a639', '#e5639a'][k]))
    b.append(rect(880, 470, 300, 250, '#6d4525'))                      # side door shadow
    return svg_doc('0 0 1280 720', ''.join(b), 'Grocery shop interior (original)')

def bg_classroom():
    b = [rect(0, 0, 1280, 720, '#f0e8d2')]
    b.append(rect(0, 540, 1280, 180, '#b08954'))
    b.append(rect(300, 90, 560, 300, '#2c4a3e', stroke='#8a5a33', sw=12))  # blackboard
    b.append(path('M340,150 q60,-14 120,0 M340,200 q90,-16 180,-4 M340,250 q50,-12 110,0',
                  stroke='#e8e4da', sw=5, opacity=0.65))               # chalk scribbles
    b.append(rect(330, 356, 90, 12, '#f2ead8', rx=4))                  # chalk tray
    b.append(rect(80, 110, 150, 210, '#9fd4ea', stroke='#8a5a33', sw=9))   # windows
    b.append(line(155, 110, 155, 320, '#8a5a33', 6))
    b.append(rect(1010, 100, 190, 150, '#f7f2e2', stroke='#b03a2e', sw=7))  # wall chart
    b.append(circle(1062, 152, 20, '#57a639'))
    b.append(path('M1028,222 q40,-40 76,-6 q30,-30 76,6 Z', fill='#79b657'))
    for i, dx in enumerate((140, 470, 800)):                           # desk rows
        for j, dy in enumerate((520, 610)):
            s = 1.0 + j * 0.18
            b.append(f'<g transform="translate({dx + j * 30},{dy}) scale({s})">'
                     + rect(0, 0, 210, 20, '#a06a3b', rx=5)
                     + rect(14, 20, 14, 52, '#8a5a33') + rect(182, 20, 14, 52, '#8a5a33')
                     + rect(0, 44, 210, 14, '#8a5a33')
                     + rect(30, -16, 52, 16, ['#d64541', '#31578c', '#2e8b6e'][(i + j) % 3], rx=3)
                     + '</g>')
    return svg_doc('0 0 1280 720', ''.join(b), 'Classroom interior (original)')

def bg_meadow():
    b = [_sky(), _sun(1080, 96), _cloud(260, 84), _cloud(760, 130, 0.85)]
    b.append(path('M0,430 Q320,360 640,420 Q960,470 1280,400 L1280,720 L0,720 Z', fill='#8fbf6a'))  # hills
    b.append(path('M0,510 Q400,450 800,505 Q1080,540 1280,500 L1280,720 L0,720 Z', fill='#79b657'))
    b.append(_tree(150, 520, 1.3))
    b.append(_tree(1130, 505, 1.05, leaf='#57a639'))
    for i in range(46):                                                # flower patches
        x = 30 + (i * 83) % 1220
        y = 540 + (i * 47) % 150
        col = ['#e5639a', '#ffd94d', '#ffffff', '#e07a2f'][i % 4]
        b.append(circle(x, y, 6, col))
        b.append(circle(x + 8, y + 5, 4.5, col, opacity=0.8))
    for x, y in ((420, 300), (560, 250), (700, 320)):                  # butterflies
        b.append(ellipse(x - 8, y, 9, 6, '#e5639a'))
        b.append(ellipse(x + 8, y, 9, 6, '#e5639a'))
        b.append(line(x, y - 6, x, y + 7, '#57534c', 3))
    b.append(poly([(470, 720), (600, 512), (668, 512), (640, 720)], '#c9a06b', opacity=0.8))
    return svg_doc('0 0 1280 720', ''.join(b), 'Meadow and hills (original)')

def bg_ferry_ghat():
    b = [_sky(), _sun(160, 96), _cloud(620, 76), _cloud(1060, 130, 0.8)]
    b.append(rect(0, 356, 1280, 52, '#79b657'))                         # far shore
    for x in (90, 260, 1120):
        b.append(_tree(x, 380, 0.55))
    b.append(rect(0, 406, 1280, 314, '#4a90c2'))                        # wide river
    for yy in (470, 540, 612, 680):
        b.append(path(f'M0,{yy} q80,-12 160,0 t160,0 t160,0 t160,0 t160,0 t160,0 t160,0 t160,0',
                      stroke='#79b8dd', sw=5, opacity=0.6))
    # ferry with a roof deck mid-river
    b.append('<g transform="translate(800,470)">'
             + path('M-190,26 Q0,58 190,26 L168,52 Q0,78 -168,52 Z', fill='#5b729e')
             + rect(-168, 12, 336, 16, '#41587c')
             + rect(-120, -58, 240, 70, '#e5cf9f')
             + poly([(-138, -56), (138, -56), (108, -92), (-108, -92)], '#c95f2e')
             + rect(-96, -40, 34, 40, '#41587c') + rect(-40, -40, 34, 40, '#41587c')
             + rect(28, -40, 34, 40, '#41587c') + rect(84, -40, 26, 40, '#41587c')
             + '</g>')
    # ghat steps in the near corner
    for i in range(4):
        b.append(rect(0, 596 + i * 31, 330 - i * 52, 31, '#b9b3a4' if i % 2 == 0 else '#a39d8f'))
    b.append(path('M0,560 L330,596 L0,640 Z', fill='#8fbf6a'))
    b.append(_tree(90, 560, 0.9))
    return svg_doc('0 0 1280 720', ''.join(b), 'River ferry ghat (original)')

def bg_village_night():
    b = [_sky(top='#141f3d', bottom='#3d4a6b')]
    for i in range(60):                                                # stars
        x = (i * 197) % 1280
        y = (i * 89) % 300
        b.append(circle(x, y, 2.2 if i % 3 else 3.2, '#ffffff', opacity=0.85))
    b.append(circle(1080, 110, 44, '#f2ead8'))                          # moon
    b.append(circle(1058, 98, 38, '#141f3d', opacity=0.35))
    b.append(rect(0, 470, 1280, 250, '#24351f'))                        # dark ground
    b.append(poly([(520, 470), (760, 470), (1010, 720), (270, 720)], '#2e2a33'))  # lane
    for hx, s, wc in ((210, 1.0, '#ffd98a'), (1075, 0.85, '#ffd98a')):   # houses, lit windows
        b.append(f'<g transform="translate({hx},478) scale({s})">'
                 + rect(-95, -120, 190, 120, '#1c2438')
                 + poly([(-112, -118), (0, -182), (112, -118)], '#10182a')
                 + rect(-24, -72, 48, 72, '#0d1322')
                 + rect(-78, -96, 36, 36, wc) + rect(42, -96, 36, 36, wc)
                 + '</g>')
    for tx, ty, ts in ((420, 500, 1.1), (880, 505, 0.9), (90, 545, 1.2)):
        b.append(f'<g transform="translate({tx},{ty}) scale({ts})">'
                 + rect(-9, -70, 18, 74, '#141a18', rx=7)
                 + circle(0, -104, 52, '#1a2b1e') + circle(-40, -80, 34, '#1a2b1e')
                 + circle(40, -80, 34, '#1a2b1e') + '</g>')
    b.append(circle(640, 560, 30, '#f2a007', opacity=0.28))             # lantern glows
    b.append(circle(640, 560, 9, '#ffd94d'))
    b.append(circle(150, 620, 24, '#f2a007', opacity=0.25))
    b.append(circle(150, 620, 7, '#ffd94d'))
    return svg_doc('0 0 1280 720', ''.join(b), 'Village night (original)')

def bg_monsoon():
    b = [_sky(top='#5d7186', bottom='#93a7ba')]
    b.append(path('M0,80 Q200,30 420,74 Q640,20 880,66 Q1100,26 1280,70 L1280,150 Q1000,110 700,140 Q360,168 0,140 Z',
                  fill='#46586c', opacity=0.9))                        # storm clouds
    b.append(rect(0, 470, 1280, 250, '#5f7a4c'))
    b.append(poly([(520, 470), (760, 470), (1010, 720), (270, 720)], '#6d6a63'))  # wet road
    b.append(_house(210, 480, 1.0, wall='#cbbb96', roof='#7a4630'))
    b.append('<g transform="translate(1080,500) scale(0.95)">'
             + rect(-9, -70, 18, 74, '#5d422a', rx=7)
             + path('M0,-70 q60,-44 96,-30 q-50,26 -92,16 Z', fill='#3e6e3a')
             + circle(-30, -92, 38, '#466f3e') + circle(30, -100, 42, '#3e6e3a')
             + '</g>')                                                 # wind-bent tree
    for i in range(70):                                                # rain streaks
        x = (i * 173) % 1300 - 10
        y = (i * 97) % 640
        b.append(line(x, y, x - 12, y + 34, '#dfeaf2', 2.4, opacity=0.55))
    for x, y, rx in ((360, 650, 90), (760, 690, 120), (1080, 630, 70)):  # puddles
        b.append(ellipse(x, y, rx, 13, '#9fc2d8', opacity=0.75))
        b.append(ellipse(x, y, rx * 0.55, 7, '#c8dde9', opacity=0.8))
    return svg_doc('0 0 1280 720', ''.join(b), 'Rainy monsoon day (original)')

def bg_festival_mela():
    b = [_sky(top='#4a3a6b', bottom='#c96f4a'), _cloud(240, 90, 1.0, 0.5), _cloud(900, 70, 0.85, 0.5)]
    b.append(circle(160, 120, 40, '#f2a65a'))                           # low sun
    b.append(rect(0, 500, 1280, 220, '#6e5540'))                        # fair ground
    # ferris wheel (one translated group: rim + spokes + cabins)
    import math
    wheel = ['<circle cx="0" cy="0" r="150" fill="none" stroke="#e8b64c" stroke-width="8"/>',
             '<circle cx="0" cy="0" r="108" fill="none" stroke="#e8b64c" stroke-width="4" opacity="0.7"/>']
    for k in range(8):
        a = math.radians(k * 45)
        x = round(150 * math.cos(a)); y = round(150 * math.sin(a))
        wheel.append(line(0, 0, x, y, '#e8b64c', 4))
        wheel.append(rect(x - 13, y - 8, 26, 20, ['#d64541', '#2e8b6e', '#31578c', '#e5639a'][k % 4], rx=5))
    b.append('<g transform="translate(1050,300)">' + ''.join(wheel) + '</g>')
    b.append(poly([(1050, 300), (990, 520), (1110, 520)], '#57534c'))
    b.append(circle(1050, 300, 14, '#f2ead8'))
    # bunting strings
    for y0 in (120, 180):
        b.append(path(f'M0,{y0} Q640,{y0 + 90} 1280,{y0}', stroke='#f2ead8', sw=3, opacity=0.8))
        for k in range(11):
            x = 60 + k * 106
            y = y0 + 40 - abs(k - 5) * 3
            b.append(poly([(x, y), (x + 22, y + 3), (x + 11, y + 26)],
                          ['#d64541', '#ffd94d', '#2e8b6e', '#e5639a', '#57a8c9'][k % 5]))
    # stalls + balloons
    for i, col in enumerate(['#d64541', '#2e8b6e', '#e07a2f']):
        x = 60 + i * 260
        b.append(rect(x, 330, 220, 170, '#e5cf9f'))
        b.append(poly([(x - 14, 334), (x + 234, 334), (x + 200, 276), (x + 20, 276)], col))
        b.append(rect(x + 14, 420, 192, 13, '#8a5a33'))
    for k in range(4):
        b.append(ellipse(950 + k * 26, 400 - (k % 2) * 26, 17, 22, ['#e5639a', '#ffd94d', '#57a8c9', '#d64541'][k]))
        b.append(line(950 + k * 26, 422 - (k % 2) * 26, 972, 486, '#f2ead8', 2))
    for i in range(26):                                                # string-light dots
        x = 20 + (i * 97) % 1240
        b.append(circle(x, 236 + (i % 3) * 10, 4, '#ffd94d', opacity=0.9))
    return svg_doc('0 0 1280 720', ''.join(b), 'Festival fair / mela (original)')

def bg_village_morning():
    b = [_sky(top='#a8d4ec', bottom='#f7e8c8'), _sun(150, 150), _cloud(700, 80, 0.9, 0.8)]
    b.append(rect(0, 300, 1280, 60, '#ffffff', opacity=0.28))           # mist band
    b.append(rect(0, 460, 1280, 260, '#86c168'))
    b.append(poly([(520, 460), (760, 460), (1010, 720), (270, 720)], '#d3b57e'))
    b.append(_house(240, 478, 1.0, wall='#f0e2bc', roof='#b0562f'))
    b.append(_house(1050, 476, 0.85, wall='#e2ecd8', roof='#5b729e'))
    b.append(_tree(450, 498, 1.05))
    b.append(_tree(860, 502, 0.9, leaf='#57a639'))
    b.append(path('M120,640 q30,-26 60,0 M1080,660 q30,-26 60,0', stroke='#4c8a3c', sw=5))  # dew grass arcs
    return svg_doc('0 0 1280 720', ''.join(b), 'Village morning (original)')

def bg_village_evening():
    b = [_sky(top='#7a4a7e', bottom='#f2a65a'), _cloud(300, 90, 1.0, 0.55), _cloud(920, 64, 0.8, 0.5)]
    b.append(circle(640, 300, 58, '#f7c873'))                           # setting sun
    b.append(circle(640, 300, 74, '#f7c873', opacity=0.3))
    b.append(rect(0, 460, 1280, 260, '#5f7a44'))
    b.append(poly([(520, 460), (760, 460), (1010, 720), (270, 720)], '#a8845c'))
    b.append(_house(220, 480, 1.0, wall='#d9c39a', roof='#6e3a2a'))
    b.append(_house(1060, 478, 0.85, wall='#c4cdb4', roof='#3d4a63'))
    b.append(_tree(440, 500, 1.05, leaf='#466f3e'))
    b.append(_tree(870, 503, 0.9, leaf='#3e6e3a'))
    b.append(path('M180,300 q14,-12 28,0 q14,-12 28,0 M1020,260 q12,-10 24,0 q12,-10 24,0',
                  stroke='#2b2b30', sw=4))                              # homecoming birds
    b.append(circle(350, 560, 22, '#f2a007', opacity=0.3))
    b.append(circle(350, 560, 7, '#ffd94d'))                            # first lantern
    return svg_doc('0 0 1280 720', ''.join(b), 'Village evening (original)')

def bg_river_noon():
    b = [_sky(), _sun(640, 84), _cloud(240, 110, 0.85), _cloud(1020, 80, 0.9)]
    b.append(rect(0, 390, 1280, 60, '#79b657'))
    for x in (140, 420, 900, 1180):
        b.append(_tree(x, 414, 0.55))
    b.append(rect(0, 448, 1280, 272, '#57a8c9'))
    for yy in (505, 565, 630, 690):
        b.append(path(f'M0,{yy} q80,-12 160,0 t160,0 t160,0 t160,0 t160,0 t160,0 t160,0 t160,0',
                      stroke='#9fd0e6', sw=5, opacity=0.7))
    b.append('<g transform="translate(330,540)">'
             + path('M-110,0 Q0,40 110,0 L88,24 Q0,52 -88,24 Z', fill='#a8542f')
             + rect(-88, -8, 176, 11, '#7a3b1d')
             + circle(0, -26, 13, '#8d5a33')
             + path('M-16,-16 Q0,-34 16,-16 L16,-6 L-16,-6 Z', fill='#d64541')
             + line(30, -4, 66, -58, '#6d4525', 6)
             + '</g>')                                                  # small boat + boatman
    b.append(poly([(1280, 720), (1280, 580), (990, 720)], '#a8c686'))
    return svg_doc('0 0 1280 720', ''.join(b), 'River at noon (original)')

def bg_river_sunset():
    b = [_sky(top='#5d4472', bottom='#f2a65a'), _cloud(280, 100, 1.0, 0.5), _cloud(950, 70, 0.8, 0.45)]
    b.append(circle(640, 372, 52, '#f7c873'))
    b.append(rect(0, 380, 1280, 56, '#3f5231'))                          # far shore silhouette
    for x in (120, 330, 1080, 1220):
        b.append(f'<g transform="translate({x},404) scale(0.6)">'
                 + rect(-9, -70, 18, 74, '#2c241c', rx=7)
                 + circle(0, -104, 52, '#2e4429') + circle(-40, -80, 34, '#2e4429')
                 + circle(40, -80, 34, '#2e4429') + '</g>')
    b.append(rect(0, 434, 1280, 286, '#7a5a7e'))                         # dusk water
    b.append(ellipse(640, 520, 130, 120, '#f2a65a', opacity=0.35))       # sun path on water
    for yy in (486, 548, 616, 682):
        b.append(path(f'M0,{yy} q80,-10 160,0 t160,0 t160,0 t160,0 t160,0 t160,0 t160,0 t160,0',
                      stroke='#c99bb8', sw=5, opacity=0.55))
    b.append('<g transform="translate(880,520)">'
             + path('M-120,0 Q0,44 120,0 L96,26 Q0,58 -96,26 Z', fill='#3a2c30')
             + rect(-96, -8, 192, 12, '#2c2126')
             + circle(10, -28, 12, '#241a14')                            # boatman silhouette
             + path('M-4,-16 Q10,-32 24,-16 L24,-6 L-4,-6 Z', fill='#241a14')
             + circle(-52, -6, 8, '#ffd94d')                             # boat lantern
             + '</g>')
    b.append(poly([(0, 720), (0, 580), (290, 720)], '#54683c'))
    return svg_doc('0 0 1280 720', ''.join(b), 'River at sunset (original)')

BACKGROUNDS = [
    ('village-road', 'Village Road', bg_village_road, 'village road rural street houses'),
    ('paddy-field', 'Paddy Field', bg_paddy_field, 'field rice green nature village'),
    ('riverbank-boat', 'Riverbank & Boat', bg_riverbank, 'river bank boat water nature'),
    ('home-courtyard', 'Home Courtyard', bg_courtyard, 'village home courtyard uthan house'),
    ('tea-stall', 'Tea Stall', bg_tea_stall, 'tea stall shop village street'),
    ('school-yard', 'School Yard', bg_school_yard, 'school yard flag building'),
    ('market-bazaar', 'Market Bazaar', bg_market, 'market bazaar shop stalls'),
    ('home-room', 'Inside Home Room', bg_home_room, 'interior room home indoor'),
    ('pond-side', 'Pond Side', bg_pond_side, 'pond pukur water village palm'),
    ('city-street', 'City Street Corner', bg_city_street, 'city street buildings road urban'),
    # ---- Phase 10A: BG-11 … BG-19 ----
    ('village-bamboo-lane', 'Village Bamboo Lane', bg_village_lane, 'village lane bamboo rural path'),
    ('town-street', 'Town Street & Shops', bg_town_street, 'town street shops urban bazaar road'),
    ('grocery-shop', 'Grocery Shop Interior', bg_grocery_shop, 'grocery shop interior store counter indoor'),
    ('classroom', 'Classroom Interior', bg_classroom, 'classroom school interior blackboard indoor'),
    ('meadow-hills', 'Meadow & Hills', bg_meadow, 'meadow hills nature flowers field green'),
    ('ferry-ghat', 'River Ferry Ghat', bg_ferry_ghat, 'river ferry ghat boat water steps'),
    ('village-night', 'Village Night', bg_village_night, 'night village moon stars dark lantern'),
    ('monsoon-rain', 'Rainy Monsoon Day', bg_monsoon, 'rain monsoon storm wet village seasonal'),
    ('festival-mela', 'Festival Fair (Mela)', bg_festival_mela, 'festival fair mela ferris wheel celebration special'),
]

# Phase 10A: BG-20 / BG-21 — the reference's 2 combo packs. Each is ONE
# manifest entry whose record carries 2 scene files (`variants`); the
# editor's Media drawer offers both variants of the pack.
COMBO_BACKGROUNDS = [
    ('village-combo-pack', 'Village Combo Pack',
     [('Village Morning', bg_village_morning), ('Village Evening', bg_village_evening)],
     'combo pack village morning evening scene set'),
    ('river-combo-pack', 'River Combo Pack',
     [('River at Noon', bg_river_noon), ('River at Sunset', bg_river_sunset)],
     'combo pack river noon sunset scene set'),
]

# --------------------------------------------------------------------- props
# All props: viewBox 0 0 200 200, transparent background.

def prop_rickshaw():
    import math
    b = []
    b.append(f'<circle cx="50" cy="150" r="31" fill="none" stroke="#3c3a38" stroke-width="6"/>')
    b.append(f'<circle cx="152" cy="150" r="31" fill="none" stroke="#3c3a38" stroke-width="6"/>')
    b.append(circle(50, 150, 7, '#3c3a38'))
    b.append(circle(152, 150, 7, '#3c3a38'))
    for a in (0, 60, 120):
        dx = round(26 * math.cos(math.radians(a)))
        dy = round(26 * math.sin(math.radians(a)))
        b.append(line(50, 150, 50 + dx, 150 + dy, '#8a8f98', 3))
        b.append(line(152, 150, 152 + dx, 150 + dy, '#8a8f98', 3))
    b.append(path('M50,150 L96,104 L152,150', stroke='#2e8b6e', sw=8))       # frame
    b.append(line(96, 104, 96, 84, '#2e8b6e', 8))
    b.append(rect(84, 76, 26, 10, '#3c3a38', rx=5))                          # driver saddle
    b.append(rect(118, 62, 58, 44, '#d64541', rx=8))                         # passenger seat
    b.append(rect(112, 96, 70, 12, '#b03a2e', rx=5))
    b.append(path('M106,64 Q146,6 188,58', stroke='#e07a2f', sw=10))         # hood canopy
    b.append(line(186, 58, 186, 106, '#e07a2f', 6))
    b.append(line(96, 104, 118, 128, '#2e8b6e', 6))
    return svg_doc('0 0 200 200', ''.join(b), 'Rickshaw (original)')

def prop_bicycle():
    b = []
    b.append(f'<circle cx="52" cy="146" r="34" fill="none" stroke="#3c3a38" stroke-width="6"/>')
    b.append(f'<circle cx="150" cy="146" r="34" fill="none" stroke="#3c3a38" stroke-width="6"/>')
    b.append(path('M52,146 L92,96 L150,146 L104,146 L84,100', stroke='#31578c', sw=7))
    b.append(line(92, 96, 148, 94, '#31578c', 7))
    b.append(line(148, 94, 150, 146, '#31578c', 7))
    b.append(rect(76, 86, 26, 9, '#3c3a38', rx=4))                           # saddle
    b.append(line(146, 94, 142, 78, '#3c3a38', 6))                            # handlebar stem
    b.append(path('M128,74 q14,-10 30,0', stroke='#3c3a38', sw=6))
    b.append(circle(103, 146, 10, '#8a8f98'))
    return svg_doc('0 0 200 200', ''.join(b), 'Bicycle (original)')

def prop_boat():
    b = []
    b.append(path('M14,104 Q100,150 186,104 L164,140 Q100,168 36,140 Z', fill='#8a5a33'))
    b.append(path('M14,104 Q100,150 186,104', stroke='#6d4525', sw=7))
    b.append(rect(20, 94, 160, 12, '#6d4525', rx=4))
    b.append(rect(52, 78, 96, 10, '#c9a06b', rx=4))                          # seat plank
    b.append(line(140, 60, 108, 132, '#9a6a35', 7))                          # oar
    b.append(poly([(102, 118), (90, 142), (102, 148), (114, 128)], '#b57e4e'))
    b.append(path('M10,168 q16,-10 32,0 t32,0 t32,0 t32,0 t32,0', stroke='#57a8c9', sw=6, opacity=0.8))
    return svg_doc('0 0 200 200', ''.join(b), 'Wooden boat (original)')

def prop_tree():
    b = [rect(91, 116, 18, 66, '#7a4a21', rx=7),
         path('M100,120 q-16,-18 -30,-22 M100,112 q14,-20 28,-26', stroke='#7a4a21', sw=9),
         circle(100, 66, 46, '#3e8e4e'), circle(58, 88, 32, '#3e8e4e'),
         circle(142, 88, 32, '#3e8e4e'), circle(100, 96, 38, '#4da45c'),
         circle(78, 60, 6, '#d64541'), circle(122, 76, 6, '#d64541'), circle(102, 44, 6, '#e8a13c')]
    return svg_doc('0 0 200 200', ''.join(b), 'Mango tree (original)')

def prop_palm():
    b = [path('M100,186 q10,-70 -2,-128', stroke='#8a5a33', sw=13),
         path('M98,60 q-44,-28 -78,-12 M98,60 q-14,-44 12,-64 M98,60 q30,-40 62,-34 M98,60 q46,-12 58,20 M98,60 q-50,-6 -72,22',
              stroke='#3e8e4e', sw=10),
         circle(88, 66, 10, '#6d8f3a'), circle(108, 68, 9, '#6d8f3a'),
         ellipse(100, 190, 56, 8, 'rgba(20,26,38,0.18)')]
    return svg_doc('0 0 200 200', ''.join(b), 'Palm tree (original)')

def prop_banana():
    b = [rect(94, 84, 13, 102, '#7fae4c', rx=6)]
    for dx, ang in ((-52, -30), (-30, -52), (0, -64), (30, -52), (52, -30)):
        b.append(path(f'M100,88 q{dx},{ang} {dx * 1.7},{ang + 34}', stroke='#57a639', sw=13))
    b.append(poly([(86, 96), (100, 128), (114, 96)], '#4c8a3c'))
    b.append(ellipse(100, 118, 9, 20, '#e8c84a'))                            # banana bunch hint
    b.append(ellipse(100, 192, 52, 7, 'rgba(20,26,38,0.18)'))
    return svg_doc('0 0 200 200', ''.join(b), 'Banana tree (original)')

def prop_clay_pot():
    b = [ellipse(100, 108, 52, 56, '#b5642f'),
         path('M62,76 q38,-22 76,0 q-8,16 -38,16 q-30,0 -38,-16 Z', fill='#9a5326'),
         rect(74, 44, 52, 14, '#8a4822', rx=6),
         ellipse(100, 44, 30, 9, '#6d3717'),
         path('M58,104 q42,18 84,0', stroke='#8a4822', sw=6, opacity=0.7),
         path('M60,128 q40,16 80,0', stroke='#8a4822', sw=6, opacity=0.7),
         ellipse(100, 172, 54, 8, 'rgba(20,26,38,0.18)')]
    return svg_doc('0 0 200 200', ''.join(b), 'Clay pot / kolshi (original)')

def prop_lantern():
    b = [path('M100,14 q14,0 14,14', stroke='#3c3a38', sw=6),
         rect(78, 28, 44, 10, '#3c3a38', rx=4),
         poly([(70, 40), (130, 40), (142, 66), (58, 66)], '#57534c'),
         rect(64, 66, 72, 76, '#f7d774', rx=10, opacity=0.9),
         rect(64, 66, 72, 76, 'none', rx=10, stroke='#3c3a38', sw=5),
         ellipse(100, 108, 13, 22, '#f59e0b'),
         ellipse(100, 116, 6, 12, '#fff3c4'),
         poly([(58, 142), (142, 142), (132, 160), (68, 160)], '#57534c'),
         rect(60, 160, 80, 10, '#3c3a38', rx=4),
         line(70, 66, 70, 142, '#3c3a38', 4), line(130, 66, 130, 142, '#3c3a38', 4)]
    return svg_doc('0 0 200 200', ''.join(b), 'Hurricane lantern (original)')

def prop_books():
    b = [rect(38, 128, 124, 26, '#31578c', rx=4),
         rect(46, 104, 110, 24, '#d64541', rx=4),
         rect(56, 80, 92, 24, '#2e8b6e', rx=4),
         rect(48, 134, 14, 14, '#f2ead8'), rect(56, 110, 14, 12, '#f2ead8'),
         rect(64, 86, 14, 12, '#f2ead8'),
         path('M96,44 l7,16 l17,2 l-12,11 l4,17 l-16,-9 l-15,9 l4,-17 l-12,-11 l17,-2 Z', fill='#e8b64c')]
    return svg_doc('0 0 200 200', ''.join(b), 'Stack of books (original)')

def prop_school_bag():
    b = [path('M74,52 q26,-30 52,0', stroke='#8a3a56', sw=9),
         rect(52, 54, 96, 112, '#c94f74', rx=18),
         rect(52, 104, 96, 62, '#b03a5b', rx=16),
         rect(76, 118, 48, 34, '#f2a007', rx=8),
         circle(100, 135, 5, '#7a4a21'),
         rect(64, 66, 10, 44, '#8a3a56', rx=5), rect(126, 66, 10, 44, '#8a3a56', rx=5)]
    return svg_doc('0 0 200 200', ''.join(b), 'School bag (original)')

def prop_tea_set():
    b = [ellipse(100, 158, 78, 14, '#c8ccd4'),                              # tray
         ellipse(100, 154, 78, 14, '#e3e7ee'),
         path('M52,108 q-16,26 8,44 l56,0 q10,-30 -6,-44 Z', fill='#8f9bb0'),  # kettle body
         path('M52,112 q-22,-4 -16,-24', stroke='#6d7686', sw=8),           # spout
         path('M112,106 q24,-10 14,-30', stroke='#6d7686', sw=7),           # handle
         ellipse(88, 102, 20, 8, '#6d7686'),
         circle(88, 96, 6, '#3c3a38'),
         rect(128, 128, 30, 22, '#f2ead8', rx=5, stroke='#b9ac8d', sw=3),   # cup 1
         rect(86, 136, 26, 18, '#f2ead8', rx=5, stroke='#b9ac8d', sw=3),    # cup 2
         path('M132,124 q14,-16 26,-4', stroke='#d97b6c', sw=4, opacity=0.8)]  # steam
    return svg_doc('0 0 200 200', ''.join(b), 'Tea set (original)')

def prop_umbrella():
    b = [path('M18,92 Q100,6 182,92 Q156,74 132,92 Q106,74 82,92 Q54,74 18,92 Z', fill='#d64541'),
         path('M100,14 L82,92 M100,14 L132,92 M100,14 L100,92', stroke='#b03a2e', sw=3, opacity=0.6),
         circle(100, 12, 5, '#7a4a21'),
         line(100, 90, 100, 156, '#3c3a38', 7),
         path('M100,156 q0,20 -18,16', stroke='#3c3a38', sw=7)]
    return svg_doc('0 0 200 200', ''.join(b), 'Umbrella (original)')

def prop_fishing_net():
    b = [line(28, 22, 168, 66, '#9a6a35', 6)]                                # pole rope
    pts_top = [(36, 34), (64, 44), (94, 54), (124, 62), (154, 72)]
    for (x, y) in pts_top:
        b.append(line(x, y, x - 12, 168, '#7d8a99', 3, opacity=0.85))
    for i in range(6):
        yy = 62 + i * 18
        b.append(path(f'M{30 + i * 2},{yy} q60,{14} 128,26', stroke='#7d8a99', sw=3, opacity=0.8))
    for (x, y) in pts_top:
        b.append(f'<circle cx="{x}" cy="{y}" r="6" fill="#e8e4da" stroke="#9a6a35" stroke-width="2"/>')
    for x in (30, 70, 112, 152):
        b.append(circle(x, 172, 6, '#57534c'))
    return svg_doc('0 0 200 200', ''.join(b), 'Fishing net (original)')

def prop_plough():
    b = [path('M30,44 L148,128', stroke='#8a5a33', sw=10),                   # beam
         path('M148,128 q22,10 14,34 q-3,12 -18,10', stroke='#6d4525', sw=9),  # handle curve
         poly([(128, 122), (168, 138), (146, 168), (118, 140)], '#9aa0ab'),   # share blade
         line(66, 76, 96, 118, '#8a5a33', 8),
         circle(100, 124, 7, '#57534c'),
         rect(16, 30, 34, 12, '#6d4525', rx=5)]                             # yoke end
    return svg_doc('0 0 200 200', ''.join(b), 'Wooden plough (original)')

def prop_tubewell():
    b = [rect(88, 176, 46, 12, '#57534c', rx=3),                             # base
         rect(98, 84, 22, 96, '#2e8b6e'),                                    # body
         rect(92, 66, 34, 22, '#26735c', rx=5),                              # head
         path('M98,74 q-30,4 -34,26', stroke='#26735c', sw=9),               # spout
         circle(62, 104, 7, '#57a8c9'),
         path('M126,72 L172,40', stroke='#3c3a38', sw=8),                     # handle
         circle(172, 40, 8, '#d64541'),
         rect(104, 44, 10, 24, '#26735c'),
         ellipse(110, 192, 60, 7, 'rgba(20,26,38,0.18)')]
    return svg_doc('0 0 200 200', ''.join(b), 'Tube well (original)')

def prop_fence():
    b = []
    for x in (24, 76, 128, 172):
        b.append(poly([(x, 52), (x + 11, 38), (x + 22, 52), (x + 22, 168), (x, 168)], '#9a6a35'))
    b.append(rect(8, 76, 184, 13, '#b57e4e'))
    b.append(rect(8, 122, 184, 13, '#b57e4e'))
    b.append(ellipse(100, 182, 84, 8, 'rgba(20,26,38,0.15)'))
    return svg_doc('0 0 200 200', ''.join(b), 'Bamboo fence segment (original)')

def prop_haystack():
    b = [path('M100,22 Q168,84 176,168 L24,168 Q32,84 100,22 Z', fill='#e0aa4e'),
         path('M52,96 Q100,74 148,96 M42,128 Q100,106 158,128 M36,152 Q100,132 164,152',
              stroke='#c78f35', sw=6, opacity=0.8),
         path('M100,22 q-4,60 2,140', stroke='#c78f35', sw=5, opacity=0.6),
         rect(16, 166, 168, 10, '#a8762c', rx=4),
         ellipse(100, 186, 84, 8, 'rgba(20,26,38,0.16)')]
    return svg_doc('0 0 200 200', ''.join(b), 'Hay stack (original)')

def prop_radio():
    b = [line(52, 62, 168, 12, '#8a8f98', 5), circle(170, 11, 5, '#8a8f98'),  # antenna
         rect(30, 62, 140, 96, '#b0562f', rx=12),
         rect(42, 76, 62, 52, '#3c3a38', rx=6),
         line(48, 86, 98, 86, '#8a8f98', 4), line(48, 98, 98, 98, '#8a8f98', 4),
         line(48, 110, 98, 110, '#8a8f98', 4),
         circle(132, 92, 14, '#e8b64c'), circle(132, 128, 11, '#f2ead8'),
         rect(42, 138, 116, 10, '#8a4822', rx=4)]
    return svg_doc('0 0 200 200', ''.join(b), 'Radio (original)')

def prop_kite():
    b = [poly([(100, 18), (150, 84), (100, 168), (50, 84)], '#e5639a'),
         poly([(100, 18), (150, 84), (100, 84)], '#d64541'),
         poly([(100, 18), (50, 84), (100, 84)], '#f2a007'),
         line(100, 18, 100, 168, '#b03a56', 3), line(50, 84, 150, 84, '#b03a56', 3),
         path('M100,168 q-16,16 4,24 q18,8 8,24', stroke='#31578c', sw=4),
         poly([(96, 182), (108, 190), (96, 196)], '#2e8b6e'),
         poly([(104, 200), (116, 206), (104, 214)], '#f2a007')]
    return svg_doc('0 0 200 200', ''.join(b), 'Kite (original)')

def prop_dhol():
    b = [path('M52,52 L148,52 L136,148 L64,148 Z', fill='#a8542f'),
         ellipse(100, 52, 48, 13, '#f2ead8'), ellipse(100, 52, 48, 13, 'none'),
         ellipse(100, 148, 36, 10, '#e6dcc4'),
         path('M56,58 L96,142 M78,54 L108,144 M100,52 L100,146 M122,54 L92,144 M144,58 L104,142',
              stroke='#5d3a1a', sw=4),
         circle(100, 52, 12, '#c9b892'), circle(100, 148, 8, '#c9b892'),
         path('M52,52 q-16,48 12,96 M148,52 q16,48 -12,96', stroke='#8a4822', sw=5)]
    return svg_doc('0 0 200 200', ''.join(b), 'Dhol drum (original)')

# ---- Phase 10A props: AS-01/02/04/06/07/09/13/14/15/16 + AS-31…AS-49 ----

def prop_fire():
    b = [line(48, 168, 152, 150, '#7a4a21', 13), line(52, 148, 148, 170, '#8a5a33', 13),
         ellipse(100, 182, 62, 8, 'rgba(20,26,38,0.18)'),
         path('M100,26 Q138,84 128,128 Q122,164 100,168 Q76,164 70,126 Q64,84 100,26 Z', fill='#e2571e'),
         path('M100,64 Q122,100 116,130 Q112,152 100,154 Q86,152 82,128 Q78,98 100,64 Z', fill='#f2a007'),
         path('M100,102 Q110,122 106,140 Q102,150 98,140 Q92,120 100,102 Z', fill='#ffe9a8'),
         circle(64, 84, 4, '#f2a007'), circle(140, 66, 4, '#e2571e'), circle(128, 110, 3.4, '#ffd94d')]
    return svg_doc('0 0 200 200', ''.join(b), 'Fire flame (original)')

def prop_walk_cycle():
    b = []
    phases = [(-26, 22), (-10, 30), (14, 26), (28, -6)]  # (front-leg dx, back-leg dx)
    for i, (fdx, bdx) in enumerate(phases):
        cx = 26 + i * 50
        b.append(circle(cx, 52, 13, '#c68850'))
        b.append(path(f'M{cx - 12},42 Q{cx},28 {cx + 12},42 Q{cx},36 {cx},42 Z', fill='#2b2320'))
        b.append(line(cx, 66, cx, 108, '#31578c', 11))                       # torso
        b.append(line(cx, 76, cx + 14, 98, '#31578c', 8))                    # arm swing
        b.append(line(cx, 76, cx - 12, 96, '#31578c', 8))
        b.append(line(cx, 108, cx + fdx, 148, '#44445a', 10))                # legs in stride
        b.append(line(cx, 108, cx + bdx, 148, '#44445a', 10))
        b.append(ellipse(cx + fdx, 152, 10, 5, '#4a3230'))
        b.append(ellipse(cx + bdx, 152, 10, 5, '#4a3230'))
    b.append(line(8, 178, 192, 178, '#b9ac8d', 4))
    for x in (30, 80, 130, 180):
        b.append(circle(x, 178, 3.4, '#8a7a52'))
    return svg_doc('0 0 200 200', ''.join(b), 'Walking cycle strip (original)')

def prop_pinwheel():
    b = [line(100, 96, 100, 186, '#8a5a33', 7)]
    cols = ['#d64541', '#f2a007', '#2e8b6e', '#31578c']
    for k in range(4):
        a = k * 90
        import math
        rad = math.radians(a)
        tipx = round(100 + 52 * math.cos(rad)); tipy = round(88 + 52 * math.sin(rad))
        px = round(100 + 20 * math.cos(rad + 0.9)); py = round(88 + 20 * math.sin(rad + 0.9))
        b.append(poly([(100, 88), (tipx, tipy), (px, py)], cols[k]))
    b.append('<circle cx="100" cy="88" r="9" fill="#f2ead8" stroke="#57534c" stroke-width="3"/>')
    return svg_doc('0 0 200 200', ''.join(b), 'Pinwheel (original)')

def prop_table():
    b = [rect(22, 74, 156, 16, '#a06a3b', rx=5),
         rect(14, 62, 172, 14, '#c0392b', rx=6),                            # table cloth top
         path('M14,76 L186,76 L172,116 L28,116 Z', fill='#d64541', opacity=0.88),
         rect(36, 116, 12, 62, '#8a5a33'), rect(152, 116, 12, 62, '#8a5a33'),
         ellipse(72, 54, 20, 8, '#f2ead8'), ellipse(72, 50, 15, 6, '#e8a13c'),  # plate of food
         rect(120, 38, 12, 24, '#57a8c9', rx=3),                            # glass bottle
         ellipse(100, 184, 78, 8, 'rgba(20,26,38,0.16)')]
    return svg_doc('0 0 200 200', ''.join(b), 'Wooden table (original)')

def prop_chair():
    b = [rect(58, 26, 12, 84, '#8a5a33'), rect(130, 26, 12, 84, '#8a5a33'),
         rect(52, 22, 96, 14, '#a06a3b', rx=6),
         rect(58, 56, 84, 11, '#a06a3b', rx=5),
         rect(44, 104, 112, 15, '#a06a3b', rx=5),                           # seat
         rect(52, 119, 12, 60, '#8a5a33'), rect(136, 119, 12, 60, '#8a5a33'),
         rect(58, 146, 84, 9, '#8a5a33'),
         ellipse(100, 186, 66, 7, 'rgba(20,26,38,0.16)')]
    return svg_doc('0 0 200 200', ''.join(b), 'Wooden chair (original)')

def prop_basket():
    b = [path('M100,30 q44,6 40,40', stroke='#9a6a35', sw=8),               # handle
         path('M52,74 L148,74 L136,168 Q100,180 64,168 Z', fill='#c99a5b'),
         line(52, 98, 144, 98, '#a8762c', 6), line(56, 124, 141, 124, '#a8762c', 6),
         line(60, 148, 138, 148, '#a8762c', 6),
         line(80, 74, 76, 170, '#a8762c', 5), line(108, 74, 110, 172, '#a8762c', 5),
         ellipse(100, 74, 48, 10, '#a8762c'),
         circle(78, 62, 13, '#d64541'), circle(104, 56, 13, '#e8a13c'), circle(126, 64, 12, '#57a639'),
         ellipse(100, 184, 56, 7, 'rgba(20,26,38,0.16)')]
    return svg_doc('0 0 200 200', ''.join(b), 'Woven basket (original)')

def prop_sun():
    import math
    b = []
    for k in range(8):
        a = math.radians(k * 45)
        x1 = round(100 + 52 * math.cos(a)); y1 = round(100 + 52 * math.sin(a))
        x2 = round(100 + 76 * math.cos(a)); y2 = round(100 + 76 * math.sin(a))
        b.append(line(x1, y1, x2, y2, '#f2a007', 9))
    b.append(circle(100, 100, 46, '#ffd94d'))
    b.append(circle(100, 100, 46, 'none'))
    b.append(circle(86, 94, 5, '#c78f35')); b.append(circle(114, 94, 5, '#c78f35'))
    b.append(path('M84,112 q16,12 32,0', stroke='#c78f35', sw=5))
    return svg_doc('0 0 200 200', ''.join(b), 'Sun (original)')

def prop_cloud():
    b = [ellipse(100, 122, 66, 30, '#aebfd0', opacity=0.55),
         ellipse(72, 104, 44, 30, '#eef4f9'), ellipse(116, 92, 52, 36, '#ffffff'),
         ellipse(140, 110, 40, 26, '#eef4f9'), ellipse(94, 116, 54, 26, '#ffffff'),
         path('M52,146 q48,12 96,0', stroke='#c8d6e2', sw=5, opacity=0.8)]
    return svg_doc('0 0 200 200', ''.join(b), 'Cloud (original)')

def prop_flower_plant():
    b = [poly([(66, 128), (134, 128), (126, 178), (74, 178)], '#b0562f'),
         rect(60, 118, 80, 13, '#8a4822', rx=4),
         path('M100,120 q-4,-34 -22,-52 M100,120 q2,-40 6,-58 M100,120 q14,-30 30,-44', stroke='#3e8e4e', sw=6),
         ellipse(76, 66, 13, 8, '#57a639'), ellipse(136, 74, 13, 8, '#57a639')]
    for cx, cy, col in ((74, 58, '#e5639a'), (106, 48, '#d64541'), (140, 66, '#f2a007')):
        for k in range(5):
            import math
            a = math.radians(k * 72)
            b.append(circle(round(cx + 11 * math.cos(a)), round(cy + 11 * math.sin(a)), 7, col))
        b.append(circle(cx, cy, 6, '#ffd94d'))
    return svg_doc('0 0 200 200', ''.join(b), 'Flower plant in pot (original)')

def prop_hut():
    b = [rect(48, 104, 104, 70, '#d8bd8a'),
         poly([(34, 106), (100, 44), (166, 106)], '#a8762c'),
         poly([(44, 104), (100, 56), (156, 104)], '#c99a5b'),
         rect(84, 126, 32, 48, '#6d4525'),
         rect(56, 116, 20, 20, '#9fd4ea', stroke='#8a5a33', sw=3),
         line(48, 140, 152, 140, '#b89a64', 4),
         ellipse(100, 182, 66, 8, 'rgba(20,26,38,0.16)')]
    return svg_doc('0 0 200 200', ''.join(b), 'Village hut (original)')

def prop_cow():
    b = [path('M168,96 q16,26 6,52', stroke='#e8e2d4', sw=7),               # tail
         circle(172, 152, 6, '#57534c'),
         rect(52, 84, 118, 62, '#f2ede2', rx=24),                           # body
         ellipse(96, 106, 24, 16, '#b9ac8d'), ellipse(140, 128, 18, 12, '#b9ac8d'),  # patches
         rect(60, 138, 13, 44, '#e8e2d4'), rect(84, 138, 13, 44, '#e8e2d4'),
         rect(138, 138, 13, 44, '#e8e2d4'), rect(158, 138, 13, 40, '#e8e2d4'),
         path('M44,84 q-16,-8 -22,4 M52,80 q2,-16 -8,-22', stroke='#d8cfb8', sw=7),  # horns
         ellipse(38, 96, 15, 10, '#e8b4b8'),                                # ear
         circle(44, 92, 27, '#f2ede2'),                                     # head
         ellipse(30, 108, 20, 13, '#e8a0a8'),                               # muzzle
         circle(23, 106, 3.4, '#7a3b4f'), circle(37, 106, 3.4, '#7a3b4f'),
         circle(48, 86, 4.4, '#26221f'),
         rect(58, 140, 100, 8, '#d64541', rx=4),                            # neck rope hint
         ellipse(105, 190, 76, 7, 'rgba(20,26,38,0.16)')]
    return svg_doc('0 0 200 200', ''.join(b), 'Cow (original)')

def prop_goat():
    b = [path('M160,92 q14,20 8,40', stroke='#d8d2c4', sw=6),
         rect(58, 86, 104, 52, '#e8e2d4', rx=22),
         rect(66, 130, 11, 42, '#d8d2c4'), rect(88, 130, 11, 42, '#d8d2c4'),
         rect(132, 130, 11, 42, '#d8d2c4'), rect(150, 130, 11, 40, '#d8d2c4'),
         path('M52,74 q-12,-20 2,-30 M64,72 q-2,-22 10,-28', stroke='#b9ac8d', sw=6),  # horns
         circle(46, 88, 23, '#e8e2d4'),
         ellipse(32, 98, 15, 10, '#d8b4a0'),
         poly([(38, 106), (48, 106), (43, 122)], '#c9c2b2'),               # beard
         circle(48, 82, 4, '#26221f'),
         ellipse(104, 182, 66, 7, 'rgba(20,26,38,0.16)')]
    return svg_doc('0 0 200 200', ''.join(b), 'Goat (original)')

def prop_hen():
    b = [path('M138,74 q26,-20 34,4 q-16,4 -22,14 q14,-2 18,10 q-16,6 -28,-2 Z', fill='#b0562f'),  # tail feathers
         ellipse(96, 112, 56, 40, '#f2ede2'),
         path('M60,96 q30,26 66,10 q-30,20 -66,-10 Z', fill='#d8cfb8'),     # wing
         circle(48, 78, 21, '#f2ede2'),
         poly([(38, 58), (44, 44), (50, 58), (56, 44), (60, 60)], '#d64541'),  # comb
         poly([(28, 80), (14, 86), (29, 92)], '#f2a007'),                   # beak
         circle(46, 76, 4, '#26221f'),
         line(84, 150, 84, 172, '#e07a2f', 5), line(108, 150, 108, 172, '#e07a2f', 5),
         line(74, 172, 94, 172, '#e07a2f', 5), line(98, 172, 118, 172, '#e07a2f', 5),
         ellipse(100, 184, 60, 7, 'rgba(20,26,38,0.15)')]
    return svg_doc('0 0 200 200', ''.join(b), 'Hen (original)')

def prop_duck():
    b = [path('M146,96 q22,-14 30,2 q-18,10 -30,6 Z', fill='#e8e2d4'),      # tail
         ellipse(98, 116, 58, 36, '#f7f4ec'),
         path('M62,104 q30,22 62,8 q-28,18 -62,-8 Z', fill='#e0d9c8'),
         circle(52, 80, 22, '#f7f4ec'),
         poly([(30, 76), (8, 84), (30, 94)], '#f2a007'),                    # bill
         poly([(30, 88), (14, 92), (30, 98)], '#e07a2f'),
         circle(54, 76, 4.4, '#26221f'),
         line(88, 150, 88, 166, '#e07a2f', 5), line(112, 150, 112, 166, '#e07a2f', 5),
         ellipse(100, 178, 66, 9, '#9fc2d8', opacity=0.8)]
    return svg_doc('0 0 200 200', ''.join(b), 'Duck (original)')

def prop_cat():
    b = [path('M148,158 q38,4 30,-30 q-4,-16 -18,-18 q10,26 -16,32 Z', fill='#8a8f98'),  # curled tail
         ellipse(96, 138, 52, 44, '#9aa0ab'),
         path('M60,116 q36,20 72,4 q-34,16 -72,-4 Z', fill='#7d838e'),
         circle(92, 82, 32, '#9aa0ab'),
         poly([(68, 62), (72, 34), (90, 54)], '#9aa0ab'),                   # ears
         poly([(106, 54), (124, 34), (128, 62)], '#9aa0ab'),
         poly([(73, 56), (75, 42), (86, 54)], '#e8a0a8'),
         poly([(111, 54), (122, 42), (123, 56)], '#e8a0a8'),
         circle(80, 80, 5, '#26221f'), circle(104, 80, 5, '#26221f'),
         poly([(86, 92), (98, 92), (92, 99)], '#c46a7a'),
         line(56, 92, 30, 88, '#d8d8d8', 3), line(56, 100, 32, 102, '#d8d8d8', 3),
         line(128, 92, 154, 88, '#d8d8d8', 3), line(128, 100, 152, 102, '#d8d8d8', 3),
         ellipse(96, 186, 62, 7, 'rgba(20,26,38,0.16)')]
    return svg_doc('0 0 200 200', ''.join(b), 'Cat (original)')

def prop_blackboard():
    b = [rect(30, 30, 140, 100, '#2c4a3e', stroke='#8a5a33', sw=9, rx=4),
         path('M48,62 q30,-8 60,0 M48,90 q44,-10 88,-2', stroke='#e8e4da', sw=4, opacity=0.65),
         rect(44, 118, 40, 8, '#f2ead8', rx=3),
         line(52, 130, 36, 178, '#8a5a33', 8), line(148, 130, 164, 178, '#8a5a33', 8),
         line(44, 156, 156, 156, '#8a5a33', 6),
         ellipse(100, 186, 70, 7, 'rgba(20,26,38,0.16)')]
    return svg_doc('0 0 200 200', ''.join(b), 'School blackboard (original)')

def prop_almirah():
    b = [rect(48, 18, 104, 14, '#6d4525', rx=4),
         rect(44, 32, 112, 148, '#8a5a33'),
         rect(52, 42, 44, 128, '#a06a3b'), rect(104, 42, 44, 128, '#a06a3b'),
         rect(60, 54, 28, 44, '#b57e4e'), rect(112, 54, 28, 44, '#b57e4e'),
         circle(92, 112, 5, '#e8b64c'), circle(108, 112, 5, '#e8b64c'),
         rect(44, 174, 112, 8, '#6d4525'),
         ellipse(100, 190, 62, 6, 'rgba(20,26,38,0.16)')]
    return svg_doc('0 0 200 200', ''.join(b), 'Wooden almirah (original)')

def prop_wooden_bed():
    b = [rect(18, 108, 164, 18, '#8a5a33', rx=5),                           # frame
         rect(18, 88, 164, 22, '#e5639a', rx=8),                             # mattress / cover
         rect(26, 66, 52, 28, '#f2ead8', rx=10),                             # pillow
         path('M96,92 q30,10 60,2', stroke='#c94f83', sw=5, opacity=0.7),
         rect(26, 126, 12, 44, '#6d4525'), rect(162, 126, 12, 44, '#6d4525'),
         rect(18, 62, 10, 46, '#6d4525'), rect(172, 62, 10, 46, '#6d4525'),
         ellipse(100, 180, 84, 8, 'rgba(20,26,38,0.16)')]
    return svg_doc('0 0 200 200', ''.join(b), 'Wooden bed / chowki (original)')

def prop_clay_oven():
    b = [path('M44,176 Q36,84 100,78 Q164,84 156,176 Z', fill='#b5642f'),
         path('M44,176 Q36,84 100,78 Q164,84 156,176', stroke='#9a5326', sw=5),
         ellipse(100, 138, 30, 24, '#4a2c18'),                               # mouth
         ellipse(100, 142, 20, 15, '#e2571e'),
         path('M92,150 q8,-14 16,0 q-8,8 -16,0 Z', fill='#ffd94d'),
         rect(84, 52, 32, 26, '#9a5326', rx=6),                               # neck pot rest
         ellipse(100, 52, 20, 7, '#6d3717'),
         path('M60,104 q40,12 80,0', stroke='#9a5326', sw=5, opacity=0.7),
         ellipse(100, 184, 64, 8, 'rgba(20,26,38,0.16)')]
    return svg_doc('0 0 200 200', ''.join(b), 'Clay oven / chula (original)')

def prop_hand_fan():
    b = [path('M100,22 Q158,30 162,84 Q164,138 100,146 Q36,138 38,84 Q42,30 100,22 Z', fill='#e8c84a'),
         path('M100,30 L100,140 M62,40 Q70,84 66,132 M138,40 Q130,84 134,132 M44,80 Q100,94 156,80',
              stroke='#c78f35', sw=4, opacity=0.75),
         rect(92, 144, 16, 44, '#8a5a33', rx=6),
         circle(100, 146, 5, '#6d4525')]
    return svg_doc('0 0 200 200', ''.join(b), 'Hand fan / pakha (original)')

def prop_broom():
    b = []
    for k in range(9):
        x = 62 + k * 9.5
        b.append(line(100, 84, round(x), 178, '#d9b45c', 5))
    b.append(rect(88, 30, 24, 62, '#b57e4e', rx=8))                          # handle top
    b.append(rect(82, 78, 36, 16, '#b03a2e', rx=5))                          # binding
    b.append(path('M70,178 q30,10 60,0', stroke='#c78f35', sw=4))
    return svg_doc('0 0 200 200', ''.join(b), 'Broom / jharu (original)')

def prop_bucket():
    b = [path('M100,26 q52,4 60,44', stroke='#8a8f98', sw=6),               # handle
         poly([(58, 66), (142, 66), (132, 168), (68, 168)], '#9fb2c8'),
         poly([(58, 66), (142, 66), (138, 96), (62, 96)], '#b8cadd'),
         ellipse(100, 66, 42, 9, '#57a8c9'),                                 # water
         line(64, 116, 136, 116, '#8aa2ba', 5), line(67, 142, 133, 142, '#8aa2ba', 5),
         ellipse(100, 178, 52, 7, 'rgba(20,26,38,0.16)')]
    return svg_doc('0 0 200 200', ''.join(b), 'Bucket / balti (original)')

def prop_spade():
    b = [line(74, 26, 118, 106, '#8a5a33', 11),                              # shaft
         rect(58, 14, 32, 16, '#6d4525', rx=7),                               # D-handle
         path('M104,100 Q146,108 142,148 Q138,180 112,182 Q92,168 96,132 Q98,110 104,100 Z', fill='#9aa0ab'),
         path('M104,100 Q146,108 142,148', stroke='#7d838e', sw=5),
         ellipse(112, 188, 40, 6, 'rgba(20,26,38,0.15)')]
    return svg_doc('0 0 200 200', ''.join(b), 'Spade / kodal (original)')

def prop_garland():
    import math
    b = [path('M28,36 Q100,168 172,36', stroke='#3e8e4e', sw=5)]
    for k in range(9):
        t = k / 8
        x = round((1 - t) * (1 - t) * 28 + 2 * (1 - t) * t * 100 + t * t * 172)
        y = round((1 - t) * (1 - t) * 36 + 2 * (1 - t) * t * 168 + t * t * 36)
        col = ['#e8a13c', '#d64541', '#e5639a'][k % 3]
        for j in range(5):
            a = math.radians(j * 72)
            b.append(circle(round(x + 9 * math.cos(a)), round(y + 9 * math.sin(a)), 6.5, col))
        b.append(circle(x, y, 5, '#ffd94d'))
    return svg_doc('0 0 200 200', ''.join(b), 'Flower garland / mala (original)')

def prop_balloons():
    b = []
    cols = ['#d64541', '#f2a007', '#2e8b6e']
    for i, (cx, cy) in enumerate(((66, 62), (106, 44), (140, 70))):
        b.append(ellipse(cx, cy, 24, 31, cols[i]))
        b.append(ellipse(cx - 8, cy - 12, 7, 10, '#ffffff', opacity=0.5))
        b.append(poly([(cx - 5, cy + 30), (cx + 5, cy + 30), (cx, cy + 38)], cols[i]))
        b.append(path(f'M{cx},{cy + 38} q{96 - cx:+.0f},44 {100 - cx},84', stroke='#8a8f98', sw=2.6))
    b.append(circle(100, 168, 6, '#b03a2e'))
    return svg_doc('0 0 200 200', ''.join(b), 'Balloon bunch (original)')

def prop_football():
    b = ['<circle cx="100" cy="100" r="66" fill="#f7f4ec" stroke="#c9c2b2" stroke-width="4"/>',
         poly([(100, 76), (122, 92), (114, 116), (86, 116), (78, 92)], '#2b2b30'),
         poly([(100, 34), (114, 52), (86, 52)], '#2b2b30'),
         poly([(40, 74), (60, 82), (54, 102), (34, 94)], '#2b2b30'),
         poly([(160, 74), (166, 94), (146, 102), (140, 82)], '#2b2b30'),
         poly([(62, 148), (84, 140), (92, 158), (70, 166)], '#2b2b30'),
         poly([(138, 148), (130, 166), (108, 158), (116, 140)], '#2b2b30'),
         ellipse(100, 178, 52, 8, 'rgba(20,26,38,0.18)')]
    return svg_doc('0 0 200 200', ''.join(b), 'Football (original)')

def prop_cricket_set():
    b = [path('M58,30 L84,22 L128,138 Q132,156 116,160 L92,164 Q78,162 74,146 Z', fill='#e8c98f'),  # bat
         path('M58,30 L84,22 L92,52 L66,60 Z', fill='#c9a227'),               # handle wrap
         line(66, 46, 88, 38, '#8a6d1f', 4), line(69, 55, 91, 47, '#8a6d1f', 4),
         circle(152, 150, 21, '#c22f2f'),
         path('M136,138 q16,10 32,2 M136,156 q16,8 30,-2', stroke='#f2d38a', sw=3.4),
         ellipse(120, 182, 60, 7, 'rgba(20,26,38,0.15)')]
    return svg_doc('0 0 200 200', ''.join(b), 'Cricket bat and ball (original)')

def prop_wall_clock():
    b = [circle(100, 100, 72, '#8a5a33'),
         circle(100, 100, 62, '#f7f2e2'),
         circle(100, 100, 62, 'none')]
    for k in range(12):
        import math
        a = math.radians(k * 30)
        x = round(100 + 52 * math.cos(a)); y = round(100 + 52 * math.sin(a))
        b.append(circle(x, y, 3.4 if k % 3 else 5, '#57534c'))
    b.append(line(100, 100, 100, 62, '#2b2b30', 7))
    b.append(line(100, 100, 132, 112, '#2b2b30', 5))
    b.append(line(100, 100, 74, 128, '#d64541', 3))
    b.append(circle(100, 100, 7, '#b03a2e'))
    return svg_doc('0 0 200 200', ''.join(b), 'Wall clock (original)')

def prop_fishing_rod():
    b = [path('M22,176 Q90,60 182,22', stroke='#7a4a21', sw=6),             # rod
         '<circle cx="66" cy="118" r="13" fill="none" stroke="#57534c" stroke-width="5"/>',  # reel
         circle(66, 118, 4, '#57534c'),
         path('M182,22 q10,44 -6,84', stroke='#c8ccd4', sw=2.4),             # line
         path('M176,106 q8,6 2,14 q-8,-2 -8,-10 Z', fill='#e8b64c'),        # hook / lure
         circle(178, 100, 3.4, '#d64541'),
         ellipse(70, 186, 52, 7, 'rgba(20,26,38,0.15)')]
    return svg_doc('0 0 200 200', ''.join(b), 'Fishing rod (original)')

PROPS = [
    ('rickshaw', 'Rickshaw', prop_rickshaw, 'vehicle rickshaw transport village'),
    ('bicycle', 'Bicycle', prop_bicycle, 'bicycle vehicle transport'),
    ('boat', 'Boat', prop_boat, 'boat river water nouka'),
    ('tree', 'Mango Tree', prop_tree, 'tree nature mango green'),
    ('palm-tree', 'Palm Tree', prop_palm, 'palm tree nature tropical'),
    ('banana-tree', 'Banana Tree', prop_banana, 'banana tree nature plant'),
    ('clay-pot', 'Clay Pot (Kolshi)', prop_clay_pot, 'clay pot kolshi water vessel'),
    ('lantern', 'Lantern', prop_lantern, 'lantern light hurricane lamp night'),
    ('book-stack', 'Book Stack', prop_books, 'books study school reading'),
    ('school-bag', 'School Bag', prop_school_bag, 'school bag backpack kid'),
    ('tea-set', 'Tea Cup Set', prop_tea_set, 'tea cup kettle stall drink'),
    ('umbrella', 'Umbrella', prop_umbrella, 'umbrella rain monsoon'),
    ('fishing-net', 'Fishing Net', prop_fishing_net, 'fishing net river fisherman'),
    ('plough', 'Plough', prop_plough, 'plough farming field agriculture'),
    ('tube-well', 'Tube Well', prop_tubewell, 'tube well water pump village'),
    ('fence', 'Fence', prop_fence, 'fence bamboo boundary garden'),
    ('hay-stack', 'Hay Stack', prop_haystack, 'hay stack farm straw'),
    ('radio', 'Radio', prop_radio, 'radio music news vintage'),
    ('kite', 'Kite', prop_kite, 'kite fly sky festival'),
    ('dhol', 'Dhol (Drum)', prop_dhol, 'dhol drum music festival'),
    # ---- Phase 10A: AS-01/02/04/06/07/09/13/14/15/16 + AS-31…AS-49 ----
    ('fire-flame', 'Fire Flame', prop_fire, 'fire flame campfire animated style burn'),
    ('walk-cycle', 'Walking Cycle', prop_walk_cycle, 'walking cycle animation frames stride'),
    ('pinwheel', 'Pinwheel', prop_pinwheel, 'pinwheel toy wind spin colour'),
    ('table', 'Wooden Table', prop_table, 'table furniture wood dining'),
    ('chair', 'Wooden Chair', prop_chair, 'chair furniture wood seat'),
    ('basket', 'Woven Basket', prop_basket, 'basket woven fruit carry harvest'),
    ('sun', 'Sun', prop_sun, 'sun sky day weather rays'),
    ('cloud', 'Cloud', prop_cloud, 'cloud sky weather drift'),
    ('flower-plant', 'Flower Plant', prop_flower_plant, 'flower plant pot garden tob'),
    ('village-hut', 'Village Hut', prop_hut, 'village hut house home element'),
    ('cow', 'Cow', prop_cow, 'cow animal farm goru'),
    ('goat', 'Goat', prop_goat, 'goat animal farm chagol'),
    ('hen', 'Hen', prop_hen, 'hen chicken animal farm murgi'),
    ('duck', 'Duck', prop_duck, 'duck bird animal pond hash'),
    ('cat', 'Cat', prop_cat, 'cat animal pet biral'),
    ('blackboard', 'School Blackboard', prop_blackboard, 'blackboard school classroom chalk'),
    ('almirah', 'Wooden Almirah', prop_almirah, 'almirah wardrobe furniture cupboard'),
    ('wooden-bed', 'Wooden Bed (Chowki)', prop_wooden_bed, 'bed chowki furniture sleep'),
    ('clay-oven', 'Clay Oven (Chula)', prop_clay_oven, 'clay oven chula cooking fire kitchen'),
    ('hand-fan', 'Hand Fan (Pakha)', prop_hand_fan, 'hand fan pakha summer cool'),
    ('broom', 'Broom (Jharu)', prop_broom, 'broom jharu cleaning sweep'),
    ('bucket', 'Bucket (Balti)', prop_bucket, 'bucket balti water metal'),
    ('spade', 'Spade (Kodal)', prop_spade, 'spade kodal digging farming tool'),
    ('garland', 'Flower Garland', prop_garland, 'garland mala flowers festival welcome'),
    ('balloons', 'Balloon Bunch', prop_balloons, 'balloons party festival celebration'),
    ('football', 'Football', prop_football, 'football soccer ball sport play'),
    ('cricket-set', 'Cricket Bat & Ball', prop_cricket_set, 'cricket bat ball sport play'),
    ('wall-clock', 'Wall Clock', prop_wall_clock, 'wall clock time home'),
    ('fishing-rod', 'Fishing Rod', prop_fishing_rod, 'fishing rod reel river fish'),
]

# ---------------------------------------------------------------------- main

# Phase 10C roster mirror: the Character drawer renders in manifest order,
# and the manifest lists characters in the §4A role order — the reference
# panel order 1..33 — with the Phase-10B Mishuk extra last (34th). Only the
# ORDER and the generic role/outfit archetypes mirror the reference; every
# drawing is our own parametric artwork.
ROSTER_ORDER = [
    'rafi-hero', 'esha', 'jolil', 'rina', 'nasir-kaka', 'mitu', 'raja-bijoy',
    'karim-dadu', 'sattar', 'rofiq-police', 'boltu', 'bablu', 'golam-mota',
    'nader', 'imam-hafiz', 'salma', 'rokeya-burima', 'harun-sir', 'hamid',
    'tahiya', 'ginni-bou', 'mizan-mia', 'lal-chand', 'camili', 'nurjahan',
    'arif', 'priya', 'sultan-ashraf', 'gopal', 'village-bus', 'kashem',
    'bhulu-puppy', 'tiya-parrot', 'mishuk-rickshaw',
]

def main():
    manifest = {'version': 2,
                'note': 'Cartoon Studio original asset library v2 (Phase 10A full set + Phase 10B Mishuk extra + Phase 10C roster-mirror order) — generated by tools/build_assets.py',
                'characters': [], 'backgrounds': [], 'props': []}
    char_entries = []

    for cfg in CHARACTERS:
        entry = {'id': cfg['id'], 'kind': 'character', 'name': cfg['name'],
                 'role': cfg['role'], 'tags': cfg['tags'], 'free': True,
                 'w': 300, 'h': 480, 'poses': []}
        for pose_id, label in POSES:
            rel = f"characters/{cfg['id']}-{pose_id}.svg"
            write(rel, person_svg(cfg, pose_id))
            entry['poses'].append({'id': pose_id, 'label': label, 'file': rel})
        char_entries.append(entry)

    for spec in SPECIAL_CHARACTERS:
        entry = {'id': spec['id'], 'kind': 'character', 'name': spec['name'],
                 'role': spec['role'], 'tags': spec['tags'], 'free': True,
                 'w': spec['w'], 'h': spec['h'], 'poses': []}
        for pose_id, label in spec['poses']:
            rel = f"characters/{spec['id']}-{pose_id}.svg"
            write(rel, spec['builder'](pose_id))
            entry['poses'].append({'id': pose_id, 'label': label, 'file': rel})
        char_entries.append(entry)

    by_id = {e['id']: e for e in char_entries}
    assert set(by_id) == set(ROSTER_ORDER), 'roster order / character set mismatch'
    manifest['characters'] = [by_id[cid] for cid in ROSTER_ORDER]

    for bid, name, fn, tags in BACKGROUNDS:
        rel = f'backgrounds/{bid}.svg'
        write(rel, fn())
        manifest['backgrounds'].append({'id': bid, 'kind': 'background', 'name': name,
                                        'tags': tags, 'free': True, 'w': 1280, 'h': 720,
                                        'file': rel})

    for cid, name, variants, tags in COMBO_BACKGROUNDS:
        ventries = []
        for label, fn in variants:
            slug = label.lower().replace(' ', '-').replace('at-', '')
            rel = f'backgrounds/{cid}-{slug}.svg'
            write(rel, fn())
            ventries.append({'label': label, 'file': rel})
        manifest['backgrounds'].append({'id': cid, 'kind': 'background', 'name': name,
                                        'tags': tags, 'free': True, 'w': 1280, 'h': 720,
                                        'combo': True, 'file': ventries[0]['file'],
                                        'variants': ventries})

    for pid, name, fn, tags in PROPS:
        rel = f'props/{pid}.svg'
        write(rel, fn())
        manifest['props'].append({'id': pid, 'kind': 'prop', 'name': name,
                                  'tags': tags, 'free': True, 'w': 200, 'h': 200,
                                  'file': rel})

    with open(os.path.join(ASSETS, 'manifest.json'), 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
        f.write('\n')

    print(f"characters: {len(manifest['characters'])} "
          f"({sum(len(c['poses']) for c in manifest['characters'])} pose files)")
    print(f"backgrounds: {len(manifest['backgrounds'])}")
    print(f"props: {len(manifest['props'])}")
    print('manifest.json written')

if __name__ == '__main__':
    main()

/* Cartoon Studio — parametric character builder (Phase 6B).
   A JavaScript port of the person-builder concept from
   tools/build_assets.py (our own implementation, same flat-cartoon
   style family): given appearance parameters it generates an original
   SVG character in any of the 7 library poses (stand / walk / talk /
   sit / wave / point / back) on the same 300×480 canvas the Python factory
   uses, so custom characters sit naturally next to library ones.

   This module is PURE (no DOM, no fetch) so it is unit-testable in
   Node: buildCharacterSVG, normalizeCharParams, resolveCharacterDef.

   Custom characters are stored as media-store records
   { kind: 'custom-character', name, params, createdAt } (db.js) and
   referenced from layers as assetId 'custom:<mediaId>'. */

/* ------------------------------ constants ------------------------------- */

export const CUSTOM_PREFIX = 'custom:';

export const CHARACTER_POSES = [
  { id: 'stand', label: 'Stand' },
  { id: 'walk', label: 'Walk' },
  { id: 'talk', label: 'Talk' },
  { id: 'sit', label: 'Sit' },
  { id: 'wave', label: 'Wave' },
  { id: 'point', label: 'Point' },
  { id: 'back', label: 'Back' }
];

export const SKIN_TONES = ['#f6cf9f', '#e0aa6e', '#b57e4e', '#8d5a33', '#5d3a1a'];

export const HAIR_STYLES = [
  { id: 'short', label: 'Short hair' },
  { id: 'spiky', label: 'Spiky hair' },
  { id: 'bun', label: 'Bun / Khopa' },
  { id: 'long', label: 'Long hair' },
  { id: 'tupi', label: 'Tupi (prayer cap)' },
  { id: 'cap', label: 'Cap' },
  { id: 'gamchha', label: 'Gamchha head-wrap' },
  { id: 'ribbons', label: 'Hair ribbons' },
  { id: 'bald', label: 'Bald' }
];

export const HAIR_COLORS = ['#201a17', '#3a2a1a', '#6d4525', '#a03c2a', '#8d8578', '#d9d6cf'];

export const TOP_STYLES = [
  { id: 'panjabi', label: 'Panjabi' },
  { id: 'shirt', label: 'Shirt' },
  { id: 'sari', label: 'Sari' },
  { id: 'frock', label: 'Frock' },
  { id: 'uniform', label: 'Uniform' },
  { id: 'vest', label: 'Vest / Fatua' }
];

export const BOTTOM_STYLES = [
  { id: 'lungi', label: 'Lungi' },
  { id: 'pajama', label: 'Pajama' },
  { id: 'trousers', label: 'Trousers' },
  { id: 'shorts', label: 'Shorts' },
  { id: 'skirt', label: 'Skirt' }
];

export const ACCESSORIES = [
  { id: 'none', label: 'None' },
  { id: 'stick', label: 'Walking stick' },
  { id: 'book', label: 'Book' },
  { id: 'gamchha', label: 'Gamchha (over shoulder)' },
  { id: 'apron', label: 'Apron' }
];

export const TOP_COLORS = ['#4a7fb5', '#d64541', '#2e8b6e', '#f2a007', '#845ec2', '#b03a5b', '#e6dfca', '#374f63'];
export const BOTTOM_COLORS = ['#44445a', '#2f6e63', '#7a3b4f', '#31572c', '#8a5a33', '#c94f83', '#e8e4da', '#274156'];

const HAIR_STYLE_IDS = HAIR_STYLES.map((s) => s.id);
const TOP_STYLE_IDS = TOP_STYLES.map((s) => s.id);
const BOTTOM_STYLE_IDS = BOTTOM_STYLES.map((s) => s.id);
const ACCESSORY_IDS = ACCESSORIES.map((s) => s.id);

/* --------------------------- param normalising -------------------------- */

export function defaultCharParams() {
  return {
    name: 'My Character',
    skinTone: '#b57e4e',
    hairStyle: 'short',
    hairColor: '#2b2320',
    beard: false,
    glasses: false,
    topStyle: 'shirt',
    topColor: '#4a7fb5',
    bottomStyle: 'trousers',
    bottomColor: '#44445a',
    accessory: 'none'
  };
}

const isHex = (v) => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);

/** Validate + complete a params object; unknown values fall back to defaults. */
export function normalizeCharParams(p) {
  const d = defaultCharParams();
  const o = (p && typeof p === 'object') ? p : {};
  const pick = (v, list, dflt) => (list.includes(v) ? v : dflt);
  const col = (v, dflt) => (isHex(v) ? v : dflt);
  const name = String(o.name ?? '').trim().slice(0, 40);
  return {
    name: name || d.name,
    skinTone: SKIN_TONES.includes(o.skinTone) ? o.skinTone : d.skinTone,
    hairStyle: pick(o.hairStyle, HAIR_STYLE_IDS, d.hairStyle),
    hairColor: col(o.hairColor, d.hairColor),
    beard: !!o.beard,
    glasses: !!o.glasses,
    topStyle: pick(o.topStyle, TOP_STYLE_IDS, d.topStyle),
    topColor: col(o.topColor, d.topColor),
    bottomStyle: pick(o.bottomStyle, BOTTOM_STYLE_IDS, d.bottomStyle),
    bottomColor: col(o.bottomColor, d.bottomColor),
    accessory: pick(o.accessory, ACCESSORY_IDS, d.accessory)
  };
}

/** True when an assetId references a custom (Character Studio) character. */
export function isCustomAssetId(assetId) {
  return typeof assetId === 'string' && assetId.startsWith(CUSTOM_PREFIX);
}

/* --------------------- Pose Lab mods (Phase 10B) ------------------------ */
/* Basic joint-slider pose lab (parity 8.3): four joint values applied
   as SVG transforms over the STAND rendering — head tilt rotates the
   head group around the neck, the arm sliders rotate each arm group
   around its shoulder, leg spread widens the leg group around the
   hips. This is deliberately NOT a bone/IK rig; the Studio labels it
   as such. A saved "custom pose" is { id: 'customN', label, mods }
   stored on the character record (record.poses). */

export const POSE_MOD_LIMITS = {
  headTilt: { min: -20, max: 20 },
  armL: { min: -120, max: 30 },
  armR: { min: -30, max: 120 },
  legSpread: { min: 0, max: 30 }
};

export function defaultPoseMods() {
  return { headTilt: 0, armL: 0, armR: 0, legSpread: 0 };
}

/** Validate + clamp a pose-mods object; missing/invalid → neutral. */
export function normalizePoseMods(m) {
  const o = (m && typeof m === 'object') ? m : {};
  const out = defaultPoseMods();
  for (const k of Object.keys(POSE_MOD_LIMITS)) {
    const lim = POSE_MOD_LIMITS[k];
    out[k] = Number.isFinite(o[k])
      ? Math.round(Math.min(lim.max, Math.max(lim.min, o[k])) * 10) / 10
      : 0;
  }
  return out;
}

/** True when every joint is at its neutral value (plain Stand). */
export function poseModsAreNeutral(m) {
  const n = normalizePoseMods(m);
  return n.headTilt === 0 && n.armL === 0 && n.armR === 0 && n.legSpread === 0;
}

/**
 * Sanitise a custom character record's saved pose list
 * (record.poses): entries { id: 'customN', label, mods }. Invalid or
 * duplicate ids are dropped; labels are trimmed/capped.
 */
export function normalizeCustomPoses(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  for (const p of list) {
    if (!p || typeof p !== 'object') continue;
    if (!/^custom\d+$/.test(p.id || '') || seen.has(p.id)) continue;
    seen.add(p.id);
    const label = String(p.label ?? '').trim().slice(0, 24) || 'My Pose';
    out.push({ id: p.id, label, mods: normalizePoseMods(p.mods), custom: true });
  }
  return out;
}

/**
 * Resolve a character assetId to a definition { id, name, role, poses }
 * for BOTH library characters (from the assets manifest) and custom
 * characters (from media-store records). Returns null when unknown —
 * the editor treats a null custom def as "missing media".
 * Phase 10B: a custom character's def also carries its saved Pose Lab
 * poses — `poses` = the 7 standard poses + the custom ones (so pose
 * chips just work), and `customPoses` = only the Pose Lab entries.
 */
export function resolveCharacterDef(manifest, customRecords, assetId) {
  if (!assetId || typeof assetId !== 'string') return null;
  if (isCustomAssetId(assetId)) {
    const mediaId = assetId.slice(CUSTOM_PREFIX.length);
    const rec = (Array.isArray(customRecords) ? customRecords : [])
      .find((r) => r && r.id === mediaId);
    if (!rec) return null;
    const customPoses = normalizeCustomPoses(rec.poses);
    return {
      id: assetId,
      name: rec.name || 'Custom character',
      role: 'Custom character · Character Studio',
      poses: [...CHARACTER_POSES, ...customPoses],
      customPoses,
      custom: true,
      params: rec.params
    };
  }
  const ch = ((manifest && manifest.characters) || []).find((c) => c.id === assetId);
  return ch || null;
}

/* ------------------------------- wearables ------------------------------ */
/* Wearable overlays for character layers (parity 4.32–4.37): small
   original SVGs anchored to the character's drawn box by fractions
   (fx/fy = centre position, wFrac = width as a fraction of box width),
   so the same overlay fits library AND custom characters and flips
   with the layer. All viewBoxes are 0 0 100 100. */

export const WEARABLES = [
  {
    id: 'sunglasses', label: 'Cool Sunglasses', fx: 0.5, fy: 0.2, wFrac: 0.46,
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
      + '<line x1="10" y1="42" x2="2" y2="34" stroke="#20242e" stroke-width="6" stroke-linecap="round"/>'
      + '<line x1="90" y1="42" x2="98" y2="34" stroke="#20242e" stroke-width="6" stroke-linecap="round"/>'
      + '<rect x="8" y="38" width="34" height="25" rx="10" fill="#20242e"/>'
      + '<rect x="58" y="38" width="34" height="25" rx="10" fill="#20242e"/>'
      + '<rect x="40" y="45" width="20" height="6" fill="#20242e"/>'
      + '<rect x="14" y="43" width="13" height="6" rx="3" fill="#9fd4ea" opacity="0.75"/>'
      + '<rect x="64" y="43" width="13" height="6" rx="3" fill="#9fd4ea" opacity="0.75"/></svg>'
  },
  {
    id: 'cap', label: 'Baseball Cap', fx: 0.5, fy: 0.085, wFrac: 0.52,
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
      + '<path d="M14,62 Q16,26 50,26 Q84,26 86,62 Q50,48 14,62 Z" fill="#2e8b6e"/>'
      + '<path d="M50,26 L50,52" stroke="#26735c" stroke-width="4"/>'
      + '<ellipse cx="88" cy="64" rx="16" ry="6" fill="#26735c"/>'
      + '<circle cx="50" cy="25" r="6" fill="#26735c"/></svg>'
  },
  {
    id: 'crown', label: 'Golden Crown', fx: 0.5, fy: 0.07, wFrac: 0.46,
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
      + '<polygon points="16,72 16,34 35,52 50,26 65,52 84,34 84,72" fill="#e8b64c" stroke="#c78f35" stroke-width="4" stroke-linejoin="round"/>'
      + '<rect x="16" y="72" width="68" height="10" rx="4" fill="#c78f35"/>'
      + '<circle cx="50" cy="60" r="6" fill="#d64541"/>'
      + '<circle cx="30" cy="62" r="4.5" fill="#31578c"/>'
      + '<circle cx="70" cy="62" r="4.5" fill="#2e8b6e"/></svg>'
  },
  {
    id: 'headphones', label: 'Headphones', fx: 0.5, fy: 0.185, wFrac: 0.58,
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
      + '<path d="M16,66 Q14,22 50,20 Q86,22 84,66" fill="none" stroke="#374f63" stroke-width="9" stroke-linecap="round"/>'
      + '<rect x="6" y="58" width="20" height="32" rx="9" fill="#374f63"/>'
      + '<rect x="74" y="58" width="20" height="32" rx="9" fill="#374f63"/>'
      + '<rect x="11" y="65" width="10" height="18" rx="5" fill="#ff8c1a"/>'
      + '<rect x="79" y="65" width="10" height="18" rx="5" fill="#ff8c1a"/></svg>'
  },
  {
    id: 'party-hat', label: 'Party Hat', fx: 0.57, fy: 0.055, wFrac: 0.36,
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
      + '<polygon points="50,14 80,86 20,86" fill="#e5639a"/>'
      + '<path d="M35,52 L65,52 L70,66 L30,66 Z" fill="#f2a007"/>'
      + '<path d="M42,32 L58,32 L62,44 L38,44 Z" fill="#2e8b6e"/>'
      + '<ellipse cx="50" cy="86" rx="31" ry="7" fill="#c94f83"/>'
      + '<circle cx="50" cy="12" r="9" fill="#ffd94d"/></svg>'
  },
  {
    id: 'wand', label: 'Magic Wand', fx: 0.71, fy: 0.58, wFrac: 0.42,
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
      + '<line x1="30" y1="88" x2="66" y2="38" stroke="#7a4a21" stroke-width="7" stroke-linecap="round"/>'
      + '<path d="M72,8 l5.5,12.5 13.5,1.5 -10,9 2.8,13.2 -11.8,-6.8 -11.8,6.8 2.8,-13.2 -10,-9 13.5,-1.5 Z" fill="#e8b64c" stroke="#c78f35" stroke-width="2.5" stroke-linejoin="round"/>'
      + '<path d="M20,26 v12 M14,32 h12 M86,58 v10 M81,63 h10" stroke="#8fb8dd" stroke-width="4" stroke-linecap="round"/></svg>'
  }
];

export const WEARABLE_IDS = WEARABLES.map((w) => w.id);

/* ------------------------------ svg helpers ----------------------------- */
/* Mirrors of the Python factory's helpers (same geometry style). */

const rect = (x, y, w, h, fill, rx = 0, opacity = null, stroke = null, sw = null) => {
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"`;
  if (rx) s += ` rx="${rx}"`;
  if (opacity !== null) s += ` opacity="${opacity}"`;
  if (stroke) s += ` stroke="${stroke}" stroke-width="${sw || 3}"`;
  return s + '/>';
};
const circle = (cx, cy, r, fill, opacity = null) => {
  let s = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"`;
  if (opacity !== null) s += ` opacity="${opacity}"`;
  return s + '/>';
};
const ellipse = (cx, cy, rx, ry, fill, opacity = null) => {
  let s = `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}"`;
  if (opacity !== null) s += ` opacity="${opacity}"`;
  return s + '/>';
};
const line = (x1, y1, x2, y2, stroke, w, opacity = null) => {
  let s = `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round"`;
  if (opacity !== null) s += ` opacity="${opacity}"`;
  return s + '/>';
};
const poly = (points, fill, opacity = null, stroke = null, sw = null) => {
  const pts = points.map(([x, y]) => `${x},${y}`).join(' ');
  let s = `<polygon points="${pts}" fill="${fill}" stroke-linejoin="round"`;
  if (opacity !== null) s += ` opacity="${opacity}"`;
  if (stroke) s += ` stroke="${stroke}" stroke-width="${sw || 3}"`;
  return s + '/>';
};
const path = (d, fill = null, stroke = null, sw = null, opacity = null) => {
  let s = `<path d="${d}"`;
  s += fill ? ` fill="${fill}"` : ' fill="none"';
  if (stroke) s += ` stroke="${stroke}" stroke-width="${sw || 4}" stroke-linecap="round" stroke-linejoin="round"`;
  if (opacity !== null) s += ` opacity="${opacity}"`;
  return s + '/>';
};
const limb = (x1, y1, x2, y2, x3, y3, color, w = 21) =>
  `<path d="M${x1},${y1} L${x2},${y2} L${x3},${y3}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (f >= 0) { r = Math.round(r + (255 - r) * f); g = Math.round(g + (255 - g) * f); b = Math.round(b + (255 - b) * f); }
  else { r = Math.round(r * (1 + f)); g = Math.round(g * (1 + f)); b = Math.round(b * (1 + f)); }
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

const escapeXml = (s) => String(s ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

/* ------------------------- params → builder config ----------------------- */

function toCfg(p) {
  const hairMap = {
    short: 'short', spiky: 'spiky', bun: 'bun', long: 'long', tupi: 'tupi',
    cap: 'cap', gamchha: 'wrap', ribbons: 'long', bald: 'none'
  };
  const cfg = {
    name: p.name,
    skin: p.skinTone,
    hair: hairMap[p.hairStyle] || 'short',
    hairColor: p.hairColor,
    capColor: p.hairColor,
    beard: p.beard,
    glasses: p.glasses,
    ribbons: p.hairStyle === 'ribbons' ? '#e5639a' : null,
    top: p.topStyle === 'uniform' ? 'police' : p.topStyle,
    topColor: p.topColor,
    collar: p.topStyle === 'panjabi' ? '#d8cdb4' : '#ffffff',
    bottom: p.topStyle === 'sari' ? 'sari' : p.bottomStyle,
    bottomColor: p.bottomColor,
    waistColor: '#274156',
    shirtColor: '#e0d6bd'
  };
  if (p.topStyle === 'sari') {
    cfg.drape = shade(p.topColor, 0.16);
    cfg.border = '#e8b64c';
  }
  if (p.accessory === 'gamchha') cfg.gamchha = '#d64541';
  if (p.accessory === 'apron') cfg.apron = '#7a4a21';
  if (p.accessory === 'stick' || p.accessory === 'book') cfg.accessory = p.accessory;
  return cfg;
}

/* ------------------------- body parts (300×480) -------------------------- */

const shoe = (x, y, color = '#4a3230') => ellipse(x, y, 17, 7, color);

function legsStanding(cfg) {
  const skin = cfg.skin, bc = cfg.bottomColor || '#44445a';
  const style = cfg.bottom || 'trousers';
  const out = [];
  if (style === 'trousers') {
    out.push(rect(121, 296, 25, 146, bc, 9), rect(154, 296, 25, 146, bc, 9), shoe(131, 452), shoe(169, 452));
  } else if (style === 'pajama') {
    out.push(rect(118, 296, 28, 146, bc, 10), rect(154, 296, 28, 146, bc, 10));
    out.push(rect(115, 288, 80, 15, 'rgba(0,0,0,0.18)', 6));
    out.push(line(150, 298, 150, 314, '#f2ead8', 3));
    out.push(rect(118, 424, 28, 15, 'rgba(0,0,0,0.15)', 5), rect(154, 424, 28, 15, 'rgba(0,0,0,0.15)', 5));
    out.push(shoe(131, 452), shoe(169, 452));
  } else if (style === 'lungi') {
    out.push(poly([[117, 290], [183, 290], [197, 400], [103, 400]], bc));
    out.push(rect(112, 288, 76, 14, cfg.waistColor || '#274156', 5));
    out.push(rect(126, 398, 19, 44, skin, 8), rect(155, 398, 19, 44, skin, 8));
    out.push(ellipse(133, 452, 16, 6, '#6d4c2f'), ellipse(167, 452, 16, 6, '#6d4c2f'));
  } else if (style === 'shorts') {
    out.push(rect(117, 296, 66, 56, bc, 8));
    out.push(rect(124, 350, 20, 92, skin, 8), rect(156, 350, 20, 92, skin, 8));
    out.push(shoe(131, 452, '#31578c'), shoe(169, 452, '#31578c'));
  } else if (style === 'skirt') {
    out.push(poly([[117, 262], [183, 262], [207, 364], [93, 364]], bc));
    out.push(rect(124, 362, 19, 80, skin, 8), rect(157, 362, 19, 80, skin, 8));
    out.push(shoe(131, 452, '#93355d'), shoe(169, 452, '#93355d'));
  } else if (style === 'sari') {
    const drape = cfg.drape || '#b03a5b';
    out.push(path('M112,250 L188,250 L202,446 Q150,458 98,446 Z', drape));
    out.push(path('M104,428 L196,428 L200,446 Q150,458 100,446 Z', cfg.border || '#e8b64c'));
    out.push(shoe(128, 454, '#5d2f3a'), shoe(174, 454, '#5d2f3a'));
  }
  return out.join('');
}

function legsWalk(cfg) {
  const skin = cfg.skin, bc = cfg.bottomColor || '#44445a';
  const style = cfg.bottom || 'trousers';
  const out = [];
  if (style === 'lungi' || style === 'sari') {
    out.push(poly([[117, 290], [183, 290], [190, 398], [104, 398]],
      style === 'sari' ? (cfg.drape || bc) : bc));
    out.push(limb(132, 392, 120, 424, 104, 448, skin, 17));
    out.push(limb(168, 392, 182, 420, 200, 442, skin, 17));
    out.push(ellipse(100, 452, 15, 6, '#6d4c2f'), ellipse(204, 448, 15, 6, '#6d4c2f'));
    return out.join('');
  }
  const legc = (style === 'shorts' || style === 'skirt') ? skin : bc;
  const hipY = style !== 'skirt' ? 300 : 330;
  out.push(limb(134, hipY, 112, 374, 118, 446, legc, 23));
  out.push(limb(166, hipY, 184, 368, 202, 438, legc, 23));
  if (style === 'shorts') out.push(rect(117, 292, 66, 46, bc, 8));
  else if (style === 'skirt') out.push(poly([[117, 262], [183, 262], [203, 336], [97, 336]], bc));
  out.push(shoe(114, 452, style === 'shorts' ? '#31578c' : '#4a3230'));
  out.push(shoe(206, 444, style === 'shorts' ? '#31578c' : '#4a3230'));
  return out.join('');
}

function legsSitting(cfg) {
  const skin = cfg.skin, bc = cfg.bottomColor || '#44445a';
  const style = cfg.bottom || 'trousers';
  const out = [];
  out.push(rect(94, 384, 112, 13, '#8a5a33', 4));
  out.push(rect(102, 397, 10, 46, '#6d4525'), rect(188, 397, 10, 46, '#6d4525'));
  const wrap = style === 'sari' ? (cfg.drape || bc) : bc;
  out.push(path('M102,330 L198,330 L206,392 Q150,404 94,392 Z', wrap));
  const legFill = (style === 'shorts' || style === 'skirt') ? skin : wrap;
  out.push(limb(128, 372, 106, 400, 108, 442, legFill, 19));
  out.push(limb(172, 372, 194, 400, 192, 442, legFill, 19));
  out.push(shoe(106, 452), shoe(194, 452));
  return out.join('');
}

function torso(cfg, sitting = false) {
  const tc = cfg.topColor || '#7fae4c';
  const style = cfg.top || 'shirt';
  const bottomY = sitting ? 372 : 306;
  const out = [];
  if (style === 'panjabi') {
    out.push(path(`M106,168 L194,168 L198,${bottomY} L102,${bottomY} Z`, tc));
    out.push(rect(140, 160, 20, 16, cfg.collar || '#d8cdb4', 4));
    out.push(line(150, 178, 150, 250, 'rgba(0,0,0,0.15)', 4));
  } else if (style === 'police') {
    out.push(rect(106, 166, 88, bottomY - 166, tc, 14));
    out.push(rect(114, 196, 28, 22, '#2b4365', 4), rect(158, 196, 28, 22, '#2b4365', 4));
    out.push(rect(106, 288, 88, 13, '#22242e'));
    out.push(rect(141, 286, 18, 16, '#e8b64c', 3));
    out.push(rect(104, 164, 26, 10, '#e8b64c', 4), rect(170, 164, 26, 10, '#e8b64c', 4));
    out.push(line(150, 176, 150, 288, 'rgba(255,255,255,0.25)', 4));
  } else if (style === 'sari') {
    const blouse = cfg.topColor || '#b03a5b';
    const drape = cfg.drape || '#cf4f74';
    out.push(rect(108, 166, 84, bottomY - 166, blouse, 14));
    out.push(path(`M112,180 L196,262 L196,${bottomY} L150,${bottomY} L118,240 Z`, drape));
    out.push(path('M112,180 L196,262', null, cfg.border || '#e8b64c', 7));
  } else if (style === 'frock') {
    out.push(path(`M110,166 L190,166 L198,268 L102,268 Z`, tc));
    out.push(ellipse(150, 268, 49, 10, tc));
    out.push(rect(128, 158, 44, 12, '#ffffff', 6, 0.85));
  } else if (style === 'vest') {
    out.push(rect(108, 166, 84, bottomY - 166, cfg.shirtColor || '#e0d6bd', 14));
    out.push(path(`M108,166 L138,166 L138,${bottomY} L108,${bottomY} Z`, tc));
    out.push(path(`M162,166 L192,166 L192,${bottomY} L162,${bottomY} Z`, tc));
    out.push(line(150, 180, 150, bottomY - 8, 'rgba(0,0,0,0.18)', 4));
  } else { /* shirt */
    out.push(rect(108, 166, 84, bottomY - 166, tc, 14));
    out.push(poly([[136, 164], [164, 164], [150, 184]], cfg.collar || '#ffffff'));
    for (const yy of [210, 244, 278]) out.push(circle(150, yy, 3.4, 'rgba(0,0,0,0.35)'));
  }
  if (cfg.apron) {
    out.push(rect(120, 226, 60, 92, cfg.apron, 8));
    out.push(line(120, 226, 180, 226, 'rgba(0,0,0,0.2)', 4));
  }
  if (cfg.gamchha) {
    out.push(path('M112,168 L132,168 L128,268 L106,262 Z', cfg.gamchha));
    out.push(line(112, 196, 130, 198, '#ffffff', 4, 0.55));
    out.push(line(110, 226, 129, 228, '#ffffff', 4, 0.55));
  }
  return out.join('');
}

function arms(cfg, pose, mods = null) {
  let sleeve = cfg.topColor || '#7fae4c';
  if (cfg.top === 'sari') sleeve = cfg.drape || sleeve;
  if (cfg.top === 'vest') sleeve = cfg.shirtColor || sleeve;
  const skin = cfg.skin;
  const L = [110, 184], R = [190, 184];
  const out = [];
  /* Phase 10B Pose Lab: in the stand pose each arm can be wrapped in a
     rotate() group around its shoulder (mods.armL / mods.armR). */
  const arm = (sh, elbow, hand, color, rot = 0) => {
    const inner = limb(sh[0], sh[1], elbow[0], elbow[1], hand[0], hand[1], color, 20)
      + circle(hand[0], hand[1], 11, skin);
    out.push(rot ? `<g transform="rotate(${rot} ${sh[0]} ${sh[1]})">${inner}</g>` : inner);
  };
  if (pose === 'wave') {
    arm(L, [98, 248], [102, 314], sleeve);
    arm(R, [220, 130], [230, 78], sleeve);
    out.push(path('M248,58 q14,14 6,30', null, '#8fb8dd', 5));
    out.push(path('M262,74 q10,12 4,24', null, '#8fb8dd', 5));
  } else if (pose === 'point') {
    arm(L, [98, 248], [102, 314], sleeve);
    arm(R, [226, 192], [256, 186], sleeve);
    out.push(line(256, 186, 272, 184, skin, 7));
  } else if (pose === 'talk') {
    arm(L, [98, 248], [102, 314], sleeve);
    arm(R, [216, 240], [182, 226], sleeve);
  } else if (pose === 'walk') {
    arm(L, [96, 244], [110, 308], sleeve);
    arm(R, [208, 240], [198, 302], sleeve);
  } else if (pose === 'sit') {
    arm(L, [100, 250], [118, 322], sleeve);
    arm(R, [200, 250], [182, 322], sleeve);
  } else { /* stand */
    arm(L, [98, 248], [102, 314], sleeve, mods ? mods.armL : 0);
    arm(R, [202, 248], [198, 314], sleeve, mods ? mods.armR : 0);
  }
  return out.join('');
}

function head(cfg, pose) {
  const skin = cfg.skin;
  const hair = cfg.hair || 'short';
  const hairc = cfg.hairColor || '#2b2320';
  const out = [];
  const talking = pose === 'talk';
  if (hair === 'long') {
    out.push(path('M102,70 Q96,180 108,214 L130,214 Q118,150 122,96 Z', hairc));
    out.push(path('M198,70 Q204,180 192,214 L170,214 Q182,150 178,96 Z', hairc));
  }
  if (hair === 'bun') out.push(circle(178, 42, 17, hairc));
  out.push(circle(103, 100, 10, skin), circle(197, 100, 10, skin));
  out.push(circle(150, 96, 47, skin));
  if (cfg.beard) {
    out.push(path('M112,104 Q114,158 150,160 Q186,158 188,104 Q186,140 150,142 Q114,140 112,104 Z', '#e9e6df'));
  }
  if (hair === 'short' || hair === 'spiky') {
    out.push(path('M103,92 Q100,44 150,42 Q200,44 197,92 Q186,60 150,58 Q114,60 103,92 Z', hairc));
    if (hair === 'spiky') {
      out.push(poly([[116, 56], [124, 30], [136, 52]], hairc));
      out.push(poly([[140, 50], [152, 26], [162, 50]], hairc));
      out.push(poly([[164, 52], [178, 32], [184, 58]], hairc));
    }
  } else if (hair === 'bun') {
    out.push(path('M103,90 Q102,46 150,44 Q198,46 197,90 Q184,64 150,62 Q116,64 103,90 Z', hairc));
  } else if (hair === 'cap') {
    const capc = cfg.capColor || '#2e8b6e';
    out.push(path('M102,84 Q104,40 150,40 Q196,40 198,84 Q150,64 102,84 Z', capc));
    out.push(ellipse(206, 82, 26, 8, capc));
  } else if (hair === 'tupi') {
    out.push(path('M112,66 Q150,30 188,66 Q150,52 112,66 Z', '#f4f1e6'));
    out.push(path('M124,52 q6,-6 12,0 M148,44 q6,-6 12,0 M172,52 q6,-6 12,0', null, '#c9c2ab', 3));
  } else if (hair === 'wrap') {
    const wc = cfg.capColor || '#e07a2f';
    out.push(path('M100,86 Q98,38 150,36 Q202,38 200,86 Q170,56 150,58 Q128,58 100,86 Z', wc));
    out.push(rect(98, 78, 104, 12, wc, 6));
    out.push(path('M196,84 L214,140 L196,146 L188,96 Z', wc));
  } else if (hair === 'long') {
    out.push(path('M103,92 Q100,42 150,40 Q200,42 197,92 Q184,58 150,56 Q116,58 103,92 Z', hairc));
    if (cfg.ribbons) {
      for (const cx of [108, 192]) {
        out.push(circle(cx, 66, 8, cfg.ribbons), circle(cx - 9, 58, 6, cfg.ribbons), circle(cx + 9, 58, 6, cfg.ribbons));
      }
    }
  }
  for (const ex of [132, 168]) {
    out.push(ellipse(ex, 96, 5.5, 7.5, '#26221f'));
    out.push(circle(ex + 1.8, 93, 1.9, '#ffffff'));
  }
  out.push(path('M122,82 q10,-6 20,0', null, '#3a2c22', 3.4));
  out.push(path('M158,82 q10,-6 20,0', null, '#3a2c22', 3.4));
  out.push(path('M151,102 q5,7 -1,12', null, 'rgba(0,0,0,0.35)', 3));
  if (cfg.glasses) {
    for (const ex of [132, 168]) {
      out.push(`<circle cx="${ex}" cy="96" r="15" fill="none" stroke="#3c3a38" stroke-width="3.4"/>`);
    }
    out.push(line(147, 96, 153, 96, '#3c3a38', 3.4));
    out.push(line(117, 94, 104, 90, '#3c3a38', 3.4));
    out.push(line(183, 94, 196, 90, '#3c3a38', 3.4));
  }
  if (cfg.beard) {
    out.push(path('M136,116 q14,9 28,0', null, '#8d8578', 3.6));
    if (talking) out.push(ellipse(150, 126, 8, 10, '#7a3b2e'));
  } else if (talking) {
    out.push(ellipse(150, 122, 10, 13, '#7a3b2e'));
    out.push(ellipse(150, 128, 6, 4.5, '#d97b6c'));
  } else {
    out.push(path('M136,116 q14,10 28,0', null, '#7a4530', 3.8));
  }
  return out.join('');
}

/* --------------------- back view (Phase 10A) ---------------------------- */
/* True back artwork, mirroring the Python factory: hair mass / headwear
   from behind + neck + ears and NO face features; back of the clothing
   reusing the same palette/params; arms resting at the sides. */

function headBack(cfg) {
  const skin = cfg.skin;
  const hair = cfg.hair || 'short';
  const hairc = cfg.hairColor || '#2b2320';
  const out = [];
  if (hair === 'long') {
    out.push(path('M100,64 Q92,190 108,238 L192,238 Q208,190 200,64 Q150,40 100,64 Z', hairc));
  }
  out.push(rect(136, 128, 28, 34, skin, 8));
  out.push(circle(103, 100, 10, skin), circle(197, 100, 10, skin));
  out.push(circle(150, 96, 47, skin));
  if (hair === 'bun') {
    out.push(circle(150, 96, 47, hairc));
    out.push(circle(150, 34, 17, hairc));
  } else if (hair === 'cap') {
    const capc = cfg.capColor || '#2e8b6e';
    out.push(path('M106,96 Q108,128 128,140 L172,140 Q192,128 194,96 Q192,138 150,140 Q108,138 106,96 Z', hairc));
    out.push(path('M102,88 Q104,40 150,40 Q196,40 198,88 Q150,66 102,88 Z', capc));
    out.push(rect(124, 78, 52, 9, '#20242e', 4));
  } else if (hair === 'tupi') {
    out.push(circle(150, 96, 47, hairc));
    out.push(path('M112,68 Q150,30 188,68 Q150,54 112,68 Z', '#f4f1e6'));
    out.push(path('M124,54 q6,-6 12,0 M148,46 q6,-6 12,0 M172,54 q6,-6 12,0', null, '#c9c2ab', 3));
  } else if (hair === 'wrap') {
    const wc = cfg.capColor || '#e07a2f';
    out.push(path('M100,88 Q98,38 150,36 Q202,38 200,88 L200,118 Q196,148 150,150 Q104,148 100,118 Z', wc));
    out.push(rect(98, 80, 104, 12, wc, 6));
    out.push(path('M188,92 L206,168 L184,172 L176,100 Z', wc));
  } else if (hair === 'long') {
    out.push(path('M102,94 Q98,44 150,42 Q202,44 198,94 Q190,58 150,56 Q110,58 102,94 Z', hairc));
    if (cfg.ribbons) {
      for (const cx of [116, 184]) {
        out.push(circle(cx, 84, 8, cfg.ribbons), circle(cx - 9, 76, 6, cfg.ribbons), circle(cx + 9, 76, 6, cfg.ribbons));
      }
    }
  } else if (hair === 'none') {
    /* bald: plain back of the head, slight shading at the crown */
    out.push(path('M112,72 Q150,50 188,72 Q182,58 150,56 Q118,58 112,72 Z', 'rgba(0,0,0,0.07)'));
  } else { /* short / spiky */
    out.push(circle(150, 96, 47, hairc));
    if (hair === 'spiky') {
      out.push(poly([[116, 56], [124, 30], [136, 52]], hairc));
      out.push(poly([[140, 50], [152, 26], [162, 50]], hairc));
      out.push(poly([[164, 52], [178, 32], [184, 58]], hairc));
    }
  }
  if (cfg.glasses) {
    out.push(line(104, 94, 118, 92, '#3c3a38', 3.4));
    out.push(line(196, 94, 182, 92, '#3c3a38', 3.4));
  }
  return out.join('');
}

function torsoBack(cfg) {
  const tc = cfg.topColor || '#7fae4c';
  const style = cfg.top || 'shirt';
  const out = [];
  if (style === 'panjabi') {
    out.push(path('M106,168 L194,168 L198,306 L102,306 Z', tc));
    out.push(rect(138, 160, 24, 14, cfg.collar || '#d8cdb4', 4));
    out.push(line(150, 178, 150, 296, 'rgba(0,0,0,0.13)', 4));
  } else if (style === 'police') {
    out.push(rect(106, 166, 88, 140, tc, 14));
    out.push(line(110, 196, 190, 196, 'rgba(255,255,255,0.22)', 4));
    out.push(rect(106, 288, 88, 13, '#22242e'));
    out.push(rect(141, 286, 18, 16, '#e8b64c', 3));
    out.push(rect(104, 164, 26, 10, '#e8b64c', 4), rect(170, 164, 26, 10, '#e8b64c', 4));
  } else if (style === 'sari') {
    const blouse = cfg.topColor || '#b03a5b';
    const drape = cfg.drape || '#cf4f74';
    out.push(rect(108, 166, 84, 140, blouse, 14));
    out.push(path('M108,190 L192,164 L192,306 L148,306 L108,262 Z', drape));
    out.push(path('M108,190 L192,164', null, cfg.border || '#e8b64c', 7));
    out.push(line(150, 236, 150, 300, 'rgba(0,0,0,0.10)', 4));
  } else if (style === 'frock') {
    out.push(path('M110,166 L190,166 L198,268 L102,268 Z', tc));
    out.push(ellipse(150, 268, 49, 10, tc));
    out.push(line(150, 174, 150, 262, 'rgba(0,0,0,0.22)', 4));
    out.push(rect(128, 158, 44, 12, '#ffffff', 6, 0.85));
  } else if (style === 'vest') {
    out.push(rect(108, 166, 84, 140, tc, 14));
    out.push(poly([[138, 164], [162, 164], [150, 184]], cfg.shirtColor || '#e0d6bd'));
    out.push(line(150, 186, 150, 298, 'rgba(0,0,0,0.15)', 4));
  } else { /* shirt back */
    out.push(rect(108, 166, 84, 140, tc, 14));
    out.push(rect(132, 160, 36, 12, cfg.collar || '#ffffff', 5));
    out.push(line(112, 202, 188, 202, 'rgba(0,0,0,0.10)', 4));
  }
  if (cfg.apron) {
    out.push(line(112, 252, 188, 252, cfg.apron, 9));
    out.push(poly([[150, 252], [138, 278], [150, 269], [162, 278]], cfg.apron));
  }
  if (cfg.gamchha) {
    out.push(path('M168,168 L188,168 L194,262 L172,268 Z', cfg.gamchha));
    out.push(line(170, 196, 190, 198, '#ffffff', 4, 0.55));
  }
  return out.join('');
}

function armsBack(cfg) {
  let sleeve = cfg.topColor || '#7fae4c';
  if (cfg.top === 'sari') sleeve = cfg.drape || sleeve;
  if (cfg.top === 'vest') sleeve = cfg.shirtColor || sleeve;
  const skin = cfg.skin;
  return limb(110, 184, 98, 248, 102, 314, sleeve, 20) + circle(102, 314, 11, skin)
    + limb(190, 184, 202, 248, 198, 314, sleeve, 20) + circle(198, 314, 11, skin);
}

function accessoryArt(cfg, pose) {
  const acc = cfg.accessory;
  const out = [];
  if (acc === 'stick' && ['stand', 'talk', 'point', 'wave'].includes(pose)) {
    out.push(line(206, 300, 224, 452, '#7a4a21', 7));
    out.push(path('M196,296 q10,-12 20,-4', null, '#7a4a21', 7));
  } else if (acc === 'book' && ['stand', 'talk', 'wave', 'point'].includes(pose)) {
    out.push(rect(76, 292, 30, 40, '#b03a2e', 3));
    out.push(rect(80, 296, 22, 32, '#f2ead8', 2));
  }
  return out.join('');
}

function personSvg(cfg, pose, mods = null) {
  if (pose === 'back') {
    /* Phase 10A: true back view (see headBack/torsoBack/armsBack). */
    const parts = [legsStanding(cfg), torsoBack(cfg), armsBack(cfg),
      accessoryArt(cfg, 'stand'), headBack(cfg)];
    const shadow = ellipse(150, 458, 78, 10, 'rgba(20,26,38,0.20)');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 480">\n`
      + `<title>${escapeXml(cfg.name)} — Back (original Cartoon Studio artwork)</title>\n`
      + shadow + parts.join('') + '\n</svg>\n';
  }
  /* Phase 10B Pose Lab: mods transform the STAND rendering only —
     head tilt rotates the head group around the neck (150,148), leg
     spread widens the leg group around the hip line (150,300). */
  const m = pose === 'stand' ? mods : null;
  const sitting = pose === 'sit';
  const parts = [];
  if (sitting) {
    parts.push(legsSitting(cfg), torso(cfg, true));
  } else if (pose === 'walk') {
    parts.push(legsWalk(cfg), torso(cfg));
  } else {
    let legs = legsStanding(cfg);
    if (m && m.legSpread) {
      const s = 1 + m.legSpread * 0.006;
      legs = `<g transform="translate(150 300) scale(${s} 1) translate(-150 -300)">${legs}</g>`;
    }
    parts.push(legs, torso(cfg));
  }
  let headStr = head(cfg, pose);
  if (m && m.headTilt) {
    headStr = `<g transform="rotate(${m.headTilt} 150 148)">${headStr}</g>`;
  }
  parts.push(arms(cfg, pose, m), accessoryArt(cfg, pose), headStr);
  const shadow = ellipse(150, 458, 78, 10, 'rgba(20,26,38,0.20)');
  const poseLabel = (CHARACTER_POSES.find((x) => x.id === pose) || {}).label || pose;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 480">\n`
    + `<title>${escapeXml(cfg.name)} — ${escapeXml(poseLabel)} (original Cartoon Studio artwork)</title>\n`
    + shadow + parts.join('') + '\n</svg>\n';
}

/* ------------------------------ public API ------------------------------ */

/**
 * Generate the SVG string for a custom character.
 * params are normalised first, so any partial/invalid input is safe.
 * poseId: one of CHARACTER_POSES ids (default 'stand').
 * mods (Phase 10B Pose Lab): joint sliders applied to the STAND
 * rendering — pass a saved custom pose's mods with poseId 'stand' to
 * render that pose. Ignored for other poses.
 */
export function buildCharacterSVG(params, poseId, mods) {
  const p = normalizeCharParams(params);
  const pose = CHARACTER_POSES.some((x) => x.id === poseId) ? poseId : 'stand';
  return personSvg(toCfg(p), pose, pose === 'stand' ? normalizePoseMods(mods) : null);
}

/** Data-URI for an <img> preview of a character (stand pose by default). */
export function characterPreviewUri(params, poseId = 'stand', mods) {
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(buildCharacterSVG(params, poseId, mods));
}

/* Cartoon Studio — animation engine math (Phase 4).
   Pure, DOM-free functions so they can be unit-tested in Node:
   - AI Animate presets (transforms + pose cycling)
   - Motion paths (points stored normalised to clip progress)
   - Easings
   - Talk mouth flap timing
   - Camera keyframe interpolation

   Layer animation data model:
     layer.anim = {
       preset: null | 'float' | 'bounce' | 'breathing' | 'wave' | 'walk' | 'shake',
       path:   null | { points: [{ t: 0..1, x, y }], easing: 'linear'|'easeInOut'|'easeOut' },
       speed:  0.25..3   (scales preset / pose-cycle rate — "animation speed")
     }
     cameraLayer.camera = { keys: [{ tSec, x, y, zoom }] }  (sorted by tSec)
*/

export const PRESETS = [
  { id: 'float', label: 'Gentle Float' },
  { id: 'bounce', label: 'Bounce Hop' },
  { id: 'breathing', label: 'Breathing' },
  { id: 'wave', label: 'Wave Hello' },
  { id: 'walk', label: 'Walk Step' },
  { id: 'shake', label: 'Surprise Shake' }
];

export const EASINGS = ['linear', 'easeInOut', 'easeOut'];

export function presetLabel(id) {
  const p = PRESETS.find((x) => x.id === id);
  return p ? p.label : '';
}

const clamp01 = (v) => Math.min(1, Math.max(0, Number.isFinite(v) ? v : 0));
const clampNum = (v, min, max, fallback) =>
  (Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback);

/* ------------------------------ anim data -------------------------------- */

export function defaultAnim() {
  return { preset: null, path: null, speed: 1 };
}

/** Sanitise a stored path (or return null when it has no usable points). */
export function normalizePath(path) {
  if (!path || !Array.isArray(path.points)) return null;
  const points = path.points
    .filter((p) => p && Number.isFinite(p.x) && Number.isFinite(p.y))
    .map((p) => ({ t: clamp01(p.t), x: p.x, y: p.y }))
    .sort((a, b) => a.t - b.t);
  if (points.length === 0) return null;
  return {
    points,
    easing: EASINGS.includes(path.easing) ? path.easing : 'linear'
  };
}

/** Sanitise layer.anim from stored/legacy data (layers may lack the field). */
export function normalizeAnim(anim) {
  const a = anim && typeof anim === 'object' ? anim : {};
  return {
    preset: PRESETS.some((p) => p.id === a.preset) ? a.preset : null,
    path: normalizePath(a.path),
    speed: clampNum(a.speed, 0.25, 3, 1)
  };
}

/* -------------------------------- easing --------------------------------- */

export function easeValue(name, t) {
  const x = clamp01(t);
  switch (name) {
    case 'easeInOut':
      return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    case 'easeOut':
      return 1 - Math.pow(1 - x, 3);
    case 'linear':
    default:
      return x;
  }
}

/* ------------------------------ motion path ------------------------------ */

/**
 * Position on a path at clip progress 0..1.
 * The easing is applied to the global progress first, then the eased
 * progress is located between the bracketing points (by their `t`) and
 * linearly interpolated. Returns { x, y } or null for an empty path.
 */
export function pathPointAt(path, progress) {
  const pts = path && Array.isArray(path.points) ? path.points : null;
  if (!pts || pts.length === 0) return null;
  if (pts.length === 1) return { x: pts[0].x, y: pts[0].y };
  const e = easeValue(path.easing, progress);
  if (e <= pts[0].t) return { x: pts[0].x, y: pts[0].y };
  const last = pts[pts.length - 1];
  if (e >= last.t) return { x: last.x, y: last.y };
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    if (e >= a.t && e <= b.t) {
      const span = b.t - a.t;
      const f = span > 0 ? (e - a.t) / span : 0;
      return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
    }
  }
  return { x: last.x, y: last.y };
}

/** Reassign point times evenly across the clip (0, …, 1). Pure. */
export function retimePathPoints(points) {
  const n = points.length;
  return points.map((p, i) => ({ ...p, t: n <= 1 ? 0 : i / (n - 1) }));
}

/* ------------------------------- presets --------------------------------- */

/**
 * Transform contributed by a preset at a LOCAL clip time (seconds since the
 * clip started). `speed` scales the cycle rate. Returns
 * { dx, dy, scaleMul, poseId } — poseId is a suggested pose for characters
 * that have it ('wave' / 'walk' / 'stand'), otherwise null; callers fall
 * back to transform-only when the character lacks the pose.
 */
export function presetTransform(preset, localSec, speed = 1) {
  const none = { dx: 0, dy: 0, scaleMul: 1, poseId: null };
  if (!preset) return none;
  const rate = Number.isFinite(speed) && speed > 0 ? speed : 1;
  const t = Math.max(0, Number.isFinite(localSec) ? localSec : 0) * rate;
  switch (preset) {
    case 'float': /* Gentle Float — slow sine bob */
      return { ...none, dy: -14 * Math.sin((Math.PI * 2 * t) / 2.4) };
    case 'bounce': { /* Bounce Hop — repeated hops with a slight squash */
      const ph = (t / 0.55) % 1;
      const s = Math.sin(Math.PI * ph);
      return { ...none, dy: -42 * s, scaleMul: 1 - 0.05 * s };
    }
    case 'breathing': /* Breathing — subtle slow scale pulse */
      return { ...none, scaleMul: 1 + 0.02 * Math.sin((Math.PI * 2 * t) / 3.2) };
    case 'wave': /* Wave Hello — Wave/Stand pose cycle at 2 Hz + tiny bob */
      return {
        ...none,
        dy: -3 * Math.abs(Math.sin(Math.PI * t)),
        poseId: Math.floor(t * 2) % 2 === 0 ? 'wave' : 'stand'
      };
    case 'walk': /* Walk Step — Walk/Stand cycle at 3 Hz + step bob */
      return {
        ...none,
        dy: -4 * Math.abs(Math.sin(Math.PI * t * 3)),
        poseId: Math.floor(t * 3) % 2 === 0 ? 'walk' : 'stand'
      };
    case 'shake': { /* Surprise Shake — jitter bursts: 0.45 s on, 0.75 s rest */
      const active = (t % 1.2) < 0.45;
      return { ...none, dx: active ? 9 * Math.sin(Math.PI * 2 * t * 16) : 0 };
    }
    default:
      return none;
  }
}

/**
 * Talk mouth flap: alternate Talk/Stand poses at ~6 Hz (timed flap —
 * it runs while playing, so Talk characters flap along whenever a
 * voice track sounds; amplitude-driven lip sync is a possible later
 * extra). Returns 'talk' | 'stand'.
 */
export function talkPoseAt(localSec, speed = 1) {
  const rate = Number.isFinite(speed) && speed > 0 ? speed : 1;
  const t = Math.max(0, Number.isFinite(localSec) ? localSec : 0) * rate;
  return Math.floor(t * 6) % 2 === 0 ? 'talk' : 'stand';
}

/* --------------------- amplitude lip-sync (Phase 10B) -------------------- */
/* OUR extra — the reference has NO automated lip-sync at all (parity
   4.10). When a character layer's mouth mode is Talk and its lipSync
   setting is 'auto', the mouth pose follows the LIVE audio level
   (AudioEngine.getLevel) instead of the timed flap: open ('talk')
   while sound is above the threshold, closed ('stand') in the gaps.
   The decision is stateful per layer and pure here so it can be
   unit-tested: the caller keeps { pose, sinceMs } per layer. */

export const LIP_SYNC_THRESHOLD = 0.08; /* RMS level that counts as "speaking" */
export const LIP_SYNC_HOLD_MS = 90;     /* min time between pose switches */

/**
 * Decide the mouth pose for one frame.
 *   level   — current RMS level 0..1 (non-finite → treated as silence)
 *   prev    — previous state { pose: 'talk'|'stand', sinceMs } or null
 *   nowMs   — frame timestamp (performance.now in the browser)
 * Returns { pose, sinceMs } — feed the result back in as `prev` next
 * frame. A switch only happens when the target differs AND at least
 * LIP_SYNC_HOLD_MS elapsed since the last switch (anti-flicker); the
 * very first call (prev null) answers immediately.
 */
export function mouthPoseForLevel(level, prev, nowMs) {
  const lv = Number.isFinite(level) ? Math.max(0, level) : 0;
  const now = Number.isFinite(nowMs) ? nowMs : 0;
  const target = lv > LIP_SYNC_THRESHOLD ? 'talk' : 'stand';
  const cur = prev && (prev.pose === 'talk' || prev.pose === 'stand')
    ? prev.pose : null;
  const since = prev && Number.isFinite(prev.sinceMs) ? prev.sinceMs : now;
  if (cur === null) return { pose: target, sinceMs: now };
  if (target === cur) return { pose: cur, sinceMs: since };
  if (now - since >= LIP_SYNC_HOLD_MS) return { pose: target, sinceMs: now };
  return { pose: cur, sinceMs: since };
}

/** Sanitise a layer's lipSync setting ('auto' | 'timed'). */
export function normalizeLipSync(v) {
  return v === 'timed' ? 'timed' : 'auto';
}

/* -------------------------------- camera --------------------------------- */

export function defaultCameraView() {
  return { x: 0, y: 0, zoom: 1 };
}

const cleanKey = (k) => ({
  tSec: Math.max(0, Number.isFinite(k.tSec) ? k.tSec : 0),
  x: Number.isFinite(k.x) ? k.x : 0,
  y: Number.isFinite(k.y) ? k.y : 0,
  zoom: clampNum(k.zoom, 0.5, 2.5, 1)
});

/** Sanitise a camera layer's keyframe store. */
export function normalizeCamera(cam) {
  const keys = cam && Array.isArray(cam.keys)
    ? cam.keys.filter((k) => k && typeof k === 'object').map(cleanKey)
    : [];
  keys.sort((a, b) => a.tSec - b.tSec);
  return { keys };
}

/**
 * Interpolated camera view { x, y, zoom } at time tSec.
 * Before the first key → first key; after the last → last key.
 * Returns null when there are no keys (camera is static / identity).
 */
export function cameraAt(keys, tSec) {
  if (!Array.isArray(keys) || keys.length === 0) return null;
  const sorted = [...keys].sort((a, b) => a.tSec - b.tSec);
  const t = Math.max(0, Number.isFinite(tSec) ? tSec : 0);
  const first = sorted[0], last = sorted[sorted.length - 1];
  if (t <= first.tSec) return { x: first.x, y: first.y, zoom: first.zoom };
  if (t >= last.tSec) return { x: last.x, y: last.y, zoom: last.zoom };
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i], b = sorted[i + 1];
    if (t >= a.tSec && t <= b.tSec) {
      const span = b.tSec - a.tSec;
      const f = span > 0 ? (t - a.tSec) / span : 0;
      return {
        x: a.x + (b.x - a.x) * f,
        y: a.y + (b.y - a.y) * f,
        zoom: a.zoom + (b.zoom - a.zoom) * f
      };
    }
  }
  return { x: last.x, y: last.y, zoom: last.zoom };
}

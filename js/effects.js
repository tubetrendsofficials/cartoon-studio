/* Cartoon Studio — canvas effects engine (Phase 6A, Effect panel).
   Six particle/overlay effects rendered as ordinary layers in the stack:
   rain, river, birds, leaves, sparkle, clouds.

   DETERMINISM RULE: every particle's position is a pure function of
   (layer id, effect, scene time). Each helper re-seeds a PRNG from the
   layer id and consumes it in a fixed order, so scrubbing the playhead
   back and forth shows exactly the same frame at the same time — no
   accumulating random state. The per-effect math helpers are exported
   for Node unit tests; drawEffect() is the only canvas-touching part. */

import { mulberry32 } from './audio.js';

export const EFFECT_DEFS = [
  { id: 'rain', name: 'Rain', desc: 'Falling rain streaks · intensity = density + speed · optional lightning flashes' },
  { id: 'river', name: 'River', desc: 'Animated water band along the bottom with drifting fish' },
  { id: 'birds', name: 'Birds', desc: 'A flock crossing the sky on a sine path' },
  { id: 'leaves', name: 'Leaves', desc: 'Falling, swaying leaves (Motion Animator)' },
  { id: 'sparkle', name: 'Sparkle', desc: 'Twinkling star sparkles' },
  { id: 'clouds', name: 'Clouds', desc: 'Slow soft clouds drifting across the top' }
];

export const EFFECT_IDS = EFFECT_DEFS.map((d) => d.id);

/** FNV-1a string hash → uint32 seed (stable across runs). */
export function hashSeed(str) {
  let h = 0x811c9dc5;
  const s = String(str || '');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const clampI = (v) => (v === 1 || v === 3 ? v : 2);
const W = (stage) => (stage && stage.w) || 1280;
const H = (stage) => (stage && stage.h) || 720;

/** Particle/flock counts per effect + intensity level (1|2|3). */
export function particleCount(effect, intensity) {
  const i = clampI(intensity);
  switch (effect) {
    case 'rain': return [60, 120, 220][i - 1];
    case 'leaves': return [10, 18, 30][i - 1];
    case 'sparkle': return [12, 22, 36][i - 1];
    case 'birds': return [5, 8, 12][i - 1];
    case 'clouds': return [3, 4, 6][i - 1];
    case 'river': return 2; /* fish count */
    default: return 0;
  }
}

/* ------------------------------ rain ------------------------------------ */

export function rainStreaks(layer, tSec, stage) {
  const w = W(stage), h = H(stage);
  const intensity = clampI(layer.intensity);
  const count = particleCount('rain', intensity);
  const rng = mulberry32(hashSeed(layer.id + ':rain'));
  const t = Math.max(0, tSec || 0);
  const out = [];
  for (let i = 0; i < count; i++) {
    const bx = rng() * w;
    const speed = (620 + rng() * 260) * (0.8 + 0.25 * intensity);
    const len = 12 + rng() * 10 + intensity * 3;
    const phase = rng() * (h + 80);
    const y = ((phase + t * speed) % (h + 80)) - 40;
    const x = ((bx + y * 0.08) % w + w) % w;
    out.push({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, len: Math.round(len * 10) / 10 });
  }
  return out;
}

/** Deterministic lightning: one double-blink flash per 6 s cycle. */
export function lightningOn(layer, tSec) {
  if (!layer || !layer.lightning) return false;
  const t = Math.max(0, tSec || 0);
  const cycle = Math.floor(t / 6);
  const rng = mulberry32(hashSeed(layer.id + ':bolt:' + cycle));
  const start = rng() * 4.5;
  const lt = t - cycle * 6;
  return (lt >= start && lt < start + 0.09) || (lt >= start + 0.22 && lt < start + 0.34);
}

/* ------------------------------ river ----------------------------------- */

export function riverBand(stage) {
  const h = H(stage);
  return { y: Math.round(h * 0.82), h: Math.round(h * 0.18) };
}

export function fishAt(layer, tSec, stage, idx) {
  const w = W(stage);
  const band = riverBand(stage);
  const t = Math.max(0, tSec || 0);
  const dir = idx % 2 === 0 ? 1 : -1;
  const speed = 26 * (idx + 1);
  const span = w + 160;
  let x = ((t * speed) % span) - 80;
  if (dir < 0) x = w - x;
  const y = band.y + band.h * (0.35 + 0.22 * idx) + Math.sin(t * 2 + idx * 1.7) * 4;
  return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, dir };
}

/* ------------------------------ birds ----------------------------------- */

/**
 * Phase 10B: sanitise a birds layer's custom flock path
 * (layer.fxPath = { points: [{ x, y }] } in STAGE coordinates, editor
 * caps it at 6 points). Returns null when there is no usable path —
 * birdFlock then falls back to the Phase-6A sine sweep. Pure.
 */
export function normalizeFxPath(fx) {
  if (!fx || !Array.isArray(fx.points)) return null;
  const points = fx.points
    .filter((p) => p && Number.isFinite(p.x) && Number.isFinite(p.y))
    .map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) }))
    .slice(0, 6);
  return points.length ? { points } : null;
}

/** Total length of a polyline through [{x,y}…] (0 for <2 points). Pure. */
export function polylineLength(points) {
  if (!Array.isArray(points) || points.length < 2) return 0;
  let sum = 0;
  for (let i = 0; i < points.length - 1; i++) {
    sum += Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
  }
  return sum;
}

/**
 * Point at arc-length fraction `frac` (0..1) along a polyline —
 * uniform-speed travel regardless of how far apart the points sit.
 * Returns null for degenerate input. Pure (unit-tested).
 */
export function polylinePointAt(points, frac) {
  if (!Array.isArray(points) || points.length === 0) return null;
  if (points.length === 1) return { x: points[0].x, y: points[0].y };
  const total = polylineLength(points);
  if (total <= 0) return { x: points[0].x, y: points[0].y };
  let d = Math.min(1, Math.max(0, Number.isFinite(frac) ? frac : 0)) * total;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (d <= seg || i === points.length - 2) {
      const f = seg > 0 ? Math.min(1, d / seg) : 0;
      return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
    }
    d -= seg;
  }
  const last = points[points.length - 1];
  return { x: last.x, y: last.y };
}

export function birdFlock(layer, tSec, stage) {
  const w = W(stage);
  const intensity = clampI(layer.intensity);
  const count = particleCount('birds', intensity);
  const t = Math.max(0, tSec || 0);
  const dur = 30 - intensity * 3; /* crossing takes 27/24/21 s */
  const p = (t % dur) / dur;
  /* Phase 10B: with a custom flock path (≥2 points) the flock travels
     the polyline at uniform arc-length speed, looping; each bird
     trails the head by a fixed arc distance and keeps the same
     V-formation offsets + flap as the sine sweep. */
  const fx = normalizeFxPath(layer.fxPath);
  if (fx && fx.points.length >= 2) {
    const total = polylineLength(fx.points);
    const spacing = 38; /* arc px between neighbouring birds */
    const out = [];
    for (let i = 0; i < count; i++) {
      const col = i % 4, row = Math.floor(i / 4);
      const frac = (((p - (i * spacing) / Math.max(total, 1)) % 1) + 1) % 1;
      const hp = polylinePointAt(fx.points, frac);
      out.push({
        x: Math.round((hp.x + row * 8) * 10) / 10,
        y: Math.round((hp.y + row * 26 + Math.sin(t * 1.7 + i) * 5) * 10) / 10,
        flap: Math.round(Math.sin(t * 10 + i * 1.2) * 100) / 100,
        size: 1 + (i % 3) * 0.15
      });
    }
    return out;
  }
  const headX = -120 + p * (w + 240);
  const out = [];
  for (let i = 0; i < count; i++) {
    const col = i % 4, row = Math.floor(i / 4);
    out.push({
      x: Math.round((headX - col * 34 - row * 10) * 10) / 10,
      y: Math.round((90 + row * 30 + col * 8 + Math.sin(t * 1.7 + i) * 6) * 10) / 10,
      flap: Math.round(Math.sin(t * 10 + i * 1.2) * 100) / 100,
      size: 1 + (i % 3) * 0.15
    });
  }
  return out;
}

/* ------------------------------ leaves ---------------------------------- */

export function leafParticles(layer, tSec, stage) {
  const w = W(stage), h = H(stage);
  const count = particleCount('leaves', clampI(layer.intensity));
  const rng = mulberry32(hashSeed(layer.id + ':leaves'));
  const t = Math.max(0, tSec || 0);
  const out = [];
  for (let i = 0; i < count; i++) {
    const bx = rng() * w;
    const speed = 28 + rng() * 30;
    const swayAmp = 20 + rng() * 30;
    const swayFreq = 0.8 + rng();
    const phase = rng() * Math.PI * 2;
    const phase0 = rng() * (h + 40);
    const size = 5 + rng() * 5;
    const y = ((phase0 + t * speed) % (h + 40)) - 20;
    const x = bx + Math.sin(t * swayFreq + phase) * swayAmp;
    out.push({
      x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10,
      size: Math.round(size * 10) / 10,
      rot: Math.round(Math.sin(t * 1.3 + phase) * 100) / 100,
      hue: i % 3
    });
  }
  return out;
}

/* ------------------------------ sparkle --------------------------------- */

export function sparklePoints(layer, tSec, stage) {
  const w = W(stage), h = H(stage);
  const count = particleCount('sparkle', clampI(layer.intensity));
  const rng = mulberry32(hashSeed(layer.id + ':sparkle'));
  const t = Math.max(0, tSec || 0);
  const out = [];
  for (let i = 0; i < count; i++) {
    const x = rng() * w;
    const y = rng() * h * 0.85;
    const phase = rng() * Math.PI * 2;
    const base = 3 + rng() * 4;
    const tw = (Math.sin(t * 2.2 + phase) + 1) / 2;
    out.push({
      x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10,
      r: Math.round(base * (0.7 + 0.3 * tw) * 10) / 10,
      alpha: Math.round(Math.pow(tw, 3) * 100) / 100
    });
  }
  return out;
}

/* ------------------------------ clouds ---------------------------------- */

export function cloudBlobs(layer, tSec, stage) {
  const w = W(stage);
  const count = particleCount('clouds', clampI(layer.intensity));
  const rng = mulberry32(hashSeed(layer.id + ':clouds'));
  const t = Math.max(0, tSec || 0);
  const out = [];
  for (let i = 0; i < count; i++) {
    const bx = rng() * w;
    const y = 30 + rng() * 110;
    const scale = 0.7 + rng() * 0.9;
    const speed = 6 + rng() * 8 + clampI(layer.intensity) * 1.5;
    const x = ((bx + t * speed) % (w + 360)) - 180;
    out.push({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, scale: Math.round(scale * 100) / 100 });
  }
  return out;
}

/* ------------------------------ drawing --------------------------------- */

function drawBirdGlyph(ctx, b) {
  const s = b.size * 1.4;
  const wing = b.flap * 5;
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(-10, 0);
  ctx.quadraticCurveTo(-5, -4 - wing, 0, 0);
  ctx.quadraticCurveTo(5, -4 - wing, 10, 0);
  ctx.strokeStyle = 'rgba(20,26,38,0.8)';
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();
}

function drawFish(ctx, f) {
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.scale(f.dir, 1);
  ctx.fillStyle = 'rgba(12,38,54,0.6)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 17, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-15, 0);
  ctx.lineTo(-25, -6);
  ctx.lineTo(-25, 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * Draw one effect layer in STAGE coordinates at absolute scene time
 * `tSec`. Called by the editor renderer in stack order, so effects can
 * sit over or between artwork layers.
 */
export function drawEffect(ctx, layer, tSec, stage) {
  const w = W(stage), h = H(stage);
  const t = Math.max(0, tSec || 0);
  switch (layer.effect) {
    case 'rain': {
      if (lightningOn(layer, t)) {
        ctx.fillStyle = 'rgba(255,255,255,0.28)';
        ctx.fillRect(0, 0, w, h);
      }
      ctx.strokeStyle = 'rgba(174,194,224,0.5)';
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (const s of rainStreaks(layer, t, stage)) {
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x + s.len * 0.18, s.y + s.len);
      }
      ctx.stroke();
      break;
    }
    case 'river': {
      const band = riverBand(stage);
      const grad = ctx.createLinearGradient(0, band.y, 0, h);
      grad.addColorStop(0, 'rgba(29,111,142,0.88)');
      grad.addColorStop(1, 'rgba(16,62,92,0.94)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, band.y, w, band.h);
      ctx.strokeStyle = 'rgba(255,255,255,0.20)';
      ctx.lineWidth = 2;
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        const baseY = band.y + 14 + k * (band.h / 3.2);
        for (let x = 0; x <= w; x += 16) {
          const y = baseY + Math.sin(x * 0.02 + t * 2 + k * 1.4) * 3;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      drawFish(ctx, fishAt(layer, t, stage, 0));
      drawFish(ctx, fishAt(layer, t, stage, 1));
      break;
    }
    case 'birds': {
      for (const b of birdFlock(layer, t, stage)) drawBirdGlyph(ctx, b);
      break;
    }
    case 'leaves': {
      const colors = ['rgba(106,168,79,0.9)', 'rgba(217,164,65,0.9)', 'rgba(84,140,60,0.9)'];
      for (const lf of leafParticles(layer, t, stage)) {
        ctx.save();
        ctx.translate(lf.x, lf.y);
        ctx.rotate(lf.rot);
        ctx.fillStyle = colors[lf.hue];
        ctx.beginPath();
        ctx.ellipse(0, 0, lf.size, lf.size * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      break;
    }
    case 'sparkle': {
      for (const sp of sparklePoints(layer, t, stage)) {
        if (sp.alpha <= 0.02) continue;
        ctx.save();
        ctx.translate(sp.x, sp.y);
        ctx.globalAlpha = sp.alpha;
        ctx.fillStyle = '#ffe9a8';
        const r = sp.r, q = r * 0.28;
        ctx.beginPath();
        ctx.moveTo(0, -r); ctx.lineTo(q, -q); ctx.lineTo(r, 0); ctx.lineTo(q, q);
        ctx.lineTo(0, r); ctx.lineTo(-q, q); ctx.lineTo(-r, 0); ctx.lineTo(-q, -q);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      break;
    }
    case 'clouds': {
      for (const c of cloudBlobs(layer, t, stage)) {
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.scale(c.scale, c.scale);
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.beginPath();
        ctx.ellipse(0, 0, 95, 26, 0, 0, Math.PI * 2);
        ctx.ellipse(-52, 8, 55, 18, 0, 0, Math.PI * 2);
        ctx.ellipse(54, 8, 60, 19, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.13)';
        ctx.beginPath();
        ctx.ellipse(0, -13, 55, 20, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      break;
    }
    default:
      break;
  }
}

/* Cartoon Studio — imaging helpers (Phase 6A).
   Pure, DOM-free math so it can be unit-tested in Node:
   - keyOut(): chroma-key a solid background colour out of an ImageData
     (the White Background Remover). Works on any { data } shaped object.
   - Sprite-sheet frame math (Sprite Sheet Studio + sprite layers).
   - Video-clip time math (local video layers loop inside their clip).
   The canvas plumbing that feeds these lives in editor.js. */

/* ------------------------------ chroma key ------------------------------- */

/**
 * Key a solid colour out of an image, in place.
 * `key` is { r, g, b } (0–255). For each pixel the RGB distance to the
 * key colour decides the new alpha:
 *   distance <= tolerance            → fully transparent
 *   distance >= tolerance + softness → fully opaque (unchanged)
 *   in between                       → smoothstep feather band
 * The existing alpha is MULTIPLIED by the factor, so already-transparent
 * pixels stay transparent. Returns the same imageData for chaining.
 */
export function keyOut(imageData, key, tolerance = 60, softness = 40) {
  if (!imageData || !imageData.data) return imageData;
  const data = imageData.data;
  const kr = key && Number.isFinite(key.r) ? key.r : 255;
  const kg = key && Number.isFinite(key.g) ? key.g : 255;
  const kb = key && Number.isFinite(key.b) ? key.b : 255;
  const tol = Math.max(0, Number.isFinite(tolerance) ? tolerance : 60);
  const soft = Math.max(1, Number.isFinite(softness) ? softness : 40);
  for (let i = 0; i + 3 < data.length; i += 4) {
    const dr = data[i] - kr;
    const dg = data[i + 1] - kg;
    const db = data[i + 2] - kb;
    const dist = Math.sqrt(dr * dr + dg * dg + db * db);
    let a;
    if (dist <= tol) a = 0;
    else if (dist >= tol + soft) a = 1;
    else {
      const f = (dist - tol) / soft;
      a = f * f * (3 - 2 * f); /* smoothstep */
    }
    if (a < 1) data[i + 3] = Math.round(data[i + 3] * a);
  }
  return imageData;
}

/* ----------------------------- sprite sheets ----------------------------- */

/**
 * Frame index shown at a local clip time. Frames advance at `fps`
 * (clamped 1–30) and loop over `count` frames. Pure.
 */
export function spriteFrameAt(localSec, fps, count) {
  const n = Math.max(1, Math.floor(count) || 1);
  const f = Math.min(30, Math.max(1, Number.isFinite(fps) ? fps : 12));
  const t = Math.max(0, Number.isFinite(localSec) ? localSec : 0);
  return Math.floor(t * f) % n;
}

/**
 * Source rectangle of frame `index` in a cols×rows sheet.
 * Frames are numbered left-to-right, top-to-bottom. Pure.
 */
export function spriteFrameRect(sheetW, sheetH, cols, rows, index) {
  const c = Math.max(1, Math.floor(cols) || 1);
  const r = Math.max(1, Math.floor(rows) || 1);
  const sw = sheetW / c;
  const sh = sheetH / r;
  const i = Math.max(0, Math.floor(index) || 0);
  const col = i % c;
  const row = Math.floor(i / c) % r;
  return { sx: col * sw, sy: row * sh, sw, sh };
}

/* ------------------------------- video time ------------------------------ */

/**
 * Source time (seconds) a video layer shows at local clip time
 * `localSec`, given the clip's source `offsetSec` and the media
 * duration. When the media is shorter than the clip it LOOPS:
 * the returned time wraps modulo the media duration. When the media
 * duration is unknown (0), no wrapping is applied. Pure.
 */
export function videoTimeAt(localSec, offsetSec, mediaDurSec) {
  const local = Math.max(0, Number.isFinite(localSec) ? localSec : 0);
  const off = Math.max(0, Number.isFinite(offsetSec) ? offsetSec : 0);
  const dur = Number.isFinite(mediaDurSec) && mediaDurSec > 0 ? mediaDurSec : 0;
  let t = off + local;
  if (dur > 0 && t >= dur) t = t % dur;
  return Math.round(t * 1000) / 1000;
}

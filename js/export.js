/* Cartoon Studio — video export helpers (Phase 7).
   PURE, DOM-free helpers (unit-tested in Node): the export plan
   (durations / audio / emptiness across scenes), the resolution +
   bitrate table, the download-filename sanitiser and the
   MediaRecorder mime-type preference picker.

   The recording itself lives in js/editor.js: it plays the project
   through the editor's own canvas in an "export mode" (backing store
   at the export resolution, editor overlays + name labels off) and
   captures canvas.captureStream + the audio engine's export bus with
   a MediaRecorder → WebM. MP4 is a post-step: ffmpeg.wasm is loaded
   lazily from a CDN only when the user asks for MP4 (never vendored,
   never precached — see editor.js). */

/** Export quality presets — the reference offers exactly these two
    resolutions; 1080p gets a 30/60 fps choice. Bitrates are the
    MediaRecorder videoBitsPerSecond targets. */
export const EXPORT_PRESETS = [
  { id: '720p30', label: '720p HD', detail: '1280×720 · 30 FPS', note: 'Mobile Friendly', w: 1280, h: 720, fps: 30, bitrate: 8000000, tag: '720p' },
  { id: '1080p30', label: '1080p Full HD', detail: '1920×1080 · 30 FPS', note: 'Studio quality', w: 1920, h: 1080, fps: 30, bitrate: 12000000, tag: '1080p' },
  { id: '1080p60', label: '1080p Full HD', detail: '1920×1080 · 60 FPS', note: 'Studio Master', w: 1920, h: 1080, fps: 60, bitrate: 20000000, tag: '1080p' }
];

/* Phase 8: export presets follow the PROJECT ASPECT (chosen at
   creation). 16:9 keeps the exact Phase-7 table above; 9:16 (Shorts)
   and 1:1 get the same HD / Full HD ladder at their own dimensions —
   labels are 'HD' / 'Full HD' by short side. Ids stay stable across
   aspects where the short side matches ('720p30', '1080p30',
   '1080p60'), so a remembered preset id still resolves.
   Phase 10B: every aspect gains a 4K UHD rung ('4k30', 30 FPS) — the
   reference gates 4K behind Pro; here it is free like everything
   else. 4K recording is heavy (45 Mbps for 16:9/9:16, 30 Mbps for
   1:1); the export dialog says so next to the option. */
export const EXPORT_PRESETS_BY_ASPECT = {
  '16:9': [
    ...EXPORT_PRESETS,
    { id: '4k30', label: '4K UHD', detail: '3840×2160 · 30 FPS', note: 'Maximum quality — heavy, see note below', w: 3840, h: 2160, fps: 30, bitrate: 45000000, tag: '4k' }
  ],
  '9:16': [
    { id: '720p30', label: 'HD', detail: '720×1280 · 30 FPS', note: 'Mobile Friendly', w: 720, h: 1280, fps: 30, bitrate: 8000000, tag: '720p' },
    { id: '1080p30', label: 'Full HD', detail: '1080×1920 · 30 FPS', note: 'Studio quality', w: 1080, h: 1920, fps: 30, bitrate: 12000000, tag: '1080p' },
    { id: '1080p60', label: 'Full HD', detail: '1080×1920 · 60 FPS', note: 'Studio Master', w: 1080, h: 1920, fps: 60, bitrate: 20000000, tag: '1080p' },
    { id: '4k30', label: '4K UHD', detail: '2160×3840 · 30 FPS', note: 'Maximum quality — heavy, see note below', w: 2160, h: 3840, fps: 30, bitrate: 45000000, tag: '4k' }
  ],
  '1:1': [
    { id: '960p30', label: 'HD', detail: '960×960 · 30 FPS', note: 'Mobile Friendly', w: 960, h: 960, fps: 30, bitrate: 8000000, tag: '960p' },
    { id: '1080p30', label: 'Full HD', detail: '1080×1080 · 30 FPS', note: 'Studio quality', w: 1080, h: 1080, fps: 30, bitrate: 12000000, tag: '1080p' },
    { id: '1080p60', label: 'Full HD', detail: '1080×1080 · 60 FPS', note: 'Studio Master', w: 1080, h: 1080, fps: 60, bitrate: 20000000, tag: '1080p' },
    { id: '4k30', label: '4K UHD', detail: '2160×2160 · 30 FPS', note: 'Maximum quality — heavy, see note below', w: 2160, h: 2160, fps: 30, bitrate: 30000000, tag: '4k' }
  ]
};

/** The preset ladder for a project aspect ('16:9' for anything else). */
export function exportPresetsFor(aspect) {
  return EXPORT_PRESETS_BY_ASPECT[aspect] || EXPORT_PRESETS;
}

export function presetById(id, aspect) {
  const list = exportPresetsFor(aspect);
  return list.find((p) => p.id === id) ||
    EXPORT_PRESETS.find((p) => p.id === id) || list[0];
}

/** MediaRecorder mime preference order (best first). */
export const MIME_PREFERENCE = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm'
];

/**
 * Pick the first mime type the environment supports.
 * `isTypeSupported` is injected (MediaRecorder.isTypeSupported in the
 * browser, a fake in tests). Returns '' when nothing matches — the
 * caller then constructs MediaRecorder without a mimeType and lets
 * the browser choose its default.
 */
export function pickMimeType(isTypeSupported) {
  if (typeof isTypeSupported !== 'function') return '';
  for (const mime of MIME_PREFERENCE) {
    try { if (isTypeSupported(mime)) return mime; } catch { /* keep looking */ }
  }
  return '';
}

/**
 * Compute the export plan for a project: total duration (sum of scene
 * durations), layer/audio tallies and whether the project is empty.
 * Scenes with a non-positive duration contribute 0.
 */
export function computeExportPlan(project) {
  const scenes = project && Array.isArray(project.scenes) ? project.scenes : [];
  let totalSec = 0;
  let layerCount = 0;
  let hasAudio = false;
  const sceneList = scenes.map((s, i) => {
    const dur = Number.isFinite(s.durationSec) && s.durationSec > 0 ? s.durationSec : 0;
    totalSec += dur;
    const ls = Array.isArray(s.layers) ? s.layers : [];
    layerCount += ls.length;
    if (ls.some((l) => l && l.kind === 'audio' && l.mediaId)) hasAudio = true;
    return { name: s.name || 'Scene ' + (i + 1), durationSec: dur, layerCount: ls.length };
  });
  return {
    totalSec: Math.round(totalSec * 1000) / 1000,
    sceneCount: scenes.length,
    scenes: sceneList,
    layerCount,
    hasAudio,
    isEmpty: layerCount === 0
  };
}

/** Cumulative duration of all scenes BEFORE index `idx` (progress math). */
export function durationBefore(plan, idx) {
  if (!plan || !Array.isArray(plan.scenes)) return 0;
  let sum = 0;
  for (let i = 0; i < idx && i < plan.scenes.length; i++) sum += plan.scenes[i].durationSec || 0;
  return sum;
}

/** Elapsed / total as a 0..1 fraction (0 when total is 0). */
export function progressFraction(elapsedSec, totalSec) {
  if (!Number.isFinite(totalSec) || totalSec <= 0) return 0;
  const f = (Number.isFinite(elapsedSec) ? elapsedSec : 0) / totalSec;
  return Math.min(1, Math.max(0, f));
}

/**
 * Sanitise a project name into a safe download filename base:
 * path-hostile characters ( / \ : * ? " < > | ) and control chars are
 * removed, whitespace collapses to single spaces, leading/trailing
 * dots and spaces are trimmed, and the result is capped at 80 chars.
 * Bangla (and any other Unicode letters) are kept — they are valid in
 * filenames. Empty result falls back to 'cartoon-video'.
 */
export function sanitizeFilename(name) {
  let s = String(name == null ? '' : name);
  s = s.replace(/[\u0000-\u001f\u007f]/g, ' ');          // control chars
  s = s.replace(/[\\/:*?"<>|]/g, '');                    // path-hostile
  s = s.replace(/\s+/g, ' ').trim();                     // collapse spaces
  s = s.replace(/^[. ]+/, '').replace(/[. ]+$/, '');     // edge dots/spaces
  if (s.length > 80) s = s.slice(0, 80).trim();
  return s || 'cartoon-video';
}

/** Full download filename: `<project>-<tag>.<ext>` (tag = 720p/1080p). */
export function exportFilename(projectName, preset, ext) {
  const tag = preset && preset.tag ? preset.tag : '720p';
  const cleanExt = String(ext || 'webm').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'webm';
  return sanitizeFilename(projectName) + '-' + tag + '.' + cleanExt;
}

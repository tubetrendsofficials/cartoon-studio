/* Cartoon Studio — editor core (Phases 2–8, 10B).
   Canvas stage (logical size per project aspect — 16:9 = 1280×720,
   9:16 = 720×1280, 1:1 = 960×960; see stageDims), left panel rail (12 panels),
   timeline with layer tracks/clips, scenes, transport, undo/redo, and the
   Phase 4 animation engine: AI Animate presets, motion paths, animation
   speed, Talk mouth flap, camera keyframes and scene transitions.
   All animation MATH lives in js/anim.js (pure, unit-tested); this file
   wires it into the renderer, the tools UI and playback.

   DATA-MODEL CHOICE (Phase 2): the timeline ruler shows the ACTIVE scene's
   duration (scene.durationSec). Each scene owns its layer list. The project's
   legacy `durationSec` field is kept in sync with the SUM of scene durations
   on every save, and `tracks` is kept as a flat mirror of all layers so the
   Phase-1 dashboard/import code keeps working. Scenes: Add Scene appends a
   30 s scene.

   PHASE 4 NOTES:
   - layer.anim (see anim.js) is evaluated by the renderer at the playhead's
     local clip time: path position → preset offsets → pose cycling.
   - Camera: the Camera layer's `camera.keys` are interpolated during
     playback and the result is applied as a real transform of the stage.
   - Scene transitions: transport stays per-scene, but playback AUTO-ADVANCES
     into the next scene when the active one ends; if that scene's
     `transitionIn` is 'fade', a 300 ms fade-from-black overlay is drawn at
     the switch (renderer state S.fadeStart).

   PHASE 5 NOTES:
   - Audio layers (kind 'audio') reference media-store items by id
     (layer.mediaId); blobs live in IndexedDB (db.js 'media' store),
     never inside project JSON. Waveform peaks are computed once per
     media id via js/audio.js and cached in S.peaks.
   - Playback sync: the AudioEngine is (re)scheduled from the playhead
     on Play, on seek-while-playing, and on any renderAll while playing
     (which covers scene auto-advance); Pause stops all voices.
   - The row "Hide" button means MUTE on audio layers (layer.muted).

   PHASE 6A NOTES:
   - Local panel: offline uploads gallery (image/video/audio/GIF/sprite
     sheets), all stored in the same media store — nothing ever leaves
     the device. Visual layers: 'image' {mediaId}, 'video' {mediaId,
     offsetSec} (an HTMLVideoElement per layer, synced to the playhead
     by js/imaging.js videoTimeAt; loops inside its clip), 'sprite'
     {mediaId, cols, rows, count, fps} (frame from spriteFrameAt).
   - Tools (Sprite Sheet Studio, White BG Remover, Eraser) live inside
     their panel drawers; their working state sits in S.spriteWork /
     S.bgTool / S.erTool so drawer re-renders can remount the canvases
     (see mountTools). Processed results are saved as media kind
     'processed' and added as ordinary image layers.
   - Effect layers (kind 'effect') are drawn by js/effects.js in stage
     space, in stack order — deterministic in scene time, so scrubbing
     is exact. They have no stage box (not draggable).

   PHASE 6B NOTES:
   - Character Studio (js/charbuilder.js): parametric builder; custom
     characters are media-store records (kind 'custom-character', no
     blob) referenced as assetId 'custom:<id>'. getCharacterDef resolves
     library + custom ids through one path; the renderer generates the
     pose SVG → Blob URL → Image via a per-session cache. A deleted
     custom character flags its layers MISSING MEDIA (timeline + stage).
   - Adjust & Mask for visual layers: layer.adjust {b,c,s} applied via
     ctx.filter, layer.opacity via globalAlpha, layer.mask clips the
     layer box (none/rect/rounded/squircle/circle/star/heart). Mood
     presets set adjust combos in one click.
   - Wearables (layer.wearables): original SVG overlays from
     charbuilder.js, anchored to the character box by fraction, drawn
     above the artwork and flipped with the layer.
   - Tutorial panel: 6 bundled Bangla step guides (offline). Cinema
     panel: link card out to the sister site gotocinema.net.

   PHASE 7 NOTES:
   - Export renders through THIS canvas: S.exportMode switches the
     backing store to the export resolution and maps the stage onto
     the full frame exactly (no workspace pan/zoom/DPR), while all
     editor-only overlays (selection outline, path preview, camera
     pill, safe-area guide) and the drawLabel name tags are suppressed
     (module flag EXPORT_LABELS_OFF). Scene-transition fades are
     content and DO export. Playback runs scene 1 → end with the
     normal transport/auto-advance; canvas.captureStream(fps) + the
     AudioEngine export bus (master-gain tee into a
     MediaStreamAudioDestinationNode) feed ONE MediaRecorder → WebM.
   - MP4 is a post-step: ffmpeg.wasm loads lazily from the jsdelivr
     CDN only when MP4 is chosen (never vendored, never precached);
     the WebM always remains downloadable if conversion fails.

   PHASE 8 NOTES (our extras — the reference does NOT have these):
   - Project aspects 16:9 / 9:16 / 1:1: the stage size is per-project
     (stageDims(project)); the aspect is chosen on the dashboard at
     creation and fixed afterwards. All stage geometry (view fit,
     camera centre, safe area, path/drag clamps, layer spawn points,
     background fill, effect stage, export frame mapping) derives from
     it. Module-level renderer helpers read ACTIVE_STAGE, which the
     session keeps in sync; it defaults to 16:9, so 16:9 projects —
     including every project saved before Phase 8 — render identically.
   - Text layers (kind 'text') and subtitle layers (kind 'subtitle')
     are drawn by drawTextLayer / drawSubtitleLayer using the pure
     wrap heuristic in js/text.js. Subtitles are pinned to the bottom
     centre (their x/y are ignored and dragging is disabled). Text is
     never mirrored by flipX (unreadable), unlike artwork.
   - TTS preview (Web Speech API) lives in the text tools block:
     Speak now, voice + rate, and an opt-in auto-speak while preview
     playing. It is a PREVIEW AID ONLY — speech is cancelled on
     pause/seek/scene switch and ttsSpeak() hard-refuses to run while
     S.exportMode is on, so the computer voice can never leak into an
     exported video.

   PHASE 10B NOTES (final feature mop-up):
   - Amplitude lip-sync (parity 4.10, OUR extra): character layers
     carry layer.lipSync ('auto' | 'timed', default 'auto'). In Talk
     mode with 'auto', while an audio clip is sounding at the
     playhead the mouth pose follows the AudioEngine's live level
     (anim.js mouthPoseForLevel, 90 ms anti-flicker hold); with no
     audio sounding — or 'timed' chosen — the Phase-4 6 Hz flap runs.
     Export uses the same evaluation, so lip-sync bakes into videos.
   - Shapes (parity 19.2, OUR extra): kind 'shape' layers — a 200×200
     box drawn as rect/circle/triangle/star/heart/arrow with fill +
     optional stroke; draggable/scalable/flippable like artwork, and
     Adjust + AI Animate presets/paths apply.
   - Birds flock path: a birds effect layer may carry layer.fxPath
     { points: [{x,y}] } (stage coords, max 6) edited on the canvas
     like a motion path (S.fxPathEdit); effects.js then flies the
     flock along the polyline instead of the sine sweep.
   - Character Studio Pose Lab: joint sliders (head tilt / arms / leg
     spread) over the stand rendering; "Save as Custom Pose" stores
     { id: 'customN', label, mods } on the character record
     (record.poses) — pose chips then offer the custom poses and the
     renderer builds them via charbuilder with the mods.
   - 4K export presets live in js/export.js (per aspect). */

import { getProject, putProject, getMedia, putMedia, listMedia, deleteMedia, putCustomChar, listCustomChars, deleteCustomChar } from './db.js';
import {
  CUSTOM_PREFIX, CHARACTER_POSES, SKIN_TONES, HAIR_STYLES, HAIR_COLORS,
  TOP_STYLES, BOTTOM_STYLES, ACCESSORIES, TOP_COLORS, BOTTOM_COLORS,
  WEARABLES, WEARABLE_IDS, defaultCharParams, normalizeCharParams,
  POSE_MOD_LIMITS, defaultPoseMods, normalizePoseMods, normalizeCustomPoses, poseModsAreNeutral,
  buildCharacterSVG, characterPreviewUri, isCustomAssetId, resolveCharacterDef
} from './charbuilder.js';
import { uid, escapeHtml, clamp, formatTimecode, formatDateTime, formatBytes } from './utils.js';
import { AudioEngine, SFX_DEFS, renderSfxBuffer, sfxWavBlob, splitAudioAt, trimLeftAudio } from './audio.js';
import {
  loadAssets, assetsSync, findCharacter, findBackground, findProp,
  layerAssetFile, assetNaturalSize, peekAssetImage, assetUrl
} from './assets.js';
import {
  PRESETS, presetLabel, normalizeAnim, normalizeCamera, presetTransform,
  talkPoseAt, mouthPoseForLevel, normalizeLipSync, pathPointAt, retimePathPoints, cameraAt
} from './anim.js';
import { keyOut, spriteFrameAt, spriteFrameRect, videoTimeAt } from './imaging.js';
import { EFFECT_DEFS, EFFECT_IDS, drawEffect, normalizeFxPath } from './effects.js';
import { exportPresetsFor, presetById, computeExportPlan, durationBefore, progressFraction, exportFilename, pickMimeType } from './export.js';
import { wrapForBox, textWrapWidth, subtitleWrapWidth, textLayerBox, subtitleLayerBox } from './text.js';

export const STAGE_W = 1280;
export const STAGE_H = 720;

/* Phase 8: logical stage size per project aspect. STAGE_W/STAGE_H stay
   exported as the 16:9 defaults; everything geometric in the editor
   goes through stageDims(project) (or ACTIVE_STAGE in the module-level
   renderer helpers below). */
export const STAGE_DIMS = {
  '16:9': { w: STAGE_W, h: STAGE_H },
  '9:16': { w: 720, h: 1280 },
  '1:1': { w: 960, h: 960 }
};
export const ASPECTS = Object.keys(STAGE_DIMS);

export function stageDims(project) {
  const aspect = typeof project === 'string' ? project : (project && project.aspect);
  return STAGE_DIMS[aspect] || STAGE_DIMS['16:9'];
}

/* The stage size of the project currently open in the editor. One
   editor session runs at a time; renderEditor/renderCanvas publish
   the open project's dims here for the module-level helpers
   (drawLayerShape, layerBox, assetDrawSize…). Defaults to 16:9. */
let ACTIVE_STAGE = { w: STAGE_W, h: STAGE_H };
export function activeStageDims() { return ACTIVE_STAGE; }
function setActiveStage(dims) { ACTIVE_STAGE = { w: dims.w, h: dims.h }; }

const APP_VERSION = 'v0.10.3 · Phases 0–8 + 10';
const HISTORY_CAP = 50;

/* The 12 reference panels. `note` = honest phase note shown in the drawer. */
const PANELS = [
  { id: 'character', label: 'Character', note: 'Original character library: all 33 reference roles covered, plus our one extra — Mishuk (Auto Rickshaw) — 34 entries in total. Built-in library is read-only — your projects can always use every character free.' },
  { id: 'media', label: 'Media', note: 'Backgrounds library — 10 scenes in v1 (21 in Phase 10) · Audio: voice recording, local library & uploads — Phase 5' },
  { id: 'local', label: 'Local', note: 'Offline uploads gallery — everything is stored only on this device (IndexedDB); nothing is uploaded anywhere.' },
  { id: 'effect', label: 'Effect', note: 'Canvas effects as layers: Rain (3 intensities + lightning), River, Birds, Leaves, Sparkle, Clouds — deterministic, they render identically when scrubbing.' },
  { id: 'studio', label: 'Studio', note: 'Character Studio — a parametric builder: appearance + 7 generated poses per character, plus the Pose Lab (basic joint sliders for your own poses). Completely FREE here; in the reference app this studio is Pro-gated.' },
  { id: 'assets', label: 'Asset Library', note: 'Props & assets — 20 core props in v1, full 49 in the Phase 10 expansion' },
  { id: 'sprite', label: 'Sprite Sheet', note: 'Sprite Sheet Studio — slice a sheet, preview with onion skin, save as a character and add it to the scene. Works fully offline.' },
  { id: 'sounds', label: 'Sounds', note: 'Sound-effects library — 11 effects synthesized with Web Audio and stored locally as WAV: Rain, Birds, Wind, Thunder, River + Sheep, Rooster, Cat, Frog, Farm Mix, Morning Birds' },
  { id: 'animik', label: 'Anim IK', note: 'White Background Remover — works offline; key out white (or any picked colour) and export a transparent PNG.' },
  { id: 'eraser', label: 'Eraser', note: 'Eraser — offline photo editor. Offline Ready: your photo never leaves this device.' },
  { id: 'tutorial', label: 'Tutorial', note: 'Guides are built into the app — no internet needed. (The reference loads its tutorials from Firebase and showed an empty panel; ours are bundled.)' },
  { id: 'cinema', label: 'Cinema', note: 'The streaming site itself is separate and not part of this studio — this panel only links out to it.' }
];

const SAMPLE_DEFS = [
  { kind: 'sample-background', name: 'Sample Background', color: '#2fb36f' },
  { kind: 'sample-character', name: 'Sample Character', color: '#ff8c1a' },
  { kind: 'sample-prop', name: 'Sample Prop', color: '#8b6ff0' }
];

const KIND_LABEL = {
  'sample-background': 'Background',
  'sample-character': 'Character',
  'sample-prop': 'Prop',
  'background': 'Background',
  'character': 'Character',
  'prop': 'Prop',
  'camera': 'CAMERA',
  'audio': 'Audio',
  'image': 'Image',
  'video': 'Video',
  'sprite': 'Sprite',
  'effect': 'Effect',
  'text': 'Text',
  'subtitle': 'Subtitle',
  'shape': 'Shape'
};

/* Audio media-store kinds (Phase 5) vs visual kinds (Phase 6A). */
const AUDIO_MEDIA_KINDS = ['recording', 'upload', 'sfx'];
const isAudioMedia = (m) => !!m && AUDIO_MEDIA_KINDS.includes(m.kind);

/* Working copies of big images are capped so pixel tools stay fast. */
const TOOL_MAX_DIM = 1600;

/* Default timeline colours for real (Phase 3) asset layers. */
const ASSET_COLOR = { background: '#2fb36f', character: '#ffa726', prop: '#8b6ff0' };

/* ---------- data-model normalisation (Phase-1 projects keep loading) ------- */

/* ----- Phase 6B: Adjust / Mask / Wearables normalisation (pure) ----- */
export const MASK_IDS = ['none', 'rect', 'rounded', 'squircle', 'circle', 'star', 'heart'];

export function normalizeAdjust(a) {
  const o = (a && typeof a === 'object') ? a : {};
  const num = (v, dflt, lo, hi) => (Number.isFinite(v) ? clamp(Math.round(v), lo, hi) : dflt);
  return { b: num(o.b, 100, 50, 150), c: num(o.c, 100, 50, 150), s: num(o.s, 100, 0, 200) };
}

export function normalizeMask(m) {
  return MASK_IDS.includes(m) ? m : 'none';
}

export function normalizeWearables(w) {
  return Array.isArray(w) ? [...new Set(w.filter((id) => WEARABLE_IDS.includes(id)))] : [];
}

/* Mood presets for the Adjust block: one click sets a b/c/s combo. */
export const MOOD_PRESETS = [
  { id: 'warm', label: 'Warm', b: 106, c: 104, s: 124 },
  { id: 'cool', label: 'Cool', b: 100, c: 102, s: 86 },
  { id: 'vintage', label: 'Vintage', b: 104, c: 88, s: 62 },
  { id: 'mono', label: 'Mono', b: 102, c: 106, s: 0 }
];

/* ----- Phase 10B: Shapes tool normalisation (pure, parity 19.2) ----- */
export const SHAPE_KINDS = [
  { id: 'rect', label: 'Rectangle' },
  { id: 'circle', label: 'Circle' },
  { id: 'triangle', label: 'Triangle' },
  { id: 'star', label: 'Star' },
  { id: 'heart', label: 'Heart' },
  { id: 'arrow', label: 'Arrow' }
];
export const SHAPE_IDS = SHAPE_KINDS.map((s) => s.id);
export const SHAPE_FILL_SWATCHES = ['#ffb020', '#d64541', '#2e8b6e', '#4a7fb5', '#e5639a', '#ffffff'];

const isHexColor = (v) => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);

/** Sanitise a shape layer's shape fields (used by defaultLayerFields). */
export function normalizeShapeLayer(layer) {
  const o = (layer && typeof layer === 'object') ? layer : {};
  return {
    shape: SHAPE_IDS.includes(o.shape) ? o.shape : 'rect',
    fill: isHexColor(o.fill) ? o.fill : '#ffb020',
    stroke: isHexColor(o.stroke) ? o.stroke : '#101a30',
    strokeW: Number.isFinite(o.strokeW) ? clamp(Math.round(o.strokeW), 0, 12) : 0
  };
}

/* ----- Phase 6B: custom characters (Character Studio) -----
   Records live in the media store; this module-level map is the single
   registry the (module-level) canvas renderer reads. One editor session
   runs at a time, and refreshCustomChars() inside the session keeps the
   map current (clear + refill, so the reference stays stable). */
export const customCharStore = { map: new Map(), loaded: false };
const customImgCache = new Map(); // `${mediaId}:${poseId}` -> { img, loaded, error, url }
const wearableImgCache = new Map(); // wearableId -> { img, loaded, error, url }

function svgImageEntry(cache, key, svg, onLoad) {
  let entry = cache.get(key);
  if (!entry) {
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    const img = new Image();
    entry = { img, loaded: false, error: false, url };
    cache.set(key, entry);
    img.onload = () => { entry.loaded = true; if (onLoad) onLoad(); };
    img.onerror = () => { entry.error = true; };
    img.src = url;
  }
  return entry;
}

/** Generated pose image for a custom character (null = record missing).
    Phase 10B: a Pose Lab pose id ('customN') renders the STAND pose
    with that pose's saved joint mods. */
function customCharImage(assetId, poseId, onLoad) {
  const mediaId = String(assetId || '').slice(CUSTOM_PREFIX.length);
  const rec = customCharStore.map.get(mediaId);
  if (!rec) return null;
  const labPose = normalizeCustomPoses(rec.poses).find((p) => p.id === poseId);
  if (labPose) {
    return svgImageEntry(customImgCache, mediaId + ':' + labPose.id,
      buildCharacterSVG(rec.params, 'stand', labPose.mods), onLoad);
  }
  const pose = CHARACTER_POSES.some((x) => x.id === poseId) ? poseId : 'stand';
  return svgImageEntry(customImgCache, mediaId + ':' + pose, buildCharacterSVG(rec.params, pose), onLoad);
}

/** Drop cached pose images for a character (after an edit or delete). */
function purgeCustomCharImages(mediaId) {
  for (const [key, entry] of customImgCache) {
    if (key.startsWith(mediaId + ':')) {
      try { URL.revokeObjectURL(entry.url); } catch { /* noop */ }
      customImgCache.delete(key);
    }
  }
}

function wearableImage(id, onLoad) {
  const def = WEARABLES.find((w) => w.id === id);
  if (!def) return null;
  return svgImageEntry(wearableImgCache, id, def.svg, onLoad);
}

/* ----- Phase 6B: Adjust (ctx.filter) + Mask (clip) application ----- */
function applyAdjustFilter(c, layer) {
  const a = layer.adjust;
  if (!a || (a.b === 100 && a.c === 100 && a.s === 100)) return;
  try {
    c.filter = 'brightness(' + (a.b / 100) + ') contrast(' + (a.c / 100) + ') saturate(' + (a.s / 100) + ')';
  } catch { /* ctx.filter unsupported — filter is skipped, alpha still applies */ }
}

function applyMaskClip(c, layer, w, h) {
  const m = layer.mask;
  if (!m || m === 'none') return;
  const x = -w / 2, y = -h / 2;
  if (m === 'rounded' || m === 'squircle') {
    rr(c, x, y, w, h, m === 'rounded' ? Math.min(22, w / 4, h / 4) : Math.min(w, h) * 0.32);
    c.clip();
    return;
  }
  c.beginPath();
  if (m === 'rect') {
    c.rect(x, y, w, h);
  } else if (m === 'circle') {
    const r = Math.min(w, h) / 2;
    c.ellipse(0, 0, r, r, 0, 0, Math.PI * 2);
  } else if (m === 'star') {
    const R = Math.min(w, h) / 2, r2 = R * 0.45;
    for (let i = 0; i < 10; i++) {
      const rad = i % 2 === 0 ? R : r2;
      const a = (Math.PI / 5) * i - Math.PI / 2;
      const px = Math.cos(a) * rad, py = Math.sin(a) * rad;
      if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
    }
    c.closePath();
  } else if (m === 'heart') {
    const s = Math.min(w, h);
    c.moveTo(0, s * 0.38);
    c.bezierCurveTo(-s * 0.55, s * 0.05, -s * 0.42, -s * 0.42, -s * 0.16, -s * 0.42);
    c.bezierCurveTo(-s * 0.04, -s * 0.42, 0, -s * 0.3, 0, -s * 0.2);
    c.bezierCurveTo(0, -s * 0.3, s * 0.04, -s * 0.42, s * 0.16, -s * 0.42);
    c.bezierCurveTo(s * 0.42, -s * 0.42, s * 0.55, s * 0.05, 0, s * 0.38);
    c.closePath();
  }
  c.clip();
}

/* Wearables are drawn inside the layer transform (so they flip with
   the layer), above the character artwork, anchored by box fractions. */
function drawWearables(c, layer, w, h, onLoad) {
  for (const id of layer.wearables || []) {
    const def = WEARABLES.find((x) => x.id === id);
    if (!def) continue;
    const entry = wearableImage(id, onLoad);
    if (!entry || !entry.loaded) continue;
    const dw = w * def.wFrac, dh = dw; /* wearable viewBoxes are square */
    c.drawImage(entry.img, (def.fx - 0.5) * w - dw / 2, (def.fy - 0.5) * h - dh / 2, dw, dh);
  }
}

/* v0.10.2 (live fix): character/prop layers added from a drawer used to
   get a fixed 15 s clip, so in a 2:00 scene they vanished mid-scene
   (seen on the live site: by 00:17 only the background was left), and
   successive adds stacked on nearly the same spot. New character/prop
   layers now span from their start to the END of the scene, and spawn
   with a small cascade offset. The two computations are pure and
   dependency-free so they can be unit-tested headlessly. */
const CHAR_PROP_KINDS = ['character', 'prop', 'sample-character', 'sample-prop'];
const CASCADE_STEP_PX = 28;
const CASCADE_STEPS = 8; /* spawn offsets cycle 0..7 steps (0–196 px) */

function charPropLayerCount(sc) {
  return sc && Array.isArray(sc.layers)
    ? sc.layers.filter((l) => CHAR_PROP_KINDS.includes(l.kind)).length : 0;
}

/* Clip length for a new character/prop layer: from its start to scene end. */
function fullSceneClipDur(startSec, sceneDur) {
  const dur = Number.isFinite(sceneDur) && sceneDur > 0 ? sceneDur : 0;
  const start = Number.isFinite(startSec) ? Math.max(0, Math.min(startSec, dur)) : 0;
  return Math.max(0.5, dur - start);
}

/* Cascade spawn point: base + 28 px diagonally per character/prop layer
   already in the scene, cycling every 8 adds, clamped inside the stage. */
function cascadeSpawnPos(baseX, baseY, priorCount, dims) {
  const w = dims && Number.isFinite(dims.w) && dims.w > 0 ? dims.w : 1280;
  const h = dims && Number.isFinite(dims.h) && dims.h > 0 ? dims.h : 720;
  const n = Number.isFinite(priorCount) && priorCount > 0 ? Math.floor(priorCount) : 0;
  const off = (n % CASCADE_STEPS) * CASCADE_STEP_PX;
  const m = 48; /* keep the spawn centre at least this far inside the stage */
  return {
    x: Math.min(Math.max(baseX + off, m), Math.max(m, w - m)),
    y: Math.min(Math.max(baseY + off, m), Math.max(m, h - m))
  };
}

function defaultLayerFields(layer, sceneDur, dims) {
  const kind = layer.kind || 'sample-prop';
  /* Phase 8: spawn/default position = the stage centre of the project's
     aspect (dims passed by normalizeProject / layer actions; falls back
     to the active stage, which defaults to 16:9 → 640×360 as before). */
  const D = dims || ACTIVE_STAGE;
  return {
    id: layer.id || uid(),
    kind,
    name: layer.name || KIND_LABEL[kind] || 'Layer',
    x: Number.isFinite(layer.x) ? layer.x : D.w / 2,
    y: Number.isFinite(layer.y) ? layer.y : D.h / 2,
    scale: Number.isFinite(layer.scale) && layer.scale > 0 ? layer.scale : 1,
    opacity: Number.isFinite(layer.opacity) ? clamp(layer.opacity, 0, 1) : 1,
    flipX: !!layer.flipX,
    hidden: !!layer.hidden,
    locked: !!layer.locked,
    startSec: Number.isFinite(layer.startSec) ? Math.max(0, layer.startSec) : 0,
    durSec: Number.isFinite(layer.durSec) && layer.durSec > 0 ? layer.durSec : Math.min(10, sceneDur),
    color: layer.color || (SAMPLE_DEFS.find((d) => d.kind === kind) || {}).color || ASSET_COLOR[kind] || '#5b729e',
    /* Phase 3 asset binding: which library asset (+ pose) this layer shows. */
    assetId: layer.assetId || null,
    poseId: layer.poseId || null,
    /* Phase 10A: combo-pack background layers pin one scene variant file
       (validated again in assets.js layerAssetFile). */
    ...(kind === 'background' ? {
      variantFile: typeof layer.variantFile === 'string' ? layer.variantFile : null
    } : {}),
    /* Phase 6B: per-layer image adjust + mask + wearable overlays.
       Projects saved before Phase 6B get the neutral defaults here. */
    adjust: normalizeAdjust(layer.adjust),
    mask: normalizeMask(layer.mask),
    wearables: normalizeWearables(layer.wearables),
    mouthMode: ['idle', 'talk', 'behind'].includes(layer.mouthMode) ? layer.mouthMode : 'idle',
    /* Phase 10B: amplitude lip-sync setting for Talk mode ('auto'
       follows the live audio level; 'timed' is the Phase-4 flap). */
    lipSync: normalizeLipSync(layer.lipSync),
    /* Phase 4 animation data (preset / motion path / speed) — layers saved
       before Phase 4 simply have no `anim` field and get the default here. */
    anim: normalizeAnim(layer.anim),
    /* Phase 4 camera keyframes — only meaningful on camera layers. */
    camera: kind === 'camera' ? normalizeCamera(layer.camera) : undefined,
    /* Phase 5 audio fields — only on audio layers. The blob itself lives
       in the IndexedDB media store; the layer keeps the media id only. */
    ...(kind === 'audio' ? {
      mediaId: layer.mediaId || null,
      offsetSec: Number.isFinite(layer.offsetSec) ? Math.max(0, layer.offsetSec) : 0,
      volume: Number.isFinite(layer.volume) ? clamp(layer.volume, 0, 1) : 1,
      muted: !!layer.muted,
      mediaDurSec: Number.isFinite(layer.mediaDurSec) && layer.mediaDurSec > 0 ? layer.mediaDurSec : null
    } : {}),
    /* Phase 6A visual-media fields — image / video / sprite layers keep
       the media id plus the natural size (so the stage box is right even
       before the blob loads) and, for sprites, the sheet slicing config. */
    ...((kind === 'image' || kind === 'video' || kind === 'sprite') ? {
      mediaId: layer.mediaId || null,
      natW: Number.isFinite(layer.natW) && layer.natW > 0 ? layer.natW : null,
      natH: Number.isFinite(layer.natH) && layer.natH > 0 ? layer.natH : null,
      ...(kind === 'video' ? {
        offsetSec: Number.isFinite(layer.offsetSec) ? Math.max(0, layer.offsetSec) : 0,
        mediaDurSec: Number.isFinite(layer.mediaDurSec) && layer.mediaDurSec > 0 ? layer.mediaDurSec : null
      } : {}),
      ...(kind === 'sprite' ? {
        cols: Number.isFinite(layer.cols) ? clamp(Math.round(layer.cols), 1, 64) : 4,
        rows: Number.isFinite(layer.rows) ? clamp(Math.round(layer.rows), 1, 64) : 1,
        count: Number.isFinite(layer.count) ? clamp(Math.round(layer.count), 1, 4096) : 4,
        fps: Number.isFinite(layer.fps) ? clamp(Math.round(layer.fps), 1, 30) : 12
      } : {})
    } : {}),
    /* Phase 6A effect fields — effect layers are full-stage overlays. */
    ...(kind === 'effect' ? {
      effect: EFFECT_IDS.includes(layer.effect) ? layer.effect : 'rain',
      intensity: [1, 2, 3].includes(layer.intensity) ? layer.intensity : 2,
      lightning: !!layer.lightning,
      /* Phase 10B: optional custom flock path for birds layers
         ({ points: [{x,y}] } in stage coords, max 6 points). */
      fxPath: normalizeFxPath(layer.fxPath)
    } : {}),
    /* Phase 10B shape fields — kind 'shape' layers draw one of the
       SHAPE_KINDS in a 200×200 box (see layerBox / drawShapeLayer). */
    ...(kind === 'shape' ? normalizeShapeLayer(layer) : {}),
    /* Phase 8 text fields — `color` here is the TEXT colour (the
       timeline clip colour for text kinds is fixed in clipColor()). */
    ...(kind === 'text' ? {
      text: typeof layer.text === 'string' ? layer.text : 'Your text',
      fontSize: Number.isFinite(layer.fontSize) ? clamp(Math.round(layer.fontSize), 24, 160) : 64,
      color: typeof layer.color === 'string' && layer.color ? layer.color : '#ffffff',
      bold: layer.bold !== false,
      align: ['left', 'center', 'right'].includes(layer.align) ? layer.align : 'center',
      style: ['plain', 'title', 'bubble'].includes(layer.style) ? layer.style : 'plain'
    } : {}),
    /* Phase 8 subtitle fields — white text on the bottom bar; the
       renderer pins the position, so x/y carry no meaning. */
    ...(kind === 'subtitle' ? {
      text: typeof layer.text === 'string' ? layer.text : 'Subtitle text',
      fontSize: Number.isFinite(layer.fontSize) ? clamp(Math.round(layer.fontSize), 28, 72) : 44
    } : {})
  };
}

export function normalizeProject(project) {
  const p = project;
  /* Phase 8: aspect defaults to (and is validated against) 16:9 —
     projects saved before Phase 8 have no aspect and stay 16:9. */
  if (!STAGE_DIMS[p.aspect]) p.aspect = '16:9';
  const dims = stageDims(p);
  if (!Number.isFinite(p.durationSec) || p.durationSec <= 0) p.durationSec = 120;
  if (!Array.isArray(p.scenes) || p.scenes.length === 0) {
    p.scenes = [{ id: uid(), name: 'Scene 1', durationSec: p.durationSec, layers: [] }];
  }
  p.scenes = p.scenes.map((scene, i) => {
    const dur = Number.isFinite(scene.durationSec) && scene.durationSec > 0
      ? clamp(Math.round(scene.durationSec), 10, 600)
      : (i === 0 ? p.durationSec : 30);
    return {
      id: scene.id || uid(),
      name: scene.name || 'Scene ' + (i + 1),
      durationSec: dur,
      /* Phase 4: how playback enters this scene ('cut' default, or 'fade'). */
      transitionIn: scene.transitionIn === 'fade' ? 'fade' : 'cut',
      layers: (Array.isArray(scene.layers) ? scene.layers : []).map((l) => defaultLayerFields(l, dur, dims))
    };
  });
  syncLegacyFields(p);
  return p;
}

/** Keep legacy Phase-1 fields consistent: durationSec = total, tracks = all layers. */
function syncLegacyFields(p) {
  p.durationSec = p.scenes.reduce((sum, s) => sum + (s.durationSec || 0), 0) || 120;
  p.tracks = p.scenes.flatMap((s) => s.layers);
}

/* ---------- layer geometry / drawing (pure canvas helpers) ----------------- */

/* On-stage size (unscaled) for a Phase-3 asset layer, keeping the asset's
   natural aspect: backgrounds fill the stage, characters stand ~340px tall
   (≈47% of stage height), props ~135px (≈19%). */
function assetDrawSize(layer) {
  /* Phase 6B: custom characters are generated on a 300×480 canvas. */
  if (layer.assetId && isCustomAssetId(layer.assetId)) {
    const h = 340;
    return { w: Math.round(h * (300 / 480)), h };
  }
  const nat = assetNaturalSize(assetsSync(), layer);
  const aspect = nat && nat.h > 0 ? nat.w / nat.h : 1;
  switch (layer.kind) {
    case 'background': return { w: ACTIVE_STAGE.w, h: ACTIVE_STAGE.h };
    case 'character': { const h = 340; return { w: Math.round(h * aspect), h }; }
    case 'prop': { const h = 135; return { w: Math.round(h * aspect), h }; }
    default: return null;
  }
}

/* On-stage size for Phase-6A media layers, keeping natural aspect:
   uploaded images/videos default to ~40% of stage height (288px),
   sprite FRAMES to ~240px tall (frame aspect from the sheet slicing). */
function mediaLayerBox(layer) {
  const natW = layer.natW || 0, natH = layer.natH || 0;
  if (layer.kind === 'sprite') {
    const fw = natW && layer.cols ? natW / layer.cols : 0;
    const fh = natH && layer.rows ? natH / layer.rows : 0;
    const aspect = fw > 0 && fh > 0 ? fw / fh : 1;
    const h = 240;
    return { w: Math.round(h * aspect), h };
  }
  const aspect = natW > 0 && natH > 0 ? natW / natH : 16 / 9;
  const h = 288;
  return { w: Math.round(h * aspect), h };
}

function layerBox(layer) {
  /* Unscaled width/height per kind; camera/effect layers have no box. */
  if (layer.assetId) return assetDrawSize(layer);
  switch (layer.kind) {
    case 'sample-background': return { w: 1160, h: 620 };
    case 'sample-character': return { w: 200, h: 300 };
    case 'sample-prop': return { w: 150, h: 150 };
    case 'image': case 'video': case 'sprite': return mediaLayerBox(layer);
    /* Phase 8: text/subtitle boxes come from the wrap heuristic. */
    case 'text': return textLayerBox(layer, ACTIVE_STAGE);
    case 'subtitle': return subtitleLayerBox(layer, ACTIVE_STAGE);
    /* Phase 10B: shapes draw in a fixed 200×200 box (scaled by layer.scale). */
    case 'shape': return { w: 200, h: 200 };
    default: return null;
  }
}

function rr(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

/* Phase 7: while an export render is running, the editor-aid name
   tags drawn under layers must NOT appear in the recorded frames. */
let EXPORT_LABELS_OFF = false;

function drawLabel(ctx, text, cx, y, scale) {
  if (EXPORT_LABELS_OFF) return;
  ctx.save();
  ctx.font = '600 ' + Math.round(22 / Math.max(scale, 0.6)) + 'px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width + 22;
  const h = 34 / Math.max(scale, 0.6);
  ctx.fillStyle = 'rgba(6,10,20,0.72)';
  rr(ctx, cx - w / 2, y - h / 2, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = '#eef2fb';
  ctx.fillText(text, cx, y + 1);
  ctx.restore();
}

/* ----- Phase 8: text + subtitle drawing -----
   Both use the SAME measure-free wrap heuristic the unit tests pin
   down (js/text.js), centred per line. Adjust (ctx.filter) and opacity
   apply exactly as for artwork layers. flipX is deliberately ignored:
   mirrored text is unreadable (characters flip, text does not). */
function drawTextLayer(c, layer) {
  const dims = ACTIVE_STAGE;
  const fs = Number.isFinite(layer.fontSize) && layer.fontSize > 0 ? layer.fontSize : 64;
  const lines = wrapForBox(layer.text || '', fs, textWrapWidth(dims));
  const box = textLayerBox(layer, dims);
  const { w, h } = box;
  const lineH = fs * 1.25;
  const style = layer.style || 'plain';
  c.save();
  c.translate(layer.x, layer.y);
  c.scale(layer.scale, layer.scale);
  c.globalAlpha = layer.opacity;
  c.save();
  applyAdjustFilter(c, layer);
  c.textBaseline = 'middle';
  if (style === 'bubble') {
    /* Dialogue bubble: white rounded rect + tail, dark text inside. */
    const pad = fs * 0.35;
    c.fillStyle = '#ffffff';
    rr(c, -w / 2, -h / 2, w, h, Math.min(26, h / 3));
    c.fill();
    c.beginPath();
    c.moveTo(-12, h / 2 - 1);
    c.lineTo(14, h / 2 - 1);
    c.lineTo(-2, h / 2 + fs * 0.3);
    c.closePath();
    c.fill();
    c.font = (layer.bold ? '700 ' : '400 ') + fs + 'px sans-serif';
    c.textAlign = 'center';
    c.fillStyle = '#1c2436';
    lines.forEach((ln, i) => {
      c.fillText(ln, 0, -h / 2 + pad + lineH * (i + 0.5));
    });
  } else {
    const align = ['left', 'center', 'right'].includes(layer.align) ? layer.align : 'center';
    const anchorX = align === 'left' ? -w / 2 : (align === 'right' ? w / 2 : 0);
    c.font = (style === 'title' ? '800 ' : (layer.bold ? '700 ' : '400 ')) + fs + 'px sans-serif';
    c.textAlign = align;
    if (style === 'title') {
      c.shadowColor = 'rgba(0,0,0,0.45)';
      c.shadowBlur = fs * 0.14;
      c.shadowOffsetY = fs * 0.05;
    }
    /* Slight dark outline keeps plain text readable on any scene. */
    c.lineWidth = Math.max(2, fs / 11);
    c.lineJoin = 'round';
    c.strokeStyle = 'rgba(0,0,0,0.55)';
    c.fillStyle = layer.color || '#ffffff';
    lines.forEach((ln, i) => {
      const y = -h / 2 + lineH * (i + 0.5);
      c.strokeText(ln, anchorX, y);
      c.fillText(ln, anchorX, y);
    });
  }
  c.restore();
  c.restore();
}

function drawSubtitleLayer(c, layer) {
  const dims = ACTIVE_STAGE;
  const fs = Number.isFinite(layer.fontSize) && layer.fontSize > 0 ? layer.fontSize : 44;
  const lines = wrapForBox(layer.text || '', fs, subtitleWrapWidth(dims));
  const box = subtitleLayerBox(layer, dims);
  const lineH = fs * 1.25;
  c.save();
  c.translate(layer.x, layer.y);
  c.scale(layer.scale, layer.scale);
  c.globalAlpha = layer.opacity;
  c.save();
  applyAdjustFilter(c, layer);
  c.fillStyle = 'rgba(0,0,0,0.55)';
  rr(c, -box.w / 2, -box.h / 2, box.w, box.h, 12);
  c.fill();
  c.font = '600 ' + fs + 'px sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillStyle = '#ffffff';
  const firstY = -(lines.length * lineH) / 2 + lineH / 2;
  lines.forEach((ln, i) => { c.fillText(ln, 0, firstY + i * lineH); });
  c.restore();
  c.restore();
}

/* Phase 10A: does this character layer's artwork include a true Back
   pose? (All library people + custom characters do; the vehicle/animal
   entries and any older asset set do not — Look Behind falls back to the
   Phase-3 flip mapping for those, and only then is it labelled.) */
function layerHasBackPose(layer) {
  if (!layer || layer.kind !== 'character' || !layer.assetId) return false;
  if (isCustomAssetId(layer.assetId)) return CHARACTER_POSES.some((p) => p.id === 'back');
  const ch = findCharacter(assetsSync(), layer.assetId);
  return !!(ch && ch.poses.some((p) => p.id === 'back'));
}

/* Phase 10B: one shape in its 200×200 box (centred on the origin —
   drawLayerShape has already applied translate/scale/flip/adjust/
   mask). Fill always; stroke only when strokeW > 0. */
function drawShapePath(c, layer, w, h) {
  const x = -w / 2, y = -h / 2;
  c.beginPath();
  switch (layer.shape) {
    case 'circle':
      c.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
      break;
    case 'triangle':
      c.moveTo(0, y);
      c.lineTo(x + w, y + h);
      c.lineTo(x, y + h);
      c.closePath();
      break;
    case 'star': {
      const R = Math.min(w, h) / 2, r2 = R * 0.45;
      for (let i = 0; i < 10; i++) {
        const rad = i % 2 === 0 ? R : r2;
        const a = (Math.PI / 5) * i - Math.PI / 2;
        const px = Math.cos(a) * rad, py = Math.sin(a) * rad;
        if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
      }
      c.closePath();
      break;
    }
    case 'heart': {
      const s = Math.min(w, h);
      c.moveTo(0, s * 0.38);
      c.bezierCurveTo(-s * 0.55, s * 0.05, -s * 0.42, -s * 0.42, -s * 0.16, -s * 0.42);
      c.bezierCurveTo(-s * 0.04, -s * 0.42, 0, -s * 0.3, 0, -s * 0.2);
      c.bezierCurveTo(0, -s * 0.3, s * 0.04, -s * 0.42, s * 0.16, -s * 0.42);
      c.bezierCurveTo(s * 0.42, -s * 0.42, s * 0.55, s * 0.05, 0, s * 0.38);
      c.closePath();
      break;
    }
    case 'arrow':
      c.moveTo(x, -h * 0.18);
      c.lineTo(x + w * 0.55, -h * 0.18);
      c.lineTo(x + w * 0.55, -h * 0.5);
      c.lineTo(x + w, 0);
      c.lineTo(x + w * 0.55, h * 0.5);
      c.lineTo(x + w * 0.55, h * 0.18);
      c.lineTo(x, h * 0.18);
      c.closePath();
      break;
    case 'rect':
    default:
      c.rect(x, y, w, h);
      break;
  }
  c.fillStyle = layer.fill || '#ffb020';
  c.fill();
  if (layer.strokeW > 0) {
    c.lineWidth = layer.strokeW;
    c.strokeStyle = layer.stroke || '#101a30';
    c.lineJoin = 'round';
    c.stroke();
  }
}

function drawLayerShape(ctx, layer, onAssetLoad) {
  /* Phase 8: text + subtitle layers draw themselves (no artwork box). */
  if (layer.kind === 'text') { drawTextLayer(ctx, layer); return; }
  if (layer.kind === 'subtitle') { drawSubtitleLayer(ctx, layer); return; }
  const box = layerBox(layer);
  if (!box) return; // camera layers are not drawn as artwork
  ctx.save();
  ctx.translate(layer.x, layer.y);
  ctx.scale((layer.flipX ? -1 : 1) * layer.scale, layer.scale);
  ctx.globalAlpha = layer.opacity;
  const { w, h } = box;
  /* Phase 6B: Adjust (ctx.filter) + Mask (clip) wrap ONLY the artwork —
     the name label and wearables are drawn after this scope restores. */
  ctx.save();
  applyAdjustFilter(ctx, layer);
  applyMaskClip(ctx, layer, w, h);
  let label = null; // { text, y } — drawn unclipped/unfiltered below
  if (layer.assetId && isCustomAssetId(layer.assetId)) {
    /* Phase 6B: custom character — generated pose SVG via blob-URL cache. */
    const entry = customCharImage(layer.assetId, layer.poseId, onAssetLoad);
    if (!entry) {
      /* The custom character was deleted from the Studio library. */
      ctx.fillStyle = 'rgba(224,69,123,0.16)';
      rr(ctx, -w / 2, -h / 2, w, h, 12);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,120,150,0.85)';
      ctx.lineWidth = 2;
      ctx.stroke();
      label = { text: 'MISSING MEDIA', y: 0 };
    } else if (entry.loaded) {
      ctx.drawImage(entry.img, -w / 2, -h / 2, w, h);
    } else {
      ctx.fillStyle = 'rgba(91,114,158,0.25)';
      rr(ctx, -w / 2, -h / 2, w, h, 14);
      ctx.fill();
      ctx.strokeStyle = 'rgba(238,242,251,0.4)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    if (!label && layer.kind !== 'background') {
      /* '· Look Behind' label only for the flip fallback (no Back pose). */
      const behindNote = layer.mouthMode === 'behind' && !layerHasBackPose(layer);
      label = { text: behindNote ? layer.name + ' · Look Behind' : layer.name, y: h / 2 + 8 };
    }
    ctx.restore();
    if (layer.kind === 'character') drawWearables(ctx, layer, w, h, onAssetLoad);
    if (label) drawLabel(ctx, label.text, 0, label.y, layer.scale);
    ctx.restore();
    return;
  }
  if (layer.assetId) {
    /* Phase 3: real SVG asset artwork, loaded via the assets.js cache. */
    const file = layerAssetFile(assetsSync(), layer);
    const entry = file ? peekAssetImage(file, onAssetLoad) : null;
    if (entry && entry.loaded) {
      ctx.drawImage(entry.img, -w / 2, -h / 2, w, h);
    } else {
      /* Still loading (or manifest pending): subtle placeholder outline. */
      ctx.fillStyle = 'rgba(91,114,158,0.25)';
      rr(ctx, -w / 2, -h / 2, w, h, 14);
      ctx.fill();
      ctx.strokeStyle = 'rgba(238,242,251,0.4)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    if (layer.kind !== 'background') {
      /* '· Look Behind' label only for the flip fallback (no Back pose). */
      const behindNote = layer.mouthMode === 'behind' && !layerHasBackPose(layer);
      const label2 = behindNote ? layer.name + ' · Look Behind' : layer.name;
      label = { text: label2, y: h / 2 + 8 };
    }
    ctx.restore();
    if (layer.kind === 'character') drawWearables(ctx, layer, w, h, onAssetLoad);
    if (label) drawLabel(ctx, label.text, 0, label.y, layer.scale);
    ctx.restore();
    return;
  }
  if (layer.kind === 'sample-background') {
    ctx.fillStyle = layer.color;
    rr(ctx, -w / 2, -h / 2, w, h, 18);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    rr(ctx, -w / 2, h / 2 - 130, w, 130, 18);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(-w / 2 + 130, -h / 2 + 105, 46, 0, Math.PI * 2);
    ctx.fill();
    label = { text: layer.name, y: -h / 2 + 44 };
  } else if (layer.kind === 'sample-character') {
    /* Simple original silhouette: legs, rounded body, head. */
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    rr(ctx, -42, 92, 34, 96, 10); ctx.fill();
    rr(ctx, 10, 92, 34, 96, 10); ctx.fill();
    ctx.fillStyle = layer.color;
    rr(ctx, -58, -28, 116, 132, 34); ctx.fill();
    rr(ctx, -88, -18, 26, 96, 13); ctx.fill();
    rr(ctx, 62, -18, 26, 96, 13); ctx.fill();
    ctx.fillStyle = '#f2c094';
    ctx.beginPath();
    ctx.arc(0, -72, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#20242e';
    ctx.beginPath();
    ctx.arc(-14, -76, 4.5, 0, Math.PI * 2);
    ctx.arc(14, -76, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -62, 13, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#20242e';
    ctx.stroke();
    label = { text: layer.name, y: h / 2 + 8 };
  } else if (layer.kind === 'shape') {
    /* Phase 10B: Shapes tool artwork. */
    drawShapePath(ctx, layer, w, h);
    label = { text: layer.name, y: h / 2 + 8 };
  } else {
    /* Sample prop: neat star/diamond badge. */
    ctx.fillStyle = layer.color;
    ctx.beginPath();
    const R = 68, r2 = 30;
    for (let i = 0; i < 10; i++) {
      const rad = i % 2 === 0 ? R : r2;
      const a = (Math.PI / 5) * i - Math.PI / 2;
      const px = Math.cos(a) * rad, py = Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = 3;
    ctx.stroke();
    label = { text: layer.name, y: h / 2 + 8 };
  }
  ctx.restore(); /* adjust filter + mask clip off */
  if (label) drawLabel(ctx, label.text, 0, label.y, layer.scale);
  ctx.restore();
}

/* ------------------------------- editor view ------------------------------ */

export async function renderEditor(root, projectId, { onBack } = {}) {
  const loaded = await getProject(projectId);
  if (!loaded) {
    root.innerHTML = `<main class="wrap"><div class="empty">
      <p><b>Project not found.</b></p>
      <p><button class="btn primary" id="backBtn" type="button">← Back to dashboard</button></p>
    </div></main>`;
    const b = root.querySelector('#backBtn');
    if (b && onBack) b.addEventListener('click', onBack);
    return;
  }

  const project = normalizeProject(loaded);
  /* Phase 8: publish this project's stage size for the module-level
     renderer helpers (background fill, layer boxes, text wrap). */
  setActiveStage(stageDims(project));

  const S = {
    activeSceneId: project.scenes[0].id,
    selectedId: null,
    activePanel: 'character',
    drawerOpen: true,
    railOpen: true,
    playhead: 0,
    playing: false,
    zoomMul: 1,
    pan: { x: 0, y: 0 },
    handTool: false,
    framing: false,
    pxPerSec: 8,
    layersCollapsed: false,
    dockTop: false,
    undo: [],
    redo: [],
    destroyed: false,
    raf: 0,
    lastTs: 0,
    assets: assetsSync(),
    assetsError: '',
    charQuery: '',
    /* Phase 4 state */
    pathEdit: false,          // motion-path editing mode for the selected layer
    showPath: true,           // dashed path preview toggle
    presetPicker: false,      // AI Animate preset picker open in the tools block
    camEdit: false,           // camera view editing (drag canvas to pan the view)
    camView: { x: 0, y: 0, zoom: 1 }, // working camera view while camEdit is on
    fadeStart: 0,             // performance.now() of a 'fade' scene switch (0 = none)
    speedBefore: null,        // history snapshot captured when a speed drag starts
    /* Phase 5 audio state */
    mediaList: [],            // media-store items (newest first)
    mediaMap: new Map(),      // mediaId -> media item
    mediaLoaded: false,       // media list read at least once
    peaks: new Map(),         // mediaId -> Float32Array | null (pending/failed)
    previewId: null,          // media id currently previewing via HTMLAudio
    rec: null,                // active recording { elapsed, mime, discard }
    volBefore: null,          // history snapshot captured when a volume drag starts
    sfxBusy: new Set(),       // sfx ids currently generating
    /* Phase 6A state */
    localFilter: 'all',       // Local gallery filter chip
    objUrls: new Map(),       // mediaId -> object URL (stage + thumbnails)
    mediaImgs: new Map(),     // mediaId -> { img, loaded, error } for image/sprite layers
    videoEls: new Map(),      // layerId -> { el, mediaId } for video layers
    fxIntensity: {},          // Effect drawer: pending intensity per effect id
    fxLightning: true,        // Effect drawer: rain lightning toggle
    spriteWork: null,         // Sprite Studio working sheet { mediaId, name, cols, rows, count, fps, onion, natW, natH }
    spriteRaf: 0,             // sprite preview rAF handle
    bgTool: null,             // BG remover { img, srcCanvas, name, key:{r,g,b}, tol, soft }
    erTool: null,             // Eraser { src, work, undo: [], size, hardness, tool, name }
    /* Phase 6B state */
    customList: [],           // custom-character records (newest first)
    customLoaded: false,      // custom-char list read at least once
    studio: { params: defaultCharParams(), editingId: null, fromLibrary: null, mods: defaultPoseMods(), customPoses: [], poseName: 'My Pose' }, // Character Studio workspace (+ Phase 10B Pose Lab)
    tutOpen: 0,               // Tutorial accordion: open guide index (-1 = none)
    adjBefore: null,          // history snapshot captured when an adjust drag starts
    /* Phase 8 state */
    tts: { voiceURI: '', rate: 1, auto: false, spoken: new Set() }, // TTS preview (session-only, never saved)
    ttsVoices: [],            // sorted speechSynthesis voices (bn/en first)
    textBefore: null,         // history snapshot captured when a text edit starts
    /* Phase 10B state */
    fxPathEdit: false,        // flock-path editing for the selected birds layer
    shapeMenu: false,         // toolbar2 "+ Shape" popover open
    lipHold: new Map(),       // layerId -> { pose, sinceMs } lip-sync state
    poseModBefore: null,      // history-free studio slider state (poses save explicitly)
    /* Phase 7 export state */
    exportMode: false,        // canvas renders the export frame (no editor overlays)
    exportSize: null          // { w, h } backing-store size while exportMode
  };

  /* Phase 5: Web Audio playback engine (one per editor session). */
  const engine = new AudioEngine();

  /* Load the Phase-3 asset library (manifest + SVGs) in the background;
     drawers + canvas refresh when it arrives. */
  if (!S.assets) {
    loadAssets()
      .then((m) => { if (!S.destroyed) { S.assets = m; renderDrawer(); renderCanvas(); } })
      .catch((err) => { if (!S.destroyed) { S.assetsError = String(err && err.message ? err.message : err); renderDrawer(); } });
  }

  const scene = () => project.scenes.find((s) => s.id === S.activeSceneId) || project.scenes[0];
  const layers = () => scene().layers;

  /* Phase 6B: ONE definition lookup for library + custom characters —
     pose chips, mouth modes, presets and paths all go through this. */
  const getCharacterDef = (assetId) =>
    resolveCharacterDef(S.assets, [...customCharStore.map.values()], assetId);
  const sel = () => layers().find((l) => l.id === S.selectedId) || null;

  root.innerHTML = `
  <div class="editor" id="edRoot">
    <header class="ed-header">
      <button class="btn small" id="edBack" type="button">← Dashboard</button>
      <button class="btn small" id="edHamburger" type="button" title="Toggle panel sidebar">☰</button>
      <div class="brand"><img src="icons/logo.svg" alt="" width="30" height="30"><span class="brand-name">Cartoon Studio</span></div>
      <input class="name-input" id="edName" type="text" value="${escapeHtml(project.name)}" aria-label="Project name">
      <button class="badge free as-btn" id="edFreeBadge" type="button" title="About pricing">FREE — ALL FEATURES</button>
      <span class="save-state" id="edSaveState">Auto-saved</span>
      <div class="spacer"></div>
      <span class="badge mode" id="edMeta"></span>
      <span class="version">${APP_VERSION}</span>
      <button class="btn primary" id="edSave" type="button">Save Project</button>
      <button class="btn" id="edExport" type="button">Export Video</button>
      <div class="avatar-wrap">
        <button class="avatar" id="edAvatar" type="button" title="Local Creator">L</button>
        <div class="avatar-menu" id="edAvatarMenu" hidden>
          <p><b>Local Creator</b></p>
          <p class="muted">Local mode — no account.<br>All features are free.</p>
          <button class="btn small" id="edMenuDash" type="button">← Dashboard</button>
        </div>
      </div>
    </header>

    <div class="ed-main" id="edMain">
      <nav class="ed-rail" id="edRail" aria-label="Tool panels"></nav>
      <aside class="ed-drawer" id="edDrawer"></aside>
      <section class="ed-stage-area" id="edStageArea">
        <canvas id="edCanvas"></canvas>
        <div class="ed-stage-tools">
          <button class="btn small" id="edHand" type="button" title="Hand tool — drag to pan the workspace">Hand</button>
          <button class="btn small" id="edFraming" type="button" title="Camera framing — safe-area guide">Framing</button>
          <button class="btn small" id="edZoomOut" type="button" title="Zoom out">−</button>
          <span class="zoom-label" id="edZoomLabel">100%</span>
          <button class="btn small" id="edZoomIn" type="button" title="Zoom in">+</button>
        </div>
      </section>
    </div>

    <div class="ed-toolbar2" id="edToolbar2">
      <button class="btn small" id="edDup" type="button">Duplicate</button>
      <button class="btn small" id="edSplit" type="button">Split</button>
      <button class="btn small" id="edCamera" type="button">Camera</button>
      <button class="btn small" id="edVoice" type="button" title="Voice recording — record narration with your microphone (WebM, saved locally in this browser)">Voice</button>
      <button class="btn small" id="edAddText" type="button" title="Add a text / title layer (Phase 8 extra — the reference has no text tool)">+ Text</button>
      <button class="btn small" id="edAddSubtitle" type="button" title="Add a subtitle layer — fixed at the bottom of the stage (Phase 8 extra)">+ Subtitle</button>
      <button class="btn small" id="edAddShape" type="button" title="Add a shape layer (Phase 10B extra — the reference has no shapes tool)">+ Shape</button>
      <span id="edShapeMenu" class="shape-menu" hidden></span>
      <span class="tb-sep"></span>
      <button class="btn small" id="edUndo" type="button">↩ Undo</button>
      <button class="btn small" id="edRedo" type="button">↪ Redo</button>
      <span class="tb-sep"></span>
      <label class="tb-label">Scene
        <select id="edSceneSel" class="tb-select"></select>
      </label>
      <button class="btn small" id="edAddScene" type="button">+ Add Scene</button>
      <label class="tb-label">Transition
        <select id="edTransSel" class="tb-select" title="How playback enters this scene when it auto-advances from the previous one">
          <option value="cut">Cut</option>
          <option value="fade">Fade</option>
        </select>
      </label>
      <span class="tb-sep"></span>
      <button class="btn small danger" id="edDeleteLayer" type="button">Delete Layer</button>
      <span id="edAudioTools" class="audio-tools"></span>
      <div class="spacer"></div>
      <button class="btn small" id="edDock" type="button" title="Dock the timeline above the stage">Dock Timeline to Top</button>
      <button class="btn small" id="edToggleLayers" type="button">Toggle Layers</button>
      <label class="tb-label">Timeline zoom
        <button class="btn small" id="edTlZoomOut" type="button">−</button>
        <button class="btn small" id="edTlZoomIn" type="button">+</button>
      </label>
    </div>

    <section class="ed-timeline" id="edTimeline">
      <div class="ed-transport">
        <button class="btn small" id="edJumpStart" type="button" title="Jump to start">|◀</button>
        <button class="btn small" id="edBack5" type="button">−5s</button>
        <button class="btn small primary" id="edPlay" type="button">▶ Play</button>
        <button class="btn small" id="edFwd5" type="button">+5s</button>
        <span class="time-display" id="edTime">00:00 / 02:00</span>
        <label class="tb-label">Scene length (s)
          <input class="dur-input" id="edDurInput" type="number" min="10" max="600" step="1">
        </label>
        <span class="muted small-note">Timeline shows the active scene. Project total updates on save.</span>
      </div>
      <div class="ed-tracks-scroll" id="edTracksScroll">
        <div class="ed-tracks-inner" id="edTracksInner"></div>
      </div>
    </section>

    <div class="ed-modal-backdrop" id="edModalBackdrop" hidden>
      <div class="ed-modal" role="dialog" aria-modal="true">
        <h3 id="edModalTitle"></h3>
        <p id="edModalBody"></p>
        <p style="text-align:right;margin:0"><button class="btn primary" id="edModalClose" type="button">Close</button></p>
      </div>
    </div>
    <div class="ed-modal-backdrop" id="edExportBackdrop" hidden>
      <div class="ed-modal export-modal" role="dialog" aria-modal="true" aria-label="Export Video">
        <h3>Export Video — Select Export Quality</h3>
        <div id="edExportBody"></div>
      </div>
    </div>
    <div class="ed-menu" id="edCtxMenu" hidden></div>
    <div class="ed-toasts" id="edToasts" aria-live="polite"></div>
  </div>`;

  const $ = (id) => root.querySelector(id);
  const canvas = $('#edCanvas');
  const ctx = canvas.getContext('2d');
  const stageArea = $('#edStageArea');
  const tracksInner = $('#edTracksInner');
  const tracksScroll = $('#edTracksScroll');
  const saveState = $('#edSaveState');

  /* ------------------------------ feedback ------------------------------ */
  function toast(msg) {
    const box = $('#edToasts');
    if (!box) return;
    const el = document.createElement('div');
    el.className = 'ed-toast';
    el.textContent = msg;
    box.appendChild(el);
    setTimeout(() => el.classList.add('show'), 10);
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 250); }, 2200);
  }

  function showModal(title, body) {
    $('#edModalTitle').textContent = title;
    $('#edModalBody').textContent = body;
    $('#edModalBackdrop').hidden = false;
  }

  /* ----------------------------- persistence ---------------------------- */
  let saveTimer = null;
  async function persist(flash) {
    project.name = $('#edName').value.trim() || project.name;
    syncLegacyFields(project);
    project.updatedAt = Date.now();
    await putProject(project);
    if (S.destroyed) return;
    if (flash) {
      saveState.textContent = 'Saved ✓';
      setTimeout(() => { if (!S.destroyed) saveState.textContent = 'Auto-saved'; }, 1600);
    } else {
      saveState.textContent = 'Auto-saved';
    }
  }
  function markDirty() {
    saveState.textContent = 'Saving…';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => persist(false), 600);
  }

  /* ------------------------------- history ------------------------------ */
  function snapshot() {
    return JSON.stringify({ scenes: project.scenes, activeSceneId: S.activeSceneId });
  }
  function pushHistory() {
    S.undo.push(snapshot());
    if (S.undo.length > HISTORY_CAP) S.undo.shift();
    S.redo.length = 0;
  }
  function restore(snap) {
    const data = JSON.parse(snap);
    project.scenes = data.scenes;
    S.activeSceneId = data.activeSceneId && project.scenes.some((s) => s.id === data.activeSceneId)
      ? data.activeSceneId : project.scenes[0].id;
    if (!layers().some((l) => l.id === S.selectedId)) S.selectedId = null;
    S.playhead = clamp(S.playhead, 0, scene().durationSec);
    syncLegacyFields(project);
  }
  function doUndo() {
    if (!S.undo.length) { toast('Nothing to undo'); return; }
    S.redo.push(snapshot());
    restore(S.undo.pop());
    afterChange(false);
    toast('Undone');
  }
  function doRedo() {
    if (!S.redo.length) { toast('Nothing to redo'); return; }
    S.undo.push(snapshot());
    restore(S.redo.pop());
    afterChange(false);
    toast('Redone');
  }

  /* --------------------------- render: header --------------------------- */
  function renderMeta() {
    const meta = $('#edMeta');
    /* Phase 8: the aspect is fixed for the life of the project. */
    meta.title = 'Aspect is chosen when the project is created';
    meta.textContent =
      (project.aspect || '16:9') + ' · ' + formatTimecode(scene().durationSec) +
      ' scene · ' + layers().length + ' layers · total ' + formatTimecode(project.scenes.reduce((a, s) => a + s.durationSec, 0));
  }

  /* ------------------------ render: rail + drawer ------------------------ */
  function renderRail() {
    $('#edRail').innerHTML = PANELS.map((p) =>
      `<button class="rail-btn ${p.id === S.activePanel ? 'active' : ''}" data-panel="${p.id}" type="button" title="${escapeHtml(p.label)}">
         <span class="rail-ico">${escapeHtml(p.label.slice(0, 2).toUpperCase())}</span>
         <span class="rail-label">${escapeHtml(p.label)}</span>
       </button>`).join('');
  }

  /* ---- Phase 3 drawer builders (asset library) ---- */
  function libLoadingHtml() {
    if (S.assetsError) return `<p class="drawer-note">Asset library failed to load (${escapeHtml(S.assetsError)}). Sample layers below still work.</p>`;
    return `<p class="drawer-note">Loading asset library…</p>`;
  }

  /* ---- Phase 4: animation tools for the selected layer ---- */

  function animToolsHtml(l) {
    const anim = l.anim || { preset: null, path: null, speed: 1 };
    const path = anim.path;
    const picker = S.presetPicker ? `
      <div class="preset-grid" role="group" aria-label="AI Animate presets">
        ${PRESETS.map((p) => `
          <button class="chip-btn ${anim.preset === p.id ? 'active' : ''}" data-preset="${p.id}" type="button">${escapeHtml(p.label)}</button>`).join('')}
        <button class="chip-btn ${!anim.preset ? 'active' : ''}" data-preset="none" type="button">None</button>
      </div>` : '';
    const pathBox = (S.pathEdit || path) ? `
      <div class="path-box">
        <p class="small-note" style="margin:.1rem 0 .4rem"><b>Motion path</b> — ${path ? path.points.length : 0} point${path && path.points.length === 1 ? '' : 's'}
          ${S.pathEdit ? '· editing: click the canvas to add destinations (max 5 points), drag a point to adjust it.' : ''}</p>
        <div class="tool-row">
          <label class="small-note">Easing
            <select class="tb-select" data-path-easing ${path ? '' : 'disabled'}>
              <option value="linear" ${path && path.easing === 'linear' ? 'selected' : ''}>Linear</option>
              <option value="easeInOut" ${path && path.easing === 'easeInOut' ? 'selected' : ''}>Ease In-Out</option>
              <option value="easeOut" ${path && path.easing === 'easeOut' ? 'selected' : ''}>Ease Out</option>
            </select>
          </label>
          <label class="small-note"><input type="checkbox" data-path-show ${S.showPath ? 'checked' : ''}> Show path</label>
        </div>
        <div class="tool-row">
          ${S.pathEdit ? '<button class="btn small primary" data-anim-tool="path-done" type="button">Done</button>' : ''}
          ${path ? '<button class="btn small danger" data-anim-tool="path-clear" type="button">Clear path</button>' : ''}
        </div>
      </div>` : '';
    return `
    <div class="char-tools">
      <p class="sample-head">Animation — ${escapeHtml(l.name)}</p>
      <div class="tool-row">
        <button class="btn small ${S.presetPicker ? 'primary' : ''}" data-anim-tool="ai" type="button"
          title="Animation presets">AI Animate${anim.preset ? ' · ' + escapeHtml(presetLabel(anim.preset)) : ''}</button>
        <button class="btn small ${S.pathEdit ? 'primary' : ''}" data-anim-tool="path" type="button"
          title="Motion path — move along clicked points during the clip">Path${path ? ' · ' + path.points.length + ' pts' : ''}</button>
      </div>
      ${picker}
      ${pathBox}
      <p class="muted small-note" style="margin:.55rem 0 .2rem">Animation speed — scales this layer's preset &amp; pose-cycle rate (and path traversal feel) inside its clip.</p>
      <div class="pose-chips" role="group" aria-label="Speed presets">
        ${[0.5, 1, 1.5, 2].map((v) => `
          <button class="chip-btn ${anim.speed === v ? 'active' : ''}" data-speed-chip="${v}" type="button">${v}×</button>`).join('')}
      </div>
      <div class="tool-row">
        <input class="anim-range" type="range" min="0.25" max="3" step="0.05" value="${anim.speed}"
               data-speed-range aria-label="Animation speed 0.25× to 3×">
        <span class="small-note" data-speed-val>${anim.speed}×</span>
      </div>
    </div>`;
  }

  /* ---- Phase 4: camera keyframe tools (shown when the Camera layer is selected) ---- */

  function cameraToolsHtml(l) {
    const keys = (l.camera && l.camera.keys) || [];
    const view = S.camEdit ? S.camView : (resolveCamera(l) || { x: 0, y: 0, zoom: 1 });
    return `
    <div class="char-tools">
      <p class="sample-head">Camera — keyframes</p>
      <p class="muted small-note">Turn on Edit View, drag the canvas to pan the camera and set the view zoom, then add a keyframe at the playhead. During playback the camera moves smoothly between keyframes.</p>
      <div class="tool-row">
        <button class="btn small ${S.camEdit ? 'primary' : ''}" data-cam-tool="edit" type="button">Edit View ${S.camEdit ? 'ON' : 'OFF'}</button>
        <button class="btn small" data-cam-tool="add-key" type="button">Add Keyframe at Playhead</button>
      </div>
      <div class="tool-row">
        <label class="small-note" for="edCamZoom">View zoom</label>
        <input class="anim-range" id="edCamZoom" type="range" min="0.5" max="2.5" step="0.05"
               value="${view.zoom}" data-cam-zoom aria-label="Camera view zoom">
        <span class="small-note" data-cam-zoom-val>${view.zoom.toFixed(2)}×</span>
      </div>
      <p class="muted small-note" style="margin:.2rem 0">Current view: x ${Math.round(view.x)}, y ${Math.round(view.y)}, zoom ${view.zoom.toFixed(2)}× · playhead ${formatTimecode(S.playhead)}</p>
      ${keys.length ? `
      <ul class="cam-keys">
        ${keys.map((k, i) => `
          <li>
            <button class="mini" data-cam-seek="${i}" type="button" title="Go to this keyframe">${formatTimecode(k.tSec)}</button>
            <span class="sp">x ${Math.round(k.x)} · y ${Math.round(k.y)} · ${k.zoom.toFixed(2)}×</span>
            <button class="mini danger" data-cam-del="${i}" type="button" title="Delete keyframe">✕</button>
          </li>`).join('')}
      </ul>` : '<p class="muted small-note">No keyframes yet — the camera is static.</p>'}
    </div>`;
  }

  /* ---- Phase 6B: Adjust & Mask block (visual layers) ---- */
  const ADJUST_VISUAL_KINDS = ['character', 'background', 'prop',
    'sample-background', 'sample-character', 'sample-prop', 'image', 'video', 'sprite',
    /* Phase 8: text/subtitle layers take the ctx.filter Adjust too. */
    'text', 'subtitle',
    /* Phase 10B: shape layers take Adjust too. */
    'shape'];

  function adjustToolsHtml(l) {
    if (!ADJUST_VISUAL_KINDS.includes(l.kind)) return '';
    const a = l.adjust || { b: 100, c: 100, s: 100 };
    const slider = (field, label, min, max, val) => `
      <div class="adj-row">
        <span class="small-note adj-label">${label}</span>
        <input type="range" min="${min}" max="${max}" step="1" value="${val}" data-adj="${field}" aria-label="${label}">
        <span class="small-note adj-val" data-adj-val="${field}">${val}%</span>
      </div>`;
    return `
    <div class="char-tools">
      <p class="sample-head">Adjust &amp; Mask — ${escapeHtml(l.name)}</p>
      ${slider('b', 'Brightness', 50, 150, a.b)}
      ${slider('c', 'Contrast', 50, 150, a.c)}
      ${slider('s', 'Saturation', 0, 200, a.s)}
      ${slider('opacity', 'Opacity', 0, 100, Math.round((Number.isFinite(l.opacity) ? l.opacity : 1) * 100))}
      <div class="adj-row">
        <span class="small-note adj-label">Mask</span>
        <select class="tb-select" data-mask-sel aria-label="Layer mask shape">
          ${[['none', 'None'], ['rect', 'Rectangle'], ['rounded', 'Rounded'], ['squircle', 'Squircle'], ['circle', 'Circle'], ['star', 'Star'], ['heart', 'Heart']]
            .map(([v, t]) => `<option value="${v}" ${l.mask === v ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
      </div>
      <p class="muted small-note" style="margin:.5rem 0 .2rem">Mood presets — one click sets Brightness / Contrast / Saturation:</p>
      <div class="pose-chips" role="group" aria-label="Mood presets">
        ${MOOD_PRESETS.map((m) => `
          <button class="chip-btn" data-mood="${m.id}" type="button">${escapeHtml(m.label)}</button>`).join('')}
      </div>
      <div class="tool-row">
        <button class="btn small" data-adj-reset type="button">Reset adjust</button>
      </div>
    </div>`;
  }

  /* ---- Phase 8: Text / Subtitle tools + TTS preview block ----
     Shown when a text or subtitle layer is selected (in the Character
     drawer, like the other selected-layer tool blocks). TTS here is a
     preview aid only — see the note rendered inside the block. */
  const TEXT_SWATCHES = ['#ffffff', '#ffd54a', '#111111', '#ff8c1a', '#2fb36f', '#e0457b'];

  function textToolsHtml(l) {
    if (l.kind !== 'text' && l.kind !== 'subtitle') return '';
    const isSub = l.kind === 'subtitle';
    const min = isSub ? 28 : 24, max = isSub ? 72 : 160;
    const fs = Number.isFinite(l.fontSize) ? l.fontSize : (isSub ? 44 : 64);
    const ttsBlock = !ttsAvailable() ? `
      <p class="drawer-note" style="margin:.55rem 0 0">Text-to-speech preview is not available in this browser (no Web Speech API).</p>` : `
      <p class="sample-head" style="margin-top:.65rem">TTS preview — browser voice</p>
      <label class="small-note" style="display:block">Voice
        <select class="tb-select" data-tts-voice style="width:100%;margin-top:.25rem" aria-label="TTS voice">
          ${S.ttsVoices.length
            ? S.ttsVoices.map((v) => `<option value="${escapeHtml(v.voiceURI)}" ${v.voiceURI === S.tts.voiceURI ? 'selected' : ''}>${escapeHtml(v.name + ' — ' + v.lang)}</option>`).join('')
            : '<option value="">Default voice (list still loading…)</option>'}
        </select>
      </label>
      <div class="adj-row">
        <span class="small-note adj-label">Rate</span>
        <input type="range" min="0.5" max="2" step="0.05" value="${S.tts.rate}" data-tts-rate aria-label="TTS rate 0.5× to 2×">
        <span class="small-note adj-val" data-tts-rate-val>${S.tts.rate}×</span>
      </div>
      <div class="tool-row">
        <button class="btn small primary" data-tts-speak type="button">▶ Speak</button>
        <label class="small-note"><input type="checkbox" data-tts-auto ${S.tts.auto ? 'checked' : ''}> Auto-speak during preview</label>
      </div>
      <p class="drawer-note" style="margin:.35rem 0 0">TTS is a preview aid only — the computer voice is <b>NOT</b> recorded into exported videos. For a voice in the final video, record with the Voice tool (Phase 5).</p>`;
    return `
    <div class="char-tools">
      <p class="sample-head">${isSub ? 'Subtitle' : 'Text'} — ${escapeHtml(l.name)}</p>
      ${isSub ? '<p class="drawer-note" style="margin:.2rem 0 .45rem">Subtitles stay fixed at the bottom of the stage — they cannot be dragged. Stack subtitle clips one after another on the timeline to build a dialogue track.</p>' : ''}
      <label class="small-note" style="display:block">Text
        <textarea class="text-edit" data-text-edit rows="2" aria-label="Layer text">${escapeHtml(l.text || '')}</textarea>
      </label>
      <div class="adj-row">
        <span class="small-note adj-label">Size</span>
        <input type="range" min="${min}" max="${max}" step="1" value="${fs}" data-text-size aria-label="Font size">
        <span class="small-note adj-val" data-text-size-val>${fs}px</span>
      </div>
      ${isSub ? '' : `
      <p class="muted small-note" style="margin:.5rem 0 .2rem">Colour</p>
      <div class="swatch-row" role="group" aria-label="Text colour">
        ${TEXT_SWATCHES.map((c) => `
          <button class="swatch ${l.color === c ? 'active' : ''}" data-text-color="${c}" style="background:${c}" type="button" aria-label="Text colour ${c}"></button>`).join('')}
        <input type="color" class="color-input" data-text-color-input value="${escapeHtml(/^#[0-9a-fA-F]{6}$/.test(l.color || '') ? l.color : '#ffffff')}" aria-label="Custom text colour">
      </div>
      <div class="tool-row">
        <button class="btn small ${l.bold ? 'primary' : ''}" data-text-bold type="button">Bold ${l.bold ? 'ON' : 'OFF'}</button>
      </div>
      <p class="muted small-note" style="margin:.45rem 0 .2rem">Align</p>
      <div class="pose-chips" role="group" aria-label="Text alignment">
        ${['left', 'center', 'right'].map((a) => `
          <button class="chip-btn ${l.align === a ? 'active' : ''}" data-text-align="${a}" type="button">${a.charAt(0).toUpperCase() + a.slice(1)}</button>`).join('')}
      </div>
      <p class="muted small-note" style="margin:.45rem 0 .2rem">Style</p>
      <div class="pose-chips" role="group" aria-label="Text style">
        ${[['plain', 'Plain'], ['title', 'Title'], ['bubble', 'Bubble']].map(([v, t]) => `
          <button class="chip-btn ${l.style === v ? 'active' : ''}" data-text-style="${v}" type="button">${t}</button>`).join('')}
      </div>`}
      ${ttsBlock}
    </div>`;
  }

  function charToolsHtml() {
    const l = sel();
    if (!l) return '';
    if (l.kind === 'camera') return cameraToolsHtml(l);
    let poseBlock = '';
    if (l.kind === 'character') {
      const ch = getCharacterDef(l.assetId);
      if (ch) {
        const poseIdx = Math.max(0, ch.poses.findIndex((p) => p.id === l.poseId));
        poseBlock = `
    <div class="char-tools">
      <p class="sample-head">Selected: ${escapeHtml(l.name)}</p>
      <p class="muted small-note">${escapeHtml(ch.role || '')} · pose: ${escapeHtml(ch.poses[poseIdx].label)}</p>
      <div class="pose-chips" role="group" aria-label="Pose picker">
        ${ch.poses.map((p) => `
          <button class="chip-btn ${p.id === l.poseId ? 'active' : ''}" data-pose="${p.id}" type="button">${escapeHtml(p.label)}</button>`).join('')}
      </div>
      <div class="tool-row">
        <button class="btn small" data-char-tool="flip" type="button">Flip</button>
        <button class="btn small" data-char-tool="pose-prev" type="button" title="Previous pose">◀ Pose</button>
        <button class="btn small" data-char-tool="pose-next" type="button" title="Next pose">Pose ▶</button>
      </div>
      <div class="tool-row">
        <button class="btn small" data-studio-edit type="button" title="Open this character in the Character Studio">Edit in Character Studio</button>
        <button class="btn small danger" data-char-tool="delete" type="button">Delete Layer</button>
      </div>
      <p class="muted small-note" style="margin:.55rem 0 .25rem">Mouth / face mode — Talk flaps between the Talk and Stand poses at ~6 Hz while playing (timed flap; record a voice track in the Media panel and Talk characters flap along while it sounds). Look Behind now shows the character's true Back pose artwork (Phase 10A); characters without a Back pose (the bus / mishuk / puppy / parrot) fall back to a labelled flip.</p>
      <div class="pose-chips" role="group" aria-label="Mouth mode">
        <button class="chip-btn ${l.mouthMode === 'idle' ? 'active' : ''}" data-mouth="idle" type="button">Idle</button>
        <button class="chip-btn ${l.mouthMode === 'talk' ? 'active' : ''}" data-mouth="talk" type="button">Talk</button>
        <button class="chip-btn ${l.mouthMode === 'behind' ? 'active' : ''}" data-mouth="behind" type="button">Look Behind</button>
      </div>
      ${l.mouthMode === 'talk' ? `
      <p class="muted small-note" style="margin:.55rem 0 .25rem">Lip-sync — <b>Auto (audio level)</b> opens/closes the mouth with the actual sound level while a voice or SFX clip is playing (our extra; the reference has no lip-sync at all). With no audio sounding it falls back to the flap. <b>Timed flap</b> always uses the steady ~6 Hz flap.</p>
      <div class="pose-chips" role="group" aria-label="Lip-sync mode">
        <button class="chip-btn ${l.lipSync !== 'timed' ? 'active' : ''}" data-lipsync="auto" type="button">Lip-sync: Auto (audio level)</button>
        <button class="chip-btn ${l.lipSync === 'timed' ? 'active' : ''}" data-lipsync="timed" type="button">Timed flap</button>
      </div>` : ''}
      <p class="muted small-note" style="margin:.55rem 0 .25rem">Props on character — wearable overlays anchored to the head / hand; they flip with the character and work on library and custom characters alike.</p>
      <div class="pose-chips" role="group" aria-label="Wearable props">
        ${WEARABLES.map((wd) => `
          <button class="chip-btn ${(l.wearables || []).includes(wd.id) ? 'active' : ''}" data-wearable="${wd.id}" type="button">${escapeHtml(wd.label)}</button>`).join('')}
      </div>
    </div>`;
      }
    }
    return poseBlock + textToolsHtml(l) + shapeToolsHtml(l) + effectToolsHtml(l) + adjustToolsHtml(l) + animToolsHtml(l);
  }

  /* ---- Phase 10B: Shapes tool block (selected shape layer) ---- */
  function shapeToolsHtml(l) {
    if (l.kind !== 'shape') return '';
    const swatches = (attr, current) => SHAPE_FILL_SWATCHES.map((c) => `
          <button class="swatch ${current === c ? 'active' : ''}" data-${attr}="${c}" style="background:${c}" type="button" aria-label="Colour ${c}"></button>`).join('');
    return `
    <div class="char-tools">
      <p class="sample-head">Shape — ${escapeHtml(l.name)}</p>
      <div class="pose-chips" role="group" aria-label="Shape kind">
        ${SHAPE_KINDS.map((s) => `
          <button class="chip-btn ${l.shape === s.id ? 'active' : ''}" data-shape-kind="${s.id}" type="button">${s.label}</button>`).join('')}
      </div>
      <p class="muted small-note" style="margin:.5rem 0 .2rem">Fill colour</p>
      <div class="swatch-row" role="group" aria-label="Shape fill colour">
        ${swatches('shape-fill', l.fill)}
        <input type="color" class="color-input" data-shape-fill-input value="${escapeHtml(isHexColor(l.fill) ? l.fill : '#ffb020')}" aria-label="Custom fill colour">
      </div>
      <div class="adj-row">
        <span class="small-note adj-label">Stroke width</span>
        <input type="range" min="0" max="12" step="1" value="${l.strokeW || 0}" data-shape-stroke aria-label="Stroke width 0 to 12">
        <span class="small-note adj-val" data-shape-stroke-val>${l.strokeW || 0}px</span>
      </div>
      <p class="muted small-note" style="margin:.5rem 0 .2rem">Stroke colour (applies when the width is above 0)</p>
      <div class="swatch-row" role="group" aria-label="Shape stroke colour">
        ${swatches('shape-stroke-color', l.stroke)}
        <input type="color" class="color-input" data-shape-stroke-input value="${escapeHtml(isHexColor(l.stroke) ? l.stroke : '#101a30')}" aria-label="Custom stroke colour">
      </div>
      <p class="drawer-note" style="margin:.35rem 0 0">Shapes drag, scale and flip like artwork, and AI Animate presets / motion paths / Adjust all apply.</p>
    </div>`;
  }

  /* ---- Phase 10B: flock-path block (selected birds effect layer) ---- */
  function effectToolsHtml(l) {
    if (!l || l.kind !== 'effect' || l.effect !== 'birds') return '';
    const pts = (l.fxPath && l.fxPath.points) || [];
    return `
    <div class="char-tools">
      <p class="sample-head">Flock path — ${escapeHtml(l.name)}</p>
      <p class="muted small-note">${pts.length >= 2
        ? 'The flock follows your custom path (' + pts.length + ' points), looping back to the start.'
        : 'No custom path yet — the flock crosses the sky on the built-in sine sweep.'}
        ${S.fxPathEdit ? ' <b>Editing:</b> click the canvas to add points (max 6), drag a point to move it.' : ''}</p>
      <div class="tool-row">
        <button class="btn small ${S.fxPathEdit ? 'primary' : ''}" data-fxpath="edit" type="button">${S.fxPathEdit ? 'Done editing' : 'Edit flock path'}</button>
        ${pts.length ? '<button class="btn small danger" data-fxpath="clear" type="button">Clear</button>' : ''}
      </div>
    </div>`;
  }

  function characterDrawerHtml() {
    if (!S.assets) return libLoadingHtml() + customCharsHtml(true) + sampleBlockHtml();
    const q = S.charQuery.trim().toLowerCase();
    const chars = S.assets.characters.filter((c) =>
      !q || (c.name + ' ' + (c.role || '') + ' ' + (c.tags || '')).toLowerCase().includes(q));
    return `
      <input class="drawer-search" id="edCharSearch" type="search" placeholder="Search characters…"
             value="${escapeHtml(S.charQuery)}" aria-label="Search characters">
      ${charToolsHtml()}
      ${customCharsHtml(true)}
      <div class="asset-grid">
        ${chars.map((c) => `
          <button class="asset-card" data-character="${c.id}" type="button" title="Add ${escapeHtml(c.name)} to the scene">
            <span class="asset-thumb"><img src="${assetUrl(c.poses[0].file)}" alt="" loading="lazy"></span>
            <span class="asset-name">${escapeHtml(c.name)}</span>
            <span class="asset-meta">${escapeHtml(c.role || '')} · ${c.poses.length} poses · FREE</span>
          </button>`).join('') || '<p class="drawer-note">No characters match your search.</p>'}
      </div>
      ${sampleBlockHtml()}`;
  }

  function sampleBlockHtml() {
    return `
      <div class="sample-block">
        <p class="sample-head">Sample layers (Phase 2 test) <span class="badge sample">Sample</span></p>
        <p class="muted small-note">Plain test shapes kept so Phase-2 projects keep working; the original library above replaces them.</p>
        ${SAMPLE_DEFS.map((d) => `
          <button class="sample-item" data-sample="${d.kind}" type="button">
            <span class="chip" style="background:${d.color}"></span>
            <span>${escapeHtml(d.name)}</span>
            <span class="badge sample">Sample</span>
          </button>`).join('')}
      </div>`;
  }

  function mediaDrawerHtml() {
    const bgBlock = !S.assets ? libLoadingHtml() : `
      <p class="sample-head">Backgrounds</p>
      <div class="asset-grid wide">
        ${S.assets.backgrounds.map((b) => `
          <button class="asset-card" data-background="${b.id}" type="button" title="Set ${escapeHtml(b.name)} as the scene background">
            <span class="asset-thumb wide"><img src="${assetUrl(b.file)}" alt="" loading="lazy"></span>
            <span class="asset-name">${escapeHtml(b.name)}</span>
            <span class="asset-meta">${b.combo ? 'Combo Pack · 2 scenes' : 'Background'} · FREE</span>
          </button>
          ${b.combo && Array.isArray(b.variants) ? `
          <div class="pose-chips" role="group" aria-label="${escapeHtml(b.name)} scenes">
            ${b.variants.map((v, vi) => `
              <button class="chip-btn" data-bg-variant="${b.id}" data-vi="${vi}" type="button" title="Set the ${escapeHtml(v.label)} scene from ${escapeHtml(b.name)}">${escapeHtml(v.label)}</button>`).join('')}
          </div>` : ''}`).join('')}
      </div>`;
    return bgBlock + voiceBlockHtml() + mediaLibraryHtml();
  }

  /* ---- Phase 5: voice recording block (Media drawer) ---- */
  function voiceBlockHtml() {
    if (S.rec) {
      return `
      <div class="sample-block" style="margin-top:.9rem">
        <p class="sample-head">Voice recording</p>
        <p class="small-note" style="margin:.2rem 0">● Recording… <b id="edRecTime">${formatTimecode(S.rec.elapsed)}</b></p>
        <div class="rec-meter"><div class="rec-fill" id="edRecFill"></div></div>
        <button class="btn small danger" data-rec-toggle type="button" style="margin-top:.55rem">■ Stop recording</button>
      </div>`;
    }
    return `
      <div class="sample-block" style="margin-top:.9rem">
        <p class="sample-head">Voice recording</p>
        <button class="btn small primary" data-rec-toggle type="button">● Record voice</button>
        <p class="drawer-note" style="margin:.45rem 0 0">Mic recording (WebM) — saved locally in this browser and added to the timeline at the playhead. The Voice button in the toolbar does the same.</p>
      </div>`;
  }

  /* ---- Phase 5: local audio library (Media drawer) ---- */
  function mediaItemHtml(m) {
    const kindLabel = m.kind === 'recording' ? 'Recording' : (m.kind === 'sfx' ? 'SFX' : 'Upload');
    return `
    <div class="media-item">
      <div class="media-top">
        <span class="media-name" title="${escapeHtml(m.name)}">${escapeHtml(m.name)}</span>
        <span class="badge kind-${escapeHtml(m.kind)}">${kindLabel}</span>
      </div>
      <div class="media-meta">${formatTimecode(m.durationSec || 0)} · ${escapeHtml(formatDateTime(m.createdAt || Date.now()))}</div>
      <div class="tool-row">
        <button class="btn small" data-media-preview="${m.id}" type="button">${S.previewId === m.id ? '■ Stop' : '▶ Preview'}</button>
        <button class="btn small" data-media-add="${m.id}" type="button">Add to Timeline</button>
        <button class="btn small danger" data-media-del="${m.id}" type="button">Delete</button>
      </div>
    </div>`;
  }

  function mediaLibraryHtml() {
    const audioItems = S.mediaList.filter(isAudioMedia);
    return `
      <p class="sample-head" style="margin-top:.9rem">Audio library</p>
      <div class="tool-row">
        <button class="btn small" data-upload-audio type="button">Upload Audio</button>
        <input type="file" id="edAudioFile" accept="audio/*" hidden>
      </div>
      ${!S.mediaLoaded
        ? '<p class="drawer-note">Loading audio library…</p>'
        : (audioItems.length === 0
          ? '<p class="drawer-note">No audio yet — record your voice above, upload a file, or generate a sound effect in the Sounds panel.</p>'
          : `<div class="media-list">${audioItems.map(mediaItemHtml).join('')}</div>`)}
      <p class="drawer-note">Audio files live in this browser only (IndexedDB) — project files reference them by media id, so an exported project shows those clips as “missing media” in another browser until the same audio is added there.</p>`;
  }

  /* ---- Phase 5: Sounds panel — synthesized SFX library ---- */
  function soundsDrawerHtml() {
    return `
      <p class="drawer-note">Original sound effects synthesized in your browser with Web Audio — no audio files. “Generate + Add” renders the effect once to WAV, saves it in the local audio library, and drops it on the timeline at the playhead; later adds reuse the saved copy.</p>
      <div class="media-list">
      ${SFX_DEFS.map((d) => {
        const stored = S.mediaList.find((m) => m.kind === 'sfx' && m.sfxId === d.id);
        return `
        <div class="media-item">
          <div class="media-top">
            <span class="media-name">${escapeHtml(d.name)}</span>
            <span class="badge kind-sfx">SFX</span>
          </div>
          <div class="media-meta">${formatTimecode(d.durationSec)} · ${escapeHtml(d.desc)}${stored ? ' · saved in library' : ''}</div>
          <div class="tool-row">
            <button class="btn small" data-sfx-preview="${d.id}" type="button">▶ Preview</button>
            <button class="btn small primary" data-sfx-add="${d.id}" type="button">${stored ? 'Add to Timeline' : 'Generate + Add'}</button>
          </div>
        </div>`;
      }).join('')}
      </div>`;
  }

  /* ---- Phase 6A: Local panel — offline uploads gallery ----
     Every upload (image / video / audio / GIF / sprite sheet) is stored
     in the IndexedDB media store on THIS device only. Filters mirror
     the reference: All / Images / Videos / Audios / GIFs / Sprite Sheets. */
  const LOCAL_FILTERS = [
    ['all', 'All'], ['image', 'Images'], ['video', 'Videos'],
    ['audio', 'Audios'], ['gif', 'GIFs'], ['sprite', 'Sprite Sheets']
  ];

  function localKindOf(m) {
    if (isAudioMedia(m)) return 'audio';
    if (m.kind === 'sprite') return 'sprite';
    if (m.kind === 'video') return 'video';
    if (m.mime === 'image/gif') return 'gif';
    return 'image';
  }

  function localItemHtml(m) {
    const kind = localKindOf(m);
    const url = kind === 'audio' ? '' : objUrlFor(m);
    let thumb = '';
    if ((kind === 'image' || kind === 'gif' || kind === 'sprite' || m.kind === 'processed') && url) {
      thumb = `<span class="asset-thumb"><img src="${url}" alt="" loading="lazy"></span>`;
    } else if (kind === 'video' && url) {
      thumb = `<span class="asset-thumb"><video src="${url}" muted playsinline preload="metadata"></video></span>`;
    } else {
      thumb = `<span class="asset-thumb"><span class="asset-kind-glyph">${escapeHtml(kind.toUpperCase())}</span></span>`;
    }
    const metaBits = [];
    if (m.width && m.height) metaBits.push(m.width + '×' + m.height);
    if (m.durationSec) metaBits.push(formatTimecode(m.durationSec));
    if (m.kind === 'sprite' && m.frames) metaBits.push(m.frames.count + ' frames · ' + m.frames.fps + ' fps');
    metaBits.push(escapeHtml(formatDateTime(m.createdAt || Date.now())));
    return `
    <div class="media-item">
      ${thumb}
      <div class="media-top" style="margin-top:.35rem">
        <span class="media-name" title="${escapeHtml(m.name)}">${escapeHtml(m.name)}</span>
        <span class="badge kind-${escapeHtml(kind)}">${escapeHtml(kind === 'audio' ? (m.kind === 'recording' ? 'Recording' : m.kind === 'sfx' ? 'SFX' : 'Audio') : kind)}</span>
      </div>
      <div class="media-meta">${metaBits.join(' · ')}</div>
      <div class="tool-row">
        <button class="btn small primary" data-local-add="${m.id}" type="button">Add to Scene</button>
        <button class="btn small danger" data-local-del="${m.id}" type="button">Delete</button>
      </div>
    </div>`;
  }

  function localDrawerHtml() {
    /* Custom characters live in the Studio / My Characters, not here. */
    const items = S.mediaList.filter((m) => m.kind !== 'custom-character' &&
      (S.localFilter === 'all' || localKindOf(m) === S.localFilter));
    return `
      <p class="drawer-note" style="margin-top:0"><span class="badge free">OFFLINE</span> Stored only on this device — uploads are saved automatically in this browser and never sent anywhere.</p>
      <div class="tool-row">
        <button class="btn small primary" data-upload-local type="button">Upload files</button>
        <input type="file" id="edLocalFile" accept="image/*,video/*,audio/*,.gif" multiple hidden>
      </div>
      <div class="pose-chips" role="group" aria-label="Filter uploads">
        ${LOCAL_FILTERS.map(([id, label]) => `
          <button class="chip-btn ${S.localFilter === id ? 'active' : ''}" data-local-filter="${id}" type="button">${label}</button>`).join('')}
      </div>
      ${!S.mediaLoaded
        ? '<p class="drawer-note">Loading uploads…</p>'
        : (items.length === 0
          ? '<p class="drawer-note">Nothing here yet — upload an image, video, GIF, audio file or sprite sheet to use it in your scenes.</p>'
          : `<div class="media-list">${items.map(localItemHtml).join('')}</div>`)}`;
  }

  /* ---- Phase 6A: Effect panel ---- */
  function effectDrawerHtml() {
    return `
      ${effectToolsHtml(sel())}
      <p class="drawer-note" style="margin-top:0">Effects are layers: add one, then move / hide / trim it in the timeline like any other layer. They render in stack order, over or between your artwork.</p>
      <div class="media-list">
      ${EFFECT_DEFS.map((d) => {
        const inten = S.fxIntensity[d.id] || 2;
        return `
        <div class="media-item">
          <div class="media-top">
            <span class="media-name">${escapeHtml(d.name)}</span>
            <span class="badge kind-effect">Effect</span>
          </div>
          <div class="media-meta">${escapeHtml(d.desc)}</div>
          <div class="tool-row">
            <label class="small-note">Intensity
              <select class="tb-select" data-fx-intensity="${d.id}">
                ${[1, 2, 3].map((v) => `<option value="${v}" ${inten === v ? 'selected' : ''}>${v}${v === 1 ? ' · Light' : v === 3 ? ' · Heavy' : ' · Normal'}</option>`).join('')}
              </select>
            </label>
            ${d.id === 'rain' ? `<label class="small-note"><input type="checkbox" data-fx-lightning ${S.fxLightning ? 'checked' : ''}> Lightning</label>` : ''}
            <button class="btn small primary" data-fx-add="${d.id}" type="button">Add to Scene</button>
          </div>
        </div>`;
      }).join('')}
      </div>`;
  }

  /* ---- Phase 6A: Sprite Sheet Studio (Sprite panel) ---- */
  function spriteDrawerHtml() {
    const w = S.spriteWork;
    const saved = S.mediaList.filter((m) => m.kind === 'sprite');
    const workBlock = !w ? `
      <p class="drawer-note">Upload a sprite sheet (one image containing a grid of frames) to slice it into an animated character.</p>` : `
      <div class="sample-block">
        <p class="sample-head">${escapeHtml(w.name)}</p>
        <canvas id="spPreview" class="checker tool-preview" width="220" height="150"></canvas>
        <p class="media-meta"><span data-sp-frame>Frame 1/${w.count}</span> · frame size ${w.cols && w.natW ? Math.round(w.natW / w.cols) : '?'}×${w.rows && w.natH ? Math.round(w.natH / w.rows) : '?'}px · sheet ${w.natW || '?'}×${w.natH || '?'}px</p>
        <div class="tool-grid">
          <label class="small-note">Columns <input class="dur-input" type="number" min="1" max="64" value="${w.cols}" data-sp-num="cols"></label>
          <label class="small-note">Rows <input class="dur-input" type="number" min="1" max="64" value="${w.rows}" data-sp-num="rows"></label>
          <label class="small-note">Frames <input class="dur-input" type="number" min="1" max="4096" value="${w.count}" data-sp-num="count"></label>
          <label class="small-note">FPS <input class="dur-input" type="number" min="1" max="30" value="${w.fps}" data-sp-num="fps"></label>
        </div>
        <label class="small-note"><input type="checkbox" data-sp-onion ${w.onion ? 'checked' : ''}> Onion skin (ghost of previous frame)</label>
        <label class="small-note" style="display:block;margin-top:.4rem">Character name
          <input class="drawer-search" style="margin:.25rem 0 0" type="text" value="${escapeHtml(w.name)}" data-sp-name>
        </label>
        <div class="tool-row" style="margin-top:.5rem">
          <button class="btn small primary" data-sp-save type="button">Save as Character</button>
          <button class="btn small" data-sp-add type="button">Add to Scene</button>
        </div>
      </div>`;
    return `
      <div class="tool-row">
        <button class="btn small primary" data-upload-sprite type="button">Upload Sprite Sheet</button>
        <input type="file" id="edSpriteFile" accept="image/*" hidden>
      </div>
      ${workBlock}
      ${saved.length ? `
      <p class="sample-head" style="margin-top:.8rem">Saved sprites</p>
      <div class="media-list">
        ${saved.map((m) => `
        <div class="media-item">
          <div class="media-top">
            <span class="media-name" title="${escapeHtml(m.name)}">${escapeHtml(m.name)}</span>
            <span class="badge kind-sprite">Sprite</span>
          </div>
          <div class="media-meta">${m.frames ? m.frames.count + ' frames · ' + m.frames.cols + '×' + m.frames.rows + ' · ' + m.frames.fps + ' fps' : 'not sliced yet — open it above to set frames'}${m.id === (w && w.mediaId) ? ' · open in studio' : ''}</div>
          <div class="tool-row">
            <button class="btn small" data-sp-open="${m.id}" type="button">Open in Studio</button>
            <button class="btn small primary" data-sp-addsaved="${m.id}" type="button">Add to Scene</button>
            <button class="btn small danger" data-local-del="${m.id}" type="button">Delete</button>
          </div>
        </div>`).join('')}
      </div>` : ''}`;
  }

  /* ---- Phase 6A: White Background Remover (Anim IK panel) ---- */
  function bgRemoverDrawerHtml() {
    const t = S.bgTool;
    return `
      <p class="sample-head">White Background Remover</p>
      <p class="drawer-note" style="margin-top:0"><span class="badge free">OFFLINE</span> Works offline — the image is processed in your browser and never uploaded.</p>
      <div class="tool-row">
        <button class="btn small primary" data-upload-bg type="button">Upload Image</button>
        <input type="file" id="edBgFile" accept="image/*" hidden>
      </div>
      ${!t ? '<p class="drawer-note">Upload an image on a white (or any solid) background to make it transparent.</p>' : `
      <canvas id="bgPreview" class="checker tool-preview"></canvas>
      <p class="media-meta">Click the image to pick the key colour · ${t.srcCanvas.width}×${t.srcCanvas.height}px${t.scaled ? ' (working copy scaled down from the original)' : ''}</p>
      <div class="tool-row">
        <span class="small-note">Key colour</span>
        <span class="key-swatch" id="bgSwatch" style="background:rgb(${t.key.r},${t.key.g},${t.key.b})"></span>
        <button class="btn small" data-bg-white type="button">Reset to white</button>
      </div>
      <label class="small-note" style="display:block">Range (tolerance) <b data-bg-tol-val>${t.tol}</b>
        <input type="range" min="0" max="200" step="1" value="${t.tol}" data-bg-tol style="width:100%">
      </label>
      <label class="small-note" style="display:block">Edge softness <b data-bg-soft-val>${t.soft}</b>
        <input type="range" min="1" max="150" step="1" value="${t.soft}" data-bg-soft style="width:100%">
      </label>
      <div class="tool-row" style="margin-top:.5rem">
        <button class="btn small" data-bg-download type="button">Download Transparent PNG</button>
        <button class="btn small primary" data-bg-add type="button">Add to Scene</button>
      </div>`}`;
  }

  /* ---- Phase 6A: Eraser (offline photo editor) ---- */
  function eraserDrawerHtml() {
    const t = S.erTool;
    return `
      <p class="sample-head">Eraser — offline photo editor <span class="badge free">Offline Ready</span></p>
      <div class="tool-row">
        <button class="btn small primary" data-upload-er type="button">Upload Photo</button>
        <input type="file" id="edErFile" accept="image/*" hidden>
      </div>
      ${!t ? '<p class="drawer-note">Upload a photo, erase parts of it with the brush, restore with the restore brush, then download a transparent PNG or send it to the scene.</p>' : `
      <canvas id="erCanvas" class="checker tool-preview"></canvas>
      <p class="media-meta" data-er-status>Canvas ${t.work.width}×${t.work.height}px · brush ${t.size}px · ${t.tool === 'erase' ? 'Eraser' : 'Restore'}</p>
      <div class="tool-row">
        <button class="btn small ${t.tool === 'erase' ? 'primary' : ''}" data-er-tool="erase" type="button">Eraser brush</button>
        <button class="btn small ${t.tool === 'restore' ? 'primary' : ''}" data-er-tool="restore" type="button">Restore brush</button>
      </div>
      <label class="small-note" style="display:block">Brush size <b data-er-size-val>${t.size}</b>px
        <input type="range" min="4" max="160" step="1" value="${t.size}" data-er-size style="width:100%">
      </label>
      <label class="small-note" style="display:block">Hardness <b data-er-hard-val>${Math.round(t.hardness * 100)}%</b>
        <input type="range" min="5" max="100" step="1" value="${Math.round(t.hardness * 100)}" data-er-hard style="width:100%">
      </label>
      <div class="tool-row">
        <button class="btn small" data-er-undo type="button">Undo step</button>
        <button class="btn small" data-er-reset type="button">Reset</button>
      </div>
      <div class="tool-row">
        <button class="btn small" data-er-download type="button">Download Transparent PNG</button>
        <button class="btn small primary" data-er-add type="button">Add to Scene</button>
      </div>`}`;
  }

  /* ---- Phase 6B: My Characters list (Studio + Character drawers) ---- */
  function customCharsHtml(showStudioBtn) {
    const list = S.customList || [];
    return `
      <p class="sample-head" style="margin-top:.9rem">My Characters <span class="badge kind-custom">Custom</span></p>
      ${!S.customLoaded
        ? '<p class="drawer-note">Loading your characters…</p>'
        : (list.length === 0
          ? '<p class="drawer-note">No custom characters yet — build one in the Character Studio (Studio panel).</p>'
          : `<div class="media-list">${list.map((rec) => `
        <div class="media-item">
          <span class="asset-thumb"><img src="${characterPreviewUri(rec.params)}" alt="" loading="lazy"></span>
          <div class="media-top" style="margin-top:.35rem">
            <span class="media-name" title="${escapeHtml(rec.name)}">${escapeHtml(rec.name)}</span>
            <span class="badge kind-custom">Custom</span>
          </div>
          <div class="media-meta">Character Studio · 7 poses · ${escapeHtml(formatDateTime(rec.createdAt || Date.now()))}</div>
          <div class="tool-row">
            <button class="btn small primary" data-cust-add="${rec.id}" type="button">Add</button>
            <button class="btn small" data-cust-edit="${rec.id}" type="button">Edit</button>
            <button class="btn small danger" data-cust-del="${rec.id}" type="button">Delete</button>
          </div>
        </div>`).join('')}</div>`)}
      ${showStudioBtn ? '<div class="tool-row"><button class="btn small" data-goto-studio type="button">Open Character Studio</button></div>' : ''}`;
  }

  /* ---- Phase 6B: Character Studio (Studio panel) ----
     In the reference app this studio is Pro-gated; here it is FREE.
     It is a parametric builder (appearance parameters → 6 generated
     poses), not freehand bone rigging — the panel says so honestly. */
  function studioDrawerHtml() {
    const st = S.studio;
    const p = st.params;
    /* Phase 10B: Pose Lab state (defensive — older studio resets). */
    st.mods = normalizePoseMods(st.mods);
    st.customPoses = normalizeCustomPoses(st.customPoses);
    const mods = st.mods;
    const poseSlider = (field, label) => `
      <div class="adj-row">
        <span class="small-note adj-label">${label}</span>
        <input type="range" min="${POSE_MOD_LIMITS[field].min}" max="${POSE_MOD_LIMITS[field].max}" step="1" value="${mods[field]}" data-pose-mod="${field}" aria-label="${label}">
        <span class="small-note adj-val" data-pose-mod-val="${field}">${mods[field]}°</span>
      </div>`;
    const swatchRow = (field, colors, current) => `
      <div class="swatch-row" role="group" aria-label="${field}">
        ${colors.map((c) => `
          <button class="swatch ${current === c ? 'active' : ''}" data-cs-color="${field}" data-val="${c}" style="background:${c}" type="button" aria-label="${field} ${c}"></button>`).join('')}
      </div>`;
    const selRow = (field, label, opts, current) => `
      <label class="small-note" style="display:block;margin:.35rem 0">${label}
        <select class="tb-select cs-select" data-cs-sel="${field}">
          ${opts.map((o) => `<option value="${o.id}" ${o.id === current ? 'selected' : ''}>${escapeHtml(o.label)}</option>`).join('')}
        </select>
      </label>`;
    return `
      <p class="drawer-note" style="margin-top:0"><span class="badge free">FREE</span> In the reference app the Character Studio is behind the Pro paywall — here it is completely free. Pick the look, watch the live preview, then <b>Save Character</b>: it joins “My Characters” with the full 7-pose bundle (Stand / Walk / Talk / Sit / Wave / Point / Back). This is a parametric builder, not freehand bone rigging.</p>
      ${st.fromLibrary ? `<p class="drawer-note">Library character “${escapeHtml(st.fromLibrary)}” is read-only, so the studio starts blank — Save creates YOUR editable copy; the library artwork itself is never edited.</p>` : ''}
      <div class="studio-preview checker"><img src="${characterPreviewUri(p, 'stand', mods)}" alt="Character preview"></div>
      <label class="small-note" style="display:block">Character name
        <input class="drawer-search" style="margin:.25rem 0 .4rem" type="text" maxlength="40" value="${escapeHtml(p.name)}" data-cs-name>
      </label>
      <p class="sample-head">Skin tone</p>
      <div class="swatch-row" role="group" aria-label="Skin tone">
        ${SKIN_TONES.map((c) => `
          <button class="swatch ${p.skinTone === c ? 'active' : ''}" data-cs-skin="${c}" style="background:${c}" type="button" aria-label="Skin tone ${c}"></button>`).join('')}
      </div>
      ${selRow('hairStyle', 'Hair style', HAIR_STYLES, p.hairStyle)}
      <p class="sample-head">Hair colour</p>
      ${swatchRow('hairColor', HAIR_COLORS, p.hairColor)}
      <div class="tool-row">
        <label class="small-note"><input type="checkbox" data-cs-check="beard" ${p.beard ? 'checked' : ''}> Beard</label>
        <label class="small-note"><input type="checkbox" data-cs-check="glasses" ${p.glasses ? 'checked' : ''}> Glasses</label>
      </div>
      ${selRow('topStyle', 'Top / outfit', TOP_STYLES, p.topStyle)}
      <p class="sample-head">Top colour</p>
      ${swatchRow('topColor', TOP_COLORS, p.topColor)}
      ${selRow('bottomStyle', 'Bottom', BOTTOM_STYLES, p.bottomStyle)}
      <p class="sample-head">Bottom colour</p>
      ${swatchRow('bottomColor', BOTTOM_COLORS, p.bottomColor)}
      ${selRow('accessory', 'Accessory', ACCESSORIES, p.accessory)}
      <p class="sample-head" style="margin-top:.85rem">Pose Lab — basic joint sliders</p>
      <p class="drawer-note" style="margin:.2rem 0 .45rem">Pose the standing character with four joint sliders, name the pose, then <b>Save as Custom Pose</b> — it joins this character's pose list (the pose chips on its layers). This is a basic joint-slider pose lab, <b>not</b> full bone IK. Poses are stored on the character when you Save Character${st.editingId ? ' — for this saved character, Save as Custom Pose stores immediately' : ''}.</p>
      ${poseSlider('headTilt', 'Head tilt')}
      ${poseSlider('armL', 'Left arm')}
      ${poseSlider('armR', 'Right arm')}
      ${poseSlider('legSpread', 'Leg spread')}
      <label class="small-note" style="display:block">Pose name
        <input class="drawer-search" style="margin:.25rem 0 .4rem" type="text" maxlength="24" value="${escapeHtml(st.poseName || 'My Pose')}" data-cs-pose-name>
      </label>
      <div class="tool-row">
        <button class="btn small primary" data-cs-save-pose type="button">Save as Custom Pose</button>
        <button class="btn small" data-cs-pose-reset type="button">Reset sliders</button>
      </div>
      ${st.customPoses.length ? `
      <p class="sample-head" style="margin-top:.6rem">Saved poses for this character</p>
      <div class="media-list">
        ${st.customPoses.map((cp) => `
        <div class="media-item">
          <div class="media-top">
            <span class="media-name">${escapeHtml(cp.label)}</span>
            <span class="badge kind-sfx">Pose</span>
          </div>
          <div class="media-meta">Head ${cp.mods.headTilt}° · Left arm ${cp.mods.armL}° · Right arm ${cp.mods.armR}° · Legs ${cp.mods.legSpread}°</div>
          <div class="tool-row">
            <button class="btn small" data-cs-pose-load="${cp.id}" type="button">Load sliders</button>
            <button class="btn small danger" data-cs-pose-del="${cp.id}" type="button">Delete</button>
          </div>
        </div>`).join('')}
      </div>` : ''}
      <div class="tool-row" style="margin-top:.6rem">
        <button class="btn small primary" data-cs-save type="button">${st.editingId ? 'Save Changes' : 'Save Character'}</button>
        <button class="btn small" data-cs-add type="button">Add to Scene</button>
        <button class="btn small" data-cs-new type="button">New / Reset</button>
      </div>
      <p class="drawer-note">“Save Character” is also the new-pose bundle action in our studio: every saved character is generated in all 7 poses at once.</p>
      ${customCharsHtml(false)}`;
  }

  /* ---- Phase 6B: Tutorial panel — bundled Bangla step guides ----
     Original text written for this app; bundled offline (the reference
     loads its tutorials from Firebase and showed an empty panel). */
  const TUTORIALS = [
    {
      title: '১. প্রথম প্রজেক্ট তৈরি',
      steps: [
        'ড্যাশবোর্ডে “New Project” চাপুন — কোনো ডায়ালগ ছাড়াই সঙ্গে সঙ্গে একটি 16:9 প্রজেক্ট তৈরি হয়ে যাবে।',
        'প্রজেক্ট কার্ডে “Open” চাপলে এডিটর খুলবে; উপরের নামের ঘরে প্রজেক্টের নাম বদলাতে পারবেন।',
        'সব কাজ নিজে নিজে সেভ হয় (Auto-saved) — ব্রাউজার বন্ধ করে আবার খুললেও প্রজেক্ট থাকবে।',
        'প্রজেক্ট শুধু এই ব্রাউজারেই থাকে, ইন্টারনেট ছাড়াও খোলে — অফলাইন-ফার্স্ট।',
        'কার্ডের মেনু থেকে Rename, Duplicate ও Delete করা যায়।',
        'ব্যাকআপের জন্য প্রজেক্টটি “.cartoon.json” ফাইল হিসেবে Export করে রাখুন; পরে Import করলেই ফিরে আসবে।'
      ]
    },
    {
      title: '২. ক্যারেক্টার ও পোজ যোগ করা',
      steps: [
        'বাম দিকের Character প্যানেল খুলুন — সার্চ বাক্সে নাম লিখে ক্যারেক্টার খুঁজতে পারবেন।',
        'যেকোনো কার্ডে ক্লিক করলেই ক্যারেক্টারটি সিনে যোগ হয়ে টাইমলাইনে বসবে।',
        'ক্যারেক্টার সিলেক্ট থাকলে উপরে পোজের চিপ দেখা যাবে: Stand, Walk, Talk, Sit, Wave, Point।',
        'Mouth মোড তিনটি: Idle (স্বাভাবিক), Talk (কথা বলার ভঙ্গি), Look Behind (পেছনে তাকানো)।',
        'Flip বোতামে ক্যারেক্টারের দিক বদলায়; ক্যানভাসে ধরে টেনে জায়গা বদলাতে পারবেন।',
        'Media প্যানেল থেকে Background বেছে সিন সাজান, আর Asset Library থেকে প্রপস (গাছ, রিকশা, বই…) যোগ করুন।',
        'নিজের বানানো ক্যারেক্টার “My Characters” তালিকা থেকে একইভাবে যোগ করা যায়।'
      ]
    },
    {
      title: '৩. AI Animate ও Motion Path দিয়ে অ্যানিমেশন',
      steps: [
        'প্রথমে টাইমলাইন বা ক্যানভাসে ক্লিক করে একটি লেয়ার সিলেক্ট করুন।',
        '“AI Animate” বোতামে ৬টি তৈরি প্রিসেট আছে: Gentle Float, Bounce Hop, Breathing, Wave Hello, Walk Step, Surprise Shake।',
        '“Path” বোতাম চাপলে মোশন পাথ এডিট মোড খুলবে — ক্যানভাসে ক্লিক করে গন্তব্য পয়েন্ট দিন (সর্বোচ্চ ৫টি)।',
        'পয়েন্ট ধরে টেনে পথ ঠিক করুন; Easing বেছে নিন: Linear, Ease In-Out বা Ease Out।',
        'Speed স্লাইডারে অ্যানিমেশনের গতি ০.২৫× থেকে ৩× পর্যন্ত বদলানো যায়।',
        'টাইমলাইনে প্লেহেড চালিয়ে (Play) দেখুন — ক্যারেক্টার পথ ধরে মসৃণভাবে চলবে।'
      ]
    },
    {
      title: '৪. ভয়েস রেকর্ড ও সাউন্ড যোগ করা',
      steps: [
        'Media প্যানেলে “Record voice” চাপুন — ব্রাউজার মাইকের অনুমতি চাইলে Allow দিন।',
        'কথা বলা শেষে Stop চাপুন — রেকর্ডিংটি প্লেহেডের জায়গায় ওয়েভফর্মসহ বেগুনি অডিও ট্র্যাক হিসেবে বসবে।',
        'অডিও ক্লিপ সিলেক্ট থাকলে টুলবারে Volume স্লাইডার ও Mute পাবেন।',
        'ক্লিপের ডান ধার টেনে Trim করুন; বাম ধার টানলে সোর্সের offset সরে — মাঝখান থেকে শুরু করা যায়।',
        'Sounds প্যানেল থেকে Rain, Birds, Wind, Thunder, River — “Generate + Add” চাপলেই তৈরি হয়ে টাইমলাইনে বসবে।',
        'ক্যারেক্টারের Mouth মোড Talk রাখলে প্লেব্যাকের সময় মুখ নড়বে — ভয়েস ট্র্যাকের সঙ্গে মিলিয়ে ব্যবহার করুন।',
        'নিজের অডিও ফাইল Media প্যানেলে Upload করেও লাইব্রেরিতে রাখা যায়।'
      ]
    },
    {
      title: '৫. ইফেক্ট ও ব্যাকগ্রাউন্ড রিমুভার ব্যবহার',
      steps: [
        'Effect প্যানেল থেকে Rain, River, Birds, Leaves, Sparkle বা Clouds — “Add to Scene” চাপলেই ইফেক্ট লেয়ার বসবে।',
        'Rain-এর Intensity ১–৩ বাছুন; Lightning চেকবক্সে বজ্রপাতের ঝলক পাবেন।',
        'সাদা ব্যাকগ্রাউন্ডের ছবি স্বচ্ছ করতে Anim IK প্যানেলে ছবি আপলোড করুন।',
        'প্রিভিউ ছবির ব্যাকগ্রাউন্ডে ক্লিক করে key colour বাছুন — সাদা না হলেও যেকোনো একরঙা রং চলবে।',
        'Range স্লাইডারে সহনশীলতা আর Edge Softness-এ ধারের নরমভাব ঠিক করুন।',
        '“Download Transparent PNG” দিয়ে ছবি নামান, অথবা “Add to Scene” দিয়ে সরাসরি সিনে বসান।',
        'Eraser প্যানেলে Eraser ব্রাশে ছবির অংশ মুছুন, Restore ব্রাশে ফেরত আনুন — সবই অফলাইনে, ছবি কোথাও আপলোড হয় না।'
      ]
    },
    {
      title: '৬. ক্যারেক্টার স্টুডিওতে নিজের ক্যারেক্টার বানানো',
      steps: [
        'Studio প্যানেল খুলুন — এই স্টুডিও আমাদের অ্যাপে সম্পূর্ণ ফ্রি (রেফারেন্স অ্যাপে এটি Pro)।',
        'নাম লিখুন, গায়ের রং বাছুন, চুলের স্টাইল (ছোট চুল, খোঁপা, টুপি, গামছা…) ও রং ঠিক করুন।',
        'দাড়ি ও চশমার অপশন চালু/বন্ধ করে চরিত্রের বয়স ও ভাব বদলান।',
        'পোশাক বাছুন: পাঞ্জাবি, শার্ট, শাড়ি, ফ্রক, ইউনিফর্ম বা ভেস্ট; নিচে লুঙ্গি, পাজামা, প্যান্ট, শর্টস বা স্কার্ট।',
        'হাতে লাঠি বা বই, কাঁধে গামছা, গায়ে অ্যাপ্রন — Accessory থেকে যোগ করুন।',
        'প্রতিটি বদলে লাইভ প্রিভিউতে ক্যারেক্টার সঙ্গে সঙ্গে বদলে যাবে।',
        'মনমতো হলে “Save Character” চাপুন — ক্যারেক্টারটি “My Characters”-এ ৭টি পোজসহ সেভ হবে।',
        '“Add to Scene” দিয়ে সরাসরি সিনে বসান; পরে Edit বোতামে আবার বদলে Save Changes করুন।'
      ]
    }
  ];

  function tutorialDrawerHtml() {
    return `
      <p class="drawer-note" style="margin-top:0"><span class="badge free">OFFLINE</span> Guides are built into the app — no internet needed.</p>
      ${TUTORIALS.map((g, i) => `
      <div class="tut-item">
        <button class="tut-head" data-tut="${i}" type="button" aria-expanded="${S.tutOpen === i}">
          <span>${escapeHtml(g.title)}</span><span>${S.tutOpen === i ? '▾' : '▸'}</span>
        </button>
        ${S.tutOpen === i ? `<ol class="tut-steps">${g.steps.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ol>` : ''}
      </div>`).join('')}`;
  }

  /* ---- Phase 6B: Cinema panel — link card to the sister site ---- */
  function cinemaDrawerHtml() {
    return `
      <div class="sample-block">
        <p class="sample-head">GoToCinema — sister site</p>
        <p class="drawer-note" style="margin:.2rem 0 .6rem">The reference studio links out to its sister streaming site, GoToCinema. That streaming site is separate and is not part of this studio — this button simply opens it in a new tab.</p>
        <a class="btn small primary cinema-link" href="https://gotocinema.net" target="_blank" rel="noopener noreferrer">Open GoToCinema ↗</a>
      </div>`;
  }

  function assetsDrawerHtml() {
    if (!S.assets) return libLoadingHtml();
    return `
      <div class="asset-grid">
        ${S.assets.props.map((p) => `
          <button class="asset-card" data-prop="${p.id}" type="button" title="Add ${escapeHtml(p.name)} to the scene">
            <span class="asset-thumb"><img src="${assetUrl(p.file)}" alt="" loading="lazy"></span>
            <span class="asset-name">${escapeHtml(p.name)}</span>
            <span class="asset-meta">Prop · FREE</span>
          </button>`).join('')}
      </div>`;
  }

  function renderDrawer() {
    const panel = PANELS.find((p) => p.id === S.activePanel) || PANELS[0];
    let extra = '';
    if (panel.id === 'character') extra = characterDrawerHtml();
    else if (panel.id === 'media') extra = mediaDrawerHtml();
    else if (panel.id === 'assets') extra = assetsDrawerHtml();
    else if (panel.id === 'sounds') extra = soundsDrawerHtml();
    else if (panel.id === 'local') extra = localDrawerHtml();
    else if (panel.id === 'effect') extra = effectDrawerHtml();
    else if (panel.id === 'sprite') extra = spriteDrawerHtml();
    else if (panel.id === 'animik') extra = bgRemoverDrawerHtml();
    else if (panel.id === 'eraser') extra = eraserDrawerHtml();
    else if (panel.id === 'studio') extra = studioDrawerHtml();
    else if (panel.id === 'tutorial') extra = tutorialDrawerHtml();
    else if (panel.id === 'cinema') extra = cinemaDrawerHtml();
    $('#edDrawer').innerHTML = `
      <h3 class="drawer-title">${escapeHtml(panel.label)}</h3>
      ${extra}
      <p class="drawer-note">${escapeHtml(panel.note)}</p>`;
    $('#edDrawer').style.display = S.drawerOpen ? '' : 'none';
    $('#edRail').style.display = S.railOpen ? '' : 'none';
    mountTools();
  }

  /* --------------------------- render: canvas ---------------------------- */
  function viewTransform() {
    const sd = stageDims(project);
    const cw = canvas.clientWidth || stageArea.clientWidth || 800;
    const ch = canvas.clientHeight || stageArea.clientHeight || 450;
    const fit = Math.min(cw / (sd.w + 60), ch / (sd.h + 60));
    const scale = fit * S.zoomMul;
    return {
      scale,
      ox: (cw - sd.w * scale) / 2 + S.pan.x,
      oy: (ch - sd.h * scale) / 2 + S.pan.y
    };
  }

  function layerVisibleAt(layer, t) {
    return !layer.hidden && layer.kind !== 'camera' &&
      t >= layer.startSec && t < layer.startSec + layer.durSec;
  }

  /* ----- Phase 4: per-frame animation evaluation -----
     Given a layer and an absolute scene time, compute where it is drawn:
     motion-path position (by clip progress) → preset transform offsets →
     pose cycling (Talk flap / Wave / Walk). Pure math lives in anim.js;
     this only adapts it to the current manifest (pose availability). */
  function layerRenderState(layer, t) {
    const anim = layer.anim || { preset: null, path: null, speed: 1 };
    const local = t - layer.startSec;
    const prog = clamp(local / Math.max(layer.durSec, 0.001), 0, 1);
    let x = layer.x, y = layer.y;
    if (anim.path && anim.path.points && anim.path.points.length) {
      const p = pathPointAt(anim.path, prog);
      if (p) { x = p.x; y = p.y; }
    }
    const pt = presetTransform(anim.preset, local, anim.speed || 1);
    x += pt.dx;
    y += pt.dy;
    let poseId = layer.poseId;
    if (layer.kind === 'character' && layer.assetId) {
      const ch = getCharacterDef(layer.assetId);
      /* Pose cycling only applies when the character actually has the pose;
         otherwise the preset stays transform-only. */
      const hasPose = (id) => !ch || ch.poses.some((p) => p.id === id);
      if (layer.mouthMode === 'talk') {
        if (S.playing) {
          /* Phase 10B amplitude lip-sync (layer.lipSync 'auto', the
             default): while an audio clip is sounding at the playhead,
             the mouth follows the engine's LIVE level — open on sound,
             closed in the gaps (90 ms anti-flicker hold in anim.js).
             With no audio sounding, or lipSync 'timed', the Phase-4
             6 Hz timed flap runs instead. Export renders through this
             same path, so the lip-sync is baked into exported video. */
          if (layer.lipSync !== 'timed' && audioSoundingAt(S.playhead)) {
            const st = mouthPoseForLevel(engine.getLevel(), S.lipHold.get(layer.id) || null, performance.now());
            S.lipHold.set(layer.id, st);
            if (hasPose(st.pose)) poseId = st.pose;
          } else {
            const tp = talkPoseAt(local, anim.speed || 1);
            if (hasPose(tp)) poseId = tp;
          }
        } else if (hasPose('talk')) {
          poseId = 'talk'; /* paused: hold the Talk pose */
        }
      }
      if (pt.poseId && hasPose(pt.poseId)) poseId = pt.poseId;
      /* Phase 10A: Look Behind shows the REAL Back pose when the
         character has one (all library people + custom characters);
         characters without one keep the Phase-3 flip fallback. */
      if (layer.mouthMode === 'behind' && hasPose('back')) poseId = 'back';
    }
    /* Phase 8: subtitles are pinned to the bottom centre of the stage —
       their stored x/y (and any path/preset offsets) do not move them. */
    if (layer.kind === 'subtitle') {
      const sd = stageDims(project);
      return { x: sd.w / 2, y: Math.round(sd.h * 0.91), scale: layer.scale * (pt.scaleMul || 1), poseId };
    }
    return { x, y, scale: layer.scale * (pt.scaleMul || 1), poseId };
  }

  function cameraLayer() {
    return layers().find((l) => l.kind === 'camera' && !l.hidden) || null;
  }

  /* The camera view in effect at the playhead (null = static identity).
     While camera-edit mode is on for the selected camera, the working
     view (S.camView) is previewed instead of the keyframes. */
  function resolveCamera(camLayer) {
    const cam = camLayer || cameraLayer();
    if (!cam) return null;
    if (S.camEdit && S.selectedId === cam.id) return { ...S.camView };
    const keys = cam.camera && cam.camera.keys;
    return keys && keys.length ? cameraAt(keys, S.playhead) : null;
  }

  /* Camera transform in stage space: zoom around the stage centre, then
     shift by the view offset (positive x/y move the picture right/down). */
  function applyCameraTransform(cam) {
    const sd = stageDims(project);
    ctx.translate(sd.w / 2, sd.h / 2);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-sd.w / 2 + cam.x, -sd.h / 2 + cam.y);
  }

  function renderCanvas() {
    /* Phase 7 export mode: the backing store IS the export frame and
       the view transform maps the logical stage onto it exactly —
       no workspace fit, pan, zoom or devicePixelRatio. */
    const exporting = !!S.exportMode;
    EXPORT_LABELS_OFF = exporting;
    /* Phase 8: every stage measurement below uses THIS project's dims. */
    const sd = stageDims(project);
    setActiveStage(sd);
    let cw, ch, dpr = 1, vt;
    if (exporting) {
      cw = S.exportSize.w;
      ch = S.exportSize.h;
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw;
        canvas.height = ch;
      }
      vt = { scale: cw / sd.w, ox: 0, oy: 0 };
    } else {
      cw = canvas.clientWidth;
      ch = canvas.clientHeight;
      if (!cw || !ch) return;
      dpr = window.devicePixelRatio || 1;
      if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) {
        canvas.width = Math.round(cw * dpr);
        canvas.height = Math.round(ch * dpr);
      }
      vt = viewTransform();
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    ctx.translate(vt.ox, vt.oy);
    ctx.scale(vt.scale, vt.scale);

    /* Stage frame (untransformed — the camera moves the picture inside it) */
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, sd.w, sd.h);
    ctx.strokeStyle = '#22345c';
    ctx.lineWidth = 2 / vt.scale;
    ctx.strokeRect(0, 0, sd.w, sd.h);

    /* Phase 4: the Camera layer's keyframes drive a real stage transform. */
    const camLayerFound = cameraLayer();
    const cam = resolveCamera(camLayerFound);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, sd.w, sd.h);
    ctx.clip();
    if (cam) applyCameraTransform(cam);
    for (const layer of layers()) {
      if (layerVisibleAt(layer, S.playhead)) {
        if (layer.kind === 'effect') {
          /* Phase 6A: effects draw in stage space, in stack order. */
          ctx.save();
          ctx.globalAlpha = layer.opacity;
          drawEffect(ctx, layer, S.playhead, { w: sd.w, h: sd.h });
          ctx.restore();
          continue;
        }
        const ev = layerRenderState(layer, S.playhead);
        const drawLayer = { ...layer, x: ev.x, y: ev.y, scale: ev.scale, poseId: ev.poseId };
        if (layer.kind === 'image' || layer.kind === 'video' || layer.kind === 'sprite') {
          drawMediaLayer(ctx, drawLayer, S.playhead - layer.startSec);
        } else {
          drawLayerShape(ctx, drawLayer, () => renderCanvas());
        }
      }
    }
    /* Pause any video element whose layer is not currently on stage. */
    for (const [lid, rec] of S.videoEls) {
      const l = layers().find((x) => x.id === lid);
      if (!l || !layerVisibleAt(l, S.playhead)) {
        if (!rec.el.paused) { try { rec.el.pause(); } catch { /* noop */ } }
      }
    }

    /* Selection outline (at the layer's animated position) — editor
       aid only, never in an export frame. */
    const s = sel();
    if (!exporting && s && layerVisibleAt(s, S.playhead)) {
      const box = layerBox(s);
      if (box) {
        const ev = layerRenderState(s, S.playhead);
        ctx.save();
        ctx.strokeStyle = '#ffb020';
        ctx.lineWidth = 3 / vt.scale;
        ctx.setLineDash([12 / vt.scale, 8 / vt.scale]);
        ctx.strokeRect(
          ev.x - (box.w * ev.scale) / 2 - 8, ev.y - (box.h * ev.scale) / 2 - 8,
          box.w * ev.scale + 16, box.h * ev.scale + 16
        );
        ctx.restore();
      }
    }

    /* Motion-path preview for the selected layer (dashed line + handles) */
    if (!exporting && s && s.anim && s.anim.path && s.anim.path.points && s.anim.path.points.length &&
        (S.showPath || S.pathEdit)) {
      const pts = s.anim.path.points;
      ctx.save();
      ctx.strokeStyle = S.pathEdit ? '#ffb020' : 'rgba(255,176,32,0.7)';
      ctx.lineWidth = 2.5 / vt.scale;
      ctx.setLineDash([10 / vt.scale, 7 / vt.scale]);
      ctx.beginPath();
      pts.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = '700 ' + Math.round(13 / vt.scale) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      pts.forEach((p, i) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 10 / vt.scale, 0, Math.PI * 2);
        ctx.fillStyle = S.pathEdit ? '#ffb020' : 'rgba(255,176,32,0.85)';
        ctx.fill();
        ctx.fillStyle = '#101a30';
        ctx.fillText(String(i + 1), p.x, p.y + 1);
      });
      ctx.restore();
    }

    /* Phase 10B: flock-path preview for the selected birds layer
       (dashed polyline + numbered handles, like motion paths). */
    if (!exporting && s && s.kind === 'effect' && s.effect === 'birds' &&
        ((s.fxPath && s.fxPath.points && s.fxPath.points.length >= 2) || S.fxPathEdit)) {
      const pts = (s.fxPath && s.fxPath.points) || [];
      ctx.save();
      if (pts.length >= 2) {
        ctx.strokeStyle = S.fxPathEdit ? '#4fc3f7' : 'rgba(79,195,247,0.7)';
        ctx.lineWidth = 2.5 / vt.scale;
        ctx.setLineDash([10 / vt.scale, 7 / vt.scale]);
        ctx.beginPath();
        pts.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.font = '700 ' + Math.round(13 / vt.scale) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      pts.forEach((p, i) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 10 / vt.scale, 0, Math.PI * 2);
        ctx.fillStyle = S.fxPathEdit ? '#4fc3f7' : 'rgba(79,195,247,0.85)';
        ctx.fill();
        ctx.fillStyle = '#101a30';
        ctx.fillText(String(i + 1), p.x, p.y + 1);
      });
      ctx.restore();
    }
    ctx.restore();

    /* Camera status pill — reflects the LIVE camera state (Phase 4).
       Editor aid only, never in an export frame. */
    if (!exporting && camLayerFound) {
      const label = cam
        ? 'CAMERA · ' + cam.zoom.toFixed(2) + '×' + (S.camEdit && S.selectedId === camLayerFound.id ? ' · EDITING' : '')
        : 'CAMERA · no keyframes';
      ctx.save();
      ctx.font = '600 20px sans-serif';
      const w = ctx.measureText(label).width + 36;
      ctx.fillStyle = 'rgba(6,10,20,0.75)';
      rr(ctx, sd.w - w - 16, 16, w, 40, 20);
      ctx.fill();
      ctx.fillStyle = '#eef2fb';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, sd.w - w / 2 - 16, 37);
      ctx.restore();
    }

    /* Safe-area guide (editor aid — never in an export frame) */
    if (!exporting && S.framing) {
      ctx.save();
      const ix = sd.w * 0.05, iy = sd.h * 0.05;
      ctx.strokeStyle = 'rgba(255,255,255,0.65)';
      ctx.lineWidth = 2 / vt.scale;
      ctx.setLineDash([16 / vt.scale, 10 / vt.scale]);
      ctx.strokeRect(ix, iy, sd.w - ix * 2, sd.h - iy * 2);
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.font = '600 20px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Safe area — Camera framing', ix + 10, iy + 26);
      ctx.restore();
    }

    /* Scene-transition fade: 300 ms fade-from-black after an auto-advance
       into a scene whose transitionIn is 'fade' (see transport). */
    if (S.fadeStart) {
      const elapsed = performance.now() - S.fadeStart;
      if (elapsed < 300) {
        ctx.fillStyle = 'rgba(0,0,0,' + (1 - elapsed / 300).toFixed(3) + ')';
        ctx.fillRect(0, 0, sd.w, sd.h);
      } else {
        S.fadeStart = 0;
      }
    }

    $('#edZoomLabel').textContent = Math.round(S.zoomMul * 100) + '%';
  }

  function screenToStage(evt) {
    const rect = canvas.getBoundingClientRect();
    const vt = viewTransform();
    const q = {
      x: (evt.clientX - rect.left - vt.ox) / vt.scale,
      y: (evt.clientY - rect.top - vt.oy) / vt.scale
    };
    /* Invert the camera transform: q = C + z·(p − C + o) ⇒ p = (q − C)/z + C − o */
    const cam = resolveCamera();
    if (cam && cam.zoom) {
      const sd = stageDims(project);
      return {
        x: (q.x - sd.w / 2) / cam.zoom + sd.w / 2 - cam.x,
        y: (q.y - sd.h / 2) / cam.zoom + sd.h / 2 - cam.y
      };
    }
    return q;
  }

  function hitLayer(pt) {
    const arr = layers();
    for (let i = arr.length - 1; i >= 0; i--) {
      const layer = arr[i];
      if (layer.locked || !layerVisibleAt(layer, S.playhead)) continue;
      const box = layerBox(layer);
      if (!box) continue;
      const ev = layerRenderState(layer, S.playhead);
      const hw = (box.w * ev.scale) / 2, hh = (box.h * ev.scale) / 2;
      if (pt.x >= ev.x - hw && pt.x <= ev.x + hw && pt.y >= ev.y - hh && pt.y <= ev.y + hh) {
        return layer;
      }
    }
    return null;
  }

  /* Canvas pointer interactions, in priority order:
     1) motion-path editing (Phase 4)  2) camera-view editing (Phase 4)
     3) hand-tool pan                  4) select / drag layer            */
  let drag = null;
  canvas.addEventListener('pointerdown', (evt) => {
    canvas.setPointerCapture(evt.pointerId);
    const pt = screenToStage(evt);
    const sd = stageDims(project);

    /* 1) Path-edit mode: drag an existing point, or click to add one. */
    if (S.pathEdit) {
      const l = sel();
      if (l && l.anim && l.anim.path) {
        const pts = l.anim.path.points;
        const idx = pts.findIndex((p) => Math.hypot(p.x - pt.x, p.y - pt.y) <= 16 / viewTransform().scale + 6);
        if (idx >= 0) {
          drag = { type: 'pathpoint', id: l.id, idx, before: snapshot(), moved: false };
        } else if (pts.length >= 5) {
          toast('Path is full — 5 points max (4 segments)');
        } else {
          pushHistory();
          pts.push({
            t: 1,
            x: Math.round(clamp(pt.x, 0, sd.w)),
            y: Math.round(clamp(pt.y, 0, sd.h))
          });
          l.anim.path.points = retimePathPoints(pts);
          markDirty();
          renderAll();
        }
      }
      return;
    }

    /* 1b) Flock-path editing (Phase 10B): same interaction pattern as
       the motion path — drag an existing point, or click to add one
       (max 6). Points are raw stage coordinates on layer.fxPath. */
    if (S.fxPathEdit) {
      const l = sel();
      if (l && l.kind === 'effect' && l.effect === 'birds') {
        if (!l.fxPath) l.fxPath = { points: [] };
        const pts = l.fxPath.points;
        const idx = pts.findIndex((p) => Math.hypot(p.x - pt.x, p.y - pt.y) <= 16 / viewTransform().scale + 6);
        if (idx >= 0) {
          drag = { type: 'fxpoint', id: l.id, idx, before: snapshot(), moved: false };
        } else if (pts.length >= 6) {
          toast('Flock path is full — 6 points max');
        } else {
          pushHistory();
          pts.push({
            x: Math.round(clamp(pt.x, 0, sd.w)),
            y: Math.round(clamp(pt.y, 0, sd.h))
          });
          markDirty();
          renderAll();
        }
      }
      return;
    }

    /* 2) Camera-edit mode: dragging pans the working camera view. Screen
       deltas are used (not stage coords) so the moving view can't feed
       back into its own inverse transform. */
    const selLayer = sel();
    if (S.camEdit && selLayer && selLayer.kind === 'camera') {
      drag = {
        type: 'cam',
        startX: evt.clientX, startY: evt.clientY,
        view: { ...S.camView }
      };
      return;
    }

    if (S.handTool) {
      drag = { type: 'pan', startX: evt.clientX, startY: evt.clientY, panX: S.pan.x, panY: S.pan.y };
      return;
    }
    const hit = hitLayer(pt);
    if (hit) {
      if (S.selectedId !== hit.id) { S.pathEdit = false; S.fxPathEdit = false; S.presetPicker = false; }
      S.selectedId = hit.id;
      /* Phase 8: subtitles stay fixed at the bottom — select only, no drag. */
      if (hit.kind === 'subtitle') { renderAll(); return; }
      const ev = layerRenderState(hit, S.playhead);
      drag = {
        type: 'layer', id: hit.id,
        dx: ev.x - pt.x, dy: ev.y - pt.y,
        before: snapshot(), moved: false
      };
      renderAll();
    } else {
      S.selectedId = null;
      S.pathEdit = false;
      S.fxPathEdit = false;
      S.presetPicker = false;
      renderAll();
    }
  });
  canvas.addEventListener('pointermove', (evt) => {
    if (!drag) return;
    if (drag.type === 'pan') {
      S.pan.x = drag.panX + (evt.clientX - drag.startX);
      S.pan.y = drag.panY + (evt.clientY - drag.startY);
      renderCanvas();
      return;
    }
    if (drag.type === 'cam') {
      const vt = viewTransform();
      const z = Math.max(drag.view.zoom, 0.1);
      S.camView.x = Math.round(drag.view.x + (evt.clientX - drag.startX) / (vt.scale * z));
      S.camView.y = Math.round(drag.view.y + (evt.clientY - drag.startY) / (vt.scale * z));
      renderCanvas();
      return;
    }
    const layer = layers().find((l) => l.id === drag.id);
    if (!layer) return;
    const pt = screenToStage(evt);
    const sd = stageDims(project);
    if (drag.type === 'pathpoint') {
      const p = layer.anim && layer.anim.path && layer.anim.path.points[drag.idx];
      if (!p) return;
      p.x = Math.round(clamp(pt.x, 0, sd.w));
      p.y = Math.round(clamp(pt.y, 0, sd.h));
      drag.moved = true;
      renderCanvas();
      return;
    }
    if (drag.type === 'fxpoint') {
      const p = layer.fxPath && layer.fxPath.points[drag.idx];
      if (!p) return;
      p.x = Math.round(clamp(pt.x, 0, sd.w));
      p.y = Math.round(clamp(pt.y, 0, sd.h));
      drag.moved = true;
      renderCanvas();
      return;
    }
    /* Layer drag: shift the layer so its ANIMATED position follows the
       pointer; a motion path (and its anchor) shifts by the same delta. */
    const cur = layerRenderState(layer, S.playhead);
    const sx = Math.round((pt.x + drag.dx) - cur.x);
    const sy = Math.round((pt.y + drag.dy) - cur.y);
    if (sx || sy) {
      layer.x += sx;
      layer.y += sy;
      if (layer.anim && layer.anim.path && layer.anim.path.points) {
        for (const p of layer.anim.path.points) { p.x += sx; p.y += sy; }
      } else {
        layer.x = clamp(layer.x, -100, sd.w + 100);
        layer.y = clamp(layer.y, -100, sd.h + 100);
      }
      drag.moved = true;
    }
    renderCanvas();
  });
  /* Phase 6B (parity 4.6): double-clicking a character layer on the
     canvas selects it and opens the Character Studio drawer. */
  canvas.addEventListener('dblclick', (evt) => {
    const hit = hitLayer(screenToStage(evt));
    if (hit && hit.kind === 'character') {
      S.selectedId = hit.id;
      S.pathEdit = false;
      S.presetPicker = false;
      openStudioForLayer(hit);
      renderAll();
    }
  });
  canvas.addEventListener('pointerup', () => {
    if (drag && (drag.type === 'layer' || drag.type === 'pathpoint' || drag.type === 'fxpoint') && drag.moved) {
      S.undo.push(drag.before);
      if (S.undo.length > HISTORY_CAP) S.undo.shift();
      S.redo.length = 0;
      markDirty();
    }
    if (drag && drag.type === 'cam') renderDrawer(); /* refresh view readouts */
    drag = null;
  });

  const ro = new ResizeObserver(() => renderCanvas());
  ro.observe(stageArea);

  /* --------------------------- render: timeline -------------------------- */
  const LABEL_W = 232;

  function clipColor(layer) {
    if (layer.kind === 'sample-background' || layer.kind === 'background') return '#2fb36f'; /* reference: background tracks are green */
    if (layer.kind === 'camera') return '#5b729e';
    if (layer.kind === 'audio') return '#8b6ff0'; /* reference: audio tracks are purple */
    if (layer.kind === 'effect') return '#4fc3f7';
    if (layer.kind === 'image') return '#26a69a';
    if (layer.kind === 'video') return '#7e8ce0';
    if (layer.kind === 'sprite') return '#ffa000';
    /* Phase 8: layer.color on text layers is the TEXT colour — clips
       keep their own fixed colours instead. */
    if (layer.kind === 'text') return '#4fc3f7';
    if (layer.kind === 'shape') return '#f2a007'; /* Phase 10B */
    if (layer.kind === 'subtitle') return '#ffd54a';
    return layer.color || '#8b6ff0';
  }

  function renderTimeline() {
    const sc = scene();
    const dur = sc.durationSec;
    const width = LABEL_W + Math.ceil(dur * S.pxPerSec) + 60;
    const arr = layers();
    const step = S.pxPerSec * 10 >= 70 ? 10 : (S.pxPerSec * 30 >= 70 ? 30 : 60);

    let ticks = '';
    for (let t = 0; t <= dur; t += step) {
      ticks += `<span class="tick" style="left:${LABEL_W + t * S.pxPerSec}px">${formatTimecode(t)}</span>`;
    }
    let rows = '';
    if (arr.length === 0) {
      rows = `<div class="tl-empty">No layers in timeline. Add a sample layer to begin. — Character প্যানেল থেকে Sample layer যোগ করুন।</div>`;
    } else {
      /* Display top layer first; storage order stays bottom → top. */
      rows = [...arr].reverse().map((layer) => {
        const left = LABEL_W + layer.startSec * S.pxPerSec;
        const w = Math.max(10, layer.durSec * S.pxPerSec);
        const isSel = layer.id === S.selectedId;
        return `
        <div class="track-row ${isSel ? 'selected' : ''}" data-row="${layer.id}">
          <div class="track-label">
            <span class="chip" style="background:${clipColor(layer)}"></span>
            <span class="track-name" title="${escapeHtml(layer.name)}${layer.kind === 'audio' && layer.mediaId && S.mediaLoaded && !S.mediaMap.has(layer.mediaId) ? ' — missing media: this audio was deleted from the library (Media panel); the clip is skipped during playback' : ''}">${escapeHtml(layer.name)}${layer.kind === 'camera' ? ' · CAMERA' : ''}</span>
            <span class="track-btns">
              <button class="mini" data-act="front" title="Bring to front" type="button">⤒</button>
              <button class="mini" data-act="up" title="Move layer up (towards front)" type="button">↑</button>
              <button class="mini" data-act="down" title="Move layer down" type="button">↓</button>
              <button class="mini" data-act="back" title="Send to back" type="button">⤓</button>
              ${layer.kind === 'audio'
                ? `<button class="mini ${layer.muted ? 'off' : ''}" data-act="hide" title="Mute / unmute this audio clip" type="button">${layer.muted ? 'Unmute' : 'Mute'}</button>`
                : `<button class="mini ${layer.hidden ? 'off' : ''}" data-act="hide" title="Hide / show" type="button">${layer.hidden ? 'Show' : 'Hide'}</button>`}
              <button class="mini ${layer.locked ? 'off' : ''}" data-act="lock" title="Lock / unlock" type="button">${layer.locked ? 'Unlock' : 'Lock'}</button>
              <button class="mini" data-act="opts" title="Layer options (Rename / Duplicate / Delete)" type="button">⋯</button>
              <button class="mini danger" data-act="remove" title="Remove layer" type="button">✕</button>
            </span>
          </div>
          <div class="clip ${layer.kind === 'audio' ? 'audio-clip' : ''}" data-clip="${layer.id}" title="${escapeHtml(layer.name)}${layer.anim && layer.anim.preset ? ' · ' + escapeHtml(presetLabel(layer.anim.preset)) : ''}${layer.kind === 'audio' ? ' — drag to move, drag either edge to trim' : ' — drag to move, drag right edge to resize'}"
               style="left:${left}px;width:${w}px;background:${clipColor(layer)}">
            ${layer.kind === 'audio' ? `<canvas class="clip-wave" data-wave="${escapeHtml(layer.mediaId || '')}" data-offset="${layer.offsetSec || 0}" data-dur="${layer.durSec}" data-mediadur="${layer.mediaDurSec || 0}" width="${Math.max(8, Math.round(w))}" height="26"></canvas><span class="clip-edge left" data-edge-left="${layer.id}"></span>` : ''}
            <span class="clip-name">${escapeHtml(layer.kind === 'audio' ? layer.name : (KIND_LABEL[layer.kind] || layer.kind))}</span>
            ${layer.anim && layer.anim.preset ? `<span class="clip-badge">${escapeHtml(presetLabel(layer.anim.preset))}</span>` : ''}
            ${layer.kind === 'audio' ? `<span class="clip-badge">${formatTimecode(layer.durSec)}</span>` : ''}
            ${layer.kind === 'sprite' ? `<span class="clip-badge">Sprite · ${layer.fps || 12} fps</span>` : ''}
            ${layer.kind === 'effect' ? `<span class="clip-badge">${escapeHtml((EFFECT_DEFS.find((d) => d.id === layer.effect) || {}).name || 'Effect')} · Lv ${layer.intensity || 2}${layer.lightning ? ' · Lightning' : ''}</span>` : ''}
            ${(layer.kind === 'image' || layer.kind === 'video' || layer.kind === 'sprite') && layer.mediaId && S.mediaLoaded && !S.mediaMap.has(layer.mediaId) ? '<span class="clip-badge warn">MISSING MEDIA</span>' : ''}
            ${layer.kind === 'character' && isCustomAssetId(layer.assetId) && S.customLoaded && !customCharStore.map.has(layer.assetId.slice(CUSTOM_PREFIX.length)) ? '<span class="clip-badge warn">MISSING MEDIA</span>' : ''}
            ${layer.kind === 'audio' && layer.muted ? '<span class="clip-badge warn">MUTED</span>' : ''}
            ${layer.kind === 'audio' && layer.mediaId && S.mediaLoaded && !S.mediaMap.has(layer.mediaId) ? '<span class="clip-badge warn">MISSING MEDIA</span>' : ''}
            <span class="clip-edge" data-edge="${layer.id}"></span>
          </div>
        </div>`;
      }).join('');
    }
    tracksInner.style.width = width + 'px';
    tracksInner.innerHTML = `
      <div class="tl-ruler" id="edRuler">${ticks}<span class="tick end" style="left:${LABEL_W + dur * S.pxPerSec}px">End (${formatTimecode(dur)})</span></div>
      <div class="tl-rows ${S.layersCollapsed ? 'collapsed' : ''}">${rows}</div>
      <div class="playhead" id="edPlayhead"></div>`;
    updatePlayheadUI();
    $('#edDurInput').value = String(dur);
    drawWaveforms();
  }

  function updatePlayheadUI() {
    const ph = $('#edPlayhead');
    if (ph) ph.style.left = (LABEL_W + S.playhead * S.pxPerSec) + 'px';
    const t = $('#edTime');
    if (t) t.textContent = formatTimecode(S.playhead) + ' / ' + formatTimecode(scene().durationSec);
  }

  /* ----- Phase 5: waveform strips inside audio clips -----
     Peaks are computed once per media id (decoded by the audio engine)
     and cached in S.peaks; each clip draws the slice of the waveform
     covered by its offset/duration window. Missing media draws a
     hatched strip; not-yet-decoded media draws a placeholder line and
     kicks off the decode. */
  function ensurePeaks(mediaId) {
    if (!mediaId || S.peaks.has(mediaId)) return;
    S.peaks.set(mediaId, null); /* pending marker — avoids duplicate decodes */
    engine.getPeaks(mediaId, 240).then((peaks) => {
      if (S.destroyed) return;
      S.peaks.set(mediaId, peaks || null);
      drawWaveforms();
    }).catch(() => { /* peaks stay null; clips keep the placeholder line */ });
  }

  function drawWaveforms() {
    tracksInner.querySelectorAll('canvas.clip-wave').forEach((cv) => {
      const g = cv.getContext('2d');
      const W = cv.width, H = cv.height;
      if (!g || !W) return;
      g.clearRect(0, 0, W, H);
      const mediaId = cv.dataset.wave || '';
      const missing = !mediaId || (S.mediaLoaded && !S.mediaMap.has(mediaId));
      if (missing) {
        g.strokeStyle = 'rgba(255,120,150,0.85)';
        g.lineWidth = 1;
        g.beginPath();
        for (let x = -H; x < W; x += 7) { g.moveTo(x, H); g.lineTo(x + H, 0); }
        g.stroke();
        return;
      }
      const peaks = S.peaks.get(mediaId);
      if (!peaks) {
        ensurePeaks(mediaId);
        g.strokeStyle = 'rgba(255,255,255,0.45)';
        g.lineWidth = 1;
        g.beginPath(); g.moveTo(0, H / 2); g.lineTo(W, H / 2); g.stroke();
        return;
      }
      const offset = parseFloat(cv.dataset.offset) || 0;
      const dur = parseFloat(cv.dataset.dur) || 0;
      const mediaDur = parseFloat(cv.dataset.mediadur) ||
        (S.mediaMap.get(mediaId) || {}).durationSec || (dur + offset);
      g.strokeStyle = 'rgba(255,255,255,0.9)';
      g.lineWidth = 1;
      g.beginPath();
      for (let x = 0; x < W; x++) {
        const t = offset + (x / W) * dur;
        const idx = Math.min(peaks.length - 1, Math.max(0, Math.floor((t / Math.max(mediaDur, 0.001)) * peaks.length)));
        const amp = Math.max(0.04, peaks[idx] || 0);
        const half = (amp * (H - 4)) / 2;
        g.moveTo(x + 0.5, H / 2 - half);
        g.lineTo(x + 0.5, H / 2 + half);
      }
      g.stroke();
    });
  }

  /* Audio layers of the active scene that should sound right now:
     media present, not muted/hidden. Missing-media clips are skipped
     silently (they are flagged in the timeline instead). */
  function audibleLayers() {
    return layers().filter((l) => l.kind === 'audio' && l.mediaId && !l.muted && !l.hidden &&
      (!S.mediaLoaded || S.mediaMap.has(l.mediaId)));
  }

  /* Phase 10B: is any audible audio clip's window covering time t?
     (The lip-sync gate — the mouth only follows the level while a
     clip is actually sounding at the playhead.) */
  function audioSoundingAt(t) {
    return layers().some((l) => l.kind === 'audio' && l.mediaId && !l.muted && !l.hidden &&
      t >= (l.startSec || 0) && t < (l.startSec || 0) + (l.durSec || 0) &&
      (!S.mediaLoaded || S.mediaMap.has(l.mediaId)));
  }

  /* ----- Phase 5: volume / mute controls for the selected audio clip --- */
  function renderAudioTools() {
    const box = $('#edAudioTools');
    if (!box) return;
    const l = sel();
    if (!l || l.kind !== 'audio') { box.innerHTML = ''; return; }
    const pct = Math.round((Number.isFinite(l.volume) ? l.volume : 1) * 100);
    const missing = l.mediaId && S.mediaLoaded && !S.mediaMap.has(l.mediaId);
    box.innerHTML = `
      <span class="tb-sep"></span>
      <label class="tb-label">Volume
        <input type="range" min="0" max="100" step="1" value="${pct}" data-vol-range aria-label="Audio clip volume">
        <span data-vol-val>${pct}%</span>
      </label>
      <label class="tb-label"><input type="checkbox" data-vol-mute ${l.muted ? 'checked' : ''}> Mute</label>
      <span class="small-note muted">Offset ${formatTimecode(l.offsetSec || 0)}${l.mediaDurSec ? ' · media ' + formatTimecode(l.mediaDurSec) : ''}${missing ? ' · media missing' : ''}</span>`;
  }

  /* ----- Phase 8: TTS preview (Web Speech API) -----
     Preview aid ONLY. Three hard guarantees keep the computer voice
     out of exported videos: (1) ttsSpeak() refuses to run while
     S.exportMode is on; (2) export never calls it — auto-speak only
     runs from the preview transport; (3) the export records the
     canvas + the Web Audio mix, never system speech. Speech is
     cancelled on pause, seek and scene switch. */
  function ttsAvailable() {
    return typeof window !== 'undefined' && 'speechSynthesis' in window &&
      typeof SpeechSynthesisUtterance !== 'undefined';
  }
  function refreshTtsVoices() {
    if (!ttsAvailable()) { S.ttsVoices = []; return; }
    let list = [];
    try { list = speechSynthesis.getVoices() || []; } catch { list = []; }
    const rank = (v) => {
      const lang = String((v && v.lang) || '').toLowerCase();
      if (lang.startsWith('bn')) return 0; /* Bangla first */
      if (lang.startsWith('en')) return 1; /* then English */
      return 2;
    };
    S.ttsVoices = [...list].sort((a, b) =>
      rank(a) - rank(b) ||
      String(a.lang).localeCompare(String(b.lang)) ||
      String(a.name).localeCompare(String(b.name)));
  }
  function ttsCancel() {
    if (!ttsAvailable()) return;
    try { speechSynthesis.cancel(); } catch { /* best-effort */ }
  }
  function ttsSpeak(text) {
    if (S.exportMode) return; /* NEVER during export */
    if (!ttsAvailable()) return;
    const t = String(text || '').trim();
    if (!t) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(t);
      const v = S.ttsVoices.find((x) => x.voiceURI === S.tts.voiceURI);
      if (v) { u.voice = v; u.lang = v.lang; }
      u.rate = clamp(Number.isFinite(S.tts.rate) ? S.tts.rate : 1, 0.5, 2);
      speechSynthesis.speak(u);
    } catch { /* TTS is best-effort */ }
  }
  /* Auto-speak: while preview-playing, speak a text/subtitle layer's
     text ONCE when the playhead newly enters its clip. */
  function ttsAutoCheck() {
    if (!S.tts.auto || !S.playing || S.exportMode) return;
    for (const l of layers()) {
      if (l.kind !== 'text' && l.kind !== 'subtitle') continue;
      if (!layerVisibleAt(l, S.playhead)) continue;
      const key = S.activeSceneId + ':' + l.id + ':' + l.startSec;
      if (S.tts.spoken.has(key)) continue;
      S.tts.spoken.add(key);
      ttsSpeak(l.text);
    }
  }
  function ttsResetSpoken() {
    S.tts.spoken.clear();
    ttsCancel();
  }
  /* Voices often arrive asynchronously — refresh the tools block when
     the list lands (only if a text/subtitle layer is selected). */
  const onVoicesChanged = () => {
    refreshTtsVoices();
    if (S.destroyed) return;
    const l = sel();
    if (l && (l.kind === 'text' || l.kind === 'subtitle')) renderDrawer();
  };
  if (ttsAvailable()) {
    refreshTtsVoices();
    try { speechSynthesis.addEventListener('voiceschanged', onVoicesChanged); } catch { /* noop */ }
  }

  /* ------------------------------ transport ------------------------------ */
  function setPlaying(on) {
    S.playing = on;
    $('#edPlay').textContent = on ? '❚❚ Pause' : '▶ Play';
    if (on) {
      engine.schedule(audibleLayers(), S.playhead);
      S.lastTs = performance.now();
      const stepFn = (ts) => {
        if (S.destroyed || !S.playing) return;
        const dt = (ts - S.lastTs) / 1000;
        S.lastTs = ts;
        S.playhead += dt;
        if (S.playhead >= scene().durationSec) {
          /* Phase 4: auto-advance into the next scene and keep playing;
             a 'fade' transitionIn draws a 300 ms fade overlay at the switch. */
          const idx = project.scenes.findIndex((s) => s.id === S.activeSceneId);
          const next = project.scenes[idx + 1];
          if (next) {
            if (next.transitionIn === 'fade') S.fadeStart = performance.now();
            ttsResetSpoken(); /* Phase 8: scene switch cancels TTS */
            S.activeSceneId = next.id;
            S.selectedId = null;
            S.playhead = 0;
            S.pathEdit = false;
            S.fxPathEdit = false;
            S.presetPicker = false;
            S.camEdit = false;
            renderAll();
          } else {
            S.playhead = scene().durationSec;
            setPlaying(false);
          }
        }
        renderCanvas();
        updatePlayheadUI();
        ttsAutoCheck(); /* Phase 8: speak newly entered text clips */
        S.raf = requestAnimationFrame(stepFn);
      };
      S.raf = requestAnimationFrame(stepFn);
    } else {
      cancelAnimationFrame(S.raf);
      engine.stopAll();
      ttsCancel(); /* Phase 8: pause cancels TTS speech */
    }
  }
  function seek(sec) {
    S.playhead = clamp(sec, 0, scene().durationSec);
    ttsResetSpoken(); /* Phase 8: seek cancels TTS; re-entry may speak again */
    renderCanvas();
    updatePlayheadUI();
    /* Seek while playing: restart audio scheduling from the new position. */
    if (S.playing) engine.schedule(audibleLayers(), S.playhead);
  }

  /* ======================= Phase 7: video export =======================
     Real-time capture through this editor's own canvas (see the header
     notes). EXP holds one export session; the dialog body re-renders
     per state: options → recording → (converting) → done / error.
     While the dialog is open during recording the rest of the editor
     is unreachable (the fixed backdrop covers it) — Cancel is the
     only action, as specified. */
  const FFMPEG_VER = { ffmpeg: '0.12.15', util: '0.12.2', core: '0.12.6' };
  const FFMPEG_CDN = 'https://cdn.jsdelivr.net/npm';
  const EXP = {
    state: 'idle',          // idle | options | recording | converting | done | error
    presetId: '720p30',
    format: 'webm',         // final deliverable the user picked
    plan: null,
    recorder: null,
    stopHandled: false,
    chunks: [],
    stream: null,
    audioDest: null,
    timer: 0,
    cancelled: false,
    converting: false,
    cancelConvert: false,
    blob: null,             // WebM blob
    url: null,              // WebM object URL (kept until the dialog closes)
    fileName: '',
    mp4Blob: null,
    mp4Url: null,
    mp4Name: '',
    errorMsg: '',
    prev: null,             // { sceneId, playhead } restored after capture
    ffmpeg: null,
    ffmpegUtil: null
  };
  const expBody = () => $('#edExportBody');

  function triggerDownload(url, name) {
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function openExportDialog() {
    if (EXP.state === 'recording' || EXP.state === 'converting') return;
    if (S.playing) setPlaying(false);
    EXP.plan = computeExportPlan(project);
    /* Phase 8: presets follow the project aspect — fall back to the
       aspect's first preset when the remembered id doesn't exist there
       (e.g. '720p30' has no 1:1 entry; 1:1 starts at '960p30'). */
    const presets = exportPresetsFor(project.aspect);
    if (!presets.some((p) => p.id === EXP.presetId)) EXP.presetId = presets[0].id;
    EXP.state = 'options';
    EXP.errorMsg = '';
    $('#edExportBackdrop').hidden = false;
    renderExportBody();
  }

  function closeExportDialog() {
    $('#edExportBackdrop').hidden = true;
    if (EXP.url) { URL.revokeObjectURL(EXP.url); EXP.url = null; }
    if (EXP.mp4Url) { URL.revokeObjectURL(EXP.mp4Url); EXP.mp4Url = null; }
    EXP.blob = null;
    EXP.mp4Blob = null;
    EXP.state = 'idle';
  }

  function renderExportBody() {
    const body = expBody();
    if (!body) return;
    if (EXP.state === 'options') body.innerHTML = exportOptionsHtml();
    else if (EXP.state === 'recording') body.innerHTML = exportRecordingHtml();
    else if (EXP.state === 'converting') body.innerHTML = exportConvertingHtml();
    else if (EXP.state === 'done') body.innerHTML = exportDoneHtml();
    else if (EXP.state === 'error') body.innerHTML = exportErrorHtml();
  }

  function exportOptionsHtml() {
    const plan = EXP.plan || computeExportPlan(project);
    const presetRadios = exportPresetsFor(project.aspect).map((p) => `
      <label class="exp-opt">
        <input type="radio" name="expPreset" value="${p.id}" ${EXP.presetId === p.id ? 'checked' : ''}>
        <span><b>${escapeHtml(p.label)}</b> — ${escapeHtml(p.detail)} <span class="muted">(${escapeHtml(p.note)})</span></span>
      </label>`).join('');
    const mp4Note = EXP.format === 'mp4' ? `
      <p class="exp-note">MP4 note: after recording, the MP4 engine (ffmpeg.wasm, ~31 MB) is downloaded
        from the internet <b>once</b> to convert in your browser. WebM needs no download and works fully offline.</p>` : '';
    return `
      <div class="exp-group" role="radiogroup" aria-label="Export quality">${presetRadios}</div>
      <div class="exp-group" role="radiogroup" aria-label="Export format">
        <label class="exp-opt">
          <input type="radio" name="expFormat" value="webm" ${EXP.format === 'webm' ? 'checked' : ''}>
          <span><b>WebM</b> <span class="muted">— fully offline, no download</span></span>
        </label>
        <label class="exp-opt">
          <input type="radio" name="expFormat" value="mp4" ${EXP.format === 'mp4' ? 'checked' : ''}>
          <span><b>MP4</b> <span class="muted">— converted after recording (engine download, see note)</span></span>
        </label>
      </div>
      ${mp4Note}
      <p class="muted">Total duration: <b>${formatTimecode(plan.totalSec)}</b> · ${plan.sceneCount} scene${plan.sceneCount === 1 ? '' : 's'} · ${plan.layerCount} layer${plan.layerCount === 1 ? '' : 's'} · Audio: ${plan.hasAudio ? 'yes — mixed into the export' : 'none'}</p>
      ${EXP.presetId === '4k30' ? `<p class="exp-warn">⚠ 4K recording is heavy — a fast computer and short projects are recommended; if the tab struggles, use 1080p.</p>` : ''}
      <p class="muted">Export plays your project in real time while recording — keep this tab visible.</p>
      <p class="muted">No watermark — everything is free in Cartoon Studio.</p>
      ${plan.isEmpty ? `<p class="exp-warn">⚠ This project has no layers yet — the export will be a black, silent video (${formatTimecode(plan.totalSec)}).</p>` : ''}
      <p class="exp-actions">
        <button class="btn" data-exp="close" type="button">Cancel</button>
        <button class="btn primary" data-exp="start" type="button">Start Export</button>
      </p>`;
  }

  function exportRecordingHtml() {
    return `
      <p>Recording your project in real time…</p>
      <div class="exp-progress"><div class="exp-bar" style="width:0%"></div></div>
      <p class="muted" data-exp-status>0%</p>
      <p class="muted small-note">Keep this tab visible — recording stalls if the tab is hidden.</p>
      <p class="exp-actions"><button class="btn danger" data-exp="cancel-rec" type="button">Cancel Export</button></p>`;
  }

  function exportConvertingHtml() {
    return `
      <p>Preparing MP4…</p>
      <div class="exp-progress"><div class="exp-bar" style="width:0%"></div></div>
      <p class="muted" data-exp-conv-status>Starting…</p>
      <p class="muted small-note">Your WebM export is already saved — cancelling the conversion keeps it.</p>
      <p class="exp-actions"><button class="btn danger" data-exp="cancel-conv" type="button">Cancel Conversion</button></p>`;
  }

  function exportDoneHtml() {
    const webmSize = EXP.blob ? formatBytes(EXP.blob.size) : '';
    const mp4Size = EXP.mp4Blob ? formatBytes(EXP.mp4Blob.size) : '';
    const mainName = EXP.mp4Url ? EXP.mp4Name : EXP.fileName;
    return `
      <p>✅ <b>Export complete</b> — ${escapeHtml(mainName)}</p>
      <p class="muted">Your download should have started automatically. No watermark — everything is free in Cartoon Studio.</p>
      <div class="exp-actions">
        ${EXP.mp4Url ? `<a class="btn primary" href="${EXP.mp4Url}" download="${escapeHtml(EXP.mp4Name)}">Download MP4${mp4Size ? ' (' + mp4Size + ')' : ''}</a>` : ''}
        ${EXP.url ? `<a class="btn ${EXP.mp4Url ? '' : 'primary'}" href="${EXP.url}" download="${escapeHtml(EXP.fileName)}">Download again (WebM)${webmSize ? ' — ' + webmSize : ''}</a>` : ''}
        ${!EXP.mp4Url && EXP.blob ? '<button class="btn" data-exp="convert" type="button">Convert to MP4</button>' : ''}
      </div>
      <p class="muted small-note">The MP4 conversion downloads a ~31 MB engine from the internet once; WebM needs no download and works offline. Download links stay available while this dialog is open.</p>
      <p class="exp-actions"><button class="btn" data-exp="close" type="button">Close</button></p>`;
  }

  function exportErrorHtml() {
    return `
      <p>⚠ <b>Export problem</b></p>
      <p class="muted">${escapeHtml(EXP.errorMsg || 'Something went wrong.')}</p>
      ${EXP.url ? `<div class="exp-actions"><a class="btn primary" href="${EXP.url}" download="${escapeHtml(EXP.fileName)}">Download WebM</a></div>` : ''}
      <p class="exp-actions">
        <button class="btn" data-exp="again" type="button">Back to options</button>
        <button class="btn" data-exp="close" type="button">Close</button>
      </p>`;
  }

  function startExport() {
    const plan = computeExportPlan(project);
    EXP.plan = plan;
    const preset = presetById(EXP.presetId, project.aspect);
    if (typeof MediaRecorder === 'undefined' || typeof canvas.captureStream !== 'function') {
      EXP.state = 'error';
      EXP.errorMsg = 'This browser does not support MediaRecorder / canvas capture, so video export is unavailable here. Try a recent Chrome, Edge or Firefox.';
      renderExportBody();
      return;
    }
    EXP.prev = { sceneId: S.activeSceneId, playhead: S.playhead };
    EXP.chunks = [];
    EXP.cancelled = false;
    EXP.stopHandled = false;
    EXP.blob = null;
    EXP.mp4Blob = null;
    if (EXP.url) { URL.revokeObjectURL(EXP.url); EXP.url = null; }
    if (EXP.mp4Url) { URL.revokeObjectURL(EXP.mp4Url); EXP.mp4Url = null; }
    /* Play from scene 1 at 0, nothing selected, no editor modes. */
    S.activeSceneId = project.scenes[0].id;
    S.selectedId = null;
    S.playhead = 0;
    S.pathEdit = false;
    S.fxPathEdit = false;
    S.presetPicker = false;
    S.camEdit = false;
    S.fadeStart = 0;
    /* Export render mode at the chosen resolution, then capture. */
    S.exportSize = { w: preset.w, h: preset.h };
    S.exportMode = true;
    renderAll();
    if (plan.hasAudio) {
      try {
        EXP.audioDest = engine.createExportDestination();
        engine.setExportDestination(EXP.audioDest);
      } catch { EXP.audioDest = null; }
    }
    let stream;
    try {
      stream = canvas.captureStream(preset.fps);
    } catch (err) {
      teardownExportCapture();
      EXP.state = 'error';
      EXP.errorMsg = 'Could not capture the canvas: ' + (err && err.message ? err.message : err);
      renderExportBody();
      return;
    }
    EXP.stream = stream;
    if (EXP.audioDest) {
      for (const track of EXP.audioDest.stream.getAudioTracks()) stream.addTrack(track);
    }
    const mime = pickMimeType((t) => { try { return MediaRecorder.isTypeSupported(t); } catch { return false; } });
    let recorder;
    try {
      recorder = new MediaRecorder(stream, {
        ...(mime ? { mimeType: mime } : {}),
        videoBitsPerSecond: preset.bitrate,
        audioBitsPerSecond: 192000
      });
    } catch (err) {
      teardownExportCapture();
      EXP.state = 'error';
      EXP.errorMsg = 'Could not start the recorder: ' + (err && err.message ? err.message : err);
      renderExportBody();
      return;
    }
    EXP.recorder = recorder;
    recorder.ondataavailable = (e) => { if (e.data && e.data.size) EXP.chunks.push(e.data); };
    recorder.onstop = onRecorderStop;
    EXP.state = 'recording';
    renderExportBody();
    recorder.start(1000);
    setPlaying(true);
    EXP.timer = setInterval(updateExportProgress, 200);
  }

  function updateExportProgress() {
    if (EXP.state !== 'recording') return;
    const plan = EXP.plan;
    const idx = project.scenes.findIndex((s) => s.id === S.activeSceneId);
    const elapsed = durationBefore(plan, Math.max(0, idx)) + S.playhead;
    const frac = progressFraction(elapsed, plan.totalSec);
    const body = expBody();
    if (body) {
      const bar = body.querySelector('.exp-bar');
      if (bar) bar.style.width = Math.round(frac * 100) + '%';
      const st = body.querySelector('[data-exp-status]');
      if (st) {
        st.textContent = Math.round(frac * 100) + '%' +
          (idx >= 0 && plan.scenes[idx] ? ' · ' + plan.scenes[idx].name : '') +
          ' · ' + formatTimecode(Math.min(elapsed, plan.totalSec)) + ' / ' + formatTimecode(plan.totalSec);
      }
    }
    /* The transport stops itself at the end of the last scene. */
    if (!S.playing) finishExportRecording();
  }

  function finishExportRecording() {
    clearInterval(EXP.timer);
    EXP.timer = 0;
    if (S.playing) setPlaying(false);
    const rec = EXP.recorder;
    if (rec && rec.state !== 'inactive') {
      try { rec.stop(); } catch { onRecorderStop(); }
    } else {
      onRecorderStop();
    }
  }

  function cancelExport() {
    if (EXP.state !== 'recording') return;
    EXP.cancelled = true;
    clearInterval(EXP.timer);
    EXP.timer = 0;
    if (S.playing) setPlaying(false);
    const rec = EXP.recorder;
    if (rec && rec.state !== 'inactive') {
      try { rec.stop(); } catch { onRecorderStop(); }
    } else {
      onRecorderStop();
    }
  }

  function onRecorderStop() {
    if (S.destroyed) { EXP.recorder = null; EXP.chunks = []; return; }
    if (EXP.stopHandled) return;
    EXP.stopHandled = true;
    const rec = EXP.recorder;
    EXP.recorder = null;
    const wasCancelled = EXP.cancelled;
    const mimeType = (rec && rec.mimeType) || 'video/webm';
    const chunks = EXP.chunks;
    EXP.chunks = [];
    teardownExportCapture();
    if (wasCancelled) {
      EXP.state = 'idle';
      closeExportDialog();
      toast('Export cancelled');
      return;
    }
    EXP.blob = new Blob(chunks, { type: mimeType });
    EXP.fileName = exportFilename(project.name, presetById(EXP.presetId, project.aspect), 'webm');
    if (EXP.url) URL.revokeObjectURL(EXP.url);
    EXP.url = URL.createObjectURL(EXP.blob);
    triggerDownload(EXP.url, EXP.fileName);
    if (EXP.format === 'mp4') {
      convertToMp4();
    } else {
      EXP.state = 'done';
      renderExportBody();
    }
  }

  /* Stop capture + engine tee, leave export render mode and put the
     editor back on the scene/playhead the user was editing. */
  function teardownExportCapture() {
    clearInterval(EXP.timer);
    EXP.timer = 0;
    if (S.playing) setPlaying(false);
    try { engine.setExportDestination(null); } catch { /* engine unused */ }
    EXP.audioDest = null;
    if (EXP.stream) {
      for (const t of EXP.stream.getTracks()) { try { t.stop(); } catch { /* noop */ } }
      EXP.stream = null;
    }
    S.exportMode = false;
    S.exportSize = null;
    EXPORT_LABELS_OFF = false;
    if (EXP.prev) {
      if (project.scenes.some((s) => s.id === EXP.prev.sceneId)) S.activeSceneId = EXP.prev.sceneId;
      S.playhead = clamp(EXP.prev.playhead || 0, 0, scene().durationSec);
      EXP.prev = null;
    }
    renderAll();
  }

  /* ---- Phase B: MP4 via ffmpeg.wasm, loaded lazily from the CDN
     ONLY when MP4 is requested. Not vendored, not precached. ---- */
  async function convertToMp4() {
    if (!EXP.blob || EXP.converting) return;
    EXP.converting = true;
    EXP.cancelConvert = false;
    EXP.state = 'converting';
    renderExportBody();
    const setStatus = (txt, frac) => {
      const body = expBody();
      if (!body) return;
      const st = body.querySelector('[data-exp-conv-status]');
      if (st) st.textContent = txt;
      const bar = body.querySelector('.exp-bar');
      if (bar) bar.style.width = frac == null ? '100%' : Math.round(frac * 100) + '%';
    };
    try {
      if (!EXP.ffmpeg) {
        setStatus('Downloading the MP4 engine (~31 MB, one time)…', null);
        const ffMod = await import(FFMPEG_CDN + '/@ffmpeg/ffmpeg@' + FFMPEG_VER.ffmpeg + '/dist/esm/index.js');
        const utilMod = await import(FFMPEG_CDN + '/@ffmpeg/util@' + FFMPEG_VER.util + '/dist/esm/index.js');
        if (EXP.cancelConvert) throw new Error('conversion-cancelled');
        const ff = new ffMod.FFmpeg();
        ff.on('progress', ({ progress }) => {
          if (EXP.state === 'converting') {
            setStatus('Converting to MP4… ' + Math.round((progress || 0) * 100) + '%', progress || 0);
          }
        });
        const base = FFMPEG_CDN + '/@ffmpeg/core@' + FFMPEG_VER.core + '/dist/esm';
        await ff.load({
          coreURL: await utilMod.toBlobURL(base + '/ffmpeg-core.js', 'text/javascript'),
          wasmURL: await utilMod.toBlobURL(base + '/ffmpeg-core.wasm', 'application/wasm')
        });
        if (EXP.cancelConvert) throw new Error('conversion-cancelled');
        EXP.ffmpeg = ff;
        EXP.ffmpegUtil = utilMod;
      }
      const ff = EXP.ffmpeg;
      const util = EXP.ffmpegUtil;
      setStatus('Converting to MP4…', 0);
      await ff.writeFile('input.webm', await util.fetchFile(EXP.blob));
      const code = await ff.exec(['-i', 'input.webm', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-movflags', '+faststart', 'output.mp4']);
      if (EXP.cancelConvert) throw new Error('conversion-cancelled');
      if (code !== 0) throw new Error('ffmpeg exited with code ' + code);
      const data = await ff.readFile('output.mp4');
      EXP.mp4Blob = new Blob([data], { type: 'video/mp4' });
      EXP.mp4Name = exportFilename(project.name, presetById(EXP.presetId, project.aspect), 'mp4');
      if (EXP.mp4Url) URL.revokeObjectURL(EXP.mp4Url);
      EXP.mp4Url = URL.createObjectURL(EXP.mp4Blob);
      EXP.converting = false;
      EXP.state = 'done';
      renderExportBody();
      triggerDownload(EXP.mp4Url, EXP.mp4Name);
    } catch (err) {
      EXP.converting = false;
      if (EXP.cancelConvert || (err && err.message === 'conversion-cancelled')) {
        EXP.ffmpeg = null; /* terminated instances cannot be reused */
        EXP.state = EXP.blob ? 'done' : 'options';
        renderExportBody();
        toast('MP4 conversion cancelled — the WebM download is still available');
        return;
      }
      EXP.state = 'error';
      EXP.errorMsg = 'MP4 conversion failed (' + (err && err.message ? err.message : err) + '). ' +
        'This usually means the MP4 engine could not be downloaded (are you offline?) or the recording could not be transcoded. Your WebM export is ready below.';
      renderExportBody();
    }
  }

  function cancelConversion() {
    EXP.cancelConvert = true;
    if (EXP.ffmpeg) { try { EXP.ffmpeg.terminate(); } catch { /* noop */ } }
    EXP.ffmpeg = null;
    EXP.converting = false;
    EXP.state = EXP.blob ? 'done' : 'options';
    renderExportBody();
    toast('MP4 conversion cancelled — the WebM download is still available');
  }

  /* --------------------------- change plumbing --------------------------- */
  function renderAll() {
    renderMeta();
    renderRail();
    renderDrawer();
    renderSceneOptions();
    renderTimeline();
    renderCanvas();
    renderAudioTools();
    /* While playing, any structural change (incl. the Phase-4 scene
       auto-advance, which lands here) re-syncs audio to the playhead. */
    if (S.playing) engine.schedule(audibleLayers(), S.playhead);
  }
  function afterChange(withHistory) {
    if (withHistory) pushHistory();
    renderAll();
    markDirty();
  }
  /* Mutations that already pushed history (or are in a commit wrapper) */
  function commit(mutator) {
    pushHistory();
    mutator();
    renderAll();
    markDirty();
  }

  /* Layers always carry anim data after normalisation; this guards any
     in-session object that slipped through without it. */
  function ensureAnim(l) {
    if (!l.anim) l.anim = { preset: null, path: null, speed: 1 };
    return l.anim;
  }

  function renderSceneOptions() {
    const selEl = $('#edSceneSel');
    selEl.innerHTML = project.scenes.map((s, i) =>
      `<option value="${s.id}" ${s.id === S.activeSceneId ? 'selected' : ''}>${escapeHtml(s.name || 'Scene ' + (i + 1))}</option>`).join('');
    const transEl = $('#edTransSel');
    if (transEl) transEl.value = scene().transitionIn === 'fade' ? 'fade' : 'cut';
  }

  /* ---------------------------- layer actions ---------------------------- */
  function addSampleLayer(kind) {
    const def = SAMPLE_DEFS.find((d) => d.kind === kind);
    if (!def) return;
    const sd = stageDims(project);
    commit(() => {
      const sc = scene();
      const n = sc.layers.filter((l) => l.kind === kind).length;
      const isBg = kind === 'sample-background';
      const startSec = isBg ? 0 : Math.floor(S.playhead);
      /* v0.10.2: sample character/prop layers cascade-spawn and run to
         the end of the scene, like real character/prop layers; the
         sample background stays pinned centre + full-scene as before. */
      const pos = isBg ? { x: sd.w / 2, y: sd.h / 2 }
        : cascadeSpawnPos(Math.min(560, sd.w / 2), Math.min(400, Math.round(sd.h * 0.5556)),
          charPropLayerCount(sc), sd);
      const layer = defaultLayerFields({
        id: uid(),
        kind,
        name: def.name + (n ? ' ' + (n + 1) : ''),
        color: def.color,
        /* Phase 8: spawn points scale with the stage (identical at 16:9). */
        x: pos.x,
        y: pos.y,
        startSec,
        durSec: isBg ? sc.durationSec : fullSceneClipDur(startSec, sc.durationSec)
      }, sc.durationSec, sd);
      sc.layers.push(layer);
      S.selectedId = layer.id;
    });
    toast('Added ' + def.name + ' layer');
  }

  /* ---- Phase 8: text + subtitle layer actions ---- */
  function addTextLayer(kind) {
    const sd = stageDims(project);
    const isSub = kind === 'subtitle';
    commit(() => {
      const sc = scene();
      const n = sc.layers.filter((l) => l.kind === kind).length;
      const layer = defaultLayerFields({
        id: uid(),
        kind,
        name: (isSub ? 'Subtitle' : 'Text') + (n ? ' ' + (n + 1) : ''),
        text: isSub ? 'Subtitle text' : 'Your text',
        fontSize: isSub ? 44 : 64,
        ...(isSub ? {} : { color: '#ffffff', bold: true, align: 'center', style: 'plain' }),
        x: sd.w / 2,
        y: isSub ? Math.round(sd.h * 0.91) : Math.round(sd.h * 0.4),
        startSec: Math.floor(S.playhead),
        durSec: Math.min(10, sc.durationSec)
      }, sc.durationSec, sd);
      sc.layers.push(layer);
      S.selectedId = layer.id;
    });
    toast(isSub ? 'Subtitle added — it stays fixed at the bottom' : 'Text layer added');
  }

  /* ---- Phase 10B: shape layer action + toolbar popover ---- */
  function renderShapeMenu() {
    const box = $('#edShapeMenu');
    if (!box) return;
    box.hidden = !S.shapeMenu;
    box.innerHTML = S.shapeMenu
      ? SHAPE_KINDS.map((s) => `<button class="btn small" data-shape-add="${s.id}" type="button">${s.label}</button>`).join('')
      : '';
    const btn = $('#edAddShape');
    if (btn) btn.classList.toggle('primary', S.shapeMenu);
  }

  function addShapeLayer(shapeId) {
    const def = SHAPE_KINDS.find((s) => s.id === shapeId) || SHAPE_KINDS[0];
    const sd = stageDims(project);
    commit(() => {
      const sc = scene();
      const n = sc.layers.filter((l) => l.kind === 'shape').length;
      const layer = defaultLayerFields({
        id: uid(),
        kind: 'shape',
        name: def.label + (n ? ' ' + (n + 1) : ''),
        shape: def.id,
        fill: '#ffb020',
        stroke: '#101a30',
        strokeW: 0,
        x: sd.w / 2 + (n % 4) * 40,
        y: Math.round(sd.h * 0.45),
        startSec: Math.floor(S.playhead),
        durSec: Math.min(10, sc.durationSec)
      }, sc.durationSec, sd);
      sc.layers.push(layer);
      S.selectedId = layer.id;
    });
    toast(def.label + ' shape added');
  }

  /* ---- Phase 3 asset layer actions (Phase 6B: library + custom) ---- */
  function addCharacterLayer(assetId) {
    const ch = getCharacterDef(assetId);
    if (!ch) return;
    const sd = stageDims(project);
    commit(() => {
      const sc = scene();
      const startSec = Math.floor(S.playhead);
      /* v0.10.2: cascade spawn + clip runs to the end of the scene. */
      const pos = cascadeSpawnPos(Math.round(sd.w * 0.4375), Math.round(sd.h * 0.5764),
        charPropLayerCount(sc), sd);
      const layer = defaultLayerFields({
        id: uid(),
        kind: 'character',
        name: ch.name,
        assetId: ch.id,
        poseId: ch.poses[0].id,
        color: ASSET_COLOR.character,
        /* Spawn point scales with the stage (560×415 at 16:9). */
        x: pos.x,
        y: pos.y,
        startSec,
        durSec: fullSceneClipDur(startSec, sc.durationSec)
      }, sc.durationSec);
      sc.layers.push(layer);
      S.selectedId = layer.id;
    });
    toast('Added ' + ch.name);
  }

  function addBackgroundLayer(assetId, variant) {
    const bg = S.assets && findBackground(S.assets, assetId);
    if (!bg) return;
    /* Phase 10A: a combo-pack variant pins its scene file on the layer. */
    const v = variant && Array.isArray(bg.variants)
      && bg.variants.some((x) => x.file === variant.file) ? variant : null;
    const displayName = v ? bg.name + ' — ' + v.label : bg.name;
    const existing = layers().find((l) => l.kind === 'background');
    if (existing) {
      /* Backgrounds replace: one pinned background layer per scene. */
      commit(() => {
        existing.assetId = bg.id;
        existing.variantFile = v ? v.file : null;
        existing.name = displayName;
        existing.hidden = false;
        const arr = layers();
        arr.splice(arr.indexOf(existing), 1);
        arr.unshift(existing);
        S.selectedId = existing.id;
      });
      toast('Background set to ' + displayName);
      return;
    }
    const sd = stageDims(project);
    commit(() => {
      const sc = scene();
      const layer = defaultLayerFields({
        id: uid(),
        kind: 'background',
        name: displayName,
        assetId: bg.id,
        variantFile: v ? v.file : null,
        color: ASSET_COLOR.background,
        x: sd.w / 2,
        y: sd.h / 2,
        startSec: 0,
        durSec: sc.durationSec
      }, sc.durationSec, sd);
      sc.layers.unshift(layer); // pinned to the bottom of the stack
      S.selectedId = layer.id;
    });
    toast('Background set to ' + displayName);
  }

  function addPropLayer(assetId) {
    const pr = S.assets && findProp(S.assets, assetId);
    if (!pr) return;
    const sd = stageDims(project);
    commit(() => {
      const sc = scene();
      const startSec = Math.floor(S.playhead);
      /* v0.10.2: cascade spawn + clip runs to the end of the scene. */
      const pos = cascadeSpawnPos(Math.round(sd.w * 0.4844), Math.round(sd.h * 0.6111),
        charPropLayerCount(sc), sd);
      const layer = defaultLayerFields({
        id: uid(),
        kind: 'prop',
        name: pr.name,
        assetId: pr.id,
        color: ASSET_COLOR.prop,
        /* Spawn point scales with the stage (620×440 at 16:9). */
        x: pos.x,
        y: pos.y,
        startSec,
        durSec: fullSceneClipDur(startSec, sc.durationSec)
      }, sc.durationSec);
      sc.layers.push(layer);
      S.selectedId = layer.id;
    });
    toast('Added ' + pr.name);
  }

  function setLayerPose(layer, poseId) {
    if (!layer || layer.poseId === poseId) return;
    commit(() => { layer.poseId = poseId; });
  }

  function cyclePose(layer, dir) {
    const ch = getCharacterDef(layer.assetId);
    if (!ch) return;
    const i = ch.poses.findIndex((p) => p.id === layer.poseId);
    const next = ch.poses[(i + dir + ch.poses.length) % ch.poses.length];
    setLayerPose(layer, next.id);
  }

  /* Mouth/face modes: Talk → Talk pose, Idle → Stand pose,
     Look Behind → the true Back pose when the character has one
     (Phase 10A); otherwise the Phase-3 flip mapping (labelled). */
  function setMouthMode(layer, mode) {
    if (!layer || layer.kind !== 'character') return;
    const ch = getCharacterDef(layer.assetId);
    commit(() => {
      layer.mouthMode = mode;
      if (!ch) return;
      if (mode === 'talk') {
        const talk = ch.poses.find((p) => p.id === 'talk');
        if (talk) layer.poseId = talk.id;
      } else if (mode === 'idle') {
        layer.poseId = ch.poses[0].id;
      } else if (mode === 'behind') {
        const back = ch.poses.find((p) => p.id === 'back');
        if (back) layer.poseId = back.id;
        else layer.flipX = true;
      }
    });
  }

  function moveLayer(layer, dir) {
    const arr = layers();
    const i = arr.indexOf(layer);
    const j = i + dir; /* +1 = towards front/top */
    if (i < 0 || j < 0 || j >= arr.length) return;
    commit(() => { [arr[i], arr[j]] = [arr[j], arr[i]]; });
  }

  /* Phase 6B: Bring to Front / Send to Back (parity 4.38 / 4.41). */
  function moveLayerEdge(layer, toFront) {
    commit(() => {
      const arr = layers();
      const i = arr.indexOf(layer);
      if (i < 0) return;
      arr.splice(i, 1);
      if (toFront) arr.push(layer); else arr.unshift(layer);
    });
    toast(toFront ? 'Brought to front' : 'Sent to back');
  }

  function removeLayer(layer) {
    commit(() => {
      const arr = layers();
      const i = arr.indexOf(layer);
      if (i >= 0) arr.splice(i, 1);
      if (S.selectedId === layer.id) S.selectedId = null;
    });
    toast('Layer removed');
  }

  function duplicateLayer(layer) {
    let copyId = null;
    const sd = stageDims(project);
    commit(() => {
      const arr = layers();
      const i = arr.indexOf(layer);
      const copy = JSON.parse(JSON.stringify(layer));
      copy.id = uid();
      copy.name = layer.name + ' copy';
      copy.x = clamp(layer.x + 30, 0, sd.w);
      copy.y = clamp(layer.y + 30, 0, sd.h);
      arr.splice(i + 1, 0, copy);
      copyId = copy.id;
    });
    S.selectedId = copyId;
    renderAll();
    toast('Layer duplicated');
  }

  /* ------------------------------ event wiring --------------------------- */
  const winCleanups = [];
  function onWin(type, fn, opts) {
    window.addEventListener(type, fn, opts);
    winCleanups.push(() => window.removeEventListener(type, fn, opts));
  }

  function hideCtxMenu() { $('#edCtxMenu').hidden = true; }
  function showCtxMenu(layer, x, y) {
    const menu = $('#edCtxMenu');
    menu.innerHTML = `
      <button data-m="rename" type="button">Rename…</button>
      <button data-m="duplicate" type="button">Duplicate</button>
      <button data-m="delete" type="button">Delete</button>`;
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.hidden = false;
    menu.onclick = (e) => {
      const b = e.target.closest('button[data-m]');
      hideCtxMenu();
      if (!b) return;
      if (b.dataset.m === 'rename') {
        const name = prompt('Layer name:', layer.name);
        if (name && name.trim()) commit(() => { layer.name = name.trim(); });
      } else if (b.dataset.m === 'duplicate') duplicateLayer(layer);
      else if (b.dataset.m === 'delete') removeLayer(layer);
    };
  }

  /* Header */
  async function goBack() {
    await persist(false);
    cleanup();
    if (onBack) onBack();
  }
  function cleanup() {
    S.destroyed = true;
    setPlaying(false);
    /* Phase 7: stop any running export capture/conversion cleanly. */
    clearInterval(EXP.timer);
    EXP.cancelled = true;
    if (EXP.recorder) { try { EXP.recorder.stop(); } catch { /* noop */ } EXP.recorder = null; }
    if (EXP.ffmpeg) { try { EXP.ffmpeg.terminate(); } catch { /* noop */ } EXP.ffmpeg = null; }
    try { engine.setExportDestination(null); } catch { /* noop */ }
    S.exportMode = false;
    S.exportSize = null;
    EXPORT_LABELS_OFF = false;
    if (EXP.url) { URL.revokeObjectURL(EXP.url); EXP.url = null; }
    if (EXP.mp4Url) { URL.revokeObjectURL(EXP.mp4Url); EXP.mp4Url = null; }
    /* Phase 8: stop any TTS speech and drop the voices listener. */
    ttsCancel();
    if (ttsAvailable()) {
      try { speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged); } catch { /* noop */ }
    }
    engine.stopAll();
    stopPreview();
    if (S.rec) stopRecording(true); /* discard — editor is going away */
    /* Phase 6A: stop the sprite preview, pause layer videos, free URLs. */
    cancelAnimationFrame(S.spriteRaf);
    for (const rec of S.videoEls.values()) { try { rec.el.pause(); } catch { /* noop */ } }
    S.videoEls.clear();
    for (const url of S.objUrls.values()) { try { URL.revokeObjectURL(url); } catch { /* noop */ } }
    S.objUrls.clear();
    /* Phase 6B: free generated custom-character pose images. */
    for (const entry of customImgCache.values()) { try { URL.revokeObjectURL(entry.url); } catch { /* noop */ } }
    customImgCache.clear();
    clearTimeout(saveTimer);
    ro.disconnect();
    winCleanups.forEach((fn) => fn());
    document.removeEventListener('keydown', onKeydown);
  }
  $('#edBack').addEventListener('click', goBack);
  $('#edMenuDash').addEventListener('click', goBack);
  $('#edHamburger').addEventListener('click', () => {
    S.railOpen = !S.railOpen;
    if (!S.railOpen) S.drawerOpen = false; else S.drawerOpen = true;
    renderDrawer();
    renderCanvas();
  });
  $('#edName').addEventListener('input', () => markDirty());
  $('#edSave').addEventListener('click', async () => {
    clearTimeout(saveTimer);
    await persist(true);
    toast("Project '" + project.name + "' saved successfully!");
  });
  $('#edExport').addEventListener('click', openExportDialog);
  /* Phase 7: export dialog actions (delegated — body re-renders per state). */
  $('#edExportBackdrop').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-exp]');
    if (!b) return;
    const act = b.dataset.exp;
    if (act === 'start') startExport();
    else if (act === 'cancel-rec') cancelExport();
    else if (act === 'convert') convertToMp4();
    else if (act === 'cancel-conv') cancelConversion();
    else if (act === 'again') { EXP.state = 'options'; EXP.plan = computeExportPlan(project); renderExportBody(); }
    else if (act === 'close') closeExportDialog();
  });
  $('#edExportBackdrop').addEventListener('change', (e) => {
    const r = e.target.closest('input[name="expPreset"], input[name="expFormat"]');
    if (!r) return;
    if (r.name === 'expPreset') { EXP.presetId = r.value; renderExportBody(); /* show/hide the 4K heavy note */ }
    else { EXP.format = r.value; renderExportBody(); /* show/hide the MP4 engine note */ }
  });
  $('#edFreeBadge').addEventListener('click', () => {
    showModal('All features are free',
      'Cartoon Studio has no Pro upsell and no watermark — every tool, including the ones behind a paywall in the reference app, is built as a free feature here.');
  });
  $('#edModalClose').addEventListener('click', () => { $('#edModalBackdrop').hidden = true; });
  $('#edModalBackdrop').addEventListener('click', (e) => {
    if (e.target.id === 'edModalBackdrop') e.currentTarget.hidden = true;
  });
  $('#edAvatar').addEventListener('click', () => {
    const m = $('#edAvatarMenu');
    m.hidden = !m.hidden;
  });

  /* Rail + drawer */
  $('#edRail').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-panel]');
    if (!b) return;
    if (S.activePanel === b.dataset.panel && S.drawerOpen) {
      S.drawerOpen = false;
    } else {
      S.activePanel = b.dataset.panel;
      S.drawerOpen = true;
    }
    renderRail();
    renderDrawer();
    renderCanvas();
  });
  $('#edDrawer').addEventListener('click', (e) => {
    /* ---- Phase 6B: Character Studio / My Characters / Tutorial ---- */
    const tutBtn = e.target.closest('button[data-tut]');
    if (tutBtn) {
      const i = Number(tutBtn.dataset.tut);
      S.tutOpen = S.tutOpen === i ? -1 : i;
      renderDrawer();
      return;
    }
    const csSkin = e.target.closest('button[data-cs-skin]');
    if (csSkin) { S.studio.params.skinTone = csSkin.dataset.csSkin; renderDrawer(); return; }
    const csColor = e.target.closest('button[data-cs-color]');
    if (csColor) { S.studio.params[csColor.dataset.csColor] = csColor.dataset.val; renderDrawer(); return; }
    const csSave = e.target.closest('button[data-cs-save]');
    if (csSave) { saveStudioCharacter(false); return; }
    const csAdd = e.target.closest('button[data-cs-add]');
    if (csAdd) { saveStudioCharacter(true); return; }
    const csNew = e.target.closest('button[data-cs-new]');
    if (csNew) {
      S.studio = { params: defaultCharParams(), editingId: null, fromLibrary: null, mods: defaultPoseMods(), customPoses: [], poseName: 'My Pose' };
      renderDrawer();
      return;
    }
    const custAdd = e.target.closest('button[data-cust-add]');
    if (custAdd) { addCharacterLayer(CUSTOM_PREFIX + custAdd.dataset.custAdd); return; }
    const custEdit = e.target.closest('button[data-cust-edit]');
    if (custEdit) { loadStudioCharacter(custEdit.dataset.custEdit); return; }
    const custDel = e.target.closest('button[data-cust-del]');
    if (custDel) { deleteCustomCharacter(custDel.dataset.custDel); return; }
    const gotoStudio = e.target.closest('button[data-goto-studio]');
    if (gotoStudio) {
      S.activePanel = 'studio';
      S.drawerOpen = true;
      renderRail();
      renderDrawer();
      return;
    }
    const studioEdit = e.target.closest('button[data-studio-edit]');
    if (studioEdit) { const l = sel(); if (l) openStudioForLayer(l); return; }
    /* ---- Phase 6B: Adjust moods / reset / wearables ---- */
    const moodBtn = e.target.closest('button[data-mood]');
    if (moodBtn) {
      const l = sel();
      const m = MOOD_PRESETS.find((x) => x.id === moodBtn.dataset.mood);
      if (l && m) {
        commit(() => { l.adjust = { b: m.b, c: m.c, s: m.s }; });
        toast('Mood preset: ' + m.label);
      }
      return;
    }
    const adjReset = e.target.closest('button[data-adj-reset]');
    if (adjReset) {
      const l = sel();
      if (l) {
        commit(() => { l.adjust = { b: 100, c: 100, s: 100 }; l.opacity = 1; l.mask = 'none'; });
        toast('Adjust reset');
      }
      return;
    }
    const wearBtn = e.target.closest('button[data-wearable]');
    if (wearBtn) {
      const l = sel();
      if (!l) return;
      const id = wearBtn.dataset.wearable;
      commit(() => {
        const cur = Array.isArray(l.wearables) ? l.wearables : [];
        l.wearables = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      });
      return;
    }
    /* ---- Phase 6A: Local gallery / effects / sprite / tools ---- */
    const upLocal = e.target.closest('button[data-upload-local]');
    if (upLocal) { const f = $('#edLocalFile'); if (f) f.click(); return; }
    const filterBtn = e.target.closest('button[data-local-filter]');
    if (filterBtn) { S.localFilter = filterBtn.dataset.localFilter; renderDrawer(); return; }
    const localAdd = e.target.closest('button[data-local-add]');
    if (localAdd) {
      const m = S.mediaMap.get(localAdd.dataset.localAdd);
      if (!m) { toast('Media not found'); return; }
      if (isAudioMedia(m)) addAudioClip(m);
      else if (m.kind === 'video') addVideoMediaLayer(m);
      else if (m.kind === 'sprite') addSpriteMediaLayer(m);
      else addImageMediaLayer(m);
      return;
    }
    const localDel = e.target.closest('button[data-local-del]');
    if (localDel) { deleteLocalMedia(localDel.dataset.localDel); return; }
    const fxAdd = e.target.closest('button[data-fx-add]');
    if (fxAdd) { addEffectLayer(fxAdd.dataset.fxAdd); return; }
    const upSprite = e.target.closest('button[data-upload-sprite]');
    if (upSprite) { const f = $('#edSpriteFile'); if (f) f.click(); return; }
    const spOpen = e.target.closest('button[data-sp-open]');
    if (spOpen) {
      const m = S.mediaMap.get(spOpen.dataset.spOpen);
      if (m) openSpriteWork(m); else toast('Sprite not found');
      return;
    }
    const spAddSaved = e.target.closest('button[data-sp-addsaved]');
    if (spAddSaved) {
      const m = S.mediaMap.get(spAddSaved.dataset.spAddsaved);
      if (m) addSpriteMediaLayer(m); else toast('Sprite not found');
      return;
    }
    const spSave = e.target.closest('button[data-sp-save]');
    if (spSave) { saveSpriteCharacter(); return; }
    const spAdd = e.target.closest('button[data-sp-add]');
    if (spAdd) {
      const w = S.spriteWork;
      const m = w && S.mediaMap.get(w.mediaId);
      if (m) addSpriteMediaLayer(m, { cols: w.cols, rows: w.rows, count: w.count, fps: w.fps });
      else toast('No sprite sheet loaded');
      return;
    }
    const upBg = e.target.closest('button[data-upload-bg]');
    if (upBg) { const f = $('#edBgFile'); if (f) f.click(); return; }
    const bgWhite = e.target.closest('button[data-bg-white]');
    if (bgWhite) {
      if (S.bgTool) { S.bgTool.key = { r: 255, g: 255, b: 255 }; renderDrawer(); }
      return;
    }
    const bgDl = e.target.closest('button[data-bg-download]');
    if (bgDl) { downloadCanvasPng($('#bgPreview'), (S.bgTool ? S.bgTool.name : 'image') + '-transparent'); return; }
    const bgAdd = e.target.closest('button[data-bg-add]');
    if (bgAdd) { addProcessedToScene($('#bgPreview'), (S.bgTool ? S.bgTool.name : 'Image') + ' (BG removed)'); return; }
    const upEr = e.target.closest('button[data-upload-er]');
    if (upEr) { const f = $('#edErFile'); if (f) f.click(); return; }
    const erToolBtn = e.target.closest('button[data-er-tool]');
    if (erToolBtn) {
      if (S.erTool) { S.erTool.tool = erToolBtn.dataset.erTool; renderDrawer(); }
      return;
    }
    const erUndo = e.target.closest('button[data-er-undo]');
    if (erUndo) {
      const t = S.erTool;
      if (t && t.undo.length) {
        t.work.getContext('2d').putImageData(t.undo.pop(), 0, 0);
        drawEraserCanvas();
      } else toast('Nothing to undo in the eraser');
      return;
    }
    const erReset = e.target.closest('button[data-er-reset]');
    if (erReset) {
      const t = S.erTool;
      if (t) {
        eraserPushUndo();
        const g = t.work.getContext('2d');
        g.clearRect(0, 0, t.work.width, t.work.height);
        g.drawImage(t.src, 0, 0);
        drawEraserCanvas();
        toast('Eraser reset to the original photo');
      }
      return;
    }
    const erDl = e.target.closest('button[data-er-download]');
    if (erDl) { downloadCanvasPng($('#erCanvas'), (S.erTool ? S.erTool.name : 'photo') + '-erased'); return; }
    const erAdd = e.target.closest('button[data-er-add]');
    if (erAdd) { addProcessedToScene($('#erCanvas'), (S.erTool ? S.erTool.name : 'Photo') + ' (erased)'); return; }
    /* ---- Phase 5: voice recording / audio library / SFX ---- */
    const recBtn = e.target.closest('button[data-rec-toggle]');
    if (recBtn) { toggleRecording(); return; }
    const upBtn = e.target.closest('button[data-upload-audio]');
    if (upBtn) { const f = $('#edAudioFile'); if (f) f.click(); return; }
    const prevBtn = e.target.closest('button[data-media-preview]');
    if (prevBtn) { togglePreview(prevBtn.dataset.mediaPreview); return; }
    const addBtn = e.target.closest('button[data-media-add]');
    if (addBtn) {
      const m = S.mediaMap.get(addBtn.dataset.mediaAdd);
      if (m) addAudioClip(m); else toast('Media not found');
      return;
    }
    const delBtn = e.target.closest('button[data-media-del]');
    if (delBtn) { deleteMediaItem(delBtn.dataset.mediaDel); return; }
    const sfxPrev = e.target.closest('button[data-sfx-preview]');
    if (sfxPrev) { previewSfx(sfxPrev.dataset.sfxPreview); return; }
    const sfxAdd = e.target.closest('button[data-sfx-add]');
    if (sfxAdd) {
      const def = SFX_DEFS.find((d) => d.id === sfxAdd.dataset.sfxAdd);
      if (def) generateSfxAndAdd(def);
      return;
    }
    const sampleBtn = e.target.closest('button[data-sample]');
    if (sampleBtn) { addSampleLayer(sampleBtn.dataset.sample); return; }
    const charBtn = e.target.closest('button[data-character]');
    if (charBtn) { addCharacterLayer(charBtn.dataset.character); return; }
    const bgVarBtn = e.target.closest('button[data-bg-variant]');
    if (bgVarBtn) {
      const bg = S.assets && findBackground(S.assets, bgVarBtn.dataset.bgVariant);
      const v = bg && Array.isArray(bg.variants) ? bg.variants[Number(bgVarBtn.dataset.vi)] : null;
      if (v) addBackgroundLayer(bg.id, v);
      return;
    }
    const bgBtn = e.target.closest('button[data-background]');
    if (bgBtn) { addBackgroundLayer(bgBtn.dataset.background); return; }
    const propBtn = e.target.closest('button[data-prop]');
    if (propBtn) { addPropLayer(propBtn.dataset.prop); return; }
    const poseBtn = e.target.closest('button[data-pose]');
    if (poseBtn) { const l = sel(); if (l) setLayerPose(l, poseBtn.dataset.pose); return; }
    const mouthBtn = e.target.closest('button[data-mouth]');
    if (mouthBtn) { const l = sel(); if (l) setMouthMode(l, mouthBtn.dataset.mouth); return; }
    /* ---- Phase 10B: lip-sync mode toggle ---- */
    const lipBtn = e.target.closest('button[data-lipsync]');
    if (lipBtn) {
      const l = sel();
      if (l) { const v = lipBtn.dataset.lipsync; commit(() => { l.lipSync = v; S.lipHold.delete(l.id); }); }
      return;
    }
    /* ---- Phase 10B: shape kind / fill / stroke-colour swatches ---- */
    const shapeKindBtn = e.target.closest('button[data-shape-kind]');
    if (shapeKindBtn) {
      const l = sel();
      if (l && l.kind === 'shape') {
        const v = shapeKindBtn.dataset.shapeKind;
        commit(() => { l.shape = v; l.name = (SHAPE_KINDS.find((s) => s.id === v) || {}).label || l.name; });
      }
      return;
    }
    const shapeFillBtn = e.target.closest('button[data-shape-fill]');
    if (shapeFillBtn) {
      const l = sel();
      if (l && l.kind === 'shape') { const v = shapeFillBtn.dataset.shapeFill; commit(() => { l.fill = v; }); }
      return;
    }
    const shapeStrokeBtn = e.target.closest('button[data-shape-stroke-color]');
    if (shapeStrokeBtn) {
      const l = sel();
      if (l && l.kind === 'shape') { const v = shapeStrokeBtn.dataset.shapeStrokeColor; commit(() => { l.stroke = v; }); }
      return;
    }
    /* ---- Phase 10B: flock-path edit / clear ---- */
    const fxBtn = e.target.closest('button[data-fxpath]');
    if (fxBtn) {
      const l = sel();
      if (!l || l.kind !== 'effect' || l.effect !== 'birds') return;
      const act = fxBtn.dataset.fxpath;
      if (act === 'edit') {
        if (S.fxPathEdit) { S.fxPathEdit = false; renderAll(); toast('Flock path saved'); return; }
        S.fxPathEdit = true;
        S.pathEdit = false;
        if (!l.fxPath) commit(() => { l.fxPath = { points: [] }; });
        else renderAll();
        toast('Editing flock path — click the canvas to add points (max 6)');
      } else if (act === 'clear') {
        S.fxPathEdit = false;
        commit(() => { l.fxPath = null; });
        toast('Flock path cleared — back to the sine sweep');
      }
      return;
    }
    /* ---- Phase 10B: Pose Lab save / load / delete ---- */
    const csPoseSave = e.target.closest('button[data-cs-save-pose]');
    if (csPoseSave) {
      const mods = normalizePoseMods(S.studio.mods);
      if (poseModsAreNeutral(mods)) { toast('Move a joint slider first — this pose is identical to Stand'); return; }
      const label = String(S.studio.poseName || '').trim().slice(0, 24) || 'My Pose';
      const existing = S.studio.customPoses || [];
      let n = existing.length + 1;
      while (existing.some((p) => p.id === 'custom' + n)) n++;
      S.studio.customPoses = [...existing, { id: 'custom' + n, label, mods }];
      if (S.studio.editingId) {
        saveStudioCharacter(false); /* persists the pose on the record now */
      } else {
        renderDrawer();
        toast('Pose "' + label + '" ready — press Save Character to store it with the character');
      }
      return;
    }
    const csPoseReset = e.target.closest('button[data-cs-pose-reset]');
    if (csPoseReset) { S.studio.mods = defaultPoseMods(); renderDrawer(); return; }
    const csPoseLoad = e.target.closest('button[data-cs-pose-load]');
    if (csPoseLoad) {
      const cp = (S.studio.customPoses || []).find((p) => p.id === csPoseLoad.dataset.csPoseLoad);
      if (cp) { S.studio.mods = { ...cp.mods }; S.studio.poseName = cp.label; renderDrawer(); }
      return;
    }
    const csPoseDel = e.target.closest('button[data-cs-pose-del]');
    if (csPoseDel) {
      S.studio.customPoses = (S.studio.customPoses || []).filter((p) => p.id !== csPoseDel.dataset.csPoseDel);
      if (S.studio.editingId) saveStudioCharacter(false);
      else renderDrawer();
      toast('Pose deleted');
      return;
    }
    /* ---- Phase 4: AI Animate presets ---- */
    const presetBtn = e.target.closest('button[data-preset]');
    if (presetBtn) {
      const l = sel();
      if (!l) return;
      const id = presetBtn.dataset.preset;
      S.presetPicker = false;
      if (id === 'none') {
        commit(() => { ensureAnim(l).preset = null; });
        toast('Animation preset cleared');
      } else {
        commit(() => { ensureAnim(l).preset = id; });
        toast('AI Animate: ' + presetLabel(id));
      }
      return;
    }
    /* ---- Phase 4: Path / preset-picker buttons ---- */
    const animBtn = e.target.closest('button[data-anim-tool]');
    if (animBtn) {
      const l = sel();
      if (!l) return;
      const act = animBtn.dataset.animTool;
      if (act === 'ai') {
        S.presetPicker = !S.presetPicker;
        renderDrawer();
      } else if (act === 'path') {
        if (S.pathEdit) { S.pathEdit = false; renderAll(); return; }
        S.pathEdit = true;
        S.showPath = true;
        if (!ensureAnim(l).path) {
          commit(() => {
            l.anim.path = {
              points: [{ t: 0, x: Math.round(l.x), y: Math.round(l.y) }],
              easing: 'linear'
            };
          });
          toast('Path started — click the canvas to add destinations');
        } else {
          renderAll();
          toast('Editing path — click canvas to add points, drag points to adjust');
        }
      } else if (act === 'path-done') {
        S.pathEdit = false;
        renderAll();
        toast('Path saved');
      } else if (act === 'path-clear') {
        S.pathEdit = false;
        commit(() => { ensureAnim(l).path = null; });
        toast('Motion path cleared');
      }
      return;
    }
    /* ---- Phase 4: speed preset chips ---- */
    const speedChip = e.target.closest('button[data-speed-chip]');
    if (speedChip) {
      const l = sel();
      if (!l) return;
      const v = parseFloat(speedChip.dataset.speedChip);
      commit(() => { ensureAnim(l).speed = v; });
      return;
    }
    /* ---- Phase 4: camera keyframe tools ---- */
    const camBtn = e.target.closest('button[data-cam-tool]');
    if (camBtn) {
      const l = sel();
      if (!l || l.kind !== 'camera') return;
      const act = camBtn.dataset.camTool;
      if (act === 'edit') {
        S.camEdit = !S.camEdit;
        if (S.camEdit) {
          const cur = resolveCamera(l);
          S.camView = cur ? { ...cur } : { x: 0, y: 0, zoom: 1 };
          toast('Camera Edit View ON — drag the canvas to pan the view');
        }
        renderAll();
      } else if (act === 'add-key') {
        if (!S.camEdit) {
          const cur = resolveCamera(l);
          S.camView = cur ? { ...cur } : { x: 0, y: 0, zoom: 1 };
        }
        const view = { ...S.camView };
        const tSec = Math.round(S.playhead * 10) / 10;
        commit(() => {
          if (!l.camera) l.camera = { keys: [] };
          const keys = l.camera.keys;
          const key = {
            tSec,
            x: Math.round(view.x), y: Math.round(view.y),
            zoom: Math.round(view.zoom * 100) / 100
          };
          const existing = keys.find((k) => Math.abs(k.tSec - tSec) < 0.001);
          if (existing) Object.assign(existing, key); else keys.push(key);
          keys.sort((a, b) => a.tSec - b.tSec);
        });
        toast('Camera keyframe added at ' + formatTimecode(tSec));
      }
      return;
    }
    const camSeek = e.target.closest('button[data-cam-seek]');
    if (camSeek) {
      const l = sel();
      if (!l || !l.camera) return;
      const k = l.camera.keys[Number(camSeek.dataset.camSeek)];
      if (!k) return;
      S.camView = { x: k.x, y: k.y, zoom: k.zoom };
      S.camEdit = true;
      seek(k.tSec);
      renderAll();
      return;
    }
    const camDel = e.target.closest('button[data-cam-del]');
    if (camDel) {
      const l = sel();
      if (!l || !l.camera) return;
      const idx = Number(camDel.dataset.camDel);
      commit(() => { l.camera.keys.splice(idx, 1); });
      toast('Camera keyframe deleted');
      return;
    }
    const toolBtn = e.target.closest('button[data-char-tool]');
    if (toolBtn) {
      const l = sel();
      if (!l) return;
      const act = toolBtn.dataset.charTool;
      if (act === 'flip') commit(() => { l.flipX = !l.flipX; });
      else if (act === 'pose-prev') cyclePose(l, -1);
      else if (act === 'pose-next') cyclePose(l, +1);
      else if (act === 'delete') removeLayer(l);
    }
    /* ---- Phase 8: text tools (colour swatches / bold / align / style) ---- */
    const txtColor = e.target.closest('button[data-text-color]');
    if (txtColor) {
      const l = sel();
      if (l && l.kind === 'text') {
        const c = txtColor.dataset.textColor;
        commit(() => { l.color = c; });
      }
      return;
    }
    const txtBold = e.target.closest('button[data-text-bold]');
    if (txtBold) {
      const l = sel();
      if (l && l.kind === 'text') commit(() => { l.bold = !l.bold; });
      return;
    }
    const txtAlign = e.target.closest('button[data-text-align]');
    if (txtAlign) {
      const l = sel();
      if (l && l.kind === 'text') {
        const a = txtAlign.dataset.textAlign;
        commit(() => { l.align = a; });
      }
      return;
    }
    const txtStyle = e.target.closest('button[data-text-style]');
    if (txtStyle) {
      const l = sel();
      if (l && l.kind === 'text') {
        const s = txtStyle.dataset.textStyle;
        commit(() => { l.style = s; });
      }
      return;
    }
    /* ---- Phase 8: TTS Speak button ---- */
    const ttsSpeakBtn = e.target.closest('button[data-tts-speak]');
    if (ttsSpeakBtn) {
      const l = sel();
      if (l) ttsSpeak(l.text);
      return;
    }
  });
  /* Character search filters the grid live (state kept so re-renders
     triggered by selection changes restore the query). */
  $('#edDrawer').addEventListener('input', (e) => {
    if (e.target.id !== 'edCharSearch') return;
    S.charQuery = e.target.value;
    const q = S.charQuery.trim().toLowerCase();
    $('#edDrawer').querySelectorAll('.asset-card[data-character]').forEach((card) => {
      const entry = S.assets && findCharacter(S.assets, card.dataset.character);
      const hay = entry ? (entry.name + ' ' + (entry.role || '') + ' ' + (entry.tags || '')).toLowerCase() : '';
      card.style.display = !q || hay.includes(q) ? '' : 'none';
    });
  });

  /* Phase 4 sliders: capture a history snapshot when a speed drag starts so
     the whole gesture becomes ONE undo step (filed on 'change' below). */
  $('#edDrawer').addEventListener('pointerdown', (e) => {
    if (e.target.matches('input[data-speed-range]') && !S.speedBefore) S.speedBefore = snapshot();
    if (e.target.matches('input[data-adj]') && !S.adjBefore) S.adjBefore = snapshot();
    /* Phase 8: one undo step per text-edit gesture (filed on 'change'). */
    if (e.target.matches('textarea[data-text-edit], input[data-text-size], input[data-text-color-input]') && !S.textBefore) S.textBefore = snapshot();
  });
  $('#edDrawer').addEventListener('focusin', (e) => {
    if (e.target.matches('input[data-speed-range]') && !S.speedBefore) S.speedBefore = snapshot();
    if (e.target.matches('input[data-adj]') && !S.adjBefore) S.adjBefore = snapshot();
    if (e.target.matches('textarea[data-text-edit], input[data-text-size], input[data-text-color-input]') && !S.textBefore) S.textBefore = snapshot();
  });
  $('#edDrawer').addEventListener('input', (e) => {
    /* ---- Phase 8: text content / size / colour (live; history on change) ---- */
    if (e.target.matches('textarea[data-text-edit]')) {
      const l = sel();
      if (!l) return;
      l.text = e.target.value;
      renderCanvas();
      markDirty();
      return;
    }
    if (e.target.matches('input[data-text-size]')) {
      const l = sel();
      if (!l) return;
      const v = parseInt(e.target.value, 10);
      if (!Number.isFinite(v)) return;
      l.fontSize = v;
      const val = $('#edDrawer').querySelector('[data-text-size-val]');
      if (val) val.textContent = v + 'px';
      renderCanvas();
      markDirty();
      return;
    }
    if (e.target.matches('input[data-text-color-input]')) {
      const l = sel();
      if (!l || l.kind !== 'text') return;
      l.color = e.target.value;
      renderCanvas();
      markDirty();
      return;
    }
    /* ---- Phase 10B: shape fill/stroke colour inputs + stroke width (live) ---- */
    if (e.target.matches('input[data-shape-fill-input]')) {
      const l = sel();
      if (!l || l.kind !== 'shape') return;
      l.fill = e.target.value;
      renderCanvas();
      markDirty();
      return;
    }
    if (e.target.matches('input[data-shape-stroke-input]')) {
      const l = sel();
      if (!l || l.kind !== 'shape') return;
      l.stroke = e.target.value;
      renderCanvas();
      markDirty();
      return;
    }
    if (e.target.matches('input[data-shape-stroke]')) {
      const l = sel();
      if (!l || l.kind !== 'shape') return;
      const v = parseInt(e.target.value, 10);
      if (!Number.isFinite(v)) return;
      l.strokeW = clamp(v, 0, 12);
      const val = $('#edDrawer').querySelector('[data-shape-stroke-val]');
      if (val) val.textContent = l.strokeW + 'px';
      renderCanvas();
      markDirty();
      return;
    }
    /* ---- Phase 10B: Pose Lab sliders (live preview; saved explicitly) ---- */
    if (e.target.matches('input[data-pose-mod]')) {
      const f = e.target.dataset.poseMod;
      const v = parseFloat(e.target.value);
      if (!Number.isFinite(v)) return;
      if (!S.studio.mods) S.studio.mods = defaultPoseMods();
      S.studio.mods[f] = v;
      const val = $('#edDrawer').querySelector('[data-pose-mod-val="' + f + '"]');
      if (val) val.textContent = v + '°';
      const img = $('#edDrawer').querySelector('.studio-preview img');
      if (img) img.src = characterPreviewUri(S.studio.params, 'stand', S.studio.mods);
      return;
    }
    if (e.target.matches('input[data-cs-pose-name]')) {
      S.studio.poseName = e.target.value;
      return;
    }
    if (e.target.matches('input[data-tts-rate]')) {
      S.tts.rate = Math.round(parseFloat(e.target.value) * 100) / 100;
      const val = $('#edDrawer').querySelector('[data-tts-rate-val]');
      if (val) val.textContent = S.tts.rate + '×';
      return;
    }
    /* ---- Phase 6B: Adjust sliders (live; one history step on change) ---- */
    if (e.target.matches('input[data-adj]')) {
      const l = sel();
      if (!l) return;
      const f = e.target.dataset.adj;
      const v = parseInt(e.target.value, 10);
      if (!Number.isFinite(v)) return;
      if (f === 'opacity') l.opacity = clamp(v, 0, 100) / 100;
      else { if (!l.adjust) l.adjust = { b: 100, c: 100, s: 100 }; l.adjust[f] = v; }
      const val = $('#edDrawer').querySelector('[data-adj-val="' + f + '"]');
      if (val) val.textContent = v + '%';
      renderCanvas();
      markDirty();
      return;
    }
    /* ---- Phase 6B: Studio name (state only; preview shows poses) ---- */
    if (e.target.matches('input[data-cs-name]')) {
      S.studio.params.name = e.target.value;
      return;
    }
    /* ---- Phase 6A tool controls (live, no drawer re-render) ---- */
    if (e.target.matches('input[data-sp-num]')) {
      const w = S.spriteWork;
      if (!w) return;
      const field = e.target.dataset.spNum;
      const v = clamp(Math.round(Number(e.target.value) || 1), 1, field === 'count' ? 4096 : field === 'fps' ? 30 : 64);
      w[field] = v;
      if (field === 'cols' || field === 'rows') w.count = w.cols * w.rows;
      const countInput = root.querySelector('input[data-sp-num="count"]');
      if (countInput && field !== 'count') countInput.value = String(w.count);
      return;
    }
    if (e.target.matches('input[data-sp-name]')) {
      if (S.spriteWork) S.spriteWork.name = e.target.value;
      return;
    }
    if (e.target.matches('input[data-bg-tol]')) {
      if (!S.bgTool) return;
      S.bgTool.tol = Number(e.target.value);
      const val = root.querySelector('[data-bg-tol-val]');
      if (val) val.textContent = String(S.bgTool.tol);
      applyBgPreview();
      return;
    }
    if (e.target.matches('input[data-bg-soft]')) {
      if (!S.bgTool) return;
      S.bgTool.soft = Number(e.target.value);
      const val = root.querySelector('[data-bg-soft-val]');
      if (val) val.textContent = String(S.bgTool.soft);
      applyBgPreview();
      return;
    }
    if (e.target.matches('input[data-er-size]')) {
      if (!S.erTool) return;
      S.erTool.size = Number(e.target.value);
      const val = root.querySelector('[data-er-size-val]');
      if (val) val.textContent = String(S.erTool.size);
      return;
    }
    if (e.target.matches('input[data-er-hard]')) {
      if (!S.erTool) return;
      S.erTool.hardness = Number(e.target.value) / 100;
      const val = root.querySelector('[data-er-hard-val]');
      if (val) val.textContent = e.target.value + '%';
      return;
    }
    if (e.target.matches('input[data-speed-range]')) {
      const l = sel();
      if (!l) return;
      ensureAnim(l).speed = Math.round(parseFloat(e.target.value) * 100) / 100;
      const val = $('#edDrawer').querySelector('[data-speed-val]');
      if (val) val.textContent = ensureAnim(l).speed + '×';
      markDirty();
    } else if (e.target.matches('input[data-cam-zoom]')) {
      const l = sel();
      if (!S.camEdit) {
        /* Touching the zoom implies editing: seed the working view first. */
        const cur = l ? resolveCamera(l) : null;
        S.camView = cur ? { ...cur } : { x: 0, y: 0, zoom: 1 };
        S.camEdit = true;
      }
      S.camView.zoom = parseFloat(e.target.value);
      const val = $('#edDrawer').querySelector('[data-cam-zoom-val]');
      if (val) val.textContent = S.camView.zoom.toFixed(2) + '×';
      renderCanvas();
    }
  });
  $('#edDrawer').addEventListener('change', (e) => {
    /* ---- Phase 8: file the text-edit history step; TTS settings ---- */
    if (e.target.matches('textarea[data-text-edit], input[data-text-size], input[data-text-color-input]')) {
      if (S.textBefore) {
        S.undo.push(S.textBefore);
        if (S.undo.length > HISTORY_CAP) S.undo.shift();
        S.redo.length = 0;
        S.textBefore = null;
      }
      renderDrawer(); /* swatch active state / size label settle */
      return;
    }
    if (e.target.matches('select[data-tts-voice]')) {
      S.tts.voiceURI = e.target.value;
      return;
    }
    if (e.target.matches('input[data-tts-auto]')) {
      S.tts.auto = e.target.checked;
      if (!S.tts.auto) ttsCancel();
      return;
    }
    /* ---- Phase 6B: adjust drag-end / mask / studio form ---- */
    if (e.target.matches('input[data-adj]')) {
      if (S.adjBefore) {
        S.undo.push(S.adjBefore);
        if (S.undo.length > HISTORY_CAP) S.undo.shift();
        S.redo.length = 0;
        S.adjBefore = null;
      }
      renderDrawer(); /* refresh slider positions from state */
      return;
    }
    if (e.target.matches('select[data-mask-sel]')) {
      const l = sel();
      if (l) { const v = e.target.value; commit(() => { l.mask = v; }); }
      return;
    }
    if (e.target.matches('select[data-cs-sel]')) {
      S.studio.params[e.target.dataset.csSel] = e.target.value;
      renderDrawer(); /* live preview */
      return;
    }
    if (e.target.matches('input[data-cs-check]')) {
      S.studio.params[e.target.dataset.csCheck] = e.target.checked;
      renderDrawer(); /* live preview */
      return;
    }
    if (e.target.matches('input[data-cs-name]')) {
      S.studio.params.name = e.target.value;
      return;
    }
    if (e.target.id === 'edAudioFile') { handleAudioUpload(e.target); return; }
    /* ---- Phase 6A file inputs + effect/sprite toggles ---- */
    if (e.target.id === 'edLocalFile') { handleLocalUpload(e.target); return; }
    if (e.target.id === 'edSpriteFile') { handleSpriteUpload(e.target); return; }
    if (e.target.id === 'edBgFile') { handleBgUpload(e.target); return; }
    if (e.target.id === 'edErFile') { handleErUpload(e.target); return; }
    if (e.target.matches('select[data-fx-intensity]')) {
      S.fxIntensity[e.target.dataset.fxIntensity] = Number(e.target.value) || 2;
      return;
    }
    if (e.target.matches('input[data-fx-lightning]')) {
      S.fxLightning = e.target.checked;
      return;
    }
    if (e.target.matches('input[data-sp-onion]')) {
      if (S.spriteWork) S.spriteWork.onion = e.target.checked;
      return;
    }
    const l = sel();
    if (e.target.matches('select[data-path-easing]')) {
      if (l && ensureAnim(l).path) {
        const v = e.target.value;
        commit(() => { l.anim.path.easing = v; });
      }
    } else if (e.target.matches('input[data-path-show]')) {
      S.showPath = e.target.checked;
      renderCanvas();
    } else if (e.target.matches('input[data-speed-range]')) {
      if (S.speedBefore) {
        S.undo.push(S.speedBefore);
        if (S.undo.length > HISTORY_CAP) S.undo.shift();
        S.redo.length = 0;
        S.speedBefore = null;
      }
      renderDrawer(); /* refresh speed chips' active state */
    } else if (e.target.matches('input[data-cam-zoom]')) {
      renderDrawer(); /* refresh Edit View button state */
    }
  });

  /* Stage tools */
  $('#edHand').addEventListener('click', () => {
    S.handTool = !S.handTool;
    $('#edHand').classList.toggle('primary', S.handTool);
    canvas.style.cursor = S.handTool ? 'grab' : 'default';
  });
  $('#edFraming').addEventListener('click', () => {
    S.framing = !S.framing;
    $('#edFraming').classList.toggle('primary', S.framing);
    renderCanvas();
  });
  $('#edZoomIn').addEventListener('click', () => { S.zoomMul = clamp(S.zoomMul * 1.2, 0.25, 3); renderCanvas(); });
  $('#edZoomOut').addEventListener('click', () => { S.zoomMul = clamp(S.zoomMul / 1.2, 0.25, 3); renderCanvas(); });

  /* Second toolbar */
  $('#edDup').addEventListener('click', () => {
    const l = sel();
    if (!l) { toast('Select a layer first'); return; }
    duplicateLayer(l);
  });
  $('#edSplit').addEventListener('click', () => {
    const l = sel();
    if (!l || l.kind === 'camera') { toast('Select a layer clip to split'); return; }
    const t = Math.floor(S.playhead * 100) / 100;
    if (t <= l.startSec || t >= l.startSec + l.durSec) {
      toast('Move the playhead inside the selected clip to split it');
      return;
    }
    commit(() => {
      const arr = layers();
      const i = arr.indexOf(l);
      const tail = JSON.parse(JSON.stringify(l));
      tail.id = uid();
      tail.name = l.name + ' (2)';
      if (l.kind === 'audio') {
        /* Audio split: the tail references the same media with its
           source offset advanced past the split point. */
        const parts = splitAudioAt(l, t);
        if (!parts) return;
        tail.startSec = parts.tail.startSec;
        tail.durSec = parts.tail.durSec;
        tail.offsetSec = parts.tail.offsetSec;
        l.durSec = parts.head.durSec;
      } else if (l.kind === 'video') {
        /* Video split: same idea — the tail starts further into the
           source (videoTimeAt applies the clip loop on top). */
        tail.startSec = t;
        tail.durSec = (l.startSec + l.durSec) - t;
        tail.offsetSec = (l.offsetSec || 0) + (t - l.startSec);
        l.durSec = t - l.startSec;
      } else {
        tail.startSec = t;
        tail.durSec = (l.startSec + l.durSec) - t;
        l.durSec = t - l.startSec;
      }
      arr.splice(i + 1, 0, tail);
      S.selectedId = tail.id;
    });
    toast('Clip split at ' + formatTimecode(t));
  });
  $('#edCamera').addEventListener('click', () => {
    /* Camera tools live in the Character panel's selected-layer block. */
    S.activePanel = 'character';
    S.drawerOpen = true;
    S.pathEdit = false;
    const existing = layers().find((l) => l.kind === 'camera');
    if (existing) {
      S.selectedId = existing.id;
      renderAll();
      toast('Camera layer selected — add keyframes in the panel');
      return;
    }
    commit(() => {
      const sc = scene();
      const cam = defaultLayerFields({
        id: uid(), kind: 'camera', name: 'Camera 1', color: '#5b729e',
        startSec: 0, durSec: sc.durationSec
      }, sc.durationSec);
      sc.layers.push(cam);
      S.selectedId = cam.id;
    });
    toast('Camera 1 layer added — set keyframes in the panel');
  });
  /* Phase 5: Voice button toggles mic recording. */
  $('#edVoice').addEventListener('click', () => { toggleRecording(); });

  /* Phase 8: Text / Subtitle layer buttons. */
  $('#edAddText').addEventListener('click', () => addTextLayer('text'));
  $('#edAddSubtitle').addEventListener('click', () => addTextLayer('subtitle'));
  /* Phase 10B: "+ Shape" popover (shape-kind buttons are delegated). */
  $('#edAddShape').addEventListener('click', () => { S.shapeMenu = !S.shapeMenu; renderShapeMenu(); });
  $('#edShapeMenu').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-shape-add]');
    if (!b) return;
    S.shapeMenu = false;
    renderShapeMenu();
    addShapeLayer(b.dataset.shapeAdd);
  });

  /* Phase 5: selected-audio-clip volume slider + mute checkbox.
     The slider drag files ONE history step on 'change' (snapshot taken
     when the drag starts), same pattern as the animation-speed slider. */
  const audioTools = $('#edAudioTools');
  audioTools.addEventListener('pointerdown', (e) => {
    if (e.target.matches('input[data-vol-range]') && !S.volBefore) S.volBefore = snapshot();
  });
  audioTools.addEventListener('focusin', (e) => {
    if (e.target.matches('input[data-vol-range]') && !S.volBefore) S.volBefore = snapshot();
  });
  audioTools.addEventListener('input', (e) => {
    if (!e.target.matches('input[data-vol-range]')) return;
    const l = sel();
    if (!l || l.kind !== 'audio') return;
    l.volume = clamp(parseInt(e.target.value, 10) / 100, 0, 1);
    const val = audioTools.querySelector('[data-vol-val]');
    if (val) val.textContent = Math.round(l.volume * 100) + '%';
    engine.setLayerVolume(l.id, l.volume, l.muted);
    markDirty();
  });
  audioTools.addEventListener('change', (e) => {
    if (e.target.matches('input[data-vol-range]')) {
      if (S.volBefore) {
        S.undo.push(S.volBefore);
        if (S.undo.length > HISTORY_CAP) S.undo.shift();
        S.redo.length = 0;
        S.volBefore = null;
      }
    } else if (e.target.matches('input[data-vol-mute]')) {
      const l = sel();
      if (l && l.kind === 'audio') {
        const checked = e.target.checked;
        commit(() => { l.muted = checked; });
      }
    }
  });

  $('#edUndo').addEventListener('click', doUndo);
  $('#edRedo').addEventListener('click', doRedo);
  $('#edSceneSel').addEventListener('change', (e) => {
    S.activeSceneId = e.target.value;
    S.selectedId = null;
    S.playhead = 0;
    S.pathEdit = false;
    S.fxPathEdit = false;
    S.presetPicker = false;
    S.camEdit = false;
    S.fadeStart = 0;
    setPlaying(false);
    renderAll();
  });
  $('#edTransSel').addEventListener('change', (e) => {
    const v = e.target.value === 'fade' ? 'fade' : 'cut';
    commit(() => { scene().transitionIn = v; });
    toast('Scene transition: ' + (v === 'fade' ? 'Fade' : 'Cut'));
  });
  $('#edAddScene').addEventListener('click', () => {
    let newId = null;
    commit(() => {
      const s = { id: uid(), name: 'Scene ' + (project.scenes.length + 1), durationSec: 30, transitionIn: 'cut', layers: [] };
      project.scenes.push(s);
      newId = s.id;
    });
    S.activeSceneId = newId;
    S.selectedId = null;
    S.playhead = 0;
    renderAll();
    toast('Added New Scene');
  });
  $('#edDeleteLayer').addEventListener('click', () => {
    const l = sel();
    if (!l) { toast('Select a layer first'); return; }
    removeLayer(l);
  });
  $('#edDock').addEventListener('click', () => {
    S.dockTop = !S.dockTop;
    $('#edRoot').classList.toggle('dock-top', S.dockTop);
    renderCanvas();
  });
  $('#edToggleLayers').addEventListener('click', () => {
    S.layersCollapsed = !S.layersCollapsed;
    renderTimeline();
  });
  $('#edTlZoomIn').addEventListener('click', () => { S.pxPerSec = clamp(S.pxPerSec * 1.3, 2, 40); renderTimeline(); });
  $('#edTlZoomOut').addEventListener('click', () => { S.pxPerSec = clamp(S.pxPerSec / 1.3, 2, 40); renderTimeline(); });

  /* Transport */
  $('#edJumpStart').addEventListener('click', () => seek(0));
  $('#edBack5').addEventListener('click', () => seek(S.playhead - 5));
  $('#edFwd5').addEventListener('click', () => seek(S.playhead + 5));
  $('#edPlay').addEventListener('click', () => {
    if (!S.playing && S.playhead >= scene().durationSec) S.playhead = 0;
    setPlaying(!S.playing);
  });
  $('#edDurInput').addEventListener('change', (e) => {
    const v = clamp(Math.round(Number(e.target.value) || scene().durationSec), 10, 600);
    if (v === scene().durationSec) { e.target.value = String(v); return; }
    commit(() => {
      scene().durationSec = v;
      for (const l of layers()) {
        if (l.startSec > v) l.startSec = Math.max(0, v - 1);
        if (l.startSec + l.durSec > v) l.durSec = Math.max(1, v - l.startSec);
      }
    });
    S.playhead = clamp(S.playhead, 0, v);
    renderAll();
    toast('Scene length set to ' + v + 's');
  });

  /* Timeline interactions (delegation; inner HTML is rebuilt on each render) */
  let tlDrag = null;
  tracksInner.addEventListener('pointerdown', (e) => {
    const ruler = e.target.closest('#edRuler');
    const playheadEl = e.target.closest('#edPlayhead');
    const clipEl = e.target.closest('[data-clip]');
    const innerRect = tracksInner.getBoundingClientRect();
    const toSec = (clientX) => clamp((clientX - innerRect.left - LABEL_W) / S.pxPerSec, 0, scene().durationSec);
    if (ruler || playheadEl) {
      seek(toSec(e.clientX));
      tlDrag = { type: 'scrub' };
      return;
    }
    if (clipEl) {
      const layer = layers().find((l) => l.id === clipEl.dataset.clip);
      if (!layer) return;
      /* Measure the edge zone BEFORE any re-render (a render rebuilds the
         clip element, after which the old node's geometry reads as 0). */
      const clipRect = clipEl.getBoundingClientRect();
      const isEdge = !!e.target.closest('[data-edge]') ||
        (e.clientX - clipRect.left) > clipEl.offsetWidth - 10;
      /* Audio clips also trim from the LEFT edge (source offset). */
      const isLeftEdge = layer.kind === 'audio' &&
        (!!e.target.closest('[data-edge-left]') || (e.clientX - clipRect.left) < 10);
      if (S.selectedId !== layer.id) { S.pathEdit = false; S.presetPicker = false; }
      S.selectedId = layer.id;
      renderTimeline();
      renderCanvas();
      if (layer.locked) return;
      tlDrag = {
        type: isLeftEdge ? 'trim-left' : (isEdge ? 'resize' : 'move'),
        id: layer.id, startX: e.clientX,
        origStart: layer.startSec, origDur: layer.durSec,
        origOffset: layer.offsetSec || 0,
        before: snapshot(), moved: false
      };
      e.preventDefault();
    }
  });
  onWin('pointermove', (e) => {
    if (!tlDrag) return;
    if (tlDrag.type === 'scrub') {
      const innerRect = tracksInner.getBoundingClientRect();
      seek(clamp((e.clientX - innerRect.left - LABEL_W) / S.pxPerSec, 0, scene().durationSec));
      return;
    }
    const layer = layers().find((l) => l.id === tlDrag.id);
    if (!layer) return;
    const dSec = (e.clientX - tlDrag.startX) / S.pxPerSec;
    if (tlDrag.type === 'move') {
      layer.startSec = clamp(Math.round((tlDrag.origStart + dSec) * 10) / 10, 0, Math.max(0, scene().durationSec - layer.durSec));
    } else if (tlDrag.type === 'trim-left') {
      /* Audio only: start, source offset and duration move together. */
      const nl = trimLeftAudio(
        { startSec: tlDrag.origStart, durSec: tlDrag.origDur, offsetSec: tlDrag.origOffset },
        Math.round((tlDrag.origStart + dSec) * 10) / 10);
      layer.startSec = nl.startSec;
      layer.offsetSec = nl.offsetSec;
      layer.durSec = nl.durSec;
    } else {
      layer.durSec = clamp(Math.round((tlDrag.origDur + dSec) * 10) / 10, 1, scene().durationSec - layer.startSec);
      if (layer.kind === 'audio' && layer.mediaDurSec) {
        /* Never extend an audio clip past the end of its media. */
        layer.durSec = Math.min(layer.durSec, Math.max(0.1, layer.mediaDurSec - (layer.offsetSec || 0)));
      }
    }
    tlDrag.moved = true;
    /* Light refresh while dragging: rebuild clips + canvas span visibility */
    renderTimeline();
    renderCanvas();
  });
  onWin('pointerup', () => {
    if (tlDrag && tlDrag.moved) {
      S.undo.push(tlDrag.before);
      if (S.undo.length > HISTORY_CAP) S.undo.shift();
      S.redo.length = 0;
      renderAll();
      markDirty();
    }
    tlDrag = null;
  });
  tracksInner.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-act]');
    const row = e.target.closest('[data-row]');
    if (btn && row) {
      const layer = layers().find((l) => l.id === row.dataset.row);
      if (!layer) return;
      const act = btn.dataset.act;
      S.selectedId = layer.id;
      if (act === 'up') moveLayer(layer, +1);
      else if (act === 'down') moveLayer(layer, -1);
      else if (act === 'front') moveLayerEdge(layer, true);
      else if (act === 'back') moveLayerEdge(layer, false);
      else if (act === 'hide') commit(() => { if (layer.kind === 'audio') layer.muted = !layer.muted; else layer.hidden = !layer.hidden; });
      else if (act === 'lock') commit(() => { layer.locked = !layer.locked; });
      else if (act === 'remove') removeLayer(layer);
      else if (act === 'opts') {
        const r = btn.getBoundingClientRect();
        renderAll();
        showCtxMenu(layer, r.left, r.bottom + 4);
        return;
      } else { renderAll(); renderCanvas(); }
      return;
    }
    if (row && !e.target.closest('[data-clip]')) {
      if (S.selectedId !== row.dataset.row) { S.pathEdit = false; S.presetPicker = false; }
      S.selectedId = row.dataset.row;
      renderAll();
    }
  });
  onWin('pointerdown', (e) => {
    if (!e.target.closest('#edCtxMenu')) hideCtxMenu();
    if (!e.target.closest('.avatar-wrap')) { const m = $('#edAvatarMenu'); if (m) m.hidden = true; }
  });

  /* Keyboard: Ctrl+Z / Ctrl+Y / Space / Delete (ignored while typing) */
  function onKeydown(e) {
    /* Phase 7: the editor is locked while an export is recording or
       converting — shortcuts must not pause playback or mutate layers. */
    if (EXP.state === 'recording' || EXP.state === 'converting') return;
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target && e.target.isContentEditable)) return;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); doUndo(); }
    else if ((mod && e.key.toLowerCase() === 'y') || (mod && e.shiftKey && e.key.toLowerCase() === 'z')) { e.preventDefault(); doRedo(); }
    else if (e.key === ' ') { e.preventDefault(); $('#edPlay').click(); }
    else if ((e.key === 'Delete' || e.key === 'Backspace') && sel()) { e.preventDefault(); removeLayer(sel()); }
  }
  document.addEventListener('keydown', onKeydown);

  /* ================= Phase 6B: custom characters ================= */
  async function refreshCustomChars() {
    try {
      const list = await listCustomChars();
      customCharStore.map.clear();
      list.forEach((r) => customCharStore.map.set(r.id, r));
      customCharStore.loaded = true;
      S.customList = list;
      S.customLoaded = true;
    } catch { /* keep the previous list; missing flags stay as they were */ }
    if (S.destroyed) return;
    renderDrawer();
    renderTimeline(); /* missing-media badges for deleted characters */
    renderCanvas();
  }

  async function saveStudioCharacter(addAfter) {
    const st = S.studio;
    const params = normalizeCharParams({ ...st.params });
    st.params = params;
    let rec;
    /* Phase 10B: the Pose Lab's saved custom poses ride on the record. */
    const poses = normalizeCustomPoses(st.customPoses);
    st.customPoses = poses;
    if (st.editingId && customCharStore.map.has(st.editingId)) {
      const old = customCharStore.map.get(st.editingId);
      rec = { ...old, name: params.name, params, poses };
      await putCustomChar(rec);
      purgeCustomCharImages(rec.id); /* poses regenerate from new params */
    } else {
      rec = { id: uid(), kind: 'custom-character', name: params.name, params, poses, createdAt: Date.now() };
      await putCustomChar(rec);
      st.editingId = rec.id;
    }
    st.fromLibrary = null;
    await refreshCustomChars();
    toast('Character saved: ' + rec.name);
    if (addAfter) addCharacterLayer(CUSTOM_PREFIX + rec.id);
    else renderDrawer();
    return rec;
  }

  function loadStudioCharacter(id) {
    const rec = customCharStore.map.get(id);
    if (!rec) { toast('Character not found'); return; }
    S.studio = { params: normalizeCharParams(rec.params), editingId: id, fromLibrary: null, mods: defaultPoseMods(), customPoses: normalizeCustomPoses(rec.poses), poseName: 'My Pose' };
    S.activePanel = 'studio';
    S.drawerOpen = true;
    renderRail();
    renderDrawer();
    toast('Editing: ' + rec.name);
  }

  async function deleteCustomCharacter(id) {
    const rec = customCharStore.map.get(id);
    if (!rec) return;
    if (!confirm('Delete "' + rec.name + '" from My Characters? Layers using it will be marked as missing media.')) return;
    if (S.studio.editingId === id) {
      S.studio = { params: defaultCharParams(), editingId: null, fromLibrary: null, mods: defaultPoseMods(), customPoses: [], poseName: 'My Pose' };
    }
    await deleteCustomChar(id);
    purgeCustomCharImages(id);
    await refreshCustomChars();
    toast('Deleted custom character: ' + rec.name);
  }

  /* Per-pose Edit / canvas double-click entry point: custom characters
     load their params; library characters open a BLANK studio (their
     art is read-only — Save creates an editable copy, never a fake edit). */
  function openStudioForLayer(l) {
    if (!l) return;
    if (isCustomAssetId(l.assetId)) {
      loadStudioCharacter(l.assetId.slice(CUSTOM_PREFIX.length));
      return;
    }
    S.studio = { params: defaultCharParams(), editingId: null, fromLibrary: l.name, mods: defaultPoseMods(), customPoses: [], poseName: 'My Pose' };
    S.activePanel = 'studio';
    S.drawerOpen = true;
    renderRail();
    renderDrawer();
    toast('Library characters are read-only — Save in the Studio creates your editable copy');
  }

  /* ================= Phase 5: media library + recording ================= */
  let previewAudio = null, previewUrl = null;
  let recStream = null, recMR = null, recChunks = [];
  let recCtx = null, recAnalyser = null;
  let recTimerInt = 0, recMeterRaf = 0, recStartedAt = 0;

  async function refreshMedia() {
    try {
      const list = await listMedia();
      S.mediaList = list;
      S.mediaMap = new Map(list.map((m) => [m.id, m]));
      S.mediaLoaded = true;
    } catch { S.mediaLoaded = false; }
    if (S.destroyed) return;
    renderDrawer();
    renderTimeline(); /* also redraws waveforms + missing-media flags */
    renderCanvas();   /* missing-media flags apply to media layers too */
  }

  function addAudioClip(media) {
    if (!media || !media.id) return;
    commit(() => {
      const sc = scene();
      const start = Math.min(Math.floor(S.playhead), Math.max(0, sc.durationSec - 1));
      const hasDur = Number.isFinite(media.durationSec) && media.durationSec > 0;
      const layer = defaultLayerFields({
        id: uid(),
        kind: 'audio',
        name: media.name,
        mediaId: media.id,
        mediaDurSec: hasDur ? media.durationSec : null,
        color: '#8b6ff0',
        startSec: start,
        durSec: Math.max(0.5, Math.min(hasDur ? media.durationSec : 10, sc.durationSec - start))
      }, sc.durationSec);
      sc.layers.push(layer);
      S.selectedId = layer.id;
    });
    toast('Audio added: ' + media.name);
  }

  async function deleteMediaItem(id) {
    const m = S.mediaMap.get(id);
    if (!m) return;
    if (!confirm('Delete "' + m.name + '" from the audio library? Clips using it will be marked as missing media and skipped during playback.')) return;
    if (S.previewId === id) stopPreview();
    await deleteMedia(id);
    engine.forget(id);
    S.peaks.delete(id);
    await refreshMedia();
    toast('Deleted from audio library');
  }

  /* Library preview uses a plain HTMLAudio element on an object URL. */
  function stopPreview() {
    if (previewAudio) { try { previewAudio.pause(); } catch { /* noop */ } previewAudio = null; }
    if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = null; }
    S.previewId = null;
  }

  async function togglePreview(id) {
    if (S.previewId === id) { stopPreview(); renderDrawer(); return; }
    stopPreview();
    const rec = await getMedia(id);
    if (!rec || !rec.blob) { toast('Media not found'); return; }
    if (S.destroyed) return;
    previewUrl = URL.createObjectURL(rec.blob);
    previewAudio = new Audio(previewUrl);
    S.previewId = id;
    previewAudio.onended = () => { stopPreview(); if (!S.destroyed) renderDrawer(); };
    previewAudio.play().catch(() => {});
    renderDrawer();
  }

  async function handleAudioUpload(input) {
    const file = input.files && input.files[0];
    input.value = '';
    if (file) await saveAudioFile(file);
  }

  /* Shared by the Media panel upload and the Local gallery (Phase 6A):
     any audio file dropped in either place joins the audio library. */
  async function saveAudioFile(file) {
    let dur = 0, buf = null;
    try {
      buf = await engine.decodeBlob(file);
      if (buf && buf.duration) dur = buf.duration;
    } catch { /* undecodable files still save; duration stays 0 */ }
    const item = {
      id: uid(),
      name: (file.name || 'Uploaded audio').replace(/\.[^.]+$/, '') || 'Uploaded audio',
      kind: 'upload',
      mime: file.type || 'audio/*',
      durationSec: Math.round(dur * 100) / 100,
      createdAt: Date.now(),
      blob: file
    };
    await putMedia(item);
    if (buf) engine.prime(item.id, buf);
    await refreshMedia();
    toast('Audio uploaded to library: ' + item.name);
    return item;
  }

  /* ------------------------- SFX (Sounds panel) ------------------------- */
  async function previewSfx(id) {
    try {
      const buf = await renderSfxBuffer(id);
      if (!buf) { toast('Unknown sound effect'); return; }
      engine.playBufferOnce(buf);
    } catch { toast('Could not preview this effect'); }
  }

  async function generateSfxAndAdd(def) {
    if (S.sfxBusy.has(def.id)) return;
    S.sfxBusy.add(def.id);
    try {
      let item = S.mediaList.find((m) => m.kind === 'sfx' && m.sfxId === def.id);
      if (!item) {
        const blob = await sfxWavBlob(def.id);
        if (!blob) { toast('Could not generate ' + def.name); return; }
        item = {
          id: uid(),
          name: def.name + ' (SFX)',
          kind: 'sfx',
          sfxId: def.id,
          mime: 'audio/wav',
          durationSec: def.durationSec,
          createdAt: Date.now(),
          blob
        };
        await putMedia(item);
        await refreshMedia();
        toast(def.name + ' generated & saved to the audio library');
      }
      addAudioClip(item);
    } catch { toast('Could not generate ' + def.name); }
    finally { S.sfxBusy.delete(def.id); }
  }

  /* --------------------------- voice recording -------------------------- */
  function pickRecMime() {
    if (typeof MediaRecorder === 'undefined') return '';
    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
    for (const m of candidates) {
      try { if (MediaRecorder.isTypeSupported(m)) return m; } catch { /* keep looking */ }
    }
    return '';
  }

  function toggleRecording() {
    if (S.rec) stopRecording(false);
    else startRecording();
  }

  async function startRecording() {
    if (S.playing) setPlaying(false);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') {
      toast('এই ব্রাউজারে মাইক রেকর্ডিং সাপোর্ট নেই — Microphone recording is not supported in this browser.');
      return;
    }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      toast('মাইকের অনুমতি মেলেনি — Microphone permission denied. Please allow mic access, then try again.');
      return;
    }
    if (S.destroyed) { stream.getTracks().forEach((t) => t.stop()); return; }
    recStream = stream;
    recChunks = [];
    const mime = pickRecMime();
    try {
      recMR = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    } catch {
      try { recMR = new MediaRecorder(stream); } catch {
        stream.getTracks().forEach((t) => t.stop());
        recStream = null;
        toast('রেকর্ডার চালু করা যায়নি — Could not start the recorder in this browser.');
        return;
      }
    }
    recMR.ondataavailable = (e) => { if (e.data && e.data.size) recChunks.push(e.data); };
    recMR.onstop = () => { handleRecStop(); };
    /* Level meter: stream → AnalyserNode → meter fill width. */
    recAnalyser = null;
    try {
      recCtx = new (window.AudioContext || window.webkitAudioContext)();
      const srcNode = recCtx.createMediaStreamSource(stream);
      recAnalyser = recCtx.createAnalyser();
      recAnalyser.fftSize = 256;
      srcNode.connect(recAnalyser);
    } catch { recAnalyser = null; }
    S.rec = { elapsed: 0, mime: recMR.mimeType || mime || 'audio/webm', discard: false };
    recStartedAt = performance.now();
    recMR.start(250);
    S.activePanel = 'media';
    S.drawerOpen = true;
    renderRail();
    renderDrawer();
    updateRecUi();
    recTimerInt = setInterval(() => {
      if (!S.rec) return;
      S.rec.elapsed = (performance.now() - recStartedAt) / 1000;
      updateRecUi();
    }, 250);
    const meterLoop = () => {
      if (!S.rec) return;
      updateRecMeter();
      recMeterRaf = requestAnimationFrame(meterLoop);
    };
    meterLoop();
    toast('Recording started — speak now, press Stop when done');
  }

  function updateRecUi() {
    if (!S.rec) return;
    const btn = $('#edVoice');
    if (btn) {
      btn.textContent = '■ Stop ' + formatTimecode(S.rec.elapsed);
      btn.classList.add('recording');
    }
    const t = $('#edRecTime');
    if (t) t.textContent = formatTimecode(S.rec.elapsed);
  }

  function updateRecMeter() {
    const fill = $('#edRecFill');
    if (!fill) return;
    if (!recAnalyser) { fill.style.width = '30%'; return; }
    const data = new Uint8Array(recAnalyser.fftSize);
    recAnalyser.getByteTimeDomainData(data);
    let sum = 0;
    for (const v of data) { const d = (v - 128) / 128; sum += d * d; }
    const rms = Math.sqrt(sum / data.length);
    fill.style.width = Math.min(100, Math.round(rms * 260)) + '%';
  }

  function stopRecording(discard) {
    if (!S.rec) return;
    S.rec.discard = !!discard;
    if (recMR && recMR.state !== 'inactive') {
      try { recMR.stop(); return; } catch { /* fall through to manual finish */ }
    }
    handleRecStop();
  }

  async function handleRecStop() {
    const rec = S.rec;
    S.rec = null;
    clearInterval(recTimerInt);
    cancelAnimationFrame(recMeterRaf);
    if (recStream) { recStream.getTracks().forEach((t) => t.stop()); recStream = null; }
    if (recCtx) { try { recCtx.close(); } catch { /* noop */ } recCtx = null; recAnalyser = null; }
    recMR = null;
    const btn = $('#edVoice');
    if (btn) { btn.textContent = 'Voice'; btn.classList.remove('recording'); }
    if (!rec || rec.discard || S.destroyed) { recChunks = []; return; }
    const blob = new Blob(recChunks, { type: rec.mime });
    recChunks = [];
    if (!blob.size) {
      toast('Recording was empty — nothing saved');
      renderDrawer();
      return;
    }
    /* Real duration from decoding; fall back to the wall-clock timer. */
    let dur = rec.elapsed || 0;
    let buf = null;
    try {
      buf = await engine.decodeBlob(blob);
      if (buf && buf.duration) dur = buf.duration;
    } catch { /* keep timer duration */ }
    const n = S.mediaList.filter((m) => m.kind === 'recording').length + 1;
    const item = {
      id: uid(),
      name: 'Voice recording ' + n,
      kind: 'recording',
      mime: blob.type || rec.mime,
      durationSec: Math.round(dur * 100) / 100,
      createdAt: Date.now(),
      blob
    };
    await putMedia(item);
    if (buf) engine.prime(item.id, buf);
    await refreshMedia();
    if (S.destroyed) return;
    addAudioClip(item);
    toast('Recording saved — added to the timeline at the playhead');
  }

  /* ================= Phase 6A: local media, tools, effects ================ */

  /* Object URLs are created once per media id and shared between the
     stage renderer and gallery thumbnails; revoked on cleanup/delete. */
  function objUrlFor(item) {
    if (!item || !item.blob) return '';
    let url = S.objUrls.get(item.id);
    if (!url) {
      url = URL.createObjectURL(item.blob);
      S.objUrls.set(item.id, url);
    }
    return url;
  }

  /* Image cache for image/sprite layers (blob URL → HTMLImageElement).
     GIF note: an animated GIF loaded this way draws its CURRENT frame
     via drawImage in Chrome/Firefox, so GIF layers animate there; some
     browsers may show a static first frame instead. */
  function mediaImageEntry(mediaId) {
    if (!mediaId) return null;
    let entry = S.mediaImgs.get(mediaId);
    if (!entry) {
      const item = S.mediaMap.get(mediaId);
      if (!item || !item.blob) return null;
      const img = new Image();
      entry = { img, loaded: false, error: false };
      S.mediaImgs.set(mediaId, entry);
      img.onload = () => { entry.loaded = true; if (!S.destroyed) renderCanvas(); };
      img.onerror = () => { entry.error = true; };
      img.src = objUrlFor(item);
    }
    return entry;
  }

  /* One muted <video> element per video layer, created lazily. */
  function videoFor(layer) {
    let rec = S.videoEls.get(layer.id);
    if (rec && rec.mediaId !== layer.mediaId) {
      try { rec.el.pause(); } catch { /* noop */ }
      rec = null;
    }
    if (!rec) {
      const item = S.mediaMap.get(layer.mediaId);
      if (!item || !item.blob) return null;
      const el = document.createElement('video');
      el.src = objUrlFor(item);
      el.muted = true;
      el.playsInline = true;
      el.preload = 'auto';
      el.addEventListener('seeked', () => { if (!S.destroyed) renderCanvas(); });
      el.addEventListener('loadeddata', () => { if (!S.destroyed) renderCanvas(); });
      rec = { el, mediaId: layer.mediaId };
      S.videoEls.set(layer.id, rec);
    }
    return rec.el;
  }

  /* Draw an image / video / sprite layer. `layer` is the render-state
     copy (position/scale already animated); tLocal = seconds since the
     clip started (already clamped into the clip by the caller). */
  function drawMediaLayer(c, layer, tLocal) {
    const box = mediaLayerBox(layer);
    const { w, h } = box;
    c.save();
    c.translate(layer.x, layer.y);
    c.scale((layer.flipX ? -1 : 1) * layer.scale, layer.scale);
    c.globalAlpha = layer.opacity;
    /* Phase 6B: Adjust + Mask wrap the artwork (label stays outside). */
    c.save();
    applyAdjustFilter(c, layer);
    applyMaskClip(c, layer, w, h);
    const missing = !layer.mediaId || (S.mediaLoaded && !S.mediaMap.has(layer.mediaId));
    if (missing) {
      c.fillStyle = 'rgba(224,69,123,0.16)';
      rr(c, -w / 2, -h / 2, w, h, 12);
      c.fill();
      c.strokeStyle = 'rgba(255,120,150,0.85)';
      c.lineWidth = 2;
      c.stroke();
      c.restore();
      drawLabel(c, 'MISSING MEDIA', 0, 0, layer.scale);
      c.restore();
      return;
    }
    let drawn = false;
    if (layer.kind === 'video') {
      const el = videoFor(layer);
      if (el) {
        if (!layer.natW && el.videoWidth) { layer.natW = el.videoWidth; layer.natH = el.videoHeight; }
        const mediaDur = (el.duration && Number.isFinite(el.duration)) ? el.duration : (layer.mediaDurSec || 0);
        if (mediaDur && !layer.mediaDurSec) layer.mediaDurSec = mediaDur;
        /* Sync to the playhead: while playing, play; drift beyond 0.3 s
           (or any seek while paused) re-seeks so the paused frame is the
           frame at the playhead. Shorter media loops inside the clip. */
        const target = videoTimeAt(tLocal, layer.offsetSec || 0, mediaDur);
        if (el.readyState >= 1 && Math.abs(el.currentTime - target) > 0.3) {
          try { el.currentTime = target; } catch { /* not seekable yet */ }
        }
        if (S.playing) { if (el.paused) el.play().catch(() => {}); }
        else if (!el.paused) el.pause();
        if (el.readyState >= 2 && el.videoWidth) {
          c.drawImage(el, -w / 2, -h / 2, w, h);
          drawn = true;
        }
      }
    } else {
      const entry = mediaImageEntry(layer.mediaId);
      if (entry && entry.loaded && entry.img.naturalWidth) {
        if (!layer.natW) { layer.natW = entry.img.naturalWidth; layer.natH = entry.img.naturalHeight; }
        if (layer.kind === 'sprite') {
          const speed = (layer.anim && layer.anim.speed) || 1;
          const idx = spriteFrameAt(tLocal * speed, layer.fps || 12, layer.count || 1);
          const rect = spriteFrameRect(entry.img.naturalWidth, entry.img.naturalHeight,
            layer.cols || 1, layer.rows || 1, idx);
          c.drawImage(entry.img, rect.sx, rect.sy, rect.sw, rect.sh, -w / 2, -h / 2, w, h);
        } else {
          c.drawImage(entry.img, -w / 2, -h / 2, w, h);
        }
        drawn = true;
      }
    }
    if (!drawn) {
      c.fillStyle = 'rgba(91,114,158,0.25)';
      rr(c, -w / 2, -h / 2, w, h, 12);
      c.fill();
      c.strokeStyle = 'rgba(238,242,251,0.4)';
      c.lineWidth = 2;
      c.stroke();
    }
    c.restore(); /* adjust filter + mask clip off */
    drawLabel(c, layer.name, 0, h / 2 + 8, layer.scale);
    c.restore();
  }

  /* ------------------------- layer actions (6A) ------------------------- */
  function addImageMediaLayer(item) {
    const sd = stageDims(project);
    commit(() => {
      const sc = scene();
      const layer = defaultLayerFields({
        id: uid(), kind: 'image', name: item.name,
        mediaId: item.id, natW: item.width || null, natH: item.height || null,
        color: '#26a69a', x: sd.w / 2, y: sd.h / 2,
        startSec: Math.floor(S.playhead), durSec: Math.min(15, sc.durationSec)
      }, sc.durationSec, sd);
      sc.layers.push(layer);
      S.selectedId = layer.id;
    });
    toast('Added image: ' + item.name);
  }

  function addVideoMediaLayer(item) {
    const sd = stageDims(project);
    commit(() => {
      const sc = scene();
      const start = Math.min(Math.floor(S.playhead), Math.max(0, sc.durationSec - 1));
      const hasDur = Number.isFinite(item.durationSec) && item.durationSec > 0;
      const layer = defaultLayerFields({
        id: uid(), kind: 'video', name: item.name,
        mediaId: item.id, natW: item.width || null, natH: item.height || null,
        mediaDurSec: hasDur ? item.durationSec : null,
        color: '#7e8ce0', x: sd.w / 2, y: sd.h / 2,
        startSec: start,
        durSec: Math.max(0.5, Math.min(hasDur ? item.durationSec : 15, sc.durationSec - start))
      }, sc.durationSec, sd);
      sc.layers.push(layer);
      S.selectedId = layer.id;
    });
    toast('Added video: ' + item.name);
  }

  function addSpriteMediaLayer(item, cfg) {
    const frames = cfg || item.frames;
    if (!frames) {
      openSpriteWork(item);
      toast('Set the sprite frames first, then Save as Character');
      return;
    }
    const sd = stageDims(project);
    commit(() => {
      const sc = scene();
      const layer = defaultLayerFields({
        id: uid(), kind: 'sprite', name: item.name,
        mediaId: item.id, natW: item.width || null, natH: item.height || null,
        cols: frames.cols, rows: frames.rows, count: frames.count, fps: frames.fps,
        /* y = 400 at 16:9 (0.5556 × stage height), scaled per aspect. */
        color: '#ffa000', x: sd.w / 2, y: Math.round(sd.h * 0.5556),
        startSec: Math.floor(S.playhead), durSec: Math.min(15, sc.durationSec)
      }, sc.durationSec, sd);
      sc.layers.push(layer);
      S.selectedId = layer.id;
    });
    toast('Added sprite: ' + item.name);
  }

  function addEffectLayer(effectId) {
    const def = EFFECT_DEFS.find((d) => d.id === effectId);
    if (!def) return;
    commit(() => {
      const sc = scene();
      const layer = defaultLayerFields({
        id: uid(), kind: 'effect', name: def.name + ' Effect',
        effect: effectId,
        intensity: S.fxIntensity[effectId] || 2,
        lightning: effectId === 'rain' ? !!S.fxLightning : false,
        color: '#4fc3f7', startSec: 0, durSec: sc.durationSec
      }, sc.durationSec);
      sc.layers.push(layer);
      S.selectedId = layer.id;
    });
    toast('Effect added: ' + def.name);
  }

  /* --------------------------- file probing ----------------------------- */
  function probeImage(file) {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve({ w: img.naturalWidth, h: img.naturalHeight }); };
      img.onerror = () => { URL.revokeObjectURL(url); resolve({ w: 0, h: 0 }); };
      img.src = url;
    });
  }

  function probeVideo(file) {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const v = document.createElement('video');
      v.preload = 'metadata';
      v.muted = true;
      v.playsInline = true;
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        URL.revokeObjectURL(url);
        resolve({
          w: v.videoWidth || 0, h: v.videoHeight || 0,
          dur: Number.isFinite(v.duration) && v.duration > 0 ? v.duration : 0
        });
      };
      v.onloadedmetadata = finish;
      v.onerror = finish;
      setTimeout(finish, 4000);
      v.src = url;
    });
  }

  async function saveImageFile(file, kind) {
    const { w, h } = await probeImage(file);
    const item = {
      id: uid(),
      name: (file.name || 'Image').replace(/\.[^.]+$/, '') || 'Image',
      kind, mime: file.type || 'image/*',
      width: w || null, height: h || null,
      createdAt: Date.now(), blob: file
    };
    await putMedia(item);
    return item;
  }

  async function saveVideoFile(file) {
    const p = await probeVideo(file);
    const item = {
      id: uid(),
      name: (file.name || 'Video').replace(/\.[^.]+$/, '') || 'Video',
      kind: 'video', mime: file.type || 'video/*',
      width: p.w || null, height: p.h || null,
      durationSec: p.dur ? Math.round(p.dur * 100) / 100 : 0,
      createdAt: Date.now(), blob: file
    };
    await putMedia(item);
    return item;
  }

  /* Local gallery upload: route by file type (audio joins the Phase-5
     audio library flow; sprite sheets are just images here — slice them
     in the Sprite Sheet Studio). */
  async function handleLocalUpload(input) {
    const files = Array.from(input.files || []);
    input.value = '';
    for (const file of files) {
      if (file.type.startsWith('audio/')) { await saveAudioFile(file); continue; }
      if (file.type.startsWith('video/')) {
        const item = await saveVideoFile(file);
        toast('Video saved offline: ' + item.name);
        continue;
      }
      if (file.type.startsWith('image/')) {
        const item = await saveImageFile(file, 'image');
        toast('Image saved offline: ' + item.name);
        continue;
      }
      toast('Skipped unsupported file: ' + file.name);
    }
    await refreshMedia();
  }

  async function deleteLocalMedia(id) {
    const m = S.mediaMap.get(id);
    if (!m) return;
    if (!confirm('Delete "' + m.name + '" from this device? Layers using it will be marked as missing media and skipped.')) return;
    if (S.previewId === id) stopPreview();
    await deleteMedia(id);
    engine.forget(id);
    S.peaks.delete(id);
    const url = S.objUrls.get(id);
    if (url) { URL.revokeObjectURL(url); S.objUrls.delete(id); }
    S.mediaImgs.delete(id);
    for (const [lid, rec] of S.videoEls) {
      if (rec.mediaId === id) { try { rec.el.pause(); } catch { /* noop */ } S.videoEls.delete(lid); }
    }
    if (S.spriteWork && S.spriteWork.mediaId === id) S.spriteWork = null;
    await refreshMedia();
    renderCanvas();
    toast('Deleted from this device');
  }

  /* ------------------------- sprite studio ------------------------------ */
  function openSpriteWork(item) {
    const f = item.frames || {};
    const cols = f.cols || 4, rows = f.rows || 1;
    S.spriteWork = {
      mediaId: item.id, name: item.name,
      natW: item.width || 0, natH: item.height || 0,
      cols, rows, count: f.count || cols * rows, fps: f.fps || 12, onion: false
    };
    S.activePanel = 'sprite';
    S.drawerOpen = true;
    renderRail();
    renderDrawer();
  }

  async function handleSpriteUpload(input) {
    const file = input.files && input.files[0];
    input.value = '';
    if (!file) return;
    const item = await saveImageFile(file, 'sprite');
    await refreshMedia();
    openSpriteWork(item);
    toast('Sprite sheet loaded — set columns/rows, then Save as Character');
  }

  async function saveSpriteCharacter() {
    const w = S.spriteWork;
    if (!w) return;
    const rec = S.mediaMap.get(w.mediaId);
    if (!rec) { toast('Sprite sheet not found'); return; }
    const updated = {
      ...rec,
      name: (w.name || '').trim() || rec.name,
      frames: { cols: w.cols, rows: w.rows, count: w.count, fps: w.fps }
    };
    await putMedia(updated);
    await refreshMedia();
    toast('Saved as character: ' + updated.name);
  }

  function startSpritePreview() {
    cancelAnimationFrame(S.spriteRaf);
    S.spriteRaf = 0;
    const w = S.spriteWork;
    if (!w || !$('#spPreview')) return;
    const entry = mediaImageEntry(w.mediaId);
    const start = performance.now();
    const tick = () => {
      if (S.destroyed || S.activePanel !== 'sprite') { S.spriteRaf = 0; return; }
      const cv = $('#spPreview');
      if (!cv) { S.spriteRaf = 0; return; }
      if (entry && entry.loaded && entry.img.naturalWidth) {
        const img = entry.img;
        const t = (performance.now() - start) / 1000;
        const idx = spriteFrameAt(t, w.fps, w.count);
        const rect = spriteFrameRect(img.naturalWidth, img.naturalHeight, w.cols, w.rows, idx);
        const scale = Math.min(cv.width / rect.sw, cv.height / rect.sh);
        const dw = rect.sw * scale, dh = rect.sh * scale;
        const g = cv.getContext('2d');
        g.clearRect(0, 0, cv.width, cv.height);
        if (w.onion && w.count > 1) {
          const prev = (idx - 1 + w.count) % w.count;
          const pr = spriteFrameRect(img.naturalWidth, img.naturalHeight, w.cols, w.rows, prev);
          g.save();
          g.globalAlpha = 0.35;
          g.drawImage(img, pr.sx, pr.sy, pr.sw, pr.sh, (cv.width - dw) / 2, (cv.height - dh) / 2, dw, dh);
          g.restore();
        }
        g.drawImage(img, rect.sx, rect.sy, rect.sw, rect.sh, (cv.width - dw) / 2, (cv.height - dh) / 2, dw, dh);
        const lbl = root.querySelector('[data-sp-frame]');
        if (lbl) lbl.textContent = 'Frame ' + (idx + 1) + '/' + w.count;
      }
      S.spriteRaf = requestAnimationFrame(tick);
    };
    S.spriteRaf = requestAnimationFrame(tick);
  }

  /* --------------------- shared tool-image loading ---------------------- */
  /* Load an uploaded image into a working canvas, scaled down so the
     larger dimension is at most TOOL_MAX_DIM (1600px) for speed. */
  function loadToolImage(file) {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, TOOL_MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.max(1, Math.round(img.naturalWidth * scale));
        const h = Math.max(1, Math.round(img.naturalHeight * scale));
        const srcCanvas = document.createElement('canvas');
        srcCanvas.width = w;
        srcCanvas.height = h;
        srcCanvas.getContext('2d').drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve({
          srcCanvas,
          name: (file.name || 'Image').replace(/\.[^.]+$/, '') || 'Image',
          scaled: scale < 1
        });
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
      img.src = url;
    });
  }

  function downloadCanvasPng(canvas, baseName) {
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) { toast('Could not create the PNG'); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = (baseName || 'image') + '.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    }, 'image/png');
  }

  async function addProcessedToScene(canvas, baseName) {
    if (!canvas) return;
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
    if (!blob) { toast('Could not create the PNG'); return; }
    const item = {
      id: uid(), name: baseName, kind: 'processed', mime: 'image/png',
      width: canvas.width, height: canvas.height,
      createdAt: Date.now(), blob
    };
    await putMedia(item);
    await refreshMedia();
    addImageMediaLayer(item);
  }

  /* --------------------------- BG remover ------------------------------- */
  async function handleBgUpload(input) {
    const file = input.files && input.files[0];
    input.value = '';
    if (!file) return;
    const tool = await loadToolImage(file);
    if (!tool) { toast('Could not read that image'); return; }
    S.bgTool = { ...tool, key: { r: 255, g: 255, b: 255 }, tol: 70, soft: 45 };
    renderDrawer();
  }

  function applyBgPreview() {
    const t = S.bgTool;
    const cv = $('#bgPreview');
    if (!t || !cv) return;
    if (cv.width !== t.srcCanvas.width || cv.height !== t.srcCanvas.height) {
      cv.width = t.srcCanvas.width;
      cv.height = t.srcCanvas.height;
    }
    const srcCtx = t.srcCanvas.getContext('2d');
    const data = srcCtx.getImageData(0, 0, t.srcCanvas.width, t.srcCanvas.height);
    keyOut(data, t.key, t.tol, t.soft);
    cv.getContext('2d').putImageData(data, 0, 0);
  }

  /* ------------------------------ Eraser -------------------------------- */
  async function handleErUpload(input) {
    const file = input.files && input.files[0];
    input.value = '';
    if (!file) return;
    const tool = await loadToolImage(file);
    if (!tool) { toast('Could not read that photo'); return; }
    const work = document.createElement('canvas');
    work.width = tool.srcCanvas.width;
    work.height = tool.srcCanvas.height;
    work.getContext('2d').drawImage(tool.srcCanvas, 0, 0);
    S.erTool = {
      src: tool.srcCanvas, work, undo: [],
      size: 42, hardness: 0.85, tool: 'erase', name: tool.name
    };
    renderDrawer();
  }

  function drawEraserCanvas() {
    const t = S.erTool;
    const cv = $('#erCanvas');
    if (!t || !cv) return;
    if (cv.width !== t.work.width || cv.height !== t.work.height) {
      cv.width = t.work.width;
      cv.height = t.work.height;
    }
    cv.getContext('2d').drawImage(t.work, 0, 0);
  }

  function eraserStamp(x, y) {
    const t = S.erTool;
    if (!t) return;
    const r = t.size / 2;
    const d = Math.max(2, Math.ceil(t.size));
    const stamp = document.createElement('canvas');
    stamp.width = d;
    stamp.height = d;
    const sg = stamp.getContext('2d');
    const grad = sg.createRadialGradient(d / 2, d / 2, 0, d / 2, d / 2, r);
    grad.addColorStop(0, 'rgba(0,0,0,' + t.hardness + ')');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    sg.fillStyle = grad;
    sg.beginPath();
    sg.arc(d / 2, d / 2, r, 0, Math.PI * 2);
    sg.fill();
    const g = t.work.getContext('2d');
    if (t.tool === 'erase') {
      g.save();
      g.globalCompositeOperation = 'destination-out';
      g.drawImage(stamp, x - r, y - r);
      g.restore();
    } else {
      /* Restore: cut the same soft stamp shape out of the ORIGINAL and
         paint it back over the working canvas. */
      const piece = document.createElement('canvas');
      piece.width = d;
      piece.height = d;
      const pg = piece.getContext('2d');
      pg.drawImage(t.src, x - r, y - r, d, d, 0, 0, d, d);
      pg.globalCompositeOperation = 'destination-in';
      pg.drawImage(stamp, 0, 0);
      g.drawImage(piece, x - r, y - r);
    }
    drawEraserCanvas();
  }

  function eraserPushUndo() {
    const t = S.erTool;
    if (!t) return;
    const g = t.work.getContext('2d');
    t.undo.push(g.getImageData(0, 0, t.work.width, t.work.height));
    if (t.undo.length > 10) t.undo.shift();
  }

  /* ------------------------- tool canvas mounting ------------------------
     Drawers are re-rendered often (selection changes, media refresh…),
     which rebuilds their DOM. Tool state lives in S, and this hook —
     called at the end of renderDrawer — remounts the canvases and
     re-attaches the tool-local listeners each time. */
  function mountTools() {
    cancelAnimationFrame(S.spriteRaf);
    S.spriteRaf = 0;
    if (S.destroyed || !S.drawerOpen) return;
    if (S.activePanel === 'sprite') {
      startSpritePreview();
    } else if (S.activePanel === 'animik' && S.bgTool) {
      applyBgPreview();
      const cv = $('#bgPreview');
      if (cv) {
        cv.addEventListener('click', (evt) => {
          const t = S.bgTool;
          if (!t) return;
          const rect = cv.getBoundingClientRect();
          const x = Math.floor((evt.clientX - rect.left) * (cv.width / rect.width));
          const y = Math.floor((evt.clientY - rect.top) * (cv.height / rect.height));
          if (x < 0 || y < 0 || x >= cv.width || y >= cv.height) return;
          const px = t.srcCanvas.getContext('2d').getImageData(x, y, 1, 1).data;
          t.key = { r: px[0], g: px[1], b: px[2] };
          const sw = $('#bgSwatch');
          if (sw) sw.style.background = 'rgb(' + px[0] + ',' + px[1] + ',' + px[2] + ')';
          applyBgPreview();
          toast('Key colour picked: rgb(' + px[0] + ', ' + px[1] + ', ' + px[2] + ')');
        });
      }
    } else if (S.activePanel === 'eraser' && S.erTool) {
      drawEraserCanvas();
      const cv = $('#erCanvas');
      if (cv) {
        let painting = false;
        let last = null;
        const toCanvas = (evt) => {
          const rect = cv.getBoundingClientRect();
          return {
            x: (evt.clientX - rect.left) * (cv.width / rect.width),
            y: (evt.clientY - rect.top) * (cv.height / rect.height)
          };
        };
        const strokeTo = (pt) => {
          const t = S.erTool;
          if (!t) return;
          if (last) {
            const dist = Math.hypot(pt.x - last.x, pt.y - last.y);
            const steps = Math.max(1, Math.floor(dist / Math.max(2, t.size / 4)));
            for (let i = 1; i <= steps; i++) {
              eraserStamp(last.x + (pt.x - last.x) * (i / steps), last.y + (pt.y - last.y) * (i / steps));
            }
          } else {
            eraserStamp(pt.x, pt.y);
          }
          last = pt;
        };
        cv.addEventListener('pointerdown', (evt) => {
          if (!S.erTool) return;
          cv.setPointerCapture(evt.pointerId);
          eraserPushUndo();
          painting = true;
          last = null;
          strokeTo(toCanvas(evt));
          evt.preventDefault();
        });
        cv.addEventListener('pointermove', (evt) => {
          if (painting) strokeTo(toCanvas(evt));
        });
        const endStroke = () => { painting = false; last = null; };
        cv.addEventListener('pointerup', endStroke);
        cv.addEventListener('pointercancel', endStroke);
      }
    }
  }

  /* First paint */
  renderAll();
  refreshMedia();
  refreshCustomChars();
}

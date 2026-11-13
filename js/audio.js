/* Cartoon Studio — audio suite (Phase 5).
   Three parts:
   1) PURE helpers (DOM-free, unit-tested in Node): waveform peaks, a
      16-bit PCM WAV encoder, and the audio-clip math for split /
      left-edge trim / playback scheduling windows.
   2) AudioEngine — Web Audio playback synced to the editor playhead.
      Decoded buffers are cached by media id; the blobs themselves live
      in the IndexedDB 'media' store (js/db.js) and project JSON only
      ever references media by id.
   3) Synthesized SFX — eleven original effects: the Phase-5 set
      (Rain, Birds, Wind, Thunder, River) plus the Phase-10B animal
      set (Sheep, Rooster, Cat, Frog, Farm Mix, Morning Birds), all
      built from scratch with oscillators + filtered noise, rendered
      OFFLINE (OfflineAudioContext) to WAV so they are stored in the
      media library and reused like any other clip.
   No external audio files are used anywhere in this project. */

import { getMedia } from './db.js';

const clampNum = (v, min, max) => Math.min(max, Math.max(min, v));
const round3 = (v) => Math.round(v * 1000) / 1000;

/* ------------------------------ pure helpers ----------------------------- */

/** Deterministic PRNG (mulberry32) so generated noise/chirps are stable. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Peak magnitude per bucket for one channel of samples.
 * Returns a Float32Array of length `bucketCount` with values 0..1
 * (raw max-abs, NOT normalised — callers normalise if they want).
 */
export function computePeaks(samples, bucketCount) {
  const n = samples ? samples.length : 0;
  const buckets = Math.max(1, Math.floor(bucketCount) || 1);
  const out = new Float32Array(buckets);
  if (!n) return out;
  for (let b = 0; b < buckets; b++) {
    const from = Math.floor((b * n) / buckets);
    const to = Math.max(from + 1, Math.floor(((b + 1) * n) / buckets));
    let max = 0;
    for (let i = from; i < to && i < n; i++) {
      const v = Math.abs(samples[i]);
      if (v > max) max = v;
    }
    out[b] = max;
  }
  return out;
}

/** Peaks across several channels (max-abs merge). */
export function computePeaksMulti(channels, bucketCount) {
  const list = (channels || []).filter((c) => c && c.length);
  const buckets = Math.max(1, Math.floor(bucketCount) || 1);
  if (!list.length) return new Float32Array(buckets);
  const out = computePeaks(list[0], buckets);
  for (let c = 1; c < list.length; c++) {
    const p = computePeaks(list[c], buckets);
    for (let i = 0; i < buckets; i++) if (p[i] > out[i]) out[i] = p[i];
  }
  return out;
}

/**
 * Encode Float32 channel arrays as a 16-bit PCM WAV file.
 * `channels`: array of Float32Array (same length). Returns Uint8Array.
 */
export function encodeWav(channels, sampleRate) {
  const numCh = Math.max(1, channels.length);
  const frames = channels[0] ? channels[0].length : 0;
  const bytesPerSample = 2;
  const blockAlign = numCh * bytesPerSample;
  const dataSize = frames * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeStr = (off, s) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);            // fmt chunk size
  view.setUint16(20, 1, true);             // PCM
  view.setUint16(22, numCh, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);            // bits per sample
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);
  let off = 44;
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < numCh; c++) {
      const s = clampNum(channels[c][i] || 0, -1, 1);
      view.setInt16(off, s < 0 ? Math.round(s * 0x8000) : Math.round(s * 0x7FFF), true);
      off += 2;
    }
  }
  return new Uint8Array(buffer);
}

/**
 * Split an audio layer's clip at absolute scene time `tSec`.
 * The tail keeps the same media; its source offset advances by the
 * amount of clip consumed before the split. Returns
 * { head: { durSec }, tail: { startSec, durSec, offsetSec } } or null
 * when tSec is outside the clip.
 */
export function splitAudioAt(layer, tSec) {
  const start = layer.startSec || 0;
  const dur = layer.durSec || 0;
  const offset = layer.offsetSec || 0;
  if (!(tSec > start && tSec < start + dur)) return null;
  return {
    head: { durSec: round3(tSec - start) },
    tail: {
      startSec: round3(tSec),
      durSec: round3(start + dur - tSec),
      offsetSec: round3(offset + (tSec - start))
    }
  };
}

/**
 * Left-edge trim for an audio clip: dragging the left edge to
 * `newStartSec` moves startSec, offsetSec and durSec together — the
 * source can never be exposed before its own beginning (offset >= 0)
 * and the clip keeps at least 0.1 s.
 */
export function trimLeftAudio(layer, newStartSec) {
  const start = layer.startSec || 0;
  const dur = layer.durSec || 0;
  const offset = layer.offsetSec || 0;
  const minStart = Math.max(0, start - offset);
  const maxStart = start + dur - 0.1;
  const ns = clampNum(Number.isFinite(newStartSec) ? newStartSec : start, minStart, Math.max(minStart, maxStart));
  const delta = ns - start;
  return {
    startSec: round3(ns),
    offsetSec: round3(offset + delta),
    durSec: round3(dur - delta)
  };
}

/**
 * Scheduling window for an audio clip at a given playhead position.
 * Returns null when the clip has already ended at the playhead, else
 * { startsInSec, sourceOffsetSec, remainingSec }:
 *  - playhead before the clip: it starts in `startsInSec`, from its
 *    own offset, and plays for its full duration;
 *  - playhead inside the clip: it starts now, `sourceOffsetSec` into
 *    the source, and plays for `remainingSec`.
 */
export function clipWindowAt(layer, playheadSec) {
  const start = layer.startSec || 0;
  const dur = layer.durSec || 0;
  const offset = layer.offsetSec || 0;
  const t = Number.isFinite(playheadSec) ? playheadSec : 0;
  if (dur <= 0 || t >= start + dur) return null;
  if (t <= start) {
    return { startsInSec: round3(start - t), sourceOffsetSec: round3(offset), remainingSec: round3(dur) };
  }
  return {
    startsInSec: 0,
    sourceOffsetSec: round3(offset + (t - start)),
    remainingSec: round3(start + dur - t)
  };
}

/* ------------------------------ audio engine ----------------------------- */

/**
 * Playback engine. The editor owns the playhead (rAF in editor.js);
 * this engine is told "these audible layers, from this playhead" via
 * schedule() and it (re)builds Web Audio voices accordingly:
 *  - play  → schedule(layers, playhead)
 *  - seek while playing / pause / scene switch → stopAll() (+ schedule
 *    again from the new position when still playing)
 * Clips that begin later in the scene are scheduled ahead of time
 * against the context clock, so no per-frame work is needed.
 */
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;              // Phase 7: master bus → destination (+ export tee)
    this._exportDest = null;         // pending/active MediaStreamAudioDestinationNode
    this._connectedExport = null;    // destination node currently wired to master
    this.bufferPromises = new Map(); // mediaId -> Promise<AudioBuffer|null>
    this.peaksCache = new Map();     // mediaId -> Promise<Float32Array|null>
    this.voices = [];                // active { layerId, source, gain, volume, muted }
    this.gen = 0;                    // schedule generation (stale-load guard)
    this.previewSource = null;
    /* Phase 10B: amplitude lip-sync — an AnalyserNode tapped on the
       master bus + a smoothed RMS level (see getLevel). */
    this.analyser = null;
    this._levelData = null;          // Uint8Array time-domain scratch
    this._level = 0;                 // smoothed RMS 0..1
    this._levelAt = 0;               // performance.now of the last sample
  }

  ensureCtx() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      /* Phase 7: all scheduled voices route through ONE master gain.
         The master feeds the speakers; during a video export it ALSO
         feeds a MediaStreamAudioDestinationNode (the tee below), so
         the exact mix the user hears is what gets recorded. */
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      if (this._exportDest) {
        this.master.connect(this._exportDest);
        this._connectedExport = this._exportDest;
      }
      /* Phase 10B: tap the master bus with an analyser for lip-sync.
         The analyser is a dead-end tap (not connected onward), so it
         changes nothing audible and nothing in the export mix. */
      try {
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 512;
        this._levelData = new Uint8Array(this.analyser.fftSize);
        this.master.connect(this.analyser);
      } catch { this.analyser = null; }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    return this.ctx;
  }

  /**
   * Phase 10B: current smoothed RMS level of the master bus (0..1) —
   * the signal the amplitude lip-sync follows. Returns 0 when nothing
   * is scheduled/sounding or the context was never started. Sampling
   * is throttled to ~30 Hz and the value is exponentially smoothed
   * (fast attack, slower release) so mouth movement looks natural.
   */
  getLevel() {
    if (!this.ctx || !this.analyser || !this._levelData) return 0;
    const now = performance.now();
    if (now - this._levelAt < 33) return this._level;
    this._levelAt = now;
    let rms = 0;
    try {
      this.analyser.getByteTimeDomainData(this._levelData);
      let sum = 0;
      for (let i = 0; i < this._levelData.length; i++) {
        const v = (this._levelData[i] - 128) / 128;
        sum += v * v;
      }
      rms = Math.sqrt(sum / this._levelData.length);
    } catch { rms = 0; }
    const k = rms > this._level ? 0.55 : 0.22;
    this._level += (rms - this._level) * k;
    if (this._level < 0.001) this._level = 0;
    return this._level;
  }

  /** The node scheduled voices connect to (the master bus). */
  outputNode() {
    this.ensureCtx();
    return this.master;
  }

  /** Create a media-stream destination on this engine's context. */
  createExportDestination() {
    const ctx = this.ensureCtx();
    return ctx.createMediaStreamDestination();
  }

  /**
   * Phase 7: tee the master bus into `node` (a
   * MediaStreamAudioDestinationNode) so export recordings capture the
   * scheduled mix; pass null to disconnect. Safe to call before the
   * context exists — the wiring then happens in ensureCtx().
   */
  setExportDestination(node) {
    const dest = node || null;
    if (this.master && this._connectedExport && this._connectedExport !== dest) {
      try { this.master.disconnect(this._connectedExport); } catch { /* noop */ }
      this._connectedExport = null;
    }
    this._exportDest = dest;
    if (dest && this.master && this._connectedExport !== dest) {
      this.master.connect(dest);
      this._connectedExport = dest;
    }
  }

  async decodeBlob(blob) {
    const ctx = this.ensureCtx();
    const ab = await blob.arrayBuffer();
    return ctx.decodeAudioData(ab);
  }

  /** Seed the buffer cache with an already-decoded buffer. */
  prime(mediaId, buffer) {
    this.bufferPromises.set(mediaId, Promise.resolve(buffer));
  }

  /** Drop cached decode/peaks for a media id (e.g. after deletion). */
  forget(mediaId) {
    this.bufferPromises.delete(mediaId);
    this.peaksCache.delete(mediaId);
  }

  loadBuffer(mediaId) {
    if (!this.bufferPromises.has(mediaId)) {
      const p = (async () => {
        const rec = await getMedia(mediaId);
        if (!rec || !rec.blob) return null;
        try { return await this.decodeBlob(rec.blob); } catch { return null; }
      })();
      this.bufferPromises.set(mediaId, p);
    }
    return this.bufferPromises.get(mediaId);
  }

  /** Normalised peaks (0..1) for waveform drawing, computed once. */
  async getPeaks(mediaId, buckets = 240) {
    if (!this.peaksCache.has(mediaId)) {
      const p = (async () => {
        const buffer = await this.loadBuffer(mediaId);
        if (!buffer) return null;
        const channels = [];
        for (let c = 0; c < buffer.numberOfChannels; c++) channels.push(buffer.getChannelData(c));
        const peaks = computePeaksMulti(channels, buckets);
        let max = 0;
        for (const v of peaks) if (v > max) max = v;
        if (max > 0) for (let i = 0; i < peaks.length; i++) peaks[i] = peaks[i] / max;
        return peaks;
      })();
      this.peaksCache.set(mediaId, p);
    }
    return this.peaksCache.get(mediaId);
  }

  schedule(layers, playheadSec) {
    this.stopAll();
    if (!Array.isArray(layers) || layers.length === 0) return;
    const ctx = this.ensureCtx();
    const gen = this.gen;
    const t0 = ctx.currentTime + 0.06;
    for (const layer of layers) {
      if (!layer || layer.kind !== 'audio' || !layer.mediaId || layer.muted || layer.hidden) continue;
      const win = clipWindowAt(layer, playheadSec);
      if (!win) continue;
      const voice = {
        layerId: layer.id, source: null, gain: null,
        volume: Number.isFinite(layer.volume) ? layer.volume : 1,
        muted: !!layer.muted
      };
      this.voices.push(voice);
      this.loadBuffer(layer.mediaId).then((buffer) => {
        if (!buffer || gen !== this.gen || !this.voices.includes(voice)) return;
        const dur = Math.min(win.remainingSec, Math.max(0, buffer.duration - win.sourceOffsetSec));
        if (dur <= 0.001) return;
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        const g = ctx.createGain();
        g.gain.value = voice.muted ? 0 : voice.volume;
        src.connect(g);
        g.connect(this.master || ctx.destination);
        try { src.start(t0 + win.startsInSec, win.sourceOffsetSec, dur); } catch { return; }
        voice.source = src;
        voice.gain = g;
        src.onended = () => {
          const i = this.voices.indexOf(voice);
          if (i >= 0) this.voices.splice(i, 1);
        };
      }).catch(() => {});
    }
  }

  stopAll() {
    this.gen++;
    const vs = this.voices;
    this.voices = [];
    for (const v of vs) {
      if (v.source) {
        try { v.source.stop(); } catch { /* already stopped */ }
        try { v.source.disconnect(); } catch { /* noop */ }
      }
      if (v.gain) { try { v.gain.disconnect(); } catch { /* noop */ } }
    }
  }

  setLayerVolume(layerId, volume, muted) {
    for (const v of this.voices) {
      if (v.layerId !== layerId) continue;
      v.volume = volume;
      v.muted = !!muted;
      if (v.gain) v.gain.gain.value = v.muted ? 0 : volume;
    }
  }

  /** One-shot playback of an in-memory buffer (SFX preview). */
  playBufferOnce(buffer) {
    const ctx = this.ensureCtx();
    if (this.previewSource) {
      try { this.previewSource.stop(); } catch { /* noop */ }
      this.previewSource = null;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const g = ctx.createGain();
    g.gain.value = 0.9;
    src.connect(g);
    g.connect(ctx.destination);
    src.onended = () => { if (this.previewSource === src) this.previewSource = null; };
    src.start();
    this.previewSource = src;
  }
}

/* --------------------------- synthesized SFX ----------------------------- */
/* All effects are original procedural synthesis: filtered noise,
   oscillator chirps and envelope-shaped rumbles. Nothing is sampled. */

export const SFX_DEFS = [
  { id: 'rain', name: 'Rain', durationSec: 10, desc: 'Filtered-noise rainfall' },
  { id: 'birds', name: 'Birds', durationSec: 6, desc: 'Synthesized birdsong chirps' },
  { id: 'wind', name: 'Wind', durationSec: 8, desc: 'Swept band-pass wind' },
  { id: 'thunder', name: 'Thunder', durationSec: 4, desc: 'Crack + low rumble' },
  { id: 'river', name: 'River / Water', durationSec: 10, desc: 'Bubbling stream noise' },
  /* Phase 10B: the reference's animal sounds (parity 11.2/11.4–11.8),
     synthesised the same way. Durations are ours (the reference's
     library listed longer/shorter cuts); Farm Mix layers the sheep +
     hen-cluck voices with the Phase-5 birdsong, and Morning Birds is
     a long, gentle dawn chorus. */
  { id: 'sheep', name: 'Sheep', durationSec: 3, desc: 'Bleating — vibrato sawtooth bursts' },
  { id: 'rooster', name: 'Rooster', durationSec: 3, desc: 'Cock-a-doodle crow contour' },
  { id: 'cat', name: 'Cat', durationSec: 3, desc: 'Two meow pitch-glides' },
  { id: 'frog', name: 'Frog', durationSec: 4, desc: 'Croak pulse trains' },
  { id: 'farm', name: 'Farm Mix', durationSec: 12, desc: 'Sheep + hen clucks + birds, layered' },
  { id: 'dawn', name: 'Morning Birds', durationSec: 36, desc: 'Long gentle dawn chorus' }
];

const SFX_SAMPLE_RATE = 44100;

function noiseBuffer(ctx, seconds, seed) {
  const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  const rng = mulberry32(seed);
  for (let i = 0; i < len; i++) d[i] = rng() * 2 - 1;
  return buf;
}

/** Gain curve from fn(t01) with short edge fades multiplied in. */
function gainCurve(dur, fn, { fade = 0.06, points = 128 } = {}) {
  const curve = new Float32Array(points);
  for (let i = 0; i < points; i++) {
    const t = i / (points - 1);
    const edge = Math.min(1, Math.min(t, 1 - t) / fade);
    curve[i] = Math.max(0, fn(t)) * Math.max(0, edge);
  }
  return curve;
}

function buildRain(ctx, dest, dur) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, dur, 101);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 850; lp.Q.value = 0.4;
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 240;
  const g = ctx.createGain();
  g.gain.setValueCurveAtTime(
    gainCurve(dur, (t) => 0.52 + 0.10 * Math.sin(t * Math.PI * 4) + 0.05 * Math.sin(t * Math.PI * 11)), 0, dur);
  src.connect(lp); lp.connect(hp); hp.connect(g); g.connect(dest);
  src.start(0); src.stop(dur);
  /* High hiss layer for sparkle. */
  const hiss = ctx.createBufferSource();
  hiss.buffer = noiseBuffer(ctx, dur, 202);
  const hh = ctx.createBiquadFilter(); hh.type = 'highpass'; hh.frequency.value = 5200;
  const hg = ctx.createGain();
  hg.gain.setValueCurveAtTime(gainCurve(dur, () => 0.05), 0, dur);
  hiss.connect(hh); hh.connect(hg); hg.connect(dest);
  hiss.start(0); hiss.stop(dur);
}

function chirp(ctx, dest, start, dur, f0, rng) {
  const o = ctx.createOscillator();
  o.type = 'sine';
  const f1 = f0 * (1.15 + rng() * 0.35);
  const f2 = f0 * (0.8 + rng() * 0.25);
  o.frequency.setValueAtTime(f0, start);
  o.frequency.exponentialRampToValueAtTime(f1, start + dur * 0.4);
  o.frequency.exponentialRampToValueAtTime(Math.max(400, f2), start + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(0.45, start + dur * 0.25);
  g.gain.exponentialRampToValueAtTime(0.001, start + dur);
  o.connect(g); g.connect(dest);
  o.start(start); o.stop(start + dur + 0.05);
}

function buildBirds(ctx, dest, dur) {
  const rng = mulberry32(20240521);
  const master = ctx.createGain();
  master.gain.value = 0.55;
  master.connect(dest);
  let t = 0.25;
  while (t < dur - 0.5) {
    const base = 1900 + rng() * 1500;
    const syllables = 2 + Math.floor(rng() * 3);
    let st = t;
    for (let s = 0; s < syllables; s++) {
      const sd = 0.09 + rng() * 0.08;
      chirp(ctx, master, st, sd, base * (0.92 + rng() * 0.2), rng);
      st += sd + 0.03 + rng() * 0.05;
    }
    t = st + 0.25 + rng() * 0.7;
  }
}

function buildWind(ctx, dest, dur) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, dur, 303);
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.1;
  const points = 96;
  const freqCurve = new Float32Array(points);
  for (let i = 0; i < points; i++) {
    const t = i / (points - 1);
    freqCurve[i] = Math.max(120, 380 + 260 * Math.sin(t * Math.PI * 1.6) + 90 * Math.sin(t * Math.PI * 5.3));
  }
  bp.frequency.setValueCurveAtTime(freqCurve, 0, dur);
  const g = ctx.createGain();
  g.gain.setValueCurveAtTime(
    gainCurve(dur, (t) => 0.30 + 0.22 * Math.sin(t * Math.PI * 1.3) + 0.08 * Math.sin(t * Math.PI * 6), { fade: 0.12 }), 0, dur);
  src.connect(bp); bp.connect(g); g.connect(dest);
  src.start(0); src.stop(dur);
}

function buildThunder(ctx, dest, dur) {
  /* Crack: short bright noise burst. */
  const crack = ctx.createBufferSource();
  crack.buffer = noiseBuffer(ctx, dur, 404);
  const ch = ctx.createBiquadFilter(); ch.type = 'highpass'; ch.frequency.value = 600;
  const cg = ctx.createGain();
  cg.gain.setValueAtTime(0.85, 0);
  cg.gain.exponentialRampToValueAtTime(0.02, 0.28);
  cg.gain.linearRampToValueAtTime(0, 0.45);
  crack.connect(ch); ch.connect(cg); cg.connect(dest);
  crack.start(0); crack.stop(0.5);
  /* Rumble: low-passed noise, exp decay with two secondary swells. */
  const rum = ctx.createBufferSource();
  rum.buffer = noiseBuffer(ctx, dur, 505);
  const rl = ctx.createBiquadFilter(); rl.type = 'lowpass'; rl.frequency.value = 120; rl.Q.value = 0.6;
  const rg = ctx.createGain();
  const points = 256;
  const curve = new Float32Array(points);
  for (let i = 0; i < points; i++) {
    const t = i / (points - 1);
    let v = Math.exp(-t * 2.4) * (0.8 + 0.3 * Math.sin(t * 40) * Math.exp(-t * 1.5));
    v += 0.5 * Math.exp(-Math.pow(t - 0.30, 2) / 0.004);
    v += 0.3 * Math.exp(-Math.pow(t - 0.55, 2) / 0.01);
    const tail = t > 0.95 ? (1 - t) / 0.05 : 1;
    curve[i] = Math.max(0, v) * 0.9 * tail;
  }
  curve[0] = 0.9;
  rg.gain.setValueCurveAtTime(curve, 0, dur);
  rum.connect(rl); rl.connect(rg); rg.connect(dest);
  rum.start(0); rum.stop(dur);
}

function buildRiver(ctx, dest, dur) {
  const rng = mulberry32(606);
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, dur, 707);
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 520; bp.Q.value = 0.7;
  const lfo = ctx.createOscillator(); lfo.frequency.value = 0.17;
  const lfoDepth = ctx.createGain(); lfoDepth.gain.value = 140;
  lfo.connect(lfoDepth); lfoDepth.connect(bp.frequency);
  const g = ctx.createGain();
  g.gain.setValueCurveAtTime(gainCurve(dur, () => 0.42, { fade: 0.08 }), 0, dur);
  const babble = ctx.createOscillator(); babble.frequency.value = 5.8;
  const babbleDepth = ctx.createGain(); babbleDepth.gain.value = 0.10;
  babble.connect(babbleDepth); babbleDepth.connect(g.gain);
  src.connect(bp); bp.connect(g); g.connect(dest);
  src.start(0); src.stop(dur);
  lfo.start(0); lfo.stop(dur);
  babble.start(0); babble.stop(dur);
  /* Sparse bubble blips. */
  for (let t = 0.4; t < dur - 0.3; t += 0.3 + rng() * 0.9) {
    const o = ctx.createOscillator(); o.type = 'sine';
    const f = 420 + rng() * 260;
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * 2.1, t + 0.07);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0, t);
    og.gain.linearRampToValueAtTime(0.05, t + 0.02);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    o.connect(og); og.connect(dest);
    o.start(t); o.stop(t + 0.12);
  }
}

/* --------------------- Phase 10B: animal voices ------------------------ */
/* Shared voice primitives so the standalone effects and the Farm Mix
   layer the SAME animals. All are formant-ish oscillator voices —
   sawtooth/triangle cores through band-pass filters with vibrato and
   hand-shaped envelopes. Nothing is sampled. */

/** One bleat: vibrato sawtooth burst through a band-pass "throat". */
function bleatVoice(ctx, dest, start, dur, baseFreq, vol = 0.5) {
  const o = ctx.createOscillator();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(baseFreq * 1.06, start);
  o.frequency.exponentialRampToValueAtTime(baseFreq * 0.94, start + dur);
  const vib = ctx.createOscillator();
  vib.frequency.value = 11;
  const vibDepth = ctx.createGain();
  vibDepth.gain.value = baseFreq * 0.055;
  vib.connect(vibDepth); vibDepth.connect(o.frequency);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass'; bp.frequency.value = baseFreq * 3.1; bp.Q.value = 1.1;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(vol, start + 0.05);
  g.gain.setValueAtTime(vol, start + Math.max(0.05, dur - 0.09));
  g.gain.linearRampToValueAtTime(0, start + dur);
  o.connect(bp); bp.connect(g); g.connect(dest);
  o.start(start); o.stop(start + dur + 0.05);
  vib.start(start); vib.stop(start + dur + 0.05);
}

function buildSheep(ctx, dest, dur) {
  /* "Baa-baaa": a short bleat, a beat, then a longer one. */
  bleatVoice(ctx, dest, 0.15, 0.55, 392, 0.5);
  bleatVoice(ctx, dest, 1.0, 1.5, 370, 0.55);
}

/** One crow syllable: a fast rising-then-falling pitch bark. */
function crowNote(ctx, dest, start, dur, f0, f1, vol = 0.4) {
  const o = ctx.createOscillator();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(f0, start);
  o.frequency.exponentialRampToValueAtTime(f1, start + dur * 0.35);
  o.frequency.exponentialRampToValueAtTime(f0 * 0.82, start + dur);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = 0.9;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(vol, start + dur * 0.2);
  g.gain.exponentialRampToValueAtTime(0.001, start + dur);
  o.connect(bp); bp.connect(g); g.connect(dest);
  o.start(start); o.stop(start + dur + 0.05);
}

function buildRooster(ctx, dest, dur) {
  /* Cock-a-doodle-doo: three short rising barks + one long held crow. */
  crowNote(ctx, dest, 0.15, 0.22, 740, 1180, 0.42);
  crowNote(ctx, dest, 0.48, 0.22, 784, 1245, 0.44);
  crowNote(ctx, dest, 0.81, 0.26, 880, 1397, 0.46);
  crowNote(ctx, dest, 1.25, 1.35, 988, 1568, 0.5);
}

/** One meow: slow pitch glide up then down (formant-filtered). */
function meowVoice(ctx, dest, start, dur, vol = 0.5) {
  const o = ctx.createOscillator();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(520, start);
  o.frequency.exponentialRampToValueAtTime(880, start + dur * 0.38);
  o.frequency.exponentialRampToValueAtTime(430, start + dur);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass'; bp.Q.value = 1.6;
  bp.frequency.setValueAtTime(900, start);
  bp.frequency.exponentialRampToValueAtTime(1450, start + dur * 0.38);
  bp.frequency.exponentialRampToValueAtTime(760, start + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(vol, start + dur * 0.22);
  g.gain.setValueAtTime(vol * 0.9, start + dur * 0.55);
  g.gain.linearRampToValueAtTime(0, start + dur);
  o.connect(bp); bp.connect(g); g.connect(dest);
  o.start(start); o.stop(start + dur + 0.05);
}

function buildCat(ctx, dest, dur) {
  meowVoice(ctx, dest, 0.2, 1.05, 0.5);
  meowVoice(ctx, dest, 1.55, 1.15, 0.44);
}

/** One croak: a train of short low pulses with a falling tail. */
function croakVoice(ctx, dest, start, pulses, vol = 0.5) {
  for (let i = 0; i < pulses; i++) {
    const t = start + i * 0.085;
    const o = ctx.createOscillator();
    o.type = 'square';
    const f = 130 - i * 5;
    o.frequency.setValueAtTime(f, t);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = 2.5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    o.connect(lp); lp.connect(g); g.connect(dest);
    o.start(t); o.stop(t + 0.09);
  }
}

function buildFrog(ctx, dest, dur) {
  croakVoice(ctx, dest, 0.2, 7, 0.5);
  croakVoice(ctx, dest, 1.35, 5, 0.42);
  croakVoice(ctx, dest, 2.5, 8, 0.48);
}

/** Hen clucks: very short filtered noise+tone "buk" bursts in groups. */
function cluckGroup(ctx, dest, start, count, rng, vol = 0.3) {
  let t = start;
  for (let i = 0; i < count; i++) {
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.setValueAtTime(620 + rng() * 120, t);
    o.frequency.exponentialRampToValueAtTime(300, t + 0.06);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 1100; bp.Q.value = 1.4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    o.connect(bp); bp.connect(g); g.connect(dest);
    o.start(t); o.stop(t + 0.09);
    t += 0.1 + rng() * 0.07;
  }
  return t;
}

function buildFarm(ctx, dest, dur) {
  const rng = mulberry32(1213);
  const g = ctx.createGain();
  g.gain.value = 0.8;
  g.connect(dest);
  /* Birdsong bed underneath everything (the Phase-5 builder, quieter). */
  buildBirds(ctx, g, dur);
  bleatVoice(ctx, g, 0.7, 1.3, 380, 0.42);
  bleatVoice(ctx, g, 6.4, 1.5, 360, 0.4);
  let t = 2.6;
  while (t < dur - 2.2) {
    t = cluckGroup(ctx, g, t, 3 + Math.floor(rng() * 3), rng, 0.26) + 1.1 + rng() * 1.6;
  }
  crowNote(ctx, g, 9.6, 0.9, 900, 1450, 0.34);
}

function buildDawn(ctx, dest, dur) {
  /* Morning Birds: the Phase-5 chirp voice, slower and gentler,
     with soft high warbles for the full 36 s — a dawn chorus. */
  const rng = mulberry32(3605);
  const g = ctx.createGain();
  g.gain.value = 0.5;
  g.connect(dest);
  let t = 0.6;
  while (t < dur - 1.2) {
    const base = 2100 + rng() * 1300;
    const syllables = 2 + Math.floor(rng() * 4);
    let st = t;
    for (let s = 0; s < syllables; s++) {
      const sd = 0.11 + rng() * 0.1;
      chirp(ctx, g, st, sd, base * (0.94 + rng() * 0.16), rng);
      st += sd + 0.05 + rng() * 0.07;
    }
    t = st + 0.7 + rng() * 1.6;
  }
}

const SFX_BUILDERS = {
  rain: buildRain, birds: buildBirds, wind: buildWind, thunder: buildThunder, river: buildRiver,
  sheep: buildSheep, rooster: buildRooster, cat: buildCat, frog: buildFrog,
  farm: buildFarm, dawn: buildDawn
};

const sfxBufferCache = new Map(); // sfxId -> Promise<AudioBuffer>

/** Render an SFX offline to an AudioBuffer (cached per effect id). */
export function renderSfxBuffer(id) {
  if (!sfxBufferCache.has(id)) {
    const def = SFX_DEFS.find((d) => d.id === id);
    const builder = SFX_BUILDERS[id];
    if (!def || !builder) return Promise.resolve(null);
    const p = (async () => {
      const ctx = new OfflineAudioContext(1, Math.floor(SFX_SAMPLE_RATE * def.durationSec), SFX_SAMPLE_RATE);
      const master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(ctx.destination);
      builder(ctx, master, def.durationSec);
      return ctx.startRendering();
    })();
    sfxBufferCache.set(id, p);
  }
  return sfxBufferCache.get(id);
}

/** Render an SFX to a WAV Blob (for storage in the media library). */
export async function sfxWavBlob(id) {
  const buffer = await renderSfxBuffer(id);
  if (!buffer) return null;
  const bytes = encodeWav([buffer.getChannelData(0)], buffer.sampleRate);
  return new Blob([bytes], { type: 'audio/wav' });
}

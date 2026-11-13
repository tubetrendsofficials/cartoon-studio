/* Cartoon Studio — text-layer math (Phase 8, our extra).
   PURE, DOM-free helpers (unit-tested in Node): a measure-free word
   wrap (character-count heuristic parameterised by font size and box
   width — the canvas renderer uses the SAME heuristic, so what the
   tests pin down is exactly what gets drawn), plus the on-stage box
   sizes for text and subtitle layers.

   The heuristic assumes an average glyph advance of ~0.55 × fontSize,
   which is close for the Latin/Bangla sans fonts the canvas uses; the
   renderer centres every line, so small estimation errors only change
   where lines break, never whether text fits its box width budget. */

/** Average glyph advance as a fraction of the font size. */
export const CHAR_ADVANCE = 0.55;

/** How many characters fit on one line of `boxWidthPx` at `fontSize`. */
export function charsPerLine(fontSize, boxWidthPx) {
  const fs = Number.isFinite(fontSize) && fontSize > 0 ? fontSize : 16;
  const w = Number.isFinite(boxWidthPx) && boxWidthPx > 0 ? boxWidthPx : 100;
  return Math.max(1, Math.floor(w / (fs * CHAR_ADVANCE)));
}

/**
 * Word-wrap `text` to lines of at most `maxChars` characters.
 * Words longer than a line are hard-split; explicit newlines start a
 * new line; runs of spaces/tabs collapse. Empty input yields [''] so
 * callers always have at least one line to draw.
 */
export function wrapText(text, maxChars) {
  const limit = Math.max(1, Math.floor(Number.isFinite(maxChars) ? maxChars : 1));
  const src = String(text == null ? '' : text);
  const out = [];
  for (const para of src.split(/\r?\n/)) {
    const words = para.split(/[ \t]+/).filter((w) => w.length > 0);
    if (words.length === 0) { out.push(''); continue; }
    let line = '';
    for (const word of words) {
      if (word.length > limit) {
        /* Hard-split an over-long word across full lines. */
        if (line) { out.push(line); line = ''; }
        let rest = word;
        while (rest.length > limit) { out.push(rest.slice(0, limit)); rest = rest.slice(limit); }
        line = rest;
        continue;
      }
      if (line === '') line = word;
      else if (line.length + 1 + word.length <= limit) line += ' ' + word;
      else { out.push(line); line = word; }
    }
    if (line) out.push(line);
  }
  return out.length ? out : [''];
}

/** Wrap `text` for a box of `boxWidthPx` at `fontSize` (chars heuristic). */
export function wrapForBox(text, fontSize, boxWidthPx) {
  return wrapText(text, charsPerLine(fontSize, boxWidthPx));
}

/** Heuristic rendered width of a single line of text. */
export function estimateTextWidth(text, fontSize) {
  const fs = Number.isFinite(fontSize) && fontSize > 0 ? fontSize : 16;
  return String(text == null ? '' : text).length * fs * CHAR_ADVANCE;
}

/** Text layers wrap at 80% of the stage width (per the Phase 8 spec). */
export function textWrapWidth(dims) {
  const w = dims && Number.isFinite(dims.w) && dims.w > 0 ? dims.w : 1280;
  return w * 0.8;
}

const LINE_H = 1.25;   /* line height as a multiple of fontSize */
const BUBBLE_PAD = 0.35; /* bubble padding as a multiple of fontSize */

/**
 * On-stage (unscaled) box for a text layer: width follows the longest
 * wrapped line (capped at the wrap width), height the line count;
 * the 'bubble' style adds padding all round (and may widen the box a
 * little past the wrap width for that padding).
 */
export function textLayerBox(layer, dims) {
  const D = dims && Number.isFinite(dims.w) && dims.w > 0 ? dims : { w: 1280, h: 720 };
  const fs = layer && Number.isFinite(layer.fontSize) && layer.fontSize > 0 ? layer.fontSize : 64;
  const wrapW = textWrapWidth(D);
  const lines = wrapForBox(layer ? layer.text : '', fs, wrapW);
  const longest = lines.reduce((m, l) => Math.max(m, l.length), 0);
  let w = Math.min(wrapW, Math.max(40, longest * fs * CHAR_ADVANCE));
  let h = lines.length * fs * LINE_H;
  if (layer && layer.style === 'bubble') {
    const pad = fs * BUBBLE_PAD;
    w = Math.min(D.w * 0.92, w + pad * 2);
    h += pad * 2;
  }
  return { w: Math.round(w), h: Math.round(h) };
}

/** Subtitles wrap a little wider (84% of stage) inside a 92%-wide bar. */
export function subtitleWrapWidth(dims) {
  const w = dims && Number.isFinite(dims.w) && dims.w > 0 ? dims.w : 1280;
  return w * 0.84;
}

/** On-stage (unscaled) box for a subtitle layer (the bottom bar). */
export function subtitleLayerBox(layer, dims) {
  const D = dims && Number.isFinite(dims.w) && dims.w > 0 ? dims : { w: 1280, h: 720 };
  const fs = layer && Number.isFinite(layer.fontSize) && layer.fontSize > 0 ? layer.fontSize : 44;
  const lines = wrapForBox(layer ? layer.text : '', fs, subtitleWrapWidth(D));
  return {
    w: Math.round(D.w * 0.92),
    h: Math.round(lines.length * fs * LINE_H + fs * 0.55)
  };
}

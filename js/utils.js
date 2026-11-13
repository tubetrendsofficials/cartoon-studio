/* Small shared helpers. */

export function uid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

export function escapeHtml(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function formatDateTime(ts) {
  try {
    return new Date(ts).toLocaleString('bn-BD', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return new Date(ts).toLocaleString();
  }
}

export function timeAgo(ts) {
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 45) return 'Just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return min + ' min ago';
  const hr = Math.floor(min / 60);
  if (hr < 24) return hr + ' hr ago';
  const day = Math.floor(hr / 24);
  if (day < 30) return day + ' day' + (day > 1 ? 's' : '') + ' ago';
  return formatDateTime(ts);
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes == null) return 'unknown';
  if (bytes < 1024) return bytes + ' B';
  const units = ['KB', 'MB', 'GB', 'TB'];
  let v = bytes / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return v.toFixed(1) + ' ' + units[i];
}

/** Storage meter data from the browser, honestly reported. */
export async function getStorageInfo() {
  if (navigator.storage && navigator.storage.estimate) {
    try {
      const est = await navigator.storage.estimate();
      if (typeof est.usage === 'number') {
        const pct = (typeof est.quota === 'number' && est.quota > 0)
          ? Math.min(100, Math.round((est.usage / est.quota) * 100))
          : null;
        return { known: true, usage: est.usage, quota: est.quota ?? null, pct };
      }
    } catch { /* fall through */ }
  }
  return { known: false, usage: null, quota: null, pct: null };
}

export function downloadTextFile(filename, text, mime = 'application/json') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

/** Seconds → "mm:ss" (e.g. 120 → "02:00"). */
export function formatTimecode(sec) {
  const s = Math.max(0, Math.round(Number(sec) || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return String(m).padStart(2, '0') + ':' + String(r).padStart(2, '0');
}

export function safeFilename(name) {
  return String(name || 'cartoon-project')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .slice(0, 80) || 'cartoon-project';
}

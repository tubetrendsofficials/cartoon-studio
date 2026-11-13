/* IndexedDB wrapper — projects + media stores.
   DB: "cartoon-studio"
     v1: store "projects" (keyPath "id")
     v2: adds store "media" (keyPath "id") — media blobs live here:
         audio: { id, name, kind: 'recording'|'upload'|'sfx', mime,
                  durationSec, createdAt, blob, sfxId? }
         Phase 6A adds visual kinds (same store, no version bump):
                  kind: 'image'|'video'|'sprite'|'processed' with
                  { width, height } (+ durationSec for video, and
                  frames: { cols, rows, count, fps } for saved sprites).
         Phase 6B adds kind: 'custom-character' — Character Studio
                  creations { name, params, createdAt } with NO blob;
                  layers reference them as assetId 'custom:<id>'.
   Project JSON references media by id ONLY — blobs never enter project
   objects, so .cartoon.json exports stay small and honest (see the
   mediaManifest note the dashboard adds on export).

   MIGRATION: the upgrade handler only CREATES stores that are missing.
   A v1 database keeps its "projects" store (and every project in it)
   untouched and simply gains an empty "media" store; a fresh install
   gets both stores at v2. */

const DB_NAME = 'cartoon-studio';
const DB_VERSION = 2;
const PROJECTS = 'projects';
const MEDIA = 'media';

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(PROJECTS)) {
        db.createObjectStore(PROJECTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(MEDIA)) {
        db.createObjectStore(MEDIA, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(storeName, mode, run) {
  return openDb().then((db) => new Promise((resolve, reject) => {
    const t = db.transaction(storeName, mode);
    const store = t.objectStore(storeName);
    let result;
    const req = run(store);
    if (req) {
      req.onsuccess = () => { result = req.result; };
      req.onerror = () => reject(req.error);
    }
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error || new Error('transaction aborted'));
  }));
}

/* ------------------------------- projects -------------------------------- */

export function getAllProjects() {
  return tx(PROJECTS, 'readonly', (store) => store.getAll()).then((list) => {
    const arr = Array.isArray(list) ? list : [];
    arr.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    return arr;
  });
}

export function getProject(id) {
  return tx(PROJECTS, 'readonly', (store) => store.get(id));
}

export function putProject(project) {
  return tx(PROJECTS, 'readwrite', (store) => store.put(project)).then(() => project);
}

export function deleteProject(id) {
  return tx(PROJECTS, 'readwrite', (store) => store.delete(id));
}

/* --------------------------------- media --------------------------------- */
/* Media records carry the audio Blob itself. listMedia returns full
   records (the editor needs blobs for preview/peaks anyway) sorted
   newest first. */

export function putMedia(item) {
  return tx(MEDIA, 'readwrite', (store) => store.put(item)).then(() => item);
}

export function getMedia(id) {
  return tx(MEDIA, 'readonly', (store) => store.get(id));
}

export function listMedia() {
  return tx(MEDIA, 'readonly', (store) => store.getAll()).then((list) => {
    const arr = Array.isArray(list) ? list : [];
    arr.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return arr;
  });
}

export function deleteMedia(id) {
  return tx(MEDIA, 'readwrite', (store) => store.delete(id));
}

/* --------------------- custom characters (Phase 6B) ---------------------- */
/* Character Studio creations live in the same media store (no version
   bump): records carry the builder params instead of a blob, and project
   layers reference them by 'custom:<id>' (see js/charbuilder.js). */

export function putCustomChar(item) {
  return putMedia({ ...item, kind: 'custom-character' });
}

export function listCustomChars() {
  return listMedia().then((list) => list.filter((m) => m.kind === 'custom-character'));
}

export function deleteCustomChar(id) {
  return deleteMedia(id);
}

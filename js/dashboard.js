/* Dashboard view — profile card, storage meter, project list + CRUD.
   Phase 1 of BUILD-PLAN.md. All data is local (IndexedDB). */

import { getAllProjects, putProject, deleteProject } from './db.js';
import {
  uid, escapeHtml, timeAgo, formatBytes, getStorageInfo,
  downloadTextFile, safeFilename
} from './utils.js';

const COUNTER_KEY = 'cartoonStudio.projectCounter';
const SEEDED_KEY = 'cartoonStudio.seededSampleV1';

function nextProjectNumber() {
  const n = (parseInt(localStorage.getItem(COUNTER_KEY) || '0', 10) || 0) + 1;
  localStorage.setItem(COUNTER_KEY, String(n));
  return n;
}

/* Phase 8: projects are created in one of three aspects — the aspect
   is fixed for the life of the project (the editor says so too). */
export const PROJECT_ASPECTS = [
  { id: '16:9', label: '16:9' },
  { id: '9:16', label: '9:16 · Shorts' },
  { id: '1:1', label: '1:1' }
];

export function createEmptyProject(name, aspect) {
  const now = Date.now();
  return {
    id: uid(),
    name,
    createdAt: now,
    updatedAt: now,
    aspect: PROJECT_ASPECTS.some((a) => a.id === aspect) ? aspect : '16:9',
    durationSec: 120,
    scenes: [{ id: uid(), name: 'Scene 1', durationSec: 120, layers: [] }],
    tracks: []
  };
}

async function seedSampleIfFirstRun() {
  if (localStorage.getItem(SEEDED_KEY)) return;
  const existing = await getAllProjects();
  localStorage.setItem(SEEDED_KEY, '1');
  if (existing.length > 0) return;
  const sample = createEmptyProject('Sample — My First Cartoon (Sample)');
  sample.sample = true;
  await putProject(sample);
}

function trackCount(project) {
  /* Phase 2: count layers across all scenes; fall back to the legacy
     flat `tracks` mirror for very old project objects. */
  if (Array.isArray(project.scenes)) {
    const n = project.scenes.reduce(
      (sum, s) => sum + (Array.isArray(s.layers) ? s.layers.length : 0), 0);
    if (n > 0) return n;
  }
  if (Array.isArray(project.tracks)) return project.tracks.length;
  return 0;
}

export async function renderDashboard(root, { onOpen } = {}) {
  await seedSampleIfFirstRun();
  let projects = await getAllProjects();
  let query = '';
  let newAspect = '16:9'; /* Phase 8: aspect picked for the NEXT new project */

  root.innerHTML = `
    <header class="topbar">
      <div class="brand">
        <img src="icons/logo.svg" alt="" width="34" height="34">
        <span>Cartoon Studio</span>
      </div>
      <div class="spacer"></div>
      <span class="version">v0.10.1 · Phases 0–8 + 10</span>
      <div class="avatar" title="Local Creator">L</div>
    </header>
    <main class="wrap">
      <section class="profile-card">
        <div class="profile-row">
          <div class="avatar">L</div>
          <div>
            <p class="profile-name">Local Creator</p>
            <p class="profile-sub">Local mode — no account needed. Projects are saved in this browser (IndexedDB).</p>
            <p style="margin:.4rem 0 0">
              <span class="badge free">FREE — ALL FEATURES</span>
              <span class="badge mode">FREE PLAN</span>
            </p>
          </div>
        </div>
        <div class="storage">
          <div class="bar"><div class="fill" id="storageFill"></div></div>
          <div class="label" id="storageLabel">Storage: checking…</div>
        </div>
      </section>

      <section>
        <div class="projects-head">
          <h2>Projects (<span id="projCount">0</span>)</h2>
          <input class="search-box" id="searchBox" type="search" placeholder="Search projects… / প্রজেক্ট খুঁজুন">
          <button class="btn" id="importBtn" type="button">Import</button>
          <input type="file" id="importFile" accept=".json,application/json" hidden>
          <span class="aspect-chips" role="group" aria-label="Aspect for the new project" title="Aspect for the new project — fixed once the project is created">
            ${PROJECT_ASPECTS.map((a) => `
              <button class="chip-btn ${a.id === '16:9' ? 'active' : ''}" data-aspect="${a.id}" type="button">${escapeHtml(a.label)}</button>`).join('')}
          </span>
          <button class="btn primary" id="newBtn" type="button">＋ New Project</button>
        </div>
        <div id="projectList"></div>
        <p class="format-note">Files get exported in <b>.cartoon.json</b> format — our own project format for Cartoon Studio (share, back up, or re-import them anytime).</p>
      </section>
    </main>
    <p class="footer-note">Cartoon Studio — an original, free, offline-first 2D animation maker. See FEATURE-PARITY.md for the full build checklist.</p>
  `;

  const listEl = root.querySelector('#projectList');
  const countEl = root.querySelector('#projCount');

  async function refreshStorage() {
    const info = await getStorageInfo();
    const fill = root.querySelector('#storageFill');
    const label = root.querySelector('#storageLabel');
    if (!label) return;
    if (info.known) {
      if (fill && info.pct != null) fill.style.width = info.pct + '%';
      label.textContent = 'Storage Used: ' + formatBytes(info.usage) +
        (info.quota ? ' of ' + formatBytes(info.quota) : '') +
        (info.pct != null ? ' (' + info.pct + '%)' : '');
    } else {
      label.textContent = 'Storage: unknown (this browser does not report an estimate)';
    }
  }

  function draw() {
    const filtered = projects.filter((p) =>
      !query || (p.name || '').toLowerCase().includes(query.toLowerCase()));
    countEl.textContent = String(projects.length);
    if (projects.length === 0) {
      listEl.innerHTML = `<div class="empty">
        <p><b>No projects yet.</b></p>
        <p>কোনো প্রজেক্ট নেই — “＋ New Project” চেপে প্রথম কার্টুন প্রজেক্ট বানান।</p>
      </div>`;
      return;
    }
    if (filtered.length === 0) {
      listEl.innerHTML = `<div class="empty"><p>No project matches “${escapeHtml(query)}”.</p></div>`;
      return;
    }
    listEl.innerHTML = '<div class="cards">' + filtered.map((p) => `
      <article class="card" data-id="${escapeHtml(p.id)}">
        <h3>${escapeHtml(p.name)} ${p.sample ? '<span class="badge sample">Sample</span>' : ''}</h3>
        <div class="meta">Ready to animate</div>
        <div>
          <span class="badge mode">EASY MODE</span>
          <span class="badge active">ACTIVE</span>
          <span class="badge aspect">${escapeHtml(p.aspect || '16:9')}</span>
        </div>
        <div class="meta">${trackCount(p)} Tracks · Updated ${escapeHtml(timeAgo(p.updatedAt || p.createdAt))}</div>
        <div class="actions">
          <button class="btn small primary" data-act="open" type="button">Open Project</button>
          <button class="btn small" data-act="rename" type="button">Rename</button>
          <button class="btn small" data-act="duplicate" type="button">Duplicate</button>
          <button class="btn small" data-act="export" type="button">Export file</button>
          <button class="btn small danger" data-act="delete" type="button">Delete</button>
        </div>
      </article>`).join('') + '</div>';
  }

  async function reload() {
    projects = await getAllProjects();
    draw();
    refreshStorage();
  }

  root.querySelector('#searchBox').addEventListener('input', (e) => {
    query = e.target.value;
    draw();
  });

  /* Phase 8: aspect chips choose the next project's aspect — creating
     stays instant (no dialog), exactly like the reference. */
  root.querySelectorAll('button[data-aspect]').forEach((btn) => {
    btn.addEventListener('click', () => {
      newAspect = btn.dataset.aspect;
      root.querySelectorAll('button[data-aspect]').forEach((b) =>
        b.classList.toggle('active', b.dataset.aspect === newAspect));
    });
  });

  root.querySelector('#newBtn').addEventListener('click', async () => {
    const project = createEmptyProject('New Cartoon Project ' + nextProjectNumber(), newAspect);
    await putProject(project);
    await reload();
    if (onOpen) onOpen(project.id);
  });

  const importFile = root.querySelector('#importFile');
  root.querySelector('#importBtn').addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', async () => {
    const file = importFile.files && importFile.files[0];
    importFile.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data || typeof data.name !== 'string' || !Array.isArray(data.scenes)) {
        throw new Error('not a Cartoon Studio project file');
      }
      const now = Date.now();
      const project = {
        ...createEmptyProject(data.name),
        ...data,
        id: uid(),
        createdAt: now,
        updatedAt: now,
        sample: false
      };
      /* The export-only manifest note is not project data. */
      delete project.mediaManifest;
      await putProject(project);
      await reload();
      alert('Project imported: ' + project.name);
    } catch (err) {
      alert('Import failed — this is not a valid .cartoon.json project file.');
    }
  });

  listEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const card = e.target.closest('[data-id]');
    const project = projects.find((p) => p.id === (card && card.dataset.id));
    if (!project) return;
    const act = btn.dataset.act;

    if (act === 'open') {
      if (onOpen) onOpen(project.id);
    } else if (act === 'rename') {
      const name = prompt('Project name:', project.name);
      if (name && name.trim()) {
        project.name = name.trim();
        project.updatedAt = Date.now();
        await putProject(project);
        await reload();
      }
    } else if (act === 'duplicate') {
      const copy = JSON.parse(JSON.stringify(project));
      copy.id = uid();
      copy.name = project.name + ' (Copy)';
      copy.sample = false;
      copy.createdAt = Date.now();
      copy.updatedAt = Date.now();
      await putProject(copy);
      await reload();
    } else if (act === 'export') {
      const out = JSON.parse(JSON.stringify(project));
      /* Phase 5: audio blobs live in this browser's IndexedDB media
         library and are NOT embedded in the file — the project only
         references them by media id. Say so honestly in the export. */
      const audioIds = [...new Set((project.scenes || [])
        .flatMap((s) => (s.layers || [])
          .filter((l) => l.kind === 'audio' && l.mediaId)
          .map((l) => l.mediaId)))];
      if (audioIds.length) {
        out.mediaManifest = {
          note: 'Audio media is stored locally in this browser (IndexedDB media library) and is NOT embedded in this file. This project references audio clips by media id only — in another browser/device those clips will show as "missing media" until the same audio is added to that library.',
          mediaIds: audioIds
        };
      }
      downloadTextFile(safeFilename(project.name) + '.cartoon.json', JSON.stringify(out, null, 2));
    } else if (act === 'delete') {
      if (confirm('Delete project “' + project.name + '”? This cannot be undone.')) {
        await deleteProject(project.id);
        await reload();
      }
    }
  });

  draw();
  refreshStorage();
}

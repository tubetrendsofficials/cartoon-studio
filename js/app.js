/* Cartoon Studio — app entry + tiny view router (dashboard ⇄ editor). */

import { renderDashboard } from './dashboard.js';
import { renderEditor } from './editor.js';

const root = document.getElementById('app');

async function showDashboard() {
  await renderDashboard(root, {
    onOpen: (projectId) => showEditor(projectId)
  });
  window.scrollTo(0, 0);
}

async function showEditor(projectId) {
  await renderEditor(root, projectId, {
    onBack: () => showDashboard()
  });
  window.scrollTo(0, 0);
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* Offline support is a bonus — the app still runs without it
         (e.g. when opened via file://). */
    });
  });
}

showDashboard().catch((err) => {
  root.innerHTML = '<main class="wrap"><div class="empty"><p><b>Something went wrong starting Cartoon Studio.</b></p><p>' +
    String(err && err.message ? err.message : err) + '</p></div></main>';
  console.error(err);
});

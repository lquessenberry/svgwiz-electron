import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './components/App';
import './tailwind.css';

// Global hardening: prevent drag-and-drop navigation and route external links via IPC
// Note: DropZone stops propagation, so its internal drops remain functional.
window.addEventListener('dragover', (e) => {
  try {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'none';
  } catch (_) {}
});
window.addEventListener('drop', (e) => {
  try {
    e.preventDefault();
  } catch (_) {}
});
document.addEventListener('click', (e) => {
  try {
    const a = e.target && e.target.closest ? e.target.closest('a') : null;
    if (!a) return;
    const href = a.getAttribute('href') || '';
    if (!href) return;
    const u = new URL(a.href);
    if (u.protocol === 'http:' || u.protocol === 'https:') {
      e.preventDefault();
      try { window.api.openExternal(u.href); } catch (_) {}
    }
  } catch (_) {}
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

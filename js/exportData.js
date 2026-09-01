import { api } from './api.js';

async function exportAll() {
  try {
    const data = await api.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `t07-export-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    alert('내보내기 실패: ' + err.message);
  }
}

export function initExport() {
  document.getElementById('exportBtn').addEventListener('click', exportAll);
}

import { supabase } from './supabaseClient.js';

async function fetchAll(table) {
  const { data, error } = await supabase.from(table).select('*');
  if (error) throw error;
  return data;
}

async function exportAll() {
  try {
    const [plans, plan_revisions, todos, execution_logs] = await Promise.all([
      fetchAll('plans'),
      fetchAll('plan_revisions'),
      fetchAll('todos'),
      fetchAll('execution_logs'),
    ]);
    const payload = { exported_at: new Date().toISOString(), plans, plan_revisions, todos, execution_logs };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `t06-export-${Date.now()}.json`;
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

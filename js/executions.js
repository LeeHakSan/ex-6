import { supabase } from './supabaseClient.js';
import { escapeHtml, fmtDateTime, localInputToISO, minutesBetween } from './utils.js';

const modal = document.getElementById('todoDetailModal');
const titleEl = document.getElementById('todoDetailTitle');
const logsEl = document.getElementById('executionLogsList');
const formEl = document.getElementById('executionLogForm');
const closeBtn = document.getElementById('todoDetailClose');

let currentTodoId = null;

async function loadLogs(todoId) {
  const { data: todo } = await supabase.from('todos').select('*').eq('id', todoId).single();
  const { data: logs, error } = await supabase
    .from('execution_logs')
    .select('*')
    .eq('todo_id', todoId)
    .order('started_at', { ascending: false });
  if (error) {
    console.error(error);
    return;
  }
  titleEl.textContent = todo ? `실행 기록 — ${todo.title}` : '실행 기록';
  logsEl.innerHTML = !logs.length
    ? '<p class="empty">아직 실행 기록이 없습니다.</p>'
    : logs
        .map(
          (l) => `
      <div class="log-item">
        <div>${fmtDateTime(l.started_at)} ~ ${fmtDateTime(l.ended_at)} (${l.actual_minutes}분)</div>
        ${l.blocked_reason ? `<div class="note danger">막힌 이유: ${escapeHtml(l.blocked_reason)}</div>` : ''}
      </div>`
        )
        .join('');
}

export async function openTodoDetail(todoId) {
  currentTodoId = todoId;
  formEl.reset();
  await loadLogs(todoId);
  modal.classList.add('open');
}

function closeModal() {
  modal.classList.remove('open');
  currentTodoId = null;
}

async function saveLog(e) {
  e.preventDefault();
  if (!currentTodoId) return;
  const startedISO = localInputToISO(formEl.started_at.value);
  const endedISO = localInputToISO(formEl.ended_at.value);
  if (!startedISO || !endedISO) {
    alert('시작/끝 시각을 입력해 주세요.');
    return;
  }
  if (new Date(endedISO) < new Date(startedISO)) {
    alert('끝난 시각이 시작 시각보다 빠를 수 없습니다.');
    return;
  }
  const payload = {
    todo_id: currentTodoId,
    started_at: startedISO,
    ended_at: endedISO,
    actual_minutes: minutesBetween(startedISO, endedISO),
    blocked_reason: formEl.blocked_reason.value.trim() || null,
  };
  // 실행 기록은 execution_logs에만 저장하고 todos/plans의 계획 값은 절대 건드리지 않는다.
  const { error } = await supabase.from('execution_logs').insert(payload);
  if (error) {
    alert('실행 기록 저장 실패: ' + error.message);
    return;
  }
  formEl.reset();
  await loadLogs(currentTodoId);
  document.dispatchEvent(new CustomEvent('app:execution-saved'));
}

export function initExecutions() {
  formEl.addEventListener('submit', saveLog);
  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
}

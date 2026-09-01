import { api } from './api.js';
import { escapeHtml, fmtDateTime, localInputToISO } from './utils.js';

const modal = document.getElementById('todoDetailModal');
const titleEl = document.getElementById('todoDetailTitle');
const logsEl = document.getElementById('executionLogsList');
const formEl = document.getElementById('executionLogForm');
const closeBtn = document.getElementById('todoDetailClose');

let currentTodo = null;

function renderLogs(todo) {
  titleEl.textContent = `실행 기록 — ${todo.title}`;
  const logs = (todo.execution_logs || []).slice().sort((a, b) => new Date(b.started_at) - new Date(a.started_at));
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

export function openTodoDetail(todo) {
  currentTodo = todo;
  formEl.reset();
  renderLogs(todo);
  modal.classList.add('open');
}

function closeModal() {
  modal.classList.remove('open');
  currentTodo = null;
}

async function saveLog(e) {
  e.preventDefault();
  if (!currentTodo) return;
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
    todo_id: currentTodo.id,
    started_at: startedISO,
    ended_at: endedISO,
    blocked_reason: formEl.blocked_reason.value.trim() || null,
  };
  try {
    // 실행 기록은 execution_logs에만 저장하고 todos/plans의 계획 값은 절대 건드리지 않는다.
    const { log } = await api.createExecutionLog(payload);
    currentTodo = { ...currentTodo, execution_logs: [...(currentTodo.execution_logs || []), log] };
    formEl.reset();
    renderLogs(currentTodo);
    document.dispatchEvent(new CustomEvent('app:execution-saved'));
  } catch (err) {
    alert('실행 기록 저장 실패: ' + err.message);
  }
}

export function initExecutions() {
  formEl.addEventListener('submit', saveLog);
  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
}

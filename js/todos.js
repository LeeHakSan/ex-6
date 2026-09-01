import { api } from './api.js';
import { escapeHtml, fmtDateTime, toLocalInputValue, localInputToISO, PRIORITY_RANK, PRIORITY_LABEL } from './utils.js';
import { getSelectedPlanId } from './plans.js';
import { showTab } from './tabs.js';
import { openTodoDetail } from './executions.js';

const listEl = document.getElementById('todosList');
const formEl = document.getElementById('todoForm');
const editingIdField = document.getElementById('todoEditingId');
const searchEl = document.getElementById('todoSearch');
const statusFilterEl = document.getElementById('todoStatusFilter');
const sortEl = document.getElementById('todoSort');
const sortLabelEl = document.getElementById('todoSortLabel');
const planSelectEl = document.getElementById('planSelect');

let todos = [];
let extraFilter = null; // { blockedIds: [...] } | { delayedOnly: true } | null

const SORT_LABELS = {
  deadline_asc: '마감일 빠른 순 (동률 시 먼저 만든 순)',
  deadline_desc: '마감일 늦은 순 (동률 시 먼저 만든 순)',
  priority_desc: '우선순위 높은 순 (동률 시 먼저 만든 순)',
  estimated_desc: '예상 시간 많은 순 (동률 시 먼저 만든 순)',
  created_desc: '최근 만든 순',
};

export async function loadTodos() {
  const planId = getSelectedPlanId();
  if (!planId) {
    todos = [];
    renderTodos();
    return;
  }
  // 서버(API)에서 계획에 속한, 삭제되지 않은 할 일을 가져온 뒤
  // 검색/필터/정렬은 화면(JS)에서 결정한다 — 정렬 기준과 동률 처리 규칙을 여기 한 곳에서만 관리하기 위함.
  try {
    const { todos: data } = await api.listTodos(planId);
    todos = data || [];
  } catch (err) {
    console.error(err);
    alert('할 일을 불러오지 못했습니다: ' + err.message);
    return;
  }
  renderTodos();
}

function getFilteredSorted() {
  const search = searchEl.value.trim().toLowerCase();
  const status = statusFilterEl.value;
  let list = todos.filter((t) => {
    if (search) {
      const hay = `${t.title} ${t.description || ''} ${(t.tags || []).join(' ')}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    if (status !== 'all' && t.status !== status) return false;
    if (extraFilter?.blockedIds && !extraFilter.blockedIds.includes(t.id)) return false;
    if (extraFilter?.delayedOnly) {
      const isDelayed = t.status !== 'completed' && t.deadline && new Date(t.deadline) < new Date();
      if (!isDelayed) return false;
    }
    return true;
  });

  const sortBy = sortEl.value;
  const dir = sortBy.endsWith('_desc') ? -1 : 1;
  list.sort((a, b) => {
    let cmp = 0;
    if (sortBy.startsWith('deadline')) {
      const ad = a.deadline ? new Date(a.deadline).getTime() : Infinity;
      const bd = b.deadline ? new Date(b.deadline).getTime() : Infinity;
      cmp = (ad - bd) * dir;
    } else if (sortBy.startsWith('priority')) {
      cmp = ((PRIORITY_RANK[a.priority] || 0) - (PRIORITY_RANK[b.priority] || 0)) * dir;
    } else if (sortBy.startsWith('estimated')) {
      cmp = (a.estimated_minutes - b.estimated_minutes) * dir;
    } else if (sortBy === 'created_desc') {
      cmp = new Date(b.created_at) - new Date(a.created_at);
    }
    if (cmp !== 0) return cmp;
    // 동률일 때는 항상 먼저 만든 순(created_at asc)으로 고정한다.
    return new Date(a.created_at) - new Date(b.created_at);
  });
  return list;
}

function renderTodos() {
  sortLabelEl.textContent = `정렬 기준: ${SORT_LABELS[sortEl.value]}`;
  const list = getFilteredSorted();
  if (!list.length) {
    listEl.innerHTML = '<p class="empty">조건에 맞는 할 일이 없습니다.</p>';
    return;
  }
  listEl.innerHTML = list
    .map((t) => {
      const blocked = (t.execution_logs || []).some((l) => l.blocked_reason);
      const delayed = t.status !== 'completed' && t.deadline && new Date(t.deadline) < new Date();
      return `
    <div class="card ${t.status === 'completed' ? 'done' : ''}" data-id="${t.id}">
      <div class="card-head">
        <strong>${escapeHtml(t.title)}</strong>
        <span class="badge">${PRIORITY_LABEL[t.priority] || '-'}</span>
        ${delayed ? '<span class="badge warn">지연</span>' : ''}
        ${blocked ? '<span class="badge danger">막힘</span>' : ''}
        ${t.status === 'completed' ? '<span class="badge ok">완료</span>' : ''}
      </div>
      <div class="card-body">
        ${t.description ? `<div>${escapeHtml(t.description)}</div>` : ''}
        <div>마감일: ${t.deadline ? fmtDateTime(t.deadline) : '-'}</div>
        <div>태그: ${(t.tags || []).map(escapeHtml).join(', ') || '-'}</div>
        <div>예상 시간: ${t.estimated_minutes}분 · 실행 기록 ${(t.execution_logs || []).length}건</div>
      </div>
      <div class="card-actions">
        <button class="btn-detail" data-id="${t.id}">실행 기록 / 상세</button>
        <button class="btn-edit" data-id="${t.id}">수정</button>
        ${
          t.status === 'completed'
            ? `<button class="btn-revert" data-id="${t.id}">되돌리기</button>`
            : `<button class="btn-complete" data-id="${t.id}">완료</button>`
        }
        <button class="btn-delete" data-id="${t.id}">삭제</button>
      </div>
    </div>`;
    })
    .join('');

  listEl.querySelectorAll('.btn-detail').forEach((b) =>
    b.addEventListener('click', () => {
      const todo = todos.find((t) => t.id === b.dataset.id);
      if (todo) openTodoDetail(todo);
    })
  );
  listEl.querySelectorAll('.btn-edit').forEach((b) => b.addEventListener('click', () => startEdit(b.dataset.id)));
  listEl.querySelectorAll('.btn-complete').forEach((b) => b.addEventListener('click', () => completeTodo(b.dataset.id)));
  listEl.querySelectorAll('.btn-revert').forEach((b) => b.addEventListener('click', () => revertTodo(b.dataset.id)));
  listEl.querySelectorAll('.btn-delete').forEach((b) => b.addEventListener('click', () => deleteTodo(b.dataset.id)));
}

function startEdit(id) {
  const t = todos.find((x) => x.id === id);
  if (!t) return;
  editingIdField.value = t.id;
  formEl.title.value = t.title;
  formEl.description.value = t.description || '';
  formEl.deadline.value = toLocalInputValue(t.deadline);
  formEl.priority.value = t.priority || 'medium';
  formEl.tags.value = (t.tags || []).join(', ');
  formEl.estimated_minutes.value = t.estimated_minutes;
  document.getElementById('todoFormTitle').textContent = '할 일 수정';
  formEl.scrollIntoView({ behavior: 'smooth' });
}

function resetForm() {
  formEl.reset();
  editingIdField.value = '';
  document.getElementById('todoFormTitle').textContent = '새 할 일 만들기';
}

async function saveTodo(e) {
  e.preventDefault();
  const planId = getSelectedPlanId();
  if (!planId) {
    alert('먼저 계획을 선택하거나 만들어 주세요.');
    return;
  }
  const payload = {
    plan_id: planId,
    title: formEl.title.value.trim(),
    description: formEl.description.value.trim() || null,
    deadline: localInputToISO(formEl.deadline.value),
    priority: formEl.priority.value,
    tags: formEl.tags.value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    estimated_minutes: Number(formEl.estimated_minutes.value) || 0,
  };
  if (!payload.title) {
    alert('제목은 필수입니다.');
    return;
  }

  try {
    const editingId = editingIdField.value;
    if (editingId) {
      await api.updateTodo(editingId, payload);
    } else {
      await api.createTodo(payload);
    }
  } catch (err) {
    alert('저장 실패: ' + err.message);
    return;
  }
  resetForm();
  await loadTodos();
}

async function completeTodo(id) {
  try {
    await api.updateTodo(id, { action: 'complete' });
  } catch (err) {
    alert('완료 처리 실패: ' + err.message);
    return;
  }
  await loadTodos();
}

async function revertTodo(id) {
  try {
    await api.updateTodo(id, { action: 'revert' });
  } catch (err) {
    alert('되돌리기 실패: ' + err.message);
    return;
  }
  await loadTodos();
}

async function deleteTodo(id) {
  if (!confirm('이 할 일을 삭제할까요?')) return;
  try {
    await api.updateTodo(id, { action: 'delete' });
  } catch (err) {
    alert('삭제 실패: ' + err.message);
    return;
  }
  await loadTodos();
}

function applyDrilldown(detail) {
  statusFilterEl.value = detail.status || 'all';
  extraFilter = detail.extra || null;
  searchEl.value = '';
  showTab('todos');
  renderTodos();
}

export function initTodos() {
  formEl.addEventListener('submit', saveTodo);
  document.getElementById('todoFormCancel').addEventListener('click', resetForm);
  searchEl.addEventListener('input', renderTodos);
  statusFilterEl.addEventListener('change', renderTodos);
  sortEl.addEventListener('change', renderTodos);
  planSelectEl.addEventListener('change', () => {
    extraFilter = null;
    loadTodos();
  });
  document.addEventListener('app:execution-saved', loadTodos);
  document.addEventListener('app:drilldown', (e) => applyDrilldown(e.detail));
}

import { api } from './api.js';
import { escapeHtml, fmtDate, fmtDateTime, PRIORITY_LABEL } from './utils.js';

const listEl = document.getElementById('plansList');
const selectEl = document.getElementById('planSelect');
const formEl = document.getElementById('planForm');
const carriedNoteEl = document.getElementById('carriedOverNote');
const editingIdField = document.getElementById('planEditingId');

let plans = [];

export async function loadPlans() {
  try {
    const { plans: data } = await api.listPlans();
    plans = data || [];
  } catch (err) {
    console.error(err);
    alert('계획을 불러오지 못했습니다: ' + err.message);
    return;
  }
  renderPlansList();
  renderPlanSelect();
  if (!editingIdField.value) prefillCarriedOverNote();
}

function renderPlansList() {
  if (!plans.length) {
    listEl.innerHTML = '<p class="empty">아직 계획이 없습니다. 아래에서 계획을 만들어 보세요.</p>';
    return;
  }
  listEl.innerHTML = plans
    .map(
      (p) => `
    <div class="card" data-id="${p.id}">
      <div class="card-head">
        <strong>${escapeHtml(p.title)}</strong>
        <span class="badge">${PRIORITY_LABEL[p.priority] || escapeHtml(p.priority)}</span>
      </div>
      <div class="card-body">
        <div>기간: ${fmtDate(p.period_start)} ~ ${fmtDate(p.period_end)}</div>
        <div>성공 기준: ${escapeHtml(p.success_criteria)}</div>
        <div>예상 시간: ${p.estimated_minutes}분</div>
        ${p.carried_over_note ? `<div class="note">이전 계획 메모: ${escapeHtml(p.carried_over_note)}</div>` : ''}
        ${p.retro_note ? `<div class="note">돌아보기 고칠 점: ${escapeHtml(p.retro_note)}</div>` : ''}
      </div>
      <div class="card-actions">
        <button class="btn-edit" data-id="${p.id}">수정</button>
        <button class="btn-history" data-id="${p.id}">수정 이력 보기</button>
      </div>
      <div class="revisions" id="rev-${p.id}" hidden></div>
    </div>`
    )
    .join('');

  listEl.querySelectorAll('.btn-edit').forEach((btn) => btn.addEventListener('click', () => startEdit(btn.dataset.id)));
  listEl.querySelectorAll('.btn-history').forEach((btn) => btn.addEventListener('click', () => toggleRevisions(btn.dataset.id)));
}

function renderPlanSelect() {
  const prev = selectEl.value;
  if (!plans.length) {
    selectEl.innerHTML = '<option value="">계획을 세워보세요!</option>';
    selectEl.disabled = true;
  } else {
    selectEl.disabled = false;
    selectEl.innerHTML = plans.map((p) => `<option value="${p.id}">${escapeHtml(p.title)}</option>`).join('');
    if (plans.some((p) => p.id === prev)) selectEl.value = prev;
  }
  // 계획 목록이 새로 로드될 때마다 select의 change 이벤트를 직접 발생시켜
  // todos.js / review.js가 현재 선택된 계획 기준으로 다시 로드하도록 만든다.
  selectEl.dispatchEvent(new Event('change'));
}

function prefillCarriedOverNote() {
  const latest = plans[0];
  carriedNoteEl.value = latest ? latest.retro_note || '' : '';
}

function startEdit(id) {
  const p = plans.find((x) => x.id === id);
  if (!p) return;
  editingIdField.value = p.id;
  formEl.title.value = p.title;
  formEl.period_start.value = p.period_start;
  formEl.period_end.value = p.period_end;
  formEl.priority.value = p.priority;
  formEl.success_criteria.value = p.success_criteria;
  formEl.estimated_minutes.value = p.estimated_minutes;
  carriedNoteEl.value = p.carried_over_note || '';
  document.getElementById('planFormTitle').textContent = '계획 수정';
  formEl.scrollIntoView({ behavior: 'smooth' });
}

function resetForm() {
  formEl.reset();
  editingIdField.value = '';
  document.getElementById('planFormTitle').textContent = '새 계획 만들기';
  prefillCarriedOverNote();
}

async function toggleRevisions(id) {
  const el = document.getElementById(`rev-${id}`);
  if (!el.hidden) {
    el.hidden = true;
    return;
  }
  let data;
  try {
    const res = await api.listRevisions(id);
    data = res.revisions || [];
  } catch (err) {
    console.error(err);
    return;
  }
  el.innerHTML = !data.length
    ? '<p class="empty">아직 수정 이력이 없습니다.</p>'
    : data
        .map(
          (r) => `
      <div class="revision-item">
        <div class="rev-time">${fmtDateTime(r.revised_at)} 시점 이전 값</div>
        <div>제목: ${escapeHtml(r.title)}</div>
        <div>기간: ${fmtDate(r.period_start)} ~ ${fmtDate(r.period_end)}</div>
        <div>우선순위: ${PRIORITY_LABEL[r.priority] || escapeHtml(r.priority)}</div>
        <div>성공 기준: ${escapeHtml(r.success_criteria)}</div>
        <div>예상 시간: ${r.estimated_minutes}분</div>
      </div>`
        )
        .join('');
  el.hidden = false;
}

async function savePlan(e) {
  e.preventDefault();
  const payload = {
    title: formEl.title.value.trim(),
    period_start: formEl.period_start.value,
    period_end: formEl.period_end.value,
    priority: formEl.priority.value,
    success_criteria: formEl.success_criteria.value.trim(),
    estimated_minutes: Number(formEl.estimated_minutes.value) || 0,
    carried_over_note: carriedNoteEl.value.trim() || null,
  };
  if (!payload.title || !payload.period_start || !payload.period_end || !payload.success_criteria) {
    alert('제목, 기간, 성공 기준은 필수입니다.');
    return;
  }
  if (payload.period_end < payload.period_start) {
    alert('종료일은 시작일보다 빠를 수 없습니다.');
    return;
  }

  try {
    const editingId = editingIdField.value;
    if (editingId) {
      await api.updatePlan(editingId, payload);
    } else {
      await api.createPlan(payload);
    }
  } catch (err) {
    alert('저장 실패: ' + err.message);
    return;
  }
  resetForm();
  await loadPlans();
}

export async function saveRetroNote(planId, note) {
  try {
    await api.updatePlan(planId, { retro_note: note });
  } catch (err) {
    alert('고칠 점 저장 실패: ' + err.message);
    return;
  }
  await loadPlans();
}

export function getPlans() {
  return plans;
}

export function getSelectedPlanId() {
  return selectEl.value || null;
}

export function initPlans() {
  formEl.addEventListener('submit', savePlan);
  document.getElementById('planFormCancel').addEventListener('click', resetForm);
}

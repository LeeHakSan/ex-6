import { api } from './api.js';
import { escapeHtml } from './utils.js';
import { getSelectedPlanId, getPlans, saveRetroNote } from './plans.js';

const summaryEl = document.getElementById('reviewSummary');
const retroForm = document.getElementById('retroForm');
const retroNoteEl = document.getElementById('retroNoteInput');
const planSelectEl = document.getElementById('planSelect');

export async function loadReview() {
  const planId = getSelectedPlanId();
  if (!planId) {
    summaryEl.innerHTML = '<p class="empty">계획을 먼저 선택하세요.</p>';
    return;
  }

  let todos;
  try {
    const res = await api.listTodos(planId);
    todos = res.todos || [];
  } catch (err) {
    console.error(err);
    alert('돌아보기 집계를 불러오지 못했습니다: ' + err.message);
    return;
  }

  const now = new Date();
  const planned = todos.length;
  const completed = todos.filter((t) => t.status === 'completed').length;
  const delayed = todos.filter((t) => t.status !== 'completed' && t.deadline && new Date(t.deadline) < now).length;
  const blockedTodos = todos.filter((t) => (t.execution_logs || []).some((l) => l.blocked_reason));
  const blocked = blockedTodos.length;
  const estimatedTotal = todos.reduce((s, t) => s + (t.estimated_minutes || 0), 0);
  const actualTotal = todos.reduce(
    (s, t) => s + (t.execution_logs || []).reduce((s2, l) => s2 + (l.actual_minutes || 0), 0),
    0
  );
  const diff = actualTotal - estimatedTotal;

  const plan = getPlans().find((p) => p.id === planId);

  summaryEl.innerHTML = `
    <div class="stats">
      <button class="stat" data-kind="all"><span class="num">${planned}</span><span>계획된 할 일</span></button>
      <button class="stat" data-kind="completed"><span class="num">${completed}</span><span>완료</span></button>
      <button class="stat" data-kind="delayed"><span class="num">${delayed}</span><span>지연</span></button>
      <button class="stat" data-kind="blocked"><span class="num">${blocked}</span><span>막힘</span></button>
      <button class="stat" data-kind="all"><span class="num">${estimatedTotal}분</span><span>예상 시간 합</span></button>
      <button class="stat" data-kind="all"><span class="num">${actualTotal}분</span><span>실제 시간 합</span></button>
      <button class="stat" data-kind="all"><span class="num">${diff >= 0 ? '+' : ''}${diff}분</span><span>차이(실제-예상)</span></button>
    </div>
    ${plan?.carried_over_note ? `<div class="note">이전 계획에서 넘어온 메모: ${escapeHtml(plan.carried_over_note)}</div>` : ''}
  `;

  summaryEl.querySelectorAll('.stat').forEach((btn) => {
    btn.addEventListener('click', () => {
      const kind = btn.dataset.kind;
      let detail;
      if (kind === 'completed') detail = { status: 'completed', extra: null };
      else if (kind === 'delayed') detail = { status: 'all', extra: { delayedOnly: true } };
      else if (kind === 'blocked') detail = { status: 'all', extra: { blockedIds: blockedTodos.map((t) => t.id) } };
      else detail = { status: 'all', extra: null };
      document.dispatchEvent(new CustomEvent('app:drilldown', { detail }));
    });
  });

  retroNoteEl.value = plan?.retro_note || '';
}

async function submitRetro(e) {
  e.preventDefault();
  const planId = getSelectedPlanId();
  if (!planId) return;
  await saveRetroNote(planId, retroNoteEl.value.trim());
  await loadReview();
  alert('돌아보기의 고칠 점이 저장되었습니다. 다음에 새 계획을 만들면 이 메모가 자동으로 이어집니다.');
}

export function initReview() {
  retroForm.addEventListener('submit', submitRetro);
  planSelectEl.addEventListener('change', loadReview);
  document.addEventListener('app:tab-shown', (e) => {
    if (e.detail.tab === 'review') loadReview();
  });
}

import { initTabs, showTab } from './tabs.js';
import { initPlans, loadPlans } from './plans.js';
import { initTodos } from './todos.js';
import { initExecutions } from './executions.js';
import { initReview } from './review.js';
import { initExport } from './exportData.js';

async function init() {
  initTabs();
  initPlans();
  initTodos();
  initExecutions();
  initReview();
  initExport();
  showTab('plans');
  // loadPlans()가 planSelect의 change 이벤트를 발생시키면서
  // todos.js/review.js의 최초 로드도 함께 트리거된다.
  await loadPlans();
}

init();

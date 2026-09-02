const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    credentials: 'include',
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    ...options,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const err = new Error(data?.error || `요청 실패 (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  signup: (email, password) => request('/auth/signup', { method: 'POST', body: JSON.stringify({ email, password }) }),
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),

  listPlans: () => request('/data/plans'),
  createPlan: (payload) => request('/data/plans', { method: 'POST', body: JSON.stringify(payload) }),
  updatePlan: (id, patch) => request(`/data/plans?id=${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  listRevisions: (id) => request(`/data/plan-revisions?plan_id=${encodeURIComponent(id)}`),

  listTodos: (planId) => request(`/data/todos?plan_id=${encodeURIComponent(planId)}`),
  createTodo: (payload) => request('/data/todos', { method: 'POST', body: JSON.stringify(payload) }),
  updateTodo: (id, patch) => request(`/data/todos?id=${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) }),

  createExecutionLog: (payload) => request('/data/execution-logs', { method: 'POST', body: JSON.stringify(payload) }),

  exportAll: () => request('/data/export'),
  deleteAccount: () => request('/data/account', { method: 'DELETE' }),
};

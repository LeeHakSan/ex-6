const { getDb } = require('../_lib/db');
const { requireAuth } = require('../_lib/auth');

module.exports = async (req, res) => {
  const auth = await requireAuth(req);
  if (!auth) return res.status(401).json({ error: 'not authenticated' });
  if (req.method !== 'GET') return res.status(404).json({ error: 'not found' });
  const db = getDb();
  const userId = auth.userId;

  try {
    const [plans, plan_revisions, todos, execution_logs] = await Promise.all([
      db.from('plans').select('*').eq('user_id', userId),
      db.from('plan_revisions').select('*').eq('user_id', userId),
      db.from('todos').select('*').eq('user_id', userId),
      db.from('execution_logs').select('*').eq('user_id', userId),
    ]);
    return res.status(200).json({
      exported_at: new Date().toISOString(),
      plans: plans.data || [],
      plan_revisions: plan_revisions.data || [],
      todos: todos.data || [],
      execution_logs: execution_logs.data || [],
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server error' });
  }
};

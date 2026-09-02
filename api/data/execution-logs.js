const { getDb } = require('../_lib/db');
const { requireAuth } = require('../_lib/auth');
const { minutesBetween } = require('../_lib/util');

module.exports = async (req, res) => {
  const auth = await requireAuth(req);
  if (!auth) return res.status(401).json({ error: 'not authenticated' });
  if (req.method !== 'POST') return res.status(404).json({ error: 'not found' });
  const db = getDb();

  try {
    const b = req.body || {};
    if (!b.todo_id || !b.started_at || !b.ended_at) {
      return res.status(400).json({ error: 'todo_id, started_at, ended_at는 필수입니다.' });
    }
    const { data: todo } = await db.from('todos').select('id').eq('id', b.todo_id).eq('user_id', auth.userId).maybeSingle();
    if (!todo) return res.status(404).json({ error: 'not found' });
    const payload = {
      user_id: auth.userId,
      todo_id: b.todo_id,
      started_at: b.started_at,
      ended_at: b.ended_at,
      actual_minutes: minutesBetween(b.started_at, b.ended_at),
      blocked_reason: b.blocked_reason || null,
    };
    const { data, error } = await db.from('execution_logs').insert(payload).select().single();
    if (error) throw error;
    return res.status(201).json({ log: data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server error' });
  }
};

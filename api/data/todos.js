const { getDb } = require('../_lib/db');
const { requireAuth } = require('../_lib/auth');

module.exports = async (req, res) => {
  const auth = await requireAuth(req);
  if (!auth) return res.status(401).json({ error: 'not authenticated' });
  const userId = auth.userId;
  const db = getDb();
  const params = new URL(req.url, 'http://localhost').searchParams;
  const id = params.get('id');
  const planIdQuery = params.get('plan_id');

  try {
    if (!id && req.method === 'GET') {
      if (!planIdQuery) return res.status(400).json({ error: 'plan_id가 필요합니다.' });
      const { data: plan } = await db.from('plans').select('id').eq('id', planIdQuery).eq('user_id', userId).maybeSingle();
      if (!plan) return res.status(404).json({ error: 'not found' });
      const { data, error } = await db
        .from('todos')
        .select('*, execution_logs(*)')
        .eq('plan_id', planIdQuery)
        .eq('user_id', userId)
        .is('deleted_at', null);
      if (error) throw error;
      return res.status(200).json({ todos: data });
    }

    if (!id && req.method === 'POST') {
      const b = req.body || {};
      if (!b.plan_id || !b.title) return res.status(400).json({ error: 'plan_id와 title은 필수입니다.' });
      const { data: plan } = await db.from('plans').select('id').eq('id', b.plan_id).eq('user_id', userId).maybeSingle();
      if (!plan) return res.status(404).json({ error: 'not found' });
      const payload = {
        user_id: userId,
        plan_id: b.plan_id,
        title: b.title,
        description: b.description || null,
        deadline: b.deadline || null,
        priority: b.priority || null,
        tags: Array.isArray(b.tags) ? b.tags : [],
        estimated_minutes: Number(b.estimated_minutes) || 0,
      };
      const { data, error } = await db.from('todos').insert(payload).select().single();
      if (error) throw error;
      return res.status(201).json({ todo: data });
    }

    if (id && req.method === 'PATCH') {
      const b = req.body || {};

      if (b.action === 'complete') {
        const { data } = await db
          .from('todos')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('id', id)
          .eq('user_id', userId)
          .eq('status', 'in_progress')
          .select();
        return res.status(200).json({ todos: data || [] });
      }
      if (b.action === 'revert') {
        const { data } = await db
          .from('todos')
          .update({ status: 'in_progress', completed_at: null })
          .eq('id', id)
          .eq('user_id', userId)
          .eq('status', 'completed')
          .select();
        return res.status(200).json({ todos: data || [] });
      }
      if (b.action === 'delete') {
        const { data } = await db
          .from('todos')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', id)
          .eq('user_id', userId)
          .select();
        if (!data || !data.length) return res.status(404).json({ error: 'not found' });
        return res.status(200).json({ todo: data[0] });
      }

      const patch = { updated_at: new Date().toISOString() };
      ['title', 'description', 'deadline', 'priority', 'tags', 'estimated_minutes'].forEach((k) => {
        if (Object.prototype.hasOwnProperty.call(b, k)) patch[k] = b[k];
      });
      const { data, error } = await db.from('todos').update(patch).eq('id', id).eq('user_id', userId).select();
      if (error) throw error;
      if (!data || !data.length) return res.status(404).json({ error: 'not found' });
      return res.status(200).json({ todo: data[0] });
    }

    return res.status(404).json({ error: 'not found' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server error' });
  }
};

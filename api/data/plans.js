const { getDb } = require('../_lib/db');
const { requireAuth } = require('../_lib/auth');
const { planSnapshot } = require('../_lib/util');

module.exports = async (req, res) => {
  const auth = await requireAuth(req);
  if (!auth) return res.status(401).json({ error: 'not authenticated' });
  const userId = auth.userId;
  const db = getDb();
  const id = new URL(req.url, 'http://localhost').searchParams.get('id');

  try {
    if (!id && req.method === 'GET') {
      const { data, error } = await db.from('plans').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      if (error) throw error;
      return res.status(200).json({ plans: data });
    }

    if (!id && req.method === 'POST') {
      const b = req.body || {};
      if (!b.title || !b.period_start || !b.period_end || !b.success_criteria) {
        return res.status(400).json({ error: '제목, 기간, 성공 기준은 필수입니다.' });
      }
      const payload = {
        user_id: userId,
        title: b.title,
        period_start: b.period_start,
        period_end: b.period_end,
        priority: b.priority || 'medium',
        success_criteria: b.success_criteria,
        estimated_minutes: Number(b.estimated_minutes) || 0,
        carried_over_note: b.carried_over_note || null,
      };
      const { data, error } = await db.from('plans').insert(payload).select().single();
      if (error) throw error;
      return res.status(201).json({ plan: data });
    }

    if (id && req.method === 'PATCH') {
      const { data: current } = await db.from('plans').select('*').eq('id', id).eq('user_id', userId).maybeSingle();
      if (!current) return res.status(404).json({ error: 'not found' });
      const { error: revErr } = await db.from('plan_revisions').insert(planSnapshot(current));
      if (revErr) throw revErr;
      const b = req.body || {};
      const patch = { updated_at: new Date().toISOString() };
      ['title', 'period_start', 'period_end', 'priority', 'success_criteria', 'estimated_minutes', 'carried_over_note', 'retro_note'].forEach((k) => {
        if (Object.prototype.hasOwnProperty.call(b, k)) patch[k] = b[k];
      });
      const { data, error } = await db.from('plans').update(patch).eq('id', id).eq('user_id', userId).select().single();
      if (error) throw error;
      return res.status(200).json({ plan: data });
    }

    return res.status(404).json({ error: 'not found' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server error' });
  }
};

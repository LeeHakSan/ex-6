const { getDb } = require('../_lib/db');
const { requireAuth } = require('../_lib/auth');

module.exports = async (req, res) => {
  const auth = await requireAuth(req);
  if (!auth) return res.status(401).json({ error: 'not authenticated' });
  if (req.method !== 'GET') return res.status(404).json({ error: 'not found' });
  const db = getDb();
  const planId = new URL(req.url, 'http://localhost').searchParams.get('plan_id');
  if (!planId) return res.status(400).json({ error: 'plan_id가 필요합니다.' });

  try {
    const { data: plan } = await db.from('plans').select('id').eq('id', planId).eq('user_id', auth.userId).maybeSingle();
    if (!plan) return res.status(404).json({ error: 'not found' });
    const { data, error } = await db.from('plan_revisions').select('*').eq('plan_id', planId).order('revised_at', { ascending: false });
    if (error) throw error;
    return res.status(200).json({ revisions: data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server error' });
  }
};

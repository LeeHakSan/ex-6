const { getDb } = require('../_lib/db');
const { requireAuth, clearSessionCookie } = require('../_lib/auth');

module.exports = async (req, res) => {
  const auth = await requireAuth(req);
  if (!auth) return res.status(401).json({ error: 'not authenticated' });
  if (req.method !== 'DELETE') return res.status(404).json({ error: 'not found' });
  const db = getDb();

  try {
    const { error } = await db.from('users').delete().eq('id', auth.userId);
    if (error) throw error;
    clearSessionCookie(res);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server error' });
  }
};

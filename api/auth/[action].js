const { getDb } = require('../_lib/db');
const {
  hashPassword,
  verifyPassword,
  signToken,
  setSessionCookie,
  clearSessionCookie,
  getTokenFromReq,
  verifyToken,
  createSession,
  requireAuth,
  revokeSession,
} = require('../_lib/auth');

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

module.exports = async (req, res) => {
  const { action } = req.query;
  const db = getDb();

  try {
    if (action === 'signup' && req.method === 'POST') {
      const email = normalizeEmail(req.body?.email);
      const password = req.body?.password || '';
      if (!email || !email.includes('@') || password.length < 8) {
        return res.status(400).json({ error: '이메일과 8자 이상의 비밀번호를 입력해 주세요.' });
      }
      const { data: existing } = await db.from('users').select('id').eq('email', email).maybeSingle();
      if (existing) {
        return res.status(409).json({ error: '이미 가입된 이메일입니다.' });
      }
      const password_hash = await hashPassword(password);
      const { data: user, error } = await db.from('users').insert({ email, password_hash }).select().single();
      if (error) return res.status(500).json({ error: '가입 처리 중 오류가 발생했습니다.' });
      const session = await createSession(user.id);
      const token = signToken(session.id);
      setSessionCookie(res, token);
      return res.status(201).json({ email: user.email });
    }

    if (action === 'login' && req.method === 'POST') {
      const email = normalizeEmail(req.body?.email);
      const password = req.body?.password || '';
      const reject = () => res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
      if (!email || !password) return reject();
      const { data: user } = await db.from('users').select('*').eq('email', email).maybeSingle();
      const ok = await verifyPassword(password, user?.password_hash);
      if (!user || !ok) return reject();
      const session = await createSession(user.id);
      const token = signToken(session.id);
      setSessionCookie(res, token);
      return res.status(200).json({ email: user.email });
    }

    if (action === 'logout' && req.method === 'POST') {
      const token = getTokenFromReq(req);
      const payload = token && verifyToken(token);
      if (payload?.sid) await revokeSession(payload.sid);
      clearSessionCookie(res);
      return res.status(200).json({ ok: true });
    }

    if (action === 'me' && req.method === 'GET') {
      const auth = await requireAuth(req);
      if (!auth) return res.status(401).json({ error: 'not authenticated' });
      const { data: user } = await db.from('users').select('id,email,created_at').eq('id', auth.userId).maybeSingle();
      return res.status(200).json({ user });
    }

    return res.status(404).json({ error: 'not found' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server error' });
  }
};

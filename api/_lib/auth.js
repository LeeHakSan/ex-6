const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const { getDb } = require('./db');

const COOKIE_NAME = 'session';
const SESSION_DAYS = 7;
// 존재하지 않는 계정으로 로그인 시도해도 응답 시간이 비슷하도록 더미 비교에 쓴다 (T07-C99 보강).
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing-normalization', 12);

async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash || DUMMY_HASH);
}

function signToken(sessionId) {
  return jwt.sign({ sid: sessionId }, process.env.JWT_SECRET, { expiresIn: `${SESSION_DAYS}d` });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

function setSessionCookie(res, token) {
  res.setHeader('Set-Cookie', cookie.serialize(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  }));
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', cookie.serialize(COOKIE_NAME, '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  }));
}

function getTokenFromReq(req) {
  const parsed = cookie.parse(req.headers.cookie || '');
  return parsed[COOKIE_NAME] || null;
}

async function createSession(userId) {
  const db = getDb();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await db.from('sessions').insert({ user_id: userId, expires_at: expiresAt }).select().single();
  if (error) throw error;
  return data;
}

async function requireAuth(req) {
  const token = getTokenFromReq(req);
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload || !payload.sid) return null;
  const db = getDb();
  const { data: session } = await db.from('sessions').select('*').eq('id', payload.sid).maybeSingle();
  if (!session) return null;
  if (session.revoked_at) return null;
  if (new Date(session.expires_at) < new Date()) return null;
  return { userId: session.user_id, sessionId: session.id };
}

async function revokeSession(sessionId) {
  const db = getDb();
  await db.from('sessions').update({ revoked_at: new Date().toISOString() }).eq('id', sessionId);
}

module.exports = {
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  setSessionCookie,
  clearSessionCookie,
  getTokenFromReq,
  createSession,
  requireAuth,
  revokeSession,
  SESSION_DAYS,
};

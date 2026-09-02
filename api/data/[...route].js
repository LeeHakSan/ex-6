const { getDb } = require('../_lib/db');
const { requireAuth, clearSessionCookie } = require('../_lib/auth');

function minutesBetween(startISO, endISO) {
  return Math.round((new Date(endISO) - new Date(startISO)) / 60000);
}

function planSnapshot(p) {
  return {
    plan_id: p.id,
    user_id: p.user_id,
    title: p.title,
    period_start: p.period_start,
    period_end: p.period_end,
    priority: p.priority,
    success_criteria: p.success_criteria,
    estimated_minutes: p.estimated_minutes,
    carried_over_note: p.carried_over_note,
    retro_note: p.retro_note,
  };
}

module.exports = async (req, res) => {
  const auth = await requireAuth(req);
  if (!auth) return res.status(401).json({ error: 'not authenticated' });
  const userId = auth.userId;
  const db = getDb();

  // req.query의 동적 라우트 세그먼트 채움이 이 배포 환경에서 신뢰할 수 없어서
  // req.url을 직접 파싱한다 (경로 세그먼트와 쿼리스트링 둘 다 여기서 구한다).
  const parsedUrl = new URL(req.url, 'http://localhost');
  const pathAfterData = parsedUrl.pathname.replace(/^\/api\/data\/?/, '');
  const route = pathAfterData ? pathAfterData.split('/').filter(Boolean) : [];
  const query = parsedUrl.searchParams;
  const [resource, id, sub] = route;

  try {
    // ---- plans ----
    if (resource === 'plans') {
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
      if (id && sub === 'revisions' && req.method === 'GET') {
        const { data: plan } = await db.from('plans').select('id').eq('id', id).eq('user_id', userId).maybeSingle();
        if (!plan) return res.status(404).json({ error: 'not found' });
        const { data, error } = await db.from('plan_revisions').select('*').eq('plan_id', id).order('revised_at', { ascending: false });
        if (error) throw error;
        return res.status(200).json({ revisions: data });
      }
      if (id && !sub && req.method === 'PATCH') {
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
    }

    // ---- todos ----
    if (resource === 'todos') {
      if (!id && req.method === 'GET') {
        const planId = query.get('plan_id');
        if (!planId) return res.status(400).json({ error: 'plan_id가 필요합니다.' });
        const { data: plan } = await db.from('plans').select('id').eq('id', planId).eq('user_id', userId).maybeSingle();
        if (!plan) return res.status(404).json({ error: 'not found' });
        const { data, error } = await db
          .from('todos')
          .select('*, execution_logs(*)')
          .eq('plan_id', planId)
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
    }

    // ---- execution-logs ----
    if (resource === 'execution-logs') {
      if (!id && req.method === 'POST') {
        const b = req.body || {};
        if (!b.todo_id || !b.started_at || !b.ended_at) {
          return res.status(400).json({ error: 'todo_id, started_at, ended_at는 필수입니다.' });
        }
        const { data: todo } = await db.from('todos').select('id').eq('id', b.todo_id).eq('user_id', userId).maybeSingle();
        if (!todo) return res.status(404).json({ error: 'not found' });
        const payload = {
          user_id: userId,
          todo_id: b.todo_id,
          started_at: b.started_at,
          ended_at: b.ended_at,
          actual_minutes: minutesBetween(b.started_at, b.ended_at),
          blocked_reason: b.blocked_reason || null,
        };
        const { data, error } = await db.from('execution_logs').insert(payload).select().single();
        if (error) throw error;
        return res.status(201).json({ log: data });
      }
    }

    // ---- export ----
    if (resource === 'export' && req.method === 'GET') {
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
    }

    // ---- account ----
    if (resource === 'account' && req.method === 'DELETE') {
      const { error } = await db.from('users').delete().eq('id', userId);
      if (error) throw error;
      clearSessionCookie(res);
      return res.status(200).json({ ok: true });
    }

    return res.status(404).json({ error: 'not found' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server error' });
  }
};

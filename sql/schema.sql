-- T06 계획·실행·회고 관리 앱 — Supabase(Postgres) 스키마
-- Supabase 대시보드의 SQL Editor에 전체를 붙여넣고 실행하세요.

create extension if not exists pgcrypto;

create table if not exists plans (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  period_start date not null,
  period_end date not null,
  priority text not null check (priority in ('low','medium','high')),
  success_criteria text not null,
  estimated_minutes integer not null default 0,
  carried_over_note text,
  retro_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 계획을 수정하기 직전의 값을 스냅샷으로 남긴다 (plans.id는 그대로 유지)
create table if not exists plan_revisions (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references plans(id) on delete cascade,
  title text,
  period_start date,
  period_end date,
  priority text,
  success_criteria text,
  estimated_minutes integer,
  carried_over_note text,
  retro_note text,
  revised_at timestamptz not null default now()
);

create table if not exists todos (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references plans(id) on delete cascade,
  title text not null,
  description text,
  deadline timestamptz,
  priority text check (priority in ('low','medium','high')),
  tags text[] not null default '{}',
  estimated_minutes integer not null default 0,
  status text not null default 'in_progress' check (status in ('in_progress','completed')),
  completed_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists execution_logs (
  id uuid primary key default gen_random_uuid(),
  todo_id uuid not null references todos(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  actual_minutes integer not null,
  blocked_reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_todos_plan_id on todos(plan_id);
create index if not exists idx_execution_logs_todo_id on execution_logs(todo_id);
create index if not exists idx_plan_revisions_plan_id on plan_revisions(plan_id);

alter table plans enable row level security;
alter table plan_revisions enable row level security;
alter table todos enable row level security;
alter table execution_logs enable row level security;

-- 이 앱은 로그인이 없는 공개 앱이므로 anon 역할에 전체 CRUD를 허용한다.
-- (anon key는 공개용으로 설계된 키이며, service_role key는 절대 프론트에 노출하지 않는다.)
create policy "anon_all_plans" on plans for all to anon using (true) with check (true);
create policy "anon_all_plan_revisions" on plan_revisions for all to anon using (true) with check (true);
create policy "anon_all_todos" on todos for all to anon using (true) with check (true);
create policy "anon_all_execution_logs" on execution_logs for all to anon using (true) with check (true);

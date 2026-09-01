-- T07: 인증(가입/로그인/로그아웃) 추가 마이그레이션
-- Supabase SQL Editor에서 전체 실행. sql/schema.sql이 이미 적용된 상태를 전제.

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);
create index if not exists idx_sessions_user_id on sessions(user_id);

alter table plans add column if not exists user_id uuid references users(id) on delete cascade;
alter table todos add column if not exists user_id uuid references users(id) on delete cascade;
alter table execution_logs add column if not exists user_id uuid references users(id) on delete cascade;
alter table plan_revisions add column if not exists user_id uuid references users(id) on delete cascade;

create index if not exists idx_plans_user_id on plans(user_id);
create index if not exists idx_todos_user_id on todos(user_id);
create index if not exists idx_execution_logs_user_id on execution_logs(user_id);
create index if not exists idx_plan_revisions_user_id on plan_revisions(user_id);

-- T06 시절 열려 있던 익명 전체 허용 정책을 전부 제거한다.
-- (RLS는 계속 켜둔 채 정책을 없애서 "잠금" 상태로 만든다. service_role만 RLS를 우회해 통과한다.)
drop policy if exists "anon_all_plans" on plans;
drop policy if exists "anon_all_plan_revisions" on plan_revisions;
drop policy if exists "anon_all_todos" on todos;
drop policy if exists "anon_all_execution_logs" on execution_logs;

alter table users enable row level security;
alter table sessions enable row level security;
-- users/sessions/plans/todos/execution_logs/plan_revisions 모두 RLS 활성화 + 정책 없음
-- = anon·authenticated 역할은 아무것도 못 하고, service_role(서버 전용 키)만 접근 가능.

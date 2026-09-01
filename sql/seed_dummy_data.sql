-- 테스트용 더미 데이터. Supabase SQL Editor에서 실행.
-- 주의: T06 통과 기준(C78~C81)은 "실제 내 계획/할 일/기록"을 요구합니다.
-- 앱 동작 확인이 끝나면 이 더미는 지우고(맨 아래 delete 참고) 진짜 데이터로 채우세요.

with new_plan as (
  insert into plans (title, period_start, period_end, priority, success_criteria, estimated_minutes)
  values ('더미: 9월 알고리즘 스터디', '2026-09-01'::date, '2026-09-30'::date, 'high', '매주 3문제 풀고 회고 남기기', 1200)
  returning id
)
insert into todos (plan_id, title, description, deadline, priority, tags, estimated_minutes, status, completed_at)
select id, '배열 정렬 문제 풀기', '기본 정렬 알고리즘 복습', '2026-08-28T21:00:00+09:00'::timestamptz, 'high', array['알고리즘','복습'], 60, 'completed', '2026-08-28T22:10:00+09:00'::timestamptz
from new_plan
union all
select id, '그래프 탐색(BFS/DFS) 구현', 'BFS/DFS 손코딩', '2026-08-30T21:00:00+09:00'::timestamptz, 'medium', array['알고리즘'], 90, 'completed', '2026-08-30T23:00:00+09:00'::timestamptz
from new_plan
union all
select id, '동적 계획법 문제 3개', 'DP 기초 문제', '2026-08-29T21:00:00+09:00'::timestamptz, 'high', array['알고리즘','DP'], 90, 'in_progress', null::timestamptz
from new_plan
union all
select id, '스터디 노트 정리', '지금까지 푼 문제 요약', '2026-09-10T21:00:00+09:00'::timestamptz, 'low', array['정리'], 40, 'in_progress', null::timestamptz
from new_plan
union all
select id, '모의 테스트 1회', '실전처럼 시간 재고 풀기', '2026-09-20T21:00:00+09:00'::timestamptz, 'medium', array['테스트'], 120, 'in_progress', null::timestamptz
from new_plan;

-- 실행 기록 3건 이상 (완료 2건 + 막힘 1건)
with t1 as (select id from todos where title = '배열 정렬 문제 풀기' order by created_at desc limit 1)
insert into execution_logs (todo_id, started_at, ended_at, actual_minutes, blocked_reason)
select id, '2026-08-28T21:00:00+09:00'::timestamptz, '2026-08-28T22:05:00+09:00'::timestamptz, 65, null from t1;

with t2 as (select id from todos where title = '그래프 탐색(BFS/DFS) 구현' order by created_at desc limit 1)
insert into execution_logs (todo_id, started_at, ended_at, actual_minutes, blocked_reason)
select id, '2026-08-30T21:00:00+09:00'::timestamptz, '2026-08-30T22:50:00+09:00'::timestamptz, 110, null from t2;

with t3 as (select id from todos where title = '동적 계획법 문제 3개' order by created_at desc limit 1)
insert into execution_logs (todo_id, started_at, ended_at, actual_minutes, blocked_reason)
select id, '2026-08-29T21:00:00+09:00'::timestamptz, '2026-08-29T21:40:00+09:00'::timestamptz, 40, '점화식이 안 풀려서 중단함' from t3;

-- 확인 후 지우고 싶을 때 (plans를 지우면 연결된 todos/execution_logs도 cascade로 함께 삭제됨)
-- delete from plans where title = '더미: 9월 알고리즘 스터디';

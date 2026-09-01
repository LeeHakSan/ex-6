-- 추가 더미 계획 2개 (계획 전환/다음 계획 이월 테스트용).
-- seed_dummy_data.sql을 이미 실행했다는 전제. 이 파일은 새 계획만 추가하므로 몇 번 실행해도
-- 실행할 때마다 계획이 계속 늘어나니 한 번만 실행할 것.

with plan2 as (
  insert into plans (title, period_start, period_end, priority, success_criteria, estimated_minutes, retro_note)
  values ('더미: 헬스 루틴 8주', '2026-07-01'::date, '2026-08-25'::date, 'medium', '주 3회 이상 운동 기록 남기기', 960,
          '다음엔 유산소 시간을 너무 몰아서 잡지 말고 요일별로 분산할 것')
  returning id
)
insert into todos (plan_id, title, description, deadline, priority, tags, estimated_minutes, status, completed_at)
select id, '하체 루틴', '스쿼트/런지 위주', '2026-07-05T20:00:00+09:00'::timestamptz, 'medium', array['운동','하체'], 60, 'completed', '2026-07-05T21:10:00+09:00'::timestamptz
from plan2
union all
select id, '상체 루틴', '벤치프레스/랫풀다운', '2026-07-08T20:00:00+09:00'::timestamptz, 'medium', array['운동','상체'], 60, 'completed', '2026-07-08T21:05:00+09:00'::timestamptz
from plan2
union all
select id, '유산소 30분', '러닝 또는 사이클', '2026-08-01T20:00:00+09:00'::timestamptz, 'low', array['운동','유산소'], 30, 'in_progress', null::timestamptz
from plan2
union all
select id, '식단 기록 정리', '8주간 식단 사진 정리', '2026-08-20T20:00:00+09:00'::timestamptz, 'low', array['기록'], 20, 'in_progress', null::timestamptz
from plan2;

with p2t1 as (select id from todos where title = '하체 루틴' order by created_at desc limit 1)
insert into execution_logs (todo_id, started_at, ended_at, actual_minutes, blocked_reason)
select id, '2026-07-05T20:00:00+09:00'::timestamptz, '2026-07-05T21:05:00+09:00'::timestamptz, 65, null from p2t1;

with p2t2 as (select id from todos where title = '상체 루틴' order by created_at desc limit 1)
insert into execution_logs (todo_id, started_at, ended_at, actual_minutes, blocked_reason)
select id, '2026-07-08T20:00:00+09:00'::timestamptz, '2026-07-08T20:50:00+09:00'::timestamptz, 50, null from p2t2;

with plan3 as (
  insert into plans (title, period_start, period_end, priority, success_criteria, estimated_minutes, carried_over_note)
  values ('더미: 토익 900 넘기기', '2026-09-01'::date, '2026-10-31'::date, 'high', '실전 모의고사 900점 이상 2회 연속', 2400,
          '다음엔 유산소 시간을 너무 몰아서 잡지 말고 요일별로 분산할 것')
  returning id
)
insert into todos (plan_id, title, description, deadline, priority, tags, estimated_minutes, status, completed_at)
select id, 'RC 파트5 문법 정리', '빈출 문법 포인트 노트 정리', '2026-09-07T22:00:00+09:00'::timestamptz, 'high', array['토익','문법'], 90, 'completed', '2026-09-07T23:20:00+09:00'::timestamptz
from plan3
union all
select id, 'LC 파트3,4 받아쓰기', '매일 10문제 받아쓰기', '2026-08-25T22:00:00+09:00'::timestamptz, 'high', array['토익','듣기'], 60, 'in_progress', null::timestamptz
from plan3
union all
select id, '단어 800개 암기', '토익 빈출 단어장 1회독', '2026-09-30T22:00:00+09:00'::timestamptz, 'medium', array['토익','단어'], 300, 'in_progress', null::timestamptz
from plan3;

with p3t1 as (select id from todos where title = 'RC 파트5 문법 정리' order by created_at desc limit 1)
insert into execution_logs (todo_id, started_at, ended_at, actual_minutes, blocked_reason)
select id, '2026-09-07T22:00:00+09:00'::timestamptz, '2026-09-07T23:15:00+09:00'::timestamptz, 75, null from p3t1;

with p3t2 as (select id from todos where title = 'LC 파트3,4 받아쓰기' order by created_at desc limit 1)
insert into execution_logs (todo_id, started_at, ended_at, actual_minutes, blocked_reason)
select id, '2026-08-25T22:00:00+09:00'::timestamptz, '2026-08-25T22:20:00+09:00'::timestamptz, 20, '집중이 안 돼서 중단함' from p3t2;

-- 지우고 싶을 때
-- delete from plans where title in ('더미: 헬스 루틴 8주', '더미: 토익 900 넘기기');

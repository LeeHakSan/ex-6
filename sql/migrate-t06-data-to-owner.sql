-- T06 시절 소유자 없이(user_id IS NULL) 만들어진 실데이터를 실제 계정으로 이관.
-- Supabase SQL Editor에서 실행. 대상 이메일만 바꿔서 재사용 가능.

update plans set user_id = (select id from users where email = 'test1@test.com') where user_id is null;
update todos set user_id = (select id from users where email = 'test1@test.com') where user_id is null;
update execution_logs set user_id = (select id from users where email = 'test1@test.com') where user_id is null;
update plan_revisions set user_id = (select id from users where email = 'test1@test.com') where user_id is null;

-- 확인: 이관된 계획 목록
select id, title, user_id from plans where user_id = (select id from users where email = 'test1@test.com');

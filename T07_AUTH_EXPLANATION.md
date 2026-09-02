# T07 인증 구현 설명서

- 결과물: https://ex-6-seven.vercel.app/ (첫 화면은 로그인 화면, 로그인 없이도 이 화면까지는 열림)
- 소스: https://github.com/LeeHakSan/ex-6 (T06 최종 지점은 `t06-final` 태그로 고정)
- 원본 요청/응답 전체 기록: `docs/t07_evidence_raw.json`

---

## ① 무엇으로 붙였나

**직접 구현**. 비밀번호 해시는 `bcryptjs@2.4.3`, 세션 토큰(JWT) 서명·검증은 `jsonwebtoken@9.0.2`, 쿠키 직렬화는 `cookie@0.6.0`을 각각 라이브러리로 사용했다(모두 `package.json`에 버전 고정). 가입/로그인/로그아웃 로직, 세션 만료·무효화 로직, 계정 간 소유권 검사 로직은 직접 작성했다.

## ② 왜 그걸 골랐나

T06이 이미 Supabase를 쓰고 있어서 **Supabase Auth(GoTrue)** 를 붙이는 것도 함께 검토했다. Supabase Auth를 쓰면 붙이는 작업 자체는 더 짧았을 것이다. 하지만 이 과제의 목적이 "인증을 어떻게 붙였는지 설명하기"이고, Supabase Auth를 쓰면 가입→해시→세션 발급→만료→소유권 검사로 이어지는 과정이 라이브러리 내부에 완전히 숨어서 "어떻게 붙였는지"를 직접 보여줄 수 없다고 판단했다. 그래서 각 단계를 직접 구현하는 쪽을 선택했다.

## ③ 어디를 어떻게 고쳤나

T06(정적 프론트 + Supabase anon key 직접 호출) 구조에 Vercel 서버리스 함수(`/api`)를 새로 추가하고, 프론트가 Supabase에 직접 붙던 것을 전부 `/api` 호출로 바꿨다.

| 흐름 | 소스 위치 |
|---|---|
| 가입 | `api/auth/[action].js` (`action=signup`) → `api/_lib/auth.js`의 `hashPassword` |
| 로그인 | `api/auth/[action].js` (`action=login`) → `verifyPassword`, `createSession`, `signToken`, `setSessionCookie` |
| 로그아웃 | `api/auth/[action].js` (`action=logout`) → `revokeSession`, `clearSessionCookie` |
| 자료 조회(계획/할 일/실행기록/내보내기/계정삭제) | `api/data/plans.js`, `api/data/todos.js`, `api/data/plan-revisions.js`, `api/data/execution-logs.js`, `api/data/export.js`, `api/data/account.js` — 전부 `api/_lib/auth.js`의 `requireAuth(req)`로 세션 확인 후 `user_id = 로그인한 사용자`로 필터/검사 |

DB 변경: `sql/schema-v3-auth.sql`에서 `users`/`sessions` 테이블 신설, `plans`/`todos`/`execution_logs`/`plan_revisions`에 `user_id` 컬럼 추가, T06 시절의 익명 전체 허용 RLS 정책을 전부 삭제(잠금). 이후 `/api`만 `SUPABASE_SERVICE_ROLE_KEY`로 RLS를 우회해 접근하고, 소유권 판단은 RLS가 아니라 각 API 핸들러 코드에서 직접 한다.

**막혔던 지점 하나**: 처음엔 `api/data/[...route].js` 하나로 `/api/data/plans/:id`처럼 경로에 id를 실어 REST 스타일로 짰는데, 배포 후 실제로 두 단계 이상인 경로(`/api/data/plans/:id`, `/api/data/plans/:id/revisions`)가 우리 함수에 전혀 도달하지 못하고 Vercel 자체 404(`X-Vercel-Error: NOT_FOUND`)로 가로채지는 것을 발견했다(계획 수정 기능이 실제로 동작하지 않고 있었다). 원인은 이 배포 환경에서 동적 catch-all 라우트가 2단계 이상 경로를 안정적으로 매칭하지 못하는 것으로 확인되어, id를 경로가 아니라 쿼리스트링(`?id=`)으로 넘기는 방식으로 API를 재구성해 해결했다.

## ④ 안 열리는 것을 확인한 기록 (다섯 가지)

전체 원본은 `docs/t07_evidence_raw.json` 참고. 대표 요청/응답만 발췌.

### 1) 비밀번호가 원문으로 저장되지 않음 (카드2)
- 방법: bcrypt(`bcryptjs`), cost factor 12
- 로그인 요청/응답 어디에도 비밀번호 원문 없음:
```
POST /api/auth/login  { "email": "...", "password": "(가려짐, 요청 바디는 HTTPS로 암호화되어 전송됨)" }
200  { "email": "alice-...@example.com" }   ← 응답에도 비밀번호 없음
```
- (Supabase Table Editor의 `users.password_hash` 컬럼 스크린샷은 사용자가 직접 추가 예정 — 서비스 키가 없으면 AI가 직접 조회할 수 없음)

### 2) 세션 만료·로그아웃 후 재요청 거절 (카드3)
사람을 알아보는 값: **토큰(JWT)**. 쿠키 이름 `session`, `httpOnly; Secure; SameSite=Lax`, 만료 7일. 로그아웃 시 서버 `sessions` 테이블의 `revoked_at`을 찍어 즉시 무효화(순수 stateless JWT라면 여기서 막히지 않음 — 그래서 세션 레코드를 별도로 둠).
```
로그아웃 전  GET /api/data/plans  (세션 쿠키 O)  → 200
POST /api/auth/logout                          → 200 { "ok": true }
로그아웃 후  GET /api/data/plans  (같은 쿠키 값 재사용) → 401 { "error": "not authenticated" }
```
같은 주소(`/api/data/plans`)·같은 방식(GET)·같은 쿠키 값인데 로그아웃 여부만 다르다.

### 3) 로그인 없이 자료에 접근 불가 (카드1)
```
GET /api/data/plans  (쿠키 없음)  → 401 { "error": "not authenticated" }
```
브라우저에서도 로그인하지 않은 채 결과물 주소를 열면 로그인 화면만 보이고 자료 화면은 렌더링되지 않는다(`js/main.js`의 `checkSession()`이 `/api/auth/me` 실패 시 `showAuthScreen()`만 호출).

로그인 실패 메시지도 계정 존재 여부와 무관하게 동일:
```
존재하는 계정 + 틀린 비번  → 401 { "error": "이메일 또는 비밀번호가 올바르지 않습니다." }
존재하지 않는 계정         → 401 { "error": "이메일 또는 비밀번호가 올바르지 않습니다." }
```

### 4) 계정 간 읽기·수정·삭제 양방향 차단 (카드4)
Alice·Bob 두 계정을 만들어 각자 계획/할 일을 하나씩 넣고 서로의 자료를 공격:
```
Bob → Alice 계획 수정   PATCH /api/data/plans?id=<Alice의 id>       (Bob 세션) → 404 { "error": "not found" }
Bob → Alice 수정이력 조회 GET  /api/data/plan-revisions?plan_id=<Alice의 id> (Bob 세션) → 404
Bob → Alice 할일목록 조회 GET  /api/data/todos?plan_id=<Alice의 id>          (Bob 세션) → 404
Bob → Alice 할일 삭제    PATCH /api/data/todos?id=<Alice 할일 id>&action=delete (Bob 세션) → 404
```
반대 방향(Alice → Bob)도 전부 동일하게 404. 공격 시도 전후로 상대방 자료 건수·내용은 그대로였다(`stillOriginalTitle: true`, `bobTodoStillExists/aliceTodoStillExists: true`). 거절을 만드는 소스: `api/data/plans.js`·`api/data/todos.js`·`api/data/plan-revisions.js`의 매 쿼리에 붙는 `.eq('user_id', userId)` (요청자의 세션에서 얻은 id로만 필터링, 요청 바디·쿼리에 실린 다른 사용자 id는 절대 신뢰하지 않음).

### 5) 목록에 남의 자료 미포함 + 아이디 스푸핑 방어 (카드4)
```
Alice 목록에 Bob 계획 포함? → false
Bob 목록에 Alice 계획 포함? → false
```
요청 본문에 다른 사용자 id를 끼워 넣어도 무시되고 실제 세션 주인 것으로 생성됨:
```
POST /api/data/todos  { ..., "user_id": "bob-id-를-사칭" }  (Alice 세션)
→ 201, 실제 생성된 todo.user_id == Alice의 진짜 id (끼워 넣은 값 무시됨)
```

## ⑤ AI와 나

- **AI에게 맡긴 일**: 인증 아키텍처 설계 초안, 백엔드(`/api`) 전체 코드 작성, DB 마이그레이션 SQL 작성, 배포 후 자동화된 증거 수집(가입/로그인/로그아웃/세션 만료/계정 간 차단 테스트) 및 이 설명서 초안 작성.
- **내가 직접 판단한 일**: 인증 방식(직접 구현 vs Supabase Auth)을 직접 구현으로 최종 결정, 실제 계정(`test1@test.com`) 지정 및 T06 데이터 이관 대상 결정, UI/UX 문제(로그인·회원가입 폼 동시 노출, 드롭다운 스타일, 회원가입 후 처리 방식) 직접 발견하고 수정 방향 지시.
- **AI 제안을 따르지 않은 일**: AI가 처음 추천한 Supabase Auth 대신 직접 구현(bcrypt+JWT)을 선택. 또한 AI가 회원가입 성공 시 자동 로그인시키도록 짰던 것을, 성공 문구를 먼저 보여주고 로그인 화면으로 돌아가게 바꾸도록 지시함.

## ⑥ 아직 못 막은 것

- **무차별 대입(brute force) 공격 방어 없음**: 로그인 실패 횟수를 세거나 잠그는 로직이 없다. 같은 이메일로 비밀번호를 계속 시도해도 막히지 않는다 — 공격자가 흔한 비밀번호 목록으로 계정을 뚫을 위험이 있다.
- **비밀번호 재설정 기능 없음**: 비밀번호를 잊으면 복구할 방법이 없다(계정 삭제 후 재가입만 가능). 실제 서비스라면 이메일 인증 기반 재설정이 필요하다.
- **가입 시 이메일 소유 확인(이메일 인증) 없음**: 아무 이메일 주소로나 가입이 가능해 존재하지 않는/타인의 이메일로 계정을 만들 수 있다.
- **로그인 시도 로그(감사 로그) 없음**: 누가 언제 로그인/실패했는지 서버에 별도로 기록하지 않아, 이상 접근을 사후에 추적하기 어렵다.

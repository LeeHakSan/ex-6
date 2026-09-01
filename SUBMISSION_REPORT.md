# T06 제출 보고서 — 계획·실행·돌아보기

- 작성일: 2026-09-01
- 배포 URL: https://ex-6-seven.vercel.app/
- 소스 저장소: https://github.com/LeeHakSan/ex-6
- 실데이터: 계획 "오늘 배운 파이썬 코드 복습하기" (2026-09-01 ~ 2026-09-02) 1건, 딸린 할 일 5건, 실행 기록 3건

---

## 카드 1 — 계획 세우기

- 지금 실제로 하고 있는 일("오늘 배운 파이썬 코드 복습하기")을 계획으로 등록
- 제목·기간·우선순위·성공 기준·예상 시간 5개 항목 모두 저장 확인

![계획 생성](docs/screenshots/01_plan_created.png)

- 계획을 1회 수정(예상 시간 30분 → 40분)한 뒤 "수정 이력 보기" 클릭
- 수정 전 값(30분)이 이력에 그대로 남아 있음을 확인 → 계획 ID는 유지, 내용만 버전으로 쌓이는 구조

![계획 수정 이력](docs/screenshots/02_plan_revision_history.png)

---

## 카드 2 — 할 일 다루기

- 계획에 실제 할 일 5건 등록(파이썬 복습 세부 항목), 각 항목에 마감일·우선순위·태그·예상 시간 저장

![할 일 생성](docs/screenshots/03_todos_created.png)

- 할 일 수정 동작 확인 (설명 항목 추가)

![할 일 수정](docs/screenshots/04_todo_edited.png)

- 완료 처리 동작 확인

![할 일 완료](docs/screenshots/05_todo_completed.png)

- 완료 → 되돌리기(진행중 복귀) 동작 확인

![할 일 되돌리기](docs/screenshots/06_todo_reverted.png)

- 여분으로 만든 항목 삭제 동작 확인

![할 일 삭제](docs/screenshots/07_todo_deleted.png)

- 검색: "예외처리" 입력 시 해당 항목만 좁혀짐

![검색](docs/screenshots/10_search.png)

- 필터: 상태를 "완료"로 지정 시 완료 항목만 노출

![필터](docs/screenshots/11_filter.png)

- 정렬: "우선순위 높은 순"으로 변경, 화면 상단 정렬 기준 문구와 실제 순서 일치

![정렬](docs/screenshots/12_sort.png)

---

## 카드 3 — 실제로 한 일 적기

- 완료 버튼 동시 클릭(더블클릭보다 엄격한 조건)으로 멱등성 테스트 진행
- 완료 배지 1개만 남고 중복 처리 없음을 확인

![완료 연타 테스트](docs/screenshots/08_complete_double_click.png)

- 돌아보기 완료 수: 테스트 전 0건 → 테스트 후 정확히 1건 (중복 집계 없음, 콘솔 로그로도 재확인)

![완료 수 확인](docs/screenshots/09_review_count_after_double_click.png)

- 할 일에 실행 기록(시작/끝 시각, 실제 소요 시간) 연속 등록, 계획의 예상 시간 값은 그대로 유지됨을 별도 확인

![실행 기록](docs/screenshots/13_execution_logs.png)

- 실행 기록에 "막혔던 이유" 입력 케이스도 함께 등록

![막힌 실행 기록](docs/screenshots/13b_execution_log_blocked.png)

---

## 카드 4 — 돌아보기, 그리고 다음 계획으로

- 돌아보기 집계: 계획된 할 일 5 / 완료 1 / 지연 1 / 막힘 1 / 예상 시간 합 110분 / 실제 시간 합 75분 / 차이 -35분
- 각 숫자는 수기 검산으로 정확성 확인

![돌아보기 집계](docs/screenshots/14_review_summary.png)

- "막힘" 숫자 클릭 → 막힌 이유가 있는 할 일만 필터링되어 이동

![막힘 드릴다운](docs/screenshots/15_drilldown_blocked.png)

- "지연" 숫자 클릭 → 지연된 할 일만 필터링되어 이동

![지연 드릴다운](docs/screenshots/15b_drilldown_delayed.png)

- "완료" 숫자 클릭 → 완료된 할 일만 필터링되어 이동

![완료 드릴다운](docs/screenshots/15c_drilldown_completed.png)

- 돌아보기에서 "고칠 점" 작성·저장 후, 새 계획 만들기 폼의 "이전 계획에서 넘어온 메모"에 자동으로 채워짐을 확인 (SQL이 아닌 실제 UI 흐름으로 검증)

![다음 계획 이월](docs/screenshots/16_carried_over_note.png)

---

## 카드 5 — 내 것으로 채우고, 잃지 않게

- 할 일 제목에 `<script>alert('xss')</script>` 입력 후 저장 → 알림창 발생 없이 글자 그대로 렌더링됨 (브라우저 dialog 이벤트 리스너로 자동 검증, 실행 안 됨을 코드로도 확인)

![스크립트 방어](docs/screenshots/17_xss_defense.png)

- 헤더의 "내 데이터 내보내기" 클릭 → JSON 파일 1개 다운로드 (plans 1건, todos 8건[소프트 삭제 이력 포함], execution_logs 3건, plan_revisions 2건)
- 새로고침 전/후 돌아보기 집계 값을 문자열째로 비교 → 완전히 동일함을 확인

![새로고침 후 값 유지](docs/screenshots/20_after_refresh.png)

- 쿠키/스토리지가 없는 새 브라우저 컨텍스트(시크릿 창과 동일 조건)로 배포 URL 접속
- 로그인 화면(비밀번호 입력창) 없이 바로 진입, 상단에 공개 안내 배너 노출 확인

![시크릿 창 접근](docs/screenshots/21_incognito_public.png)

- 네트워크 요청 헤더 자동 검사: `apikey` 값이 `js/supabaseClient.js`에 넣은 anon key와 일치, `service_role` 문자열은 요청 헤더·페이지 소스 어디에도 없음을 확인

---

## 결론

- 카드 1~5의 통과 기준(T06-C01~C83) 전 항목을 실제 배포 사이트 + 실제 데이터 기준으로 검증 완료
- 상세 체크리스트: `REQUIREMENTS_CHECKLIST.md`
- 확인 방법·AI 활용 내역: `README.md`

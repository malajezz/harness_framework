# Step 5: ui

## 읽어야 할 파일

먼저 아래 파일들을 읽고 설계 의도를 파악하라:

- `/Users/jekismac/Projects/harness_framework/docs/UI_GUIDE.md` (색상/컴포넌트/안티패턴 — 반드시 준수)
- `/Users/jekismac/Projects/harness_framework/docs/PRD.md` (화면이 보여줄 것)
- `/Users/jekismac/Projects/harness_framework/docs/ARCHITECTURE.md` (Client는 /api/analyze만 호출)
- `src/types/index.ts` (step1 — `AnalyzeResponse` 등)
- `src/app/api/analyze/route.ts` (step4 — 응답 형태)
- `src/app/page.tsx`, `src/app/globals.css` (step0 플레이스홀더)

## 작업

결과 화면을 완성한다. 단일 페이지에서 입력 → 로딩 → 결과/에러를 상태로 전환한다.

### 1. `src/app/page.tsx` (Client Component, `"use client"`)
- 상태는 `useState`로 **4개만**: `input`, `loading`, `result(AnalyzeResponse|null)`, `error(string|null)`.
- 입력 폼: 텍스트 인풋(`@handle 또는 채널 URL`) + [분석] 버튼. 제출 시 `POST /api/analyze`.
- 로딩 중: 버튼 비활성화 + "분석 중…" 표시(단계 텍스트는 단순 텍스트로 충분, 실제 진행률 추적 X).
- 성공: 아래 3개 컴포넌트 렌더. 실패: 에러 박스에 `error` 표시.
- `/api/analyze` 외 다른 외부 URL을 호출하지 마라.

### 2. `src/components/` (표시 전용, props만 받아 렌더)
- `ChannelSummary.tsx` — `channel` + `analysis`: 썸네일·채널명·핸들·구독/영상수, 진단 요약 문장, 주제 태그(`topics`).
- `ViralList.tsx` — `viralVideos: ViralVideo[]`: 썸네일·제목·채널·조회수·**일평균 조회수**·업로드 경과, viral 점수. 각 항목은 해당 YouTube 영상으로 링크(새 탭).
- `RecommendationCard.tsx` — `recommendations: Recommendation[]`: 제목 + 근거(rationale) + 참고 영상(inspiredBy, 있으면). 카드 그리드.

### 3. 디자인 (UI_GUIDE.md 엄수)
- 다크 고정: 페이지 `#0a0a0a`, 카드 `#141414` + `border-neutral-800`. 포인트색 red-500은 viral 강조에만.
- 좌측 정렬, `max-w-4xl`, 섹션 간 `space-y-8`.
- 큰 수치는 `tabular-nums`. 결과 표시에만 `fade-in` 사용.
- **안티패턴 금지**: glass blur, gradient-text, 보라/인디고, gradient orb, "Powered by AI" 배지, 모든 카드 동일 rounded-2xl.

## Acceptance Criteria

```bash
npm run build   # 컴파일 에러 없음
npm run lint    # 린트 에러 없음
```
(키가 있으면 수동 스모크: `npm run dev` 후 `@handle` 입력 → 세 섹션 표시 확인)

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 체크리스트:
   - `page.tsx`가 `/api/analyze`만 호출하는가? (외부 API 직접 호출 없음)
   - 세 섹션(진단/뜨는 영상/추천)이 `AnalyzeResponse` 필드와 매핑되는가?
   - UI_GUIDE 색상·레이아웃을 따르고 안티패턴이 없는가?
   - 컴포넌트가 로직 없이 props만 받아 렌더하는가?
3. `phases/0-mvp/index.json`의 step 5 업데이트:
   - 성공 → `"status": "completed"`, `"summary": "page.tsx + ChannelSummary/ViralList/RecommendationCard, /api/analyze 연동"`
   - 실패 → `"status": "error"`, `"error_message": "..."`
   - 키 미설정으로 수동 확인이 막히면 빌드/린트 통과로 완료 처리하고 summary에 "수동 스모크는 키 설정 후 필요" 명시.

## 금지사항

- 컴포넌트 안에서 fetch/외부 API를 호출하지 마라. 이유: 데이터는 page가 받아 props로 내린다.
- UI_GUIDE의 안티패턴(glass/gradient-text/보라색/orb 등)을 쓰지 마라. 이유: AI 슬롭. 도구 느낌을 깬다.
- 상태관리/데이터 페칭 라이브러리를 추가하지 마라. 이유: 과설계. `useState` + `fetch`로 충분.
- `AnalyzeResponse` 타입을 바꾸지 마라. 이유: step4 route와 계약이 깨진다.

# Step 4: api-route

## 읽어야 할 파일

먼저 아래 파일들을 읽고 설계 의도를 파악하라:

- `/Users/jekismac/Projects/harness_framework/docs/ARCHITECTURE.md` (데이터 흐름, 에러 처리, 과설계 금지)
- `/Users/jekismac/Projects/harness_framework/CLAUDE.md` (외부 API는 라우트 핸들러에서만)
- `src/types/index.ts` (step1 — `AnalyzeRequest`, `AnalyzeResponse`, `ViralVideo`)
- `src/services/youtube.ts` (step2 — `resolveChannel`, `getRecentVideos`, `searchViralVideos`)
- `src/lib/viral-score.ts` (step2 — `viewsPerDay`, `daysSince`)
- `src/services/claude.ts` (step3 — `analyzeChannel`, `recommendContent`)

## 작업

`src/app/api/analyze/route.ts` 하나만 만든다. POST 핸들러로 전체 파이프라인을 **순차 오케스트레이션**한다. 이것이 외부 API를 호출하는 유일한 위치다.

```ts
// POST /api/analyze
// body: AnalyzeRequest { input }
// 성공: 200 AnalyzeResponse
// 실패: 4xx/5xx { error: string }
export async function POST(req: Request): Promise<Response>;
```

파이프라인 순서(ARCHITECTURE.md 데이터 흐름 그대로):
1. body에서 `input` 파싱·검증(빈 문자열이면 400 `{ error: "채널 핸들 또는 URL을 입력하세요." }`).
2. `resolveChannel(input)` → `{ channel, uploadsPlaylistId }`.
3. `getRecentVideos(uploadsPlaylistId, 10)` → 최근 영상.
4. `analyzeChannel(channel, recentVideos)` → `ChannelAnalysis`.
5. `searchViralVideos(analysis.searchKeywords)` → 후보 영상.
6. 후보를 `viewsPerDay`로 점수 매겨 **내림차순 정렬 후 상위 5개**를 `ViralVideo[]`로 매핑(`viralScore`, `viewsPerDay` 채움). 자기 채널 영상은 제외한다.
7. `recommendContent(analysis, 상위 viralVideos)` → `Recommendation[]`.
8. `AnalyzeResponse { channel, analysis, viralVideos, recommendations }`를 200으로 반환.

규칙:
- 전체를 **try/catch 한 번**으로 감싼다. 에러 메시지는 사람이 읽을 한국어로. 채널 못 찾음은 404, 그 외는 500. `{ error }` JSON 반환.
- 키는 services 내부에서 `process.env`로 읽으므로 route에서 키를 직접 다루지 않는다.
- `export const runtime = "nodejs"`(SDK 호환). 필요 시 `dynamic = "force-dynamic"`.

## Acceptance Criteria

```bash
npm run build   # 컴파일 에러 없음
npm run lint    # 린트 에러 없음
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 체크리스트:
   - 외부 API 호출(youtube/claude)이 이 route를 통해서만 일어나는가?
   - 6단계 순서가 ARCHITECTURE.md 데이터 흐름과 일치하는가?
   - viral 정렬이 `viewsPerDay`(일평균 조회수) 기준이고 상위 5개로 제한되는가?
   - 에러가 `{ error: string }` 형태로 반환되는가?
3. `phases/0-mvp/index.json`의 step 4 업데이트:
   - 성공 → `"status": "completed"`, `"summary": "/api/analyze POST 파이프라인(resolve→recent→analyze→search→score→recommend)"`
   - 실패 → `"status": "error"`, `"error_message": "..."`

## 금지사항

- 클라이언트에서 직접 외부 API를 부르도록 로직을 옮기지 마라. 이유: 키 노출 + CLAUDE.md CRITICAL 위반.
- 캐싱·재시도·큐·백그라운드 작업을 추가하지 마라. 이유: 과설계. 순차 호출 + 단일 try/catch로 충분.
- viral 점수에 일평균 조회수 외 지표를 섞지 마라. 이유: 결정된 단일 지표.
- 응답 구조를 `AnalyzeResponse`에서 임의로 바꾸지 마라. 이유: step5 UI가 이 타입에 의존한다.

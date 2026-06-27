# Step 1: core-types

## 읽어야 할 파일

먼저 아래 파일들을 읽고 설계 의도를 파악하라:

- `/Users/jekismac/Projects/harness_framework/docs/ARCHITECTURE.md`
- `/Users/jekismac/Projects/harness_framework/docs/PRD.md`
- `/Users/jekismac/Projects/harness_framework/src/lib/env.ts` (step0 산출물)
- `src/app/page.tsx` (step0 플레이스홀더 구조 참고)

## 작업

`src/types/index.ts`에 앱 전체가 공유할 도메인 타입을 정의한다. **순수 타입/인터페이스만** 작성한다(런타임 로직 금지). 데이터 흐름(ARCHITECTURE.md)을 그대로 반영한다.

아래 타입을 포함하라(필드는 가이드이며, 합리적으로 보강 가능):

```ts
// 유튜브 채널 기본 정보
export interface ChannelInfo {
  channelId: string;
  title: string;
  handle?: string;
  description: string;
  subscriberCount: number;
  videoCount: number;
  thumbnailUrl: string;
}

// 영상 1개 (채널 최근 영상 / viral 후보 공용)
export interface VideoInfo {
  videoId: string;
  title: string;
  description: string;
  channelTitle: string;
  publishedAt: string;       // ISO8601
  viewCount: number;
  likeCount: number;
  commentCount: number;
  thumbnailUrl: string;
}

// viral 점수가 매겨진 영상
export interface ViralVideo extends VideoInfo {
  viralScore: number;        // lib/viral-score 계산값
  viewsPerDay: number;
}

// Claude 채널 분석 결과
export interface ChannelAnalysis {
  summary: string;           // 이 채널이 무슨 컨텐츠를 하는지 요약
  topics: string[];          // 핵심 주제/카테고리
  tone: string;              // 톤/스타일
  searchKeywords: string[];  // viral 탐색에 쓸 검색 키워드
}

// Claude 차기 컨텐츠 추천 1개
export interface Recommendation {
  title: string;             // 추천 영상 제목(안)
  rationale: string;         // 왜 이게 viral 가능성이 있는지 근거
  inspiredBy?: string;       // 참고한 viral 영상 제목(있으면)
}

// /api/analyze 최종 응답
export interface AnalyzeResponse {
  channel: ChannelInfo;
  analysis: ChannelAnalysis;
  viralVideos: ViralVideo[];
  recommendations: Recommendation[];
}

// /api/analyze 요청 바디
export interface AnalyzeRequest {
  input: string;             // @handle 또는 채널 URL
}
```

## Acceptance Criteria

```bash
npm run build   # 타입 컴파일 에러 없음
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 체크리스트:
   - 타입이 `src/types/index.ts` 한 곳에 모여 있는가?
   - ARCHITECTURE.md 데이터 흐름(channel → analysis → viral → recommendations)을 표현하는가?
3. `phases/0-mvp/index.json`의 step 1을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "정의한 타입 목록 요약"`
   - 실패 → `"status": "error"`, `"error_message": "..."`

## 금지사항

- 런타임 코드(함수 구현, fetch 등)를 넣지 마라. 이유: 이 step은 타입 전용 레이어다.
- 타입을 여러 파일로 흩뿌리지 마라. 이유: 후속 step이 `@/types`에서 단일 import 하도록 한다.

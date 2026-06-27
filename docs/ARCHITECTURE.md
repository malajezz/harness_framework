# 아키텍처

## 디렉토리 구조
```
src/
├── app/
│   ├── page.tsx              # 메인 페이지: 입력 폼 + 결과 표시 (Client Component)
│   ├── layout.tsx            # 루트 레이아웃
│   ├── globals.css           # Tailwind 전역 스타일
│   └── api/
│       └── analyze/route.ts  # POST: 분석 파이프라인 오케스트레이션 (서버 전용)
├── components/               # ChannelSummary, ViralList, RecommendationCard 등 UI
├── types/
│   └── index.ts              # 도메인 타입 정의
├── lib/                      # 순수 유틸 (channel-url 파서, viral-score 계산)
└── services/
    ├── youtube.ts            # YouTube Data API v3 래퍼
    └── claude.ts             # Claude API 래퍼 (@anthropic-ai/sdk)
```

## 패턴
- 기본은 Server. 사용자 입력/상태가 필요한 메인 페이지만 Client Component(`"use client"`).
- 외부 API 호출은 전부 서버(`app/api/analyze/route.ts` → `services/*`)에서. 클라이언트는 자체 API만 호출.
- `services/`는 외부 API I/O, `lib/`는 순수 함수(테스트 대상), `types/`는 공유 타입.

## 데이터 흐름
```
사용자가 @handle/URL 입력 (page.tsx, Client)
  → POST /api/analyze (route.ts, Server)
    → services/youtube: 채널 resolve + 최근 업로드/통계 수집
    → services/claude: 채널 정체성/주제 분석
    → services/youtube: 주제 키워드로 유사 영상 검색
    → lib/viral-score: viral 점수 계산 → hot 영상 정렬/선별
    → services/claude: 차기 컨텐츠 추천 생성
  → AnalyzeResponse(JSON) 반환
  → page.tsx가 ChannelSummary / ViralList / RecommendationCard로 렌더링
```

## 상태 관리
- 서버 상태: 요청마다 실시간 조회(DB/캐시 없음, stateless).
- 클라이언트 상태: `useState`로 입력값/로딩/결과/에러만 관리. 전역 상태 라이브러리 미사용.

## 모듈별 책임 (각자 한 가지만)
| 파일 | 책임 | 안 하는 것 |
|---|---|---|
| `app/page.tsx` | 입력 받고 `/api/analyze` 호출, 결과/에러 표시 | 외부 API 직접 호출 ✗ |
| `app/api/analyze/route.ts` | 6단계 파이프라인 순차 실행, 에러를 `{ error }`로 | 로직 분산 ✗ |
| `services/youtube.ts` | YouTube REST 3함수(resolve/recent/search) | 점수 계산 ✗ |
| `services/claude.ts` | 분석 1함수 + 추천 1함수 | 프롬프트 외 로직 ✗ |
| `lib/viral-score.ts` | 일평균 조회수 계산(순수) | 구독자 가중치 등 ✗(단일 지표) |
| `lib/channel-url.ts` | `@handle`/URL → 식별자 | 검증 외 부수효과 ✗ |
| `types/index.ts` | 공유 타입 한 파일 | 런타임 코드 ✗ |

## 의존성 화이트리스트 (이것만, 추가 금지)
`next` · `react` · `tailwindcss`(scaffold), `@anthropic-ai/sdk`, `vitest`(dev). YouTube는 내장 `fetch`로 직접 호출(별도 클라이언트 라이브러리 없음).

## viral 정의
viral 점수 = **일평균 조회수**(`viewCount / 업로드 후 경과일`). 이 단일 지표로 정렬한다. 구독자 가중치 등 추가 지표는 MVP에서 쓰지 않는다.

## 에러 처리
`route.ts`에서 try/catch 한 번. 성공 시 `200 { channel, analysis, viralVideos, recommendations }`, 실패 시 `4xx/5xx { error: "사람이 읽을 메시지" }`. `page.tsx`는 `error`를 그대로 표시. 커스텀 에러 클래스/재시도/로깅 인프라 없음.

## ⛔ Over-engineering 금지 (CRITICAL)
MVP/프로토타입이다. 아래는 **만들지 마라**:
- DB·캐시·큐·세션·인증 (stateless 유지)
- 추상 인터페이스/DI/팩토리/플러그인 시스템
- 상태관리 라이브러리(Redux/Zustand)·데이터 페칭 라이브러리(React Query)
- 재시도·서킷브레이커·페이지네이션·무한스크롤·다국어
- 멀티 LLM 추상화(Anthropic 직접 호출)
- 미래 대비용 옵션 파라미터/제네릭 (지금 필요한 것만 구현)

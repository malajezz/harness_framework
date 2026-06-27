# Step 3: claude-service

## 읽어야 할 파일

먼저 아래 파일들을 읽고 설계 의도를 파악하라:

- `/Users/jekismac/Projects/harness_framework/docs/ARCHITECTURE.md` (특히 "Over-engineering 금지", "모듈별 책임")
- `/Users/jekismac/Projects/harness_framework/CLAUDE.md` (API 키 서버 전용)
- `src/types/index.ts` (step1 — `ChannelInfo`, `VideoInfo`, `ChannelAnalysis`, `Recommendation`)
- `src/lib/env.ts` (step0 — `getAnthropicApiKey()`)

이 step은 Claude API를 호출한다. 작업 전에 **`claude-api` 스킬을 호출**해 최신 모델 ID/SDK 사용법/구조화 출력 패턴을 확인하라.

## 작업

`src/services/claude.ts` 하나만 만든다. `@anthropic-ai/sdk`로 Claude를 호출하는 함수 2개. 키는 `getAnthropicApiKey()`로 읽는다. 모델은 `claude-sonnet-4-6`(MVP 기본).

```ts
import type { ChannelInfo, VideoInfo, ChannelAnalysis, Recommendation } from "@/types";

// (3단계) 채널 최근 영상들을 보고 채널 정체성을 진단한다.
// 반환: summary(무슨 컨텐츠인지 2~3문장), topics[], tone, searchKeywords(viral 검색에 쓸 3~5개)
export async function analyzeChannel(channel: ChannelInfo, recentVideos: VideoInfo[]): Promise<ChannelAnalysis>;

// (6단계) 채널 진단 + 뜨는 영상들을 결합해 차기 컨텐츠 3~5개를 제안한다.
// 각 항목: title(제목안), rationale(왜 뜰 가능성이 있는지 근거), inspiredBy(참고한 viral 영상 제목, 있으면)
export async function recommendContent(analysis: ChannelAnalysis, viralVideos: VideoInfo[]): Promise<Recommendation[]>;
```

구현 지침:
- 출력은 **JSON으로 강제**해 파싱한다. 권장: tool use(structured output) 또는 "JSON만 출력하라"는 지시 + `JSON.parse`. 파싱 실패 시 의미 있는 에러를 throw.
- 프롬프트에는 채널/영상의 **제목·설명·조회수·업로드일**만 요약해 넣는다(토큰 절약). 영상은 상위 몇 개만.
- 추천은 **3~5개**, 각 항목은 **제목 + 근거**가 반드시 있어야 한다(결정사항). `inspiredBy`는 선택.
- 한국어로 답하도록 지시한다(사용자 대상 텍스트).
- `max_tokens`는 추천 분량에 맞게 적당히(예: 1500~2000). 과도하게 크게 잡지 마라.

## Acceptance Criteria

```bash
npm run build   # 컴파일 에러 없음
npm run lint    # 린트 에러 없음
```

## 검증 절차

1. 위 AC 커맨드를 실행한다(실 API 호출 없이 타입/빌드만 검증).
2. 체크리스트:
   - Claude 호출이 `src/services/claude.ts`에만 있는가?
   - 반환 타입이 step1의 `ChannelAnalysis` / `Recommendation[]`와 일치하는가?
   - 모델 ID가 `claude-api` 스킬에서 확인한 유효한 값인가?
   - 키를 `getAnthropicApiKey()`로만 읽는가?
3. `phases/0-mvp/index.json`의 step 3 업데이트:
   - 성공 → `"status": "completed"`, `"summary": "claude.ts analyzeChannel/recommendContent + 모델/구조화출력 방식"`
   - 실패 → `"status": "error"`, `"error_message": "..."`

## 금지사항

- 멀티 LLM 추상화(provider 인터페이스, 어댑터)를 만들지 마라. 이유: 과설계. Anthropic을 직접 호출한다.
- 빌드/검증을 위해 실제 Claude API를 호출하지 마라. 이유: 키/비용/네트워크 의존. 타입·빌드로만 검증한다.
- 프롬프트에 영상 전체 메타데이터를 통째로 넣지 마라. 이유: 토큰 낭비. 제목/설명/조회수/날짜 요약만 넣는다.
- 추천에서 근거(rationale)를 생략하지 마라. 이유: 결정사항(제목+근거)이다.

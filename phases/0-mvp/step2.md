# Step 2: youtube-service

## 읽어야 할 파일

먼저 아래 파일들을 읽고 설계 의도를 파악하라:

- `/Users/jekismac/Projects/harness_framework/docs/ARCHITECTURE.md`
- `/Users/jekismac/Projects/harness_framework/CLAUDE.md` (API 키 서버 전용 규칙)
- `src/types/index.ts` (step1 산출물 — 여기 타입을 재사용하라)
- `src/lib/env.ts` (step0 — `getYoutubeApiKey()`)

## 작업

YouTube Data API v3 래퍼와 순수 유틸을 만든다. 모든 외부 호출은 서버 전용 모듈이며 `getYoutubeApiKey()`로 키를 읽는다.

### 1. `src/lib/channel-url.ts` (순수 함수)
입력 문자열에서 채널 식별자를 뽑는다.
```ts
// "@handle", "https://youtube.com/@handle", ".../channel/UC...", ".../c/Name", 순수 "UC..." 등을 처리
export type ChannelRef =
  | { type: "handle"; value: string }   // "@" 제외한 handle
  | { type: "id"; value: string };      // UC... 채널 ID
export function parseChannelInput(input: string): ChannelRef;
```
규칙: `UC`로 시작하는 24자 문자열은 `id`. `@`로 시작하거나 URL의 `/@..` 형태는 `handle`. URL의 `/channel/UC..`는 `id`. 애매하면 `handle`로 처리.

### 2. `src/lib/viral-score.ts` (순수 함수, **테스트 대상**)
```ts
// publishedAt(ISO)과 now로 업로드 후 경과일(최소 1일) 계산
export function daysSince(publishedAt: string, now?: Date): number;
// 일평균 조회수 = viewCount / daysSince. MVP의 viral 점수는 이 단일 지표다.
export function viewsPerDay(viewCount: number, publishedAt: string, now?: Date): number;
```
핵심 규칙:
- `daysSince`는 0으로 나누기 방지를 위해 최소 1을 반환한다.
- viral 점수 = 일평균 조회수(`viewsPerDay`) 하나만 쓴다. **구독자 가중치 등 다른 지표를 추가하지 마라**(ARCHITECTURE.md viral 정의 / 과설계 금지). 정렬·`ViralVideo` 매핑은 step4(route)에서 이 함수로 수행한다.
- 함수는 순수(부작용·네트워크 없음)해야 한다.

### 3. `src/services/youtube.ts` (서버 전용 래퍼, fetch 사용)
```ts
import type { ChannelInfo, VideoInfo } from "@/types";
// 핸들/ID resolve → 채널 정보 + uploads 플레이리스트 ID
export async function resolveChannel(input: string): Promise<{ channel: ChannelInfo; uploadsPlaylistId: string }>;
// 채널 최근 업로드 N개(기본 10) + 통계
export async function getRecentVideos(uploadsPlaylistId: string, max?: number): Promise<VideoInfo[]>;
// 키워드로 유사/경쟁 영상 검색 후 통계 포함해 반환 (order=viewCount, 최근 N개월). max 기본 15
export async function searchViralVideos(keywords: string[], opts?: { max?: number; publishedAfterDays?: number }): Promise<VideoInfo[]>;
```
구현 지침:
- 엔드포인트: `channels.list`(part=snippet,statistics,contentDetails; `forHandle` 또는 `id`), `playlistItems.list`(uploads), `videos.list`(part=snippet,statistics; videoId 통계 보강), `search.list`(part=snippet,type=video,order=viewCount,publishedAfter,q).
- 쿼터 절약: `search.list`는 추천 1회 분량만. `videoId`는 batch(콤마 결합)로 `videos.list` 1회 조회.
- 숫자 통계는 문자열로 오므로 `Number(...)`로 변환. 누락 필드는 0/빈 문자열 기본값.
- 채널을 못 찾으면 의미 있는 에러를 throw(예: `채널을 찾을 수 없습니다: <input>`).
- 키는 절대 클라이언트로 보내지 마라. 이 파일은 서버에서만 import 된다.

### 4. 테스트 러너 설정 + 테스트
- `vitest`를 devDependency로 추가하고 `package.json`의 `"test"`를 `"vitest run"`으로 교체.
- `src/lib/viral-score.test.ts` 작성: `daysSince`가 최소 1을 보장하는지, `viewsPerDay`가 (조회수가 같다면) 최근 영상에 더 높은 값을 주는지 검증. 고정 `now`를 주입해 결정적으로 테스트.

## Acceptance Criteria

```bash
npm run build   # 컴파일 에러 없음
npm test        # viral-score 테스트 통과
npm run lint    # 린트 에러 없음
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 체크리스트:
   - 외부 API 호출이 `src/services/youtube.ts`에만 있는가? (lib은 순수)
   - 키를 `getYoutubeApiKey()`로만 읽고 `NEXT_PUBLIC_`을 쓰지 않았는가?
   - `viral-score`가 `now` 주입으로 결정적으로 테스트되는가?
3. `phases/0-mvp/index.json`의 step 2 업데이트:
   - 성공 → `"status": "completed"`, `"summary": "youtube.ts 함수 + viral-score/channel-url 유틸 + 테스트"`
   - 실패 → `"status": "error"`, `"error_message": "..."`
   - **키가 없어서 빌드/테스트가 막히면** blocked가 아니라, 네트워크 없이 통과하도록 단위 테스트는 순수 함수만 대상으로 한다(실 API 호출 테스트 금지).

## 금지사항

- `src/lib/`에 네트워크 호출을 넣지 마라. 이유: lib은 순수·테스트 대상 레이어다.
- 단위 테스트에서 실제 YouTube API를 호출하지 마라. 이유: 키/쿼터/네트워크에 의존하면 CI가 불안정해진다.
- API 키를 로그로 출력하지 마라. 이유: 키 유출.
- 기존 step0/step1 산출물을 변경하지 마라(타입 보강이 꼭 필요하면 `@/types`에 추가만). 이유: 회귀 방지.

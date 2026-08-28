// viral 점수 = 일평균 조회수(viewCount / 업로드 후 경과일). 순수 함수, 네트워크·부수효과 없음.
// MVP는 이 단일 지표만 쓴다(구독자 가중치 등 추가 금지 — ARCHITECTURE.md viral 정의).
// 정렬/ViralVideo 매핑은 route(step4)에서 이 함수로 수행한다.

const MS_PER_DAY = 1000 * 60 * 60 * 24;

// 업로드 후 경과일(최소 1). 0으로 나누기 방지를 위해 1 미만은 1로 올린다.
export function daysSince(publishedAt: string, now: Date = new Date()): number {
  const elapsedMs = now.getTime() - new Date(publishedAt).getTime();
  const days = Math.floor(elapsedMs / MS_PER_DAY);
  return Math.max(1, days);
}

// 일평균 조회수 = viewCount / daysSince. MVP의 viral 점수.
export function viewsPerDay(
  viewCount: number,
  publishedAt: string,
  now: Date = new Date(),
): number {
  return viewCount / daysSince(publishedAt, now);
}

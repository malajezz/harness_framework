// 앱 전체가 공유하는 도메인 타입 한 곳.
// 데이터 흐름: channel → analysis → viral → recommendations (ARCHITECTURE.md).
// 순수 타입만 정의한다(런타임 로직 금지).

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
  publishedAt: string; // ISO8601
  viewCount: number;
  likeCount: number;
  commentCount: number;
  thumbnailUrl: string;
}

// viral 점수가 매겨진 영상
export interface ViralVideo extends VideoInfo {
  viralScore: number; // lib/viral-score 계산값
  viewsPerDay: number;
}

// Claude 채널 분석 결과
export interface ChannelAnalysis {
  summary: string; // 이 채널이 무슨 컨텐츠를 하는지 요약
  topics: string[]; // 핵심 주제/카테고리
  tone: string; // 톤/스타일
  searchKeywords: string[]; // viral 탐색에 쓸 검색 키워드
}

// Claude 차기 컨텐츠 추천 1개
export interface Recommendation {
  title: string; // 추천 영상 제목(안)
  rationale: string; // 왜 이게 viral 가능성이 있는지 근거
  inspiredBy?: string; // 참고한 viral 영상 제목(있으면)
}

// /api/analyze 요청 바디
export interface AnalyzeRequest {
  input: string; // @handle 또는 채널 URL
}

// /api/analyze 최종 응답
export interface AnalyzeResponse {
  channel: ChannelInfo;
  analysis: ChannelAnalysis;
  viralVideos: ViralVideo[];
  recommendations: Recommendation[];
}

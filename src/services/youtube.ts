// YouTube Data API v3 래퍼 (서버 전용). 외부 HTTP 호출은 이 파일에만 둔다.
// 키는 getYoutubeApiKey()로만 읽고 절대 클라이언트로 보내거나 로그하지 않는다.
// 이 모듈은 서버(app/api/*)에서만 import 한다.

import type { ChannelInfo, VideoInfo } from "@/types";
import { getYoutubeApiKey } from "@/lib/env";
import { parseChannelInput } from "@/lib/channel-url";

const API_BASE = "https://www.googleapis.com/youtube/v3";

// 핸들/ID resolve → 채널 정보 + uploads 플레이리스트 ID
export async function resolveChannel(
  input: string,
): Promise<{ channel: ChannelInfo; uploadsPlaylistId: string }> {
  const ref = parseChannelInput(input);
  const params: Record<string, string> = {
    part: "snippet,statistics,contentDetails",
  };
  if (ref.type === "handle") {
    params.forHandle = `@${ref.value}`;
  } else {
    params.id = ref.value;
  }

  const data = await ytFetch<YtChannelListResponse>("channels", params);
  const item = data.items?.[0];
  if (!item) {
    throw new Error(`채널을 찾을 수 없습니다: ${input}`);
  }

  const uploadsPlaylistId = item.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsPlaylistId) {
    throw new Error(`채널의 업로드 목록을 찾을 수 없습니다: ${input}`);
  }

  const snippet = item.snippet ?? {};
  const stats = item.statistics ?? {};
  const channel: ChannelInfo = {
    channelId: item.id,
    title: snippet.title ?? "",
    handle: snippet.customUrl,
    description: snippet.description ?? "",
    subscriberCount: Number(stats.subscriberCount ?? 0),
    videoCount: Number(stats.videoCount ?? 0),
    thumbnailUrl: pickThumbnail(snippet.thumbnails),
  };

  return { channel, uploadsPlaylistId };
}

// 채널 최근 업로드 N개(기본 10) + 통계
export async function getRecentVideos(
  uploadsPlaylistId: string,
  max: number = 10,
): Promise<VideoInfo[]> {
  const playlist = await ytFetch<YtPlaylistItemsResponse>("playlistItems", {
    part: "contentDetails",
    playlistId: uploadsPlaylistId,
    maxResults: String(max),
  });

  const videoIds = (playlist.items ?? [])
    .map((it) => it.contentDetails?.videoId)
    .filter((id): id is string => Boolean(id));

  if (videoIds.length === 0) return [];
  return fetchVideosByIds(videoIds);
}

// 키워드로 유사/경쟁 영상 검색(order=viewCount, 최근 N일) 후 통계 포함해 반환
export async function searchViralVideos(
  keywords: string[],
  opts?: { max?: number; publishedAfterDays?: number },
): Promise<VideoInfo[]> {
  const max = opts?.max ?? 15;
  const publishedAfterDays = opts?.publishedAfterDays ?? 180; // 기본 최근 6개월
  const publishedAfter = new Date(
    Date.now() - publishedAfterDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  const search = await ytFetch<YtSearchListResponse>("search", {
    part: "snippet",
    type: "video",
    order: "viewCount",
    // OR 구문 검색: 각 키워드를 따옴표로 감싼 구문으로 만들어 `|`로 OR 결합한다.
    // 따옴표가 없으면 YouTube가 단어 단위로 쪼개 사실상 AND처럼 좁혀버려(다중 단어
    // 키워드 5개 기준 매칭 54건) 키워드를 나열한 스팸 영상만 남는다.
    q: keywords.map((k) => `"${k.replace(/"/g, "")}"`).join("|"),
    publishedAfter,
    maxResults: String(max),
  });

  const videoIds = (search.items ?? [])
    .map((it) => it.id?.videoId)
    .filter((id): id is string => Boolean(id));

  if (videoIds.length === 0) return [];
  return fetchVideosByIds(videoIds);
}

// --- 내부 헬퍼 ---

// videoId 목록을 batch(콤마 결합)로 videos.list 1회 조회.
async function fetchVideosByIds(videoIds: string[]): Promise<VideoInfo[]> {
  const data = await ytFetch<YtVideoListResponse>("videos", {
    part: "snippet,statistics",
    id: videoIds.join(","),
  });
  return (data.items ?? []).map(toVideoInfo);
}

function toVideoInfo(item: YtVideoItem): VideoInfo {
  const snippet = item.snippet ?? {};
  const stats = item.statistics ?? {};
  return {
    videoId: item.id,
    title: snippet.title ?? "",
    description: snippet.description ?? "",
    channelTitle: snippet.channelTitle ?? "",
    publishedAt: snippet.publishedAt ?? "",
    viewCount: Number(stats.viewCount ?? 0),
    likeCount: Number(stats.likeCount ?? 0),
    commentCount: Number(stats.commentCount ?? 0),
    thumbnailUrl: pickThumbnail(snippet.thumbnails),
  };
}

function pickThumbnail(thumbs?: YtThumbnails): string {
  return thumbs?.high?.url ?? thumbs?.medium?.url ?? thumbs?.default?.url ?? "";
}

// 공통 GET 호출. 응답이 200이 아니면 의미 있는 에러를 throw(키는 로그하지 않음).
async function ytFetch<T>(
  resource: string,
  params: Record<string, string>,
): Promise<T> {
  const search = new URLSearchParams({ ...params, key: getYoutubeApiKey() });
  const res = await fetch(`${API_BASE}/${resource}?${search.toString()}`);
  if (!res.ok) {
    throw new Error(`YouTube API 호출 실패 (${resource}): ${res.status}`);
  }
  return (await res.json()) as T;
}

// --- 소비하는 응답 형태만 최소 정의(strict 타입 안전) ---

interface YtThumbnails {
  default?: { url?: string };
  medium?: { url?: string };
  high?: { url?: string };
}

interface YtChannelItem {
  id: string;
  snippet?: {
    title?: string;
    description?: string;
    customUrl?: string;
    thumbnails?: YtThumbnails;
  };
  statistics?: { subscriberCount?: string; videoCount?: string };
  contentDetails?: { relatedPlaylists?: { uploads?: string } };
}
interface YtChannelListResponse {
  items?: YtChannelItem[];
}

interface YtPlaylistItem {
  contentDetails?: { videoId?: string };
}
interface YtPlaylistItemsResponse {
  items?: YtPlaylistItem[];
}

interface YtVideoItem {
  id: string;
  snippet?: {
    title?: string;
    description?: string;
    channelTitle?: string;
    publishedAt?: string;
    thumbnails?: YtThumbnails;
  };
  statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
}
interface YtVideoListResponse {
  items?: YtVideoItem[];
}

interface YtSearchItem {
  id?: { videoId?: string };
}
interface YtSearchListResponse {
  items?: YtSearchItem[];
}

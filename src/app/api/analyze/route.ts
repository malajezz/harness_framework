// 분석 파이프라인 오케스트레이션(서버 전용). 외부 API(YouTube/Claude)를 호출하는 유일한 위치.
// 데이터 흐름(ARCHITECTURE.md): resolve → recent → analyze → search → score → recommend.
// 키는 services 내부에서 process.env로 읽으므로 여기선 직접 다루지 않는다.

import type { AnalyzeResponse, ViralVideo } from "@/types";
import {
  resolveChannel,
  getRecentVideos,
  searchViralVideos,
} from "@/services/youtube";
import { analyzeChannel, recommendContent } from "@/services/claude";
import { viewsPerDay } from "@/lib/viral-score";

export const runtime = "nodejs"; // @anthropic-ai/sdk 호환
export const dynamic = "force-dynamic"; // 매 요청 실시간 조회(stateless)

const TOP_VIRAL = 5;

export async function POST(req: Request): Promise<Response> {
  try {
    // 1. 입력 파싱·검증
    const body = (await req.json()) as { input?: unknown };
    const input = typeof body.input === "string" ? body.input.trim() : "";
    if (!input) {
      return json({ error: "채널 핸들 또는 URL을 입력하세요." }, 400);
    }

    // 2. 채널 resolve + uploads 플레이리스트
    const { channel, uploadsPlaylistId } = await resolveChannel(input);

    // 3. 최근 업로드 10개
    const recentVideos = await getRecentVideos(uploadsPlaylistId, 10);

    // 4. 채널 정체성 분석
    const analysis = await analyzeChannel(channel, recentVideos);

    // 5. 주제 키워드로 유사/경쟁 영상 검색
    const candidates = await searchViralVideos(analysis.searchKeywords);

    // 6. 일평균 조회수로 점수 → 자기 채널 제외 → 내림차순 상위 5개
    const now = new Date();
    const viralVideos: ViralVideo[] = candidates
      .filter((v) => v.channelTitle !== channel.title)
      .map((v) => {
        const score = viewsPerDay(v.viewCount, v.publishedAt, now);
        return { ...v, viralScore: score, viewsPerDay: score };
      })
      .sort((a, b) => b.viewsPerDay - a.viewsPerDay)
      .slice(0, TOP_VIRAL);

    // 7. 차기 컨텐츠 추천
    const recommendations = await recommendContent(analysis, viralVideos);

    // 8. 최종 응답
    const response: AnalyzeResponse = {
      channel,
      analysis,
      viralVideos,
      recommendations,
    };
    return json(response, 200);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "분석 중 오류가 발생했습니다.";
    // 채널 못 찾음은 404, 그 외는 500
    const status = message.includes("찾을 수 없습니다") ? 404 : 500;
    return json({ error: message }, status);
  }
}

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

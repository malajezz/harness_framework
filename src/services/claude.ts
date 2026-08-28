// Claude 래퍼(서버 전용). @anthropic-ai/claude-agent-sdk로 채널 분석/추천을 생성한다.
// 인증: 이 기기의 Claude Code 자격증명(Pro/Max 구독 또는 CLAUDE_CODE_OAUTH_TOKEN)을 사용한다.
//   - 별도 API 키 불필요. 단, 환경에 ANTHROPIC_API_KEY가 있으면 그게 우선되어 종량제 과금되므로
//     .env.local에 ANTHROPIC_API_KEY를 넣지 말 것(인증 우선순위: API 키 > 구독).
// 출력: Messages API의 강제 tool_use 대신, JSON만 출력하도록 프롬프트로 유도하고 파싱한다.
// 이 모듈은 서버(app/api/*)에서만 import 한다.

import { query } from "@anthropic-ai/claude-agent-sdk";
import type {
  ChannelInfo,
  VideoInfo,
  ChannelAnalysis,
  Recommendation,
} from "@/types";

const MODEL = "claude-sonnet-4-6"; // MVP 기본 (ADR-002)

// 도구를 끄고(tools: []) 단일 턴으로 순수 텍스트(JSON)만 생성하도록 강제하는 공통 시스템 프롬프트.
const SYSTEM_JSON =
  "너는 데이터 분석 결과를 JSON으로만 반환하는 도우미다. " +
  "코드펜스(```), 머리말, 설명 없이 — 사용자가 요청한 스키마에 정확히 맞는 " +
  "유효한 JSON 객체 하나만 출력하라. 모든 텍스트 값은 한국어로 작성한다.";

// (3단계) 채널 최근 영상들을 보고 채널 정체성을 진단한다.
// 반환: summary(2~3문장) / topics[] / tone / searchKeywords(viral 검색용 3~5개)
export async function analyzeChannel(
  channel: ChannelInfo,
  recentVideos: VideoInfo[],
): Promise<ChannelAnalysis> {
  const prompt = [
    "다음 유튜브 채널의 최근 영상을 보고 채널의 컨텐츠 정체성을 진단하세요.",
    "",
    `채널명: ${channel.title}`,
    channel.description
      ? `채널 소개: ${truncate(channel.description, 300)}`
      : "",
    `구독자 수: ${channel.subscriberCount}`,
    "",
    "최근 영상:",
    formatVideos(recentVideos),
    "",
    "다음 JSON 스키마로만 답하세요:",
    "{",
    '  "summary": string,        // 이 채널이 무슨 컨텐츠를 하는지 2~3문장 요약',
    '  "topics": string[],       // 핵심 주제/카테고리 3~6개',
    '  "tone": string,           // 채널의 톤/스타일을 한 구절로',
    '  "searchKeywords": string[] // 같은 분야 viral 영상을 검색할 키워드 3~5개',
    "}",
  ].join("\n");

  const data = await runJson<Partial<ChannelAnalysis>>(prompt);
  if (
    !data.summary ||
    !Array.isArray(data.topics) ||
    !data.tone ||
    !Array.isArray(data.searchKeywords)
  ) {
    throw new Error("채널 분석 결과의 형식이 올바르지 않습니다.");
  }
  return {
    summary: data.summary,
    topics: data.topics,
    tone: data.tone,
    searchKeywords: data.searchKeywords,
  };
}

// (6단계) 채널 진단 + 뜨는 영상들을 결합해 차기 컨텐츠 3~5개를 제안한다.
// 각 항목: title(제목안) / rationale(근거) / inspiredBy(참고 영상 제목, 있으면)
export async function recommendContent(
  analysis: ChannelAnalysis,
  viralVideos: VideoInfo[],
): Promise<Recommendation[]> {
  const prompt = [
    "아래 채널 진단과, 같은 분야에서 뜨고 있는 영상들을 참고해, 이 채널이 다음에 만들면 좋을 컨텐츠를 제안하세요.",
    "",
    "채널 진단:",
    `- 요약: ${analysis.summary}`,
    `- 주제: ${analysis.topics.join(", ")}`,
    `- 톤: ${analysis.tone}`,
    "",
    "현재 뜨는 영상:",
    formatVideos(viralVideos),
    "",
    "요구사항: 추천을 3~5개 제안하세요. 참고한 위 영상이 있으면 inspiredBy에 그 제목을 넣고, 없으면 생략하세요.",
    "",
    "다음 JSON 스키마로만 답하세요:",
    "{",
    '  "recommendations": [',
    "    {",
    '      "title": string,       // 추천 영상 제목안',
    '      "rationale": string,   // 왜 viral 가능성이 있는지 근거',
    '      "inspiredBy"?: string  // 참고한 viral 영상 제목(있으면만)',
    "    }",
    "  ]",
    "}",
  ].join("\n");

  const data = await runJson<{ recommendations?: RawRecommendation[] }>(prompt);
  const recs = data.recommendations ?? [];
  return recs
    .filter((r) => r && r.title && r.rationale)
    .map((r) => ({
      title: r.title,
      rationale: r.rationale,
      ...(r.inspiredBy ? { inspiredBy: r.inspiredBy } : {}),
    }));
}

// --- 내부 헬퍼 ---

// Agent SDK로 단일 턴 호출 후, 결과 텍스트를 JSON으로 파싱해 반환한다.
// 도구를 끄고(tools: []) maxTurns: 1로 순수 생성만 시킨다.
async function runJson<T>(userPrompt: string): Promise<T> {
  let finalText: string | null = null;
  for await (const message of query({
    prompt: userPrompt,
    options: {
      systemPrompt: SYSTEM_JSON,
      model: MODEL,
      tools: [], // 모든 내장 도구 비활성화 = 순수 텍스트 생성
      maxTurns: 1,
    },
  })) {
    if (message.type === "result") {
      if (message.subtype !== "success") {
        throw new Error(`Claude 호출이 실패했습니다 (${message.subtype}).`);
      }
      finalText = message.result;
    }
  }
  if (finalText == null) {
    throw new Error("Claude가 결과를 반환하지 않았습니다.");
  }
  return parseJsonObject<T>(finalText);
}

// 모델이 코드펜스나 군더더기를 덧붙여도 견디도록, 첫 번째 JSON 객체를 추출해 파싱한다.
function parseJsonObject<T>(text: string): T {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // 펜스 제거로도 안 되면 본문에서 첫 { ... 마지막 } 구간을 시도
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1)) as T;
    }
    throw new Error("Claude가 유효한 JSON을 반환하지 않았습니다.");
  }
}

// 토큰 절약: 상위 일부 영상만, 제목/조회수/업로드일/짧은 설명만 넣는다.
function formatVideos(videos: VideoInfo[]): string {
  if (videos.length === 0) return "(영상 없음)";
  return videos
    .slice(0, 12)
    .map((v, i) => {
      const date = v.publishedAt ? v.publishedAt.slice(0, 10) : "";
      const desc = truncate(v.description, 120);
      return `${i + 1}. "${v.title}" | 조회수 ${v.viewCount} | ${date}${
        desc ? ` | ${desc}` : ""
      }`;
    })
    .join("\n");
}

function truncate(text: string, max: number): string {
  if (!text) return "";
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length > max ? `${oneLine.slice(0, max)}…` : oneLine;
}

interface RawRecommendation {
  title: string;
  rationale: string;
  inspiredBy?: string;
}

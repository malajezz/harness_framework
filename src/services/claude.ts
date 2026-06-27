// Claude API 래퍼(서버 전용). @anthropic-ai/sdk로 채널 분석/추천을 생성한다.
// 키는 getAnthropicApiKey()로만 읽고, 외부 호출은 이 파일에만 둔다(서버 전용).
// 출력은 tool use(structured output)로 JSON을 강제하고, 실패 시 의미 있는 에러를 throw 한다.
// 이 모듈은 서버(app/api/*)에서만 import 한다.

import Anthropic from "@anthropic-ai/sdk";
import type {
  ChannelInfo,
  VideoInfo,
  ChannelAnalysis,
  Recommendation,
} from "@/types";
import { getAnthropicApiKey } from "@/lib/env";

const MODEL = "claude-sonnet-4-6"; // MVP 기본 (ADR-002)

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
    "요구사항:",
    "- summary: 이 채널이 무슨 컨텐츠를 하는지 2~3문장으로 요약",
    "- topics: 핵심 주제/카테고리 3~6개",
    "- tone: 채널의 톤/스타일을 한 구절로",
    "- searchKeywords: 같은 분야의 viral 영상을 검색할 키워드 3~5개",
    "모든 텍스트는 한국어로 작성하세요.",
  ].join("\n");

  const data = (await callTool(
    prompt,
    ANALYZE_TOOL,
    1500,
  )) as ChannelAnalysis;
  return data;
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
    "요구사항:",
    "- 추천을 3~5개 제안하세요.",
    "- 각 항목은 title(제목안)과 rationale(왜 뜰 가능성이 있는지 근거)을 반드시 포함하세요.",
    "- 참고한 위 영상이 있으면 inspiredBy에 그 제목을 넣고, 없으면 생략하세요.",
    "모든 텍스트는 한국어로 작성하세요.",
  ].join("\n");

  const data = (await callTool(prompt, RECOMMEND_TOOL, 2000)) as {
    recommendations?: RawRecommendation[];
  };
  const recs = data.recommendations ?? [];
  return recs.map((r) => ({
    title: r.title,
    rationale: r.rationale,
    ...(r.inspiredBy ? { inspiredBy: r.inspiredBy } : {}),
  }));
}

// --- 내부 헬퍼 ---

function getClient(): Anthropic {
  return new Anthropic({ apiKey: getAnthropicApiKey() });
}

// 지정한 tool을 강제(tool_choice)해 구조화 결과를 받는다. 결과가 없으면 에러를 throw.
async function callTool(
  prompt: string,
  tool: Anthropic.Tool,
  maxTokens: number,
): Promise<unknown> {
  const message = await getClient().messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    tools: [tool],
    tool_choice: { type: "tool", name: tool.name },
    messages: [{ role: "user", content: prompt }],
  });

  const block = message.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") {
    throw new Error("Claude가 구조화된 결과를 반환하지 않았습니다.");
  }
  return block.input;
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

const ANALYZE_TOOL: Anthropic.Tool = {
  name: "report_channel_analysis",
  description: "채널 정체성 진단 결과를 보고한다.",
  input_schema: {
    type: "object",
    properties: {
      summary: {
        type: "string",
        description: "이 채널이 무슨 컨텐츠를 하는지 2~3문장 요약",
      },
      topics: {
        type: "array",
        items: { type: "string" },
        description: "핵심 주제/카테고리 3~6개",
      },
      tone: { type: "string", description: "채널의 톤/스타일" },
      searchKeywords: {
        type: "array",
        items: { type: "string" },
        description: "viral 탐색에 쓸 검색 키워드 3~5개",
      },
    },
    required: ["summary", "topics", "tone", "searchKeywords"],
  },
};

const RECOMMEND_TOOL: Anthropic.Tool = {
  name: "report_recommendations",
  description: "차기 컨텐츠 추천 목록을 보고한다.",
  input_schema: {
    type: "object",
    properties: {
      recommendations: {
        type: "array",
        description: "차기 컨텐츠 추천 3~5개",
        items: {
          type: "object",
          properties: {
            title: { type: "string", description: "추천 영상 제목안" },
            rationale: {
              type: "string",
              description: "왜 viral 가능성이 있는지 근거",
            },
            inspiredBy: {
              type: "string",
              description: "참고한 viral 영상 제목(있으면)",
            },
          },
          required: ["title", "rationale"],
        },
      },
    },
    required: ["recommendations"],
  },
};

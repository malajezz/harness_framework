// Agent SDK + 구독 인증 스모크 테스트 (일회성 검증용).
// 실행: node scripts/agent-smoke.mjs
// 목적: claude.ts와 동일한 방식(systemPrompt + tools:[] + JSON 스키마 프롬프트)으로
//       구독 인증 호출이 되고, 채널 분석 JSON 스키마가 올바르게 반환되는지 확인.

import { query } from "@anthropic-ai/claude-agent-sdk";

console.log(
  "ANTHROPIC_API_KEY set in env?",
  process.env.ANTHROPIC_API_KEY ? "YES (구독 아님 — API 키 우선됨)" : "no",
);

const SYSTEM_JSON =
  "너는 데이터 분석 결과를 JSON으로만 반환하는 도우미다. " +
  "코드펜스(```), 머리말, 설명 없이 — 사용자가 요청한 스키마에 정확히 맞는 " +
  "유효한 JSON 객체 하나만 출력하라. 모든 텍스트 값은 한국어로 작성한다.";

// claude.ts의 analyzeChannel 프롬프트와 동일한 형태(모의 데이터)
const prompt = [
  "다음 유튜브 채널의 최근 영상을 보고 채널의 컨텐츠 정체성을 진단하세요.",
  "",
  "채널명: 테크리뷰랩",
  "구독자 수: 120000",
  "",
  "최근 영상:",
  '1. "2026 가성비 노트북 TOP5" | 조회수 320000 | 2026-05-01',
  '2. "맥북 vs 갤럭시북 솔직비교" | 조회수 210000 | 2026-05-10',
  '3. "10만원대 무선이어폰 끝장리뷰" | 조회수 180000 | 2026-05-20',
  "",
  "다음 JSON 스키마로만 답하세요:",
  "{",
  '  "summary": string,',
  '  "topics": string[],',
  '  "tone": string,',
  '  "searchKeywords": string[]',
  "}",
].join("\n");

try {
  let finalText = null;
  for await (const m of query({
    prompt,
    options: {
      systemPrompt: SYSTEM_JSON,
      model: "claude-sonnet-4-6",
      tools: [],
      maxTurns: 1,
    },
  })) {
    if (m.type === "result") {
      if (m.subtype !== "success") throw new Error(`실패: ${m.subtype}`);
      finalText = m.result;
    }
  }
  const cleaned = finalText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  const data = JSON.parse(cleaned);
  const ok =
    typeof data.summary === "string" &&
    Array.isArray(data.topics) &&
    typeof data.tone === "string" &&
    Array.isArray(data.searchKeywords);
  console.log("스키마 4개 키 충족?", ok ? "YES ✅" : "NO ❌");
  console.log(JSON.stringify(data, null, 2));
  process.exit(ok ? 0 : 1);
} catch (err) {
  console.error("호출/파싱 실패:", err?.message ?? err);
  process.exit(1);
}

// Agent SDK + 구독 인증 스모크 테스트 (일회성 검증용).
// 실행: node scripts/agent-smoke.mjs
// 목적: @anthropic-ai/claude-agent-sdk의 query()가 이 기기의 Claude Code 자격증명
//       (구독 또는 API 키)으로 동작하는지, 순수 텍스트 1-shot 호출이 되는지 확인.

import { query } from "@anthropic-ai/claude-agent-sdk";

console.log(
  "ANTHROPIC_API_KEY set in env?",
  process.env.ANTHROPIC_API_KEY ? "YES (구독 아님 — API 키 우선됨)" : "no",
);

const prompt =
  '다음 JSON만 출력하라(마크다운 금지): {"ok": true, "msg": "한 문장 한국어 인사"}';

try {
  let result = null;
  for await (const m of query({
    prompt,
    options: {
      systemPrompt:
        "너는 JSON만 출력하는 도우미다. 코드펜스/설명 없이 유효한 JSON 객체 하나만 출력하라.",
      model: "claude-sonnet-4-6",
      tools: [], // 모든 내장 도구 끔 = 순수 생성
      maxTurns: 1,
    },
  })) {
    if (m.type === "result") {
      result = m;
    }
  }

  if (!result) {
    console.error("결과 메시지를 받지 못했습니다.");
    process.exit(1);
  }
  console.log("subtype:", result.subtype);
  console.log("is_error:", result.is_error);
  console.log("model usage keys:", Object.keys(result.modelUsage ?? {}));
  console.log("total_cost_usd:", result.total_cost_usd);
  console.log("result text:", result.result);
} catch (err) {
  console.error("호출 실패:", err?.message ?? err);
  process.exit(1);
}

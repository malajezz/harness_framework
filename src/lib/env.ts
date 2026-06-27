// 서버 전용 환경변수 로딩 헬퍼.
// 외부 API 키는 반드시 서버 환경변수로만 읽는다(NEXT_PUBLIC_ 금지 — 클라이언트 번들 노출 방지).
// 누락 시 어떤 키가 없는지와 .env.local에 넣으라는 안내를 담아 throw 한다.

function readRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `환경변수 ${name}가 설정되지 않았습니다. 프로젝트 루트의 .env.local에 ` +
        `${name}=<발급받은 키> 형태로 추가하세요. (예시는 .env.example 참고)`,
    );
  }
  return value;
}

export function getYoutubeApiKey(): string {
  return readRequiredEnv("YOUTUBE_API_KEY");
}

// 참고: Claude는 @anthropic-ai/claude-agent-sdk가 이 기기의 Claude Code 자격증명
// (Pro/Max 구독 또는 CLAUDE_CODE_OAUTH_TOKEN)으로 인증하므로 환경변수 키가 필요 없다.
// ANTHROPIC_API_KEY를 설정하면 구독보다 우선되어 종량제 과금되니 .env.local에 넣지 말 것.

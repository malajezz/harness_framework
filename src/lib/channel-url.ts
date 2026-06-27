// 입력 문자열(@handle / 채널 URL / 순수 UC ID)에서 채널 식별자를 뽑는 순수 함수.
// 네트워크·부수효과 없음. 실제 YouTube 조회는 services/youtube.ts에서 한다.

export type ChannelRef =
  | { type: "handle"; value: string } // "@" 제외한 handle
  | { type: "id"; value: string }; // UC... 채널 ID

// UC로 시작하는 24자(UC + 22자) 채널 ID 패턴.
const CHANNEL_ID_RE = /^UC[0-9A-Za-z_-]{22}$/;

export function parseChannelInput(input: string): ChannelRef {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("채널 입력이 비어 있습니다.");
  }

  // 1) 순수 채널 ID (UC + 22자)
  if (CHANNEL_ID_RE.test(trimmed)) {
    return { type: "id", value: trimmed };
  }

  // 2) "@handle" (URL 아닌 단일 핸들)
  if (trimmed.startsWith("@")) {
    return { type: "handle", value: stripAt(trimmed) };
  }

  // 3) URL 형태 — 경로 세그먼트에서 식별자 추출
  const segments = extractPath(trimmed).split("/").filter(Boolean);

  // /channel/UC.. → id
  const channelIdx = segments.indexOf("channel");
  if (channelIdx >= 0 && segments[channelIdx + 1]) {
    return { type: "id", value: segments[channelIdx + 1] };
  }

  // /@handle → handle
  const atSeg = segments.find((s) => s.startsWith("@"));
  if (atSeg) {
    return { type: "handle", value: stripAt(atSeg) };
  }

  // /c/Name, /user/Name → handle (이름을 핸들처럼 사용)
  for (const key of ["c", "user"]) {
    const idx = segments.indexOf(key);
    if (idx >= 0 && segments[idx + 1]) {
      return { type: "handle", value: segments[idx + 1] };
    }
  }

  // 4) 애매하면 handle로 처리(선행 @ 제거)
  return { type: "handle", value: stripAt(trimmed) };
}

function stripAt(s: string): string {
  return s.startsWith("@") ? s.slice(1) : s;
}

// URL(프로토콜 유무 무관) 또는 일반 문자열에서 경로 부분을 얻는다.
function extractPath(s: string): string {
  try {
    const url = new URL(s.includes("://") ? s : `https://${s}`);
    return url.pathname;
  } catch {
    return s;
  }
}

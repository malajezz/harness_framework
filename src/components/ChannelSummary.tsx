// 채널 진단: 채널 기본 정보 + Claude 분석 요약/주제 태그 표시.
// 표시 전용 — props만 받아 렌더한다(외부 호출·데이터 계산 금지).

import type { ChannelAnalysis, ChannelInfo } from "@/types";

// 큰 수치를 한국어 축약 표기(예: 12.3만). 표시용 포맷일 뿐 도메인 로직 아님.
function formatCompact(n: number): string {
  return new Intl.NumberFormat("ko-KR", { notation: "compact" }).format(n);
}

export default function ChannelSummary({
  channel,
  analysis,
}: {
  channel: ChannelInfo;
  analysis: ChannelAnalysis;
}) {
  return (
    <section className="rounded-lg border border-neutral-800 bg-[#141414] p-6">
      <h2 className="text-sm font-medium text-neutral-400">채널 진단</h2>

      <div className="mt-4 flex items-start gap-4">
        {channel.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={channel.thumbnailUrl}
            alt={channel.title}
            width={64}
            height={64}
            className="h-16 w-16 shrink-0 rounded-full border border-neutral-800"
          />
        ) : null}

        <div className="min-w-0">
          <p className="text-base font-medium text-white">{channel.title}</p>
          {channel.handle ? (
            <p className="text-sm text-neutral-500">{channel.handle}</p>
          ) : null}
          <div className="mt-1 flex gap-4 text-sm text-neutral-400">
            <span>
              구독자{" "}
              <span className="font-medium text-white tabular-nums">
                {formatCompact(channel.subscriberCount)}
              </span>
            </span>
            <span>
              영상{" "}
              <span className="font-medium text-white tabular-nums">
                {formatCompact(channel.videoCount)}
              </span>
            </span>
          </div>
        </div>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-neutral-300">
        {analysis.summary}
      </p>

      {analysis.tone ? (
        <p className="mt-2 text-sm text-neutral-500">톤 · {analysis.tone}</p>
      ) : null}

      {analysis.topics.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {analysis.topics.map((topic) => (
            <span
              key={topic}
              className="rounded-md border border-neutral-800 bg-neutral-900 px-2.5 py-1 text-xs text-neutral-300"
            >
              {topic}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}

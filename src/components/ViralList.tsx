// 뜨는 영상: 일평균 조회수(= viral 점수) 기준 정렬된 영상 목록.
// 표시 전용 — props만 받아 렌더한다. 각 항목은 해당 YouTube 영상으로 링크(새 탭).

import type { ViralVideo } from "@/types";

// 큰 수치를 한국어 축약 표기(예: 12.3만). 표시용 포맷일 뿐 도메인 로직 아님.
function formatCompact(n: number): string {
  return new Intl.NumberFormat("ko-KR", { notation: "compact" }).format(n);
}

// 업로드 후 경과 표기(표시용). viral 점수 계산은 서버(lib/viral-score)에서 끝났다.
function elapsedLabel(publishedAt: string): string {
  const days = Math.max(
    1,
    Math.floor((Date.now() - new Date(publishedAt).getTime()) / 86_400_000),
  );
  if (days < 30) return `${days}일 전`;
  if (days < 365) return `${Math.floor(days / 30)}개월 전`;
  return `${Math.floor(days / 365)}년 전`;
}

export default function ViralList({
  viralVideos,
}: {
  viralVideos: ViralVideo[];
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium text-neutral-400">
        같은 분야에서 뜨는 영상
      </h2>

      {viralVideos.length === 0 ? (
        <p className="text-sm text-neutral-500">표시할 영상이 없습니다.</p>
      ) : (
        <ul className="space-y-3">
          {viralVideos.map((v, i) => (
            <li key={v.videoId}>
              <a
                href={`https://www.youtube.com/watch?v=${v.videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex gap-4 rounded-lg border border-neutral-800 bg-[#141414] p-4 hover:border-neutral-600"
              >
                <span className="w-5 shrink-0 text-sm font-medium tabular-nums text-neutral-500">
                  {i + 1}
                </span>

                {v.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={v.thumbnailUrl}
                    alt={v.title}
                    width={120}
                    height={68}
                    className="h-[68px] w-[120px] shrink-0 rounded-md object-cover"
                  />
                ) : null}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">
                    {v.title}
                  </p>
                  <p className="mt-0.5 text-sm text-neutral-500">
                    {v.channelTitle}
                  </p>
                  <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm text-neutral-400">
                    <span>
                      조회수{" "}
                      <span className="font-medium tabular-nums text-white">
                        {formatCompact(v.viewCount)}
                      </span>
                    </span>
                    <span>{elapsedLabel(v.publishedAt)}</span>
                    {/* 포인트색 red-500 = viral 강조(일평균 조회수) */}
                    <span className="text-red-500">
                      일평균{" "}
                      <span className="text-base font-medium tabular-nums">
                        {formatCompact(Math.round(v.viewsPerDay))}
                      </span>
                    </span>
                  </div>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// 차기 컨텐츠 추천: 제목 + 근거(rationale) + 참고 영상(inspiredBy, 있으면) 카드 그리드.
// 표시 전용 — props만 받아 렌더한다.

import type { Recommendation } from "@/types";

export default function RecommendationCard({
  recommendations,
}: {
  recommendations: Recommendation[];
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium text-neutral-400">차기 컨텐츠 추천</h2>

      {recommendations.length === 0 ? (
        <p className="text-sm text-neutral-500">추천이 없습니다.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {recommendations.map((rec, i) => (
            <article
              key={i}
              className="rounded-lg border border-neutral-800 bg-[#141414] p-5"
            >
              <h3 className="text-sm font-medium leading-relaxed text-white">
                {rec.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-300">
                {rec.rationale}
              </p>
              {rec.inspiredBy ? (
                <p className="mt-3 border-t border-neutral-800 pt-3 text-xs text-neutral-500">
                  참고 · {rec.inspiredBy}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

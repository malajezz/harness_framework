"use client";

// 단일 페이지: 입력 → 로딩 → 결과/에러를 상태로 전환.
// 외부 API는 절대 직접 호출하지 않는다 — 자체 라우트 /api/analyze만 호출(ARCHITECTURE.md).

import { useState } from "react";
import type { AnalyzeResponse } from "@/types";
import ChannelSummary from "@/components/ChannelSummary";
import ViralList from "@/components/ViralList";
import RecommendationCard from "@/components/RecommendationCard";

export default function Home() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ input: trimmed }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "분석에 실패했습니다.");
        return;
      }

      const data = (await res.json()) as AnalyzeResponse;
      setResult(data);
    } catch {
      setError("요청 중 네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <header>
        <h1 className="text-3xl font-semibold text-white">TubeNext</h1>
        <p className="mt-2 text-sm text-neutral-400">
          YouTube 채널을 분석해 다음에 만들 컨텐츠를 추천합니다.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="mt-8 flex gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="@handle 또는 채널 URL"
          disabled={loading}
          className="flex-1 rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:border-neutral-600 focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-lg bg-white px-5 py-3 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-50"
        >
          {loading ? "분석 중…" : "분석"}
        </button>
      </form>

      {loading ? (
        <p className="mt-6 text-sm text-neutral-400">
          채널을 분석하고 뜨는 영상을 찾는 중…
        </p>
      ) : null}

      {error ? (
        <div className="mt-6 rounded-lg border border-neutral-800 bg-[#141414] p-4 text-sm text-neutral-300">
          {error}
        </div>
      ) : null}

      {result ? (
        <div className="fade-in mt-8 space-y-8">
          <ChannelSummary channel={result.channel} analysis={result.analysis} />
          <ViralList viralVideos={result.viralVideos} />
          <RecommendationCard recommendations={result.recommendations} />
        </div>
      ) : null}
    </main>
  );
}

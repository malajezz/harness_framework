import { describe, it, expect } from "vitest";
import { daysSince, viewsPerDay } from "./viral-score";

describe("daysSince", () => {
  it("경과일을 계산한다", () => {
    const now = new Date("2026-01-11T00:00:00Z");
    expect(daysSince("2026-01-01T00:00:00Z", now)).toBe(10);
  });

  it("당일 업로드는 0으로 나누기 방지를 위해 최소 1을 반환한다", () => {
    const now = new Date("2026-01-01T06:00:00Z");
    expect(daysSince("2026-01-01T00:00:00Z", now)).toBe(1);
  });

  it("미래 publishedAt(음수 경과)도 최소 1을 반환한다", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    expect(daysSince("2026-01-02T00:00:00Z", now)).toBe(1);
  });
});

describe("viewsPerDay", () => {
  it("조회수 / 경과일을 반환한다", () => {
    const now = new Date("2026-01-11T00:00:00Z");
    expect(viewsPerDay(1000, "2026-01-01T00:00:00Z", now)).toBe(100);
  });

  it("조회수가 같다면 최근 영상에 더 높은 점수를 준다", () => {
    const now = new Date("2026-01-31T00:00:00Z");
    const recent = viewsPerDay(10000, "2026-01-21T00:00:00Z", now); // 10일 경과
    const older = viewsPerDay(10000, "2026-01-01T00:00:00Z", now); // 30일 경과
    expect(recent).toBeGreaterThan(older);
  });
});

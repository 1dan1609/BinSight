import { describe, expect, it } from "vitest";
import { DailyQuota } from "../src/lib/dailyQuota.js";

describe("DailyQuota", () => {
  it("allows requests under the cap and increments the count", () => {
    const quota = new DailyQuota(":memory:");
    const first = quota.tryConsume(3);
    const second = quota.tryConsume(3);
    expect(first).toEqual({ allowed: true, count: 1, max: 3 });
    expect(second).toEqual({ allowed: true, count: 2, max: 3 });
    quota.close();
  });

  it("blocks requests once the cap is reached", () => {
    const quota = new DailyQuota(":memory:");
    quota.tryConsume(2);
    quota.tryConsume(2);
    const third = quota.tryConsume(2);
    expect(third.allowed).toBe(false);
    expect(third.count).toBe(2);
    quota.close();
  });

  it("keeps count stable across many calls once blocked (no overcounting)", () => {
    const quota = new DailyQuota(":memory:");
    for (let i = 0; i < 5; i++) quota.tryConsume(1);
    const result = quota.tryConsume(1);
    expect(result).toEqual({ allowed: false, count: 1, max: 1 });
    quota.close();
  });
});

import { describe, expect, it } from "vitest";
import { buildReportPrompt } from "../src/services/promptBuilder.js";
import { MINIMAL_INDICATORS } from "./fixtures.js";

describe("buildReportPrompt", () => {
  it("delimits the untrusted indicators block clearly", () => {
    const { user } = buildReportPrompt(MINIMAL_INDICATORS);
    expect(user).toContain("<untrusted_indicators>");
    expect(user).toContain("</untrusted_indicators>");
  });

  it("instructs the model to treat indicator content as data, not instructions", () => {
    const { system } = buildReportPrompt(MINIMAL_INDICATORS);
    expect(system.toLowerCase()).toContain("untrusted");
    expect(system.toLowerCase()).toContain("data to analyze");
  });

  it("truncates an oversized strings list rather than including it all", () => {
    const bloated = {
      ...MINIMAL_INDICATORS,
      strings: Array.from({ length: 5000 }, (_, i) => ({
        value: `string-${i}`,
        category: "OTHER" as const,
        score: Math.random(),
      })),
    };
    const { user } = buildReportPrompt(bloated);
    const occurrences = user.match(/"value":/g)?.length ?? 0;
    expect(occurrences).toBeLessThanOrEqual(150);
  });
});

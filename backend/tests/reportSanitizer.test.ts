import { describe, expect, it } from "vitest";
import { sanitizeReport } from "../src/services/reportSanitizer.js";

describe("sanitizeReport", () => {
  it("leaves no character that could open an HTML element", () => {
    const payloads = [
      // The case the previous strip-based implementation missed entirely: with no closing ">"
      // the regex never matched, so this passed through verbatim. Lenient HTML parsers
      // complete an unterminated tag at EOF.
      "<img src=x onerror=alert(1)",
      "<img\nsrc=x\nonerror=alert(1)",
      "<script>alert(1)</script>",
      "<scr<x>ipt>alert(1)</script>",
      "<<script>alert(1)</script>",
      '<img src="x" onerror="alert(1)">',
      "<!-- comment --><svg/onload=alert(1)>",
    ];

    for (const payload of payloads) {
      expect(sanitizeReport(payload).markdown).not.toContain("<");
    }
  });

  it("preserves ordinary markdown", () => {
    const markdown = "## Summary\n\n- entropy is **7.9**\n- imports `LoadLibraryA`\n";
    expect(sanitizeReport(markdown).markdown).toBe(markdown);
  });

  it("truncates past the max length and flags it", () => {
    const result = sanitizeReport("a".repeat(25_000));
    expect(result.truncated).toBe(true);
    expect(result.markdown).toContain("_[report truncated]_");
  });

  it("does not report truncation for short input", () => {
    expect(sanitizeReport("short").truncated).toBe(false);
  });
});

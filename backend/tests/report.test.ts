import type { FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../src/app.js";
import { MINIMAL_INDICATORS } from "./fixtures.js";

function mockChatCompletionOnce(content: string, model = "mock-model"): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Promise.resolve(
        new Response(JSON.stringify({ model, choices: [{ message: { content } }] }), {
          status: 200,
        }),
      ),
    ),
  );
}

describe("POST /api/v1/report", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects a payload missing required fields", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/report",
      payload: { mode: "hosted" },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe("INVALID_PAYLOAD");
  });

  it("rejects a payload with an unknown field (strict schema)", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/report",
      payload: { indicators: MINIMAL_INDICATORS, mode: "hosted", extraField: "nope" },
    });

    expect(response.statusCode).toBe(400);
  });

  it("rejects byok mode without byokConfig", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/report",
      payload: { indicators: MINIMAL_INDICATORS, mode: "byok" },
    });

    expect(response.statusCode).toBe(400);
  });

  it("never forwards the raw file — only indicators cross the API boundary", () => {
    // Structural assertion: IndicatorsJson has no field capable of carrying raw file bytes.
    expect(Object.keys(MINIMAL_INDICATORS)).not.toContain("fileBytes");
    expect(Object.keys(MINIMAL_INDICATORS)).not.toContain("rawFile");
  });

  it("returns a generated report for a valid hosted-mode request, without hitting a real provider", async () => {
    mockChatCompletionOnce("## Summary\nLooks benign.");

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/report",
      payload: { indicators: MINIMAL_INDICATORS, mode: "hosted" },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.markdown).toContain("## Summary");
    expect(body.modelUsed).toBe("mock-model");
    expect(fetch).toHaveBeenCalledTimes(1);

    const [, requestInit] = vi.mocked(fetch).mock.calls[0]!;
    const requestBody = JSON.parse((requestInit as RequestInit).body as string) as {
      messages: { role: string; content: string }[];
    };
    const userMessage = requestBody.messages.find((m) => m.role === "user")!;
    expect(userMessage.content).toContain("<untrusted_indicators>");
    expect(userMessage.content).toContain("</untrusted_indicators>");
  });

  it("returns a generated report for a valid byok request against the allow-listed provider URL only", async () => {
    mockChatCompletionOnce("## Summary\nByok works.");

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/report",
      payload: {
        indicators: MINIMAL_INDICATORS,
        mode: "byok",
        byokConfig: { provider: "openai", apiKey: "sk-test-not-real" },
      },
    });

    expect(response.statusCode).toBe(200);
    const [url] = vi.mocked(fetch).mock.calls[0]!;
    expect(url).toBe("https://api.openai.com/v1/chat/completions");
  });

  it("returns PROVIDER_ERROR when the upstream provider fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Promise.resolve(new Response("rate limited", { status: 429 }))),
    );

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/report",
      payload: { indicators: MINIMAL_INDICATORS, mode: "hosted" },
    });

    expect(response.statusCode).toBe(502);
    expect(response.json().code).toBe("PROVIDER_ERROR");
  });
});

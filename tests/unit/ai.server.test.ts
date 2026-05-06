import { describe, expect, it } from "vitest";
import {
  AiProviderError,
  getDefaultAiModelId,
  resolveAiModelId,
  serializeAiError,
} from "../../app/ai.server";

describe("ai.server", () => {
  it("resolves legacy and invalid model ids to supported ids", () => {
    expect(resolveAiModelId("openai-gpt-5-4-mini")).toBe("pro");
    expect(resolveAiModelId("gemini-3-flash-preview")).toBe(getDefaultAiModelId());
    expect(resolveAiModelId("missing-model")).toBe(getDefaultAiModelId());
  });

  it("serializes provider errors without exposing credentials", () => {
    const error = new AiProviderError("Provider failed", {
      status: 429,
      provider: "openai",
      model: "gpt-test",
      details: { code: "rate_limit" },
    });

    expect(serializeAiError(error)).toMatchObject({
      message: "Provider failed",
      status: 429,
      provider: "openai",
      model: "gpt-test",
      details: { code: "rate_limit" },
    });
  });
});

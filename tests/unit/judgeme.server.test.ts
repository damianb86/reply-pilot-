import { describe, expect, it, vi } from "vitest";
import {
  JudgeMeApiError,
  decryptSecret,
  encryptSecret,
  maskJudgeMeToken,
  serializeJudgeMeError,
} from "../../app/judgeme.server";

describe("judgeme.server", () => {
  it("encrypts and decrypts API tokens", () => {
    vi.stubEnv("JUDGEME_TOKEN_ENCRYPTION_KEY", "unit-test-key");
    const encrypted = encryptSecret("private-token-123");

    expect(encrypted).not.toBe("private-token-123");
    expect(decryptSecret(encrypted)).toBe("private-token-123");
  });

  it("returns legacy plaintext values when ciphertext format is unknown", () => {
    expect(decryptSecret("plain-token")).toBe("plain-token");
  });

  it("masks Judge.me tokens for UI and logs", () => {
    expect(maskJudgeMeToken("short")).toBe("••••");
    expect(maskJudgeMeToken("abcd1234567890")).toBe("abcd••••7890");
  });

  it("serializes Judge.me API errors", () => {
    const error = new JudgeMeApiError("Judge.me failed", {
      status: 401,
      statusText: "Unauthorized",
      details: { error: "bad token" },
    });

    expect(serializeJudgeMeError(error)).toMatchObject({
      message: "Judge.me failed",
      status: 401,
      statusText: "Unauthorized",
      details: { error: "bad token" },
    });
  });
});

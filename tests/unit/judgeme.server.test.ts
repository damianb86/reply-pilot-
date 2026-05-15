import { afterEach, describe, expect, it, vi } from "vitest";
import {
  JudgeMeApiError,
  decryptSecret,
  encryptSecret,
  isJudgeMeTestDomainFieldEnabled,
  maskJudgeMeToken,
  serializeJudgeMeError,
} from "../../app/judgeme.server";

describe("judgeme.server", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

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

  it("only enables the Judge.me test domain field from an explicit environment flag", () => {
    vi.stubEnv("JUDGEME_TEST_DOMAIN_FIELD_ENABLED", "");
    expect(isJudgeMeTestDomainFieldEnabled()).toBe(false);

    vi.stubEnv("JUDGEME_TEST_DOMAIN_FIELD_ENABLED", "true");
    expect(isJudgeMeTestDomainFieldEnabled()).toBe(true);

    vi.stubEnv("JUDGEME_TEST_DOMAIN_FIELD_ENABLED", "1");
    expect(isJudgeMeTestDomainFieldEnabled()).toBe(true);

    vi.stubEnv("JUDGEME_TEST_DOMAIN_FIELD_ENABLED", "false");
    expect(isJudgeMeTestDomainFieldEnabled()).toBe(false);
  });
});

import { createHmac } from "node:crypto";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("../../app/shopify.server", () => ({
  authenticate: {
    webhook: vi.fn(),
  },
}));

let verifyWebhookHmac: typeof import("../../app/webhooks.server").verifyWebhookHmac;

beforeAll(async () => {
  ({ verifyWebhookHmac } = await import("../../app/webhooks.server"));
});

function signedWebhookRequest(body: string, secret: string, hmac?: string) {
  const signature =
    hmac ?? createHmac("sha256", secret).update(body).digest("base64");

  return new Request("https://replypilot.example/webhooks/app/uninstalled", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-shopify-hmac-sha256": signature,
    },
    body,
  });
}

describe("webhooks.server", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("validates Shopify webhook HMAC signatures using the raw body", async () => {
    vi.stubEnv("SHOPIFY_API_SECRET", "unit-test-secret");
    const body = JSON.stringify({
      shop_domain: "reply-pilot-dev.myshopify.com",
    });

    await expect(
      verifyWebhookHmac(signedWebhookRequest(body, "unit-test-secret")),
    ).resolves.toBe(true);
  });

  it("rejects missing or mismatched Shopify webhook HMAC signatures", async () => {
    vi.stubEnv("SHOPIFY_API_SECRET", "unit-test-secret");
    const body = JSON.stringify({
      shop_domain: "reply-pilot-dev.myshopify.com",
    });

    await expect(
      verifyWebhookHmac(signedWebhookRequest(body, "wrong-secret")),
    ).resolves.toBe(false);

    await expect(
      verifyWebhookHmac(
        new Request("https://replypilot.example/webhooks/app/uninstalled", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body,
        }),
      ),
    ).resolves.toBe(false);
  });
});

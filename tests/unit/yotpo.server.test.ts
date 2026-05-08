import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import {
  YotpoApiError,
  fetchYotpoReviews,
  generateYotpoCoreAccessToken,
  sendYotpoReviewComment,
  serializeYotpoError,
} from "../../app/yotpo.server";
import { server } from "../mocks/server";

describe("yotpo.server", () => {
  it("generates a Core API access token with Store ID and API secret", async () => {
    server.use(
      http.post("https://api.yotpo.com/core/v3/stores/store-123/access_tokens", async ({ request }) => {
        await expect(request.json()).resolves.toEqual({ secret: "secret-123" });
        return HttpResponse.json({ access_token: "core-token-123" });
      }),
    );

    await expect(generateYotpoCoreAccessToken("store-123", "secret-123")).resolves.toBe("core-token-123");
  });

  it("falls back to the legacy OAuth token endpoint when Core v3 token generation is unavailable", async () => {
    server.use(
      http.post("https://api.yotpo.com/core/v3/stores/store-123/access_tokens", () =>
        HttpResponse.json({ message: "Not found" }, { status: 404 }),
      ),
      http.post("https://api.yotpo.com/oauth/token", async ({ request }) => {
        await expect(request.json()).resolves.toMatchObject({
          client_id: "store-123",
          client_secret: "secret-123",
          grant_type: "client_credentials",
        });
        return HttpResponse.json({ access_token: "legacy-token-123" });
      }),
    );

    await expect(generateYotpoCoreAccessToken("store-123", "secret-123")).resolves.toBe("legacy-token-123");
  });

  it("fetches reviews from the App Developer API when a developer access token is configured", async () => {
    server.use(
      http.get("https://developers.yotpo.com/v2/store-123/reviews", ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get("access_token")).toBe("developer-token-123");
        expect(url.searchParams.get("include_nested")).toBe("true");

        return HttpResponse.json({
          response: {
            reviews: [
              {
                id: 45,
                score: 5,
                content: "Loved it.",
                user: { display_name: "Ana" },
              },
            ],
            pagination: { total: 1 },
          },
        });
      }),
    );

    await expect(fetchYotpoReviews({
      storeId: "store-123",
      apiSecret: "secret-123",
      developerAccessToken: "developer-token-123",
    })).resolves.toMatchObject({
      reviewCount: 1,
      source: "developer_api",
      reviews: [{ id: 45 }],
    });
  });

  it("posts a public review comment through the App Developer API", async () => {
    server.use(
      http.post("https://developers.yotpo.com/v2/store-123/reviews/review-45/comment", async ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get("access_token")).toBe("developer-token-123");
        expect(request.headers.get("authorization")).toBe("Bearer developer-token-123");
        await expect(request.json()).resolves.toEqual({
          content: "Thanks for your review.",
          public: true,
        });

        return HttpResponse.json({ response: { id: "comment-1" } });
      }),
    );

    await expect(sendYotpoReviewComment({
      credentials: {
        storeId: "store-123",
        apiSecret: "secret-123",
        developerAccessToken: "developer-token-123",
      },
      reviewId: "review-45",
      content: "Thanks for your review.",
    })).resolves.toMatchObject({ response: { id: "comment-1" } });
  });

  it("serializes Yotpo API errors without exposing credentials", () => {
    const error = new YotpoApiError("Yotpo failed", {
      status: 401,
      statusText: "Unauthorized",
      details: { endpoint: "/reviews" },
    });

    expect(serializeYotpoError(error)).toMatchObject({
      message: "Yotpo failed",
      status: 401,
      statusText: "Unauthorized",
      details: { endpoint: "/reviews" },
    });
  });
});

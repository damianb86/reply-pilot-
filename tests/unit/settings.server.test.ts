import { describe, expect, it } from "vitest";
import {
  DEFAULT_APP_SETTINGS,
  isSameTimeZoneDay,
  isSensitiveReview,
  recentTimeZoneDays,
  reviewNeedsHuman,
  settingsFromFormData,
  timeZoneDayKey,
} from "../../app/settings.server";
import { settings } from "../fixtures/reply-pilot";

describe("settings.server", () => {
  it("normalizes form settings and clamps thresholds", () => {
    const form = new FormData();
    form.set("highConfidenceThreshold", "120");
    form.set("humanReviewThreshold", "bad");
    form.set("defaultQueueRange", "invalid");
    form.set("defaultQueueSort", "oldest");
    form.set("dataRetention", "24-months");
    form.set("timezone", "Invalid/Zone");
    form.set("routeSensitiveReviews", "on");

    const result = settingsFromFormData(form);

    expect(result.highConfidenceThreshold).toBe(98);
    expect(result.humanReviewThreshold).toBe(DEFAULT_APP_SETTINGS.humanReviewThreshold);
    expect(result.defaultQueueRange).toBe(DEFAULT_APP_SETTINGS.defaultQueueRange);
    expect(result.defaultQueueSort).toBe("oldest");
    expect(result.dataRetention).toBe("24-months");
    expect(result.timezone).toBe(DEFAULT_APP_SETTINGS.timezone);
    expect(result.routeSensitiveReviews).toBe(true);
  });

  it("detects sensitive reviews in English and Spanish copy", () => {
    expect(isSensitiveReview("The product arrived broken and I want a refund.")).toBe(true);
    expect(isSensitiveReview("El producto llego roto y necesito reembolso.")).toBe(true);
    expect(isSensitiveReview("Beautiful quality and fast shipping.")).toBe(true);
    expect(isSensitiveReview("Beautiful quality and great color.")).toBe(false);
  });

  it("routes sensitive, low-confidence, and low-star reviews to human review", () => {
    expect(
      reviewNeedsHuman({
        reviewBody: "The item arrived broken.",
        rating: 5,
        confidence: 95,
        settings: settings.strictReview,
      }),
    ).toBe(true);

    expect(
      reviewNeedsHuman({
        reviewBody: "Nice product.",
        rating: 5,
        confidence: 60,
        settings: settings.strictReview,
      }),
    ).toBe(true);

    expect(
      reviewNeedsHuman({
        reviewBody: "Nice product.",
        rating: 5,
        confidence: 95,
        settings: settings.strictReview,
      }),
    ).toBe(false);
  });

  it("builds timezone-safe day keys", () => {
    const date = new Date("2026-05-06T03:00:00.000Z");

    expect(timeZoneDayKey(date, "America/Argentina/Cordoba")).toBe("2026-05-06");
    expect(isSameTimeZoneDay(date, new Date("2026-05-06T12:00:00.000Z"), "America/Argentina/Cordoba")).toBe(true);
    expect(recentTimeZoneDays(3, "America/Argentina/Cordoba")).toHaveLength(3);
  });
});

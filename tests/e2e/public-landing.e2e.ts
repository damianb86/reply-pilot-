import { expect, test } from "@playwright/test";

test("public landing explains how to open Reply Pilot securely", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Reply Pilot" })).toBeVisible();
  await expect(page.getByText("AI drafts for Judge.me reviews")).toBeVisible();
  await expect(page.getByText("Open Reply Pilot from Shopify Admin")).toBeVisible();
});

test("public landing is readable on a narrow viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Reply Pilot" })).toBeVisible();
  await expect(page.getByText("Review queue")).toBeVisible();
});

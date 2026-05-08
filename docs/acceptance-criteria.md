# Acceptance criteria

- AC-001: Given the app is opened from Shopify Admin, When OAuth/session is valid, Then the merchant reaches the embedded dashboard.
- AC-002: Given the app is opened outside Shopify context, When no shop/host params exist, Then the public landing explains how to open securely.
- AC-003: Given no review provider is saved, When the merchant opens Connect, Then the UI explains setup and does not show Queue as connected.
- AC-004: Given invalid provider credentials, When the merchant attempts connection, Then the action returns a clear error and stores no raw secret.
- AC-005: Given valid provider credentials, When saved, Then credentials are encrypted, masked, and connection metadata is displayed.
- AC-006: Given reviews exist in Judge.me or Yotpo, When sync runs, Then `ReviewDraft` records are upserted by shop/source/sourceReviewId.
- AC-006a: Given Judge.me and Yotpo are both active, When Reviews loads or refreshes, Then both providers sync and the table shows the provider icon column.
- AC-007: Given insufficient credits, When AI generation is requested, Then generation fails safely and the UI receives a credit error.
- AC-008: Given AI provider failure after spend, When generation throws, Then credits are refunded.
- AC-009: Given a sensitive review, When routing is evaluated, Then it is flagged for human review.
- AC-010: Given malformed settings form data, When saved, Then values are normalized/clamped server-side.
- AC-011: Given Shopify Billing returns `userErrors`, When buying credits, Then no purchase is marked accepted.
- AC-012: Given privacy delete is requested, When the action succeeds, Then shop-scoped app data is deleted.
- AC-013: Given Shopify sends an invalid compliance webhook, When authentication fails, Then the endpoint returns a safe 400.
- AC-014: Given a narrow viewport, When public landing is opened, Then content remains readable without overlap.
- AC-015: Given keyboard/assistive tech usage, When the public landing is scanned, Then axe reports no obvious violations.

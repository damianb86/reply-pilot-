# Fixtures

Fixtures live in `tests/fixtures/reply-pilot.ts`.

## Shops
- Installed shop with `read_products`.
- Missing-scope shop.
- Expired session shape for future auth tests.

## Reviews
- Positive review for normal reply flow.
- Sensitive low-star review for human routing.

## Settings
- Default app settings.
- Strict review settings with high human review threshold.

## GraphQL
- Product success response.
- Top-level error response.

## Future fixture gaps
- Judge.me account snapshot success/error.
- Judge.me review list with existing replies.
- Shopify Billing accepted/declined/pending responses.
- AI provider valid, empty, malformed, and rate-limited responses.
- Compliance webhook HMAC examples.

# Assumptions

- ReplyPilot is a legacy production-oriented app, not a visual scaffold.
- Judge.me is the only provider with active backend integration today.
- OpenAI and Gemini credentials may be absent in local development, so tests avoid live provider calls.
- Local development uses SQLite through `prisma/schema.dev.prisma`; production uses PostgreSQL through `prisma/schema.prisma`.
- Billing uses Shopify one-time purchases for credit packs, not recurring subscriptions.
- Existing app code should remain stable; this QA pass avoids product refactors.

## Open questions
- Final App Store pricing and credit package copy.
- Whether Judge.me write/reply API is enabled for all target merchants.
- Background job runtime for large stores.
- Production log/metrics provider.
- App Store reviewer test account and fake Judge.me token strategy.

## Decisions made for this pass
- Add tests around exported pure helpers and safe server functions.
- Add E2E/a11y only for public unauthenticated landing to avoid fake OAuth.
- Document manual coverage for real Shopify OAuth, Judge.me, billing, and AI provider flows.

# Architecture

## App type
- Shopify embedded app.
- React Router template.
- App Store distribution.
- Polaris React UI legacy surface under `src/pages/*`.

## Route map
- `/`: public landing and secure-open guidance.
- `/auth/*`: Shopify OAuth routes.
- `/app`: authenticated layout and redirect.
- `/app/dashboard`: review provider connection dashboard for Judge.me and Yotpo.
- `/app/reviews`: review queue, sync, draft generation, revision, skip/restore, approve/send.
- `/app/settings`: general settings plus Brand Voice sections.
- `/app/brand-voice`: compatibility route redirect/action for Brand Voice.
- `/app/credits`: credit packages, Shopify Billing purchase flow, ledger.
- `/app/logs`: sent replies and audit/export view.
- `/app/help`: support, contact, and privacy data actions.
- `/webhooks/*`: Shopify compliance and app lifecycle webhooks.

## Server modules
- `app/shopify.server.ts`: Shopify app config, OAuth, session storage.
- `app/db.server.ts`: Prisma client; local dev SQLite override.
- `app/secret.server.ts`: shared AES-GCM secret encryption and masking helpers.
- `app/judgeme.server.ts`: Judge.me connection, API calls, and account snapshot.
- `app/yotpo.server.ts`: Yotpo Core/UGC/App Developer API calls, connection snapshot, and review comments.
- `app/review-providers.server.ts`: provider metadata and connect/refresh/disconnect dispatch.
- `app/reviews.server.ts`: multi-provider sync, queue data, AI draft lifecycle, and provider-specific send.
- `app/brand-voice.server.ts`: Brand Voice persistence, imported replies, personality and preview generation.
- `app/ai.server.ts`: AI provider/model selection, OpenAI/Gemini calls, serialization.
- `app/credits.server.ts`: credit accounts, ledger, purchases, billing finalization.
- `app/settings.server.ts`: app settings, routing rules, retention cleanup, timezone helpers.
- `app/sent.server.ts`: sent reply logs.
- `app/email.server.ts`: contact/privacy SMTP delivery.
- `app/webhooks.server.ts`: normalized webhook authentication.

## Provider notes
- Yotpo endpoint and credential details are documented in `docs/yotpo-integration.md`.

## Data model
- `Session`: Shopify OAuth/session token storage.
- `JudgeMeConnection`: legacy encrypted Judge.me credentials and metadata.
- `ReviewProviderConnection`: generic encrypted provider credentials and metadata for Yotpo and future providers.
- `ReviewDraft`: review import, draft, model, status, sent/skipped lifecycle.
- `BrandVoiceSetting`: merchant-specific voice and prompt controls.
- `AiProviderDailyState`: Gemini pool exhaustion state.
- `AppSetting`: queue/privacy behavior.
- `CreditAccount`, `CreditLedgerEntry`, `CreditPurchase`: credit economy and billing audit.
- `ContactRequest`: support/contact storage.

## Critical contracts
- All merchant records must include `shop`.
- Review provider credentials are stored encrypted and displayed masked.
- `ReviewDraft.source` identifies the provider; `shop/source/sourceReviewId` keeps provider imports isolated.
- AI generation must spend/refund credits consistently.
- Product data reads are read-only and require only `read_products`.
- Compliance delete actions remove shop-scoped data.

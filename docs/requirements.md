# Requirements

## Functional requirements
- FR-001: The app must run as a Shopify embedded app using React Router, App Bridge, OAuth/session storage, and Polaris UI.
- FR-002: The app must authenticate all `/app/*` routes with `authenticate.admin`.
- FR-003: The Connect dashboard must connect, refresh, and disconnect review provider credentials without exposing raw secrets after save.
- FR-004: Review provider credentials must be encrypted before persistence and masked in UI/data views.
- FR-005: The Reviews queue must sync Judge.me and Yotpo reviews into `ReviewDraft` records scoped by shop and provider source.
- FR-005a: If more than one review provider is active, Reviews must sync all active providers and show a provider mark at the left edge of each table row.
- FR-006: The Reviews queue must generate AI reply drafts only after checking available credits.
- FR-007: Failed AI generation must refund spent credits when a charge was taken.
- FR-008: Drafts must support edit, revise, skip, restore, approve, and send workflows.
- FR-009: Brand Voice must store personality, greeting, sign-off, always-mention rules, avoid phrases, model tier, preview review, product context, style, strength, and reply length.
- FR-010: Brand Voice generation and live preview must spend credits according to model tier and operation.
- FR-011: Sensitive reviews, low-confidence drafts, and low-star reviews must be routed to human review according to app settings.
- FR-012: Credits must track grants, purchases, spends, refunds, package purchase status, and ledger history.
- FR-013: Shopify Billing one-time purchase creation/finalization must handle GraphQL `errors` and `userErrors`.
- FR-014: Sent Logs must show shipped replies, AI model metadata, timing, filters, and CSV export client-side.
- FR-015: Help must store contact requests and support privacy data summary/delete actions.
- FR-016: GDPR/webhook endpoints must authenticate Shopify webhook requests and return safe status codes.
- FR-017: The app must support development SQLite and production PostgreSQL without leaking secrets.
- FR-018: The app must include automated unit/component/E2E/accessibility tests and CI.

## Non-functional requirements
- Security: OAuth tokens and review provider credentials must stay server-side; app secrets must be env vars only.
- Privacy: customer/review content is merchant data and must be minimized, scoped by shop, and deletable.
- Reliability: AI/provider/Shopify failures must return recoverable UI errors, not stack traces.
- Performance: review sync and queue lists must avoid blocking UI and use bounded API reads.
- Accessibility: public landing and core reusable components must be axe-tested; Polaris components should preserve labels and focus states.
- Maintainability: business rules should remain in server modules with unit tests.
- Observability: credit ledger, draft status, and error fields provide minimum auditability without PII-heavy logs.

## Required scopes
- `read_products`

## Explicitly avoided scopes
- `write_products`
- `read_orders`
- `read_customers`

## Required webhooks
- `app/uninstalled`
- `app/scopes_update`
- `customers/data_request`
- `customers/redact`
- `shop/redact`

## Required env vars
- `SHOPIFY_API_KEY`
- `SHOPIFY_API_SECRET`
- `SHOPIFY_APP_URL` or `PROD_SHOPIFY_APP_URL`
- `DATABASE_URL` in production
- `DEV_DATABASE_URL` in local development when overriding SQLite
- `REVIEW_PROVIDER_TOKEN_ENCRYPTION_KEY` or legacy `JUDGEME_TOKEN_ENCRYPTION_KEY`
- `YOTPO_CORE_API_BASE_URL`, `YOTPO_DEVELOPER_API_BASE_URL`, `YOTPO_API_TIMEOUT_MS`, `YOTPO_APP_DEVELOPER_ACCESS_TOKEN`
- `OPENAI_API_KEY` and/or `GEMINI_API_KEY`
- SMTP variables for contact/privacy emails

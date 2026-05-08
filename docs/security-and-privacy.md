# Security and privacy

## Secrets
- Do not commit `.env` or production credentials.
- `SHOPIFY_API_SECRET`, AI keys, SMTP password, and review provider encryption key must live in environment/secret manager.
- Judge.me private tokens, Yotpo API secrets, and Yotpo App Developer access tokens are encrypted with AES-GCM before persistence.
- Token display must use provider credential masks only.

## Merchant data
- Review text, customer names, product names, AI replies, and sent reply metadata are merchant data.
- Customer/order data is not requested through Shopify scopes.
- Review data must remain scoped by `shop`.
- Logs should avoid raw provider tokens, OAuth tokens, and large review bodies.

## AI safety
- AI calls happen server-side.
- API keys are never exposed to the browser.
- Prompts should use merchant-provided Brand Voice and review data only.
- Generated replies are drafts until merchant approval.
- Failed generation must not consume credits permanently.

## Privacy actions
- Help route supports privacy data summary and deletion.
- Compliance webhooks exist for customer/shop redact and data request.
- Manual QA must confirm data deletion removes all shop-scoped records and sessions.

## Production hardening
- Use PostgreSQL with managed backups and SSL as required by hosting provider.
- Use a unique production DB user and strong password.
- Use a dedicated `REVIEW_PROVIDER_TOKEN_ENCRYPTION_KEY`; do not rely on Shopify API key fallback in production.
- Configure SMTP only through secrets.

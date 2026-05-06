# Shopify integration

## CLI and config
- Shopify config: `shopify.app.toml`.
- Web process config: `shopify.web.toml`.
- Validation script: `npm run shopify:validate`.
- Build script: `npm run shopify:build`.

## Embedded admin behavior
- `app/routes/app.tsx` authenticates with `authenticate.admin`.
- `AppProvider` and App Bridge are used for embedded UI behavior.
- Navigation stays inside React Router routes.

## Admin API usage
- Product reads for Brand Voice product context use Admin GraphQL `products` and `product`.
- Billing uses Admin GraphQL one-time purchases.
- No product writes are required.

## Scopes
- Required: `read_products`
- Avoided: `write_products`, `read_orders`, `read_customers`

## Billing
- Credit packs use Shopify one-time app purchases.
- `SHOPIFY_BILLING_TEST` controls test purchases.
- Purchase finalization must handle pending, accepted, declined, cancelled, and unknown states.

## Webhooks
- App lifecycle: `app/uninstalled`, `app/scopes_update`.
- Compliance: `customers/data_request`, `customers/redact`, `shop/redact`.
- Webhook auth is normalized through `app/webhooks.server.ts`.

## Manual validation required
- OAuth install/reinstall in dev store.
- Billing approval screen and return URL.
- Embedded navigation inside Shopify Admin iframe.
- Staff user permission edge cases.
- Shopify App Store review credentials.

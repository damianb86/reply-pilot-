# Test matrix

| Area | Automatic coverage | Manual coverage |
| --- | --- | --- |
| Public landing | `tests/e2e/public-landing.e2e.ts` | Browser visual check |
| Accessibility | `tests/accessibility/public-landing.spec.ts` | Keyboard pass in Admin |
| Settings normalization | `tests/unit/settings.server.test.ts` | Save settings in Admin |
| Sensitive review routing | `tests/unit/settings.server.test.ts` | Low-star and sensitive review queue cases |
| Credits math | `tests/unit/credits.server.test.ts` | Billing purchase flow |
| Judge.me secret handling | `tests/unit/judgeme.server.test.ts` | Connect real test token |
| AI error handling | `tests/unit/ai.server.test.ts` | Provider outage/fallback with real keys |
| Product GraphQL parsing | `tests/unit/shopify-products.server.test.ts` | Product picker/context in Admin |
| Login errors | `tests/unit/login-error.test.ts` | Open outside Shopify |
| Loading component | `tests/components/PageLoadingState.test.jsx` | Page transition states |

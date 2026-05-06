# Implementation plan for QA hardening

## Changes added in this pass
- Add Vitest config and test setup.
- Add Playwright config for public smoke/a11y tests.
- Add MSW handlers and fixtures.
- Add unit tests for settings, credits, Judge.me helpers, AI serialization, Shopify product parsing, and login errors.
- Add component test for `PageLoadingState`.
- Add public landing E2E and axe accessibility test.
- Add GitHub Actions QA workflow.
- Add docs covering product, requirements, architecture, QA, fixtures, traceability, and App Store readiness.

## Files expected
- `docs/*.md`
- `tests/setup.ts`
- `tests/mocks/*`
- `tests/fixtures/*`
- `tests/unit/*`
- `tests/components/*`
- `tests/e2e/*`
- `tests/accessibility/*`
- `vitest.config.ts`
- `playwright.config.ts`
- `.github/workflows/qa.yml`

## Risk controls
- No product code refactor.
- Tests target exported helpers and public unauthenticated route.
- Real OAuth/Judge.me/billing/AI flows remain manual or require configured dev store credentials.

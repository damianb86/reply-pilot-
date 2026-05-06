# Legacy gap analysis

## What is now covered
- Documentation equivalent to newer projects.
- Unit tests for core exported helpers.
- Component smoke test.
- Public E2E and axe accessibility tests.
- GitHub Actions workflow.
- `qa` script includes automated tests.

## Remaining gaps
- No full embedded Shopify E2E without dev store/OAuth.
- No automated Judge.me provider contract tests beyond fixtures/MSW starter handlers.
- No automated billing approval test because Shopify-hosted confirmation is interactive.
- No automated AI generation test against real providers.
- Limited component tests for large Polaris pages due legacy page size and high UI complexity.
- `npm audit --omit=dev` is clean, but full `npm audit` still reports dev-only high severity findings in `@shopify/api-codegen-preset`/GraphQL Codegen and `@typescript-eslint` v6 transitive dependencies. The safe dry-run does not clear them; `npm audit fix --force` would apply breaking upgrades and should be handled as a separate dependency modernization task.

## Recommended next hardening
- Extract route action parsers into smaller pure functions for more unit coverage.
- Add integration tests with Prisma test database for credit spend/refund and review sync.
- Add provider contract fixtures for Judge.me real API response variants.
- Add Playwright authenticated smoke suite once a stable dev-store auth harness exists.

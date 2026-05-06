# QA plan

## Automated
- Unit: settings normalization, sensitive review routing, timezone helpers, credit cost math, error serialization, Judge.me token encryption/masking, Shopify product parsing.
- Component: loading state accessibility/copy.
- E2E: public landing smoke on desktop and mobile.
- Accessibility: axe scan on public landing.
- CI: typecheck, lint, unit tests, build, Shopify config validation/build, optional E2E/a11y.

## Manual
- Shopify OAuth install/reinstall.
- Embedded Admin navigation.
- Judge.me connect/refresh/disconnect with test token.
- Review sync with sandbox/fake review data.
- AI generation with OpenAI and Gemini keys.
- Credit spend/refund behavior during AI failures.
- Shopify Billing approval and return URL.
- Privacy data summary/delete.
- Compliance webhook delivery from Shopify.

## Blockers for full automation
- Shopify OAuth requires dev store context.
- Judge.me API requires merchant token or mocked provider contract.
- Shopify Billing approval requires interactive hosted flow.
- AI providers require paid/limited external keys.

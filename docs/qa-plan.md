# QA plan

## Automated
- Unit: settings normalization, sensitive review routing, timezone helpers, credit cost math, error serialization, Judge.me token encryption/masking, Yotpo token/review/comment API contracts, Shopify product parsing.
- Component: loading state accessibility/copy.
- E2E: public landing smoke on desktop and mobile.
- Accessibility: axe scan on public landing.
- CI: typecheck, lint, unit tests, build, Shopify config validation/build, optional E2E/a11y.

## Manual
- Shopify OAuth install/reinstall.
- Embedded Admin navigation.
- Judge.me connect/refresh/disconnect with test token.
- Yotpo connect/refresh/disconnect with Store ID, API secret, and App Developer API access token.
- Review sync with one provider and with Judge.me + Yotpo active together.
- AI generation with OpenAI and Gemini keys.
- Credit spend/refund behavior during AI failures.
- Shopify Billing approval and return URL.
- Privacy data summary/delete.
- Compliance webhook delivery from Shopify.

## Blockers for full automation
- Shopify OAuth requires dev store context.
- Real provider APIs require merchant credentials or mocked provider contracts.
- Shopify Billing approval requires interactive hosted flow.
- AI providers require paid/limited external keys.

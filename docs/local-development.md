# Local development

## Database
Development uses SQLite by default through `scripts/prisma-env.mjs` and `prisma/schema.dev.prisma`.

```sh
npm run setup
npm run dev
```

Production uses PostgreSQL through `prisma/schema.prisma` and `DATABASE_URL`.

## QA commands

```sh
npm run typecheck
npm run lint
npm run test
PLAYWRIGHT_START_SERVER=true npm run test:e2e
PLAYWRIGHT_START_SERVER=true npm run test:a11y
npm run qa
npm run qa:full
```

## External credentials
- Shopify CLI/dev store for embedded app testing.
- Judge.me private API token for provider testing.
- OpenAI and/or Gemini API keys for AI generation.
- SMTP credentials for contact/privacy email testing.

Do not commit `.env` or real secrets.

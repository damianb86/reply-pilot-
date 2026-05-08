# Reply Pilot

Reply Pilot is a Shopify public embedded app configured to run as one app container on the shared Shopify apps infrastructure.

## Runtime

- Shared Caddy and PostgreSQL live in `../shared-docker`.
- Reply Pilot uses the external Docker network `shared_apps`.
- Reply Pilot has its own PostgreSQL database and database user inside the shared PostgreSQL container.
- Runtime secrets belong in `.env`; `.env.example` documents the required keys.
- `APP_ENV=development` is the default local mode and uses SQLite through `DEV_DATABASE_URL`.
- `APP_ENV=production` uses PostgreSQL through `DATABASE_URL` and publishes `SHOPIFY_APP_URL` from `PROD_SHOPIFY_APP_URL` in Docker.
- In development, `shopify app dev` provides the Cloudflare tunnel URL through `HOST`; Reply Pilot prefers that URL over the production `SHOPIFY_APP_URL`.

## Local development

```sh
cp .env.example .env
npm run dev
```

In development, `npm run dev` runs Prisma against `prisma/schema.dev.prisma` and creates `prisma/dev.sqlite`.
Leave `SHOPIFY_APP_URL` and `DEV_SHOPIFY_APP_URL` empty to use the default Cloudflare tunnel from `shopify app dev`; set `DEV_SHOPIFY_APP_URL` only when you need a fixed development URL.
For production-like commands, set `APP_ENV=production`.

## Review providers

Reply Pilot can connect Judge.me and Yotpo at the same time. Yotpo requires Store ID/App Key, API secret, and an App Developer API access token so the app can both import reviews and publish public review comments.

See `docs/yotpo-integration.md` for the official Yotpo endpoints used by the app.

## Deploy

```sh
cd ../shared-docker
cp .env.example .env
./deploy-all.sh
```

```sh
cd ../ReplyPilot/reply-pilot-app
cp .env.example .env
# set APP_ENV=production and edit Shopify, PROD_SHOPIFY_APP_URL, PostgreSQL, and SMTP values
./deploy.sh
```

Publish Shopify app configuration after replacing placeholder domains and credentials:

```sh
npm run deploy
```

## SMTP

Production contact and privacy emails require `CONTACT_EMAIL`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, and `EMAIL_PASS`.
When using Gmail SMTP, `EMAIL_PASS` must be a Gmail App Password.

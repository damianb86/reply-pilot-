# Igu

Igu is a Shopify public embedded app configured to run as one app container on the shared Shopify apps infrastructure.

## Runtime

- Shared Caddy and PostgreSQL live in `../shared-docker`.
- Igu uses the external Docker network `shared_apps`.
- Igu has its own PostgreSQL database and database user inside the shared PostgreSQL container.
- Runtime secrets belong in `.env`; `.env.example` documents the required keys.

## Deploy

```sh
cd ../shared-docker
cp .env.example .env
./deploy-all.sh
```

```sh
cd ../ReplyPilot/reply-pilot-app
cp .env.example .env
./deploy.sh
```

Publish Shopify app configuration after replacing placeholder domains and credentials:

```sh
npm run deploy
```

## SMTP

Production contact and privacy emails require `CONTACT_EMAIL`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, and `EMAIL_PASS`.
When using Gmail SMTP, `EMAIL_PASS` must be a Gmail App Password.

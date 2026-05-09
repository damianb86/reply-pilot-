# Yotpo integration

## Credentials
- `Store ID / App Key`: Yotpo account identifier. Used as `{store_id}` for Core/UGC endpoints and `{account_id}` for App Developer API review comments.
- `API secret`: sent to Yotpo Core API to generate an access token.
- `YOTPO_APP_DEVELOPER_ACCESS_TOKEN`: backend environment token used by Reply Pilot to publish public comments on reviews through the App Developer API.

The Connect page asks merchants only for Store ID/App Key and API secret. Those merchant credentials are stored encrypted in `ReviewProviderConnection.encryptedCredentialsJson` and displays only masks from `credentialMaskJson`.

The App Developer API access token should not be requested in the merchant-facing form. Yotpo generates it from the App Developer OAuth flow after a merchant authorizes the registered Reply Pilot/Yotpo app. Until the full OAuth install flow is implemented, production or testing environments can provide the merchant-specific token through `YOTPO_APP_DEVELOPER_ACCESS_TOKEN`.

## Official endpoints used
- Generate Core API access token: `POST https://api.yotpo.com/core/v3/stores/{store_id}/access_tokens` with body `{ "secret": "..." }`.
  Official docs: https://core-api.yotpo.com/reference/yotpo-authentication
- Retrieve reviews: `GET https://api.yotpo.com/v1/apps/{store_id}/reviews`.
  Official docs: https://apidocs.yotpo.com/reference/retrieve-all-reviews
- Retrieve reviews with nested developer data when a developer token is available: `GET https://developers.yotpo.com/v2/{account_id}/reviews`.
  Official docs: https://develop.yotpo.com/reference/all-reviews
- Publish a review reply/comment: `POST https://developers.yotpo.com/v2/{account_id}/reviews/{review_id}/comment?access_token=...` with body `{ "content": "...", "public": true }`.
  Official docs: https://develop.yotpo.com/reference/comment-on-a-review

## Runtime behavior
- Reviews sync uses the App Developer API when the App Developer token is configured, otherwise it falls back to the UGC review list.
- Reply sending requires `YOTPO_APP_DEVELOPER_ACCESS_TOKEN` because Yotpo exposes public review comments through the App Developer API.
- `ReviewDraft.source = "yotpo"` keeps Yotpo records isolated from Judge.me records even when both providers return the same external review ID.
- If Judge.me and Yotpo are both connected, `syncReviewProviders` syncs both and Reviews shows the provider logo column.

## How to get the App Developer access token
- Register the Reply Pilot integration with Yotpo as an App Developer app. Yotpo issues an Application ID/client ID and Application Secret for the registered app.
- Start the Yotpo OAuth install flow for the merchant. Yotpo redirects back to the registered redirect URL with a temporary `code` and the merchant's `app_key`.
- Exchange that temporary code at `POST https://developers.yotpo.com/v2/oauth2/token` using the Application ID, Application Secret, redirect URI, and `grant_type=authorization_code`.
- Store the returned access token server-side. It is specific to the merchant's selected Yotpo store instance.

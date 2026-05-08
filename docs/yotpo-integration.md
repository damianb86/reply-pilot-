# Yotpo integration

## Credentials
- `Store ID / App Key`: Yotpo account identifier. Used as `{store_id}` for Core/UGC endpoints and `{account_id}` for App Developer API review comments.
- `API secret`: sent to Yotpo Core API to generate an access token.
- `App Developer API access token`: required to publish a public comment on a review.

The Connect page stores all Yotpo credentials encrypted in `ReviewProviderConnection.encryptedCredentialsJson` and displays only masks from `credentialMaskJson`.

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
- Reply sending requires the App Developer access token because Yotpo exposes public review comments through the App Developer API.
- `ReviewDraft.source = "yotpo"` keeps Yotpo records isolated from Judge.me records even when both providers return the same external review ID.
- If Judge.me and Yotpo are both connected, `syncReviewProviders` syncs both and Reviews shows the provider logo column.

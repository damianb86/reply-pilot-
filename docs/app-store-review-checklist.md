# App Store review checklist

- [ ] Install on clean dev store.
- [ ] Reinstall after uninstall and confirm sessions/provider data behavior.
- [ ] OAuth and embedded navigation work inside Shopify Admin.
- [ ] Minimal scopes are requested.
- [ ] Missing permissions produce clear UI.
- [ ] Judge.me test connection instructions are available for reviewer.
- [ ] AI keys are configured in review environment or AI flows are documented as unavailable.
- [ ] Billing test mode is enabled for reviewer.
- [ ] Credit purchase, return URL, and ledger update are testable.
- [ ] Privacy policy and public landing are accessible.
- [ ] Compliance webhooks return safe responses.
- [ ] App handles 401/403/404/500 without exposing stack traces.
- [ ] Public/support email works or SMTP limitation is documented.
- [ ] No real merchant data or secrets are included in repo.

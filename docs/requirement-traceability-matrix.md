# Requirement traceability matrix

| Requirement | Automated tests | Manual / notes |
| --- | --- | --- |
| FR-001 | `tests/e2e/public-landing.e2e.ts` | Embedded Admin iframe manual |
| FR-002 | Typecheck/build | OAuth dev store manual |
| FR-003 | - | Judge.me connect manual; helpers covered by unit |
| FR-004 | `tests/unit/judgeme.server.test.ts` | Confirm masked token in UI |
| FR-005 | - | Requires Judge.me token or deeper DB/integration mocks |
| FR-006 | `tests/unit/credits.server.test.ts` | Queue generation manual |
| FR-007 | `tests/unit/credits.server.test.ts` | Failure refund manual/e2e future |
| FR-008 | - | Queue UI manual; future integration tests |
| FR-009 | `tests/unit/ai.server.test.ts`, `tests/unit/settings.server.test.ts` | Brand Voice UI manual |
| FR-010 | `tests/unit/credits.server.test.ts` | Live preview/personality manual |
| FR-011 | `tests/unit/settings.server.test.ts` | Queue routing manual |
| FR-012 | `tests/unit/credits.server.test.ts` | Ledger UI manual |
| FR-013 | - | Billing GraphQL mocked integration future |
| FR-014 | - | Sent Logs manual; CSV client-side future test |
| FR-015 | - | Help/privacy actions manual |
| FR-016 | Typecheck/build | Webhook delivery manual |
| FR-017 | `npm run typecheck`, `npm run build` | Production migration manual |
| FR-018 | `npm run test`, `npm run test:e2e`, `npm run test:a11y` | CI workflow |

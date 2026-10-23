# Blueberry story acceptance — October 23, 2026

These are release acceptance slices, not a claim that the insurance business is operational.

| Story | Acceptance criteria | Evidence / status |
|---|---|---|
| Explore the product | Coverage information, FAQ expansion, animation pause, dialog close work | Passed live browser checks |
| Complete a sample estimate | Invalid ZIP rejected; vehicle/coverage persist through Back; focus follows steps; result clearly says fictional; restart and Escape work | Passed live browser on 9143708; sample Electric/Extra care/8,000 miles result $93 |
| Request information | Form reaches Node service; explicit consent; no false save; retry deduplication | Live disabled-state/routing passed; integration tests passed; live successful submission blocked by owner activation |
| Owner access | Email/password plus TOTP; private requests; expiry, logout, replay prevention | Integration tests passed; live setup gate passed; production credentials and MFA enrollment pending |
| Review received requests | Protected list, counts, empty/error states, persistence | API integration tests passed; authenticated live UI acceptance pending owner setup |
| BBI-007 pipeline | Push/PR syntax, committed-page consistency, database tests, reproducible build | CI passed: https://github.com/Alambdasystem/blueberry/actions/runs/40023388782 (24 seconds). Deployment remains manual; rollback drill and branch protection pending |
| Live quotes | Approved provider credentials, real quote IDs/prices, consent and error handling | Blocked: no carrier/distribution partner connected |
| Policy tracking | Bind confirmation, policy identifiers, signed webhooks, reconciliation | Not implemented; depends on carrier contract/API |
| Commissions | Policy-to-agent attribution, expected/earned/paid/reversed ledger and reconciliation | Not implemented; depends on compensation agreement/feed |

## Next acceptance gate

Provision the intended owner's credentials securely, enroll their authenticator, verify production sign-in, enable intake only when ready, submit a synthetic contact request, confirm it appears only in the owner workspace, log out, and verify persistence after a controlled service restart. Never use the test credentials from server.test.mjs in production.

## Test boundaries

15 backend integration tests pass using PGlite. This includes close/reopen persistence, CSRF, anonymous denial, duplicate submissions and database error handling. Managed Render Postgres health was checked separately. Real mobile-device testing, production credential recovery, real carrier quoting, binding, and commission payment are not accepted by these tests.

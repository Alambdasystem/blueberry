# Blueberry acceptance criteria and milestones

Updated October 23, 2026. A story is accepted only when every criterion has evidence. “Implemented” does not mean production acceptance. Requests are contact leads; sample estimates are fictional; neither is an issued policy.

## Storyboard

| Milestone | Stories | Exit gate | Current position |
|---|---|---|---|
| M1: Reliable demo | A01–A02 | Demo works with keyboard and mobile; fictional pricing explicit | Desktop live checks passed; mobile acceptance pending |
| M2: Owner and lead intake | A03–A06 | Intended owner signs in; one synthetic request is saved, privately reviewed and survives restart | Built; production credential enrollment and live acceptance pending |
| M3: Reliable operations | A07–A08 | Repeatable release, rollback, backup restore and retention procedure verified | CI works; manual releases; recovery/backup gates pending |
| M4: Real quotes | A09 | Partner-authorized quote request returns traceable real offers | Blocked on provider agreement, product/territory scope and credentials |
| M5: Policy lifecycle | A10 | Accepted quote reconciles with provider-confirmed policy state | Not implemented; depends on M4 and binding authority |
| M6: Revenue | A11 | Contracted commission is attributable and reconciled to actual payment | Not implemented; depends on compensation agreement/feed |

## A01 — Explore coverage and use the website

As a visitor, I can understand the offering and navigate it accessibly.

- Coverage dialogs open, close by button/Escape and return focus to the trigger.
- FAQ controls expand the intended answer and expose expanded state.
- Animation can be paused; reduced-motion preference is respected.
- Navigation and primary actions work by keyboard with visible focus.
- At 320, 375, 768 and 1440 px, content and form actions remain usable without page-wide horizontal scrolling; test at least one real mobile device.
- Product text never claims active insurance, carrier appointments or real prices that are not verified.

Evidence: prior desktop live dialog, FAQ and animation checks passed. Complete mobile/keyboard coverage remains pending.

## A02 — Complete a sample estimate

As a visitor, I can explore a clearly labeled fictional estimate without mistaking it for coverage.

- Invalid ZIP prevents progression with an actionable error.
- Vehicle, mileage and coverage survive Back/Continue without losing selections.
- Focus follows each step; Start again resets the flow; Escape closes it.
- Every result identifies itself as fictional, with no purchase/bind promise.
- Demo activity does not populate real quotes or commission metrics.

Evidence: live flow on commit 9143708 passed, including Electric/Extra care/8,000 miles sample result $93. Device matrix from A01 remains pending.

## A03 — Activate owner access

As the owner, I can access private leads with my own credentials and authenticator.

- Intended owner sets a unique password and enrolls TOTP securely; no secret appears in source, logs or chat.
- Correct password plus unused TOTP succeeds; incorrect credentials and replay fail; attempts are rate-limited.
- Session cookie is Secure/HttpOnly/SameSite in production; session expires after 30 minutes.
- Anonymous/expired sessions cannot read customer data; logout revokes access and clears displayed records.
- Missing owner configuration keeps login and public intake disabled.
- Administrator-assisted recovery has a documented identity check, credential rotation, active-session revocation and post-recovery verification. Recovery must be tested before acceptance.

Evidence: automated authentication, expiry, replay and logout checks pass. Production enrollment, live sign-in and recovery drill pending. No production credentials have been provisioned.

## A04 — Submit a contact request

As a visitor, I can send a request and know whether it was actually saved.

- Form validates name/email/ZIP/vehicle and requires explicit contact consent; consent version and timestamp persist.
- No sensitive underwriting or payment data is collected in this initial contact form.
- A successful response follows durable database insertion; success says it is not a quote or coverage confirmation.
- Retrying the same submission key creates one record and exposes no previous applicant data.
- Invalid input, blocked origin, closed intake and database failure never display success.
- Published contact/privacy notice identifies the operator, purpose, support route and retention approach before real intake opens.
- A synthetic production request appears in the authenticated owner workspace and survives a controlled restart.

Evidence: validation, consent, retry and failure tests pass; production disabled state verified. Successful live submission and notice review pending A03.

## A05 — Review every received request

As the owner, I can find all received requests, including those older than the first page.

- List shows received date, contact details, ZIP, vehicle and actual saved status with total count.
- Newest requests appear first; pages contain at most 25 records and can reach beyond the former 100-record cap.
- Tied timestamps and newly arriving requests do not repeat or skip existing records while paging toward older requests.
- Newer/Older buttons reflect page boundaries; Refresh returns to the newest page.
- Loading prevents overlapping page changes; empty/error states are explicit; failed navigation can retry without advancing incorrectly.
- Session expiry clears displayed customer rows and returns to login.
- Synthetic live records are visible only to the authenticated owner; sign-out and restart are verified.

Evidence: pagination implemented in this batch. Automated database traversal covers 106 existing records plus a new arrival, microsecond timestamp ties, invalid cursors and anonymous denial. Three UI-controller tests cover navigation/refresh, expiry and failed-page retry. Authenticated browser and live acceptance still pending A03.

## A06 — Qualify and follow up leads

As the owner, I can track which leads need attention without confusing lead status with policy status.

- Explicit received/contacted/qualified/closed states have documented transitions; closure includes a reason.
- Changes require owner authentication and CSRF protection; stale concurrent changes cannot silently overwrite each other.
- Actor, timestamp and previous/new state are retained in an audit history.
- Follow-up due date and filters make overdue leads visible; refreshed counts match saved states.
- Notification delivery, if enabled, has verified recipient consent, retries and deduplication; no message is sent merely by viewing a lead.

Status: not implemented; next development slice after request review. Requires versioned, backward-compatible schema migrations before status/audit schema changes.

## A07 — Release safely with fewer deployments (BBI-007)

As the operator, I can release a tested batch and identify exactly what is live.

- Main pushes and PRs run syntax, generated-file consistency, database/controller tests and reproducible build checks.
- Branch protection requires the CI check before merge; verify its configured status rather than assume it from a workflow file.
- One release groups completed stories; documentation-only changes do not trigger production deployments.
- Deploy only affected services and record commit, service, deploy ID and outcome. Deploy frontend and backend together only when both changed.
- Verify health/database connectivity, public readiness state and the changed user flow after live status.
- Automatic deployment, if enabled later, must wait for required checks and preserve the batching policy.
- Rehearse rollback to the recorded previous compatible commit, verify health/data and restore the intended release; schema changes must be backward-compatible or have a tested recovery plan.

Evidence: prior CI run passed: https://github.com/Alambdasystem/blueberry/actions/runs/40023388782. Manual deployments and health checks work. Branch protection, automated deployment and rollback rehearsal remain pending. Current batch changes only the Node workspace; static homepage does not need redeployment.

## A08 — Preserve and protect customer records

As the operator, I can recover service and honor the published data handling commitments.

- Replace/upgrade the expiring database before November 22, 2026; record the chosen plan and ownership.
- Document recovery objectives, backup schedule/location, encryption and access; verify a backup exists.
- Restore a synthetic backup into an isolated database and verify records/counts, consent fields and application startup; record elapsed recovery time.
- Keep database access private; no secrets/customer data enter public GitHub or application logs.
- Approve retention periods and an authenticated correction/deletion process; test on synthetic records, including backup retention implications.
- Define outage contact, operational monitoring and alerts; demonstrate an actionable failure alert.

Evidence: private database connectivity and /healthz query verified. Backup/restore, retention process, monitoring and non-expiring storage remain pending. Do not call the free database production-ready for customer records.

## A09 — Obtain real carrier quotes

As an eligible applicant, I can authorize a real quote request and receive traceable offers.

- Select a distribution/carrier partner and confirm product, territory, agency permissions and compensation agreement; store credentials securely.
- Map required fields/consents to documented provider schemas; collect only required data.
- Submit idempotently with internal request ID and provider correlation ID; timeout/retry never produces duplicate submissions.
- Store provider quote ID, premium, term, coverage, deductibles, expiry and relevant disclosures; label preliminary versus firm offers accurately.
- Handle declined/no-offer/pending/error states explicitly and retain a sanitized operational trail.
- Validate provider sandbox cases and an authorized production case; owner and applicant see consistent statuses.
- Never substitute the sample-estimate calculator when the provider is unavailable.

Status: blocked on partner selection, agreements and API access. Provider-specific criteria must be refined against its contract/API before implementation.

## A10 — Submit/bind and track policies

As an applicant and owner, we can track a selected offer through provider-confirmed issuance and later changes.

- Bind only with the required authority, applicant consent and confirmed provider workflow; no local button alone asserts coverage.
- Persist application/quote/policy correlation, policy number, effective dates and provider-confirmed status.
- Verify webhook signatures and replay windows; deduplicate events and handle out-of-order delivery.
- Reconcile pending states against provider records; show unresolved differences to the owner.
- Exercise issued, declined, canceled, renewal and failed/pending scenarios in sandbox; never mark coverage active without provider confirmation.
- Keep a timestamped status history and role-limited access to policy documents.

Status: not implemented; dependent on A09 and provider capabilities.

## A11 — Attribute and reconcile commissions

As the owner, I can trace earnings to policies and reconcile them to payments.

- Record the contracted agency/producer attribution before submission and preserve it through policy issuance.
- Compute expected commission from the applicable agreement/version; distinguish expected, earned, payable, paid and reversed amounts.
- Import provider statements/payment events idempotently; correlate each entry to policy, period and source statement.
- Support adjustments, cancellation chargebacks and reversals without overwriting history.
- Reconcile statement totals, ledger totals and actual remittances; flag unmatched/missing entries for review.
- Export period totals with traceable source IDs; label estimates clearly and do not claim paid revenue from a quote.
- Pass synthetic issuance/payment/reversal tests and reconcile an authorized real partner statement before acceptance.

Status: not implemented; compensation agreement and statement/payment feed unavailable.

## Next release and launch sequence

1. Complete A05 pagination and automated verification; commit acceptance criteria and implementation together.
2. Run CI, then deploy the Node service once. No homepage deploy or production schema change is needed.
3. Owner securely provisions password/TOTP; verify A03 live before opening intake.
4. Resolve A04 notice/retention and A08 durable-storage gates, then run a synthetic request through A04–A05 and restart verification.
5. Build A06 lead workflow with ordered migrations while partner onboarding for A09 proceeds separately.

## Evidence boundaries

Current local suite: 19 passing test results (15 backend cases plus their parent test, and 3 UI-controller cases). Controller tests use a minimal DOM harness, not a real browser. PGlite integration tests do not replace managed PostgreSQL/live acceptance. Production owner sign-in, real mobile testing, restore/rollback drills, actual carrier quoting, binding and commission payment remain unaccepted.

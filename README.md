# Blueberry Insurance

Blueberry customer demo plus a PostgreSQL-backed contact-request form and protected owner workspace. Live carrier quotes, policy binding, customer accounts, and commissions are not connected. See DEPLOYMENT.md for activation requirements.

## Development

Requires Node 24. Run `npm ci` to install dependencies.

1. Edit the source files below.
2. Run `npm run build`.
3. Run `npm run check`.
4. Commit the sources together with the generated `index.html`.

| File | Responsibility |
| --- | --- |
| page.template.html | Page structure, SVG artwork, and existing inline UI event attributes |
| styles.css | Layout, responsive styling, and animation rules |
| coverage.js | Illustrative coverage content and coverage dialogs |
| navigation.js | Mobile navigation |
| quote-demo.js | Demo state, form steps, mileage interaction, and fictional pricing |
| motion.js | Animation pause, reduced-motion preference, and visibility behavior |
| build.mjs | Deterministic assembly into the deployable index.html |

Scripts currently retain their original execution order and classic-script scope to preserve existing inline event handlers. This is a source-boundary refactor, not a framework migration. There is no API integration to extract yet; future carrier calls belong behind an authenticated backend, never in these browser files.

## Hosting

The new owner workspace requires the Node web service and PostgreSQL configuration in DEPLOYMENT.md. The previous static site's index-only copy command is insufficient for this release. Production activation is not complete until that hosting change and owner setup are verified.

## Current work

BBI-006: source separation implemented in commit 8438d67. Build and syntax checks pass. Generated output is byte-for-byte identical to the baseline demo, so markup, styles, animation, and quote behavior are preserved. No new automated behavior tests were added for this extraction.

BBI-007: next engineering story — connect private GitHub access, run checks on changes, and establish a verified Render deployment/rollback path.

Business dependencies BBI-001 through BBI-005 remain open. Real quotes and revenue depend on licensed distribution and a confirmed partner agreement.

## Owner workspace increment

Implemented owner.html, apply.html, authenticated backend routes, PostgreSQL schema, and integration tests. Run `npm test` for authentication, authorization, persistence, retry, and failure checks. `npm run dev` is a disabled-intake local preview only. Production activation requires a Node web service, database, exact origin, owner credential provisioning, and successful deployment checks. This increment does not close the full authentication, database, operations, or pipeline milestones.

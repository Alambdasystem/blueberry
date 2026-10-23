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

The static homepage and Node/PostgreSQL owner service are deployed in Jim's Render workspace. Owner and request links redirect to the backend. Owner activation is still required; see DEPLOYMENT.md.

## Current work

- BBI-006 source separation: complete.
- BBI-007 CI: push/PR workflow added and first GitHub run passed. Manual Render deployment verified; automatic deployment, rollback drill and branch protection remain pending.
- Latest functional release: 9143708, deployed to both Render services. Quote Back navigation/focus and owner readiness issues fixed and checked live.
- Owner production activation: credentials and MFA enrollment pending. Intake remains disabled.
- Live carrier quotes, binding, policy tracking and commission feeds: not connected.

See [ACCEPTANCE.md](ACCEPTANCE.md) for story acceptance and test boundaries, and [DEPLOYMENT.md](DEPLOYMENT.md) for the live hosting configuration.

## Owner workspace increment

Implemented owner.html, apply.html, authenticated backend routes, PostgreSQL schema, and integration tests. Run `npm test` for authentication, authorization, persistence, retry, and failure checks. `npm run dev` is a disabled-intake local preview only. Production activation requires a Node web service, database, exact origin, owner credential provisioning, and successful deployment checks. This increment does not close the full authentication, database, operations, or pipeline milestones.

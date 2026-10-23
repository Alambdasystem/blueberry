# Blueberry Insurance

Interactive personal-auto insurance demo. No live quotes, policy binding, customer persistence, authentication, or commissions are implemented yet.

## Development

Requires Node 22 or newer. No package installation is needed.

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

The existing Render static build copies the generated root `index.html` into `public/`. This change remains compatible with that configuration. Generated HTML is committed so a source refactor does not require a hosting change. BBI-007 will automate checks and gated deployments; that pipeline is not active yet.

## Current work

BBI-006: source separation implemented. Build and syntax checks pass. Generated output is byte-for-byte identical to the baseline demo, so markup, styles, animation, and quote behavior are preserved. No new automated behavior tests were added for this extraction.

BBI-007: next engineering story — connect private GitHub access, run checks on changes, and establish a verified Render deployment/rollback path.

Business dependencies BBI-001 through BBI-005 remain open. Real quotes and revenue depend on licensed distribution and a confirmed partner agreement.

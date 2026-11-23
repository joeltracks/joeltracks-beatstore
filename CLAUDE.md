## Design system

The owner requested automatic commits and GitHub pushes for future completed codebase changes on November 23, 2026. Follow the standing workflow in `AGENTS.md`; verify changes before committing, preserve remote history and never commit secrets or generated output.

Before any UI work, read DESIGN.md. Build new customer-facing UI from design-system/tokens.css, or the Tailwind theme in design-system/theme.css. Add missing tokens in roles.json and rebuild. Check new screens against design-system/preview.html. The reference-inspired storefront is scoped to customer views; preserve the seller workspace unless a change is requested. Existing navy dashboard styles are retained.

The seller requested the dashboard usage schedule in customer license drafts on November 18, 2026. `dashboardLicenseDefaults` supplies empty legacy fields; nonempty saved dashboard wording takes precedence. All public license displays and checkout read the same tier settings. Custom terms remain negotiated. Legal definitions and lawyer review are still pending. This project remains a frontend prototype with local mock integrations.

The approved focused refinement is the final `refinement.css` layer. Preserve its compact catalog, stateful Tags & sort disclosure at 900px and below, 44px row controls, restrained route motion and contained seller sidebar. Read `.taste-skill/unslop-refinement/REVIEW.md` before overriding it. The logo, type families, palette, section order and license terms were explicitly retained.

The seller subsequently selected B — Soft Seal from the framed-wordmark concepts. The active logo is now `assets/branding/soft-seal/joel-tracks.svg`, a full-name capsule without JT initials. Header, footer and seller branding use it; small icons use its simplified capsule perimeter. Preserve this later selection. See `assets/branding/soft-seal/USAGE.md`. Interface font families, palette, features and license terms are unchanged.

The seller added automatic bulk deals: exactly 2 valid cart beats receive 15% off; 3+ receive 25%. `bulk-deals.js` owns the integer-cent calculation; `cartPricing()` supplies header/cart/checkout totals and per-beat agreement fees. Do not alter base tier prices or royalty/usage terms to represent a discount. The seller then moved the strip directly above the persistent player and removed its pause/play button. Preserve that placement: ResizeObserver measures the player and strip; bottom padding and notices clear the whole dock. Keep hover/focus pause, reduced-motion static copy and no seller-dashboard banner. See `.taste-skill/bulk-deals-review/REVIEW.md`.


## Guest order-access milestone - November 23, 2026

Use `npm run dev` for the frontend/API (Node 24.22+), not a root static server. `launch.js` is the active transition layer for guest checkout, purchases, real contact links, unavailable seller access and honest empty states. `app.js` no longer seeds or hydrates fictional/local beats. Do not restore demo catalogs, sample payments, synthetic previews, fake form successes or customer access to seller operations. Legacy browser storage is preserved but separated from `jt:store:` shopping state.

The dedicated Supabase project is `pihmwsdlbmfffjmqscbo` in MBUGUA BUILDERS / us-east-1, Free, explicitly approved by the seller. Do not use the unrelated Investment Project. The schema in `database/guest-order-access.sql` is applied; server-only RPCs and private RLS tables authorize one paid order per token/session. `docs/ORDER_ACCESS.md` records configuration, limits and checks. Email/domain, server project key, R2, verified checkout/final contracts and seller authentication are still pending. Do not enable a payment or invent a signed/paid order from browser state. No live email test is authorized by the existing verification runs.

Use the cf CLI and cloudflare.config.ts with the pinned compatible Vite plugin; no separate Wrangler project config. `scripts/prepare-web.mjs` creates a public asset allowlist. Do not deploy the repository root, expose credentials/internal plans, or publish before the remaining launch gates are met. Run `npm test`, `npm run typecheck` and `npm run build` after meaningful changes.

## Vercel build target - November 23, 2026

The Git-connected Vercel storefront expects `dist`. The default `npm run build` now runs the allowlisted Vercel build and `vercel.json` sets `outputDirectory: dist`. The previous Cloudflare target is `npm run build:cloudflare`; it writes `.cloudflare/output`. Preserve both targets and never make server source or the repository root public to fix an output-path error. `api/index.ts` serves the shared public Hono API on Vercel but intentionally leaves email/storage unconfigured until their dispatcher/bindings are implemented for the chosen runtime. See docs/ORDER_ACCESS.md. Continue the automatic commit/push workflow after verification.

License availability is per beat and follows the configured delivery list: Basic MP3, Premium MP3 + WAV, Unlimited MP3 + WAV + stems. `licenseAvailability` in `license-settings.js` accepts nonempty local Blobs or strict server `fileAvailability` booleans; incomplete upload manifests and preview audio do not qualify. Seller upload finalization/catalog/quote APIs are still pending: derive these flags from verified private assets on the server and recheck before payment. Missing files disable choices in both the picker and beat-page cards; invalid cart choices are excluded from totals and removed after a successful catalog refresh or local save. Never substitute a cheaper tier or alter purchased entitlements. Custom terms remain negotiated.


## R2 storage provisioned - November 23, 2026

The seller explicitly approved Cloudflare R2 usage billing and account `1b4bc53beb85cda4d8618ee8a695585f` (the connected account). `joeltracks-media` and `joeltracks-private` now exist in Standard storage, reported location ENAM, default jurisdiction. Both have r2.dev disabled, no custom domains and no CORS policy. Live authenticated write/read/delete checks passed and their temporary objects were removed. `cloudflare.config.ts` binds MEDIA_FILES and PRIVATE_FILES to these separate buckets and isolates local development with remote:false. This source configuration has not deployed the Cloudflare backend or attached storage to Vercel. No new credentials were created or exposed.

The seller chose the uploaded MP3 itself as the clean full-length preview; do not request a separate preview upload, synthesize or transcode it. The upload pipeline is still pending: after server validation/publication, retain an immutable private delivery copy and publish a byte-identical MP3 preview copy in MEDIA_FILES. Keep WAVs/stems/agreements in PRIVATE_FILES. No public preview domain or seller upload API is active yet. See docs/STORAGE.md; continue keeping seller access and checkout closed until their separate gates are satisfied.

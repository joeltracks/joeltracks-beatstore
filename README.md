# Joel Tracks Beatstore

Joel Tracks beat store with a guest order-access backend under development. The storefront retains R&B, Afro and Trap browsing, favorites, cart and license comparisons; fictional catalog and transaction data are no longer loaded.

## Run locally

From the project directory, run:

```sh
npm ci
npm run dev
```

Use Node.js 24.22 or later. Open [the local storefront](http://127.0.0.1:4173/) or [purchase access](http://127.0.0.1:4173/#purchases). This server serves both the frontend and API; a Python static server cannot run the API.

## Current status

**Not ready for live sales.** The dedicated Supabase project and private order-access schema are created. The Hono API implements one-use order links, session cookies, a transactional email outbox and authorized download streaming. R2 media/private buckets now exist, with bucket bindings prepared in the Cloudflare build; neither bucket has public access enabled. Seller authentication, upload APIs and real beat files are not connected. Email sending remains disabled until server credentials and a verified sending domain are configured. Payment processing and final agreements are not implemented.

The public catalog and blog are intentionally empty until real beats and approved articles are published. Old prototype browser data is preserved but not imported as production records. Contact links use JT's real email and Instagram. No test orders are seeded into the application.

See [access setup and verification](docs/ORDER_ACCESS.md) for configuration, security boundaries and activation requirements.

See [R2 storage setup](docs/STORAGE.md) for the provisioned buckets, the approved use of uploaded MP3s as previews, access boundaries and remaining integration work.

## Checks

```sh
npm test
npm run typecheck
npm run build
```

`npm run build` now creates Vercel's `dist/` output from the explicit public asset allowlist. `vercel.json` sets the build command and output directory, routes `/access` to the storefront, and routes API requests to the shared Hono Node handler. Server sources, credentials, internal plans and browser profiles are excluded from public assets.

The Cloudflare target remains available through `npm run build:cloudflare`, using `cf` and the compatible pinned Vite plugin. Its output is `.cloudflare/output`, not `dist/`. Building either target does not deploy or enable paid services.

The Vercel adapter currently serves the public API and keeps purchase access unavailable. Cloudflare's scheduled mail dispatcher and R2 bindings are not activated by a Vercel build. Do not enable live email or downloads merely by adding credentials; choose and finish the backend runtime/dispatcher setup first. Local development continues to use `npm run dev`. See [deployment notes](docs/ORDER_ACCESS.md#vercel-build-target).

## Project notes

- [Prototype guide](GUIDE.md)
- [Backend architecture and implementation plan](BACKEND_PLAN.md)
- [License research and proposed terms](LICENSING_PROPOSALS.md)
- [Design system](DESIGN.md)

Source files, local assets, branding and design review notes are included. Local browser profiles, caches, secrets and temporary output are excluded through `.gitignore`.

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

**Not ready for live sales.** The dedicated Supabase project and private order-access schema are created. The Hono API implements one-use order links, session cookies, a transactional email outbox and authorized download streaming. Email sending is disabled until server credentials and a verified sending domain are configured; the R2 delivery binding and real files are not connected. Payment processing and final agreements are not implemented. Seller access remains closed until authentication is implemented.

The public catalog and blog are intentionally empty until real beats and approved articles are published. Old prototype browser data is preserved but not imported as production records. Contact links use JT's real email and Instagram. No test orders are seeded into the application.

See [access setup and verification](docs/ORDER_ACCESS.md) for configuration, security boundaries and activation requirements.

## Checks

```sh
npm test
npm run typecheck
npm run build
```

The Cloudflare build uses `cf` and the compatible Vite plugin release candidate, pinned in the lockfile. It builds an explicit public asset allowlist, excluding server sources, credentials, internal plans and browser profiles. Building does not deploy or enable paid services.

## Project notes

- [Prototype guide](GUIDE.md)
- [Backend architecture and implementation plan](BACKEND_PLAN.md)
- [License research and proposed terms](LICENSING_PROPOSALS.md)
- [Design system](DESIGN.md)

Source files, local assets, branding and design review notes are included. Local browser profiles, caches, secrets and temporary output are excluded through `.gitignore`.

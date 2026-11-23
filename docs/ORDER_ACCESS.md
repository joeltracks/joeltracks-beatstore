# Guest purchase access

Implemented November 23, 2026. This milestone implements the order-access foundation and removes active demonstration content. It does not make the store ready for live sales.

## Provisioned resources

- Supabase: **Joel Tracks Beatstore**, project `pihmwsdlbmfffjmqscbo`, in the seller-selected **MBUGUA BUILDERS** organization, **us-east-1**, Free plan. The creation quote was $0/month and the seller approved it. The unrelated Investment Project was not changed.
- Schema: `database/guest-order-access.sql`, applied to the dedicated project. Orders/items/files, hashed access tokens/sessions, request limits and encrypted email jobs are private. No real or sample order is seeded.
- This order-access milestone did not deploy a Cloudflare Worker, purchase a domain, configure an email sender or open a payment account. R2 buckets were subsequently provisioned with the seller's explicit account/billing approval; see [storage setup](STORAGE.md). Their private-file binding is prepared in source but not deployed to a live delivery runtime. The Vercel adapter still keeps purchase access unavailable.

## Local setup

Use Node 24.22 or later, install with `npm ci`, and run `npm run dev`. The server listens only on the loopback origin, normally `http://127.0.0.1:4173`. It serves a runtime allowlist, not the repository root. Do not use a Python static server for the API or deploy the entire repository as public files.

Copy `.env.example` to ignored `.env.local` if no local configuration exists. Configure:

| Value | Purpose |
| --- | --- |
| `APP_ORIGIN` | Exact local origin; eventual production origin must use HTTPS. |
| `SUPABASE_URL` | The dedicated project URL, already shown in the example. |
| `SUPABASE_SECRET_KEY` | Backend-only project secret/service-role key from Supabase API settings. Never a browser key or user credential. Never commit or paste it into chat. |
| `ACCESS_SECRET` | Random server secret, at least 32 characters, for encrypted email jobs and hashed rate-limit identities. Generate once and retain it securely; changing it invalidates queued email ciphertext. |
| `RESEND_API_KEY` | Backend-only transactional email key, once the provider is configured. |
| `MAIL_FROM` | Address on the seller's verified sending domain. Gmail is the contact destination, not an authenticated sending domain. |

Missing database/secret/mail configuration returns an honest unavailable state and disables the access form. No production link, token, fake success or email address is exposed as a development bypass. No live email was sent during verification. Because no domain has been selected, activation of real email is still pending.

## Flow and boundaries

1. A buyer enters the purchase email and order reference. Guest checkout does not require account registration; payment/quote implementation remains a subsequent milestone.
2. The server validates input and origin, checks persistent request limits and matches a paid order. Matching and unknown details receive the same public response. Unknown, unpaid and refunded orders do not queue delivery mail.
3. A transaction records a SHA-256 token hash and an AES-GCM-encrypted outbox payload. The email contains a random 256-bit token in a URL fragment, which is not sent in the initial HTTP request. SMTP/provider click tracking should remain disabled for these links.
4. The browser removes the token from the address bar before rendering. An explicit confirmation button POSTs it to the server. Simply opening or scanning the GET link does not consume it or accept contractual terms.
5. A row lock makes exchange atomic and single-use. Initial technical defaults: token lifetime 15 minutes; order-scoped session 30 minutes. These are security/session defaults, not limits on contractual re-download rights. No download-count quota is imposed.
6. An opaque HttpOnly cookie carries the session token. Production uses Secure, SameSite=Lax and the `__Host-` prefix. Only loopback local development uses the non-Secure local cookie. Sessions stay hashed in the database. No account-wide purchase history or Supabase customer account is created.
7. Every order/file lookup rechecks paid status and that order's file entitlements. Private object keys never appear in public JSON. Missing R2 configuration fails closed. Streaming supports one byte range, explicit filenames and no-store responses; it does not prevent copying or recall already delivered bytes.
8. Logout revokes the database session. Full-refund state prevents subsequent access. The user-approved policy for partial refunds/disputes is still a future requirement.

The application does not sign users into Supabase from the browser. Server RPCs are security-invoker functions callable only by `service_role`; private tables have RLS and no anonymous/authenticated access. Service credentials bypass RLS, so Hono authorization and RPC boundaries must also be enforced. Supabase Auth for seller login remains separate and is not implemented in this milestone. Both `/studio` server routes and public `#studio` UI are unavailable, not a mock login.

## Email operations

The local server polls the encrypted email outbox every 15 seconds only if all credentials are configured. The Cloudflare scheduled handler runs each minute when eventually deployed. A job lease prevents concurrent dispatch, stable Resend idempotency keys protect retries, retry/backoff is bounded to five attempts and jobs expire with the link. Sent job ciphertext is cleared. Authentication email does not share a marketing campaign workflow.

This is an initial bounded outbox dispatcher, not the complete Queues/alerting/reconciliation system in the backend plan. Expired/failed access jobs currently require operational inspection and a fresh link request. Provider events, bounce handling, production abuse controls/Turnstile, log retention, backup setup and seller alerting remain launch tasks. No endpoint is exposed to run mail jobs from a browser.

## Removed active demonstration behavior

- Fictional 30-beat seed catalog and synthesized previews are no longer loaded.
- No mock payments or locally simulated sale counters are used by the public app. Seller simulation code is excluded from the public entry/build.
- Draft sample blog articles and pretend newsletter/contact forms are not published.
- Real email/Instagram contacts remain, and the footer's former signup area now links to secure purchase access.
- Checkout cannot display a fabricated completed order or activate a license. Unresolved contract terms were not silently finalized to remove placeholders.
- Browser shopping state now uses a separate `jt:store:` namespace. Existing `jt:` prototype and IndexedDB data is not deleted, trusted as business data or automatically published.

Runtime assets preserve the selected logo, typography, palette, responsive layout, favorites/cart interactions and bulk pricing. Archived design evidence and older prototype code remain in Git history/repository documentation; they are not production business records or deployment assets.

## Verification

- `npm test`: token replay/expiry, scanner GET, cookie flags, unknown/unpaid orders, cross-origin input, payload size, cross-order isolation, refund/logout revocation, encrypted email retries and streaming/ranges.
- `npm run typecheck` and `npm run build`.
- Real Supabase transactional tests create temporary fixture records, assert exchange/replay/expiry/entitlement/refund behavior and **ROLL BACK**; no fixtures remain.
- Public routes checked at 320, 390, 714 and 1440 pixels with isolated browser storage, including stale prototype state. No visible fictional data, horizontal overflow or JavaScript errors were found in the checked routes.
- 19 automated checks passed. An isolated browser completed request -> captured test email -> confirmation -> scoped order -> logout; no real email or persistent order was created. Separate isolated catalog fixtures verified license selection, add/remove cart, the 15% bulk discount and unavailable checkout.
- The actual Cloudflare local Worker served the customer views and API and kept unconfigured access unavailable. Its production bundle contains the intended public scripts and excludes server/config/internal-plan/simulator files. The Supabase security advisor returned no findings; the database remained empty after tests.

Activation still needs real published audio/artwork, private file storage, final license/party details, verified payment processing, approved terms/privacy/refund policy, seller authentication and a verified sending domain. No live signature, purchase or launch is claimed by this milestone.

## Vercel build target

Added November 23 after the first Git-connected deployment reported that no `dist` output existed. The original `cf build` succeeded but wrote `.cloudflare/output`, which Vercel's configured output directory did not match.

- `npm run build` / `npm run build:vercel` creates `dist/index.html` plus the allowlisted runtime assets. `vercel.json` explicitly overrides the output directory to `dist` and selects the Vercel build command, independent of the dashboard's previous build override.
- `api/index.ts` uses Vercel's Web Standard Node function export to call the shared Hono application. `/api/*` rewrites to that function; `/access` rewrites to the storefront. Missing arbitrary files are not rewritten to HTML. Seller paths remain unavailable.
- Global response headers retain no-referrer, no-sniff and frame protection. Purchase-access HTML is not cached.
- This is a storefront/public-API deployment target, **not a completed migration of background mail delivery or private R2 storage**. Its adapter deliberately does not pass mail/storage credentials into the shared application, so email requests cannot be accepted without an operational dispatcher. Local/Cloudflare implementations remain available separately.
- `npm run build:cloudflare` preserves the original Worker build. `npm run dev:worker` remains the local Worker option. Do not point Vercel's public output at the repository root or the complete Cloudflare bundle, which contains backend code.

Official references checked November 23: [Vercel output directory configuration](https://vercel.com/docs/project-configuration/vercel-json#outputdirectory), [Node Web Standard function exports](https://vercel.com/docs/functions/runtimes/node-js). The fix adds build-output/asset isolation and adapter tests. Hosted deployment status must be verified separately from a successful local build.


## Seller authentication milestone

Seller-only password/TOTP authentication is implemented separately from guest order access. The Vercel function now forwards Supabase server configuration and a dedicated seller-session encryption key for protected seller routes; it still omits the buyer mail/delivery activation bindings. See [seller access](SELLER_ACCESS.md). Seller authentication does not enable payments, buyer mail or R2 upload/publication.

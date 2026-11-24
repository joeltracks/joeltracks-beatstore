# Seller workspace restoration — November 24, 2026

The secure seller shell now exposes Overview, Beat library & files, Analytics, Payments, Custom offers, Featured beat and Licenses. Uploads, automatic WAV-to-MP3 conversion, progress feedback and explicit publication remain in the existing library. The archived local seller simulation is not loaded.

## Saved settings and records

- Featured beat and its manual label are saved server-side. Automatic selection uses the newest published beat. Selecting “Top played” or “Top seller” is an editorial label, not an automatic ranking claim.
- The four license editors share versioned server settings with public license displays and agreement drafts. Initial prices, file packages, splits and proposed wording reproduce the existing approved configuration. Saving uses optimistic version checks. These remain contract drafts requiring qualified legal review; saving settings does not sign or activate a license. Old browser-only simulation records are not imported.
- Custom offers from published beats enter a private inbox with unread counters. Price, proposed artist shares, terms and status can be edited with revision history. Saving a negotiation does not send an email, accept an agreement or create a payment.
- Payment reports read existing orders, group amounts by currency/status and show a status donut and recent transactions. Purchase tallies count distinct paid orders per stable beat ID; pending/refunded orders and beats with no paid sale are excluded. Legacy rows without IDs fall back to their recorded title. New checkout must populate `order_items.beat_id`.
- Analytics record successful preview starts, favorite-save actions and first cart adds. Anonymous, best-effort action counts start with this integration; they are neither unique people nor verified sales. No visitor identity, IP address or tracking cookie is stored by this feature. Client suppression is 30 seconds per beat/action; database UUID deduplication lasts two days, with a per-beat cap of 300 requests per 10 minutes. Offers are capped at three per email hash and 500 globally per 10 minutes. These are application safeguards, not bot-proof analytics.
- Visible reporting pages check for changed data every 30 seconds. Editing fields, negotiations and upload/library pages are excluded from polling. No document reload is performed. The sidebar scrolls within its viewport boundary.

The player and discount strip are absent on a fresh customer visit. Explicit Play selection reveals the dock, which remains available when paused and across customer routes. It is hidden in the seller workspace.

## Backend and verification

Applied migrations: `restore_seller_management_and_shared_store_settings` and `group_paid_purchase_tally_by_stable_beat_id`; source is in `database/dashboard-management.sql` and `database/dashboard-sales-tally.sql`. All new private tables have RLS and deny browser-role access; invoker RPCs are executable only by the server role. Seller operations additionally require the existing live pinned-owner MFA session. Mutation requests require same-origin JSON. License bodies allow 48 KiB, offer bodies 24 KiB, other routes retain 4 KiB, with a global 64 KiB cap.

Verification: 97 automated tests, TypeScript checking and Vercel build passed. Actual SQL reporting/settings/offer/event checks ran inside a rollback transaction using session-local copies of owner-protected functions with only their owner guard omitted. Production functions and owner sessions were never relaxed or impersonated; HTTP owner/MFA guards were tested separately. Duplicate event/order IDs, paid-only tallying, revision conflicts, shared projection and browser-role denial were checked. All synthetic records rolled back; no live payment or email was generated. A full signed-in production UI check still requires the owner's password and authenticator.

Supabase security advisor continues to report the pre-existing leaked-password-protection warning; no new advisor warning was introduced. Payment processing, final contract execution and delivery-email activation are separate launch work.

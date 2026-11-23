# Seller access

Implemented November 23, 2026. Seller sign-in is restricted to **joeltracks2000@gmail.com** and the specifically provisioned Supabase Auth user pinned in `jt_private.seller_identity`. No customer account, public seller registration or local-storage authorization is added.

## Sign in

Open `/studio` (redirects to `/#studio`) on the production storefront. Use the password you created directly in Supabase. On first sign-in, add the displayed setup key to an authenticator app as a **time-based** account named Joel Tracks, then enter its six-digit code. Later sign-ins require the password and current authenticator code. Codes are text so leading zeros are retained.

Supabase Auth verifies the password and TOTP. The server verifies the current user with `getUser` on every private request, checks the approved email, confirmed identity, pinned user ID and upstream session. Private dashboard data also requires the server-side MFA flag, `aal2` and an existing verified TOTP factor. Editable user metadata never grants authority.

## Configuration and provisioning

The seller created their Auth user and saved `SUPABASE_SECRET_KEY` directly in Vercel, targeting Production and marking it sensitive. The backend never receives their password through this chat. Remaining production settings were configured in Vercel: `APP_ORIGIN=https://joeltracks-beatstore.vercel.app`, dedicated `SUPABASE_URL`, server-side `SUPABASE_PUBLISHABLE_KEY` and a separate random 32-byte `SELLER_SESSION_SECRET` stored as sensitive. Secrets are not committed. Preview environments remain unconfigured and cannot sign in using production sessions.

Migrations applied to the dedicated project, in order:

1. `database/seller-access.sql`: identity, encrypted BFF sessions, rate-limit records and service-only RPCs.
2. `database/seller-owner.sql`: pins the manually created, email-confirmed owner through a lookup, without hardcoding a generated user UUID.
3. `database/seller-session-lock.sql`: returns a retryable busy state while a session refresh is leased.

Tables are private, have RLS and deny direct `anon` / `authenticated` access. No schema usage or function execution was granted to browser roles. RPCs are `SECURITY INVOKER`, service-role only. The service role has column-level SELECT on only `auth.users(id,email,email_confirmed_at)` and `auth.sessions(id,user_id)` so those RPCs can check identity and immediate upstream revocation without a privileged definer function or broad Auth table grants. Service-role authorization remains the server's responsibility; its access is not protected by RLS.

The Cloudflare target declares equivalent secret bindings, but no Cloudflare backend was deployed. The Vercel Node function now forwards seller configuration to the shared Hono app. Guest order-access mail and R2 delivery remain gated because their separate required bindings/secrets are not activated.

## Sessions and safeguards

- Opaque, 256-bit random session IDs in `__Host-jt-seller` cookies: Secure, HttpOnly, SameSite=Lax, path `/`, no Domain. Local development uses a separate non-Secure cookie on loopback only.
- PostgreSQL stores only the cookie token hash. Supabase access/refresh credentials are AES-GCM encrypted under the seller session secret. Browser JavaScript never receives either credential.
- A password-only session lasts at most 10 minutes and cannot read the dashboard. Successful TOTP verification rotates to a new cookie and deletes the old application session. A full session has a 30-minute idle limit and eight-hour absolute limit.
- A database lease serializes token refresh and MFA changes; simultaneous requests receive a retryable 409. Failure to persist refreshed credentials revokes the session.
- Logout revokes the application session, requests local upstream sign-out and clears the cookie. Upstream session removal, disabled owner access, changed/unconfirmed email or MFA downgrade prevents later private reads.
- Mutations require the configured same origin and JSON, with a 4 KB body limit. Persistent rate limits allow 20 password attempts per 15 minutes, 10 code attempts per five minutes per session, and three enrollment attempts per 10 minutes per session. These values are implementation safeguards, not provider guarantees. Infrastructure-level bot/abuse protection is still separate work.
- Enrollment cannot replace an existing verified factor from a password-only session. Only the owner can see the setup secret after password verification. Save a securely protected backup before completing setup. No email recovery or MFA bypass is invented. Before live selling, enroll/test a second factor and document recovery through Supabase's administrative tools.
- Sign-in, MFA and dashboard responses use private/no-store caching. UI state is rechecked after navigation and browser back/forward restoration. No seller data or token is saved in localStorage.

The current private dashboard reads real paid/pending order counts, paid USD totals and recent orders from the database. It shows an honest empty state when no orders exist. Beat upload, catalog publication, license editing and the other seller management APIs remain subsequent integrations. The archived seller simulation is not re-enabled.

## Verification and remaining limits

Automated route tests cover wrong/unconfirmed identities, pinned-owner denial, forged cookies, password-only restrictions, TOTP setup and code validation, session rotation, MFA downgrade, revocation, logout cookie clearing, CSRF, body limits, guessing limits and refresh concurrency. Isolated browser fixtures exercise password → authenticator enrollment → dashboard → logout at 320, 390, 874 and 1440 pixels, without using the real password or modifying production orders.

SQL checks confirm the owner is pinned, browser roles cannot access the schema/RPCs, seller tables have RLS, unknown sessions are rejected and service-role overview reads work. Supabase's security advisor reports **Leaked Password Protection Disabled**. No paid feature was enabled to resolve it; use a strong unique seller password and mandatory TOTP, and review [password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) for the project's available settings. This warning is separate from the passing application access-control checks.

A real successful password/TOTP sign-in must be completed by the owner; the agent does not know the password. No login or recovery email was sent by this implementation.

Official references checked November 23: [password sign-in](https://supabase.com/docs/reference/javascript/auth-signinwithpassword), [TOTP MFA](https://supabase.com/docs/guides/auth/auth-mfa/totp), [MFA enrollment](https://supabase.com/docs/reference/javascript/auth-mfa-enroll), [server auth guidance](https://supabase.com/docs/guides/auth/server-side/advanced-guide), [default SMTP restrictions](https://supabase.com/docs/guides/auth/auth-smtp). Relevant installed `supabase-js` / `auth-js` implementations were also inspected.

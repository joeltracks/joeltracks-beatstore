# Joel Tracks R2 storage

Provisioned and verified November 23, 2026, after the seller approved the connected Cloudflare account, R2 usage billing and reuse of the uploaded MP3 as the preview.

## Provisioned resources

Account: `1b4bc53beb85cda4d8618ee8a695585f` (the seller-approved connected account). These identifiers are configuration, not credentials.

| Bucket | Cloudflare binding | Intended content | Current access |
| --- | --- | --- | --- |
| `joeltracks-media` | `MEDIA_FILES` | Published MP3 preview copies and thumbnails | Private; no public URL enabled |
| `joeltracks-private` | `PRIVATE_FILES` | Paid MP3/WAV/stems versions and buyer agreements | Private; no public URL enabled |

Both buckets use **Standard** storage, reported location **ENAM** (Eastern North America), default jurisdiction. The location hint aligns with the main U.S. audience and U.S. East database; it is not a contractual data-residency guarantee. Neither bucket has a custom domain or enabled r2.dev endpoint. The subsequent upload milestone adds PUT-only CORS on the private bucket for the production storefront origin and seven-day cleanup limited to staging objects; verified files and buyer documents have no lifecycle-expiry rule. See [uploads](UPLOADS.md).

The Cloudflare connector successfully wrote a 61-byte non-sensitive verification file into each bucket, read it back exactly and deleted it. Both buckets were empty afterward. No audio, buyer information, order or agreement was uploaded. No new API credentials were created.

## Approved MP3 preview behavior

Use the selected or automatically generated MP3 as the clean, full-length preview source. The seller's November 23 update authorizes automatic WAV-to-MP3 conversion when no MP3 is selected. The browser generates that MP3 once; the verified bytes will be reused unchanged for preview copying and MP3 delivery. No separate preview upload is required. See [the conversion workflow](UPLOADS.md).

The authenticated upload workflow saves private drafts. The current publication stage is implemented as follows (superseding the earlier plan for a public preview copy):

1. Upload and validate an immutable private delivery version. Pending uploads, filenames and client-supplied availability flags do not count as completed files.
2. Publish a verified immutable snapshot and issue short-lived R2 GET links only for its MP3 and optional artwork. The uploaded/generated MP3 is reused unchanged; no separate preview upload or media-bucket copy is needed. Both buckets retain private access. See [publication delivery and expiry](PUBLICATION.md).
3. Keep WAVs, stems and buyer agreements in `PRIVATE_FILES`. Never expose that bucket or its keys through public catalog responses. The MP3 preview itself will be publicly listenable and copyable once serving is enabled.
4. Derive per-beat license availability from verified private assets: Basic needs MP3, Premium needs MP3 + WAV, Unlimited needs all three including stems. Missing optional assets disable only the affected tiers. Recheck before payment; do not replace the buyer's selected tier silently.
5. Retain the asset versions owed to existing paid orders when the seller changes files for future sales.

Private dashboard uploads and explicit Publish/Update storefront/Unpublish controls are connected. WAV/stem files remain private. Dedicated media-bucket/CDN copies remain a later option; uploaded drafts stay private until Publish.

## Runtime connection

`cloudflare.config.ts` pins the approved account and binds the two existing buckets by name. `dev.remote: false` explicitly keeps local Worker development separate from the live buckets. Run `npm run dev:worker` for local R2 bindings; `npm run dev` remains the Node frontend/API without R2 bindings. Local tests must not read or modify live bucket data.

The current Vercel storefront and public API remain in place. A Vercel build does not activate Cloudflare bindings. The existing authorized order-download handler reads only `PRIVATE_FILES`, checks the paid order and scoped session, streams the file and uses private/no-store caching. Its live mail/database/runtime configuration is still pending. No Cloudflare Worker was deployed by this storage setup.

Seller authentication/MFA is now implemented on Vercel; see [seller access](SELLER_ACCESS.md). Private draft uploads now use Vercel, the server-held bucket-scoped S3 credential and protected metadata/finalization APIs; see [uploads](UPLOADS.md). Public catalog publication remains pending. Direct browser-to-R2 uploads require narrowly scoped upload permissions and CORS restricted to the actual admin origins; CORS is not authentication. The production origin now has narrowly scoped PUT-only CORS; wildcard access is not enabled. Do not put R2 credentials in browser code or commit them.

Public preview serving still needs its production delivery route or media domain. No domain has been purchased. Keep r2.dev disabled for the private bucket permanently and for the media bucket during this preparation. Billing alerts/usage monitoring and independent backup/restore setup are still pending; these two buckets in one account are not independent backups.

## Cost and official references

R2 Standard's included monthly usage is 10 GB-month storage, 1 million Class A operations and 10 million Class B operations; above that, published rates are $0.015/GB-month, $4.50/million Class A and $0.36/million Class B, with direct R2 internet egress free. Allowances are account-wide, not per bucket. Usage billing is approved; the $50 overall budget is not a provider-enforced spending cap. Track growth, retained versions and the small additional storage from preview copies.

Checked November 23, 2026: [R2 pricing](https://developers.cloudflare.com/r2/pricing/), [activation](https://developers.cloudflare.com/r2/get-started/), [private/public bucket behavior](https://developers.cloudflare.com/r2/buckets/public-buckets/), [data location](https://developers.cloudflare.com/r2/reference/data-location/), [multipart uploads](https://developers.cloudflare.com/r2/objects/upload-objects/). Binding syntax and explicit local isolation were also verified against the project's installed `@cloudflare/config` types and Cloudflare build output.

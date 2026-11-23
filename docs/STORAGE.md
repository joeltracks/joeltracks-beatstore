# Joel Tracks R2 storage

Provisioned and verified November 23, 2026, after the seller approved the connected Cloudflare account, R2 usage billing and reuse of the uploaded MP3 as the preview.

## Provisioned resources

Account: `1b4bc53beb85cda4d8618ee8a695585f` (the seller-approved connected account). These identifiers are configuration, not credentials.

| Bucket | Cloudflare binding | Intended content | Current access |
| --- | --- | --- | --- |
| `joeltracks-media` | `MEDIA_FILES` | Published MP3 preview copies and thumbnails | Private; no public URL enabled |
| `joeltracks-private` | `PRIVATE_FILES` | Paid MP3/WAV/stems versions and buyer agreements | Private; no public URL enabled |

Both buckets use **Standard** storage, reported location **ENAM** (Eastern North America), default jurisdiction. The location hint aligns with the main U.S. audience and U.S. East database; it is not a contractual data-residency guarantee. Neither bucket has a custom domain, enabled r2.dev endpoint or CORS policy. No automatic object-expiry rule was added that could delete purchased deliverables.

The Cloudflare connector successfully wrote a 61-byte non-sensitive verification file into each bucket, read it back exactly and deleted it. Both buckets were empty afterward. No audio, buyer information, order or agreement was uploaded. No new API credentials were created.

## Approved MP3 preview behavior

Use the seller's uploaded MP3 unchanged as the clean, full-length preview. Do not ask for a second preview file or automatically encode a lower-bitrate version.

When the authenticated upload workflow is implemented:

1. Upload and validate an immutable private delivery version. Pending uploads, filenames and client-supplied availability flags do not count as completed files.
2. At publication, make a byte-identical MP3 preview copy in `MEDIA_FILES`; the seller uploads the MP3 only once. Publish the preview URL only after its copy is complete and verified against the delivery version.
3. Keep WAVs, stems and buyer agreements in `PRIVATE_FILES`. Never expose that bucket or its keys through public catalog responses. The MP3 preview itself will be publicly listenable and copyable once serving is enabled.
4. Derive per-beat license availability from verified private assets: Basic needs MP3, Premium needs MP3 + WAV, Unlimited needs all three including stems. Missing optional assets disable only the affected tiers. Recheck before payment; do not replace the buyer's selected tier silently.
5. Retain the asset versions owed to existing paid orders when the seller changes files for future sales.

These are the agreed requirements for the upload implementation, not a claim that an upload API or dashboard connection is already live.

## Runtime connection

`cloudflare.config.ts` pins the approved account and binds the two existing buckets by name. `dev.remote: false` explicitly keeps local Worker development separate from the live buckets. Run `npm run dev:worker` for local R2 bindings; `npm run dev` remains the Node frontend/API without R2 bindings. Local tests must not read or modify live bucket data.

The current Vercel storefront and public API remain in place. A Vercel build does not activate Cloudflare bindings. The existing authorized order-download handler reads only `PRIVATE_FILES`, checks the paid order and scoped session, streams the file and uses private/no-store caching. Its live mail/database/runtime configuration is still pending. No Cloudflare Worker was deployed by this storage setup.

Seller authentication/MFA is now implemented on Vercel; see [seller access](SELLER_ACCESS.md). Before uploads can go live, connect upload metadata/finalization and multipart validation, catalog publication, and R2 access for the upload runtime. Direct browser-to-R2 uploads require narrowly scoped upload permissions and CORS restricted to the actual admin origins; CORS is not authentication. Configure these once the authenticated upload flow and origins exist, rather than adding wildcard access now. Do not put R2 credentials in browser code or commit them.

Public preview serving still needs its production delivery route or media domain. No domain has been purchased. Keep r2.dev disabled for the private bucket permanently and for the media bucket during this preparation. Billing alerts/usage monitoring and independent backup/restore setup are still pending; these two buckets in one account are not independent backups.

## Cost and official references

R2 Standard's included monthly usage is 10 GB-month storage, 1 million Class A operations and 10 million Class B operations; above that, published rates are $0.015/GB-month, $4.50/million Class A and $0.36/million Class B, with direct R2 internet egress free. Allowances are account-wide, not per bucket. Usage billing is approved; the $50 overall budget is not a provider-enforced spending cap. Track growth, retained versions and the small additional storage from preview copies.

Checked November 23, 2026: [R2 pricing](https://developers.cloudflare.com/r2/pricing/), [activation](https://developers.cloudflare.com/r2/get-started/), [private/public bucket behavior](https://developers.cloudflare.com/r2/buckets/public-buckets/), [data location](https://developers.cloudflare.com/r2/reference/data-location/), [multipart uploads](https://developers.cloudflare.com/r2/objects/upload-objects/). Binding syntax and explicit local isolation were also verified against the project's installed `@cloudflare/config` types and Cloudflare build output.

# Storefront publication

Implemented November 23, 2026. Uploading and saving remain private. The owner controls storefront visibility separately in **Beat library & files → saved beat**.

## Owner workflow

1. Upload the beat files and wait for verification. WAV uploads generate the MP3 automatically. Save any further metadata edits with **Save beat details**.
2. Choose **Publish** on the saved card. The server checks the current verified MP3, any other current files and readable MP3 duration. Finish or cancel incomplete uploads first. Artwork is optional; without it the storefront uses the existing Joel Tracks brand artwork.
3. The published snapshot appears in the category list, search, favorites, beat details, license picker and persistent player. It includes saved title/category/BPM/key/tags, measured duration and artwork when provided. File availability comes from verified version IDs: Basic needs MP3; Premium also needs WAV; Unlimited also needs stems. License prices, terms and splits are unchanged.
4. Later saves/uploads/removals change the private draft. Choose **Update storefront** to replace the published snapshot with the latest saved details and verified file versions. Until then, listeners see the previous published version and its file package.
5. **Unpublish** removes the beat from new catalog and public media requests without deleting files. **View in store** opens the published beat page. Publishing does not open checkout, take payment, accept a license agreement or email files.

## Preview delivery and access

Both R2 buckets remain private. The existing server credential is scoped to `joeltracks-private`; no credential, bucket policy or public domain was expanded. Publication uses the immutable, verified MP3 and artwork already there, rather than copying files into `joeltracks-media` at this milestone. That bucket remains reserved for a later dedicated media/CDN setup.

`GET /api/catalog` returns only the public metadata projection, version-specific application media URLs and verified file-availability flags. It never returns the draft, filenames, upload manifests, hashes, WAV/stem keys or credentials. Only explicitly published snapshots qualify. Browser database roles cannot read publication tables or execute the RPCs, including the public-projection RPC; the server calls it with its service credential.

`GET /api/media/:beat/:version/preview` and `/artwork` check publication/version/asset kind before issuing a ten-minute presigned R2 GET. Audio/image bytes then travel directly from R2; they do not pass through Vercel's API response body. Byte-range requests work for seeking. HEAD returns the authorized MIME type and byte size without issuing a GET signature. No WAV, stems, agreement, arbitrary-key or draft download route is exposed. The signed links authorize one object; changing the object path invalidates the signature.

Catalog and redirect responses use no-store caching. Unpublishing prevents new application media links immediately. Already-issued R2 links can still work until their ten-minute expiry; already downloaded/buffered full-length clean audio cannot be recalled. An open customer page may retain an older catalog until refreshed. The owner dashboard refreshes its local public catalog after publish/update/unpublish without replacing the active editor. Selecting an errored preview again obtains a fresh link.

## Transaction and storage checks

`database/beat-publication.sql` adds a private RLS-protected snapshot table and service-only invoker functions. Candidate preparation and final publication both check the current owner/MFA session. The server checks immutable objects and computes duration with pinned `music-metadata` 12.8.1. Final SQL takes the same beat-first lock used by upload finalization/removal, then compares the exact draft snapshot and previous publication version. A concurrent draft change, publication or unpublish rejects the stale operation. Unpublish rotates the version, so an older in-flight publish cannot silently reverse it.

The snapshot references immutable verified asset versions, not mutable browser flags. Replacements/removal in the draft retain earlier bytes and do not alter the live package until Update storefront. Future paid-order delivery must pin the purchased asset/version and agreement independently; checkout remains closed here.

## Verification and references

Tests cover owner/MFA/origin guards; missing/pending MP3 rejection; no draft/key/credential leakage; metadata projection; preview/artwork-only access; version revocation; private edits; unpublish; stale snapshot/session rejection; UI status and editor preservation; and real local S3 GET/range signatures and encoded MP3 duration. The actual database publication flow, privacy grants and unpublish race were checked as `service_role` using isolated rows inside a rolled-back transaction. The owner's existing one beat and three assets were unchanged, with zero publication records after verification. No owner beat was published by the agent.

The Supabase security advisor reported no new finding. Its pre-existing [leaked-password protection warning](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) remains unchanged.

Primary documentation checked November 23, 2026: [Cloudflare R2 presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [music-metadata stream/duration API](https://borewit.github.io/music-metadata/).

# Private beat uploads

Implemented November 23, 2026, for the approved owner account. The seller dashboard's **Beat library** (`/#studio-catalog`) now saves beat metadata and uploads private MP3, WAV, stems ZIP and JPEG/PNG/WebP files to R2. **This milestone saves private drafts. It does not publish beats, enable buyer checkout or generate agreements.**

## Seller workflow

1. Sign in with the approved password/TOTP flow. Choose **Upload a beat** at the top of Overview, or **Beat library & files** in the workspace menu (`/#studio-catalog`). If an already-open tab still shows the older dashboard, reload the page first.
2. Enter title, category, BPM, optional musical key and comma-separated tags. Add the files you have, then choose **Save draft and upload**. With a WAV selected and the MP3 field empty, a browser worker generates the full-length MP3 automatically. The original WAV and generated MP3 are both uploaded; the MP3 is also the preview source. Selecting an MP3 explicitly uses that file instead of converting the WAV.
3. A progress panel above the form shows conversion, checksum, upload percentage/bytes, file count and verification. Verification is indeterminate rather than falsely showing a completed purchase or ready file. Only the server's verified result enables a file in the draft's license package.
4. A paused upload remains listed. After reconnecting or reloading, choose **Resume** and reselect the same file. For a generated MP3, select the original WAV; deterministic conversion regenerates the matching MP3. The whole-file SHA-256 fingerprint must match. Completed parts are discovered from R2, not trusted from browser storage. Cancelling conversion keeps the form and selected files intact so saving can be retried.
5. Choose **Saved beats** to reach existing drafts, then **Edit beat & files** on the beat you want to change. Edit metadata or add/replace individual files. An empty field preserves the current file. A replacement takes over only after verification. Remove detaches the file from the current package; it does not delete retained immutable versions.

Library load failures show a retry action instead of continuously requesting the API and hiding the upload form behind an indefinite loading message. Successful retries clear the failure state. Browser UI source regression checks cover this recovery path and the visible upload/edit entry points.

## WAV conversion and editor stability

The November 23 request supersedes the original no-transcoding preference. `seller-audio-worker.js` reads bounded chunks of RIFF/WAVE audio and uses the separately loaded, unmodified `lamejs` 1.2.1 encoder. Supported inputs are mono/stereo PCM 8/16/24/32-bit and IEEE float 32/64-bit WAV, including supported WAVE_FORMAT_EXTENSIBLE subtypes, at 8–192 kHz. The encoder targets 320 kbps; MP3 format constraints can lower the bitrate for low sample rates. High input sample rates are resampled by the encoder. No tag, shortening or level normalization is added. Float samples outside the PCM range are clipped when converted to 16-bit samples for encoding.

The WAV is never changed. Conversion does not require another cloud service, and file bytes do not pass through the Vercel JSON API. It requires a browser with Web Workers and the tab remaining open; slower devices take longer. The worker has a ten-minute timeout and can be cancelled. Unsupported/compressed/multichannel/malformed WAVs produce an actionable error; an exported MP3 can be supplied alongside the WAV. The 250 MiB WAV and 50 MiB MP3 limits remain enforced. Only a verified MP3 enables MP3 delivery tiers.

Visibility checks and navigation no longer reset an unchanged authenticated editor. Checks are single-flight and throttled on tab return; every private server operation still independently validates the owner/MFA session. Delayed public startup responses cannot redraw a private editor. Confirmed sign-out/revocation closes private access. Network failures retain selected files and metadata for retry; draft-list refreshes do not discard the editor on a failed save/upload.

Implementation references checked November 23, 2026: [lamejs documentation and source](https://github.com/zhuker/lamejs), [upstream license notice](https://github.com/zhuker/lamejs/blob/master/LICENSE), [Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API). The bundled encoder's source links, attribution and license texts are available at `/assets/vendor/lamejs-NOTICE.txt`. Its bytes match the exact pinned npm package. The independent `mpg123-decoder` test dependency decodes actual generated audio to check duration, pitch, level and channel mode; it is not shipped in the public build.

The UI shows Basic/Premium/Unlimited availability from the tier's configured deliverables and server-derived file flags. Missing WAV disables Premium and Unlimited; missing stems disables Unlimited. Incomplete or failed uploads never qualify. Custom terms remain negotiated. No upload makes a beat public automatically.

## Upload architecture and access

`server/upload-routes.ts` uses the existing owner/MFA/session guard on every route. The app releases the refresh lease after persisting refreshed credentials, before potentially long storage work. Each database RPC separately rechecks the live, MFA-verified application session, upstream Auth session and approved owner. Revocation during verification prevents final availability changes.

The new `jt_private.beats` and `beat_assets` tables have RLS and deny browser access. All upload RPCs are service-role-only, security invoker, with a fixed search path; there are no public definer functions. `database/beat-uploads.sql` is applied to the dedicated project. The service key and R2 credentials remain server-side.

Vercel uses bucket-scoped S3 credentials saved by the owner as sensitive Production variables: `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY`. The approved account is fixed in server configuration and uploads target only `joeltracks-private`. No credential values were read or committed. Both R2 buckets still have public access disabled. The private bucket's CORS permits PUT from **https://joeltracks-beatstore.vercel.app** only, permits Content-Type, exposes ETag and caches preflights for one hour. CORS is not authorization.

Every file, including small ones, uses multipart upload. The server creates a unique `staging/<beat UUID>/<asset UUID>` key and upload ID. It signs a single part at a time for **10 minutes**, with the exact part byte length signed. The browser uploads bytes directly to R2. JSON API requests stay under the app's 4 KB body limit; no audio file is posted through Vercel.

Parts are **10 MiB**, uploaded sequentially with up to three attempts per part and a fresh signature per attempt. Resume uses server/R2 state and whole-file fingerprint matching. One pending upload per beat/file type prevents competing replacements; the seller can cancel it before starting another.

Finalization checks the authoritative ListParts manifest, contiguous part numbers, exact part sizes and total size. It completes the multipart object, then streams it through SHA-256 verification and checks its format header. A conditional CopyObject using the source ETag places the exact bytes at an immutable `beats/<beat UUID>/<asset UUID>` key. The database atomically switches current versions only after success. ETags are treated as opaque conditional-copy/version values, never as full-file checksums. Signed part URLs cannot write the final key or reopen a completed multipart upload.

Retries are idempotent: an already-completed staging object can be reverified, an already-ready asset returns ready, and transient errors leave the prior current file untouched. Verification claims have a five-minute lease. A timed-out verification can be retried after its lease expires. Function maximum duration is 300 seconds; the streaming-read timeout is 240 seconds. There is no detached or unawaited verification job.

## Operating limits and cleanup

These initial implementation limits are deliberately above the stated file sizes and can be adjusted; they are not R2's platform limits:

| File | Maximum |
| --- | --- |
| MP3 | 50 MiB |
| WAV | 250 MiB |
| Stems ZIP | 512 MiB |
| Thumbnail | 10 MiB |

Filename/extension checks reject paths, control characters, empty files and unsupported formats. Verification checks MP3, WAV, ZIP, JPEG, PNG and WebP signatures; empty ZIP archives are rejected. This is not full audio decoding, archive extraction or comprehensive malware scanning. Published release checks and rights review remain separate work.

Upload slots expire after seven days. R2's existing default seven-day multipart-abort rule is preserved. A narrowly scoped lifecycle rule now removes **staging/** objects after seven days, including abandoned completed-but-unverified files. No lifecycle deletion applies to **beats/** verified versions or purchased documents. Aborted/corrupt staging data is also removed best-effort immediately. If cleanup cannot finish after session revocation, the staging lifecycle rule provides the fallback.

Use pinned `hash-wasm` 4.13.0 for browser SHA-256 in 4 MiB chunks. Its vendored standalone UMD build and MIT license are in `assets/vendor`; there is no external hash/CDN request or full-file browser memory allocation. Server SHA-256 is streamed. SDK versions are pinned in the lockfile. Cloudflare's undeployed build target declares the equivalent secrets and Node compatibility; no Cloudflare backend was deployed.

## Verification and remaining integration

Route tests cover authentication/MFA/CSRF, malformed metadata, unsupported/oversized/empty files, missing parts, corruption, format spoofing, bounded part signing, resumable manifests, idempotent finalization, failed/successful replacements, optional-file removal, cancellation and revocation during verification. A local Miniflare R2 S3 test exercises signed multipart PUT, completion, HEAD, streamed checksum verification, deletion and abort. Miniflare 5's experimental S3 endpoint lacks ListParts; authoritative manifests and replacements are separately exercised with route fixtures. Cloudflare's official S3 compatibility documentation confirms ListParts and conditional CopyObject support; no production user file was used for these tests.

Isolated browser checks exercise MP3 plus an **11 MiB** multipart WAV, progress, tier availability, optional-file removal and reload/resume with wrong-file rejection at phone and desktop sizes. File bodies go to the storage endpoint; the largest application JSON body in those checks was 131 bytes. SQL draft/asset transition checks use the existing owner session within a transaction and roll back. No fixture beat, asset or order is left in production. Live upload credential values remain opaque; the owner completes the first real production upload through their own authenticated browser.

Next integrations remain public catalog publication, byte-identical MP3 preview/media serving, license editing, rights/release review, buyer checkout/payment/agreement handling, and authorized buyer file delivery. Independent backups and operational usage alerts remain pending. The existing Supabase compromised-password-screening advisory is unchanged; no paid feature was activated.

Official references checked November 23, 2026: [R2 scoped credentials](https://developers.cloudflare.com/r2/api/tokens/), [presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/), [multipart uploads](https://developers.cloudflare.com/r2/objects/upload-objects/), [S3 compatibility](https://developers.cloudflare.com/r2/api/s3/api/), [CORS](https://developers.cloudflare.com/r2/buckets/cors/), [Vercel function limits](https://vercel.com/docs/functions/limitations).

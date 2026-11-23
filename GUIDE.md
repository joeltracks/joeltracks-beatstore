# JT / Joel Tracks project guide

## Current status - November 23, 2026

Guest checkout and order-scoped email access are now the selected buyer model. The separate Joel Tracks Supabase Free project in MBUGUA BUILDERS / US East and private order-access schema have been created. See [setup and verification](docs/ORDER_ACCESS.md).

Run `npm ci` and `npm run dev` with Node.js 24.22 or later. [Local storefront](http://127.0.0.1:4173/) / [purchase access](http://127.0.0.1:4173/#purchases). The application server runs the API; a static Python server is insufficient for this milestone.

The active website no longer publishes fictional beats, generated previews, sample sales/articles, a public seller demo or pretend form successes. Real contacts remain. Empty catalog/blog and unavailable checkout/access-email states are deliberate until real content and services are configured. The chosen brand, UI styles and bulk pricing remain. Legacy browser data is preserved without importing it as production data.

**Still pending:** backend project secret, email provider credentials and verified sending domain, real catalog/audio/artwork, R2 binding, final agreements/payment and seller authentication. No emails or payments have been sent, and no production deployment has occurred. The sections below retain the historical prototype review and decisions; they do not describe completed live integrations.


Open [the local preview](http://127.0.0.1:4173/) and use the **Seller demo** link in the footer to switch to the studio. To restart the preview, run this command from the project directory.

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

The server serves static files. The 30 fictional tracks, synthesized clean audio, cover art, and sample payment rows are for UI review. Favorites, cart, offers and local statistics are stored in this browser. Edits and selected files are saved in IndexedDB under the preview origin. The studio is a separate local preview screen and is reachable without a sign-in. Production requires server-enforced seller-only access.

## 1. Confirmed requirements

JT organizes beats into R&B Beats, Afro Beats and Trap Beats. Search covers beat titles, categories and seller-supplied tags. The player stays visible across the customer experience and plays clean, full-length audio without a producer tag. Launch planning uses 30 beats, with regular daily additions.

| License | USD | Files |
| --- | ---: | --- |
| Basic | $50 | MP3 |
| Premium | $100 | MP3, WAV |
| Unlimited | $500 | MP3, WAV, stems |
| Custom | Negotiated | To be confirmed for each offer |

Fixed-tier publishing split is 50% artist and 50% JT on the new song. The master royalty split is 90% artist and 10% JT for major-label artists, and 70% artist and 30% JT for smaller indie artists. Custom offers negotiate price and both splits. The U.S. is the research market. The governing state, forum and contracting entity are open decisions.

Before production, confirm who qualifies for each master schedule, how classification is verified, what the splits apply to, how income and deductions are defined, who owns the new master, and how royalties are reported and paid. Confirm how songwriting and publisher shares are registered and administered with any co-writers or publishers. Also pending are allowed uses, caps, term, territory, exclusivity, transfer rights, credits, sample clearance, refunds and upgrade terms.

## 2. U.S. licensing research

Sources checked November 17, 2026.

- **Copyright framework.** U.S. copyright distinguishes the composition from the recording. Permission to incorporate a beat can involve both. Under 17 U.S.C. §§ 101 and 204, a copyright transfer generally requires a signed writing, and the definition includes an exclusive license. Confirm the consequences of any exclusivity with counsel. [U.S. Copyright Office on music copyright](https://www.copyright.gov/engage/musicians/) · [Title 17 definitions and exclusive rights](https://www.copyright.gov/title17/92chap1.html) · [Title 17 ownership and transfer](https://www.copyright.gov/title17/92chap2.html)
- **Beat-store practice.** The U.S. Copyright Office describes nonexclusive beat licenses as common. It identifies restrictions on use, formats, streams, downloads, sales, views and expiration, plus sample clearance and producer royalties, as matters to review. BeatStars documents seller-configured terms, delivery files, offer pricing, and buyer review in the cart. These sources support the structure of the license comparison and agreement preview. The percentages in JT come from your instructions. [U.S. Copyright Office beat-store guide, pp. 8–9](https://www.copyright.gov/music-modernization/educational-materials/Sampling-Interpolations-Beat-Stores-and-More-An-Introduction-for-Musicians-Using-Preexisting.pdf#page=8) · [BeatStars contract editing](https://help.beatstars.com/hc/en-us/articles/4417502073371-How-Do-I-Edit-my-Contracts) · [BeatStars contract creation](https://help.beatstars.com/hc/en-us/articles/6504524929435-How-do-I-Create-Contracts-in-the-BeatStars-Studio-App)
- **Content ID.** YouTube requires exclusive rights to material used as a matching reference and identifies nonexclusively licensed content as ineligible. Distinguish releasing or monetizing a video from using the track as an automated matching reference. [YouTube Content ID eligibility](https://support.google.com/youtube/answer/1311402) · [YouTube reference requirements](https://support.google.com/youtube/answer/107008)
- **Electronic records.** The federal E-SIGN Act addresses the legal recognition of electronic records and signatures. Checkout display and a demo review checkbox create no signature, order, payment or license. Seek a qualified lawyer in the applicable jurisdiction to review contract drafts and the eventual assent flow before use. [15 U.S.C. § 7001](https://www.govinfo.gov/link/uscode/15/7001)

### Recommendations for JT to approve

| Decision | Proposed review starting point |
| --- | --- |
| Exclusivity | Keep fixed tiers nonexclusive and reserve exclusive deals for individually reviewed Custom offers. Define how any existing licenses survive. |
| Release and limits | Consider one new song per beat with an explicit list of permitted outlets and uses. Basic and Premium can have measured caps if JT intends to enforce them. If Unlimited promises uncapped audio streams, name that specific permission. Confirm numbers, duration and what happens when a limit is reached. |
| Video, sync and Content ID | Define permissions for artist music videos separately from film, ads, games and other sync placements. For shared beats, consider a clear restriction on automated claims against other legitimate users. |
| Rights, credits and royalties | Identify the existing beat, the new composition and recording, all rightsholders and any samples. Specify approved credit, whether the master percentages apply to gross receipts, net receipts or an artist royalty base, permitted deductions, reporting, payment and audit terms. |

These proposals remain open. The checkout demo uses an original agreement structure with pending fields. Agreement wording from other sellers was not copied.

## 3. Customer and seller experience

- **Discover and listen.** Browse categories, search titles and tags, combine filters, and sort by newest, title or BPM. Tap a tag to apply it, and clear the filters if no beats match. Play and seek in the persistent player, and move through the current results with Previous and Next. Favorites remain available in their own view.
- **Select and review.** Each beat's price is separate from its + button, which opens the license options. Cart rows list the delivered file formats and let the buyer change or remove a fixed license. Checkout generates one review panel per beat. Both master schedules remain visible in each fixed-tier draft, with eligibility pending. The buyer can mark the demo as reviewed.
- **Negotiate.** The buyer enters an offer price, their publishing and master shares, and release notes. In Seller Studio, JT edits the price, splits, status and negotiation notes. For this local demo, set **Terms agreed** to enable that revision in **My custom offers**, then add it to the cart. A later seller revision removes the previous version from the local cart.
- **Manage.** Seller Studio has Overview, Beat library, Analytics, Payments, Custom offers, Featured beat and Licenses. Overview uses labeled sample business analytics with a selectable date range and count-up totals. Analytics shows local browser activity. The editor accepts a thumbnail, optional preview, MP3, WAV, and ZIP for stems. It supports drafts, published beats and comma-separated tags. Published local beats need playable audio. A fixed license appears as unavailable when its configured delivery files are missing. Featured beat selects the storefront beat and editorial label. Licenses edits local draft prices, files, splits and terms, with version increments. Payments shows a donut chart of sample and locally simulated payment amounts, plus unread sale badges. Custom offers has an unread counter. Same-origin tabs receive local updates through browser storage events. Real events and access control remain pending.
- **Responsive and accessible.** The track list prioritizes title, play, BPM, favorites and license selection on narrow screens. The player becomes a two-row dock and the checkout stacks its sections. The interface includes named controls, keyboard focus, modal focus restoration, status announcements, no autoplay, and reduced-motion support. It also includes empty results, empty cart and favorites, missing media, and local save error states.

## 4. Agreement generation

The prototype renders a draft from the cart’s beat identifier and title, selected tier, USD price, delivery formats, buyer display name and applicable royalty schedule. A Custom draft draws its price and splits from the saved offer revision, with negotiated notes identified separately. Pending terms are visible next to price and deliverables. Reviewing the preview changes demo UI state only.

For production, generate each agreement from the lawyer-approved tier template and version, beat/version, legal party details, order reference and exact license price and currency. Include item price and applicable taxes or discounts in the order breakdown, the effective date and conditions, permitted rights and limits, delivery assets, attribution, ownership and royalty terms, samples, breach and remedies, and governing law. Keep the version presented to the buyer, require a fresh review if terms or items change, and keep agreement review, legally reviewed assent, payment confirmation, and file delivery as separate steps.

## 5. File storage comparison

Limits below were checked against provider documentation November 17, 2026. These are service allowances. The linked provider terms and acceptable-use policies apply.

| Service | Included usage and file limit | Access and fit |
| --- | --- | --- |
| Cloudflare R2 Standard | 10 GB-month per month, 1 million Class A and 10 million Class B operations per month, free direct internet egress. Up to 5 GiB for a single-part upload and about 4.995 TiB multipart. | Private buckets by default, time-limited S3 URLs for private delivery, and a custom domain for production public assets and caching. The R2 subscription must be enabled and overages are billable. The managed r2.dev URL is rate-limited and intended for development. |
| Backblaze B2 | First 10 GB stored free. Standard egress allowance is three times average monthly storage. Additional direct egress is $0.01/GB, with routes through participating partners available. Native normal uploads handle up to 5 GB and large multipart files up to 10 TB. | Public or private buckets and S3 presigned URLs. Fits the files at launch. Budget egress against preview traffic, especially at low stored volume, or evaluate a supported CDN partner. |
| Supabase Free | 1 GB file storage, 50 MB per upload, 5 GB cached plus 5 GB uncached egress per billing cycle. The egress pools are separate. | Public buckets or private access using row-level policies and signed URLs. Suitable for a small preview-only subset and thumbnails. JT’s stems exceed the file cap and the full launch catalog exceeds the storage allowance. |

- [R2 pricing](https://developers.cloudflare.com/r2/pricing/) · [Object and upload limits](https://developers.cloudflare.com/r2/platform/limits/) · [Subscription setup](https://developers.cloudflare.com/r2/get-started/) · [Public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/) · [Presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)
- [Backblaze B2 pricing](https://www.backblaze.com/cloud-storage/pricing) · [Large files](https://www.backblaze.com/docs/cloud-storage-large-files) · [Bucket access](https://www.backblaze.com/docs/cloud-storage-buckets) · [S3-compatible API and presigning](https://postman.backblaze.com/)
- [Supabase plan limits](https://supabase.com/pricing) · [Egress](https://supabase.com/docs/guides/platform/manage-your-usage/egress) · [Bucket access](https://supabase.com/docs/guides/storage/buckets/fundamentals)

**Commercial-use review.** The reviewed pricing pages publish no personal-use-only condition for these allowances. Supabase requires the rights and consents necessary for the content you upload. Cloudflare’s service-specific CDN terms address large-file delivery through its storage products, including R2. Backblaze’s full terms page could not be retrieved during this review, so its commercial-use conditions remain unverified here. Confirm the applicable account agreement before choosing a provider. [Supabase terms, section 9(a)](https://supabase.com/terms) · [Cloudflare service-specific terms](https://www.cloudflare.com/service-specific-terms-application-services/) · [Cloudflare explanation of large-file hosting terms](https://blog.cloudflare.com/updated-tos/)

**Recommendation for your approval.** R2 Standard is the best fit of the three for public full-length listening and private delivery. At 133–245 MB per beat, 30 beats total roughly 4.0–7.4 GB before thumbnail and separate preview copies. Assuming one similarly sized beat per day, the catalog would pass 10 GB after about 11–46 additions. Billing uses average daily peak storage across the billing period, so the first billed month depends on timing. Operation counts can also incur charges. Keeping public compressed preview copies and thumbnails separate from private MP3 delivery files, WAVs and stems allows separate access policies. A full-length clean browser preview can be copied by a listener. Cloud storage has not been connected.

## 6. Redesigned prototype

The customer storefront now uses the measured reference's black backdrop, charcoal panels, light beat-list canvas and Poppins type, with JT's mint accent and original content. The seller workspace retains its navy palette and DM Sans/Bricolage typography. All three interface fonts are served locally, with their OFL licenses in `assets/fonts`. The selected **Soft Seal** logo uses the full lowercase name in a capsule, with outlined Fraunces lettering and no JT initials. It appears in the storefront, footer and seller header. Browser icons and small seller marks use a simplified capsule perimeter. The [current logo usage guide](assets/branding/soft-seal/USAGE.md) documents the files and typeface license; earlier iterations are archived. The featured demo cover is [generated artwork](assets/after-hours.jpg). The original numbered thumbnails and synthesized, untagged audio remain demonstration assets.

Use the + beside a beat's price to select a license and add it to your cart. Once selected, the button becomes × and removes the beat directly from the list. The cart lists files and supports license changes. Checkout shows one draft agreement per beat, with pending legal terms visible.

The [browser feedback review](.taste-skill/browser-feedback-review.md) maps all thirteen requested changes to the implementation and records the latest checks. Saved seller license edits update the storefront and future draft previews in this browser; reviewing updated terms is required again. Historical simulated sale amounts are snapshots and do not change when a license price changes.

The later [sidebar and purchase-tally review](.taste-skill/sidebar-purchase-review.md) covers the contained seller navigation and **Payments → Purchases by beat**. The searchable tally includes only beats with at least one paid sale, counts one purchase per paid transaction and excludes pending and refunded records. Counts update after simulated sales and survive reload. These are sample and local demo records until the backend is connected.

The header now includes Favorites, Contacts and Blog. Contacts links to the seller-provided Instagram profile [@prodbyjo_el](https://www.instagram.com/prodbyjo_el/) and [joeltracks2000@gmail.com](mailto:joeltracks2000@gmail.com), each with a matching icon. Instagram opens in a new tab; Email opens the visitor's configured email app. The separate enquiry form still saves a draft in this browser without sending it. The three blog articles are original editorial drafts for review.

The seller overview contains sample revenue and listening charts with date-range and metric controls. Its optional Replay reveal button demonstrates the requested generation animation. The Analytics screen charts local preview activity. The beat library has title/tag search, status filtering and an editor for metadata, artwork and files.

See the [redesign review](.taste-skill/redesign-review.md) for the design direction, the full image prompt and verification details. Browser checks covered shopping, playback, charts, local editing and responsive layouts from 320 to 1440 pixels. The automated taste gate could not start its subprocess and returned GATE: ERROR (spawn EPERM). Formal screen-reader testing, OS-level reduced-motion emulation and a full frame-by-frame recording remain unverified.

The [typography and motion review](.taste-skill/type-motion-review.md) documents the later font and interaction update. Native scrolling drives adaptive rounded boundaries around the header, filters and player. The catalog controls stay reachable, artwork subtly responds to scrolling, content enters once, and dialogs use interruptible critically damped springs. Reduced-motion rendering was checked with browser emulation. Formal assistive-technology and OS-level preference testing remain pending.

## 7. Reference-inspired storefront and proposed license terms

The November 18 update uses Ear2ThaBeat's store and FAQ as design references. The extraction made six visits covering two unique pages, including desktop, phone and system-dark measurements. The storefront now puts the featured beat inside the catalog, followed by category, search, tag and sort controls, a light track list, a three-step shopping guide, four license cards and concise FAQs. JT keeps its own mint accent, logo, artwork and original copy. The [design system](DESIGN.md) records measured values, deliberate adaptations and extraction limits; `design-system/preview.html` shows the tokens and component recipes.

Three original SVG shopping icons were measured against the existing JT icon family, linted and refined through three render rounds. The [reference redesign review](.taste-skill/reference-redesign-review.md) records implementation and verification details. Browser checks covered playback, combined filters, favorites, adding and removing a selected license, synchronized cart totals, public license details, checkout and the seller proposal disclosure. Screenshots were inspected at 320, 390 and 1440 pixels; the native 714-pixel view also had no horizontal page overflow.

The [JT license schedule and original draft framework](LICENSING_PROPOSALS.md) distinguish source practices from recommendations, with direct links checked November 18, 2026. Following your later request to use the dashboard license details in checkout, the schedule now supplies empty legacy fields in the editable license drafts. Saved nonempty wording takes precedence. Find the source notes under **Seller Studio → Licenses → Usage schedule and research notes**. Customer license cards, beat pages and checkout read the same settings for each tier. Custom price and splits remain negotiated. A qualified lawyer in the applicable jurisdiction must review the terms and eventual assent process. No backend, production seller authentication, payment processing, real order or contract execution was added.

## 8. Beat pages and cart feedback

Click a beat name in the store, favorites, featured panel, cart or persistent player to open its detail page. It shows artwork, category, producer, tempo, key, duration, all tags, preview playback, favorites, current cart selection and the available license packages with their dashboard terms. The × control or Escape returns to the originating view. Closing restores the current filters, scroll position and keyboard focus. Direct links use `#beat-<beat-id>` and unavailable beats show a recovery link.

Adding a new beat animates a small artwork tile toward the header cart and drops it into the icon. Changing the license on an existing cart item does not replay an addition. The UI updates immediately; motion never blocks input. List/detail transitions use the transitions.dev side-by-side recipe, mirrored on return. Reduced-motion preference skips both the flight and page slide.

The [beat-detail feedback review](.taste-skill/beat-detail-feedback-review.md) records the shared-license checks, migration behavior, shopping checks and responsive screenshots. Your current browser cart was preserved. This remains a frontend review: contract display is not legal assent or a completed purchase.

## 9. Release guide and footer

The storefront footer now takes inspiration from Ear2ThaBeat's release-platform strip and four-column layout. JT's version lists Spotify, Apple Music, Amazon Music, YouTube, Deezer and TIDAL as release examples, then explains audio releases, music videos and live performances with three original SVG icons. Permissions and limits remain subject to the selected license; the section does not promise distribution or platform approval. Links lead to current JT license details and Contacts for reserved uses.

The remaining footer includes the latest logo, original brand description, category links that filter the catalog, Favorites, Licenses, FAQs, Contacts, Blog and a newsletter form preview. The preview validates an email field and shows a local confirmation; it creates no subscription, stores no address and sends no email. Contact details and social links have not been invented. The seller workspace retains its compact footer.

The [footer review](.taste-skill/footer-review/REVIEW.md) contains source links, measured values and checks. Desktop, tablet and phone layouts were inspected from 320 to 1440 pixels. The icons passed lint and two render/review rounds. Existing browser cart state was preserved.

## 10. Focused interface refinement

The approved refinement retains JT's logo, fonts, palette, features, section order and license terms. A more compact catalog exposes beats earlier on phone and tablet. Search and categories remain visible; **Tags & sort** expands the additional controls at 900px and below, preserving its open state while filtering or resizing. Beat rows use 44px or larger play, favorite and add/remove targets.

The seller dashboard uses quieter headings and figures so the primary chart leads. Switching the overview metric now also changes its heading to Preview activity or License revenue. Decorative artwork travel and individual content reveals were removed; adaptive boundaries, cart feedback, beat-page transitions, chart drawing and count-ups remain with reduced-motion support.

The [focused refinement review](.taste-skill/unslop-refinement/REVIEW.md) documents all nine passes and verification. Responsive checks passed at 320, 390, 714 and 1440 pixels, alongside shopping, playback and license regression checks. This remains a local frontend prototype.

## 11. Selected Soft Seal logo

Following selection of **B — Soft Seal**, the full-name capsule replaces the previous logo across the customer and seller views. The near-white reversed version is used on dark backgrounds. Black and mint SVG variants, transparent PNGs, a capsule small-size cut and browser icons are supplied in `assets/branding/soft-seal`. The former initials are no longer part of the active branding assets.

The logo is vector artwork, so it adds no runtime font download. Its lettering is a true transparent cutout. Desktop and phone placements were visually inspected; the existing responsive layout check passed at 320, 390, 714 and 1440 pixels. Store features, saved state and license settings were preserved. See the [usage guide and verification notes](assets/branding/soft-seal/USAGE.md).

## 12. Automatic bulk deals

The offer banner moves from right to left and advertises **2 beats: 15% off** and **3 or more beats: 25% off**. Following the seller's placement feedback, it is fixed directly above the beat player, with no pause/play button. Hover or keyboard focus pauses the strip, and reduced-motion preference shows static offers. It follows the responsive player's height, reserves space for footer content and notices, and stays out of the seller dashboard.

The discount applies automatically to the current valid cart, including agreed custom offers. It recalculates after adding/removing beats or changing a license. Only the applicable quantity rate is used. The cart shows listed prices, discounted per-beat fees, subtotal, savings and total; checkout drafts include the corresponding per-beat discount and effective fee. The calculation uses integer cents and reconciles rounding across the items. Base license prices, royalty splits and usage terms are not edited.

The [bulk-deal review](.taste-skill/bulk-deals-review/REVIEW.md) records the pricing cases, browser checks and responsive proofs. This is frontend behavior only; payment processing and real order completion remain pending.

## 13. Backend proposal

The [backend plan](BACKEND_PLAN.md), researched November 18, 2026, covers the Kenya-based individual seller, absence of a USD bank account, US$50 monthly infrastructure ceiling and domain setup. It recommends Cloudflare Workers/R2, Supabase and transactional email, with a conditional PayPal-first USD payment route compared against Paystack KES settlement. It includes verified cost notes, checkout/contract/delivery flows, build stages and unresolved launch decisions. This is a proposal; no production backend, paid subscription or payment integration has been configured.

Revised November 19 after the supplied plan review: payment feasibility is Stage 0; server-only sessions/data access, guest offer recovery, multipart uploads, controlled private downloads, conditional exclusivity, independent backups, seller recovery, accounting exports and monitoring are specified. The plan records all 20 review proposals and corrects the PayPal digital-goods protection and Supabase recovery-code assumptions. A fixed-tier-first release and preview encoding are recommendations awaiting seller approval, not changes to the current prototype. The updated light-usage estimate is $32–$37/month before taxes/payment charges, with the listed free-tier and runner assumptions.

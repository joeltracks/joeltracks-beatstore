# Joel Tracks — Soft Seal

Selected by the seller on November 18, 2026: B from the framed-wordmark exploration. The full lowercase name and capsule are the logo; JT initials are not part of it.

## Artwork

- `joel-tracks.svg`: near-white #edf7f8, for the black storefront and navy seller workspace.
- `joel-tracks-black.svg`: #151515, for light backgrounds.
- `joel-tracks-mint.svg`: existing brand mint #6ce4d4, for suitable dark backgrounds.
- `joel-tracks.png` and `joel-tracks-black.png`: transparent 1600×369 raster exports.
- `capsule.svg`: a simplified enclosure for small seller identity placements.
- `favicon.svg`, `favicon.ico` and `apple-touch-icon.png`: compact capsule on a dark tile. ICO contains 16/32/48px images; Apple icon is 180px.

The website uses the near-white full-name logo at 224px wide in larger headers, 180px on phone, and 164px at 360px and below. Customer footer width is up to 220px. Keep the original 13:3 aspect ratio and clear space of at least one sixth of the capsule's height. Recommended minimum full-name width is 164px; use the supplied capsule cut for smaller icon placements. The capsule cut has thicker walls and a larger counter for small sizes, without adding initials or tiny unreadable words.

All lettering is outlined; no installed font or runtime font request is needed. The capsule's lettering uses real transparent negative space, with intersecting font contours resolved through a vector difference operation. Do not stretch, add shadows, put text inside the cutout or reintroduce the former monogram.

## Typeface and licensing

The source lettering is Fraunces 650, optical size 72, SOFT 75, WONK 1, with optical spacing. Original font copyright: The Fraunces Project Authors. The font is licensed under the SIL Open Font License 1.1; the supplied notice is `Fraunces-OFL.txt`. The original source remains archived in the earlier concept exploration. [Official source license](https://raw.githubusercontent.com/google/fonts/main/ofl/fraunces/OFL.txt), checked November 18, 2026 during concept creation.

## Verification

- Final production geometry matches selected B, with a tighter viewBox for consistent placement; the concept's shape and lettering are preserved.
- Inspected the storefront header, customer footer and seller header/identity icons in the native browser. Logos loaded and no horizontal overflow was observed.
- Existing responsive layout verification passed at 320×844, 390×844, 714×662 and 1440×900, preserving 44px controls, compact filters and visible beat rows above the player. JavaScript syntax check passed.
- SVG audit confirms one-color outlined geometry, no live text, raster, filters or gradients. Its complexity advisory reflects the full ten-letter serif outline. The capsule small-size cut has an intentional wide footprint within the square canvas. A zero-warning audit is not claimed.
- Proofs are in `review/store-desktop.png`, `review/store-phone.png` and `review/studio-desktop.png`; `review/icon-48.png` shows the compact icon.

This branding update does not change interface fonts, palette, features, prices, saved settings or licensing terms. Earlier logo concepts remain archived. Trademark clearance has not been performed; a professional search is recommended before a public launch.

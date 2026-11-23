# Automatic bulk deals

Implemented November 18, 2026 from the seller's requested offers: buy 2 beats for 15% off, or 3 or more for 25% off, applied automatically in the cart.

## Customer behavior

- A mint strip moves continuously from right to left, carrying both quantity offers and the automatic-cart message. Following the seller's placement feedback, it is fixed directly above the persistent player. The old top-of-page placement is removed.
- The pause/play button is removed as requested. Hover and keyboard focus pause movement; the focusable strip has a visible focus indicator. The banner DOM is retained across route/cart rerenders. Duplicate visual copies are aria-hidden, with one static description for assistive technology.
- Reduced motion disables the marquee and displays the two offers as static text. The banner is hidden in seller views. A ResizeObserver keeps the strip aligned to the responsive player's top edge. Footer padding, scroll clearance and notices account for the combined dock height. Compact intro spacing preserves access to the beat list.
- Valid cart beats determine the rate: 0/1 → 0%, 2 → 15%, 3+ → 25%. No stacking of the two rates. Agreed custom prices participate alongside fixed tiers; unpublished/unavailable/stale-offer rows remain excluded by the existing cart eligibility checks.
- Current license prices feed one calculation. Header/catalog totals, discounted cart rows, subtotal/savings/total and agreement fees stay synchronized. Removing beats lowers or removes the discount; changing a tier recalculates the amount.
- Discounts are allocated proportionally in integer cents, with remaining cents assigned by largest remainder. Per-beat effective fees always sum to the displayed order total. Fractional currency uses two decimal places.
- Agreement drafts show the listed fee, discount and effective fee. Base tier settings, grant/usage terms and publishing/master splits remain unchanged. Existing cart mutations invalidate the demo review checkbox.

## Checks

- `node --check bulk-deals.js`, `app.js`, `design.js`: passed.
- `node .taste-skill/check-bulk-deals.mjs`: passed explicit quantity thresholds, fixed/mixed/negotiated prices, fractional cents, item removal, license changes, non-stacking and exact reconciliation across 30 cart sizes.
- `node .taste-skill/check-feedback.mjs`: passed existing license, custom-offer, notification, payment/tally checks plus discounted agreement fees and totals.
- `node .taste-skill/check-polish-layout.mjs`: final run passed at 320×844, 390×844, 714×662 and 1440×900. No horizontal page overflow; static reduced-motion rendering; 44px row controls; at least one complete beat row above the player. An initial run reported narrow-screen overflow; targeted reads did not reproduce it, and the final full check passed. Failure-only diagnostics remain in the check for future investigation.
- Desktop and 390px phone proof captures were rendered and visually inspected: `store-desktop.png`, `store-phone.png`.
- Updated docked proofs are `docked/store-desktop.png` and `docked/store-phone.png`. The revised responsive check passed at 320, 390, 714 and 1440px, asserting no banner buttons and a flush banner/player boundary. Complete beat rows remain visible above the strip. Pricing and agreement regressions passed again without changing the discount calculation.

Native browser checks:

| Cart | Listed total | Discount | Result |
| --- | ---: | ---: | ---: |
| Basic $50 | $50 | None | $50 |
| Basic $50 + Premium $100 | $150 | 15% / $22.50 | $127.50 |
| Add Unlimited $500 | $650 | 25% / $162.50 | $487.50 |
| Change the first beat to Premium | $700 | 25% / $175 | $525 |
| Remove Unlimited | $200 | 15% / $30 | $170 |
| Remove one Premium | $100 | None | $100 |

The two-beat checkout showed effective fees of $42.50 and $85, with their respective discounts of $7.50 and $15. The header agreed with the order total. Pause/resume changed the computed animation state correctly. Temporary test beats were removed, restoring the original empty browser cart.

## Scope

Frontend only. There is no new payment processing, real sale, completed order, signature or automatic file delivery. Seller payment simulation remains a separately labeled sample workflow. The selected Soft Seal logo, interface fonts, palette and license terms are preserved.

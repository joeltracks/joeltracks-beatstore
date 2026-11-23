# Sidebar containment and purchases by beat

Checked November 18, 2026.

## Sidebar

The old sticky navigation could travel into the seller footer because its containing block included that footer. A navigation region now consumes the available space above the footer, with one sticky child inside it. The outer region is static. This also overrides the earlier first-child sticky rule explicitly. The sticky child is constrained by the region's end, preserving the existing 32px gap before the seller details. Mobile navigation remains a normal horizontal scroller.

In the 714px review browser, the Analytics sidebar kept its navigation at 100px from the viewport top during an intermediate scroll. At the page bottom it stopped at its containing boundary and retained a measured 32px gap above the seller details. The Payments page also retained a 32px gap at its bottom, with no page-level horizontal overflow or captured console errors.

## Purchase tally

Payments now includes a searchable Purchases by beat table, sorted by paid purchase count descending, then alphabetically. Following the user's refinement, only beats with at least one paid sale qualify. Beats with zero paid sales are omitted, including from search. Each Paid transaction contributes one purchase; Pending and Refunded transactions do not contribute. With no qualifying sales, the section displays a No recorded sales yet state.

New simulated sale records carry the beat ID. Seeded sample records also carry IDs. This preserves the association if a beat's title changes. Older local records containing only a title match the current catalog only when the title is unique. Unmatched or ambiguous older records appear separately with an ID-unavailable note so the UI does not assign them to the wrong beat.

The tally uses the same sample-plus-demo transaction collection as the existing payment chart. It updates on local simulated sales and same-origin storage events. No payment processor or backend has been added.

## Checks

- JavaScript syntax checks passed for app.js, design.js and seller.js.
- The existing focused check script passed with added purchase-count cases for repeated paid purchases, status exclusions, exclusion of zero-sale beats, renamed beats and ambiguous older titles.
- In the isolated localhost test browser, a simulated Palm Wine purchase changed the displayed count from 0 to 1 and stayed at 1 after reload. The seller notification also updated.
- In the user's review browser, the existing After Hours and Sundown paid demo records each displayed a count of 1. The user's stored sales and unread state were preserved.
- Search and the no-results state were checked. Desktop and 390px mobile captures were reviewed.
- After the sold-only refinement, the review browser showed only After Hours and Sundown, each with one paid sale. Searching for zero-sale Black Ice returned no matches. The focused checks passed with zero-sale beats excluded.

The initial screenshots are purchase-tally-desktop.png, purchase-tally-mobile.png and purchase-tally-tiles. The sold-only refinement is captured in sold-beats-only.png and sold-beats-only-tiles. Full-page screenshots are stitched references; fixed-header seams can appear in them.

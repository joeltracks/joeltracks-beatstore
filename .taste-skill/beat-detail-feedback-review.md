# Beat details, license settings and cart feedback

Completed November 18, 2026 in response to the three new browser comments.

## License details

- The seller explicitly requested the dashboard's usage details in the customer agreement. The previously prepared schedule now seeds the editable tier fields through `dashboardLicenseDefaults`. It retains the original price/file/split settings. Nonempty saved grant, limit and additional-term wording takes precedence.
- Legacy blank fields receive the schedule and advance their saved draft version when applicable. A settings marker preserves deliberately cleared fields after a future save. Dashboard edits remain the shared source for public license cards, beat details and checkout.
- Custom uses a negotiated grant/limits framework. Its agreed offer revision continues to supply the price, artist, publishing/master allocations and negotiation notes. No unnegotiated exclusive rights or automatic delivery are implied.
- Remaining ownership, eligibility, royalty basis, accounting, sample, termination and jurisdiction definitions are explicitly unresolved. Qualified legal review is still required. No signature, payment or license activation was added.
- An older cached seller script was identified during browser verification. Script URLs now include a version so the updated settings are loaded together. Temporary diagnostics were removed.

## Beat detail page

- Beat titles are named links in catalog/favorites rows, the feature, cart and player. The page shows all available customer catalog metadata, artwork, all tags, listening controls, favorite, selected tier/price and the four license packages. Raw demo IDs and seller business statistics are not presented as customer marketing details.
- Available file packages determine purchasable buttons. Missing fixed-tier assets disable the corresponding action. Custom remains available for an offer. Direct links work; invalid or unpublished beats show an unavailable state.
- The ×, Back link and Escape close the page. Closing returns to the original route, preserves filters and scroll, and restores keyboard focus to the title link. During animation, the outgoing page is inert and its duplicate IDs are removed. Focus is retained when transition wrappers are cleaned up.
- Existing persistent playback continues across navigation; no autoplay was introduced.

## Motion

- Apple Design principles guide immediate feedback, reversible short-distance motion and reduced-motion behavior. The transitions.dev side-by-side CSS is installed with its documented hooks and reduced-motion guard: 250ms, 8px, 3px transient blur. Outgoing content is removed after the transition and remains noninteractive while departing.
- A successful new cart entry emits `jt:cart-add` after state and header update. One 44px artwork chip travels from the visible artwork or trigger toward the cart, shrinks and drops in over 560ms. The cart icon receives a small settling movement. Existing-item license changes do not replay it. Rapid rerendering cancels and removes the prior chip; completion also removes it. Reduced motion skips the effect.

## Checks

- JavaScript syntax checks passed. The focused frontend suite verifies every tier's saved grant/limit/additional-term overrides in agreement output, negotiated Custom price/splits/notes, default schedules, legacy migration and preserved intentional blanks. Existing sale-only tally, notifications, prices, formats, recipient allocations and escaping checks remain green.
- Isolated localhost browser: opened Low Beam by name; played and paused; selected Premium; verified the matching grant, 10,000-copy/500,000-stream limits, duration, territory and additional terms in checkout. Direct Basic addition created a decorative flight chip and changed the cart from five to six entries; removal restored five. The chip disappeared after completion.
- Opened High Tide from filtered results; closed by × and Escape. Search and scroll remained, and focus returned to the named title link after the animation wrapper was removed. No browser warnings/errors were captured. QA cart changes were restored and the temporary QA tab closed.
- Screenshots inspected at 320, 390 and 1440px. The mobile detail header was refined from a large stacked cover to a compact artwork/title arrangement, keeping listening and cart actions visible before the dock. The native 714×662 view had no horizontal overflow; the purchase button ended at y=553 while the player began at y=574.4. The user's one-item cart was preserved.
- Final proof images: `.taste-skill/beat-detail-review/final/beat-page-desktop.png`, `beat-page-phone.png`, `beat-320-desktop.png`. The phone screenshots precede a later reduction in top padding; the control order and layout are unchanged. The final tablet layout was additionally inspected in the live browser.
- Reduced-motion guards were inspected in code; no new OS-level preference or formal screen-reader testing was performed in this pass. The flight's creation and cleanup were checked live; a frame-by-frame video review was not performed.

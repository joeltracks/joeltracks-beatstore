# JT typography, motion and logo review

Checked November 17, 2026 against the local static prototype.

## Typography

Applied Bricolage Grotesque for headings and DM Sans for body and controls. The font skill search also surfaced Righteous/Poppins, Syncopate/Space Mono and Space Grotesk. Bricolage provides a more distinctive headline shape, while DM Sans keeps dense beat metadata and agreement copy readable. This pairing is a design choice, rather than a preset library pairing.

Font files came from the official Google Fonts CSS service. OFL license files came from the google/fonts repository and are stored alongside the WOFF2 subsets. Typography uses a 16px base and minor-third rhythm, with contextual size adjustments. Controls retain usable touch targets. Active tag text was darkened after contrast measurement. Ordinary muted text against the page background measures about 6.73:1. White on the action background measures about 4.71:1.

## Motion and adaptive surfaces

- Native browser scrolling and momentum remain in control. Scroll listeners are passive.
- Header and player surfaces respond through a scalar spring, preserving position and velocity when scroll direction changes. Their layout footprints remain constant.
- Sticky catalog controls develop a translucent boundary at the dock position. A ResizeObserver tracks their actual height for anchor and focus clearance.
- Featured artwork uses a restrained crop transform and changing corner radius. Rows and supporting panels enter once without being hidden by default.
- Dialogs open and close with critically damped springs. Escape and the close button can initiate closing without blocking input.
- Reduced-motion rendering skips entrances, artwork movement, chart drawing and optional chart generation. Reduced transparency and increased contrast preferences also have CSS fallbacks.
- Charts retain textual labels and expandable data tables. Animation is supplementary.

## Logo checkpoint

Three original path-only SVG directions were refined in two saved iterations, audited and rendered. The overview shows 64px, 32px and 16px marks. Common Time is recommended for its immediate JT recognition. Afterbeat is softer and more approachable. Two Takes is more abstract and has weaker initial recognition.

The user subsequently selected C, Two Takes, then requested more stylized lettering. The current refinement uses original angular capital letterforms in `assets/branding/two-takes-v2`. The original C symbol is retained. The previous outlined-font kit remains archived in `assets/branding/two-takes`. The current mark is applied to storefront and seller headers, footer and favicon. No trademark clearance is claimed.

## Verification

- Browser layout checks at 320, 390, 706, 768, 820, 1024 and 1440px found no page-level horizontal overflow in the store.
- Mobile category filtering, tag search, play/pause, cart, checkout agreement reading, dashboard and editor were checked. Cart, checkout and dashboard had no page overflow at 390px.
- Header and catalog docking were observed during real scrolling. Dialog open/close and Escape were checked. No captured warnings or errors appeared in those browser checks.
- JavaScript syntax checks passed. A focused spring calculation check covered direction reversal, settling and reduced-motion endpoints.
- A 390px screenshot was rendered under browser-emulated reduced motion. OS-level preference changes and formal screen-reader testing remain unverified.
- Existing user cart and favorite state was preserved. Interaction checks used a separate localhost origin for test state.

Screenshots are `type-motion-desktop.png` and `type-motion-mobile-reduced.png` in this directory. The desktop capture is a stitched full-page reference and can show fixed elements at a viewport seam.

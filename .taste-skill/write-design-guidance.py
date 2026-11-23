from pathlib import Path
p=Path('DESIGN.md');s=p.read_text(encoding='utf-8');front='---'+s.split('---',2)[1]+'---'
prose='''

<!-- extract-design: the front matter above is generated from design-system/roles.json. Change roles.json, then run extract.mjs --rebuild to refresh it. The prose below is yours. -->

# JT storefront design system

## Overview

The customer store is inspired by Ear2ThaBeat's catalog, embedded featured-track panel, purchase guide and four-column license comparison. It is not affiliated with that site. Measurement covered two unique pages, the store and FAQ, across six visits: three desktop visits including an FAQ URL redirect duplicate, two phone visits and one dark-mode check. Source measurements and screenshots are retained in design-system/source.

JT keeps its custom Two Takes logo, mint accent, own artwork, clean preview behavior and license structure. It uses the reference's black backdrop, charcoal surfaces, light beat-list canvas and Poppins typography. The seller workspace keeps its existing navy palette and DM Sans/Bricolage typography; the new storefront CSS is scoped to customer views.

## Colors

Use --color-background (#000000) for the customer page and --color-surface (#131313) for the catalog surround, pricing cards and persistent player. Use --color-surface-raised (#1e1e1e) for inputs and card headers. The reference's main Buy Beats button was #252525 with a red outline; the extraction's first-guess #29775c primary came from the free-download notice, not that CTA. The source also has gold text and a red banner. These branding colors are not adopted.

JT's existing --color-primary (#6ce4d4) remains its action and active-state color, with --color-primary-foreground (#092629) on filled controls. --color-heading is white, body text #dadada and secondary text #a5a5a5. The purple link and nearly invisible focus values in the initial extraction were replaced with JT mint for contrast. The reference's frequent white borders mostly belong to the FAQ; JT uses --color-border (#343434) for quiet separators.

The beat list is the deliberate inverse canvas: --color-surface-inverse (#f9fafa), --color-canvas-text (#15191c), --color-canvas-muted (#52606a), --color-canvas-border (#d8dfe2). On that canvas, selected favorites and tag text use --color-canvas-accent (#14685e), not light mint. All new colors are declared in roles.json and generated tokens.

## Typography

Poppins was measured across body and headings. It is an open-license family, served locally from official Google Fonts WOFF2 assets with its SIL OFL license. JT uses 400/500/600/700. The reference's 14px weight-300 body is adapted to 16px weight 400 for readability. Store title is 36px/600, phone title 28px/600; section titles 24px/600 and interface labels 14px. Track titles remain at least 14px on phone. Small secondary metadata is 12px. Large prices use the measured 48px/700 role.

The logo lettering is original outlined artwork, not Poppins. Keep text left aligned, with tabular numerals for prices and counts. Do not make paragraph copy thin, uppercase or tightly tracked to imitate the reference.

## Layout

The reference's main store container measures 1140px. JT uses --container-page at 1140px, --container-wide at 1280px and --container-narrow at 800px. Spacing builds on the measured 5px grid, with explicit 40/50/60/80px extensions. The generated space names use quarter-pixel counts, for example --space-5 is 20px and --space-7_5 is 30px.

The store starts with a compact title and then the catalog. The catalog contains a header, featured beat, filters and rows. Keep title, play, favorite, price and add/remove controls visible. The featured beat remains seller controlled. After the catalog, show the three shopping steps, license cards and a compact FAQ. Keep the existing customer navigation and seller route separation.

## Elevation & Depth

Panels remain flat with a one-pixel border. Use --shadow-sm only for floating header/player boundaries and docked filters. Dialogs retain the existing interruptible spring behavior. Do not add background photos, glows or copied hero artwork to imitate the source's widget skin.

## Shapes

Measured radii were approximately 3, 5 and 10px. These are --radius-sm, --radius-md and --radius-lg. Interactive cart controls use the 5px radius; the outer catalog and pricing cards use 10px. Keep 44px or larger primary tap heights. The existing 16px floating boundaries remain an intentional JT adaptation.

## Components

The catalog is a real local frontend, not a BeatStars/Airbit embed. Its light table uses separate price and add/remove actions. Adding opens the license selector; the selected × removes the beat. Search, category filters and favorites keep their existing behavior. The header and catalog header show the actual local cart total.

License cards compare Basic, Premium, Unlimited and Custom using JT's current saved price and file settings. Expand Usage & royalty details to read saved terms or explicit To be agreed fields. New commercial proposals live only in Seller / Licenses and LICENSING_PROPOSALS.md; they are never promoted to checkout automatically. Do not copy source prices, promotions, exclusivity claims, copy or automated-delivery promises.

## Do's and Don'ts

- Build new customer components from design-system/tokens.css and read the measured source notes before changing roles.
- Keep the JT logo, mint accent and original graphics. Use live catalog state, not invented sales or endorsements.
- Keep the persistent player and existing license-review flow.
- Distinguish saved seller terms, proposed terms and unresolved fields.
- Do not use the source logo, photographs, album art, icon glyphs, wording or merchant widgets in JT.
- Do not apply the new storefront palette to the seller workspace without a request.
- Do not claim contracts are signed or files are delivered by this frontend prototype.

## Motion

The reference uses roughly 300/400/500ms transitions and easing. Retain JT's existing critically damped springs for floating boundaries and dialogs. New accordion arrows use --duration-fast (300ms) and --ease-standard. Keep motion supplementary and honor reduced motion. The new compact artwork retains the restrained scroll crop response.

## Iconography & Graphics

The source uses icon fonts; no inline SVG family was found. JT's own 15-icon sample was measured separately with draw-svg: 24-unit canvas, 1.65 markup stroke, 1.25 raster line estimate, round caps/joins and an integer coordinate step. The measured radius 7 reflects circular controls; file/wallet corners are about 2 units. The family's median inferred padding was 4, with individual icons roughly 2–4 units.

Three original purchase-flow icons use that family: listen, license-document and review-agreement. They use currentColor, no transforms, decorative accessibility markup and named primitives. The plan is assets/graphics/PLAN.md. Three render rounds corrected a clip junction and document centering. Lint passes with no warnings. A fresh reviewer judged the final set at 10/10 with no outstanding defects; this is a visual review, not a trademark clearance.

## Responsive Behavior

The source was measured at 1440px and 390px, with CSS breakpoints at 601/768/960/992/1025px. JT retains existing 640/900/1150px behavior to preserve its tested navigation and tables. At 900px, license cards become two columns and search occupies its own row. At 640px, cards and shopping steps stack, the spotlight becomes a compact three-part row, and the title is 28px. At 360px and below, price and add/remove stack to preserve the beat title. Mobile seller navigation remains its existing horizontal scroller.

## Known Gaps

Cookie consent overlays partly cover source screenshots. The native reference browser was also inspected after Deny. Embedded merchant widgets contain independent styles and loaded differently between captures, so the extraction is not a complete widget design system. The measurements contain cookie/plugin CSS noise; raw values are archived in source/measured-roles.json, and the meaningful roles were corrected visually.

No different system-dark theme was observed. There is no claim to have measured a user-toggle theme. Font matching was skipped because the measured Poppins family is available under OFL. Source contract summaries conflict in places and are not treated as definitive agreements. The requested Claude Opus 5.5 model was unavailable; SVGs were drawn in this session and independently reviewed by an available subagent.

## Files

- design-system/roles.json is the adaptation source; rebuild through extract-design.
- design-system/tokens.css, theme.css and design.tokens.json are generated outputs.
- design-system/preview.html is the token specimen beside reference screenshots.
- design-system/source holds measured evidence, not assets for use in the storefront.
- storefront.css and storefront.js implement the customer view; assets/graphics/icons are original.
- LICENSING_PROPOSALS.md and license-proposals.js hold inactive seller-review proposals.
'''
p.write_text(front+prose,encoding='utf-8')

---
version: alpha
name: "ear2thabeat.com-inspired"
description: "A design system measured from ear2thabeat.com on 2026-11-18. Inspired by it, not affiliated with it."
colors:
  background: "#000000"
  text: "#dadada"
  heading: "#ffffff"
  text-muted: "#a5a5a5"
  border: "#343434"
  surface: "#131313"
  surface-inverse: "#f9fafa"
  primary: "#6ce4d4"
  primary-foreground: "#092629"
  link: "#6ce4d4"
  focus: "#6ce4d4"
  surface-raised: "#1e1e1e"
  canvas-text: "#15191c"
  canvas-muted: "#52606a"
  canvas-border: "#d8dfe2"
  canvas-hover: "#edf4f3"
  canvas-tag: "#e8eeef"
  canvas-accent: "#14685e"
  proposal: "#ffd39a"
  proposal-background: "#332719"
  chart-1: "#6ce4d4"
  chart-2: "#ffc48a"
  chart-3: "#bba9ef"
typography:
  display:
    fontFamily: "\"Poppins\", ui-sans-serif, system-ui, sans-serif"
    fontSize: 48px
    fontWeight: 500
    lineHeight: 1.2
  h1:
    fontFamily: "\"Poppins\", ui-sans-serif, system-ui, sans-serif"
    fontSize: 36px
    fontWeight: 600
    lineHeight: 1.2
  h2:
    fontFamily: "\"Poppins\", ui-sans-serif, system-ui, sans-serif"
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.3
  h3:
    fontFamily: "\"Poppins\", ui-sans-serif, system-ui, sans-serif"
    fontSize: 22px
    fontWeight: 600
    lineHeight: 1.4
  h4:
    fontFamily: "\"Poppins\", ui-sans-serif, system-ui, sans-serif"
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.4
  body-lg:
    fontFamily: "\"Poppins\", ui-sans-serif, system-ui, sans-serif"
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.65
  body:
    fontFamily: "\"Poppins\", ui-sans-serif, system-ui, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.65
  caption:
    fontFamily: "\"Poppins\", ui-sans-serif, system-ui, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  small:
    fontFamily: "\"Poppins\", ui-sans-serif, system-ui, sans-serif"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.5
  mobile-title:
    fontFamily: "\"Poppins\", ui-sans-serif, system-ui, sans-serif"
    fontSize: 28px
    fontWeight: 600
    lineHeight: 1.2
  stat:
    fontFamily: "\"Poppins\", ui-sans-serif, system-ui, sans-serif"
    fontSize: 32px
    fontWeight: 500
    lineHeight: 1.15
  page-title:
    fontFamily: "\"Poppins\", ui-sans-serif, system-ui, sans-serif"
    fontSize: 32px
    fontWeight: 500
    lineHeight: 1.2
rounded:
  sm: 3px
  md: 5px
  lg: 10px
  panel: 16px
spacing:
  "1.25": 5px
  "2": 8px
  "2.5": 10px
  "3": 12px
  "3.75": 15px
  "4": 16px
  "5": 20px
  "6": 24px
  "6.25": 25px
  "7.5": 30px
  "8": 32px
  "10": 40px
  "12": 48px
  "12.5": 50px
  "15": 60px
  "16": 64px
  "20": 80px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    padding: "15px 25px"
    height: 48px
  button-primary-hover:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
  button-outline:
    backgroundColor: transparent
    textColor: "{colors.heading}"
    rounded: "{rounded.md}"
    padding: "15px 20px"
    height: 48px
  input:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.heading}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "12px 12px"
    height: 48px
  link:
    textColor: "{colors.link}"
  band-inverse:
    backgroundColor: "{colors.surface-inverse}"
  page:
    backgroundColor: "{colors.background}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
  navigation:
    backgroundColor: "{colors.background}"
    height: 80px
---

<!-- extract-design: the front matter above is generated from design-system/roles.json. Change roles.json, then run extract.mjs --rebuild to refresh it. The prose below is yours. -->

# JT storefront design system

## Overview

The customer store is inspired by Ear2ThaBeat's catalog, embedded featured-track panel, purchase guide and four-column license comparison. It is not affiliated with that site. Measurement covered two unique pages, the store and FAQ, across six visits: three desktop visits including an FAQ URL redirect duplicate, two phone visits and one dark-mode check. Source measurements and screenshots are retained in design-system/source.

Joel Tracks uses the selected Soft Seal full-name capsule logo, its mint accent, own artwork, clean preview behavior and license structure. It uses the reference's black backdrop, charcoal surfaces, light beat-list canvas and Poppins typography. The seller workspace keeps its existing navy palette and DM Sans/Bricolage typography; the new storefront CSS is scoped to customer views.

## Colors

Use --color-background (#000000) for the customer page and --color-surface (#131313) for the catalog surround, pricing cards and persistent player. Use --color-surface-raised (#1e1e1e) for inputs and card headers. The reference's main Buy Beats button was #252525 with a red outline; the extraction's first-guess #29775c primary came from the free-download notice, not that CTA. The source also has gold text and a red banner. These branding colors are not adopted.

JT's existing --color-primary (#6ce4d4) remains its action and active-state color, with --color-primary-foreground (#092629) on filled controls. --color-heading is white, body text #dadada and secondary text #a5a5a5. The purple link and nearly invisible focus values in the initial extraction were replaced with JT mint for contrast. The reference's frequent white borders mostly belong to the FAQ; JT uses --color-border (#343434) for quiet separators.

The beat list is the deliberate inverse canvas: --color-surface-inverse (#f9fafa), --color-canvas-text (#15191c), --color-canvas-muted (#52606a), --color-canvas-border (#d8dfe2). On that canvas, selected favorites and tag text use --color-canvas-accent (#14685e), not light mint. All new colors are declared in roles.json and generated tokens.

## Typography

Poppins was measured across body and headings. It is an open-license family, served locally from official Google Fonts WOFF2 assets with its SIL OFL license. JT uses 400/500/600/700. The reference's 14px weight-300 body is adapted to 16px weight 400 for readability. Store title is 36px/600, phone title 28px/600. The focused refinement uses 500 for supporting section titles and prices; the underlying h2 role remains 24px/600. Interface labels are 14px. Track titles are 16px/500 on desktop and 14px/500 on phone; small secondary metadata is 12px. Large prices use the adapted 48px/500 role. Seller page titles and primary figures use 32px/500 with tabular numerals.

The selected Soft Seal logo uses lowercase “joel tracks” in optically spaced Fraunces 650, with soft serif forms cut out of a capsule. The complete logo is outlined vector geometry. No JT initials form part of the logo. A reversed near-white capsule appears on the dark store and navy seller workspace; a black master is provided for light backgrounds. A simplified capsule perimeter replaces the former initials in small icon placements. No additional runtime font is loaded. The artwork and usage guide are in assets/branding/soft-seal. Keep interface text left aligned, with tabular numerals for prices and counts. Do not make paragraph copy thin, uppercase or tightly tracked to imitate the reference. The extracted body-lg role came from a tight uppercase CTA; it is corrected to 18px/400 with 1.65 leading for actual paragraph use.

## Layout

The reference's main store container measures 1140px. JT uses --container-page at 1140px, --container-wide at 1280px and --container-narrow at 800px. The measured 5px grid is retained for historical components. The focused refinement adds 8/12/16/24/32/48/64px spacing tokens and uses these for compact groups and page spacing. Generated names use quarter-pixel counts: --space-4 is 16px, --space-6 is 24px and --space-7_5 remains 30px.

The store starts with a compact title and then the catalog. The catalog contains a header, featured beat, filters and rows. Keep title, play, favorite, price and add/remove controls visible. The featured beat remains seller controlled. After the catalog, show the three shopping steps, license cards and a compact FAQ. Keep the existing customer navigation and seller route separation.

## Elevation & Depth

Panels remain flat with a one-pixel border. Use --shadow-sm only for floating header/player boundaries and docked filters. Dialogs retain the existing interruptible spring behavior. Do not add background photos, glows or copied hero artwork to imitate the source's widget skin.

## Shapes

Measured radii were approximately 3, 5 and 10px. These are --radius-sm, --radius-md and --radius-lg. Interactive cart controls use the 5px radius; the outer catalog and pricing cards use 10px. Keep 44px or larger primary tap heights. The existing 16px floating boundaries remain an intentional JT adaptation.

## Components

The catalog is a real local frontend, not a BeatStars/Airbit embed. Its light table uses separate price and add/remove actions. Adding opens the license selector; the selected × removes the beat. Search, category filters and favorites keep their existing behavior. The header and catalog header show the actual local cart total. Track rows are 76px high, with play, favorite and add/remove targets at least 44px square. Featured artwork is 128px on desktop and 64px at compact widths. The seller sidebar remains contained within its parent; its width is 240px on desktop and 216px at medium widths.

The customer view has a full-width mint offer strip fixed directly above the persistent beat player. It scrolls right to left with the 2-beat/15% and 3-or-more/25% offers and an automatic-cart note. The seller requested removal of the pause/play button; hovering or keyboard focus pauses the strip, and reduced motion shows both offers statically. Duplicated visual copy is hidden from assistive technology. A ResizeObserver tracks the player/banner heights to keep the strip flush with the player and reserve room for the footer and notices. The banner is not displayed in the seller workspace. Compact intro spacing keeps the beat list reachable.

Cart pricing uses the current purchasable beats: 0–1 has no discount, exactly 2 receives 15%, and 3 or more receives 25%. The rates do not stack. Header and catalog totals, cart rows, order summaries and per-beat agreement fees share the same calculation. Integer-cent allocation keeps per-beat fees equal to the discounted order total. Listed tier prices and royalty/usage terms remain separate from the promotion. Fractional dollar amounts display two decimal places.

License cards compare Basic, Premium, Unlimited and Custom using JT's current saved settings. Following the seller's November 18 request, the prepared dashboard usage schedule now supplies empty legacy fields. Nonempty saved wording takes precedence. Public cards, beat details and checkout use the same tier settings. Custom remains negotiated. Do not copy source prices, promotions, copy or automated-delivery promises.

## Do's and Don'ts

- Build new customer components from design-system/tokens.css and read the measured source notes before changing roles.
- Keep the approved Soft Seal full-name logo, mint accent and original graphics. Use live catalog state, not invented sales or endorsements.
- Keep the persistent player and existing license-review flow.
- Distinguish saved seller terms, proposed terms and unresolved fields.
- Do not use the source logo, photographs, album art, icon glyphs, wording or merchant widgets in JT.
- Do not apply the new storefront palette to the seller workspace without a request.
- Do not claim contracts are signed or files are delivered by this frontend prototype.

## Motion

The reference uses roughly 300/400/500ms transitions and easing. Retain JT's existing critically damped springs for floating boundaries and dialogs. Focused feedback uses 160ms, and a single route entry moves 6px over 240ms with cubic-bezier(.22,1,.36,1). Internal filtering and cart rerenders do not replay the route entry. Individual row/card/footer reveals and decorative artwork scroll movement are removed. Beat list/detail navigation keeps its existing 8px/250ms side-by-side transition, mirrored on exit. Cart additions move one small artwork chip toward the cart and drop it in over 560ms. Chart drawing, count-ups, payment updates and adaptive header/player/filter boundaries remain. Feedback never blocks input. Reduced motion suppresses movement.

## Iconography & Graphics

The source uses icon fonts; no inline SVG family was found. JT's own 15-icon sample was measured separately with draw-svg: 24-unit canvas, 1.65 markup stroke, 1.25 raster line estimate, round caps/joins and an integer coordinate step. The measured radius 7 reflects circular controls; file/wallet corners are about 2 units. The family's median inferred padding was 4, with individual icons roughly 2–4 units.

Three original purchase-flow icons use that family: listen, license-document and review-agreement. They use currentColor, no transforms, decorative accessibility markup and named primitives. The plan is assets/graphics/PLAN.md. Three render rounds corrected a clip junction and document centering. Lint passes with no warnings. A fresh reviewer judged the final set at 10/10 with no outstanding defects; this is a visual review, not a trademark clearance.

The footer adds three original audio-release, music-video and live-performance icons in `assets/graphics/footer`. A fresh measurement of the existing three-icon family confirmed 24 units, 1.65 stroke, round caps/joins, corner radius 2, integer step and approximately 2.17 units of padding. Two render rounds corrected microphone and disc clearances. The final set passes lint and independent review at 10/10. Following the November 23 request, the release-platform row now includes local platform brand marks beside readable names (Amazon Music uses its complete horizontal wordmark). The supplied brand geometry is preserved; these marks are not redrawn in JT’s icon style. Each platform has an accessible external link. No integration or partnership is implied. Sources are documented in assets/graphics/footer/platforms/SOURCES.md.

## Release guide and footer

Targeted extract-design measurements revisited the store footer at 1440px and 390px on November 18, 2026, adding two visits of the same page to the earlier six-visit extraction. Read-only measurements and screenshots are in `design-system/source/footer-reference`. The reference footer uses #0b0b0b, Poppins, 18px/600 column headings, 14px/300 paragraphs, a 1140px desktop container, 30px vertical inner padding and 5% column gaps. The release strip has a 24px/600 heading, 35px/25px vertical inner padding and a 178-degree #1a504e-to-black gradient. On phone, the source footer stacks and centers its columns with 40px gaps. Cookie consent partly covers the automated screenshots; the clean footer was also inspected in the native browser. The source's platform carousel includes older service names and is not adopted as a current distribution directory.

JT adapts the strip to its neutral --color-surface (#131313), with a static six-name platform grid, three usage explanations and a link to the live license settings. The source gradient above describes the reference only. Never say that every license allows every platform or use. Streaming, copies, music videos, monetized views, performances and reserved sync/broadcast permissions remain governed by the selected license. Distribution and platform requirements are separate. The six examples were checked against their official artist/creator sites on November 18, 2026.

The customer footer has brand/about, browse, help and newsletter-preview columns. Use 14px/400 body copy for readability and 44px link targets. Four columns become two at 1000px; at 640px the brand and signup span the width with two navigation columns between them. Platform names use six, three and two columns. The three usage explanations stack on phone. No public contact address, social profile, privacy statement or legal entity is invented. Link to the existing Contacts, Licenses, Blog and FAQs. The newsletter is a nonfunctional preview: no signup, storage or email service is connected. Keep the studio footer compact.

Footer graphics and columns remain visible without separate entrance animations. Hover feedback is restrained and reduced motion suppresses movement. Earlier footer-only proof captures hid floating header/player and the offscreen skip link for image clarity; live UI and the focused refinement's final screenshots retain the floating controls.

## Responsive Behavior

The source was measured at 1440px and 390px, with CSS breakpoints at 601/768/960/992/1025px. JT retains existing 640/900/1150px behavior. At 900px and below, the featured beat becomes compact and tags/sort use an explicit disclosure, initially closed. Its open state survives catalog rerenders and resizing; desktop always exposes these controls. Search and categories share a row from 641–900px, then stack at 640px. License cards become two columns at 900px; cards and shopping steps stack at 640px. The phone title is 28px. At 360px and below, price and add/remove stack to preserve the beat title. Mobile seller navigation remains its existing horizontal scroller.

## Known Gaps

Cookie consent overlays partly cover source screenshots. The native reference browser was also inspected after Deny. Embedded merchant widgets contain independent styles and loaded differently between captures, so the extraction is not a complete widget design system. The measurements contain cookie/plugin CSS noise; raw values are archived in source/measured-roles.json, and the meaningful roles were corrected visually.

No different system-dark theme was observed. There is no claim to have measured a user-toggle theme. Font matching was skipped because the measured Poppins family is available under OFL. Source contract summaries conflict in places and are not treated as definitive agreements. The requested Claude Opus 5.5 model was unavailable; SVGs were drawn in this session and independently reviewed by an available subagent.

## Files

- design-system/roles.json is the adaptation source; rebuild through extract-design.
- design-system/tokens.css, theme.css and design.tokens.json are generated outputs.
- design-system/preview.html is the token specimen beside reference screenshots.
- design-system/source holds measured evidence, not assets for use in the storefront.
- storefront.css and storefront.js implement the customer view; assets/graphics/icons are original.
- refinement.css is the final scoped polish layer; .taste-skill/unslop-refinement/REVIEW.md records its direction and verification.
- assets/branding/soft-seal contains the current logo masters, PNGs, small capsule cut, browser icons and USAGE.md. Previous logo explorations are archived, not active website assets.
- bulk-deals.js and bulk-deals.css implement the promotional strip and automatic cart pricing; .taste-skill/bulk-deals-review/REVIEW.md records the checks.
- LICENSING_PROPOSALS.md and license-proposals.js record the editable draft schedule, source notes and remaining legal decisions.

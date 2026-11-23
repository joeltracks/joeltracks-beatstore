# JT release guide and footer

Completed November 18, 2026 using the requested extract-design and draw-svg skills.

## Reference and extraction

Source: https://ear2thabeat.com/beat-store/ . Targeted measurements covered one page at 1440 and 390px, supplementing the earlier store/FAQ extraction. The native reference footer was also inspected without the cookie overlay. Raw computed styles and screenshots are in `design-system/source/footer-reference`.

Measured footer background #0b0b0b; Poppins; column headings 18px/600; body 14px/300; desktop container1140px; 30px vertical inner padding; 5% column gaps. The release band uses a24px/600 heading and a178-degree teal-to-black gradient. Phone columns stack centrally with40px gaps. Automated reference screenshots are partially covered by consent UI, which is documented rather than removed from the captures.

JT adapts the structure using existing tokens: dark green/mint identity, 14px/400 copy, static platform examples, original copy, original generic SVGs and working local navigation. The reference logo, social links, merchant claims, contract wording, contact details and platform graphics are not copied. Old service labels in the reference carousel are not reproduced.

## Platform examples

Checked November18,2026 against official sources. These establish current artist/creator services, not a grant of rights from JT:

- Spotify: https://artists.spotify.com/get-started — describes distributor delivery.
- Apple Music: https://artists.apple.com/support/1108-get-your-next-release-on-apple-music — describes distribution to Apple Music and the iTunes Store.
- Amazon Music: https://artists.amazonmusic.com/ — official artist/release resources.
- YouTube: https://artists.youtube/ — official music release and artist resources.
- Deezer: https://creators.deezer.com/ — official creator profiles and release tools.
- TIDAL: https://artists.tidal.com/login — official artist/creator profile service.

The page calls them examples, links to JT's actual license settings and distinguishes distribution/platform requirements from beat permissions. No affiliation, automated distribution, Content ID permission or universal-use promise is made.

## SVG loop

Existing JT icons were measured again:24-unit canvas,1.65 markup stroke,1.25 raster estimate, round caps/joins, radius2, integer grid, padding~2.17. No public icon set was detected. Written plans precede the files in `assets/graphics/footer/PLAN.md`.

Original streaming disc, video screen and stage microphone use currentColor and decorative accessibility markup. Round1 passed lint. The independent judge identified narrow microphone yoke and disc-groove gaps. Round2 widened only those clearances; lint remained clean (three files, no errors or warnings). The final sheet was inspected at16,24,48px and8×. Root review and independent review both scored the final set10/10. The named Claude Opus5.5 model was unavailable; drawing and independent review used the available session models. No trademark clearance is implied.

## Frontend and checks

- Public footer has the platform strip, usage explanations, about, browse, help and newsletter-preview areas. Seller footer remains compact. No new backend, payments, subscriptions or messages.
- Category footer links clear other filters, set the chosen genre and focus the active category at the catalog. FAQs navigate from other routes and focus the store's FAQ heading below the header.
- The newsletter input uses native email validation. Submitting a reserved example address showed: “Preview complete. No subscription was created or email sent.” No address is persisted or transmitted.
- Browser checks passed for Afro-only results, license navigation, cross-route FAQ targeting and preview confirmation. No browser warnings/errors were captured. The user's one-item cart and the isolated QA profile's five-item cart were preserved. Temporary tabs were closed.
- Screenshots/layout reads at1440,714,390,320px: six platform names, three usage summaries, responsive four/two-column footer, no horizontal overflow. Reduced-motion emulation was active for captures; footer interaction checks also ran with normal motion. Formal assistive-technology/OS-level preference testing was not added.
- New graphics and footer columns use the existing intersection-based entrances; hover movement and reduced-motion guard are included.
- JavaScript syntax checks passed for footer, design, graphics and motion scripts. No low-value implementation-mirroring tests were added for this reversible UI work.

Proofs: `footer-1440.png`, `footer-714.png`, `footer-390.png`, `footer-320.png`; computed responsive checks: `layout-checks.json`. These isolate the actual rendered footer and hide floating chrome/skip link only in the PNGs for legibility. The live page retains the persistent player, header and keyboard skip link.

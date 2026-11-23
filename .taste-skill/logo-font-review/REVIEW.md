# Logo font update

November 18, 2026. Scope: replace the logo's narrow custom capitals with a different font, retaining the approved symbol.

- Space Grotesk 650, title-case Joel Tracks, optical spacing, converted to paths. The official source font and SIL Open Font License are preserved locally; no extra runtime font request is introduced.
- Master: `assets/branding/two-takes-v3/jt-horizontal.svg`. The original C symbol path is unchanged. Prior logo assets remain available. A dark version is provided for light surfaces.
- Render round 1: large PNG inspected for letter readability, counters and spacing. Round 2: applied header/footer artwork inspected at 1440, 390 and 320px, plus the native 714px view. Cart/menu remained visible; the native page had no horizontal overflow and retained the user's one-item cart.
- SVG audit: no live text, raster, gradients or filters; one color, centered margins. Advisory warnings concern the font's intentionally drawn k diagonals, outline anchor count and wide lockup. These are preserved font geometry, not unintended construction errors. Existing symbol-only assets cover favicon/small icon use. Horizontal width increases to 240px desktop, 190px phone, 174px on the narrowest screens, with 180px footer usage.
- JavaScript syntax check passed. This is an asset/layout change; shopping state and licensing logic were not edited.
- Font and license checked against the official Google Fonts repository: https://github.com/google/fonts/tree/main/ofl/spacegrotesk and https://raw.githubusercontent.com/google/fonts/main/ofl/spacegrotesk/OFL.txt .
- Proofs: `storefront-desktop.png`, `storefront-phone.png`, `narrow-desktop.png`; large outline render: `.taste-skill/logo-font-round1.png`.

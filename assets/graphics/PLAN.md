# JT purchase-flow icons

Measured JT's existing family with draw-svg measure.mjs. Canvas 24; stroke 1.65 from markup (1.25 raster estimate); round caps and joins; integer coordinate step. The measured radius 7 comes from circular controls, rather than rounded document corners. Existing file and wallet icons use approximately 2-unit corners. No public icon library was detected. Retain that family instead of borrowing the reference's icon-font glyphs.

All new UI icons use a 24px canvas, no transforms, no IDs, fill none, currentColor and 1.65 stroke. They are decorative beside text. They render at 24px, with 16px and 48px reviewed for consistency.

## Listen

Symmetric about x12. Headband: upper semicircle centered (12,11), radius8, endpoints (4,11) and (20,11). Left ear cup: rounded rect (3,11), width4, height9, radius2. Right ear cup: rounded rect (17,11), width4, height9, radius2. One short baseline at (10,16) to (14,16) leaves a five-unit gap from each cup. Stroke currentColor. This is an original construction in the existing rounded-line family.

## Select a license

Document outline: path from (6,3) through (15,3), (20,8), (20,21), (6,21), close. Fold: path (15,3) to (15,8) to (20,8). Two text lines (9,12) to (16,12), and (9,16) to (13,16). No tiny text, seal or filled backdrop. Stroke currentColor.

## Review the agreement

Clipboard: rounded outline (5,5), width14, height16, radius2, with a gap in the top edge between x9 and x15. Clip: rounded rect (9,3), width6, height4, radius1.5. Review check: polyline (8,13), (11,16), (16,11). Parts are drawn in that order. Stroke currentColor. Round 1 exposed a doubled line through the clip; round 2 removes the hidden top-edge segment. Keep the clip distinct from the outer page and the check clear at 16px.

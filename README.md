# JAZZHQ Bloom — reference recreation

A focused, mobile-first bouquet → real QR experiment. No invitation card, creator dashboard, or alternate bouquet is inserted into the sequence.

## Run

Use Node 22.13 or newer. Run `npm ci`, then `npm run dev`. `npm run build` creates the Sites/Cloudflare-compatible production output.

- `/` — recipient view; tap the bouquet, scan or open the event, save QR, reverse.
- `/?debug=true` — 0–100% scrubber, eleven keyframe buttons, side-by-side comparison, quarter-speed playback, destination editor, rendered QR decoder.
- `/?reference=true` — also enables the adjustable reference overlay.
- `?url=<URL-encoded destination>` — a directly loadable custom QR destination. The Open event link uses that same URL. Only http/https destinations are allowed; credentials and inputs over 700 characters are rejected. The query is readable, not an encrypted/private short link.

The default Monu/Sasi personalization and Unwind event URL are demonstration content from the supplied brief. No event registration or outgoing messages were performed.

## Reference measurements

Source: the supplied 1302 × 720, 60 fps, 24.25 s video. This implementation recreates its first forward reveal.

| Reference time | Observed behavior |
| --- | --- |
| 0–1.05 s | Dense magenta canopy, green accents, blue/gold cylindrical vase, soft contact shadow |
| 1.05–1.15 s | First movement; square grid begins beneath the vase |
| 1.15–1.25 s | Bouquet breaks into floral groups; grid rotates toward the viewer |
| 1.25–1.35 s | Finder patterns are legible while floral remnants remain |
| 1.55–1.60 s | Settled QR with small reference texture remnants |

The morph runs for 550 ms after a tap. Reference keyframes span 1.05–1.60 s in 55 ms steps; the 0% overlay uses the actual opening frame. The stage maintains the source crop's coordinate space. The reference QR is approximately 33 × 33 modules. The default generated QR also uses 33 × 33, and longer destinations increase the matrix size as needed.

## Rendering

`lib/bloom/renderer.ts` is an original WebGL2 renderer. Approximately 5,409 independently transformed six-pixel texture fragments preserve the reference bouquet's initial composition. Each fragment has a deterministic QR destination, release time, rotation and color transition. Adjacent source fragments share timing. The same progress value drives forward playback, reverse and scrubbing. Every QR dark module receives a fragment; there is no full-image bouquet/QR crossfade.

`qrcode` encodes the destination with H error correction. Finder modules use navy, data modules deep burgundy, and the final background is white. White mobile page margins provide more than four modules of quiet zone at the tested sizes. Saved PNGs contain an explicit four-module quiet zone. `jsqr` decodes the actual rendered canvas for the Validate QR action. A clean canvas fallback and Open event remain available when WebGL2 is unavailable. Reduced-motion preferences skip movement.

## Fidelity limits — not a claim of exact reproduction

- Reference behavior: dimensional flowers rotate, separate, overlap and reveal previously hidden surfaces.
- Limitation: a single-view compressed video does not supply the original 3D geometry, depth, material maps or per-flower animation paths.
- Closest implemented behavior: source-textured fragments with grouped release, controlled movement, a rising and flattening QR plane, early finder formation, and a small set of late floral remnants. The opening composition is closely aligned; the middle is visibly an approximation and should be reviewed in the included comparison mode.
- The final QR matrix is different because it encodes the supplied event destination. It becomes geometrically clean for scanning, unlike the tiny floral remnants in the video.
- The reference's later style changes and camera adjustments are not reproduced. The four attached polygonal flower images are alternate species references and were not substituted into the primary video bouquet.
- Creator, saved short links, style choices and animated export are deferred under the brief's explicit instruction to focus on recreation first.

## Verification

- TypeScript check and production build passed.
- The QR was decoded from actual browser screenshots at 375 × 812, 390 × 844, 393 × 852 and 430 × 932.
- A directly loaded custom URL decoded correctly and matched Open event.
- Tap, reverse replay, keyframe controls and reference overlay were exercised in the browser.
- The comparison was inspected across all eleven keyframes; differences remain as described above.

The scaffold's React/RSC, Vinext and Vite security fixes were applied. Remaining audit notices concern the pinned Cloudflare development/build toolchain (including Miniflare, Wrangler, Sharp, ws and esbuild); this is an owner-only prototype, not a public-service security assessment.

## Source provenance

The bouquet texture and comparison frames are cropped from the user's supplied video and are retained for this private review. Rights to that media should be confirmed before broader distribution. No code from `demos-main.zip` is copied or redistributed. That archive contains a different cherry-blossom tree animation and a restrictive software license. The rest of this project's source is an original implementation using its listed npm dependencies.

# Content still needed from the business

Everything below is built and waiting for real material. Nothing has been invented to fill a gap.

## Reviews
- [ ] Three to six real Google reviews (exact text, name as shown, link). Add in `/admin/` under Reviews, tick "Approved". The review section stays hidden until then.
- [ ] The Google reviews link (`googleReviewsUrl` in Business details).

## Burn videos
- [ ] Short clips of units burning or cooking, 5 to 10 seconds, steady camera. Export muted, as MP4 and WebM, under 1.5 MB each. `<LivingImage video={{ mp4, webm }}>` then uses the video in place of the simulated fire.

## Hero photography
- [ ] One high-resolution showroom or project photo (2400 px wide or more) for the homepage hero. The current one is a real showroom photo but only 1124 px wide, so it is soft on large screens.

## Fire calibration
Simulated fire runs only on photos calibrated in `src/data/fire.ts`. Five are done. Every other photo shows no simulated fire by design.
- [ ] Open a page with `?calibrate=1` on the preview site, drag the boxes, copy the values, and send them over (or paste into `fire.ts`).
- [ ] Unlit pizza ovens should get `glow` only. Photos with no visible fire source should get nothing.

## Before and after pairs
Two real pairs exist (Kozy Heat Nordic 34 insert; a Kozy Heat install during and after).
- [ ] More pairs, ideally shot from the same spot, especially for outdoor kitchens and wood-to-gas conversions.

## Fire on/off, media and finish choices
The control is built (`variants` on a featured option) and appears only when photos are supplied.
- [ ] For each product: the same unit photographed off and on, and with each media (logs, glass, stones) or finish you want to show.

## Product specifications ("Will it fit")
The helper suggests product types from general rules. It does not match models, because no dimensions are stored.
- [ ] Per model: minimum opening width, height and depth (inserts and log sets); framing dimensions (new fireplaces); fuel types; vent type.
- [ ] Confirmation that the manufacturer's current manual is the source for each figure.

## Brand logos
The brand strip uses text names.
- [ ] Confirm which manufacturer logos you are licensed to display, and supply SVG files.

## Numbers for the proof strip
Only "30+ years" is shown.
- [ ] Verified Google review count and rating, with the date checked.
- [ ] Verified number of working displays in Maspeth.

## Other
- [ ] Financing: approved Acorn Finance wording, link and required disclosures. The site currently says only "Ask us about financing through Acorn Finance."
- [ ] Whether 718-326-4328 accepts text messages (the dock ships with Call, Showroom, Get Project Help).
- [ ] Greenvale opening date and hours. It is listed last and labelled "coming soon".

# Fact verification list

The site is built so that nothing unverified is published. This is what is in use, what is held back, and what the owner needs to confirm.

## In use (from the brief and the current site)

| Fact | Source |
|---|---|
| Name, 58-30 Maspeth Ave, Maspeth, NY 11378, 718-326-4328 | Brief; matches live site |
| Hours: Mon–Fri 9–5, Sat 10–3, Sun closed | Brief; matches live site |
| "A family-owned business with an in-house team of designers, installers, craftsmen and technicians with over 30 years of experience" | Current site wording. **Confirm exact approved wording before launch.** |
| We install products purchased through us | Current installations page and FAQ |
| Service is for units we sold and installed; no wood-fireplace cleaning | Current service page and FAQ |
| No permits or inspections; install to manufacturer specifications | Current FAQ and earlier fact registry |
| Patio heaters: consult, specify and supply only | Earlier fact registry |
| 3D layouts "to go along with" an outdoor kitchen purchase | Current site wording |
| Supply-only is available to builders | Current trade FAQ |
| Project titles, years, locations and designer credits | Published on the current project pages |

## Held back until verified

| Item | Why | What the site does now |
|---|---|---|
| Google review count and rating | Current pages say both "over 300" and "400+" | No number shown |
| Real review quotes | Reviews load from a third-party widget and could not be read; none were invented | Review section is hidden until entries are added to `reviews.yaml` with `approved: true` |
| Google reviews link | Not confirmed | Add `googleReviewsUrl` in Business details to show a "Read our reviews on Google" link |
| Greenvale showroom status | Live menu still says "Coming Soon" | Shown as "Coming soon. Call us for an update." No hours, no date. One setting to change. |
| Number of models on display | "Over 20" appears on the current site, unverified | No count; "call to confirm which models are on display" |
| Which featured options are on display | Unknown | Every option set to "call to confirm"; switch each to "confirmed" in the editor |
| Appointment policy, parking, accessibility | Unknown | Not stated. Fields exist and appear on the showroom page when filled in. |
| "Free" design, consultation or site visit | Terms and coverage not confirmed | Not claimed anywhere |
| Two-day installation | Not universal | Not claimed anywhere |
| Certifications, authorized-dealer status | Not verified per brand | Brands are described as "makers we work with" |
| Current brand list | 56 brands carried over from the old site | **Remove any brand no longer carried** in `brands.json` |
| Installation coverage in Westchester, NJ and CT | Listed on the current site, flagged unconfirmed earlier | Shown as "depending on the project" |
| Trade pricing | Mentioned on the current site | Mentioned only as "ask us about trade pricing" |
| Financing | No approved wording or disclosures | No financing page; old URL redirects to the inquiry form |
| Response time after an inquiry | Not approved | No time promised |
| Prices | None approved | "Contact us for pricing" |

## Decisions the owner needs to make

1. Saunas, pergolas and lighting have pages on the old site but no place in the new structure. Keep, drop or add pages?
2. The 20 area landing pages are consolidated. Review their Search Console traffic before launch.
3. Privacy Policy and Terms were carried over word for word. They refer to SMS marketing and to the old site's features, and should be reviewed by counsel.
4. Rights to reuse manufacturer imagery. The new site uses only your own project and showroom photos, so nothing depends on the vendor's image library.
5. Three images on the current site look like renderings (rooftop kitchen, Greenvale exterior, showroom consultation). They are not used.

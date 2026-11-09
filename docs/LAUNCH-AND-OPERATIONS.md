# Launch and operations

## Status at hand-off

**Implemented and tested locally**

- All pages listed in AUDIT-AND-PLAN.md (263 built pages).
- Inquiry form: server-side validation, values kept on error, honeypot, timing check, rate limit, origin check, duplicate protection, file type and size checks, storage before delivery, routing by request type, failure log and health check.
- 301 redirects for all 184 old pages, 5 posts and 151 project URLs, checked by `npm run check`.
- Staging protection: noindex meta, `X-Robots-Tag`, blocking robots.txt, optional password.
- Structured data (LocalBusiness with hours, FAQ), canonical URLs, XML sitemap.
- Tracking events pushed to `dataLayer`.

**Built but not yet connected (needs accounts or approval)**

- Email delivery: needs SMTP details and recipient addresses.
- CRM delivery: optional webhook, needs the endpoint.
- Content editor at `/admin/`: needs GitHub sign-in set up. Not tested end to end.
- Analytics: needs a Google Tag Manager ID.
- Cloudflare Turnstile: optional, needs keys.
- Hosting: not chosen. Nothing is deployed.

**Not included**

- The vendor model catalog (model-level pages, "display models", manuals library). It is served by a third-party plugin and is not part of the export. Old catalog URLs redirect to the matching section.
- Blog posts (5, from 2023) redirect to Buying Guides.
- Customer reviews: none supplied yet.

## Hosting

Any host that runs Node 20+ with a persistent disk (for example Render, Railway, Fly.io or a small VPS behind Cloudflare).

```bash
npm ci && npm run build && npm start
```

`LEAD_DATA_DIR` must point at a persistent, backed-up disk. It contains customer details and uploads: restrict access and decide how long to keep it.

To use a serverless host instead, change the adapter in `astro.config.mjs`, move redirects to that host's format (`docs/redirect-map.csv`), and replace file storage in `src/lib/leads.ts` with a database or queue.

## Environment variables

See `.env.example`. Summary:

| Variable | Purpose |
|---|---|
| `SITE_ENV` | `production` makes the site indexable. Anything else is noindex. |
| `STAGING_BASIC_AUTH` | `user:password` for previews. Empty in production. |
| `PREVIEW_HOSTS` | Build-time. Extra hostnames forms are accepted from (staging domain). |
| `LEAD_DELIVERY` | `file` (store only) or `smtp` (store, then email). |
| `LEAD_DATA_DIR` | Where leads and uploads are stored. |
| `LEAD_TO_SALES` / `_SERVICE` / `_PARTS` / `_TRADE` | Recipients by request type. Service, parts and trade fall back to sales. |
| `LEAD_FROM`, `SMTP_*` | Sending account. |
| `LEAD_WEBHOOK_URL` | Optional JSON POST of each lead to a CRM. |
| `LEAD_ALERT_WEBHOOK_URL` | Optional alert when a stored lead fails to deliver. |
| `PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Optional spam challenge. |
| `PUBLIC_GTM_ID` | Optional Google Tag Manager container. |

## Lead delivery

1. The form posts to `/project-help/`.
2. The server validates. On an error the same form comes back with the visitor's entries and a message for each problem.
3. The lead is appended to `LEAD_DATA_DIR/leads.jsonl` and uploads are saved under `uploads/{lead id}/` with random names.
4. The lead is emailed (and posted to the CRM webhook if set). Subject lines start with "New project inquiry", "SERVICE request" and so on, so service and parts are never mistaken for sales.
5. If delivery fails the visitor still sees the confirmation, because the lead is safely stored. The failure is written to `delivery-failures.jsonl`, logged, and sent to the alert webhook. `/api/health/` returns 503 until it is cleared, so point an uptime monitor at it.

Outside production every email subject starts with `[TEST — not a real customer]`. Use test inboxes on staging.

## Content editor

`public/admin/config.yml` points the editor at `nycfpok/nycfireplaces.com`, branch `main`. Editors sign in with GitHub and need write access. Set the host to rebuild on each push to `main`.

## Tracking

Events pushed to `window.dataLayer` (read them in Google Tag Manager):

| Event | Meaning | Is not |
|---|---|---|
| `phone_click` | A phone link was clicked (`placement` says where) | A completed call |
| `directions_click` | A directions link was clicked | A showroom visit |
| `showroom_info_click` | Showroom address/hours link clicked | |
| `help_cta_click` | A "Get Project Help" button was clicked | |
| `path_click` | A homepage starting path was chosen | |
| `guide_start`, `guide_complete` | Start Here guide used and finished | |
| `lead_form_start` | Someone began typing in a form | |
| `product_inquiry_start` | "Ask about this product" clicked | |
| `lead_form_received` | Fired on the confirmation page after the server accepted the form (`form_kind`) | A qualified lead |
| `shop_online_click` | Left for the Shopify store | |

No names, emails, phone numbers, files or message text are sent to analytics. Campaign tags (`utm_*`, `gclid`) are saved with the lead itself. Page context is saved with each lead.

Qualified leads, appointments, quotes and sales are CRM measures. Once a CRM is connected, mark each lead there and report from the CRM.

If call tracking is added, use a pool that swaps the number only for ad traffic and keep 718-326-4328 in the page source, the structured data and Google Business Profile.

### Testing plan

Collect four weeks of baseline first. Then test one thing at a time, judged on qualified conversations and not on form volume:

1. Hero headline: current against a version that leads with the showroom.
2. Hero actions: call first against form first, on mobile.
3. Shortlist: six cards against three with "see more".
4. Form: ZIP shown against ZIP asked for after submission.

## Launch checklist

Nothing goes live without the owner's approval.

- [ ] Owner signs off FACT-VERIFICATION.md items and the shortlist
- [ ] At least three real, approved reviews added (or launch without the section)
- [ ] Brand list checked against brands currently carried
- [ ] Search Console and Analytics exports reviewed; "REVIEW" rows in `docs/redirect-map.csv` settled
- [ ] Current form destinations confirmed (the vendor system receives them today) and matched in `LEAD_TO_*`
- [ ] Ownership confirmed for the domain, DNS, Google Business Profile, Search Console, Analytics
- [ ] Vendor plugin contract reviewed (catalog, forms, quote tool) and cancellation date set after launch
- [ ] Hosting chosen; staging deployed with a password; `PREVIEW_HOSTS` set
- [ ] Each form tested on staging to test inboxes: project, product, trade, service, parts, with and without files
- [ ] A forced delivery failure tested: alert arrives and `/api/health/` turns red
- [ ] Editors can sign in to `/admin/` and publish a change
- [ ] Privacy Policy and Terms reviewed
- [ ] Full WordPress backup taken (files and database) and kept
- [ ] DNS TTL lowered to 300 seconds a day ahead
- [ ] `SITE_ENV=production`, staging password removed, production build deployed
- [ ] DNS switched; `https://www.nycfireplaces.com/robots.txt` allows crawling; sitemap submitted in Search Console
- [ ] Spot-check 20 old URLs for 301s; send one real test inquiry and confirm the team received it
- [ ] Shopify store checked: unchanged and still linked
- [ ] Watch Search Console coverage and 404s daily for two weeks

## Rollback

The old site keeps running untouched until DNS changes, so rollback is a DNS change.

1. Keep WordPress hosting and the vendor plugin active for at least 30 days after launch.
2. If something is seriously wrong, point DNS back to the old host. With a 300-second TTL this takes minutes.
3. Leads received on the new site stay in `leads.jsonl`. Export them before or after rolling back.
4. Do not cancel the old hosting, plugin or form services until the owner confirms the new site has run cleanly for 30 days.

## Known limitations

- Rate limiting and duplicate detection are held in memory, per server process. That suits a single server. Use Turnstile or a shared store if you scale out.
- Leads are stored as files. A CRM should become the system of record.
- Uploads are checked by file signature and size, never served publicly, and stored under random names. They are not virus-scanned.
- Project descriptions are the original captions from the old site, lightly cleaned. Only six projects have case-study notes.
- The map on the showroom page loads from Google. Everything else is self-hosted, including fonts.

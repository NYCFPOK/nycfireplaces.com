# nycfireplaces.com

The showroom, design, installation and lead-generation website for NYC Fireplaces & Outdoor Kitchens. No WordPress. The separate Shopify store at nycfireplaceshop.com is not part of this repository and is only linked to.

## What this is

- **Astro 5 + TypeScript.** Every public page is prerendered to static HTML. The only JavaScript sent to visitors is a small tracking/open-hours script, the Start Here guide, and form timing.
- **One server route** (`/project-help/`) receives every form, validates it, stores the lead on disk, then delivers it.
- **Content in files** (`src/content/`, `src/data/site.json`), edited by staff at `/admin/`. Every edit is a commit, so there is a history and an undo.

Why not Next.js + Sanity: the repository already held a working Astro build and a full export of the WordPress content, the site is almost entirely static, and file-based content keeps the business in full ownership of its data with no third-party CMS account to pay for or lose. Swapping in a hosted CMS later only means changing the loaders in `src/content.config.ts`.

## Run it

```bash
npm install
npm run dev        # local development, http://localhost:4321
npm run build      # production build
npm start          # serve the build (redirects, headers, forms)
npm run check      # automated checks against the built site
```

Copy `.env.example` to `.env` first. With the defaults, leads are stored in `.data/` and nothing is emailed.

## Where things live

| Path | What |
|---|---|
| `src/data/site.json` | Address, phone, hours, holiday hours, location status, service areas, button wording. One source for every page. |
| `src/content/options/` | The featured shortlist ("Start with these options"). |
| `src/content/projects/` | 151 completed projects imported from the old site. |
| `src/content/faqs.yaml`, `reviews.yaml`, `promotions.yaml` | FAQs, approved reviews, dated promotions. |
| `src/content/types.yaml`, `brands.json` | Secondary product-type and brand pages (they keep the old URLs alive). |
| `src/content/guides/` | Buying guides. |
| `src/lib/leads.ts` | Lead validation, spam checks, storage and delivery. |
| `server/index.mjs` | Production server: staging password, redirects, headers. |
| `src/data/redirects.json` | Generated redirect map. Edit `migration/build-redirects.mjs`, not this file. |
| `migration/` | WordPress export and the import scripts. |
| `docs/` | Audit, fact verification list, editing guide, launch and rollback. |

## Documents

- [docs/AUDIT-AND-PLAN.md](docs/AUDIT-AND-PLAN.md): what was wrong, the new structure, how the shortlist is chosen.
- [docs/FACT-VERIFICATION.md](docs/FACT-VERIFICATION.md): what is verified, what is not, and what the site does about it.
- [docs/EDITING-GUIDE.md](docs/EDITING-GUIDE.md): how staff change content.
- [docs/LAUNCH-AND-OPERATIONS.md](docs/LAUNCH-AND-OPERATIONS.md): lead delivery, environment variables, tracking, launch checklist, rollback, limitations.
- [docs/redirect-map.csv](docs/redirect-map.csv): every old URL and where it goes.

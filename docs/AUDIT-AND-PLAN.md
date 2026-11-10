# Audit of the current site and the plan behind the rebuild

Based on the public WordPress site as harvested into `migration/wordpress-export/` (184 pages, 5 posts, 1,823 media records) and the live pages read on 2026-11-09.

## Main conversion problems

1. **Too many choices, too early.** The main menu lists fuel types, insert types, stoves, accessories and brands before a visitor knows which kind of project they have. About 60 category pages and 56 brand pages sit at the top level.
2. **The homepage leads with a catalog.** After the hero it shows a grid of grill and cabinet models with "Starting MSRP" and "Add to Quote", then long blocks of manufacturer copy.
3. **$0 prices.** Vendor catalog cards render "Starting MSRP 0" on quote-only products.
4. **Cart language on a showroom site.** "My Quote (0 items)" and "Add to Quote" look like a shopping cart with nothing behind them.
5. **Forms ask for too much.** First and last name, email and phone are all required. Forms ask for street address and requested date, submit with a button labelled "Go", and place an SMS marketing consent directly above the submit button.
6. **Claims that contradict each other.** "Over 300" and "400+" reviews, "over 20 models on display", "2-day typical install", "Family-owned in NYC for 30+ years", and Greenvale shown both as a location and as "Coming Soon".
7. **Real proof is buried.** 151 genuine project photos exist, but behind a filterable catalog interface. Reviews load from a third-party widget.
8. **Showroom details take effort to find**, and several images on newer pages are renderings rather than photographs.
9. **20 near-identical area landing pages** (fireplaces and outdoor kitchens for ten areas each).
10. **The catalog is rented.** Models, projects, forms and locations are served by a vendor plugin (SPA Software Solutions) with images on the vendor's CDN.

## The simplified journey

A few clear starting points → a short explanation → a curated selection → relevant proof → a conversation.

### Sitemap

Primary navigation: **Start Here · Fireplaces · Outdoor Kitchens · Our Projects · Visit Our Showroom**, plus the phone number and "Get Project Help" on every page.

Secondary: Designers & Builders · Service & Parts · About Our Team · Buying Guides · Shop Online (external).

```
/                               Home
/start-here/                    3-question guide (optional, no contact details needed)
/fireplaces/                    One question: is there a fireplace there now?
  /fireplaces/new/              Add a new fireplace
  /fireplaces/upgrade-existing/ Upgrade an existing fireplace
/outdoor-kitchens/              Plan an outdoor kitchen
/outdoor-living/                Fire pits, outdoor fireplaces, patio heating (secondary)
/products/                      "Explore more": shortlist + product types
  /products/{option}/           9 showroom product/solution pages
/projects/                      151 real projects, 3 simple filters
  /projects/{project}/          Project pages; 6 written up as case studies
/showroom/                      Maspeth: address, hours, directions, what to bring
/project-help/                  The one inquiry form (project, product, trade, service, parts)
/designers-builders/            Trade page
/service-parts/                 Routing for existing customers
/about/  /guides/  /brands/  /service-areas/
/{type}/                        18 plain-English product-type pages at their old URLs
/{brand}/                       56 brand pages at their old URLs
```

### Starting paths

1. Add a new fireplace
2. Upgrade an existing fireplace
3. Plan an outdoor kitchen

Fire pits, patio heating and pizza ovens are a quieter fourth route.

### Homepage sequence

Header with phone and "Maspeth, Queens · Address & Hours" → hero (one message, call first) → three starting paths → six featured options → three-step process and project scopes → real projects (and reviews once supplied) → showroom → designers and builders → FAQs → short form.

## How the shortlist is chosen

The shortlist lives in `src/content/options/`. It is labelled "Start with these options" and "Featured solutions". It is **not** labelled best sellers, because no sales data was available.

The first version was chosen from evidence in the business's own project history: which kinds of work appear most often among the 151 published projects (linear and traditional direct-vent gas, gas inserts, gas log conversions with doors, masonry and cabinetry outdoor kitchens, pizza ovens).

To replace it with a verified list, rank candidates on:

1. Showroom and project sales (not Shopify accessory sales)
2. How often the model is quoted
3. How reliably it fits typical installations
4. Manufacturer support and availability
5. Whether it is clearly different from the other cards
6. Whether the team is confident recommending and supporting it

Then edit order, the homepage flag, and showroom display status in the editor. Keep to six on the homepage and three per path.

## What changed from the earlier prototype in this repository

The earlier build followed a dark, cinematic direction with animated flames laid over photos. This rebuild replaces it:

- Light, warm and practical, because the brief asks that practical information never be hidden.
- Simulated fire is used sparingly: only on photos individually calibrated in `src/data/fire.ts`, and never on photos with no visible fire source. (The first pass of this rebuild removed it entirely; it was brought back in this limited form.)
- The rooftop hero image was removed. It appears to be a rendering, not a photograph of completed work.
- "Shop Online" is back as a clearly labelled secondary link.
- Numeric claims (review counts, display counts, two-day installs, free design) are off the site until verified.

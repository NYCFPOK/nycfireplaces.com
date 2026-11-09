// Builds src/data/redirects.json: every old WordPress URL gets a deliberate
// destination. Old URLs that still exist on the new site are left alone.
//   node migration/build-redirects.mjs
// Review the "REVIEW" entries with Search Console data before launch.
import fs from 'node:fs';
const root = new URL('..', import.meta.url).pathname;
const read = (p) => JSON.parse(fs.readFileSync(root + p, 'utf8'));
const old = read('migration/wordpress-export/sitemap.json').map((p) => p.path);
const posts = read('migration/wordpress-export/posts.json').map((p) => new URL(p.link).pathname);
const kept = new Set([
  '/', '/fireplaces/', '/products/', '/projects/', '/outdoor-living/', '/thank-you/', '/privacy/', '/terms-of-service/', '/accessibility/',
  ...read('src/content/brands.json').map((b) => `/${b.id}/`),
  ...fs.readFileSync(root + 'src/content/types.yaml', 'utf8').match(/^- id: (.+)$/gm).map((l) => `/${l.slice(6).trim()}/`),
]);

const GEO = ['bronx-ny', 'brooklyn-ny', 'greenwich-ct', 'manhattan-ny', 'nassau-county-ny', 'new-jersey', 'queens-ny', 'staten-island-ny', 'suffolk-county-ny', 'westchester-ny'];
const manual = {
  '/all-fireplaces/': '/fireplaces/', '/fireplaces-mockup-2/': '/fireplaces/', '/fireboxes/': '/fireplaces/new/',
  '/all-fireplace-inserts/': '/fireplaces/upgrade-existing/', '/fireplace-inserts/': '/fireplaces/upgrade-existing/',
  '/fireplace-accessories/': '/fireplaces/upgrade-existing/', '/hearth-accessories/': '/fireplaces/upgrade-existing/',
  '/natural-gas-fireplace-inserts/': '/gas-inserts/', '/propane-fireplace-insert/': '/gas-inserts/',
  '/pellet-fireplace-inserts/': '/wood-fireplace-inserts/', '/ethanol-fireplace-inserts/': '/ethanol-fireplaces/',
  '/water-fireplace-inserts/': '/water-vapor-fireplaces/', '/water-fireplaces/': '/water-vapor-fireplaces/',
  '/natural-gas-fireplaces/': '/direct-vent-gas-fireplaces/', '/propane-fireplaces/': '/direct-vent-gas-fireplaces/',
  '/vent-free-fireplaces/': '/guides/fireplace-without-a-chimney/', '/wall-mounted-fireplaces/': '/electric-fireplaces/',
  '/pellet-fireplaces/': '/stoves/', '/all-stoves/': '/stoves/', '/electric-stoves/': '/stoves/', '/ethanol-stoves/': '/stoves/',
  '/natural-gas-stoves/': '/stoves/', '/pellet-stoves/': '/stoves/', '/propane-stoves/': '/stoves/', '/water-stoves/': '/stoves/', '/wood-stoves/': '/stoves/',
  '/all-outdoor-fireplaces/': '/outdoor-fireplaces/', '/gas-outdoor-fireplaces/': '/outdoor-fireplaces/', '/wood-outdoor-fireplaces/': '/outdoor-fireplaces/',
  '/all-outdoor-living/': '/outdoor-living/', '/outdoor-area/': '/outdoor-living/',
  '/log-sets/': '/gas-logs/', '/burners/': '/gas-logs/', '/fireplace-mantel/': '/mantels/',
  '/fireplace-brands/': '/brands/', '/outdoor-kitchen-brands/': '/brands/', '/outdoor-living-brands/': '/brands/',
  '/fireplace-portfolio/': '/projects/type/fireplaces/', '/custom-outdoor-kitchens/': '/projects/type/outdoor-kitchens/',
  '/outdoor-kitchen/': '/outdoor-kitchens/', '/outdoor-kitchen-products/': '/outdoor-kitchens/', '/get-started-with-an-outdoor-kitchen/': '/outdoor-kitchens/',
  '/challenger-outdoor-kitchen-islands/': '/challenger-designs/', '/challenger-outdoor-kitchen-packages/': '/challenger-designs/', '/new-castle-outdoor-kitchen-islands/': '/outdoor-kitchen-islands/',
  '/barbeques-and-grills/': '/built-in-grills/', '/freestanding-grills/': '/built-in-grills/',
  '/builders-architects/': '/designers-builders/',
  '/consultation-design/': '/project-help/', '/free-consultation/': '/project-help/', '/contact-us/': '/project-help/', '/design-your-fireplace/': '/project-help/', '/patio-heater-consultation/': '/patio-heaters/',
  '/installations/': '/service-areas/', '/areas-served/': '/service-areas/',
  '/request-parts/': '/project-help/?kind=parts', '/request-service-appointment/': '/project-help/?kind=service', '/owners-manuals/': '/service-parts/',
  '/frequently-asked-questions/': '/guides/', '/blogs/': '/guides/', '/fireplace-checklist/': '/guides/what-to-bring-to-the-showroom/',
  '/fireplace-options/': '/fireplaces/', '/open-fireplace-options/': '/fireplaces/upgrade-existing/',
  '/locations/': '/showroom/', '/staff/': '/about/', '/custom-fireplaces-and-outdoor-kitchens/': '/about/', '/testimonials/': '/projects/',
  '/models/': '/products/', '/inventory/': '/products/', '/collections/': '/products/',
  '/fireplace-x-configurator/': '/fireplace-xtrordinair/', '/kozy-heat-3d-configurator/': '/kozy-heat/', '/napoleon-design-studio/': '/napoleon/', '/urbana-fireplace-builder/': '/fireplaces/new/',
  '/homepage-demo/': '/',
};
// Destinations that need an owner decision or Search Console data before launch.
const review = {
  '/sales-deals/': ['/', 'No promotions page yet. Add one when a dated promotion is approved.'],
  '/financing/': ['/project-help/', 'Financing page is on hold until approved wording and disclosures are supplied.'],
  '/saunas/': ['/outdoor-living/', 'Saunas are not in the new site structure. Keep, drop, or add a page?'],
  '/pergolas-and-outdoor-rooms/': ['/outdoor-living/', 'Pergolas are not in the new site structure. Keep, drop, or add a page?'],
  '/pergola-3d-configurator/': ['/outdoor-living/', 'Same decision as pergolas.'],
  '/lumien-lighting/': ['/outdoor-living/', 'Lighting is not in the new site structure.'],
};
for (const g of GEO) {
  review[`/fireplaces-${g}/`] = ['/fireplaces/', 'Area landing page consolidated. Check Search Console traffic before launch; restore as a real page if it earns visits.'];
  review[`/outdoor-kitchens-${g}/`] = ['/outdoor-kitchens/', 'Area landing page consolidated. Check Search Console traffic before launch; restore as a real page if it earns visits.'];
}
for (const p of posts) review[p] = ['/guides/', 'Blog post not migrated. Rewrite as a guide if it earns traffic.'];

const exact = { ...manual, ...Object.fromEntries(Object.entries(review).map(([k, v]) => [k, v[0]])) };
const missing = old.filter((p) => !kept.has(p) && !exact[p]);
if (missing.length) { console.error('Old URLs with no destination:', missing); process.exit(1); }

const projects = {};
for (const f of fs.readdirSync(root + 'src/content/projects')) {
  const p = read('src/content/projects/' + f);
  if (p.legacyId) projects[p.legacyId] = f.replace('.json', '');
}
// Vendor-plugin URL families (dynamic catalog and location pages).
const prefixes = [
  ['/locations/detail/', '/showroom/'], ['/projects/search/', '/projects/'],
  ['/models/', '/products/'], ['/inventory/', '/products/'], ['/collections/', '/products/'], ['/parts/', '/service-parts/'], ['/part-inventory/', '/service-parts/'],
  ['/category/', '/guides/'], ['/author/', '/about/'], ['/careers/', '/about/'],
];
fs.writeFileSync(root + 'src/data/redirects.json', JSON.stringify({ exact, projects, prefixes }, null, 1) + '\n');

const rows = [['Old URL', 'New URL', 'Type', 'Note']];
for (const p of old.concat(posts).sort()) {
  if (kept.has(p)) rows.push([p, p, 'kept (same URL)', '']);
  else rows.push([p, exact[p], review[p] ? '301 — REVIEW' : '301', review[p]?.[1] ?? '']);
}
rows.push(['/projects/detail/?unit_id={id}', '/projects/{slug}/', `301 (${Object.keys(projects).length} projects, one to one)`, '']);
for (const [a, b] of prefixes) rows.push([a + '*', b, '301 (prefix)', 'Vendor catalog URL family']);
fs.writeFileSync(root + 'docs/redirect-map.csv', rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n') + '\n');
console.log(`redirects: ${Object.keys(exact).length} exact, ${Object.keys(projects).length} projects, ${prefixes.length} prefixes; kept ${old.filter((p) => kept.has(p)).length} URLs unchanged`);

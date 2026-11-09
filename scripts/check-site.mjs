// Post-build checks. Run after `npm run build`:  npm run check
// Fails if the built site breaks any of the rules the rebuild was designed around.
import fs from 'node:fs';
import path from 'node:path';
const root = new URL('..', import.meta.url).pathname;
const dist = path.join(root, 'dist/client');
const site = JSON.parse(fs.readFileSync(root + 'src/data/site.json', 'utf8'));
const redirects = JSON.parse(fs.readFileSync(root + 'src/data/redirects.json', 'utf8'));
const problems = [];
const pages = [];
(function walk(dir) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) walk(p);
    else if (f.name.endsWith('.html')) pages.push(p);
  }
})(dist);
const urlOf = (file) => '/' + path.relative(dist, file).replace(/index\.html$/, '').replace(/\.html$/, '/');
const built = new Set(pages.map(urlOf));
const server = new Set(['/project-help/', '/api/health/']);
const exists = (u) => built.has(u) || server.has(u) || fs.existsSync(path.join(dist, u));

const banned = [
  [/\$0(?![\d.,])/, '$0 placeholder price'], [/add to cart|checkout|buy now|my quote/i, 'ecommerce language'],
  [/best[- ]sell/i, 'unverified "best seller" claim'], [/\b\d{2,3}\+?\s*(models|displays?) on display/i, 'display count'],
  [/\b\d{3}\+?\s*(five|5)[- ]star|\d{3}\+\s*(google )?reviews/i, 'numeric review claim'], [/family[- ]owned for|since (19|20)\d\d/i, 'unsupported history claim'],
  [/24\/7|same[- ]day|2[- ]day|two[- ]day/i, 'timing promise'], [/free (design|consultation|site visit|estimate)/i, 'unconfirmed free offer'],
  [/lorem ipsum|TODO|PLACEHOLDER|\[\[/i, 'placeholder text'],
];
let links = 0;
for (const file of pages) {
  const url = urlOf(file);
  if (url.startsWith('/admin')) continue;
  const html = fs.readFileSync(file, 'utf8');
  const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ');
  if (!['/privacy/', '/terms-of-service/'].includes(url)) for (const [re, label] of banned) { const m = text.match(re); if (m) problems.push(`${url}: ${label} ("${m[0]}")`); }
  if (!/<title>[^<]{10,}/.test(html)) problems.push(`${url}: missing title`);
  if (!/<meta name="description" content="[^"]{40,}/.test(html)) problems.push(`${url}: missing or short meta description`);
  if ((html.match(/<h1[\s>]/g) || []).length !== 1) problems.push(`${url}: expected exactly one h1`);
  if (/<img(?![^>]*\balt\b)[^>]*>/.test(html)) problems.push(`${url}: image without alt attribute`);
  if (!html.includes(`tel:${site.phone.e164}`)) problems.push(`${url}: no phone link`);
  if (!html.includes(site.showroom.street)) problems.push(`${url}: showroom address missing`);
  for (const m of html.matchAll(/tel:([+\d]+)/g)) if (m[1] !== site.phone.e164) problems.push(`${url}: inconsistent phone ${m[1]}`);
  for (const m of html.matchAll(/href="(\/[^"#?]*)(?:[?#][^"]*)?"/g)) {
    links++;
    const target = m[1];
    if (target.startsWith('/_astro/') || target.startsWith('/admin')) continue;
    if (!exists(target)) problems.push(`${url}: broken internal link ${target}`);
    if (redirects.exact[target]) problems.push(`${url}: links to a redirected URL ${target}`);
  }
}
// Every old WordPress URL must resolve: either the page still exists, or it redirects to a page that exists.
const old = JSON.parse(fs.readFileSync(root + 'migration/wordpress-export/sitemap.json', 'utf8')).map((p) => p.path);
let home = 0;
for (const p of old) {
  const to = redirects.exact[p];
  if (!to) { if (!built.has(p)) problems.push(`migration: ${p} has no page and no redirect`); continue; }
  if (!exists(to.split(/[?#]/)[0])) problems.push(`migration: ${p} redirects to missing ${to}`);
  if (to === '/' && p !== '/') home++;
}
for (const [id, slug] of Object.entries(redirects.projects)) if (!built.has(`/projects/${slug}/`)) problems.push(`migration: project ${id} -> missing /projects/${slug}/`);

console.log(`${pages.length} pages, ${links} internal links, ${old.length} old URLs, ${Object.keys(redirects.projects).length} project redirects; ${home} old URLs point at the homepage`);
if (problems.length) { console.error(`\n${problems.length} problem(s):\n` + [...new Set(problems)].slice(0, 60).join('\n')); process.exit(1); }
console.log('All checks passed.');

// Harvest all content from the live WordPress REST API into /content/*.json
// Read-only, uses the public REST API. Run: node scripts/harvest.mjs
import { writeFile, mkdir } from 'node:fs/promises';

const BASE = 'https://www.nycfireplaces.com/wp-json/wp/v2';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const OUT = new URL('../content/', import.meta.url);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(url, attempt = 1) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.status === 400) return { done: true };
    if ((res.status === 503 || res.status === 429 || res.status >= 500) && attempt <= 5) {
      const wait = 1500 * attempt;
      process.stdout.write(`\n  ${res.status} — backing off ${wait}ms (try ${attempt})...`);
      await sleep(wait);
      return fetchJson(url, attempt + 1);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return { batch: await res.json(), totalPages: Number(res.headers.get('x-wp-totalpages') || 1) };
  } catch (e) {
    if (attempt <= 5) {
      await sleep(1500 * attempt);
      return fetchJson(url, attempt + 1);
    }
    throw e;
  }
}

async function getAll(endpoint, fields, perPage = 10) {
  const out = [];
  let page = 1;
  for (;;) {
    const url = `${BASE}/${endpoint}?per_page=${perPage}&page=${page}` + (fields ? `&_fields=${fields}` : '');
    const { batch, totalPages, done } = await fetchJson(url);
    if (done || !Array.isArray(batch) || batch.length === 0) break;
    out.push(...batch);
    process.stdout.write(`  ${endpoint}: page ${page}/${totalPages} (${out.length})\r`);
    if (page >= totalPages) break;
    page++;
    await sleep(400); // be polite to the WAF
  }
  process.stdout.write('\n');
  return out;
}

await mkdir(OUT, { recursive: true });

console.log('Harvesting pages...');
const pages = await getAll(
  'pages',
  'id,slug,title,link,parent,menu_order,status,date,modified,excerpt.rendered,content.rendered,yoast_head_json'
);
await writeFile(new URL('pages.json', OUT), JSON.stringify(pages, null, 2));

console.log('Harvesting posts...');
const posts = await getAll(
  'posts',
  'id,slug,title,link,date,modified,excerpt.rendered,content.rendered,categories,yoast_head_json'
);
await writeFile(new URL('posts.json', OUT), JSON.stringify(posts, null, 2));

console.log('Harvesting media manifest...');
const media = await getAll('media', 'id,slug,source_url,mime_type,alt_text,media_details.width,media_details.height', 50);
await writeFile(new URL('media.json', OUT), JSON.stringify(media, null, 2));

// Build a lightweight sitemap/redirect map for SEO preservation
const sitemap = pages
  .map((p) => ({ slug: p.slug, path: new URL(p.link).pathname, title: p.title?.rendered, parent: p.parent }))
  .sort((a, b) => a.path.localeCompare(b.path));
await writeFile(new URL('sitemap.json', OUT), JSON.stringify(sitemap, null, 2));

console.log(`\nDone:\n  pages:  ${pages.length}\n  posts:  ${posts.length}\n  media:  ${media.length}\n  -> nycfireplaces.com/content/`);

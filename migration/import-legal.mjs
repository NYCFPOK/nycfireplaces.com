// Converts the harvested Privacy, Terms and Accessibility pages to Markdown.
//   node migration/import-legal.mjs
import fs from 'node:fs';
const root = new URL('..', import.meta.url).pathname;
const pages = JSON.parse(fs.readFileSync(root + 'migration/wordpress-export/pages.json', 'utf8'));
const map = { privacy: 'privacy', 'terms-of-service': 'terms-of-service' }; // accessibility.md is written by hand
const ent = (s) => s.replace(/&amp;/g, '&').replace(/&#8217;|&#8216;|&rsquo;|&lsquo;/g, "'").replace(/&#8220;|&#8221;|&ldquo;|&rdquo;/g, '"').replace(/&#8211;|&ndash;/g, '–').replace(/&#8212;|&mdash;/g, '—').replace(/&nbsp;/g, ' ').replace(/&#038;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
for (const [slug, out] of Object.entries(map)) {
  const p = pages.find((x) => x.slug === slug);
  let h = p.content.rendered.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>|<form[\s\S]*?<\/form>/g, '');
  h = h.replace(/<h1[^>]*>[\s\S]*?<\/h1>/g, '')
    .replace(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/g, (_, t) => `\n\n## ${t.replace(/<[^>]+>/g, '').trim()}\n\n`)
    .replace(/<h[456][^>]*>([\s\S]*?)<\/h[456]>/g, (_, t) => `\n\n### ${t.replace(/<[^>]+>/g, '').trim()}\n\n`)
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/g, (_, t) => `\n- ${t.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()}`)
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g, (_, href, t) => `[${t.replace(/<[^>]+>/g, '').trim()}](${href.replace('https://www.nycfireplaces.com', '')})`)
    .replace(/<(strong|b)>([\s\S]*?)<\/\1>/g, '**$2**')
    .replace(/<\/(p|div|ul|ol)>/g, '\n\n').replace(/<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, '');
  const body = ent(h).split('\n').map((l) => l.replace(/[ \t]+/g, ' ').trim()).join('\n').replace(/\n{3,}/g, '\n\n').replace(/\*\*\s*\*\*/g, '').replace(/\(tel:\+?1?7183264328\)/g, '(tel:+17183264328)').trim();
  const title = ent(p.title.rendered);
  fs.writeFileSync(`${root}src/content/legal/${out}.md`, `---\ntitle: ${JSON.stringify(title)}\ndescription: ${JSON.stringify(title + ' for NYC Fireplaces & Outdoor Kitchens.')}\nupdated: "${p.modified.slice(0, 10)}"\n---\n${body}\n`);
  console.log(out, body.length);
}

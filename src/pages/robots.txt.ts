import type { APIRoute } from 'astro';
// Staging and previews are never indexable. Only SITE_ENV=production opens the site to crawlers.
export const GET: APIRoute = ({ site }) => {
  const production = import.meta.env.SITE_ENV === 'production';
  const body = production
    ? `User-agent: *\nAllow: /\nDisallow: /project-help/\nDisallow: /thank-you/\nDisallow: /admin/\n\nSitemap: ${new URL('/sitemap-index.xml', site).href}\n`
    : 'User-agent: *\nDisallow: /\n';
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
};

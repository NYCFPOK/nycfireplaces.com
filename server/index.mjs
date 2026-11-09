// Production server. Order of work for every request:
//   1. staging password (when STAGING_BASIC_AUTH is set)
//   2. permanent redirects from the old WordPress URLs
//   3. security + caching headers
//   4. prerendered pages and assets from dist/client
//   5. the two server routes (inquiry form, health check) and the 404 page
//
//   npm run build && npm start
import http from 'node:http';
import fs from 'node:fs';
import sirv from 'sirv';
import { handler as astro } from '../dist/server/entry.mjs';

const { exact, projects, prefixes } = JSON.parse(fs.readFileSync(new URL('../src/data/redirects.json', import.meta.url), 'utf8'));
const PORT = Number(process.env.PORT || 4321);
const HOST = process.env.HOST || '0.0.0.0';
const PRODUCTION = process.env.SITE_ENV === 'production';
const AUTH = process.env.STAGING_BASIC_AUTH || ''; // "user:password"
const MAX_BODY = 30 * 1024 * 1024;

const assets = sirv(new URL('../dist/client', import.meta.url).pathname, {
  etag: true,
  brotli: true,
  gzip: true,
  setHeaders(res, pathname) {
    res.setHeader('Cache-Control', pathname.startsWith('/_astro/') ? 'public, max-age=31536000, immutable' : 'public, max-age=300');
  },
});

function redirectFor(url) {
  const path = url.pathname.endsWith('/') ? url.pathname : url.pathname + '/';
  if (path === '/projects/detail/') {
    const slug = projects[url.searchParams.get('unit_id') ?? ''];
    return slug ? `/projects/${slug}/` : '/projects/';
  }
  if (exact[path]) return exact[path];
  for (const [prefix, to] of prefixes) if (path.startsWith(prefix)) return to;
  // Add the trailing slash for real pages (but not for files such as /robots.txt).
  if (path !== url.pathname && !/\.[a-z0-9]+$/i.test(url.pathname)) return path + url.search;
  return null;
}

http
  .createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (AUTH && !url.pathname.startsWith('/api/health')) {
      const given = Buffer.from((req.headers.authorization || '').replace(/^Basic /, ''), 'base64').toString();
      if (given !== AUTH) {
        res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Preview"', 'Content-Type': 'text/plain' });
        return res.end('This preview is password protected.');
      }
    }
    if (req.method === 'GET' || req.method === 'HEAD') {
      const to = redirectFor(url);
      if (to) {
        res.writeHead(301, { Location: to, 'Cache-Control': PRODUCTION ? 'public, max-age=3600' : 'no-store' });
        return res.end();
      }
    }
    if (Number(req.headers['content-length'] || 0) > MAX_BODY) {
      res.writeHead(413, { 'Content-Type': 'text/plain' });
      return res.end('That upload is too large. Please send smaller files or call us at 718-326-4328.');
    }
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (PRODUCTION) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
    else res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    assets(req, res, () => astro(req, res));
  })
  .listen(PORT, HOST, () => console.log(`nycfireplaces.com listening on http://${HOST}:${PORT} (${PRODUCTION ? 'production' : 'not production: noindex'})`));

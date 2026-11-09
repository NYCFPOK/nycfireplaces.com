// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import node from '@astrojs/node';

import react from '@astrojs/react';

// Pages are prerendered to static HTML. Only the inquiry form handler
// (/project-help/) and the health check run on the server.
// Hostnames the server answers on. Form posts are only accepted when the
// browser's Origin matches one of these (cross-site request protection).
// Add a staging hostname at build time with PREVIEW_HOSTS=staging.example.com
const hosts = ['www.nycfireplaces.com', 'nycfireplaces.com', 'localhost', '127.0.0.1', ...(process.env.PREVIEW_HOSTS || '').split(',').map((h) => h.trim()).filter(Boolean)];

export default defineConfig({
  site: 'https://www.nycfireplaces.com',
  output: 'static',
  trailingSlash: 'always',
  adapter: node({ mode: 'middleware' }),
  security: { checkOrigin: true, allowedDomains: hosts.map((hostname) => ({ hostname })) },
  integrations: [sitemap({ filter: (page) => !/\/(thank-you|project-help|404|admin)\//.test(page) }), react()],
  vite: { plugins: [tailwindcss()] },
});
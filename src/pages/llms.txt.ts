import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { site, showroom, addressLine, hoursRows } from '../data/site';

// A plain-text summary of the business for AI assistants and answer engines.
// Built from the same data as the pages, so it cannot drift from them.
export const GET: APIRoute = async ({ site: base }) => {
  const url = (path: string) => new URL(path, base).href;
  const options = (await getCollection('options')).sort((a, b) => a.data.order - b.data.order);
  const guides = await getCollection('guides');
  const lines = [
    `# ${site.name}`,
    '',
    `> ${site.teamStatement} Showroom, design help, supply and installation of fireplaces and outdoor kitchens in New York City and Long Island.`,
    '',
    '## Contact',
    `- Phone: ${site.phone.display}`,
    `- Showroom: ${addressLine}`,
    ...hoursRows.map((r) => `- ${r.label}: ${r.value}`),
    `- Showroom details and directions: ${url('/showroom/')}`,
    `- Project inquiries: ${url('/project-help/')}`,
    '',
    '## Start here',
    `- [Add a new fireplace](${url('/fireplaces/new/')})`,
    `- [Upgrade an existing fireplace](${url('/fireplaces/upgrade-existing/')})`,
    `- [Plan an outdoor kitchen](${url('/outdoor-kitchens/')})`,
    `- [Fire pits, outdoor fireplaces and patio heating](${url('/outdoor-living/')})`,
    `- [Three-question project guide](${url('/start-here/')})`,
    '',
    '## Featured options',
    ...options.map((o) => `- [${o.data.title}](${url(`/products/${o.id}/`)}): ${o.data.whatItIs}`),
    '',
    '## Proof and guides',
    `- [Completed projects](${url('/projects/')})`,
    ...guides.map((g) => `- [${g.data.title}](${url(`/guides/${g.id}/`)})`),
    '',
    '## Good to know',
    '- Pricing is by quote. Call or send a project inquiry; a model number is not needed.',
    `- Grills, parts and accessories are sold online at ${site.shopOnline.url}`,
    `- Designers and builders: ${url('/designers-builders/')}`,
    `- Service and parts for units we installed: ${url('/service-parts/')}`,
    '',
  ];
  return new Response(lines.join('\n'), { headers: { 'content-type': 'text/plain; charset=utf-8' } });
};

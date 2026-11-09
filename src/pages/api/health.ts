import type { APIRoute } from 'astro';
import { deliveryFailureCount } from '../../lib/leads';
export const prerender = false;
// For uptime monitoring. Returns 503 when any stored lead failed to deliver,
// so an alert fires until someone follows up. Exposes counts only.
export const GET: APIRoute = async () => {
  const failures = await deliveryFailureCount();
  return new Response(JSON.stringify({ ok: failures === 0, undeliveredLeads: failures }), {
    status: failures === 0 ? 200 : 503,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
};

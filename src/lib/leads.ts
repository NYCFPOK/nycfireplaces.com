// One lead pipeline for every form on the site.
//
//   validate -> spam checks -> duplicate check -> STORE (durable) -> deliver
//
// A lead is written to disk before any delivery is attempted, so an email or
// CRM outage can never make an inquiry disappear. Delivery failures are
// recorded and alerted on; the stored lead can be re-sent from the log.
// All credentials come from server environment variables (see .env.example).
import { createHash, randomUUID } from 'node:crypto';
import { appendFile, mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';

export type LeadKind = 'project' | 'product' | 'trade' | 'service' | 'parts';
export const LEAD_KINDS: LeadKind[] = ['project', 'product', 'trade', 'service', 'parts'];

export const PROJECT_TYPES = [
  ['new-fireplace', 'Adding a new fireplace'],
  ['existing-fireplace', 'Upgrading an existing fireplace'],
  ['outdoor-kitchen', 'Planning an outdoor kitchen or grill'],
  ['outdoor-fire-heat', 'Fire pit, outdoor fireplace or patio heating'],
  ['pizza-oven', 'Pizza oven'],
  ['showroom-visit', 'Planning a showroom visit'],
  ['not-sure', 'Not sure yet'],
] as const;

export interface LeadValues { [key: string]: string }
export interface LeadErrors { [key: string]: string }
export interface LeadResult {
  ok: boolean;
  kind: LeadKind;
  values: LeadValues;
  errors: LeadErrors;
  /** Set when the request was silently dropped as spam (still shown as success). */
  dropped?: boolean;
}

const env = (k: string, fallback = '') => process.env[k] ?? (import.meta.env?.[k] as string | undefined) ?? fallback;
const DATA_DIR = () => path.resolve(env('LEAD_DATA_DIR', '.data'));

const TEXT_FIELDS = [
  'name', 'phone', 'email', 'zip', 'project_type', 'message', 'preferred_contact', 'timeline', 'budget',
  'product', 'company', 'role', 'project_location', 'project_stage', 'sold_by_us', 'brand', 'model',
  'serial', 'order_number', 'page', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid',
];
const MAX = { default: 200, message: 3000 };
const MAX_FILES = 5;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_BYTES = 25 * 1024 * 1024;

// Accepted uploads, identified by their leading bytes rather than the
// filename or the browser-supplied content type.
function sniff(buf: Buffer): { ext: string; mime: string } | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: 'jpg', mime: 'image/jpeg' };
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: 'png', mime: 'image/png' };
  if (buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return { ext: 'webp', mime: 'image/webp' };
  if (buf.subarray(0, 5).toString('latin1') === '%PDF-') return { ext: 'pdf', mime: 'application/pdf' };
  if (buf.subarray(4, 8).toString('latin1') === 'ftyp' && /^(heic|heix|hevc|mif1|msf1)/.test(buf.subarray(8, 12).toString('latin1'))) return { ext: 'heic', mime: 'image/heic' };
  return null;
}

const rate = new Map<string, number[]>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (rate.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  hits.push(now);
  rate.set(ip, hits);
  if (rate.size > 5000) rate.clear();
  return hits.length > 6;
}

const recent = new Map<string, number>();
function isDuplicate(fingerprint: string): boolean {
  const now = Date.now();
  for (const [k, t] of recent) if (now - t > 15 * 60_000) recent.delete(k);
  if (recent.has(fingerprint)) return true;
  recent.set(fingerprint, now);
  return false;
}

async function turnstileOk(token: string, ip: string): Promise<boolean> {
  const secret = env('TURNSTILE_SECRET_KEY');
  if (!secret) return true; // not configured: honeypot, timing and rate limits still apply
  if (!token) return false;
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
    });
    return ((await res.json()) as { success: boolean }).success === true;
  } catch {
    return true; // never lose a real inquiry because the challenge service is down
  }
}

export function validate(kind: LeadKind, v: LeadValues): LeadErrors {
  const e: LeadErrors = {};
  if (!v.name) e.name = 'Please tell us your name.';
  const phoneDigits = v.phone.replace(/\D/g, '');
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email);
  if (!v.phone && !v.email) e.contact = 'Please give us a phone number or an email address so we can reply.';
  else {
    if (v.phone && (phoneDigits.length < 10 || phoneDigits.length > 15)) e.phone = 'That phone number looks incomplete. Please include the area code.';
    if (v.email && !emailOk) e.email = 'That email address does not look right. Please check it.';
  }
  if (v.zip && !/^\d{5}(-\d{4})?$/.test(v.zip)) e.zip = 'Please enter a 5-digit ZIP code.';
  if (kind === 'project' || kind === 'product') {
    if (!v.project_type) e.project_type = 'Please choose the closest option. "Not sure yet" is fine.';
  }
  if (kind === 'service') {
    if (!v.zip) e.zip = e.zip ?? 'Please enter the ZIP code where the unit is installed.';
    if (!v.sold_by_us) e.sold_by_us = 'Please let us know whether we sold and installed the unit.';
    if (!v.message) e.message = 'Please describe the problem briefly.';
  }
  if (kind === 'parts' && !v.message) e.message = 'Please describe the part you need.';
  return e;
}

interface StoredFile { name: string; stored: string; mime: string; bytes: number }

export async function handleLead(request: Request, clientIp: string): Promise<LeadResult> {
  const form = await request.formData();
  const get = (k: string) => {
    const raw = form.get(k);
    const s = typeof raw === 'string' ? raw.trim() : '';
    return s.slice(0, k === 'message' ? MAX.message : MAX.default);
  };
  const kindRaw = get('kind') as LeadKind;
  const kind: LeadKind = LEAD_KINDS.includes(kindRaw) ? kindRaw : 'project';
  const values: LeadValues = {};
  for (const f of TEXT_FIELDS) values[f] = get(f);
  values.newsletter = form.get('newsletter') === 'yes' ? 'yes' : '';

  // --- spam checks: drop quietly, and show the sender a normal confirmation ---
  const started = Number(get('ts'));
  const tooFast = started > 0 && Date.now() - started < 2500;
  if (get('fax_number') || tooFast) return { ok: true, kind, values, errors: {}, dropped: true };
  if (rateLimited(clientIp)) {
    return { ok: false, kind, values, errors: { form: 'We received several messages from this connection in a short time. Please call us, or try again in a few minutes.' } };
  }

  const errors = validate(kind, values);

  // --- files ---
  const uploads = form.getAll('files').filter((f): f is File => f instanceof File && f.size > 0);
  const files: { file: File; buf: Buffer; type: { ext: string; mime: string } }[] = [];
  if (uploads.length > MAX_FILES) errors.files = `Please attach up to ${MAX_FILES} files. You can send more after we reply.`;
  else {
    let total = 0;
    for (const file of uploads) {
      total += file.size;
      if (file.size > MAX_FILE_BYTES || total > MAX_TOTAL_BYTES) { errors.files = 'Those files are too large (10 MB each, 25 MB in total). Please attach smaller copies, or send them after we reply.'; break; }
      const buf = Buffer.from(await file.arrayBuffer());
      const type = sniff(buf);
      if (!type) { errors.files = 'Please attach photos (JPG, PNG, WebP, HEIC) or PDF files only.'; break; }
      files.push({ file, buf, type });
    }
  }

  if (Object.keys(errors).length) {
    if (uploads.length && !errors.files) errors.files_note = 'Please re-attach your files before sending. Browsers do not keep them after an error.';
    return { ok: false, kind, values, errors };
  }
  if (!(await turnstileOk(get('cf-turnstile-response'), clientIp))) {
    return { ok: false, kind, values, errors: { form: 'We could not confirm the security check. Please try again, or call us.' } };
  }

  // --- duplicate protection (double click, refresh, back button) ---
  const fingerprint = createHash('sha256')
    .update([kind, values.name, values.phone, values.email, values.message, values.product].join('|').toLowerCase())
    .digest('hex');
  if (isDuplicate(fingerprint)) return { ok: true, kind, values, errors: {} };

  // --- store first ---
  const id = `${new Date().toISOString().slice(0, 10)}-${randomUUID().slice(0, 8)}`;
  const dir = DATA_DIR();
  await mkdir(dir, { recursive: true });
  const stored: StoredFile[] = [];
  if (files.length) {
    const updir = path.join(dir, 'uploads', id);
    await mkdir(updir, { recursive: true });
    for (const f of files) {
      const storedName = `${randomUUID()}.${f.type.ext}`; // never trust the client filename on disk
      await writeFile(path.join(updir, storedName), f.buf, { mode: 0o600 });
      stored.push({ name: f.file.name.replace(/[^\w.\- ]+/g, '_').slice(0, 80), stored: `uploads/${id}/${storedName}`, mime: f.type.mime, bytes: f.buf.length });
    }
  }
  const lead = {
    id,
    receivedAt: new Date().toISOString(),
    kind,
    route: routeFor(kind),
    ...Object.fromEntries(Object.entries(values).filter(([, val]) => val)),
    files: stored,
    referrer: (request.headers.get('referer') || '').slice(0, 300),
    environment: env('SITE_ENV', 'development'),
  };
  await appendFile(path.join(dir, 'leads.jsonl'), JSON.stringify(lead) + '\n', { mode: 0o600 });

  // --- then deliver ---
  try {
    await deliver(lead, files.map((f, i) => ({ filename: stored[i].name, content: f.buf, contentType: f.type.mime })));
  } catch (err) {
    const failure = { id, at: new Date().toISOString(), error: String((err as Error)?.message ?? err) };
    console.error('[leads] DELIVERY FAILED: lead is stored and needs manual follow-up', failure);
    await appendFile(path.join(dir, 'delivery-failures.jsonl'), JSON.stringify(failure) + '\n').catch(() => {});
    const alert = env('LEAD_ALERT_WEBHOOK_URL');
    if (alert) {
      // Alert carries the lead id only, never the customer's details.
      fetch(alert, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: `Website lead ${id} was stored but could not be delivered: ${failure.error}` }) }).catch(() => {});
    }
  }
  return { ok: true, kind, values, errors: {} };
}

function routeFor(kind: LeadKind): string {
  if (kind === 'service') return env('LEAD_TO_SERVICE') || env('LEAD_TO_SALES');
  if (kind === 'parts') return env('LEAD_TO_PARTS') || env('LEAD_TO_SALES');
  if (kind === 'trade') return env('LEAD_TO_TRADE') || env('LEAD_TO_SALES');
  return env('LEAD_TO_SALES');
}

const LABELS: Record<string, string> = {
  name: 'Name', phone: 'Phone', email: 'Email', zip: 'ZIP', project_type: 'Project type', product: 'Asking about',
  message: 'Message', preferred_contact: 'Preferred contact', timeline: 'Timeline', budget: 'Budget range',
  company: 'Company', role: 'Role', project_location: 'Project location', project_stage: 'Project stage',
  sold_by_us: 'Sold and installed by us', brand: 'Brand', model: 'Model', serial: 'Serial number',
  order_number: 'Sales order number', newsletter: 'Asked to join email list', page: 'Sent from page',
  utm_source: 'utm_source', utm_medium: 'utm_medium', utm_campaign: 'utm_campaign', utm_term: 'utm_term',
  utm_content: 'utm_content', gclid: 'gclid', referrer: 'Referrer',
};
const SUBJECT: Record<LeadKind, string> = {
  project: 'New project inquiry', product: 'Product inquiry', trade: 'Trade / designer-builder inquiry',
  service: 'SERVICE request', parts: 'PARTS request',
};

async function deliver(lead: Record<string, unknown>, attachments: { filename: string; content: Buffer; contentType: string }[]) {
  const mode = env('LEAD_DELIVERY', 'file');
  const webhook = env('LEAD_WEBHOOK_URL');
  if (webhook) {
    const res = await fetch(webhook, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(lead) });
    if (!res.ok) throw new Error(`CRM webhook responded ${res.status}`);
  }
  if (mode !== 'smtp') return; // "file": stored only. Used for local development and tests.
  const to = String(lead.route || '');
  if (!to) throw new Error('No recipient configured (LEAD_TO_SALES)');
  const nodemailer = (await import('nodemailer')).default;
  const transport = nodemailer.createTransport({
    host: env('SMTP_HOST'), port: Number(env('SMTP_PORT', '587')), secure: env('SMTP_SECURE') === 'true',
    auth: env('SMTP_USER') ? { user: env('SMTP_USER'), pass: env('SMTP_PASS') } : undefined,
  });
  const kind = lead.kind as LeadKind;
  const lines = Object.entries(LABELS).filter(([k]) => lead[k]).map(([k, label]) => `${label}: ${lead[k]}`);
  const staging = lead.environment !== 'production' ? '[TEST: not a real customer] ' : '';
  const totalBytes = attachments.reduce((s, a) => s + a.content.length, 0);
  await transport.sendMail({
    from: env('LEAD_FROM', 'website@nycfireplaces.com'),
    to,
    replyTo: lead.email ? String(lead.email) : undefined,
    subject: `${staging}${SUBJECT[kind]}: ${lead.name}${lead.product ? `: ${lead.product}` : ''}`,
    text: `${SUBJECT[kind]} from the website\nReference: ${lead.id}\n\n${lines.join('\n')}\n\nFiles: ${attachments.length ? attachments.map((a) => a.filename).join(', ') : 'none'}${totalBytes > 18 * 1024 * 1024 ? '\n(Files were too large to attach. They are saved on the server under this reference.)' : ''}\n`,
    attachments: totalBytes > 18 * 1024 * 1024 ? [] : attachments,
  });
}

/** Used by the health check so monitoring can see undelivered leads. */
export async function deliveryFailureCount(): Promise<number> {
  try {
    const txt = await readFile(path.join(DATA_DIR(), 'delivery-failures.jsonl'), 'utf8');
    return txt.split('\n').filter(Boolean).length;
  } catch {
    return 0;
  }
}

// Multi-step inquiry: one question per screen. It posts to the same endpoint
// (/project-help/) with the same field names as the plain form, which remains
// underneath as the no-JavaScript fallback.
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

type Card = { id: string; label: string; hint: string; img: string };
interface Props { cards: Card[]; phone: string; tel: string; directions: string; page: string; initial?: string; fallbackId?: string }
type Answers = Record<string, string>;

const FOLLOW: Record<string, { key: string; q: string; options: string[] }[]> = {
  fireplace: [
    { key: 'situation', q: 'Is there a fireplace there now?', options: ['No, this would be new', 'Yes, I want to upgrade it', 'Not sure'] },
    { key: 'fuel', q: 'Any preference on fuel?', options: ['Gas', 'Electric', 'Wood', 'Not sure, help me choose'] },
    { key: 'timeline', q: 'When are you hoping to do this?', options: ['Just exploring', 'Within 3 months', '3 to 6 months', 'Tied to a renovation or build'] },
  ],
  'outdoor-kitchen': [
    { key: 'situation', q: 'Where will the kitchen go?', options: ['Backyard or patio', 'Terrace or rooftop', 'I already have a grill or island', 'Not sure'] },
    { key: 'builder', q: 'Who is building it?', options: ['I would like you to', 'My contractor or mason', 'Not decided'] },
    { key: 'timeline', q: 'When are you hoping to do this?', options: ['Just exploring', 'Within 3 months', '3 to 6 months', 'Tied to a renovation or build'] },
  ],
  grill: [
    { key: 'situation', q: 'What kind of grill?', options: ['Built into an island', 'Freestanding', 'Replacing an existing built-in', 'Not sure'] },
    { key: 'fuel', q: 'Which fuel?', options: ['Natural gas', 'Propane', 'Charcoal or pellet', 'Not sure'] },
  ],
  'pizza-oven': [
    { key: 'situation', q: 'How will it be set up?', options: ['On a countertop', 'On its own cart', 'Built into a kitchen', 'Not sure'] },
    { key: 'fuel', q: 'Which fuel?', options: ['Gas', 'Wood', 'Both', 'Not sure'] },
  ],
  'fire-feature': [
    { key: 'situation', q: 'What are you picturing?', options: ['Fire pit or fire table', 'Outdoor fireplace', 'Patio heaters', 'Not sure'] },
    { key: 'timeline', q: 'When are you hoping to do this?', options: ['Just exploring', 'Within 3 months', '3 to 6 months', 'Tied to a renovation or build'] },
  ],
  service: [
    { key: 'sold_by_us', q: 'Did NYC Fireplaces sell and install the unit?', options: ['Yes', 'No', 'Not sure'] },
  ],
};

function projectType(a: Answers) {
  switch (a.plan) {
    case 'fireplace': return a.situation?.startsWith('Yes') ? 'existing-fireplace' : a.situation?.startsWith('No') ? 'new-fireplace' : 'not-sure';
    case 'outdoor-kitchen': case 'grill': return 'outdoor-kitchen';
    case 'pizza-oven': return 'pizza-oven';
    case 'fire-feature': return 'outdoor-fire-heat';
    default: return 'not-sure';
  }
}
const STORE = 'nycf_quote_v1';
const track = (event: string, detail: Record<string, string> = {}) => {
  const w = window as unknown as { dataLayer?: unknown[] };
  (w.dataLayer = w.dataLayer || []).push({ event, page_path: location.pathname, ...detail });
};

export default function MultiStepForm({ cards, phone, tel, directions, page, initial, fallbackId }: Props) {
  const reduce = useReducedMotion();
  const [a, setA] = useState<Answers>({ plan: initial && cards.some((c) => c.id === initial) ? initial : '' });
  const [step, setStep] = useState(initial ? 1 : 0);
  const [dir, setDir] = useState(1);
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'failed'>('idle');
  const started = useRef(Date.now());
  const heading = useRef<HTMLHeadingElement>(null);
  const mounted = useRef(false);

  const follow = FOLLOW[a.plan] ?? [];
  const isService = a.plan === 'service';
  // 0 plan, 1..n follow-ups, then photo, then contact
  const total = 1 + follow.length + 2;
  const photoStep = 1 + follow.length;
  const contactStep = photoStep + 1;

  useEffect(() => {
    document.getElementById(fallbackId || '')?.setAttribute('hidden', '');
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORE) || 'null');
      if (saved && !initial) { setA(saved.a); setStep(Math.min(saved.step, 1 + (FOLLOW[saved.a.plan]?.length ?? 0) + 1)); }
    } catch { /* start fresh */ }
  }, []);
  useEffect(() => {
    try { sessionStorage.setItem(STORE, JSON.stringify({ a, step })); } catch { /* private mode */ }
    if (mounted.current) heading.current?.focus();
    mounted.current = true;
  }, [step]);

  const go = (n: number) => { setDir(n > step ? 1 : -1); setErrors({}); setStep(n); };
  const answer = (key: string, value: string, label = value) => {
    const next = { ...a, [key]: value };
    if (key === 'plan' && value !== a.plan) for (const k of ['situation', 'fuel', 'timeline', 'builder', 'sold_by_us']) delete next[k];
    setA(next);
    if (step === 0) track('quote_start', { quote_plan: value });
    track('quote_step', { quote_step: String(step + 1), quote_question: key, quote_answer: label });
    go(step + 1);
  };
  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setA({ ...a, [key]: e.target.value });

  const check = (field?: string) => {
    const e: Record<string, string> = {};
    const digits = (a.phone || '').replace(/\D/g, '');
    if (!a.name?.trim()) e.name = 'Please tell us your name.';
    if (!a.phone && !a.email) e.contact = 'Add a phone number or an email so we can reply.';
    if (a.phone && (digits.length < 10 || digits.length > 15)) e.phone = 'Please include the area code.';
    if (a.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(a.email)) e.email = 'Please check the email address.';
    if (a.zip && !/^\d{5}(-\d{4})?$/.test(a.zip)) e.zip = 'Please enter a 5-digit ZIP code.';
    if (isService && !a.zip) e.zip = 'Please add the ZIP code where the unit is installed.';
    if (isService && !a.message?.trim()) e.message = 'Please describe the problem briefly.';
    if (field) { const one = { ...errors }; delete one[field]; if (field === 'phone' || field === 'email') delete one.contact; if (e[field]) one[field] = e[field]; setErrors(one); return true; }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const summary = useMemo(() => follow.filter((f) => a[f.key] && f.key !== 'sold_by_us' && f.key !== 'timeline').map((f) => `${f.q} ${a[f.key]}`), [a, follow]);

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (state === 'sending' || !check()) return;
    setState('sending');
    const fd = new FormData();
    const card = cards.find((c) => c.id === a.plan);
    fd.set('kind', isService ? 'service' : 'project');
    fd.set('name', a.name.trim());
    fd.set('phone', a.phone || '');
    fd.set('email', a.email || '');
    fd.set('zip', a.zip || '');
    fd.set('page', page);
    fd.set('ts', String(started.current));
    fd.set('fax_number', '');
    if (isService) fd.set('sold_by_us', a.sold_by_us === 'Yes' ? 'yes' : a.sold_by_us === 'No' ? 'no' : 'not-sure');
    else { fd.set('project_type', projectType(a)); if (a.timeline) fd.set('timeline', a.timeline); }
    fd.set('message', [isService ? '' : `Planning: ${card?.label ?? 'Not sure'}.`, ...(isService ? [] : summary), a.message?.trim() || ''].filter(Boolean).join('\n'));
    for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid']) { try { const v = sessionStorage.getItem('attr_' + k); if (v) fd.set(k, v); } catch { /* ignore */ } }
    files.forEach((f) => fd.append('files', f));
    try {
      const res = await fetch('/project-help/', { method: 'POST', body: fd, headers: { Accept: 'application/json' } });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        setState('done');
        track('quote_submit', { form_kind: isService ? 'service' : 'project', quote_plan: a.plan });
        track('lead_form_received', { form_kind: isService ? 'service' : 'project' });
        try { sessionStorage.removeItem(STORE); } catch { /* ignore */ }
      } else if (data?.errors) {
        setErrors(data.errors.form ? { form: data.errors.form } : data.errors);
        if (data.errors.files || data.errors.files_note) go(photoStep);
        setState('idle');
      } else setState('failed');
    } catch { setState('failed'); }
  }

  const slide = reduce ? {} : { initial: { opacity: 0, x: 28 * dir }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -28 * dir }, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } };

  if (state === 'done') {
    return (
      <div className="msf msf-done" role="status">
        <p className="eyebrow">Message received</p>
        <h2 className="msf-q" tabIndex={-1} ref={heading}>Thank you, {a.name.trim().split(' ')[0]}. Your message reached our team.</h2>
        <p>{isService ? 'Our service team will review the request and contact you. No visit has been scheduled yet.' : 'A member of our team will read it and get back to you to talk through next steps. No appointment has been booked yet.'}</p>
        <div className="msf-actions">
          <a className="btn btn-primary" href={tel} data-track="phone_click" data-placement="quote_done">Call now: {phone}</a>
          <a className="btn btn-secondary" href="/showroom/" data-track="showroom_info_click" data-placement="quote_done">Visit the showroom</a>
        </div>
        <p className="msf-fine"><a href={directions} target="_blank" rel="noopener" data-track="directions_click" data-placement="quote_done">Get directions to 58-30 Maspeth Ave</a></p>
      </div>
    );
  }

  const q = step >= 1 && step <= follow.length ? follow[step - 1] : null;
  return (
    <form className="msf" onSubmit={submit} noValidate aria-label="Project inquiry">
      <div className="msf-top">
        <button type="button" className="msf-back" onClick={() => go(step - 1)} disabled={step === 0} aria-label="Back to the previous question">← Back</button>
        <div className="msf-progress" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={step + 1} aria-label={`Step ${step + 1} of ${total}`}>
          <span style={{ transform: `scaleX(${(step + 1) / total})` }} />
        </div>
        <span className="msf-count">{step + 1} / {total}</span>
      </div>
      <AnimatePresence mode="wait" initial={false} custom={dir}>
        <motion.div key={step} className="msf-step" {...slide}>
          {step === 0 && (
            <>
              <h2 className="msf-q" tabIndex={-1} ref={heading}>What are you planning?</h2>
              <div className="msf-cards">
                {cards.map((c) => (
                  <button type="button" key={c.id} className={'msf-card' + (a.plan === c.id ? ' is-on' : '')} onClick={() => answer('plan', c.id, c.label)}>
                    <img src={c.img} alt="" width="320" height="220" loading="lazy" decoding="async" />
                    <strong>{c.label}</strong><span>{c.hint}</span>
                  </button>
                ))}
              </div>
            </>
          )}
          {q && (
            <>
              <h2 className="msf-q" tabIndex={-1} ref={heading}>{q.q}</h2>
              <div className="msf-options">
                {q.options.map((o) => <button type="button" key={o} className={'msf-option' + (a[q.key] === o ? ' is-on' : '')} onClick={() => answer(q.key, o)}>{o}</button>)}
              </div>
            </>
          )}
          {step === photoStep && (
            <>
              <h2 className="msf-q" tabIndex={-1} ref={heading}>{isService ? 'Have a photo of the unit?' : 'Have a photo of the space?'}</h2>
              <p className="msf-hint">Optional. A phone photo helps us give you a better answer. Up to 5 files, 10 MB each.</p>
              <label className="msf-drop">
                <input type="file" multiple accept="image/jpeg,image/png,image/webp,image/heic,application/pdf,.heic" onChange={(e) => setFiles([...(e.target.files || [])].slice(0, 5))} />
                <span>{files.length ? `${files.length} file${files.length > 1 ? 's' : ''} added: ${files.map((f) => f.name).join(', ')}` : 'Tap to add photos or plans'}</span>
              </label>
              {(errors.files || errors.files_note) && <p className="msf-error" role="alert">{errors.files || errors.files_note}</p>}
              <div className="msf-actions">
                <button type="button" className="btn btn-primary" onClick={() => { track('quote_step', { quote_step: String(step + 1), quote_question: 'photos', quote_answer: files.length ? 'added' : 'skipped' }); go(contactStep); }}>{files.length ? 'Continue' : 'Skip this step'}</button>
              </div>
            </>
          )}
          {step === contactStep && (
            <>
              <h2 className="msf-q" tabIndex={-1} ref={heading}>Where should we reach you?</h2>
              <p className="msf-hint">Phone or email. One is enough.</p>
              {errors.form && <p className="msf-error" role="alert">{errors.form}</p>}
              <div className="msf-fields">
                <label>Your name
                  <input className="input" name="name" autoComplete="name" value={a.name || ''} onChange={set('name')} onBlur={() => a.name !== undefined && check('name')} aria-invalid={!!errors.name} />
                  {errors.name && <span className="msf-error">{errors.name}</span>}
                </label>
                <label>Phone
                  <input className="input" name="phone" type="tel" inputMode="tel" autoComplete="tel" value={a.phone || ''} onChange={set('phone')} onBlur={() => a.phone && check('phone')} aria-invalid={!!(errors.phone || errors.contact)} />
                  {errors.phone && <span className="msf-error">{errors.phone}</span>}
                </label>
                <label>Email
                  <input className="input" name="email" type="email" inputMode="email" autoComplete="email" value={a.email || ''} onChange={set('email')} onBlur={() => a.email && check('email')} aria-invalid={!!(errors.email || errors.contact)} />
                  {errors.email && <span className="msf-error">{errors.email}</span>}
                </label>
                <label>ZIP code {isService ? '' : <small>helps us confirm coverage</small>}
                  <input className="input" name="zip" inputMode="numeric" autoComplete="postal-code" maxLength={10} value={a.zip || ''} onChange={set('zip')} onBlur={() => a.zip && check('zip')} aria-invalid={!!errors.zip} />
                  {errors.zip && <span className="msf-error">{errors.zip}</span>}
                </label>
                <label className="msf-wide">{isService ? 'What is happening with the unit?' : <>Anything else? <small>optional</small></>}
                  <textarea className="input" name="message" rows={3} value={a.message || ''} onChange={set('message')} aria-invalid={!!errors.message} />
                  {errors.message && <span className="msf-error">{errors.message}</span>}
                </label>
              </div>
              {errors.contact && <p className="msf-error" role="alert">{errors.contact}</p>}
              {state === 'failed' && <p className="msf-error" role="alert">We could not send that just now. Please try again, or call {phone}.</p>}
              <div className="msf-actions">
                <button type="submit" className="btn btn-primary btn-lg" aria-disabled={state === 'sending'}>{state === 'sending' ? 'Sending…' : isService ? 'Request Service' : 'Get Help With My Project'}</button>
                <a className="msf-call" href={tel} data-track="phone_click" data-placement="quote_form">or call {phone}</a>
              </div>
              <p className="msf-fine">Sending this does not book an appointment. See our <a href="/privacy/">privacy policy</a>.</p>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </form>
  );
}

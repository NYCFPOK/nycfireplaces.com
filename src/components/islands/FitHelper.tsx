// "Will it fit" helper. It suggests product TYPES from general rules only.
// It never matches a model or states that something fits: no product
// dimensions are stored in this repository (see docs/CONTENT-TODO.md).
import { useState } from 'react';
type Kind = { href: string; name: string; why: string };
const RULES: Record<string, Kind[]> = {
  'existing:gas': [{ href: '/gas-inserts/', name: 'Gas insert', why: 'for real heat from the opening you have' }, { href: '/gas-logs/', name: 'Gas logs or a glass burner', why: 'for the look of an open fire' }],
  'existing:electric': [{ href: '/electric-fireplace-inserts/', name: 'Electric insert', why: 'no gas or chimney work' }],
  'existing:wood': [{ href: '/wood-fireplace-inserts/', name: 'Wood or pellet insert', why: 'keeps a solid-fuel fire, with far more heat' }],
  'existing:unsure': [{ href: '/gas-inserts/', name: 'Gas insert', why: 'if gas is available and heat matters' }, { href: '/gas-logs/', name: 'Gas logs', why: 'if the look matters most' }, { href: '/electric-fireplace-inserts/', name: 'Electric insert', why: 'if gas is not practical' }],
  'new:gas': [{ href: '/direct-vent-gas-fireplaces/', name: 'Direct-vent gas fireplace', why: 'vents outside with its own pipe, so no chimney is needed' }],
  'new:electric': [{ href: '/electric-fireplaces/', name: 'Electric fireplace', why: 'needs only power' }, { href: '/water-vapor-fireplaces/', name: 'Water-vapor fireplace', why: 'a flame effect with nothing to vent' }],
  'new:wood': [{ href: '/wood-fireplaces/', name: 'Wood-burning fireplace', why: 'needs a suitable chimney' }, { href: '/stoves/', name: 'Stove', why: 'a freestanding alternative' }],
  'new:unsure': [{ href: '/direct-vent-gas-fireplaces/', name: 'Direct-vent gas fireplace', why: 'the usual choice where gas and a vent route exist' }, { href: '/electric-fireplaces/', name: 'Electric fireplace', why: 'where venting or gas is not practical' }],
};
const FUELS = [['gas', 'Gas'], ['electric', 'Electric only'], ['wood', 'Wood'], ['unsure', 'Not sure']];
export default function FitHelper({ phone, tel }: { phone: string; tel: string }) {
  const [place, setPlace] = useState('existing');
  const [fuel, setFuel] = useState('');
  const [dim, setDim] = useState({ w: '', h: '', d: '' });
  const [shown, setShown] = useState(false);
  const types = RULES[`${place}:${fuel}`] ?? [];
  const hasDims = dim.w && dim.h;
  const note = `${types[0]?.name ?? 'Fireplace'}${hasDims ? `, opening ${dim.w} W x ${dim.h} H${dim.d ? ` x ${dim.d} D` : ''} in` : ''}, ${FUELS.find((f) => f[0] === fuel)?.[1] ?? ''}`.slice(0, 118);
  const num = (k: 'w' | 'h' | 'd') => ({ value: dim[k], inputMode: 'decimal' as const, onChange: (e: React.ChangeEvent<HTMLInputElement>) => setDim({ ...dim, [k]: e.target.value.replace(/[^\d.]/g, '').slice(0, 5) }) });
  return (
    <form className="fit" onSubmit={(e) => { e.preventDefault(); if (!fuel) return; setShown(true); const w = window as unknown as { dataLayer?: unknown[] }; (w.dataLayer = w.dataLayer || []).push({ event: 'fit_helper_used', fit_place: place, fit_fuel: fuel }); }}>
      <fieldset>
        <legend>Is there a fireplace opening now?</legend>
        <div className="fit-seg">
          {[['existing', 'Yes'], ['new', 'No, it would be new']].map(([v, l]) => <label key={v} className={place === v ? 'is-on' : ''}><input type="radio" name="place" checked={place === v} onChange={() => { setPlace(v); setShown(false); }} />{l}</label>)}
        </div>
      </fieldset>
      <fieldset>
        <legend>{place === 'existing' ? 'Opening size, in inches' : 'Wall space available, in inches'} <small>optional</small></legend>
        <div className="fit-dims">
          <label>Width<input className="input" {...num('w')} /></label>
          <label>Height<input className="input" {...num('h')} /></label>
          <label>Depth<input className="input" {...num('d')} /></label>
        </div>
      </fieldset>
      <fieldset>
        <legend>Fuel</legend>
        <div className="fit-seg">
          {FUELS.map(([v, l]) => <label key={v} className={fuel === v ? 'is-on' : ''}><input type="radio" name="fuel" checked={fuel === v} onChange={() => { setFuel(v); setShown(false); }} />{l}</label>)}
        </div>
      </fieldset>
      <button className="btn btn-secondary" type="submit" aria-disabled={!fuel}>Show what to look at</button>
      {shown && (
        <div className="fit-out" role="status">
          <p className="eyebrow">Worth looking at</p>
          <ul>{types.map((t) => <li key={t.href}><a className="link" href={t.href}>{t.name}</a> <span>{t.why}</span></li>)}</ul>
          <p className="fit-note">This narrows the type, not the model. Clearances and framing differ for every unit, so the fit is confirmed by our team against the manufacturer’s installation manual.</p>
          <div className="fit-acts">
            <a className="btn btn-primary" href={`/project-help/?kind=product&product=${encodeURIComponent(note)}&type=${place === 'existing' ? 'existing-fireplace' : 'new-fireplace'}`} data-track="help_cta_click" data-placement="fit_helper">{hasDims ? 'Send these measurements to our team' : 'Ask our team to check the fit'}</a>
            <a className="fit-call" href={tel} data-track="phone_click" data-placement="fit_helper">or call {phone}</a>
          </div>
        </div>
      )}
    </form>
  );
}

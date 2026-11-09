// Central business facts. Every page reads address, phone, hours, location
// status and service areas from site.json (editable in the CMS) so pages
// cannot contradict one another.
import data from './site.json';

export const site = data;
export const showroom = data.showroom;
export const telHref = `tel:${data.phone.e164}`;
export const helpHref = '/project-help/';

export const addressLine = `${showroom.street}, ${showroom.city}, ${showroom.region} ${showroom.postalCode}`;

const to12h = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
};

export const hoursRows = showroom.hours.map((h) => ({
  label: h.label,
  value: h.open && h.close ? `${to12h(h.open)}–${to12h(h.close)}` : 'Closed',
}));

export const hoursCompact = hoursRows
  .map((r) => `${r.label.replace('Monday–Friday', 'Mon–Fri').replace('Saturday', 'Sat').replace('Sunday', 'Sun')} ${r.value}`)
  .join(' · ');

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** schema.org openingHoursSpecification built from the same hours data. */
export const openingHoursSpec = showroom.hours
  .filter((h) => h.open && h.close)
  .map((h) => ({
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: h.days.map((d) => DAY_NAMES[d]),
    opens: h.open,
    closes: h.close,
  }));

/** Data handed to the small client script that shows open/closed status. */
export const hoursClientData = JSON.stringify({
  hours: showroom.hours.map(({ days, open, close }) => ({ days, open, close })),
  overrides: showroom.holidayOverrides,
});

export const isProduction = import.meta.env.SITE_ENV === 'production';

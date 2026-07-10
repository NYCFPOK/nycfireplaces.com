// Single source of truth for business facts.
// Used by JSON-LD schema, footer, conversion CTAs, llms.txt, sitemap.
// NOTE: `hours` is intentionally null until the owner confirms real showroom
// hours — we never fabricate hours for structured data.

export interface Location {
  id: string;
  name: string;
  street: string;
  city: string;
  region: string; // state
  postalCode: string;
  country: string;
  phone: string; // E.164 for tel: links
  phoneDisplay: string;
  hours: null | { day: string; opens: string; closes: string }[]; // 24h "09:00" form for schema
  hoursDisplay: null | { label: string; value: string }[]; // human display
  comingSoon: boolean;
  mapQuery: string; // for Google Maps directions link
}

// Maspeth showroom hours (open). Schema uses 24h; display is human-readable.
const maspethHours = [
  { day: 'Monday', opens: '09:00', closes: '17:00' },
  { day: 'Tuesday', opens: '09:00', closes: '17:00' },
  { day: 'Wednesday', opens: '09:00', closes: '17:00' },
  { day: 'Thursday', opens: '09:00', closes: '17:00' },
  { day: 'Friday', opens: '09:00', closes: '17:00' },
  { day: 'Saturday', opens: '10:00', closes: '15:00' },
];
const maspethHoursDisplay = [
  { label: 'Mon – Fri', value: '9:00 AM – 5:00 PM' },
  { label: 'Saturday', value: '10:00 AM – 3:00 PM' },
  { label: 'Sunday', value: 'Closed' },
];

export const business = {
  name: 'NYC Fireplaces & Outdoor Kitchens',
  shortName: 'NYC Fireplaces',
  legalName: 'NYC Fireplaces & Outdoor Kitchens',
  url: 'https://www.nycfireplaces.com',
  tagline: 'Designed for the way you live with fire.',
  description:
    'Family-owned, with an in-house team of craftsmen, installers, technicians and designers — over 30 years designing, supplying and installing fireplaces and outdoor kitchens across the New York metro area.',
  foundingYears: 30,
  primaryPhone: '+17183264328',
  primaryPhoneDisplay: '(718) 326-4328',
  email: 'info@nycfireplaces.com',
  locations: [
    {
      id: 'maspeth',
      name: 'Queens Showroom',
      street: '58-30 Maspeth Avenue',
      city: 'Maspeth',
      region: 'NY',
      postalCode: '11378',
      country: 'US',
      phone: '+17183264328',
      phoneDisplay: '(718) 326-4328',
      hours: maspethHours,
      hoursDisplay: maspethHoursDisplay,
      comingSoon: false,
      mapQuery: '58-30 Maspeth Avenue, Maspeth, NY 11378',
    },
    {
      id: 'greenvale',
      name: 'Long Island Showroom',
      street: '13 Glen Cove Rd',
      city: 'Greenvale',
      region: 'NY',
      postalCode: '11548',
      country: 'US',
      phone: '+15165001095',
      phoneDisplay: '(516) 500-1095',
      // [[NEEDS CONFIRMATION: Greenvale showroom hours]] — do not publish unverified hours (plan 4.4/9.3)
      hours: null,
      hoursDisplay: null,
      comingSoon: false, // plan 4.4/9.3: remove all "Coming Soon" language
      mapQuery: '13 Glen Cove Rd, Greenvale, NY 11548',
    },
  ] as Location[],
  socials: [
    'https://www.facebook.com/NYCFireplacesOutdoorKitchens/',
    'https://www.instagram.com/nycfireplaces_outdoor_kitchens/',
    'https://www.youtube.com/user/NYCFireplace',
    'https://www.pinterest.com/NYCFireplaceShop/',
    'https://www.linkedin.com/company/nyc-fireplaces-',
    'https://www.houzz.com/professionals/fireplace-sales-and-installation/nyc-fireplaces-and-outdoor-kitchens-pfvwus-pf',
  ],
  // Geographic service area — drives areaServed in schema and geo landing pages.
  areasServed: [
    'Manhattan NY', 'Brooklyn NY', 'Queens NY', 'Bronx NY', 'Staten Island NY',
    'Nassau County NY', 'Suffolk County NY', 'Westchester NY', 'Greenwich CT', 'New Jersey',
  ],
} as const;

export function mapsUrl(query: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;
}

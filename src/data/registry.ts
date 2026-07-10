// =============================================================================
// BUSINESS FACT REGISTRY — plan §4 / §18.2
// The single source of truth for every claim the site makes.
// Templates, schema, llms.txt and CTAs must read from here — never hardcode.
//
// Rules (plan §2.3):
//  - Never invent facts. A fact is publishable only when status === 'verified'.
//  - Facts with status 'needs-confirmation' must not render on public pages;
//    pages that depend on them stay draft/noindex (see publishing safeguards).
// =============================================================================

export type FactStatus = 'verified' | 'needs-confirmation' | 'draft';

export interface Fact<T = string> {
  value: T;
  status: FactStatus;
  source: string; // where this came from
  lastVerified: string | null; // ISO date
  approvedWording?: string; // exact client-approved phrasing, when it matters
  notes?: string; // internal notes — never rendered
}

export const fact = <T>(f: Fact<T>): Fact<T> => f;

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------
export const identity = {
  companyName: fact({
    value: 'NYC Fireplaces & Outdoor Kitchens',
    status: 'verified',
    source: 'Project plan §4.1',
    lastVerified: '2026-07-10',
  }),

  companyHistory: fact({
    value:
      'NYC Fireplaces & Outdoor Kitchens is a family-owned company whose team brings more than 30 years of fireplace, outdoor-living, design, construction, and installation experience.',
    status: 'verified',
    source: 'Project plan §4.2 — exact approved wording',
    lastVerified: '2026-07-10',
    notes:
      'NEVER state: "family-owned for 30+ years", "serving NYC for 30+ years", "founded 30+ years ago", or "in business for 30+ years". The 30 years belongs to the TEAM, not the company.',
  }),

  foundingYear: fact<null>({
    value: null,
    status: 'needs-confirmation',
    source: '[[NEEDS CONFIRMATION: NYC Fireplaces founding year and approved relationship to the family construction business]]',
    lastVerified: null,
  }),
};

// ---------------------------------------------------------------------------
// Trust facts — plan §4.5. Use ONLY these, with the stated qualifications.
// ---------------------------------------------------------------------------
export const trustFacts = [
  fact({
    value: 'Family-owned',
    status: 'verified',
    source: 'Project plan §4.5',
    lastVerified: '2026-07-10',
  }),
  fact({
    value: 'Team with more than 30 years of industry experience',
    status: 'verified',
    source: 'Project plan §4.5',
    lastVerified: '2026-07-10',
  }),
  fact({
    value: 'More than 300 five-star Google reviews',
    status: 'verified',
    source: 'Project plan §4.5',
    lastVerified: '2026-07-10',
    notes: 'Plan §28 asks for a review-count verification date — re-verify before launch.',
  }),
  fact({
    value: 'Two physical showrooms',
    status: 'verified',
    source: 'Project plan §4.5',
    lastVerified: '2026-07-10',
  }),
  fact({
    value: 'In-house, factory-trained installation team',
    status: 'verified',
    source: 'Project plan §4.5',
    lastVerified: '2026-07-10',
    approvedWording: 'Installers are not generic subcontracted installation crews',
  }),
  fact({
    value: 'Free 3D outdoor-kitchen design with qualifying purchase',
    status: 'verified',
    source: 'Project plan §4.5',
    lastVerified: '2026-07-10',
    notes: 'Qualifying terms must be stated wherever this is a page headline (§12.5).',
  }),
  fact({
    value: 'Qualifying, site-ready fireplace installations may be completed in as little as two days',
    status: 'verified',
    source: 'Project plan §4.5',
    lastVerified: '2026-07-10',
    notes:
      'NOT a universal badge. Never apply a two-day claim to outdoor kitchens, masonry, media walls, pergolas, fire pits, complex renovations, permit-dependent work, major utility prep, or multi-trade projects.',
  }),
];

// ---------------------------------------------------------------------------
// Scope facts — plan §4.6–4.8. These bound what the site may claim we DO.
// ---------------------------------------------------------------------------
export const scope = {
  fireplaceInstallation: fact({
    value: 'NYC Fireplaces installs qualifying fireplace products sold by NYC Fireplaces.',
    status: 'verified',
    source: 'Project plan §4.6',
    lastVerified: '2026-07-10',
    notes:
      'Does NOT install customer-supplied products unless explicitly approved as an exception. Never imply permits, inspections, gas, electrical, engineering or architectural services are included.',
  }),
  outdoorKitchens: fact({
    value: 'NYC Fireplaces designs, supplies, builds, and installs qualifying custom outdoor kitchens.',
    status: 'verified',
    source: 'Project plan §4.6',
    lastVerified: '2026-07-10',
  }),
  permits: fact({
    value: 'NYC Fireplaces does not obtain permits or perform governmental inspections.',
    status: 'verified',
    source: 'Project plan §4.6',
    lastVerified: '2026-07-10',
  }),
  service: fact({
    value:
      'Service and repair are available for qualifying products that NYC Fireplaces sold and installed.',
    status: 'verified',
    source: 'Project plan §4.7',
    lastVerified: '2026-07-10',
    notes: 'Do not market general repair for any fireplace from any dealer. Service form must state this restriction before submission.',
  }),
  patioHeaters: fact({
    value:
      'Patio-heater services consist of consultation, product selection, heating-layout assistance, specification, and supply.',
    status: 'verified',
    source: 'Project plan §4.8',
    lastVerified: '2026-07-10',
    notes: 'Do NOT advertise NYC Fireplaces as the patio-heater installer unless policy changes.',
  }),
};

// ---------------------------------------------------------------------------
// Financing — plan §4.10
// ---------------------------------------------------------------------------
export const financing = {
  provider: fact({
    value: 'Acorn Finance',
    status: 'verified',
    source: 'Project plan §4.10',
    lastVerified: '2026-07-10',
  }),
  url: fact<null>({
    value: null,
    status: 'needs-confirmation',
    source: '[[NEEDS CONFIRMATION: approved Acorn Finance URL]]',
    lastVerified: null,
  }),
  wording: fact<null>({
    value: null,
    status: 'needs-confirmation',
    source: '[[NEEDS CONFIRMATION: approved financing wording, payment examples and required disclosures]]',
    lastVerified: null,
    notes:
      'Never publish "From $X/month" without the corresponding project price, term, APR assumption and disclosure. Never invent APR, terms, approval likelihood, or credit-impact language.',
  }),
};

// ---------------------------------------------------------------------------
// Approved CTAs — plan §2.1. The ONLY commerce language allowed on the site.
// ---------------------------------------------------------------------------
export const approvedCtas = [
  'Request Pricing',
  'Add to My Quote',
  'Check Showroom Availability',
  'See It in a Showroom',
  'Speak With a Specialist',
  'Request a Consultation',
  'Upload Photos or Plans',
] as const;

// Forbidden: shopping cart, checkout, online payment, external e-commerce
// links, "Buy Now" / "Shop Online" buttons (plan §2.1).

// ---------------------------------------------------------------------------
// Service areas — plan §4.9
// ---------------------------------------------------------------------------
export const serviceAreas = {
  confirmed: fact({
    value: [
      'Queens',
      'Brooklyn',
      'Manhattan',
      'Bronx',
      'Staten Island',
      'Nassau County',
      'Suffolk County',
      'New Jersey',
    ],
    status: 'verified',
    source: 'Project plan §4.9 — confirmed in current project brief',
    lastVerified: '2026-07-10',
  }),
  unconfirmed: fact({
    value: [
      'Westchester County',
      'Greenwich, Connecticut',
      'Stamford, Connecticut',
      'Bergen County, New Jersey',
      'Hudson County, New Jersey',
      'Essex County, New Jersey',
      'Union County, New Jersey',
    ],
    status: 'needs-confirmation',
    source:
      'Project plan §4.9 — claimed on current website; do NOT delete existing Westchester/CT landing pages until GSC data reviewed, coverage confirmed, and redirect destinations approved',
    lastVerified: null,
  }),
};

// ---------------------------------------------------------------------------
// Registry-wide helpers
// ---------------------------------------------------------------------------

/** All facts that still need client confirmation — drives INPUTS_NEEDED.md */
export function unresolvedFacts(): string[] {
  const unresolved: string[] = [];
  const scan = (obj: Record<string, Fact<unknown>>, prefix: string) => {
    for (const [key, f] of Object.entries(obj)) {
      if (f.status === 'needs-confirmation') unresolved.push(`${prefix}.${key}: ${f.source}`);
    }
  };
  scan(identity, 'identity');
  scan(financing, 'financing');
  scan(serviceAreas, 'serviceAreas');
  return unresolved;
}
